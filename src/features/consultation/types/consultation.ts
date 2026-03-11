/**
 * Consultation Types — aligned with FHIR and fhirConsultationService
 */

// ─── Context ────────────────────────────────────────────────

export interface ConsultationContext {
    patientId: string
    patientName: string
    practitionerId: string
    practitionerName: string
    organizationId: string
    organizationName?: string
    encounterId?: string
    appointmentId?: string
}

// ─── SOAP ───────────────────────────────────────────────────

export interface SOAPNote {
    subjective: string
    objective: string
    assessment: string
    plan: string
}

export interface SOAPData extends SOAPNote {
    // Legacy compatibility for short names
    s: string
    o: string
    a: string
    p: string
    id?: string
}

// ─── Clinical Inputs ────────────────────────────────────────

export interface VitalSignsInput {
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    heartRate?: number
    temperature?: number
    weight?: number
    height?: number
    respiratoryRate?: number
    oxygenSaturation?: number
}

export interface ConditionInput {
    text: string
    icd10Code?: string
    snomedCode?: string
    status: 'active' | 'resolved' | 'chronic'
    category: 'problem-list-item' | 'encounter-diagnosis'
    onsetDate?: string
    notes?: string
}

export interface MedicationInput {
    name: string
    atcCode?: string
    dose: string
    frequency: string
    route: string
    duration?: string
    notes?: string
}

export interface AllergyInput {
    allergen: string
    snomedCode?: string
    type: 'allergy' | 'intolerance'
    category: 'food' | 'medication' | 'environment' | 'biologic'
    criticality: 'low' | 'high' | 'unable-to-assess'
    reaction?: string
    reactionSeverity?: 'mild' | 'moderate' | 'severe'
}

export interface ProcedureInput {
    name: string
    code?: string
    performedDate?: string
    notes?: string
}

export interface ServiceRequestInput {
    name: string
    code?: string
    priority?: 'routine' | 'urgent' | 'asap' | 'stat'
    notes?: string
}

export interface ImmunizationInput {
    name: string
    code?: string
    site?: string
    status?: 'completed' | 'entered-in-error' | 'not-done'
    date?: string
    notes?: string
}

export interface LabResultInput {
    name: string
    testName?: string
    value: string
    unit?: string
    flag?: 'high' | 'low' | 'normal' | 'critical' | 'abnormal'
    referenceRange?: string
    date?: string
    notes?: string
}

// ─── Consultation Result ────────────────────────────────────

export interface ConsultationResult {
    context: ConsultationContext
    soap: SOAPNote
    vitalSigns?: VitalSignsInput
    conditions?: ConditionInput[]
    medications?: MedicationInput[]
    allergies?: AllergyInput[]
    immunizations?: ImmunizationInput[]
    procedures?: ProcedureInput[]
    labOrders?: ServiceRequestInput[]
    labResults?: LabResultInput[]
    healthEducation?: string
    consultationType: 'consultation' | 'follow-up' | 'emergency' | 'telemedicine'
    startTime: string
    endTime?: string
}

export interface SavedResources {
    encounterId: string
    compositionId: string
    diagnosticReportId?: string
    observationIds?: string[]
    conditionIds?: string[]
    medicationIds?: string[]
    allergyIds?: string[]
    immunizationIds?: string[]
    procedureIds?: string[]
    serviceRequestIds?: string[]
    labResultIds?: string[]
    communicationIds?: string[]
}

// ─── Chat / Copilot types ───────────────────────────────────

export interface ChatMessage {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    text?: string  // For backward compatibility
    type?: 'general' | 'note' | 'voice' | 'analysis' | 'soap' | 'alert' | 'error' | 'system' | 'suggestion' | 'education'
    mode?: 'note' | 'voice' | 'analysis'
    timestamp: Date
    metadata?: Record<string, unknown>

    // Enhanced copilot features
    clinicalData?: {
        soap?: Partial<SOAPData>
        fhir?: FHIRPlanItem[]
        alerts?: string[]
    }
    suggestions?: CopilotSuggestion[]
    isWelcome?: boolean

    // Legacy compatibility
    isClinicalUpdate?: boolean
    isClarification?: boolean
    isAnswer?: boolean
}

export interface FHIRPlanItem {
    id: string
    type: 'condition' | 'medication' | 'allergy' | 'procedure' | 'observation' | 'diagnostic' | 'labResult' | 'imagingStudy' | 'order' | 'device' | 'labOrder' | 'imagingOrder' | 'familyHistory' | 'personalHistory' | 'referral'
    status: 'active' | 'inactive' | 'completed' | 'cancelled'
    text: string
    display?: string
    details?: string
    dose?: string
    code?: string
    codeSystem?: string
    verificationStatus?: 'confirmed' | 'presumptive' | 'differential' | 'ruled-out'
    warning?: string
    warningLevel?: 'info' | 'warning' | 'critical'
    category?: string
    notes?: string

    // Enhanced medication fields for proper extraction
    frequency?: string    // "cada 8 horas", "3 veces al día", etc.
    duration?: string     // "por 7 días", "uso crónico", etc.
    route?: string        // "oral", "intravenosa", etc.
    instructions?: string // "con alimentos", "en ayunas", etc.
    bodySite?: string     // For imaging orders - body region
    relationship?: string  // For familyHistory items

    // Referral fields
    specialty?: string
    reasonForReferral?: string
    clinicalSummary?: string

    // Legacy compatibility
    action?: 'Add' | 'Modify' | 'Remove'
    flag?: 'high' | 'low' | 'critical' | 'abnormal'
    unit?: string
    referenceRange?: string
}

export interface CopilotSuggestion {
    id: string
    type: 'diagnosis' | 'medication' | 'lab' | 'correction' | 'procedure' | 'followup' | 'referral'
    title: string
    description: string
    data: Record<string, any>
    priority?: 'low' | 'medium' | 'high'
    confidence?: number
    source?: string
}

export interface ConsultationEntry {
    id: string
    date: Date
    type: string
    doctor: string
    summary: string
    soap?: SOAPNote
}
