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
  TestTube,
  Pill,
  Heart,
  Settings
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
  ChatMessage,
  ClinicalState,
  SOAPData,
  FHIRPlanItem,
  CopilotSuggestion,
  PatientRecordDisplay,
  TabItem,
  IPSDisplayData,
  ConsultationEntry,
  VitalSignsData
} from '../types/medical-notes';
import { createEmptyClinicalState, normalizeSoapData } from '../types/medical-notes';
import { getAIFHIRService } from '../../../services/aiService';
import { IPSDashboardCompact } from '../components/IPSDashboardCompact';
import { ChatPanelCopilot } from '../components/ChatPanelCopilot';
import { MainContentPanel } from '../components/MainContentPanel';
import { SOAPCard } from '../components/SOAPCard';
import { SafeguardsPanel } from '../components/SafeguardsPanel';
import { useWebSpeechRecognition } from '../hooks/useWebSpeechRecognition';

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
  const { userData } = useAuthStore();
  const { patients, loadPatients } = usePatientStore();

  // Layout detection
  const layoutInfo = useMedicalConsultationLayout();

  // Tab state - matches original exactly
  const [activeTab, setActiveTab] = useState('resumen');
  const [openTabs, setOpenTabs] = useState<TabItem[]>([
    { id: 'resumen', title: 'Resumen IPS', icon: <Activity size={16} /> },
    { id: 'resumen-clinico', title: 'Resumen Clínico', icon: <Stethoscope size={16} /> },
    { id: 'soap', title: 'Nota SOAP', icon: <FileText size={16} /> },
  ]);

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
    clinicalState
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
        fhirId: patientId!
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
          name: condition.code || condition.display || 'Condición no especificada',
          status: condition.clinicalStatus === 'active' ? 'Activa' :
            condition.clinicalStatus === 'resolved' ? 'Resuelta' :
              condition.clinicalStatus || 'Estado desconocido',
          date: condition.recordedDate ? new Date(condition.recordedDate).toLocaleDateString() : undefined,
          doctor: condition.recorder || 'Dr. No especificado',
          notes: condition.note
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

      // Merge with existing data, avoiding duplicates by name
      const existingMedNames = new Set((prev.medications || []).map(m => m.name));
      const existingAllergyNames = new Set((prev.allergies || []).map(a => a.name));
      const existingConditionNames = new Set((prev.conditions || []).map(c => c.name));

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
  const updateSoapSection = (section: keyof SOAPData, value: string) => {
    setClinicalState(prev => ({
      ...prev,
      soap: {
        ...prev.soap,
        [section]: value
      }
    }));
  };

  const handleBack = () => {
    navigate('/doctor/patients');
  };



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

  // Handle sending messages — combines buffer + typed text (same as original)
  // silentMode: When true, suppress user message display (used for auto-flush streaming)
  const handleSendMessage = useCallback(async (silentMode: boolean = false) => {
    const bufferText = dictationBuffer.current;
    const combinedVoice = bufferText ? bufferText.trim() : '';
    const finalText = `${inputText} ${combinedVoice}`.trim();

    if (!finalText) return;

    // Start consultation on first message
    if (!inConsultation && finalText) {
      console.log('🚀 Starting consultation...');
      setInConsultation(true);
      setConsultationStartTime(Date.now());
    }

    // Clear everything
    setInputText('');
    dictationBuffer.current = '';
    setBufferCharCount(0);
    resetTranscript();

    // Send the combined text directly (pass as argument to avoid React state race)
    console.log('📨 Sending message:', finalText);
    await sendMessage(finalText, { silentMode });
  }, [inputText, inConsultation, resetTranscript, sendMessage]);

  // Ref for latest handleSendMessage (for streaming auto-flush)
  const sendRef = useRef(handleSendMessage);
  useEffect(() => {
    sendRef.current = handleSendMessage;
  }, [handleSendMessage]);

  // Handle stop recording and send (same as original)
  // silentMode defaults to true for streaming, false for finalize
  const handleStopRecordingAndSend = useCallback(async (silentMode: boolean = true) => {
    const bufferText = dictationBuffer.current;
    const combinedVoice = bufferText
      ? `${bufferText} ${interimTranscript || ''}`.trim()
      : (interimTranscript || '').trim();
    const finalText = `${inputText} ${combinedVoice}`.trim();

    // Stop recording
    stopRecording();
    setIsPaused(false);

    // Send if there's text
    if (finalText) {
      // Start consultation on first message
      if (!inConsultation) {
        setInConsultation(true);
        setConsultationStartTime(Date.now());
      }
      setInputText('');
      dictationBuffer.current = '';
      setBufferCharCount(0);
      resetTranscript();
      // Send via copilot (pass text directly to avoid React state race)
      await sendMessage(finalText, { silentMode });
    }
  }, [inputText, interimTranscript, stopRecording, resetTranscript, sendMessage, inConsultation]);

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

  // Handle suggestion approval
  const handleApproveSuggestion = useCallback((suggestion: CopilotSuggestion) => {
    console.log('✅ Suggestion approved:', suggestion);

    // Add approved suggestion to clinical state based on type
    if (suggestion.type === 'diagnosis' || suggestion.type === 'medication') {
      setClinicalState(prev => ({
        ...prev,
        fhir: [
          ...prev.fhir,
          {
            id: suggestion.id,
            type: suggestion.type === 'diagnosis' ? 'condition' : 'medication',
            status: 'active',
            text: suggestion.title,
            display: suggestion.title,
            details: suggestion.description
          }
        ]
      }));
    }

    // Show success message
    const successMessage: ChatMessage = {
      id: (Date.now()).toString(),
      role: 'assistant',
      content: `✅ Sugerencia aplicada: ${suggestion.title}`,
      timestamp: new Date(),
      mode: 'note'
    };
    setMessages(prev => [...prev, successMessage]);
  }, []);

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
    <div className="h-screen flex bg-gray-50 overflow-hidden">
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
        />
      </div>

      {/* Chat Panel - Matches original: direct child, full height, no extra wrapper */}
      <div style={{ width: 400 }} className="h-full">
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
          ipsData={ipsData}
          patientInfo={patientRecord ? `${patientRecord.age} años • ${patientRecord.gender}` : undefined}
        />
      </div>
    </div>
  );
}

export default MedicalNotesCopilotPage;