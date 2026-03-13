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
  Stethoscope,
  Phone,
  Mail,
  X,
  Monitor,
  Printer,
  Download,
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
import { PharmacyPanel } from './PharmacyPanel';
import { MedicalHistoryPanel } from './MedicalHistoryPanel';
import { cn } from '@/lib/utils';
import { handleOutput, type OutputContext, type OutputChannel } from '@/services/outputService';
import type { ContentLine } from '@/services/outputService';

/** Build structured content lines from IPS data for output */
function buildContentForContext(
  context: string,
  ipsData: IPSDisplayData,
  clinicalState: ClinicalState
): ContentLine[] {
  const lines: ContentLine[] = [];
  switch (context) {
    case 'orders':
      lines.push({ type: 'header', value: 'Órdenes Médicas' });
      (ipsData.labOrders || []).forEach(o => {
        lines.push({ type: 'list-item', value: `${o.name || 'Orden'} — ${o.status || 'Pendiente'} (${o.date || ''})` });
        if (o.notes) lines.push({ type: 'text', value: `  Notas: ${o.notes}` });
      });
      if ((ipsData.labResults || []).length > 0) {
        lines.push({ type: 'separator' });
        lines.push({ type: 'header', value: 'Resultados' });
        (ipsData.labResults || []).forEach(r => {
          lines.push({ type: 'field', label: r.name || 'Resultado', value: `${r.value || '—'} ${r.unit || ''} ${r.flag ? `(${r.flag})` : ''}` });
        });
      }
      break;
    case 'referrals':
      lines.push({ type: 'header', value: 'Referencias Médicas' });
      lines.push({ type: 'text', value: 'Información de referencias del paciente.' });
      break;
    case 'pharmacy':
      lines.push({ type: 'header', value: 'Receta Médica' });
      (ipsData.medications || []).forEach((m, i) => {
        lines.push({ type: 'list-item', value: `${i + 1}. ${m.name || 'Medicamento'} — ${m.dose || ''} ${m.frequency || ''}` });
        if (m.notes) lines.push({ type: 'text', value: `   ${m.notes}` });
      });
      break;
    default:
      lines.push({ type: 'header', value: 'Resumen Clínico' });
      if (ipsData.conditions.length > 0) {
        lines.push({ type: 'subheader', value: 'Diagnósticos' });
        ipsData.conditions.forEach(c => lines.push({ type: 'list-item', value: `${c.name} — ${c.status || ''}` }));
      }
      if (ipsData.allergies.length > 0) {
        lines.push({ type: 'subheader', value: 'Alergias' });
        ipsData.allergies.forEach(a => lines.push({ type: 'list-item', value: `${a.name} (${a.severity || ''})` }));
      }
      if (ipsData.medications.length > 0) {
        lines.push({ type: 'subheader', value: 'Medicamentos' });
        ipsData.medications.forEach(m => lines.push({ type: 'list-item', value: `${m.name} — ${m.dose || ''}` }));
      }
      break;
  }
  return lines;
}

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
  /** Reverse-sync: manual order added in OrdersPanel */
  onManualOrder?: (order: { name: string; type: string; priority: string; notes?: string }) => void;
  /** Reverse-sync: manual medication added in PharmacyPanel */
  onManualMedication?: (med: { name: string; dose: string; frequency?: string; duration?: string; route?: string; instructions?: string }) => void;
  /** Reverse-sync: manual referral added in ReferralsPanel */
  onManualReferral?: (ref: { specialty: string; presumptiveDx?: string; justification?: string; clinicalSummary?: string; institution?: string }) => void;
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
    <div className="bg-white border-b border-slate-200 px-6 py-5 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="text-slate-600 hover:text-slate-900">
              ←
            </button>
          )}
          <div>
            <h1 className="text-[60px] font-black text-indigo-600 leading-none tracking-tight -mb-1">Perfil Clínico</h1>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {patient?.name || 'Paciente'}
              {patient?.age && <span className="text-slate-400 font-normal text-lg ml-2">{patient.age} años</span>}
            </p>
            {patient && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500 mt-0.5">
                <span>{patient.gender}</span>
                {patient.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Phone size={13} className="text-slate-400" />{patient.phone}</span>
                  </>
                )}
                {patient.email && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Mail size={13} className="text-slate-400" />{patient.email}</span>
                  </>
                )}
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
  consultations = [],
  onManualOrder,
  onManualMedication,
  onManualReferral,
}: MainContentPanelProps) {

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // ── Screen preview state ──
  const [screenPreviewHTML, setScreenPreviewHTML] = React.useState<string | null>(null);
  const [screenPreviewTitle, setScreenPreviewTitle] = React.useState('');

  // ── Output handler for PDF, Email, WhatsApp, Screen ──
  const handleOutputChannel = React.useCallback((channel: OutputChannel, context: string) => {
    const ctx: OutputContext = {
      documentType: context as OutputContext['documentType'],
      patientName: patientRecord?.name || 'Paciente',
      patientPhone: patientRecord?.phone,
      patientEmail: patientRecord?.email,
      doctorName: 'Dr. Actual',
      clinicName: 'Altia Health',
      title: context === 'orders' ? 'Órdenes Médicas' :
             context === 'referrals' ? 'Referencia Médica' :
             context === 'pharmacy' ? 'Receta Médica' : 'Resumen Clínico',
      content: buildContentForContext(context, ipsData, clinicalState),
    };

    if (channel === 'screen') {
      const html = handleOutput(channel, ctx) as string;
      setScreenPreviewHTML(html);
      setScreenPreviewTitle(ctx.title);
    } else {
      handleOutput(channel, ctx);
    }
  }, [patientRecord, ipsData, clinicalState]);

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
              onNavigateToOrders={() => setActiveTab('ordenes')}
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
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Hero Title */}
                  <h2 className="text-[36px] font-black text-rose-400 leading-none tracking-tight mb-6">Nueva Consulta</h2>

                  <div className="bg-gradient-to-br from-white via-rose-50/30 to-indigo-50/30 rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner border border-white">
                      <Stethoscope size={36} className="text-rose-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Iniciar Consulta Médica</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                      Active el copiloto clínico en el panel izquierdo para comenzar a registrar la nota SOAP en tiempo real.
                      La IA transcribirá y estructurará automáticamente los datos clínicos.
                    </p>

                    {/* Visual hint cards */}
                    <div className="grid grid-cols-4 gap-3 mt-8 max-w-xl mx-auto">
                      <div className="bg-white/80 rounded-xl border border-slate-100 p-3 shadow-sm">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-600 font-black text-sm">S</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500">Subjetivo</p>
                      </div>
                      <div className="bg-white/80 rounded-xl border border-slate-100 p-3 shadow-sm">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-emerald-600 font-black text-sm">O</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500">Objetivo</p>
                      </div>
                      <div className="bg-white/80 rounded-xl border border-slate-100 p-3 shadow-sm">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-amber-600 font-black text-sm">A</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500">Evaluación</p>
                      </div>
                      <div className="bg-white/80 rounded-xl border border-slate-100 p-3 shadow-sm">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <span className="text-indigo-600 font-black text-sm">P</span>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500">Plan</p>
                      </div>
                    </div>
                  </div>
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
              onOutput={handleOutputChannel}
              onManualOrder={onManualOrder}
            />
          )}

          {/* TAB 5: REFERENCIAS */}
          {activeTab === 'referencias' && (
            <ReferralsPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
              onGeneratePDF={onGeneratePDF}
              onOutput={handleOutputChannel}
              onManualReferral={onManualReferral}
            />
          )}

          {/* TAB 6: FARMACIA */}
          {activeTab === 'farmacia' && (
            <PharmacyPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
              onGeneratePDF={onGeneratePDF}
              onOutput={handleOutputChannel}
              onManualMedication={onManualMedication}
            />
          )}

          {/* TAB 7: ANTECEDENTES (HISTORIA CLÍNICA) */}
          {activeTab === 'antecedentes' && (
            <MedicalHistoryPanel
              ipsData={ipsData}
              patientRecord={patientRecord}
            />
          )}
        </div>
      </div>

      {/* ═══ SCREEN PREVIEW MODAL ═══ */}
      {screenPreviewHTML && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-[92vw] max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Monitor className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Vista Previa en Pantalla</h3>
                  <p className="text-[11px] text-slate-500">{screenPreviewTitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Print the preview
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                      printWin.document.write(`<html><head><title>${screenPreviewTitle}</title></head><body>${screenPreviewHTML}</body></html>`);
                      printWin.document.close();
                      printWin.focus();
                      setTimeout(() => printWin.print(), 400);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </button>
                <button
                  onClick={() => setScreenPreviewHTML(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Preview content — rendered HTML */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div
                className="mx-auto"
                dangerouslySetInnerHTML={{ __html: screenPreviewHTML }}
              />
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-3 bg-slate-50 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => setScreenPreviewHTML(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}