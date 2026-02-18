import { useNavigate } from 'react-router-dom'
import {
  Users,
  CalendarDays,
  Stethoscope,
  TrendingUp,
  Clock,
  DollarSign,
  UserPlus,
  CalendarPlus,
  Video,
  MapPin,
  Mail,
  ArrowRight,
  Sparkles,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonStat } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useDashboardData } from '../hooks/useDashboardData'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function DoctorDashboard() {
  const navigate = useNavigate()
  const { user, userData } = useAuthStore()
  const { data, isLoading, error } = useDashboardData(
    user?.uid,
    userData?.organizationId,
    userData?.name
  )

  if (error && !data) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-clinical-500 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-danger-50 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-danger" />
        </div>
        <p className="font-medium">Error al cargar el dashboard</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const stats = [
    {
      title: 'Citas hoy',
      value: data?.appointments.today ?? 0,
      subtitle: `${data?.appointments.inPersonToday ?? 0} presencial · ${data?.appointments.videoToday ?? 0} video`,
      icon: CalendarDays,
      gradient: 'stat-gradient-primary',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Citas esta semana',
      value: data?.appointments.week ?? 0,
      subtitle: `${data?.appointments.inPersonWeek ?? 0} presencial · ${data?.appointments.videoWeek ?? 0} video`,
      icon: Stethoscope,
      gradient: 'stat-gradient-accent',
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      title: 'Citas del mes',
      value: data?.appointments.month ?? 0,
      subtitle: `${data?.appointments.inPersonMonth ?? 0} presencial · ${data?.appointments.videoMonth ?? 0} video`,
      icon: TrendingUp,
      gradient: 'stat-gradient-success',
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'Facturación del mes',
      value: data?.billing.monthAmount
        ? `₡${data.billing.monthAmount.toLocaleString('es-CR')}`
        : '₡0',
      subtitle: `${data?.billing.pendingInvoices ?? 0} facturas pendientes`,
      icon: DollarSign,
      gradient: 'stat-gradient-warning',
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
  ]

  const quickActions = [
    { label: 'Nuevo paciente', icon: UserPlus, onClick: () => navigate('/doctor/patients/new') },
    { label: 'Nueva cita', icon: CalendarPlus, onClick: () => navigate('/doctor/agenda') },
    { label: 'Mensajes', icon: Mail, onClick: () => navigate('/doctor/chat'), badge: data?.unreadMessages },
  ]

  const staggerClasses = ['animate-stagger-1', 'animate-stagger-2', 'animate-stagger-3', 'animate-stagger-4']

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 p-6 text-white shadow-lg animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-white/5 translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-primary-100 text-sm font-medium">{getGreeting()}</p>
          <h1 className="text-2xl font-bold mt-1">
            {data?.doctor.name || userData?.name || 'Doctor'}
          </h1>
          <p className="text-primary-200 text-sm mt-1">
            {data?.doctor.specialty || 'Medicina General'} · {data?.doctor.organizationName || 'Altia Health'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
          : stats.map((stat, i) => (
            <Card
              key={stat.title}
              className={`${stat.gradient} border-0 ${staggerClasses[i] || ''}`}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.iconBg} transition-transform group-hover:scale-110`}>
                  <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-clinical-500 truncate">{stat.title}</p>
                  <p className="text-2xl font-bold text-clinical-900">{stat.value}</p>
                  <p className="text-xs text-clinical-400 truncate">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next Appointments */}
        <Card className="lg:col-span-2 animate-slide-up">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                Próximas citas de hoy
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/${userData?.role === 'secretary' ? 'assistant' : 'doctor'}/agenda`)}
                className="text-primary text-xs gap-1"
              >
                Ver agenda <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data?.nextAppointments.length ? (
              <div className="divide-y divide-clinical-100/80">
                {data.nextAppointments.map((apt, idx) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 group hover:bg-clinical-50/50 -mx-3 px-3 rounded-lg transition-colors"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-clinical-100 to-clinical-50 text-sm font-semibold text-clinical-700 shadow-sm">
                        {apt.time}
                      </div>
                      <div>
                        <p className="font-medium text-clinical-900 group-hover:text-primary transition-colors">
                          {apt.patientName}
                        </p>
                        <p className="text-xs text-clinical-500">{apt.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.type === 'video' ? (
                        <div className="p-1.5 rounded-lg bg-accent-50">
                          <Video className="h-3.5 w-3.5 text-accent" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-clinical-50">
                          <MapPin className="h-3.5 w-3.5 text-clinical-400" />
                        </div>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${apt.status === 'confirmed'
                            ? 'bg-success-50 text-success-700 ring-1 ring-success-200'
                            : 'bg-warning-50 text-warning-700 ring-1 ring-warning-200'
                          }`}
                      >
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-clinical-400">
                <div className="h-14 w-14 rounded-2xl bg-clinical-100 flex items-center justify-center mb-3">
                  <CalendarDays className="h-7 w-7 opacity-50" />
                </div>
                <p className="text-sm font-medium">No hay citas programadas para hoy</p>
                <p className="text-xs text-clinical-300 mt-1">Su agenda está libre</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-slide-up delay-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              Acciones rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-start gap-3 h-12 rounded-xl hover:border-primary-200 hover:bg-primary-50/50 transition-all group"
                onClick={action.onClick}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-clinical-100 group-hover:bg-primary/10 transition-colors">
                  <action.icon className="h-4 w-4 text-clinical-500 group-hover:text-primary transition-colors" />
                </div>
                <span className="font-medium">{action.label}</span>
                {action.badge ? (
                  <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-xs text-white font-medium animate-pulse-soft">
                    {action.badge}
                  </span>
                ) : (
                  <ArrowRight className="ml-auto h-4 w-4 text-clinical-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
