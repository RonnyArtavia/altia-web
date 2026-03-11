/**
 * BlockScheduleDialog — Crear bloqueos de horario en agenda
 * RF-C01.3: Bloqueos tipo vacaciones, reuniones, feriados, recurrentes
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, Loader2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { createBlock } from '../services/agendaService'
import type { BlockType, ScheduleBlock } from '../types/agenda'

const DAY_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  'date-range': 'Rango de fechas (ej: vacaciones)',
  'day': 'Día de la semana (siempre)',
  'hours': 'Horas específicas en rango de fechas',
  'recurring': 'Recurrente semanal (horas fijas)',
}

interface BlockScheduleDialogProps {
  open: boolean
  onClose: () => void
  organizationId: string
  agendaId: string
  agendaName: string
  userId: string
  initialDate?: Date
  onBlocked?: () => void
  /** IDs de todas las agendas del mismo medico (para bloqueo multi-agenda) */
  doctorAgendaIds?: string[]
  doctorName?: string
}

export function BlockScheduleDialog({
  open,
  onClose,
  organizationId,
  agendaId,
  agendaName,
  userId,
  initialDate,
  onBlocked,
  doctorAgendaIds,
  doctorName,
}: BlockScheduleDialogProps) {
  const [blockType, setBlockType] = useState<BlockType>('date-range')
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate)
  const [endDate, setEndDate] = useState<Date | undefined>(initialDate)
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [blockAllAgendas, setBlockAllAgendas] = useState(false)

  const showScopeToggle = doctorAgendaIds && doctorAgendaIds.length > 1

  useEffect(() => {
    if (open) {
      setBlockType('date-range')
      setStartDate(initialDate)
      setEndDate(initialDate)
      setDayOfWeek(1)
      setStartTime('08:00')
      setEndTime('09:00')
      setReason('')
      setBlockAllAgendas(false)
    }
  }, [open, initialDate])

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error('Ingrese el motivo del bloqueo')
      return
    }

    // Validaciones por tipo
    if (blockType === 'date-range' || blockType === 'hours') {
      if (!startDate || !endDate) {
        toast.error('Seleccione las fechas de inicio y fin')
        return
      }
      if (startDate > endDate) {
        toast.error('La fecha de inicio debe ser antes de la fecha de fin')
        return
      }
    }

    if ((blockType === 'hours' || blockType === 'recurring') && startTime >= endTime) {
      toast.error('La hora de inicio debe ser antes de la hora de fin')
      return
    }

    const blockData: Omit<ScheduleBlock, 'id' | 'createdAt'> = {
      agendaId,
      type: blockType,
      reason: reason.trim(),
      createdBy: userId,
    }

    if (blockType === 'date-range' || blockType === 'hours') {
      blockData.startDate = startDate
      blockData.endDate = endDate
    }

    if (blockType === 'hours') {
      blockData.startTime = startTime
      blockData.endTime = endTime
    }

    if (blockType === 'day') {
      blockData.dayOfWeek = dayOfWeek
    }

    if (blockType === 'recurring') {
      blockData.dayOfWeek = dayOfWeek
      blockData.startTime = startTime
      blockData.endTime = endTime
      blockData.recurrence = 'weekly'
    }

    setIsSubmitting(true)
    try {
      const targetIds = blockAllAgendas && doctorAgendaIds ? doctorAgendaIds : [agendaId]
      await Promise.all(
        targetIds.map(id => createBlock(organizationId, id, { ...blockData, agendaId: id }))
      )
      toast.success(targetIds.length > 1
        ? `Bloqueo creado en ${targetIds.length} agendas`
        : 'Bloqueo de horario creado'
      )
      onBlocked?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear el bloqueo')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold">
            Bloquear horario
          </DialogTitle>
          <p className="text-sm text-gray-500">Agenda: <span className="font-medium text-gray-700">{agendaName}</span></p>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4">
          {/* Alcance: esta agenda o todas las del medico */}
          {showScopeToggle && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <div className="text-sm">
                <p className="font-medium text-gray-700">
                  {blockAllAgendas
                    ? `Todas las agendas de ${doctorName || 'este médico'}`
                    : 'Solo esta agenda'}
                </p>
                <p className="text-xs text-gray-500">
                  {blockAllAgendas
                    ? `${doctorAgendaIds!.length} agendas serán bloqueadas`
                    : agendaName}
                </p>
              </div>
              <Switch checked={blockAllAgendas} onCheckedChange={setBlockAllAgendas} />
            </div>
          )}

          {/* Tipo de bloqueo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipo de bloqueo</Label>
            <Select value={blockType} onValueChange={v => setBlockType(v as BlockType)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(([type, label]) => (
                  <SelectItem key={type} value={type} className="text-sm">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de fechas */}
          {(blockType === 'date-range' || blockType === 'hours') && (
            <div className="grid grid-cols-2 gap-3">
              <DatePickerField
                label="Fecha inicio"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerField
                label="Fecha fin"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          )}

          {/* Día de la semana */}
          {(blockType === 'day' || blockType === 'recurring') && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Día de la semana</Label>
              <Select value={String(dayOfWeek)} onValueChange={v => setDayOfWeek(Number(v))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Horario específico */}
          {(blockType === 'hours' || blockType === 'recurring') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Hora inicio</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Hora fin</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label htmlFor="block-reason" className="text-sm font-medium">
              Motivo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="block-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ej: Vacaciones, Reunión mensual, Feriado…"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 mt-2 border-t gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bloquear horario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DatePickerField (helper interno) ────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: Date
  onChange: (d: Date | undefined) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn('w-full justify-start text-left h-9 text-sm font-normal', !value && 'text-gray-400')}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50" />
            {value ? format(value, 'dd/MM/yyyy') : 'Seleccionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={d => { onChange(d); setOpen(false) }}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
