/**
 * IPS Service - International Patient Summary Data Fetcher
 * Maps patient medical data to IPS format for consultation display
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import {
  getPatientMedicalHistory,
  getPatientMedications,
  getPatientAllergies,
  getPatientVitalSigns,
  getPatientEncounters,
} from '@/features/patients/services/patientService'
import type {
  IPSDisplayData,
  VitalSignsData,
  ConsultationEntry,
  IPSAllergy,
  IPSMedication,
  IPSCondition,
  IPSVaccine,
  IPSOrder,
  IPSResult,
} from '../types/medical-notes'

/**
 * Fetches immunization (vaccination) data for a patient
 */
async function getPatientImmunizations(patientId: string, limitCount = 20) {
  try {
    const immunizationsRef = collection(firestore, 'immunizations_fhir')
    const q = query(
      immunizationsRef,
      where('patient.reference', '==', `Patient/${patientId}`),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.vaccineCode?.text || 'Vacuna desconocida',
        date: data.occurrenceDateTime?.split('T')[0] || new Date().toISOString().split('T')[0],
        site: data.site?.text || '',
        doctor: data.performer?.[0]?.actor?.display || 'Personal de salud',
        notes: data.note?.[0]?.text || '',
        status: data.status || 'completed'
      }
    })
  } catch (error) {
    console.error('Error fetching immunizations:', error)
    return []
  }
}

/**
 * Fetches service requests (lab orders, imaging orders) for a patient
 */
async function getPatientServiceRequests(patientId: string, limitCount = 20) {
  try {
    const serviceRequestsRef = collection(firestore, 'service_requests_fhir')
    const q = query(
      serviceRequestsRef,
      where('subject.reference', '==', `Patient/${patientId}`),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.code?.text || 'Orden médica',
        type: getServiceRequestType(data.code?.coding?.[0]?.system),
        status: mapServiceRequestStatus(data.status),
        priority: mapPriority(data.priority),
        date: data.authoredOn?.split('T')[0] || new Date().toISOString().split('T')[0],
        doctor: data.requester?.display || 'Médico tratante',
        notes: data.note?.[0]?.text || ''
      }
    })
  } catch (error) {
    console.error('Error fetching service requests:', error)
    return []
  }
}

/**
 * Fetches lab results (observations) for a patient
 */
async function getPatientLabResults(patientId: string, limitCount = 20) {
  try {
    const observationsRef = collection(firestore, 'observations_fhir')
    const q = query(
      observationsRef,
      where('subject.reference', '==', `Patient/${patientId}`),
      where('category', 'array-contains', {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'laboratory'
        }]
      }),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.code?.text || 'Resultado de laboratorio',
        value: data.valueQuantity?.value?.toString() || data.valueString || '',
        unit: data.valueQuantity?.unit || '',
        date: data.effectiveDateTime?.split('T')[0] || new Date().toISOString().split('T')[0],
        flag: mapObservationFlag(data.interpretation?.[0]?.coding?.[0]?.code),
        referenceRange: data.referenceRange?.[0]?.text || '',
        doctor: data.performer?.[0]?.display || 'Laboratorio',
        notes: data.note?.[0]?.text || ''
      }
    })
  } catch (error) {
    console.error('Error fetching lab results:', error)
    return []
  }
}

/**
 * Fetches clinical evolution data from compositions and encounters
 */
async function getPatientClinicalEvolution(patientId: string, limitCount = 10) {
  try {
    const encountersRef = collection(firestore, 'encounters_fhir')
    const q = query(
      encountersRef,
      where('subject.reference', '==', `Patient/${patientId}`),
      orderBy('period.start', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(q)

    const evolutionEntries = await Promise.all(
      snapshot.docs.map(async (encDoc) => {
        const encounterData = encDoc.data()
        const encounterId = encDoc.id

        // Get associated composition (SOAP notes) for this encounter
        try {
          const compositionsRef = collection(firestore, 'compositions_fhir')
          const compQuery = query(
            compositionsRef,
            where('encounter.reference', '==', `Encounter/${encounterId}`),
            limit(1)
          )
          const compSnapshot = await getDocs(compQuery)

          let soapNotes = ''
          if (!compSnapshot.empty) {
            const compData = compSnapshot.docs[0].data()
            // Extract text from SOAP sections
            const sections = compData.section || []
            soapNotes = sections.map((section: any) => {
              const text = section.text?.div?.replace(/<[^>]*>/g, '') || ''
              return `${section.title}: ${text}`
            }).join('\n\n')
          }

          return {
            id: encounterId,
            date: encounterData.period?.start?.split('T')[0] || new Date().toISOString().split('T')[0],
            type: mapEncounterTypeToDisplay(encounterData.class?.code),
            doctor: encounterData.participant?.[0]?.individual?.display || 'Médico tratante',
            summary: encounterData.reasonCode?.[0]?.text || 'Consulta médica',
            notes: soapNotes,
            patientNote: '', // Could be extracted from patient-specific communications
          }
        } catch {
          return {
            id: encounterId,
            date: encounterData.period?.start?.split('T')[0] || new Date().toISOString().split('T')[0],
            type: mapEncounterTypeToDisplay(encounterData.class?.code),
            doctor: encounterData.participant?.[0]?.individual?.display || 'Médico tratante',
            summary: encounterData.reasonCode?.[0]?.text || 'Consulta médica',
            notes: '',
            patientNote: '',
          }
        }
      })
    )

    return evolutionEntries
  } catch (error) {
    console.error('Error fetching clinical evolution:', error)
    return []
  }
}

/**
 * Fetches complete IPS data for a patient from the database
 */
export async function getPatientIPSData(
  patientId: string,
  organizationId: string
): Promise<{
  ipsData: IPSDisplayData;
  vitalSigns: VitalSignsData | null;
}> {
  try {
    // Fetch all patient medical data in parallel
    const [
      medicalHistory,
      medications,
      allergies,
      vitalSigns,
      encounters,
      immunizations,
      serviceRequests,
      labResults,
      clinicalEvolution,
    ] = await Promise.all([
      getPatientMedicalHistory(patientId, organizationId, 20),
      getPatientMedications(patientId, organizationId, true),
      getPatientAllergies(patientId, organizationId),
      getPatientVitalSigns(patientId, organizationId, 1),
      getPatientEncounters(patientId, organizationId, 10),
      getPatientImmunizations(patientId, 20),
      getPatientServiceRequests(patientId, 20),
      getPatientLabResults(patientId, 30),
      getPatientClinicalEvolution(patientId, 10),
    ])

    // Use clinical evolution data for encounters (more complete than basic encounters)
    const consultationEntries: ConsultationEntry[] = clinicalEvolution.length > 0
      ? clinicalEvolution
      : encounters.map((encounter) => ({
          id: encounter.id,
          date: encounter.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
          type: mapEncounterTypeToDisplay(encounter.type),
          doctor: encounter.doctorName,
          summary: encounter.notes || encounter.diagnosis || 'Consulta general',
        }))

    // Map allergies
    const ipsAllergies: IPSAllergy[] = allergies.map((allergy) => ({
      name: allergy.allergen,
      severity: mapSeverityToDisplay(allergy.severity),
      date: allergy.dateIdentified?.toISOString().split('T')[0],
      doctor: 'Dr. Sistema', // TODO: Add doctor info to allergy data
      notes: allergy.notes || allergy.reaction || undefined,
    }))

    // Map medications
    const ipsMedications: IPSMedication[] = medications.map((med) => ({
      name: med.name,
      dose: med.dose || `${med.frequency || 'Según indicación'}`,
      date: med.startDate.toISOString().split('T')[0],
      doctor: med.prescribedBy || 'Dr. Sistema',
      notes: med.notes || undefined,
    }))

    // Map conditions
    const ipsConditions: IPSCondition[] = medicalHistory.map((condition) => ({
      name: condition.condition,
      status: mapConditionStatusToDisplay(condition.status),
      date: condition.diagnosedDate.toISOString().split('T')[0],
      doctor: condition.doctorName || 'Dr. Sistema',
      notes: condition.notes || undefined,
    }))

    // Map vital signs to our format
    const latestVitalSigns: VitalSignsData | null = vitalSigns.length > 0
      ? {
          bloodPressure: vitalSigns[0].bloodPressureSystolic && vitalSigns[0].bloodPressureDiastolic
            ? `${vitalSigns[0].bloodPressureSystolic}/${vitalSigns[0].bloodPressureDiastolic}`
            : undefined,
          heartRate: vitalSigns[0].heartRate?.toString(),
          temperature: vitalSigns[0].temperature?.toString(),
          weight: vitalSigns[0].weight?.toString(),
          height: vitalSigns[0].height?.toString(),
          respiratoryRate: vitalSigns[0].respiratoryRate?.toString(),
          oxygenSaturation: vitalSigns[0].oxygenSaturation?.toString(),
          date: vitalSigns[0].date.toISOString().split('T')[0],
          recordedBy: vitalSigns[0].recordedBy || 'Personal de enfermería',
        }
      : null

    // Map vaccines/immunizations
    const ipsVaccines: IPSVaccine[] = immunizations.map((immunization) => ({
      name: immunization.name,
      date: immunization.date,
      site: immunization.site,
      doctor: immunization.doctor,
      notes: immunization.notes,
    }))

    // Map service requests to orders
    const ipsOrders: IPSOrder[] = serviceRequests.map((request) => ({
      name: request.name,
      type: request.type,
      status: request.status,
      priority: request.priority,
      date: request.date,
      doctor: request.doctor,
      notes: request.notes,
    }))

    // Map lab results
    const ipsLabResults: IPSResult[] = labResults.map((result) => ({
      name: result.name,
      value: result.value,
      unit: result.unit,
      date: result.date,
      flag: result.flag,
      referenceRange: result.referenceRange,
      doctor: result.doctor,
      notes: result.notes,
    }))

    // Build IPS data structure
    const ipsData: IPSDisplayData = {
      encounters: consultationEntries,
      allergies: ipsAllergies,
      medications: ipsMedications,
      conditions: ipsConditions,
      vaccines: ipsVaccines,
      labOrders: ipsOrders,
      labResults: ipsLabResults,
      clinicalEvolution: clinicalEvolution,
    }

    return {
      ipsData,
      vitalSigns: latestVitalSigns,
    }
  } catch (error) {
    console.error('Error fetching patient IPS data:', error)

    // Return empty structure in case of error
    return {
      ipsData: {
        encounters: [],
        allergies: [],
        medications: [],
        conditions: [],
        vaccines: [],
        labOrders: [],
        labResults: [],
      },
      vitalSigns: null,
    }
  }
}

// Helper functions for mapping data types

function mapEncounterTypeToDisplay(type: string): string {
  const typeMap: Record<string, string> = {
    consultation: 'Consulta General',
    emergency: 'Emergencia',
    telemedicine: 'Telemedicina',
    'follow-up': 'Seguimiento',
    AMB: 'Consulta Ambulatoria',
    EMER: 'Emergencia',
    VR: 'Virtual/Telemedicina',
  }
  return typeMap[type] || 'Consulta'
}

function mapSeverityToDisplay(severity: string): string {
  const severityMap: Record<string, string> = {
    mild: 'Leve',
    moderate: 'Moderada',
    severe: 'Severa',
  }
  return severityMap[severity] || 'Moderada'
}

function mapConditionStatusToDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Activa',
    resolved: 'Resuelta',
    chronic: 'Crónica',
  }
  return statusMap[status] || 'Activa'
}

function getServiceRequestType(system?: string): string {
  if (system?.includes('loinc')) return 'Laboratorio'
  if (system?.includes('radiology')) return 'Imagen'
  if (system?.includes('snomed')) return 'Procedimiento'
  return 'Orden Médica'
}

function mapServiceRequestStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Activa',
    completed: 'Completada',
    cancelled: 'Cancelada',
    draft: 'Borrador',
    'on-hold': 'En espera',
  }
  return statusMap[status] || 'Pendiente'
}

function mapPriority(priority?: string): string {
  const priorityMap: Record<string, string> = {
    routine: 'Rutina',
    urgent: 'Urgente',
    asap: 'Lo antes posible',
    stat: 'STAT',
  }
  return priorityMap[priority || 'routine'] || 'Rutina'
}

function mapObservationFlag(code?: string): string {
  const flagMap: Record<string, string> = {
    H: 'Alto',
    L: 'Bajo',
    HH: 'Crítico Alto',
    LL: 'Crítico Bajo',
    A: 'Anormal',
    N: 'Normal',
  }
  return flagMap[code || 'N'] || 'Normal'
}