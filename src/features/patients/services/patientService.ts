/**
 * Patient Service — Firebase FHIR integration
 * CRUD operations for patients and medical data (conditions, medications, allergies, vitals, encounters)
 * Uses patients_fhir collection with FHIR-compatible format
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type {
    Patient,
    PatientMedicalHistory,
    PatientMedication,
    PatientAllergy,
    PatientVitalSigns,
    PatientEncounter,
} from '../types/patient'

// ─── Helpers ────────────────────────────────────────────────

const parseFirestoreDate = (dateField: any): Date => {
    if (!dateField) return new Date()
    if (dateField instanceof Date) return dateField
    if (typeof dateField.toDate === 'function') return dateField.toDate()
    if (typeof dateField === 'string' || typeof dateField === 'number') return new Date(dateField)
    return new Date()
}

function fhirPatientToPatient(docId: string, data: any): Patient | null {
    if (data.resourceType !== 'Patient') return null

    return {
        id: docId,
        name:
            data.name?.[0]?.text ||
            data.customFields?.name ||
            `${data.name?.[0]?.given?.[0] || ''} ${data.name?.[0]?.family || ''}`.trim(),
        email: data.telecom?.find((t: any) => t.system === 'email')?.value || '',
        phone: data.telecom?.find((t: any) => t.system === 'phone')?.value || '',
        birthDate: data.birthDate || '',
        ...(data.customFields?.age !== undefined && { age: data.customFields.age }),
        gender: data.gender || 'unknown',
        address: data.address?.[0]?.text || '',
        cedula: data.customFields?.cedula || '',
        streetAndNumber: data.customFields?.streetAndNumber || '',
        city: data.customFields?.city || '',
        state: data.customFields?.state || '',
        postalCode: data.customFields?.postalCode || '',
        country: data.customFields?.country || '',
        emergencyContact: data.customFields?.emergencyContact || '',
        emergencyPhone: data.customFields?.emergencyPhone || '',
        emergencyRelationship: data.customFields?.emergencyRelationship || '',
        photoURL: data.customFields?.photoURL || '',
        createdAt: data.meta?.lastUpdated ? new Date(data.meta.lastUpdated) : new Date(),
        updatedAt: data.meta?.lastUpdated ? new Date(data.meta.lastUpdated) : new Date(),
    }
}

// ─── Read ───────────────────────────────────────────────────

export async function getPatientById(
    patientId: string,
    organizationId: string
): Promise<Patient | null> {
    try {
        const patientDoc = doc(firestore, 'patients_fhir', patientId)
        const docSnap = await getDoc(patientDoc)
        if (!docSnap.exists()) return null
        return fhirPatientToPatient(docSnap.id, docSnap.data())
    } catch (error) {
        console.warn('Could not fetch patient from FHIR collection:', error)
        return null
    }
}

export async function getPatientsForOrganization(organizationId: string): Promise<Patient[]> {
    try {
        const patientsRef = collection(firestore, 'patients_fhir')
        const q = query(
            patientsRef,
            where('managingOrganization.reference', '==', `Organization/${organizationId}`),
            where('active', '==', true)
        )
        const snapshot = await getDocs(q)
        const patients: Patient[] = []

        snapshot.forEach((docSnap) => {
            const p = fhirPatientToPatient(docSnap.id, docSnap.data())
            if (p) patients.push(p)
        })

        return patients
    } catch (error) {
        console.warn('Could not fetch patients for organization:', error)
        return []
    }
}

// ─── Write ──────────────────────────────────────────────────

export async function createOrUpdatePatient(
    patientData: Partial<Patient>,
    organizationId: string
): Promise<string> {
    const patientId = patientData.id || `patient_${Date.now()}`
    const fullName = patientData.name || ''
    const nameParts = fullName.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const fhirPatient: any = {
        resourceType: 'Patient',
        id: patientId,
        meta: {
            lastUpdated: new Date().toISOString(),
            profile: ['http://hl7.org/fhir/StructureDefinition/Patient'],
        },
        identifier: [{ system: 'altea-patient-id', value: patientId }],
        active: true,
        name: [{ use: 'official', family: lastName, given: firstName ? [firstName] : [], text: fullName }],
        telecom: [
            ...(patientData.email ? [{ system: 'email', value: patientData.email, use: 'home' }] : []),
            ...(patientData.phone ? [{ system: 'phone', value: patientData.phone, use: 'mobile' }] : []),
        ],
        gender: patientData.gender || 'unknown',
        address: patientData.address
            ? [{ use: 'home', text: patientData.address, line: [patientData.address] }]
            : [],
        contact: [],
        communication: [
            { language: { coding: [{ system: 'urn:ietf:bcp:47', code: 'es', display: 'Spanish' }] }, preferred: true },
        ],
        managingOrganization: { reference: `Organization/${organizationId}`, display: organizationId },
        customFields: {
            organizationId,
            cedula: patientData.cedula || '',
            age: patientData.age || null,
            streetAndNumber: patientData.streetAndNumber || '',
            city: patientData.city || '',
            state: patientData.state || '',
            postalCode: patientData.postalCode || '',
            country: patientData.country || '',
            emergencyContact: patientData.emergencyContact || '',
            emergencyPhone: patientData.emergencyPhone || '',
            emergencyRelationship: patientData.emergencyRelationship || '',
            photoURL: patientData.photoURL || '',
            name: fullName,
        },
    }

    if (patientData.birthDate) {
        fhirPatient.birthDate =
            typeof patientData.birthDate === 'string'
                ? patientData.birthDate
                : patientData.birthDate
    }

    const patientRef = doc(firestore, 'patients_fhir', patientId)
    await setDoc(patientRef, fhirPatient, { merge: true })
    return patientId
}

export async function updatePatient(
    patientId: string,
    updates: Partial<Patient>,
    organizationId: string
): Promise<void> {
    const currentPatient = await getPatientById(patientId, organizationId)
    if (!currentPatient) throw new Error('Patient not found')
    const mergedData = { ...currentPatient, ...updates, id: patientId }
    await createOrUpdatePatient(mergedData, organizationId)
}

export async function deletePatient(patientId: string, _organizationId: string): Promise<void> {
    const patientRef = doc(firestore, 'patients_fhir', patientId)
    await updateDoc(patientRef, { active: false, 'meta.lastUpdated': new Date().toISOString() })
}

export async function findPatientByCedula(
    cedula: string,
    organizationId: string
): Promise<Patient | null> {
    try {
        const patientsRef = collection(firestore, 'patients_fhir')
        const q = query(
            patientsRef,
            where('managingOrganization.reference', '==', `Organization/${organizationId}`),
            where('customFields.cedula', '==', cedula),
            where('active', '==', true)
        )
        const snapshot = await getDocs(q)
        if (snapshot.empty) return null
        return fhirPatientToPatient(snapshot.docs[0].id, snapshot.docs[0].data())
    } catch {
        return null
    }
}

export async function findOrCreatePatient(
    patientData: {
        name: string
        cedula?: string
        email?: string
        phone?: string
        birthDate?: string
        age?: number
        gender?: 'male' | 'female' | 'other' | 'unknown'
        address?: string
    },
    organizationId: string
): Promise<Patient> {
    if (!organizationId) throw new Error('Organization ID is required')
    if (!patientData.name?.trim()) throw new Error('Patient name is required')

    if (patientData.cedula?.trim()) {
        const existing = await findPatientByCedula(patientData.cedula, organizationId)
        if (existing) return existing
    }

    const newId = await createOrUpdatePatient(
        { ...patientData, name: patientData.name.trim() },
        organizationId
    )
    const created = await getPatientById(newId, organizationId)
    if (!created) throw new Error('Failed to retrieve created patient')
    return created
}

// ─── Medical Data ───────────────────────────────────────────

export async function getPatientMedicalHistory(
    patientId: string,
    _organizationId: string,
    limitCount = 10
): Promise<PatientMedicalHistory[]> {
    try {
        const history: PatientMedicalHistory[] = []
        const processedConditions = new Set<string>()

        const addCondition = (item: PatientMedicalHistory) => {
            const key = item.condition.toLowerCase().trim()
            if (!processedConditions.has(key)) {
                history.push(item)
                processedConditions.add(key)
            }
        }

        // Embedded conditions
        const patientSnap = await getDoc(doc(firestore, 'patients_fhir', patientId))
        if (patientSnap.exists()) {
            const pd = patientSnap.data()
            if (Array.isArray(pd.conditions)) {
                pd.conditions.forEach((c: any, i: number) => {
                    if (c.resourceType === 'Condition') {
                        addCondition({
                            id: c.id || `embedded_${i}`,
                            patientId,
                            condition: c.code?.text || c.code?.coding?.[0]?.display || 'Unknown',
                            diagnosedDate: c.onsetDateTime ? new Date(c.onsetDateTime) : c.recordedDate ? new Date(c.recordedDate) : new Date(),
                            status: c.clinicalStatus?.coding?.[0]?.code === 'active' ? 'active' : c.clinicalStatus?.coding?.[0]?.code === 'resolved' ? 'resolved' : 'chronic',
                            notes: c.note?.[0]?.text || '',
                            doctorId: c.recorder?.reference?.replace('Practitioner/', '') || '',
                            doctorName: c.recorder?.display || '',
                        })
                    }
                })
            }
        }

        // FHIR collection
        const conditionsRef = collection(firestore, 'conditions_fhir')
        const q = query(conditionsRef, where('subject.reference', '==', `Patient/${patientId}`), limit(limitCount))
        const snap = await getDocs(q)
        snap.forEach((d) => {
            const data = d.data()
            if (data.resourceType === 'Condition') {
                addCondition({
                    id: d.id,
                    patientId,
                    condition: data.code?.text || data.code?.coding?.[0]?.display || 'Unknown',
                    diagnosedDate: data.recordedDate ? new Date(data.recordedDate) : new Date(),
                    status: data.clinicalStatus?.coding?.[0]?.code === 'active' ? 'active' : data.clinicalStatus?.coding?.[0]?.code === 'resolved' ? 'resolved' : 'chronic',
                    notes: data.note?.[0]?.text || '',
                    doctorId: data.recorder?.reference?.replace('Practitioner/', '') || '',
                    doctorName: data.recorder?.display || '',
                })
            }
        })

        return history.slice(0, limitCount)
    } catch {
        return []
    }
}

export async function getPatientMedications(
    patientId: string,
    _organizationId: string,
    activeOnly = true
): Promise<PatientMedication[]> {
    try {
        const medications: PatientMedication[] = []
        const processedNames = new Set<string>()

        const addMed = (item: PatientMedication) => {
            const key = item.name.toLowerCase().trim()
            if (!processedNames.has(key) && (!activeOnly || item.status === 'active')) {
                medications.push(item)
                processedNames.add(key)
            }
        }

        // Embedded
        const patientSnap = await getDoc(doc(firestore, 'patients_fhir', patientId))
        if (patientSnap.exists()) {
            const pd = patientSnap.data()
            if (Array.isArray(pd.medications)) {
                pd.medications.forEach((m: any, i: number) => {
                    if (m.resourceType === 'MedicationStatement') {
                        addMed({
                            id: m.id || `embedded_${i}`,
                            patientId,
                            name: m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown',
                            dose: m.dosage?.[0]?.text || '',
                            frequency: m.dosage?.[0]?.timing?.repeat?.frequency?.toString() || '',
                            startDate: m.effectiveDateTime ? new Date(m.effectiveDateTime) : new Date(),
                            ...(m.effectivePeriod?.end && { endDate: new Date(m.effectivePeriod.end) }),
                            status: m.status || 'active',
                            prescribedBy: m.informationSource?.display || '',
                            notes: m.note?.[0]?.text || '',
                        })
                    }
                })
            }
        }

        // FHIR collection
        const medsRef = collection(firestore, 'medication_statements_fhir')
        const q = query(medsRef, where('subject.reference', '==', `Patient/${patientId}`), limit(20))
        const snap = await getDocs(q)
        snap.forEach((d) => {
            const data = d.data()
            if (data.resourceType === 'MedicationStatement') {
                addMed({
                    id: d.id,
                    patientId,
                    name: data.medicationCodeableConcept?.text || data.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown',
                    dose: data.dosage?.[0]?.text || '',
                    frequency: data.dosage?.[0]?.timing?.repeat?.frequency?.toString() || '',
                    startDate: data.effectiveDateTime ? new Date(data.effectiveDateTime) : new Date(),
                    ...(data.effectivePeriod?.end && { endDate: new Date(data.effectivePeriod.end) }),
                    status: data.status || 'active',
                    prescribedBy: data.informationSource?.display || '',
                    notes: data.note?.[0]?.text || '',
                })
            }
        })

        return medications
    } catch {
        return []
    }
}

export async function getPatientAllergies(
    patientId: string,
    _organizationId: string
): Promise<PatientAllergy[]> {
    try {
        const allergies: PatientAllergy[] = []
        const allergiesRef = collection(firestore, 'allergy_intolerances_fhir')
        const q = query(allergiesRef, where('patient.reference', '==', `Patient/${patientId}`), limit(20))
        const snap = await getDocs(q)
        snap.forEach((d) => {
            const data = d.data()
            if (data.resourceType === 'AllergyIntolerance') {
                allergies.push({
                    id: d.id,
                    patientId,
                    allergen: data.code?.text || data.code?.coding?.[0]?.display || 'Unknown',
                    severity: data.criticality === 'high' ? 'severe' : data.criticality === 'low' ? 'mild' : 'moderate',
                    reaction: data.reaction?.[0]?.manifestation?.[0]?.text || '',
                    ...(data.recordedDate && { dateIdentified: new Date(data.recordedDate) }),
                    notes: data.note?.[0]?.text || '',
                })
            }
        })
        return allergies
    } catch {
        return []
    }
}

export async function getPatientVitalSigns(
    patientId: string,
    _organizationId: string,
    limitCount = 1
): Promise<PatientVitalSigns[]> {
    try {
        const vitalsByDate = new Map<string, Partial<PatientVitalSigns>>()

        // Embedded observations
        const patientSnap = await getDoc(doc(firestore, 'patients_fhir', patientId))
        if (patientSnap.exists()) {
            const pd = patientSnap.data()
            if (Array.isArray(pd.observations)) {
                pd.observations.forEach((obs: any) => {
                    if (obs.resourceType === 'Observation') {
                        const date = obs.effectiveDateTime || obs.effectiveInstant
                        const dateKey = date ? new Date(date).toDateString() : new Date().toDateString()
                        const existing: Partial<PatientVitalSigns> = vitalsByDate.get(dateKey) || {
                            id: obs.id || `embedded_${dateKey}`,
                            patientId,
                            date: new Date(date),
                            recordedBy: obs.performer?.[0]?.display || '',
                        }
                        const code = obs.code?.coding?.[0]?.code
                        const value = obs.valueQuantity?.value
                        switch (code) {
                            case '8480-6': existing.bloodPressureSystolic = value; break
                            case '8462-4': existing.bloodPressureDiastolic = value; break
                            case '8867-4': existing.heartRate = value; break
                            case '8310-5': existing.temperature = value; break
                            case '29463-7': existing.weight = value; break
                            case '8302-2': existing.height = value; break
                            case '9279-1': existing.respiratoryRate = value; break
                            case '2708-6': existing.oxygenSaturation = value; break
                        }
                        vitalsByDate.set(dateKey, existing)
                    }
                })
            }
        }

        // FHIR observations collection
        const obsRef = collection(firestore, 'observations_fhir')
        const q = query(obsRef, where('subject.reference', '==', `Patient/${patientId}`), limit(100))
        const snap = await getDocs(q)
        const rawDocs = snap.docs.map((d) => ({ doc: d, data: d.data() }))
        rawDocs.sort((a, b) => {
            const dateA = a.data.effectiveDateTime || a.data.effectiveInstant
            const dateB = b.data.effectiveDateTime || b.data.effectiveInstant
            return new Date(dateA || 0).getTime() - new Date(dateB || 0).getTime()
        })
        rawDocs.forEach(({ doc: d, data }) => {
            if (data.resourceType === 'Observation') {
                const date = data.effectiveDateTime || data.effectiveInstant
                const dateKey = date ? new Date(date).toDateString() : new Date().toDateString()
                const existing: Partial<PatientVitalSigns> = vitalsByDate.get(dateKey) || {
                    id: d.id,
                    patientId,
                    date: date ? new Date(date) : new Date(),
                    recordedBy: data.performer?.[0]?.display || '',
                }
                const code = data.code?.coding?.[0]?.code
                const value = data.valueQuantity?.value
                switch (code) {
                    case '8480-6': existing.bloodPressureSystolic = value; break
                    case '8462-4': existing.bloodPressureDiastolic = value; break
                    case '8867-4': existing.heartRate = value; break
                    case '8310-5': existing.temperature = value; break
                    case '29463-7': existing.weight = value; break
                    case '8302-2': existing.height = value; break
                    case '9279-1': existing.respiratoryRate = value; break
                    case '2708-6': existing.oxygenSaturation = value; break
                }
                vitalsByDate.set(dateKey, existing)
            }
        })

        const vitalSigns = Array.from(vitalsByDate.values()) as PatientVitalSigns[]
        vitalSigns.sort((a, b) => b.date.getTime() - a.date.getTime())
        return vitalSigns.slice(0, limitCount)
    } catch {
        return []
    }
}

export async function getPatientEncounters(
    patientId: string,
    organizationId: string,
    limitCount = 5
): Promise<PatientEncounter[]> {
    try {
        const encounters: PatientEncounter[] = []

        // Embedded encounters
        const patientSnap = await getDoc(doc(firestore, 'patients_fhir', patientId))
        if (patientSnap.exists()) {
            const pd = patientSnap.data()
            if (Array.isArray(pd.encounters)) {
                pd.encounters.forEach((enc: any, i: number) => {
                    if (enc.resourceType === 'Encounter') {
                        encounters.push({
                            id: enc.id || `embedded_${i}`,
                            patientId,
                            date: parseFirestoreDate(enc.period?.start),
                            type: enc.class?.code === 'AMB' ? 'consultation' : enc.class?.code === 'EMER' ? 'emergency' : enc.type?.[0]?.coding?.[0]?.code === 'teleconsultation' ? 'telemedicine' : 'follow-up',
                            doctorId: enc.participant?.[0]?.individual?.reference?.replace('Practitioner/', '') || '',
                            doctorName: enc.participant?.[0]?.individual?.display || 'Unknown Doctor',
                            notes: enc.reasonCode?.[0]?.text || '',
                            diagnosis: enc.diagnosis?.[0]?.condition?.display || '',
                            status: enc.status === 'finished' ? 'completed' : enc.status === 'in-progress' ? 'in-progress' : enc.status === 'planned' ? 'scheduled' : 'cancelled',
                            organizationId,
                        })
                    }
                })
            }
        }

        // FHIR collection
        const encountersRef = collection(firestore, 'encounters_fhir')
        let querySnapshot
        try {
            const q = query(encountersRef, where('subject.reference', '==', `Patient/${patientId}`), orderBy('period.start', 'desc'), limit(limitCount))
            querySnapshot = await getDocs(q)
        } catch {
            const qFallback = query(encountersRef, where('subject.reference', '==', `Patient/${patientId}`), limit(50))
            querySnapshot = await getDocs(qFallback)
        }

        querySnapshot.forEach((d) => {
            const data = d.data()
            if (data.resourceType === 'Encounter') {
                encounters.push({
                    id: d.id,
                    patientId,
                    date: parseFirestoreDate(data.period?.start),
                    type: data.class?.code === 'AMB' ? 'consultation' : data.class?.code === 'EMER' ? 'emergency' : data.type?.[0]?.coding?.[0]?.code === 'teleconsultation' ? 'telemedicine' : 'follow-up',
                    doctorId: data.participant?.[0]?.individual?.reference?.replace('Practitioner/', '') || '',
                    doctorName: data.participant?.[0]?.individual?.display || 'Unknown Doctor',
                    notes: data.reasonCode?.[0]?.text || '',
                    diagnosis: data.diagnosis?.[0]?.condition?.display || '',
                    status: data.status === 'finished' ? 'completed' : data.status === 'in-progress' ? 'in-progress' : data.status === 'planned' ? 'scheduled' : 'cancelled',
                    organizationId,
                })
            }
        })

        encounters.sort((a, b) => b.date.getTime() - a.date.getTime())
        return encounters.slice(0, limitCount)
    } catch {
        return []
    }
}

// ─── Additional FHIR Data Functions ────────────────────────────

export interface PatientImmunization {
    id: string
    patientId: string
    vaccineName: string
    vaccineCode?: string
    date: Date
    lotNumber?: string
    site?: string
    route?: string
    performer?: string
    doseNumber?: number
    seriesDoses?: number
    status: 'completed' | 'entered-in-error' | 'not-done'
    notes?: string
}

export interface PatientServiceRequest {
    id: string
    patientId: string
    testName: string
    requestedDate: Date
    status: 'active' | 'completed' | 'cancelled' | 'unknown'
    requester?: string
    requesterName?: string
    priority?: 'routine' | 'urgent' | 'asap' | 'stat'
    notes?: string
}

export interface PatientLabResult {
    id: string
    patientId: string
    testName: string
    date: Date
    value: string
    unit?: string
    referenceRange?: string
    flag?: 'high' | 'low' | 'normal' | 'critical' | 'abnormal'
    status: 'final' | 'registered' | 'preliminary' | 'unknown'
    performer?: string
    notes?: string
}

/**
 * Get patient immunizations using FHIR immunizations collection
 */
export async function getPatientImmunizations(
    patientId: string,
    organizationId: string,
    limitCount: number = 20
): Promise<PatientImmunization[]> {
    try {
        const immunizations: PatientImmunization[] = []
        const immunizationsRef = collection(firestore, 'immunizations_fhir')
        const patientReference = `Patient/${patientId}`

        let querySnapshot
        try {
            const q = query(
                immunizationsRef,
                where('patient.reference', '==', patientReference),
                orderBy('occurrenceDateTime', 'desc'),
                limit(50)
            )
            querySnapshot = await getDocs(q)
        } catch (err: any) {
            if (err?.code === 'failed-precondition') {
                console.warn('⚠️ [getPatientImmunizations] Index missing, falling back to client-sort:', err.message)
                const qFallback = query(
                    immunizationsRef,
                    where('patient.reference', '==', patientReference),
                    limit(50)
                )
                querySnapshot = await getDocs(qFallback)
            } else {
                throw err
            }
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data()
            if (data.resourceType === 'Immunization') {
                const immunization: PatientImmunization = {
                    id: docSnap.id,
                    patientId: patientId,
                    vaccineName: data.vaccineCode?.text ||
                        data.vaccineCode?.coding?.[0]?.display ||
                        'Unknown vaccine',
                    vaccineCode: data.vaccineCode?.coding?.[0]?.code || '',
                    date: data.occurrenceDateTime ? new Date(data.occurrenceDateTime) : new Date(),
                    lotNumber: data.lotNumber || '',
                    site: data.site?.text || data.site?.coding?.[0]?.display || '',
                    route: data.route?.coding?.[0]?.display || '',
                    performer: data.performer?.[0]?.actor?.display || '',
                    doseNumber: data.protocolApplied?.[0]?.doseNumberPositiveInt,
                    seriesDoses: data.protocolApplied?.[0]?.seriesDosesPositiveInt,
                    status: data.status || 'completed',
                    notes: data.note?.[0]?.text || ''
                }
                immunizations.push(immunization)
            }
        })

        immunizations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return immunizations.slice(0, limitCount)
    } catch (error: any) {
        console.warn('Could not fetch immunizations:', error)
        return []
    }
}

/**
 * Get patient service requests (lab/imaging orders)
 */
export async function getPatientServiceRequests(
    patientId: string,
    organizationId: string,
    limitCount: number = 5
): Promise<PatientServiceRequest[]> {
    try {
        const requests: PatientServiceRequest[] = []
        const requestsRef = collection(firestore, 'service_requests_fhir')
        const patientReference = `Patient/${patientId}`

        const q = query(
            requestsRef,
            where('subject.reference', '==', patientReference),
            limit(limitCount)
        )

        const querySnapshot = await getDocs(q)

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data()
            if (data.resourceType === 'ServiceRequest') {
                const request: PatientServiceRequest = {
                    id: docSnap.id,
                    patientId: patientId,
                    testName: data.code?.text || data.code?.coding?.[0]?.display || 'Unknown test',
                    requestedDate: data.authoredOn ? new Date(data.authoredOn) : new Date(),
                    status: data.status === 'active' ? 'active' :
                        data.status === 'completed' ? 'completed' :
                        data.status === 'revoked' ? 'cancelled' : 'unknown',
                    requester: data.requester?.display || '',
                    notes: data.note?.[0]?.text || ''
                }
                requests.push(request)
            }
        })

        requests.sort((a, b) => b.requestedDate.getTime() - a.requestedDate.getTime())
        return requests
    } catch (error: any) {
        console.warn('Could not fetch service requests:', error)
        return []
    }
}

/**
 * Get patient lab results (observations with category 'laboratory')
 */
export async function getPatientLabResults(
    patientId: string,
    organizationId: string,
    limitCount: number = 5
): Promise<PatientLabResult[]> {
    try {
        const results: PatientLabResult[] = []
        const obsRef = collection(firestore, 'observations_fhir')
        const patientReference = `Patient/${patientId}`

        let querySnapshot
        try {
            const q = query(
                obsRef,
                where('subject.reference', '==', patientReference),
                orderBy('effectiveDateTime', 'desc'),
                limit(100)
            )
            querySnapshot = await getDocs(q)
        } catch (err: any) {
            if (err?.code === 'failed-precondition') {
                console.warn('⚠️ [getPatientLabResults] Index missing, falling back to client-sort:', err.message)
                const qFallback = query(
                    obsRef,
                    where('subject.reference', '==', patientReference),
                    limit(100)
                )
                querySnapshot = await getDocs(qFallback)
            } else {
                throw err
            }
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data()
            const isLab = data.category?.some((c: any) =>
                c.coding?.some((code: any) =>
                    code.code === 'laboratory' ||
                    code.display === 'Laboratory' ||
                    code.code === 'LAB'
                )
            )

            if (isLab) {
                let value = ''
                let unit = ''

                if (data.valueQuantity) {
                    value = data.valueQuantity.value?.toString() || ''
                    unit = data.valueQuantity.unit || ''
                } else if (data.valueString) {
                    value = data.valueString
                }

                let flag: any = undefined
                const interpretation = data.interpretation?.[0]?.coding?.[0]?.code
                if (interpretation === 'H') flag = 'high'
                if (interpretation === 'L') flag = 'low'
                if (interpretation === 'A' || interpretation === 'Abnormal') flag = 'abnormal'
                if (interpretation === 'Critical') flag = 'critical'

                const result: PatientLabResult = {
                    id: docSnap.id,
                    patientId: patientId,
                    testName: data.code?.text || data.code?.coding?.[0]?.display || 'Unknown test',
                    date: data.effectiveDateTime ? new Date(data.effectiveDateTime) : new Date(),
                    value: value || 'Ver reporte',
                    unit: unit,
                    referenceRange: data.referenceRange?.[0]?.text || '',
                    flag: flag,
                    status: data.status as any,
                    performer: data.performer?.[0]?.display || '',
                    notes: data.note?.[0]?.text || ''
                }
                results.push(result)
            }
        })

        results.sort((a, b) => b.date.getTime() - a.date.getTime())
        return results.slice(0, limitCount)
    } catch (error: any) {
        console.warn('Could not fetch lab results:', error)
        return []
    }
}
