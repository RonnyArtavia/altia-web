import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number
    max?: number
    label?: string
    variant?: 'default' | 'success' | 'warning' | 'danger'
    showPercentage?: boolean
}

const variantClasses = {
    default: 'bg-gradient-to-r from-primary-500 to-primary-400',
    success: 'bg-gradient-to-r from-success-600 to-success-500',
    warning: 'bg-gradient-to-r from-warning-600 to-warning-500',
    danger: 'bg-gradient-to-r from-danger-600 to-danger-500',
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, label, variant = 'default', showPercentage, ...props }, ref) => {
        const pct = Math.min(100, Math.max(0, (value / max) * 100))

        return (
            <div ref={ref} className={cn('space-y-1.5', className)} {...props}>
                {(label || showPercentage) && (
                    <div className="flex items-center justify-between text-xs">
                        {label && <span className="font-medium text-clinical-700">{label}</span>}
                        {showPercentage && <span className="text-clinical-500">{Math.round(pct)}%</span>}
                    </div>
                )}
                <div className="h-2 w-full overflow-hidden rounded-full bg-clinical-100">
                    <div
                        className={cn(
                            'h-full rounded-full transition-all duration-500 ease-out',
                            variantClasses[variant]
                        )}
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        )
    }
)
Progress.displayName = 'Progress'

export { Progress }
