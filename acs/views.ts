import ejs from 'ejs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { OTP_SUCCESS, PARENT_ORIGIN } from './config.ts'
import type { CReq } from './lib.ts'

const here = dirname(fileURLToPath(import.meta.url))
const compile = (name: string) => ejs.compile(readFileSync(join(here, 'views', name), 'utf8'))

const otpTemplate = compile('otp.ejs')
const resultTemplate = compile('result.ejs')

export interface Cres {
  threeDSServerTransID: string
  acsTransID: string
  challengeId: string
  transStatus: 'Y' | 'N'
  messageVersion: string
}

interface OtpData {
  id: string
  nonce: string
  creq?: CReq | null
  error?: string
  termUrl?: string
}

export const landingScreen = (): string =>
  '<h1>ACS simulator</h1><p>Self-signed cert accepted. You can close this tab.</p>'

// Defaults fill every template variable so EJS never sees an undefined local.
export const otpScreen = ({ id, nonce, creq = null, error = '', termUrl = '' }: OtpData): string =>
  otpTemplate({ id, nonce, creq, error, termUrl, OTP_SUCCESS, PARENT_ORIGIN })

export const resultScreen = (nonce: string, cres: Cres, approved: boolean): string =>
  resultTemplate({ nonce, approved, message: { type: '3ds-cres', ...cres }, PARENT_ORIGIN })
