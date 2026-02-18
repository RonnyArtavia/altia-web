import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { emailVerificationService } from '@/services/emailVerificationService'
import { assistantRequestService } from '@/services/assistantRequestService'
import { userValidationService } from '@/services/userValidationService'
import { Button } from '@/components/ui/button'
import { PremiumInput } from '@/components/ui/premium-input'
import { TrustIndicators } from '@/components/ui/trust-indicators'
import { RoleSelector, type UserRole } from '@/components/auth/RoleSelector'
import { AltiaLogo } from '@/components/ui/logo'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Calendar,
  MapPin,
  Stethoscope,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'

interface RegistrationData {
  // Step 0
  role: UserRole

  // Step 1
  email: string
  password: string
  confirmPassword: string

  // Step 2 - Common
  name: string
  phone: string

  // Step 2 - Patient specific
  cedula?: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth?: string
  address?: string

  // Step 2 - Doctor specific
  specialty?: string
  medicalLicense?: string

  // Step 2 - Assistant specific
  fullName?: string
  doctorLicenseNumber?: string
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Femenino' },
  { value: 'other', label: 'Otro' }
]

export function UnifiedRegistrationForm() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [isCodeVerifying, setIsCodeVerifying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { signUp } = useAuthStore()

  const [formData, setFormData] = useState<RegistrationData>({
    role: 'doctor',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    cedula: '',
    gender: 'male',
    dateOfBirth: '',
    address: '',
    specialty: '',
    medicalLicense: '',
    fullName: '',
    doctorLicenseNumber: ''
  })

  const updateFormData = (data: Partial<RegistrationData>) => {
    console.log('📝 Updating form data:', data)
    setFormData(prev => {
      const newData = { ...prev, ...data }
      console.log('📝 New form data:', newData)
      return newData
    })
    // Only clear error if we're not just updating role in step 0
    if (!data.role || currentStep !== 0) {
      setError('')
    }
  }

  // Timer effect for email verification countdown
  useEffect(() => {
    if (currentStep === 1.5 && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 60000) // Update every minute

      return () => clearInterval(timer)
    }
  }, [currentStep, timeRemaining])

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('Todos los campos son obligatorios')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Por favor ingresa un email válido')
      return false
    }

    return true
  }

  const validateStep2 = () => {
    if (formData.role === 'secretary') {
      if (!formData.fullName || !formData.doctorLicenseNumber) {
        setError('Nombre completo y número de colegiatura del médico son obligatorios')
        return false
      }
    } else {
      if (!formData.name || !formData.phone) {
        setError('Nombre y teléfono son obligatorios')
        return false
      }

      if (formData.role === 'patient') {
        if (!formData.cedula || !formData.gender || !formData.dateOfBirth) {
          setError('Todos los campos de paciente son obligatorios')
          return false
        }
      } else if (formData.role === 'doctor') {
        if (!formData.specialty || !formData.medicalLicense) {
          setError('Especialidad y número de licencia son obligatorios')
          return false
        }
      }
    }

    return true
  }

  const handleNext = async () => {
    setError('')

    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return

    if (currentStep === 1) {
      // First validate if email already exists
      console.log('📝 Form: Starting step 1 validation for email:', formData.email)
      setIsEmailSending(true)
      try {
        console.log('📝 Form: Calling userValidationService...')
        const validation = await userValidationService.validateEmailForRegistration(formData.email)
        console.log('📝 Form: Validation result:', validation)

        if (!validation.canProceed) {
          console.log('📝 Form: Cannot proceed - setting error:', validation.message)
          setError(validation.message)
          setIsEmailSending(false)
          return
        }

        // If email is available, send verification code
        console.log('📝 Form: Email validated, sending verification code...')
        const result = await emailVerificationService.sendVerificationCode(formData.email)

        if (result.success) {
          console.log('📝 Form: Verification code sent successfully')
          setCurrentStep(1.5)
          setTimeRemaining(emailVerificationService.getTimeRemaining(formData.email))
        } else {
          console.log('📝 Form: Failed to send verification code:', result.message)
          setError(result.message)
        }
      } catch (error) {
        console.error('📝 Form: Error in step 1 validation:', error)
        setError('Error al verificar el email o enviar el código de verificación')
      } finally {
        setIsEmailSending(false)
      }
      return
    }

    if (currentStep === 1.5) {
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Por favor ingresa el código de 6 dígitos')
        return
      }

      setIsCodeVerifying(true)
      try {
        const result = await emailVerificationService.verifyCode(formData.email, verificationCode)

        if (result.success) {
          setCurrentStep(2)
        } else {
          setError(result.message)
        }
      } catch (error) {
        setError('Error al verificar el código')
      } finally {
        setIsCodeVerifying(false)
      }
      return
    }

    if (currentStep === 2) {
      setIsLoading(true)
      try {
        if (formData.role === 'secretary') {
          // Handle assistant registration
          await signUp(formData.email, formData.password, {
            name: formData.fullName!,
            role: 'secretary',
          })

          // Create assistant request
          const userData = useAuthStore.getState().userData
          if (userData) {
            await assistantRequestService.createAssistantRequest(
              userData.uid,
              formData.email,
              formData.fullName!,
              '',
              '',
              formData.doctorLicenseNumber!
            )

            // Clean up verification codes
            emailVerificationService.cleanupCodesForEmail(formData.email)

            // Sign out since they can't access yet
            await useAuthStore.getState().signOut()

            setSuccess(true)
            setTimeout(() => {
              navigate('/login', {
                state: {
                  message: 'Tu solicitud para ser asistente médico ha sido enviada exitosamente. Recibirás una notificación por email cuando sea revisada.'
                }
              })
            }, 3000)
          }
        } else {
          // Handle doctor/patient registration
          const userData: any = {
            name: formData.name,
            role: formData.role,
            phoneNumber: formData.phone
          }

          if (formData.role === 'doctor') {
            userData.specialty = formData.specialty
            userData.medicalLicense = formData.medicalLicense
          } else if (formData.role === 'patient') {
            userData.cedula = formData.cedula
            userData.gender = formData.gender
            userData.dateOfBirth = formData.dateOfBirth
            userData.address = formData.address
          }

          await signUp(formData.email, formData.password, userData)

          // Clean up verification codes
          emailVerificationService.cleanupCodesForEmail(formData.email)

          setSuccess(true)
          setTimeout(() => {
            const userData = useAuthStore.getState().userData
            if (userData?.role === 'secretary') {
              navigate('/assistant/dashboard')
            } else {
              navigate('/doctor/dashboard')
            }
          }, 1500)
        }
      } catch (error: any) {
        console.error('Registration error:', error)
        setError(error.message || 'Error al crear la cuenta')
      } finally {
        setIsLoading(false)
      }
      return
    }

    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    setError('')
    if (currentStep === 0) {
      navigate('/login')
    } else if (currentStep === 1.5) {
      setCurrentStep(1)
    } else {
      setCurrentStep(prev => Math.max(0, prev - 1))
    }
  }

  const handleResendCode = async () => {
    setIsEmailSending(true)
    setError('')
    try {
      // Validate email is still available before resending
      const validation = await userValidationService.validateEmailForRegistration(formData.email)

      if (!validation.canProceed) {
        setError(validation.message)
        setIsEmailSending(false)
        return
      }

      const result = await emailVerificationService.sendVerificationCode(formData.email)

      if (result.success) {
        setTimeRemaining(emailVerificationService.getTimeRemaining(formData.email))
        setVerificationCode('')
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Error al reenviar el código')
    } finally {
      setIsEmailSending(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-25 px-4">
        <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-12 animate-scale-in max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success-50 animate-pulse-soft">
            <CheckCircle2 className="h-10 w-10 text-success-600" />
          </div>
          <h2 className="text-2xl font-bold text-clinical-900 mb-3">¡Cuenta creada exitosamente!</h2>
          <p className="text-clinical-600 mb-2">
            {formData.role === 'secretary'
              ? 'Tu solicitud ha sido enviada y será revisada por el equipo médico.'
              : 'Redirigiendo al dashboard...'}
          </p>
          {formData.role === 'secretary' && (
            <p className="text-sm text-clinical-500">
              Recibirás una notificación por email cuando sea aprobada.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen relative">
      {/* Enhanced Hero Section - Similar to login */}
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
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="animate-slide-up">
            <AltiaLogo theme="dark" size="large" className="mb-16" />
          </div>

          <div className="space-y-6 animate-stagger-1">
            <h1 className="text-6xl font-bold leading-tight tracking-tight">
              Únete a la
              <br />
              <span className="bg-gradient-to-r from-primary-200 to-accent-200 bg-clip-text text-transparent">
                Plataforma Médica
              </span>
            </h1>
            <p className="text-xl text-primary-100/90 max-w-lg leading-relaxed">
              Crea tu cuenta y accede a herramientas médicas inteligentes diseñadas
              para mejorar la atención de pacientes y optimizar tu práctica médica.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mt-16 animate-stagger-2">
            <div className="flex items-center space-x-4 mb-4">
              <span className="text-primary-200 font-medium">Paso {Math.floor(currentStep) + 1} de 3</span>
            </div>
            <div className="w-full max-w-sm bg-primary-800/50 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary-200 to-accent-200 h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${((Math.floor(currentStep) + 1) / 3) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      </div>

      {/* Mobile hero background */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 opacity-10" />

      {/* Registration Form */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-2/5 bg-clinical-25 relative">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center animate-fade-in">
            <AltiaLogo />
          </div>

          {/* Premium form card */}
          <div className="bg-white rounded-2xl shadow-card-hover border border-clinical-100/50 p-8 animate-scale-in backdrop-blur-sm">
            {/* Step content will be rendered here based on currentStep */}
            {currentStep === 0 && (
              <>
                <div className="mb-8 text-center animate-slide-up">
                  <h2 className="text-3xl font-bold text-clinical-900 mb-2">Crear Cuenta</h2>
                  <p className="text-clinical-600">
                    Selecciona el tipo de cuenta que deseas crear
                  </p>
                </div>

                <div className="space-y-6 animate-stagger-1">
                  <RoleSelector
                    selectedRole={formData.role}
                    onRoleSelect={(role) => updateFormData({ role })}
                  />

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                      <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Volver
                    </Button>
                    <Button onClick={handleNext} className="flex-1" variant="gradient">
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {currentStep === 1 && (
              <>
                <div className="mb-8 text-center animate-slide-up">
                  <h2 className="text-3xl font-bold text-clinical-900 mb-2">
                    Registro como{' '}
                    {formData.role === 'doctor' ? 'Médico' : formData.role === 'secretary' ? 'Asistente' : 'Paciente'}
                  </h2>
                  <p className="text-clinical-600">
                    Ingresa tu email y contraseña
                  </p>
                </div>

                <div className="space-y-6 animate-stagger-1">
                  <PremiumInput
                    id="email"
                    type="email"
                    label="Correo electrónico"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    icon={Mail}
                    required
                    error={!!error}
                  />

                  <PremiumInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Contraseña"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => updateFormData({ password: e.target.value })}
                    icon={Lock}
                    rightIcon={showPassword ? EyeOff : Eye}
                    onRightIconClick={() => setShowPassword(!showPassword)}
                    required
                    error={!!error}
                  />

                  <PremiumInput
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirmar contraseña"
                    placeholder="Confirma tu contraseña"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData({ confirmPassword: e.target.value })}
                    icon={Lock}
                    rightIcon={showConfirmPassword ? EyeOff : Eye}
                    onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    required
                    error={!!error}
                  />

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                      <div className="flex-1">
                        <p className="text-sm text-danger-700 font-medium">{error}</p>
                        {error.includes('Ya existe una cuenta') && (
                          <div className="mt-2">
                            <Link
                              to="/login"
                              className="inline-flex items-center text-xs text-primary-600 hover:text-primary-700 transition-colors underline-offset-2 hover:underline font-medium"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Ir al inicio de sesión
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Atrás
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={isEmailSending}
                      className="flex-1"
                      variant="gradient"
                    >
                      {isEmailSending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {currentStep === 1.5 && (
              <>
                <div className="mb-8 text-center animate-slide-up">
                  <h2 className="text-3xl font-bold text-clinical-900 mb-2">Verificar Email</h2>
                  <p className="text-clinical-600">
                    Hemos enviado un código de 6 dígitos a:<br />
                    <strong className="text-primary-600">{formData.email}</strong>
                  </p>
                </div>

                <div className="space-y-6 animate-stagger-1">
                  <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2 text-accent-700 mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-medium">Revisa tu bandeja de entrada</span>
                    </div>
                    <p className="text-xs text-clinical-600">
                      El código llegará en los próximos minutos. También revisa tu carpeta de spam.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="verificationCode" className="block text-sm font-medium text-clinical-700">
                      Código de Verificación
                    </label>
                    <input
                      id="verificationCode"
                      type="text"
                      placeholder="123456"
                      className="w-full text-center text-xl font-mono tracking-widest h-14 rounded-xl border-2 border-clinical-200 bg-white transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      autoComplete="one-time-code"
                    />
                    {verificationCode && verificationCode.length !== 6 && (
                      <p className="text-xs text-clinical-500 text-center">
                        {6 - verificationCode.length} dígito(s) restante(s)
                      </p>
                    )}
                  </div>

                  <div className="text-center">
                    {timeRemaining > 0 ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-clinical-600 mb-3">
                        <Clock className="w-4 h-4" />
                        <span>
                          Nuevo código disponible en{' '}
                          <span className="font-medium text-primary-600">{timeRemaining} minuto(s)</span>
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendCode}
                        disabled={isEmailSending}
                        className="mb-3"
                      >
                        {isEmailSending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2"></div>
                            Reenviando...
                          </>
                        ) : (
                          'Reenviar código'
                        )}
                      </Button>
                    )}
                  </div>

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                      <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Atrás
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={isCodeVerifying || verificationCode.length !== 6}
                      className="flex-1"
                      variant="gradient"
                    >
                      {isCodeVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Verificando...
                        </>
                      ) : (
                        <>
                          Verificar
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <>
                <div className="mb-8 text-center animate-slide-up">
                  <h2 className="text-3xl font-bold text-clinical-900 mb-2">Información Personal</h2>
                  <p className="text-clinical-600">
                    Completa tu perfil de{' '}
                    {formData.role === 'doctor' ? 'médico' : formData.role === 'secretary' ? 'asistente' : 'paciente'}
                  </p>
                </div>

                <div className="space-y-6 animate-stagger-1">
                  {/* Common fields for doctor and patient */}
                  {formData.role !== 'secretary' && (
                    <>
                      <PremiumInput
                        id="name"
                        type="text"
                        label="Nombre completo"
                        placeholder="Tu nombre completo"
                        value={formData.name}
                        onChange={(e) => updateFormData({ name: e.target.value })}
                        icon={User}
                        required
                        error={!!error}
                      />

                      <PremiumInput
                        id="phone"
                        type="tel"
                        label="Teléfono"
                        placeholder="+506 8888 8888"
                        value={formData.phone}
                        onChange={(e) => updateFormData({ phone: e.target.value })}
                        icon={Phone}
                        required
                        error={!!error}
                      />
                    </>
                  )}

                  {/* Patient specific fields */}
                  {formData.role === 'patient' && (
                    <>
                      <PremiumInput
                        id="cedula"
                        type="text"
                        label="Cédula"
                        placeholder="1-1234-5678"
                        value={formData.cedula || ''}
                        onChange={(e) => updateFormData({ cedula: e.target.value })}
                        icon={FileText}
                        required
                        error={!!error}
                      />

                      <div className="space-y-2">
                        <label htmlFor="gender" className="block text-sm font-medium text-clinical-700">
                          Género
                        </label>
                        <select
                          id="gender"
                          className="w-full h-12 rounded-xl border-2 border-clinical-200 bg-white px-4 text-sm transition-all duration-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                          value={formData.gender}
                          onChange={(e) => updateFormData({ gender: e.target.value as 'male' | 'female' | 'other' })}
                        >
                          {GENDER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <PremiumInput
                        id="dateOfBirth"
                        type="date"
                        label="Fecha de nacimiento"
                        value={formData.dateOfBirth || ''}
                        onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
                        icon={Calendar}
                        required
                        error={!!error}
                      />

                      <PremiumInput
                        id="address"
                        type="text"
                        label="Dirección"
                        placeholder="Tu dirección completa"
                        value={formData.address || ''}
                        onChange={(e) => updateFormData({ address: e.target.value })}
                        icon={MapPin}
                        error={!!error}
                      />
                    </>
                  )}

                  {/* Doctor specific fields */}
                  {formData.role === 'doctor' && (
                    <>
                      <PremiumInput
                        id="specialty"
                        type="text"
                        label="Especialidad"
                        placeholder="Ej: Cardiología, Pediatría"
                        value={formData.specialty || ''}
                        onChange={(e) => updateFormData({ specialty: e.target.value })}
                        icon={Stethoscope}
                        required
                        error={!!error}
                      />

                      <PremiumInput
                        id="medicalLicense"
                        type="text"
                        label="Número de licencia médica"
                        placeholder="Tu número de licencia médica"
                        value={formData.medicalLicense || ''}
                        onChange={(e) => updateFormData({ medicalLicense: e.target.value })}
                        icon={FileText}
                        required
                        error={!!error}
                      />
                    </>
                  )}

                  {/* Assistant specific fields */}
                  {formData.role === 'secretary' && (
                    <>
                      <PremiumInput
                        id="fullName"
                        type="text"
                        label="Nombre completo"
                        placeholder="Tu nombre completo"
                        value={formData.fullName || ''}
                        onChange={(e) => updateFormData({ fullName: e.target.value })}
                        icon={User}
                        required
                        error={!!error}
                      />

                      <PremiumInput
                        id="doctorLicenseNumber"
                        type="text"
                        label="Número de colegiatura del médico"
                        placeholder="Ej: 12345"
                        value={formData.doctorLicenseNumber || ''}
                        onChange={(e) => updateFormData({ doctorLicenseNumber: e.target.value })}
                        icon={FileText}
                        required
                        error={!!error}
                      />

                      <div className="text-sm text-accent-700 bg-accent-50 border border-accent-200 rounded-xl p-4">
                        <p className="font-medium mb-2">Como asistente médico podrás:</p>
                        <ul className="space-y-1 text-accent-600">
                          <li>• Administrar la agenda de citas del médico</li>
                          <li>• Coordinar la atención de pacientes</li>
                          <li>• Gestionar horarios y disponibilidad</li>
                        </ul>
                        <p className="mt-2 text-xs text-accent-600">
                          Ingresa el número de colegiatura del médico con quien trabajarás
                        </p>
                      </div>
                    </>
                  )}

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-danger-200 bg-danger-50 p-4 animate-fade-in">
                      <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-500" />
                      <p className="text-sm text-danger-700 font-medium">{error}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Atrás
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="flex-1"
                      disabled={isLoading}
                      variant="gradient"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Creando cuenta...
                        </>
                      ) : (
                        <>
                          Crear Cuenta
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Trust indicators - Show on all steps except success */}
            {currentStep !== 'success' && <TrustIndicators />}

            {/* Login link */}
            <p className="mt-8 text-center text-sm text-clinical-600">
              ¿Ya tienes una cuenta?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary-600 hover:text-primary-700 transition-colors underline-offset-2 hover:underline"
              >
                Iniciar Sesión
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