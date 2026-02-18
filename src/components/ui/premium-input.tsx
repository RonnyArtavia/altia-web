import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
  error?: boolean
  label?: string
}

const PremiumInput = React.forwardRef<HTMLInputElement, PremiumInputProps>(
  ({ className, type, icon: Icon, rightIcon: RightIcon, onRightIconClick, error, label, id, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-clinical-700 transition-colors"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-clinical-400 transition-colors group-focus-within:text-primary-500">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <input
            type={type}
            id={id}
            className={cn(
              // Base styles
              'flex h-12 w-full rounded-xl border bg-white text-sm transition-all duration-200',

              // Padding with icon considerations
              Icon ? 'pl-11 pr-4' : 'px-4',
              RightIcon ? 'pr-11' : Icon ? 'pr-4' : 'px-4',

              // Default state
              'border-clinical-200 text-clinical-900 placeholder:text-clinical-400',

              // Focus state with glow
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/30 focus-visible:border-primary-500',
              'focus-visible:shadow-glow-primary/20',

              // Hover state
              'hover:border-clinical-300',

              // Error state
              error && 'border-danger-300 bg-danger-50/30 focus-visible:border-danger-500 focus-visible:ring-danger-400/30',

              // Disabled state
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-clinical-50',

              // File input styles
              'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-clinical-700',

              className
            )}
            ref={ref}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 transition-colors",
                "text-clinical-400 hover:text-clinical-600 focus:text-primary-500",
                "focus:outline-none"
              )}
              tabIndex={-1}
            >
              <RightIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    )
  }
)

PremiumInput.displayName = 'PremiumInput'

export { PremiumInput }