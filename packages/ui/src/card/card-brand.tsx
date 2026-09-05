import type { ReactElement, ReactNode } from 'react'
import { detectCardBrand, type CardBrand } from '@checkout-kit/core'
import { Badge } from '../badge'

export interface CardBrandIndicatorProps {
  /** The number typed so far; the brand is read from its first digits. */
  value: string
  /** Scheme logos are trademarks, so the kit ships none - pass your own licensed art. */
  icons?: Partial<Record<CardBrand, ReactNode>>
}

export const CardBrandIndicator = ({
  value,
  icons,
}: CardBrandIndicatorProps): ReactElement | null => {
  const rule = detectCardBrand(value)
  if (rule.brand === 'unknown') return null

  const icon = icons?.[rule.brand]
  return icon ? <>{icon}</> : <Badge>{rule.displayName}</Badge>
}
