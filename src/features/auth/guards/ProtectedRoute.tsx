import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Spinner } from '@/components/ui/spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'doctor' | 'secretary'
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, userData, isInitializing } = useAuthStore()
  const location = useLocation()

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-clinical-500">Iniciando...</p>
        </div>
      </div>
    )
  }

  if (!user || !userData) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (requiredRole && userData.role !== requiredRole) {
    if (userData.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />
    } else if (userData.role === 'secretary') {
      return <Navigate to="/assistant/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  if (userData.role !== 'doctor' && userData.role !== 'secretary') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-clinical-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-danger">Acceso No Autorizado</h1>
          <p className="mb-4 text-clinical-600">
            Esta plataforma está disponible solo para médicos y asistentes médicos.
          </p>
          <button
            onClick={() => useAuthStore.getState().signOut()}
            className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
