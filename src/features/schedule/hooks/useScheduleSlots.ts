/**
 * useScheduleSlots Hook - Generate time slots for schedule management
 * Provides schedule configuration and slot generation functionality
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/features/auth/stores/authStore'

interface ScheduleSlots {
  start: string
  end: string
  slotDuration: number
  breakStart?: string
  breakEnd?: string
  breaks?: Array<{ start: string; end: string }>
}

interface TimeSlot {
  time: string
  available: boolean
  inBreak: boolean
}

/**
 * Hook to get schedule for a specific day
 * For now, uses a default schedule - can be extended to use actual doctor schedule configuration
 */
export function useScheduleForDay(doctorId: string, organizationId: string, date: Date) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Default schedule configuration (8 AM to 6 PM, 30-minute slots, lunch break 12-1 PM)
  const daySchedule: ScheduleSlots = useMemo(() => ({
    start: '08:00',
    end: '18:00',
    slotDuration: 30,
    breakStart: '12:00',
    breakEnd: '13:00',
    breaks: [{ start: '12:00', end: '13:00' }]
  }), [])

  return {
    daySchedule,
    loading,
    error
  }
}

/**
 * Generate time slots for a specific day based on schedule configuration
 */
export function generateTimeSlotsFromConfig(schedule: ScheduleSlots): string[] {
  const slots: string[] = []
  const slotDuration = schedule.slotDuration || 30

  const [startHour, startMinute] = schedule.start.split(':').map(Number)
  const [endHour, endMinute] = schedule.end.split(':').map(Number)

  const startTimeInMinutes = startHour * 60 + startMinute
  const endTimeInMinutes = endHour * 60 + endMinute

  for (let time = startTimeInMinutes; time < endTimeInMinutes; time += slotDuration) {
    const hour = Math.floor(time / 60)
    const minute = time % 60

    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    slots.push(timeString)
  }

  return slots
}

/**
 * Generate all day time slots (12 AM to 11:30 PM) with availability status
 */
export function generateAllDayTimeSlots(schedule: ScheduleSlots | null, slotDuration: number = 30): TimeSlot[] {
  const slots: TimeSlot[] = []

  for (let time = 0; time < 24 * 60; time += slotDuration) {
    const hour = Math.floor(time / 60)
    const minute = time % 60
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

    let available = false
    let inBreak = false

    if (schedule) {
      const [startHour, startMinute] = schedule.start.split(':').map(Number)
      const [endHour, endMinute] = schedule.end.split(':').map(Number)

      const startTimeInMinutes = startHour * 60 + startMinute
      const endTimeInMinutes = endHour * 60 + endMinute

      available = time >= startTimeInMinutes && time < endTimeInMinutes

      if (available && schedule.breakStart && schedule.breakEnd) {
        inBreak = isInBreakTime(timeString, schedule)
        if (inBreak) available = false
      }
    }

    slots.push({
      time: timeString,
      available,
      inBreak
    })
  }

  return slots
}

/**
 * Check if a time slot is within break time
 */
export function isInBreakTime(timeSlot: string, schedule: ScheduleSlots): boolean {
  if (!schedule.breakStart || !schedule.breakEnd) {
    return false
  }

  const [slotHour, slotMinute] = timeSlot.split(':').map(Number)
  const slotTime = slotHour * 60 + slotMinute

  const [breakStartHour, breakStartMinute] = schedule.breakStart.split(':').map(Number)
  const breakStartTime = breakStartHour * 60 + breakStartMinute

  const [breakEndHour, breakEndMinute] = schedule.breakEnd.split(':').map(Number)
  const breakEndTime = breakEndHour * 60 + breakEndMinute

  return slotTime >= breakStartTime && slotTime < breakEndTime
}

/**
 * Helper function to calculate GCD (Greatest Common Divisor)
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * Helper function to calculate GCD of multiple numbers
 */
function gcdMultiple(numbers: number[]): number {
  return numbers.reduce(gcd)
}

/**
 * Calculate optimal slot duration based on all agendas' slotDuration
 * This ensures we can display all possible appointment times correctly
 */
function calculateOptimalSlotDuration(agendas: any[]): number {
  if (agendas.length === 0) return 30 // Default

  const slotDurations = agendas
    .filter(agenda => agenda.enabled && agenda.slotDuration)
    .map(agenda => agenda.slotDuration)

  if (slotDurations.length === 0) return 30 // Default

  // Find GCD of all slot durations to get the finest granularity
  const optimalDuration = gcdMultiple(slotDurations)

  console.log('🔧 calculateOptimalSlotDuration - Input durations:', slotDurations, 'Optimal:', optimalDuration)

  // Ensure minimum 5 minutes and maximum 60 minutes
  return Math.max(5, Math.min(60, optimalDuration))
}

/**
 * Hook to get all unique time slots for a week and per-day schedules
 * Now uses actual agendas with proper slot duration calculation
 */
export function useWeekTimeSlots(doctorId: string, organizationId: string, startDate: Date, agendas: any[] = []) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const { timeSlots, daySchedules } = useMemo(() => {
    console.log('🔧 useWeekTimeSlots - Processing agendas:', agendas)

    const allTimeSlots = new Set<string>()
    const daySchedules: { [key: string]: ScheduleSlots | null } = {}

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      return date
    })

    // If no agendas, return empty schedules
    if (agendas.length === 0) {
      console.log('🔧 No agendas found, returning empty schedules')
      weekDays.forEach(day => {
        const dayKey = day.toISOString().split('T')[0]
        daySchedules[dayKey] = null
      })
      return {
        timeSlots: [],
        daySchedules
      }
    }

    // Calculate optimal slot duration based on all agendas
    const optimalSlotDuration = calculateOptimalSlotDuration(agendas)

    weekDays.forEach(day => {
      const dayKey = day.toISOString().split('T')[0] // YYYY-MM-DD format
      const dayOfWeek = day.getDay()

      // Convert day of week: Sunday = 0 -> sunday, Monday = 1 -> monday, etc.
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const dayName = dayNames[dayOfWeek]

      // Find the earliest start time and latest end time from all enabled agendas for this day
      let earliestStart: string | null = null
      let latestEnd: string | null = null
      let hasScheduleForDay = false

      agendas.forEach(agenda => {
        console.log(`🔧 Checking agenda for ${dayName}:`, {
          agendaName: agenda.name,
          enabled: agenda.enabled,
          slotDuration: agenda.slotDuration,
          hasSchedule: !!agenda.schedule,
          daySchedule: agenda.schedule?.[dayName]
        })

        if (!agenda.enabled || !agenda.schedule?.[dayName]?.enabled) return

        const daySchedule = agenda.schedule[dayName]
        hasScheduleForDay = true

        console.log(`🔧 Found valid schedule for ${dayName}:`, daySchedule)

        if (!earliestStart || daySchedule.start < earliestStart) {
          earliestStart = daySchedule.start
        }
        if (!latestEnd || daySchedule.end > latestEnd) {
          latestEnd = daySchedule.end
        }
      })

      if (hasScheduleForDay && earliestStart && latestEnd) {
        const scheduleConfig: ScheduleSlots = {
          start: earliestStart,
          end: latestEnd,
          slotDuration: optimalSlotDuration, // Use calculated optimal slot duration
          // No breaks by default - can be extended later
        }

        daySchedules[dayKey] = scheduleConfig
        const slots = generateTimeSlotsFromConfig(scheduleConfig)
        slots.forEach(slot => allTimeSlots.add(slot))

        console.log(`🔧 Generated ${slots.length} slots for ${dayName} with ${optimalSlotDuration}min duration`)
      } else {
        daySchedules[dayKey] = null
      }
    })

    return {
      timeSlots: Array.from(allTimeSlots).sort(),
      daySchedules
    }
  }, [startDate, agendas])

  return {
    timeSlots,
    daySchedules,
    loading,
    error
  }
}

/**
 * Helper function to get schedule for a specific day from day schedules
 */
export function getDayScheduleFromWeek(daySchedules: { [key: string]: ScheduleSlots | null }, date: Date): ScheduleSlots | null {
  const dayKey = date.toISOString().split('T')[0] // YYYY-MM-DD format
  return daySchedules[dayKey] || null
}

/**
 * Generate doctor time slots for a specific doctor
 */
export function useDoctor(options: { doctorId: string; organizationId: string; enabled?: boolean }) {
  const { userData } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Mock doctor data with schedule
  const doctor = useMemo(() => {
    if (!options.enabled) return null

    return {
      id: options.doctorId,
      name: userData?.name || 'Usuario',
      specialization: 'Medicina General',
      schedule: {
        monday: { start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        tuesday: { start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        wednesday: { start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        thursday: { start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
        friday: { start: '08:00', end: '18:00', breakStart: '12:00', breakEnd: '13:00' },
      }
    }
  }, [options.doctorId, options.enabled, userData?.name])

  return {
    doctor,
    loading,
    error
  }
}

/**
 * Generate time slots based on basic configuration
 */
export function generateTimeSlots(
  startTime: string = '08:00',
  endTime: string = '18:00',
  slotDuration: number = 30
): string[] {
  const slots: string[] = []

  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  const startTimeInMinutes = startHour * 60 + startMinute
  const endTimeInMinutes = endHour * 60 + endMinute

  for (let time = startTimeInMinutes; time < endTimeInMinutes; time += slotDuration) {
    const hour = Math.floor(time / 60)
    const minute = time % 60

    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    slots.push(timeString)
  }

  return slots
}