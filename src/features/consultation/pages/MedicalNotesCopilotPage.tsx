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

interface MedicalNotesCopilotPageProps {}

// Mock hooks and services for now - will be implemented later
function useMedicalConsultationLayout() {
  return {
    isDesktop: window.innerWidth >= 1024,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
  };
}

function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = useCallback(() => {
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    toggleListening,
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

  // Voice recognition
  const { isListening, transcript, toggleListening } = useVoiceRecognition();


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

      // Transform FHIR data to IPS format
      const transformedIpsData: IPSDisplayData = {
        encounters: patientEncounters?.map(encounter => ({
          id: encounter.id,
          date: encounter.periodStart ? new Date(encounter.periodStart).toLocaleDateString() : 'Fecha no disponible',
          type: encounter.class?.display || encounter.type || 'Consulta',
          doctor: encounter.practitionerName || encounter.practitioner || 'Dr. No especificado',
          summary: encounter.reasonCode || encounter.reasonText || 'Sin descripción disponible',
          patientNote: encounter.note
        })) || [],

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
    // Add finalization logic here
  };

  // Handle sending messages and activating consultation
  const handleSendMessage = () => {
    // Start consultation on first message if not already started
    if (!inConsultation && inputText.trim()) {
      console.log('🚀 Starting consultation...');
      setInConsultation(true);
      setConsultationStartTime(Date.now());
    }

    // Send the message using the hook
    console.log('📨 Sending message:', inputText);
    sendMessage();
  };

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
          <div className="fixed inset-0 bg-white z-50">
            <div className="h-full flex flex-col">
              {/* Clinical Safeguards Panel for Mobile */}
              <SafeguardsPanel
                alerts={clinicalGuard.activeAlerts || []}
              />

              <div className="flex-1">
                <ChatPanelCopilot
                width={400}
                onResize={() => {}}
                isRight={true}
                togglePosition={() => {}}
                messages={messages}
                inputText={inputText}
                setInputText={setInputText}
                onSendMessage={handleSendMessage}
                isRecording={isListening}
                toggleRecording={toggleListening}
                onPlayAudio={() => {}}
                isPlayingAudio={false}
                isProcessing={aiProcessing}
                inConsultation={inConsultation}
                onFinalize={finalizeConsultation}
                elapsedTime={elapsedTime}
                onApproveSuggestion={handleApproveSuggestion}
                ipsData={ipsData}
                clinicalState={clinicalState}
                patientRecord={patientRecord}
              />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <MainContentPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
          setTabs={() => {}}
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

      {/* Chat Panel */}
      <div className="w-96 flex-shrink-0 flex flex-col">
        {/* Clinical Safeguards Panel for Desktop */}
        <SafeguardsPanel
          alerts={clinicalGuard.activeAlerts || []}
        />

        <div className="flex-1">
          <ChatPanelCopilot
          width={400}
          onResize={() => {}}
          isRight={true}
          togglePosition={() => {}}
          messages={messages}
          inputText={inputText}
          setInputText={setInputText}
          onSendMessage={handleSendMessage}
          isRecording={isListening}
          toggleRecording={toggleListening}
          onPlayAudio={() => {}}
          isPlayingAudio={false}
          isProcessing={aiProcessing}
          inConsultation={inConsultation}
          onFinalize={finalizeConsultation}
          elapsedTime={elapsedTime}
          onApproveSuggestion={handleApproveSuggestion}
          ipsData={ipsData}
          clinicalState={clinicalState}
          patientRecord={patientRecord}
        />
        </div>
      </div>
    </div>
  );
}

export default MedicalNotesCopilotPage;