/**
 * Script para crear datos de prueba en Firebase
 * Ejecutar con: npx tsx src/scripts/createTestData.ts
 */

import { createOrUpdatePatient } from '../features/patients/services/patientService'
import { createAppointment } from '../features/schedule/services/appointmentService'
import type { AppointmentData } from '../features/schedule/services/appointmentService'

// Datos de prueba para pacientes
const testPatients = [
  {
    name: 'María García López',
    cedula: '1-1234-5678',
    email: 'maria.garcia@email.com',
    phone: '+506 8888-1111',
    birthDate: '1985-03-15',
    gender: 'female' as const,
    address: 'San José, Costa Rica',
    city: 'San José',
    state: 'San José',
    country: 'Costa Rica'
  },
  {
    name: 'Carlos Rodríguez Pérez',
    cedula: '2-2345-6789',
    email: 'carlos.rodriguez@email.com',
    phone: '+506 7777-2222',
    birthDate: '1978-07-22',
    gender: 'male' as const,
    address: 'Cartago, Costa Rica',
    city: 'Cartago',
    state: 'Cartago',
    country: 'Costa Rica'
  },
  {
    name: 'Ana Fernández Castro',
    cedula: '3-3456-7890',
    email: 'ana.fernandez@email.com',
    phone: '+506 6666-3333',
    birthDate: '1990-11-08',
    gender: 'female' as const,
    address: 'Alajuela, Costa Rica',
    city: 'Alajuela',
    state: 'Alajuela',
    country: 'Costa Rica'
  },
  {
    name: 'José Manuel Vargas',
    cedula: '4-4567-8901',
    email: 'jose.vargas@email.com',
    phone: '+506 5555-4444',
    birthDate: '1965-12-03',
    gender: 'male' as const,
    address: 'Heredia, Costa Rica',
    city: 'Heredia',
    state: 'Heredia',
    country: 'Costa Rica'
  },
  {
    name: 'Laura Jiménez Mora',
    cedula: '5-5678-9012',
    email: 'laura.jimenez@email.com',
    phone: '+506 4444-5555',
    birthDate: '1982-05-18',
    gender: 'female' as const,
    address: 'Puntarenas, Costa Rica',
    city: 'Puntarenas',
    state: 'Puntarenas',
    country: 'Costa Rica'
  }
]

export async function createTestData(organizationId: string, doctorId: string) {
  console.log('🚀 Creando datos de prueba...')

  try {
    // Crear pacientes de prueba
    console.log('📋 Creando pacientes...')
    const patientIds: string[] = []

    for (const patient of testPatients) {
      const patientId = await createOrUpdatePatient(patient, organizationId)
      patientIds.push(patientId)
      console.log(`✅ Paciente creado: ${patient.name} (${patientId})`)
    }

    // Crear citas de prueba
    console.log('📅 Creando citas...')
    const today = new Date()
    const appointments: Omit<AppointmentData, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        patientId: patientIds[0],
        patientName: testPatients[0].name,
        doctorId,
        doctorName: 'Dr. Test',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        type: 'in-person',
        status: 'scheduled',
        reason: 'Consulta general',
        description: 'Revisión rutinaria',
        organizationId
      },
      {
        patientId: patientIds[1],
        patientName: testPatients[1].name,
        doctorId,
        doctorName: 'Dr. Test',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30),
        type: 'telemedicine',
        status: 'scheduled',
        reason: 'Consulta de seguimiento',
        description: 'Control post-cirugía',
        organizationId
      },
      {
        patientId: patientIds[2],
        patientName: testPatients[2].name,
        doctorId,
        doctorName: 'Dr. Test',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        type: 'in-person',
        status: 'waiting',
        reason: 'Consulta especializada',
        description: 'Evaluación cardiológica',
        organizationId
      },
      {
        patientId: patientIds[3],
        patientName: testPatients[3].name,
        doctorId,
        doctorName: 'Dr. Test',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
        type: 'in-person',
        status: 'completed',
        reason: 'Control diabetes',
        description: 'Seguimiento mensual',
        organizationId
      }
    ]

    for (const appointment of appointments) {
      const appointmentId = await createAppointment(appointment)
      console.log(`✅ Cita creada: ${appointment.patientName} - ${appointment.start.toLocaleTimeString()} (${appointmentId})`)
    }

    console.log('🎉 ¡Datos de prueba creados exitosamente!')
    console.log(`📊 Resumen:`)
    console.log(`   • ${testPatients.length} pacientes`)
    console.log(`   • ${appointments.length} citas`)

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    throw error
  }
}

// Si se ejecuta directamente
if (typeof window === 'undefined') {
  // Función para ejecutar desde la consola del navegador
  (window as any).createTestData = createTestData
}