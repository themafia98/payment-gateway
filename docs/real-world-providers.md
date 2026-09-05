# Real providers, mapped onto the contract

> Русская версия: [real-world-providers.ru.md](./real-world-providers.ru.md)

The five plugins in this repository are modelled on real integrations. This page shows the
real ones: what Stripe, Adyen, PayPal, Apple Pay, Google Pay and a bank acquirer return, and
which `PaymentAction` a plugin would produce for each.

Read [Writing a payment plugin](./plugin-authoring.md) first. This page assumes you know
what `confirm`, `resume`, an action and evidence are.

## One rule before the examples

**A plugin runs in the browser, so it must never hold a secret key.**

Stripe's `sk_...`, Adyen's `x-api-key`, PayPal's client secret and a bank's
`userName`/`password` all belong on a server. A plugin calls _your_ backend, and your
backend calls the provider:

```text
browser: plugin  →  your API  →  provider's API
```

Everything below describes what your API returns to the plugin. The provider's response
shapes are the real ones, because your backend usually passes them through with the secrets
stripped out.

The demo in this repository has no backend at all, so the mock answers in the provider's
shape directly. That is the one place where it is not like production.

## The map

| Provider and flow             | instrument | action           | surface  | completes via  |
| ----------------------------- | ---------- | ---------------- | -------- | -------------- |
| Stripe, redirect next action  | `card`     | `redirect`       | `top`    | `return_url`   |
| Stripe, Elements + Stripe.js  | `none`     | `sdk_handoff`    | `none`   | `sdk_callback` |
| Stripe Checkout               | `none`     | `redirect`       | `top`    | `return_url`   |
| Adyen, `action.type=redirect` | `card`     | `redirect`       | `top`    | `return_url`   |
| Adyen, `action.type=threeDS2` | `card`     | `sdk_handoff`    | `none`   | `sdk_callback` |
| Adyen Drop-in                 | `none`     | `sdk_handoff`    | `none`   | `sdk_callback` |
| PayPal buttons                | `none`     | `sdk_handoff`    | `none`   | `sdk_callback` |
| PayPal redirect               | `none`     | `redirect`       | `top`    | `return_url`   |
| Apple Pay / Google Pay        | `none`     | `sdk_handoff`    | `none`   | `sdk_callback` |
| Bank host-to-host, 3-D Secure | `card`     | `redirect`       | `iframe` | `post_message` |
| Provider-hosted card fields   | `none`     | `collect_fields` | `inline` | `post_message` |

## Stripe

Stripe has three common shapes, and they use three different actions.

### 1. Server confirms, the shopper is redirected

Your backend creates and confirms a PaymentIntent. If the payment needs another step,
Stripe returns `status: 'requires_action'` and a `next_action` object. When
`next_action.type` is `redirect_to_url`, it carries a URL to send the browser to.

```ts
// inside confirm()
const intent = await http.post<StripeIntentDto>(`/payments/${intentId}/confirm`, {
  paymentMethodId: instrument.kind === 'card' ? await tokenize(instrument) : undefined,
})

if (intent.status === 'requires_action' && intent.next_action?.type === 'redirect_to_url') {
  return {
    status: 'requires_action',
    intent: toIntent(intent),
    action: {
      id: intent.id,
      kind: 'redirect',
      purpose: 'authenticate',
      surface: 'top',
      url: intent.next_action.redirect_to_url.url,
      method: 'GET',
      // Stripe already knows your return URL, so there is no field to fill here. Set it
      // when your backend needs to pass one through.
      completion: { via: 'return_url' },
    },
  }
}
```

`resume` ignores what the return URL says and reads the PaymentIntent again:

```ts
resume: async (intentId, evidence, opts) => {
  // ?payment_intent=pi_123&redirect_status=succeeded arrives through the address bar.
  const intent = await http.get<StripeIntentDto>(`/payments/${intentId}`, opts)
  return toResult(intent)
}
```

### 2. Elements, confirmed by Stripe.js in the browser

With Elements the card fields are Stripe's own iframes, mounted by Stripe.js into a node you
provide. There is no URL for you to point an iframe at, so this is **not** `collect_fields`.
Stripe.js drives the whole confirmation, which makes it an `sdk_handoff`:

```ts
return {
  status: 'requires_action',
  intent: toIntent(intent),
  action: {
    id: intent.id,
    kind: 'sdk_handoff',
    purpose: 'authorize',
    surface: 'none',
    sdk: 'stripe',
    scriptUrl: 'https://js.stripe.com/v3/',
    completion: { via: 'sdk_callback' },
    params: { clientSecret: intent.client_secret, publishableKey: ctx.config.publishableKey },
  },
}
```

The host registers one adapter for it:

```ts
sdk: {
  adapters: [
    {
      sdk: 'stripe',
      request: async (params) => {
        const stripe = window.Stripe(params.publishableKey)
        const result = await stripe.handleNextAction({ clientSecret: params.clientSecret })
        if (result.error) throw new Error(result.error.message)
        return { paymentIntentId: result.paymentIntent.id }
      },
    },
  ],
}
```

`stripe.confirmPayment` normally redirects to a `return_url`. Passing
`redirect: 'if_required'` keeps it in the page when the payment method allows it — which is
what makes `sdk_callback` work here rather than `return_url`.

### 3. Stripe Checkout

Stripe hosts the whole page. Your backend creates a Checkout Session and returns its `url`:

```ts
action: {
  id: session.id,
  kind: 'redirect',
  purpose: 'authorize',
  surface: 'top',
  url: session.url,
  method: 'GET',
  completion: { via: 'return_url' },
}
```

This is the same shape as `@pg/provider-hpp` in this repository.

### Status mapping

| Stripe status             | domain status                                                     |
| ------------------------- | ----------------------------------------------------------------- |
| `succeeded`               | `succeeded`                                                       |
| `processing`              | `processing`                                                      |
| `requires_action`         | `requires_action`                                                 |
| `requires_payment_method` | `declined` after an attempt, `requires_payment_method` before one |
| `canceled`                | `canceled`                                                        |

`requires_payment_method` is the one to be careful with: after a failed confirmation it means
the card was refused, and the reason is in `last_payment_error`.

## Adyen

Adyen's `/payments` either finishes the payment or returns an `action` object. That object
maps onto ours almost field for field.

### `action.type: 'redirect'`

```json
{
  "resultCode": "RedirectShopper",
  "action": {
    "type": "redirect",
    "method": "POST",
    "url": "https://test.adyen.com/hpp/3d/validate.shtml",
    "data": { "PaReq": "eNpVUtt...", "MD": "eyJ0aHJ...", "TermUrl": "..." }
  }
}
```

```ts
action: {
  id: paymentData,
  kind: 'redirect',
  purpose: 'authenticate',
  surface: 'top',
  url: adyen.action.url,
  method: adyen.action.method,
  fields: adyen.action.data,
  // Adyen puts your return URL in the request, but if your backend passes one through,
  // name the field here and the host fills it in.
  returnUrlField: 'TermUrl',
  completion: { via: 'return_url' },
}
```

The shopper comes back with `redirectResult` in the query. `resume` sends it on:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'return_url') return unsupported(evidence)

  const details = await http.post<AdyenResultDto>(
    '/payments/details',
    {
      details: { redirectResult: evidence.params.redirectResult },
    },
    opts,
  )

  return toResult(details)
}
```

### `action.type: 'threeDS2'`

Native 3-D Secure 2 is driven by Adyen's own JavaScript, so it is an `sdk_handoff` with
`sdk: 'adyen'`. The adapter creates the component from `action` and resolves with the
`state.data` it produces; `resume` posts that to `/payments/details`.

### Drop-in

Drop-in renders every payment method itself. The instrument is `none`, the action is
`sdk_handoff`, and `resume` submits whatever the component gives back.

### Result codes

| Adyen `resultCode`                                       | domain status     |
| -------------------------------------------------------- | ----------------- |
| `Authorised`                                             | `succeeded`       |
| `Refused`, `Error`                                       | `declined`        |
| `Pending`, `Received`                                    | `processing`      |
| `RedirectShopper`, `IdentifyShopper`, `ChallengeShopper` | `requires_action` |
| `Cancelled`                                              | `canceled`        |

`refusalReason` is the message to show. It is the issuer's wording, which is what the
contract asks you to pass through.

## PayPal

PayPal Orders v2 has two steps with the shopper in between: create the order, let them
approve it, then capture it. **Capture is what takes the money**, so that is what `resume`
must do — an approval on its own has charged nobody.

With the JS SDK (the PayPal buttons), approval happens in a popup the SDK owns:

```ts
action: {
  id: order.id,
  kind: 'sdk_handoff',
  purpose: 'authorize',
  surface: 'none',
  sdk: 'paypal',
  scriptUrl: `https://www.paypal.com/sdk/js?client-id=${ctx.config.clientId}&currency=USD`,
  completion: { via: 'sdk_callback' },
  params: { orderId: order.id },
}
```

```ts
resume: async (intentId, evidence, opts) => {
  // The SDK says the shopper approved. Only a capture proves anything.
  const capture = await http.post<PayPalOrderDto>(`/paypal/orders/${intentId}/capture`, {}, opts)
  return toResult(capture)
}
```

Without the SDK, use the `approve` link from the order and a `redirect` action with
`surface: 'top'`, then capture in `resume` exactly the same way.

## Apple Pay and Google Pay

Both are wallets: a script draws a sheet, the shopper approves with a fingerprint or a face,
and you get an encrypted token that your PSP charges. This is `sdk_handoff`, and it is what
`@pg/provider-wallet` is modelled on.

```ts
action: {
  id: intentId,
  kind: 'sdk_handoff',
  purpose: 'authorize',
  surface: 'none',
  sdk: 'google-pay',
  scriptUrl: 'https://pay.google.com/gp/p/js/pay.js',
  completion: { via: 'sdk_callback' },
  params: { merchantId, amount: intent.amount, currency: intent.currency },
}
```

The adapter for Google Pay calls `paymentsClient.loadPaymentData(request)` and resolves with
`paymentData.paymentMethodData.tokenizationData.token`. The Apple Pay adapter creates an
`ApplePaySession`, waits for `onpaymentauthorized`, and resolves with `event.payment.token`.

Two things about Apple Pay that are easy to miss:

- it needs HTTPS and a domain association file served from your site, so it cannot be
  demonstrated with a mock backend
- `ApplePaySession.canMakePayments()` tells you whether to offer it at all — that check
  belongs in your UI, not in the plugin

For both, `resume` sends the token to your backend, which charges it through your PSP.

## Bank acquiring, host to host

This is the shape `@pg/provider-acquiring` follows: an older API, form-urlencoded, with
credentials in the body of every call. Several bank platforms in Europe and the CIS still
work this way.

```text
register.do                 create the order, get an orderId
paymentorder.do             send the card; get either a result or acsUrl + PaReq + MD
<the shopper authenticates at acsUrl>
finish3ds.do                send PaRes and MD
getOrderStatusExtended.do   read the real outcome
```

Three details to expect from this family of APIs:

- **`errorCode` inside HTTP 200.** A refused card is a _successful_ request with an order
  status of 6. A non-zero `errorCode` means the request itself failed — bad credentials, an
  unknown order. Treating one as the other is the classic mistake here.
- **numeric statuses.** `orderStatus` 0 to 6, mapped to the domain's names by the plugin.
  Two of them collapse: this domain has no `authorized` and no `refunded`.
- **3-D Secure 1.** A `PaReq` posted as a form to the bank's access control server, with
  `TermUrl` telling it where to send the browser back. Use `returnUrlField: 'TermUrl'` and
  let the host fill it in.

## Provider-hosted card fields

Some providers give you a URL to render in an iframe, and post a token back with
`postMessage`. That is what `collect_fields` is for, and what `@pg/provider-hosted-fields`
does.

Note the difference from Stripe Elements: Elements is a _script_ that creates its own
iframes and confirms the payment itself, so it is `sdk_handoff`. A plain hosted-fields page
is a _URL_ you render, so it is `collect_fields`. If the provider gives you a script, it is
a handoff; if it gives you a URL, it is fields.

## Choosing the action kind

1. Does the provider give you a URL for the shopper to visit? → `redirect`
   (`surface: 'top'` if it must own the window, `'iframe'` if it may be framed)
2. Does it give you a URL that renders form fields inside your page? → `collect_fields`
3. Does it give you a script that does the work? → `sdk_handoff`
4. Does it need nothing from the shopper, just time? → `poll`

If none of these fits, that is worth a conversation before adding a fifth kind. Every real
integration listed here fits one of the four.
