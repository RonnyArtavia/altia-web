/**
 * MainContentPanel - Medical Dashboard with Real-time Note Progress
 * Matches MainContentCopilot functionality with "Nota en Progreso (Tiempo Real)" card
 */

import React from 'react';
import {
  Loader2,
  Sparkles,
  Activity,
  User,
  TestTube,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Stethoscope
} from 'lucide-react';
import type {
  IPSDisplayData,
  ConsultationEntry,
  ClinicalState,
  TabItem,
  SOAPData,
  FHIRPlanItem,
  PatientRecordDisplay,
  VitalSignsData
} from '../types/medical-notes';
import { ClinicalSnapshot } from './ClinicalSnapshot';
import { IPSDashboardCompact } from './IPSDashboardCompact';
import { ClinicalSummaryReport } from './ClinicalSummaryReport';
import { ClinicalSummaryIPS } from './ClinicalSummaryIPS';
import { PreviousConsultationsPanel } from './PreviousConsultationsPanel';
import { OrdersPanel } from './OrdersPanel';
import { ReferralsPanel } from './ReferralsPanel';
import { MedicalHistoryPanel } from './MedicalHistoryPanel';
import { cn } from '@/lib/utils';

interface MainContentPanelProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: TabItem[];
  setTabs: (tabs: TabItem[]) => void;
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  clinicalState: ClinicalState;
  onFinalize?: () => void;
  isLoading?: boolean;
  inConsultation?: boolean;
  onStopConsultation?: () => void;
  isProcessing?: boolean;
  vitalSigns?: VitalSignsData | null;
  onUpdateSoap?: (section: keyof SOAPData, value: string) => void;
  onUpdateFHIR?: (id: string, updates: Partial<FHIRPlanItem>) => void;
  onRemoveFHIR?: (id: string) => void;
  onUpdateEducation?: (text: string) => void;
  onGeneratePDF?: (type: 'prescription' | 'labOrder' | 'referral') => void;
  elapsedTime?: number;
  onAnalyzeRisks?: () => void;
  isAnalyzingRisks?: boolean;
  onEncounterClick?: (id: string) => void;
  onBack?: () => void;
  fontSize?: 'small' | 'medium' | 'large';
  fontSizePercent?: number;
  onFontSizeChange?: ((size: 'small' | 'medium' | 'large') => void) | undefined;
  onFontSizePercentChange?: ((percent: number) => void) | undefined;
  preferFastModel?: boolean;
  onToggleModelSpeed?: () => void;
  consultations?: ConsultationEntry[];
}

// Patient Context Summary Component
function PatientContextSummary({
  ipsData,
  lastConsultation,
  patient
}: {
  ipsData: IPSDisplayData;
  lastConsultation?: ConsultationEntry;
  patient?: PatientRecordDisplay;
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const generateClinicalSummary = (): string => {
    const parts: string[] = [];

    // Active conditions
    if (ipsData.conditions.length > 0) {
      const conditions = ipsData.conditions.slice(0, 5).map(c => c.name).join(', ');
      parts.push(`Dx: ${conditions}${ipsData.conditions.length > 5 ? ` (+${ipsData.conditions.length - 5})` : ''}.`);
    }

    // Known allergies
    if (ipsData.allergies.length > 0) {
      const allergies = ipsData.allergies.slice(0, 4).map(a => a.name).join(', ');
      parts.push(`Alergias: ${allergies}.`);
    } else {
      parts.push('Sin alergias conocidas.');
    }

    // Current medications
    if (ipsData.medications.length > 0) {
      const meds = ipsData.medications.slice(0, 5).map(m => (m.name || '').split(' ')[0]).join(', ');
      parts.push(`Tx activo: ${meds}${ipsData.medications.length > 5 ? ` (+${ipsData.medications.length - 5})` : ''}.`);
    }

    // Recent abnormal labs
    const abnormalLabs = ipsData.labResults?.filter(l =>
      l.flag === 'high' || l.flag === 'low' || l.flag === 'critical' || l.flag === 'abnormal'
    ) || [];
    if (abnormalLabs.length > 0) {
      const labs = abnormalLabs.slice(0, 3).map(l => `${l.name} ${l.flag === 'high' ? '↑' : l.flag === 'low' ? '↓' : '⚠'}`).join(', ');
      parts.push(`Labs alterados: ${labs}.`);
    }

    // Last consultation
    if (lastConsultation) {
      let timeAgo = '';

      if (lastConsultation.date) {
        const consultDate = new Date(lastConsultation.date);
        if (!isNaN(consultDate.getTime())) {
          const now = new Date();
          const diffMs = now.getTime() - consultDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            timeAgo = 'hoy';
          } else if (diffDays === 1) {
            timeAgo = 'ayer';
          } else if (diffDays < 7) {
            timeAgo = `hace ${diffDays} días`;
          } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            timeAgo = `hace ${weeks} semana${weeks > 1 ? 's' : ''}`;
          } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            timeAgo = `hace ${months} mes${months > 1 ? 'es' : ''}`;
          } else {
            const years = Math.floor(diffDays / 365);
            timeAgo = `hace ${years} año${years > 1 ? 's' : ''}`;
          }
        }
      }

      const content = (lastConsultation as any).diagnosis || (lastConsultation as any).subjective || lastConsultation.summary || '';
      const shortContent = content.slice(0, 120);

      if (shortContent && timeAgo) {
        parts.push(`Última consulta (${timeAgo}): ${shortContent}${content.length > 120 ? '...' : ''}`);
      } else if (shortContent) {
        parts.push(`Última consulta: ${shortContent}${content.length > 120 ? '...' : ''}`);
      } else if (timeAgo) {
        parts.push(`Última consulta: ${timeAgo}.`);
      }
    }

    let fullSummary = parts.join(' ');
    if (fullSummary.length > 500) {
      fullSummary = fullSummary.slice(0, 497) + '...';
    }

    return fullSummary || 'No hay información clínica disponible en el expediente.';
  };

  const clinicalSummary = generateClinicalSummary();

  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl border border-slate-200 p-4 shadow-sm h-full transition-all duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-1 p-1.5 bg-indigo-100 rounded-md shrink-0">
          <User size={16} className="text-indigo-600" />
        </div>
        <div className="text-sm text-slate-700 leading-relaxed flex-1">
          <div
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <p className="font-bold text-slate-900 mb-1.5 flex items-center gap-2">
              Resumen Clínico
              <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">IPS</span>
            </p>
            <button
              className="text-slate-400 group-hover:text-slate-600 transition-colors p-0.5 rounded-full group-hover:bg-slate-200/50"
              aria-label={isCollapsed ? "Expandir resumen" : "Colapsar resumen"}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>

          {!isCollapsed && (
            <p className="text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
              {clinicalSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Attention Section Component
function AttentionSection({
  ipsData,
  vitalSigns
}: {
  ipsData: IPSDisplayData;
  vitalSigns?: VitalSignsData | null;
}) {
  const allergiesCount = ipsData.allergies.length;
  const missingVitals = !vitalSigns || !vitalSigns.bloodPressure;
  const criticalLabs = ipsData.labResults?.filter(l => l.flag === 'high' || l.flag === 'critical' || l.flag === 'abnormal').length || 0;

  if (allergiesCount === 0 && !missingVitals && criticalLabs === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {allergiesCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-rose-50 to-white text-rose-800 border border-rose-100 rounded-lg shadow-sm">
          <div className="p-1 bg-white rounded-full shadow-sm">
            <AlertTriangle size={14} className="text-rose-500" />
          </div>
          <span className="text-sm font-semibold">{allergiesCount} Alergias Conocidas</span>
        </div>
      )}
      {criticalLabs > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-amber-50 to-white text-amber-800 border border-amber-100 rounded-lg shadow-sm">
          <div className="p-1 bg-white rounded-full shadow-sm">
            <TestTube size={14} className="text-amber-500" />
          </div>
          <span className="text-sm font-semibold">{criticalLabs} Resultados Anormales</span>
        </div>
      )}
      {missingVitals && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-slate-50 to-white text-slate-700 border border-slate-200 rounded-lg shadow-sm">
          <div className="p-1 bg-white rounded-full shadow-sm">
            <Activity size={14} className="text-slate-500" />
          </div>
          <span className="text-sm font-medium">Pendiente Signos Vitales</span>
        </div>
      )}
    </div>
  );
}

// Patient Header Component (simplified version)
function PatientHeader({
  patient,
  inConsultation,
  elapsedTime,
  onFinalize,
  isProcessing,
  onBack
}: {
  patient?: PatientRecordDisplay;
  inConsultation?: boolean;
  elapsedTime?: number;
  onFinalize?: () => void;
  isProcessing?: boolean;
  onBack?: () => void;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="text-slate-600 hover:text-slate-900">
              ←
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {patient?.name || 'Paciente'}
            </h1>
            {patient && (
              <div className="text-sm text-slate-500">
                {patient.age} años • {patient.gender}
              </div>
            )}
          </div>
        </div>

        {inConsultation && onFinalize && (
          <button
            onClick={onFinalize}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Finalizar Consulta
          </button>
        )}
      </div>
    </div>
  );
}

// Main Component
export function MainContentPanel({
  activeTab,
  setActiveTab,
  tabs,
  ipsData,
  patientRecord,
  clinicalState,
  onFinalize,
  isLoading = false,
  inConsultation = false,
  isProcessing = false,
  vitalSigns = null,
  onUpdateSoap,
  onUpdateFHIR,
  onRemoveFHIR,
  onUpdateEducation,
  onGeneratePDF,
  elapsedTime = 0,
  onEncounterClick,
  onBack,
  fontSizePercent = 100,
  consultations = []
}: MainContentPanelProps) {

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to top when consultation starts
  React.useEffect(() => {
    if (inConsultation && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [inConsultation]);

  if (isLoading) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-background/50 h-full">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-500 mb-4" />
        <p className="text-sm text-indigo-900/60 font-medium animate-pulse">Cargando expediente...</p>
      </main>
    );
  }

  const getTabTitle = () => {
    switch (activeTab) {
      case 'resumen': return 'Tablero Clínico';
      case 'antecedentes': return 'Antecedentes';
      case 'mediciones': return 'Signos Vitales';
      case 'consultas': return 'Historial';
      case 'historia': return 'Línea de Vida';
      default: return 'Expediente';
    }
  };

  return (
    <main
      className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden font-sans h-full relative"
      style={{ zoom: fontSizePercent / 100 }}
    >
      {/* Patient Header */}
      <PatientHeader
        patient={patientRecord}
        inConsultation={inConsultation}
        elapsedTime={elapsedTime}
        onFinalize={onFinalize}
        isProcessing={isProcessing}
        onBack={onBack}
      />

      {/* Tab Navigation */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 sticky top-[73px] z-20 shadow-sm/50">
        <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "py-3 text-sm font-semibold border-b-[2.5px] transition-all whitespace-nowrap px-1",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar"
      >
        <div className="w-full mx-auto pb-20">

          {/* TAB 1: RESUMEN CLÍNICO IPS */}
          {activeTab === 'resumen-ips' && (
            <ClinicalSummaryIPS
              ipsData={ipsData}
              vitalSigns={vitalSigns}
              patientRecord={patientRecord}
            />
          )}

          {/* TAB 2: NUEVA CONSULTA (SOAP + Plan FHIR en tiempo real) */}
          {activeTab === 'nueva-consulta' && (
            <>
              {inConsultation ? (
                <ClinicalSnapshot
                  data={clinicalState}
                  onUpdateSoap={onUpdateSoap}
                  onUpdateFHIR={onUpdateFHIR}
                  onRemoveFHIR={onRemoveFHIR}
                  onUpdateEducation={onUpdateEducation}
                  onGeneratePDF={onGeneratePDF}
                />
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                    <Stethoscope size={32} className="text-indigo-400" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-700 mb-2">Nueva Consulta</h2>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Inicie la consulta desde el panel del copiloto para comenzar a registrar la nota clínica SOAP en tiempo real.
                  </p>
                </div>
              )}
            </>
          )}

          {/* TAB 3: CONSULTAS ANTERIORES */}
          {activeTab === 'consultas-anteriores' && (
            <PreviousConsultationsPanel
              encounters={ipsData.encounters || []}
            />
          )}

          {/* TAB 4: ÓRDENES */}
          {activeTab === 'ordenes' && (
            <OrdersPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
              onGeneratePDF={onGeneratePDF}
            />
          )}

          {/* TAB 5: REFERENCIAS */}
          {activeTab === 'referencias' && (
            <ReferralsPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
              onGeneratePDF={onGeneratePDF}
            />
          )}

          {/* TAB 6: ANTECEDENTES (HISTORIA CLÍNICA) */}
          {activeTab === 'antecedentes' && (
            <MedicalHistoryPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
            />
          )}
        </div>
      </div>
    </main>
  );
}