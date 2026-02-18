import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  MapPin,
  User,
  Settings,
  Filter,
  RefreshCcw,
  Search,
  MoreHorizontal
} from 'lucide-react'
import { format, addDays, subDays, startOfDay, startOfWeek, endOfWeek, isToday, isSameDay, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useAppointments } from '../hooks/useAppointments'
import { useScheduleForDay, useWeekTimeSlots, generateTimeSlotsFromConfig, generateAllDayTimeSlots, getDayScheduleFromWeek, useDoctor } from '../hooks/useScheduleSlots'
import { AppointmentDialog } from '../components/AppointmentDialog'
import { AppointmentOptionsDialog } from '../components/AppointmentOptionsDialog'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-warning/10 text-warning-700' },
  booked: { label: 'Confirmada', color: 'bg-primary/10 text-primary-700' },
  arrived: { label: 'En espera', color: 'bg-accent/10 text-accent-700' },
  fulfilled: { label: 'Completada', color: 'bg-success/10 text-success-700' },
  cancelled: { label: 'Cancelada', color: 'bg-danger/10 text-danger-700' },
  'no-show': { label: 'No asistió', color: 'bg-clinical-100 text-clinical-600' },
}

type ViewMode = 'day' | 'week' | 'month'

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

export default function AgendaPage() {
  const navigate = useNavigate()
  const { user, userData } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null)

  // Assignment mode detection and data extraction
  const assignmentMode = searchParams.get('mode') === 'assign'
  const assignmentData = useMemo(() => {
    if (!assignmentMode) return null

    return {
      requestId: searchParams.get('requestId'),
      patientName: searchParams.get('patientName'),
      patientEmail: searchParams.get('patientEmail'),
      patientPhone: searchParams.get('patientPhone'),
      patientId: searchParams.get('patientId'),
      patientAge: searchParams.get('patientAge'),
      reason: searchParams.get('reason'),
      notes: searchParams.get('notes'),
      preferredDate: searchParams.get('preferredDate'),
      preferredTime: searchParams.get('preferredTime')
    }
  }, [searchParams, assignmentMode])

  // Create prefilled patient data for assignment mode
  const prefilledPatient = useMemo(() => {
    if (!assignmentMode || !assignmentData) return undefined

    return {
      name: assignmentData.patientName || '',
      email: assignmentData.patientEmail || '',
      phone: assignmentData.patientPhone || '',
      cedula: assignmentData.patientId || '',
      reason: assignmentData.reason || '',
      notes: assignmentData.notes || ''
    }
  }, [assignmentMode, assignmentData])

  // States for appointment options and editing
  const [showAppointmentOptions, setShowAppointmentOptions] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentData | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<AppointmentData | null>(null)

  // States for filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showCancelledAppointments, setShowCancelledAppointments] = useState(false)

  const agendaRef = useRef<HTMLDivElement>(null)

  // Determine if user is secretary/assistant
  const isSecretary = userData?.role === 'secretary'
  const doctorId = isSecretary ? userData?.doctorId : user?.uid
  const organizationId = userData?.organizationId

  // Helper function to calculate current time position in the schedule
  const getCurrentTimePosition = (timeSlots: string[], slotDuration: number, slotHeight: number): number => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    // Find the first time slot
    if (timeSlots.length === 0) return 0

    const [firstHour, firstMinute] = timeSlots[0].split(':').map(Number)
    const firstTimeInMinutes = firstHour * 60 + firstMinute

    // Calculate position relative to first time slot
    const minutesFromStart = currentTimeInMinutes - firstTimeInMinutes
    const slotsFromStart = minutesFromStart / slotDuration

    return slotsFromStart * slotHeight
  }

  // Helper function to get appointment position within the schedule
  const getAppointmentPosition = (
    startTime: Date,
    endTime: Date,
    timeSlots: string[],
    slotDuration: number,
    slotHeight: number
  ): { top: number; height: number } | null => {
    if (timeSlots.length === 0) return null

    const startHour = startTime.getHours()
    const startMinute = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinute = endTime.getMinutes()

    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute

    // Find the first time slot
    const [firstHour, firstMinute] = timeSlots[0].split(':').map(Number)
    const firstTimeInMinutes = firstHour * 60 + firstMinute

    // Calculate position relative to first time slot
    const startMinutesFromBegin = startTimeInMinutes - firstTimeInMinutes
    const endMinutesFromBegin = endTimeInMinutes - firstTimeInMinutes

    const startSlotsFromBegin = startMinutesFromBegin / slotDuration
    const endSlotsFromBegin = endMinutesFromBegin / slotDuration

    const top = startSlotsFromBegin * slotHeight
    const height = (endSlotsFromBegin - startSlotsFromBegin) * slotHeight

    return {
      top: Math.max(0, top),
      height: Math.max(slotHeight * 0.5, height) // Minimum height for visibility
    }
  }

  // Calculate date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    const now = selectedDate
    switch (viewMode) {
      case 'day':
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        return { startDate: dayStart, endDate: dayEnd }
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return { startDate: weekStart, endDate: weekEnd }
      case 'month':
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        return { startDate: monthStart, endDate: monthEnd }
    }
  }, [selectedDate, viewMode])

  // Ensure we start with today's date
  useEffect(() => {
    setSelectedDate(new Date())
  }, [])

  // Auto-open appointment dialog in assignment mode
  useEffect(() => {
    if (assignmentMode && assignmentData) {
      // Set the preferred date if provided, otherwise use today
      if (assignmentData.preferredDate) {
        try {
          const preferredDate = new Date(assignmentData.preferredDate)
          if (!isNaN(preferredDate.getTime())) {
            setSelectedDate(preferredDate)
          }
        } catch (error) {
          console.warn('Invalid preferred date:', assignmentData.preferredDate)
        }
      }

      // Set the preferred time and date for the appointment slot
      const time = assignmentData.preferredTime || '09:00'
      const date = assignmentData.preferredDate ?
        new Date(assignmentData.preferredDate) :
        new Date()

      setSelectedSlot({ date, time })
      setShowAppointmentDialog(true)

      // Clear the assignment parameters from URL
      setSearchParams({})
    }
  }, [assignmentMode, assignmentData, setSearchParams])

  const { data: appointments = [], loading } = useAppointments({
    doctorId: doctorId || '',
    organizationId: organizationId || '',
    startDate,
    endDate,
    enabled: !!doctorId && !!organizationId,
  })

  const handlePreviousPeriod = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(subDays(selectedDate, 1))
        break
      case 'week':
        setSelectedDate(subWeeks(selectedDate, 1))
        break
      case 'month':
        setSelectedDate(subMonths(selectedDate, 1))
        break
    }
  }

  const handleNextPeriod = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(addDays(selectedDate, 1))
        break
      case 'week':
        setSelectedDate(addWeeks(selectedDate, 1))
        break
      case 'month':
        setSelectedDate(addMonths(selectedDate, 1))
        break
    }
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const getDateTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })
      case 'week':
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
        return `${format(weekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM yyyy', { locale: es })}`
      case 'month':
        return format(selectedDate, "MMMM yyyy", { locale: es })
    }
  }

  const handleSlotClick = (date: Date, time: string) => {
    setSelectedSlot({ date, time })
    setShowAppointmentDialog(true)
  }

  const handleAppointmentClick = (appointment: AppointmentData) => {
    setSelectedAppointment(appointment)
    setShowAppointmentOptions(true)
  }

  const handleEditAppointment = (appointment: AppointmentData) => {
    setEditingAppointment(appointment)
    setShowAppointmentDialog(true)
  }

  const getAppointmentColor = (appointment: AppointmentData) => {
    if (appointment.status === 'cancelled') return 'bg-gray-100 text-gray-600 border-gray-300'
    if (appointment.type === 'telemedicine') return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  // Filter appointments based on search and filters
  const filteredAppointments = useMemo(() => {
    let filtered = appointments

    // Exclude cancelled appointments by default unless toggle is enabled
    if (!showCancelledAppointments) {
      filtered = filtered.filter(apt => apt.status !== 'cancelled' && apt.status !== 'no-show')
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(apt =>
        apt.patientName.toLowerCase().includes(query) ||
        apt.reason?.toLowerCase().includes(query) ||
        apt.description?.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(apt => apt.type === typeFilter)
    }

    return filtered
  }, [appointments, searchQuery, statusFilter, typeFilter, showCancelledAppointments])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleToday} className="text-sm">
            Hoy
          </Button>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="sm" onClick={handlePreviousPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 capitalize">
            {getDateTitle()}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Mode Selector */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "text-sm",
                  viewMode === mode ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
                )}
              >
                {mode === 'day' && 'Día'}
                {mode === 'week' && 'Semana'}
                {mode === 'month' && 'Mes'}
              </Button>
            ))}
          </div>

          {/* Show Cancelled Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-cancelled"
              checked={showCancelledAppointments}
              onCheckedChange={setShowCancelledAppointments}
            />
            <label
              htmlFor="show-cancelled"
              className="text-sm text-gray-600 cursor-pointer"
            >
              Mostrar canceladas
            </label>
          </div>

          {/* New Appointment Button */}
          <Button
            onClick={() => {
              setSelectedSlot({ date: new Date(), time: '09:00' })
              setShowAppointmentDialog(true)
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Cita</span>
          </Button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando agenda...</p>
            </div>
          </div>
        ) : viewMode === 'day' ? (
          <DayView
            date={selectedDate}
            appointments={filteredAppointments}
            doctorId={doctorId || ''}
            organizationId={organizationId || ''}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            getAppointmentColor={getAppointmentColor}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            date={selectedDate}
            appointments={filteredAppointments}
            doctorId={doctorId || ''}
            organizationId={organizationId || ''}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onDayClick={(date) => {
              setSelectedDate(date)
              setViewMode('day')
            }}
            getAppointmentColor={getAppointmentColor}
          />
        ) : (
          <MonthView
            date={selectedDate}
            appointments={filteredAppointments}
            onDayClick={(date) => {
              setSelectedDate(date)
              setViewMode('day')
            }}
            getAppointmentColor={getAppointmentColor}
          />
        )}
      </div>

      {/* Appointment Creation/Edit Dialog */}
      {showAppointmentDialog && (
        <AppointmentDialog
          open={showAppointmentDialog}
          onClose={() => {
            setShowAppointmentDialog(false)
            setSelectedSlot(null)
            setEditingAppointment(null)
          }}
          doctorId={doctorId || ''}
          organizationId={organizationId || ''}
          date={selectedSlot?.date || editingAppointment?.start}
          timeSlot={selectedSlot?.time}
          appointment={editingAppointment}
          appointmentRequest={assignmentData}
        />
      )}

      {/* Appointment Options Dialog */}
      <AppointmentOptionsDialog
        appointment={selectedAppointment}
        open={showAppointmentOptions}
        onClose={() => {
          setShowAppointmentOptions(false)
          setSelectedAppointment(null)
        }}
        onEdit={handleEditAppointment}
      />
    </div>
  )
}

// Day View Component
interface DayViewProps {
  date: Date
  appointments: AppointmentData[]
  doctorId: string
  organizationId: string
  onSlotClick: (date: Date, time: string) => void
  onAppointmentClick: (appointment: AppointmentData) => void
  getAppointmentColor: (appointment: AppointmentData) => string
}

function DayView({
  date,
  appointments,
  doctorId,
  organizationId,
  onSlotClick,
  onAppointmentClick,
  getAppointmentColor
}: DayViewProps) {
  // Generate time slots from 8 AM to 6 PM
  const timeSlots = Array.from({ length: 20 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8
    const minutes = (i % 2) * 30
    return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  })

  const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.start), date))

  // Helper function to calculate current time position in the schedule
  const getCurrentTimePosition = (): number => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Calculate position relative to 8 AM start time
    const startHour = 8
    const minutesFromStart = (currentHour - startHour) * 60 + currentMinute
    const slotsFromStart = minutesFromStart / 30 // 30-minute slots

    return slotsFromStart * 60 // 60px per slot
  }

  return (
    <div className="flex h-full">
      {/* Time labels */}
      <div className="w-16 flex-shrink-0 border-r bg-white pt-4">
        {timeSlots.map((slot, index) => {
          const [hour, minute] = slot.split(':').map(Number)
          const showHourLabel = minute === 0

          return (
            <div
              key={slot}
              className="relative border-b bg-white h-[60px] border-gray-200"
            >
              {showHourLabel && (
                <div className="absolute top-0 w-full text-center text-xs text-gray-500 mt-1">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 relative pt-4">
        {timeSlots.map((slot) => (
          <div
            key={slot}
            className="border-b relative bg-white h-[60px] border-gray-200 hover:bg-blue-50/50 transition-colors"
            onDrop={(e) => {
              e.preventDefault()
              try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'))
                if (data.appointmentId) {
                  console.log(`Moving appointment ${data.appointmentId} from ${data.originalTime} to ${slot}`)
                  // TODO: Implement appointment rescheduling logic here
                  // This would typically call an API to update the appointment time
                }
              } catch (error) {
                console.error('Error handling drop:', error)
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('bg-blue-100')
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-blue-100')
            }}
          >
            <button
              className="w-full h-full cursor-pointer transition-colors"
              onClick={() => onSlotClick(date, slot)}
            />
          </div>
        ))}

        {/* Current time indicator */}
        {isToday(date) && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-blue-500 z-20"
            style={{
              top: `${getCurrentTimePosition() + 16}px`, // +16 for the padding top
            }}
          >
            <div className="w-2 h-2 bg-blue-500 rounded-full -ml-1 -mt-1" />
          </div>
        )}

        {/* Appointments */}
        {dayAppointments.map((appointment) => {
          const startTime = new Date(appointment.start)
          const startSlot = (startTime.getHours() - 8) * 2 + (startTime.getMinutes() >= 30 ? 1 : 0)
          const top = startSlot * 60

          // Check if appointment is in the past (including current time)
          const now = new Date()
          const isPastAppointment = new Date(appointment.end) <= now
          const isCancelledOrNoShow = appointment.status === 'cancelled' || appointment.status === 'no-show'

          // Determine if appointment can be interacted with (edited, cancelled, dragged)
          const isInteractive = !isPastAppointment && !isCancelledOrNoShow

          return (
            <div
              key={appointment.id}
              className={cn(
                "absolute left-2 right-2 rounded p-2 z-10 text-left transition-all duration-200",
                // Different styles based on appointment status
                isInteractive
                  ? "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
                  : "cursor-default opacity-70",
                // Color scheme based on appointment type and status
                appointment.type === 'telemedicine'
                  ? isPastAppointment
                    ? "bg-green-100 border-l-4 border-green-400 text-green-700"
                    : isCancelledOrNoShow
                    ? "bg-gray-100 border-l-4 border-gray-400 text-gray-600"
                    : "bg-green-50 border-l-4 border-green-500 text-green-700"
                  : isPastAppointment
                    ? "bg-blue-100 border-l-4 border-blue-400 text-blue-700"
                    : isCancelledOrNoShow
                    ? "bg-gray-100 border-l-4 border-gray-400 text-gray-600"
                    : "bg-blue-50 border-l-4 border-blue-500 text-blue-700"
              )}
              style={{ top: `${top + 16}px`, height: '58px' }}
              onClick={isInteractive ? () => onAppointmentClick(appointment) : undefined}
              draggable={isInteractive}
              onDragStart={(e) => {
                if (!isInteractive) {
                  e.preventDefault()
                  return
                }
                e.dataTransfer.setData('application/json', JSON.stringify({
                  appointmentId: appointment.id,
                  originalTime: format(startTime, 'HH:mm')
                }))
              }}
            >
              <div className="text-xs font-semibold">
                {format(startTime, 'HH:mm')} - {appointment.patientName}
              </div>
              <div className="text-xs truncate flex items-center">
                {appointment.type === 'telemedicine' && (
                  <Video className="h-3 w-3 mr-1" />
                )}
                {isCancelledOrNoShow && <span className="text-xs mr-1">[Cancelada]</span>}
                {appointment.reason || 'Consulta general'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Week View Component
interface WeekViewProps {
  date: Date
  appointments: AppointmentData[]
  doctorId: string
  organizationId: string
  onSlotClick: (date: Date, time: string) => void
  onAppointmentClick: (appointment: AppointmentData) => void
  onDayClick: (date: Date) => void
  getAppointmentColor: (appointment: AppointmentData) => string
}

function WeekView({
  date,
  appointments,
  doctorId,
  organizationId,
  onSlotClick,
  onAppointmentClick,
  onDayClick,
  getAppointmentColor
}: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Get all time slots for the week using the hook
  const { timeSlots, daySchedules, loading, error } = useWeekTimeSlots(doctorId, organizationId, weekStart)

  // Helper function to calculate current time position in the schedule
  const getCurrentTimePosition = (timeSlots: string[], slotDuration: number, slotHeight: number): number => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeInMinutes = currentHour * 60 + currentMinute

    // Find the first time slot
    if (timeSlots.length === 0) return 0

    const [firstHour, firstMinute] = timeSlots[0].split(':').map(Number)
    const firstTimeInMinutes = firstHour * 60 + firstMinute

    // Calculate position relative to first time slot
    const minutesFromStart = currentTimeInMinutes - firstTimeInMinutes
    const slotsFromStart = minutesFromStart / slotDuration

    return slotsFromStart * slotHeight
  }

  // Helper function to get appointment position within the schedule
  const getAppointmentPosition = (
    startTime: Date,
    endTime: Date,
    timeSlots: string[],
    slotDuration: number,
    slotHeight: number
  ): { top: number; height: number } | null => {
    if (timeSlots.length === 0) return null

    const startHour = startTime.getHours()
    const startMinute = startTime.getMinutes()
    const endHour = endTime.getHours()
    const endMinute = endTime.getMinutes()

    const startTimeInMinutes = startHour * 60 + startMinute
    const endTimeInMinutes = endHour * 60 + endMinute

    // Find the first time slot
    const [firstHour, firstMinute] = timeSlots[0].split(':').map(Number)
    const firstTimeInMinutes = firstHour * 60 + firstMinute

    // Calculate position relative to first time slot
    const startMinutesFromBegin = startTimeInMinutes - firstTimeInMinutes
    const endMinutesFromBegin = endTimeInMinutes - firstTimeInMinutes

    const startSlotsFromBegin = startMinutesFromBegin / slotDuration
    const endSlotsFromBegin = endMinutesFromBegin / slotDuration

    const top = startSlotsFromBegin * slotHeight
    const height = (endSlotsFromBegin - startSlotsFromBegin) * slotHeight

    return {
      top: Math.max(0, top),
      height: Math.max(slotHeight * 0.5, height) // Minimum height for visibility
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando horarios...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Error al cargar horarios</p>
          <p className="text-sm">No se pudo cargar la configuración del horario</p>
        </div>
      </div>
    )
  }

  if (timeSlots.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No hay horarios configurados</p>
          <p className="text-sm">No hay horarios laborales para esta semana</p>
        </div>
      </div>
    )
  }

  const slotHeight = 60 // Height per 30-minute slot

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="flex border-b bg-white">
        <div className="w-16 flex-shrink-0"></div>
        {weekDays.map((day) => {
          const daySchedule = getDayScheduleFromWeek(daySchedules, day)
          const hasSchedule = !!daySchedule

          return (
            <button
              key={day.toISOString()}
              className={cn(
                "flex-1 hover:bg-gray-50 transition-colors",
                !hasSchedule && "opacity-50"
              )}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                borderRight: '1px solid var(--neutralTertiaryAlt)',
                color: 'var(--neutralPrimary)',
                fontSize: '12px',
                letterSpacing: '-0.1px',
                minWidth: '100px',
                paddingBottom: '5px',
                paddingLeft: '8px'
              }}
              onClick={() => onDayClick(day)}
            >
              <div className="flex flex-col items-start">
                <div className={cn(
                  "text-2xl font-bold mb-1",
                  isToday(day) ? "text-blue-600" : "text-gray-900",
                  !hasSchedule && "text-gray-400"
                )}>
                  {format(day, 'd')}
                </div>
                <div className={cn(
                  "text-xs",
                  isToday(day) ? "text-blue-600" : "text-gray-600",
                  !hasSchedule && "text-gray-400"
                )}>
                  {format(day, 'EEE', { locale: es })}
                </div>
                {!hasSchedule && (
                  <div className="text-xs text-gray-400 mt-1">Sin horario</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Week grid */}
      <div className="flex-1 flex overflow-auto">
        {/* Time labels */}
        <div className="w-16 flex-shrink-0 border-r bg-white pt-4">
          {timeSlots.map((timeSlot, index) => {
            const [hour, minute] = timeSlot.split(':').map(Number)
            const showLabel = minute === 0

            // Check if the NEXT slot starts a new hour (for bottom border)
            const nextSlotIndex = index + 1
            const isLastSlot = nextSlotIndex >= timeSlots.length
            let nextSlotStartsNewHour = false

            if (!isLastSlot) {
              const [nextHour, nextMinute] = timeSlots[nextSlotIndex].split(':').map(Number)
              nextSlotStartsNewHour = nextMinute === 0
            }

            return (
              <div
                key={timeSlot}
                className={cn(
                  "relative border-b bg-white",
                  nextSlotStartsNewHour || isLastSlot ? "border-gray-300 border-solid" : "border-gray-200 border-dashed"
                )}
                style={{ height: `${slotHeight}px` }}
              >
                {showLabel && (
                  <div
                    className="absolute top-0 w-full text-center"
                    style={{
                      color: 'var(--neutralPrimaryAlt)',
                      fontSize: '12px',
                      fontWeight: 400,
                      marginTop: '3px'
                    }}
                  >
                    {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Days columns */}
        <div className="flex flex-1 pt-4">
          {weekDays.map((day) => {
            const daySchedule = getDayScheduleFromWeek(daySchedules, day)
            const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.start), day))
            const dayTimeSlots = daySchedule ? generateTimeSlotsFromConfig(daySchedule) : []

            return (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-200 relative">
                {!daySchedule ? (
                  // No schedule for this day
                  <div className="flex items-center justify-center h-full bg-gray-50 opacity-50">
                    <div className="text-center text-gray-400 text-sm">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      Sin horario
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Time slots */}
                    {timeSlots.map((timeSlot, timeSlotIndex) => {
                      const [hour, minute] = timeSlot.split(':').map(Number)
                      const isAvailable = dayTimeSlots.includes(timeSlot)

                      // Check if the NEXT slot starts a new hour (for bottom border)
                      const nextTimeSlotIndex = timeSlotIndex + 1
                      const isLastTimeSlot = nextTimeSlotIndex >= timeSlots.length
                      let nextTimeSlotStartsNewHour = false

                      if (!isLastTimeSlot) {
                        const [nextHour, nextMinute] = timeSlots[nextTimeSlotIndex].split(':').map(Number)
                        nextTimeSlotStartsNewHour = nextMinute === 0
                      }

                      return (
                        <div
                          key={timeSlot}
                          className={cn(
                            "border-b relative bg-white",
                            nextTimeSlotStartsNewHour || isLastTimeSlot ? "border-gray-300 border-solid" : "border-gray-200 border-dashed",
                            isAvailable ? "hover:bg-blue-50/50 transition-colors" : "bg-gray-50"
                          )}
                          style={{ height: `${slotHeight}px` }}
                        >
                          {isAvailable && (
                            <button
                              className="w-full h-full cursor-pointer transition-colors"
                              onClick={() => onSlotClick(day, timeSlot)}
                            />
                          )}
                        </div>
                      )
                    })}

                    {/* Current time indicator - Outlook style blue line */}
                    {isToday(day) && daySchedule && (
                      <div
                        className="absolute left-0 right-0 h-0.5 bg-blue-500 z-20"
                        style={{
                          top: `${getCurrentTimePosition(timeSlots, daySchedule.slotDuration, slotHeight)}px`,
                        }}
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full -ml-1 -mt-1" />
                      </div>
                    )}

                    {/* Appointments */}
                    {dayAppointments.map((appointment) => {
                      const startTime = new Date(appointment.start)
                      const endTime = new Date(appointment.end)
                      const position = getAppointmentPosition(startTime, endTime, timeSlots, daySchedule?.slotDuration || 30, slotHeight)

                      if (!position) return null

                      // Check if appointment is in the past (including current time)
                      const now = new Date()
                      const isPastAppointment = endTime <= now
                      const isCancelledOrNoShow = appointment.status === 'cancelled' || appointment.status === 'no-show'
                      // Determine if appointment can be interacted with (edited, cancelled, dragged)
                      const isInteractive = !isPastAppointment && !isCancelledOrNoShow

                      return (
                        <button
                          key={appointment.id}
                          className={cn(
                            "absolute text-left transition-all z-20",
                            // Interaction states based on appointment status
                            !isInteractive
                              ? "text-gray-700 cursor-default" // Past or cancelled - gray and not clickable
                              : "text-slate-800 hover:shadow-lg hover:scale-[1.02] cursor-pointer" // Active appointments - interactive
                          )}
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            left: '2px',
                            right: '2px',
                            // Microsoft Outlook-style design with different states
                            background: isPastAppointment && !isCancelledOrNoShow
                              ? '#f8f9fa' // Very light gray for past appointments
                              : isCancelledOrNoShow
                              ? '#f5f5f5' // Light gray background for cancelled
                              : '#e8f4fd', // Light blue background like Outlook for active
                            borderRadius: '4px',
                            border: isPastAppointment && !isCancelledOrNoShow
                              ? '1px solid #e9ecef' // Very light border for past
                              : isCancelledOrNoShow
                              ? '1px solid #d1d5db' // Light gray border for cancelled
                              : '1px solid #bfdbfe', // Light blue border for active
                            borderLeftWidth: '3px', // Thin accent border
                            borderLeftColor: isPastAppointment && !isCancelledOrNoShow
                              ? '#adb5bd' // Muted gray for past appointments
                              : isCancelledOrNoShow
                              ? '#9ca3af' // Gray accent for cancelled
                              : '#1d4ed8', // Dark blue accent like Outlook for active
                            borderLeftStyle: 'solid',
                            // Shadow and hover effects
                            boxShadow: isPastAppointment
                              ? '0 1px 2px rgba(0, 0, 0, 0.05)' // Minimal shadow for past appointments
                              : isCancelledOrNoShow
                              ? '0 1px 3px rgba(0, 0, 0, 0.08)'
                              : '0 2px 4px rgba(25, 118, 210, 0.08), 0 1px 2px rgba(25, 118, 210, 0.06)',
                            // Typography and spacing - Outlook-style padding
                            padding: '4px 8px 4px 10px', // Balanced padding with space for left border
                            fontSize: '11px',
                            fontWeight: '600', // Semibold
                            lineHeight: '1.3',
                            overflow: 'hidden',
                            opacity: isPastAppointment ? 0.7 : isCancelledOrNoShow ? 0.85 : 1,
                          }}
                          onClick={isInteractive ? () => onAppointmentClick(appointment) : undefined}
                        >
                          <div className="flex items-center space-x-1">
                            {appointment.type === 'telemedicine' && (
                              <Video className="h-3 w-3" />
                            )}
                            <span className="truncate">
                              {appointment.patientName}
                            </span>
                          </div>
                          {/* Status indicator for past appointments */}
                          {isPastAppointment && !isCancelledOrNoShow && (
                            <div className="text-[9px] text-gray-500 mt-0.5">
                              {appointment.status === 'fulfilled' ? 'Atendida' : 'No atendida'}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Month View Component
interface MonthViewProps {
  date: Date
  appointments: AppointmentData[]
  onDayClick: (date: Date) => void
  getAppointmentColor: (appointment: AppointmentData) => string
}

function MonthView({ date, appointments, onDayClick, getAppointmentColor }: MonthViewProps) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Generate all days in the calendar grid (6 weeks)
  const days = []
  let day = startDate
  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

  const today = new Date()

  // Group appointments by date for quick lookup
  const appointmentsByDate = useMemo(() => {
    const grouped: { [key: string]: AppointmentData[] } = {}

    appointments.forEach(appointment => {
      const dateKey = format(new Date(appointment.start), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(appointment)
    })

    return grouped
  }, [appointments])

  const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="flex flex-col h-full">
      {/* Month calendar header */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekdays.map((day) => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day) => {
          const isCurrentMonth = day >= monthStart && day <= monthEnd
          const isCurrentDay = isToday(day)
          const isPastDay = day < startOfDay(today)
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayAppointments = appointmentsByDate[dateKey] || []

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "relative border-r border-b border-gray-200 last:border-r-0 p-2 text-left transition-colors",
                "hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                !isCurrentMonth && "bg-gray-50 text-gray-400",
                isCurrentMonth && "bg-white text-gray-900",
                isPastDay && "opacity-75",
                isCurrentDay && "bg-blue-100"
              )}
              style={{ minHeight: '120px' }}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrentDay ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" : "",
                    !isCurrentMonth ? "text-gray-400" : "text-gray-900"
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 3 && (
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
                    +{dayAppointments.length - 3}
                  </span>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((appointment, index) => {
                  const startTime = new Date(appointment.start)
                  const isPastAppointment = startTime < today
                  const isCancelledOrNoShow = appointment.status === 'cancelled' || appointment.status === 'no-show'

                  return (
                    <div
                      key={appointment.id}
                      className={cn(
                        "text-xs rounded px-1.5 py-1 truncate transition-all",
                        // Different styles based on appointment status and type
                        appointment.type === 'telemedicine'
                          ? isPastAppointment
                            ? "bg-green-100 text-green-700 opacity-60"
                            : isCancelledOrNoShow
                            ? "bg-gray-100 text-gray-600 line-through opacity-60"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                          : isPastAppointment
                            ? "bg-blue-100 text-blue-700 opacity-60"
                            : isCancelledOrNoShow
                            ? "bg-gray-100 text-gray-600 line-through opacity-60"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200",
                        "border-l-2",
                        appointment.type === 'telemedicine'
                          ? isPastAppointment
                            ? "border-green-400"
                            : isCancelledOrNoShow
                            ? "border-gray-400"
                            : "border-green-600"
                          : isPastAppointment
                            ? "border-blue-400"
                            : isCancelledOrNoShow
                            ? "border-gray-400"
                            : "border-blue-600"
                      )}
                      title={`${format(startTime, 'HH:mm')} - ${appointment.patientName} ${appointment.reason ? `(${appointment.reason})` : ''}`}
                    >
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">
                          {format(startTime, 'HH:mm')}
                        </span>
                        {appointment.type === 'telemedicine' && (
                          <Video className="h-3 w-3 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {appointment.patientName}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Empty state for days with no appointments */}
              {dayAppointments.length === 0 && isCurrentMonth && !isPastDay && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="text-xs text-gray-400 bg-white rounded px-2 py-1 shadow-sm border">
                    Click para agregar
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
