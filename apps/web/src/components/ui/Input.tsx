import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full px-2 py-1.5 text-sm font-mono border focus:outline-none transition-colors',
          error 
            ? 'border-red-300 focus:border-red-500' 
            : 'border-gray-200 focus:border-black',
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

export default Input