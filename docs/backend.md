# The backend a plugin talks to

> Русская версия: [backend.ru.md](./backend.ru.md)

Everything in this repository runs in the browser. That is deliberate for a demo, and it is
the one thing you cannot copy into production: a plugin has no secrets, so it cannot talk to
a provider directly. It talks to your API, and your API talks to the provider.

```text
browser: plugin  →  your API  →  provider's API
```

This page is what to build on the right-hand side of that arrow. It is short, because the
plugin contract is short.

## Why not straight from the browser

Three reasons, in order of how quickly they bite:

1. **The key.** Stripe's `sk_...`, Adyen's `x-api-key`, a bank's `userName`/`password`.
   Anything the browser can send, anyone can read and send too.
2. **The truth.** A browser tells you where it has been, not what happened. `?status=success`
   in a return URL is typed by whoever typed the URL.
3. **CORS.** Most provider APIs do not answer browsers at all, which is not an accident.

## The four endpoints

A plugin needs the same small set whatever the provider looks like underneath.

| Plugin method  | Your endpoint                | What it does                              |
| -------------- | ---------------------------- | ----------------------------------------- |
| `createIntent` | `POST /payments`             | starts a payment, returns its id          |
| `confirm`      | `POST /payments/:id/confirm` | sends the instrument, returns the outcome |
| `resume`       | `POST /payments/:id/resume`  | takes evidence, returns the outcome       |
| `getIntent`    | `GET /payments/:id`          | the current state, authoritative          |
| `cancel`       | `POST /payments/:id/cancel`  | optional                                  |

`getIntent` is the important one. It is what the engine falls back to when an answer is not
final, what polling calls, and what a shopper who reloads the page ends up on.

## What never comes back out

Return only what the checkout has to render:

- the amount, the currency, the status;
- the message the issuer gave for a decline, in the issuer's words;
- the next action, if the provider asked for one.

Never return the provider's raw response, your API keys, the PAN, or anything you would not
want in a browser's memory. The conformance suite checks the last one for every plugin in
this repository: it pays with a card and then walks the whole returned object looking for it.

## Worked example: a card processor

Express, one provider, no framework opinions. The plugin calls this; the browser holds
nothing.

```js
import express from 'express'
import Stripe from 'stripe'

const app = express()
app.use(express.json())

// The key lives here and nowhere else.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const toPayment = (intent) => ({
  id: intent.id,
  amount: intent.amount,
  currency: intent.currency.toUpperCase(),
  status: toStatus(intent.status),
  // The action the plugin will turn into a PaymentAction.
  nextAction: intent.next_action ?? null,
  error: intent.last_payment_error
    ? { code: intent.last_payment_error.code, message: intent.last_payment_error.message }
    : null,
})

app.post('/payments', async (req, res) => {
  // The price comes from your catalogue, never from the browser. A client that can name
  // its own amount will eventually name 1.
  const plan = await plans.byId(req.body.planId)

  const intent = await stripe.paymentIntents.create(
    { amount: plan.amount, currency: plan.currency, automatic_payment_methods: { enabled: true } },
    // Passed through from the plugin: a double-clicked button must not charge twice.
    { idempotencyKey: req.get('Idempotency-Key') },
  )

  res.status(201).json(toPayment(intent))
})

app.post('/payments/:id/confirm', async (req, res) => {
  const intent = await stripe.paymentIntents.confirm(
    req.params.id,
    { payment_method_data: toPaymentMethod(req.body.instrument), return_url: req.body.returnUrl },
    { idempotencyKey: req.get('Idempotency-Key') },
  )

  res.json(toPayment(intent))
})

app.post('/payments/:id/resume', async (req, res) => {
  // The browser is back from the bank. What it says is a hint; this is the answer.
  const intent = await stripe.paymentIntents.retrieve(req.params.id)

  res.json(toPayment(intent))
})

app.get('/payments/:id', async (req, res) => {
  res.json(toPayment(await stripe.paymentIntents.retrieve(req.params.id)))
})
```

Note what `resume` does not do: it does not read `req.body.evidence.params.status`. The
evidence tells you _which_ payment came back, and the provider tells you what happened to it.

## The rules that matter

**The amount comes from your catalogue.** The plugin sends a `planId`, not a price.

**Pass the idempotency key through.** The plugin generates one per attempt and sends it on
every call of that attempt. Forward it to the provider. This is what makes a retry safe.

**Check who is asking.** These endpoints move money. They need the same session or token
check as the rest of your API, and the payment has to belong to the person asking for it.

**Decide with webhooks, tell the page by polling.** The provider will call your webhook when
an asynchronous payment settles - that is the event you trust and store. The checkout page
finds out because `getIntent` starts returning the new status. Neither the plugin nor the
engine needs to know a webhook exists.

**Return the issuer's message.** "Your card has insufficient funds" is what the shopper needs
to hear. "Payment failed" sends them to your support queue instead of to their bank.

## For a hosted page, fields, a wallet or a transfer

The same four endpoints, with one addition each:

- **Hosted page** - register the order, return the URL and any signed parameters. On the way
  back, ignore the query string and read the order.
- **Hosted fields** - exchange the token for a charge. The token arrives from the provider's
  frame; your server is what turns it into money.
- **Wallet** - the wallet payload goes to the provider from your server. On Apple Pay you
  also need the merchant validation endpoint, which is a server call by definition.
- **Instant transfer** - ask the provider for the code, return it, and let the engine poll
  `getIntent` until your webhook has marked the payment paid.

## What this repository does instead

The demo has no server. A mock backend built on MSW answers in the provider's shape directly,
so the plugins are exercised end to end without one. Everywhere a real integration would call
your API, the demo calls the mock - the plugin code is the same either way, which is what
makes it a useful reference despite the missing half.
