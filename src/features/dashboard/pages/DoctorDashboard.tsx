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
  CheckCircle,
  PlayCircle,
  XCircle,
  ClipboardList,
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

  const isSecretary = userData?.role === 'secretary'
  const apt = data?.appointments

  const stats = isSecretary ? [
    {
      title: 'Programadas',
      value: apt?.bookedToday ?? 0,
      subtitle: `De ${apt?.today ?? 0} citas hoy`,
      icon: CalendarDays,
      gradient: 'stat-gradient-primary',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'Confirmadas',
      value: apt?.confirmedToday ?? 0,
      subtitle: 'Listas para atencion',
      icon: CheckCircle,
      gradient: 'stat-gradient-success',
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'En espera',
      value: (apt?.bookedToday ?? 0) - (apt?.confirmedToday ?? 0) - (apt?.cancelledToday ?? 0),
      subtitle: 'Pendientes de confirmar',
      icon: Clock,
      gradient: 'stat-gradient-warning',
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    {
      title: 'Canceladas',
      value: apt?.cancelledToday ?? 0,
      subtitle: 'Canceladas hoy',
      icon: XCircle,
      gradient: 'stat-gradient-warning',
      iconColor: 'text-danger',
      iconBg: 'bg-danger/10',
    },
  ] : [
    {
      title: 'Citas hoy',
      value: apt?.today ?? 0,
      subtitle: `${apt?.inPersonToday ?? 0} presencial · ${apt?.videoToday ?? 0} video`,
      icon: CalendarDays,
      gradient: 'stat-gradient-primary',
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      title: 'En curso',
      value: apt?.inProgressToday ?? 0,
      subtitle: 'Atendiendo ahora',
      icon: PlayCircle,
      gradient: 'stat-gradient-accent',
      iconColor: 'text-accent',
      iconBg: 'bg-accent/10',
    },
    {
      title: 'Finalizadas',
      value: apt?.completedToday ?? 0,
      subtitle: `De ${apt?.today ?? 0} programadas hoy`,
      icon: CheckCircle,
      gradient: 'stat-gradient-success',
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'Esta semana',
      value: apt?.week ?? 0,
      subtitle: `${apt?.inPersonWeek ?? 0} presencial · ${apt?.videoWeek ?? 0} video`,
      icon: TrendingUp,
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
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-8 text-white shadow-[0_8px_30px_rgb(13,148,136,0.3)] animate-fade-in border border-primary-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-[60px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-white/10 blur-[50px] translate-y-1/2" />
        <div className="relative z-10">
          <p className="text-primary-100 text-xs font-bold uppercase tracking-widest mb-3 opacity-90">{getGreeting()}</p>
          <h1 className="text-4xl font-extrabold mt-1 tracking-tight">
            Dr. {data?.doctor.name || userData?.name || 'Doctor'}
          </h1>
          <p className="text-primary-100 text-base mt-3 flex items-center gap-2 font-medium">
            <Stethoscope className="w-5 h-5 opacity-80" /> {data?.doctor.specialty || 'Medicina General'}
            <span className="opacity-40">|</span>
            {data?.doctor.organizationName || 'Altia Health'}
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
              className={`relative overflow-hidden border border-white/40 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all bg-white backdrop-blur-xl ${staggerClasses[i] || ''}`}
            >
              <div className={`absolute inset-0 opacity-20 ${stat.gradient}`} />
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-white to-transparent blur-2xl rounded-full pointer-events-none" />
              <CardContent className="flex items-center gap-5 p-6 relative z-10">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${stat.iconBg} transition-transform group-hover:scale-110 shadow-sm border border-white/60`}>
                  <stat.icon className={`h-7 w-7 ${stat.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-clinical-500 truncate mb-1 uppercase tracking-wider text-[11px]">{stat.title}</p>
                  <p className="text-3xl font-extrabold text-clinical-900 tracking-tight">{stat.value}</p>
                  <div className="mt-2 text-xs font-semibold text-clinical-600 truncate bg-clinical-50/80 border border-clinical-100 px-2.5 py-1 rounded-lg inline-flex shadow-sm">{stat.subtitle}</div>
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
                      {!isSecretary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary hover:bg-primary-50 gap-1"
                          onClick={() => navigate(`/doctor/consultation?appointmentId=${apt.id}`)}
                        >
                          <Stethoscope className="h-3 w-3" />
                          Atender
                        </Button>
                      )}
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
        <Card className="animate-slide-up delay-100 rounded-[2rem] border-white/50 bg-white/90 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
          <CardHeader className="pb-3 border-b border-clinical-100/50 mb-3 px-6">
            <CardTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 border border-accent-100/50 shadow-sm">
                <Sparkles className="h-5 w-5 text-accent-600" />
              </div>
              Accesos Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="w-full justify-start gap-4 h-14 rounded-2xl hover:border-primary-200 hover:bg-primary-50/50 transition-all group shadow-sm bg-white"
                onClick={action.onClick}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clinical-50 group-hover:bg-primary-100/50 transition-colors shadow-sm border border-clinical-100/50">
                  <action.icon className="h-5 w-5 text-clinical-500 group-hover:text-primary-600 transition-colors" />
                </div>
                <span className="font-semibold text-clinical-700 group-hover:text-primary-900 transition-colors text-base">{action.label}</span>
                {action.badge && action.badge > 0 ? (
                  <span className="ml-auto rounded-full bg-danger-500 px-2.5 py-0.5 text-[11px] text-white font-bold animate-pulse shadow-sm">
                    {action.badge}
                  </span>
                ) : (
                  <ArrowRight className="ml-auto h-5 w-5 text-clinical-300 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all duration-300" />
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
