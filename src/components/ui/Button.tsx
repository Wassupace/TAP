import { type ReactNode, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'icon'
  size?: 'normal' | 'huge'
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'normal', className = '', children, ...props }: ButtonProps) {
  const base = 'flex items-center justify-center gap-2.5 w-full font-heading uppercase tracking-wide cursor-pointer border-0 transition-all duration-100 active:scale-[.975]'

  const variants = {
    primary: 'text-[#0c0c0c] rounded-[18px] shadow-[0_12px_28px_-10px_rgba(255,90,31,.7)]',
    ghost: 'text-chalk bg-[var(--panel-2)] border border-[var(--line-2)] rounded-[18px]',
    icon: 'w-[42px] h-[42px] !w-[42px] rounded-[14px] bg-[var(--panel)] border border-[var(--line)] text-chalk hover:bg-[var(--panel-2)]',
  }

  const sizes = {
    normal: 'min-h-[58px] text-base',
    huge: 'min-h-[72px] text-lg rounded-[22px] flex-col gap-1.5',
  }

  const primaryStyle = variant === 'primary'
    ? { background: 'linear-gradient(180deg, var(--orange-2), var(--orange))' }
    : {}

  return (
    <button
      className={`${base} ${variants[variant]} ${variant !== 'icon' ? sizes[size] : ''} ${className}`}
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
      className="inline-flex items-center gap-1.5 text-[var(--dim)] font-bold text-[13px] bg-transparent border-0 cursor-pointer hover:text-chalk transition-colors p-0"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" width={18} height={18}>
        <path d="M15 18l-6-6 6-6"/>
      </svg>
      {children}
    </button>
  )
}
