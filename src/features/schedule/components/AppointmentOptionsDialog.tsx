/**
 * AppointmentOptionsDialog - Opciones de cita con cambio de estado por rol
 * RF-A04: Transiciones con reglas estrictas + auditoría
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Edit, X, Video, MapPin, Stethoscope,
  ArrowRight, Loader2, FileText, AlertTriangle,
} from 'lucide-react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getAllowedTransitions, STATUS_CONFIG } from '../utils/appointmentTransitions'
import { changeAppointmentStatus } from '../services/appointmentService'

interface AppointmentData {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  start: Date
  end: Date
  type: 'in-person' | 'telemedicine'
  status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  reason?: string
  description?: string
  organizationId: string
  waitingAt?: Date
}

interface AppointmentOptionsDialogProps {
  appointment: AppointmentData | null
  open: boolean
  onClose: () => void
  onEdit: (appointment: AppointmentData) => void
  onStatusChanged?: () => void
}

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  scheduled:   { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  waiting:     { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700' },
  'in-progress': { dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  completed:   { dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-600' },
  cancelled:   { dot: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-600' },
}

const TRANSITION_STYLES: Record<string, { bg: string; hover: string; text: string; border: string }> = {
  waiting:      { bg: 'bg-amber-50',  hover: 'hover:bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  scheduled:    { bg: 'bg-blue-50',   hover: 'hover:bg-blue-100',  text: 'text-blue-800',  border: 'border-blue-200' },
  'in-progress':{ bg: 'bg-green-50',  hover: 'hover:bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  completed:    { bg: 'bg-gray-50',   hover: 'hover:bg-gray-100',  text: 'text-gray-700',  border: 'border-gray-200' },
}

export function AppointmentOptionsDialog({
  appointment,
  open,
  onClose,
  onEdit,
  onStatusChanged,
}: AppointmentOptionsDialogProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { user, userData } = useAuthStore()

  const isDoctor = userData?.role === 'doctor'
  const userRole = userData?.role === 'doctor' ? 'doctor' : 'secretary'
  const userId = userData?.uid || user?.uid || ''

  if (!appointment) return null

  const now = new Date()
  const isPast = new Date(appointment.end) <= now
  const statusStyle = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.scheduled

  const allowedTransitions = getAllowedTransitions(appointment.status, userRole)
    .filter(s => s !== 'cancelled')

  const canEdit = !isPast && (appointment.status === 'scheduled' || appointment.status === 'waiting')
  const canCancel = !isPast && (appointment.status === 'scheduled' || appointment.status === 'waiting')
  const canStartConsultation = isDoctor && !isPast &&
    (appointment.status === 'waiting' || appointment.status === 'in-progress')

  const handleStatusChange = async (newStatus: AppointmentData['status']) => {
    if (!userId) return
    setIsSubmitting(true)
    try {
      await changeAppointmentStatus(appointment.id, appointment.organizationId, newStatus, userId, userRole)
      toast.success(`Estado → ${STATUS_CONFIG[newStatus]?.label}`)
      onStatusChanged?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al cambiar estado')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!userId) return
    setIsSubmitting(true)
    try {
      await changeAppointmentStatus(appointment.id, appointment.organizationId, 'cancelled', userId, userRole)
      toast.success('Cita cancelada')
      setShowCancelConfirm(false)
      setCancelReason('')
      onStatusChanged?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al cancelar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setShowCancelConfirm(false)
    setCancelReason('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden rounded-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{appointment.patientName}</DialogTitle>

        {/* ── Header: paciente + estado ── */}
        <div className="px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight pr-8">
              {appointment.patientName}
            </h2>
            {/* Status pill */}
            <span className={cn(
              'inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
              statusStyle.bg, statusStyle.text
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', statusStyle.dot)} />
              {STATUS_CONFIG[appointment.status]?.label ?? appointment.status}
            </span>
          </div>

          {/* Detalles */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {format(appointment.start, 'h:mm a')} – {format(appointment.end, 'h:mm a')}
                <span className="mx-1 text-gray-300">·</span>
                <span className="capitalize">{format(appointment.start, "EEE d 'de' MMMM", { locale: es })}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {appointment.type === 'telemedicine'
                ? <Video className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                : <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />}
              <span>{appointment.type === 'telemedicine' ? 'Telemedicina' : 'Consulta Presencial'}</span>
            </div>
            {appointment.reason && (
              <div className="flex items-start gap-2 text-sm text-gray-500">
                <FileText className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{appointment.reason}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Acciones principales ── */}
        <div className="px-4 py-3 space-y-2">

          {/* Iniciar consulta (doctor) */}
          {canStartConsultation && (
            <button
              onClick={() => {
                const prefix = isDoctor ? '/doctor' : '/assistant'
                navigate(`${prefix}/consultation?patientId=${appointment.patientId}&appointmentId=${appointment.id}`)
                onClose()
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <span>Iniciar consulta</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-80" />
            </button>
          )}

          {/* Transiciones de estado por rol */}
          {allowedTransitions.map(status => {
            const ts = TRANSITION_STYLES[status]
            return (
              <button
                key={status}
                disabled={isSubmitting}
                onClick={() => handleStatusChange(status as AppointmentData['status'])}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50',
                  ts?.bg, ts?.hover, ts?.text, ts?.border
                )}
              >
                <span>Marcar como {STATUS_CONFIG[status]?.label}</span>
                {isSubmitting
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ArrowRight className="h-4 w-4" />}
              </button>
            )
          })}

          {/* Editar */}
          {canEdit && (
            <button
              onClick={() => { onEdit(appointment); onClose() }}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
            >
              <Edit className="h-4 w-4 text-gray-400" />
              <span>Editar cita</span>
            </button>
          )}

          {/* Sin acciones disponibles */}
          {!canStartConsultation && allowedTransitions.length === 0 && !canEdit && !canCancel && (
            <p className="text-center text-sm text-gray-400 py-2">
              No hay acciones disponibles para esta cita
            </p>
          )}
        </div>

        {/* ── Cancelar cita (acción destructiva) ── */}
        {canCancel && (
          <>
            <Separator />
            <div className="px-4 py-3">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:text-red-600 hover:bg-red-50 font-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                  Cancelar cita
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>¿Confirmar cancelación? Esta acción no se puede deshacer.</span>
                  </div>
                  <Textarea
                    placeholder="Motivo (opcional)"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { setShowCancelConfirm(false); setCancelReason('') }}
                      disabled={isSubmitting}
                    >
                      Mantener
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : 'Confirmar'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
