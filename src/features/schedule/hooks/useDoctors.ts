/**
 * useDoctors — Hook para cargar médicos de la organización
 * RF-C01.1: El asistente puede ver todos los médicos o filtrar por uno o más
 *
 * Firestore query: users where organizationId == orgId AND role == 'doctor'
 * Note: If Firestore reports a missing index, create a composite index on
 *       users (organizationId ASC, role ASC, displayName ASC)
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/config/firebase'

export interface DoctorOption {
  uid: string
  displayName: string
  email: string
  specialty?: string
}

export function useDoctors(organizationId: string, enabled = true) {
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !organizationId) {
      setDoctors([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const ref = collection(firestore, 'users')
    // Solo equality filters — no requiere indice compuesto.
    // Ordenamos client-side para evitar necesitar un indice manual.
    const q = query(
      ref,
      where('organizationId', '==', organizationId),
      where('role', '==', 'doctor')
    )

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: DoctorOption[] = snap.docs.map(d => ({
          uid: d.id,
          displayName: d.data().displayName || d.data().email || d.id,
          email: d.data().email || '',
          specialty: d.data().specialty,
        }))
        docs.sort((a, b) => a.displayName.localeCompare(b.displayName))
        setDoctors(docs)
        setLoading(false)
      },
      (err) => {
        console.error('[useDoctors] Error loading doctors:', err)
        setError(err)
        setLoading(false)
      }
    )

    return unsub
  }, [organizationId, enabled])

  return { doctors, loading, error }
}
