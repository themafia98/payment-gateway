import { delay } from 'msw'
import { LATENCY } from '../config'

export const networkDelay = (): Promise<void> => {
  const ms = LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min)
  return delay(Math.round(ms))
}
