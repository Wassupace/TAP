import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon'
  size?: 'normal' | 'huge' | 'sm'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'normal', className = '', children, ...props }: ButtonProps) {
  // "Guard instead of disable" call sites that never pass `disabled` are
  // unaffected by this — it only styles the button when the `disabled`
  // attribute is actually set (see AttendancePage/CalendarPage/
  // MatchSetupPage for existing real usages that were previously
  // invisible: disabled worked functionally but looked identical to
  // enabled, final-review Finding E.3).
  const base = 'flex items-center justify-center gap-2.5 w-full font-heading uppercase tracking-wide cursor-pointer border-0 transition-all duration-100 active:scale-[.975] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100'

  const variants: Record<string, string> = {
    primary:   'text-white rounded-[var(--r-md)] shadow-[var(--accent-glow)]',
    secondary: 'text-[var(--chalk)] bg-[var(--panel)] border border-[var(--line-2)] rounded-[var(--r-md)]',
    ghost:     'text-[var(--chalk)] bg-[var(--panel-2)] border border-[var(--line-2)] rounded-[var(--r-md)]',
    danger:    'text-red-400 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-[var(--r-md)]',
    icon:      'w-[42px] h-[42px] !w-[42px] rounded-[14px] bg-[var(--panel)] border border-[var(--line)] text-[var(--chalk)]',
  }

  const sizes: Record<string, string> = {
    normal: 'min-h-[58px] text-base',
    huge:   'min-h-[72px] text-lg rounded-[var(--r-lg)] flex-col gap-1.5',
    sm:     'min-h-[44px] text-sm px-4',
  }

  const primaryStyle = variant === 'primary'
    ? { background: 'linear-gradient(180deg, var(--orange-2), var(--orange))' }
    : {}

  return (
    <button
      className={`${base} ${variants[variant] ?? ''} ${variant !== 'icon' ? (sizes[size] ?? '') : ''} ${className}`}
      style={primaryStyle}
      {...props}
    >
      {children}
    </button>
  )
}

export function BackButton({ onClick, children }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer hover:text-[var(--chalk)] transition-colors p-0"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      {children}
    </button>
  )
}
