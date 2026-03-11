/**
 * useMedicalCopilot — Core hook for Medical Notes Copilot
 * Advanced medical AI assistant with voice recognition, real-time processing,
 * SOAP generation, and clinical decision support
 * Matches functionality from original Altea Copiloto v2.2
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
    saveConsultationResults,
    loadConsultationByEncounterId,
    loadConsultationByAppointment,
} from '../services/fhirConsultationService'
import type {
    ChatMessage,
    SOAPData,
    FHIRPlanItem,
    ConsultationContext,
    ConsultationResult,
    VitalSignsInput,
    CopilotSuggestion,
} from '../types/consultation'
import type {
    ClinicalState,
    IPSDisplayData
} from '../types/medical-notes'
import { normalizeSoapData } from '../types/medical-notes'
import { getAIFHIRService } from '../../../services/aiService'
import { ensureIds, mergeFHIRLists, normalizeFHIR } from '../../../utils/fhirHelpers'

// ─── Medical Abbreviation Expansion ─────────────────────────

const MEDICAL_ABBREVS: Record<string, string> = {
    px: 'paciente', pte: 'paciente', dx: 'diagnóstico', tx: 'tratamiento',
    rx: 'receta', hta: 'hipertensión arterial', dm: 'diabetes mellitus',
    ta: 'tensión arterial', fc: 'frecuencia cardíaca', fr: 'frecuencia respiratoria',
    sat: 'saturación de oxígeno', vo: 'vía oral', im: 'intramuscular', iv: 'intravenoso',
    cc: 'centímetros cúbicos', ml: 'mililitros', mg: 'miligramos', kg: 'kilogramos',
    bpm: 'latidos por minuto', mmhg: 'milímetros de mercurio', cefalea: 'dolor de cabeza',
    abd: 'abdomen', ap: 'auscultación pulmonar', ac: 'auscultación cardíaca',
    eeii: 'extremidades inferiores', eess: 'extremidades superiores'
}

function expandMedicalAbbreviations(text: string): string {
    return text.replace(/\b(\w+)\b/g, (match) => {
        const lower = match.toLowerCase()
        return MEDICAL_ABBREVS[lower] || match
    })
}

// ─── Advanced Medical Text Processing ─────────────────────────

interface MedicalTextProcessor {
    processText(text: string, options?: ProcessingOptions): Promise<ProcessingResult>
}

interface ProcessingOptions {
    processingLevel: 'basic' | 'standard' | 'advanced'
    includeValidation: boolean
    generateQuestions: boolean
    patientContext?: IPSDisplayData
}

interface ProcessingResult {
    processedText: string
    soapSections: Partial<SOAPData>
    fhirItems: FHIRPlanItem[]
    vitalSigns: VitalSignsInput | null
    suggestions: CopilotSuggestion[]
    alerts: string[]
    confidence: number
    isNoiseFiltered?: boolean
}

class AdvancedMedicalProcessor implements MedicalTextProcessor {
    async processText(text: string, options: ProcessingOptions = {
        processingLevel: 'standard',
        includeValidation: true,
        generateQuestions: false
    }): Promise<ProcessingResult> {
        const expandedText = expandMedicalAbbreviations(text)
        const lowerText = expandedText.toLowerCase()

        // Noise filtering - detect non-medical content
        const isNoise = this.detectNoise(lowerText)
        if (isNoise && options.processingLevel !== 'basic') {
            return {
                processedText: '',
                soapSections: {},
                fhirItems: [],
                vitalSigns: null,
                suggestions: [],
                alerts: ['Contenido filtrado: no es información médica relevante'],
                confidence: 0,
                isNoiseFiltered: true
            }
        }

        // Extract components
        const vitalSigns = extractVitalSigns(expandedText)
        const soapSections = this.extractSOAPSections(expandedText, lowerText)
        const fhirItems = this.extractFHIRItems(expandedText, lowerText)
        const suggestions = this.generateSuggestions(expandedText, options)
        const alerts = this.generateAlerts(expandedText, vitalSigns, options)

        return {
            processedText: expandedText,
            soapSections,
            fhirItems,
            vitalSigns,
            suggestions,
            alerts,
            confidence: this.calculateConfidence(expandedText, soapSections, fhirItems)
        }
    }

    private detectNoise(text: string): boolean {
        // Filter out common noise patterns
        const noisePatterns = [
            /^(um|eh|ah|mm|hmm)$/,
            /^(ok|okay|bien|gracias|sí|no)$/,
            /^[a-z]{1,2}$/,  // Single letters or very short words
            /^\d+$/, // Just numbers
            /^[.,!?;:]+$/ // Just punctuation
        ]

        return noisePatterns.some(pattern => pattern.test(text.trim()))
    }

    private extractSOAPSections(text: string, lowerText: string): Partial<SOAPData> {
        const sections: Partial<SOAPData> = {}

        // Subjective indicators
        if (lowerText.includes('refiere') || lowerText.includes('manifiesta') ||
            lowerText.includes('síntoma') || lowerText.includes('dolor') ||
            lowerText.includes('molestia') || lowerText.includes('siente')) {
            sections.subjective = text
            sections.s = text  // Support both formats
        }

        // Objective indicators
        if (lowerText.includes('examen') || lowerText.includes('hallazgo') ||
            lowerText.includes('observa') || lowerText.includes('palpable') ||
            lowerText.includes('auscult') || lowerText.includes('signo')) {
            sections.objective = text
            sections.o = text
        }

        // Assessment indicators
        if (lowerText.includes('diagnóstico') || lowerText.includes('impresión') ||
            lowerText.includes('probable') || lowerText.includes('compatible') ||
            lowerText.includes('sugiere')) {
            sections.assessment = text
            sections.a = text
        }

        // Plan indicators
        if (lowerText.includes('plan') || lowerText.includes('indicar') ||
            lowerText.includes('recetar') || lowerText.includes('tratamiento') ||
            lowerText.includes('medicamento') || lowerText.includes('seguimiento')) {
            sections.plan = text
            sections.p = text
        }

        return sections
    }

    private extractFHIRItems(text: string, lowerText: string): FHIRPlanItem[] {
        const items: FHIRPlanItem[] = []

        // Medication extraction
        if (lowerText.includes('recetar') || lowerText.includes('medicamento') ||
            lowerText.includes('mg') || lowerText.includes('comprimido')) {
            items.push({
                id: `med_${Date.now()}`,
                type: 'medication',
                status: 'active',
                text: text,
                display: `Medicamento: ${text}`,
                details: 'Extraído automáticamente del texto'
            })
        }

        // Condition extraction
        if (lowerText.includes('diagnóstico') || lowerText.includes('probable') ||
            lowerText.includes('compatible con') || lowerText.includes('sugiere')) {
            items.push({
                id: `cond_${Date.now()}`,
                type: 'condition',
                status: 'active',
                text: text,
                display: `Diagnóstico: ${text}`,
                verificationStatus: lowerText.includes('probable') ? 'presumptive' : 'confirmed'
            })
        }

        return items
    }

    private generateSuggestions(text: string, options: ProcessingOptions): CopilotSuggestion[] {
        const suggestions: CopilotSuggestion[] = []
        const lowerText = text.toLowerCase()

        if (lowerText.includes('dolor') && !lowerText.includes('analgésico')) {
            suggestions.push({
                id: 'pain_mgmt',
                title: 'Manejo del Dolor',
                description: 'Considerar analgésicos según intensidad del dolor',
                type: 'medication',
                data: { medication: 'analgésico', indication: 'dolor' }
            })
        }

        if (lowerText.includes('fiebre') && !lowerText.includes('antitérmico')) {
            suggestions.push({
                id: 'fever_mgmt',
                title: 'Manejo de Fiebre',
                description: 'Considerar antipiréticos',
                type: 'medication',
                data: { medication: 'antipirético', indication: 'fiebre' }
            })
        }

        return suggestions
    }

    private generateAlerts(text: string, vitals: VitalSignsInput | null, options: ProcessingOptions): string[] {
        const alerts: string[] = []

        // Vital signs alerts
        if (vitals?.bloodPressureSystolic && vitals.bloodPressureSystolic > 140) {
            alerts.push('⚠️ Hipertensión detectada: evaluar manejo antihipertensivo')
        }

        if (vitals?.heartRate && vitals.heartRate > 100) {
            alerts.push('⚠️ Taquicardia detectada: evaluar causa')
        }

        return alerts
    }

    private calculateConfidence(text: string, soap: Partial<SOAPData>, fhir: FHIRPlanItem[]): number {
        let confidence = 0.3 // Base confidence

        if (Object.keys(soap).length > 0) confidence += 0.3
        if (fhir.length > 0) confidence += 0.2
        if (text.length > 50) confidence += 0.2

        return Math.min(confidence, 1.0)
    }
}

const medicalProcessor = new AdvancedMedicalProcessor()

// ─── Enhanced Vital Signs Extraction ─────────────────────────────────

function extractVitalSigns(text: string): VitalSignsInput | null {
    const vitals: VitalSignsInput = {}
    let found = false

    // Helper function to try regex patterns and extract values
    const tryMatch = (regex: RegExp, key: keyof VitalSignsInput, parser = parseFloat) => {
        const match = text.match(regex)
        if (match && match[1]) {
            const value = parser(match[1])
            if (!isNaN(value) && value > 0) {
                (vitals as any)[key] = value
                found = true
            }
        }
    }

    // Blood pressure (systolic/diastolic)
    const bpMatch = text.match(/(?:ta|presión|tensión|pa|bp)\s*[:=]?\s*(\d{2,3})\s*[/\-]\s*(\d{2,3})/i)
    if (bpMatch) {
        const systolic = parseInt(bpMatch[1])
        const diastolic = parseInt(bpMatch[2])
        if (systolic >= 70 && systolic <= 250 && diastolic >= 40 && diastolic <= 150) {
            vitals.bloodPressureSystolic = systolic
            vitals.bloodPressureDiastolic = diastolic
            found = true
        }
    }

    // Heart rate / pulse
    tryMatch(/(?:fc|pulso|hr|frecuencia cardíaca)\s*[:=]?\s*(\d{2,3})(?:\s*(?:bpm|lpm|x|por min))?/i, 'heartRate', parseInt)

    // Temperature
    tryMatch(/(?:temp|temperatura|t°|fiebre)\s*[:=]?\s*(\d{1,2}(?:\.\d{1,2})?)(?:\s*(?:°c|°|grados))?/i, 'temperature')

    // Weight
    tryMatch(/(?:peso|weight)\s*[:=]?\s*(\d{2,3}(?:\.\d{1,2})?)(?:\s*(?:kg|kilo|kilos))?/i, 'weight')

    // Height
    tryMatch(/(?:talla|altura|height)\s*[:=]?\s*(\d{2,3}(?:\.\d{1,2})?)(?:\s*(?:cm|metros|m))?/i, 'height')

    // Respiratory rate
    tryMatch(/(?:fr|frecuencia resp|respiratoria|rr)\s*[:=]?\s*(\d{1,2})(?:\s*(?:rpm|x|por min))?/i, 'respiratoryRate', parseInt)

    // Oxygen saturation
    tryMatch(/(?:sat|spo2|saturación|oxígeno)\s*[:=]?\s*(\d{2,3})(?:\s*%)?/i, 'oxygenSaturation', parseInt)

    return found ? vitals : null
}

// ─── Voice Recognition & Real-time Processing ─────────────────

interface VoiceRecognitionState {
    isListening: boolean
    isPaused: boolean
    interimTranscript: string
    finalTranscript: string
    confidence: number
    lastProcessedTime: Date | null
    bufferCharCount: number
    silenceDetectedTime: Date | null
}

interface ProcessingBuffer {
    text: string
    timestamp: Date
    processed: boolean
}

class RealTimeProcessor {
    private buffer: ProcessingBuffer[] = []
    private readonly BUFFER_TIMEOUT = 2000 // 2 seconds
    private readonly MIN_PROCESSING_LENGTH = 10
    private readonly MAX_BUFFER_SIZE = 200

    addToBuffer(text: string): void {
        // Clean and validate text
        const cleanText = text.trim()
        if (cleanText.length < 3) return

        this.buffer.push({
            text: cleanText,
            timestamp: new Date(),
            processed: false
        })

        // Limit buffer size
        if (this.buffer.length > this.MAX_BUFFER_SIZE) {
            this.buffer = this.buffer.slice(-this.MAX_BUFFER_SIZE)
        }
    }

    getUnprocessedText(): string {
        const now = new Date()
        const unprocessed = this.buffer.filter(item => {
            return !item.processed &&
                (now.getTime() - item.timestamp.getTime()) > this.BUFFER_TIMEOUT
        })

        if (unprocessed.length === 0) return ''

        const combinedText = unprocessed.map(item => item.text).join(' ')
        if (combinedText.length < this.MIN_PROCESSING_LENGTH) return ''

        // Mark as processed
        unprocessed.forEach(item => { item.processed = true })

        return combinedText
    }

    getBufferCharCount(): number {
        const unprocessed = this.buffer.filter(item => !item.processed)
        return unprocessed.reduce((count, item) => count + item.text.length, 0)
    }

    clearBuffer(): void {
        this.buffer = []
    }
}

const realTimeProcessor = new RealTimeProcessor()

// ─── Fallback Suggestions Generator ─────────────────────────────────

function generateFallbackSuggestions(text: string, patientIPS?: IPSDisplayData): CopilotSuggestion[] {
    const suggestions: CopilotSuggestion[] = []
    const lowerText = text.toLowerCase()

    // Dolor -> analgésicos
    if (lowerText.includes('dolor') && !lowerText.includes('analgésico')) {
        suggestions.push({
            id: `sug-pain-${Date.now()}`,
            title: 'Manejo del Dolor',
            description: 'Considerar analgésicos según intensidad: paracetamol 500mg c/8h o ibuprofeno 400mg c/8h',
            type: 'medication',
            source: 'general',
            data: { indication: 'dolor' },
            confidence: 0.8,
            priority: 'medium'
        })
    }

    // Fiebre -> antipiréticos
    if (lowerText.includes('fiebre') && !lowerText.includes('antitérmico')) {
        suggestions.push({
            id: `sug-fever-${Date.now()}`,
            title: 'Manejo de Fiebre',
            description: 'Considerar antipirético: paracetamol 500mg c/6h PRN fiebre >38°C',
            type: 'medication',
            source: 'general',
            data: { indication: 'fiebre' },
            confidence: 0.9,
            priority: 'high'
        })
    }

    // Hipertensión -> IECA
    if (lowerText.includes('hipertens') && !lowerText.includes('enalapril')) {
        // Check if patient doesn't already have ACE inhibitors
        const hasACEInhibitor = patientIPS?.medications?.some(med =>
            med.name?.toLowerCase().includes('enalapril') ||
            med.name?.toLowerCase().includes('lisinopril') ||
            med.name?.toLowerCase().includes('captopril')
        )

        if (!hasACEInhibitor) {
            suggestions.push({
                id: `sug-htn-${Date.now()}`,
                title: 'Control de Hipertensión',
                description: 'Considerar IECA: enalapril 10mg c/12h, ajustar según respuesta',
                type: 'medication',
                source: 'general',
                data: { indication: 'hipertensión' },
                confidence: 0.7,
                priority: 'medium'
            })
        }
    }

    // Diabetes -> control glicémico
    if (lowerText.includes('diabet') || lowerText.includes('gluc')) {
        suggestions.push({
            id: `sug-dm-${Date.now()}`,
            title: 'Control de Laboratorios',
            description: 'Solicitar HbA1c, glicemia en ayunas y perfil lipídico para control metabólico',
            type: 'lab',
            source: 'general',
            data: { indication: 'diabetes' },
            confidence: 0.8,
            priority: 'medium'
        })
    }

    // Infección -> considerar antibióticos
    if ((lowerText.includes('infección') || lowerText.includes('infecciosa')) && !lowerText.includes('antibiótico')) {
        suggestions.push({
            id: `sug-abx-${Date.now()}`,
            title: 'Considerar Antibioticoterapia',
            description: 'Evaluar necesidad de antibiótico según severidad y tipo de infección',
            type: 'medication',
            source: 'general',
            data: { indication: 'infección' },
            confidence: 0.6,
            priority: 'medium'
        })
    }

    // Tos -> antitusivos/expectorantes
    if (lowerText.includes('tos') && !lowerText.includes('jarabe')) {
        suggestions.push({
            id: `sug-cough-${Date.now()}`,
            title: 'Manejo de Tos',
            description: 'Considerar expectorante: bromhexina 8mg c/8h o dextrometorfano PRN tos seca',
            type: 'medication',
            source: 'general',
            data: { indication: 'tos' },
            confidence: 0.7,
            priority: 'low'
        })
    }

    return suggestions.slice(0, 3) // Limit to 3 suggestions max
}

// ─── Hook Options ───────────────────────────────────────────

export interface UseMedicalCopilotOptions {
    consultationContext?: ConsultationContext
    patientRecord?: any // Patient basic information
    patientIPS?: IPSDisplayData // Complete patient medical record
    apiKey?: string // Gemini API key
    onError?: (error: string) => void
}

export default function useMedicalCopilot(options: UseMedicalCopilotOptions = {}) {
    const { consultationContext, patientRecord, patientIPS, apiKey, onError } = options

    // Enhanced state management matching original functionality
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [soap, setSoap] = useState<SOAPData>({
        subjective: '', objective: '', assessment: '', plan: '',
        s: '', o: '', a: '', p: '' // Support both formats
    })
    const [fhirPlan, setFhirPlan] = useState<FHIRPlanItem[]>([])
    const [vitalSigns, setVitalSigns] = useState<VitalSignsInput>({})
    const [clinicalState, setClinicalState] = useState<ClinicalState>({
        soap,
        fhir: [],
        alerts: [],
        healthEducation: '',
        suggestions: []
    })

    // Processing states
    const [isProcessing, setIsProcessing] = useState(false)
    const [isPreprocessing, setIsPreprocessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isFinalized, setIsFinalized] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Copilot states
    const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([])
    const [alerts, setAlerts] = useState<string[]>([])
    const [healthEducation, setHealthEducation] = useState('')

    // Voice recognition states
    const [voiceState, setVoiceState] = useState<VoiceRecognitionState>({
        isListening: false,
        isPaused: false,
        interimTranscript: '',
        finalTranscript: '',
        confidence: 0,
        lastProcessedTime: null,
        bufferCharCount: 0,
        silenceDetectedTime: null
    })

    // Real-time processing state
    const [inputText, setInputText] = useState('')
    const [elapsedTime, setElapsedTime] = useState(0)
    const [inConsultation, setInConsultation] = useState(true)

    const startTimeRef = useRef(new Date().toISOString())
    const lastProcessedInputRef = useRef('')
    const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const mkId = () => `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

    const addMessage = useCallback((role: ChatMessage['role'], content: string, type?: ChatMessage['type']) => {
        const msg: ChatMessage = { id: mkId(), role, content, type: type || 'general', timestamp: new Date() }
        setMessages((prev) => [...prev, msg])
        return msg
    }, [])

    // Load existing consultation
    useEffect(() => {
        if (!consultationContext?.encounterId && !consultationContext?.appointmentId) return
        const load = async () => {
            try {
                const result = consultationContext.encounterId
                    ? await loadConsultationByEncounterId(consultationContext.encounterId)
                    : consultationContext.appointmentId
                        ? await loadConsultationByAppointment(consultationContext.appointmentId)
                        : null
                if (!result) return
                setSoap(normalizeSoapData(result.soap))
                if (result.vitalSigns) setVitalSigns(result.vitalSigns)
                const items: FHIRPlanItem[] = []
                result.conditions?.forEach((c) => items.push({
                    id: mkId(),
                    type: 'condition',
                    status: c.status === 'resolved' ? 'completed' : (c.status === 'chronic' ? 'active' : c.status as 'active' | 'inactive' | 'completed' | 'cancelled'),
                    text: c.text
                }))
                result.medications?.forEach((m) => items.push({ id: mkId(), type: 'medication', status: 'active', text: `${m.name} — ${m.dose}` }))
                result.allergies?.forEach((a) => items.push({ id: mkId(), type: 'allergy', status: 'active', text: a.allergen }))
                setFhirPlan(items)
                addMessage('system', 'Consulta anterior cargada.', 'general')
            } catch { /* ignore */ }
        }
        load()
    }, [consultationContext?.encounterId, consultationContext?.appointmentId])

    // ─── Smart Input Processing with Patient Context ─────────────────
    const processSmartInput = useCallback(async (text: string, mode: 'manual' | 'voice' = 'manual') => {
        if (!text.trim() || !apiKey) return

        const normalizedInput = text.trim()
        if (normalizedInput === lastProcessedInputRef.current) {
            return
        }

        setIsProcessing(true)
        lastProcessedInputRef.current = normalizedInput

        try {
            // DON'T add user message yet - wait until we know if it's noise or medical content
            // This prevents showing raw transcription for filtered noise (same as original)

            // Initialize AI service with API key
            const aiService = getAIFHIRService(apiKey)
            if (!aiService) {
                throw new Error('AI service not available')
            }

            // Build comprehensive patient context for AI
            const medicalContext = {
                patientName: patientRecord?.name,
                patientAge: patientRecord?.age,
                patientGender: patientRecord?.gender,
                patientHistory: patientIPS ? {
                    // Critical for safety - always include allergies
                    allergies: patientIPS.allergies?.map(a => ({
                        name: a.name,
                        severity: a.severity,
                    })) || [],

                    // Current medications
                    medications: patientIPS.medications?.map(m => ({
                        name: m.name,
                        dose: m.dose,
                    })) || [],

                    // Active conditions (filtered)
                    conditions: patientIPS.conditions?.filter(c =>
                        c.status === 'Activa' || c.status === 'Crónica'
                    ).map(c => ({
                        name: c.name,
                        status: c.status,
                    })) || [],

                    // Recent lab results (last 6)
                    labResults: patientIPS.labResults?.slice(-6).map(l => ({
                        name: l.name,
                        value: l.value,
                        date: l.date,
                        flag: l.flag, // high/low/critical
                    })) || [],

                    // Recent vaccines
                    vaccines: patientIPS.vaccines?.map(v => ({
                        name: v.name,
                        date: v.date,
                    })) || [],

                    // Recent encounters
                    encounters: patientIPS.encounters?.slice(-3).map(e => ({
                        date: e.date,
                        type: e.type,
                        summary: e.summary,
                    })) || []
                } : undefined
            }

            // Build comprehensive patient context for AI (exactly as original)
            const patientContext = {
                paciente: patientRecord ? {
                    nombre: patientRecord.name,
                    edad: patientRecord.age,
                    sexo: patientRecord.gender,
                } : null,
                ips: patientIPS ? {
                    alergias: patientIPS.allergies?.map(a => ({
                        nombre: a.name,
                        severidad: a.severity,
                    })) || [],
                    medicamentos: patientIPS.medications?.map(m => ({
                        nombre: m.name,
                        dosis: m.dose,
                    })) || [],
                    condiciones: patientIPS.conditions?.filter(c =>
                        c.status === 'Activa' || c.status === 'Crónica'
                    ).map(c => ({
                        nombre: c.name,
                        estado: c.status,
                    })) || [],
                    vacunas: patientIPS.vaccines?.map(v => ({
                        nombre: v.name,
                        fecha: v.date,
                    })) || [],
                    laboratorios: patientIPS.labResults?.slice(-6).map(l => ({
                        nombre: l.name,
                        valor: l.value,
                        fecha: l.date,
                        flag: l.flag, // high/low/critical
                    })) || [],
                } : null,
                estadoActual: clinicalState,
            }

            // Process with AI using original context structure and get the exact response format
            const aiResponse = await aiService.textToFHIR(normalizedInput, {
                ...medicalContext,
                patientRecord,
                patientIPS,
                clinicalState
            })

            if (aiResponse.success && aiResponse.data) {
                const result = aiResponse.data

                // Handle noise filtering - exactly as original
                if (result.type === 'noise') {
                    console.log('🔇 [Copilot] Ruido filtrado:', result.reason || 'contenido no médico')
                    return {
                        type: 'noise',
                        reason: result.reason,
                        isClinicalUpdate: false
                    }
                }

                // Handle medical notes - exactly as original
                if (result.type === 'note') {
                    const normalizedFHIR = ensureIds(normalizeFHIR(result.fhir || []))

                    // Use helper to merge with deduplication - exactly as original
                    const currentFHIR = mergeFHIRLists(clinicalState.fhir || [], normalizedFHIR)

                    // Merge SOAP - accumulate, don't replace - exactly as original
                    const mergedSOAP = {
                        s: result.soap?.s || clinicalState.soap.s,
                        o: result.soap?.o || clinicalState.soap.o,
                        a: result.soap?.a || clinicalState.soap.a,
                        p: result.soap?.p || clinicalState.soap.p,
                        subjective: result.soap?.s || clinicalState.soap.s,
                        objective: result.soap?.o || clinicalState.soap.o,
                        assessment: result.soap?.a || clinicalState.soap.a,
                        plan: result.soap?.p || clinicalState.soap.p,
                    }

                    // Update state exactly as original
                    setSoap(mergedSOAP)
                    setFhirPlan(currentFHIR)
                    setHealthEducation(result.healthEducation || healthEducation)

                    // Update alerts and suggestions exactly as original
                    let typedSuggestions: CopilotSuggestion[] = []

                    if (result.alerts && result.alerts.length > 0) {
                        setAlerts(prev => [...prev, ...result.alerts])
                        console.log('✅ Added alerts from AI response:', result.alerts)
                    }

                    if (result.suggestions && result.suggestions.length > 0) {
                        typedSuggestions = result.suggestions.map(s => ({
                            ...s,
                            type: (s.type as CopilotSuggestion['type']) || 'medication',
                            source: s.source || 'general'
                        }))
                        setSuggestions(prev => [...prev, ...typedSuggestions])
                        console.log('✅ Added suggestions from AI response:', result.suggestions)
                    }

                    // Fallback: Generate basic suggestions if AI doesn't provide any
                    if (!typedSuggestions.length && result.type === 'note') {
                        typedSuggestions = generateFallbackSuggestions(normalizedInput, patientIPS)
                        if (typedSuggestions.length > 0) {
                            setSuggestions(prev => [...prev, ...typedSuggestions])
                            console.log('✅ Added fallback suggestions:', typedSuggestions)
                        }
                    }

                    // Create response content
                    let responseContent = result.summary || 'Nota médica procesada'

                    // Handle IPS Summary integration - exactly as original
                    if (result.ipsSummary) {
                        console.log('🔄 Processing IPS Summary from AI:', result.ipsSummary)

                        if (result.ipsSummary.newFindings && result.ipsSummary.newFindings.length > 0) {
                            responseContent += '\n\n📊 **Nuevos hallazgos agregados al IPS:**\n'
                            result.ipsSummary.newFindings.forEach((finding: string) => {
                                responseContent += `• ${finding}\n`
                            })
                        }

                        if (result.ipsSummary.alerts && result.ipsSummary.alerts.length > 0) {
                            responseContent += '\n⚠️ **Alertas clínicas:**\n'
                            result.ipsSummary.alerts.forEach((alert: string) => {
                                responseContent += `• ${alert}\n`
                            })
                        }

                        if (result.ipsSummary.recommendations && result.ipsSummary.recommendations.length > 0) {
                            responseContent += '\n💡 **Recomendaciones:**\n'
                            result.ipsSummary.recommendations.forEach((rec: string) => {
                                responseContent += `• ${rec}\n`
                            })
                        }
                    }

                    // Add AI response to chat with exact original format
                    const aiMessage: ChatMessage = {
                        id: `ai_${Date.now()}`,
                        role: 'assistant',
                        content: responseContent,
                        timestamp: new Date(),
                        type: 'note',
                        clinicalData: {
                            soap: mergedSOAP,
                            fhir: currentFHIR,
                            alerts: result.alerts
                        },
                        suggestions: typedSuggestions
                    }

                    setMessages(prev => [...prev, aiMessage])

                    // Trigger clinical alerts generation (Non-blocking) - exactly as original
                    generateClinicalAlerts(mergedSOAP)

                    return {
                        ...result,
                        fhir: currentFHIR,
                        soap: mergedSOAP,
                        healthEducation: result.healthEducation,
                        isClinicalUpdate: true,
                        suggestions: typedSuggestions
                    }
                }

                // Handle questions - exactly as original
                if (result.type === 'question') {
                    const responseContent = result.answer || result.summary || 'No se encontró información específica sobre su consulta.'

                    const aiMessage: ChatMessage = {
                        id: `ai_${Date.now()}`,
                        role: 'assistant',
                        content: responseContent,
                        timestamp: new Date(),
                        type: 'general'
                    }

                    setMessages(prev => [...prev, aiMessage])
                    return result
                }

                // Handle other types (clarification) - exactly as original
                const responseContent = result.type === 'clarification'
                    ? 'No pude interpretar la información proporcionada. ¿Podrías ser más específico?'
                    : result.summary || 'Procesado'

                const aiMessage: ChatMessage = {
                    id: `ai_${Date.now()}`,
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date(),
                    type: 'system'
                }

                setMessages(prev => [...prev, aiMessage])
                return result

            } else {
                // Handle AI service errors
                const errorMessage: ChatMessage = {
                    id: `error_${Date.now()}`,
                    role: 'assistant',
                    content: 'Lo siento, hubo un problema procesando tu solicitud. Por favor intenta de nuevo.',
                    timestamp: new Date(),
                    type: 'error'
                }

                setMessages(prev => [...prev, errorMessage])

                if (onError) {
                    onError(aiResponse.error?.message || 'Error processing input')
                }
            }

        } catch (error) {
            console.error('Error in processSmartInput:', error)

            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                role: 'assistant',
                content: 'Ocurrió un error inesperado. Por favor verifica tu conexión e intenta nuevamente.',
                timestamp: new Date(),
                type: 'error'
            }

            setMessages(prev => [...prev, errorMessage])

            if (onError) {
                onError(error instanceof Error ? error.message : 'Unexpected error')
            }
        } finally {
            setIsProcessing(false)
        }
    }, [apiKey, patientRecord, patientIPS, messages, lastProcessedInputRef, onError])

    // Advanced medical text processing
    const processInput = useCallback(async (text: string, mode: 'manual' | 'voice' = 'manual') => {
        if (!text.trim()) return

        const normalizedInput = text.trim()
        if (normalizedInput === lastProcessedInputRef.current) {
            return
        }

        setIsProcessing(true)
        lastProcessedInputRef.current = normalizedInput

        try {
            // Process with advanced medical AI
            const result = await medicalProcessor.processText(normalizedInput, {
                processingLevel: 'standard',
                includeValidation: true,
                generateQuestions: false
            })

            // Handle noise filtering
            if (result.isNoiseFiltered) {
                console.log('Noise filtered:', normalizedInput)
                return
            }

            // Add user message
            const userMsg = addMessage('user', normalizedInput, mode === 'voice' ? 'voice' : 'note')

            // Update clinical state
            if (result.vitalSigns) {
                setVitalSigns(prev => ({ ...prev, ...result.vitalSigns! }))
            }

            // Update SOAP sections
            if (Object.keys(result.soapSections).length > 0) {
                setSoap(prev => {
                    const updated = { ...prev };
                    Object.entries(result.soapSections).forEach(([key, value]) => {
                        if (value) {
                            const currentValue = (updated as any)[key] || '';
                            (updated as any)[key] = currentValue ? `${currentValue}\n${value}` : value;
                        }
                    });
                    return updated;
                });
            }

            // Update FHIR plan items
            if (result.fhirItems.length > 0) {
                setFhirPlan(prev => [...prev, ...result.fhirItems])
            }

            // Update suggestions and alerts
            if (result.suggestions.length > 0) {
                setSuggestions(prev => [...prev, ...result.suggestions])
            }

            if (result.alerts.length > 0) {
                setAlerts(prev => [...prev, ...result.alerts])
            }

            // Generate contextual AI response
            let responseText = '✅ Información procesada'

            if (result.vitalSigns) {
                responseText += '\n🔵 Signos vitales detectados y registrados'
            }

            if (Object.keys(result.soapSections).length > 0) {
                const sections = Object.keys(result.soapSections)
                responseText += `\n📝 Actualizado SOAP: ${sections.join(', ')}`
            }

            if (result.confidence > 0.7) {
                responseText += '\n🎯 Análisis completo con alta confianza'
            }

            const assistantMsg = addMessage('assistant', responseText, 'analysis')

            // Add clinical context to message if available
            if (result.fhirItems.length > 0 || result.alerts.length > 0) {
                // Update message with clinical data
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMsg.id ? {
                        ...msg,
                        clinicalData: {
                            soap: result.soapSections,
                            fhir: result.fhirItems,
                            alerts: result.alerts
                        },
                        suggestions: result.suggestions.slice(0, 3)
                    } : msg
                ))
            }

            setHasUnsavedChanges(true)

        } catch (error) {
            console.error('Error processing input:', error)
            const errorMsg = error instanceof Error ? error.message : 'Error procesando texto médico'
            onError?.(errorMsg)
            addMessage('assistant', `❌ Error: ${errorMsg}`, 'error')
        } finally {
            setIsProcessing(false)
        }
    }, [addMessage, onError])

    // Real-time voice processing
    const processTranscriptBatch = useCallback(async () => {
        if (!inConsultation || isProcessing) return

        const batchText = realTimeProcessor.getUnprocessedText()
        if (!batchText) return

        setIsPreprocessing(true)

        try {
            await processInput(batchText, 'voice')
            setVoiceState(prev => ({
                ...prev,
                lastProcessedTime: new Date()
            }))
        } catch (error) {
            console.error('Error in batch processing:', error)
        } finally {
            setIsPreprocessing(false)
        }
    }, [inConsultation, isProcessing, processInput])

    // Handle voice input with buffering
    const handleVoiceInput = useCallback((transcript: string, isFinal: boolean = false) => {
        if (!transcript.trim()) return

        setVoiceState(prev => ({
            ...prev,
            interimTranscript: isFinal ? '' : transcript,
            finalTranscript: isFinal ? prev.finalTranscript + ' ' + transcript : prev.finalTranscript
        }))

        if (isFinal) {
            realTimeProcessor.addToBuffer(transcript)
        }

        // Update buffer count
        setVoiceState(prev => ({
            ...prev,
            bufferCharCount: realTimeProcessor.getBufferCharCount()
        }))

        // Schedule processing if buffer is getting full
        const bufferCount = realTimeProcessor.getBufferCharCount()
        if (bufferCount > 150 && !processingTimeoutRef.current) {
            processingTimeoutRef.current = setTimeout(() => {
                processTranscriptBatch()
                processingTimeoutRef.current = null
            }, 500)
        }
    }, [processTranscriptBatch])

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (processingTimeoutRef.current) {
                clearTimeout(processingTimeoutRef.current)
            }
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current)
            }
        }
    }, [])

    const updateSoapSection = useCallback((section: keyof SOAPData, value: string) => {
        setSoap((p) => ({ ...p, [section]: value })); setHasUnsavedChanges(true)
    }, [])

    const addFhirPlanItem = useCallback((item: Omit<FHIRPlanItem, 'id'>) => {
        const n = { ...item, id: mkId() }; setFhirPlan((p) => [...p, n]); setHasUnsavedChanges(true); return n
    }, [])

    const removeFhirPlanItem = useCallback((id: string) => {
        setFhirPlan((p) => p.filter((i) => i.id !== id)); setHasUnsavedChanges(true)
    }, [])

    const updateFhirPlanItem = useCallback((id: string, u: Partial<FHIRPlanItem>) => {
        setFhirPlan((p) => p.map((i) => (i.id === id ? { ...i, ...u } : i))); setHasUnsavedChanges(true)
    }, [])

    const finalizeConsultation = useCallback(async () => {
        if (!consultationContext) { onError?.('Sin contexto de consulta'); return null }
        setIsSaving(true)
        try {
            const result: ConsultationResult = {
                context: consultationContext, soap,
                vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
                conditions: fhirPlan.filter((i) => i.type === 'condition').map((i) => ({ text: i.text, status: i.status as any, category: 'encounter-diagnosis' as const })),
                medications: fhirPlan.filter((i) => i.type === 'medication').map((i) => { const p = i.text.split(' — '); return { name: p[0], dose: p[1] || '', frequency: '', route: '' } }),
                allergies: fhirPlan.filter((i) => i.type === 'allergy').map((i) => ({ allergen: i.text, type: 'allergy' as const, category: 'medication' as const, criticality: 'unable-to-assess' as const })),
                consultationType: 'consultation', startTime: startTimeRef.current, endTime: new Date().toISOString(),
            }
            const saved = await saveConsultationResults(result)
            setIsFinalized(true); setHasUnsavedChanges(false)
            addMessage('system', '✅ Consulta guardada.', 'general')
            return saved
        } catch (e) { onError?.(e instanceof Error ? e.message : 'Error al guardar'); return null }
        finally { setIsSaving(false) }
    }, [consultationContext, soap, vitalSigns, fhirPlan, healthEducation, addMessage, onError])

    const resetConsultation = useCallback(() => {
        setMessages([]); setSoap(normalizeSoapData({ subjective: '', objective: '', assessment: '', plan: '' }))
        setFhirPlan([]); setVitalSigns({}); setIsFinalized(false); setHasUnsavedChanges(false)
        setAlerts([]); setSuggestions([]); setHealthEducation(''); startTimeRef.current = new Date().toISOString()
    }, [])

    // Update clinical state when dependencies change
    useEffect(() => {
        setClinicalState({
            soap,
            fhir: fhirPlan,
            alerts,
            healthEducation,
            suggestions
        })
    }, [soap, fhirPlan, alerts, healthEducation, suggestions])

    // Voice recognition controls
    const toggleListening = useCallback(() => {
        setVoiceState(prev => ({ ...prev, isListening: !prev.isListening }))
    }, [])

    const pauseListening = useCallback(() => {
        setVoiceState(prev => ({ ...prev, isPaused: !prev.isPaused }))
    }, [])

    const finalizeRecording = useCallback(async () => {
        // Process any remaining buffer
        await processTranscriptBatch()

        // Stop listening
        setVoiceState(prev => ({
            ...prev,
            isListening: false,
            isPaused: false
        }))

        // Clear buffer
        realTimeProcessor.clearBuffer()
    }, [processTranscriptBatch])

    // Enhanced message management — matches original sendMessage pattern
    const sendMessage = useCallback(async (text?: string, options?: { silentMode?: boolean }) => {
        const messageText = text || inputText
        if (!messageText.trim()) return

        // silentMode: When true, suppress user message display (used for automatic streaming)
        const silentMode = options?.silentMode ?? false

        // Only clear inputText on explicit (non-silent) sends to preserve typed text during auto-flush
        if (!silentMode) {
            setInputText('')
        }

        // Add user message optimistically BEFORE processing (so it appears before assistant response)
        // Will be removed if AI classifies as noise
        let userMessageId: string | null = null
        if (!silentMode) {
            userMessageId = `user_${Date.now()}`
            const userMessage: ChatMessage = {
                id: userMessageId,
                role: 'user',
                content: messageText,
                timestamp: new Date(),
                type: 'general'
            }
            setMessages(prev => [...prev, userMessage])
        }

        // Process with AI to determine if it's noise or medical content
        const result = await processSmartInput(messageText, 'manual')

        // If noise was detected, remove the optimistically-added user message
        if (result?.type === 'noise' && userMessageId) {
            setMessages(prev => prev.filter(m => m.id !== userMessageId))
        }
    }, [inputText, processSmartInput])

    // Generate contextual clinical alerts (Advisor) - exactly as original
    const generateClinicalAlerts = useCallback(async (currentSoap: SOAPData) => {
        // Only generate if there is some clinical context
        if (!currentSoap.s && !currentSoap.o && !currentSoap.a) return

        try {
            // Build context about patient allergies and current medications for safety checks
            const patientAllergies = patientIPS?.allergies?.map(a => a.name).join(', ') || 'Ninguna registrada'
            const currentMeds = patientIPS?.medications?.map(m => m.name).join(', ') || 'Ninguno registrado'

            // Simple advisory prompt focused on medication safety
            const advisoryPrompt = `Eres un sistema de soporte a la decisión clínica.

Paciente: ${patientRecord?.name}, ${patientRecord?.age} años, ${patientRecord?.gender}
Alergias conocidas: ${patientAllergies}
Medicamentos actuales: ${currentMeds}

Nota actual:
S: ${currentSoap.s}
O: ${currentSoap.o}
A: ${currentSoap.a}
P: ${currentSoap.p}

Analiza si hay riesgos de seguridad o interacciones medicamentosas. Genera máximo 2 alertas críticas si encuentras:
1. Medicamento contraindicado por alergias conocidas
2. Interacción peligrosa con medicamentos actuales
3. Dosis peligrosamente alta para la edad
4. Contraindicación por género/edad

Responde solo JSON:
{
  "insights": [
    {
      "title": "Título corto de la alerta",
      "description": "Descripción específica del riesgo",
      "severity": "high"
    }
  ]
}`

            if (apiKey) {
                const aiService = getAIFHIRService(apiKey)
                const advisoryResponse = await aiService.textToFHIR(advisoryPrompt, {
                    patientRecord,
                    patientIPS,
                    clinicalState
                })

                if (advisoryResponse.success && advisoryResponse.data?.insights) {
                    // Add advisory insights as system messages
                    advisoryResponse.data.insights.forEach((insight: any) => {
                        const alertMessage: ChatMessage = {
                            id: `alert_${Date.now()}_${Math.random()}`,
                            role: 'assistant',
                            content: `⚠️ ${insight.title}: ${insight.description}`,
                            timestamp: new Date(),
                            type: 'alert'
                        }
                        setMessages(prev => [...prev, alertMessage])
                    })

                    console.log('🚨 Generated clinical alerts:', advisoryResponse.data.insights)
                }
            }
        } catch (error) {
            console.error('Error generating clinical alerts:', error)
        }
    }, [apiKey, patientRecord, patientIPS, clinicalState])

    // Approve copilot suggestion
    const approveSuggestion = useCallback((suggestion: CopilotSuggestion) => {
        if (suggestion.type === 'medication') {
            // Add to FHIR plan
            const medItem: FHIRPlanItem = {
                id: mkId(),
                type: 'medication',
                status: 'active',
                text: suggestion.title,
                display: suggestion.title,
                details: suggestion.description
            }
            setFhirPlan(prev => [...prev, medItem])
        } else if (suggestion.type === 'diagnosis') {
            // Add to conditions
            const condItem: FHIRPlanItem = {
                id: mkId(),
                type: 'condition',
                status: 'active',
                text: suggestion.title,
                display: suggestion.title,
                details: suggestion.description,
                verificationStatus: 'confirmed'
            }
            setFhirPlan(prev => [...prev, condItem])
        }

        // Remove approved suggestion
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))

        setHasUnsavedChanges(true)
        addMessage('assistant', `✅ Sugerencia aplicada: ${suggestion.title}`, 'system')
    }, [addMessage])

    return {
        // Core data
        messages,
        soap,
        fhirPlan,
        vitalSigns,
        clinicalState,

        // States
        isProcessing,
        isPreprocessing,
        isSaving,
        isFinalized,
        hasUnsavedChanges,
        inConsultation,
        elapsedTime,

        // Copilot features
        suggestions,
        alerts,
        healthEducation,

        // Voice recognition
        voiceState,
        isListening: voiceState.isListening,
        isPaused: voiceState.isPaused,
        interimTranscript: voiceState.interimTranscript,
        bufferCharCount: voiceState.bufferCharCount,
        lastProcessedTime: voiceState.lastProcessedTime,

        // Input management
        inputText,
        setInputText,

        // Core functions
        processInput,
        processSmartInput,
        sendMessage,
        addMessage,
        updateSoapSection,
        setVitalSigns,

        // FHIR management
        addFhirPlanItem,
        removeFhirPlanItem,
        updateFhirPlanItem,

        // Voice functions
        toggleListening,
        pauseListening,
        finalizeRecording,
        handleVoiceInput,

        // Copilot functions
        approveSuggestion,
        setHealthEducation,

        // Consultation management
        finalizeConsultation,
        resetConsultation,
        setInConsultation,
        setElapsedTime,
    }
}
