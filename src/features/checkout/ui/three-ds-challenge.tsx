import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'

// 3-D Secure challenge UI: shows the bank's page and reports pass/fail up; the
// gateway settles. Two modes — iframe (postMessage back) or full-page redirect.

const ACS_ORIGIN: string = import.meta.env.VITE_ACS_ORIGIN ?? 'https://localhost:5100'

// The challenge request, passed to the bank in the POST body (not the URL).
const base64url = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

interface ThreeDSChallengeProps {
  challengeId: string
  onCres: (outcome: 'success' | 'fail') => void
  /** Needed for redirect mode: where the bank should send the browser back. */
  intentId?: string
}

export const ThreeDSChallenge = ({ challengeId, onCres, intentId }: ThreeDSChallengeProps) => {
  const iframeFormRef = useRef<HTMLFormElement>(null)
  const navigate = useNavigate()

  const creq = useMemo(
    () =>
      base64url({
        threeDSServerTransID: crypto.randomUUID(),
        acsTransID: crypto.randomUUID(),
        challengeWindowSize: '05',
        messageType: 'CReq',
        messageVersion: '2.2.0',
      }),
    [],
  )

  // Return URL for redirect mode. Carries intentId so the success page keeps it
  // after the full-page round-trip (React state is wiped).
  const termUrl = useMemo(() => {
    const u = new URL('/3ds/return', window.location.origin)
    if (intentId) u.searchParams.set('intentId', intentId)
    return u.toString()
  }, [intentId])

  useEffect(() => {
    // iframe mode: auto-submit so the bank page loads inside the frame.
    iframeFormRef.current?.submit()
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Trust only the ACS origin — a message is just a hint, the backend decides.
      if (event.origin !== ACS_ORIGIN) return
      if (event.data?.type !== '3ds-cres' || event.data.challengeId !== challengeId) return

      onCres(event.data.transStatus === 'Y' ? 'success' : 'fail')
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [challengeId, onCres])

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      {/* iframe mode: POST creq into the frame */}
      <form
        ref={iframeFormRef}
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
        // allow-same-origin keeps the bank's real origin (needed for its cookies and
        // a truthful event.origin); no-referrer hides our URL from the bank.
        sandbox="allow-scripts allow-forms allow-same-origin"
        referrerPolicy="no-referrer"
        className="h-[70svh] w-full max-w-full rounded-xl border border-[#2e303a] bg-white"
        onError={() => navigate({ to: '/summary/failure', search: { intentId } })}
      />

      {/* redirect mode: same POST, but termUrl tells the ACS to send the whole window back */}
      <form method="post" action={`${ACS_ORIGIN}/challenge/${challengeId}`} target="_top">
        <input type="hidden" name="creq" value={creq} />
        <input type="hidden" name="termUrl" value={termUrl} />
        <button type="submit" className="text-sm text-purple-300 underline">
          Open bank in this window (full-page redirect)
        </button>
      </form>
    </div>
  )
}
