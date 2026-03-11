/**
 * ReferralsPanel - Tab 5: Referencias Médicas
 * Crear y consultar referencias con formato estándar de hoja de referencia
 */

import React, { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  X,
  Send,
  FileText,
  Stethoscope,
  Building2,
  ClipboardList,
  Printer,
  ChevronDown,
  ChevronRight,
  Inbox,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, PatientRecordDisplay } from '../types/medical-notes';
import { OutputFooter, type OutputChannel } from './OutputFooter';

interface ReferralsPanelProps {
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  onGeneratePDF?: (type: 'referral') => void;
  onOutput?: (channel: OutputChannel, context: string) => void;
}

interface Referral {
  id: string;
  date: string;
  specialty: string;
  institution?: string;
  presumptiveDx: string;
  justification: string;
  clinicalSummary: string;
  status: 'pending' | 'sent' | 'completed';
}

// ── Medical Specialties ──────────────────────────────────────

const SPECIALTIES = [
  'Anestesiología',
  'Cardiología',
  'Cirugía General',
  'Cirugía Cardiovascular',
  'Cirugía Plástica',
  'Dermatología',
  'Endocrinología',
  'Gastroenterología',
  'Geriatría',
  'Ginecología y Obstetricia',
  'Hematología',
  'Infectología',
  'Medicina Interna',
  'Medicina Física y Rehabilitación',
  'Nefrología',
  'Neumología',
  'Neurocirugía',
  'Neurología',
  'Nutrición',
  'Oftalmología',
  'Oncología',
  'Ortopedia y Traumatología',
  'Otorrinolaringología',
  'Patología',
  'Pediatría',
  'Psicología',
  'Psiquiatría',
  'Radiología',
  'Reumatología',
  'Urología',
  'Otra especialidad',
];

// ── Helpers ──────────────────────────────────────────────────

function generateClinicalSummary(ipsData: IPSDisplayData, patientRecord?: PatientRecordDisplay): string {
  const parts: string[] = [];

  if (patientRecord) {
    parts.push(`Paciente de ${patientRecord.age} años, sexo ${patientRecord.gender}.`);
  }

  const activeDx = ipsData.conditions.filter(c => {
    const s = (c.status || '').toLowerCase();
    return s !== 'resuelta' && s !== 'inactiva' && s !== 'resolved' && s !== 'inactive';
  });
  if (activeDx.length > 0) {
    parts.push(`Diagnósticos activos: ${activeDx.map(c => c.name).join(', ')}.`);
  }

  if (ipsData.allergies.length > 0) {
    parts.push(`Alergias: ${ipsData.allergies.map(a => a.name).join(', ')}.`);
  }

  const activeMeds = ipsData.medications.filter(m => !m.status || m.status === 'active' || m.status === 'activo');
  if (activeMeds.length > 0) {
    parts.push(`Medicamentos: ${activeMeds.map(m => m.name).join(', ')}.`);
  }

  return parts.join(' ') || 'Sin información clínica disponible.';
}

// ── Main Component ──────────────────────────────────────────

export function ReferralsPanel({ ipsData, patientRecord, onGeneratePDF, onOutput }: ReferralsPanelProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [localReferrals, setLocalReferrals] = useState<Referral[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formDx, setFormDx] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formSummary, setFormSummary] = useState('');

  const autoSummary = generateClinicalSummary(ipsData, patientRecord);

  const handleCreateReferral = () => {
    if (!formSpecialty || !formDx.trim() || !formJustification.trim()) return;

    const referral: Referral = {
      id: `ref-${Date.now()}`,
      date: new Date().toLocaleDateString('es-CR'),
      specialty: formSpecialty,
      institution: formInstitution.trim() || undefined,
      presumptiveDx: formDx.trim(),
      justification: formJustification.trim(),
      clinicalSummary: formSummary.trim() || autoSummary,
      status: 'pending',
    };

    setLocalReferrals(prev => [referral, ...prev]);

    // Reset form
    setFormSpecialty('');
    setFormInstitution('');
    setFormDx('');
    setFormJustification('');
    setFormSummary('');
    setShowNewForm(false);
  };

  const allReferrals = localReferrals; // In future, merge with Firestore data

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Hero Title ── */}
      <h2 className="text-[36px] font-black text-purple-500 leading-none tracking-tight">Referencias</h2>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <ArrowUpRight className="h-4 w-4 text-purple-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Referencias Médicas</h3>
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
            {allReferrals.length} referencia(s)
          </span>
        </div>
        <button
          onClick={() => {
            setShowNewForm(!showNewForm);
            if (!showNewForm) setFormSummary(autoSummary);
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
            showNewForm
              ? 'bg-slate-100 text-slate-600'
              : 'bg-purple-50 text-purple-600 hover:shadow-sm'
          )}
        >
          {showNewForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showNewForm ? 'Cancelar' : 'Nueva Referencia'}
        </button>
      </div>

      {/* ── New Referral Form (Hoja de Referencia) ── */}
      {showNewForm && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Form header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <div>
                <h4 className="font-bold">Hoja de Referencia Médica</h4>
                <p className="text-xs text-purple-200">Complete los datos para generar la referencia</p>
              </div>
            </div>
          </div>

          {/* Patient info (auto-filled) */}
          <div className="px-6 py-4 bg-purple-50/50 border-b border-purple-100">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">Datos del Paciente</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Nombre</span>
                <p className="text-sm font-semibold text-slate-800">{patientRecord?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Edad</span>
                <p className="text-sm font-semibold text-slate-800">{patientRecord?.age || 'N/A'} años</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Sexo</span>
                <p className="text-sm font-semibold text-slate-800">{patientRecord?.gender || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Fecha</span>
                <p className="text-sm font-semibold text-slate-800">{new Date().toLocaleDateString('es-CR')}</p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="px-6 py-5 space-y-4">

            {/* Specialty */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
                Especialidad de referencia *
              </label>
              <select
                value={formSpecialty}
                onChange={e => setFormSpecialty(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
              >
                <option value="">Seleccione la especialidad...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Institution (optional) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-500" />
                Centro / Institución destino (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Hospital Nacional, Clínica San Rafael..."
                value={formInstitution}
                onChange={e => setFormInstitution(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
              />
            </div>

            {/* Clinical summary (auto-generated, editable) */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-purple-500" />
                Resumen Clínico
              </label>
              <textarea
                value={formSummary}
                onChange={e => setFormSummary(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 resize-none"
                placeholder="Resumen del historial clínico del paciente..."
              />
              <p className="text-[10px] text-slate-400 mt-1">Auto-generado desde el expediente. Edite si lo desea.</p>
            </div>

            {/* Presumptive Dx */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                IDx / Diagnóstico Presuntivo *
              </label>
              <input
                type="text"
                placeholder="Ej: Neoplasia pulmonar en estudio"
                value={formDx}
                onChange={e => setFormDx(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
              />
            </div>

            {/* Justification */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-purple-500" />
                Justificación de la Referencia *
              </label>
              <textarea
                placeholder="Ej: Se refiere para descartar patología neumológica. Paciente presenta tos crónica de 3 meses de evolución con hemoptisis..."
                value={formJustification}
                onChange={e => setFormJustification(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateReferral}
                disabled={!formSpecialty || !formDx.trim() || !formJustification.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-200"
              >
                <Send className="h-3.5 w-3.5" />
                Crear Referencia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Referrals List ── */}
      {allReferrals.length === 0 && !showNewForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <Inbox className="h-10 w-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No hay referencias registradas</p>
          <p className="text-xs text-slate-400 mt-1">Presione "Nueva Referencia" para crear una</p>
        </div>
      )}

      {allReferrals.map((ref) => {
        const isExpanded = expandedId === ref.id;
        return (
          <div key={ref.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : ref.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-xl flex-shrink-0">
                <ArrowUpRight className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{ref.specialty}</span>
                  {ref.institution && (
                    <span className="text-xs text-slate-400">→ {ref.institution}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">IDx: {ref.presumptiveDx}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-400">{ref.date}</span>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  ref.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                  ref.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                  'bg-emerald-50 text-emerald-700'
                )}>
                  {ref.status === 'pending' ? 'Pendiente' : ref.status === 'sent' ? 'Enviada' : 'Completada'}
                </span>
              </div>
              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {/* Expanded detail - Referral document view */}
            {isExpanded && (
              <div className="border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="px-6 py-4 space-y-4 bg-slate-50/30">
                  {/* Patient data */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Datos del Paciente</p>
                    <p className="text-sm text-slate-700">
                      {patientRecord?.name || 'N/A'} • {patientRecord?.age || 'N/A'} años • {patientRecord?.gender || 'N/A'}
                    </p>
                  </div>

                  {/* Clinical summary */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Resumen Clínico</p>
                    <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100 leading-relaxed">
                      {ref.clinicalSummary}
                    </p>
                  </div>

                  {/* Dx + Justification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">IDx / Diagnóstico Presuntivo</p>
                      <p className="text-sm text-slate-700 font-semibold bg-amber-50 rounded-lg p-3 border border-amber-100">
                        {ref.presumptiveDx}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Justificación</p>
                      <p className="text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100 leading-relaxed">
                        {ref.justification}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {onGeneratePDF && (
                      <button
                        onClick={() => onGeneratePDF('referral')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Imprimir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Output Footer ── */}
      <OutputFooter
        onOutput={(channel) => {
          if (onOutput) onOutput(channel, 'referrals');
          if (channel === 'print' && onGeneratePDF) onGeneratePDF('referral');
        }}
        label="Opciones de salida — Referencias"
        accentColor="purple"
      />
    </div>
  );
}
