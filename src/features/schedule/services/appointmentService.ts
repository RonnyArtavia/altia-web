/**
 * Appointment Service — Firebase FHIR-compatible
 * Collection path: organizations/{organizationId}/appointments
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
    type Query,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'

export interface AppointmentData {
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
    notes?: string
    specialty?: string
    organizationId: string
    createdAt: Date
    updatedAt: Date
    agendaId?: string
    billingStatus?: 'pendiente_facturacion' | 'pagada'
    cost?: number
    paymentMethod?: string
    resourceType?: 'Appointment'
    // Auditoría de cambios de estado
    waitingAt?: Date
    inProgressAt?: Date
    completedAt?: Date
    cancelledAt?: Date
    updatedBy?: string
    updatedRole?: string
}

// ─── Converters ─────────────────────────────────────────────

const convertTimestamp = (ts: any): Date => {
    if (ts && typeof ts.toDate === 'function') return ts.toDate()
    if (ts instanceof Date) return ts
    if (typeof ts === 'string') return new Date(ts)
    return new Date()
}

// Normaliza status heredados (FHIR) al nuevo sistema
const LEGACY_STATUS_MAP: Record<string, AppointmentData['status']> = {
    pending: 'scheduled',
    booked: 'scheduled',
    arrived: 'waiting',
    fulfilled: 'completed',
    'no-show': 'cancelled',
    noshow: 'cancelled',
}

function normalizeStatus(raw: string): AppointmentData['status'] {
    if (!raw) return 'scheduled'
    if (LEGACY_STATUS_MAP[raw]) return LEGACY_STATUS_MAP[raw]
    const valid = ['scheduled', 'waiting', 'in-progress', 'completed', 'cancelled']
    return valid.includes(raw) ? (raw as AppointmentData['status']) : 'scheduled'
}

function toAppointmentData(snap: DocumentSnapshot): AppointmentData | null {
    if (!snap.exists()) return null
    const d = snap.data()!
    return {
        id: snap.id,
        patientId: d.patientId || '',
        patientName: d.patientName || '',
        doctorId: d.doctorId || '',
        doctorName: d.doctorName || '',
        start: convertTimestamp(d.start),
        end: convertTimestamp(d.end),
        type: d.type || 'in-person',
        status: normalizeStatus(d.status),
        reason: d.reason,
        description: d.description,
        notes: d.notes,
        specialty: d.specialty,
        organizationId: d.organizationId || '',
        createdAt: convertTimestamp(d.createdAt),
        updatedAt: convertTimestamp(d.updatedAt),
        billingStatus: d.billingStatus,
        cost: d.cost,
        paymentMethod: d.paymentMethod,
        resourceType: d.resourceType,
        waitingAt: d.waitingAt ? convertTimestamp(d.waitingAt) : undefined,
        inProgressAt: d.inProgressAt ? convertTimestamp(d.inProgressAt) : undefined,
        completedAt: d.completedAt ? convertTimestamp(d.completedAt) : undefined,
        cancelledAt: d.cancelledAt ? convertTimestamp(d.cancelledAt) : undefined,
        agendaId: d.agendaId,
        updatedBy: d.updatedBy,
        updatedRole: d.updatedRole,
    }
}

function toFirestoreData(appointment: Partial<AppointmentData>) {
    const data: any = { ...appointment, updatedAt: Timestamp.now(), resourceType: 'Appointment' }

    // Only convert Date fields when explicitly provided — never null-out existing fields
    if (appointment.start !== undefined) data.start = Timestamp.fromDate(appointment.start as Date)
    else delete data.start

    if (appointment.end !== undefined) data.end = Timestamp.fromDate(appointment.end as Date)
    else delete data.end

    if (appointment.createdAt !== undefined) data.createdAt = Timestamp.fromDate(appointment.createdAt)
    else delete data.createdAt

    if (appointment.waitingAt) data.waitingAt = Timestamp.fromDate(appointment.waitingAt)
    if (appointment.inProgressAt) data.inProgressAt = Timestamp.fromDate(appointment.inProgressAt)
    if (appointment.completedAt) data.completedAt = Timestamp.fromDate(appointment.completedAt)
    if (appointment.cancelledAt) data.cancelledAt = Timestamp.fromDate(appointment.cancelledAt)

    return data
}

// ─── CRUD ───────────────────────────────────────────────────

export async function createAppointment(
    data: Omit<AppointmentData, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const ref = collection(firestore, 'organizations', data.organizationId, 'appointments')
    const docRef = await addDoc(ref, toFirestoreData({ ...data, createdAt: new Date(), updatedAt: new Date() }))
    return docRef.id
}

export async function getAppointments(
    doctorId: string,
    organizationId: string,
    startDate?: Date,
    endDate?: Date
): Promise<AppointmentData[]> {
    const ref = collection(firestore, 'organizations', organizationId, 'appointments')
    let q: Query

    if (startDate && endDate) {
        q = query(ref, where('doctorId', '==', doctorId), where('start', '>=', Timestamp.fromDate(startDate)), where('start', '<=', Timestamp.fromDate(endDate)), orderBy('start', 'asc'))
    } else if (startDate) {
        q = query(ref, where('doctorId', '==', doctorId), where('start', '>=', Timestamp.fromDate(startDate)), orderBy('start', 'asc'))
    } else {
        q = query(ref, where('doctorId', '==', doctorId), orderBy('start', 'asc'))
    }

    const snap = await getDocs(q)
    return snap.docs.map(toAppointmentData).filter((a): a is AppointmentData => a !== null)
}

export function subscribeToAppointments(
    doctorId: string,
    organizationId: string,
    callback: (appointments: AppointmentData[]) => void,
    startDate?: Date,
    endDate?: Date
): () => void {
    const ref = collection(firestore, 'organizations', organizationId, 'appointments')
    let q: Query

    if (startDate && endDate) {
        q = query(ref, where('doctorId', '==', doctorId), where('start', '>=', Timestamp.fromDate(startDate)), where('start', '<=', Timestamp.fromDate(endDate)), orderBy('start', 'asc'))
    } else {
        q = query(ref, where('doctorId', '==', doctorId), orderBy('start', 'asc'))
    }

    return onSnapshot(
        q,
        async (snapshot) => {
            let appointments = snapshot.docs.map(toAppointmentData).filter((a): a is AppointmentData => a !== null)

            // Fallback: try root-level collection if subcollection is empty
            if (appointments.length === 0) {
                try {
                    const rootRef = collection(firestore, 'appointments')
                    let rootQ = query(rootRef, where('doctorId', '==', doctorId))
                    if (startDate && endDate) {
                        rootQ = query(rootRef, where('doctorId', '==', doctorId), where('start', '>=', Timestamp.fromDate(startDate)), where('start', '<=', Timestamp.fromDate(endDate)), orderBy('start', 'asc'))
                    } else {
                        rootQ = query(rootQ, orderBy('start', 'asc'))
                    }
                    const rootSnap = await getDocs(rootQ)
                    if (!rootSnap.empty) {
                        appointments = rootSnap.docs.map(toAppointmentData).filter((a): a is AppointmentData => a !== null)
                    }
                } catch {
                    // Fallback failed silently
                }
            }

            callback(appointments)
        },
        () => callback([])
    )
}

export async function updateAppointment(
    appointmentId: string,
    organizationId: string,
    updates: Partial<AppointmentData>
): Promise<void> {
    const ref = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)
    const dataToUpdate = toFirestoreData({ ...updates, updatedAt: new Date() })
    Object.keys(dataToUpdate).forEach((key) => {
        if ((dataToUpdate as any)[key] === undefined) delete (dataToUpdate as any)[key]
    })
    await updateDoc(ref, dataToUpdate)
}

export async function deleteAppointment(appointmentId: string, organizationId: string): Promise<void> {
    const ref = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)
    await deleteDoc(ref)
}

export async function getAppointmentById(
    appointmentId: string,
    organizationId: string
): Promise<AppointmentData | null> {
    const ref = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)
    const snap = await getDoc(ref)
    return snap.exists() ? toAppointmentData(snap) : null
}

export async function changeAppointmentStatus(
    appointmentId: string,
    organizationId: string,
    newStatus: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled',
    userId: string,
    userRole: string
): Promise<void> {
    const { canTransition, getTransitionTimestampField } = await import('../utils/appointmentTransitions')

    const appointment = await getAppointmentById(appointmentId, organizationId)
    if (!appointment) throw new Error('Cita no encontrada')

    if (!canTransition(appointment.status, newStatus, userRole)) {
        throw new Error(`Transición no permitida: ${appointment.status} → ${newStatus} para rol ${userRole}`)
    }

    const timestampField = getTransitionTimestampField(newStatus)
    const updates: Partial<AppointmentData> = {
        status: newStatus,
        updatedBy: userId,
        updatedRole: userRole,
    }
    if (timestampField) {
        (updates as any)[timestampField] = new Date()
    }

    await updateAppointment(appointmentId, organizationId, updates)
}

export async function rescheduleAppointment(
    appointmentId: string,
    organizationId: string,
    newStart: Date,
    newEnd: Date,
    userId: string,
    userRole: string,
    newDoctorId?: string,
    newAgendaId?: string,
    newDoctorName?: string
): Promise<void> {
    const appointment = await getAppointmentById(appointmentId, organizationId)
    if (!appointment) throw new Error('Cita no encontrada')
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        throw new Error('No se puede reasignar una cita finalizada o cancelada')
    }

    const updates: Partial<AppointmentData> = {
        start: newStart,
        end: newEnd,
        updatedBy: userId,
        updatedRole: userRole,
    }
    if (newDoctorId) updates.doctorId = newDoctorId
    if (newDoctorName) updates.doctorName = newDoctorName
    if (newAgendaId !== undefined) updates.agendaId = newAgendaId || undefined

    await updateAppointment(appointmentId, organizationId, updates)
}

/**
 * Cuenta citas futuras activas para una agenda específica.
 * Usado para validar antes de eliminar una agenda (RN-05).
 */
export async function countFutureAppointmentsByAgenda(
    agendaId: string,
    doctorId: string,
    organizationId: string
): Promise<number> {
    const ref = collection(firestore, 'organizations', organizationId, 'appointments')
    const now = new Date()
    const q = query(
        ref,
        where('doctorId', '==', doctorId),
        where('agendaId', '==', agendaId),
        where('start', '>=', Timestamp.fromDate(now)),
        orderBy('start', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.filter(d => {
        const status = d.data().status
        return status !== 'completed' && status !== 'cancelled'
    }).length
}

// ─── Multi-agenda support ────────────────────────────────────

/**
 * Suscripción a citas filtrando por múltiples médicos (para vista multi-agenda)
 * Firestore no soporta `in` con más de 30 elementos, pero para uso clínico es suficiente.
 */
export function subscribeToAppointmentsByDoctors(
    doctorIds: string[],
    organizationId: string,
    callback: (appointments: AppointmentData[]) => void,
    startDate?: Date,
    endDate?: Date
): () => void {
    if (doctorIds.length === 0) {
        callback([])
        return () => {}
    }

    // Firestore 'in' supports up to 30 values
    const ref = collection(firestore, 'organizations', organizationId, 'appointments')
    const conditions: any[] = [where('doctorId', 'in', doctorIds.slice(0, 30))]
    if (startDate) conditions.push(where('start', '>=', Timestamp.fromDate(startDate)))
    if (endDate) conditions.push(where('start', '<=', Timestamp.fromDate(endDate)))
    conditions.push(orderBy('start', 'asc'))

    const q = query(ref, ...conditions)

    return onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(toAppointmentData).filter((a): a is AppointmentData => a !== null)
        callback(appointments)
    }, () => callback([]))
}

/**
 * Suscripción filtrada por agendaId
 */
export function subscribeToAppointmentsByAgenda(
    agendaIds: string[],
    organizationId: string,
    callback: (appointments: AppointmentData[]) => void,
    startDate?: Date,
    endDate?: Date
): () => void {
    if (agendaIds.length === 0) {
        callback([])
        return () => {}
    }

    const ref = collection(firestore, 'organizations', organizationId, 'appointments')
    const conditions: any[] = [where('agendaId', 'in', agendaIds.slice(0, 30))]
    if (startDate) conditions.push(where('start', '>=', Timestamp.fromDate(startDate)))
    if (endDate) conditions.push(where('start', '<=', Timestamp.fromDate(endDate)))
    conditions.push(orderBy('start', 'asc'))

    const q = query(ref, ...conditions)

    return onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(toAppointmentData).filter((a): a is AppointmentData => a !== null)
        callback(appointments)
    }, () => callback([]))
}
