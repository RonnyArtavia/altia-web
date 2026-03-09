import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { assistantRequestService } from '@/services/assistantRequestService'
import { assistantSyncService } from '@/services/assistantSyncService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Eye,
  Mail,
  Calendar,
  MoreVertical,
  Trash2,
  UserMinus
} from 'lucide-react'
import type { AssistantRequest } from '@/services/assistantRequestService'
import type { UserData } from '@/types'

interface ApprovalDialogProps {
  request: AssistantRequest
  action: 'approve' | 'reject' | 'suspend'
  onConfirm: (notes: string) => void
  onCancel: () => void
  isLoading: boolean
}

function ApprovalDialog({ request, action, onConfirm, onCancel, isLoading }: ApprovalDialogProps) {
  const [notes, setNotes] = useState('')

  const getActionConfig = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Aprobar Asistente',
          description: 'El asistente tendrá acceso completo a la gestión de pacientes y agenda.',
          buttonText: 'Aprobar',
          buttonClass: 'bg-green-600 hover:bg-green-700',
          icon: <CheckCircle2 className="h-5 w-5" />
        }
      case 'reject':
        return {
          title: 'Rechazar Solicitud',
          description: 'La solicitud será rechazada permanentemente.',
          buttonText: 'Rechazar',
          buttonClass: 'bg-red-600 hover:bg-red-700',
          icon: <XCircle className="h-5 w-5" />
        }
      case 'suspend':
        return {
          title: 'Suspender Asistente',
          description: 'El acceso del asistente será temporalmente suspendido.',
          buttonText: 'Suspender',
          buttonClass: 'bg-orange-600 hover:bg-orange-700',
          icon: <UserMinus className="h-5 w-5" />
        }
    }
  }

  const config = getActionConfig()

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {config.icon}
          {config.title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="p-3 bg-clinical-50 rounded-lg">
          <p className="text-sm font-medium text-clinical-900">{request.fullName}</p>
          <p className="text-xs text-clinical-500">{request.email}</p>
        </div>
        <p className="text-sm text-clinical-700">{config.description}</p>
        <div>
          <label className="text-sm font-medium text-clinical-700">
            Notas {action === 'reject' ? '(requeridas)' : '(opcionales)'}:
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Razón para ${action === 'approve' ? 'aprobar' : action === 'reject' ? 'rechazar' : 'suspender'}...`}
            rows={3}
            className="mt-1"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => onConfirm(notes)}
            disabled={isLoading || (action === 'reject' && !notes.trim())}
            className={`flex items-center gap-2 ${config.buttonClass}`}
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : config.icon}
            {config.buttonText}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        </div>
      </div>
    </DialogContent>
  )
}

export function SecretaryManagementPage() {
  const navigate = useNavigate()
  const { userData, user } = useAuthStore()
  const [pendingRequests, setPendingRequests] = useState<AssistantRequest[]>([])
  const [activeAssistants, setActiveAssistants] = useState<UserData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AssistantRequest | null>(null)
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | 'suspend' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadData = async () => {
    if (!user?.uid || !userData?.organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('Loading assistant requests...')
      // Cargar solicitudes pendientes
      try {
        const requests = await assistantRequestService.getPendingRequests()
        console.log('Loaded requests:', requests)
        // Filtrar solo las solicitudes para este médico
        const myRequests = requests.filter(req => req.doctorId === user.uid)
        console.log('My requests:', myRequests)
        setPendingRequests(myRequests)
      } catch (requestError) {
        console.warn('Error loading assistant requests (collection might not exist yet):', requestError)
        setPendingRequests([])
      }

      console.log('Loading active assistants...')
      // Cargar asistentes activos - usar filtrado en memoria para evitar índices compuestos
      try {
        const assistantsRef = collection(firestore, 'users')
        const assistantsQuery = query(
          assistantsRef,
          where('role', '==', 'secretary')
        )
        console.log('Executing assistants query...')
        const assistantsSnap = await getDocs(assistantsQuery)
        console.log('Assistants query result:', assistantsSnap.size, 'documents')
        const assistants: UserData[] = []

        assistantsSnap.forEach(doc => {
          const data = doc.data()
          console.log('Assistant data:', doc.id, data)

          // Filtrar en memoria para evitar necesidad de índices compuestos
          if (data.doctorId === user.uid && data.assistantStatus === 'approved') {
            assistants.push({
              ...data,
              uid: doc.id,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate(),
              authorizedAt: data.authorizedAt?.toDate()
            } as UserData)
          }
        })

        console.log('Final assistants:', assistants)
        setActiveAssistants(assistants)
      } catch (assistantError) {
        console.warn('Error loading assistants:', assistantError)
        setActiveAssistants([])
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      console.error('Error details:', error.message, error.code, error.stack)
      setError(`Error al cargar los datos: ${error.message || error}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproval = async (request: AssistantRequest, action: 'approve' | 'reject', notes: string) => {
    if (!user?.uid || !userData?.organizationId) return

    setIsProcessing(true)
    setError(null)

    try {
      if (action === 'approve') {
        // Usar el servicio de sincronización para aprobar
        await assistantSyncService.approveAssistant(
          request.userId,
          request.id,
          user.uid,
          userData.organizationId,
          notes
        )
        setSuccessMessage(`Asistente ${request.fullName} aprobado exitosamente`)
      } else {
        // Usar el servicio de sincronización para rechazar
        await assistantSyncService.rejectAssistant(
          request.userId,
          request.id,
          user.uid,
          notes
        )
        setSuccessMessage(`Solicitud de ${request.fullName} rechazada`)
      }

      // Recargar datos
      await loadData()

      // Limpiar estados
      setSelectedRequest(null)
      setDialogAction(null)

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error)
      setError(`Error al ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSuspendAssistant = async (assistant: UserData, notes: string) => {
    if (!user?.uid) return

    setIsProcessing(true)
    setError(null)

    try {
      // Usar el servicio de sincronización para suspender
      await assistantSyncService.suspendAssistant(
        assistant.uid,
        user.uid,
        notes
      )

      setSuccessMessage(`Asistente ${assistant.name} suspendido`)

      // Recargar datos
      await loadData()

      // Limpiar estados
      setSelectedRequest(null)
      setDialogAction(null)

      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error: any) {
      console.error('Error suspending assistant:', error)
      setError('Error al suspender el asistente')
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.uid, userData?.organizationId])

  const openDialog = (request: AssistantRequest | UserData, action: 'approve' | 'reject' | 'suspend') => {
    setSelectedRequest(request as AssistantRequest)
    setDialogAction(action)
  }

  const closeDialog = () => {
    setSelectedRequest(null)
    setDialogAction(null)
  }

  const handleDialogConfirm = async (notes: string) => {
    if (!selectedRequest || !dialogAction) return

    if (dialogAction === 'suspend') {
      await handleSuspendAssistant(selectedRequest as any, notes)
    } else {
      await handleApproval(selectedRequest, dialogAction, notes)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/doctor/settings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Configuración
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Gestión de Asistentes</h1>
        <p className="text-sm text-clinical-500">
          Administra las solicitudes y permisos de asistentes médicos
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Solicitudes Pendientes */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Solicitudes Pendientes
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-6">
              <UserPlus className="h-8 w-8 text-clinical-400 mx-auto mb-2" />
              <p className="text-sm text-clinical-600">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg bg-clinical-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-clinical-900">{request.fullName}</h4>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-clinical-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {request.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Solicitado el {request.requestedAt.toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openDialog(request, 'approve')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={isProcessing}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDialog(request, 'reject')}
                        disabled={isProcessing}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asistentes Activos */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Asistentes Activos
            {activeAssistants.length > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {activeAssistants.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeAssistants.length === 0 ? (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-clinical-400 mx-auto mb-2" />
              <p className="text-sm text-clinical-600">No hay asistentes activos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAssistants.map((assistant) => (
                <div key={assistant.uid} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-clinical-900">{assistant.name}</h4>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-clinical-600">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {assistant.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Aprobado el {assistant.authorizedAt?.toLocaleDateString('es-ES') || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(assistant as any, 'suspend')}
                        disabled={isProcessing}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={!!selectedRequest && !!dialogAction} onOpenChange={closeDialog}>
        {selectedRequest && dialogAction && (
          <ApprovalDialog
            request={selectedRequest}
            action={dialogAction}
            onConfirm={handleDialogConfirm}
            onCancel={closeDialog}
            isLoading={isProcessing}
          />
        )}
      </Dialog>
    </div>
  )
}

export default SecretaryManagementPage