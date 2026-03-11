/**
 * Web Appointment Mutations - Phase 4
 * TanStack Query mutations for appointment CRUD operations
 * Adapted from mobile version for Firebase Web SDK
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { toast } from 'sonner'

interface CreateAppointmentData {
  patientId: string
  patientName: string
  doctorId: string
  organizationId: string
  start: Date
  end: Date
  type: 'in-person' | 'telemedicine'
  status?: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  reason?: string
  description?: string
  title?: string
}

interface UpdateAppointmentData {
  patientId?: string
  patientName?: string
  start?: Date
  end?: Date
  type?: 'in-person' | 'telemedicine'
  status?: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
  reason?: string
  description?: string
  title?: string
}

interface CancelAppointmentData {
  reason?: string
  cancelledBy: string
  cancelledAt?: Date
}

/**
 * Hook for creating a new appointment
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient()
  const { userData } = useAuthStore()

  return useMutation({
    mutationFn: async (data: CreateAppointmentData) => {
      // Validate user is authenticated
      if (!userData?.uid) {
        throw new Error('Usuario no autenticado. Por favor inicie sesión.')
      }

      // Validate all required fields are strings
      if (typeof data.organizationId !== 'string') {
        throw new Error(`organizationId must be string, got ${typeof data.organizationId}: ${data.organizationId}`)
      }
      if (typeof data.patientId !== 'string') {
        throw new Error(`patientId must be string, got ${typeof data.patientId}: ${data.patientId}`)
      }
      if (typeof data.doctorId !== 'string') {
        throw new Error(`doctorId must be string, got ${typeof data.doctorId}: ${data.doctorId}`)
      }

      const appointmentsRef = collection(firestore, 'organizations', data.organizationId, 'appointments')

      // Clean up data by removing undefined/null fields
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          // Special handling for optional text fields
          if (key === 'description' || key === 'title') {
            if (value && value.trim() !== '') {
              acc[key] = value
            }
          } else {
            acc[key] = value
          }
        }
        return acc
      }, {} as any)

      const appointmentData = {
        ...cleanData,
        start: Timestamp.fromDate(data.start),
        end: Timestamp.fromDate(data.end),
        status: data.status || 'scheduled',
        createdBy: userData.uid,
        createdByEmail: userData.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      try {
        const docRef = await addDoc(appointmentsRef, appointmentData)

        // Update the document with its own ID
        await updateDoc(docRef, { id: docRef.id })

        return { id: docRef.id, ...appointmentData }
      } catch (firebaseError: any) {
        console.error('🔍 Firebase Error Details:', {
          code: firebaseError.code,
          message: firebaseError.message,
        })

        // Provide more specific error messages
        if (firebaseError.code === 'permission-denied') {
          throw new Error('Permisos insuficientes. Verifique que tenga acceso para crear citas en esta organización.')
        } else if (firebaseError.code === 'unauthenticated') {
          throw new Error('No autenticado. Por favor cierre sesión y vuelva a ingresar.')
        } else if (firebaseError.code === 'invalid-argument') {
          throw new Error('Datos inválidos. Verifique que todos los campos estén completos.')
        }

        throw firebaseError
      }
    },
    onSuccess: (data) => {
      // Invalidate appointment queries
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Cita creada exitosamente', {
        description: `Cita programada para ${data.patientName}`,
      })
    },
    onError: (error) => {
      console.error('Error creating appointment:', error)

      let errorMessage = 'Error al crear la cita'
      let errorDescription = 'Por favor intenta de nuevo'

      if (error.message.includes('Permisos insuficientes')) {
        errorMessage = 'Permisos insuficientes'
        errorDescription = 'Su cuenta no tiene permisos para crear citas. Contacte al administrador.'
      } else if (error.message.includes('No autenticado')) {
        errorMessage = 'Sesión expirada'
        errorDescription = 'Por favor cierre sesión e inicie sesión nuevamente.'
      } else if (error.message.includes('permission-denied')) {
        errorMessage = 'Acceso denegado'
        errorDescription = 'No tiene permisos para crear citas en esta organización.'
      } else if (error.message.includes('unauthenticated')) {
        errorMessage = 'Autenticación requerida'
        errorDescription = 'Su sesión ha expirado. Inicie sesión nuevamente.'
      }

      toast.error(errorMessage, {
        description: errorDescription,
        duration: 5000,
      })
    },
  })
}

/**
 * Hook for updating an appointment
 */
export function useUpdateAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId,
      data
    }: {
      appointmentId: string
      organizationId: string
      data: UpdateAppointmentData
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)

      const updateData: any = {
        ...data,
        updatedAt: serverTimestamp(),
      }

      // Convert dates to Firestore Timestamps
      if (data.start) {
        updateData.start = Timestamp.fromDate(data.start)
      }
      if (data.end) {
        updateData.end = Timestamp.fromDate(data.end)
      }

      await updateDoc(appointmentRef, updateData)

      return { appointmentId, ...data }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment', data.appointmentId] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Cita actualizada exitosamente')
    },
    onError: (error) => {
      console.error('Error updating appointment:', error)
      toast.error('Error al actualizar la cita', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Hook for cancelling an appointment
 */
export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId,
      data
    }: {
      appointmentId: string
      organizationId: string
      data: CancelAppointmentData
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)

      const updateData = {
        status: 'cancelled' as const,
        cancellationReason: data.reason || 'Cancelada',
        cancelledBy: data.cancelledBy,
        cancelledAt: Timestamp.fromDate(data.cancelledAt || new Date()),
        updatedAt: serverTimestamp(),
      }

      await updateDoc(appointmentRef, updateData)

      return { appointmentId, ...updateData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Cita cancelada', {
        description: 'La cita ha sido cancelada exitosamente',
      })
    },
    onError: (error) => {
      console.error('Error cancelling appointment:', error)
      toast.error('Error al cancelar la cita', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Hook for marking appointment as waiting (patient arrived)
 */
export function useMarkAppointmentWaiting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId
    }: {
      appointmentId: string
      organizationId: string
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)

      const updateData = {
        status: 'waiting' as const,
        waitingAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await updateDoc(appointmentRef, updateData)

      return { appointmentId, ...updateData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Paciente registrado en espera')
    },
    onError: (error) => {
      console.error('Error marking appointment as waiting:', error)
      toast.error('Error al registrar paciente en espera', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Hook for marking appointment as in-progress (doctor started consultation)
 */
export function useMarkAppointmentInProgress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId
    }: {
      appointmentId: string
      organizationId: string
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)

      const updateData = {
        status: 'in-progress' as const,
        inProgressAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await updateDoc(appointmentRef, updateData)

      return { appointmentId, ...updateData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Consulta iniciada')
    },
    onError: (error) => {
      console.error('Error marking appointment as in-progress:', error)
      toast.error('Error al iniciar consulta', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Hook for marking appointment as completed
 */
export function useMarkAppointmentCompleted() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId
    }: {
      appointmentId: string
      organizationId: string
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)

      const updateData = {
        status: 'completed' as const,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      await updateDoc(appointmentRef, updateData)

      return { appointmentId, ...updateData }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Consulta marcada como completada')
    },
    onError: (error) => {
      console.error('Error marking appointment as completed:', error)
      toast.error('Error al completar consulta', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Hook for deleting an appointment (admin only)
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      appointmentId,
      organizationId
    }: {
      appointmentId: string
      organizationId: string
    }) => {
      const appointmentRef = doc(firestore, 'organizations', organizationId, 'appointments', appointmentId)
      await deleteDoc(appointmentRef)

      return { appointmentId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['appointment-stats'] })

      toast.success('Cita eliminada', {
        description: 'La cita ha sido eliminada permanentemente',
      })
    },
    onError: (error) => {
      console.error('Error deleting appointment:', error)
      toast.error('Error al eliminar la cita', {
        description: 'Por favor intenta de nuevo',
      })
    },
  })
}

/**
 * Combined hook with all appointment mutations
 */
export function useAppointmentMutations() {
  const createAppointment = useCreateAppointment()
  const updateAppointment = useUpdateAppointment()
  const cancelAppointment = useCancelAppointment()
  const markWaiting = useMarkAppointmentWaiting()
  const markInProgress = useMarkAppointmentInProgress()
  const markCompleted = useMarkAppointmentCompleted()
  const deleteAppointment = useDeleteAppointment()

  return {
    createAppointment,
    updateAppointment,
    cancelAppointment,
    markWaiting,
    markInProgress,
    markCompleted,
    deleteAppointment,
  }
}