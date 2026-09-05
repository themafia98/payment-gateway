// A wallet: a third-party script draws its own sheet, the shopper approves, and a payload
// comes back.
//
// The card behind the wallet still decides the outcome. A wallet is a way of presenting a
// card, not of avoiding one.

import { createHttpClient, type HttpClient } from '@pg/core/http'
import type {
  CallOptions,
  CreateIntentInput,
  PaymentIntent,
  PaymentInstrument,
  PaymentProvider,
  PaymentProviderInstance,
  PaymentResult,
  PaymentStatus,
  ProviderCapabilities,
  ProviderContext,
} from '@pg/core'

export interface WalletConfig {
  readonly baseUrl: string
  /** Key of the SDK adapter the host registered for this wallet. */
  readonly sdk: string
  /** Where the wallet's script is served from. */
  readonly scriptUrl: string
  /** Subresource integrity hash, when the wallet publishes one. */
  readonly integrity?: string
  readonly merchantName: string
}

declare module '@pg/core' {
  interface ProviderConfigRegistry {
    wallet: WalletConfig
  }
}

export const PROVIDER_ID = 'wallet'

interface WalletChargeDto {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  error?: { code?: string; message: string } | null
}

const capabilities: ProviderCapabilities = {
  instruments: ['none', 'wallet'],
  actions: ['sdk_handoff'],
  // Nothing of ours is rendered: the wallet draws its own sheet.
  surfaces: ['none'],
  authentication: ['sdk'],
  session: 'lazy',
  cancel: true,
  poll: true,
  idempotency: 'header',
}

export const createWalletProvider = (
  ctx: ProviderContext<WalletConfig>,
  http: HttpClient = createHttpClient({ baseUrl: ctx.config.baseUrl, fetch: ctx.fetch }),
): PaymentProviderInstance => {
  const toIntent = (dto: WalletChargeDto): PaymentIntent => ({
    id: dto.id,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    providerId: PROVIDER_ID,
  })

  const toResult = (dto: WalletChargeDto): PaymentResult => {
    const intent = toIntent(dto)

    switch (dto.status) {
      case 'succeeded':
        return { status: 'succeeded', intent }
      case 'processing':
        return { status: 'processing', intent }
      case 'declined':
        return {
          status: 'declined',
          intent,
          error: dto.error
            ? { code: dto.error.code, message: dto.error.message }
            : { code: 'card_declined', message: 'Your card was declined.' },
        }
      default:
        return {
          status: 'error',
          intent,
          error: { code: 'not_charged', message: 'The payment was not completed.' },
        }
    }
  }

  return {
    createIntent: async (input: CreateIntentInput, opts: CallOptions): Promise<PaymentIntent> =>
      toIntent(
        await http.post<WalletChargeDto>(
          '/wallet/charges',
          { planId: input.planId },
          { headers: { 'Idempotency-Key': opts.idempotencyKey }, signal: opts.signal },
        ),
      ),

    confirm: async (intentId, instrument: PaymentInstrument, opts) => {
      if (instrument.kind !== 'none') {
        return {
          status: 'error',
          error: {
            code: 'unsupported_instrument',
            message: 'This provider is driven by a wallet SDK; nothing should be sent to it.',
          },
        }
      }

      try {
        const charge = await http.get<WalletChargeDto>(`/wallet/charges/${intentId}`, {
          signal: opts.signal,
        })

        return {
          status: 'requires_action',
          intent: toIntent(charge),
          action: {
            id: intentId,
            kind: 'sdk_handoff',
            purpose: 'authorize',
            surface: 'none',
            sdk: ctx.config.sdk,
            scriptUrl: ctx.config.scriptUrl,
            integrity: ctx.config.integrity,
            // The SDK answers directly to the runner that called it; there is no frame to
            // listen to and no URL to come back from.
            completion: { via: 'sdk_callback' },
            params: {
              merchantName: ctx.config.merchantName,
              amount: charge.amount,
              currency: charge.currency,
            },
          },
        }
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'wallet_unavailable',
            message: cause instanceof Error ? cause.message : 'The wallet is unavailable.',
          },
        }
      }
    },

    resume: async (intentId, evidence, opts) => {
      if (evidence.via !== 'sdk_callback') {
        return {
          status: 'error',
          error:
            evidence.via === 'aborted'
              ? { code: 'wallet_dismissed', message: 'The wallet was closed before paying.' }
              : {
                  code: 'unsupported_evidence',
                  message: `This provider cannot continue from "${evidence.via}" evidence.`,
                },
        }
      }

      const payload = evidence.payload as { walletToken?: string } | null
      if (!payload?.walletToken) {
        return {
          status: 'error',
          error: { code: 'missing_wallet_token', message: 'The wallet returned no payment token.' },
        }
      }

      try {
        return toResult(
          await http.post<WalletChargeDto>(
            `/wallet/charges/${intentId}/pay`,
            { walletToken: payload.walletToken },
            { signal: opts.signal },
          ),
        )
      } catch (cause) {
        return {
          status: 'error',
          error: {
            code: 'charge_failed',
            message: cause instanceof Error ? cause.message : 'The payment could not be taken.',
          },
        }
      }
    },

    getIntent: async (intentId, opts) =>
      toIntent(
        await http.get<WalletChargeDto>(`/wallet/charges/${intentId}`, { signal: opts.signal }),
      ),

    cancel: async (intentId, opts) =>
      toIntent(
        await http.post<WalletChargeDto>(
          `/wallet/charges/${intentId}/cancel`,
          {},
          { signal: opts.signal },
        ),
      ),
  }
}

export const walletProvider: PaymentProvider<WalletConfig> = {
  id: PROVIDER_ID,
  displayName: 'Wallet',
  capabilities,
  create: createWalletProvider,
}
