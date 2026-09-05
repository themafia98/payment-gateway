# Integrating a real payment SDK

> Русская версия: [integrations.ru.md](./integrations.ru.md)

How each popular provider maps onto the contract, in one place so they can be compared. Read
[Writing a payment plugin](./plugin-authoring.md) first for what `confirm`, `resume`, an
action and evidence are, and [The backend a plugin talks to](./backend.md) for the half that
holds your keys.

Every section below follows the same shape: **what the SDK gives you → which action kind →
which runner executes it → what to declare → what your server needs**.

## One rule, before any of them

**A plugin runs in the browser, so it never holds a secret key.** Stripe `sk_`, Adyen
`x-api-key`, PayPal client secret, a bank `userName`/`password` - all of it lives on your
server. The plugin calls your API; your API calls the provider.

Where an SDK has a _publishable_ key (`pk_`, a Braintree client token, an Adyen client key),
that one is fine in the browser: it can start a payment but not move money.

## The map

| Provider                       | What it hands you                | Action kind                | Surface        | Completes via  |
| ------------------------------ | -------------------------------- | -------------------------- | -------------- | -------------- |
| Stripe, redirect next action   | `next_action.redirect_to_url`    | `redirect`                 | `top`          | `return_url`   |
| Stripe.js / Elements           | a script that confirms for you   | `sdk_handoff`              | `none`         | `sdk_callback` |
| Stripe Checkout                | a hosted URL                     | `redirect`                 | `top`          | `return_url`   |
| Adyen `action.type=redirect`   | url + method + data              | `redirect`                 | `top`          | `return_url`   |
| Adyen `action.type=threeDS2`   | a token for its own SDK          | `sdk_handoff`              | `none`         | `sdk_callback` |
| Adyen Drop-in                  | a script that renders everything | `sdk_handoff`              | `none`         | `sdk_callback` |
| Braintree                      | a client token, then a nonce     | `sdk_handoff`              | `none`         | `sdk_callback` |
| Checkout.com Frames            | an iframe you host               | `collect_fields`           | `inline`       | `post_message` |
| PayPal buttons                 | a script drawing its own button  | `sdk_handoff`              | `none`         | `sdk_callback` |
| PayPal redirect                | an approval URL                  | `redirect`                 | `top`          | `return_url`   |
| Apple Pay / Google Pay         | a sheet the OS draws             | `sdk_handoff`              | `none`         | `sdk_callback` |
| Klarna                         | a hosted page or a widget        | `redirect` / `sdk_handoff` | `top` / `none` | `return_url`   |
| Bank host-to-host + 3-D Secure | a form to POST                   | `redirect`                 | `iframe`       | `post_message` |
| PIX / UPI / BLIK               | a QR string or a code            | `display`                  | `inline`       | `poll`         |

The pattern behind the table: **a URL is a `redirect`, a script is an `sdk_handoff`, a URL
that renders fields is `collect_fields`, a code to show is a `display`, and nothing to do but
wait is a `poll`.**

## Stripe

Two integrations worth having, and they are not the same shape.

**Payment Intents with a redirect.** Your server confirms and hands back `next_action`:

```ts
confirm: async (intentId, instrument, opts) => {
  const dto = await http.post<PaymentDto>(`/payments/${intentId}/confirm`, {
    // A card typed in your form; or `{ paymentMethodId }` for a saved one.
    card: instrument.kind === 'card' ? { number: instrument.number, ... } : undefined,
  }, { signal: opts.signal })

  if (dto.nextAction?.type === 'redirect_to_url') {
    return {
      status: 'requires_action',
      intent: toIntent(dto),
      action: {
        id: dto.nextAction.id,
        kind: 'redirect',
        purpose: 'authenticate',
        surface: 'top',
        url: dto.nextAction.url,
        method: 'GET',
        returnUrlField: 'return_url',
        completion: { via: 'return_url' },
      },
    }
  }

  return toResult(dto)
}
```

`returnUrlField` matters: only the host knows its own base path, so the engine fills the
absolute return URL in. Building it in the plugin breaks the day the app is served from a
sub-path.

On the way back, `resume` **re-reads the intent** rather than believing the query string.

**Stripe.js and Elements** is the other shape: a script that mounts its own iframes and
confirms the payment itself. That is an `sdk_handoff` with `surface: 'none'`, and the adapter
is registered by the host, not by the plugin:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  sdk: {
    adapters: [
      {
        sdk: 'stripe',
        request: async (params) => {
          const stripe = await loadStripe(publishableKey)
          const result = await stripe.confirmPayment({
            clientSecret: params.clientSecret as string,
            confirmParams: { return_url: window.location.origin + '/payment/return' },
            redirect: 'if_required',
          })
          if (result.error) throw new Error(result.error.message)
          return { paymentIntentId: result.paymentIntent.id }
        },
      },
    ],
  },
})
```

`capabilities`: `instruments: ['card', 'token']`, `actions: ['redirect']` (or
`['sdk_handoff']` for Elements), `surfaces: ['top']`, `poll: true`, `idempotency: 'header'`.

Your server needs: create, confirm, read, and a webhook for `payment_intent.succeeded`.
Forward the plugin `Idempotency-Key` to Stripe verbatim.

## Adyen

Adyen answers `/payments` with an `action` object. Its `type` is the whole decision:

```ts
switch (dto.action?.type) {
  case 'redirect':
    return {
      status: 'requires_action',
      intent,
      action: {
        id: dto.action.paymentData,
        kind: 'redirect',
        purpose: 'authenticate',
        surface: 'top',
        url: dto.action.url,
        method: dto.action.method,
        fields: dto.action.data,
        completion: { via: 'return_url' },
      },
    }

  case 'threeDS2':
    // Adyen wants its own SDK to do the fingerprint or the challenge.
    return {
      status: 'requires_action',
      intent,
      action: {
        id: dto.action.paymentData,
        kind: 'sdk_handoff',
        purpose: 'authenticate',
        surface: 'none',
        sdk: 'adyen',
        params: { token: dto.action.token, subtype: dto.action.subtype },
        completion: { via: 'sdk_callback' },
      },
    }
}
```

`resume` sends the collected `details` back to `/payments/details` through your server.

**Drop-in** is one `sdk_handoff` for the whole payment: Adyen renders the method list, the
fields and the authentication. The plugin then does very little, which is the point.

`capabilities`: `actions: ['redirect', 'sdk_handoff']`, `surfaces: ['top', 'none']`,
`authentication: ['3ds1', '3ds2']`.

## Braintree

A client token from your server, then the SDK produces a payment method nonce, then your
server charges the nonce. All of that is one `sdk_handoff`:

```ts
{ kind: 'sdk_handoff', surface: 'none', sdk: 'braintree',
  scriptUrl: 'https://js.braintreegateway.com/web/dropin/1.44.0/js/dropin.min.js',
  integrity: 'sha384-…',
  params: { clientToken: dto.clientToken, amount: dto.amount },
  completion: { via: 'sdk_callback' } }
```

The runner loads the script once however many payments ask for it, honours `integrity` and
times out. The adapter returns `{ nonce }`, and `resume` posts that to your server.

## Checkout.com Frames

A URL that renders card fields inside your page, answering by `postMessage`. That is
`collect_fields`:

```ts
{ kind: 'collect_fields', surface: 'inline',
  url: 'https://frames.example.com/fields',
  origin: 'https://frames.example.com',
  fields: ['number', 'exp', 'cvc'],
  completion: { via: 'post_message', origin: 'https://frames.example.com', type: 'card-tokenized' } }
```

The runner sandboxes the frame with no `allow-forms` and no top navigation, and checks
three things on every message: the origin, the type and the action id. The token that comes
back is exchanged for a charge **on your server** - the browser only ever holds the token.

## PayPal

**Buttons** are an `sdk_handoff`: the script draws PayPal own button, opens its own window,
and hands back an order id. Register the adapter with your client id.

**Redirect** is the older shape: your server creates an order, PayPal returns an approval
link, and that is a `redirect` with `surface: 'top'` completing by `return_url`. Your server
then captures the order - `resume` must not treat the return as payment.

## Apple Pay and Google Pay

Both are `sdk_handoff` with `surface: 'none'`: the sheet belongs to the OS, and nothing of
yours renders. Two things are yours alone:

- **Merchant validation** (Apple Pay) is a server call by definition - the domain has to be
  registered and the session signed with your merchant certificate.
- **The payload goes to the provider from your server.** The browser holds an encrypted blob
  it cannot open, and it should not try.

In a React Native app, take these natively rather than in the WebView - see
[the WebView guide](./webview.md).

## Klarna and other pay-later methods

Usually a hosted page (`redirect`, `surface: 'top'`, `return_url`), sometimes a widget
(`sdk_handoff`). Two things differ from a card:

- The outcome can be `processing` for minutes. Declare `poll: true` and let the engine wait,
  or let your webhook settle it and the shopper hear by email.
- The amount and the basket must match what was authorised. Send the plan id, never a price
  from the browser.

## QR and code payments

PIX, UPI, BLIK, PromptPay, Konbini: your server asks the provider for a code, and the
shopper pays it somewhere you cannot see. That is a `display` action completing by `poll`,
and `@checkout-kit/provider-bank-transfer` in this repository is a working plugin of exactly
that shape. See [Showing a code and waiting](./providers/asia.md#showing-a-code-and-waiting).

## Checklist for any of them

1. Write the plugin against the contract, then run the conformance suite -
   `describeProviderContract` - before writing any UI.
2. Declare `capabilities.instruments` as exactly what `confirm` accepts. The suite checks
   both directions, and a checkout builds its form from that list.
3. Never build a return URL in the plugin. Name the field with `returnUrlField`.
4. `confirm` and `resume` never throw. Every failure is `{ status: 'error' }`.
5. Evidence is a hint. Re-read the payment from your server before telling anyone it worked.
6. Forward the idempotency key to the provider.
7. Return the issuer message, in the issuer words.
