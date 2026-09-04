// Standalone 3-D Secure ACS simulator. Runs on its own https origin so the
// challenge is genuinely cross-origin to the app. Two flows (see acs/README.md):
//   iframe mode   — no termUrl; on complete we postMessage the result.
//   redirect mode — termUrl present; on complete we 302 the browser back to it.

import { createServer } from 'node:https'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PORT, PARENT_ORIGIN, OTP_SUCCESS, tls } from './config.ts'
import {
  newNonce,
  securityHeaders,
  readForm,
  decodeCreq,
  sendHtml,
  sendText,
  redirect,
} from './lib.ts'
import { landingScreen, otpScreen, resultScreen, type Cres } from './views.ts'

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

  sendText(res, 404, 'Not found')
})

server.listen(PORT, () => {
  console.log(`ACS simulator on https://localhost:${PORT}`)
  console.log(`  framed only by: ${PARENT_ORIGIN}`)
  console.log(`  test OTP: ${OTP_SUCCESS}`)
  console.log(`  first run: open https://localhost:${PORT}/ once and accept the self-signed cert`)
})
