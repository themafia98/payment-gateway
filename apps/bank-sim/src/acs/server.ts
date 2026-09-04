// Standalone 3-D Secure ACS simulator. Runs on its own https origin so the
// challenge is genuinely cross-origin to the app. Two flows (see the README):
//   iframe mode   — no termUrl; on complete we postMessage the result.
//   redirect mode — termUrl present; on complete we 302 the browser back to it.
//
// Both versions of the protocol are served, because real merchants meet both:
//   /challenge/:id  — version 2, a CReq in and a CRes out
//   /acs/pareq      — version 1, a PaReq in and a PaRes out
// Same screen, same one-time code, same two modes. Only the envelope differs, and
// absorbing that difference is the plugin's job, not the checkout's.

import { createServer } from 'node:https'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PORT, PARENT_ORIGIN, OTP_SUCCESS, tls } from './config.ts'
import {
  newNonce,
  securityHeaders,
  readForm,
  decodeCreq,
  decodeBase64Json,
  sendHtml,
  sendText,
  redirect,
} from './lib.ts'
import { landingScreen, otpScreen, paresScreen, resultScreen, type Cres } from './views.ts'

// Render the OTP screen. A termUrl (redirect mode) is echoed into the form so the
// /complete POST carries it back.
async function renderChallenge(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  url: URL,
  nonce: string,
): Promise<void> {
  const form = req.method === 'POST' ? await readForm(req) : url.searchParams
  const creq = decodeCreq(form.get('creq'))
  const termUrl = form.get('termUrl') || ''
  sendHtml(res, otpScreen({ id, nonce, creq, termUrl }), securityHeaders(nonce))
}

// Validate the OTP, then answer the way the current mode expects.
async function completeChallenge(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  nonce: string,
): Promise<void> {
  const form = await readForm(req)
  const otp = String(form.get('otp') ?? '')
  const termUrl = form.get('termUrl') || ''

  if (otp.length === 0) {
    const page = otpScreen({ id, nonce, error: 'Enter the one-time code.', termUrl })
    sendHtml(res, page, securityHeaders(nonce))
    return
  }

  const transStatus = otp === OTP_SUCCESS ? 'Y' : 'N'

  if (termUrl) {
    redirectBack(res, termUrl, id, transStatus)
    return
  }

  const cres: Cres = {
    threeDSServerTransID: randomUUID(),
    acsTransID: randomUUID(),
    challengeId: id,
    transStatus,
    messageVersion: '2.2.0',
  }
  sendHtml(res, resultScreen(nonce, cres, transStatus === 'Y'), securityHeaders(nonce))
}

// Version 1 of the protocol: the merchant's bank posts a PaReq here, and the field that
// identifies the transaction is called MD.
async function renderPaReqChallenge(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  nonce: string,
): Promise<void> {
  const form = req.method === 'POST' ? await readForm(req) : url.searchParams
  const md = form.get('MD') ?? ''
  const pareq = decodeBase64Json<{ challengeId?: string }>(form.get('PaReq'))
  const termUrl = form.get('TermUrl') || ''

  sendHtml(
    res,
    otpScreen({
      id: md || (pareq?.challengeId ?? ''),
      nonce,
      termUrl,
      action: '/acs/pares',
      hidden: [{ name: 'MD', value: md }],
    }),
    securityHeaders(nonce),
  )
}

async function completePaReqChallenge(
  req: IncomingMessage,
  res: ServerResponse,
  nonce: string,
): Promise<void> {
  const form = await readForm(req)
  const md = form.get('MD') ?? ''
  const otp = String(form.get('otp') ?? '')
  const termUrl = form.get('termUrl') || form.get('TermUrl') || ''

  if (otp.length === 0) {
    const page = otpScreen({
      id: md,
      nonce,
      error: 'Enter the one-time code.',
      termUrl,
      action: '/acs/pares',
      hidden: [{ name: 'MD', value: md }],
    })
    sendHtml(res, page, securityHeaders(nonce))
    return
  }

  const transStatus = otp === OTP_SUCCESS ? 'Y' : 'N'

  if (termUrl) {
    redirectBack(res, termUrl, md, transStatus)
    return
  }

  sendHtml(res, paresScreen(nonce, md, transStatus, transStatus === 'Y'), securityHeaders(nonce))
}

// Send the browser back to the app — but only to our known origin, never an
// arbitrary URL (that would be an open redirect).
function redirectBack(res: ServerResponse, termUrl: string, id: string, transStatus: string): void {
  let back: URL
  try {
    back = new URL(termUrl)
  } catch {
    sendText(res, 400, 'Bad termUrl')
    return
  }
  if (back.origin !== PARENT_ORIGIN) {
    sendText(res, 400, 'termUrl origin not allowed')
    return
  }
  back.searchParams.set('challengeId', id)
  back.searchParams.set('transStatus', transStatus)
  redirect(res, back.toString())
}

const server = createServer(tls, async (req, res) => {
  const url = new URL(req.url ?? '/', `https://localhost:${PORT}`)
  const nonce = newNonce()

  if (req.method === 'GET' && url.pathname === '/') {
    sendHtml(res, landingScreen())
    return
  }

  const challenge = url.pathname.match(/^\/challenge\/([^/]+)$/)
  if (challenge && (req.method === 'POST' || req.method === 'GET')) {
    await renderChallenge(req, res, challenge[1], url, nonce)
    return
  }

  const complete = url.pathname.match(/^\/challenge\/([^/]+)\/complete$/)
  if (complete && req.method === 'POST') {
    await completeChallenge(req, res, complete[1], nonce)
    return
  }

  if (url.pathname === '/acs/pareq' && (req.method === 'POST' || req.method === 'GET')) {
    await renderPaReqChallenge(req, res, url, nonce)
    return
  }

  if (url.pathname === '/acs/pares' && req.method === 'POST') {
    await completePaReqChallenge(req, res, nonce)
    return
  }

  sendText(res, 404, 'Not found')
})

server.listen(PORT, () => {
  console.log(`ACS simulator on https://localhost:${PORT}`)
  console.log(`  framed only by: ${PARENT_ORIGIN}`)
  console.log(`  test OTP: ${OTP_SUCCESS}`)
  console.log(`  first run: open https://localhost:${PORT}/ once and accept the self-signed cert`)
})
