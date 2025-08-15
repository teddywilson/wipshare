import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'sm', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center gap-2 font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-black text-white hover:bg-gray-800',
      secondary: 'border border-gray-200 hover:border-gray-300',
      ghost: 'hover:bg-gray-50',
      danger: 'text-red-600 hover:bg-red-50'
    }
    
    const sizes = {
      xs: 'px-2 py-1 text-xs',
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm'
    }
    
    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export default Button