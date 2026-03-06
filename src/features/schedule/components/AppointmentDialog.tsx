/**
 * AppointmentDialog - Outlook-style Appointment Creation Interface
 * Clean, modern design inspired by Microsoft Outlook calendar
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { format, addMinutes, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Video,
  MapPin,
  Save,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PatientSelector, type PatientSearchContext } from './PatientSelector'
import { QuickPatientForm } from './QuickPatientForm'
import { useAppointmentMutations } from '../hooks/useAppointmentMutations'
import { generateAllDayTimeSlots } from '../hooks/useScheduleSlots'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Agenda } from '../types/agenda'

// Helper function to calculate end time based on start time and duration
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)

  const endDate = addMinutes(startDate, durationMinutes)
  return format(endDate, 'HH:mm')
}

// Default appointment duration in minutes (overridden by selected agenda)
const DEFAULT_DURATION = 30

interface Patient {
  id: string
  userId?: string
  name: string
  email?: string
  cedula?: string
}

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
  specialty?: string
  organizationId: string
}

interface AppointmentDialogProps {
  open: boolean
  onClose: () => void
  doctorId: string
  organizationId: string
  date?: Date
  timeSlot?: string
  appointment?: AppointmentData | null
  appointmentRequest?: any
  agendas?: Agenda[]
}

export function AppointmentDialog({
  open,
  onClose,
  doctorId,
  organizationId,
  date,
  timeSlot,
  appointment,
  appointmentRequest,
  agendas,
}: AppointmentDialogProps) {
  // Form state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [appointmentDate, setAppointmentDate] = useState<Date>(date || new Date())
  const [startTime, setStartTime] = useState(timeSlot || '09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [appointmentType, setAppointmentType] = useState<'in-person' | 'telemedicine'>('in-person')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(timeSlot || null)
  const [showPatientSelector, setShowPatientSelector] = useState(false)

  const [selectedAgendaId, setSelectedAgendaId] = useState<string>('')

  // Dynamic duration: use agenda's defaultDuration if an agenda is selected
  const duration = useMemo(() => {
    if (selectedAgendaId && agendas) {
      const agenda = agendas.find(a => a.id === selectedAgendaId)
      if (agenda) return agenda.defaultDuration
    }
    return DEFAULT_DURATION
  }, [selectedAgendaId, agendas])

  // UI state
  const [showCalendar, setShowCalendar] = useState(false)
  const [showQuickRegister, setShowQuickRegister] = useState(false)
  const [searchContext, setSearchContext] = useState<PatientSearchContext | null>(null)

  // Ref for auto-scroll to selected time
  const slotsContainerRef = useRef<HTMLDivElement>(null)

  const { userData } = useAuthStore()
  const { createAppointment, updateAppointment } = useAppointmentMutations()

  // Doctor schedule - using default schedule
  const daySchedule = {
    start: '08:00',
    end: '18:00',
    slotDuration: 30,
    breakStart: '12:00',
    breakEnd: '13:00'
  }

  // Show all time slots with availability based on doctor's schedule
  const availableSlots = generateAllDayTimeSlots(daySchedule, 30)

  const isPending = createAppointment.isPending || updateAppointment.isPending

  // Update start time and recalculate end time when slot is selected
  useEffect(() => {
    if (selectedSlot && selectedSlot !== startTime) {
      setStartTime(selectedSlot)
      setEndTime(calculateEndTime(selectedSlot, duration))
    }
  }, [selectedSlot, duration])

  // Auto-scroll to selected time in slots panel
  useEffect(() => {
    if (selectedSlot && slotsContainerRef.current && availableSlots.length > 0) {
      const slotIndex = availableSlots.findIndex(slot => slot.time === selectedSlot)
      if (slotIndex !== -1) {
        const slotHeight = 50 // Height per slot
        const scrollPosition = slotIndex * slotHeight
        const containerHeight = slotsContainerRef.current.clientHeight

        // Center the selected slot in the view
        const centeredPosition = scrollPosition - (containerHeight / 2) + (slotHeight / 2)

        slotsContainerRef.current.scrollTo({
          top: Math.max(0, centeredPosition),
          behavior: 'smooth'
        })
      }
    }
  }, [selectedSlot, availableSlots])

  // Auto-scroll to current time on initial load
  useEffect(() => {
    if (!selectedSlot && slotsContainerRef.current && availableSlots.length > 0) {
      const now = new Date()
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${Math.floor(now.getMinutes() / 30) * 30 === 0 ? '00' : '30'}`

      const currentSlotIndex = availableSlots.findIndex(slot => slot.time === currentTime)
      if (currentSlotIndex !== -1) {
        const slotHeight = 50
        const scrollPosition = currentSlotIndex * slotHeight
        const containerHeight = slotsContainerRef.current.clientHeight
        const centeredPosition = scrollPosition - (containerHeight / 2) + (slotHeight / 2)

        slotsContainerRef.current.scrollTo({
          top: Math.max(0, centeredPosition),
          behavior: 'smooth'
        })
      }
    }
  }, [availableSlots])

  // Initialize form when editing an appointment or with prefilled data
  useEffect(() => {
    if (appointment) {
      setSelectedPatient({
        id: appointment.patientId,
        name: appointment.patientName,
      })
      setAppointmentDate(appointment.start)
      setStartTime(format(appointment.start, 'HH:mm'))
      setEndTime(format(appointment.end, 'HH:mm'))
      setSelectedSlot(format(appointment.start, 'HH:mm'))
      setAppointmentType(appointment.type)
      setReason(appointment.reason || '')
      setDescription(appointment.description || '')
      setSelectedAgendaId((appointment as any).agendaId || '')
    } else if (appointmentRequest) {
      // Initialize form with appointment request data
      setSelectedPatient({
        id: appointmentRequest.patientId || `temp-${Date.now()}`,
        name: appointmentRequest.patientName || 'Paciente',
        email: appointmentRequest.patientEmail,
        cedula: appointmentRequest.patientCedula,
      })
      setAppointmentDate(date || new Date())
      setStartTime(timeSlot || '09:00')
      setEndTime(calculateEndTime(timeSlot || '09:00', DEFAULT_DURATION))
      setSelectedSlot(timeSlot || '09:00')
      setAppointmentType('in-person')
      setReason(appointmentRequest.reason || '')
      setDescription(appointmentRequest.description || '')
      setSelectedAgendaId('')
    } else {
      // Reset form for new appointment
      setSelectedPatient(null)
      setAppointmentDate(date || new Date())
      setStartTime(timeSlot || '09:00')
      setEndTime(calculateEndTime(timeSlot || '09:00', DEFAULT_DURATION))
      setSelectedSlot(timeSlot || '09:00')
      setAppointmentType('in-person')
      setReason('')
      setDescription('')
      setSelectedAgendaId('')
    }
  }, [appointment, appointmentRequest, date, timeSlot])

  const handleSave = async () => {
    if (!selectedPatient) {
      toast.error('Por favor seleccione un paciente')
      return
    }

    const startDateTime = new Date(appointmentDate)
    const endDateTime = new Date(appointmentDate)

    // Set start time
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    startDateTime.setHours(startHours, startMinutes, 0, 0)

    // Set end time
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    endDateTime.setHours(endHours, endMinutes, 0, 0)

    const appointmentData = {
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      start: startDateTime,
      end: endDateTime,
      type: appointmentType,
      reason: reason,
      description: description,
      ...(selectedAgendaId ? { agendaId: selectedAgendaId } : {}),
    }

    try {
      if (appointment) {
        // Update existing appointment
        await updateAppointment.mutateAsync({
          appointmentId: appointment.id,
          organizationId: appointment.organizationId,
          data: appointmentData
        })
      } else {
        // Create new appointment
        await createAppointment.mutateAsync({
          ...appointmentData,
          doctorId,
          organizationId,
          status: 'scheduled'
        })
      }

      onClose()
      // Reset form
      setReason('')
      setDescription('')
      setSelectedPatient(null)
      setStartTime('09:00')
      setSelectedSlot(null)
    } catch (error) {
      console.error('Error saving appointment:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center p-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h2 className="text-lg font-medium text-gray-900">
                {appointment ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left Panel - Form */}
            <div className="flex-1 flex flex-col">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Patient Selection / Quick Register */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-700 font-medium">Paciente *</Label>
                  {showQuickRegister ? (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                      <QuickPatientForm
                        organizationId={organizationId}
                        searchContext={searchContext}
                        onPatientCreated={(patient) => {
                          setSelectedPatient(patient)
                          setShowQuickRegister(false)
                          setSearchContext(null)
                        }}
                        onCancel={() => { setShowQuickRegister(false); setSearchContext(null) }}
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-3 bg-white hover:border-blue-500 transition-colors cursor-pointer"
                         onClick={() => setShowPatientSelector(true)}>
                      {selectedPatient ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                              {selectedPatient.email && (
                                <p className="text-sm text-gray-500">{selectedPatient.email}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-blue-600 hover:text-blue-700">
                            Cambiar
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 text-gray-500">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">Seleccionar paciente</p>
                            <p className="text-sm">Click aquí para buscar y seleccionar</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date and Time */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-3">
                      <Label className="text-sm text-gray-700 font-medium">Fecha</Label>
                      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-12 border-gray-300 hover:border-blue-500"
                          >
                            <CalendarIcon className="mr-3 h-5 w-5 text-gray-500" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {format(appointmentDate, 'PPP', { locale: es })}
                              </div>
                              <div className="text-xs text-gray-500">Click para cambiar</div>
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={appointmentDate}
                            onSelect={(date) => {
                              if (date) {
                                setAppointmentDate(date)
                                setShowCalendar(false)
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm text-gray-700 font-medium">Hora</Label>
                      <Select value={startTime} onValueChange={setStartTime}>
                        <SelectTrigger className="h-12 border-gray-300 hover:border-blue-500">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-3 text-gray-500" />
                            <div className="text-left">
                              <div className="font-medium text-gray-900">
                                <SelectValue placeholder="Seleccionar hora" />
                              </div>
                              <div className="text-xs text-gray-500">Horarios disponibles</div>
                            </div>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {availableSlots.map((slot) => (
                            <SelectItem
                              key={slot.time}
                              value={slot.time}
                              className={cn(
                                !slot.available && "text-red-600 bg-red-50"
                              )}
                            >
                              {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Appointment Type */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-700 font-medium">Tipo de consulta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={appointmentType === 'in-person' ? 'default' : 'outline'}
                      className={cn(
                        "justify-start h-12 border-gray-300 hover:border-blue-500",
                        appointmentType === 'in-person' && "bg-blue-600 hover:bg-blue-700 border-blue-600"
                      )}
                      onClick={() => setAppointmentType('in-person')}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Presencial
                    </Button>
                    <Button
                      variant={appointmentType === 'telemedicine' ? 'default' : 'outline'}
                      className={cn(
                        "justify-start h-12 border-gray-300 hover:border-green-500",
                        appointmentType === 'telemedicine' && "bg-green-600 hover:bg-green-700 border-green-600"
                      )}
                      onClick={() => setAppointmentType('telemedicine')}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Teleconsulta
                    </Button>
                  </div>
                </div>

                {/* Agenda selector */}
                {agendas && agendas.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm text-gray-700 font-medium">Agenda</Label>
                    <Select value={selectedAgendaId} onValueChange={setSelectedAgendaId}>
                      <SelectTrigger className="h-10 border-gray-300">
                        <div className="flex items-center gap-2 overflow-hidden">
                          {selectedAgendaId && agendas.find(a => a.id === selectedAgendaId) && (
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: agendas.find(a => a.id === selectedAgendaId)!.color }}
                            />
                          )}
                          <SelectValue placeholder="Sin agenda asignada" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin agenda</SelectItem>
                        {agendas.map(agenda => (
                          <SelectItem key={agenda.id} value={agenda.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: agenda.color }} />
                              <span>{agenda.name}</span>
                              {agenda.location && <span className="text-xs text-gray-400 ml-1">· {agenda.location}</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedAgendaId && agendas.find(a => a.id === selectedAgendaId) && (
                      <p className="text-xs text-gray-500">
                        Duración: {agendas.find(a => a.id === selectedAgendaId)!.defaultDuration} min
                        {agendas.find(a => a.id === selectedAgendaId)!.bufferMinutes > 0 &&
                          ` + ${agendas.find(a => a.id === selectedAgendaId)!.bufferMinutes} min buffer`}
                      </p>
                    )}
                  </div>
                )}

                {/* Doctor specialty info */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-900">
                      Especialidad: {userData?.specialty || 'Medicina General'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Esta especialidad se asignará automáticamente a la cita
                  </p>
                </div>

                {/* Reason - Now optional and after type */}
                <div className="space-y-3">
                  <Label className="text-sm text-gray-700 font-medium">Motivo de la consulta (opcional)</Label>
                  <Input
                    placeholder="Ingrese el motivo de la consulta..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="border border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 h-12"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t mt-8">
                  <Button variant="outline" onClick={onClose} disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isPending || !selectedPatient}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isPending ? 'Guardando...' : appointment ? 'Actualizar Cita' : 'Agendar Cita'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Panel - Available Slots */}
            <div className="w-96 border-l bg-gray-50 flex flex-col overflow-hidden">
              <div className="p-4 flex-shrink-0">
                <div className="text-center text-sm text-gray-600 mb-3">
                  {format(appointmentDate, 'EEEE, d MMMM yyyy', { locale: es })}
                </div>
              </div>

              {/* Available slots with same format as agenda */}
              <div ref={slotsContainerRef} className="flex flex-1 overflow-y-auto">
                {/* Time labels */}
                <div className="w-20 flex-shrink-0 border-r bg-white">
                  {availableSlots.map((slot, index) => {
                    const [hour, minute] = slot.time.split(':').map(Number)
                    const showHourLabel = minute === 0
                    const showMinuteLabel = minute === 30

                    // Check if the NEXT slot starts a new hour (for bottom border)
                    const nextSlotIndex = index + 1
                    const isLastSlot = nextSlotIndex >= availableSlots.length
                    let nextSlotStartsNewHour = false

                    if (!isLastSlot) {
                      const [nextHour, nextMinute] = availableSlots[nextSlotIndex].time.split(':').map(Number)
                      nextSlotStartsNewHour = nextMinute === 0
                    }

                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "relative border-b bg-white",
                          nextSlotStartsNewHour || isLastSlot ? "border-gray-300 border-solid" : "border-gray-200 border-dashed"
                        )}
                        style={{ height: '50px' }}
                      >
                        {showHourLabel && (
                          <div
                            className="absolute top-0 w-full text-center"
                            style={{
                              color: 'var(--neutralPrimaryAlt)',
                              fontSize: '10px',
                              fontWeight: 400,
                              marginTop: '2px'
                            }}
                          >
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                        )}
                        {showMinuteLabel && (
                          <div
                            className="absolute top-0 w-full text-center"
                            style={{
                              color: 'var(--neutralPrimaryAlt)',
                              fontSize: '8px',
                              fontWeight: 300,
                              marginTop: '2px'
                            }}
                          >
                            {hour === 0 ? `12:${minute.toString().padStart(2, '0')} AM` :
                             hour < 12 ? `${hour}:${minute.toString().padStart(2, '0')} AM` :
                             hour === 12 ? `12:${minute.toString().padStart(2, '0')} PM` :
                             `${hour - 12}:${minute.toString().padStart(2, '0')} PM`}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Slots */}
                <div className="flex-1 relative">
                  {availableSlots.map((slot, index) => {
                    const [hour, minute] = slot.time.split(':').map(Number)
                    const isSelected = selectedSlot === slot.time
                    const isAvailable = slot.available

                    // Check if the NEXT slot starts a new hour (for bottom border)
                    const nextSlotIndex = index + 1
                    const isLastSlot = nextSlotIndex >= availableSlots.length
                    let nextSlotStartsNewHour = false

                    if (!isLastSlot) {
                      const [nextHour, nextMinute] = availableSlots[nextSlotIndex].time.split(':').map(Number)
                      nextSlotStartsNewHour = nextMinute === 0
                    }

                    return (
                      <div
                        key={slot.time}
                        className={cn(
                          "border-b relative cursor-pointer transition-colors",
                          // Border styling - darker borders for disabled slots
                          nextSlotStartsNewHour || isLastSlot ? "border-gray-300 border-solid" :
                          !isAvailable ? "border-gray-400 border-dashed" : "border-gray-200 border-dashed",
                          !isAvailable && "bg-gray-100", // Out-of-schedule slots are light gray
                          isAvailable && "bg-white hover:bg-blue-50/30",
                          !isAvailable && "hover:bg-red-50/30", // Out-of-schedule hover is light red
                          isSelected && isAvailable && "bg-green-100",
                          isSelected && !isAvailable && "bg-red-100" // Out-of-schedule selected is light red
                        )}
                        style={{ height: '50px' }}
                        onClick={() => {
                          setSelectedSlot(slot.time)
                          setStartTime(slot.time)
                        }}
                      >
                        {isSelected && isAvailable && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
                              Seleccionado
                            </div>
                          </div>
                        )}
                        {isSelected && !isAvailable && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                              Seleccionado
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patient Selector Modal */}
      <PatientSelector
        open={showPatientSelector}
        onClose={() => setShowPatientSelector(false)}
        onSelect={(patient) => {
          setSelectedPatient(patient)
          setShowPatientSelector(false)
        }}
        organizationId={organizationId}
        onNoResults={(ctx) => {
          setSearchContext(ctx)
          setShowPatientSelector(false)
          setShowQuickRegister(true)
        }}
      />
    </>
  )
}