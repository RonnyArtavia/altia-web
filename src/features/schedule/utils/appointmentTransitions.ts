/**
 * Appointment Transitions — Reglas de transición de estado por rol
 * RF-A04: Secretaria y médico tienen transiciones permitidas diferentes
 */

export const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  scheduled: {
    label: 'Programada',
    color: 'text-blue-700',
    bgColor: 'bg-blue-500/10',
  },
  waiting: {
    label: 'En espera',
    color: 'text-amber-700',
    bgColor: 'bg-amber-500/10',
  },
  'in-progress': {
    label: 'En atención',
    color: 'text-green-700',
    bgColor: 'bg-green-500/10',
  },
  completed: {
    label: 'Finalizada',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  cancelled: {
    label: 'Cancelada',
    color: 'text-red-700',
    bgColor: 'bg-red-500/10',
  },
}

// Transiciones permitidas por rol
const TRANSITIONS: Record<string, Record<string, string[]>> = {
  secretary: {
    scheduled: ['waiting', 'cancelled'],
    waiting: ['scheduled', 'cancelled'],
  },
  doctor: {
    waiting: ['in-progress'],
    'in-progress': ['completed'],
  },
}

/**
 * Devuelve los estados a los que puede transicionar según rol actual
 */
export function getAllowedTransitions(currentStatus: string, role: string): string[] {
  return TRANSITIONS[role]?.[currentStatus] ?? []
}

/**
 * Verifica si una transición específica está permitida para el rol
 */
export function canTransition(from: string, to: string, role: string): boolean {
  const allowed = getAllowedTransitions(from, role)
  return allowed.includes(to)
}

/**
 * Retorna el campo de timestamp de auditoría para el nuevo estado
 */
export function getTransitionTimestampField(
  status: string
): 'waitingAt' | 'inProgressAt' | 'completedAt' | 'cancelledAt' | null {
  switch (status) {
    case 'waiting':
      return 'waitingAt'
    case 'in-progress':
      return 'inProgressAt'
    case 'completed':
      return 'completedAt'
    case 'cancelled':
      return 'cancelledAt'
    default:
      return null
  }
}
