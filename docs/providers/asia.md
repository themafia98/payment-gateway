# Asia: providers and banks

> Русская версия: [asia.ru.md](./asia.ru.md)

Read [Real providers, mapped onto the contract](../real-world-providers.md) first.

## What the region looks like

Asia is where a card-shaped checkout stops working. In China, payments run through Alipay and
WeChat Pay. In India, UPI moves more transactions than cards. In Indonesia, Thailand and
Vietnam, QR standards and bank transfers dominate; in Japan, convenience-store payments and
carrier billing are still ordinary.

Most of these follow one of two shapes:

- **App handoff.** On a phone, open the payment app with a deep link. The shopper approves
  there and comes back.
- **Show a code and wait.** On a desktop, show a QR the shopper scans with their phone. There
  is nothing to redirect to, and nothing to collect from them.

The first fits our `redirect` action. The second does not fit anything yet, and that gap is
described at the end of this page.

## The map

| Provider            | Where               | Pattern                        | Action                     |
| ------------------- | ------------------- | ------------------------------ | -------------------------- |
| Alipay / Alipay+    | CN and cross-border | order code, then poll          | display + poll _(see gap)_ |
| WeChat Pay          | CN                  | prepay id, QR or JSAPI         | display + poll _(see gap)_ |
| Razorpay            | IN                  | order + checkout SDK           | `sdk_handoff`              |
| PayU India, Paytm   | IN                  | hosted page or SDK             | `redirect` / `sdk_handoff` |
| UPI                 | IN                  | deep link or QR                | `redirect` / display       |
| Midtrans, Xendit    | ID                  | transaction + redirect or VA   | `redirect` / display       |
| Omise, 2C2P         | TH, SEA             | token + charge, PromptPay QR   | `sdk_handoff` / display    |
| GrabPay, ShopeePay  | SEA                 | order + deep link              | `redirect`                 |
| Toss, KakaoPay      | KR                  | ready + redirect + approve     | `redirect`                 |
| PayPay, Komoju, GMO | JP                  | redirect, or convenience store | `redirect` / display       |
| Stripe, Adyen       | JP, SG, HK, AU      | as everywhere else             | `redirect` / `sdk_handoff` |

## Razorpay (India)

The most common integration in India, and a clean `sdk_handoff`.

Your backend creates an order. The browser opens Razorpay's checkout with that order id, the
shopper pays by UPI, card, netbanking or a wallet, and the SDK hands back three fields:

```ts
action: {
  id: order.id,
  kind: 'sdk_handoff',
  purpose: 'authorize',
  surface: 'none',
  sdk: 'razorpay',
  scriptUrl: 'https://checkout.razorpay.com/v1/checkout.js',
  completion: { via: 'sdk_callback' },
  params: { key: ctx.config.keyId, orderId: order.id, amount: intent.amount },
}
```

The adapter opens the checkout and resolves with what the handler receives:

```ts
{
  razorpay_payment_id: 'pay_29QQoUBi66xm2f',
  razorpay_order_id: 'order_9A33XWu170gUtm',
  razorpay_signature: '9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d',
}
```

**That signature is the whole point, and it must be checked on your server.** It is an HMAC
over `order_id|payment_id` with your key secret. A plugin cannot verify it — it does not have
the secret and should not — so `resume` sends all three fields to your backend and reports
whatever the backend says:

```ts
resume: async (intentId, evidence, opts) => {
  if (evidence.via !== 'sdk_callback') return unsupported(evidence)
  return toResult(await http.post(`/razorpay/orders/${intentId}/verify`, evidence.payload, opts))
}
```

This is the strongest example of the "evidence is a hint" rule in this whole repository: the
browser is holding a signed message, and it is still the server that decides.

## Midtrans and Xendit (Indonesia)

Both give you a redirect URL for a hosted page — `redirect` + `surface: 'top'` +
`return_url` — and both also offer **virtual accounts**: the shopper is given a bank account
number and transfers to it, possibly tomorrow. A virtual account is a display-and-wait flow,
same as a QR.

Xendit's invoice API is the simplest starting point: create an invoice, redirect to
`invoice_url`, then read the invoice status in `resume`.

## Omise and 2C2P (Thailand and SEA)

Omise tokenizes the card in its own JavaScript (`sdk_handoff`, resolve with a token, charge
it on your backend), and offers **PromptPay** as a QR — the display-and-wait flow again.

2C2P is more enterprise and usually a hosted page: `redirect` + `return_url`.

## Toss Payments and KakaoPay (Korea)

Korean APIs use a three-step shape: _ready_, _approve_, _confirm_.

1. Your backend calls "ready" and gets a URL.
2. The shopper is redirected there and approves.
3. They come back with a key, and your backend calls "approve" with it.

That maps to `redirect` + `return_url`, and `resume` performing the approve call. As with
PayPal, **the approve call is what moves the money**, so a return to your page proves
nothing on its own.

## Alipay and WeChat Pay (China)

Both work the same way from a merchant's side. You create an order and receive a code — a QR
payload for desktop, or a deep link for a phone. The shopper pays in their app. Your backend
finds out through a webhook, and polls a query API when the webhook does not arrive.

For the deep-link case a plugin can already do this today:

```ts
action: {
  id: order.id,
  kind: 'redirect',
  purpose: 'authorize',
  surface: 'top',
  url: order.deepLink,     // opens the app on a phone
  method: 'GET',
  completion: { via: 'return_url' },
}
```

For the QR case, see the gap below.

Note also that the shopper may never come back to your page at all: they pay in the app and
switch away. The payment is still complete. That is one more reason the outcome must come
from your API and not from the browser returning.

## The gap: QR codes and deep links

The contract has four action kinds, and none of them says _"show this to the shopper and
wait"_. That covers a lot of Asia — Alipay, WeChat, PromptPay, UPI QR, Indonesian virtual
accounts — and also PIX in Brazil and BLIK codes in Poland.

What you can do today, in order of preference:

1. **Deep link instead of QR on mobile.** `redirect` with `surface: 'top'` works, and on a
   phone it is the better experience anyway.
2. **Render the QR yourself, outside the plugin.** Return `{ status: 'processing' }` from
   `confirm` with the code in `intent`, let the engine poll, and show the QR from your own
   UI. This works, but it puts a piece of the payment flow in the host application, which is
   exactly what this architecture is meant to avoid.

What is actually missing is a fifth action kind:

```ts
| (ActionBase & {
    kind: 'display'
    surface: 'inline'
    content: { type: 'qr' | 'code' | 'instructions'; value: string; label?: string }
    deepLink?: string
    completion: { via: 'poll'; intervalMs: number; timeoutMs: number }
  })
```

with a runner that renders it and an engine that polls the provider at the same time,
stopping the display when the payment settles. Adding it is a change to `@pg/core`,
`@pg/runtime-browser` and the conformance suite — the honest cost of covering the region
properly, and it is on the list of known gaps rather than quietly missing.

## Banks in Asia

Direct bank integrations vary too much to generalise, but three things come up again and
again:

- **Bank transfer with a reference number.** The shopper transfers manually and quotes a
  code. Display-and-wait, and the wait can be a day.
- **Local card schemes.** RuPay in India, JCB in Japan, UnionPay across the region. From the
  contract's point of view these are ordinary cards; what changes is which BINs your PSP
  accepts and which authentication they use.
- **Regional 3-D Secure.** RuPay and UnionPay have their own authentication flows that still
  come down to "post something to a URL and get a verdict back", which is a `redirect`
  action with a `post_message` or `return_url` completion.

## Practical notes

**Currencies without decimals.** The Japanese yen, the Korean won and the Vietnamese dong
have no minor unit. `amount: 1000` means ¥1000, not ¥10.00. Getting this wrong is a
hundred-fold error, and it is the single most common bug in a first Asian integration.

**The shopper may not come back.** Phone-based flows often end in another app. Never make the
final status depend on the browser returning to your page.

**Timeouts are longer.** A QR or a virtual account can stay open for hours. The engine's
default poll timeout is a minute, which is right for a checkout page but not for the whole
payment — the shopper should be able to leave, and your backend should tell them the outcome
later.
