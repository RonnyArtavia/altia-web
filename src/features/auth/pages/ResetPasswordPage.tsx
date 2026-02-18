import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { passwordResetService } from '@/services/passwordResetService'
import { Button } from '@/components/ui/button'
import { PremiumInput } from '@/components/ui/premium-input'
import { TrustIndicators } from '@/components/ui/trust-indicators'
import { AltiaLogo } from '@/components/ui/logo'
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ArrowLeft
} from 'lucide-react'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isValidatingCode, setIsValidatingCode] = useState(true)
  const [isValidCode, setIsValidCode] = useState(false)
  const [userEmail, setUserEmail] = useState('')

  const oobCode = searchParams.get('oobCode') || searchParams.get('code')

  useEffect(() => {
    const validateResetCode = async () => {
      if (!oobCode) {
        setError('Enlace de restablecimiento inválido o faltante')
        setIsValidatingCode(false)
        return
      }

      try {
        const result = await passwordResetService.verifyPasswordResetCode(oobCode)
        if (result.success) {
          setIsValidCode(true)
          setUserEmail(result.email || '')
        } else {
          setError(result.message)
        }
      } catch (error) {
        setError('Error al validar el enlace de restablecimiento')
      } finally {
        setIsValidatingCode(false)
      }
    }

    validateResetCode()
  }, [oobCode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Todos los campos son obligatorios')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (!oobCode) {
      setError('Código de restablecimiento faltante')
      return
    }

    setIsLoading(true)
    try {
      const result = await passwordResetService.confirmPasswordReset(oobCode, password)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login', {
            state: { message: 'Contraseña restablecida exitosamente. Puede iniciar sesión con su nueva contraseña.' }
          })
        }, 3000)
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Error al restablecer la contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading validation state
  if (isValidatingCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-25 px-4">
        <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-12 animate-scale-in max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 animate-spin">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-clinical-900 mb-3">Validando enlace...</h2>
          <p className="text-clinical-600">
            Verificando el enlace de restablecimiento de contraseña
          </p>
        </div>
      </div>
    )
  }

  // Invalid code state
  if (!isValidCode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-25 px-4">
        <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-12 animate-scale-in max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger-50 animate-scale-in">
            <AlertCircle className="h-10 w-10 text-danger-600" />
          </div>
          <h2 className="text-2xl font-bold text-clinical-900 mb-3">Enlace Inválido</h2>
          <p className="text-clinical-600 mb-8">
            {error || 'Este enlace de restablecimiento no es válido o ha expirado.'}
          </p>
          <div className="space-y-4">
            <Link to="/forgot-password">
              <Button variant="gradient" size="lg" className="w-full">
                Solicitar Nuevo Enlace
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Inicio de Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-25 px-4">
        <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-12 animate-scale-in max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-50 animate-pulse-soft">
            <CheckCircle2 className="h-10 w-10 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-clinical-900 mb-3">¡Contraseña Restablecida!</h2>
          <p className="text-clinical-600 mb-2">
            Su contraseña ha sido actualizada exitosamente.
          </p>
          <p className="text-sm text-clinical-500">
            Redirigiendo al inicio de sesión...
          </p>
        </div>
      </div>
    )
  }

  const passwordsMatch = password === confirmPassword

  return (
    <div className="flex min-h-screen relative">
      {/* Enhanced Hero Section */}
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
              Nueva
              <br />
              <span className="bg-gradient-to-r from-primary-200 to-accent-200 bg-clip-text text-transparent">
                Contraseña
              </span>
            </h1>
            <p className="text-xl text-primary-100/90 max-w-lg leading-relaxed">
              Cree una nueva contraseña segura para acceder a su cuenta.
              Asegúrese de que sea fácil de recordar pero difícil de adivinar.
            </p>
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      </div>

      {/* Mobile hero background */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 opacity-10" />

      {/* Reset Password Form */}
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
              <h2 className="text-3xl font-bold text-clinical-900 mb-2">Nueva Contraseña</h2>
              <p className="text-clinical-600">
                {userEmail ? (
                  <>
                    Creando nueva contraseña para{' '}
                    <span className="font-semibold text-primary-600">{userEmail}</span>
                  </>
                ) : (
                  'Ingrese su nueva contraseña'
                )}
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
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Nueva contraseña"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                icon={Lock}
                rightIcon={showPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowPassword(!showPassword)}
                required
                disabled={isLoading}
                error={!!error}
              />

              <PremiumInput
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirmar nueva contraseña"
                placeholder="Repita su nueva contraseña"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
                icon={Lock}
                rightIcon={showConfirmPassword ? EyeOff : Eye}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                required
                disabled={isLoading}
                error={!!error || (confirmPassword && !passwordsMatch)}
              />

              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-danger-600 mt-1 animate-fade-in">
                  Las contraseñas no coinciden
                </p>
              )}

              <div className="space-y-4">
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  className="w-full h-12 text-base font-semibold transition-all duration-200"
                  disabled={isLoading || !password || !confirmPassword || !passwordsMatch}
                >
                  {isLoading ? (
                    <>
                      <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Restableciendo...
                    </>
                  ) : (
                    'Restablecer Contraseña'
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