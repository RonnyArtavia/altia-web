/**
 * ClinicalSummaryIPS - Tab 1: Resumen Clínico basado en estándar IPS
 * Muestra: resumen narrativo de 5 líneas, alergias, medicamentos (activos/finalizados),
 * diagnósticos (activos/inactivos)
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Pill,
  Stethoscope,
  Shield,
  ChevronDown,
  ChevronRight,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  Wind,
  Scale,
  Ruler,
  TrendingUp,
  FlaskConical,
  Clock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IPSDisplayData, VitalSignsData, PatientRecordDisplay } from '../types/medical-notes';

interface ClinicalSummaryIPSProps {
  ipsData: IPSDisplayData;
  vitalSigns?: VitalSignsData | null;
  patientRecord?: PatientRecordDisplay;
  onOrderClick?: (orderId: string) => void;
  onNavigateToOrders?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────

function severityColor(severity?: string): { bg: string; text: string; dot: string } {
  const s = (severity || '').toLowerCase();
  if (s.includes('alta') || s.includes('sever') || s.includes('critical'))
    return { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' };
  if (s.includes('modera') || s.includes('medium'))
    return { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' };
}

function statusBadge(status?: string): { bg: string; text: string; label: string } {
  const s = (status || '').toLowerCase();
  if (s === 'activa' || s === 'active' || s === 'crónica' || s === 'chronic')
    return { bg: 'bg-blue-50', text: 'text-blue-700', label: status || 'Activo' };
  if (s === 'resuelta' || s === 'resolved')
    return { bg: 'bg-green-50', text: 'text-green-700', label: 'Resuelta' };
  if (s === 'inactiva' || s === 'inactive')
    return { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Inactiva' };
  return { bg: 'bg-slate-50', text: 'text-slate-600', label: status || 'Desconocido' };
}

function isActiveMed(status?: string): boolean {
  if (!status) return true; // No status = assume active
  const s = status.toLowerCase();
  return s === 'active' || s === 'activo' || s === 'activa';
}

function isActiveDx(status?: string): boolean {
  const s = (status || '').toLowerCase();
  return s !== 'resuelta' && s !== 'inactiva' && s !== 'resolved' && s !== 'inactive';
}

// ─── Sub-components ───────────────────────────────────────────

function VitalSignsBar({ vitalSigns }: { vitalSigns: VitalSignsData }) {
  const items = [
    { icon: Heart, label: 'PA', value: vitalSigns.bloodPressure, unit: 'mmHg', color: 'text-red-500' },
    { icon: Activity, label: 'FC', value: vitalSigns.heartRate, unit: 'lpm', color: 'text-rose-500' },
    { icon: Thermometer, label: 'Temp', value: vitalSigns.temperature, unit: '°C', color: 'text-orange-500' },
    { icon: Droplet, label: 'SpO₂', value: vitalSigns.oxygenSaturation, unit: '%', color: 'text-blue-500' },
    { icon: Wind, label: 'FR', value: vitalSigns.respiratoryRate, unit: 'rpm', color: 'text-teal-500' },
    { icon: Scale, label: 'Peso', value: vitalSigns.weight, unit: 'kg', color: 'text-indigo-500' },
    { icon: Ruler, label: 'Talla', value: vitalSigns.height, unit: 'cm', color: 'text-violet-500' },
    { icon: TrendingUp, label: 'IMC', value: vitalSigns.bmi, unit: '', color: 'text-emerald-500' },
  ].filter(i => i.value !== undefined && i.value !== null && i.value !== '');

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
          <item.icon className={cn('h-4 w-4 mb-1', item.color)} />
          <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
          <span className="text-sm font-bold text-slate-800">{item.value}</span>
          {item.unit && <span className="text-[10px] text-slate-400">{item.unit}</span>}
        </div>
      ))}
    </div>
  );
}

function ToggleTabs({ tabs, activeTab, onTabChange }: {
  tabs: { id: string; label: string; count: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all',
            activeTab === tab.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {tab.label}
          <span className={cn(
            'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
            activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
          )}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function ClinicalSummaryIPS({ ipsData, vitalSigns, patientRecord, onOrderClick, onNavigateToOrders }: ClinicalSummaryIPSProps) {
  const [medTab, setMedTab] = useState<'all' | 'active' | 'finished'>('all');
  const [dxTab, setDxTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedAllergies, setExpandedAllergies] = useState(true);

  // ── Generate IPS narrative summary (5 lines) ──
  const generateSummary = (): string[] => {
    const lines: string[] = [];

    // Line 1: Demographics
    const age = patientRecord?.age ?? 'N/E';
    const gender = patientRecord?.gender || 'no especificado';
    lines.push(`Paciente de ${age} años, sexo ${gender}.`);

    // Line 2: Active diagnoses
    const activeDx = ipsData.conditions.filter(c => isActiveDx(c.status));
    if (activeDx.length > 0) {
      const names = activeDx.slice(0, 4).map(c => c.name).join(', ');
      lines.push(`Diagnósticos activos: ${names}${activeDx.length > 4 ? ` (+${activeDx.length - 4})` : ''}.`);
    } else {
      lines.push('Sin diagnósticos activos registrados.');
    }

    // Line 3: Allergies
    if (ipsData.allergies.length > 0) {
      const names = ipsData.allergies.slice(0, 3).map(a => {
        const sev = a.severity ? ` (${a.severity})` : '';
        return `${a.name}${sev}`;
      }).join(', ');
      lines.push(`Alergias: ${names}.`);
    } else {
      lines.push('Sin alergias conocidas (NKDA).');
    }

    // Line 4: Current medications
    const activeMeds = ipsData.medications.filter(m => isActiveMed(m.status));
    if (activeMeds.length > 0) {
      const names = activeMeds.slice(0, 4).map(m => m.name).join(', ');
      lines.push(`Tratamiento actual: ${names}${activeMeds.length > 4 ? ` (+${activeMeds.length - 4})` : ''}.`);
    } else {
      lines.push('Sin medicamentos activos.');
    }

    // Line 5: Last encounter
    if (ipsData.encounters.length > 0) {
      const last = ipsData.encounters[0];
      const summary = (last.summary || 'Sin resumen').slice(0, 100);
      lines.push(`Última consulta (${last.date}): ${summary}${(last.summary?.length || 0) > 100 ? '...' : ''}`);
    } else {
      lines.push('Sin consultas previas registradas.');
    }

    return lines;
  };

  const summaryLines = generateSummary();

  // ── Split medications ──
  const activeMeds = ipsData.medications.filter(m => isActiveMed(m.status));
  const finishedMeds = ipsData.medications.filter(m => !isActiveMed(m.status));

  // ── Split diagnoses ──
  const activeDx = ipsData.conditions.filter(c => isActiveDx(c.status));
  const inactiveDx = ipsData.conditions.filter(c => !isActiveDx(c.status));

  const displayMeds = medTab === 'all' ? ipsData.medications : medTab === 'active' ? activeMeds : finishedMeds;
  const displayDx = dxTab === 'all' ? ipsData.conditions : dxTab === 'active' ? activeDx : inactiveDx;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ── IPS Narrative Summary ── */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-2xl border border-indigo-100 p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Shield className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Resumen Clínico IPS</h3>
          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
            International Patient Summary
          </span>
        </div>
        <div className="space-y-1 pl-9">
          {summaryLines.map((line, i) => (
            <p key={i} className="text-sm text-slate-600 leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* ── Vital Signs ── */}
      {vitalSigns && <VitalSignsBar vitalSigns={vitalSigns} />}

      {/* ── Three-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Alergias ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedAllergies(!expandedAllergies)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-rose-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Alergias</h3>
              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                {ipsData.allergies.length}
              </span>
            </div>
            {expandedAllergies ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
          </button>

          {expandedAllergies && (
            <div className="px-5 pb-4 space-y-2">
              {ipsData.allergies.length === 0 ? (
                <div className="py-4 text-center">
                  <Shield className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-sm text-emerald-600 font-medium">Sin alergias conocidas</p>
                  <p className="text-xs text-slate-400">NKDA</p>
                </div>
              ) : (
                ipsData.allergies.map((allergy, i) => {
                  const colors = severityColor(allergy.severity);
                  return (
                    <div key={i} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl', colors.bg)}>
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold', colors.text)}>{allergy.name}</p>
                        {allergy.notes && <p className="text-xs text-slate-500 mt-0.5">{allergy.notes}</p>}
                      </div>
                      {allergy.severity && (
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', colors.bg, colors.text)}>
                          {allergy.severity}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Medicamentos ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <Pill className="h-4 w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Medicamentos</h3>
            </div>
            <ToggleTabs
              activeTab={medTab}
              onTabChange={(id) => setMedTab(id as 'all' | 'active' | 'finished')}
              tabs={[
                { id: 'all', label: 'Todos', count: ipsData.medications.length },
                { id: 'active', label: 'Activos', count: activeMeds.length },
                { id: 'finished', label: 'Finalizados', count: finishedMeds.length },
              ]}
            />
          </div>

          <div className="px-5 pb-4 space-y-2 overflow-y-auto custom-scrollbar">
            {displayMeds.length === 0 ? (
              <div className="py-4 text-center">
                <Pill className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {medTab === 'all' ? 'Sin medicamentos registrados' : medTab === 'active' ? 'Sin medicamentos activos' : 'Sin medicamentos finalizados'}
                </p>
              </div>
            ) : (
              displayMeds.map((med, i) => {
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
                      {med.warning && (
                        <p className={cn(
                          'text-xs mt-1 px-2 py-0.5 rounded inline-block',
                          med.warningLevel === 'critical' ? 'bg-red-50 text-red-600' :
                          med.warningLevel === 'warning' ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        )}>
                          ⚠ {med.warning}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {medTab === 'all' && (
                        <span className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          medIsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        )}>
                          {medIsActive ? 'Activo' : (med.status || 'Finalizado')}
                        </span>
                      )}
                      {med.date && <span className="text-[10px] text-slate-400 whitespace-nowrap">{med.date}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Diagnósticos ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <Stethoscope className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Diagnósticos</h3>
            </div>
            <ToggleTabs
              activeTab={dxTab}
              onTabChange={(id) => setDxTab(id as 'all' | 'active' | 'inactive')}
              tabs={[
                { id: 'all', label: 'Todos', count: ipsData.conditions.length },
                { id: 'active', label: 'Activos', count: activeDx.length },
                { id: 'inactive', label: 'Inactivos', count: inactiveDx.length },
              ]}
            />
          </div>

          <div className="px-5 pb-4 space-y-2 overflow-y-auto custom-scrollbar">
            {displayDx.length === 0 ? (
              <div className="py-4 text-center">
                <Stethoscope className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {dxTab === 'all' ? 'Sin diagnósticos registrados' : dxTab === 'active' ? 'Sin diagnósticos activos' : 'Sin diagnósticos inactivos'}
                </p>
              </div>
            ) : (
              displayDx.map((dx, i) => {
                const badge = statusBadge(dx.status);
                const dxIsActive = isActiveDx(dx.status);
                return (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className={cn(
                      'mt-0.5 w-2 h-2 rounded-full flex-shrink-0',
                      dxIsActive ? 'bg-blue-500' : 'bg-slate-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{dx.name}</p>
                      {dx.notes && <p className="text-xs text-slate-500 mt-0.5">{dx.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', badge.bg, badge.text)}>
                        {badge.label}
                      </span>
                      {dx.date && <span className="text-[10px] text-slate-400">{dx.date}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Órdenes Recientes ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <FlaskConical className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Órdenes Recientes</h3>
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {(ipsData.labOrders || []).length + (ipsData.labResults || []).length}
            </span>
          </div>
          {onNavigateToOrders && (
            <button
              onClick={onNavigateToOrders}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Ver todas <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="px-5 py-3 space-y-2">
          {(() => {
            const allOrders = [
              ...(ipsData.labOrders || []).map(o => ({
                id: o.name || 'orden',
                name: o.name || 'Orden sin nombre',
                date: o.date,
                status: o.status,
                type: 'order' as const,
                result: undefined as string | undefined,
                flag: undefined as string | undefined,
              })),
              ...(ipsData.labResults || []).map(r => ({
                id: r.name || 'resultado',
                name: r.name || 'Resultado sin nombre',
                date: r.date,
                status: 'Completada',
                type: 'result' as const,
                result: r.value ? `${r.value}${r.unit ? ` ${r.unit}` : ''}` : undefined,
                flag: r.flag,
              })),
            ].slice(0, 6);

            if (allOrders.length === 0) {
              return (
                <div className="py-4 text-center">
                  <FlaskConical className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Sin órdenes recientes</p>
                </div>
              );
            }

            return allOrders.map((item, i) => {
              const isComplete = (item.status || '').toLowerCase().includes('complet');
              const isPending = (item.status || '').toLowerCase().includes('pendi');
              return (
                <button
                  key={i}
                  onClick={() => onOrderClick?.(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : isPending ? (
                    <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <FlaskConical className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">{item.name}</p>
                    {item.result && (
                      <p className={cn(
                        'text-xs font-semibold mt-0.5',
                        item.flag === 'high' || item.flag === 'critical' ? 'text-red-600' :
                        item.flag === 'low' ? 'text-blue-600' :
                        item.flag === 'abnormal' ? 'text-amber-600' :
                        'text-emerald-600'
                      )}>
                        Resultado: {item.result}
                        {item.flag && item.flag !== 'normal' && (
                          <span className="ml-1">
                            {item.flag === 'high' ? '↑' : item.flag === 'low' ? '↓' : '⚠'}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {item.status && (
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        isComplete ? 'bg-emerald-50 text-emerald-700' :
                        isPending ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      )}>
                        {item.status}
                      </span>
                    )}
                    {item.date && <span className="text-[10px] text-slate-400">{item.date}</span>}
                  </div>
                  <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </button>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
