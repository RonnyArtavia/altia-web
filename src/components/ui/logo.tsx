import { cn } from '@/lib/utils'

// Import SVGs with explicit URLs - more compatible with Vite
const altiaLogoSvg = '/src/assets/logo/ALTIA-logo.svg'
const altiaIconSvg = '/src/assets/logo/ALTIA-Icono.svg'

interface LogoProps {
  collapsed?: boolean
  className?: string
  variant?: 'full' | 'icon' | 'hybrid'
  theme?: 'light' | 'dark' | 'auto'
  size?: 'small' | 'medium' | 'large' | 'xl'
}

export function AltiaLogo({
  collapsed = false,
  className,
  variant = 'full',
  theme = 'auto',
  size = 'medium'
}: LogoProps) {
  // Use icon variant when collapsed or explicitly requested
  const useIcon = collapsed || variant === 'icon'
  const useHybrid = variant === 'hybrid' && !collapsed

  // Size mapping
  const sizeClasses = {
    icon: {
      small: 'h-6 w-6',
      medium: 'h-9 w-9',
      large: 'h-12 w-12',
      xl: 'h-16 w-16'
    },
    full: {
      small: 'h-8',
      medium: 'h-12',
      large: 'h-16',
      xl: 'h-24'
    },
    hybrid: {
      small: 'h-6 w-6',
      medium: 'h-8 w-8',
      large: 'h-10 w-10',
      xl: 'h-12 w-12'
    }
  }

  // Hybrid variant: icon + text
  if (useHybrid) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <img
          src={altiaIconSvg}
          alt="ALTIA"
          className={cn('object-contain', sizeClasses.hybrid[size])}
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none'
            console.warn('ALTIA icon failed to load')
          }}
        />
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight text-clinical-900">Altia</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-clinical-400">Medical</span>
        </div>
      </div>
    )
  }

  if (useIcon) {
    return (
      <div className={cn('flex items-center', className)}>
        <img
          src={altiaIconSvg}
          alt="ALTIA"
          className={cn('object-contain', sizeClasses.icon[size])}
          onError={(e) => {
            // Fallback if image fails to load
            e.currentTarget.style.display = 'none'
            console.warn('ALTIA icon failed to load')
          }}
        />
      </div>
    )
  }

  // For dark backgrounds, create a more professional container
  if (theme === 'dark') {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="relative">
          {/* Glass morphism background */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />

          {/* Content container */}
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/30 overflow-hidden">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

            {/* Logo container with proper padding based on size */}
            <div className={cn(
              'relative flex items-center justify-center',
              size === 'large' ? 'px-8 py-4' :
              size === 'xl' ? 'px-10 py-5' :
              size === 'medium' ? 'px-6 py-3' : 'px-4 py-2'
            )}>
              <img
                src={altiaLogoSvg}
                alt="ALTIA Medical Platform"
                className={cn('object-contain', sizeClasses.full[size])}
                onError={(e) => {
                  // Fallback if image fails to load
                  e.currentTarget.style.display = 'none'
                  console.warn('ALTIA logo failed to load')
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={altiaLogoSvg}
        alt="ALTIA Medical Platform"
        className={cn('object-contain', sizeClasses.full[size])}
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.style.display = 'none'
          console.warn('ALTIA logo failed to load')
        }}
      />
    </div>
  )
}
