# Practical questions

> Русская версия: [adopting.ru.md](./adopting.ru.md)

The things a team asks before putting a checkout in their app: how big is it, does it render
on the server, what does it say to a screen reader, what language does it speak, and which
browsers does it drop.

## How big is it

Built, minified and gzipped, as of this commit:

| Package                         | gzipped    |
| ------------------------------- | ---------- |
| `@checkout-kit/core`            | 7.2 kB     |
| `@checkout-kit/runtime-browser` | 3.7 kB     |
| `@checkout-kit/react`           | 1.1 kB     |
| `@checkout-kit/ui` (JS)         | 1.2 kB     |
| `@checkout-kit/ui/styles.css`   | 1.4 kB     |
| a plugin                        | 1.3–2.6 kB |

So a checkout with one provider is roughly 22 kB of JavaScript plus 6 kB of CSS, and every
further provider adds about 1.5 kB. The kit grew when it gained the accessible fields, the
card inputs and the state screens; that is most of a checkout, and it is still less than a
single icon font. There are no runtime dependencies anywhere: every package
declares an empty `dependencies`, and what they need from each other and from React is a peer
dependency.

Two things keep it that way, and both are worth preserving:

- **Plugins are loaded, not imported.** `load: () => import('@checkout-kit/provider-x')` puts
  each one in its own chunk, so a shopper downloads the provider they are paying with. Only
  the default one needs `eager: true`.
- **The kit renders no QR codes and bundles no icons.** A provider that uses QR returns an
  image URL. That decision is why there is no encoder in here.

## Server rendering

`@checkout-kit/core` has no DOM in it, and `npm run purity` fails the build if any gets in.
`@checkout-kit/react` reads the engine through `useSyncExternalStore` with a server snapshot,
so a component that shows a phase or an amount renders on the server without complaint.

Two things are browser-only, and both are honest about it:

- **`createBrowserRuntime()`** reads `window.location` to build the return URL. Create the
  engine in the browser - a module-level `createCheckout()` in a file only the client imports,
  or inside an effect.
- **`<PaymentActionHost/>`** does its work in an effect, so on the server it renders an empty
  `<div>` and starts nothing.

There is nothing to hydrate: a payment in flight lives in session storage, and `hydrate()`
picks it up after a redirect. Call it in a route loader, not an effect - see
[Architecture](./architecture.md).

## Screen readers and keyboard

What the kit renders itself:

- Frames carry a title. Set it to something the shopper will recognise -
  `redirect: { frameTitle: () => 'Bank authentication' }` - because that title is what a
  screen reader announces when focus enters the bank's page.
- The displayed-payment runner marks the copy button as a polite live region, so "Copied"
  is announced, and the QR image has alt text you can set.
- Every field the kit renders goes through `Field`, which gives it a label, an id, and its
  hint and error named in `aria-describedby`. Errors are polite; the payment gets the one
  alert. See [The UI kit](./ui.md).
- Everything is real HTML: a `<button>` is a button and a link is an `<a>`. The one place
  `@checkout-kit/ui` uses ARIA is the provider tabs (`tablist`/`tab`/`aria-selected`) and the
  error text (`role="alert"`).

What is yours, because only you can do it:

- **Announce the payment's state.** The phase lives in the snapshot; putting it in an
  `aria-live="polite"` region is a few lines and it is the difference between a usable
  checkout and a silent one. Nothing in the kit can do this for you: it does not own your
  layout.
- **Move focus deliberately.** When an action opens or a payment settles, decide where focus
  goes.
- **Errors near the field.** `PaymentError.message` is written for a shopper; render it where
  the shopper is looking, with `role="alert"`.

The demo does the last two: errors come back through `ErrorText`, which is a `role="alert"`,
and the waiting state is a `role="status"`. Announcing every phase change is left to the host,
because only the host knows where in its layout that belongs.

## Languages

Every string the kit puts on the screen can be replaced:

```ts
createBrowserRuntime({
  returnPath: '/payment/return',
  redirect: { frameTitle: () => t('checkout.bankAuthentication') },
  collectFields: { frameTitle: () => t('checkout.cardDetails') },
  display: {
    text: {
      copy: t('common.copy'),
      copied: t('common.copied'),
      openApp: t('checkout.openBankApp'),
    },
  },
})
```

Messages that come back from a payment are a different matter. `PaymentError.message` is the
provider's wording - usually the issuer's - and translating it is not yours to do: "your card
has insufficient funds" is what the bank said, and changing it can change what it means.

If you need translated messages, branch on `PaymentError.code` and fall back to `message`
when you do not recognise the code. That is what `code` is for, and it is why errors here are
data rather than exception classes.

Nothing formats money for you either. `intent.amount` is in minor units and `intent.currency`
is an ISO code, which is everything `Intl.NumberFormat` needs.

## Browsers

ESM only, no CommonJS build. The packages ship the syntax they were written in, so your
bundler decides how far back they compile.

What the kit itself needs at runtime is short, and worth knowing exactly:

| Used                      | Where                    | Since                                |
| ------------------------- | ------------------------ | ------------------------------------ |
| `crypto.randomUUID`       | the engine's default ids | Chrome 92, Firefox 95, Safari 15.4   |
| `AbortSignal.any`         | racing an action         | Chrome 116, Firefox 124, Safari 17.4 |
| `Element.replaceChildren` | releasing a mount        | Chrome 86, Firefox 78, Safari 14     |

`AbortSignal.any` is the newest of those by two years, so the engine uses it only when it is
there and falls back to a listener otherwise - a phone two versions behind still buys things.
`crypto.randomUUID` is then the practical floor, and even that is replaceable:
`createCheckout({ uuid: () => myOwnId() })`. It also needs a secure context, which a payment
page has anyway.

If you find something else that pushes the floor up, that is a bug worth reporting.

Two browser behaviours are worth knowing about because they affect real payments:

- **Third-party cookie blocking** breaks some bank pages inside an iframe. If a challenge
  frame comes back blank in Safari, run that action in the whole window instead:
  `runPendingAction({ surface: 'top' })`. The plugin does not have to change.
- **Session storage** is what survives a full-page redirect. In a private window it works;
  with site data blocked entirely it does not, and `hydrate()` returns `null` - which is why
  the payment is also readable from your API by id.

## What is not covered

- **No CommonJS.** `instanceof` across two copies of a dual-published class lies, and a
  payment library is a bad place for that. Node 22 can `require()` ESM.
- **No React below 19.** The React package is thin enough to reimplement for another
  framework: it is one `useSyncExternalStore` and one effect.
- **No i18n of provider messages**, as above.
- **No offline support.** A payment is a conversation with a server.
