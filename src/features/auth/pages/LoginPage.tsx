import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Button } from '@/components/ui/button'
import { PremiumInput } from '@/components/ui/premium-input'
import { MicroCard } from '@/components/ui/micro-card'
import { TrustIndicators } from '@/components/ui/trust-indicators'
import { AltiaLogo } from '@/components/ui/logo'
import {
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  Lock,
  Zap,
  Database,
  Clock,
  Stethoscope
} from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { signIn, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim() || !password.trim()) return

    try {
      await signIn(email.trim(), password)
      const userData = useAuthStore.getState().userData
      if (userData?.role === 'secretary') {
        navigate('/assistant/dashboard')
      } else {
        navigate('/doctor/dashboard')
      }
    } catch {
      // Error is handled in the store
    }
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Left panel - Enhanced Hero Section */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        {/* Enhanced gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-mesh from-primary-600/30 to-accent-500/20" />

        {/* Medical pattern overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full border border-white/10 animate-pulse-soft" />
          <div className="absolute bottom-32 right-32 w-24 h-24 rounded-full border border-white/10 animate-pulse-soft" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white/5 animate-float" style={{ animationDelay: '2s' }} />

          {/* Subtle stethoscope icon */}
          <div className="absolute top-1/3 right-1/4 text-white/5 animate-float" style={{ animationDelay: '3s' }}>
            <Stethoscope className="w-48 h-48" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="animate-slide-up">
            <AltiaLogo theme="dark" size="large" className="mb-16" />
          </div>

          <div className="space-y-6 animate-stagger-1">
            <h1 className="text-6xl font-bold leading-tight tracking-tight">
              Plataforma Médica
              <br />
              <span className="bg-gradient-to-r from-primary-200 to-accent-200 bg-clip-text text-transparent">
                Inteligente
              </span>
            </h1>
            <p className="text-xl text-primary-100/90 max-w-lg leading-relaxed">
              Gestione sus pacientes, agenda y consultas médicas desde una interfaz moderna,
              segura y eficiente diseñada para profesionales de la salud.
            </p>
          </div>

          {/* Enhanced micro-cards */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg animate-stagger-2">
            <MicroCard
              icon={Zap}
              title="100%"
              subtitle="Digital"
              delay={0}
            />
            <MicroCard
              icon={Database}
              title="FHIR"
              subtitle="Compatible"
              delay={1}
            />
            <MicroCard
              icon={Clock}
              title="24/7"
              subtitle="Disponible"
              delay={2}
            />
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      </div>

      {/* Mobile hero background */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 opacity-10" />

      {/* Right panel - Premium Login Form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-2/5 bg-clinical-25 relative">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12 flex justify-center animate-fade-in">
            <AltiaLogo />
          </div>

          {/* Premium form card */}
          <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-8 animate-scale-in backdrop-blur-sm">
            {/* Header */}
            <div className="mb-8 text-center lg:text-left animate-slide-up">
              <h2 className="text-3xl font-bold text-clinical-900 mb-2">Iniciar Sesión</h2>
              <p className="text-clinical-600">
                Acceda a su plataforma médica inteligente
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                <p className="text-sm text-danger-700 font-medium">{error}</p>
              </div>
            )}

            {/* Premium form */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-stagger-1">
              <PremiumInput
                id="email"
                type="email"
                label="Correo electrónico"
                placeholder="doctor@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                autoComplete="email"
                required
                disabled={isLoading}
                error={!!error}
              />

              <PremiumInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Contraseña"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
                autoComplete="current-password"
                required
                disabled={isLoading}
                error={!!error}
              />

              {/* Remember me and forgot password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-clinical-300 rounded focus:ring-primary-500 focus:ring-2"
                    disabled={isLoading}
                  />
                  <span className="text-clinical-700 group-hover:text-clinical-900 transition-colors">
                    Recordarme
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors underline-offset-2 hover:underline"
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>

              {/* Premium gradient button */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full h-12 text-base font-semibold transition-all duration-200 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            {/* Trust indicators */}
            <TrustIndicators />

            {/* Register link */}
            <p className="mt-8 text-center text-sm text-clinical-600">
              ¿No tiene una cuenta?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors underline-offset-2 hover:underline"
              >
                Registrarse aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 right-10 w-20 h-20 rounded-full border border-primary-200/20" />
          <div className="absolute bottom-20 left-10 w-16 h-16 rounded-full border border-primary-200/20" />
        </div>
      </div>
    </div>
  )
}
