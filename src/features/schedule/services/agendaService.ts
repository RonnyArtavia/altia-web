/**
 * Agenda Service — RF-C01
 * CRUD para agendas de médicos + validación anti-traslape
 * Colección: organizations/{orgId}/agendas
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type { Agenda, DayKey, ScheduleBlock, DaySchedule } from '../types/agenda'
import { EMPTY_SCHEDULE } from '../types/agenda'

// ─── Converters ─────────────────────────────────────────────

function toAgenda(snap: DocumentSnapshot): Agenda | null {
  if (!snap.exists()) return null
  const d = snap.data()!
  const toDate = (ts: any): Date =>
    ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts || 0)

  return {
    id: snap.id,
    name: d.name || '',
    doctorId: d.doctorId || '',
    doctorName: d.doctorName || '',
    location: d.location || '',
    defaultDuration: d.defaultDuration ?? 30,
    slotDuration: d.slotDuration ?? 30, // Default 30 minutos para agendas existentes
    bufferMinutes: d.bufferMinutes ?? 0,
    schedule: d.schedule ?? EMPTY_SCHEDULE,
    color: d.color || '#3B82F6',
    enabled: d.enabled ?? true,
    organizationId: d.organizationId || '',
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  }
}

function toBlock(snap: DocumentSnapshot): ScheduleBlock | null {
  if (!snap.exists()) return null
  const d = snap.data()!
  const toDate = (ts: any): Date | undefined =>
    ts && typeof ts.toDate === 'function' ? ts.toDate() : undefined

  return {
    id: snap.id,
    agendaId: d.agendaId || '',
    type: d.type || 'date-range',
    startDate: toDate(d.startDate),
    endDate: toDate(d.endDate),
    dayOfWeek: d.dayOfWeek,
    startTime: d.startTime,
    endTime: d.endTime,
    reason: d.reason || '',
    recurrence: d.recurrence,
    createdBy: d.createdBy || '',
    createdAt: toDate(d.createdAt) ?? new Date(),
  }
}

// ─── Agenda CRUD ─────────────────────────────────────────────

export async function createAgenda(
  organizationId: string,
  data: Omit<Agenda, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = collection(firestore, 'organizations', organizationId, 'agendas')
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateAgenda(
  organizationId: string,
  agendaId: string,
  data: Partial<Omit<Agenda, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(firestore, 'organizations', organizationId, 'agendas', agendaId)
  await updateDoc(ref, { ...data, updatedAt: Timestamp.now() })
}

export async function deleteAgenda(organizationId: string, agendaId: string): Promise<void> {
  const ref = doc(firestore, 'organizations', organizationId, 'agendas', agendaId)
  await deleteDoc(ref)
}

export async function toggleAgendaEnabled(
  organizationId: string,
  agendaId: string,
  enabled: boolean
): Promise<void> {
  await updateAgenda(organizationId, agendaId, { enabled })
}

export async function getAgendasByDoctor(
  organizationId: string,
  doctorId: string
): Promise<Agenda[]> {
  const ref = collection(firestore, 'organizations', organizationId, 'agendas')
  const q = query(ref, where('doctorId', '==', doctorId))  // Remove orderBy to avoid composite index
  const snap = await getDocs(q)
  const agendas = snap.docs.map(toAgenda).filter((a): a is Agenda => a !== null)
  // Sort in-memory
  return agendas.sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAllAgendas(organizationId: string): Promise<Agenda[]> {
  const ref = collection(firestore, 'organizations', organizationId, 'agendas')
  const q = query(ref, orderBy('doctorName'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(toAgenda).filter((a): a is Agenda => a !== null)
}

export function subscribeToAgendas(
  organizationId: string,
  doctorId: string | null,
  callback: (agendas: Agenda[]) => void
): () => void {
  const ref = collection(firestore, 'organizations', organizationId, 'agendas')

  // For doctor-specific queries, we'll filter in-memory to avoid index requirements
  const q = doctorId
    ? query(ref, where('doctorId', '==', doctorId))  // Remove orderBy to avoid composite index
    : query(ref, orderBy('doctorName'), orderBy('name'))

  return onSnapshot(q, (snap) => {
    let agendas = snap.docs.map(toAgenda).filter((a): a is Agenda => a !== null)

    // Sort in-memory if filtering by doctor
    if (doctorId) {
      agendas = agendas.sort((a, b) => a.name.localeCompare(b.name))
    }

    callback(agendas)
  }, (error) => {
    console.error('Error loading agendas:', error)
    callback([])
  })
}

// ─── Validación anti-traslape ────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function schedulesOverlap(a: DaySchedule, b: DaySchedule): boolean {
  if (!a.enabled || !b.enabled) return false
  const aStart = timeToMinutes(a.start)
  const aEnd = timeToMinutes(a.end)
  const bStart = timeToMinutes(b.start)
  const bEnd = timeToMinutes(b.end)
  return aStart < bEnd && bStart < aEnd
}

export async function validateNoOverlap(
  organizationId: string,
  newSchedule: Record<DayKey, DaySchedule>,
  doctorId: string,
  excludeAgendaId?: string
): Promise<{ overlaps: boolean; conflictingAgenda?: string }> {
  const agendas = await getAgendasByDoctor(organizationId, doctorId)
  const others = excludeAgendaId ? agendas.filter(a => a.id !== excludeAgendaId) : agendas

  for (const agenda of others) {
    if (!agenda.enabled) continue
    for (const day of Object.keys(newSchedule) as DayKey[]) {
      if (schedulesOverlap(newSchedule[day], agenda.schedule[day])) {
        return { overlaps: true, conflictingAgenda: agenda.name }
      }
    }
  }
  return { overlaps: false }
}

// ─── Blocks CRUD ─────────────────────────────────────────────

function blocksRef(organizationId: string, agendaId: string) {
  return collection(firestore, 'organizations', organizationId, 'agendas', agendaId, 'blocks')
}

export async function createBlock(
  organizationId: string,
  agendaId: string,
  data: Omit<ScheduleBlock, 'id' | 'createdAt'>
): Promise<string> {
  const ref = blocksRef(organizationId, agendaId)
  const payload: any = { ...data, agendaId, createdAt: Timestamp.now() }
  if (data.startDate) payload.startDate = Timestamp.fromDate(data.startDate)
  if (data.endDate) payload.endDate = Timestamp.fromDate(data.endDate)
  const docRef = await addDoc(ref, payload)
  return docRef.id
}

export async function getBlocksForRange(
  organizationId: string,
  agendaId: string,
  startDate: Date,
  endDate: Date
): Promise<ScheduleBlock[]> {
  const ref = blocksRef(organizationId, agendaId)
  const snap = await getDocs(ref)
  const all = snap.docs.map(toBlock).filter((b): b is ScheduleBlock => b !== null)

  return all.filter(block => {
    if (block.type === 'recurring') return true
    if (block.type === 'day' && block.dayOfWeek !== undefined) return true
    if (block.startDate && block.endDate) {
      return block.startDate <= endDate && block.endDate >= startDate
    }
    return false
  })
}

export async function deleteBlock(
  organizationId: string,
  agendaId: string,
  blockId: string
): Promise<void> {
  const ref = doc(firestore, 'organizations', organizationId, 'agendas', agendaId, 'blocks', blockId)
  await deleteDoc(ref)
}

export function subscribeToBlocks(
  organizationId: string,
  agendaId: string,
  callback: (blocks: ScheduleBlock[]) => void
): () => void {
  const ref = blocksRef(organizationId, agendaId)
  return onSnapshot(ref, (snap) => {
    callback(snap.docs.map(toBlock).filter((b): b is ScheduleBlock => b !== null))
  }, () => callback([]))
}

/**
 * Verifica si un slot de tiempo está bloqueado por algún bloque de la agenda
 */
export function isSlotBlocked(
  blocks: ScheduleBlock[],
  date: Date,
  startTime: string,
  endTime: string
): boolean {
  const dayOfWeek = date.getDay()
  const slotStart = timeToMinutes(startTime)
  const slotEnd = timeToMinutes(endTime)

  return blocks.some(block => {
    if (block.type === 'day' && block.dayOfWeek === dayOfWeek) return true

    if (block.type === 'recurring' && block.dayOfWeek === dayOfWeek) {
      if (!block.startTime || !block.endTime) return true
      const bStart = timeToMinutes(block.startTime)
      const bEnd = timeToMinutes(block.endTime)
      return slotStart < bEnd && bStart < slotEnd
    }

    if ((block.type === 'date-range' || block.type === 'hours') && block.startDate && block.endDate) {
      const inRange = date >= block.startDate && date <= block.endDate
      if (!inRange) return false
      if (block.type === 'date-range' && !block.startTime) return true
      if (block.startTime && block.endTime) {
        const bStart = timeToMinutes(block.startTime)
        const bEnd = timeToMinutes(block.endTime)
        return slotStart < bEnd && bStart < slotEnd
      }
      return true
    }

    return false
  })
}
