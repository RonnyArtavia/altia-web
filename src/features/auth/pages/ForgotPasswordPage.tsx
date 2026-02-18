import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Button } from '@/components/ui/button'
import { PremiumInput } from '@/components/ui/premium-input'
import { TrustIndicators } from '@/components/ui/trust-indicators'
import { AltiaLogo } from '@/components/ui/logo'
import {
  Mail,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  Send
} from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const { sendPasswordResetEmail, isLoading, error, clearError } = useAuthStore()

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!email.trim()) {
      return
    }

    if (!isValidEmail(email.trim())) {
      return
    }

    try {
      await sendPasswordResetEmail(email.trim())
      setSuccess(true)
    } catch {
      // Error is handled in the store
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="flex min-h-screen relative">
        {/* Enhanced Hero Section - Similar to login/register */}
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
                Revisa tu
                <br />
                <span className="bg-gradient-to-r from-primary-200 to-accent-200 bg-clip-text text-transparent">
                  Correo Electrónico
                </span>
              </h1>
              <p className="text-xl text-primary-100/90 max-w-lg leading-relaxed">
                Te hemos enviado un enlace seguro para restablecer tu contraseña.
                Revisa tu bandeja de entrada y carpeta de spam.
              </p>
            </div>
          </div>

          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
        </div>

        {/* Mobile hero background */}
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 opacity-10" />

        {/* Success Message */}
        <div className="flex w-full flex-col items-center justify-center px-6 lg:w-2/5 bg-clinical-25 relative">
          <div className="w-full max-w-md relative z-10">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 flex justify-center animate-fade-in">
              <AltiaLogo />
            </div>

            {/* Success card */}
            <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-8 animate-scale-in backdrop-blur-sm text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-50 animate-pulse-soft">
                <CheckCircle2 className="h-10 w-10 text-success-600" />
              </div>

              <h2 className="text-3xl font-bold text-clinical-900 mb-4">¡Correo Enviado!</h2>

              <div className="space-y-4 mb-8">
                <p className="text-clinical-600">
                  Hemos enviado un enlace de restablecimiento de contraseña a:
                </p>
                <p className="font-semibold text-primary-600 bg-primary-50 rounded-lg p-3 border border-primary-200">
                  {email}
                </p>
                <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 text-accent-700">
                    <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium mb-2">¿No encuentras el correo?</p>
                      <ul className="space-y-1 text-accent-600">
                        <li>• Revisa tu carpeta de spam o correo no deseado</li>
                        <li>• Espera unos minutos, puede tardar en llegar</li>
                        <li>• Verifica que escribiste correctamente tu email</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link to="/login">
                  <Button className="w-full" variant="gradient" size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Inicio de Sesión
                  </Button>
                </Link>

                <button
                  onClick={() => setSuccess(false)}
                  className="text-sm text-clinical-500 hover:text-clinical-700 transition-colors underline-offset-2 hover:underline"
                >
                  Enviar a otro correo electrónico
                </button>
              </div>

              <TrustIndicators />
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

  return (
    <div className="flex min-h-screen relative">
      {/* Enhanced Hero Section - Similar to login/register */}
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
              ¿Olvidó su
              <br />
              <span className="bg-gradient-to-r from-primary-200 to-accent-200 bg-clip-text text-transparent">
                Contraseña?
              </span>
            </h1>
            <p className="text-xl text-primary-100/90 max-w-lg leading-relaxed">
              No se preocupe. Ingrese su correo electrónico y le enviaremos
              un enlace seguro para crear una nueva contraseña.
            </p>
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      </div>

      {/* Mobile hero background */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 opacity-10" />

      {/* Forgot Password Form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-2/5 bg-clinical-25 relative">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center animate-fade-in">
            <AltiaLogo />
          </div>

          {/* Premium form card */}
          <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-8 animate-scale-in backdrop-blur-sm">
            {/* Header */}
            <div className="mb-8 text-center lg:text-left animate-slide-up">
              <h2 className="text-3xl font-bold text-clinical-900 mb-2">Restablecer Contraseña</h2>
              <p className="text-clinical-600">
                Ingrese su correo electrónico para recibir instrucciones
              </p>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                <p className="text-sm text-danger-700 font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 animate-stagger-1">
              <PremiumInput
                id="email"
                type="email"
                label="Correo electrónico"
                placeholder="doctor@ejemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearError()
                }}
                icon={Mail}
                required
                disabled={isLoading}
                error={!!error || (email && !isValidEmail(email))}
              />

              {email && !isValidEmail(email) && (
                <p className="text-sm text-danger-600 mt-1 animate-fade-in">
                  Por favor ingrese un correo electrónico válido
                </p>
              )}

              <div className="space-y-4">
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full h-12 text-base font-semibold transition-all duration-200"
                  disabled={isLoading || !email.trim() || !isValidEmail(email)}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Enlace de Restablecimiento
                    </>
                  )}
                </Button>

                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Inicio de Sesión
                  </Button>
                </Link>
              </div>
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
                Crear Cuenta
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