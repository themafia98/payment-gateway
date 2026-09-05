# The Americas: providers and banks

> Русская версия: [americas.ru.md](./americas.ru.md)

Read [Real providers, mapped onto the contract](../real-world-providers.md) first.

## What the region looks like

The United States is a card market. Most payments are a card and nothing else, and until
recently many of them did not even ask for 3-D Secure — issuers there rely on risk scoring
rather than a challenge on every purchase. So a US-only checkout can often go
`confirm` → `succeeded` with no action at all, and the interesting work is in wallets and
saved cards.

Latin America is the opposite: local methods dominate. PIX in Brazil, OXXO in Mexico,
Boleto, and instalments on cards ("cuotas") that a US checkout has never heard of.

## The map

| Provider                | Where                  | Pattern                       | Action                     |
| ----------------------- | ---------------------- | ----------------------------- | -------------------------- |
| Stripe                  | US, CA, LATAM          | PaymentIntent + `next_action` | `redirect` / `sdk_handoff` |
| Braintree               | US, CA                 | client token + nonce          | `sdk_handoff`              |
| PayPal                  | everywhere             | order + approve + capture     | `sdk_handoff` / `redirect` |
| Square                  | US, CA                 | Web Payments SDK + token      | `sdk_handoff`              |
| Authorize.Net           | US, older sellers      | Accept.js token               | `sdk_handoff`              |
| Adyen                   | enterprise             | action object                 | `redirect` / `sdk_handoff` |
| Cybersource             | enterprise, Visa-owned | host-to-host + 3-D Secure     | `redirect`                 |
| Worldpay / FIS          | enterprise             | hosted page or host-to-host   | `redirect`                 |
| Fiserv, Global Payments | banks resell these     | hosted page                   | `redirect`                 |
| dLocal, EBANX           | LATAM                  | payment + redirect or voucher | `redirect` / display       |
| Mercado Pago            | LATAM                  | preference + init point       | `redirect` / `sdk_handoff` |

## Braintree and Square: tokenize, then charge

Both follow the same idea, and it is the one to understand for the US market: their
JavaScript collects the card in fields it owns and hands you a **single-use token**. Your
backend charges that token. The card never touches your code.

Braintree:

```ts
action: {
  id: intentId,
  kind: 'sdk_handoff',
  purpose: 'collect',
  surface: 'none',
  sdk: 'braintree',
  scriptUrl: 'https://js.braintreegateway.com/web/dropin/1.44.0/js/dropin.min.js',
  completion: { via: 'sdk_callback' },
  params: { clientToken: session.clientToken, amount: intent.amount },
}
```

The adapter creates the Drop-in, waits for the shopper, and resolves with
`{ nonce: payload.nonce }`. Then:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'sdk_callback') return unsupported(evidence)
  const { nonce } = evidence.payload as { nonce: string }
  // Your backend calls transaction.sale with the nonce. It holds the private key.
  return toResult(await http.post(`/braintree/charges/${intentId}`, { nonce }, opts))
}
```

Square is the same with different names: `payments.card()`, `card.tokenize()`, and a
`sourceId` instead of a nonce.

Authorize.Net's Accept.js is also this shape, with an older API: it returns an
`opaqueData` object that your backend sends as the payment source.

## Wallets

Apple Pay and Google Pay are the same `sdk_handoff` everywhere — see the
[main mapping page](../real-world-providers.md#apple-pay-and-google-pay). Two region-specific
notes:

- In the US, wallets are a large share of mobile checkouts. Deciding _whether to show the
  button_ belongs in your UI (`ApplePaySession.canMakePayments()`,
  `paymentsClient.isReadyToPay()`), not in a plugin.
- Both hand you a token that a PSP charges. So a "wallet plugin" is usually a thin layer in
  front of Stripe, Braintree or Adyen rather than an integration of its own.

## Latin America

**PIX (Brazil)** is an instant bank transfer identified by a QR code or a copy-paste string.
The shopper opens their banking app, pays, and your backend learns about it seconds later.
There is nothing to redirect to and nothing to collect: you show a code and wait. That is
the `display` action — see
[Showing a code and waiting](./asia.md#showing-a-code-and-waiting), which applies identically
here, and `@checkout-kit/provider-bank-transfer` for a plugin of exactly this shape.

**OXXO and Boleto** are vouchers. The shopper gets a printable slip or a barcode and pays in
cash at a shop, sometimes days later. The same `display` action fits - `format: 'instructions'` -
but the wait is far too long to sit on the page for. Show the slip, then let your backend
notify the shopper by email.

**Instalments** are expected on LATAM cards. The number of instalments is chosen _before_
the payment is created, so it belongs in `CreateIntentInput.metadata`, not in an action.

**dLocal, EBANX and Mercado Pago** aggregate all of this. Most of their flows come back to
`redirect` + `return_url`, with vouchers and PIX as the exceptions.

## Banks in the US

Direct bank integrations are rarer here than in Europe, because the acquiring market is
consolidated into a few processors that banks resell. In practice "our bank's gateway"
usually means Fiserv (First Data), Global Payments, Worldpay/FIS, Elavon or Chase Paymentech.

What you can expect:

- **A hosted payment page** as the recommended path: create a session, redirect, come back.
  `redirect` + `surface: 'top'`.
- **Host-to-host with a signature.** Older APIs sign a concatenation of fields with a shared
  secret. Compute the signature on your backend — it needs the secret.
- **ACH** for bank transfers instead of the card rails. It is slow: `processing` for days.
  Plaid or a similar aggregator handles the account link, which is another `sdk_handoff`.

## Practical notes

**3-D Secure is not automatic in the US.** Your plugin still has to handle
`requires_action`, because the issuer may ask for it at any time, but do not build a UI that
assumes a challenge on every payment.

**Address verification matters more than in Europe.** AVS and postal-code checks are common
reasons for a decline, so the decline message is worth showing verbatim — the contract asks
for that anyway.

**Amounts are minor units, and USD is two-decimal.** Watch out for LATAM currencies that are
not: Chilean pesos have no decimals at all, and getting that wrong charges a hundred times
too much.
