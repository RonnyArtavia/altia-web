/**
 * MedicalHistoryPanel - Tab 6: Antecedentes (Historia Clínica)
 * Categorías: Patológicos, No Patológicos, Quirúrgicos, Traumáticos,
 * Gineco-obstétricos (solo mujeres), Heredo-familiares
 */

import React, { useState } from 'react';
import {
  Heart,
  Leaf,
  Scissors,
  Bone,
  Baby,
  Users,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, PatientRecordDisplay } from '../types/medical-notes';

interface MedicalHistoryPanelProps {
  ipsData: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
}

// ── Types ────────────────────────────────────────────────────

type CategoryId = 'pathological' | 'non-pathological' | 'surgical' | 'traumatic' | 'gyneco' | 'family';

interface HistoryEntry {
  id: string;
  text: string;
  date?: string;
  notes?: string;
}

interface CategoryConfig {
  id: CategoryId;
  label: string;
  description: string;
  icon: typeof Heart;
  color: string;
  bgColor: string;
  borderColor: string;
  placeholder: string;
  onlyFemale?: boolean;
}

// ── Category Configuration ───────────────────────────────────

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'pathological',
    label: 'Antecedentes Personales Patológicos',
    description: 'Enfermedades crónicas, diabetes, hipertensión, cardiopatías, nefropatías, etc.',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    placeholder: 'Ej: Diabetes Mellitus Tipo 2 diagnosticada en 2015',
  },
  {
    id: 'non-pathological',
    label: 'Antecedentes Personales No Patológicos',
    description: 'Hábitos y estilo de vida: tabaquismo, alcoholismo, actividad física, alimentación, drogas.',
    icon: Leaf,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    placeholder: 'Ej: Tabaquismo activo, 10 cigarrillos/día desde hace 5 años',
  },
  {
    id: 'surgical',
    label: 'Antecedentes Quirúrgicos',
    description: 'Cirugías previas, tipo de procedimiento, fecha y complicaciones.',
    icon: Scissors,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    placeholder: 'Ej: Apendicectomía laparoscópica en 2018, sin complicaciones',
  },
  {
    id: 'traumatic',
    label: 'Antecedentes Traumáticos',
    description: 'Fracturas, accidentes, traumatismos craneoencefálicos, quemaduras.',
    icon: Bone,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    placeholder: 'Ej: Fractura de radio distal derecho en 2020, manejo conservador',
  },
  {
    id: 'gyneco',
    label: 'Antecedentes Gineco-obstétricos',
    description: 'Menarca, FUM, ciclos menstruales, gestas, partos, cesáreas, abortos, planificación familiar.',
    icon: Baby,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    placeholder: 'Ej: Menarca 12 años, FUM 01/03/2026, G2P1C1A0',
    onlyFemale: true,
  },
  {
    id: 'family',
    label: 'Antecedentes Heredo-familiares',
    description: 'Enfermedades en familiares directos: padres, hermanos, abuelos.',
    icon: Users,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    placeholder: 'Ej: Padre con DM2 e HTA, madre con hipotiroidismo',
  },
];

// ── Gyneco-obstetric structured fields ───────────────────────

interface GynecoData {
  menarca: string;
  fum: string;
  ritmo: string;
  gestas: string;
  partos: string;
  cesareas: string;
  abortos: string;
  anticonceptivo: string;
  papanicolaou: string;
  notes: string;
}

function GynecoForm({ data, onChange }: { data: GynecoData; onChange: (d: GynecoData) => void }) {
  const update = (field: keyof GynecoData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Menarca (edad)</label>
          <input
            type="text"
            value={data.menarca}
            onChange={e => update('menarca', e.target.value)}
            placeholder="Ej: 12 años"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">FUM</label>
          <input
            type="date"
            value={data.fum}
            onChange={e => update('fum', e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Ritmo menstrual</label>
          <input
            type="text"
            value={data.ritmo}
            onChange={e => update('ritmo', e.target.value)}
            placeholder="Ej: 28x5 regular"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Anticonceptivo</label>
          <input
            type="text"
            value={data.anticonceptivo}
            onChange={e => update('anticonceptivo', e.target.value)}
            placeholder="Ej: ACO, DIU..."
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
      </div>

      {/* GPCA */}
      <div>
        <label className="text-[10px] font-semibold text-slate-500 uppercase mb-1 block">Fórmula Obstétrica (GPCA)</label>
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col items-center bg-pink-50 rounded-lg px-2 py-2 border border-pink-100">
            <span className="text-[10px] font-bold text-pink-400">Gestas</span>
            <input
              type="number"
              min="0"
              value={data.gestas}
              onChange={e => update('gestas', e.target.value)}
              className="w-full text-center text-lg font-bold text-pink-700 bg-transparent border-0 focus:outline-none"
            />
          </div>
          <div className="flex flex-col items-center bg-pink-50 rounded-lg px-2 py-2 border border-pink-100">
            <span className="text-[10px] font-bold text-pink-400">Partos</span>
            <input
              type="number"
              min="0"
              value={data.partos}
              onChange={e => update('partos', e.target.value)}
              className="w-full text-center text-lg font-bold text-pink-700 bg-transparent border-0 focus:outline-none"
            />
          </div>
          <div className="flex flex-col items-center bg-pink-50 rounded-lg px-2 py-2 border border-pink-100">
            <span className="text-[10px] font-bold text-pink-400">Cesáreas</span>
            <input
              type="number"
              min="0"
              value={data.cesareas}
              onChange={e => update('cesareas', e.target.value)}
              className="w-full text-center text-lg font-bold text-pink-700 bg-transparent border-0 focus:outline-none"
            />
          </div>
          <div className="flex flex-col items-center bg-pink-50 rounded-lg px-2 py-2 border border-pink-100">
            <span className="text-[10px] font-bold text-pink-400">Abortos</span>
            <input
              type="number"
              min="0"
              value={data.abortos}
              onChange={e => update('abortos', e.target.value)}
              className="w-full text-center text-lg font-bold text-pink-700 bg-transparent border-0 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Último Papanicolaou</label>
          <input
            type="text"
            value={data.papanicolaou}
            onChange={e => update('papanicolaou', e.target.value)}
            placeholder="Ej: 03/2025, resultado normal"
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Notas adicionales</label>
          <input
            type="text"
            value={data.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Observaciones relevantes..."
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

export function MedicalHistoryPanel({ ipsData, patientRecord }: MedicalHistoryPanelProps) {
  const entryCounter = React.useRef(0);
  const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>('pathological');
  const [entries, setEntries] = useState<Record<CategoryId, HistoryEntry[]>>({
    pathological: [],
    'non-pathological': [],
    surgical: [],
    traumatic: [],
    gyneco: [],
    family: [],
  });
  const [newEntryText, setNewEntryText] = useState<Record<CategoryId, string>>({
    pathological: '',
    'non-pathological': '',
    surgical: '',
    traumatic: '',
    gyneco: '',
    family: '',
  });

  const [gynecoData, setGynecoData] = useState<GynecoData>({
    menarca: '', fum: '', ritmo: '', gestas: '', partos: '',
    cesareas: '', abortos: '', anticonceptivo: '', papanicolaou: '', notes: '',
  });

  // Check if patient is female
  const isFemale = (() => {
    const g = (patientRecord?.gender || '').toLowerCase();
    return g === 'femenino' || g === 'female' || g === 'f';
  })();

  // Load existing data from IPS
  const getExistingData = (categoryId: CategoryId): { name: string; notes?: string; date?: string }[] => {
    switch (categoryId) {
      case 'pathological':
        return (ipsData.personalHistory || [])
          .filter(h => (h.category || '').toLowerCase() === 'medical' || (h.category || '').toLowerCase() === 'patológico')
          .map(h => ({ name: h.name || '', notes: h.notes, date: h.date }));
      case 'non-pathological':
        return (ipsData.personalHistory || [])
          .filter(h => (h.category || '').toLowerCase() === 'social' || (h.category || '').toLowerCase() === 'no patológico')
          .map(h => ({ name: h.name || '', notes: h.notes, date: h.date }));
      case 'surgical':
        return (ipsData.personalHistory || [])
          .filter(h => (h.category || '').toLowerCase() === 'surgical' || (h.category || '').toLowerCase() === 'quirúrgico')
          .map(h => ({ name: h.name || '', notes: h.notes, date: h.date }));
      case 'family':
        return (ipsData.familyHistory || [])
          .map(h => ({ name: h.name || '', notes: h.notes ? `${h.relationship || ''}: ${h.notes}` : h.relationship, date: h.date }));
      default:
        return [];
    }
  };

  const handleAddEntry = (categoryId: CategoryId) => {
    const text = newEntryText[categoryId]?.trim();
    if (!text) return;

    entryCounter.current += 1;
    const entry: HistoryEntry = {
      id: `${categoryId}-${entryCounter.current}`,
      text,
      date: new Date().toLocaleDateString('es-CR'),
    };

    setEntries(prev => ({
      ...prev,
      [categoryId]: [...prev[categoryId], entry],
    }));

    setNewEntryText(prev => ({ ...prev, [categoryId]: '' }));
  };

  const handleRemoveEntry = (categoryId: CategoryId, entryId: string) => {
    setEntries(prev => ({
      ...prev,
      [categoryId]: prev[categoryId].filter(e => e.id !== entryId),
    }));
  };

  // Filter categories (hide gyneco for non-female)
  const visibleCategories = CATEGORIES.filter(cat => {
    if (cat.onlyFemale && !isFemale) return false;
    return true;
  });

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="p-1.5 bg-teal-100 rounded-lg">
          <FileText className="h-4 w-4 text-teal-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Historia Clínica — Antecedentes</h3>
        <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
          {visibleCategories.length} categorías
        </span>
      </div>

      {/* ── Accordion Categories ── */}
      {visibleCategories.map((cat) => {
        const Icon = cat.icon;
        const isExpanded = expandedCategory === cat.id;
        const existingData = getExistingData(cat.id);
        const localEntries = entries[cat.id] || [];
        const totalCount = existingData.length + localEntries.length;

        return (
          <div
            key={cat.id}
            className={cn(
              'bg-white rounded-2xl border shadow-sm overflow-hidden transition-all',
              isExpanded ? `border-2 ${cat.borderColor}` : 'border-slate-200'
            )}
          >
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
              className={cn(
                'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
                isExpanded ? cat.bgColor : 'hover:bg-slate-50/50'
              )}
            >
              <div className={cn('p-2 rounded-xl', cat.bgColor)}>
                <Icon className={cn('h-4 w-4', cat.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{cat.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{cat.description}</p>
              </div>
              {totalCount > 0 && (
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cat.bgColor, cat.color)}>
                  {totalCount}
                </span>
              )}
              {isExpanded
                ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-1 duration-200">

                {/* Special form for Gyneco-obstetric */}
                {cat.id === 'gyneco' ? (
                  <div className="mt-2">
                    <GynecoForm data={gynecoData} onChange={setGynecoData} />
                  </div>
                ) : (
                  <>
                    {/* Existing data from IPS */}
                    {existingData.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registros existentes</p>
                        {existingData.map((item, i) => (
                          <div key={`existing-${i}`} className={cn('flex items-start gap-2.5 px-3 py-2 rounded-lg', cat.bgColor)}>
                            <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0', cat.color.replace('text-', 'bg-'))} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-700">{item.name}</p>
                              {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                            </div>
                            {item.date && <span className="text-[10px] text-slate-400 flex-shrink-0">{item.date}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Local entries (added this session) */}
                    {localEntries.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nuevos registros</p>
                        {localEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 border border-dashed border-slate-200">
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cat.color.replace('text-', 'bg-'))} />
                            <p className="flex-1 text-sm text-slate-700">{entry.text}</p>
                            <button
                              onClick={() => handleRemoveEntry(cat.id, entry.id)}
                              className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new entry */}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        placeholder={cat.placeholder}
                        value={newEntryText[cat.id] || ''}
                        onChange={e => setNewEntryText(prev => ({ ...prev, [cat.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddEntry(cat.id); }}
                        className={cn(
                          'flex-1 px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all',
                          `border-slate-200 focus:${cat.borderColor} focus:ring-${cat.color.split('-')[1]}-200`
                        )}
                      />
                      <button
                        onClick={() => handleAddEntry(cat.id)}
                        disabled={!newEntryText[cat.id]?.trim()}
                        className={cn(
                          'flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40',
                          `bg-${cat.color.split('-')[1]}-600 hover:bg-${cat.color.split('-')[1]}-700`,
                          // Fallback with explicit colors
                          cat.id === 'pathological' && 'bg-red-600 hover:bg-red-700',
                          cat.id === 'non-pathological' && 'bg-emerald-600 hover:bg-emerald-700',
                          cat.id === 'surgical' && 'bg-blue-600 hover:bg-blue-700',
                          cat.id === 'traumatic' && 'bg-amber-600 hover:bg-amber-700',
                          cat.id === 'family' && 'bg-violet-600 hover:bg-violet-700',
                        )}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </button>
                    </div>

                    {/* Empty state */}
                    {existingData.length === 0 && localEntries.length === 0 && (
                      <div className="text-center py-4 mt-2">
                        <AlertCircle className="h-6 w-6 text-slate-200 mx-auto mb-1" />
                        <p className="text-xs text-slate-400">Sin registros. Agregue antecedentes usando el campo de arriba.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
