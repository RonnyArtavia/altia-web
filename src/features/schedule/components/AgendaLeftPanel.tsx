/**
 * AgendaLeftPanel — Panel izquierdo estilo Outlook Calendar
 * RF-02: Filtro de médicos (asistente)
 * RF-03: Filtro de agendas dependiente de médicos seleccionados
 * RF-04: Gestión de agendas (crear, editar, bloquear, eliminar)
 */

import { useState } from 'react'
import { Plus, Pencil, Ban, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

  return (
    <div className="w-64 flex-shrink-0 border-r bg-white flex flex-col overflow-y-auto select-none">

      {/* ── Médicos ────────────────────────────────────────── */}
      {isSecretary && doctors.length > 0 && (
        <section className="border-b">
          {/* Section header */}
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 transition-colors"
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
                  'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                  allDoctorsSelected && 'bg-blue-50'
                )}
              >
                <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-gray-500">
                  T
                </span>
                <span className={cn('flex-1 text-left font-medium', allDoctorsSelected ? 'text-blue-700' : 'text-gray-700')}>
                  Todos
                </span>
                {allDoctorsSelected && <Check className="h-3.5 w-3.5 text-blue-500" />}
              </button>

              {/* Individual doctors */}
              {doctors.map(doctor => {
                const selected = isDoctorSelected(doctor.uid)
                return (
                  <button
                    key={doctor.uid}
                    onClick={() => onDoctorToggle(doctor.uid)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-gray-50',
                      !allDoctorsSelected && selected && 'bg-blue-50'
                    )}
                  >
                    {/* Avatar initials */}
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-blue-700">
                      {doctor.displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 text-left min-w-0">
                      <p className={cn('font-medium truncate', selected ? 'text-gray-900' : 'text-gray-400')}>
                        {doctor.displayName}
                      </p>
                      {doctor.specialty && (
                        <p className="text-[10px] text-gray-400 truncate">{doctor.specialty}</p>
                      )}
                    </div>
                    {/* Checkmark when explicitly selected (not in "todos" mode) */}
                    {!allDoctorsSelected && selected && (
                      <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    )}
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
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50 transition-colors"
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

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-4 py-2 transition-colors',
        !disabled && 'hover:bg-gray-50 cursor-pointer',
        disabled && 'opacity-50',
        !allSelected && selected && 'bg-blue-50'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Color dot + name (click to toggle) */}
      <button
        className="flex items-center gap-2 flex-1 min-w-0 text-left"
        onClick={onToggle}
        disabled={disabled}
      >
        {/* Color indicator */}
        <span
          className={cn(
            'w-3 h-3 rounded-full flex-shrink-0 transition-opacity',
            !isOn && 'opacity-30'
          )}
          style={{ backgroundColor: agenda.color }}
        />
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-sm truncate',
            isOn ? 'font-medium text-gray-900' : 'text-gray-400'
          )}>
            {agenda.name}
          </p>
          {agenda.doctorName && (
            <p className="text-[10px] text-gray-400 truncate">{agenda.doctorName}</p>
          )}
        </div>
      </button>

      {/* Action buttons (visible on hover) */}
      <div className={cn(
        'flex items-center gap-0.5 flex-shrink-0 transition-opacity',
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
