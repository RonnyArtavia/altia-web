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
  const { user, userData, isInitializing, isPendingSecretary, canAccessSystemData } = useAuthStore()
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

  // Check if secretary is pending approval
  if (isPendingSecretary() && location.pathname !== '/assistant/pending-approval') {
    console.log('🔄 ProtectedRoute: Redirecting pending secretary to approval page')
    return <Navigate to="/assistant/pending-approval" replace />
  }

  // Check role-based access
  if (requiredRole && userData.role !== requiredRole) {
    if (userData.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />
    } else if (userData.role === 'secretary') {
      // If secretary is pending, send to pending page
      if (isPendingSecretary()) {
        return <Navigate to="/assistant/pending-approval" replace />
      }
      return <Navigate to="/assistant/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  // Additional check for secretaries accessing system data
  if (userData.role === 'secretary' && !canAccessSystemData() && location.pathname !== '/assistant/pending-approval') {
    console.log('🚫 ProtectedRoute: Secretary cannot access system data, redirecting to approval page', {
      canAccess: canAccessSystemData(),
      assistantStatus: userData.assistantStatus,
      pathname: location.pathname
    })
    return <Navigate to="/assistant/pending-approval" replace />
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
