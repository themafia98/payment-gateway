import { http, HttpResponse } from 'msw'
import { OTP_SUCCESS } from '../config'
import { paymentIntents, threeDSChallenges } from '../data'
import { networkDelay } from '../lib/delay'
import { error, json, notFound } from '../lib/respond'
import type { CompleteChallengeRequest, PaymentIntent, ThreeDSChallenge } from '../types'

const challengeId = () => `tdsc_${crypto.randomUUID().replace(/-/g, '')}`

export const createChallenge = (
  paymentIntentId: string,
  outcome: 'pass' | 'fail',
): ThreeDSChallenge => {
  const challenge: ThreeDSChallenge = {
    id: challengeId(),
    paymentIntentId,
    outcome,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  threeDSChallenges.set(challenge.id, challenge)

  return challenge
}

const wantsJson = (request: Request) =>
  request.headers.get('Accept')?.includes('application/json') ||
  request.headers.get('Content-Type')?.includes('application/json')

const settleIntent = (challenge: ThreeDSChallenge, approved: boolean): PaymentIntent | null => {
  const intent = paymentIntents.get(challenge.paymentIntentId)
  if (!intent) return null

  const updated: PaymentIntent = approved
    ? { ...intent, status: 'succeeded', nextAction: null, error: null }
    : {
        ...intent,
        status: 'declined',
        nextAction: null,
        error: {
          type: 'card_error',
          code: 'authentication_failed',
          message: '3D Secure authentication failed.',
        },
      }

  paymentIntents.set(updated.id, updated)
  challenge.status = approved ? 'succeeded' : 'failed'
  threeDSChallenges.set(challenge.id, challenge)

  return updated
}

const readOtp = async (request: Request): Promise<string> => {
  if (request.headers.get('Content-Type')?.includes('application/json')) {
    try {
      const body = (await request.json()) as CompleteChallengeRequest
      if (body.otp != null) return String(body.otp)
      if (body.outcome) return body.outcome === 'success' ? OTP_SUCCESS : ''
      return ''
    } catch {
      return ''
    }
  }

  try {
    const form = await request.formData()
    return String(form.get('otp') ?? '')
  } catch {
    return ''
  }
}

const acsScreen = (challenge: ThreeDSChallenge) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bank Authentication</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #0f1117; color: #e9e9e9; font: 16px/1.5 system-ui, sans-serif; }
      .card { width: min(250px, 92vw); background: #1b1e27; border: 1px solid #2e303a;
        border-radius: 14px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
      h1 { font-size: 18px; margin: 0 0 4px; }
      p { color: #9aa0ac; margin: 0 0 20px; font-size: 14px; }
      input { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 18px;
        letter-spacing: 4px; text-align: center; border-radius: 10px; border: 1px solid #2e303a;
        background: #12141b; color: #fff; margin-bottom: 16px; }
      button { width: 100%; padding: 12px; font-size: 16px; border: 0; border-radius: 10px;
        background: #aa3bff; color: #fff; cursor: pointer; }
      code { color: #c084fc; }
    </style>
  </head>
  <body>
    <form class="card" method="post" action="/api/3ds/challenge/${challenge.id}/complete">
      <h1>Verify your payment</h1>
      <p>Enter the one-time code sent by your bank. Test code: <code>${OTP_SUCCESS}</code>.</p>
      <input name="otp" inputmode="numeric" autocomplete="one-time-code"
        maxlength="4" placeholder="••••" aria-label="One-time code" />
      <button type="submit">Submit</button>
    </form>
  </body>
</html>`

const resultScreen = (approved: boolean) => `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Authentication ${approved ? 'complete' : 'failed'}</title>
    <style>body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #0f1117; color: ${approved ? '#4ade80' : '#f87171'};
      font: 18px system-ui, sans-serif; }</style>
  </head>
  <body>${approved ? '✓ Authentication complete. You can return to the merchant.' : '✕ Authentication failed.'}</body>
</html>`

export const threeDsHandlers = [
  http.get('/api/3ds/challenge/:challengeId', async ({ request, params }) => {
    await networkDelay()

    const challenge = threeDSChallenges.get(String(params.challengeId))
    if (!challenge) return notFound('challenge', 'challengeId')

    if (wantsJson(request)) return json(challenge)

    return HttpResponse.html(acsScreen(challenge))
  }),

  http.post('/api/3ds/challenge/:challengeId/complete', async ({ request, params }) => {
    await networkDelay()

    const challenge = threeDSChallenges.get(String(params.challengeId))
    if (!challenge) return notFound('challenge', 'challengeId')

    if (challenge.status !== 'pending') {
      return error(400, {
        type: 'invalid_request_error',
        code: 'challenge_already_completed',
        message: `Challenge is already '${challenge.status}'.`,
      })
    }

    const otp = await readOtp(request)
    const approved = challenge.outcome === 'pass' && otp === OTP_SUCCESS
    const paymentIntent = settleIntent(challenge, approved)

    if (!paymentIntent) return notFound('payment intent')

    if (wantsJson(request)) return json({ challenge, paymentIntent })

    return HttpResponse.html(resultScreen(approved))
  }),
]
