/**
 * Agenda types — RF-C01
 * Una agenda representa un horario de atención de un médico en una ubicación
 */

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface DaySchedule {
  enabled: boolean
  start: string   // 'HH:mm'
  end: string     // 'HH:mm'
}

export interface Agenda {
  id: string
  name: string
  doctorId: string
  doctorName: string
  location: string
  defaultDuration: number   // minutos
  bufferMinutes: number     // tiempo entre citas
  schedule: Record<DayKey, DaySchedule>
  color: string             // hex, ej: '#3B82F6'
  enabled: boolean
  organizationId: string
  createdAt: Date
  updatedAt: Date
}

export type BlockType = 'date-range' | 'day' | 'hours' | 'recurring'

export interface ScheduleBlock {
  id: string
  agendaId: string
  type: BlockType
  startDate?: Date
  endDate?: Date
  dayOfWeek?: number        // 0=domingo, 1=lunes … 6=sábado
  startTime?: string        // 'HH:mm'
  endTime?: string          // 'HH:mm'
  reason: string
  recurrence?: 'weekly' | 'monthly' | 'none'
  createdBy: string
  createdAt: Date
}

export const DAY_LABELS: Record<DayKey, string> = {
  monday:    'Lunes',
  tuesday:   'Martes',
  wednesday: 'Miércoles',
  thursday:  'Jueves',
  friday:    'Viernes',
  saturday:  'Sábado',
  sunday:    'Domingo',
}

export const DAY_ORDER: DayKey[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]

export const DEFAULT_AGENDA_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F59E0B', // amber
  '#EF4444', // red
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

export const EMPTY_SCHEDULE: Record<DayKey, DaySchedule> = {
  monday:    { enabled: true,  start: '08:00', end: '17:00' },
  tuesday:   { enabled: true,  start: '08:00', end: '17:00' },
  wednesday: { enabled: true,  start: '08:00', end: '17:00' },
  thursday:  { enabled: true,  start: '08:00', end: '17:00' },
  friday:    { enabled: true,  start: '08:00', end: '17:00' },
  saturday:  { enabled: false, start: '08:00', end: '12:00' },
  sunday:    { enabled: false, start: '08:00', end: '12:00' },
}
