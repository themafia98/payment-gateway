import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'

export type ActionFrameVariant = 'inline' | 'challenge' | 'content'

export interface ActionFrameProps {
  /**
   * `inline` for a provider frame, `challenge` for a bank page that wants the screen,
   * `content` for something that sizes itself, like a QR code.
   */
  variant?: ActionFrameVariant
  children: ReactNode
  className?: string
}

export const ActionFrame = ({
  variant = 'inline',
  children,
  className,
}: ActionFrameProps): ReactElement => (
  <div className={cx('ck-action-frame', `ck-action-frame--${variant}`, className)}>{children}</div>
)
