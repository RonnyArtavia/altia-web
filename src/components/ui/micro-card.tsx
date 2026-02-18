import * as React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export interface MicroCardProps {
  icon?: LucideIcon
  title: string
  subtitle: string
  className?: string
  delay?: number
}

const MicroCard = React.forwardRef<HTMLDivElement, MicroCardProps>(
  ({ icon: Icon, title, subtitle, className, delay = 0, ...props }, ref) => {
    const animationDelay = `${delay * 0.1}s`

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'group relative overflow-hidden rounded-2xl backdrop-blur-sm',
          'bg-white/10 border border-white/20 p-4',

          // Hover effects
          'hover:bg-white/15 hover:border-white/30 hover:scale-105',
          'transition-all duration-300 ease-out cursor-default',

          // Animation
          'animate-slide-up opacity-0',
          className
        )}
        style={{
          animationDelay,
          animationFillMode: 'forwards'
        }}
        {...props}
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/5 to-transparent" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {Icon && (
            <div className="mb-3 p-2 rounded-xl bg-white/10 text-white/80 group-hover:text-white transition-colors duration-200">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <p className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform duration-200">
            {title}
          </p>
          <p className="text-sm text-primary-100/80 group-hover:text-primary-100 transition-colors duration-200">
            {subtitle}
          </p>
        </div>

        {/* Shimmer effect */}
        <div className="absolute inset-0 -skew-x-12 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" />
      </div>
    )
  }
)

MicroCard.displayName = 'MicroCard'

export { MicroCard }