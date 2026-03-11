/**
 * Script para crear un usuario asistente ligado a un doctor
 *
 * Uso desde la consola del navegador (logueado como doctor):
 *   await createAssistantUser()
 */

import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, getDocs, query, where, collection, Timestamp } from 'firebase/firestore'
import { db, app } from '@/config/firebase'

const ASSISTANT_EMAIL = 'asistente@altia.com'
const ASSISTANT_PASSWORD = 'Test1234!'
const ASSISTANT_NAME = 'Asistente Dr. Martínez'
const DOCTOR_EMAIL = 'dr.martinez@altea.com'

async function findDoctorByEmail(email: string) {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'doctor'),
    where('email', '==', email)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export async function createAssistantUser() {
  console.log('🚀 Creando usuario asistente...')

  // App secundaria para no perder sesión del doctor
  const secondaryApp = initializeApp(app.options, 'secondary-temp')
  const secondaryAuth = getAuth(secondaryApp)
  const secondaryDb = getFirestore(secondaryApp)

  try {
    // 1. Buscar doctor (con sesión actual del doctor)
    console.log(`🔍 Buscando doctor: ${DOCTOR_EMAIL}`)
    const doctor = await findDoctorByEmail(DOCTOR_EMAIL)

    if (!doctor) {
      console.error(`❌ No se encontró doctor con email: ${DOCTOR_EMAIL}`)
      return
    }

    console.log(`✅ Doctor encontrado: ${doctor.name || doctor.displayName} (${doctor.id})`)
    const doctorId = doctor.id
    const organizationId = (doctor as any).organizationId || doctorId

    // 2. Crear o recuperar auth del asistente
    let uid: string
    console.log(`📧 Creando cuenta auth: ${ASSISTANT_EMAIL}`)
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, ASSISTANT_EMAIL, ASSISTANT_PASSWORD)
      uid = cred.user.uid
      console.log(`✅ Auth creado con UID: ${uid}`)
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('⚠️ Auth ya existe, recuperando UID...')
        const existing = await signInWithEmailAndPassword(secondaryAuth, ASSISTANT_EMAIL, ASSISTANT_PASSWORD)
        uid = existing.user.uid
        console.log(`✅ Auth existente con UID: ${uid}`)
      } else {
        throw authError
      }
    }

    // 3. Escribir docs usando Firestore del secondary app (auth del asistente)
    console.log('📝 Creando perfil en Firestore...')
    const userDocRef = doc(secondaryDb, 'users', uid)
    await setDoc(userDocRef, {
      uid,
      email: ASSISTANT_EMAIL,
      name: ASSISTANT_NAME,
      displayName: ASSISTANT_NAME,
      role: 'secretary',
      organizationId,
      doctorId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    console.log('✅ Perfil de usuario creado')

    // 4. Intentar crear solicitud de asistente aprobada (opcional)
    try {
      console.log('📋 Creando solicitud de asistente aprobada...')
      const requestId = `${uid}_${Date.now()}`
      const requestDocRef = doc(secondaryDb, 'assistantRequests', requestId)
      await setDoc(requestDocRef, {
        userId: uid,
        email: ASSISTANT_EMAIL,
        fullName: ASSISTANT_NAME,
        doctorId,
        doctorName: doctor.name || doctor.displayName || 'Dr. Martínez',
        doctorLicenseNumber: (doctor as any).medicalLicense || '',
        status: 'approved',
        requestedAt: Timestamp.now(),
        processedAt: Timestamp.now(),
        processedBy: doctorId,
        notes: 'Creado por script - aprobado automáticamente',
      })
      console.log('✅ Solicitud de asistente aprobada')
    } catch {
      console.log('⚠️ No se pudo crear assistantRequest (permisos), pero no es necesario para login')
    }

    // Cerrar sesión secundaria
    await secondaryAuth.signOut()

    console.log('\n🎉 ¡Usuario asistente creado exitosamente!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Email:    ${ASSISTANT_EMAIL}`)
    console.log(`   Password: ${ASSISTANT_PASSWORD}`)
    console.log(`   Rol:      secretary (asistente)`)
    console.log(`   Doctor:   ${doctor.name || doctor.displayName}`)
    console.log(`   UID:      ${uid}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return { uid, email: ASSISTANT_EMAIL, doctorId, organizationId }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.error(`❌ Ya existe una cuenta con el email: ${ASSISTANT_EMAIL}`)
    } else {
      console.error('❌ Error creando usuario asistente:', error)
    }
    throw error
  } finally {
    await deleteApp(secondaryApp)
  }
}

// Exponer en window para uso desde consola del navegador
if (typeof window !== 'undefined') {
  (window as any).createAssistantUser = createAssistantUser
}
