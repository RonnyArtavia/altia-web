/**
 * RescheduleDialog — Reasignación de citas con confirmación
 * RF-C01.4: Drag-and-drop de citas entre slots con confirmación
 */

import { useState, useEffect, useMemo } from 'react'
import { format, addMinutes } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, Clock, Loader2, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { rescheduleAppointment } from '../services/appointmentService'
import type { AppointmentData } from '../services/appointmentService'
import type { DoctorOption } from '../hooks/useDoctors'
import type { Agenda } from '../types/agenda'

interface RescheduleDialogProps {
  open: boolean
  onClose: () => void
  appointment: AppointmentData | null
  newDate?: Date
  newTime?: string
  organizationId: string
  userId: string
  userRole: string
  onRescheduled?: () => void
  // Secretary-only props
  isSecretary?: boolean
  doctors?: DoctorOption[]
  agendas?: Agenda[]
}

export function RescheduleDialog({
  open,
  onClose,
  appointment,
  newDate: initialDate,
  newTime: initialTime,
  organizationId,
  userId,
  userRole,
  onRescheduled,
  isSecretary,
  doctors,
  agendas,
}: RescheduleDialogProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate)
  const [time, setTime] = useState(initialTime || '09:00')
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newDoctorId, setNewDoctorId] = useState<string>('')
  const [newAgendaId, setNewAgendaId] = useState<string>('')
  const [crossDoctorConfirm, setCrossDoctorConfirm] = useState(false)

  const showDoctorSelector = isSecretary && !!doctors && doctors.length > 0

  // Agendas for the selected new doctor (or original doctor if not changed)
  const doctorAgendas = useMemo(() => {
    if (!agendas || agendas.length === 0) return []
    const effectiveDoctorId = newDoctorId || appointment?.doctorId || ''
    return agendas.filter(a => a.doctorId === effectiveDoctorId && a.enabled)
  }, [agendas, newDoctorId, appointment?.doctorId])

  useEffect(() => {
    if (open) {
      setDate(initialDate)
      setTime(initialTime || (appointment ? format(appointment.start, 'HH:mm') : '09:00'))
      setNewDoctorId('')
      setNewAgendaId('')
      setCrossDoctorConfirm(false)
    }
  }, [open, initialDate, initialTime, appointment])

  // Reset agenda when doctor changes
  useEffect(() => {
    setNewAgendaId('')
  }, [newDoctorId])

  if (!appointment) return null

  const durationMin = appointment
    ? Math.round((appointment.end.getTime() - appointment.start.getTime()) / 60000)
    : 30

  const newStart = date
    ? (() => {
        const [h, m] = time.split(':').map(Number)
        const d = new Date(date)
        d.setHours(h, m, 0, 0)
        return d
      })()
    : undefined

  const newEnd = newStart ? addMinutes(newStart, durationMin) : undefined

  // RN-08: confirmación explícita al mover entre médicos
  const isMovingDoctor = !!newDoctorId && newDoctorId !== appointment?.doctorId
  const needsCrossDoctorConfirm = isMovingDoctor && !crossDoctorConfirm

  const handleConfirm = async () => {
    if (!date || !newStart || !newEnd) {
      toast.error('Selecciona la nueva fecha y hora')
      return
    }

    if (needsCrossDoctorConfirm) {
      setCrossDoctorConfirm(true)
      return
    }

    setIsSubmitting(true)
    try {
      const selectedDoctor = newDoctorId ? doctors?.find(d => d.uid === newDoctorId) : undefined
      await rescheduleAppointment(
        appointment.id,
        organizationId,
        newStart,
        newEnd,
        userId,
        userRole,
        newDoctorId || undefined,
        newAgendaId || undefined,
        selectedDoctor?.displayName
      )
      toast.success('Cita reasignada correctamente')
      onRescheduled?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al reasignar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold">Reasignar cita</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">{appointment.patientName}</p>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {/* Hora actual → nueva */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 text-sm">
            <div className="text-center">
              <p className="text-xs text-gray-400">Actual</p>
              <p className="font-semibold text-gray-700">
                {format(appointment.start, 'HH:mm')}
              </p>
              <p className="text-xs text-gray-400">
                {format(appointment.start, "dd MMM", { locale: es })}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
            <div className="text-center">
              <p className="text-xs text-gray-400">Nueva</p>
              <p className="font-semibold text-blue-600">
                {newStart ? format(newStart, 'HH:mm') : '--:--'}
              </p>
              <p className="text-xs text-gray-400">
                {date ? format(date, "dd MMM", { locale: es }) : '---'}
              </p>
            </div>
            <div className="ml-auto text-xs text-gray-400">
              {durationMin} min
            </div>
          </div>

          {/* Doctor selector (secretary only) */}
          {showDoctorSelector && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Reasignar a médico</Label>
              <Select value={newDoctorId} onValueChange={setNewDoctorId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={appointment.doctorName} />
                </SelectTrigger>
                <SelectContent>
                  {doctors!.map(d => (
                    <SelectItem key={d.uid} value={d.uid}>{d.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Agenda selector (shown when agendas exist for the doctor) */}
          {doctorAgendas.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Agenda</Label>
              <Select value={newAgendaId} onValueChange={setNewAgendaId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Mantener agenda actual" />
                </SelectTrigger>
                <SelectContent>
                  {doctorAgendas.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        {a.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Fecha */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nueva fecha</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left h-9 text-sm font-normal',
                    !date && 'text-gray-400'
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
                  {date ? format(date, "EEEE, d 'de' MMMM yyyy", { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={d => { setDate(d); setDatePickerOpen(false) }}
                  locale={es}
                  disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Hora */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Nueva hora</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Cross-doctor confirmation banner (RN-08) */}
        {crossDoctorConfirm && (
          <div className="mx-6 mb-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-sm font-semibold text-amber-800">¿Confirmar cambio de médico?</p>
            <p className="text-xs text-amber-700 mt-1">
              Esta cita se moverá de <strong>{appointment.doctorName}</strong> a{' '}
              <strong>{doctors?.find(d => d.uid === newDoctorId)?.displayName ?? newDoctorId}</strong>.
              Esta acción quedará registrada en el historial.
            </p>
          </div>
        )}

        <DialogFooter className="px-6 py-4 mt-2 border-t gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting || !date}
            className={crossDoctorConfirm ? 'bg-amber-600 hover:bg-amber-700' : ''}
          >
            {isSubmitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : crossDoctorConfirm
                ? 'Sí, cambiar médico y reasignar'
                : needsCrossDoctorConfirm
                  ? 'Continuar →'
                  : 'Confirmar reasignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
