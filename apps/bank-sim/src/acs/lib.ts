import { randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'node:http'
import { PARENT_ORIGIN } from './config.ts'

export interface CReq {
  acsTransID?: string
  threeDSServerTransID?: string
  [key: string]: unknown
}

export const newNonce = (): string => randomBytes(16).toString('base64')

// Security headers a real bank's challenge page sends. Each line notes why it's
// here and the usual alternative — handy for poking at them in DevTools.
export const securityHeaders = (nonce: string): OutgoingHttpHeaders => ({
  'Content-Type': 'text/html; charset=utf-8',

  // The page's own safety policy. `join('; ')` builds one header from the directives.
  'Content-Security-Policy': [
    // Who may put us in a frame -> blocks clickjacking. Alt: X-Frame-Options (legacy).
    `frame-ancestors ${PARENT_ORIGIN}`,
    // Deny everything by default, then open only what we need below.
    `default-src 'none'`,
    // Allow our inline <style>. Alt: move CSS to a file and use 'self' (stricter).
    `style-src 'unsafe-inline'`,
    // Allow ONLY our one inline <script>, matched by this nonce. Alt: a hash, or a file.
    `script-src 'nonce-${nonce}'`,
    // Forms may submit only back to us. Alt: list explicit allowed URLs.
    `form-action 'self'`,
  ].join('; '),

  // Legacy clickjacking guard for old browsers; superseded by frame-ancestors.
  // (ALLOW-FROM is ignored by modern browsers — CSP is the real control.)
  'X-Frame-Options': `ALLOW-FROM ${PARENT_ORIGIN}`,

  // Stop the browser from guessing a different Content-Type (MIME sniffing).
  'X-Content-Type-Options': 'nosniff',

  // Don't leak our URL to the bank. Alt: 'strict-origin' to send only the origin.
  'Referrer-Policy': 'no-referrer',

  // Split us into our own browsing-context group (part of cross-origin isolation).
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Require every subresource to opt in (CORP/CORS). Alt: 'unsafe-none' to turn off.
  'Cross-Origin-Embedder-Policy': 'require-corp',
  // Let another origin (our app) embed this response. Alt: 'same-origin' to block it.
  'Cross-Origin-Resource-Policy': 'cross-origin',

  // Challenge session cookie. In a third-party iframe the browser keeps it ONLY with
  // SameSite=None; Secure (needs https). HttpOnly hides it from JS.
  'Set-Cookie': `acs_sid=${randomBytes(16).toString('hex')}; Path=/; HttpOnly; Secure; SameSite=None`,
})

export const readForm = (req: IncomingMessage): Promise<URLSearchParams> =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => resolve(new URLSearchParams(raw)))
  })

/**
 * Both 3-D Secure versions hand the browser a base64 blob to bring here - a `CReq` in
 * version 2, a `PaReq` in version 1 - so one decoder serves both. base64url first, since
 * that is what version 2 uses; plain base64 as a fallback for version 1.
 */
export const decodeBase64Json = <T>(value: string | null): T | null => {
  if (!value) return null
  for (const encoding of ['base64url', 'base64'] as const) {
    try {
      return JSON.parse(Buffer.from(value, encoding).toString('utf8')) as T
    } catch {
      // Try the other encoding before giving up.
    }
  }
  return null
}

export const decodeCreq = (value: string | null): CReq | null => decodeBase64Json<CReq>(value)

export const sendHtml = (
  res: ServerResponse,
  body: string,
  headers: OutgoingHttpHeaders = { 'Content-Type': 'text/html; charset=utf-8' },
): void => {
  res.writeHead(200, headers)
  res.end(body)
}

export const sendText = (res: ServerResponse, status: number, body: string): void => {
  res.writeHead(status, { 'Content-Type': 'text/plain' })
  res.end(body)
}

export const redirect = (res: ServerResponse, location: string): void => {
  res.writeHead(302, { Location: location })
  res.end()
}
