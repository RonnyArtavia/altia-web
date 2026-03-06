import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Spinner } from '@/components/ui/spinner'

// Auth
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { ProtectedRoute } from '@/features/auth/guards/ProtectedRoute'

// Layout
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

// Feature Pages
import DoctorDashboard from '@/features/dashboard/pages/DoctorDashboard'
import PatientsPage from '@/features/patients/pages/PatientsPage'
import PatientEditPage from '@/features/patients/pages/PatientEditPage'
import AgendaPage from '@/features/schedule/pages/AgendaPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import MedicalNotesCopilotPage from '@/features/consultation/pages/MedicalNotesCopilotPage'
import TodayPatientsPage from '@/features/schedule/pages/TodayPatientsPage'

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-clinical-50">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-clinical-500 animate-pulse">Iniciando Altia...</p>
      </div>
    </div>
  )
}


function App() {
  const { isInitializing, hasHydrated } = useAuthStore()

  useEffect(() => {
    useAuthStore.getState().initializeAuth()
  }, [])

  if (isInitializing || !hasHydrated) {
    return <LoadingScreen />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Copilot — full-screen, outside DashboardLayout */}
      <Route
        path="/doctor/consultation"
        element={
          <ProtectedRoute requiredRole="doctor">
            <MedicalNotesCopilotPage />
          </ProtectedRoute>
        }
      />

      {/* Doctor protected routes */}
      <Route
        path="/doctor/*"
        element={
          <ProtectedRoute requiredRole="doctor">
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<DoctorDashboard />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id/edit" element={<PatientEditPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="today-patients" element={<TodayPatientsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/doctor/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Assistant protected routes */}
      <Route
        path="/assistant/*"
        element={
          <ProtectedRoute requiredRole="secretary">
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<DoctorDashboard />} />
                <Route path="patients" element={<PatientsPage />} />
                <Route path="patients/:id/edit" element={<PatientEditPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="today-patients" element={<TodayPatientsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/assistant/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

