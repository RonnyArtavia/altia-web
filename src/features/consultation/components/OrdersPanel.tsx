/**
 * OrdersPanel - Tab 4: Órdenes Médicas
 * Tipos: Laboratorio, Imágenes Médicas, Pruebas de Gabinete
 * Permite consultar órdenes existentes y crear nuevas
 */

import React, { useState } from 'react';
import {
  FlaskConical,
  ScanLine,
  MonitorDot,
  Plus,
  X,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, PatientRecordDisplay } from '../types/medical-notes';

interface OrdersPanelProps {
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  onGeneratePDF?: (type: 'labOrder') => void;
}

type OrderCategory = 'lab' | 'imaging' | 'cabinet';

interface NewOrder {
  category: OrderCategory;
  testName: string;
  priority: 'routine' | 'urgent';
  clinicalIndication: string;
  notes: string;
}

// ── Predefined test catalogs ──────────────────────────────

const LAB_TESTS = [
  'Hemograma completo',
  'Química sanguínea (glucosa, creatinina, BUN, ácido úrico)',
  'Perfil lipídico',
  'Pruebas de función hepática (TGO, TGP, FA, GGT, Bilirrubinas)',
  'Pruebas de función tiroidea (TSH, T3, T4 libre)',
  'Hemoglobina glicosilada (HbA1c)',
  'Electrolitos séricos (Na, K, Cl, Ca, Mg)',
  'Urianálisis completo',
  'Urocultivo con antibiograma',
  'Tiempos de coagulación (TP, TPT, INR)',
  'Velocidad de eritrosedimentación (VES)',
  'Proteína C reactiva (PCR)',
  'Antígeno prostático específico (PSA)',
  'Examen general de heces',
  'Perfil renal',
  'Ácido úrico',
  'Factor reumatoideo',
  'VDRL',
  'HIV (ELISA)',
  'Hepatitis B (HBsAg)',
  'Hepatitis C (Anti-HCV)',
];

const IMAGING_TESTS = [
  'Radiografía de tórax PA',
  'Radiografía de abdomen',
  'Radiografía de columna (cervical/dorsal/lumbar)',
  'Radiografía de extremidades',
  'Ultrasonido abdominal',
  'Ultrasonido pélvico',
  'Ultrasonido de tiroides',
  'Ultrasonido renal',
  'Ultrasonido Doppler vascular',
  'Tomografía axial computarizada (TAC) simple',
  'Tomografía axial computarizada (TAC) con contraste',
  'Resonancia magnética (RM) simple',
  'Resonancia magnética (RM) con contraste',
  'Mamografía bilateral',
  'Densitometría ósea (DEXA)',
];

const CABINET_TESTS = [
  'Electrocardiograma (ECG/EKG)',
  'Electroencefalograma (EEG)',
  'Ecocardiograma transtorácico',
  'Ecocardiograma transesofágico',
  'Espirometría',
  'Holter de 24 horas',
  'MAPA (Monitoreo ambulatorio de presión arterial)',
  'Prueba de esfuerzo',
  'Electromiografía (EMG)',
  'Velocidades de conducción nerviosa',
  'Gammagrafía tiroidea',
  'Gammagrafía ósea',
  'Gammagrafía renal',
  'Endoscopia digestiva alta',
  'Colonoscopia',
  'Broncoscopia',
  'Cistoscopia',
  'Audiometría',
];

const CATEGORY_CONFIG: Record<OrderCategory, {
  label: string;
  icon: typeof FlaskConical;
  color: string;
  bgColor: string;
  borderColor: string;
  tests: string[];
}> = {
  lab: {
    label: 'Laboratorio',
    icon: FlaskConical,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    tests: LAB_TESTS,
  },
  imaging: {
    label: 'Imágenes Médicas',
    icon: ScanLine,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    tests: IMAGING_TESTS,
  },
  cabinet: {
    label: 'Pruebas de Gabinete',
    icon: MonitorDot,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    tests: CABINET_TESTS,
  },
};

function statusIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s.includes('complet') || s.includes('finaliz'))
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (s.includes('pendi') || s.includes('activ'))
    return <Clock className="h-3.5 w-3.5 text-amber-500" />;
  if (s.includes('cancel'))
    return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
  return <Clock className="h-3.5 w-3.5 text-slate-400" />;
}

// ── Main Component ──────────────────────────────────────────

export function OrdersPanel({ ipsData, onGeneratePDF }: OrdersPanelProps) {
  const [activeCategory, setActiveCategory] = useState<OrderCategory>('lab');
  const [showNewForm, setShowNewForm] = useState(false);
  const [localOrders, setLocalOrders] = useState<NewOrder[]>([]);
  const [expandedExisting, setExpandedExisting] = useState<string | null>(null);

  // Form state
  const [formTestName, setFormTestName] = useState('');
  const [formCustomTest, setFormCustomTest] = useState('');
  const [formPriority, setFormPriority] = useState<'routine' | 'urgent'>('routine');
  const [formIndication, setFormIndication] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const config = CATEGORY_CONFIG[activeCategory];
  const IconComp = config.icon;

  // Get existing orders
  const existingOrders = (ipsData.labOrders || []).filter(o => {
    const t = (o.type || '').toLowerCase();
    if (activeCategory === 'lab') return t.includes('lab') || t === '' || t === 'laboratorio';
    if (activeCategory === 'imaging') return t.includes('imag') || t.includes('radiolog');
    return t.includes('gabinete') || t.includes('electro') || t.includes('nuclear');
  });

  const handleAddOrder = () => {
    const testName = formTestName === '__custom__' ? formCustomTest : formTestName;
    if (!testName.trim()) return;

    const order: NewOrder = {
      category: activeCategory,
      testName: testName.trim(),
      priority: formPriority,
      clinicalIndication: formIndication.trim(),
      notes: formNotes.trim(),
    };

    setLocalOrders(prev => [...prev, order]);

    // Reset form
    setFormTestName('');
    setFormCustomTest('');
    setFormPriority('routine');
    setFormIndication('');
    setFormNotes('');
    setShowNewForm(false);
  };

  const localOrdersForCategory = localOrders.filter(o => o.category === activeCategory);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Category Tabs ── */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        {(Object.entries(CATEGORY_CONFIG) as [OrderCategory, typeof config][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = activeCategory === key;
          return (
            <button
              key={key}
              onClick={() => { setActiveCategory(key); setShowNewForm(false); }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? `${cfg.bgColor} ${cfg.color} shadow-sm border ${cfg.borderColor}`
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── New Order Button ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
            <IconComp className={cn('h-4 w-4', config.color)} />
          </div>
          <h3 className="text-sm font-bold text-slate-800">{config.label}</h3>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all',
            showNewForm
              ? 'bg-slate-100 text-slate-600'
              : `${config.bgColor} ${config.color} hover:shadow-sm`
          )}
        >
          {showNewForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showNewForm ? 'Cancelar' : 'Nueva Orden'}
        </button>
      </div>

      {/* ── New Order Form ── */}
      {showNewForm && (
        <div className={cn('bg-white rounded-2xl border-2 p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300', config.borderColor)}>
          <h4 className={cn('text-sm font-bold mb-4', config.color)}>
            Nueva Orden — {config.label}
          </h4>

          <div className="space-y-4">
            {/* Test selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estudio / Prueba</label>
              <select
                value={formTestName}
                onChange={e => setFormTestName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              >
                <option value="">Seleccione un estudio...</option>
                {config.tests.map(test => (
                  <option key={test} value={test}>{test}</option>
                ))}
                <option value="__custom__">➕ Otro (escribir manualmente)</option>
              </select>
              {formTestName === '__custom__' && (
                <input
                  type="text"
                  placeholder="Escriba el nombre del estudio..."
                  value={formCustomTest}
                  onChange={e => setFormCustomTest(e.target.value)}
                  className="w-full mt-2 px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                />
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridad</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormPriority('routine')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                    formPriority === 'routine'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  )}
                >
                  📋 Rutina
                </button>
                <button
                  onClick={() => setFormPriority('urgent')}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                    formPriority === 'urgent'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  )}
                >
                  🔴 Urgente
                </button>
              </div>
            </div>

            {/* Clinical indication */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Indicación Clínica</label>
              <input
                type="text"
                placeholder="Ej: Descartar diabetes mellitus tipo 2"
                value={formIndication}
                onChange={e => setFormIndication(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notas adicionales</label>
              <textarea
                placeholder="Instrucciones especiales, ayuno, preparación..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowNewForm(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddOrder}
                disabled={!formTestName || (formTestName === '__custom__' && !formCustomTest.trim())}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40',
                  'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-200'
                )}
              >
                <Send className="h-3.5 w-3.5" />
                Agregar Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Newly added orders (this session) ── */}
      {localOrdersForCategory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nuevas órdenes (esta sesión)</p>
          {localOrdersForCategory.map((order, i) => (
            <div key={i} className={cn('flex items-center gap-4 px-4 py-3 rounded-xl border-2 border-dashed', config.borderColor, config.bgColor)}>
              <div className={cn('p-1.5 rounded-lg bg-white')}>
                <IconComp className={cn('h-4 w-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{order.testName}</p>
                {order.clinicalIndication && (
                  <p className="text-xs text-slate-500 mt-0.5">Indicación: {order.clinicalIndication}</p>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                order.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              )}>
                {order.priority === 'urgent' ? 'Urgente' : 'Rutina'}
              </span>
              <button
                onClick={() => setLocalOrders(prev => prev.filter((_, idx) => !(idx === localOrders.indexOf(order))))}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Generate PDF button */}
          {onGeneratePDF && (
            <button
              onClick={() => onGeneratePDF('labOrder')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir / Generar PDF
            </button>
          )}
        </div>
      )}

      {/* ── Existing Orders ── */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Órdenes registradas</p>

        {existingOrders.length === 0 && localOrdersForCategory.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
            <Inbox className="h-10 w-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay órdenes de {config.label.toLowerCase()} registradas</p>
          </div>
        )}

        {existingOrders.map((order, i) => {
          const isExpanded = expandedExisting === `existing-${i}`;
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedExisting(isExpanded ? null : `existing-${i}`)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
              >
                {statusIcon(order.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{order.name || 'Orden sin nombre'}</p>
                  {order.date && <span className="text-xs text-slate-400">{order.date}</span>}
                </div>
                {order.status && (
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    (order.status || '').toLowerCase().includes('pendi') ? 'bg-amber-50 text-amber-700' :
                    (order.status || '').toLowerCase().includes('complet') ? 'bg-emerald-50 text-emerald-700' :
                    'bg-slate-100 text-slate-500'
                  )}>
                    {order.status}
                  </span>
                )}
                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-slate-100 bg-slate-50/30 text-sm text-slate-600 space-y-1 pt-2">
                  {order.doctor && <p><span className="font-medium">Solicitado por:</span> {order.doctor}</p>}
                  {order.priority && <p><span className="font-medium">Prioridad:</span> {order.priority}</p>}
                  {order.notes && <p><span className="font-medium">Notas:</span> {order.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
