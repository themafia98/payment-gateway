import { http } from 'msw'
import { merchantConfig } from '../data'
import { networkDelay } from '../lib/delay'
import { json } from '../lib/respond'

export const merchantHandlers = [
  http.get('*/api/merchant/config', async () => {
    await networkDelay()
    return json(merchantConfig)
  }),
]
