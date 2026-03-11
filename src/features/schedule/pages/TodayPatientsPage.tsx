/**
 * TodayPatientsPage — Pacientes del día con acciones de médico
 * RF-A05: Lista en tiempo real con timer de espera y acciones de inicio de consulta
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Stethoscope,
    Clock,
    User,
    History,
    RefreshCcw,
    Activity,
    Calendar,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useTodayPatients, formatWaitingTime } from '../hooks/useTodayPatients'
import { changeAppointmentStatus } from '../services/appointmentService'
import { STATUS_CONFIG } from '../utils/appointmentTransitions'
import { cn } from '@/lib/utils'

export default function TodayPatientsPage() {
    const navigate = useNavigate()
    const { userData } = useAuthStore()
    const [includeCompleted, setIncludeCompleted] = useState(false)
    const [startingId, setStartingId] = useState<string | null>(null)

    const doctorId = userData?.uid || ''
    const organizationId = userData?.organizationId || ''
    const rolePrefix = userData?.role === 'doctor' ? '/doctor' : '/assistant'

    const { patients, loading, error } = useTodayPatients({
        doctorId,
        organizationId,
        includeCompleted,
    })

    const handleStartConsultation = async (apt: any) => {
        if (!userData?.uid) return
        setStartingId(apt.id)
        try {
            if (apt.status === 'waiting') {
                await changeAppointmentStatus(apt.id, organizationId, 'in-progress', userData.uid, 'doctor')
            }
            navigate(`${rolePrefix}/consultation?patientId=${apt.patientId}&appointmentId=${apt.id}`)
        } catch (err: any) {
            toast.error(err.message || 'Error al iniciar consulta')
        } finally {
            setStartingId(null)
        }
    }

    const handleViewHistory = (apt: any) => {
        navigate(`${rolePrefix}/consultation?patientId=${apt.patientId}&appointmentId=${apt.id}&mode=history`)
    }

    const getStatusBadge = (status: string) => {
        const config = STATUS_CONFIG[status]
        if (!config) return null
        return (
            <Badge className={cn('text-xs font-medium border-0', config.bgColor, config.color)}>
                {config.label}
            </Badge>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b bg-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Stethoscope className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Consultas diarias</h1>
                            <p className="text-sm text-gray-500 capitalize">
                                {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Switch
                                id="show-completed"
                                checked={includeCompleted}
                                onCheckedChange={setIncludeCompleted}
                            />
                            <Label htmlFor="show-completed" className="text-sm text-gray-600 cursor-pointer">
                                Mostrar finalizadas
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <Spinner size="lg" />
                            <p className="mt-3 text-sm text-gray-500">Cargando pacientes...</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Activity className="h-12 w-12 text-red-400 mb-4" />
                        <p className="text-gray-600 mb-4">Error al cargar los pacientes</p>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Reintentar
                        </Button>
                    </div>
                )}

                {!loading && !error && patients.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            {includeCompleted
                                ? 'No hay pacientes registrados hoy'
                                : 'No hay pacientes en espera'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-xs">
                            {!includeCompleted && 'Active "Mostrar finalizadas" para ver las consultas completadas'}
                        </p>
                    </div>
                )}

                {!loading && !error && patients.length > 0 && (
                    <div className="space-y-3">
                        {patients.map((apt) => (
                            <div
                                key={apt.id}
                                className={cn(
                                    'bg-white border rounded-xl p-4 shadow-sm transition-all',
                                    apt.status === 'in-progress' && 'border-green-200 bg-green-50/30',
                                    apt.status === 'waiting' && 'border-amber-200',
                                    apt.status === 'completed' && 'border-gray-200 opacity-70',
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Time */}
                                    <div className="text-center min-w-[52px]">
                                        <div className="text-lg font-bold text-gray-900">
                                            {format(apt.start, 'HH:mm')}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {format(apt.start, 'a', { locale: es })}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-12 bg-gray-200" />

                                    {/* Patient Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 truncate">{apt.patientName}</span>
                                            {getStatusBadge(apt.status)}
                                        </div>
                                        {apt.reason && (
                                            <p className="text-sm text-gray-500 mt-0.5 truncate">{apt.reason}</p>
                                        )}
                                    </div>

                                    {/* Waiting Timer (live) */}
                                    {apt.status === 'waiting' && apt.waitingSeconds > 0 && (
                                        <div className="flex items-center gap-1.5 text-amber-700 min-w-[70px]">
                                            <Clock className="h-4 w-4 animate-pulse" />
                                            <span className="text-sm font-mono font-medium">
                                                {formatWaitingTime(apt.waitingSeconds)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleViewHistory(apt)}
                                            className="text-gray-600 hover:text-gray-900"
                                        >
                                            <History className="h-4 w-4 mr-1.5" />
                                            Historial
                                        </Button>

                                        {(apt.status === 'waiting' || apt.status === 'in-progress') && (
                                            <Button
                                                size="sm"
                                                disabled={startingId === apt.id}
                                                onClick={() => handleStartConsultation(apt)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {startingId === apt.id ? (
                                                    <><Spinner size="sm" className="mr-1.5" />Iniciando...</>
                                                ) : (
                                                    <><Stethoscope className="h-4 w-4 mr-1.5" />Perfil Clínico</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
