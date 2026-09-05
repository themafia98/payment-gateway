# The checkout in a React Native app

The same web checkout, opened in a `WebView`, with the native app driving the chrome around
it. Nothing here is built or tested by this repository: it is outside the npm workspaces on
purpose, so `npm ci` never pulls a native toolchain in.

## Why a WebView rather than native screens

A payment page changes when a provider changes, and it has to pass PCI scrutiny. One web
checkout, used by the browser and by the app, means one place to update and one thing to
review. The parts a shopper expects to feel native - the header, the cancel button, the
result screen - stay native, because those are the parts that never talk to a provider.

The one flow that genuinely wants a native screen is a wallet: Apple Pay and Google Pay
have to be presented by the OS. Take that one natively, and let the WebView cover the rest.

## What the app has to do

```tsx
import {
  createCheckoutMessageHandler,
  createNavigationPolicy,
} from '@checkout-kit/webview-bridge/host'
```

That import has no DOM in it and no engine behind it - it is checked in CI - so it bundles
into React Native cleanly.

**1. Listen.** The web side posts `PAYMENT_*` events. `createCheckoutMessageHandler` parses
them, drops anything that is not ours, and refuses a version it does not understand instead
of guessing at half a message.

**2. Decide where the WebView may go.** `createNavigationPolicy` compares origins for
equality and then matches a path prefix. Without one, any link the page offers runs inside
your app. `http:` is always blocked, and `mailto:`/`tel:` go out to the system.

**3. Handle the return.** Two paths, in this order:

- **Stay inside.** A redirect that happens in the WebView comes back to the return URL, the
  policy calls it `return`, and the app does nothing: the web app hydrates itself, exactly
  as it does after a redirect in a browser. Prefer this - the bank keeps its cookies.
- **Come back by deep link.** For a bank that refuses to be framed, open the URL in
  `ASWebAuthenticationSession` or a Custom Tab, catch `myapp://payment/return?…`, and post
  `PAYMENT_RESUME` with `parseReturnDeepLink`. The checkout picks the payment up from
  session storage, which it wrote before the action started. A system browser does not
  share cookies with your WebView, which is why this is the second choice, not the first.

## Events

| Event                                                                             | When                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `PAYMENT_READY`                                                                   | first, always - tells you the bridge version and the provider |
| `PAYMENT_STATE_CHANGED`                                                           | one of the nine UI states; drive your header from it          |
| `PAYMENT_INTENT_CREATED`                                                          | amount and currency are confirmed                             |
| `PAYMENT_REQUIRES_ACTION`                                                         | carries the URL for a redirect, so you can open it elsewhere  |
| `PAYMENT_ACTION_STARTED` / `PAYMENT_ACTION_FINISHED`                              | around an authentication step                                 |
| `PAYMENT_SUCCEEDED` / `PAYMENT_DECLINED` / `PAYMENT_CANCELLED` / `PAYMENT_FAILED` | the outcome                                                   |
| `PAYMENT_HEIGHT_CHANGED`                                                          | for sizing the WebView, when `reportHeight` is on             |

Commands go the other way: `PAYMENT_CANCEL`, `PAYMENT_RETRY`, `PAYMENT_RESUME`,
`PAYMENT_SET_THEME`, `PAYMENT_PING`.

No card data is ever on this channel. Payloads are built field by field from a whitelist,
and a test runs a real card payment through the bridge and checks the number, the security
code and the name appear in none of it.

## Running it

Point `CHECKOUT_URL` at your own deployment, register the return scheme in
`Info.plist`/`AndroidManifest.xml`, and drop the two files into an Expo or bare React Native
app. There is no build here to run.
