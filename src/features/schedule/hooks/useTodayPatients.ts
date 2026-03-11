/**
 * useTodayPatients — Hook para pacientes del día con tiempo de espera en tiempo real
 * RF-A05: Lista de pacientes con estado waiting/in-progress y toggle para completed
 */

import { useState, useEffect, useRef } from 'react'
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type { AppointmentData } from '../services/appointmentService'

interface TodayPatient extends AppointmentData {
    waitingSeconds: number  // segundos en espera desde waitingAt
}

interface UseTodayPatientsOptions {
    doctorId: string
    organizationId: string
    includeCompleted?: boolean
}

export function useTodayPatients({
    doctorId,
    organizationId,
    includeCompleted = false,
}: UseTodayPatientsOptions) {
    const [patients, setPatients] = useState<TodayPatient[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [, setTick] = useState(0)  // para forzar re-render del timer

    // Timer para live-update del tiempo en espera
    useEffect(() => {
        const interval = setInterval(() => setTick((t) => t + 1), 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!doctorId || !organizationId) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

        const ref = collection(firestore, 'organizations', organizationId, 'appointments')
        const q = query(
            ref,
            where('doctorId', '==', doctorId),
            where('start', '>=', Timestamp.fromDate(startOfDay)),
            where('start', '<=', Timestamp.fromDate(endOfDay)),
            orderBy('start', 'asc')
        )

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const statusFilter = includeCompleted
                    ? ['waiting', 'in-progress', 'completed']
                    : ['waiting', 'in-progress']

                const data: TodayPatient[] = snapshot.docs
                    .map((doc) => {
                        const d = doc.data()
                        const convertTs = (ts: any): Date | undefined => {
                            if (!ts) return undefined
                            if (typeof ts.toDate === 'function') return ts.toDate()
                            if (ts instanceof Date) return ts
                            return undefined
                        }

                        const waitingAt = convertTs(d.waitingAt)
                        const waitingSeconds = waitingAt
                            ? Math.floor((Date.now() - waitingAt.getTime()) / 1000)
                            : 0

                        return {
                            id: doc.id,
                            patientId: d.patientId || '',
                            patientName: d.patientName || '',
                            doctorId: d.doctorId || '',
                            doctorName: d.doctorName || '',
                            start: convertTs(d.start) || new Date(),
                            end: convertTs(d.end) || new Date(),
                            type: d.type || 'in-person',
                            status: d.status || 'scheduled',
                            reason: d.reason,
                            description: d.description,
                            notes: d.notes,
                            specialty: d.specialty,
                            organizationId: d.organizationId || '',
                            createdAt: convertTs(d.createdAt) || new Date(),
                            updatedAt: convertTs(d.updatedAt) || new Date(),
                            waitingAt,
                            inProgressAt: convertTs(d.inProgressAt),
                            completedAt: convertTs(d.completedAt),
                            cancelledAt: convertTs(d.cancelledAt),
                            updatedBy: d.updatedBy,
                            updatedRole: d.updatedRole,
                            waitingSeconds,
                        } as TodayPatient
                    })
                    .filter((apt) => statusFilter.includes(apt.status))

                setPatients(data)
                setLoading(false)
            },
            (err) => {
                setError(err as Error)
                setLoading(false)
            }
        )

        return unsubscribe
    }, [doctorId, organizationId, includeCompleted])

    // Recalcular waitingSeconds en cada tick del timer
    const patientsWithLiveTimer = patients.map((p) => ({
        ...p,
        waitingSeconds:
            p.status === 'waiting' && p.waitingAt
                ? Math.floor((Date.now() - p.waitingAt.getTime()) / 1000)
                : p.waitingSeconds,
    }))

    return { patients: patientsWithLiveTimer, loading, error }
}

/**
 * Formatea segundos a HH:MM:SS
 */
export function formatWaitingTime(seconds: number): string {
    if (seconds < 0) seconds = 0
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
