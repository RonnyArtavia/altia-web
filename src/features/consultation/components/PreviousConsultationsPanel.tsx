/**
 * PreviousConsultationsPanel - Tab 3: Consultas Anteriores
 * Lista de encuentros/consultas anteriores agrupados y ordenados por fecha
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  FileText,
  MessageSquare,
  Search,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConsultationEntry } from '../types/medical-notes';

interface PreviousConsultationsPanelProps {
  encounters: ConsultationEntry[];
}

// ── Helpers ──────────────────────────────────────────────────

function groupByMonth(encounters: ConsultationEntry[]): Record<string, ConsultationEntry[]> {
  const groups: Record<string, ConsultationEntry[]> = {};

  for (const enc of encounters) {
    // Parse the date from various formats
    let dateObj: Date | null = null;
    if (enc.date) {
      // Try DD/MM/YYYY
      const parts = enc.date.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      }
      if (!dateObj || isNaN(dateObj.getTime())) {
        dateObj = new Date(enc.date);
      }
    }

    const key = dateObj && !isNaN(dateObj.getTime())
      ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
      : 'Sin fecha';

    if (!groups[key]) groups[key] = [];
    groups[key].push(enc);
  }

  // Sort each group by date descending
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      return db.getTime() - da.getTime();
    });
  }

  return groups;
}

function parseDate(dateStr?: string): Date {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function formatMonthLabel(key: string): string {
  if (key === 'Sin fecha') return key;
  const [year, month] = key.split('-');
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${months[Number(month) - 1]} ${year}`;
}

function typeColor(type?: string): { bg: string; text: string } {
  const t = (type || '').toLowerCase();
  if (t.includes('urgencia') || t.includes('emergencia'))
    return { bg: 'bg-red-50', text: 'text-red-700' };
  if (t.includes('control'))
    return { bg: 'bg-blue-50', text: 'text-blue-700' };
  if (t.includes('tele'))
    return { bg: 'bg-violet-50', text: 'text-violet-700' };
  if (t.includes('especializa'))
    return { bg: 'bg-amber-50', text: 'text-amber-700' };
  if (t.includes('preventiva'))
    return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
  return { bg: 'bg-slate-50', text: 'text-slate-600' };
}

// ── Main Component ──────────────────────────────────────────

export function PreviousConsultationsPanel({ encounters }: PreviousConsultationsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sort encounters by date descending
  const sortedEncounters = useMemo(() => {
    const filtered = searchTerm
      ? encounters.filter(e =>
          (e.summary || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.doctor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (e.patientNote || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      : encounters;

    return [...filtered].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [encounters, searchTerm]);

  const grouped = useMemo(() => groupByMonth(sortedEncounters), [sortedEncounters]);
  const sortedKeys = Object.keys(grouped).sort().reverse();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── Hero Title ── */}
      <h2 className="text-[36px] font-black text-slate-500 leading-none tracking-tight">Historial</h2>

      {/* ── Header with search ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Clock className="h-4 w-4 text-violet-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Consultas Anteriores</h3>
          <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            {encounters.length} registros
          </span>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en consultas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
          />
        </div>
      </div>

      {/* ── Empty state ── */}
      {sortedEncounters.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Inbox className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-slate-600 mb-1">No hay consultas anteriores</h4>
          <p className="text-sm text-slate-400">
            {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'Las consultas previas aparecerán aquí.'}
          </p>
        </div>
      )}

      {/* ── Grouped list ── */}
      {sortedKeys.map(monthKey => (
        <div key={monthKey} className="space-y-3">
          {/* Month header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">{formatMonthLabel(monthKey)}</span>
            </div>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] text-slate-400">{grouped[monthKey].length} consulta(s)</span>
          </div>

          {/* Encounters in this month */}
          <div className="space-y-2">
            {grouped[monthKey].map((enc) => {
              const isExpanded = expandedId === enc.id;
              const colors = typeColor(enc.type);

              return (
                <div key={enc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : enc.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-xl flex flex-col items-center justify-center border border-indigo-100">
                      <span className="text-lg font-bold text-indigo-700 leading-none">
                        {enc.date?.split('/')[0] || '--'}
                      </span>
                      <span className="text-[9px] font-medium text-indigo-500">
                        {enc.date?.split('/')[1] ? `/${enc.date.split('/')[1]}` : ''}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
                          {enc.type || 'Consulta'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">{enc.summary || 'Sin resumen disponible'}</p>
                    </div>

                    {/* Doctor */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <User className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-500 whitespace-nowrap">{enc.doctor || 'N/E'}</span>
                    </div>

                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-slate-100 bg-slate-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Clinical summary */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Resumen Clínico</span>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed bg-white rounded-lg p-3 border border-slate-100">
                            {enc.summary || 'No disponible'}
                          </p>
                        </div>

                        {/* Patient note */}
                        {enc.patientNote && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nota del Paciente</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed bg-emerald-50/50 rounded-lg p-3 border border-emerald-100 italic">
                              "{enc.patientNote}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200">
                        <span className="text-xs text-slate-400">📅 {enc.date || 'Sin fecha'}</span>
                        <span className="text-xs text-slate-400">👨‍⚕️ {enc.doctor || 'No especificado'}</span>
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
                          {enc.type}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
