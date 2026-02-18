/**
 * AppointmentOptionsDialog - Options dialog for existing appointments
 * Shows options to edit, cancel, or view appointment details
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Edit, X, Video, MapPin, Stethoscope, User } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AppointmentData {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  start: Date
  end: Date
  type: 'in-person' | 'telemedicine'
  status: 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'no-show'
  reason?: string
  description?: string
  organizationId: string
}

interface AppointmentOptionsDialogProps {
  appointment: AppointmentData | null
  open: boolean
  onClose: () => void
  onEdit: (appointment: AppointmentData) => void
}

export function AppointmentOptionsDialog({
  appointment,
  open,
  onClose,
  onEdit
}: AppointmentOptionsDialogProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { userData } = useAuthStore()

  // Check if user is a doctor
  const isDoctor = userData?.role === 'doctor'

  const handleStartConsultation = () => {
    if (!appointment) return

    // Navigate to medical notes page with correct role prefix
    const rolePrefix = userData?.role === 'doctor' ? '/doctor' : '/assistant'
    navigate(`${rolePrefix}/consulta/${appointment.id}/${appointment.patientId}`)
    onClose()
  }

  const handleCancel = async () => {
    if (!appointment) return

    setIsSubmitting(true)
    try {
      // TODO: Implement actual appointment cancellation
      console.log('Cancelling appointment:', {
        appointmentId: appointment.id,
        reason: cancelReason || 'Cancelada por el usuario'
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success('Cita cancelada exitosamente')
      setShowCancelDialog(false)
      onClose()
      setCancelReason('')
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast.error('Error al cancelar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendiente</Badge>
      case 'booked':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">Confirmada</Badge>
      case 'arrived':
        return <Badge variant="outline" className="text-green-600 border-green-300">Llegó</Badge>
      case 'fulfilled':
        return <Badge variant="outline" className="text-green-700 border-green-400">Completada</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-300">Cancelada</Badge>
      case 'no-show':
        return <Badge variant="outline" className="text-gray-600 border-gray-300">Ausente</Badge>
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  // Check if appointment is in the past (including current time)
  const now = new Date()
  const isPastAppointment = appointment ? new Date(appointment.end) <= now : false

  const canEdit = appointment && !isPastAppointment && (appointment.status === 'pending' || appointment.status === 'booked')
  const canCancel = appointment && !isPastAppointment && (appointment.status === 'pending' || appointment.status === 'booked')
  // Show "Iniciar Consulta Médica" for appointments that are confirmed or can be started
  // Only show for doctors
  const canStartConsultation = isDoctor && appointment && !isPastAppointment &&
    (appointment.status === 'booked' || appointment.status === 'arrived' || appointment.status === 'pending')

  if (!appointment) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              Opciones de Cita
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Appointment Details */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{appointment.patientName}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                    <User className="h-3.5 w-3.5" />
                    <span>Paciente Registrado</span>
                  </div>
                </div>
                {getStatusBadge(appointment.status)}
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                <div className="bg-white p-2 rounded-md shadow-sm text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Horario</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {format(appointment.start, 'h:mm a')} - {format(appointment.end, 'h:mm a')}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {format(appointment.start, "EEEE, d 'de' MMMM", { locale: es })}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 px-1">
                <div className="flex items-center gap-2.5">
                  {appointment.type === 'telemedicine' ? (
                    <><div className="p-1 bg-indigo-50 rounded text-indigo-600"><Video className="h-3.5 w-3.5" /></div><span className="font-medium text-gray-700">Telemedicina</span></>
                  ) : (
                    <><div className="p-1 bg-emerald-50 rounded text-emerald-600"><MapPin className="h-3.5 w-3.5" /></div><span className="font-medium text-gray-700">Consulta Presencial</span></>
                  )}
                </div>

                {appointment.reason && (
                  <div className="pt-2 mt-2 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Motivo</span>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-2 rounded-md">{appointment.reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {canStartConsultation && (
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-100 transition duration-200"></div>
                  <Button
                    className="relative w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold rounded-xl"
                    onClick={handleStartConsultation}
                  >
                    <Stethoscope className="h-5 w-5 mr-2" />
                    Iniciar Consulta Médica
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                  onClick={() => {
                    onEdit(appointment)
                    onClose()
                  }}
                  disabled={!canEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {canEdit ? 'Editar' : 'No editable'}
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-11 border-gray-200",
                    canCancel
                      ? "hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700"
                      : "text-gray-400"
                  )}
                  onClick={() => setShowCancelDialog(true)}
                  disabled={!canCancel}
                >
                  <X className="h-4 w-4 mr-2" />
                  {canCancel ? 'Cancelar' : 'No cancelable'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Cancelar Cita
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600">
              ¿Estás seguro de que quieres cancelar la cita con <strong>{appointment.patientName}</strong>?
              Esta acción no se puede deshacer.
            </p>

            <div className="space-y-3">
              <Label htmlFor="cancel-reason">Motivo de cancelación (opcional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Ingresa el motivo de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isSubmitting}
            >
              No, mantener cita
            </Button>
            <Button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? 'Cancelando...' : 'Sí, cancelar cita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}