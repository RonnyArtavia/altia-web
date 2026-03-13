/**
 * Script para actualizar el nombre del doctor en Firestore
 * 
 * Ejecutar desde la consola del navegador (logueado como doctor):
 *   1. import { updateDoctorName } from './scripts/updateDoctorName'
 *   2. await updateDoctorName()
 * 
 * O ejecutar automáticamente copiando esto en la consola del navegador:
 *   const { db } = await import('/src/config/firebase.ts')
 *   const { collection, getDocs, query, where, doc, updateDoc } = await import('firebase/firestore')
 *   const q = query(collection(db, 'users'), where('email', '==', 'dr.martinez@altea.com'))
 *   const snap = await getDocs(q)
 *   if (!snap.empty) {
 *     await updateDoc(doc(db, 'users', snap.docs[0].id), { name: 'Carlos Martínez Solano', displayName: 'Carlos Martínez Solano' })
 *     console.log('✅ Nombre actualizado a: Carlos Martínez Solano')
 *   }
 */

import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

const DOCTOR_EMAIL = 'dr.martinez@altea.com'
const NEW_NAME = 'Carlos Martínez Solano'

export async function updateDoctorName() {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', DOCTOR_EMAIL)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.error('❌ No se encontró el doctor con email:', DOCTOR_EMAIL)
      return false
    }

    const doctorDoc = snapshot.docs[0]
    const currentName = doctorDoc.data().name
    console.log(`📋 Nombre actual: "${currentName}"`)

    await updateDoc(doc(db, 'users', doctorDoc.id), {
      name: NEW_NAME,
      displayName: NEW_NAME,
      updatedAt: new Date().toISOString()
    })

    console.log(`✅ Nombre actualizado a: "${NEW_NAME}"`)
    console.log('🔄 Recarga la página para ver los cambios')
    return true
  } catch (error) {
    console.error('❌ Error actualizando nombre:', error)
    return false
  }
}
