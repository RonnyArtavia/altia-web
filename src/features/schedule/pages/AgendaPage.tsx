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
  RefreshCcw,
  Search,
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
import { useMultiDoctorAppointments } from '../hooks/useAppointments'
import { useAgendas, useMultiAgendaBlocks } from '../hooks/useAgendas'
import { useDoctors } from '../hooks/useDoctors'
import { useScheduleForDay, useWeekTimeSlots, generateTimeSlotsFromConfig, generateAllDayTimeSlots, getDayScheduleFromWeek, useDoctor } from '../hooks/useScheduleSlots'
import { AppointmentDialog } from '../components/AppointmentDialog'
import { AppointmentOptionsDialog } from '../components/AppointmentOptionsDialog'
import { AgendaLeftPanel } from '../components/AgendaLeftPanel'
import { AgendaFormDialog } from '../components/AgendaFormDialog'
import { BlockScheduleDialog } from '../components/BlockScheduleDialog'
import { RescheduleDialog } from '../components/RescheduleDialog'
import type { ScheduleBlock } from '../types/agenda'
import { cn } from '@/lib/utils'
import type { Agenda } from '../types/agenda'
import type { AppointmentData as ServiceAppointmentData } from '../services/appointmentService'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Programada', color: 'bg-primary/10 text-primary-700' },
  waiting: { label: 'En espera', color: 'bg-warning/10 text-warning-700' },
  'in-progress': { label: 'En atención', color: 'bg-accent/10 text-accent-700' },
  completed: { label: 'Completada', color: 'bg-success/10 text-success-700' },
  cancelled: { label: 'Cancelada', color: 'bg-danger/10 text-danger-700' },
}

// Helper function for GCD calculation
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
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
  status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  reason?: string
  description?: string
  organizationId: string
  agendaId?: string
  waitingAt?: Date
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

  // Agenda management states
  const [selectedAgendaIds, setSelectedAgendaIds] = useState<string[]>([])
  const [showAgendaFormDialog, setShowAgendaFormDialog] = useState(false)
  const [editingAgenda, setEditingAgenda] = useState<Agenda | null>(null)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [blockTargetAgendaId, setBlockTargetAgendaId] = useState<string>('')
  const [blockTargetAgendaName, setBlockTargetAgendaName] = useState<string>('')

  // Reschedule state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    appointment: AppointmentData
    newDate: Date
    newTime: string
  } | null>(null)

  const agendaRef = useRef<HTMLDivElement>(null)

  // Determine if user is secretary/assistant
  const isSecretary = userData?.role === 'secretary'
  const selfDoctorId = isSecretary ? undefined : user?.uid
  const organizationId = userData?.organizationId

  // Load all doctors in the org (secretary only)
  const { doctors } = useDoctors(organizationId || '', isSecretary && !!organizationId)

  // Multi-doctor filter (secretary selects which doctors to view)
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([])

  // Effective doctor IDs used for appointment subscription
  const effectiveDoctorIds = useMemo(() => {
    if (!isSecretary) return selfDoctorId ? [selfDoctorId] : []
    if (selectedDoctorIds.length > 0) return selectedDoctorIds
    return doctors.map(d => d.uid)
  }, [isSecretary, selfDoctorId, selectedDoctorIds, doctors])

  // Load agendas — all org agendas for secretary, own agendas for doctor
  const { agendas } = useAgendas({
    organizationId: organizationId || '',
    doctorId: isSecretary ? null : (selfDoctorId || null),
    enabled: !!organizationId,
  })

  // Panel agendas - always show all agendas in left panel, filtered only by doctor selection
  const panelAgendas = useMemo(() => {
    let filtered = agendas

    // Filter by selected doctors (for secretaries) - this affects what shows in the panel
    if (isSecretary && selectedDoctorIds.length > 0) {
      filtered = filtered.filter(a => selectedDoctorIds.includes(a.doctorId))
    }

    return filtered
  }, [agendas, isSecretary, selectedDoctorIds])

  // Visible agendas for calendar data - applies both doctor and agenda filtering
  const visibleAgendas = useMemo(() => {
    let filtered = agendas

    // Filter by selected doctors (for secretaries)
    if (isSecretary && selectedDoctorIds.length > 0) {
      filtered = filtered.filter(a => selectedDoctorIds.includes(a.doctorId))
    }

    // Filter by selected agendas (for both doctors and secretaries) - this affects calendar data only
    if (selectedAgendaIds.length > 0) {
      filtered = filtered.filter(a => selectedAgendaIds.includes(a.id))
    }

    return filtered
  }, [agendas, isSecretary, selectedDoctorIds, selectedAgendaIds])

  // Doctor toggle handler for left panel
  const handleDoctorToggle = (uid: string) => {
    setSelectedDoctorIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  // Agenda toggle handler — simple inclusion/exclusion logic
  const handleAgendaToggle = (id: string) => {
    setSelectedAgendaIds(prev => {
      if (prev.includes(id)) {
        // Remove the agenda from selection
        return prev.filter(aid => aid !== id)
      } else {
        // Add the agenda to selection
        return [...prev, id]
      }
    })
  }

  // Load blocks for all visible agendas (for visual overlays)
  const visibleAgendaIds = useMemo(() => visibleAgendas.map(a => a.id), [visibleAgendas])
  const { blocks } = useMultiAgendaBlocks(organizationId || '', visibleAgendaIds)

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

  const { data: appointments = [], loading } = useMultiDoctorAppointments({
    doctorIds: effectiveDoctorIds,
    organizationId: organizationId || '',
    startDate,
    endDate,
    enabled: effectiveDoctorIds.length > 0 && !!organizationId,
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

  const getAgendaSelectionTitle = () => {
    if (selectedAgendaIds.length === 0) {
      return 'Todas las agendas'
    } else if (selectedAgendaIds.length === 1) {
      const agenda = panelAgendas.find(a => a.id === selectedAgendaIds[0])
      if (agenda) {
        return `${agenda.doctorName} - ${agenda.name}`
      }
      return 'Agenda seleccionada'
    } else {
      return `${selectedAgendaIds.length} agendas seleccionadas`
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

  const handleReschedule = (appointment: AppointmentData, newDate: Date, newTime: string) => {
    setRescheduleTarget({ appointment, newDate, newTime })
    setShowRescheduleDialog(true)
  }

  const getAppointmentColor = (appointment: AppointmentData) => {
    if (appointment.status === 'cancelled') return 'bg-gray-100 text-gray-600 border-gray-300'
    if (appointment.agendaId) {
      const agenda = agendas.find(a => a.id === appointment.agendaId)
      if (agenda) return 'border-l-4'
    }
    if (appointment.type === 'telemedicine') return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  const getAgendaColor = (appointment: AppointmentData): string | undefined => {
    if (appointment.agendaId) {
      return agendas.find(a => a.id === appointment.agendaId)?.color
    }
    return undefined
  }

  // Helper: returns inline CSS for agenda-colored appointments, or null for defaults
  const getAgendaCSSForAppointment = (appointment: AppointmentData): { borderLeftColor: string; backgroundColor: string } | null => {
    const color = getAgendaColor(appointment)
    if (!color) return null
    return { borderLeftColor: color, backgroundColor: color + '1A' }
  }

  // Filter appointments by selected agendas
  const agendaFilteredAppointments = useMemo(() => {
    if (selectedAgendaIds.length === 0) return appointments
    return appointments.filter(apt =>
      apt.agendaId ? selectedAgendaIds.includes(apt.agendaId) : true
    )
  }, [appointments, selectedAgendaIds])

  // Filter appointments based on search and filters
  const filteredAppointments = useMemo(() => {
    let filtered = agendaFilteredAppointments

    // Exclude cancelled appointments by default unless toggle is enabled
    if (!showCancelledAppointments) {
      filtered = filtered.filter(apt => apt.status !== 'cancelled')
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
  }, [agendaFilteredAppointments, searchQuery, statusFilter, typeFilter, showCancelledAppointments])

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Top bar (Teams style) ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0 w-full">
        {/* Left: Title and navigation */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">Agenda</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePreviousPeriod} className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNextPeriod} className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleToday} className="text-sm font-medium text-gray-600 hover:bg-gray-100 px-3">
            Hoy
          </Button>
        </div>

        {/* Right: controls (Teams style) */}
        <div className="flex items-center gap-3">
          {/* View Mode Selector */}
          <div className="flex items-center border border-gray-300 rounded-md">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={cn(
                  'text-sm h-8 px-3 font-medium border-r border-gray-300 last:border-r-0 rounded-none first:rounded-l-md last:rounded-r-md',
                  viewMode === mode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
              </Button>
            ))}
          </div>

          {/* Date display */}
          <div className="text-lg font-medium text-gray-900">
            {getDateTitle()}
          </div>

          {/* New Appointment Button */}
          <Button
            size="sm"
            onClick={() => { setSelectedSlot({ date: new Date(), time: '09:00' }); setShowAppointmentDialog(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* ── Main area: left panel + calendar ─────────────────── */}
      <div className="flex flex-1 overflow-hidden w-full min-h-0">
        {/* Left panel */}
        <AgendaLeftPanel
          isSecretary={isSecretary}
          doctors={doctors}
          selectedDoctorIds={selectedDoctorIds}
          onDoctorToggle={handleDoctorToggle}
          onAllDoctors={() => setSelectedDoctorIds([])}
          agendas={panelAgendas}
          selectedAgendaIds={selectedAgendaIds}
          onAgendaToggle={handleAgendaToggle}
          onAllAgendas={() => setSelectedAgendaIds([])}
          onCreateAgenda={() => { setEditingAgenda(null); setShowAgendaFormDialog(true) }}
          onEditAgenda={(a) => { setEditingAgenda(a); setShowAgendaFormDialog(true) }}
          onBlockAgenda={(a) => { setBlockTargetAgendaId(a.id); setBlockTargetAgendaName(a.name); setShowBlockDialog(true) }}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          appointments={appointments}
        />

        {/* Calendar (Teams style) */}
        <div className="flex-1 overflow-auto bg-white min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Cargando agenda...</p>
              </div>
            </div>
          ) : viewMode === 'day' ? (
            <DayView
              date={selectedDate}
              appointments={filteredAppointments}
              blocks={blocks}
              doctorId={selfDoctorId || ''}
              organizationId={organizationId || ''}
              visibleAgendas={visibleAgendas}
              onSlotClick={handleSlotClick}
              onAppointmentClick={handleAppointmentClick}
              onReschedule={handleReschedule}
              getAppointmentColor={getAppointmentColor}
              getAgendaCSS={getAgendaCSSForAppointment}
            />
          ) : viewMode === 'week' ? (
            <WeekView
              date={selectedDate}
              appointments={filteredAppointments}
              blocks={blocks}
              doctorId={selfDoctorId || ''}
              organizationId={organizationId || ''}
              visibleAgendas={visibleAgendas}
              onSlotClick={handleSlotClick}
              onAppointmentClick={handleAppointmentClick}
              onReschedule={handleReschedule}
              onDayClick={(date) => { setSelectedDate(date); setViewMode('day') }}
              getAppointmentColor={getAppointmentColor}
              getAgendaCSS={getAgendaCSSForAppointment}
            />
          ) : (
            <MonthView
              date={selectedDate}
              appointments={filteredAppointments}
              onDayClick={(date) => { setSelectedDate(date); setViewMode('day') }}
              getAppointmentColor={getAppointmentColor}
            />
          )}
        </div>
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
          doctorId={selfDoctorId || ''}
          organizationId={organizationId || ''}
          date={selectedSlot?.date || editingAppointment?.start}
          timeSlot={selectedSlot?.time}
          appointment={editingAppointment}
          appointmentRequest={assignmentData}
          agendas={visibleAgendas}
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
        onStatusChanged={() => {
          setShowAppointmentOptions(false)
          setSelectedAppointment(null)
        }}
      />

      {/* Agenda Form Dialog */}
      <AgendaFormDialog
        open={showAgendaFormDialog}
        onClose={() => { setShowAgendaFormDialog(false); setEditingAgenda(null) }}
        organizationId={organizationId || ''}
        doctorId={selfDoctorId || ''}
        doctorName={userData?.displayName || userData?.email || ''}
        editAgenda={editingAgenda}
        onSaved={(agendaId) => {
          // After creating/editing an agenda, ensure it will be visible
          if (isSecretary && selectedDoctorIds.length > 0) {
            // Clear doctor filters to show all agendas for secretaries
            setSelectedDoctorIds([])
          }

          // Clear agenda filters to ensure the new agenda is included in the view
          if (selectedAgendaIds.length > 0) {
            setSelectedAgendaIds([])
          }
        }}
        isSecretary={isSecretary}
        doctors={isSecretary ? doctors : undefined}
      />

      {/* Block Schedule Dialog */}
      {blockTargetAgendaId && (() => {
        const targetAgenda = agendas.find(a => a.id === blockTargetAgendaId)
        const doctorAgendaIds = targetAgenda
          ? agendas.filter(a => a.doctorId === targetAgenda.doctorId && a.enabled).map(a => a.id)
          : []
        const doctorName = targetAgenda
          ? (doctors.find(d => d.uid === targetAgenda.doctorId)?.displayName || '')
          : ''
        return (
          <BlockScheduleDialog
            open={showBlockDialog}
            onClose={() => { setShowBlockDialog(false); setBlockTargetAgendaId(''); setBlockTargetAgendaName('') }}
            organizationId={organizationId || ''}
            agendaId={blockTargetAgendaId}
            agendaName={blockTargetAgendaName}
            userId={user?.uid || userData?.uid || ''}
            initialDate={selectedDate}
            doctorAgendaIds={doctorAgendaIds}
            doctorName={doctorName}
          />
        )
      })()}

      {/* Reschedule Dialog */}
      {rescheduleTarget && (
        <RescheduleDialog
          open={showRescheduleDialog}
          onClose={() => { setShowRescheduleDialog(false); setRescheduleTarget(null) }}
          appointment={rescheduleTarget.appointment as unknown as ServiceAppointmentData}
          newDate={rescheduleTarget.newDate}
          newTime={rescheduleTarget.newTime}
          organizationId={organizationId || ''}
          userId={user?.uid || userData?.uid || ''}
          userRole={userData?.role === 'doctor' ? 'doctor' : 'secretary'}
          onRescheduled={() => { setShowRescheduleDialog(false); setRescheduleTarget(null) }}
          isSecretary={isSecretary}
          doctors={isSecretary ? doctors : undefined}
          agendas={isSecretary ? agendas : undefined}
        />
      )}
    </div>
  )
}

// ─── Block helpers ────────────────────────────────────────────

function isBlockForDay(block: ScheduleBlock, date: Date): boolean {
  const d = new Date(date); d.setHours(12, 0, 0, 0)
  switch (block.type) {
    case 'date-range':
    case 'hours': {
      if (!block.startDate || !block.endDate) return false
      const s = new Date(block.startDate); s.setHours(0, 0, 0, 0)
      const e = new Date(block.endDate); e.setHours(23, 59, 59, 999)
      return d >= s && d <= e
    }
    case 'day':
    case 'recurring':
      return block.dayOfWeek !== undefined && date.getDay() === block.dayOfWeek
    default:
      return false
  }
}

function getBlockOverlayStyle(block: ScheduleBlock): { top: number; height: number } | null {
  // date-range with no times = full day block
  if (block.type === 'date-range' && !block.startTime && !block.endTime) {
    return { top: 16, height: 20 * 60 } // full visible area (8AM-6PM = 20 slots × 60px)
  }
  const startTime = block.startTime || '08:00'
  const endTime = block.endTime || '18:00'
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = eh * 60 + em
  const firstSlotMin = 8 * 60
  const slotH = 60
  const slotD = 30
  const top = (startMin - firstSlotMin) / slotD * slotH + 16
  const height = (endMin - startMin) / slotD * slotH
  if (height <= 0) return null
  return { top: Math.max(16, top), height }
}

function BlockOverlay({ block }: { block: ScheduleBlock }) {
  const style = getBlockOverlayStyle(block)
  if (!style) return null
  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: style.top, height: style.height }}
    >
      <div
        className="w-full h-full border border-gray-300/60 flex items-start"
        style={{
          backgroundColor: 'rgba(156,163,175,0.25)',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.06) 6px, rgba(0,0,0,0.06) 8px)',
        }}
      >
        <span className="text-[10px] text-gray-500 px-1.5 py-0.5 flex items-center gap-0.5 select-none">
          🔒 {block.reason || 'Bloqueado'}
        </span>
      </div>
    </div>
  )
}

// Day View Component
interface DayViewProps {
  date: Date
  appointments: AppointmentData[]
  blocks?: ScheduleBlock[]
  doctorId: string
  organizationId: string
  visibleAgendas: any[]  // Add visibleAgendas parameter
  onSlotClick: (date: Date, time: string) => void
  onAppointmentClick: (appointment: AppointmentData) => void
  onReschedule?: (appointment: AppointmentData, newDate: Date, newTime: string) => void
  getAppointmentColor: (appointment: AppointmentData) => string
  getAgendaCSS?: (appointment: AppointmentData) => { borderLeftColor: string; backgroundColor: string } | null
}

function DayView({
  date,
  appointments,
  blocks = [],
  doctorId,
  organizationId,
  visibleAgendas,
  onSlotClick,
  onAppointmentClick,
  onReschedule,
  getAppointmentColor,
  getAgendaCSS
}: DayViewProps) {
  const calendarGridRef = useRef<HTMLDivElement>(null)

  // Generate time slots from 12 AM to 11 PM with agenda availability info
  const { timeSlots, optimalSlotDuration, agendaScheduleRanges } = useMemo(() => {
    // Calculate optimal slot duration based on all agendas
    const slotDurations = visibleAgendas
      .filter(agenda => agenda.enabled && agenda.slotDuration)
      .map(agenda => agenda.slotDuration)

    const optimalSlotDuration = slotDurations.length > 0
      ? slotDurations.reduce((a, b) => gcd(a, b))
      : 30

    // Ensure minimum 15 minutes and maximum 60 minutes for better Teams-like display
    const finalSlotDuration = Math.max(15, Math.min(60, optimalSlotDuration))

    // Get day name from date
    const dayOfWeek = date.getDay()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[dayOfWeek]

    // Collect all agenda schedule ranges for this day
    const agendaRanges: Array<{ start: number; end: number }> = []

    visibleAgendas.forEach(agenda => {
      if (!agenda.enabled || !agenda.schedule?.[dayName]?.enabled) return

      const daySchedule = agenda.schedule[dayName]
      const [startHour, startMinute] = daySchedule.start.split(':').map(Number)
      const [endHour, endMinute] = daySchedule.end.split(':').map(Number)

      agendaRanges.push({
        start: startHour * 60 + startMinute,
        end: endHour * 60 + endMinute
      })
    })

    // Generate ALL time slots from 12 AM (00:00) to 11 PM (23:00)
    const slots: string[] = []
    const startTime = 0 // 12 AM = 0 minutes
    const endTime = 23 * 60 // 11 PM = 23:00

    for (let time = startTime; time <= endTime; time += finalSlotDuration) {
      const hour = Math.floor(time / 60)
      const minutes = time % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      slots.push(timeString)
    }

    return {
      timeSlots: slots,
      optimalSlotDuration: finalSlotDuration,
      agendaScheduleRanges: agendaRanges
    }
  }, [visibleAgendas, date])

  // Helper function to check if a time slot is within any agenda schedule
  const isSlotAvailable = (timeSlot: string): boolean => {
    const [hour, minute] = timeSlot.split(':').map(Number)
    const timeInMinutes = hour * 60 + minute

    return agendaScheduleRanges.some(range =>
      timeInMinutes >= range.start && timeInMinutes < range.end
    )
  }

  const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.start), date))

  // Helper function to calculate current time position in the schedule
  const getCurrentTimePosition = (): number => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Calculate position relative to 12 AM start time
    const minutesFromMidnight = currentHour * 60 + currentMinute
    const slotsFromStart = minutesFromMidnight / optimalSlotDuration

    return slotsFromStart * 60 // 60px per slot
  }

  // Auto-scroll to current time (Teams behavior)
  useEffect(() => {
    if (calendarGridRef.current && isToday(date) && timeSlots.length > 0) {
      const scrollToCurrentTime = () => {
        const now = new Date()
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()

        // Calculate position to scroll to (Teams-style: show current time with context above)
        const minutesFromMidnight = currentHour * 60 + currentMinute
        const slotsFromStart = minutesFromMidnight / optimalSlotDuration

        // Show 2 hours of context above the current time (like Teams does)
        const contextMinutes = 2 * 60 // 2 hours
        const contextSlots = contextMinutes / optimalSlotDuration
        const scrollPosition = Math.max(0, (slotsFromStart - contextSlots) * 60)

        calendarGridRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }

      // Small delay to ensure DOM is ready
      const timer = setTimeout(scrollToCurrentTime, 150)
      return () => clearTimeout(timer)
    }
  }, [date, optimalSlotDuration, timeSlots.length]) // Re-run when date, slot duration, or timeSlots change

  return (
    <div className="h-full bg-white w-full">
      {/* Single scrollable container for both time labels and calendar */}
      <div ref={calendarGridRef} className="h-full overflow-auto">
        <div className="flex min-h-full">
          {/* Time labels (Teams style) */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {timeSlots.map((slot, index) => {
              const [hour, minute] = slot.split(':').map(Number)
              const showHourLabel = minute === 0

              return (
                <div
                  key={slot}
                  className="relative h-[60px] border-b border-gray-100"
                >
                  {showHourLabel && (
                    <div className="absolute -top-2 right-2 text-xs text-gray-600 font-medium">
                      {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Calendar grid (Teams style) */}
          <div className="flex-1 relative min-w-0">
        {timeSlots.map((slot) => {
          const isInSchedule = isSlotAvailable(slot)

          return (
            <div
              key={slot}
              className={cn(
                "border-b border-gray-100 relative h-[60px] transition-colors cursor-pointer",
                isInSchedule
                  ? "bg-white hover:bg-blue-50"
                  : "bg-gray-50 hover:bg-gray-100"
              )}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('bg-blue-100')
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'))
                  if (data.appointmentId && onReschedule) {
                    const apt = appointments.find(a => a.id === data.appointmentId)
                    if (apt) onReschedule(apt, date, slot)
                  }
                } catch { /* ignore */ }
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
                className="w-full h-full cursor-pointer flex items-center justify-center"
                onClick={() => onSlotClick(date, slot)}
                title={isInSchedule ? "Horario de agenda" : "Fuera de horario de agenda"}
              >
                {!isInSchedule && (
                  <span className="text-xs text-gray-500 select-none opacity-50">
                    Fuera de horario
                  </span>
                )}
              </button>
            </div>
          )
        })}

        {/* Block overlays */}
        {blocks.filter(b => isBlockForDay(b, date)).map(block => (
          <BlockOverlay key={block.id} block={block} />
        ))}

        {/* Current time indicator (Teams style) */}
        {isToday(date) && (
          <div
            className="absolute left-0 right-0 h-0.5 bg-blue-600 z-20"
            style={{
              top: `${getCurrentTimePosition()}px`,
            }}
          >
            <div className="w-2 h-2 bg-blue-600 rounded-full -ml-1 -mt-1" />
          </div>
        )}

        {/* Appointments with overlap detection */}
        {(() => {
          // Calculate layout for overlapping appointments (same logic as WeekView)
          const calculateAppointmentLayout = (
            appointments: AppointmentData[],
            timeSlots: string[],
            slotDuration: number,
            slotHeight: number
          ): Array<{
            appointment: AppointmentData
            position: { top: number; height: number } | null
            layout: { left: number; width: number }
          }> => {
            if (appointments.length === 0) return []

            // Calculate position for each appointment
            const appointmentsWithPosition = appointments.map(appointment => {
              const startTime = new Date(appointment.start)
              const endTime = new Date(appointment.end)
              const startHour = startTime.getHours()
              const startMinute = startTime.getMinutes()
              const endHour = endTime.getHours()
              const endMinute = endTime.getMinutes()

              const startTimeInMinutes = startHour * 60 + startMinute
              const endTimeInMinutes = endHour * 60 + endMinute

              // Calculate position based on 12 AM start time
              const startMinutesFromMidnight = startTimeInMinutes
              const endMinutesFromMidnight = endTimeInMinutes

              const startSlotsFromBegin = startMinutesFromMidnight / slotDuration
              const endSlotsFromBegin = endMinutesFromMidnight / slotDuration

              const top = Math.max(0, startSlotsFromBegin * slotHeight)
              const height = Math.max(slotHeight * 0.8, (endSlotsFromBegin - startSlotsFromBegin) * slotHeight)

              return {
                appointment,
                position: { top, height },
                startTime: startTime.getTime(),
                endTime: endTime.getTime()
              }
            }).filter(apt => apt.position !== null)

            // Sort by start time for proper layout calculation
            appointmentsWithPosition.sort((a, b) => a.startTime - b.startTime)

            // Detect overlapping appointments and assign columns
            const columns: Array<{
              appointments: typeof appointmentsWithPosition[0][]
              endTime: number
            }> = []

            appointmentsWithPosition.forEach(apt => {
              // Find the first available column (one that doesn't overlap with this appointment)
              let assignedColumn = -1
              for (let i = 0; i < columns.length; i++) {
                if (columns[i].endTime <= apt.startTime) {
                  assignedColumn = i
                  break
                }
              }

              // If no available column, create a new one
              if (assignedColumn === -1) {
                assignedColumn = columns.length
                columns.push({
                  appointments: [],
                  endTime: apt.endTime
                })
              }

              // Assign appointment to column and update end time
              columns[assignedColumn].appointments.push(apt)
              columns[assignedColumn].endTime = Math.max(columns[assignedColumn].endTime, apt.endTime)
            })

            // Calculate layout dimensions
            const totalColumns = columns.length
            let columnWidth: number
            let columnSpacing: number

            if (totalColumns === 1) {
              // Single appointment gets almost full width
              columnWidth = 95
              columnSpacing = 0
            } else {
              // Multiple appointments need to share space
              const availableWidth = 92
              const totalGap = (totalColumns - 1) * 2 // 2% gap between columns
              columnWidth = (availableWidth - totalGap) / totalColumns
              columnSpacing = 2
            }

            // Assign layout to each appointment
            const result: Array<{
              appointment: AppointmentData
              position: { top: number; height: number } | null
              layout: { left: number; width: number }
            }> = []

            columns.forEach((column, columnIndex) => {
              column.appointments.forEach(apt => {
                // Calculate left position as percentage
                const leftMargin = totalColumns === 1 ? 2 : 4 // More margin for multiple appointments
                const leftPercentage = leftMargin + (columnIndex * (columnWidth + columnSpacing))

                // Ensure the appointment doesn't exceed the container width
                const maxLeft = 96 - columnWidth
                const finalLeft = Math.min(leftPercentage, maxLeft)
                const finalWidth = Math.min(columnWidth, 96 - finalLeft)

                result.push({
                  appointment: apt.appointment,
                  position: apt.position,
                  layout: {
                    left: finalLeft,
                    width: finalWidth
                  }
                })
              })
            })

            return result
          }

          // Calculate layout for all appointments
          const appointmentLayout = calculateAppointmentLayout(dayAppointments, timeSlots, optimalSlotDuration, 60)

          return appointmentLayout.map(({ appointment, position, layout }) => {
            if (!position) return null

            const startTime = new Date(appointment.start)

            // Check if appointment is in the past (including current time)
            const now = new Date()
            const isPastAppointment = new Date(appointment.end) <= now
            const isCancelled = appointment.status === 'cancelled'

            const isInteractive = !isPastAppointment && !isCancelled
            const agendaCSS = (!isPastAppointment && !isCancelled) ? getAgendaCSS?.(appointment) : null

            return (
              <div
                key={appointment.id}
                className={cn(
                  "absolute rounded-md p-3 z-10 text-left transition-all duration-200 border-l-4",
                  // Teams-style clean appearance
                  isInteractive
                    ? "cursor-pointer hover:shadow-md hover:scale-[1.02]"
                    : "cursor-default opacity-70",
                  // Simplified color scheme like Teams
                  agendaCSS
                    ? "text-gray-800 shadow-sm"
                    : isCancelled
                      ? "bg-gray-100 border-gray-400 text-gray-600"
                      : appointment.type === 'telemedicine'
                        ? "bg-green-100 border-green-500 text-green-800"
                        : "bg-blue-100 border-blue-500 text-blue-800"
                )}
                style={{
                  top: `${position.top}px`,
                  height: `${position.height}px`,
                  left: `${layout.left}%`,
                  width: `${layout.width}%`,
                  ...(agendaCSS ? {
                    borderLeftColor: agendaCSS.borderLeftColor,
                    backgroundColor: agendaCSS.backgroundColor + '20'
                  } : {}),
                }}
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
                <div className="font-semibold text-sm mb-1">
                  {appointment.patientName}
                </div>
                <div className="text-xs text-gray-600 flex items-center">
                  {appointment.type === 'telemedicine' && (
                    <Video className="h-3 w-3 mr-1" />
                  )}
                  {isCancelled && <span className="mr-1">[Cancelada]</span>}
                  {appointment.reason || 'Consulta general'}
                </div>
              </div>
            )
          })
        })()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Week View Component
interface WeekViewProps {
  date: Date
  appointments: AppointmentData[]
  blocks?: ScheduleBlock[]
  doctorId: string
  organizationId: string
  visibleAgendas: any[]  // Add visibleAgendas parameter
  onSlotClick: (date: Date, time: string) => void
  onAppointmentClick: (appointment: AppointmentData) => void
  onReschedule?: (appointment: AppointmentData, newDate: Date, newTime: string) => void
  onDayClick: (date: Date) => void
  getAppointmentColor: (appointment: AppointmentData) => string
  getAgendaCSS?: (appointment: AppointmentData) => { borderLeftColor: string; backgroundColor: string } | null
}

function WeekView({
  date,
  appointments,
  blocks = [],
  doctorId,
  organizationId,
  visibleAgendas,
  onSlotClick,
  onAppointmentClick,
  onReschedule,
  onDayClick,
  getAppointmentColor,
  getAgendaCSS
}: WeekViewProps) {
  const weekCalendarRef = useRef<HTMLDivElement>(null)
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Get all time slots for the week using the hook, now using actual agendas
  const { timeSlots, daySchedules, loading, error } = useWeekTimeSlots(doctorId, organizationId, weekStart, visibleAgendas)

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
      height: Math.max(slotHeight * 0.8, height) // Increased minimum height for better content visibility
    }
  }

  // Helper function to calculate layout for overlapping appointments (Outlook-style)
  const calculateAppointmentLayout = (
    appointments: AppointmentData[],
    timeSlots: string[],
    slotDuration: number,
    slotHeight: number
  ): Array<{
    appointment: AppointmentData
    position: { top: number; height: number } | null
    layout: { left: number; width: number }
  }> => {
    if (appointments.length === 0) return []

    // Calculate position for each appointment
    const appointmentsWithPosition = appointments.map(appointment => ({
      appointment,
      position: getAppointmentPosition(
        new Date(appointment.start),
        new Date(appointment.end),
        timeSlots,
        slotDuration,
        slotHeight
      ),
      startTime: new Date(appointment.start).getTime(),
      endTime: new Date(appointment.end).getTime()
    })).filter(apt => apt.position !== null)

    // Sort by start time for proper layout calculation
    appointmentsWithPosition.sort((a, b) => a.startTime - b.startTime)

    // Detect overlapping appointments and assign columns
    const columns: Array<{
      appointments: typeof appointmentsWithPosition[0][]
      endTime: number
    }> = []

    appointmentsWithPosition.forEach(apt => {
      // Find the first available column (one that doesn't overlap with this appointment)
      let assignedColumn = -1
      for (let i = 0; i < columns.length; i++) {
        if (columns[i].endTime <= apt.startTime) {
          assignedColumn = i
          break
        }
      }

      // If no available column, create a new one
      if (assignedColumn === -1) {
        assignedColumn = columns.length
        columns.push({
          appointments: [],
          endTime: apt.endTime
        })
      }

      // Assign appointment to column and update end time
      columns[assignedColumn].appointments.push(apt)
      columns[assignedColumn].endTime = Math.max(columns[assignedColumn].endTime, apt.endTime)
    })

    // Calculate layout dimensions using CSS percentages for responsive design
    const totalColumns = columns.length
    const totalPaddingPx = 8 // Total horizontal padding in pixels (4px left + 4px right)
    const columnGapPx = totalColumns > 1 ? 4 : 0 // Gap between columns in pixels

    // Calculate available width more accurately
    // For single appointments, use more width; for multiple, distribute evenly
    let columnWidth: number
    let columnSpacing: number

    if (totalColumns === 1) {
      // Single appointment gets almost full width
      columnWidth = 95
      columnSpacing = 0
    } else {
      // Multiple appointments need to share space
      const availableWidth = 92
      const totalGap = (totalColumns - 1) * 2 // 2% gap between columns
      columnWidth = (availableWidth - totalGap) / totalColumns
      columnSpacing = 2
    }

    // Assign layout to each appointment
    const result: Array<{
      appointment: AppointmentData
      position: { top: number; height: number } | null
      layout: { left: number; width: number }
    }> = []

    columns.forEach((column, columnIndex) => {
      column.appointments.forEach(apt => {
        // Calculate left position as percentage with better spacing
        const leftMargin = totalColumns === 1 ? 2 : 4 // More margin for multiple appointments
        const leftPercentage = leftMargin + (columnIndex * (columnWidth + columnSpacing))

        // Ensure the appointment doesn't exceed the container width
        const maxLeft = 96 - columnWidth
        const finalLeft = Math.min(leftPercentage, maxLeft)
        const finalWidth = Math.min(columnWidth, 96 - finalLeft)

        result.push({
          appointment: apt.appointment,
          position: apt.position,
          layout: {
            left: finalLeft,
            width: finalWidth
          }
        })
      })
    })

    return result
  }

  // Auto-scroll to current time for current week (Teams behavior)
  useEffect(() => {
    if (weekCalendarRef.current && timeSlots.length > 0) {
      // Check if we're viewing the current week
      const today = new Date()
      const isCurrentWeek = weekDays.some(day => isSameDay(day, today))

      if (isCurrentWeek) {
        const scrollToCurrentTime = () => {
          const now = new Date()
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()

          // Calculate position to scroll to (Teams-style: show current time with context above)
          const minutesFromMidnight = currentHour * 60 + currentMinute

          // Use 30-minute slots as default for week view
          const slotDuration = 30
          const slotHeight = 60
          const slotsFromStart = minutesFromMidnight / slotDuration

          // Show 2 hours of context above the current time (like Teams does)
          const contextMinutes = 2 * 60 // 2 hours
          const contextSlots = contextMinutes / slotDuration
          const scrollPosition = Math.max(0, (slotsFromStart - contextSlots) * slotHeight)

          weekCalendarRef.current?.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          })
        }

        // Small delay to ensure DOM is ready
        const timer = setTimeout(scrollToCurrentTime, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [date, timeSlots, weekDays]) // Re-run when date, timeSlots, or weekDays change

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
    <div className="flex flex-col h-full min-h-0">
      {/* Day headers */}
      <div className="flex border-b bg-white flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-gray-200"></div>
        {weekDays.map((day) => {
          const daySchedule = getDayScheduleFromWeek(daySchedules, day)
          const hasSchedule = !!daySchedule

          return (
            <button
              key={day.toISOString()}
              className={cn(
                "flex-1 hover:bg-gray-50 transition-colors p-3 border-r border-gray-200 min-w-0",
                !hasSchedule && "opacity-50"
              )}
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
      <div ref={weekCalendarRef} className="flex-1 overflow-auto min-h-0">
        <div className="flex min-h-full">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-white">
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
          <div className="flex flex-1 min-w-0">
          {weekDays.map((day) => {
            const daySchedule = getDayScheduleFromWeek(daySchedules, day)
            const dayAppointments = appointments.filter(apt => isSameDay(new Date(apt.start), day))
            const dayTimeSlots = daySchedule ? generateTimeSlotsFromConfig(daySchedule) : []

            return (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-200 relative min-w-0">
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
                            "border-b relative cursor-pointer",
                            nextTimeSlotStartsNewHour || isLastTimeSlot ? "border-gray-300 border-solid" : "border-gray-200 border-dashed",
                            isAvailable
                              ? "bg-white hover:bg-blue-50/50 transition-colors"
                              : "bg-gray-50 hover:bg-gray-100 transition-colors"
                          )}
                          style={{ height: `${slotHeight}px` }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.currentTarget.classList.remove('bg-blue-100')
                            try {
                              const data = JSON.parse(e.dataTransfer.getData('application/json'))
                              if (data.appointmentId && onReschedule) {
                                const apt = appointments.find(a => a.id === data.appointmentId)
                                if (apt) onReschedule(apt, day, timeSlot)
                              }
                            } catch { /* ignore */ }
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
                            className="w-full h-full cursor-pointer transition-colors flex items-center justify-center"
                            onClick={() => onSlotClick(day, timeSlot)}
                            title={isAvailable ? "Horario de agenda" : "Fuera de horario de agenda"}
                          >
                            {!isAvailable && (
                              <span className="text-xs text-gray-400 select-none opacity-40">
                                Fuera de horario
                              </span>
                            )}
                          </button>
                        </div>
                      )
                    })}

                    {/* Block overlays */}
                    {blocks.filter(b => isBlockForDay(b, day)).map(block => (
                      <BlockOverlay key={block.id} block={block} />
                    ))}

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
                    {(() => {
                      // Calculate layout for overlapping appointments (Outlook-style)
                      const appointmentLayout = calculateAppointmentLayout(dayAppointments, timeSlots, daySchedule?.slotDuration || 30, slotHeight)

                      return appointmentLayout.map((appointmentInfo) => {
                        const { appointment, position, layout } = appointmentInfo

                        if (!position) return null

                        // Check if appointment is in the past (including current time)
                        const now = new Date()
                        const endTime = new Date(appointment.end)
                        const isPastAppointment = endTime <= now
                        const isCancelled = appointment.status === 'cancelled'
                        // Determine if appointment can be interacted with (edited, cancelled, dragged)
                        const isInteractive = !isPastAppointment && !isCancelled

                        const agendaCSS = (!isPastAppointment && !isCancelled) ? getAgendaCSS?.(appointment) : null

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
                              left: `${layout.left}%`,
                              width: `${layout.width}%`,
                              // Microsoft Outlook-style design with different states
                              background: agendaCSS
                                ? agendaCSS.backgroundColor
                                : isPastAppointment && !isCancelled
                                  ? '#f1f5f9' // Very light gray for past appointments
                                  : isCancelled
                                    ? '#f8fafc' // Light gray background for cancelled
                                    : '#eff6ff', // Light blue background like Outlook for active
                              borderRadius: '8px',
                              border: isPastAppointment && !isCancelled
                                ? '1px solid #e2e8f0' // Very light border for past
                                : isCancelled
                                  ? '1px solid #cbd5e1' // Light gray border for cancelled
                                  : agendaCSS
                                    ? `1px solid ${agendaCSS.borderLeftColor}40`
                                    : '1px solid #bfdbfe', // Light blue border for active
                              borderLeftWidth: '3px', // Thin accent border
                              borderLeftColor: agendaCSS
                                ? agendaCSS.borderLeftColor
                                : isPastAppointment && !isCancelled
                                  ? '#94a3b8' // Muted gray for past appointments
                                  : isCancelled
                                    ? '#cbd5e1' // Gray accent for cancelled
                                    : '#3b82f6', // Dark blue accent like Outlook for active
                              borderLeftStyle: 'solid',
                              // Shadow and hover effects
                              boxShadow: isPastAppointment
                                ? '0 1px 2px rgba(0, 0, 0, 0.02)' // Minimal shadow for past appointments
                                : isCancelled
                                  ? '0 1px 2px rgba(0, 0, 0, 0.04)'
                                  : '0 4px 12px rgba(59, 130, 246, 0.08), 0 2px 4px rgba(59, 130, 246, 0.04)',
                              // Typography and spacing - Outlook-style padding
                              padding: '8px 10px', // Balanced padding for content visibility
                              fontSize: '11px', // Optimized for readability in small spaces
                              fontWeight: '600', // Medium weight for better readability
                              lineHeight: '1.4', // Compact line height to fit more content
                              overflow: 'hidden',
                              backdropFilter: 'blur(8px)',
                              opacity: isPastAppointment ? 0.75 : isCancelled ? 0.8 : 1,
                            }}
                            onClick={isInteractive ? () => onAppointmentClick(appointment) : undefined}
                            draggable={isInteractive}
                            onDragStart={isInteractive ? (e) => {
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                appointmentId: appointment.id,
                                originalTime: format(new Date(appointment.start), 'HH:mm')
                              }))
                            } : undefined}
                          >
                            {/* Main appointment info */}
                            <div className="space-y-1 min-h-0 overflow-hidden">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-semibold text-blue-800 flex-shrink-0">
                                  {format(new Date(appointment.start), 'HH:mm')}
                                </div>
                                {appointment.type === 'telemedicine' && (
                                  <Video className="h-3 w-3 flex-shrink-0 ml-1" />
                                )}
                              </div>
                              <div className="text-xs font-medium truncate leading-tight">
                                {appointment.patientName}
                              </div>
                              {appointment.reason && (
                                <div className="text-[10px] text-gray-600 truncate leading-tight">
                                  {appointment.reason}
                                </div>
                              )}
                              {/* Status indicator for past appointments */}
                              {isPastAppointment && !isCancelled && (
                                <div className="text-[9px] text-gray-500 leading-tight">
                                  {appointment.status === 'completed' ? 'Atendida' : 'No atendida'}
                                </div>
                              )}
                              {/* Status indicator for cancelled appointments */}
                              {isCancelled && (
                                <div className="text-[9px] text-red-600 leading-tight">
                                  Cancelada
                                </div>
                              )}
                            </div>
                          </button>
                        )
                      })
                    })()}
                  </>
                )}
              </div>
            )
          })}
          </div>
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
                  const isCancelled = appointment.status === 'cancelled'

                  return (
                    <div
                      key={appointment.id}
                      className={cn(
                        "text-xs rounded px-1.5 py-1 truncate transition-all",
                        // Different styles based on appointment status and type
                        appointment.type === 'telemedicine'
                          ? isPastAppointment
                            ? "bg-green-100 text-green-700 opacity-60"
                            : isCancelled
                              ? "bg-gray-100 text-gray-600 line-through opacity-60"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          : isPastAppointment
                            ? "bg-blue-100 text-blue-700 opacity-60"
                            : isCancelled
                              ? "bg-gray-100 text-gray-600 line-through opacity-60"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200",
                        "border-l-2",
                        appointment.type === 'telemedicine'
                          ? isPastAppointment
                            ? "border-green-400"
                            : isCancelled
                              ? "border-gray-400"
                              : "border-green-600"
                          : isPastAppointment
                            ? "border-blue-400"
                            : isCancelled
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
