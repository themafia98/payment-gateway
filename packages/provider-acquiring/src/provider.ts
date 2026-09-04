// Direct bank acquiring, host-to-host. The protocol is as different from the PSP plugin
// next door as two card integrations can be:
//
//   * form-urlencoded bodies, with the credentials repeated in every single call
//   * business failures inside HTTP 200 - a refused card is a *successful* request
//   * numeric order statuses rather than strings
//   * ISO-4217 numeric currency codes
//   * two round trips to start a payment: register the order, then read it back
//   * 3-D Secure version 1, posting a `PaReq` at an access control server
//
// None of that reaches the checkout. The domain types, the engine and every screen are
// the same ones the PSP plugin talks to, and this file is the entire difference between
// the two integrations.

import { createHttpClient, type HttpClient } from '@pg/core/http'
import type {
  ActionEvidence,
  CallOptions,
  CreateIntentInput,
  PaymentAction,
  PaymentError,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@pg/core'

export interface AcquiringConfig {
  /** Root of the acquirer's REST endpoint. */
  readonly baseUrl: string
  /** Credentials, sent in the body of every request. That is how this protocol works. */
  readonly userName: string
  readonly password: string
  /** Origin of the access control server that renders the challenge. */
  readonly acsOrigin: string
}

declare module '@pg/core' {
  interface ProviderConfigRegistry {
    acquiring: AcquiringConfig
  }
}

export const PROVIDER_ID = 'acquiring'

interface BankResponse {
  errorCode?: string
  errorMessage?: string
}

interface RegisterResponse extends BankResponse {
  orderId?: string
  formUrl?: string
}

interface PaymentOrderResponse extends BankResponse {
  info?: string
  acsUrl?: string
  paReq?: string
  MD?: string
}

interface OrderStatusResponse extends BankResponse {
  orderStatus?: number
  actionCode?: number
  actionCodeDescription?: string
  amount?: number
  currency?: string
  orderNumber?: string
}

const capabilities: ProviderCapabilities = {
  instruments: ['card'],
  actions: ['redirect'],
  surfaces: ['iframe', 'top'],
  authentication: ['none', '3ds1'],
  session: 'lazy',
  cancel: true,
  poll: true,
  // No header here: the order number in the body is what makes a retry safe.
  idempotency: 'body',
}

/**
 * The bank's numeric statuses, mapped down to the domain's vocabulary.
 *
 * Two of them are lossy on purpose. There is no `authorized` and no `refunded` in this
 * domain, because no screen shows either, and inventing them to mirror the bank would be
 * exactly the leak this architecture exists to prevent.
 */
const STATUS_BY_ORDER_STATUS: Record<number, PaymentStatus> = {
  0: 'requires_payment_method',
  1: 'processing',
  2: 'succeeded',
  3: 'canceled',
  4: 'canceled',
  5: 'requires_action',
  6: 'declined',
}

/** ISO-4217 numeric, since this API does not take currency codes as letters. */
const CURRENCY_LETTERS: Record<string, string> = { '840': 'USD', '978': 'EUR', '826': 'GBP' }

const CURRENCY_NUMBERS: Record<string, string> = { USD: '840', EUR: '978', GBP: '826' }

const normalizeCardNumber = (value: string): string => value.replace(/\D/g, '')

/** `12 / 2030` and `12/30` both become `203012`, which is what this API expects. */
const toBankExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  const month = digits.slice(0, 2)
  const year = digits.length > 4 ? digits.slice(2, 6) : `20${digits.slice(2, 4)}`
  return `${year}${month}`
}

const isFailure = (response: BankResponse): boolean =>
  response.errorCode !== undefined && response.errorCode !== '0'

/**
 * A non-zero code means the request itself failed - credentials, an unknown order, the
 * acquirer being down. It never means "the card was refused": that arrives as a perfectly
 * successful call with `orderStatus: 6`, and conflating the two is the classic way to get
 * this integration wrong.
 */
const toBankError = (response: BankResponse): PaymentError => ({
  code: `acquiring_${response.errorCode ?? 'unknown'}`,
  message: response.errorMessage ?? 'The acquirer rejected the request.',
  detail: { errorCode: response.errorCode },
})

const transportError = (cause: unknown): PaymentError => ({
  code: 'acquiring_transport',
  message: cause instanceof Error ? cause.message : 'The acquirer could not be reached.',
})

export const createAcquiringProvider = (
  ctx: ProviderContext<AcquiringConfig>,
  http: HttpClient = createHttpClient({
    baseUrl: ctx.config.baseUrl,
    // The whole protocol is form-encoded, so this is a property of the client, not of
    // individual calls.
    encoding: 'form',
    fetch: ctx.fetch,
  }),
): PaymentProviderInstance => {
  const withCredentials = (params: Record<string, string>): Record<string, string> => ({
    userName: ctx.config.userName,
    password: ctx.config.password,
    ...params,
  })

  const call = <T extends BankResponse>(
    path: string,
    params: Record<string, string>,
    opts: CallOptions,
  ) => http.post<T>(path, withCredentials(params), { signal: opts.signal })

  const orderStatus = (orderId: string, opts: CallOptions) =>
    call<OrderStatusResponse>('/rest/getOrderStatusExtended.do', { orderId }, opts)

  const toIntent = (orderId: string, status: OrderStatusResponse): PaymentIntent => ({
    id: orderId,
    amount: status.amount ?? 0,
    currency: CURRENCY_LETTERS[status.currency ?? ''] ?? status.currency ?? 'USD',
    status: STATUS_BY_ORDER_STATUS[status.orderStatus ?? 0] ?? 'requires_payment_method',
    providerId: PROVIDER_ID,
  })

  /**
   * A 3-D Secure 1 challenge, expressed as the same action a version 2 challenge produces.
   * Different fields, different names, one shape - which is why the challenge screen has
   * no idea which version it is showing.
   */
  const toChallengeAction = (response: PaymentOrderResponse): PaymentAction => ({
    id: response.MD ?? '',
    kind: 'redirect',
    purpose: 'authenticate',
    surface: 'iframe',
    url: `${ctx.config.acsOrigin}${response.acsUrl ?? '/acs/pareq'}`,
    method: 'POST',
    fields: { PaReq: response.paReq ?? '', MD: response.MD ?? '' },
    // The bank names its return field `TermUrl`; the host fills it in, because only the
    // host knows the absolute URL under its own base path.
    returnUrlField: 'TermUrl',
    completion: {
      via: 'post_message',
      origin: ctx.config.acsOrigin,
      type: '3ds-pares',
      correlationField: 'MD',
    },
  })

  const resultFromStatus = async (orderId: string, opts: CallOptions): Promise<PaymentResult> => {
    const status = await orderStatus(orderId, opts)
    if (isFailure(status)) return { status: 'error', error: toBankError(status) }

    const intent = toIntent(orderId, status)

    switch (intent.status) {
      case 'succeeded':
        return { status: 'succeeded', intent }
      case 'processing':
        return { status: 'processing', intent }
      case 'declined':
        return {
          status: 'declined',
          intent,
          error: {
            code: status.actionCode ? `action_${status.actionCode}` : 'card_declined',
            message: status.actionCodeDescription || 'Your card was declined.',
          },
        }
      case 'canceled':
        return {
          status: 'error',
          intent,
          error: { code: 'canceled', message: 'The payment was canceled.' },
        }
      default:
        return {
          status: 'error',
          intent,
          error: {
            code: 'unexpected_order_status',
            message: `The acquirer reported order status ${status.orderStatus ?? '?'}.`,
          },
        }
    }
  }

  const transStatusOf = (evidence: ActionEvidence): string | null => {
    if (evidence.via === 'post_message') return String(evidence.data.transStatus ?? '')
    if (evidence.via === 'return_url') return evidence.params.transStatus ?? ''
    return null
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> => {
      // Two round trips, which is simply how this API works: registering an order returns
      // an id and nothing else, so the amount has to be read back.
      const registered = await call<RegisterResponse>(
        '/rest/register.do',
        {
          planId: input.planId,
          // Idempotency lives in the body here, not in a header.
          orderNumber: opts.idempotencyKey,
          currency: CURRENCY_NUMBERS[input.currency ?? 'USD'] ?? '840',
          amount: String(input.amount ?? 0),
        },
        opts,
      )

      if (isFailure(registered) || !registered.orderId) {
        throw new Error(toBankError(registered).message)
      }

      const status = await orderStatus(registered.orderId, opts)
      return toIntent(registered.orderId, status)
    },

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'card') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: `This acquirer takes card details, not "${instrument.kind}".`,
          },
        }
      }

      try {
        const response = await call<PaymentOrderResponse>(
          '/rest/paymentorder.do',
          {
            MDORDER: intentId,
            $PAN: normalizeCardNumber(instrument.number),
            $EXPIRY: toBankExpiry(instrument.exp),
            $CVC: instrument.cvc,
          },
          opts,
        )

        if (isFailure(response)) return { status: 'error', error: toBankError(response) }

        if (response.acsUrl) {
          const status = await orderStatus(intentId, opts)
          return {
            status: 'requires_action',
            intent: toIntent(intentId, status),
            action: toChallengeAction(response),
          }
        }

        return await resultFromStatus(intentId, opts)
      } catch (cause) {
        return { status: 'error', error: transportError(cause) }
      }
    },

    resume: async (intentId, evidence, opts) => {
      const transStatus = transStatusOf(evidence)
      if (transStatus === null) {
        return {
          status: 'error',
          error:
            evidence.via === 'aborted'
              ? { code: 'authentication_aborted', message: 'Authentication was not completed.' }
              : {
                  code: 'unsupported_evidence',
                  message: `This acquirer cannot continue from "${evidence.via}" evidence.`,
                },
        }
      }

      try {
        // `PaRes` is the access control server's signed verdict. Here it is synthesized
        // from what the browser brought back; a real integration would forward the blob
        // untouched, and either way the acquirer is what decides.
        const finished = await call<BankResponse>(
          '/rest/finish3ds.do',
          { MD: evidence.actionId, PaRes: JSON.stringify({ transStatus }) },
          opts,
        )

        if (isFailure(finished)) return { status: 'error', error: toBankError(finished) }

        return await resultFromStatus(intentId, opts)
      } catch (cause) {
        return { status: 'error', error: transportError(cause) }
      }
    },

    getIntent: async (intentId, opts) => {
      const status = await orderStatus(intentId, opts)
      if (isFailure(status)) throw new Error(toBankError(status).message)
      return toIntent(intentId, status)
    },

    cancel: async (intentId, opts) => {
      const reversed = await call<BankResponse>('/rest/reverse.do', { orderId: intentId }, opts)
      if (isFailure(reversed)) throw new Error(toBankError(reversed).message)

      const status = await orderStatus(intentId, opts)
      return toIntent(intentId, status)
    },
  }
}

export const acquiringProvider: PaymentProvider<AcquiringConfig> = {
  id: PROVIDER_ID,
  displayName: 'Acquiring bank',
  capabilities,
  create: createAcquiringProvider,
}
