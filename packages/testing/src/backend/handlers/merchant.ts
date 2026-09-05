import { http } from 'msw'
import type { HttpHandler } from 'msw'
import { merchantConfig } from '../data'
import { networkDelay } from '../lib/delay'
import { json } from '../lib/respond'

export const merchantHandlers: HttpHandler[] = [
  http.get('*/api/merchant/config', async () => {
    await networkDelay()
    return json(merchantConfig)
  }),
]
