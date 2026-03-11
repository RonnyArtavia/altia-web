/**
 * AgendaLeftPanel — Panel izquierdo estilo Outlook Calendar
 * RF-02: Filtro de médicos (asistente)
 * RF-03: Filtro de agendas dependiente de médicos seleccionados
 * RF-04: Gestión de agendas (crear, editar, bloquear, eliminar)
 */

import { useState } from 'react'
import { Plus, Pencil, Ban, ChevronDown, ChevronRight, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Agenda } from '../types/agenda'
import type { DoctorOption } from '../hooks/useDoctors'

interface AgendaLeftPanelProps {
  isSecretary: boolean

  // Doctor section (secretary only)
  doctors: DoctorOption[]
  selectedDoctorIds: string[]     // [] = todos
  onDoctorToggle: (uid: string) => void
  onAllDoctors: () => void

  // Agenda section
  agendas: Agenda[]
  selectedAgendaIds: string[]     // [] = todos
  onAgendaToggle: (id: string) => void
  onAllAgendas: () => void

  // Agenda management actions
  onCreateAgenda: () => void
  onEditAgenda: (agenda: Agenda) => void
  onBlockAgenda: (agenda: Agenda) => void

  // Mini calendar props
  selectedDate: Date
  onDateSelect: (date: Date) => void
  appointments?: { start: Date; agendaId?: string }[] // For showing appointment dots
}

export function AgendaLeftPanel({
  isSecretary,
  doctors,
  selectedDoctorIds,
  onDoctorToggle,
  onAllDoctors,
  agendas,
  selectedAgendaIds,
  onAgendaToggle,
  onAllAgendas,
  onCreateAgenda,
  onEditAgenda,
  onBlockAgenda,
  selectedDate,
  onDateSelect,
  appointments = [],
}: AgendaLeftPanelProps) {
  const [doctorSectionOpen, setDoctorSectionOpen] = useState(true)
  const [agendaSectionOpen, setAgendaSectionOpen] = useState(true)

  const allDoctorsSelected = selectedDoctorIds.length === 0
  const allAgendasSelected = selectedAgendaIds.length === 0

  const activeAgendas = agendas.filter(a => a.enabled)
  const disabledAgendas = agendas.filter(a => !a.enabled)

  const isDoctorSelected = (uid: string) =>
    allDoctorsSelected || selectedDoctorIds.includes(uid)

  const isAgendaSelected = (id: string) =>
    allAgendasSelected || selectedAgendaIds.includes(id)

  // Mini calendar logic
  const [calendarDate, setCalendarDate] = useState(selectedDate)

  const monthStart = startOfMonth(calendarDate)
  const monthEnd = endOfMonth(calendarDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  // Generate calendar days
  const calendarDays = []
  let day = calendarStart
  while (day <= calendarEnd) {
    calendarDays.push(day)
    day = addDays(day, 1)
  }

  // Check if date has appointments
  const hasAppointments = (date: Date) => {
    return appointments.some(apt => isSameDay(new Date(apt.start), date))
  }

  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto select-none">

      {/* ── Mini Calendar (Teams style) ────────────────────────────────────────── */}
      <section className="border-b border-gray-200 px-3 py-2 bg-white">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
            className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <h3 className="text-sm font-medium text-gray-800 capitalize">
            {format(calendarDate, 'MMMM yyyy', { locale: es })}
          </h3>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
            className="h-7 w-7 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <div key={day} className="text-xs text-gray-500 text-center font-medium h-5 flex items-center justify-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, calendarDate)
            const isSelected = isSameDay(day, selectedDate)
            const isToday_ = isToday(day)
            const hasApts = hasAppointments(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "h-7 w-full text-xs rounded transition-all relative flex items-center justify-center font-normal",
                  !isCurrentMonth && "text-gray-400 hover:bg-gray-50",
                  isCurrentMonth && !isSelected && !isToday_ && "text-gray-700 hover:bg-gray-100",
                  isToday_ && !isSelected && "bg-blue-100 text-blue-700 font-medium",
                  isSelected && "bg-blue-600 text-white font-medium"
                )}
              >
                {format(day, 'd')}
                {hasApts && (
                  <div className={cn(
                    "absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full",
                    isSelected ? "bg-blue-200" : isToday_ ? "bg-blue-600" : "bg-blue-500"
                  )} />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Médicos ────────────────────────────────────────── */}
      {isSecretary && doctors.length > 0 && (
        <section className="border-b">
          {/* Section header */}
          <button
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide hover:bg-gray-100 transition-colors"
            onClick={() => setDoctorSectionOpen(v => !v)}
          >
            <span>Médicos</span>
            {doctorSectionOpen
              ? <ChevronDown className="h-3.5 w-3.5" />
              : <ChevronRight className="h-3.5 w-3.5" />
            }
          </button>

          {doctorSectionOpen && (
            <div className="pb-2">
              {/* "Todos" option */}
              <button
                onClick={onAllDoctors}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                  allDoctorsSelected && 'bg-blue-50 border-l-2 border-blue-500'
                )}
              >
                {/* Checkbox for all doctors */}
                <div className="flex items-center">
                  {allDoctorsSelected ? (
                    <div className="w-5 h-5 rounded border border-blue-500 bg-blue-500 flex items-center justify-center shadow-sm">
                      <Check className="h-3 w-3 text-white font-bold" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-400 bg-white transition-colors shadow-sm" />
                  )}
                </div>

                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-500">
                  T
                </span>
                <span className={cn('flex-1 text-left font-medium', allDoctorsSelected ? 'text-blue-900 font-semibold' : 'text-gray-700')}>
                  Todos
                </span>
              </button>

              {/* Individual doctors */}
              {doctors.map(doctor => {
                const selected = isDoctorSelected(doctor.uid)
                return (
                  <button
                    key={doctor.uid}
                    onClick={() => onDoctorToggle(doctor.uid)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                      !allDoctorsSelected && selected && 'bg-blue-50 border-l-2 border-blue-500'
                    )}
                  >
                    {/* Checkbox for individual doctor */}
                    {!allDoctorsSelected && (
                      <div className="flex items-center">
                        {selected ? (
                          <div className="w-5 h-5 rounded border border-blue-500 bg-blue-500 flex items-center justify-center shadow-sm">
                            <Check className="h-3 w-3 text-white font-bold" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-400 bg-white transition-colors shadow-sm" />
                        )}
                      </div>
                    )}

                    {/* Avatar initials */}
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                      selected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {doctor.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn(
                        'font-medium truncate',
                        selected ? 'text-blue-900 font-semibold' : 'text-gray-600'
                      )}>
                        {doctor.displayName}
                      </p>
                      {doctor.specialty && (
                        <p className={cn(
                          "text-[10px] truncate",
                          selected ? 'text-blue-600' : 'text-gray-400'
                        )}>
                          {doctor.specialty}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Agendas ────────────────────────────────────────── */}
      <section className="flex-1">
        {/* Section header */}
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 uppercase tracking-wide hover:bg-gray-100 transition-colors"
          onClick={() => setAgendaSectionOpen(v => !v)}
        >
          <span>Agendas</span>
          {agendaSectionOpen
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />
          }
        </button>

        {agendaSectionOpen && (
          <div className="pb-2">
            {agendas.length === 0 && (
              <p className="text-xs text-gray-400 px-4 py-2">
                {isSecretary
                  ? 'No hay agendas. Crea una nueva.'
                  : 'Sin agendas configuradas.'}
              </p>
            )}

            {/* "Todas las agendas" option */}
            {agendas.length > 0 && (
              <button
                onClick={onAllAgendas}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                  allAgendasSelected && 'bg-blue-50 border-l-2 border-blue-500'
                )}
              >
                {/* Checkbox for all agendas */}
                <div className="flex items-center">
                  {allAgendasSelected ? (
                    <div className="w-5 h-5 rounded border border-blue-500 bg-blue-500 flex items-center justify-center shadow-sm">
                      <Check className="h-3 w-3 text-white font-bold" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-400 bg-white transition-colors shadow-sm" />
                  )}
                </div>

                {/* Gradient icon representing all agendas */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex-shrink-0 border-2 border-white shadow-sm" />

                <span className={cn(
                  'flex-1 text-left font-medium transition-colors',
                  allAgendasSelected ? 'text-blue-900 font-semibold' : 'text-gray-700'
                )}>
                  Todas las agendas
                </span>

                <span className={cn(
                  'text-xs px-2 py-1 rounded-full transition-colors',
                  allAgendasSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                )}>
                  {agendas.length}
                </span>
              </button>
            )}

            {/* Active agendas */}
            {activeAgendas.map(agenda => {
              const selected = isAgendaSelected(agenda.id)
              return (
                <AgendaRow
                  key={agenda.id}
                  agenda={agenda}
                  selected={selected}
                  allSelected={allAgendasSelected}
                  onToggle={() => onAgendaToggle(agenda.id)}
                  onEdit={() => onEditAgenda(agenda)}
                  onBlock={() => onBlockAgenda(agenda)}
                />
              )
            })}

            {/* Disabled agendas */}
            {disabledAgendas.length > 0 && (
              <>
                <p className="text-[10px] text-gray-400 uppercase px-4 pt-3 pb-1 tracking-wide">
                  Deshabilitadas
                </p>
                {disabledAgendas.map(agenda => (
                  <AgendaRow
                    key={agenda.id}
                    agenda={agenda}
                    selected={false}
                    allSelected={false}
                    disabled
                    onToggle={() => {}}
                    onEdit={() => onEditAgenda(agenda)}
                    onBlock={() => {}}
                  />
                ))}
              </>
            )}

            {/* Nueva agenda button */}
            <div className={cn('px-3 pt-2', agendas.length > 0 && 'border-t mt-1')}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm text-gray-600 hover:text-gray-900"
                onClick={onCreateAgenda}
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva agenda
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── AgendaRow ───────────────────────────────────────────────

interface AgendaRowProps {
  agenda: Agenda
  selected: boolean
  allSelected: boolean
  disabled?: boolean
  onToggle: () => void
  onEdit: () => void
  onBlock: () => void
}

function AgendaRow({
  agenda,
  selected,
  allSelected,
  disabled,
  onToggle,
  onEdit,
  onBlock,
}: AgendaRowProps) {
  const [hovered, setHovered] = useState(false)
  const isOn = !disabled && (allSelected || selected)

  // Show selection state clearly: all selected OR specifically selected
  const isSelected = !disabled && (!allSelected && selected)

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-4 py-2 transition-colors relative',
        !disabled && 'hover:bg-gray-50 cursor-pointer',
        disabled && 'opacity-50',
        // Enhanced selection styling
        isSelected && 'bg-blue-50 border-l-2 border-blue-500 ml-0',
        allSelected && !disabled && 'bg-gray-50/50'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox + Color dot + name (click to toggle) */}
      <button
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
        onClick={onToggle}
        disabled={disabled}
      >
        {/* Checkbox for agenda selection */}
        {!allSelected && !disabled && (
          <div className="flex items-center">
            {isSelected ? (
              <div className="w-5 h-5 rounded border border-blue-500 bg-blue-500 flex items-center justify-center shadow-sm">
                <Check className="h-3 w-3 text-white font-bold" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-400 bg-white transition-colors shadow-sm" />
            )}
          </div>
        )}

        {/* Enhanced color indicator with selection state */}
        <div className="relative">
          <span
            className={cn(
              'w-4 h-4 rounded-full flex-shrink-0 transition-all duration-200 border-2',
              isOn
                ? 'opacity-100 border-white shadow-sm'
                : 'opacity-40 border-gray-200'
            )}
            style={{ backgroundColor: agenda.color }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-sm truncate transition-colors',
            isOn
              ? isSelected
                ? 'font-semibold text-blue-900'
                : 'font-medium text-gray-900'
              : 'text-gray-400'
          )}>
            {agenda.name}
          </p>
          {agenda.doctorName && (
            <p className={cn(
              "text-[10px] truncate transition-colors",
              isSelected ? 'text-blue-600' : 'text-gray-400'
            )}>
              {agenda.doctorName}
            </p>
          )}
        </div>
      </button>

      {/* Action buttons (visible on hover) */}
      <div className={cn(
        'flex items-center gap-0.5 transition-opacity',
        hovered ? 'opacity-100' : 'opacity-0'
      )}>
        <button
          title="Editar agenda"
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        {!disabled && (
          <button
            title="Bloquear horario"
            onClick={e => { e.stopPropagation(); onBlock() }}
            className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <Ban className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
