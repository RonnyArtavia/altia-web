/**
 * MedicalNotesCopilotPage - Complete Medical Consultation Interface
 * Responsive 2-panel medical notes UI with AI copilot
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Activity,
  AlertTriangle,
  Check,
  Mic,
  MicOff,
  Send,
  Save,
  Sparkles,
  Stethoscope,
  User,
  History,
  ClipboardList,
  ArrowUpRight,
  BookOpen,
  Pill,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { useAuthStore } from '@/features/auth/stores/authStore';
import { usePatientStore } from '@/features/patients/stores/patientStore';
import { usePatientFullData } from '@/features/patients/hooks/usePatientData';
import { getPatientIPSData } from '../services/ipsService';
import useMedicalCopilot from '../hooks/useMedicalCopilot';
import { useClinicalGuard } from '../hooks/useClinicalGuard';
import type {
  CopilotSuggestion,
  PatientRecordDisplay,
  TabItem,
  IPSDisplayData,
  ConsultationEntry,
  VitalSignsData
} from '../types/medical-notes';
import { getAIFHIRService } from '../../../services/aiService';
import { IPSDashboardCompact } from '../components/IPSDashboardCompact';
import { ChatPanelCopilot } from '../components/ChatPanelCopilot';
import { MainContentPanel } from '../components/MainContentPanel';
import { SOAPCard } from '../components/SOAPCard';
import { SafeguardsPanel } from '../components/SafeguardsPanel';
import { useWebSpeechRecognition } from '../hooks/useWebSpeechRecognition';
import { changeAppointmentStatus } from '@/features/schedule/services/appointmentService';
import { PDFPreviewDialog, type PDFDocumentType } from '../components/PDFPreviewDialog';
import { getTemplateConfig, type TemplateConfig } from '@/services/templateConfigService';

interface MedicalNotesCopilotPageProps { }

// Layout detection hook
function useMedicalConsultationLayout() {
  return {
    isDesktop: window.innerWidth >= 1024,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
  };
}

// Function to load real patient IPS data
async function loadPatientIPSData(
  patientId: string,
  organizationId: string
): Promise<{
  ipsData: IPSDisplayData;
  vitalSigns: VitalSignsData | null;
}> {
  try {
    return await getPatientIPSData(patientId, organizationId);
  } catch (error) {
    console.error('Error loading patient IPS data:', error);
    // Return empty structure as fallback
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
    };
  }
}



// Main Component
export function MedicalNotesCopilotPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointmentId');
  const patientId = searchParams.get('patientId');
  const consultationMode = (searchParams.get('mode') || 'normal') as 'normal' | 'history';
  const isHistoryMode = consultationMode === 'history';
  const { userData } = useAuthStore();
  const { patients, loadPatients } = usePatientStore();

  // Layout detection
  const layoutInfo = useMedicalConsultationLayout();

  // Tab state - 6 clinical workflow tabs
  const [activeTab, setActiveTab] = useState('resumen-ips');
  const [openTabs, setOpenTabs] = useState<TabItem[]>([
    { id: 'resumen-ips', title: 'Resumen Clínico', icon: <Activity size={16} /> },
    { id: 'nueva-consulta', title: 'Nueva Consulta', icon: <Stethoscope size={16} /> },
    { id: 'consultas-anteriores', title: 'Consultas Anteriores', icon: <History size={16} /> },
    { id: 'ordenes', title: 'Órdenes', icon: <ClipboardList size={16} /> },
    { id: 'referencias', title: 'Referencias', icon: <ArrowUpRight size={16} /> },
    { id: 'farmacia', title: 'Farmacia', icon: <Pill size={16} /> },
    { id: 'antecedentes', title: 'Antecedentes', icon: <BookOpen size={16} /> },
  ]);

  // Chat panel position & width (resizable)
  const [chatOnLeft, setChatOnLeft] = useState(true);
  const [chatWidth, setChatWidth] = useState(520);
  const isResizingRef = useRef(false);

  const toggleChatPosition = useCallback(() => {
    setChatOnLeft(prev => !prev);
  }, []);

  const handleChatResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startW = chatWidth;

    const onMove = (ev: MouseEvent) => {
      // When chat is on the left, dragging right = wider; on the right, dragging left = wider
      const delta = chatOnLeft ? ev.clientX - startX : startX - ev.clientX;
      const next = Math.max(360, Math.min(800, startW + delta));
      setChatWidth(next);
    };
    const onUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [chatWidth, chatOnLeft]);

  // Initialize state first before hooks that use them
  const [patientRecord, setPatientRecord] = useState<PatientRecordDisplay | undefined>(undefined);
  const [ipsData, setIpsData] = useState<IPSDisplayData>({ encounters: [], allergies: [], medications: [], conditions: [], vaccines: [] });
  const [vitalSigns, setVitalSigns] = useState<VitalSignsData | null>(null);

  // Medical Copilot with complete patient context
  const {
    messages,
    inputText,
    setInputText,
    sendMessage,
    isProcessing: aiProcessing,
    soap,
    fhirPlan,
    clinicalState,
    addFhirPlanItem,
    removeFhirPlanItem,
    updateFhirPlanItem,
    approveSuggestion,
    updateSoapSection,
  } = useMedicalCopilot({
    patientRecord,
    patientIPS: ipsData,
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    onError: (error) => {
      console.error('Medical copilot error:', error);
    }
  });


  // Clinical Guards for real-time safety alerts
  const clinicalGuard = useClinicalGuard(inputText, ipsData || {
    encounters: [],
    allergies: [],
    medications: [],
    conditions: [],
    vaccines: [],
    labOrders: [],
    labResults: [],
    clinicalEvolution: []
  });

  // Invisible buffer for dictation (same pattern as original)
  const dictationBuffer = useRef('');
  const [bufferCharCount, setBufferCharCount] = useState(0);
  const [lastBufferUpdate, setLastBufferUpdate] = useState<number>(0);
  const lastBufferUpdateRef = useRef<number>(0);

  // Web Speech Recognition hook with real-time transcription (same as original)
  const {
    isListening: isRecording,
    toggleListening: toggleRecording,
    stopListening: stopRecording,
    isSupported: speechSupported,
    interimTranscript,
    error: speechError,
    clearError: clearSpeechError,
    permissionStatus: micPermissionStatus,
    requestPermission: requestMicPermission,
    connectivityStatus,
    checkConnectivity,
    resetTranscript,
  } = useWebSpeechRecognition({
    language: 'es-ES',
    continuous: true,
    interimResults: true,
    autoRestart: true,
    onResult: (transcript) => {
      // Append finalized text to dictation buffer
      if (transcript.trim()) {
        const newBuffer = dictationBuffer.current
          ? `${dictationBuffer.current} ${transcript.trim()}`
          : transcript.trim();
        dictationBuffer.current = newBuffer;
        setLastBufferUpdate(Date.now());
        lastBufferUpdateRef.current = Date.now();
        setBufferCharCount(newBuffer.length);
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
    },
  });

  // Paused State (managed locally like original)
  const [isPaused, setIsPaused] = useState(false);

  // Recording duration tracking
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const chunksCount = 0; // Not using MediaRecorder chunks

  // Track recording duration
  useEffect(() => {
    if (isRecording && !recordingStartTime) {
      setRecordingStartTime(Date.now());
    }
    if (!isRecording) {
      setRecordingStartTime(null);
      setRecordingDuration(0);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || !recordingStartTime) return;
    const interval = setInterval(() => {
      setRecordingDuration(Date.now() - recordingStartTime);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording, recordingStartTime]);


  // Consultation state
  const [inConsultation, setInConsultation] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [consultationStartTime, setConsultationStartTime] = useState<number | null>(null);

  // Data state - Load complete patient medical record from Firebase
  const {
    patient: patientData,
    allergies: patientAllergies,
    medications: patientMedications,
    medicalHistory: patientConditions,
    immunizations: patientImmunizations,
    encounters: patientEncounters,
    vitalSigns: patientVitalSigns,
    serviceRequests: patientServiceRequests,
    labResults: patientLabResults,
    isLoading: ipsLoading,
    error: ipsError
  } = usePatientFullData(patientId || '', userData?.organizationId || '');

  // Transform Firebase FHIR data to IPS format when patient data loads
  useEffect(() => {
    if (!ipsLoading && patientData) {
      console.log('🔍 Patient data loaded:', {
        patient: patientData,
        allergies: patientAllergies,
        medications: patientMedications,
        conditions: patientConditions,
        immunizations: patientImmunizations,
        encounters: patientEncounters,
        vitalSigns: patientVitalSigns,
        serviceRequests: patientServiceRequests,
        labResults: patientLabResults
      });
      // Build patient record from Firebase data
      const calculatedAge = patientData.birthDate
        ? Math.floor((Date.now() - new Date(patientData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;

      setPatientRecord({
        id: patientData.id,
        name: patientData.name,
        age: calculatedAge || patientData.age || 'No especificada',
        gender: patientData.gender === 'male' ? 'Masculino' :
          patientData.gender === 'female' ? 'Femenino' : 'No especificado',
        genderShort: patientData.gender === 'male' ? 'M' :
          patientData.gender === 'female' ? 'F' : 'N/E',
        photoUrl: patientData.photoURL || '',
        fhirId: patientId!,
        phone: patientData.phone || '',
        email: patientData.email || '',
      });

      // Debug: Check what data we're getting
      console.log('🔍 DEBUG - patientEncounters:', patientEncounters);

      // Transform FHIR data to IPS format
      const transformedIpsData: IPSDisplayData = {
        encounters: (patientEncounters && patientEncounters.length > 0 &&
          patientEncounters.some(e => e.practitionerName || e.practitioner || e.reasonCode || e.reasonText))
          ? patientEncounters.map(encounter => ({
            id: encounter.id,
            date: encounter.periodStart ? new Date(encounter.periodStart).toLocaleDateString() : 'Fecha no disponible',
            type: encounter.class?.display || encounter.type || 'Consulta',
            doctor: encounter.practitionerName || encounter.practitioner || 'Dr. No especificado',
            summary: encounter.reasonCode || encounter.reasonText || 'Sin descripción disponible',
            patientNote: encounter.note
          }))
          : [
            // Datos de muestra para demostración del historial de consultas
            {
              id: 'demo-1',
              date: '15/02/2026',
              type: 'Consulta de Control',
              doctor: 'Dr. María González',
              summary: 'Control rutinario, paciente refiere mejoría en dolor abdominal. Examen físico normal. Continuar tratamiento actual.',
              patientNote: 'Me siento mucho mejor, el dolor ha disminuido considerablemente.'
            },
            {
              id: 'demo-2',
              date: '08/02/2026',
              type: 'Consulta de Urgencia',
              doctor: 'Dr. Carlos Rodríguez',
              summary: 'Paciente acude por dolor abdominal intenso de 2 horas de evolución. Se descarta cuadro quirúrgico. Manejo sintomático.',
              patientNote: 'El dolor comenzó después del almuerzo, muy intenso en lado derecho.'
            },
            {
              id: 'demo-3',
              date: '01/02/2026',
              type: 'Consulta Medicina General',
              doctor: 'Dr. Ana Martínez',
              summary: 'Chequeo médico preventivo. Exámenes de laboratorio dentro de parámetros normales. Recomendaciones de estilo de vida.',
              patientNote: 'Quiero mantenerme saludable y prevenir enfermedades.'
            },
            {
              id: 'demo-4',
              date: '25/01/2026',
              type: 'Consulta Especializada',
              doctor: 'Dr. Luis Hernández',
              summary: 'Evaluación cardiológica por antecedentes familiares. ECG normal, presión arterial controlada. Continuar con seguimiento.',
              patientNote: 'Mi padre tuvo problemas del corazón, quiero estar seguro.'
            },
            {
              id: 'demo-5',
              date: '18/01/2026',
              type: 'Teleconsulta',
              doctor: 'Dr. Patricia Vega',
              summary: 'Seguimiento de tratamiento para hipertensión arterial. Paciente refiere adherencia al tratamiento. Tensión arterial controlada.',
              patientNote: 'Estoy tomando los medicamentos como me indicaron.'
            },
            {
              id: 'demo-6',
              date: '10/01/2026',
              type: 'Consulta Preventiva',
              doctor: 'Dr. Roberto Silva',
              summary: 'Aplicación de vacunas de refuerzo. Información sobre prevención de enfermedades estacionales. Sin contraindicaciones.',
              patientNote: 'Necesitaba ponerme al día con mis vacunas antes del viaje.'
            },
            {
              id: 'demo-7',
              date: '03/01/2026',
              type: 'Consulta de Emergencia',
              doctor: 'Dr. Carmen López',
              summary: 'Atención por cuadro febril y malestar general. Diagnóstico de síndrome viral. Tratamiento sintomático y reposo.',
              patientNote: 'Tenía fiebre alta y mucho malestar, me preocupé.'
            }
          ],

        allergies: patientAllergies?.map(allergy => ({
          name: allergy.allergen || 'Alérgeno no especificado',
          severity: allergy.severity === 'severe' ? 'Alta' :
            allergy.severity === 'moderate' ? 'Moderada' :
              allergy.severity === 'mild' ? 'Baja' :
                'No especificada',
          date: allergy.dateIdentified ? new Date(allergy.dateIdentified).toLocaleDateString() : undefined,
          doctor: 'Dr. No especificado',
          notes: allergy.notes || allergy.reaction || undefined
        })) || [],

        medications: patientMedications?.map(medication => ({
          name: medication.name || 'Medicamento no especificado',
          dose: medication.dose || 'Dosis no especificada',
          frequency: medication.frequency,
          date: medication.startDate ? new Date(medication.startDate).toLocaleDateString() : undefined,
          doctor: medication.prescribedBy || 'Dr. No especificado',
          notes: medication.notes,
          status: medication.status
        })) || [],

        conditions: patientConditions?.map(condition => ({
          name: condition.condition || 'Condición no especificada',
          status: condition.status === 'active' ? 'Activa' :
            condition.status === 'resolved' ? 'Resuelta' :
              condition.status === 'chronic' ? 'Crónica' :
              condition.status || 'Estado desconocido',
          date: condition.diagnosedDate ? new Date(condition.diagnosedDate).toLocaleDateString() : undefined,
          doctor: condition.doctorName || 'Dr. No especificado',
          notes: condition.notes
        })) || [],

        vaccines: patientImmunizations?.map(immunization => ({
          name: immunization.vaccineName || 'Vacuna no especificada',
          date: immunization.date ? new Date(immunization.date).toLocaleDateString() : undefined,
          site: immunization.site || 'Sitio no especificado',
          doctor: immunization.performer || 'Dr. No especificado',
          notes: immunization.lotNumber ? `Lote: ${immunization.lotNumber}` : undefined,
          doseNumber: immunization.doseNumber,
          route: immunization.route
        })) || [],

        labOrders: patientServiceRequests?.map(order => ({
          name: order.testName,
          type: 'Laboratorio',
          status: order.status === 'completed' ? 'Completada' :
            order.status === 'active' ? 'Pendiente' :
              order.status === 'cancelled' ? 'Cancelada' :
                'Estado desconocido',
          priority: order.priority || 'routine',
          date: order.requestedDate ? new Date(order.requestedDate).toLocaleDateString() : undefined,
          doctor: order.requesterName || order.requester || 'Dr. No especificado',
          notes: order.notes
        })) || [],

        labResults: patientLabResults?.map(result => ({
          name: result.testName,
          value: result.value || 'Sin valor',
          unit: result.unit,
          date: result.date ? new Date(result.date).toLocaleDateString() : undefined,
          flag: result.flag || undefined,
          referenceRange: result.referenceRange || undefined,
          doctor: result.performer || 'Dr. No especificado',
          notes: result.notes,
          status: result.status
        })) || []
      };

      console.log('🔍 DEBUG - transformedIpsData.encounters:', transformedIpsData.encounters);
      setIpsData(transformedIpsData);

      // Transform vital signs from Firebase FHIR format
      if (patientVitalSigns && patientVitalSigns.length > 0) {
        const latestVitals = patientVitalSigns[0]; // Assume sorted by date
        setVitalSigns({
          bloodPressure: latestVitals.bloodPressure || undefined,
          heartRate: latestVitals.heartRate || undefined,
          temperature: latestVitals.temperature || undefined,
          weight: latestVitals.weight || undefined,
          height: latestVitals.height || undefined,
          oxygenSaturation: latestVitals.oxygenSaturation || undefined,
          respiratoryRate: latestVitals.respiratoryRate || undefined,
          bmi: latestVitals.bmi || undefined,
          measurementDate: latestVitals.effectiveDateTime ?
            new Date(latestVitals.effectiveDateTime).toLocaleDateString() : undefined,
          measuredBy: latestVitals.performer || 'Personal médico',
          notes: latestVitals.note
        });
      }
    }

    if (ipsError) {
      console.error('Error loading patient FHIR data:', ipsError);
    }
  }, [ipsLoading, patientData, patientAllergies, patientMedications, patientConditions,
    patientImmunizations, patientEncounters, patientVitalSigns, patientServiceRequests,
    patientLabResults, ipsError, patientId]);

  // Load patients
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Timer for consultation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inConsultation) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [inConsultation]);

  // Update IPS data with new FHIR items including warnings - Critical for showing medication alerts
  useEffect(() => {
    if (!fhirPlan || fhirPlan.length === 0) return;

    setIpsData(prev => {
      // Get new medications from FHIR plan with warnings
      const newMedications = fhirPlan
        .filter(item => item.type === 'medication')
        .map(item => ({
          name: item.display || item.text || 'Medicamento',
          dose: item.details || item.dose || 'Dosis no especificada',
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          date: new Date().toLocaleDateString(),
          doctor: 'Dr. Actual',
          notes: item.notes,
          warning: item.warning,           // Critical: Include warnings for interactions/allergies
          warningLevel: item.warningLevel  // Critical: Include warning severity
        }));

      // Get new allergies from FHIR plan
      const newAllergies = fhirPlan
        .filter(item => item.type === 'allergy')
        .map(item => ({
          name: item.display || item.text || 'Alergia',
          severity: item.warningLevel === 'critical' ? 'Severa' :
            item.warningLevel === 'warning' ? 'Moderada' : 'Leve',
          date: new Date().toLocaleDateString(),
          doctor: 'Dr. Actual',
          notes: item.notes || item.warning
        }));

      // Get new conditions from FHIR plan
      const newConditions = fhirPlan
        .filter(item => item.type === 'condition')
        .map(item => ({
          name: item.display || item.text || 'Diagnóstico',
          status: item.verificationStatus === 'confirmed' ? 'Confirmado' :
            item.verificationStatus === 'presumptive' ? 'Presuntivo' :
              'Activo',
          date: new Date().toLocaleDateString(),
          doctor: 'Dr. Actual',
          notes: item.notes || item.code
        }));

      // Get new family history from FHIR plan
      const newFamilyHistory = fhirPlan
        .filter(item => item.type === 'familyHistory')
        .map(item => ({
          name: item.display || item.text || 'Antecedente familiar',
          relationship: item.relationship,
          date: new Date().toLocaleDateString(),
          doctor: 'Dr. Actual',
          notes: item.notes
        }));

      // Get new personal history from FHIR plan
      const newPersonalHistory = fhirPlan
        .filter(item => item.type === 'personalHistory')
        .map(item => ({
          name: item.display || item.text || 'Antecedente personal',
          category: item.category,
          date: new Date().toLocaleDateString(),
          doctor: 'Dr. Actual',
          notes: item.notes
        }));

      // Merge with existing data, avoiding duplicates by name
      const existingMedNames = new Set((prev.medications || []).map(m => m.name));
      const existingAllergyNames = new Set((prev.allergies || []).map(a => a.name));
      const existingConditionNames = new Set((prev.conditions || []).map(c => c.name));
      const existingFamilyNames = new Set((prev.familyHistory || []).map(f => f.name));
      const existingPersonalNames = new Set((prev.personalHistory || []).map(p => p.name));

      return {
        ...prev,
        medications: [
          ...(prev.medications || []),
          ...newMedications.filter(med => !existingMedNames.has(med.name))
        ],
        allergies: [
          ...(prev.allergies || []),
          ...newAllergies.filter(allergy => !existingAllergyNames.has(allergy.name))
        ],
        conditions: [
          ...(prev.conditions || []),
          ...newConditions.filter(condition => !existingConditionNames.has(condition.name))
        ],
        familyHistory: [
          ...(prev.familyHistory || []),
          ...newFamilyHistory.filter(fh => !existingFamilyNames.has(fh.name))
        ],
        personalHistory: [
          ...(prev.personalHistory || []),
          ...newPersonalHistory.filter(ph => !existingPersonalNames.has(ph.name))
        ]
      };
    });
  }, [fhirPlan]);

  // Check if consultation exists
  if (!appointmentId && !patientId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Consulta no encontrada</h2>
          <p className="text-gray-600 mb-4">No se pudo cargar la información de la consulta.</p>
          <Button onClick={() => navigate('/doctor/patients')} variant="outline">
            Volver a Pacientes
          </Button>
        </div>
      </div>
    );
  }

  const tabs = openTabs;

  const handleBack = () => {
    navigate('/doctor/patients');
  };



  // ─── PDF Generation ──────────────────────────────────────
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [pdfDocType, setPdfDocType] = useState<PDFDocumentType>('prescription')
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | null>(null)

  // Load template config once
  useEffect(() => {
    const orgId = userData?.organizationId
    if (!orgId) return
    getTemplateConfig(orgId).then(setTemplateConfig).catch(console.error)
  }, [userData?.organizationId])

  const handleGeneratePDF = useCallback((type: PDFDocumentType) => {
    setPdfDocType(type)
    setPdfDialogOpen(true)
  }, [])

  const pdfItems = (() => {
    if (pdfDocType === 'prescription') return fhirPlan.filter(i => i.type === 'medication' && i.approved !== false)
    if (pdfDocType === 'labOrder') return fhirPlan.filter(i => (i.type === 'labOrder' || i.type === 'order') && i.approved !== false)
    return fhirPlan.filter(i => i.type === 'referral' && i.approved !== false)
  })()

  const finalizeConsultation = () => {
    setInConsultation(false);
    setElapsedTime(0);
    setConsultationStartTime(null);
    // Stop voice recognition if active
    if (isRecording) {
      stopRecording();
    }
    setIsPaused(false);
  };

  // FHIR category status — lifted state for voice command sync
  const [fhirCategoryStatus, setFhirCategoryStatus] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});

  // Reset status when new items are added
  const prevFhirLenRef = useRef(fhirPlan.length);
  useEffect(() => {
    if (fhirPlan.length > prevFhirLenRef.current) {
      setFhirCategoryStatus({});
    }
    prevFhirLenRef.current = fhirPlan.length;
  }, [fhirPlan.length]);

  // Handle FHIR category approval / rejection
  const handleApproveFhirItems = useCallback((type: 'medications' | 'labOrders' | 'referrals') => {
    setFhirCategoryStatus(prev => ({ ...prev, [type]: 'approved' }));
    console.log('Doctor approved FHIR category:', type);
  }, []);

  const handleRejectFhirItems = useCallback((type: 'medications' | 'labOrders' | 'referrals') => {
    setFhirCategoryStatus(prev => ({ ...prev, [type]: 'rejected' }));
    const typeMap: Record<string, string[]> = {
      medications: ['medication'],
      labOrders: ['labOrder', 'order'],
      referrals: ['referral'],
    };
    const removeTypes = typeMap[type] || [];
    const toRemove = fhirPlan.filter(item => removeTypes.includes(item.type));

    // Limpiar lineas del SOAP plan que correspondan a los items rechazados
    if (toRemove.length > 0 && soap.plan) {
      const searchTerms = toRemove
        .map(item => (item.display || item.text || '').trim().toLowerCase())
        .filter(Boolean);
      if (searchTerms.length > 0) {
        const cleanedPlan = soap.plan
          .split('\n')
          .filter(line => {
            const lower = line.toLowerCase();
            return !searchTerms.some(term => lower.includes(term));
          })
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        updateSoapSection('plan', cleanedPlan);
        updateSoapSection('p', cleanedPlan);
      }
    }

    toRemove.forEach(item => removeFhirPlanItem(item.id));
  }, [fhirPlan, removeFhirPlanItem, soap.plan, updateSoapSection]);

  // Voice command detection for approve/reject
  const detectVoiceAction = useCallback((text: string): { action: 'approve' | 'reject'; category: 'medications' | 'labOrders' | 'referrals'; remaining: string } | null => {
    const lower = text.toLowerCase().trim();

    const patterns: { re: RegExp; action: 'approve' | 'reject'; category: 'medications' | 'labOrders' | 'referrals' }[] = [
      // Approve patterns
      { re: /\b(aprobar|apruebo|aprueba|confirmar|confirmo|acepto|aceptar)\b.*\b(receta|medicamento|medicamentos|prescripci[oó]n)\b/, action: 'approve', category: 'medications' },
      { re: /\b(receta|medicamento|medicamentos|prescripci[oó]n)\b.*\b(aprobad[oa]|confirmad[oa]|aceptad[oa])\b/, action: 'approve', category: 'medications' },
      { re: /\b(aprobar|apruebo|aprueba|confirmar|confirmo|acepto|aceptar)\b.*\b(laboratorio|lab|examen|ex[aá]menes|orden de lab)\b/, action: 'approve', category: 'labOrders' },
      { re: /\b(laboratorio|lab|examen|ex[aá]menes|orden de lab)\b.*\b(aprobad[oa]|confirmad[oa]|aceptad[oa])\b/, action: 'approve', category: 'labOrders' },
      { re: /\b(aprobar|apruebo|aprueba|confirmar|confirmo|acepto|aceptar)\b.*\b(referencia|interconsulta|derivaci[oó]n)\b/, action: 'approve', category: 'referrals' },
      { re: /\b(referencia|interconsulta|derivaci[oó]n)\b.*\b(aprobad[oa]|confirmad[oa]|aceptad[oa])\b/, action: 'approve', category: 'referrals' },
      // Reject patterns
      { re: /\b(rechazar|rechazo|rechaza|cancelar|cancelo|eliminar|elimino|quitar|quito)\b.*\b(receta|medicamento|medicamentos|prescripci[oó]n)\b/, action: 'reject', category: 'medications' },
      { re: /\b(receta|medicamento|medicamentos|prescripci[oó]n)\b.*\b(rechazad[oa]|cancelad[oa]|eliminad[oa])\b/, action: 'reject', category: 'medications' },
      { re: /\b(rechazar|rechazo|rechaza|cancelar|cancelo|eliminar|elimino|quitar|quito)\b.*\b(laboratorio|lab|examen|ex[aá]menes|orden de lab)\b/, action: 'reject', category: 'labOrders' },
      { re: /\b(laboratorio|lab|examen|ex[aá]menes|orden de lab)\b.*\b(rechazad[oa]|cancelad[oa]|eliminad[oa])\b/, action: 'reject', category: 'labOrders' },
      { re: /\b(rechazar|rechazo|rechaza|cancelar|cancelo|eliminar|elimino|quitar|quito)\b.*\b(referencia|interconsulta|derivaci[oó]n)\b/, action: 'reject', category: 'referrals' },
      { re: /\b(referencia|interconsulta|derivaci[oó]n)\b.*\b(rechazad[oa]|cancelad[oa]|eliminad[oa])\b/, action: 'reject', category: 'referrals' },
    ];

    for (const { re, action, category } of patterns) {
      const match = lower.match(re);
      if (match) {
        // Remove the matched command from the text
        const remaining = text.replace(new RegExp(re.source, 'i'), '').replace(/\s{2,}/g, ' ').trim();
        return { action, category, remaining };
      }
    }
    return null;
  }, []);

  // Process text: detect voice actions (approve/reject), then send remaining to AI
  const processTextWithVoiceActions = useCallback((text: string): string => {
    const voiceAction = detectVoiceAction(text);
    if (!voiceAction) return text;

    // Execute the detected action
    if (voiceAction.action === 'approve') {
      handleApproveFhirItems(voiceAction.category);
    } else {
      handleRejectFhirItems(voiceAction.category);
    }

    return voiceAction.remaining;
  }, [detectVoiceAction, handleApproveFhirItems, handleRejectFhirItems]);

  // Handle sending messages — combines buffer + typed text
  // silentMode: When true, only send dictation buffer without touching inputText (auto-flush streaming)
  const handleSendMessage = useCallback(async (silentMode: boolean = false) => {
    const bufferText = dictationBuffer.current;

    if (silentMode) {
      const voiceText = bufferText ? bufferText.trim() : '';
      if (!voiceText) return;

      if (!inConsultation) {
        setInConsultation(true);
        setConsultationStartTime(Date.now());
      }

      dictationBuffer.current = '';
      setBufferCharCount(0);
      resetTranscript();

      // Check for voice actions before sending to AI
      const remaining = processTextWithVoiceActions(voiceText);
      if (remaining) {
        await sendMessage(remaining, { silentMode });
      }
    } else {
      const combinedVoice = bufferText ? bufferText.trim() : '';
      const finalText = `${inputText} ${combinedVoice}`.trim();

      if (!finalText) return;

      if (!inConsultation) {
        setInConsultation(true);
        setConsultationStartTime(Date.now());
      }

      setInputText('');
      dictationBuffer.current = '';
      setBufferCharCount(0);
      resetTranscript();

      // Check for voice actions before sending to AI
      const remaining = processTextWithVoiceActions(finalText);
      if (remaining) {
        await sendMessage(remaining, { silentMode });
      }
    }
  }, [inputText, inConsultation, resetTranscript, sendMessage, processTextWithVoiceActions]);

  // Ref for latest handleSendMessage (for streaming auto-flush)
  const sendRef = useRef(handleSendMessage);
  useEffect(() => {
    sendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Handle stop recording and send
  // silentMode defaults to true for streaming, false for finalize
  const handleStopRecordingAndSend = useCallback(async (silentMode: boolean = true) => {
    const bufferText = dictationBuffer.current;
    const combinedVoice = bufferText
      ? `${bufferText} ${interimTranscript || ''}`.trim()
      : (interimTranscript || '').trim();

    // Stop recording
    stopRecording();
    setIsPaused(false);

    if (silentMode) {
      // Auto-flush: only send voice content, preserve inputText
      if (!combinedVoice) return;

      if (!inConsultation) {
        setInConsultation(true);
        setConsultationStartTime(Date.now());
      }
      dictationBuffer.current = '';
      setBufferCharCount(0);
      resetTranscript();
      const remaining = processTextWithVoiceActions(combinedVoice);
      if (remaining) {
        await sendMessage(remaining, { silentMode });
      }
    } else {
      // Explicit finalize: combine typed + voice
      const finalText = `${inputText} ${combinedVoice}`.trim();
      if (!finalText) return;

      if (!inConsultation) {
        setInConsultation(true);
        setConsultationStartTime(Date.now());
      }
      setInputText('');
      dictationBuffer.current = '';
      setBufferCharCount(0);
      resetTranscript();
      const remaining = processTextWithVoiceActions(finalText);
      if (remaining) {
        await sendMessage(remaining, { silentMode });
      }
    }
  }, [inputText, interimTranscript, stopRecording, resetTranscript, sendMessage, inConsultation, processTextWithVoiceActions]);

  // Handle Pause: Stop recording + process text + set paused UI state (same as original)
  const handlePauseRecording = useCallback(async () => {
    await handleStopRecordingAndSend(true); // silentMode: streaming text, suppress user msg
    setIsPaused(true);
  }, [handleStopRecordingAndSend]);

  // Handle Start/Resume: Clear paused state and toggle recording (same as original)
  const handleStartRecording = useCallback(async () => {
    setIsPaused(false);
    await toggleRecording();
  }, [toggleRecording]);

  // Handle Finalize Recording: Stop, process, done (same as original)
  const handleFinalizeRecording = useCallback(async () => {
    await handleStopRecordingAndSend(true); // silentMode: streaming text, suppress user msg
    setIsPaused(false);
  }, [handleStopRecordingAndSend]);

  // Streaming Logic: Auto-send on silence or sufficient length (same as original)
  const [lastProcessedTime, setLastProcessedTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isRecording || aiProcessing) return;
    const bufferText = dictationBuffer.current;
    if (!bufferText || bufferText.trim().length === 0) return;

    const timeSinceLastProcess = Date.now() - (lastProcessedTime?.getTime() || 0);
    const MIN_SEND_INTERVAL = 1500;

    // Length trigger: if buffer is long enough, auto-send (silentMode: suppress user msg)
    if (bufferText.length > 150 && timeSinceLastProcess > MIN_SEND_INTERVAL) {
      handleSendMessage(true);
      setLastProcessedTime(new Date());
      return;
    }

    // Silence trigger: if user stops speaking for 1.5s, auto-send (silentMode: suppress user msg)
    const timeoutId = setTimeout(() => {
      const currentTimeSince = Date.now() - (lastProcessedTime?.getTime() || 0);
      if (currentTimeSince < MIN_SEND_INTERVAL) return;
      handleSendMessage(true);
      setLastProcessedTime(new Date());
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isRecording, handleSendMessage, aiProcessing, lastBufferUpdate, lastProcessedTime]);

  // Polling watchdog: force-send stale buffer after 2s (same as original)
  useEffect(() => {
    const MIN_SEND_INTERVAL = 1500;
    const intervalId = setInterval(() => {
      if (!isRecording || aiProcessing) return;
      const now = Date.now();
      const timeSinceLastUpdate = now - lastBufferUpdateRef.current;
      const timeSinceLastProcess = now - (lastProcessedTime?.getTime() || 0);
      const hasPendingText = dictationBuffer.current && dictationBuffer.current.trim().length > 0;
      if (timeSinceLastProcess < MIN_SEND_INTERVAL) return;
      if (hasPendingText && timeSinceLastUpdate > 2000) {
        lastBufferUpdateRef.current = Date.now();
        sendRef.current(true); // silentMode: streaming auto-flush
        setLastProcessedTime(new Date());
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isRecording, aiProcessing, lastProcessedTime]);

  // Debug clinical state changes
  useEffect(() => {
    console.log('🔄 Clinical state updated:', clinicalState);
  }, [clinicalState]);

  const handleApproveSuggestion = useCallback((suggestion: CopilotSuggestion) => {
    approveSuggestion(suggestion);
  }, [approveSuggestion]);

  // Mobile layout
  if (layoutInfo.isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <MainContentPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
            setTabs={setOpenTabs}
            patientRecord={patientRecord}
            ipsData={ipsData}
            vitalSigns={vitalSigns}
            clinicalState={clinicalState}
            onUpdateSoap={updateSoapSection}
            onBack={handleBack}
            elapsedTime={elapsedTime}
            inConsultation={inConsultation}
            onFinalize={finalizeConsultation}
            isProcessing={aiProcessing}
            onGeneratePDF={handleGeneratePDF}
          />
        </div>

        {/* Mobile Chat Overlay */}
        {activeTab === 'chat' && (
          <div className="fixed inset-0 bg-white z-50 overflow-hidden">
            <div className="h-full">
              <ChatPanelCopilot
                width={400}
                onResize={() => { }}
                isRight={true}
                togglePosition={() => { }}
                messages={messages}
                inputText={inputText}
                setInputText={setInputText}
                onSendMessage={handleSendMessage}
                isRecording={isRecording}
                toggleRecording={handleStartRecording}
                onStopRecordingAndSend={handleStopRecordingAndSend}
                onPauseRecording={handlePauseRecording}
                onFinalizeRecording={handleFinalizeRecording}
                isPaused={isPaused}
                interimTranscript={interimTranscript}
                speechSupported={speechSupported}
                bufferCharCount={bufferCharCount}
                onPlayAudio={() => { }}
                isPlayingAudio={false}
                isProcessing={aiProcessing}
                inConsultation={inConsultation}
                onFinalize={finalizeConsultation}
                elapsedTime={elapsedTime}
                onApproveSuggestion={handleApproveSuggestion}
                onRemoveFhirItem={removeFhirPlanItem}
                onApproveFhirItems={handleApproveFhirItems}
                onRejectFhirItems={handleRejectFhirItems}
                fhirPlan={fhirPlan}
                fhirCategoryStatus={fhirCategoryStatus}
                ipsData={ipsData}
                patientInfo={patientRecord ? `${patientRecord.age} años • ${patientRecord.gender}` : undefined}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* History mode banner */}
      {isHistoryMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm shrink-0">
          <History className="h-4 w-4" />
          <span className="font-medium">Modo historial — Solo lectura</span>
          <span className="text-amber-600">Navegando el historial del paciente sin consulta activa</span>
          {appointmentId && (
            <button
              className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
              onClick={async () => {
                if (!userData?.uid || !appointmentId) return
                try {
                  await changeAppointmentStatus(appointmentId, userData.organizationId || '', 'in-progress', userData.uid, 'doctor')
                } catch { }
                const newParams = new URLSearchParams(searchParams)
                newParams.delete('mode')
                navigate(`?${newParams.toString()}`, { replace: true })
              }}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              Iniciar atención
            </button>
          )}
        </div>
      )}
    <div className={`flex flex-1 overflow-hidden ${chatOnLeft ? 'flex-row' : 'flex-row-reverse'}`}>
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <MainContentPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
          setTabs={() => { }}
          patientRecord={patientRecord}
          ipsData={ipsData}
          vitalSigns={vitalSigns}
          clinicalState={clinicalState}
          onUpdateSoap={updateSoapSection}
          onBack={handleBack}
          elapsedTime={elapsedTime}
          inConsultation={inConsultation}
          onFinalize={finalizeConsultation}
          isProcessing={aiProcessing}
          onGeneratePDF={handleGeneratePDF}
        />
      </div>

      {/* Chat Panel — resizable, position toggleable */}
      <div style={{ width: chatWidth }} className="h-full shrink-0">
        <ChatPanelCopilot
          width={chatWidth}
          onResize={handleChatResize}
          isRight={!chatOnLeft}
          togglePosition={toggleChatPosition}
          messages={messages}
          inputText={inputText}
          setInputText={setInputText}
          onSendMessage={handleSendMessage}
          isRecording={isHistoryMode ? false : isRecording}
          toggleRecording={isHistoryMode ? async () => {} : handleStartRecording}
          onStopRecordingAndSend={isHistoryMode ? async () => {} : handleStopRecordingAndSend}
          onPauseRecording={isHistoryMode ? async () => {} : handlePauseRecording}
          onFinalizeRecording={isHistoryMode ? async () => {} : handleFinalizeRecording}
          isPaused={isPaused}
          interimTranscript={interimTranscript}
          speechSupported={isHistoryMode ? false : speechSupported}
          bufferCharCount={bufferCharCount}
          onPlayAudio={() => { }}
          isPlayingAudio={false}
          isProcessing={aiProcessing}
          inConsultation={isHistoryMode ? false : inConsultation}
          onFinalize={finalizeConsultation}
          elapsedTime={elapsedTime}
          onApproveSuggestion={handleApproveSuggestion}
          onRemoveFhirItem={removeFhirPlanItem}
          onApproveFhirItems={handleApproveFhirItems}
          onRejectFhirItems={handleRejectFhirItems}
          fhirPlan={fhirPlan}
          fhirCategoryStatus={fhirCategoryStatus}
          ipsData={ipsData}
          patientInfo={patientRecord ? `${patientRecord.age} años • ${patientRecord.gender}` : undefined}
        />
      </div>
    </div>

    {/* PDF Preview Dialog */}
    {templateConfig && (
      <PDFPreviewDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        type={pdfDocType}
        items={pdfItems}
        config={templateConfig}
        patientName={patientRecord?.name || 'Paciente'}
        patientAge={patientRecord?.age ? `${patientRecord.age} años` : undefined}
        patientGender={patientRecord?.gender}
        patientEmail={patientData?.email}
        patientPhone={patientData?.phone}
        organizationId={userData?.organizationId}
        doctorUid={userData?.uid}
      />
    )}
    </div>
  );
}

export default MedicalNotesCopilotPage;