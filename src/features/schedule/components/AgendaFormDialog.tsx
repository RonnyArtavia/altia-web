/**
 * AgendaFormDialog — Crear/editar agenda
 * RF-C01.1: CRUD de agendas con horario semanal y validación anti-traslape
 */

import { useState, useEffect } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAgendaMutations } from '../hooks/useAgendas'
import { countFutureAppointmentsByAgenda } from '../services/appointmentService'
import type { Agenda, DayKey, DaySchedule, Currency } from '../types/agenda'
import {
  DAY_LABELS,
  DAY_ORDER,
  DEFAULT_AGENDA_COLORS,
  EMPTY_SCHEDULE,
  CURRENCY_OPTIONS,
} from '../types/agenda'
import type { DoctorOption } from '../hooks/useDoctors'

interface AgendaFormDialogProps {
  open: boolean
  onClose: () => void
  organizationId: string
  doctorId: string
  doctorName: string
  editAgenda?: Agenda | null
  onSaved?: (agendaId: string) => void
  // Secretary-only props
  isSecretary?: boolean
  doctors?: DoctorOption[]
}

export function AgendaFormDialog({
  open,
  onClose,
  organizationId,
  doctorId,
  doctorName,
  editAgenda,
  onSaved,
  isSecretary,
  doctors,
}: AgendaFormDialogProps) {
  const isEdit = !!editAgenda
  const showDoctorSelector = isSecretary && !!doctors && doctors.length > 0

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [defaultDuration, setDefaultDuration] = useState(30)
  const [slotDuration, setSlotDuration] = useState(30)
  const [bufferMinutes, setBufferMinutes] = useState(0)
  const [color, setColor] = useState(DEFAULT_AGENDA_COLORS[0])
  const [enabled, setEnabled] = useState(true)
  const [schedule, setSchedule] = useState<Record<DayKey, DaySchedule>>(EMPTY_SCHEDULE)
  const [consultationFee, setConsultationFee] = useState<number>(0)
  const [currency, setCurrency] = useState<Currency>('USD')

  console.log('AgendaFormDialog rendered with consultationFee:', consultationFee, 'currency:', currency)

  const { create, update, remove, checkOverlap, isSubmitting } = useAgendaMutations(organizationId)

  // Rellenar formulario en modo edición / creación
  useEffect(() => {
    if (!open) return
    if (editAgenda) {
      setSelectedDoctorId(editAgenda.doctorId || doctorId)
      setName(editAgenda.name)
      setLocation(editAgenda.location)
      setDefaultDuration(editAgenda.defaultDuration)
      setSlotDuration(editAgenda.slotDuration || 30)
      setBufferMinutes(editAgenda.bufferMinutes)
      setColor(editAgenda.color)
      setEnabled(editAgenda.enabled)
      setSchedule(editAgenda.schedule)
      setConsultationFee(editAgenda.consultationFee || 0)
      setCurrency(editAgenda.currency || 'USD')
    } else {
      setSelectedDoctorId(showDoctorSelector && doctors!.length > 0 ? doctors![0].uid : doctorId)
      setName('')
      setLocation('')
      setDefaultDuration(30)
      setSlotDuration(30)
      setBufferMinutes(0)
      setColor(DEFAULT_AGENDA_COLORS[0])
      setEnabled(true)
      setSchedule(EMPTY_SCHEDULE)
      setConsultationFee(0)
      setCurrency('USD')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editAgenda, open])

  // Si doctors carga despues de abrir el dialog, pre-seleccionar el primero
  useEffect(() => {
    if (open && !editAgenda && !selectedDoctorId && showDoctorSelector && doctors!.length > 0) {
      setSelectedDoctorId(doctors![0].uid)
    }
  }, [open, editAgenda, selectedDoctorId, showDoctorSelector, doctors])

  const updateDay = (day: DayKey, field: keyof DaySchedule, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre de la agenda es requerido')
      return
    }

    // Validar horarios: start < end en días habilitados
    for (const day of DAY_ORDER) {
      const d = schedule[day]
      if (d.enabled && d.start >= d.end) {
        toast.error(`${DAY_LABELS[day]}: la hora de inicio debe ser antes de la hora de cierre`)
        return
      }
    }

    // Resolve effective doctor
    const effectiveDoctorId = showDoctorSelector ? selectedDoctorId : doctorId
    const effectiveDoctorName = showDoctorSelector
      ? (doctors!.find(d => d.uid === selectedDoctorId)?.displayName ?? doctorName)
      : doctorName

    if (!effectiveDoctorId) {
      toast.error('Selecciona un médico')
      return
    }

    // Validación anti-traslape
    try {
      const { overlaps, conflictingAgenda } = await checkOverlap(
        schedule,
        effectiveDoctorId,
        isEdit ? editAgenda!.id : undefined
      )
      if (overlaps) {
        toast.error(`Traslape de horario con agenda "${conflictingAgenda}"`)
        return
      }
    } catch {
      // Si falla la validación, continuar (no bloquear)
    }

    const data = {
      name: name.trim(),
      doctorId: effectiveDoctorId,
      doctorName: effectiveDoctorName,
      location: location.trim(),
      defaultDuration,
      slotDuration,
      bufferMinutes,
      color,
      enabled,
      schedule,
      organizationId,
      consultationFee: consultationFee > 0 ? consultationFee : undefined,
      currency: consultationFee > 0 ? currency : undefined,
    }

    try {
      if (isEdit) {
        await update(editAgenda!.id, data)
        toast.success('Agenda actualizada')
        onSaved?.(editAgenda!.id)
      } else {
        const id = await create(data)
        toast.success('Agenda creada')
        onSaved?.(id)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar la agenda')
    }
  }

  const handleDelete = async () => {
    if (!editAgenda) return

    // RN-05: no eliminar si hay citas futuras activas
    try {
      const effectiveDoctorId = showDoctorSelector ? selectedDoctorId : doctorId
      const futureCount = await countFutureAppointmentsByAgenda(
        editAgenda.id,
        effectiveDoctorId,
        organizationId
      )
      if (futureCount > 0) {
        toast.error(
          `Esta agenda tiene ${futureCount} cita${futureCount > 1 ? 's' : ''} futura${futureCount > 1 ? 's' : ''} activa${futureCount > 1 ? 's' : ''}. Cancélalas o muévelas antes de eliminar la agenda.`
        )
        return
      }
    } catch {
      // Si falla la consulta, igual pedimos confirmación
    }

    if (!confirm(`¿Eliminar la agenda "${editAgenda.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await remove(editAgenda.id)
      toast.success('Agenda eliminada')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-base font-semibold">
            {isEdit ? 'Editar agenda' : 'Nueva agenda'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-5 pb-2">
          {/* Doctor selector (secretary only) */}
          {showDoctorSelector && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Médico <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar médico…" />
                </SelectTrigger>
                <SelectContent>
                  {doctors!.map(d => (
                    <SelectItem key={d.uid} value={d.uid}>
                      {d.displayName}
                      {d.specialty && <span className="text-gray-400 ml-1">· {d.specialty}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="agenda-name" className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agenda-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Consulta General, Urgencias…"
              className="h-9"
            />
          </div>

          {/* Ubicación */}
          <div className="space-y-1.5">
            <Label htmlFor="agenda-location" className="text-sm font-medium">
              Ubicación / Consultorio
            </Label>
            <Input
              id="agenda-location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Ej: Consultorio 2, Piso 3"
              className="h-9"
            />
          </div>

          {/* Costo de consulta */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Costo de consulta</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={currency} onValueChange={(value: Currency) => setCurrency(value)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCY_OPTIONS).map(([key, option]) => (
                      <SelectItem key={key} value={key}>
                        {option.symbol} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2]">
                <Input
                  type="number"
                  min={0}
                  step={currency === 'USD' ? "0.01" : "1"}
                  placeholder={currency === 'USD' ? "0.00" : "0"}
                  value={consultationFee || ''}
                  onChange={e => setConsultationFee(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Deja en 0 para usar el costo del perfil del médico
            </p>
          </div>

          {/* Duración, intervalos y buffer */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Duración default (min)</Label>
              <Input
                type="number"
                min={5}
                max={120}
                step={5}
                value={defaultDuration}
                onChange={e => setDefaultDuration(Number(e.target.value))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Intervalos disponibles (min)</Label>
              <Select value={String(slotDuration)} onValueChange={v => setSlotDuration(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Buffer entre citas (min)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                step={5}
                value={bufferMinutes}
                onChange={e => setBufferMinutes(Number(e.target.value))}
                className="h-9"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Color de identificación</Label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_AGENDA_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Habilitada */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Agenda habilitada</p>
              <p className="text-xs text-gray-400">
                {enabled ? 'Se permiten nuevas citas' : 'No se crearán nuevas citas'}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Separator />

          {/* Horario semanal */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">Horario de atención</p>
            {DAY_ORDER.map(day => {
              const d = schedule[day]
              return (
                <div key={day} className="flex items-center gap-3">
                  {/* Toggle día */}
                  <Switch
                    checked={d.enabled}
                    onCheckedChange={v => updateDay(day, 'enabled', v)}
                  />

                  {/* Nombre del día */}
                  <span
                    className={cn(
                      'w-24 text-sm',
                      d.enabled ? 'text-gray-900 font-medium' : 'text-gray-400'
                    )}
                  >
                    {DAY_LABELS[day]}
                  </span>

                  {/* Horario */}
                  {d.enabled ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        type="time"
                        value={d.start}
                        onChange={e => updateDay(day, 'start', e.target.value)}
                        className="h-8 w-28 text-sm"
                      />
                      <span className="text-gray-400 text-sm">–</span>
                      <Input
                        type="time"
                        value={d.end}
                        onChange={e => updateDay(day, 'end', e.target.value)}
                        className="h-8 w-28 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Cerrado</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 mt-4 border-t flex-row gap-2 justify-between">
          {isEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Eliminar
            </Button>
          )}
          <div className={cn('flex gap-2', !isEdit && 'ml-auto')}>
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Crear agenda'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
