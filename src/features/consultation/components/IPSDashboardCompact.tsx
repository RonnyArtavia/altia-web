/**
 * IPSDashboardCompact - Responsive IPS Dashboard
 * Matches the original design and functionality
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Pill,
  Stethoscope,
  Syringe,
  Calendar,
  User,
  Users,
  FileHeart,
  AlertTriangle,
  X,
  Info,
  ClipboardList,
  FlaskConical,
  Activity,
  Heart,
  Thermometer,
  Droplet,
  MoreVertical,
  FileText,
  TestTube,
} from 'lucide-react';
import type { IPSDisplayData, VitalSignsData } from '../types/medical-notes';

interface IPSItem {
  name?: string;
  severity?: string;
  status?: string;
  site?: string;
  dose?: string;
  date?: string;
  doctor?: string;
  notes?: string;
  value?: string;
  unit?: string;
  flag?: string;
  referenceRange?: string;
  type?: string;
  priority?: string;
  summary?: string; // For clinical evolution
  patientNote?: string; // For clinical evolution
  warning?: string;    // Critical: Warning text for medications
  warningLevel?: 'info' | 'warning' | 'critical'; // Warning severity
  frequency?: string;  // Medication frequency
  duration?: string;   // Treatment duration
  route?: string;      // Administration route
  relationship?: string; // Family history relationship
  category?: string;     // Personal history category
}

type DetailPanelType = 'allergies' | 'medications' | 'conditions' | 'vaccines' | 'orders' | 'labResults' | 'clinicalEvolution' | 'familyHistory' | 'personalHistory';

interface DetailPanelProps {
  item: IPSItem | null;
  type: DetailPanelType | null;
  onClose: () => void;
}

function DetailPanel({ item, type, onClose }: DetailPanelProps) {
  if (!item || !type) return null;

  const typeConfig = {
    allergies: {
      title: 'Alergia',
      headerBg: 'bg-rose-50',
      titleColor: 'text-rose-600',
      icon: <AlertCircle size={18} className="text-rose-500" />
    },
    medications: {
      title: 'Medicamento',
      headerBg: 'bg-indigo-50',
      titleColor: 'text-indigo-600',
      icon: <Pill size={18} className="text-indigo-500" />
    },
    conditions: {
      title: 'Diagnóstico',
      headerBg: 'bg-blue-50',
      titleColor: 'text-blue-600',
      icon: <Stethoscope size={18} className="text-blue-500" />
    },
    vaccines: {
      title: 'Vacuna',
      headerBg: 'bg-emerald-50',
      titleColor: 'text-emerald-600',
      icon: <Syringe size={18} className="text-emerald-500" />
    },
    orders: {
      title: 'Orden Médica',
      headerBg: 'bg-teal-50',
      titleColor: 'text-teal-600',
      icon: <ClipboardList size={18} className="text-teal-500" />
    },
    labResults: {
      title: 'Resultado de Laboratorio',
      headerBg: 'bg-purple-50',
      titleColor: 'text-purple-600',
      icon: <FlaskConical size={18} className="text-purple-500" />
    },
    clinicalEvolution: {
      title: 'Evolución Clínica',
      headerBg: 'bg-orange-50',
      titleColor: 'text-orange-600',
      icon: <FileText size={18} className="text-orange-500" />
    },
    familyHistory: {
      title: 'Antecedente Familiar',
      headerBg: 'bg-violet-50',
      titleColor: 'text-violet-600',
      icon: <Users size={18} className="text-violet-500" />
    },
    personalHistory: {
      title: 'Antecedente Personal',
      headerBg: 'bg-fuchsia-50',
      titleColor: 'text-fuchsia-600',
      icon: <User size={18} className="text-fuchsia-500" />
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-card-hover border border-clinical-200/50 w-full max-w-sm sm:max-w-md md:max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b border-clinical-100/50 flex items-center justify-between ${config.headerBg} rounded-t-2xl relative overflow-hidden`}>
          <div className="flex items-center gap-3 relative z-10">
            {config.icon}
            <span className={`text-sm font-bold uppercase tracking-wide ${config.titleColor}`}>
              {config.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/70 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/40"
          >
            <X size={16} className="text-clinical-400" />
          </button>
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 ease-out" />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <h3 className="font-bold text-clinical-900 text-lg sm:text-xl leading-tight break-words">
            {item.name || 'Sin nombre'}
          </h3>

          <div className="space-y-3 text-sm">
            {type === 'allergies' && item.severity && (
              <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg border border-rose-100">
                <AlertTriangle size={16} className="text-rose-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide block">Severidad</span>
                  <span className="text-rose-700 font-medium">{item.severity}</span>
                </div>
              </div>
            )}

            {type === 'medications' && item.dose && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <Pill size={16} className="text-indigo-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide block">Dosis</span>
                  <span className="text-indigo-700 font-medium">{item.dose}</span>
                  {item.frequency && (
                    <div className="text-xs text-indigo-600 mt-1">
                      {item.frequency}
                    </div>
                  )}
                  {item.route && (
                    <div className="text-xs text-indigo-600">
                      Vía: {item.route}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Critical: Show medication warnings - exactly like original */}
            {type === 'medications' && item.warning && (
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${
                item.warningLevel === 'critical'
                  ? 'bg-red-50 border-red-200'
                  : item.warningLevel === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <AlertTriangle size={16} className={`shrink-0 ${
                  item.warningLevel === 'critical'
                    ? 'text-red-500'
                    : item.warningLevel === 'warning'
                    ? 'text-amber-500'
                    : 'text-blue-500'
                }`} />
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide block ${
                    item.warningLevel === 'critical'
                      ? 'text-red-400'
                      : item.warningLevel === 'warning'
                      ? 'text-amber-400'
                      : 'text-blue-400'
                  }`}>
                    {item.warningLevel === 'critical' ? 'Alerta Crítica' :
                     item.warningLevel === 'warning' ? 'Advertencia' : 'Información'}
                  </span>
                  <span className={`font-medium text-sm ${
                    item.warningLevel === 'critical'
                      ? 'text-red-700'
                      : item.warningLevel === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}>
                    {item.warning}
                  </span>
                </div>
              </div>
            )}

            {type === 'conditions' && item.status && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Stethoscope size={16} className="text-blue-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide block">Estado</span>
                  <span className="text-blue-600 font-medium">{item.status}</span>
                </div>
              </div>
            )}

            {type === 'vaccines' && item.site && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <Syringe size={16} className="text-emerald-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide block">Sitio</span>
                  <span className="text-emerald-700 font-medium">{item.site}</span>
                </div>
              </div>
            )}

            {type === 'labResults' && item.value && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <FlaskConical size={16} className="text-purple-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide block">Resultado</span>
                  <span className="text-purple-700 font-medium">{item.value} {item.unit}</span>
                  {item.referenceRange && (
                    <div className="text-xs text-purple-500 mt-1">
                      Rango: {item.referenceRange}
                    </div>
                  )}
                </div>
              </div>
            )}

            {type === 'clinicalEvolution' && item.type && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                <FileText size={16} className="text-orange-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide block">Tipo de Consulta</span>
                  <span className="text-orange-700 font-medium">{item.type}</span>
                </div>
              </div>
            )}

            {type === 'clinicalEvolution' && item.summary && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide block mb-2">Resumen</span>
                <p className="text-orange-700 text-sm">{item.summary}</p>
              </div>
            )}

            {type === 'familyHistory' && item.relationship && (
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg border border-violet-100">
                <Users size={16} className="text-violet-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wide block">Parentesco</span>
                  <span className="text-violet-700 font-medium">{item.relationship}</span>
                </div>
              </div>
            )}

            {type === 'personalHistory' && item.category && (
              <div className="flex items-center gap-3 p-3 bg-fuchsia-50 rounded-lg border border-fuchsia-100">
                <User size={16} className="text-fuchsia-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wide block">Categoría</span>
                  <span className="text-fuchsia-700 font-medium">{item.category}</span>
                </div>
              </div>
            )}

            {type === 'orders' && item.type && (
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <ClipboardList size={16} className="text-teal-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block">Tipo</span>
                  <span className="text-teal-700 font-medium">{item.type}</span>
                </div>
              </div>
            )}

            {type === 'orders' && item.status && (
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <Info size={16} className="text-teal-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block">Estado</span>
                  <span className="text-teal-700 font-medium">{item.status}</span>
                </div>
              </div>
            )}

            {type === 'orders' && item.priority && (
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                <AlertTriangle size={16} className="text-teal-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide block">Prioridad</span>
                  <span className="text-teal-700 font-medium">{item.priority}</span>
                </div>
              </div>
            )}

            {item.date && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Calendar size={16} className="text-slate-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Fecha</span>
                  <span className="text-slate-700 font-medium">{item.date}</span>
                </div>
              </div>
            )}

            {item.doctor && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <User size={16} className="text-slate-500 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Registrado por</span>
                  <span className="text-slate-700 font-medium">{item.doctor}</span>
                </div>
              </div>
            )}

            {item.notes && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Notas</span>
                <p className="text-slate-700 text-sm">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface IPSCardProps {
  title: string;
  icon: React.ReactNode;
  items: IPSItem[];
  colorScheme: string;
  onItemClick: (item: IPSItem) => void;
}

function IPSCard({ title, icon, items, colorScheme, onItemClick }: IPSCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-clinical-200/50 shadow-card hover:shadow-card-hover hover:border-clinical-300/50 hover:scale-[1.02] transition-all duration-300 group animate-fade-in">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-clinical-100/50 bg-gradient-to-br ${colorScheme} rounded-t-2xl relative overflow-hidden`}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-white/90 rounded-xl backdrop-blur-sm shadow-sm border border-white/40 group-hover:shadow-md transition-all duration-300">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-clinical-900 tracking-tight">{title}</h3>
          </div>
          <span className="text-xs font-semibold text-clinical-700 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/50 shadow-sm group-hover:shadow-md transition-all duration-300">
            {items.length}
          </span>
        </div>
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
      </div>

      {/* Content */}
      <div className="p-3 sm:p-5">
        {items.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-clinical-400 text-sm font-medium">Sin registros disponibles</div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 4).map((item, index) => (
              <div
                key={index}
                onClick={() => onItemClick(item)}
                className="p-3 sm:p-4 bg-clinical-50/60 hover:bg-clinical-100/70 rounded-xl cursor-pointer transition-all duration-200 border border-clinical-100/40 hover:border-clinical-200/60 hover:shadow-sm group backdrop-blur-sm hover:scale-[1.01] animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="space-y-3">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-clinical-900 text-sm leading-tight flex-1">
                      {item.name}
                    </div>
                    <div className="text-clinical-400 flex-shrink-0">
                      <MoreVertical size={14} />
                    </div>
                  </div>

                  {/* Main info - responsive stack on mobile */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    {/* Primary info badge */}
                    {(item.dose || item.status || item.severity || item.value) && (
                      <div className="text-clinical-700 font-semibold px-2.5 py-1.5 bg-white/90 rounded-lg border border-white/40 shadow-sm text-xs w-fit max-w-full truncate">
                        {item.dose || item.status || item.severity || (item.value && `${item.value} ${item.unit || ''}`)}
                      </div>
                    )}

                    {/* Date info */}
                    {item.date && (
                      <div className="text-clinical-500 flex items-center gap-1.5 px-2 py-1 bg-clinical-50/80 rounded-md text-xs w-fit max-w-full">
                        <Calendar size={12} className="text-clinical-400 flex-shrink-0" />
                        <span className="font-mono font-medium text-xs sm:text-xs truncate">{item.date}</span>
                      </div>
                    )}

                    {/* Critical: Show medication warning indicator - responsive */}
                    {title === 'Medicamentos' && item.warning && (
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs w-fit ${
                        item.warningLevel === 'critical'
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : item.warningLevel === 'warning'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        <AlertTriangle size={11} className={`flex-shrink-0 ${
                          item.warningLevel === 'critical'
                            ? 'text-red-500'
                            : item.warningLevel === 'warning'
                            ? 'text-amber-500'
                            : 'text-blue-500'
                        }`} />
                        <span className="font-medium">
                          {item.warningLevel === 'critical' ? 'Crítico' :
                           item.warningLevel === 'warning' ? 'Atención' : 'Info'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contextual information with responsive styling */}
                  <div className="space-y-2">
                    {(title === 'Antecedentes Familiares' && item.relationship) && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-lg border border-violet-100 w-fit">
                        <Users size={11} className="text-violet-500 flex-shrink-0" />
                        <span className="truncate">{item.relationship}</span>
                      </div>
                    )}

                    {(title === 'Antecedentes Personales' && item.category) && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-fuchsia-50 text-fuchsia-700 text-xs font-medium rounded-lg border border-fuchsia-100 w-fit">
                        <div className="w-1.5 h-1.5 bg-fuchsia-500 rounded-full flex-shrink-0"></div>
                        <span className="truncate">{item.category}</span>
                      </div>
                    )}

                    {(title === 'Diagnósticos' && item.status) && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100 w-fit">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="truncate">{item.status}</span>
                      </div>
                    )}

                    {(title === 'Evolución Clínica' && item.summary) && (
                      <div className="text-xs text-clinical-700 font-medium bg-gradient-to-r from-indigo-50 to-blue-50 px-3 py-2 rounded-lg border border-indigo-100">
                        <span className="line-clamp-2">{item.summary}</span>
                      </div>
                    )}

                    {(title === 'Evolución Clínica' && item.doctor) && (
                      <div className="text-xs text-clinical-600 flex items-center gap-1.5 w-fit">
                        <User size={11} className="text-clinical-400 flex-shrink-0" />
                        <span className="truncate">Dr. {item.doctor}</span>
                      </div>
                    )}

                    {(title === 'Resultados de Laboratorio' && item.flag) && (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg border w-fit ${
                        item.flag === 'Alto' || item.flag === 'Crítico Alto' ? 'bg-red-50 text-red-700 border-red-200' :
                        item.flag === 'Bajo' || item.flag === 'Crítico Bajo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.flag === 'Anormal' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-green-50 text-green-700 border-green-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          item.flag === 'Alto' || item.flag === 'Crítico Alto' ? 'bg-red-500' :
                          item.flag === 'Bajo' || item.flag === 'Crítico Bajo' ? 'bg-amber-500' :
                          item.flag === 'Anormal' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}></div>
                        <span className="truncate">{item.flag}</span>
                      </div>
                    )}

                    {(title === 'Órdenes de Laboratorio' && item.priority) && (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg border w-fit ${
                        item.priority === 'Urgente' || item.priority === 'STAT' ? 'bg-red-50 text-red-700 border-red-200' :
                        item.priority === 'Lo antes posible' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-clinical-50 text-clinical-600 border-clinical-200'
                      }`}>
                        <AlertTriangle size={11} className={`flex-shrink-0 ${
                          item.priority === 'Urgente' || item.priority === 'STAT' ? 'text-red-500' :
                          item.priority === 'Lo antes posible' ? 'text-amber-500' : 'text-clinical-400'
                        }`} />
                        <span className="truncate">{item.priority}</span>
                      </div>
                    )}

                    {(title === 'Órdenes de Laboratorio' && item.status) && (
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-lg border w-fit ${
                        item.status === 'Completada' ? 'bg-green-50 text-green-700 border-green-200' :
                        item.status === 'Activa' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        item.status === 'Cancelada' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-clinical-50 text-clinical-600 border-clinical-200'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          item.status === 'Completada' ? 'bg-green-500' :
                          item.status === 'Activa' ? 'bg-blue-500' :
                          item.status === 'Cancelada' ? 'bg-red-500' : 'bg-clinical-400'
                        }`}></div>
                        <span className="truncate">{item.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {items.length > 4 && (
              <div className="text-center py-2">
                <span className="text-xs text-slate-500">
                  +{items.length - 4} más
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface IPSDashboardCompactProps {
  ipsData: IPSDisplayData;
  vitalSigns?: VitalSignsData | null;
}

export function IPSDashboardCompact({ ipsData, vitalSigns }: IPSDashboardCompactProps) {
  const [selectedItem, setSelectedItem] = useState<IPSItem | null>(null);
  const [selectedType, setSelectedType] = useState<DetailPanelType | null>(null);

  const handleItemClick = (item: IPSItem, type: DetailPanelType) => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setSelectedType(null);
  };

  return (
    <div className="space-y-8">
      {/* Vital Signs - if available */}
      {vitalSigns && (
        <div className="bg-gradient-to-br from-clinical-50/90 via-primary-50/80 to-accent-50/70 rounded-2xl p-6 border border-clinical-200/50 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-white/90 rounded-xl backdrop-blur-sm shadow-sm border border-white/50">
              <Heart className="text-primary-600" size={20} />
            </div>
            <h3 className="font-bold text-clinical-900 tracking-tight text-lg">Signos Vitales</h3>
            {vitalSigns.measurementDate && (
              <span className="ml-auto text-xs font-semibold text-clinical-600 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/50 shadow-sm">
                {vitalSigns.measurementDate}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {vitalSigns.bloodPressure && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/60 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                <div className="text-lg sm:text-xl font-bold text-clinical-900 mb-1 truncate">{vitalSigns.bloodPressure}</div>
                <div className="text-xs text-clinical-600 font-semibold">Presión Arterial</div>
              </div>
            )}
            {vitalSigns.heartRate && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/60 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                <div className="text-lg sm:text-xl font-bold text-clinical-900 mb-1 truncate">{vitalSigns.heartRate}</div>
                <div className="text-xs text-clinical-600 font-semibold">FC (bpm)</div>
              </div>
            )}
            {vitalSigns.temperature && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/60 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                <div className="text-lg sm:text-xl font-bold text-clinical-900 mb-1 truncate">{vitalSigns.temperature}°C</div>
                <div className="text-xs text-clinical-600 font-semibold">Temperatura</div>
              </div>
            )}
            {vitalSigns.oxygenSaturation && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/60 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
                <div className="text-lg sm:text-xl font-bold text-clinical-900 mb-1 truncate">{vitalSigns.oxygenSaturation}%</div>
                <div className="text-xs text-clinical-600 font-semibold">SpO₂</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IPS Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 animate-stagger-1">
        {/* Allergies */}
        <IPSCard
          title="Alergias"
          icon={<AlertCircle size={16} className="text-danger-600" />}
          items={ipsData.allergies || []}
          colorScheme="from-danger-50/90 via-rose-50/80 to-pink-50/70"
          onItemClick={(item) => handleItemClick(item, 'allergies')}
        />

        {/* Medications */}
        <IPSCard
          title="Medicamentos"
          icon={<Pill size={16} className="text-primary-600" />}
          items={ipsData.medications || []}
          colorScheme="from-primary-50/90 via-indigo-50/80 to-violet-50/70"
          onItemClick={(item) => handleItemClick(item, 'medications')}
        />

        {/* Conditions - renamed to Diagnósticos */}
        <IPSCard
          title="Diagnósticos"
          icon={<Stethoscope size={16} className="text-accent-600" />}
          items={ipsData.conditions || []}
          colorScheme="from-accent-50/90 via-sky-50/80 to-cyan-50/70"
          onItemClick={(item) => handleItemClick(item, 'conditions')}
        />

        {/* Vaccines */}
        <IPSCard
          title="Vacunas"
          icon={<Syringe size={16} className="text-success-600" />}
          items={ipsData.vaccines || []}
          colorScheme="from-success-50/90 via-green-50/80 to-teal-50/70"
          onItemClick={(item) => handleItemClick(item, 'vaccines')}
        />

        {/* Family History */}
        {ipsData.familyHistory && ipsData.familyHistory.length > 0 && (
          <IPSCard
            title="Antecedentes Familiares"
            icon={<Users size={16} className="text-violet-600" />}
            items={ipsData.familyHistory}
            colorScheme="from-violet-50/90 via-purple-50/80 to-fuchsia-50/70"
            onItemClick={(item) => handleItemClick(item, 'familyHistory')}
          />
        )}

        {/* Personal History */}
        {ipsData.personalHistory && ipsData.personalHistory.length > 0 && (
          <IPSCard
            title="Antecedentes Personales"
            icon={<User size={16} className="text-fuchsia-600" />}
            items={ipsData.personalHistory}
            colorScheme="from-fuchsia-50/90 via-pink-50/80 to-rose-50/70"
            onItemClick={(item) => handleItemClick(item, 'personalHistory')}
          />
        )}

        {/* Clinical Evolution */}
        {ipsData.clinicalEvolution && ipsData.clinicalEvolution.length > 0 && (
          <IPSCard
            title="Evolución Clínica"
            icon={<FileText size={16} className="text-indigo-600" />}
            items={ipsData.clinicalEvolution}
            colorScheme="from-indigo-50/80 via-blue-50/60 to-slate-50/80"
            onItemClick={(item) => handleItemClick(item, 'clinicalEvolution')}
          />
        )}

        {/* Lab Orders - Órdenes de Laboratorio */}
        {ipsData.labOrders && ipsData.labOrders.length > 0 && (
          <IPSCard
            title="Órdenes de Laboratorio"
            icon={<ClipboardList size={16} className="text-amber-600" />}
            items={ipsData.labOrders}
            colorScheme="from-amber-50/80 via-yellow-50/60 to-orange-50/80"
            onItemClick={(item) => handleItemClick(item, 'orders')}
          />
        )}

        {/* Lab Results - Resultados de Laboratorio */}
        {ipsData.labResults && ipsData.labResults.length > 0 && (
          <IPSCard
            title="Resultados de Laboratorio"
            icon={<TestTube size={16} className="text-violet-600" />}
            items={ipsData.labResults}
            colorScheme="from-violet-50/80 via-purple-50/60 to-fuchsia-50/80"
            onItemClick={(item) => handleItemClick(item, 'labResults')}
          />
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        item={selectedItem}
        type={selectedType}
        onClose={closeDetail}
      />
    </div>
  );
}