import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {createHttpClient} from "@/shared/api";

export const Route = createFileRoute('/3ds/challenge/$challengeId')({
  component: ChallengePage,
})

function ChallengePage() {
  const { challengeId } = Route.useParams()

  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadChallenge = async () => {
        const http = createHttpClient();
      try {
        const htmlResponse = await http.get<string>(
            `/api/3ds/challenge/${challengeId}`,
            {
              headers: {
                Accept: 'text/html',
              },
            },
        )

        setHtml(htmlResponse)
      } catch (error) {
        setError(
            error instanceof Error
                ? error.message
                : 'Failed to load challenge',
        )
      }
    }

    loadChallenge()
  }, [challengeId])

  if (error) {
    return <div>{error}</div>
  }

  if (!html) {
    return <div>Loading...</div>
  }

  return (
      <iframe
          title="3D Secure Authentication"
          srcDoc={html}
          style={{
            width: '100%',
            height: '100vh',
            border: 0,
          }}
      />
  )
}
