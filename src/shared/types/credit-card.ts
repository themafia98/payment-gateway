import type { Branded } from './brand'

export type CardNumber = Branded<string, 'CardNumber'>

export type CardExpiration = Branded<string, 'CardExpiration'>

export type CvcCode = Branded<string, 'CvcCode'>
