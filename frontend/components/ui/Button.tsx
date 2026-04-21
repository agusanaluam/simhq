import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed'

    const variants: Record<Variant, string> = {
      primary:   'btn-primary',
      accent:    'btn-accent',
      secondary: 'bg-secondary-c text-on-surface hover:opacity-80',
      ghost:     'text-primary hover:bg-surface-high',
      danger:    'bg-tertiary text-white hover:opacity-90',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
