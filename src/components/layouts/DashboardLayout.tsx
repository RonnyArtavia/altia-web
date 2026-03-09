import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Button } from '@/components/ui/button'
import { AltiaLogo } from '@/components/ui/logo'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calendar,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  User,
  Bell,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

function getNavigationItems(userRole: 'doctor' | 'secretary' = 'doctor'): NavItem[] {
  const basePrefix = userRole === 'doctor' ? '/doctor' : '/assistant'
  return [
    { href: `${basePrefix}/dashboard`, label: 'Dashboard', icon: Home },
    { href: `${basePrefix}/today-patients`, label: 'Pacientes de hoy', icon: Stethoscope },
    { href: `${basePrefix}/patients`, label: 'Pacientes', icon: Users },
    { href: `${basePrefix}/agenda`, label: 'Agenda', icon: Calendar },
    { href: `${basePrefix}/settings`, label: 'Configuración', icon: Settings },
  ]
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { userData, signOut } = useAuthStore()
  const mainRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  const userRole = (userData?.role as 'doctor' | 'secretary') || 'doctor'
  const navigationItems = getNavigationItems(userRole)

  // Detect scroll for sticky header shadow (rerender-move-effect-to-event Vercel Best Practice)
  useEffect(() => {
    const el = mainRef.current
    const headerEl = headerRef.current
    if (!el || !headerEl) return
    const onScroll = () => {
      if (el.scrollTop > 8) {
        headerEl.classList.add('shadow-soft', 'border-clinical-200/40')
        headerEl.classList.remove('border-clinical-100/60')
      } else {
        headerEl.classList.remove('shadow-soft', 'border-clinical-200/40')
        headerEl.classList.add('border-clinical-100/60')
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (href: string) => {
    if (href.endsWith('/dashboard')) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  const roleLabel = userRole === 'doctor' ? 'Médico' : 'Asistente'
  const userName = userData?.name || userData?.email || 'Usuario'
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-clinical-50">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-clinical-900/40 backdrop-blur-sm lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 flex flex-col
            bg-white/80 backdrop-blur-xl border-r border-clinical-200/60
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static
            ${sidebarCollapsed ? 'lg:w-[88px]' : 'lg:w-72'}
            w-72
          `}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-clinical-100/80 px-4">
            <AltiaLogo
              collapsed={sidebarCollapsed}
              variant={sidebarCollapsed ? 'icon' : 'hybrid'}
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1.5 text-clinical-400 hover:bg-clinical-100 hover:text-clinical-600 lg:hidden transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navigationItems.map((item) => {
              const active = isActive(item.href)
              const btn = (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href)
                    setSidebarOpen(false)
                  }}
                  className={`
                    group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium
                    transition-all duration-200
                    ${active
                      ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 text-primary-700 shadow-sm'
                      : 'text-clinical-600 hover:bg-clinical-50 hover:text-clinical-900'
                    }
                    ${sidebarCollapsed ? 'justify-center lg:px-0 mx-2 w-[calc(100%-16px)]' : 'mx-2 w-[calc(100%-16px)]'}
                  `}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary animate-scale-in" />
                  )}
                  <item.icon
                    className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${active
                      ? 'text-primary'
                      : 'text-clinical-400 group-hover:text-primary-600 group-hover:scale-105'
                      }`}
                  />
                  {!sidebarCollapsed && <span className="animate-fade-in">{item.label}</span>}
                </button>
              )

              // Wrap in tooltip when collapsed
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{btn}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              }
              return btn
            })}
          </nav>

          {/* Collapse toggle (desktop) */}
          <div className="hidden border-t border-clinical-100/80 p-2 lg:block">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex w-full items-center justify-center rounded-lg p-2 text-clinical-400 hover:bg-clinical-50 hover:text-clinical-600 transition-all duration-200"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* User section */}
          <div className="border-t border-clinical-100/80 p-3">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              {/* Gradient avatar */}
              <div className="relative flex-shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold shadow-sm">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-hidden animate-fade-in">
                  <p className="truncate text-sm font-semibold text-clinical-900">{userName}</p>
                  <p className="text-xs text-clinical-400">{roleLabel}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={`mt-2 w-full text-clinical-500 hover:text-danger hover:bg-danger-50 ${sidebarCollapsed ? 'px-0 justify-center' : ''
                }`}
            >
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-2">Cerrar Sesión</span>}
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header
            ref={headerRef}
            className={`
              flex h-16 items-center justify-between px-4 lg:px-6 bg-white/80 backdrop-blur-md
              transition-all duration-300 sticky top-0 z-10 border-b border-clinical-100/60
            `}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl p-2 text-clinical-500 hover:bg-clinical-100 hover:text-clinical-700 lg:hidden transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="hidden lg:block">
                <h2 className="text-sm font-medium text-clinical-500">
                  Bienvenido, <span className="font-semibold text-clinical-800">{userData?.name || 'Doctor'}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <button className="relative rounded-xl p-2 text-clinical-400 hover:bg-clinical-100 hover:text-clinical-600 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger animate-pulse-soft" />
              </button>

              <div className="h-8 w-px bg-clinical-100 mx-1 hidden sm:block" />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="text-clinical-400 hover:text-danger hover:bg-danger-50 rounded-xl"
                title="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
              </Button>

              {/* Mobile avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white text-xs font-bold lg:hidden">
                {initials}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main ref={mainRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 lg:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
