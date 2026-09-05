import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))

export const PORT = Number(process.env.ACS_PORT ?? 5100)
export const PARENT_ORIGIN = process.env.PARENT_ORIGIN ?? 'http://localhost:5173'
export const OTP_SUCCESS = process.env.ACS_OTP ?? '1234'

export const tls = {
  key: readFileSync(join(here, '../../certs/key.pem')),
  cert: readFileSync(join(here, '../../certs/cert.pem')),
}
