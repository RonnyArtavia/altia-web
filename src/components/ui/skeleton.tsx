import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('skeleton', className)} {...props} />
}

function SkeletonText({ className, lines = 3 }: { className?: string; lines?: number }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
                />
            ))}
        </div>
    )
}

function SkeletonCircle({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
    const sizes = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-16 w-16' }
    return <Skeleton className={cn('rounded-full', sizes[size], className)} />
}

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-xl border border-clinical-100 bg-white p-5 space-y-4', className)}>
            <div className="flex items-center gap-4">
                <SkeletonCircle />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                </div>
            </div>
            <SkeletonText lines={2} />
        </div>
    )
}

function SkeletonStat({ className }: { className?: string }) {
    return (
        <div className={cn('rounded-xl border border-clinical-100 bg-white p-5', className)}>
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>
        </div>
    )
}

export { Skeleton, SkeletonText, SkeletonCircle, SkeletonCard, SkeletonStat }
