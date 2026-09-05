# 3-D Secure ACS simulator

A standalone **Access Control Server** simulator that runs on its own https origin
(`https://localhost:5100`), so the challenge iframe is genuinely **cross-origin** to
the app (`http://localhost:5173`). This lets you inspect the real 3DS security
surface in DevTools instead of a same-origin fake.

## Run

```bash
# terminal 1 — the "bank" (ACS)
npm run dev:bank
# → https://localhost:5100
# FIRST RUN: open that URL once in the browser and accept the self-signed cert.

# terminal 2 — the app
npm run dev:mock
# → http://localhost:5173
```

Pay with a 3DS test card, then enter OTP **`1234`** on the challenge screen:

| Card               | 3DS outcome                                            |
| ------------------ | ------------------------------------------------------ |
| `4000002500003155` | authentication passes → `succeeded`                    |
| `4000008400001629` | authentication attempted, issuer declines → `declined` |
| any wrong OTP      | → `declined`                                           |

## Where to inspect the security surface (DevTools, on the challenge step)

- **Network → challenge → Headers**: `Content-Security-Policy: frame-ancestors`,
  `Set-Cookie: …; Secure; SameSite=None; HttpOnly`, `Cross-Origin-*-Policy`.
- **Application → Cookies → https://localhost:5100**: the third-party iframe cookie.
- **Elements**: the `<iframe sandbox referrerpolicy>` attributes.

## How each piece maps to real 3-D Secure

| Mechanism                       | In this stand                                              | Why in production                                                    |
| ------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Separate origins                | app `http://localhost:5173` ↔ ACS `https://localhost:5100` | the bank is always on its own domain                                 |
| `creq` in the POST body         | hidden form → iframe                                       | secrets must not leak via URL / Referer                              |
| `frame-ancestors`               | ACS allows framing only by your origin                     | anti-clickjacking                                                    |
| `SameSite=None; Secure`         | ACS session cookie                                         | otherwise the browser drops third-party cookies                      |
| `sandbox` + `allow-same-origin` | frame keeps the bank's own origin                          | needed for cookies and a real `event.origin` (without it → `"null"`) |
| origin check in `message`       | `event.origin !== ACS_ORIGIN → return`                     | otherwise any site could post a fake "success"                       |
| poll / settle on the backend    | `authenticate()` → MSW `/complete`                         | source of truth is the server, not the iframe message                |

**Golden rule:** `postMessage` is only a UX signal — the final status always comes
from the backend (`authenticate` re-checks it). A message can be forged; a backend
response cannot.

## Two ways to show the bank (both are real)

Some banks (e.g. Santander) do the challenge **in the same window**, not in an iframe.
This stand supports both, so you can compare them side by side.

- **iframe mode** — the bank page lives in a little window inside our page. When the
  user finishes, the bank whispers the result back with `postMessage`; we never leave.
  (Switch: happens by default.)
- **redirect mode** — the **whole page** flies to the bank. When done, the bank sends
  the browser **back** to our return URL (`/3ds/return?challengeId=…&transStatus=Y|N`),
  the app boots fresh, and `/3ds/return` settles the payment. (Switch: the
  "Open bank in this window" button — the app sends a `termUrl`, which is what tells
  the ACS to redirect instead of postMessage.)

ELI5: iframe = the bank is picture-in-picture on your TV. Redirect = you change the
channel to the bank, then it changes you back.

Note the state difference: redirect wipes all in-memory React state (full reload), so
everything needed on return rides in the **URL** (`intentId`, `challengeId`,
`transStatus`) — the same reason the receipt page reads `intentId` from the URL.

### Redirect safety

The ACS only ever redirects back to `PARENT_ORIGIN`. A `termUrl` pointing anywhere else
is rejected with `400` — otherwise a phisher could turn the bank page into an
**open redirect** to steal users.

## Explain-like-I'm-5 glossary

| Thing                              | Kid version                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **origin**                         | a page's "home address" (protocol + host + port). Different port = different home.                     |
| **cross-origin**                   | the bank lives at a _different_ home than our app.                                                     |
| **iframe**                         | a little window showing another page inside ours.                                                      |
| **`sandbox`**                      | rules for the little window: "you may run scripts and submit forms, nothing else".                     |
| **`allow-same-origin`**            | lets the bank keep its own name tag, so its cookies work and its messages have a real address.         |
| **`postMessage`**                  | shouting a note between two pages. Always check _who_ is shouting (`origin`).                          |
| **`creq`**                         | a sealed note we hand the bank in the request **body**, not the address bar.                           |
| **`frame-ancestors`**              | the bank saying "only THIS app may put me in a little window".                                         |
| **`SameSite=None; Secure`**        | a cookie's permission slip to work inside someone else's window (needs https).                         |
| **`Referrer-Policy: no-referrer`** | "don't tell the bank which page I came from".                                                          |
| **`termUrl`**                      | the "bring me back here when you're done" address, used only in redirect mode.                         |
| **poll / settle**                  | after the bank says "ok", we still ask our OWN server "is it really paid?" — that answer is the truth. |

## Config

- `ACS_PORT` (default `5100`), `PARENT_ORIGIN` (default `http://localhost:5173`),
  `ACS_OTP` (default `1234`) — environment variables read by `server.ts`.
- The app points at the ACS via `VITE_ACS_ORIGIN` in `.env.mock`.
- Certs in `apps/bank-sim/certs/` are git-ignored — regenerate locally:

```bash
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout apps/bank-sim/certs/key.pem -out apps/bank-sim/certs/cert.pem -days 825 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```
