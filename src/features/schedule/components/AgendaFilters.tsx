/**
 * AgendaFilters — Selector multi-médico + multi-agenda
 * RF-C01.1: El asistente puede ver todos los médicos o filtrar por uno o más
 * RF-C01.2: Filtro de vistas por agenda
 */

import { useState } from 'react'
import { Check, ChevronDown, Eye, EyeOff, Stethoscope } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Agenda } from '../types/agenda'
import type { DoctorOption } from '../hooks/useDoctors'

interface AgendaFiltersProps {
  agendas: Agenda[]
  selectedAgendaIds: string[]
  onFilterChange: (agendaIds: string[]) => void
  // Secretary-only props
  doctors?: DoctorOption[]
  selectedDoctorIds?: string[]
  onDoctorFilterChange?: (doctorIds: string[]) => void
  className?: string
}

export function AgendaFilters({
  agendas,
  selectedAgendaIds,
  onFilterChange,
  doctors,
  selectedDoctorIds = [],
  onDoctorFilterChange,
  className,
}: AgendaFiltersProps) {
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [doctorOpen, setDoctorOpen] = useState(false)

  const showDoctors = !!doctors && doctors.length > 0 && !!onDoctorFilterChange

  // ─── Doctor helpers ──────────────────────────────────────────
  const allDoctorsSelected = selectedDoctorIds.length === 0
  const doctorLabel = allDoctorsSelected
    ? `Todos los médicos (${doctors?.length ?? 0})`
    : selectedDoctorIds.length === 1
      ? doctors?.find(d => d.uid === selectedDoctorIds[0])?.displayName ?? 'Médico'
      : `${selectedDoctorIds.length} médicos`

  const toggleDoctor = (uid: string) => {
    if (!onDoctorFilterChange) return
    if (selectedDoctorIds.includes(uid)) {
      onDoctorFilterChange(selectedDoctorIds.filter(id => id !== uid))
    } else {
      onDoctorFilterChange([...selectedDoctorIds, uid])
    }
  }

  // ─── Agenda helpers ──────────────────────────────────────────
  const allAgendasSelected = selectedAgendaIds.length === 0
  const activeAgendas = agendas.filter(a => a.enabled)
  const visibleIds = selectedAgendaIds.length === 0 ? agendas.map(a => a.id) : selectedAgendaIds

  const toggleAgenda = (agendaId: string) => {
    if (selectedAgendaIds.includes(agendaId)) {
      onFilterChange(selectedAgendaIds.filter(id => id !== agendaId))
    } else {
      onFilterChange([...selectedAgendaIds, agendaId])
    }
  }

  const agendaLabel = allAgendasSelected
    ? `Todas las agendas (${agendas.length})`
    : selectedAgendaIds.length === 1
      ? agendas.find(a => a.id === selectedAgendaIds[0])?.name ?? 'Agenda'
      : `${selectedAgendaIds.length} agendas`

  if (!showDoctors && agendas.length === 0) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>

      {/* ── Doctor multi-select (secretary only) ── */}
      {showDoctors && (
        <Popover open={doctorOpen} onOpenChange={setDoctorOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 max-w-[200px]"
            >
              <Stethoscope className="h-3 w-3 flex-shrink-0 opacity-60" />
              <span className="truncate">{doctorLabel}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-2">
            {/* Quick actions */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => onDoctorFilterChange!([])}
                className={cn(
                  'flex-1 text-xs px-2 py-1 rounded-md transition-colors',
                  allDoctorsSelected
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                Todos
              </button>
              <button
                onClick={() => onDoctorFilterChange!(doctors!.map(d => d.uid))}
                className="flex-1 text-xs px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Ninguno
              </button>
            </div>

            <div className="space-y-0.5">
              {doctors!.map(doctor => {
                const isSelected = allDoctorsSelected || selectedDoctorIds.includes(doctor.uid)
                return (
                  <button
                    key={doctor.uid}
                    onClick={() => toggleDoctor(doctor.uid)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-gray-50"
                  >
                    {/* Avatar initials */}
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-blue-700">
                        {doctor.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doctor.displayName}
                      </p>
                      {doctor.specialty && (
                        <p className="text-xs text-gray-400 truncate">{doctor.specialty}</p>
                      )}
                    </div>

                    {isSelected
                      ? <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      : <Eye className="h-3.5 w-3.5 text-gray-200 flex-shrink-0" />
                    }
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* ── Agenda color dots (quick toggle) ── */}
      {agendas.length > 0 && (
        <div className="flex items-center gap-1.5">
          {activeAgendas.slice(0, 4).map(agenda => {
            const isVisible = visibleIds.includes(agenda.id)
            const isSelected = selectedAgendaIds.length > 0 && selectedAgendaIds.includes(agenda.id)
            return (
              <button
                key={agenda.id}
                title={`${agenda.name} ${isSelected ? '(Seleccionada)' : isVisible ? '(Visible)' : '(Oculta)'}`}
                onClick={() => toggleAgenda(agenda.id)}
                className={cn(
                  'relative w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-110',
                  // Enhanced visual states
                  isVisible
                    ? isSelected
                      ? 'border-blue-400 shadow-md ring-2 ring-blue-200' // Selected agenda
                      : 'border-white shadow-sm' // Visible but not specifically selected (when all selected)
                    : 'border-gray-300 opacity-40 hover:opacity-70' // Not visible
                )}
                style={{ backgroundColor: agenda.color }}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-white" />
                  </div>
                )}
              </button>
            )
          })}
          {activeAgendas.length > 4 && (
            <span className="text-xs text-gray-400 ml-1">+{activeAgendas.length - 4}</span>
          )}
        </div>
      )}

      {/* ── Agenda multi-select dropdown ── */}
      {agendas.length > 0 && (
        <Popover open={agendaOpen} onOpenChange={setAgendaOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 max-w-[180px]"
            >
              <span className="truncate">{agendaLabel}</span>
              <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-64 p-2">
            {/* Quick actions */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => onFilterChange([])}
                className={cn(
                  'flex-1 text-xs px-2 py-1 rounded-md transition-colors',
                  allAgendasSelected
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                Todas
              </button>
              <button
                onClick={() => onFilterChange(agendas.map(a => a.id))}
                className="flex-1 text-xs px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Ninguna
              </button>
            </div>

            <div className="space-y-0.5">
              {agendas.map(agenda => {
                const isVisible = visibleIds.includes(agenda.id)
                const isSelected = selectedAgendaIds.length > 0 && selectedAgendaIds.includes(agenda.id)
                return (
                  <button
                    key={agenda.id}
                    onClick={() => toggleAgenda(agenda.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                      'hover:bg-gray-50 active:bg-gray-100',
                      !agenda.enabled && 'opacity-50',
                      // Highlight selected agendas
                      isSelected && 'bg-blue-50 border border-blue-200'
                    )}
                  >
                    <div className="relative">
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full flex-shrink-0 border-2 transition-all",
                          isVisible
                            ? isSelected
                              ? 'border-blue-400 ring-1 ring-blue-200'
                              : 'border-white shadow-sm'
                            : 'border-gray-200 opacity-40'
                        )}
                        style={{ backgroundColor: agenda.color }}
                      />
                      {isSelected && (
                        <Check className="absolute -top-0.5 -right-0.5 h-3 w-3 text-blue-600 bg-white rounded-full" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? 'text-blue-900' : 'text-gray-900'
                      )}>
                        {agenda.name}
                      </p>
                      <p className={cn(
                        "text-xs truncate",
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      )}>
                        {agenda.doctorName}
                        {agenda.location && ` · ${agenda.location}`}
                      </p>
                    </div>

                    {!agenda.enabled ? (
                      <EyeOff className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                    ) : isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-blue-600" />
                      </div>
                    ) : isVisible ? (
                      <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0">
                        <Eye className="h-3 w-3 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <EyeOff className="h-3 w-3 text-gray-300" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {agendas.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">
                No hay agendas configuradas
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
