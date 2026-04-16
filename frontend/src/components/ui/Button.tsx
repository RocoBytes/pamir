import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverted'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#4E805D] text-white hover:bg-[#3d6b4a] focus-visible:ring-[#4E805D] disabled:bg-[#4E805D]/40',
  secondary:
    'bg-[#eef1ee] text-[#687C6B] hover:bg-[#e2e7e2] focus-visible:ring-[#687C6B] border border-[#687C6B]/20 disabled:bg-[#eef1ee]/60 disabled:text-[#687C6B]/50',
  ghost:
    'bg-transparent text-[#757874] hover:bg-[#f2f0ec] focus-visible:ring-[#757874] disabled:text-[#757874]/40',
  danger:
    'bg-[#A4636E] text-white hover:bg-[#8b3a44] focus-visible:ring-[#A4636E] disabled:bg-[#A4636E]/40',
  inverted:
    'bg-[#1a2420] text-white hover:bg-[#2d3e30] focus-visible:ring-[#1a2420] disabled:bg-[#1a2420]/50',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-semibold',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  )
}
