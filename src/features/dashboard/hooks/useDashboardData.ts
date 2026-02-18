/**
 * Dashboard Data Hook
 * Fetches real dashboard data from Firestore
 */

import { useState, useEffect } from 'react'
import { firestore } from '@/config/firebase'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'

export interface DoctorInfo {
    id: string
    name: string
    specialty: string
    avatar?: string
    organizationName: string
}

export interface AppointmentMetrics {
    today: number
    week: number
    month: number
    inPersonToday: number
    videoToday: number
    inPersonWeek: number
    videoWeek: number
    inPersonMonth: number
    videoMonth: number
}

export interface BillingMetrics {
    todayAmount: number
    weekAmount: number
    monthAmount: number
    pendingInvoices: number
}

export interface NextAppointment {
    id: string
    patientName: string
    time: string
    type: 'video' | 'in-person'
    status: 'confirmed' | 'pending'
    reason: string
}

export interface DashboardData {
    doctor: DoctorInfo
    appointments: AppointmentMetrics
    billing: BillingMetrics
    unreadMessages: number
    nextAppointments: NextAppointment[]
}

// ─── Main Hook ──────────────────────────────────────────────

export const useDashboardData = (userId?: string, organizationId?: string, userName?: string) => {
    const [data, setData] = useState<DashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            if (!userId) {
                setIsLoading(false)
                return
            }

            try {
                setIsLoading(true)
                setError(null)

                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                const weekStart = new Date(today)
                weekStart.setDate(today.getDate() - today.getDay())
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

                const [doctor, appointments, billing, unreadMessages, nextAppointments] = await Promise.all([
                    fetchDoctorInfo(userId, userName),
                    fetchAppointmentMetrics(userId, organizationId, today, weekStart, monthStart),
                    fetchBillingMetrics(userId, organizationId, today, weekStart, monthStart),
                    fetchUnreadMessages(userId),
                    fetchNextAppointments(userId, organizationId),
                ])

                setData({ doctor, appointments, billing, unreadMessages, nextAppointments })
            } catch (err) {
                console.error('Error loading dashboard data:', err)
                setError(err instanceof Error ? err.message : 'Error desconocido')

                if (err instanceof Error && err.message.includes('permission')) {
                    setData(getBasicDashboardData(userId, userName))
                } else {
                    setData(null)
                }
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [userId, organizationId, userName])

    return { data, isLoading, error }
}

// ─── Fetch Helpers ──────────────────────────────────────────

async function fetchDoctorInfo(userId: string, userName?: string): Promise<DoctorInfo> {
    try {
        const practitionersRef = collection(firestore, 'practitioners_fhir')
        const q = query(practitionersRef, where('userId', '==', userId), limit(1))
        const snapshot = await getDocs(q)

        if (!snapshot.empty) {
            const data = snapshot.docs[0].data()
            return {
                id: snapshot.docs[0].id,
                name: data.name?.[0]?.text || `${data.name?.[0]?.given?.[0] || ''} ${data.name?.[0]?.family || ''}`.trim() || 'Doctor',
                specialty: data.qualification?.[0]?.code?.text || 'Medicina General',
                organizationName: 'Clínica Altia',
            }
        }
    } catch (error: any) {
        if (error?.code !== 'permission-denied') throw error
    }

    return { id: userId, name: userName || 'Doctor', specialty: 'Medicina General', organizationName: 'Clínica Altia' }
}

async function fetchAppointmentMetrics(
    userId: string,
    organizationId: string | undefined,
    today: Date,
    weekStart: Date,
    monthStart: Date
): Promise<AppointmentMetrics> {
    const empty: AppointmentMetrics = { today: 0, week: 0, month: 0, inPersonToday: 0, videoToday: 0, inPersonWeek: 0, videoWeek: 0, inPersonMonth: 0, videoMonth: 0 }
    if (!organizationId) return empty

    try {
        const ref = collection(firestore, 'organizations', organizationId, 'appointments')
        const tomorrow = new Date(today.getTime() + 86400000)
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

        const [todaySnap, weekSnap, monthSnap] = await Promise.all([
            getDocs(query(ref, where('doctorId', '==', userId), where('start', '>=', Timestamp.fromDate(today)), where('start', '<', Timestamp.fromDate(tomorrow)))),
            getDocs(query(ref, where('doctorId', '==', userId), where('start', '>=', Timestamp.fromDate(weekStart)), where('start', '<', Timestamp.fromDate(weekEnd)))),
            getDocs(query(ref, where('doctorId', '==', userId), where('start', '>=', Timestamp.fromDate(monthStart)), where('start', '<', Timestamp.fromDate(monthEnd)))),
        ])

        const isTele = (d: any) => d.data().type === 'telemedicine'

        return {
            today: todaySnap.size,
            week: weekSnap.size,
            month: monthSnap.size,
            inPersonToday: todaySnap.docs.filter((d) => !isTele(d)).length,
            videoToday: todaySnap.docs.filter(isTele).length,
            inPersonWeek: weekSnap.docs.filter((d) => !isTele(d)).length,
            videoWeek: weekSnap.docs.filter(isTele).length,
            inPersonMonth: monthSnap.docs.filter((d) => !isTele(d)).length,
            videoMonth: monthSnap.docs.filter(isTele).length,
        }
    } catch {
        return empty
    }
}

async function fetchBillingMetrics(
    userId: string,
    organizationId: string | undefined,
    today: Date,
    weekStart: Date,
    monthStart: Date
): Promise<BillingMetrics> {
    const empty: BillingMetrics = { todayAmount: 0, weekAmount: 0, monthAmount: 0, pendingInvoices: 0 }
    if (!organizationId) return empty

    try {
        const ref = collection(firestore, 'facturas')
        const tomorrow = new Date(today.getTime() + 86400000)
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)

        const [todaySnap, weekSnap, monthSnap, pendingSnap] = await Promise.all([
            getDocs(query(ref, where('doctorId', '==', userId), where('fechaEmision', '>=', Timestamp.fromDate(today)), where('fechaEmision', '<', Timestamp.fromDate(tomorrow)), where('estado', '==', 'pagada'))),
            getDocs(query(ref, where('doctorId', '==', userId), where('fechaEmision', '>=', Timestamp.fromDate(weekStart)), where('fechaEmision', '<', Timestamp.fromDate(weekEnd)), where('estado', '==', 'pagada'))),
            getDocs(query(ref, where('doctorId', '==', userId), where('fechaEmision', '>=', Timestamp.fromDate(monthStart)), where('fechaEmision', '<', Timestamp.fromDate(monthEnd)), where('estado', '==', 'pagada'))),
            getDocs(query(ref, where('doctorId', '==', userId), where('estado', 'in', ['pendiente', 'enviada']))),
        ])

        const sum = (snap: any) => snap.docs.reduce((s: number, d: any) => s + (d.data().total || 0), 0)

        return {
            todayAmount: sum(todaySnap),
            weekAmount: sum(weekSnap),
            monthAmount: sum(monthSnap),
            pendingInvoices: pendingSnap.size,
        }
    } catch {
        return empty
    }
}

async function fetchUnreadMessages(userId: string): Promise<number> {
    try {
        const ref = collection(firestore, 'messages')
        const q = query(ref, where('receiverId', '==', userId), where('read', '==', false))
        const snap = await getDocs(q)
        return snap.size
    } catch {
        return 0
    }
}

async function fetchNextAppointments(userId: string, organizationId?: string): Promise<NextAppointment[]> {
    if (!organizationId) return []

    try {
        const ref = collection(firestore, 'organizations', organizationId, 'appointments')
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today.getTime() + 86400000)

        const q = query(
            ref,
            where('doctorId', '==', userId),
            where('start', '>=', Timestamp.fromDate(today)),
            where('start', '<', Timestamp.fromDate(tomorrow)),
            where('status', 'in', ['booked', 'fulfilled']),
            orderBy('start'),
            limit(5)
        )

        const snap = await getDocs(q)

        return snap.docs.map((d) => {
            const data = d.data()
            const start = data.start?.toDate ? data.start.toDate() : new Date()
            return {
                id: d.id,
                patientName: data.patientName || 'Paciente',
                time: start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }),
                type: data.type === 'telemedicine' ? 'video' as const : 'in-person' as const,
                status: data.status === 'fulfilled' ? 'confirmed' as const : 'pending' as const,
                reason: data.reason || data.description || 'Consulta general',
            }
        })
    } catch {
        return []
    }
}

function getBasicDashboardData(userId: string, userName?: string): DashboardData {
    return {
        doctor: { id: userId, name: userName || 'Doctor', specialty: 'Medicina General', organizationName: 'Clínica Altia' },
        appointments: { today: 0, week: 0, month: 0, inPersonToday: 0, videoToday: 0, inPersonWeek: 0, videoWeek: 0, inPersonMonth: 0, videoMonth: 0 },
        billing: { todayAmount: 0, weekAmount: 0, monthAmount: 0, pendingInvoices: 0 },
        unreadMessages: 0,
        nextAppointments: [],
    }
}
