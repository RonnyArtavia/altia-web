/**
 * FHIR Consultation Service
 * Persists consultation results into normalized FHIR collections in Firestore.
 * Migrated from altea-movil — no altea-shared dependency.
 */

import {
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    limit,
    type Query,
    type DocumentData,
} from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import type {
    ConsultationContext,
    ConsultationResult,
    SavedResources,
    VitalSignsInput,
    ConditionInput,
    MedicationInput,
    AllergyInput,
    ProcedureInput,
    ServiceRequestInput,
    ImmunizationInput,
    LabResultInput,
    SOAPNote,
} from '../types/consultation'

// Re-export types for convenience
export type {
    ConsultationContext,
    ConsultationResult,
    SavedResources,
    ConditionInput,
    MedicationInput,
    AllergyInput,
    ProcedureInput,
    ServiceRequestInput,
    LabResultInput,
}

// ─── Utilities ──────────────────────────────────────────────

function generateId(prefix: string): string {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 8)
    return `${prefix}_${ts}_${rand}`
}

function now(): string {
    return new Date().toISOString()
}

// ─── FHIR LOINC Vital Signs ────────────────────────────────

const VITAL_SIGNS_LOINC: Record<
    keyof VitalSignsInput,
    { code: string; display: string; unit: string; ucumCode: string }
> = {
    bloodPressureSystolic: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', ucumCode: 'mm[Hg]' },
    bloodPressureDiastolic: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', ucumCode: 'mm[Hg]' },
    heartRate: { code: '8867-4', display: 'Heart rate', unit: 'bpm', ucumCode: '/min' },
    temperature: { code: '8310-5', display: 'Body temperature', unit: '°C', ucumCode: 'Cel' },
    weight: { code: '29463-7', display: 'Body weight', unit: 'kg', ucumCode: 'kg' },
    height: { code: '8302-2', display: 'Body height', unit: 'cm', ucumCode: 'cm' },
    respiratoryRate: { code: '9279-1', display: 'Respiratory rate', unit: '/min', ucumCode: '/min' },
    oxygenSaturation: { code: '2708-6', display: 'Oxygen saturation', unit: '%', ucumCode: '%' },
}

// ─── Enrichment for security rules ─────────────────────────

function enrichWithContext(resource: any, ctx: ConsultationContext): any {
    return {
        ...resource,
        _organizationId: ctx.organizationId,
        _practitionerId: ctx.practitionerId,
        _patientId: ctx.patientId,
        _lastUpdated: now(),
    }
}

// ─── FHIR Resource Builders ────────────────────────────────

function buildFHIREncounter(result: ConsultationResult, encounterId: string): any {
    const ctx = result.context
    const classCode =
        result.consultationType === 'emergency'
            ? 'EMER'
            : result.consultationType === 'telemedicine'
                ? 'VR'
                : 'AMB'

    return {
        resourceType: 'Encounter',
        id: encounterId,
        status: 'in-progress',
        class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: classCode,
            display: classCode === 'AMB' ? 'Ambulatory' : classCode === 'EMER' ? 'Emergency' : 'Virtual',
        },
        type: [
            {
                coding: [{ system: 'http://snomed.info/sct', code: '308335008', display: 'Patient encounter procedure' }],
                text: result.consultationType,
            },
        ],
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        participant: [
            {
                individual: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
            },
        ],
        period: { start: result.startTime, ...(result.endTime && { end: result.endTime }) },
        serviceProvider: { reference: `Organization/${ctx.organizationId}`, display: ctx.organizationName || ctx.organizationId },
        reasonCode: result.soap?.assessment
            ? [{ text: result.soap.assessment.substring(0, 200) }]
            : [],
        meta: { lastUpdated: now(), profile: ['http://hl7.org/fhir/StructureDefinition/Encounter'] },
        ...(ctx.appointmentId && { appointment: [{ reference: `Appointment/${ctx.appointmentId}` }] }),
    }
}

function buildVitalSignsObservations(result: ConsultationResult, encounterId: string): any[] {
    if (!result.vitalSigns) return []
    const ctx = result.context
    const observations: any[] = []

    for (const [key, value] of Object.entries(result.vitalSigns)) {
        if (value == null) continue
        const loinc = VITAL_SIGNS_LOINC[key as keyof VitalSignsInput]
        if (!loinc) continue

        observations.push({
            resourceType: 'Observation',
            id: generateId('obs'),
            status: 'final',
            category: [
                {
                    coding: [
                        { system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' },
                    ],
                },
            ],
            code: { coding: [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }], text: loinc.display },
            subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
            encounter: { reference: `Encounter/${encounterId}` },
            effectiveDateTime: now(),
            valueQuantity: { value, unit: loinc.unit, system: 'http://unitsofmeasure.org', code: loinc.ucumCode },
            performer: [{ reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName }],
            meta: { lastUpdated: now() },
        })
    }
    return observations
}

function buildFHIRCondition(input: ConditionInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'Condition',
        id: generateId('cond'),
        clinicalStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: input.status }],
        },
        verificationStatus: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
        },
        category: [
            { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: input.category }] },
        ],
        code: {
            text: input.text,
            coding: [
                ...(input.icd10Code ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: input.icd10Code, display: input.text }] : []),
                ...(input.snomedCode ? [{ system: 'http://snomed.info/sct', code: input.snomedCode, display: input.text }] : []),
            ],
        },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        recorder: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
        recordedDate: now(),
        ...(input.onsetDate && { onsetDateTime: input.onsetDate }),
        ...(input.notes && { note: [{ text: input.notes, time: now() }] }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRMedicationStatement(input: MedicationInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'MedicationStatement',
        id: generateId('med'),
        status: 'active',
        medicationCodeableConcept: {
            text: input.name,
            coding: input.atcCode ? [{ system: 'http://www.whocc.no/atc', code: input.atcCode, display: input.name }] : [],
        },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        context: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: now(),
        informationSource: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
        dosage: [
            {
                text: `${input.dose} - ${input.frequency} - ${input.route}${input.duration ? ` por ${input.duration}` : ''}`,
                timing: { repeat: { frequency: 1, period: 1, periodUnit: 'd' } },
                route: { text: input.route },
                doseAndRate: [{ doseQuantity: { value: 1, unit: input.dose } }],
            },
        ],
        ...(input.notes && { note: [{ text: input.notes, time: now() }] }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRAllergyIntolerance(input: AllergyInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'AllergyIntolerance',
        id: generateId('allergy'),
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
        verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }] },
        type: input.type,
        category: [input.category],
        criticality: input.criticality,
        code: {
            text: input.allergen,
            coding: input.snomedCode ? [{ system: 'http://snomed.info/sct', code: input.snomedCode, display: input.allergen }] : [],
        },
        patient: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        recorder: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
        recordedDate: now(),
        ...(input.reaction && {
            reaction: [
                {
                    manifestation: [{ text: input.reaction }],
                    severity: input.reactionSeverity || 'moderate',
                },
            ],
        }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRProcedure(input: ProcedureInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'Procedure',
        id: generateId('proc'),
        status: 'completed',
        code: {
            text: input.name,
            coding: input.code ? [{ system: 'http://snomed.info/sct', code: input.code, display: input.name }] : [],
        },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        performedDateTime: input.performedDate || now(),
        performer: [{ actor: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName } }],
        ...(input.notes && { note: [{ text: input.notes }] }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRServiceRequest(input: ServiceRequestInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'ServiceRequest',
        id: generateId('sr'),
        status: 'active',
        intent: 'order',
        priority: input.priority || 'routine',
        code: {
            text: input.name,
            coding: input.code ? [{ system: 'http://loinc.org', code: input.code, display: input.name }] : [],
        },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        requester: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
        authoredOn: now(),
        ...(input.notes && { note: [{ text: input.notes }] }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRImmunization(input: ImmunizationInput, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'Immunization',
        id: generateId('imm'),
        status: input.status || 'completed',
        vaccineCode: {
            text: input.name,
            coding: input.code ? [{ system: 'http://snomed.info/sct', code: input.code, display: input.name }] : [],
        },
        patient: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        occurrenceDateTime: input.date || now(),
        performer: [{ actor: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName } }],
        ...(input.site && { site: { text: input.site } }),
        ...(input.notes && { note: [{ text: input.notes }] }),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRCommunication(text: string, ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'Communication',
        id: generateId('comm'),
        status: 'completed',
        category: [
            { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/communication-category', code: 'instruction', display: 'Instruction' }] },
        ],
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        sender: { reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName },
        recipient: [{ reference: `Patient/${ctx.patientId}`, display: ctx.patientName }],
        payload: [{ contentString: text }],
        sent: now(),
        meta: { lastUpdated: now() },
    }
}

function buildLabResultObservations(results: LabResultInput[], ctx: ConsultationContext, encounterId: string): any[] {
    return results.map((r) => ({
        resourceType: 'Observation',
        id: generateId('lab'),
        status: 'final',
        category: [
            { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory', display: 'Laboratory' }] },
        ],
        code: { text: r.testName || r.name, coding: [] },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: r.date || now(),
        ...(isNaN(Number(r.value))
            ? { valueString: r.value }
            : { valueQuantity: { value: Number(r.value), unit: r.unit || '' } }),
        ...(r.referenceRange && {
            referenceRange: [{ text: r.referenceRange }],
        }),
        ...(r.flag && r.flag !== 'normal' && {
            interpretation: [
                {
                    coding: [
                        {
                            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                            code: r.flag === 'high' ? 'H' : r.flag === 'low' ? 'L' : r.flag === 'critical' ? 'HH' : 'A',
                            display: r.flag,
                        },
                    ],
                },
            ],
        }),
        performer: [{ reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName }],
        meta: { lastUpdated: now() },
    }))
}

function buildFHIRDiagnosticReport(observations: any[], ctx: ConsultationContext, encounterId: string): any {
    return {
        resourceType: 'DiagnosticReport',
        id: generateId('dr'),
        status: 'final',
        category: [
            { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB', display: 'Laboratory' }] },
        ],
        code: { text: 'Lab Results', coding: [{ system: 'http://loinc.org', code: '11502-2', display: 'Laboratory report' }] },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: now(),
        issued: now(),
        performer: [{ reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName }],
        result: observations.map((o) => ({ reference: `Observation/${o.id}`, display: o.code?.text || '' })),
        meta: { lastUpdated: now() },
    }
}

function buildFHIRComposition(result: ConsultationResult, encounterId: string, saved: Partial<SavedResources>): any {
    const ctx = result.context
    const buildEntries = (ids?: string[], prefix?: string) =>
        ids?.map((id) => ({ reference: `${prefix}/${id}` })) || []

    const sections = [
        {
            title: 'Subjective',
            code: { coding: [{ system: 'http://loinc.org', code: '10164-2', display: 'History of Present illness Narrative' }] },
            text: { status: 'generated', div: `<div>${result.soap.subjective}</div>` },
        },
        {
            title: 'Objective',
            code: { coding: [{ system: 'http://loinc.org', code: '8716-3', display: 'Vital signs' }] },
            text: { status: 'generated', div: `<div>${result.soap.objective}</div>` },
            entry: buildEntries(saved.observationIds, 'Observation'),
        },
        {
            title: 'Assessment',
            code: { coding: [{ system: 'http://loinc.org', code: '51848-0', display: 'Assessment' }] },
            text: { status: 'generated', div: `<div>${result.soap.assessment}</div>` },
            entry: buildEntries(saved.conditionIds, 'Condition'),
        },
        {
            title: 'Plan',
            code: { coding: [{ system: 'http://loinc.org', code: '18776-5', display: 'Plan of care note' }] },
            text: { status: 'generated', div: `<div>${result.soap.plan}</div>` },
            entry: [
                ...buildEntries(saved.medicationIds, 'MedicationStatement'),
                ...buildEntries(saved.serviceRequestIds, 'ServiceRequest'),
                ...buildEntries(saved.procedureIds, 'Procedure'),
            ],
        },
    ]

    return {
        resourceType: 'Composition',
        id: generateId('comp'),
        status: 'final',
        type: {
            coding: [{ system: 'http://loinc.org', code: '11488-4', display: 'Consult Note' }],
            text: 'SOAP Note',
        },
        subject: { reference: `Patient/${ctx.patientId}`, display: ctx.patientName },
        encounter: { reference: `Encounter/${encounterId}` },
        date: now(),
        author: [{ reference: `Practitioner/${ctx.practitionerId}`, display: ctx.practitionerName }],
        title: `Consultation Note - ${ctx.patientName}`,
        section: sections,
        meta: { lastUpdated: now() },
    }
}

// ─── Main Save Function ────────────────────────────────────

export async function saveConsultationResults(result: ConsultationResult): Promise<SavedResources> {
    const ctx = result.context
    const encounterId = ctx.encounterId || generateId('enc')
    const saved: Partial<SavedResources> = { encounterId }

    // 1. Encounter
    const encounter = enrichWithContext(buildFHIREncounter(result, encounterId), ctx)
    await setDoc(doc(firestore, 'encounters_fhir', encounterId), encounter)

    // 2. Vital Signs
    if (result.vitalSigns) {
        const observations = buildVitalSignsObservations(result, encounterId)
        saved.observationIds = []
        for (const obs of observations) {
            const enriched = enrichWithContext(obs, ctx)
            await setDoc(doc(firestore, 'observations_fhir', obs.id), enriched)
            saved.observationIds.push(obs.id)
        }
    }

    // 3. Conditions
    if (result.conditions?.length) {
        saved.conditionIds = []
        for (const c of result.conditions) {
            const resource = enrichWithContext(buildFHIRCondition(c, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'conditions_fhir', resource.id), resource)
            saved.conditionIds.push(resource.id)
        }
    }

    // 4. Medications
    if (result.medications?.length) {
        saved.medicationIds = []
        for (const m of result.medications) {
            const resource = enrichWithContext(buildFHIRMedicationStatement(m, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'medication_statements_fhir', resource.id), resource)
            saved.medicationIds.push(resource.id)
        }
    }

    // 5. Allergies
    if (result.allergies?.length) {
        saved.allergyIds = []
        for (const a of result.allergies) {
            const resource = enrichWithContext(buildFHIRAllergyIntolerance(a, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'allergy_intolerances_fhir', resource.id), resource)
            saved.allergyIds.push(resource.id)
        }
    }

    // 6. Procedures
    if (result.procedures?.length) {
        saved.procedureIds = []
        for (const p of result.procedures) {
            const resource = enrichWithContext(buildFHIRProcedure(p, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'procedures_fhir', resource.id), resource)
            saved.procedureIds.push(resource.id)
        }
    }

    // 7. Lab Orders (ServiceRequests)
    if (result.labOrders?.length) {
        saved.serviceRequestIds = []
        for (const sr of result.labOrders) {
            const resource = enrichWithContext(buildFHIRServiceRequest(sr, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'service_requests_fhir', resource.id), resource)
            saved.serviceRequestIds.push(resource.id)
        }
    }

    // 8. Immunizations
    if (result.immunizations?.length) {
        saved.immunizationIds = []
        for (const imm of result.immunizations) {
            const resource = enrichWithContext(buildFHIRImmunization(imm, ctx, encounterId), ctx)
            await setDoc(doc(firestore, 'immunizations_fhir', resource.id), resource)
            saved.immunizationIds.push(resource.id)
        }
    }

    // 9. Lab Results
    if (result.labResults?.length) {
        const labObs = buildLabResultObservations(result.labResults, ctx, encounterId)
        saved.labResultIds = []
        for (const obs of labObs) {
            const enriched = enrichWithContext(obs, ctx)
            await setDoc(doc(firestore, 'observations_fhir', obs.id), enriched)
            saved.labResultIds.push(obs.id)
        }
        // Diagnostic Report grouping
        const dr = enrichWithContext(buildFHIRDiagnosticReport(labObs, ctx, encounterId), ctx)
        await setDoc(doc(firestore, 'diagnostic_reports_fhir', dr.id), dr)
        saved.diagnosticReportId = dr.id
    }

    // 10. Health Education (Communication)
    if (result.healthEducation) {
        const comm = enrichWithContext(buildFHIRCommunication(result.healthEducation, ctx, encounterId), ctx)
        await setDoc(doc(firestore, 'communications_fhir', comm.id), comm)
        saved.communicationIds = [comm.id]
    }

    // 11. Composition (SOAP Note linking all resources)
    const composition = enrichWithContext(buildFHIRComposition(result, encounterId, saved), ctx)
    await setDoc(doc(firestore, 'compositions_fhir', composition.id), composition)
    saved.compositionId = composition.id

    return saved as SavedResources
}

// ─── Load Functions ─────────────────────────────────────────

export async function loadConsultationByAppointment(appointmentId: string): Promise<ConsultationResult | null> {
    try {
        const encountersRef = collection(firestore, 'encounters_fhir')
        const q = query(encountersRef, where('appointment', 'array-contains', { reference: `Appointment/${appointmentId}` }), limit(1))
        const snap = await getDocs(q)
        if (snap.empty) return null
        const encounterId = snap.docs[0].id
        return loadConsultationByEncounterId(encounterId)
    } catch {
        return null
    }
}

export async function loadConsultationByEncounterId(encounterId: string): Promise<ConsultationResult | null> {
    try {
        const encounterSnap = await getDoc(doc(firestore, 'encounters_fhir', encounterId))
        if (!encounterSnap.exists()) return null
        const enc = encounterSnap.data()

        const safeQuery = async (q: Query<DocumentData>) => {
            try {
                return (await getDocs(q)).docs.map((d) => d.data())
            } catch {
                return []
            }
        }

        // Fetch linked resources
        const ref = `Encounter/${encounterId}`
        const [compositions, conditions, medications, allergies, observations] = await Promise.all([
            safeQuery(query(collection(firestore, 'compositions_fhir'), where('encounter.reference', '==', ref), limit(1))),
            safeQuery(query(collection(firestore, 'conditions_fhir'), where('encounter.reference', '==', ref), limit(50))),
            safeQuery(query(collection(firestore, 'medication_statements_fhir'), where('context.reference', '==', ref), limit(50))),
            safeQuery(query(collection(firestore, 'allergy_intolerances_fhir'), where('encounter.reference', '==', ref), limit(50))),
            safeQuery(query(collection(firestore, 'observations_fhir'), where('encounter.reference', '==', ref), limit(100))),
        ])

        // Parse SOAP from composition
        const comp = compositions[0]
        const findSection = (title: string) => comp?.section?.find((s: any) => s.title === title)
        const extractText = (section: any) => {
            if (!section) return ''
            const div = section.text?.div || ''
            return div.replace(/<[^>]*>/g, '').trim()
        }

        const soap: SOAPNote = {
            subjective: extractText(findSection('Subjective')),
            objective: extractText(findSection('Objective')),
            assessment: extractText(findSection('Assessment')),
            plan: extractText(findSection('Plan')),
        }

        // Parse vital signs from observations
        const vitalSigns: VitalSignsInput = {}
        const vitalCodes = new Set(Object.values(VITAL_SIGNS_LOINC).map((v) => v.code))
        for (const obs of observations) {
            const code = obs.code?.coding?.[0]?.code
            if (code && vitalCodes.has(code)) {
                const value = obs.valueQuantity?.value
                if (value == null) continue
                const entry = Object.entries(VITAL_SIGNS_LOINC).find(([, v]) => v.code === code)
                if (entry) (vitalSigns as any)[entry[0]] = value
            }
        }

        return {
            context: {
                patientId: enc.subject?.reference?.replace('Patient/', '') || '',
                patientName: enc.subject?.display || '',
                practitionerId: enc.participant?.[0]?.individual?.reference?.replace('Practitioner/', '') || '',
                practitionerName: enc.participant?.[0]?.individual?.display || '',
                organizationId: enc._organizationId || enc.serviceProvider?.reference?.replace('Organization/', '') || '',
                organizationName: enc.serviceProvider?.display,
                encounterId,
                appointmentId: enc.appointment?.[0]?.reference?.replace('Appointment/', ''),
            },
            soap,
            vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
            conditions: conditions.map((c: any) => ({
                text: c.code?.text || '',
                status: c.clinicalStatus?.coding?.[0]?.code || 'active',
                category: c.category?.[0]?.coding?.[0]?.code || 'encounter-diagnosis',
                icd10Code: c.code?.coding?.find((cd: any) => cd.system?.includes('icd'))?.code,
                snomedCode: c.code?.coding?.find((cd: any) => cd.system?.includes('snomed'))?.code,
                notes: c.note?.[0]?.text,
            })) as ConditionInput[],
            medications: medications.map((m: any) => ({
                name: m.medicationCodeableConcept?.text || '',
                dose: m.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit || m.dosage?.[0]?.text || '',
                frequency: '',
                route: m.dosage?.[0]?.route?.text || '',
                notes: m.note?.[0]?.text,
            })) as MedicationInput[],
            allergies: allergies.map((a: any) => ({
                allergen: a.code?.text || '',
                type: a.type || 'allergy',
                category: a.category?.[0] || 'medication',
                criticality: a.criticality || 'unable-to-assess',
                reaction: a.reaction?.[0]?.manifestation?.[0]?.text,
                reactionSeverity: a.reaction?.[0]?.severity,
            })) as AllergyInput[],
            consultationType: enc.type?.[0]?.text || 'consultation',
            startTime: enc.period?.start || now(),
            endTime: enc.period?.end,
        }
    } catch (error) {
        console.warn('Failed to load consultation:', error)
        return null
    }
}

// ─── Incremental Operations ─────────────────────────────────

export async function saveVitalSigns(
    vitalSigns: VitalSignsInput,
    ctx: ConsultationContext,
    encounterId: string
): Promise<string[]> {
    const result: ConsultationResult = {
        context: ctx,
        soap: { subjective: '', objective: '', assessment: '', plan: '' },
        vitalSigns,
        consultationType: 'consultation',
        startTime: now(),
    }
    const observations = buildVitalSignsObservations(result, encounterId)
    const ids: string[] = []
    for (const obs of observations) {
        const enriched = enrichWithContext(obs, ctx)
        await setDoc(doc(firestore, 'observations_fhir', obs.id), enriched)
        ids.push(obs.id)
    }
    return ids
}

export async function addConditionToEncounter(
    input: ConditionInput,
    ctx: ConsultationContext,
    encounterId: string
): Promise<string> {
    const resource = enrichWithContext(buildFHIRCondition(input, ctx, encounterId), ctx)
    await setDoc(doc(firestore, 'conditions_fhir', resource.id), resource)
    return resource.id
}

export async function addMedicationToEncounter(
    input: MedicationInput,
    ctx: ConsultationContext,
    encounterId: string
): Promise<string> {
    const resource = enrichWithContext(buildFHIRMedicationStatement(input, ctx, encounterId), ctx)
    await setDoc(doc(firestore, 'medication_statements_fhir', resource.id), resource)
    return resource.id
}

export async function addAllergyToEncounter(
    input: AllergyInput,
    ctx: ConsultationContext,
    encounterId: string
): Promise<string> {
    const resource = enrichWithContext(buildFHIRAllergyIntolerance(input, ctx, encounterId), ctx)
    await setDoc(doc(firestore, 'allergy_intolerances_fhir', resource.id), resource)
    return resource.id
}
