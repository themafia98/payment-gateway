# Europe: providers and banks

> Русская версия: [europe.ru.md](./europe.ru.md)

Read [Real providers, mapped onto the contract](../real-world-providers.md) first. It
explains the four action kinds and the rule that a plugin never holds a secret key.

Field names change. Check the provider's current documentation before you ship; what does
not change is the shape a plugin has to produce.

## What Europe looks like

Cards are not the default everywhere. In the Netherlands most people pay with iDEAL, in
Poland with BLIK, in Germany many prefer direct debit or an invoice from Klarna. Almost all
of these are **redirect** flows: the shopper leaves for their bank or the method's app and
comes back.

That is convenient for us. One `redirect` action with `surface: 'top'` and
`completion: { via: 'return_url' }` covers iDEAL, Bancontact, BLIK, Przelewy24, EPS,
Sofort/Klarna and most others. The plugin differs only in what it sends to create the
payment.

## The map

| Provider             | Where it is used          | Pattern                         | Action                       |
| -------------------- | ------------------------- | ------------------------------- | ---------------------------- |
| Adyen                | everywhere, large sellers | action object                   | `redirect` / `sdk_handoff`   |
| Stripe               | everywhere                | PaymentIntent + `next_action`   | `redirect` / `sdk_handoff`   |
| Mollie               | NL, BE, DE, FR            | payment + `_links.checkout`     | `redirect`                   |
| Checkout.com         | UK, EU enterprise         | payment + `_links.redirect`     | `redirect`                   |
| Klarna               | Nordics, DE, NL           | session + SDK, or hosted page   | `sdk_handoff` / `redirect`   |
| Worldline / Ingenico | FR, BE, incumbent banks   | hosted page or host-to-host     | `redirect`                   |
| Nexi / Nets          | IT, Nordics               | hosted page                     | `redirect`                   |
| PayU                 | PL, CEE                   | order + `redirectUri`           | `redirect`                   |
| Trustly              | Nordics, bank transfer    | order + redirect                | `redirect`                   |
| Bank acquiring       | most local banks          | host-to-host, 3-D Secure 1 or 2 | `redirect` (frame or window) |

## Mollie

The simplest API in this list, and a good first plugin.

Your backend creates a payment; the response carries a checkout URL:

```json
{
  "id": "tr_WDqYK6vllg",
  "status": "open",
  "_links": { "checkout": { "href": "https://www.mollie.com/checkout/select-method/..." } }
}
```

```ts
confirm: async (intentId, instrument) => {
  if (instrument.kind !== 'none') return unsupported(instrument)

  const payment = await http.get<MolliePaymentDto>(`/mollie/payments/${intentId}`)

  return {
    status: 'requires_action',
    intent: toIntent(payment),
    action: {
      id: payment.id,
      kind: 'redirect',
      purpose: 'authorize',
      surface: 'top',
      url: payment._links.checkout.href,
      method: 'GET',
      completion: { via: 'return_url' },
    },
  }
}
```

`resume` reads the payment again. Mollie sends the shopper back to your `redirectUrl` with
no result in the query at all, which makes the rule easy to follow here: there is nothing to
trust except the API.

| Mollie `status`     | domain status |
| ------------------- | ------------- |
| `paid`              | `succeeded`   |
| `open`, `pending`   | `processing`  |
| `failed`, `expired` | `declined`    |
| `canceled`          | `canceled`    |

## Checkout.com

A card payment either succeeds straight away or returns a redirect link for
3-D Secure:

```json
{
  "id": "pay_mbabizu24mvu3mela5njyhpit4",
  "status": "Pending",
  "_links": { "redirect": { "href": "https://api.checkout.com/3ds/pay_mba..." } }
}
```

Use `surface: 'top'` and `completion: { via: 'return_url' }`. The shopper comes back with
`cko-session-id`, and `resume` exchanges it for the payment:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'return_url') return unsupported(evidence)
  const payment = await http.get(`/checkout/payments/${evidence.params['cko-session-id']}`, opts)
  return toResult(payment)
}
```

Status names to map: `Authorized` and `Captured` → `succeeded`, `Declined` → `declined`,
`Pending` → `processing`, `Canceled`/`Expired` → `canceled`.

## Klarna

Two shapes, and which one you get depends on the integration you chose:

- **Klarna Payments with the SDK** — you create a session on the server, then Klarna's
  JavaScript renders the method and authorizes it. This is `sdk_handoff` with
  `sdk: 'klarna'`; the adapter calls `Klarna.Payments.authorize` and resolves with the
  `authorization_token`. Then `resume` asks your backend to create the order with that
  token.
- **Klarna Hosted Payment Page** — a URL to redirect to, so a plain `redirect` action.

Klarna is worth calling out because the money moves at _order creation_, not at
authorization. An authorization token is not a payment, so `resume` must create the order
and report what that returns.

## Worldline, Nexi, Nets and other incumbents

These are the platforms banks resell, and they usually offer both:

- a **hosted payment page**: create a session server-side, redirect the shopper, come back
  and read the status. `redirect` + `surface: 'top'`.
- **host-to-host**: you post the card yourself and get back an ACS URL for 3-D Secure. This
  is the shape `@checkout-kit/provider-acquiring` follows.

Expect older conventions here: form-encoded bodies, signatures over concatenated fields
(`SHA-256` of a fixed field order and a shared secret), and numeric status codes. Compute
the signature **on your backend** — it needs the shared secret, so it can never be done in
a plugin.

## Local methods, one pattern

iDEAL, Bancontact, BLIK, Przelewy24, EPS, MB WAY — through any of the PSPs above, all of
these come down to the same thing:

```ts
action: {
  id: payment.id,
  kind: 'redirect',
  purpose: 'authorize',
  surface: 'top',
  url: payment.redirectUrl,
  method: 'GET',
  completion: { via: 'return_url' },
}
```

Two of them have a twist worth knowing:

- **BLIK** in Poland can also work with a six-digit code the shopper types on your page. The
  shopper then confirms in their banking app, and you wait. Today the contract has no action
  for "collect a short code, then poll" — see the gap note in the
  [Asia guide](./asia.md#the-gap-qr-codes-and-deep-links).
- **SEPA direct debit** is not a redirect at all: the shopper signs a mandate, and the money
  arrives days later. Model it as `processing` and let the engine poll, or treat the mandate
  step as its own action.

## Banks in Europe

If you integrate a bank directly rather than through a PSP, expect one of three shapes.

**1. The bank resells a platform.** You are really integrating Worldline, Nexi or similar.
See above.

**2. Host-to-host acquiring.** The bank's own API, usually form-encoded, with credentials
in every request and numeric statuses. `@checkout-kit/provider-acquiring` is written against this
shape:

```text
register.do                 create the order
paymentorder.do             send the card, get acsUrl + PaReq + MD if 3-D Secure is needed
finish3ds.do                send PaRes and MD
getOrderStatusExtended.do   read the real outcome
```

The trap is always the same: a refused card comes back as a _successful_ HTTP 200 with a
status field. A non-zero error code means the request failed, not the payment.

**3. Open banking (PSD2).** The shopper is redirected to their own bank to approve a
transfer. From a plugin's point of view this is a redirect like any other:
`redirect` + `surface: 'top'` + `return_url`, and then read the payment status. The
consent and the transfer may settle at different times, so expect `processing`.

## Practical notes

**Strong Customer Authentication is not optional in the EU.** Most card payments will ask
for 3-D Secure, so build the flow assuming an action is coming, not assuming it is rare.

**Currencies and minor units.** The domain uses minor units, and most of Europe is
two-decimal. Watch out anyway: some providers send `"10.00"` as a string, and some send
amounts in an object with a currency code.

**Refunds and captures are not in this contract.** They happen in your back office, not in a
checkout, so no plugin here implements them.
