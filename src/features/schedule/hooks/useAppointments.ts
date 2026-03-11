/**
 * Appointments hooks — useAppointments (real-time), useAppointment, useAppointmentStats
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    subscribeToAppointments,
    subscribeToAppointmentsByDoctors,
    getAppointmentById,
    type AppointmentData,
} from '@/features/schedule/services/appointmentService'

interface UseAppointmentsOptions {
    doctorId: string
    organizationId: string
    startDate?: Date
    endDate?: Date
    patientId?: string
    status?: string[]
    enabled?: boolean
}

export function useAppointments({
    doctorId,
    organizationId,
    startDate,
    endDate,
    patientId,
    status = [],
    enabled = true,
}: UseAppointmentsOptions) {
    const [appointments, setAppointments] = useState<AppointmentData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!enabled || !doctorId || !organizationId) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const unsubscribe = subscribeToAppointments(
                doctorId,
                organizationId,
                (data) => {
                    let filtered = data

                    if (patientId) {
                        filtered = filtered.filter((apt) => apt.patientId === patientId)
                    }
                    if (status.length > 0) {
                        filtered = filtered.filter((apt) => status.includes(apt.status))
                    }

                    setAppointments(filtered)
                    setLoading(false)
                },
                startDate,
                endDate
            )

            return unsubscribe
        } catch (err) {
            setError(err as Error)
            setLoading(false)
        }
    }, [
        doctorId,
        organizationId,
        startDate?.getTime(),
        endDate?.getTime(),
        patientId,
        status.join(','),
        enabled,
    ])

    return { data: appointments, loading, error }
}

// ─── useMultiDoctorAppointments ──────────────────────────────────────────────

interface UseMultiDoctorAppointmentsOptions {
    doctorIds: string[]
    organizationId: string
    startDate?: Date
    endDate?: Date
    enabled?: boolean
}

export function useMultiDoctorAppointments({
    doctorIds,
    organizationId,
    startDate,
    endDate,
    enabled = true,
}: UseMultiDoctorAppointmentsOptions) {
    const [appointments, setAppointments] = useState<AppointmentData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!enabled || !organizationId || doctorIds.length === 0) {
            setAppointments([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const unsubscribe = subscribeToAppointmentsByDoctors(
                doctorIds,
                organizationId,
                (data) => {
                    setAppointments(data)
                    setLoading(false)
                },
                startDate,
                endDate
            )
            return unsubscribe
        } catch (err) {
            setError(err as Error)
            setLoading(false)
        }
    }, [
        doctorIds.join(','),
        organizationId,
        startDate?.getTime(),
        endDate?.getTime(),
        enabled,
    ])

    return { data: appointments, loading, error }
}

// ─── useAppointment ───────────────────────────────────────────────────────────

export function useAppointment(appointmentId: string, organizationId: string) {
    return useQuery({
        queryKey: ['appointment', appointmentId, organizationId],
        queryFn: async () => {
            if (!appointmentId || !organizationId) throw new Error('IDs required')
            const apt = await getAppointmentById(appointmentId, organizationId)
            if (!apt) throw new Error('Appointment not found')
            return apt
        },
        enabled: !!appointmentId && !!organizationId,
    })
}

export function useAppointmentStats(
    doctorId: string,
    organizationId: string,
    period: 'today' | 'week' | 'month' = 'today'
) {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (period) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            break
        case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
            endDate = new Date(startDate.getTime() + 7 * 86400000)
            break
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            break
    }

    const { data: appointments = [], loading } = useAppointments({
        doctorId,
        organizationId,
        startDate,
        endDate,
    })

    const stats = {
        total: appointments.length,
        scheduled: appointments.filter((a) => a.status === 'scheduled').length,
        waiting: appointments.filter((a) => a.status === 'waiting').length,
        inProgress: appointments.filter((a) => a.status === 'in-progress').length,
        completed: appointments.filter((a) => a.status === 'completed').length,
        cancelled: appointments.filter((a) => a.status === 'cancelled').length,
        telemedicine: appointments.filter((a) => a.type === 'telemedicine').length,
        inPerson: appointments.filter((a) => a.type === 'in-person').length,
    }

    return { data: stats, appointments, loading }
}
