# 3-D Secure ACS simulator

A standalone **Access Control Server** simulator that runs on its own https origin
(`https://localhost:5100`), so the challenge iframe is genuinely **cross-origin** to
the app (`http://localhost:5173`). This lets you inspect the real 3DS security
surface in DevTools instead of a same-origin fake.

## Run

```bash
# terminal 1 — the "bank" (ACS)
npm run dev:acs
# → https://localhost:5100
# FIRST RUN: open that URL once in the browser and accept the self-signed cert.

# terminal 2 — the app
npm run dev:mock
# → http://localhost:5173
```

Pay with a 3DS test card, then enter OTP **`1234`** on the challenge screen:

| Card | 3DS outcome |
| --- | --- |
| `4000002500003155` | authentication passes → `succeeded` |
| `4000008400001629` | authentication attempted, issuer declines → `declined` |
| any wrong OTP | → `declined` |

## Where to inspect the security surface (DevTools, on the challenge step)

- **Network → challenge → Headers**: `Content-Security-Policy: frame-ancestors`,
  `Set-Cookie: …; Secure; SameSite=None; HttpOnly`, `Cross-Origin-*-Policy`.
- **Application → Cookies → https://localhost:5100**: the third-party iframe cookie.
- **Elements**: the `<iframe sandbox referrerpolicy>` attributes.

## How each piece maps to real 3-D Secure

| Mechanism | In this stand | Why in production |
| --- | --- | --- |
| Separate origins | app `http://localhost:5173` ↔ ACS `https://localhost:5100` | the bank is always on its own domain |
| `creq` in the POST body | hidden form → iframe | secrets must not leak via URL / Referer |
| `frame-ancestors` | ACS allows framing only by your origin | anti-clickjacking |
| `SameSite=None; Secure` | ACS session cookie | otherwise the browser drops third-party cookies |
| `sandbox` + `allow-same-origin` | frame keeps the bank's own origin | needed for cookies and a real `event.origin` (without it → `"null"`) |
| origin check in `message` | `event.origin !== ACS_ORIGIN → return` | otherwise any site could post a fake "success" |
| poll / settle on the backend | `authenticate()` → MSW `/complete` | source of truth is the server, not the iframe message |

**Golden rule:** `postMessage` is only a UX signal — the final status always comes
from the backend (`authenticate` re-checks it). A message can be forged; a backend
response cannot.

## Config

- `ACS_PORT` (default `5100`), `PARENT_ORIGIN` (default `http://localhost:5173`),
  `ACS_OTP` (default `1234`) — environment variables read by `server.mjs`.
- The app points at the ACS via `VITE_ACS_ORIGIN` in `.env.mock`.
- Certs in `acs/certs/` are git-ignored — regenerate locally:

```bash
MSYS_NO_PATHCONV=1 openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout acs/certs/key.pem -out acs/certs/cert.pem -days 825 \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```
