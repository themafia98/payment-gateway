import { http } from 'msw'
import { plans } from '../data'
import { networkDelay } from '../lib/delay'
import { json } from '../lib/respond'

export const planHandlers = [
  http.get('/api/plans', async () => {
    await networkDelay()
    return json(plans)
  }),
]
