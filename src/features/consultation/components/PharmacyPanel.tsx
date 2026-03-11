/**
 * PharmacyPanel - Tab 7: Farmacia
 * Secciones:
 *  1. Receta Actual (creada en esta consulta)
 *  2. Recetas Anteriores (historial de prescripciones)
 *  3. Medicamentos Activos e Inactivos
 *  4. Historial de Contraindicaciones / Recomendaciones
 *
 * Incluye OutputFooter con 4 canales de salida.
 */

import React, { useState } from 'react';
import {
  Pill,
  Plus,
  X,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Inbox,
  FileText,
  AlertTriangle,
  ShieldAlert,
  History,
  ClipboardList,
  Ban,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, PatientRecordDisplay } from '../types/medical-notes';
import { OutputFooter, type OutputChannel } from './OutputFooter';

interface PharmacyPanelProps {
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  onGeneratePDF?: (type: 'prescription') => void;
  onOutput?: (channel: OutputChannel, context: string) => void;
}

// ── Types ──────────────────────────────────────────────────

interface PrescriptionItem {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

interface Prescription {
  id: string;
  date: string;
  doctor: string;
  items: PrescriptionItem[];
  status: 'active' | 'completed' | 'cancelled';
  diagnosis?: string;
}

interface ContraindicationEntry {
  id: string;
  date: string;
  type: 'contraindication' | 'recommendation' | 'interaction' | 'alert';
  medication: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source: string; // doctor or system
}

// ── Medication catalogs ────────────────────────────────────

const COMMON_MEDICATIONS = [
  'Acetaminofén (Paracetamol)',
  'Ibuprofeno',
  'Diclofenaco',
  'Omeprazol',
  'Amoxicilina',
  'Amoxicilina + Ác. Clavulánico',
  'Azitromicina',
  'Ciprofloxacina',
  'Metformina',
  'Losartán',
  'Enalapril',
  'Amlodipino',
  'Atorvastatina',
  'Rosuvastatina',
  'Metoprolol',
  'Ácido acetilsalicílico (ASA)',
  'Clopidogrel',
  'Levotiroxina',
  'Salbutamol (inhalador)',
  'Fluticasona (inhalador)',
  'Insulina Glargina',
  'Insulina Lispro',
  'Prednisona',
  'Dexametasona',
  'Loratadina',
  'Cetirizina',
  'Ranitidina',
  'Metoclopramida',
  'Tramadol',
  'Gabapentina',
  'Sertralina',
  'Fluoxetina',
  'Clonazepam',
  'Alprazolam',
];

const FREQUENCIES = [
  'Cada 6 horas',
  'Cada 8 horas',
  'Cada 12 horas',
  'Cada 24 horas (una vez al día)',
  'Cada 4 horas',
  'Dos veces al día (BID)',
  'Tres veces al día (TID)',
  'Antes de dormir (HS)',
  'En ayunas',
  'Con alimentos',
  'PRN (según necesidad)',
  'Semanal',
  'Quincenal',
  'Mensual',
];

const ROUTES = [
  'Vía oral (PO)',
  'Sublingual (SL)',
  'Intramuscular (IM)',
  'Intravenoso (IV)',
  'Subcutáneo (SC)',
  'Tópico',
  'Inhalado',
  'Rectal',
  'Oftálmico',
  'Ótico',
  'Nasal',
  'Transdérmico',
];

const DURATIONS = [
  '3 días',
  '5 días',
  '7 días',
  '10 días',
  '14 días',
  '21 días',
  '30 días',
  '60 días',
  '90 días',
  'Indefinido / Crónico',
  'Dosis única',
];

// ── Helpers ────────────────────────────────────────────────

function isActiveMed(status?: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return s === 'active' || s === 'activo' || s === 'activa';
}

function severityBadge(severity: string) {
  switch (severity) {
    case 'high':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Alta', dot: 'bg-red-500' };
    case 'medium':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Media', dot: 'bg-amber-500' };
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Baja', dot: 'bg-blue-500' };
  }
}

function typeConfig(type: ContraindicationEntry['type']) {
  switch (type) {
    case 'contraindication':
      return { label: 'Contraindicación', icon: Ban, color: 'text-red-600', bg: 'bg-red-50' };
    case 'interaction':
      return { label: 'Interacción', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' };
    case 'alert':
      return { label: 'Alerta', icon: ShieldAlert, color: 'text-orange-600', bg: 'bg-orange-50' };
    case 'recommendation':
      return { label: 'Recomendación', icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-50' };
  }
}

// ── Main Component ──────────────────────────────────────────

export function PharmacyPanel({ ipsData, patientRecord: _patientRecord, onGeneratePDF, onOutput }: PharmacyPanelProps) {
  // patientRecord available for future use (e.g. prescription headers)
  void _patientRecord;
  // Section expansion
  const [expandedSection, setExpandedSection] = useState<string>('current-rx');

  // New prescription form
  const [showNewRxForm, setShowNewRxForm] = useState(false);
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [localPrescriptions, setLocalPrescriptions] = useState<Prescription[]>([]);

  // Medication form fields
  const [formMedication, setFormMedication] = useState('');
  const [formCustomMed, setFormCustomMed] = useState('');
  const [formDose, setFormDose] = useState('');
  const [formFrequency, setFormFrequency] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formRoute, setFormRoute] = useState('');
  const [formInstructions, setFormInstructions] = useState('');

  // Med filter
  const [medFilter, setMedFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Demo contraindications data
  const [contraindications] = useState<ContraindicationEntry[]>([
    {
      id: 'ci-1',
      date: '10/03/2026',
      type: 'contraindication',
      medication: 'Ibuprofeno',
      description: 'Contraindicado por antecedente de úlcera gástrica activa. Usar acetaminofén como alternativa.',
      severity: 'high',
      source: 'Dr. María González'
    },
    {
      id: 'ci-2',
      date: '08/03/2026',
      type: 'interaction',
      medication: 'Metformina + Alcohol',
      description: 'Riesgo de acidosis láctica. Se recomienda abstinencia de alcohol durante el tratamiento.',
      severity: 'high',
      source: 'Sistema de alertas'
    },
    {
      id: 'ci-3',
      date: '05/03/2026',
      type: 'recommendation',
      medication: 'Atorvastatina',
      description: 'Tomar preferiblemente en la noche para mejor efectividad. Controlar enzimas hepáticas cada 6 meses.',
      severity: 'low',
      source: 'Dr. Carlos Rodríguez'
    },
    {
      id: 'ci-4',
      date: '01/03/2026',
      type: 'alert',
      medication: 'Losartán',
      description: 'Monitorear potasio sérico por riesgo de hiperkalemia. Control mensual recomendado.',
      severity: 'medium',
      source: 'Sistema de alertas'
    },
  ]);

  // Demo previous prescriptions
  const [demoPrescriptions] = useState<Prescription[]>([
    {
      id: 'rx-prev-1',
      date: '01/03/2026',
      doctor: 'Dr. María González',
      status: 'active',
      diagnosis: 'Hipertensión arterial, Diabetes tipo 2',
      items: [
        { medication: 'Losartán', dose: '50 mg', frequency: 'Cada 12 horas', duration: '90 días', route: 'Vía oral (PO)', instructions: 'Tomar con agua' },
        { medication: 'Metformina', dose: '850 mg', frequency: 'Cada 12 horas', duration: '90 días', route: 'Vía oral (PO)', instructions: 'Tomar con alimentos' },
      ]
    },
    {
      id: 'rx-prev-2',
      date: '15/02/2026',
      doctor: 'Dr. Carlos Rodríguez',
      status: 'completed',
      diagnosis: 'Infección urinaria',
      items: [
        { medication: 'Ciprofloxacina', dose: '500 mg', frequency: 'Cada 12 horas', duration: '7 días', route: 'Vía oral (PO)', instructions: 'Completar esquema' },
      ]
    },
    {
      id: 'rx-prev-3',
      date: '05/02/2026',
      doctor: 'Dr. Ana Martínez',
      status: 'completed',
      diagnosis: 'Faringitis aguda',
      items: [
        { medication: 'Amoxicilina', dose: '500 mg', frequency: 'Cada 8 horas', duration: '7 días', route: 'Vía oral (PO)', instructions: 'Completar esquema antibiótico' },
        { medication: 'Ibuprofeno', dose: '400 mg', frequency: 'Cada 8 horas PRN', duration: '5 días', route: 'Vía oral (PO)', instructions: 'Solo si presenta dolor o fiebre' },
      ]
    },
  ]);

  // Add med to current prescription
  const handleAddMedToRx = () => {
    const medName = formMedication === '__custom__' ? formCustomMed : formMedication;
    if (!medName.trim() || !formDose.trim()) return;

    const item: PrescriptionItem = {
      medication: medName.trim(),
      dose: formDose.trim(),
      frequency: formFrequency || 'Cada 8 horas',
      duration: formDuration || '7 días',
      route: formRoute || 'Vía oral (PO)',
      instructions: formInstructions.trim(),
    };

    setRxItems(prev => [...prev, item]);

    // Reset form
    setFormMedication('');
    setFormCustomMed('');
    setFormDose('');
    setFormFrequency('');
    setFormDuration('');
    setFormRoute('');
    setFormInstructions('');
  };

  // Finalize prescription
  const handleFinalizeRx = () => {
    if (rxItems.length === 0) return;

    const rx: Prescription = {
      id: `rx-${Date.now()}`,
      date: new Date().toLocaleDateString('es-CR'),
      doctor: 'Dr. Actual', // TODO: from auth
      items: [...rxItems],
      status: 'active',
    };

    setLocalPrescriptions(prev => [rx, ...prev]);
    setRxItems([]);
    setShowNewRxForm(false);
  };

  // Medications split
  const activeMeds = ipsData.medications.filter(m => isActiveMed(m.status));
  const inactiveMeds = ipsData.medications.filter(m => !isActiveMed(m.status));
  const displayMeds = medFilter === 'all' ? ipsData.medications :
    medFilter === 'active' ? activeMeds : inactiveMeds;

  const allPrescriptions = [...localPrescriptions, ...demoPrescriptions];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? '' : id);
  };

  const handleOutputAction = (channel: OutputChannel) => {
    if (onOutput) {
      onOutput(channel, 'pharmacy');
    }
    // Fallback: if print channel, use PDF generator
    if (channel === 'print' && onGeneratePDF) {
      onGeneratePDF('prescription');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: RECETA ACTUAL
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('current-rx')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <FileText className="h-4 w-4 text-teal-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Receta Actual</h3>
            {rxItems.length > 0 && (
              <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                {rxItems.length} medicamento(s)
              </span>
            )}
          </div>
          {expandedSection === 'current-rx'
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>

        {expandedSection === 'current-rx' && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">

            {/* Current rx items */}
            {rxItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medicamentos en receta</p>
                {rxItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/50">
                    <div className="p-1.5 bg-white rounded-lg">
                      <Pill className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{item.medication}</p>
                      <p className="text-xs text-slate-500">{item.dose} — {item.frequency} — {item.duration}</p>
                      <p className="text-xs text-slate-400">{item.route}</p>
                      {item.instructions && <p className="text-xs text-teal-600 mt-0.5">📝 {item.instructions}</p>}
                    </div>
                    <button
                      onClick={() => setRxItems(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Finalize prescription */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleFinalizeRx}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-200 transition-all"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Finalizar Receta ({rxItems.length} items)
                  </button>
                </div>
              </div>
            )}

            {/* Add medication form */}
            {!showNewRxForm ? (
              <button
                onClick={() => setShowNewRxForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-teal-50 text-teal-600 hover:bg-teal-100 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Medicamento
              </button>
            ) : (
              <div className="bg-gradient-to-br from-teal-50 to-white rounded-xl border-2 border-teal-200 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-teal-700">Agregar Medicamento a Receta</h4>
                  <button onClick={() => setShowNewRxForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Medication */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Medicamento *</label>
                    <select
                      value={formMedication}
                      onChange={e => setFormMedication(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    >
                      <option value="">Seleccione un medicamento...</option>
                      {COMMON_MEDICATIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      <option value="__custom__">➕ Otro (escribir manualmente)</option>
                    </select>
                    {formMedication === '__custom__' && (
                      <input
                        type="text"
                        placeholder="Nombre del medicamento..."
                        value={formCustomMed}
                        onChange={e => setFormCustomMed(e.target.value)}
                        className="w-full mt-2 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                      />
                    )}
                  </div>

                  {/* Dose */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Dosis *</label>
                    <input
                      type="text"
                      placeholder="Ej: 500 mg, 10 ml, 1 tableta"
                      value={formDose}
                      onChange={e => setFormDose(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    />
                  </div>

                  {/* Route */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vía de Administración</label>
                    <select
                      value={formRoute}
                      onChange={e => setFormRoute(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    >
                      <option value="">Seleccione...</option>
                      {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Frecuencia</label>
                    <select
                      value={formFrequency}
                      onChange={e => setFormFrequency(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    >
                      <option value="">Seleccione...</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Duración</label>
                    <select
                      value={formDuration}
                      onChange={e => setFormDuration(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300"
                    >
                      <option value="">Seleccione...</option>
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* Instructions */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Indicaciones / Instrucciones</label>
                    <textarea
                      placeholder="Ej: Tomar con alimentos, evitar alcohol, no administrar con antiácidos..."
                      value={formInstructions}
                      onChange={e => setFormInstructions(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 resize-none"
                    />
                  </div>
                </div>

                {/* Form actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowNewRxForm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddMedToRx}
                    disabled={!formMedication || (formMedication === '__custom__' && !formCustomMed.trim()) || !formDose.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md shadow-teal-200"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar a Receta
                  </button>
                </div>
              </div>
            )}

            {rxItems.length === 0 && !showNewRxForm && (
              <div className="text-center py-4">
                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No hay medicamentos en la receta actual</p>
                <p className="text-xs text-slate-300 mt-0.5">Presione "Agregar Medicamento" para iniciar</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: RECETAS ANTERIORES
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('prev-rx')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
              <History className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Recetas Anteriores</h3>
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {allPrescriptions.length}
            </span>
          </div>
          {expandedSection === 'prev-rx'
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>

        {expandedSection === 'prev-rx' && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
            {allPrescriptions.length === 0 ? (
              <div className="py-4 text-center">
                <Inbox className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No hay recetas anteriores</p>
              </div>
            ) : (
              allPrescriptions.map((rx) => (
                <div key={rx.id} className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className={cn(
                      'p-1.5 rounded-lg',
                      rx.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                    )}>
                      <ClipboardList className={cn(
                        'h-4 w-4',
                        rx.status === 'active' ? 'text-emerald-600' : 'text-slate-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{rx.date}</p>
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          rx.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                          rx.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        )}>
                          {rx.status === 'active' ? 'Vigente' : rx.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{rx.doctor}</p>
                      {rx.diagnosis && <p className="text-xs text-slate-400 mt-0.5">Dx: {rx.diagnosis}</p>}
                    </div>
                    <span className="text-xs text-slate-400">{rx.items.length} med(s)</span>
                  </div>

                  {/* Prescription items */}
                  <div className="px-4 py-3 space-y-2 bg-white">
                    {rx.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2.5 py-1.5">
                        <Pill className="h-3.5 w-3.5 text-teal-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">{item.medication} — {item.dose}</p>
                          <p className="text-xs text-slate-400">{item.frequency} • {item.duration} • {item.route}</p>
                          {item.instructions && <p className="text-xs text-teal-600 mt-0.5">{item.instructions}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: MEDICAMENTOS ACTIVOS E INACTIVOS
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('meds')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Pill className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Medicamentos</h3>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeMeds.length} activos
            </span>
            {inactiveMeds.length > 0 && (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {inactiveMeds.length} inactivos
              </span>
            )}
          </div>
          {expandedSection === 'meds'
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>

        {expandedSection === 'meds' && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
            {/* Filter tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {([
                { id: 'all' as const, label: 'Todos', count: ipsData.medications.length },
                { id: 'active' as const, label: 'Activos', count: activeMeds.length },
                { id: 'inactive' as const, label: 'Inactivos', count: inactiveMeds.length },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMedFilter(tab.id)}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
                    medFilter === tab.id
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                    medFilter === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Medications list */}
            {displayMeds.length === 0 ? (
              <div className="py-4 text-center">
                <Pill className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {medFilter === 'all' ? 'Sin medicamentos registrados' :
                   medFilter === 'active' ? 'Sin medicamentos activos' : 'Sin medicamentos inactivos'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayMeds.map((med, i) => {
                  const medIsActive = isActiveMed(med.status);
                  return (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className={cn(
                        'mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                        medIsActive ? 'bg-emerald-500' : 'bg-slate-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                        {med.dose && <p className="text-xs text-slate-500">{med.dose}</p>}
                        {med.frequency && <p className="text-xs text-slate-400">{med.frequency}</p>}
                        {med.notes && <p className="text-xs text-slate-400 mt-0.5">{med.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          medIsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {medIsActive ? 'Activo' : (med.status || 'Finalizado')}
                        </span>
                        {med.date && <span className="text-[10px] text-slate-400 whitespace-nowrap">{med.date}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: CONTRAINDICACIONES / RECOMENDACIONES
         ═══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => toggleSection('contraindications')}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Contraindicaciones y Recomendaciones</h3>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {contraindications.length}
            </span>
          </div>
          {expandedSection === 'contraindications'
            ? <ChevronDown className="h-4 w-4 text-slate-400" />
            : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>

        {expandedSection === 'contraindications' && (
          <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
            {contraindications.length === 0 ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-200 mx-auto mb-2" />
                <p className="text-sm text-emerald-600 font-medium">Sin contraindicaciones registradas</p>
              </div>
            ) : (
              contraindications.map((ci) => {
                const config = typeConfig(ci.type);
                const severity = severityBadge(ci.severity);
                const Icon = config.icon;
                return (
                  <div key={ci.id} className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border', `${severity.bg} border-${ci.severity === 'high' ? 'red' : ci.severity === 'medium' ? 'amber' : 'blue'}-100`)}>
                    <div className={cn('p-1.5 rounded-lg bg-white flex-shrink-0')}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', config.bg, config.color)}>
                          {config.label}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', severity.bg, severity.text)}>
                          Severidad: {severity.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{ci.medication}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ci.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>{ci.date}</span>
                        <span>•</span>
                        <span>{ci.source}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          OUTPUT FOOTER
         ═══════════════════════════════════════════════════════ */}
      <OutputFooter
        onOutput={handleOutputAction}
        label="Opciones de salida — Farmacia"
        accentColor="teal"
      />
    </div>
  );
}
