/**
 * Enhanced Medical Notes Types - Complete type definitions
 * Supports advanced copilot functionality, voice recognition, and clinical decision support
 * Matches original Altea Copiloto v2.2 functionality
 */

export interface SOAPData {
  // Full names (new format)
  subjective: string
  objective: string
  assessment: string
  plan: string

  // Short names (legacy compatibility)
  s: string
  o: string
  a: string
  p: string
}

export type IPSResourceType =
  | 'medication'
  | 'condition'
  | 'allergy'
  | 'procedure'
  | 'immunization'
  | 'labResult'
  | 'imagingStudy'
  | 'labOrder'
  | 'imagingOrder'
  | 'device'
  | 'observation';

export interface FHIRPlanItem {
  id: string
  type: 'condition' | 'medication' | 'allergy' | 'procedure' | 'observation' | 'diagnostic' | 'labResult' | 'imagingStudy' | 'labOrder' | 'imagingOrder' | 'device' | 'order' | 'familyHistory' | 'personalHistory'
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
  relationship?: string
  // Legacy compatibility
  action?: 'Add' | 'Modify' | 'Remove'
  flag?: 'high' | 'low' | 'critical' | 'abnormal'
  unit?: string
  referenceRange?: string
}

export interface ClinicalState {
  soap: SOAPData
  fhir: FHIRPlanItem[]
  alerts: string[]
  healthEducation: string
  suggestions: CopilotSuggestion[]
  vitalSigns?: VitalSignsInput
  lastUpdated?: Date
}

// Legacy types for backward compatibility
export type ChatMessageMode = 'note' | 'question'
export type ChatMessageType = 'NOTA_MEDICA' | 'PREGUNTA_GENERAL' | 'ACLARACION_REQUERIDA' | 'MODIFICACION'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  text?: string  // For backward compatibility
  timestamp: Date
  type?: 'general' | 'note' | 'voice' | 'analysis' | 'soap' | 'alert' | 'error' | 'system' | 'education' | 'suggestion'
  mode?: 'note' | 'voice' | 'analysis'

  // Enhanced copilot features
  clinicalData?: {
    soap?: Partial<SOAPData>
    fhir?: FHIRPlanItem[]
    alerts?: string[]
  }
  suggestions?: CopilotSuggestion[]
  insights?: ClinicalInsight[]
  isWelcome?: boolean

  // Legacy compatibility
  isClinicalUpdate?: boolean
  isClarification?: boolean
  isAnswer?: boolean
}

export interface CopilotSuggestion {
  id: string
  title: string
  description: string
  type: 'diagnosis' | 'medication' | 'lab' | 'correction' | 'procedure' | 'followup' | 'referral'
  data: Record<string, any>
  confidence?: number
  priority?: 'low' | 'medium' | 'high'
  source?: string
}

export interface ClinicalInsight {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category?: 'safety' | 'efficiency' | 'quality' | 'clinical'
  actionable?: boolean
}

// Legacy compatibility
export interface AIInsight extends ClinicalInsight {}

export interface PatientRecordDisplay {
  id: string;
  name: string;
  age: number | string;
  gender: string;
  genderShort?: string;
  photoUrl?: string;
  fhirId?: string;
}

export interface TabItem {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export interface ConsultationEntry {
  id: string;
  date: string;
  type: string;
  doctor: string;
  summary: string;
  patientNote?: string;
}

// IPS Display Data interfaces
export interface IPSAllergy {
  name?: string;
  severity?: string;
  date?: string;
  doctor?: string;
  notes?: string;
}

export interface IPSMedication {
  name?: string;
  dose?: string;
  date?: string;
  doctor?: string;
  notes?: string;
  warning?: string;    // Warning text for interactions, allergies, etc.
  warningLevel?: 'info' | 'warning' | 'critical'; // Warning severity
  frequency?: string;  // Dosage frequency
  duration?: string;   // Treatment duration
  route?: string;      // Administration route
}

export interface IPSCondition {
  name?: string;
  status?: string;
  date?: string;
  doctor?: string;
  notes?: string;
}

export interface IPSVaccine {
  name?: string;
  date?: string;
  site?: string;
  doctor?: string;
  notes?: string;
}

export interface IPSOrder {
  name?: string;
  type?: string;
  status?: string;
  priority?: string;
  date?: string;
  doctor?: string;
  notes?: string;
}

export interface IPSResult {
  name?: string;
  value?: string;
  unit?: string;
  date?: string;
  flag?: string;
  referenceRange?: string;
  doctor?: string;
  notes?: string;
}

export interface IPSDisplayData {
  encounters: ConsultationEntry[];
  allergies: Partial<IPSAllergy>[];
  medications: Partial<IPSMedication>[];
  conditions: Partial<IPSCondition>[];
  vaccines: Partial<IPSVaccine>[];
  labOrders?: Partial<IPSOrder>[];
  labResults?: Partial<IPSResult>[];
  clinicalEvolution?: ConsultationEntry[];
}

export interface VitalSignsInput {
  bloodPressureSystolic?: number
  bloodPressureDiastolic?: number
  heartRate?: number
  temperature?: number
  weight?: number
  height?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  bmi?: number
}

export interface PatientVitals {
  hr?: string | number
  bp?: string
  temp?: string | number
  weight?: string | number
  height?: string | number
  spo2?: string | number
  rr?: string | number
}

export interface VitalSignsData {
  bloodPressure?: string
  heartRate?: string | number
  temperature?: string | number
  weight?: string | number
  height?: string | number
  oxygenSaturation?: string | number
  respiratoryRate?: string | number
  bmi?: number
  measurementDate?: string
  measuredBy?: string
  notes?: string
  // Legacy compatibility
  date?: string
  recordedBy?: string
}

// Consultation and Voice Recognition Types
export interface ConsultationContext {
  appointmentId?: string
  encounterId?: string
  patientId: string
  doctorId: string
  organizationId: string
  specialty?: string
}

export interface ConsultationResult {
  context: ConsultationContext
  soap: SOAPData
  vitalSigns?: VitalSignsInput
  conditions?: Array<{ text: string; status: string; category: string }>
  medications?: Array<{ name: string; dose: string; frequency: string; route: string }>
  allergies?: Array<{ allergen: string; type: string; category: string; criticality: string }>
  consultationType: 'consultation' | 'follow-up' | 'emergency'
  startTime: string
  endTime: string
  notes?: string
}

// Voice Recognition State
export interface VoiceRecognitionState {
  isListening: boolean
  isPaused: boolean
  interimTranscript: string
  finalTranscript: string
  confidence: number
  lastProcessedTime: Date | null
  bufferCharCount: number
  silenceDetectedTime: Date | null
  error?: string
  speechSupported: boolean
  micPermissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown'
}

// IPS Categories and Resource Types
export const IPS_CATEGORIES = {
  conditions: {
    label: 'Diagnósticos',
    types: ['condition'] as IPSResourceType[]
  },
  medications: {
    label: 'Medicamentos',
    types: ['medication'] as IPSResourceType[]
  },
  allergies: {
    label: 'Alergias',
    types: ['allergy'] as IPSResourceType[]
  },
  procedures: {
    label: 'Procedimientos',
    types: ['procedure'] as IPSResourceType[]
  },
  immunizations: {
    label: 'Vacunación',
    types: ['immunization'] as IPSResourceType[]
  },
  labResults: {
    label: 'Resultados de Laboratorio',
    types: ['labResult', 'observation'] as IPSResourceType[]
  },
  imagingStudies: {
    label: 'Estudios de Imagen',
    types: ['imagingStudy'] as IPSResourceType[]
  },
  orders: {
    label: 'Órdenes Médicas',
    types: ['labOrder', 'imagingOrder'] as IPSResourceType[]
  },
  devices: {
    label: 'Dispositivos Médicos',
    types: ['device'] as IPSResourceType[]
  }
}

export const EXCLUDED_RESOURCE_TYPES: IPSResourceType[] = [
  'observation'  // Generic observations are usually redundant
]

// Utility function for safe text rendering
export function safeText(text?: string | null): string {
  return text || ''
}

// Factory function for creating empty clinical state
export function createEmptyClinicalState(): ClinicalState {
  return {
    soap: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      s: '',
      o: '',
      a: '',
      p: ''
    },
    fhir: [],
    alerts: [],
    healthEducation: '',
    suggestions: [],
    lastUpdated: new Date()
  }
}

export function createEmptySOAP(): SOAPData {
  return {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    s: '',
    o: '',
    a: '',
    p: ''
  }
}

// Helper function to convert between SOAP formats
export function normalizeSoapData(soap: Partial<SOAPData>): SOAPData {
  return {
    subjective: soap.subjective || soap.s || '',
    objective: soap.objective || soap.o || '',
    assessment: soap.assessment || soap.a || '',
    plan: soap.plan || soap.p || '',
    s: soap.s || soap.subjective || '',
    o: soap.o || soap.objective || '',
    a: soap.a || soap.assessment || '',
    p: soap.p || soap.plan || ''
  }
}