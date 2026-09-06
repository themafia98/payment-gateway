import {
  createContext,
  useContext,
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cx } from './cx'

interface TabsContext {
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly disabled: boolean
}

const Context = createContext<TabsContext | null>(null)

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

export const Tabs = ({
  value,
  onValueChange,
  children,
  disabled = false,
  className,
  ...aria
}: TabsProps): ReactElement => {
  const list = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!KEYS.has(event.key) || !list.current) return

    const tabs = [...list.current.querySelectorAll<HTMLElement>('[role="tab"]')].filter(
      (tab) => tab.getAttribute('aria-disabled') !== 'true',
    )
    const current = tabs.indexOf(document.activeElement as HTMLElement)
    if (current === -1) return

    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length

    event.preventDefault()
    const target = tabs[next]
    target?.focus()
    target?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    const chosen = target?.dataset.value
    if (chosen) onValueChange(chosen)
  }

  return (
    <Context value={{ value, onValueChange, disabled }}>
      <div
        {...aria}
        ref={list}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cx('ck-tabs', className)}
      >
        {children}
      </div>
    </Context>
  )
}

export interface TabProps {
  value: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export const Tab = ({ value, children, disabled = false, className }: TabProps): ReactElement => {
  const tabs = useContext(Context)
  if (!tabs) {
    throw new Error('<Tab> must be used inside <Tabs>.')
  }

  const isActive = tabs.value === value
  const isDisabled = disabled || tabs.disabled

  return (
    <button
      type="button"
      role="tab"
      data-value={value}
      aria-selected={isActive}
      aria-disabled={isDisabled || undefined}
      // Roving: one stop for the whole row, then arrow keys inside it.
      tabIndex={isActive ? 0 : -1}
      onClick={isDisabled ? undefined : () => tabs.onValueChange(value)}
      className={cx('ck-tab', className)}
    >
      {children}
    </button>
  )
}
