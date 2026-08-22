import { useEffect, useRef } from 'react'
import {useNavigate} from "@tanstack/react-router";

/**
 * LAYER: UI / delivery. This component is the DRIVING side of 3-D Secure —
 * it renders the bank's challenge and reports the verdict up. It knows nothing
 * about payments beyond "show this challenge, tell me pass/fail". Settling the
 * intent (transport) is the gateway's job; navigation is the parent's job.
 *
 * How the cross-origin challenge is delivered (mirrors real EMV 3DS2):
 *   1. We auto-submit a hidden FORM POST to the ACS origin, carrying `creq`
 *      (base64url JSON) in the body — never in the URL (query leaks via Referer,
 *      history, logs). The form targets the iframe, so the POST response loads
 *      inside it.
 *   2. The ACS (a different https origin) shows the OTP screen and, when done,
 *      posts the Challenge Response back with window.parent.postMessage.
 *   3. We accept that message ONLY from the ACS origin, and treat it as a UX
 *      signal — the authoritative status comes from the backend afterwards.
 */

const ACS_ORIGIN: string = import.meta.env.VITE_ACS_ORIGIN ?? 'https://localhost:5100'

const base64url = (value: object): string =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

interface ThreeDSChallengeProps {
  challengeId: string
  onCres: (outcome: 'success' | 'fail') => void
}

export const ThreeDSChallenge = ({ challengeId, onCres }: ThreeDSChallengeProps) => {
  const formRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate();

  // Build the Challenge Request. In real 3DS the SDK builds this; the ACS echoes
  // the transaction ids back so both sides can correlate the session.
  const creq = base64url({
    threeDSServerTransID: crypto.randomUUID(),
    acsTransID: crypto.randomUUID(),
    challengeWindowSize: '05',
    messageType: 'CReq',
    messageVersion: '2.2.0',
  })

  useEffect(() => {
    // Auto-submit the hidden form -> the ACS page loads into the iframe.
    formRef.current?.submit()
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // SECURITY: never trust a message without checking its origin against the
      // ACS allowlist. A malicious page could postMessage a fake "success".
      if (event.origin !== ACS_ORIGIN) return
      if (event.data?.type !== '3ds-cres' || event.data.challengeId !== challengeId) return

      // transStatus is a UX signal only — the parent re-checks with the backend.
      onCres(event.data.transStatus === 'Y' ? 'success' : 'fail')
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [challengeId, onCres])

  return (
    <div className="flex flex-col items-center p-2 gap-3">
      {/* Hidden form: POSTs creq into the iframe (cross-origin, https). */}
      <form
        ref={formRef}
        method="post"
        action={`${ACS_ORIGIN}/challenge/${challengeId}`}
        target="acs-frame"
        className="hidden"
      >
        <input type="hidden" name="creq" value={creq} />
      </form>

      <iframe
        name="acs-frame"
        title="3-D Secure authentication"
        // allow-same-origin is SAFE here: the framed content is cross-origin to us,
        // so it only keeps the ACS's OWN origin (needed for its cookies + a real
        // postMessage origin). It does NOT grant access to our page. Dropping it
        // would force an opaque origin: event.origin === "null" and no ACS cookies.
        sandbox="allow-scripts allow-forms allow-same-origin"
        referrerPolicy="no-referrer"
        className="h-[70svh] w-full max-w-full rounded-xl border border-[#2e303a] bg-white"
        onError={() => navigate({ to: "/summary/failure" })}
      />
    </div>
  )
}
