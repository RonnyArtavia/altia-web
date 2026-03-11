/**
 * AppointmentOptionsDialog - Opciones de cita con cambio de estado por rol
 * RF-A04: Transiciones con reglas estrictas + auditoría
 * Mejorado: muestra datos del paciente (edad, teléfono, correo) y permite
 * al médico cambiar el estado de la cita igual que la secretaria.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Edit, X, Video, MapPin, Stethoscope,
  ArrowRight, Loader2, FileText, AlertTriangle,
  Phone, Mail, CalendarDays, User,
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
import { getPatientById } from '@/features/patients/services/patientService'
import type { Patient } from '@/features/patients/types/patient'

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

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string; ring: string }> = {
  scheduled:     { dot: 'bg-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',  ring: 'ring-blue-500/20' },
  waiting:       { dot: 'bg-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700', ring: 'ring-amber-500/20' },
  'in-progress': { dot: 'bg-green-500',  bg: 'bg-green-50',  text: 'text-green-700', ring: 'ring-green-500/20' },
  completed:     { dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-600',  ring: 'ring-gray-400/20' },
  cancelled:     { dot: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-600',   ring: 'ring-red-400/20' },
}

const TRANSITION_STYLES: Record<string, { icon: string; bg: string; hover: string; text: string; border: string }> = {
  waiting:       { icon: '⏳', bg: 'bg-amber-50',  hover: 'hover:bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  scheduled:     { icon: '📅', bg: 'bg-blue-50',   hover: 'hover:bg-blue-100',  text: 'text-blue-800',  border: 'border-blue-200' },
  'in-progress': { icon: '▶️', bg: 'bg-green-50',  hover: 'hover:bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  completed:     { icon: '✅', bg: 'bg-gray-50',   hover: 'hover:bg-gray-100',  text: 'text-gray-700',  border: 'border-gray-200' },
}

function calculateAge(birthDate: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
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
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loadingPatient, setLoadingPatient] = useState(false)
  const navigate = useNavigate()
  const { user, userData } = useAuthStore()

  const isDoctor = userData?.role === 'doctor'
  const userRole = userData?.role === 'doctor' ? 'doctor' : 'secretary'
  const userId = userData?.uid || user?.uid || ''

  // Fetch patient details when dialog opens
  useEffect(() => {
    if (!open || !appointment?.patientId || !appointment?.organizationId) {
      setPatient(null)
      return
    }
    let cancelled = false
    setLoadingPatient(true)
    getPatientById(appointment.patientId, appointment.organizationId)
      .then(p => { if (!cancelled) setPatient(p) })
      .catch(() => { if (!cancelled) setPatient(null) })
      .finally(() => { if (!cancelled) setLoadingPatient(false) })
    return () => { cancelled = true }
  }, [open, appointment?.patientId, appointment?.organizationId])

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

  const patientAge = patient?.age ?? (patient?.birthDate ? calculateAge(patient.birthDate) : null)

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
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{appointment.patientName}</DialogTitle>

        {/* ── Header con gradiente ── */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5 text-white">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg ring-2 ring-white/20">
              {getInitials(appointment.patientName)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold leading-tight truncate pr-6">
                {appointment.patientName}
              </h2>
              {/* Status pill */}
              <span className={cn(
                'inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ring-1',
                statusStyle.bg, statusStyle.text, statusStyle.ring
              )}>
                <span className={cn('w-2 h-2 rounded-full animate-pulse', statusStyle.dot)} />
                {STATUS_CONFIG[appointment.status]?.label ?? appointment.status}
              </span>
            </div>
          </div>
        </div>

        {/* ── Datos del paciente ── */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Datos del paciente</p>
          {loadingPatient ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">Cargando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {patientAge !== null && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100">
                    <CalendarDays className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 leading-none">Edad</p>
                    <p className="text-sm font-medium text-slate-700">{patientAge} años</p>
                  </div>
                </div>
              )}
              {patient?.gender && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-pink-100">
                    <User className="h-3.5 w-3.5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 leading-none">Género</p>
                    <p className="text-sm font-medium text-slate-700">
                      {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Femenino' : 'Otro'}
                    </p>
                  </div>
                </div>
              )}
              {patient?.phone && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100">
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 leading-none">Teléfono</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{patient.phone}</p>
                  </div>
                </div>
              )}
              {patient?.email && (
                <div className="flex items-center gap-2 col-span-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100">
                    <Mail className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 leading-none">Correo</p>
                    <p className="text-sm font-medium text-slate-700 truncate">{patient.email}</p>
                  </div>
                </div>
              )}
              {!patient && !loadingPatient && (
                <p className="text-sm text-slate-400 col-span-2 italic">No se encontraron datos adicionales</p>
              )}
            </div>
          )}
        </div>

        {/* ── Detalles de la cita ── */}
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Detalles de la cita</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100">
                <Clock className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <div>
                <span className="font-medium">{format(appointment.start, 'h:mm a')} – {format(appointment.end, 'h:mm a')}</span>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="capitalize text-slate-500">{format(appointment.start, "EEE d 'de' MMMM", { locale: es })}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <div className={cn(
                'flex items-center justify-center w-7 h-7 rounded-lg',
                appointment.type === 'telemedicine' ? 'bg-indigo-100' : 'bg-emerald-100'
              )}>
                {appointment.type === 'telemedicine'
                  ? <Video className="h-3.5 w-3.5 text-indigo-600" />
                  : <MapPin className="h-3.5 w-3.5 text-emerald-600" />}
              </div>
              <span className="font-medium">{appointment.type === 'telemedicine' ? 'Telemedicina' : 'Consulta Presencial'}</span>
            </div>
            {appointment.reason && (
              <div className="flex items-start gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <span className="line-clamp-2">{appointment.reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Cambiar estado ── */}
        {allowedTransitions.length > 0 && (
          <div className="px-6 py-4 border-b border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Cambiar estado</p>
            <div className="grid grid-cols-1 gap-2">
              {allowedTransitions.map(status => {
                const ts = TRANSITION_STYLES[status]
                return (
                  <button
                    key={status}
                    disabled={isSubmitting}
                    onClick={() => handleStatusChange(status as AppointmentData['status'])}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all disabled:opacity-50',
                      ts?.bg, ts?.hover, ts?.text, ts?.border,
                      'hover:shadow-sm active:scale-[0.98]'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">{ts?.icon}</span>
                      <span>{STATUS_CONFIG[status]?.label}</span>
                    </span>
                    {isSubmitting
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <ArrowRight className="h-4 w-4 opacity-60" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Acciones principales ── */}
        <div className="px-6 py-4 space-y-2">

          {/* Iniciar consulta (doctor) */}
          {canStartConsultation && (
            <button
              onClick={() => {
                const prefix = isDoctor ? '/doctor' : '/assistant'
                navigate(`${prefix}/consultation?patientId=${appointment.patientId}&appointmentId=${appointment.id}`)
                onClose()
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="h-4 w-4" />
                <span>Iniciar consulta</span>
              </div>
              <ArrowRight className="h-4 w-4 opacity-80" />
            </button>
          )}

          {/* Editar */}
          {canEdit && (
            <button
              onClick={() => { onEdit(appointment); onClose() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 font-medium transition-all hover:shadow-sm active:scale-[0.98]"
            >
              <Edit className="h-4 w-4 text-slate-400" />
              <span>Editar cita</span>
            </button>
          )}

          {/* Cancelar cita */}
          {canCancel && (
            <>
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:text-red-600 hover:bg-red-50 font-medium transition-all border border-transparent hover:border-red-100"
                >
                  <X className="h-4 w-4" />
                  Cancelar cita
                </button>
              ) : (
                <div className="space-y-3 bg-red-50/50 rounded-xl p-4 border border-red-100">
                  <div className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="font-medium">¿Confirmar cancelación? Esta acción no se puede deshacer.</span>
                  </div>
                  <Textarea
                    placeholder="Motivo de cancelación (opcional)"
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                    className="text-sm resize-none bg-white border-red-200 focus:border-red-300"
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
                        : 'Confirmar cancelación'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sin acciones disponibles */}
          {!canStartConsultation && allowedTransitions.length === 0 && !canEdit && !canCancel && (
            <p className="text-center text-sm text-slate-400 py-3">
              No hay acciones disponibles para esta cita
            </p>
          )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
