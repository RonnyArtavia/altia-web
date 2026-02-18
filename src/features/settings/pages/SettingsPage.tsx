import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  User,
  Calendar,
  MessageCircle,
  Users,
  Shield,
  Bell,
  BarChart3,
  Mic,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Info,
  Edit3,
  UserPlus,
} from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/features/auth/stores/authStore'

// ─── Sub-components ─────────────────────────────────────────

function SettingsRow({
  icon,
  title,
  description,
  onClick,
  badge,
  disabled = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick?: () => void
  badge?: string
  disabled?: boolean
}) {
  return (
    <Button
      variant="ghost"
      className={`w-full p-4 h-auto justify-start hover:bg-clinical-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <div className="flex items-center gap-4 w-full">
        <div className="p-2 rounded-lg bg-clinical-100 text-clinical-600">{icon}</div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-clinical-900">{title}</h4>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
          <p className="text-sm text-clinical-600 mt-1">{description}</p>
        </div>
        {!disabled && <ChevronRight className="h-4 w-4 text-clinical-400" />}
      </div>
    </Button>
  )
}

function SettingsToggleRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="p-2 rounded-lg bg-clinical-100 text-clinical-600">{icon}</div>
      <div className="flex-1">
        <h4 className="font-medium text-clinical-900">{title}</h4>
        <p className="text-sm text-clinical-600 mt-1">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate()
  const { userData, user } = useAuthStore()
  const isDoctor = userData?.role === 'doctor'
  const isSecretary = userData?.role === 'secretary'

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [chatNotificationsEnabled, setChatNotificationsEnabled] = useState(true)
  const [appointmentNotificationsEnabled, setAppointmentNotificationsEnabled] = useState(true)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true)
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(true)
  const [savingAiSettings, setSavingAiSettings] = useState(false)
  const [awsTranscriptionEnabled, setAwsTranscriptionEnabled] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    if (!userData) return
    if (isDoctor && (userData as any).aiAnalysisSettings) {
      setAiAnalysisEnabled((userData as any).aiAnalysisSettings.enabled ?? true)
    }
    setLoadingSettings(false)
  }, [userData])

  const handleToggleAiAnalysis = async (enabled: boolean) => {
    if (!user?.uid || !isDoctor) return
    setSavingAiSettings(true)
    try {
      setAiAnalysisEnabled(enabled)
      await updateDoc(doc(firestore, 'users', user.uid), {
        'aiAnalysisSettings.enabled': enabled,
        'aiAnalysisSettings.updatedAt': new Date().toISOString(),
      })
    } catch {
      setAiAnalysisEnabled(!enabled)
    } finally {
      setSavingAiSettings(false)
    }
  }

  const handleNotificationToggle = (type: string, enabled: boolean) => {
    switch (type) {
      case 'master': setNotificationsEnabled(enabled); break
      case 'chat': setChatNotificationsEnabled(enabled); break
      case 'appointments': setAppointmentNotificationsEnabled(enabled); break
      case 'email': setEmailNotificationsEnabled(enabled); break
    }
  }

  if (loadingSettings) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Configuración</h1>
        <p className="text-sm text-clinical-500">Personaliza tu experiencia en Altia Health</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Doctor Professional Section */}
        {isDoctor && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Perfil Profesional</CardTitle>
                  <p className="text-sm text-clinical-500">
                    Configuración de tu perfil médico y práctica profesional
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingsRow
                icon={<Edit3 className="h-4 w-4" />}
                title="Editar Perfil"
                description="Actualiza tu información profesional, especialidad y tarifas"
                onClick={() => navigate('/doctor/profile-edit')}
              />
              <Separator />
              <SettingsRow
                icon={<Calendar className="h-4 w-4" />}
                title="Configurar Agenda"
                description="Configura tu horario de atención y disponibilidad"
                onClick={() => navigate('/doctor/schedule-config')}
              />
              <Separator />
              <SettingsRow
                icon={<MessageCircle className="h-4 w-4" />}
                title="Chat para Pacientes"
                description="Configurar horario para responder chats y respuestas automáticas"
                onClick={() => navigate('/doctor/message-availability')}
              />
              <Separator />
              <SettingsRow
                icon={<UserPlus className="h-4 w-4" />}
                title="Gestionar Asistentes"
                description="Ver asistentes activos, invitaciones pendientes y enviar nuevas invitaciones"
                onClick={() => navigate('/doctor/secretary-management')}
              />
            </CardContent>
          </Card>
        )}

        {/* Secretary Management Section */}
        {isSecretary && (
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gestión del Consultorio</CardTitle>
                  <p className="text-sm text-clinical-500">
                    Herramientas para la administración del consultorio médico
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <SettingsRow
                icon={<User className="h-4 w-4" />}
                title="Perfil del Médico"
                description="Gestionar información profesional y configuración del médico"
                onClick={() => navigate('/assistant/doctor-profile')}
              />
              <Separator />
              <SettingsRow
                icon={<Calendar className="h-4 w-4" />}
                title="Agenda del Médico"
                description="Configurar horarios, disponibilidad y días feriados"
                onClick={() => navigate('/assistant/schedule-management')}
              />
              <Separator />
              <SettingsRow
                icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
                title="Citas Urgentes"
                description="Ver citas de emergencia y reorganizar agenda"
                onClick={() => navigate('/assistant/priority-appointments')}
                badge="Urgente"
              />
              <Separator />
              <SettingsRow
                icon={<Users className="h-4 w-4" />}
                title="Gestión de Pacientes........"
                description="Agregar, editar y gestionar información de pacientes"
                onClick={() => navigate('/assistant/patients')}
              />
            </CardContent>
          </Card>
        )}

        {/* Security & Privacy */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Seguridad y Privacidad</CardTitle>
                <p className="text-sm text-clinical-500">
                  Configuración de seguridad y gestión de privacidad
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <SettingsRow
              icon={<Shield className="h-4 w-4" />}
              title="Configuración de Privacidad"
              description="Gestiona el acceso a tu información y permisos"
              onClick={() => navigate('/settings/privacy')}
            />
            <Separator />
            <SettingsRow
              icon={<Info className="h-4 w-4" />}
              title="Autenticación Web"
              description="La autenticación biométrica solo está disponible en dispositivos móviles"
              disabled
            />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Bell className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Notificaciones</CardTitle>
                <p className="text-sm text-clinical-500">
                  Configuración de alertas y notificaciones del sistema
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingsToggleRow
              icon={<Bell className="h-4 w-4" />}
              title="Notificaciones Push"
              description="Recibir notificaciones push en el navegador"
              checked={notificationsEnabled}
              onCheckedChange={(c) => handleNotificationToggle('master', c)}
            />
            <Separator />
            <SettingsToggleRow
              icon={<MessageCircle className="h-4 w-4" />}
              title="Mensajes de Chat"
              description="Notificaciones de nuevos mensajes de pacientes"
              checked={chatNotificationsEnabled}
              onCheckedChange={(c) => handleNotificationToggle('chat', c)}
              disabled={!notificationsEnabled}
            />
            <Separator />
            <SettingsToggleRow
              icon={<Calendar className="h-4 w-4" />}
              title="Recordatorios de Citas"
              description="Notificaciones de próximas citas médicas"
              checked={appointmentNotificationsEnabled}
              onCheckedChange={(c) => handleNotificationToggle('appointments', c)}
              disabled={!notificationsEnabled}
            />
            <Separator />
            <SettingsToggleRow
              icon={<Bell className="h-4 w-4" />}
              title="Notificaciones por Email"
              description="Recibir resúmenes y alertas importantes por correo electrónico"
              checked={emailNotificationsEnabled}
              onCheckedChange={(c) => handleNotificationToggle('email', c)}
            />
          </CardContent>
        </Card>

        {/* Statistics — Doctors Only */}
        {isDoctor && (
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Estadísticas</CardTitle>
                  <p className="text-sm text-clinical-500">
                    Información sobre tu actividad y uso de la plataforma
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Total de Notas', value: '-' },
                  { label: 'Notas de Voz', value: '-' },
                  { label: 'Citas Atendidas', value: '-' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-4 bg-clinical-50 rounded-lg">
                    <div className="text-2xl font-bold text-clinical-900">{stat.value}</div>
                    <div className="text-sm text-clinical-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transcription — Doctors Only */}
        {isDoctor && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <Mic className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuración de Transcripción</CardTitle>
                  <p className="text-sm text-clinical-500">
                    Configuración de servicios de transcripción de voz
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingsToggleRow
                icon={<Mic className="h-4 w-4" />}
                title="AWS Transcribe Medical"
                description="Mayor precisión con procesamiento en la nube para terminología médica"
                checked={awsTranscriptionEnabled}
                onCheckedChange={setAwsTranscriptionEnabled}
              />
              <Separator />
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Transcripción en la Web</p>
                    <p className="text-sm text-orange-700">
                      La transcripción de voz en tiempo real está optimizada para dispositivos
                      móviles. En la versión web puedes revisar y editar transcripciones
                      existentes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis — Doctors Only */}
        {isDoctor && (
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Análisis con IA</CardTitle>
                  <p className="text-sm text-clinical-500">
                    Configuración del análisis inteligente de consultas médicas
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingsToggleRow
                icon={<Sparkles className="h-4 w-4" />}
                title="Análisis de Consultas"
                description="Analiza notas médicas para detectar interacciones, contraindicaciones y alertas"
                checked={aiAnalysisEnabled}
                onCheckedChange={handleToggleAiAnalysis}
                disabled={savingAiSettings}
              />
              <Separator />
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-indigo-800">
                      El análisis con IA proporciona:
                    </p>
                    <ul className="text-sm text-indigo-700 space-y-1 mt-1">
                      <li>• Detección de interacciones medicamentosas</li>
                      <li>• Alertas de contraindicaciones</li>
                      <li>• Alertas de alergias cruzadas</li>
                      <li>• Validación de dosis</li>
                      <li>• Banderas rojas clínicas</li>
                      <li>• Recomendaciones de seguimiento</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-clinical-100">
                <Info className="h-5 w-5 text-clinical-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Acerca de Altia Health</CardTitle>
                <p className="text-sm text-clinical-500">Información de la aplicación y versión</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-clinical-900">Altia Health</h3>
                  <p className="text-sm text-clinical-600">Versión 1.0.0 - Web</p>
                </div>
              </div>
              <p className="text-sm text-clinical-600">
                Asistente de notas médicas con captura de voz e integración FHIR. Optimizado para
                la gestión integral de consultas médicas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SettingsPage
