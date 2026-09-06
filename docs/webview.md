# The checkout in a native app

> Русская версия: [webview.ru.md](./webview.ru.md)

The same web checkout, opened in a WebView, with the native app around it.
`@checkout-kit/webview-bridge` is the contract between the two.

Why a WebView: a payment page changes when a provider changes and has to pass PCI scrutiny.
One checkout for the browser and the app means one place to update and one thing to review.
The parts a shopper expects to feel native - the header, the cancel button, the result
screen - stay native, because those never talk to a provider.

The exception is a wallet. Apple Pay and Google Pay have to be presented by the OS, so take
those natively and let the WebView cover the rest.

## Three entry points

| Import                                  | Runs where       | Contains                                 |
| --------------------------------------- | ---------------- | ---------------------------------------- |
| `@checkout-kit/webview-bridge`          | the web checkout | subscribes to the engine, posts events   |
| `@checkout-kit/webview-bridge/host`     | React Native     | the message parser and navigation policy |
| `@checkout-kit/webview-bridge/protocol` | both             | the message types                        |

The last two have no DOM in them, which CI checks: `npm run purity` fails if a `window`
appears. That is what lets them bundle into React Native.

## The web side

One line at the composition root. Outside a WebView it returns a no-op, so the same build
serves the browser:

```ts
import { createWebViewBridge } from '@checkout-kit/webview-bridge'

export const bridge = createWebViewBridge(checkout, { reportHeight: true })
```

It subscribes only to the engine public events, so nothing in `@checkout-kit/core` knows the
bridge exists.

## The native side

```tsx
import {
  createCheckoutMessageHandler,
  createNavigationPolicy,
  parseReturnDeepLink,
} from '@checkout-kit/webview-bridge/host'

const handle = createCheckoutMessageHandler({
  PAYMENT_STATE_CHANGED: (event) => setHeading(event.payload.state),
  PAYMENT_SUCCEEDED: () => navigate('Receipt'),
  PAYMENT_DECLINED: (event) => Alert.alert('Declined', event.payload.message),
})

const policy = createNavigationPolicy({
  allow: ['https://pay.example.com/checkout'],
  openExternally: ['https://help.example.com'],
  returnScheme: 'myapp',
})

<WebView
  source={{ uri: 'https://pay.example.com/checkout' }}
  onMessage={(event) => handle(event.nativeEvent.data)}
  onShouldStartLoadWithRequest={(request) => policy.decide(request.url) !== 'block'}
/>
```

A full screen is in [`examples/react-native-checkout`](../examples/react-native-checkout).

## Messages

Every message carries `source: 'checkout-kit'`, a version, an id and a session id - a
WebView receives traffic from everything on the page, and a reloaded WebView leaves stale
messages behind. A version the host does not understand is refused as
`unsupported_version` rather than half-read.

| Event                                                                             | When                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `PAYMENT_READY`                                                                   | first, always: bridge version, provider, what it accepts          |
| `PAYMENT_STATE_CHANGED`                                                           | one of the nine UI states                                         |
| `PAYMENT_INTENT_CREATED`                                                          | amount and currency confirmed                                     |
| `PAYMENT_REQUIRES_ACTION`                                                         | carries the URL for a redirect, so the host may open it elsewhere |
| `PAYMENT_ACTION_STARTED` / `PAYMENT_ACTION_FINISHED`                              | around an authentication step                                     |
| `PAYMENT_SUCCEEDED` / `PAYMENT_DECLINED` / `PAYMENT_CANCELLED` / `PAYMENT_FAILED` | the outcome                                                       |
| `PAYMENT_HEIGHT_CHANGED`                                                          | document height, when `reportHeight` is on                        |

Commands going the other way: `PAYMENT_CANCEL`, `PAYMENT_RETRY`, `PAYMENT_RESUME`,
`PAYMENT_SET_THEME`, `PAYMENT_PING`.

## Coming back from a bank

**Preferred: never leave the WebView.** A redirect happens inside it, the return URL comes
back through `onShouldStartLoadWithRequest`, the policy calls it `return`, and the app does
nothing - the web checkout hydrates itself exactly as it does after a browser redirect. The
bank keeps its cookies, which matters: an access control server that set a device-binding
cookie in the WebView will not see it from anywhere else.

**Fallback: a deep link.** For a bank that refuses to be framed, open the URL in
`ASWebAuthenticationSession` or a Custom Tab, catch the return, and post it back:

```ts
Linking.addEventListener('url', ({ url }) => {
  const params = parseReturnDeepLink(url, { scheme: 'myapp', path: 'payment/return' })
  if (params) send('PAYMENT_RESUME', { params })
})
```

The checkout wrote the provider, intent and action ids to session storage before the action
started, so `hydrate(params)` picks the payment up with no new engine API involved.

## Security

**Set a navigation policy.** Without one, any link the page offers runs inside your app.
`createNavigationPolicy` compares origins for equality and then matches a path prefix -
never a substring, because `https://evil.test/#https://pay.example.com` passes anything that
searches the whole URL as text. `http:` is always blocked.

**No card data crosses the bridge.** Payloads are built field by field from a whitelist, and
a test runs a real card payment through the bridge and asserts that the number, the security
code and the cardholder name appear in none of the messages.

**Check the source.** The host parser drops anything without `source: 'checkout-kit'`, and
the web side ignores commands that fail the same check.

**Serve the checkout over https, from an origin you control**, and put only that origin in
`allow`. A WebView pointed at a URL a server can change is a WebView someone else can aim.
