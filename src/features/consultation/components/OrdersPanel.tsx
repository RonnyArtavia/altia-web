/**
 * OrdersPanel - Tab 4: Órdenes Médicas
 * Tipos: Laboratorio, Imágenes Médicas, Pruebas de Gabinete
 * Permite consultar órdenes existentes, crear nuevas y agregar resultados
 * Los resultados una vez guardados son inmutables
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
  Edit3,
  Lock,
  Save,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, PatientRecordDisplay } from '../types/medical-notes';
import { OutputFooter, type OutputChannel } from './OutputFooter';

interface OrdersPanelProps {
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  onGeneratePDF?: (type: 'labOrder') => void;
  onOutput?: (channel: OutputChannel, context: string) => void;
  /** Callback when a manual order is added — syncs back to consultation ipsData */
  onManualOrder?: (order: { name: string; type: string; priority: string; notes?: string }) => void;
}

/** Saved result for an order — immutable once saved */
interface OrderResult {
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'normal' | 'high' | 'low' | 'critical';
  notes: string;
  savedAt: string; // ISO timestamp — once set, result is locked
  savedBy: string;
}

type OrderCategory = 'lab' | 'imaging' | 'cabinet';

interface NewOrder {
  category: OrderCategory;
  testName: string;
  priority: 'routine' | 'urgent';
  clinicalIndication: string;
  notes: string;
}

// ── Catalogs intentionally removed — will be populated via MCP in a future phase ──

const CATEGORY_CONFIG: Record<OrderCategory, {
  label: string;
  icon: typeof FlaskConical;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  lab: {
    label: 'Laboratorio',
    icon: FlaskConical,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  imaging: {
    label: 'Imágenes Médicas',
    icon: ScanLine,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  cabinet: {
    label: 'Pruebas de Gabinete',
    icon: MonitorDot,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
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

export function OrdersPanel({ ipsData, onGeneratePDF, onOutput, onManualOrder }: OrdersPanelProps) {
  const [activeCategory, setActiveCategory] = useState<OrderCategory>('lab');
  const [showNewForm, setShowNewForm] = useState(false);
  const [localOrders, setLocalOrders] = useState<NewOrder[]>([]);
  const [expandedExisting, setExpandedExisting] = useState<string | null>(null);

  // ── Results editing state ──
  const [editingResultKey, setEditingResultKey] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<Record<string, OrderResult>>({});
  const [resultForm, setResultForm] = useState<Omit<OrderResult, 'savedAt' | 'savedBy'>>({
    value: '',
    unit: '',
    referenceRange: '',
    flag: 'normal',
    notes: '',
  });

  // Form state
  const [formTestName, setFormTestName] = useState('');
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
    if (!formTestName.trim()) return;

    const order: NewOrder = {
      category: activeCategory,
      testName: formTestName.trim(),
      priority: formPriority,
      clinicalIndication: formIndication.trim(),
      notes: formNotes.trim(),
    };

    setLocalOrders(prev => [...prev, order]);

    // Sync back to consultation ipsData
    onManualOrder?.({
      name: order.testName,
      type: config.label,
      priority: order.priority === 'urgent' ? 'Urgente' : 'Normal',
      notes: order.clinicalIndication || order.notes || undefined,
    });

    // Reset form
    setFormTestName('');
    setFormPriority('routine');
    setFormIndication('');
    setFormNotes('');
    setShowNewForm(false);
  };

  // ── Result saving (immutable once saved) ──
  const handleSaveResult = (orderKey: string) => {
    if (!resultForm.value.trim()) return;
    setSavedResults(prev => ({
      ...prev,
      [orderKey]: {
        ...resultForm,
        savedAt: new Date().toISOString(),
        savedBy: 'Dr. Actual', // In production, from auth context
      }
    }));
    setEditingResultKey(null);
    setResultForm({ value: '', unit: '', referenceRange: '', flag: 'normal', notes: '' });
  };

  const handleStartEditResult = (orderKey: string) => {
    // Only allow editing if no saved result exists (immutable)
    if (savedResults[orderKey]) return;
    setEditingResultKey(orderKey);
    setResultForm({ value: '', unit: '', referenceRange: '', flag: 'normal', notes: '' });
  };

  const handleCancelEditResult = () => {
    setEditingResultKey(null);
    setResultForm({ value: '', unit: '', referenceRange: '', flag: 'normal', notes: '' });
  };

  const FLAG_CONFIG: Record<string, { label: string; icon: typeof TrendingUp; color: string; bg: string }> = {
    normal: { label: 'Normal', icon: Minus, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    high: { label: 'Alto', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    low: { label: 'Bajo', icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    critical: { label: 'Crítico', icon: AlertOctagon, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  };

  const localOrdersForCategory = localOrders.filter(o => o.category === activeCategory);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Hero Title ── */}
      <h2 className="text-[36px] font-black text-emerald-500 leading-none tracking-tight">Órdenes Médicas</h2>

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
            {/* Test name — free text (catalogs via MCP in future) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Estudio / Prueba</label>
              <input
                type="text"
                placeholder={activeCategory === 'lab' ? 'Ej: Hemograma completo, Perfil lipídico...' : activeCategory === 'imaging' ? 'Ej: Radiografía de tórax, Ultrasonido abdominal...' : 'Ej: Electrocardiograma, Espirometría...'}
                value={formTestName}
                onChange={e => setFormTestName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
              />
              <p className="text-[10px] text-slate-400 mt-1">🔮 En el futuro se autocompletará vía catálogos MCP</p>
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
                disabled={!formTestName.trim()}
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
          const orderKey = `existing-${i}`;
          const saved = savedResults[orderKey];
          const isEditingThis = editingResultKey === orderKey;

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
                {saved && (
                  <div className="flex items-center gap-1">
                    <Lock className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      Resultado guardado
                    </span>
                  </div>
                )}
                {order.status && !saved && (
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
                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/30 space-y-3 pt-3">
                  {/* Order details */}
                  <div className="text-sm text-slate-600 space-y-1">
                    {order.doctor && <p><span className="font-medium">Solicitado por:</span> {order.doctor}</p>}
                    {order.priority && <p><span className="font-medium">Prioridad:</span> {order.priority}</p>}
                    {order.notes && <p><span className="font-medium">Notas:</span> {order.notes}</p>}
                  </div>

                  {/* ── Saved Result (Immutable) ── */}
                  {saved && (
                    <div className="bg-white rounded-xl border-2 border-emerald-200 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Lock className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Resultado — Inmutable</span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(saved.savedAt).toLocaleString('es-CR')} • {saved.savedBy}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Valor</span>
                          <p className="text-lg font-bold text-slate-800">{saved.value} <span className="text-xs font-normal text-slate-500">{saved.unit}</span></p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Rango referencia</span>
                          <p className="text-sm font-medium text-slate-700">{saved.referenceRange || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase">Indicador</span>
                          <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold mt-0.5', FLAG_CONFIG[saved.flag]?.bg || 'bg-slate-50 border-slate-200')}>
                            {(() => {
                              const FlagIcon = FLAG_CONFIG[saved.flag]?.icon || Minus;
                              return <FlagIcon className={cn('h-3 w-3', FLAG_CONFIG[saved.flag]?.color)} />;
                            })()}
                            <span className={FLAG_CONFIG[saved.flag]?.color}>{FLAG_CONFIG[saved.flag]?.label || saved.flag}</span>
                          </div>
                        </div>
                        {saved.notes && (
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase">Notas</span>
                            <p className="text-sm text-slate-600">{saved.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Edit Result Form ── */}
                  {isEditingThis && !saved && (
                    <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <Edit3 className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Agregar Resultado</span>
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-auto font-semibold">
                          ⚠ Una vez guardado será inmutable
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Value */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Valor *</label>
                          <input
                            type="text"
                            placeholder="Ej: 95, 6.5, Positivo, Normal..."
                            value={resultForm.value}
                            onChange={e => setResultForm(f => ({ ...f, value: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                          />
                        </div>
                        {/* Unit */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Unidad</label>
                          <input
                            type="text"
                            placeholder="Ej: mg/dL, %, mmHg..."
                            value={resultForm.unit}
                            onChange={e => setResultForm(f => ({ ...f, unit: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                          />
                        </div>
                        {/* Reference Range */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Rango de referencia</label>
                          <input
                            type="text"
                            placeholder="Ej: 70-100, < 6.5%, Negativo..."
                            value={resultForm.referenceRange}
                            onChange={e => setResultForm(f => ({ ...f, referenceRange: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                          />
                        </div>
                        {/* Flag */}
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Indicador</label>
                          <div className="grid grid-cols-4 gap-1">
                            {(['normal', 'high', 'low', 'critical'] as const).map(flag => {
                              const cfg = FLAG_CONFIG[flag];
                              const FlagIcon = cfg.icon;
                              return (
                                <button
                                  key={flag}
                                  onClick={() => setResultForm(f => ({ ...f, flag }))}
                                  className={cn(
                                    'flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-[10px] font-semibold transition-all',
                                    resultForm.flag === flag
                                      ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current`
                                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                  )}
                                >
                                  <FlagIcon className="h-3.5 w-3.5" />
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="mt-3">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase">Observaciones</label>
                        <textarea
                          placeholder="Notas adicionales sobre el resultado..."
                          value={resultForm.notes}
                          onChange={e => setResultForm(f => ({ ...f, notes: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleCancelEditResult}
                          className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveResult(orderKey)}
                          disabled={!resultForm.value.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Guardar Resultado
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Add Result Button (only if no saved result and not editing) ── */}
                  {!saved && !isEditingThis && (
                    <button
                      onClick={() => handleStartEditResult(orderKey)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors w-full justify-center border border-indigo-200 hover:shadow-sm"
                    >
                      <Edit3 className="h-4 w-4" />
                      Agregar Resultado
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Output Footer ── */}
      <OutputFooter
        onOutput={(channel) => {
          if (onOutput) onOutput(channel, 'orders');
          if (channel === 'print' && onGeneratePDF) onGeneratePDF('labOrder');
        }}
        label="Opciones de salida — Órdenes"
        accentColor="emerald"
      />
    </div>
  );
}
