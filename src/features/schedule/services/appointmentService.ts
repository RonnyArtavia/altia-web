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
    status: 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'no-show'
    reason?: string
    description?: string
    notes?: string
    specialty?: string
    organizationId: string
    createdAt: Date
    updatedAt: Date
    billingStatus?: 'pendiente_facturacion' | 'pagada'
    cost?: number
    paymentMethod?: string
    resourceType?: 'Appointment'
}

// ─── Converters ─────────────────────────────────────────────

const convertTimestamp = (ts: any): Date => {
    if (ts && typeof ts.toDate === 'function') return ts.toDate()
    if (ts instanceof Date) return ts
    if (typeof ts === 'string') return new Date(ts)
    return new Date()
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
        status: d.status || 'pending',
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
    }
}

function toFirestoreData(appointment: Partial<AppointmentData>) {
    return {
        ...appointment,
        start: appointment.start ? Timestamp.fromDate(appointment.start) : null,
        end: appointment.end ? Timestamp.fromDate(appointment.end) : null,
        createdAt: appointment.createdAt ? Timestamp.fromDate(appointment.createdAt) : Timestamp.now(),
        updatedAt: Timestamp.now(),
        resourceType: 'Appointment',
    }
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
