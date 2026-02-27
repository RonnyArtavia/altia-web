/**
 * ClinicalSummaryReport - Professional Clinical Folio
 * Clean white-card layout with colored section accents,
 * strong typographic hierarchy, and clear data presentation.
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Stethoscope,
  Pill,
  HeartPulse,
  FlaskConical,
  Syringe,
  ClipboardList,
  Clock,
  X,
  ArrowRight,
  NotebookPen,
  FileBarChart,
  BookOpen,
  CircleDot,
} from 'lucide-react';
import type { IPSDisplayData, VitalSignsData, PatientRecordDisplay, ConsultationEntry } from '../types/medical-notes';

interface ClinicalSummaryReportProps {
  patientRecord?: PatientRecordDisplay;
  ipsData: IPSDisplayData;
  vitalSigns?: VitalSignsData | null;
}

/* ─── Fonts ────────────────────────────────────────────────────── */

const serifFont = "'Source Serif 4', Georgia, 'Times New Roman', serif";
const sansFont = "'DM Sans', system-ui, -apple-system, sans-serif";

/* ─── Section Accent Colors ────────────────────────────────────── */

const sectionAccents = {
  allergy: { border: 'border-l-red-400', icon: 'text-red-500', bg: 'bg-red-50/40' },
  diagnosis: { border: 'border-l-blue-400', icon: 'text-blue-500', bg: 'bg-blue-50/30' },
  medication: { border: 'border-l-amber-400', icon: 'text-amber-500', bg: 'bg-amber-50/30' },
  vitals: { border: 'border-l-emerald-400', icon: 'text-emerald-500', bg: 'bg-emerald-50/30' },
  lab: { border: 'border-l-violet-400', icon: 'text-violet-500', bg: 'bg-violet-50/30' },
  vaccine: { border: 'border-l-teal-400', icon: 'text-teal-500', bg: 'bg-teal-50/30' },
  orders: { border: 'border-l-orange-400', icon: 'text-orange-500', bg: 'bg-orange-50/30' },
  history: { border: 'border-l-indigo-400', icon: 'text-indigo-500', bg: 'bg-indigo-50/30' },
} as const;

/* ─── Section Card Wrapper ─────────────────────────────────────── */

function SectionCard({
  accent,
  children
}: {
  accent: keyof typeof sectionAccents;
  children: React.ReactNode;
}) {
  const a = sectionAccents[accent];
  return (
    <section className={`
      bg-white rounded-lg border border-gray-200/80 ${a.border} border-l-[3px]
      shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 md:p-6
    `}>
      {children}
    </section>
  );
}

/* ─── Section Header ───────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  count,
  accent
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  accent: keyof typeof sectionAccents;
}) {
  const a = sectionAccents[accent];
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className={`p-1.5 rounded-md ${a.bg}`}>
        <Icon size={16} className={a.icon} strokeWidth={2} />
      </div>
      <h2
        className="text-[17px] font-bold text-gray-900 tracking-[-0.01em] leading-tight"
        style={{ fontFamily: serifFont }}
      >
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded tabular-nums">
          {count}
        </span>
      )}
    </div>
  );
}

/* ─── Status & Severity Badges ─────────────────────────────────── */

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const isHigh = s.includes('alta') || s.includes('sever');
  const isMod = s.includes('moder');

  const colors = isHigh
    ? 'bg-red-50 text-red-700 ring-red-200'
    : isMod
      ? 'bg-amber-50 text-amber-700 ring-amber-200'
      : 'bg-gray-50 text-gray-600 ring-gray-200';

  return (
    <span className={`
      inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-wide uppercase
      px-2 py-0.5 rounded-full ring-1 ring-inset ${colors}
    `}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const isActive = s.includes('activ') || s.includes('confirmad');
  const isResolved = s.includes('resuel');

  const colors = isActive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : isResolved
      ? 'bg-gray-50 text-gray-500 ring-gray-200'
      : 'bg-gray-50 text-gray-500 ring-gray-200';

  return (
    <span className={`
      inline-flex items-center gap-1 text-[10.5px] font-semibold
      px-2 py-0.5 rounded-full ring-1 ring-inset ${colors}
    `}>
      {status}
    </span>
  );
}

/* ─── Small Helpers ────────────────────────────────────────────── */

function EmptyNote({ text }: { text: string }) {
  return (
    <p className="text-[13.5px] text-gray-400 italic leading-relaxed">
      {text}
    </p>
  );
}

function MetaDate({ date, className = '' }: { date?: string; className?: string }) {
  if (!date) return null;
  return (
    <span className={`text-[11.5px] text-gray-400 tabular-nums ${className}`}>
      {date}
    </span>
  );
}

/* ─── Vital Sign Mini-Card ─────────────────────────────────────── */

function VitalCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-gray-50/80 rounded-lg px-4 py-3 border border-gray-100">
      <div className="text-[10.5px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="text-[18px] font-bold text-gray-900 tabular-nums leading-none">
        {value}
        {unit && <span className="text-[12px] text-gray-400 font-medium ml-1">{unit}</span>}
      </div>
    </div>
  );
}

/* ─── Consultation Detail Modal ────────────────────────────────── */

function ConsultationModal({
  consultation,
  isOpen,
  onClose
}: {
  consultation: ConsultationEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !consultation) return null;

  const soapEntries = [
    {
      letter: 'S', label: 'Subjetivo',
      content: consultation.patientNote || 'Paciente refiere los síntomas descritos en el resumen de la consulta.',
      borderColor: 'border-l-blue-400', labelColor: 'text-blue-600', bgTint: 'bg-blue-50/40',
      letterBg: 'bg-blue-500'
    },
    {
      letter: 'O', label: 'Objetivo',
      content: 'Examen físico realizado según protocolo médico estándar.',
      borderColor: 'border-l-emerald-400', labelColor: 'text-emerald-600', bgTint: 'bg-emerald-50/40',
      letterBg: 'bg-emerald-500'
    },
    {
      letter: 'A', label: 'Evaluación',
      content: consultation.summary || 'Evaluación médica completada.',
      borderColor: 'border-l-amber-400', labelColor: 'text-amber-600', bgTint: 'bg-amber-50/40',
      letterBg: 'bg-amber-500'
    },
    {
      letter: 'P', label: 'Plan',
      content: 'Plan de tratamiento establecido según guías clínicas apropiadas.',
      borderColor: 'border-l-violet-400', labelColor: 'text-violet-600', bgTint: 'bg-violet-50/40',
      letterBg: 'bg-violet-500'
    }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-[3px] flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-[720px] w-full max-h-[85vh] overflow-auto shadow-2xl border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: sansFont }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between z-10">
          <div>
            <h2
              className="text-[19px] font-bold text-gray-900 tracking-tight"
              style={{ fontFamily: serifFont }}
            >
              Detalle de Consulta
            </h2>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-gray-500">
              <span className="font-semibold text-gray-800">{consultation.type}</span>
              <span className="text-gray-300">·</span>
              <span>{consultation.date}</span>
              <span className="text-gray-300">·</span>
              <span>{consultation.doctor}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">

          {/* ── Nota Clínica SOAP ── */}
          <div className="bg-white rounded-lg border border-gray-200/80 border-l-[3px] border-l-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <NotebookPen size={15} className="text-slate-400" strokeWidth={1.8} />
              <h3
                className="text-[15.5px] font-semibold text-slate-700 tracking-[-0.01em]"
                style={{ fontFamily: serifFont }}
              >
                Nota Clínica SOAP
              </h3>
            </div>
            <div className="space-y-2.5">
              {soapEntries.map(({ letter, label, content, borderColor, labelColor, bgTint, letterBg }) => (
                <div
                  key={letter}
                  className={`rounded-lg ${bgTint} border border-gray-100/80 ${borderColor} border-l-[3px] px-4 py-3`}
                >
                  <div className="flex gap-3 items-start">
                    <span className={`
                      shrink-0 w-7 h-7 rounded-md text-[12px] font-bold
                      flex items-center justify-center text-white shadow-sm ${letterBg}
                    `}>
                      {letter}
                    </span>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${labelColor}`}>
                        {label}
                      </div>
                      <p className="text-[14px] text-gray-800 leading-relaxed">
                        {content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Resumen de la Consulta ── */}
          <div className="bg-white rounded-lg border border-gray-200/80 border-l-[3px] border-l-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileBarChart size={15} className="text-slate-400" strokeWidth={1.8} />
              <h3
                className="text-[15.5px] font-semibold text-slate-700 tracking-[-0.01em]"
                style={{ fontFamily: serifFont }}
              >
                Resumen de la Consulta
              </h3>
            </div>
            <div className="bg-gray-50/60 rounded-lg border border-gray-100/80 px-4 py-3.5">
              <p className="text-[14px] text-gray-700 leading-[1.7]">
                {consultation.summary}
              </p>
            </div>
          </div>

          {/* ── Educación y Recomendaciones ── */}
          <div className="bg-white rounded-lg border border-gray-200/80 border-l-[3px] border-l-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={15} className="text-slate-400" strokeWidth={1.8} />
              <h3
                className="text-[15.5px] font-semibold text-slate-700 tracking-[-0.01em]"
                style={{ fontFamily: serifFont }}
              >
                Educación y Recomendaciones
              </h3>
            </div>
            <ul className="space-y-2.5">
              {[
                'Seguir las indicaciones médicas establecidas durante la consulta',
                'Mantener hábitos de vida saludables',
                'Acudir a consulta de seguimiento según programación',
                'Contactar al médico tratante ante cualquier inquietud o complicación'
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CircleDot size={14} className="text-slate-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <span className="text-[14px] text-gray-700 leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */

export function ClinicalSummaryReport({ patientRecord, ipsData, vitalSigns }: ClinicalSummaryReportProps) {
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAllConsultations, setShowAllConsultations] = useState(false);

  const validConditions = ipsData.conditions?.filter(dx =>
    dx.name &&
    dx.name !== 'Condición no especificada' &&
    dx.name.trim() !== '' &&
    !dx.name.toLowerCase().includes('no especificad')
  ) || [];

  const openConsultationModal = (c: ConsultationEntry) => {
    setSelectedConsultation(c);
    setShowModal(true);
  };

  const closeConsultationModal = () => {
    setShowModal(false);
    setSelectedConsultation(null);
  };

  return (
    <article className="w-full min-h-screen bg-[#f4f5f7]">
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div
        className="max-w-3xl mx-auto px-4 md:px-6 py-5 pb-24 space-y-4"
        style={{ fontFamily: sansFont }}
      >

        {/* ── Alergias y Reacciones Adversas ── */}
        <SectionCard accent="allergy">
          <SectionHeader icon={AlertCircle} title="Alergias y Reacciones Adversas" count={ipsData.allergies?.length} accent="allergy" />
          {ipsData.allergies && ipsData.allergies.length > 0 ? (
            <div className="space-y-3">
              {ipsData.allergies.map((allergy, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100/80 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[14.5px] font-bold text-gray-900">{allergy.name}</span>
                      {allergy.severity && <SeverityBadge severity={allergy.severity} />}
                    </div>
                    {allergy.notes && (
                      <p className="mt-1.5 text-[13px] text-gray-500 italic leading-relaxed">{allergy.notes}</p>
                    )}
                  </div>
                  {allergy.date && <MetaDate date={allergy.date} className="shrink-0 pt-1" />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote text="No hay alergias conocidas documentadas en el expediente." />
          )}
        </SectionCard>

        {/* ── Diagnósticos Activos ── */}
        <SectionCard accent="diagnosis">
          <SectionHeader icon={Stethoscope} title="Diagnósticos Activos" count={validConditions.length} accent="diagnosis" />
          {validConditions.length > 0 ? (
            <div className="space-y-3">
              {validConditions.map((dx, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100/80 last:border-0 last:pb-0">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[14.5px] font-bold text-gray-900">{dx.name}</span>
                      <StatusBadge status={dx.status || 'No especificado'} />
                    </div>
                    {dx.notes && (
                      <p className="mt-1.5 text-[13px] text-gray-500 italic leading-relaxed">{dx.notes}</p>
                    )}
                  </div>
                  {dx.date && <MetaDate date={dx.date} className="shrink-0 pt-1" />}
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote text="No hay diagnósticos activos registrados en el expediente." />
          )}
        </SectionCard>

        {/* ── Medicamentos Activos ── */}
        <SectionCard accent="medication">
          <SectionHeader icon={Pill} title="Medicamentos Activos" count={ipsData.medications?.length} accent="medication" />
          {ipsData.medications && ipsData.medications.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b-2 border-gray-200/80">
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Medicamento
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Posología
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Inicio
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ipsData.medications.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100/80 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-2">
                        <span className="font-semibold text-gray-900">{m.name}</span>
                        {(m as any).warning && (
                          <div className="mt-1 text-[11px] text-amber-600 font-semibold bg-amber-50 inline-block px-1.5 py-0.5 rounded">
                            {(m as any).warning}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-600 font-medium">
                        {m.dose || m.frequency || '—'}
                      </td>
                      <td className="py-3 px-2 text-gray-400 text-[12.5px] hidden sm:table-cell tabular-nums">
                        {m.date || '—'}
                      </td>
                      <td className="py-3 px-2">
                        <StatusBadge status={m.status || 'Activo'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote text="No hay medicamentos activos registrados." />
          )}
        </SectionCard>

        {/* ── Signos Vitales ── */}
        <SectionCard accent="vitals">
          <SectionHeader icon={HeartPulse} title="Signos Vitales" accent="vitals" />
          {vitalSigns ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {vitalSigns.bloodPressure && (
                  <VitalCard label="Presión Arterial" value={vitalSigns.bloodPressure} />
                )}
                {vitalSigns.heartRate && (
                  <VitalCard label="Frecuencia Cardíaca" value={vitalSigns.heartRate} unit="bpm" />
                )}
                {vitalSigns.temperature && (
                  <VitalCard label="Temperatura" value={vitalSigns.temperature} unit="°C" />
                )}
                {vitalSigns.oxygenSaturation && (
                  <VitalCard label="Saturación O₂" value={vitalSigns.oxygenSaturation} unit="%" />
                )}
                {vitalSigns.weight && (
                  <VitalCard label="Peso" value={vitalSigns.weight} unit="kg" />
                )}
                {vitalSigns.height && (
                  <VitalCard label="Talla" value={vitalSigns.height} unit="cm" />
                )}
                {vitalSigns.respiratoryRate && (
                  <VitalCard label="Frec. Respiratoria" value={vitalSigns.respiratoryRate} unit="rpm" />
                )}
                {vitalSigns.bmi && (
                  <VitalCard label="IMC" value={vitalSigns.bmi} />
                )}
              </div>
              {vitalSigns.measurementDate && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <MetaDate date={`Registrados: ${vitalSigns.measurementDate}`} />
                </div>
              )}
            </>
          ) : (
            <EmptyNote text="Los signos vitales no han sido registrados para esta consulta." />
          )}
        </SectionCard>

        {/* ── Resultados de Laboratorio ── */}
        <SectionCard accent="lab">
          <SectionHeader icon={FlaskConical} title="Resultados de Laboratorio" count={ipsData.labResults?.length} accent="lab" />
          {ipsData.labResults && ipsData.labResults.length > 0 ? (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="border-b-2 border-gray-200/80">
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Prueba
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Referencia
                    </th>
                    <th className="text-left py-2.5 px-2 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ipsData.labResults.map((r, i) => {
                    const isAbnormal = r.flag && r.flag !== 'Normal';
                    return (
                      <tr
                        key={i}
                        className={`
                          border-b border-gray-100/80 last:border-0
                          ${isAbnormal ? 'bg-amber-50/40' : 'hover:bg-gray-50/50'}
                          transition-colors
                        `}
                      >
                        <td className="py-3 px-2 font-semibold text-gray-800">
                          {r.name}
                        </td>
                        <td className={`py-3 px-2 font-bold tabular-nums ${isAbnormal ? 'text-amber-700' : 'text-gray-900'}`}>
                          {r.value}
                          {r.unit && <span className="text-gray-400 font-normal text-[11.5px] ml-1">{r.unit}</span>}
                        </td>
                        <td className="py-3 px-2 text-gray-400 text-[12.5px] hidden sm:table-cell">
                          {r.referenceRange || '—'}
                        </td>
                        <td className="py-3 px-2">
                          {isAbnormal ? (
                            <span className="inline-flex items-center text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-amber-200">
                              {r.flag}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-gray-400 font-medium">Normal</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyNote text="No hay resultados de laboratorio disponibles." />
          )}
        </SectionCard>

        {/* ── Historial de Vacunación ── */}
        <SectionCard accent="vaccine">
          <SectionHeader icon={Syringe} title="Historial de Vacunación" count={ipsData.vaccines?.length} accent="vaccine" />
          {ipsData.vaccines && ipsData.vaccines.length > 0 ? (
            <div className="space-y-0">
              {ipsData.vaccines.map((v, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-100/80 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-gray-800">{v.name}</span>
                    {v.doseNumber && (
                      <span className="text-[10.5px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                        Dosis {v.doseNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {v.site && (
                      <span className="text-[12px] text-gray-400 hidden sm:inline">{v.site}</span>
                    )}
                    <MetaDate date={v.date} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyNote text="No hay registro de inmunizaciones en el expediente." />
          )}
        </SectionCard>

        {/* ── Órdenes Médicas Pendientes ── */}
        {ipsData.labOrders && ipsData.labOrders.length > 0 && (
          <SectionCard accent="orders">
            <SectionHeader icon={ClipboardList} title="Órdenes Médicas Pendientes" count={ipsData.labOrders.length} accent="orders" />
            <div className="space-y-0">
              {ipsData.labOrders.map((o, i) => (
                <div key={i} className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-100/80 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] font-semibold text-gray-800">{o.name}</span>
                    {o.status && <StatusBadge status={o.status} />}
                  </div>
                  <MetaDate date={o.date} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Historial de Consultas ── */}
        {ipsData.encounters && ipsData.encounters.length > 0 && (
          <SectionCard accent="history">
            <SectionHeader icon={Clock} title="Historial de Consultas" count={ipsData.encounters.length} accent="history" />

            <div className="space-y-0">
              {(showAllConsultations ? ipsData.encounters : ipsData.encounters.slice(0, 6)).map((encounter, i) => (
                <div
                  key={i}
                  className="group py-3.5 border-b border-gray-100/80 last:border-0 cursor-pointer hover:bg-indigo-50/30 -mx-2 px-2 rounded-md transition-colors duration-150"
                  onClick={() => openConsultationModal(encounter)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-gray-900">
                          {encounter.type || 'Consulta Médica'}
                        </span>
                      </div>
                      {encounter.doctor && (
                        <div className="text-[12.5px] text-gray-500 mt-0.5 font-medium">
                          {encounter.doctor}
                        </div>
                      )}
                      {encounter.summary && (
                        <p className="mt-1.5 text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                          {encounter.summary}
                        </p>
                      )}
                      {encounter.patientNote && (
                        <p className="mt-1 text-[12px] text-indigo-500/80 italic leading-relaxed font-medium">
                          Nota del paciente: {encounter.patientNote.length > 80
                            ? `${encounter.patientNote.substring(0, 80)}...`
                            : encounter.patientNote
                          }
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2 pt-0.5">
                      <MetaDate date={encounter.date} />
                      <ArrowRight
                        size={14}
                        className="text-gray-300 group-hover:text-indigo-400 transition-colors"
                        strokeWidth={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {ipsData.encounters.length > 6 && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <button
                  onClick={() => setShowAllConsultations(!showAllConsultations)}
                  className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors duration-150"
                >
                  {showAllConsultations
                    ? 'Mostrar menos'
                    : `Ver todas las consultas (${ipsData.encounters.length})`
                  }
                </button>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {/* Consultation Detail Modal */}
      <ConsultationModal
        consultation={selectedConsultation}
        isOpen={showModal}
        onClose={closeConsultationModal}
      />
    </article>
  );
}
