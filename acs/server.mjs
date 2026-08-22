// Standalone 3-D Secure ACS (Access Control Server) simulator.
//
// Runs on its OWN https origin (https://localhost:5100) so the challenge iframe
// is genuinely CROSS-ORIGIN relative to the app (http://localhost:5173). That is
// the whole point: it lets you inspect real 3DS security surface in DevTools —
// CSP frame-ancestors, third-party SameSite=None cookies, COOP/COEP/CORP, and
// cross-origin postMessage — instead of a same-origin fake.
//
// Flow (mirrors EMV 3DS2 challenge):
//   1. App auto-submits a hidden form POST to /challenge/:id with a `creq` field
//      (base64url JSON) TARGETED at the iframe -> this page loads inside it.
//   2. User enters the OTP (test code: 1234). The ACS validates it locally.
//   3. ACS posts the Challenge Response (`cres`) back to the parent via
//      window.parent.postMessage(cres, PARENT_ORIGIN) — transStatus Y/N only,
//      never the OTP. The app then settles + polls its own backend (source of truth).

import { createServer } from 'node:https'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID, randomBytes } from 'node:crypto'

const here = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.ACS_PORT ?? 5100)
const PARENT_ORIGIN = process.env.PARENT_ORIGIN ?? 'http://localhost:5173'
const OTP_SUCCESS = process.env.ACS_OTP ?? '1234'

const tls = {
  key: readFileSync(join(here, 'certs/key.pem')),
  cert: readFileSync(join(here, 'certs/cert.pem')),
}

/** Real 3DS security headers. `nonce` locks down inline scripts (no 'unsafe-inline'). */
const securityHeaders = (nonce) => ({
  'Content-Type': 'text/html; charset=utf-8',
  // The bank page allows ONLY our app to frame it (anti-clickjacking).
  'Content-Security-Policy': [
    `frame-ancestors ${PARENT_ORIGIN}`,
    `default-src 'none'`,
    `style-src 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `form-action 'self'`,
  ].join('; '),
  'X-Frame-Options': `ALLOW-FROM ${PARENT_ORIGIN}`, // legacy, superseded by frame-ancestors
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  // Third-party iframe session cookie — only stored/sent because SameSite=None; Secure.
  'Set-Cookie': `acs_sid=${randomBytes(16).toString('hex')}; Path=/; HttpOnly; Secure; SameSite=None`,
})

const b64urlDecode = (s) => {
  try {
    return JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

const readForm = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => resolve(new URLSearchParams(raw)))
  })

const otpScreen = ({ id, nonce, creq, error }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bank Authentication</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    background:#0f1117; color:#e9e9e9; font:16px/1.5 system-ui, sans-serif; }
  .card { width:min(250px,92vw); background:#1b1e27; border:1px solid #2e303a;
    border-radius:14px; padding:28px; box-shadow:0 10px 30px rgba(0,0,0,.4); }
  h1 { font-size:18px; margin:0 0 4px; }
  p { color:#9aa0ac; margin:0 0 16px; font-size:14px; }
  .err { color:#f87171; font-size:13px; margin:0 0 12px; }
  input { width:100%; box-sizing:border-box; padding:12px 14px; font-size:18px;
    letter-spacing:4px; text-align:center; border-radius:10px; border:1px solid #2e303a;
    background:#12141b; color:#fff; margin-bottom:16px; }
  button { width:100%; padding:12px; font-size:16px; border:0; border-radius:10px;
    background:#aa3bff; color:#fff; cursor:pointer; }
  code { color:#c084fc; }
  .meta { margin-top:16px; font-size:11px; color:#5b616e; word-break:break-all; }
</style></head>
<body>
  <form class="card" method="post" action="/challenge/${id}/complete">
    <h1>Verify your payment</h1>
    <p>Your bank sent a one-time code. Test code: <code>${OTP_SUCCESS}</code>.</p>
    ${error ? `<p class="err">${error}</p>` : ''}
    <input name="otp" inputmode="numeric" autocomplete="one-time-code"
      maxlength="4" placeholder="••••" aria-label="One-time code" autofocus />
    <button type="submit">Submit</button>
    <div class="meta">acsTransID: ${creq?.acsTransID ?? '—'}<br/>3DSServerTransID: ${creq?.threeDSServerTransID ?? '—'}</div>
  </form>
  <script nonce="${nonce}">
    // Tell the parent the challenge UI is mounted (handshake). Origin is explicit.
    window.parent.postMessage({ type: '3ds-cvv-loaded', challengeId: ${JSON.stringify(id)} }, ${JSON.stringify(PARENT_ORIGIN)});
  </script>
</body></html>`

const resultScreen = ({ nonce, cres, approved }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><title>Authentication ${approved ? 'complete' : 'failed'}</title>
<style>body { margin:0; min-height:100vh; display:grid; place-items:center;
  background:#0f1117; color:${approved ? '#4ade80' : '#f87171'}; font:16px system-ui,sans-serif; text-align:center; }</style>
</head><body>
  <div>${approved ? '✓ Authentication complete.' : '✕ Authentication failed.'}<br/><small>Returning to merchant…</small></div>
  <script nonce="${nonce}">
    // Post the Challenge Response (cres) to the parent. transStatus only — never the OTP.
    window.parent.postMessage(${JSON.stringify({ type: '3ds-cres', ...cres })}, ${JSON.stringify(PARENT_ORIGIN)});
  </script>
</body></html>`

const server = createServer(tls, async (req, res) => {
  const url = new URL(req.url, `https://localhost:${PORT}`)
  const nonce = randomBytes(16).toString('base64')

  // GET / — landing page so you can visit once and trust the self-signed cert.
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    return res.end(
      '<h1>ACS simulator</h1><p>Self-signed cert accepted. You can close this tab.</p>',
    )
  }

  const challengeMatch = url.pathname.match(/^\/challenge\/([^/]+)$/)
  const completeMatch = url.pathname.match(/^\/challenge\/([^/]+)\/complete$/)

  // Step 1: app posts creq here (targeted into the iframe) -> render OTP screen.
  if (challengeMatch && (req.method === 'POST' || req.method === 'GET')) {
    const id = challengeMatch[1]
    const form = req.method === 'POST' ? await readForm(req) : url.searchParams
    const creq = b64urlDecode(form.get('creq'))
    res.writeHead(200, securityHeaders(nonce))
    return res.end(otpScreen({ id, nonce, creq }))
  }

  // Step 2: OTP submitted -> validate -> postMessage cres to parent.
  if (completeMatch && req.method === 'POST') {
    const id = completeMatch[1]
    const form = await readForm(req)
    const otp = String(form.get('otp') ?? '')
    const approved = otp === OTP_SUCCESS

    if (!approved && otp.length === 0) {
      // Empty OTP -> re-prompt with an error (still a valid challenge).
      res.writeHead(200, securityHeaders(nonce))
      return res.end(otpScreen({ id, nonce, creq: null, error: 'Enter the one-time code.' }))
    }

    const cres = {
      threeDSServerTransID: randomUUID(),
      acsTransID: randomUUID(),
      challengeId: id,
      transStatus: approved ? 'Y' : 'N', // Y = authenticated, N = not authenticated
      messageVersion: '2.2.0',
    }
    res.writeHead(200, securityHeaders(nonce))
    return res.end(resultScreen({ nonce, cres, approved }))
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`ACS simulator on https://localhost:${PORT}`)
  console.log(`  framed only by: ${PARENT_ORIGIN}`)
  console.log(`  test OTP: ${OTP_SUCCESS}`)
  console.log(`  first run: open https://localhost:${PORT}/ once and accept the self-signed cert`)
})
