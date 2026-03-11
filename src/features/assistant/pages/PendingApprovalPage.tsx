import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { assistantRequestService } from '@/services/assistantRequestService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  User,
  Mail,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings,
  LogOut
} from 'lucide-react'
import type { AssistantRequest } from '@/services/assistantRequestService'

export function PendingApprovalPage() {
  const navigate = useNavigate()
  const { userData, user, signOut, refreshUserData } = useAuthStore()
  const [requestData, setRequestData] = useState<AssistantRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRequestData = async () => {
    if (!user?.uid) return

    setIsLoading(true)
    setError(null)

    try {
      const request = await assistantRequestService.getRequestByUserId(user.uid)
      setRequestData(request)
    } catch (error: any) {
      setError(error.message || 'Error al cargar los datos de la solicitud')
      console.error('Error loading request data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshStatus = async () => {
    setIsRefreshing(true)
    try {
      // Refrescar datos del usuario para verificar si el estado cambió
      await refreshUserData()
      // Refrescar datos de la solicitud
      await loadRequestData()
    } catch (error) {
      console.error('Error refreshing status:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      // Primero refrescar los datos del usuario para asegurar que tenemos la info más actualizada
      console.log('🔄 PendingApprovalPage: Refreshing user data...')
      await refreshUserData()
      // Luego cargar los datos de la solicitud
      await loadRequestData()
    }

    if (user?.uid) {
      initializeData()
    }
  }, [user?.uid])

  // Si el usuario ya está aprobado, redirigir al dashboard
  useEffect(() => {
    console.log('📊 PendingApprovalPage: Checking userData status', {
      userData,
      assistantStatus: userData?.assistantStatus,
      role: userData?.role
    })

    if (userData?.assistantStatus === 'approved') {
      console.log('✅ Assistant is approved, redirecting to dashboard...')
      navigate('/assistant/dashboard')
    } else {
      console.log('⚠️ Assistant not approved yet:', userData?.assistantStatus)
    }
  }, [userData?.assistantStatus, navigate])

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Rechazada
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            Sin estado
          </Badge>
        )
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-clinical-500">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clinical-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-clinical-900">Acceso Pendiente</h1>
          <p className="text-sm text-clinical-600 mt-2">
            Tu solicitud para acceder como asistente médico está en revisión
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Estado de tu Solicitud</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Verificar Estado
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestData ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-clinical-700">Estado actual:</span>
                  {getStatusBadge(requestData.status)}
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-clinical-500" />
                    <div>
                      <p className="text-sm font-medium text-clinical-900">{requestData.fullName}</p>
                      <p className="text-xs text-clinical-500">Nombre completo</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-clinical-500" />
                    <div>
                      <p className="text-sm font-medium text-clinical-900">{requestData.email}</p>
                      <p className="text-xs text-clinical-500">Correo electrónico</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-clinical-500" />
                    <div>
                      <p className="text-sm font-medium text-clinical-900">
                        Dr. {requestData.doctorName || 'Sin especificar'}
                      </p>
                      <p className="text-xs text-clinical-500">
                        Médico solicitado • Colegiado: {requestData.doctorLicenseNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-clinical-500" />
                    <div>
                      <p className="text-sm font-medium text-clinical-900">
                        {requestData.requestedAt.toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-clinical-500">Fecha de solicitud</p>
                    </div>
                  </div>

                  {requestData.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-clinical-500 mb-1">Notas:</p>
                      <p className="text-sm text-clinical-700">{requestData.notes}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="h-8 w-8 text-clinical-400 mx-auto mb-2" />
                <p className="text-sm text-clinical-600">No se encontró información de tu solicitud</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">¿Qué sigue?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-clinical-700">
              <p>
                <strong>1. Revisión del médico:</strong> El médico que especificaste revisará tu solicitud y decidirá si te otorga acceso para administrar su agenda.
              </p>
              <p>
                <strong>2. Notificación:</strong> Recibirás una notificación cuando el médico haya revisado tu solicitud.
              </p>
              <p>
                <strong>3. Acceso completo:</strong> Una vez aprobada, tendrás acceso a la gestión de pacientes y agenda del médico.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/assistant/settings')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Mi Perfil
          </Button>

          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-clinical-600"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage