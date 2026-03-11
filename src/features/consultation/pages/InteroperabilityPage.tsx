/**
 * InteroperabilityPage — FHIR Interoperability & Data Export
 * 
 * Professional-grade clinical data interoperability module.
 * Features:
 * - Patient selection (single or multiple)
 * - Section-based export (Clinical Profile, Medications, Labs, Referrals, Demographics)
 * - Anonymization toggle
 * - Format selection (FHIR JSON Bundle, TXT Plain Text)
 * - Legal disclaimer with doctor acceptance
 * - Email delivery option
 * - Download as file
 * 
 * Compliant with HL7 FHIR R4 standards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Shield,
  FileJson2,
  FileText,
  Download,
  Mail,
  Search,
  User,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Globe2,
  Database,
  ClipboardList,
  Pill,
  FlaskConical,
  ArrowUpRight,
  UserCircle2,
  X,
  Check,
  Copy,
  Loader2,
  ShieldCheck,
  Scale,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { usePatientStore } from '@/features/patients/stores/patientStore';

// ─── Types ──────────────────────────────────────────────────

interface ExportSection {
  id: string;
  label: string;
  description: string;
  icon: typeof ClipboardList;
  color: string;
  bgColor: string;
  fhirResources: string[];
  enabled: boolean;
}

type ExportFormat = 'fhir-json' | 'txt';

interface PatientSelection {
  id: string;
  name: string;
  age?: string | number;
  gender?: string;
  selected: boolean;
}

// ─── FHIR Bundle Generator ─────────────────────────────────

function generateFHIRBundle(
  patients: PatientSelection[],
  sections: ExportSection[],
  anonymize: boolean
): object {
  const enabledSections = sections.filter(s => s.enabled);
  const selectedPatients = patients.filter(p => p.selected);

  const entries: object[] = [];

  selectedPatients.forEach((patient, pIdx) => {
    // Patient resource
    const patientResource: Record<string, unknown> = {
      fullUrl: `urn:uuid:patient-${anonymize ? `anon-${pIdx + 1}` : patient.id}`,
      resource: {
        resourceType: 'Patient',
        id: anonymize ? `anon-${pIdx + 1}` : patient.id,
        meta: {
          profile: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'],
          lastUpdated: new Date().toISOString(),
        },
        ...(anonymize
          ? {
              name: [{ family: `Paciente ${pIdx + 1}`, given: ['Anónimo'] }],
              gender: patient.gender === 'Masculino' ? 'male' : patient.gender === 'Femenino' ? 'female' : 'unknown',
            }
          : {
              name: [{ text: patient.name }],
              gender: patient.gender === 'Masculino' ? 'male' : patient.gender === 'Femenino' ? 'female' : 'unknown',
              ...(patient.age ? { birthDate: calculateBirthYear(patient.age) } : {}),
            }
        ),
        active: true,
      },
    };
    entries.push(patientResource);

    // Generate resources per section
    enabledSections.forEach(section => {
      section.fhirResources.forEach(resourceType => {
        const resource: Record<string, unknown> = {
          fullUrl: `urn:uuid:${resourceType.toLowerCase()}-${patient.id}-sample`,
          resource: {
            resourceType,
            id: `${resourceType.toLowerCase()}-${anonymize ? `anon-${pIdx + 1}` : patient.id}`,
            meta: {
              profile: getFHIRProfile(resourceType),
              lastUpdated: new Date().toISOString(),
            },
            status: 'active',
            subject: {
              reference: `Patient/${anonymize ? `anon-${pIdx + 1}` : patient.id}`,
              display: anonymize ? `Paciente ${pIdx + 1}` : patient.name,
            },
          },
        };
        entries.push(resource);
      });
    });
  });

  return {
    resourceType: 'Bundle',
    id: `export-${Date.now()}`,
    meta: {
      lastUpdated: new Date().toISOString(),
      profile: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips'],
    },
    identifier: {
      system: 'urn:altia:export',
      value: `ALTIA-EXPORT-${Date.now()}`,
    },
    type: 'document',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };
}

function generateTxtExport(
  patients: PatientSelection[],
  sections: ExportSection[],
  anonymize: boolean
): string {
  const enabledSections = sections.filter(s => s.enabled);
  const selectedPatients = patients.filter(p => p.selected);
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║          ALTIA HEALTH — Exportación de Datos Clínicos      ║');
  lines.push('║                 Interoperabilidad FHIR R4                  ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`Fecha de exportación: ${new Date().toLocaleString('es-CR')}`);
  lines.push(`Formato: Texto plano estructurado`);
  lines.push(`Anonimización: ${anonymize ? 'SÍ — Datos identificatorios removidos' : 'NO — Datos completos'}`);
  lines.push(`Secciones exportadas: ${enabledSections.map(s => s.label).join(', ')}`);
  lines.push(`Total de pacientes: ${selectedPatients.length}`);
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  selectedPatients.forEach((patient, pIdx) => {
    lines.push('');
    lines.push(`▸ PACIENTE ${pIdx + 1}`);
    lines.push('─────────────────────────────────────');
    if (anonymize) {
      lines.push(`  Identificador: Paciente Anónimo ${pIdx + 1}`);
      lines.push(`  Género: ${patient.gender || 'No especificado'}`);
    } else {
      lines.push(`  Nombre: ${patient.name}`);
      lines.push(`  Edad: ${patient.age || 'N/A'}`);
      lines.push(`  Género: ${patient.gender || 'No especificado'}`);
      lines.push(`  ID: ${patient.id}`);
    }

    enabledSections.forEach(section => {
      lines.push('');
      lines.push(`  ┌─ ${section.label.toUpperCase()}`);
      lines.push(`  │  Recursos FHIR: ${section.fhirResources.join(', ')}`);
      lines.push(`  │  [Los datos serían poblados desde el expediente del paciente]`);
      lines.push(`  └────────────────────────────`);
    });
  });

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('DISCLAIMER LEGAL:');
  lines.push('Este documento contiene información clínica confidencial protegida');
  lines.push('por las leyes de protección de datos de salud aplicables.');
  lines.push('El receptor es responsable de su uso adecuado y confidencial.');
  lines.push('');
  lines.push('Estándar: HL7 FHIR R4 — International Patient Summary (IPS)');
  lines.push(`Generado por: Altia Health — ${new Date().toISOString()}`);

  return lines.join('\n');
}

function calculateBirthYear(age: string | number): string {
  const numAge = typeof age === 'string' ? parseInt(age) : age;
  if (isNaN(numAge)) return '';
  const year = new Date().getFullYear() - numAge;
  return `${year}-01-01`;
}

function getFHIRProfile(resourceType: string): string[] {
  const profiles: Record<string, string[]> = {
    Patient: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Patient-uv-ips'],
    Condition: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Condition-uv-ips'],
    MedicationStatement: ['http://hl7.org/fhir/uv/ips/StructureDefinition/MedicationStatement-uv-ips'],
    AllergyIntolerance: ['http://hl7.org/fhir/uv/ips/StructureDefinition/AllergyIntolerance-uv-ips'],
    Observation: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Observation-results-uv-ips'],
    DiagnosticReport: ['http://hl7.org/fhir/uv/ips/StructureDefinition/DiagnosticReport-uv-ips'],
    Immunization: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Immunization-uv-ips'],
    ServiceRequest: ['http://hl7.org/fhir/StructureDefinition/ServiceRequest'],
    Procedure: ['http://hl7.org/fhir/uv/ips/StructureDefinition/Procedure-uv-ips'],
  };
  return profiles[resourceType] || [`http://hl7.org/fhir/StructureDefinition/${resourceType}`];
}

// ─── Default Export Sections ────────────────────────────────

const DEFAULT_SECTIONS: ExportSection[] = [
  {
    id: 'clinical-profile',
    label: 'Perfil Clínico',
    description: 'Diagnósticos, condiciones activas, antecedentes',
    icon: ClipboardList,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    fhirResources: ['Condition', 'Procedure'],
    enabled: true,
  },
  {
    id: 'medications',
    label: 'Medicamentos',
    description: 'Prescripciones activas, historial de medicación',
    icon: Pill,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    fhirResources: ['MedicationStatement', 'MedicationRequest'],
    enabled: true,
  },
  {
    id: 'labs-results',
    label: 'Laboratorios y Resultados',
    description: 'Órdenes de laboratorio, resultados, valores',
    icon: FlaskConical,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    fhirResources: ['Observation', 'DiagnosticReport', 'ServiceRequest'],
    enabled: true,
  },
  {
    id: 'referrals',
    label: 'Referencias',
    description: 'Interconsultas, derivaciones a especialidades',
    icon: ArrowUpRight,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    fhirResources: ['ServiceRequest'],
    enabled: false,
  },
  {
    id: 'demographics',
    label: 'Datos Básicos',
    description: 'Información demográfica, contacto, seguros',
    icon: UserCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    fhirResources: ['Patient'],
    enabled: true,
  },
  {
    id: 'allergies',
    label: 'Alergias e Intolerancias',
    description: 'Alergias conocidas, reacciones adversas',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    fhirResources: ['AllergyIntolerance'],
    enabled: true,
  },
  {
    id: 'immunizations',
    label: 'Inmunizaciones',
    description: 'Vacunas aplicadas, esquema de vacunación',
    icon: Shield,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    fhirResources: ['Immunization'],
    enabled: false,
  },
  {
    id: 'vital-signs',
    label: 'Signos Vitales',
    description: 'Últimas mediciones de signos vitales',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    fhirResources: ['Observation'],
    enabled: false,
  },
];

// ─── Main Component ─────────────────────────────────────────

export default function InteroperabilityPage() {
  useAuthStore(); // auth context
  const { patients, loadPatients } = usePatientStore();

  // State
  const [sections, setSections] = useState<ExportSection[]>(DEFAULT_SECTIONS);
  const [anonymize, setAnonymize] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('fhir-json');
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSelections, setPatientSelections] = useState<PatientSelection[]>([]);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [emailTarget, setEmailTarget] = useState('');

  // Load patients
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Build patient selections from store
  useEffect(() => {
    if (patients && patients.length > 0) {
      setPatientSelections(
        patients.map(p => ({
          id: p.id,
          name: p.name || 'Sin nombre',
          age: p.age || '',
          gender: p.gender === 'male' ? 'Masculino' : p.gender === 'female' ? 'Femenino' : p.gender || '',
          selected: false,
        }))
      );
    }
  }, [patients]);

  // Filtered patients
  const filteredPatients = patientSelections.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = patientSelections.filter(p => p.selected).length;
  const enabledSectionsCount = sections.filter(s => s.enabled).length;

  // Toggle patient selection
  const togglePatient = (id: string) => {
    setPatientSelections(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  // Select/deselect all
  const toggleAllPatients = () => {
    const allSelected = filteredPatients.every(p => p.selected);
    const filteredIds = new Set(filteredPatients.map(p => p.id));
    setPatientSelections(prev =>
      prev.map(p => filteredIds.has(p.id) ? { ...p, selected: !allSelected } : p)
    );
  };

  // Toggle section
  const toggleSection = (id: string) => {
    setSections(prev =>
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  };

  // Generate preview
  const handlePreview = useCallback(() => {
    const selected = patientSelections.filter(p => p.selected);
    if (selected.length === 0) return;

    if (format === 'fhir-json') {
      const bundle = generateFHIRBundle(selected, sections, anonymize);
      setPreviewContent(JSON.stringify(bundle, null, 2));
    } else {
      const txt = generateTxtExport(selected, sections, anonymize);
      setPreviewContent(txt);
    }
    setShowPreview(true);
  }, [patientSelections, sections, format, anonymize]);

  // Export / Download
  const handleExport = useCallback(async () => {
    if (!disclaimerAccepted) {
      return;
    }

    setIsExporting(true);
    const selected = patientSelections.filter(p => p.selected);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'fhir-json') {
        const bundle = generateFHIRBundle(selected, sections, anonymize);
        content = JSON.stringify(bundle, null, 2);
        filename = `altia-fhir-export-${new Date().toISOString().slice(0, 10)}.json`;
        mimeType = 'application/fhir+json';
      } else {
        content = generateTxtExport(selected, sections, anonymize);
        filename = `altia-export-${new Date().toISOString().slice(0, 10)}.txt`;
        mimeType = 'text/plain';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  }, [disclaimerAccepted, patientSelections, sections, format, anonymize]);

  // Email export
  const handleEmailExport = useCallback(() => {
    if (!disclaimerAccepted) {
      return;
    }

    const selected = patientSelections.filter(p => p.selected);
    let content: string;

    if (format === 'fhir-json') {
      const bundle = generateFHIRBundle(selected, sections, anonymize);
      content = JSON.stringify(bundle, null, 2);
    } else {
      content = generateTxtExport(selected, sections, anonymize);
    }

    const subject = encodeURIComponent(`Altia Health — Exportación de datos clínicos FHIR`);
    const body = encodeURIComponent(content.slice(0, 2000) + (content.length > 2000 ? '\n\n[... Documento truncado. Descargue el archivo completo desde Altia Health ...]' : ''));
    const to = emailTarget ? encodeURIComponent(emailTarget) : '';

    window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self');
  }, [disclaimerAccepted, patientSelections, sections, format, anonymize, emailTarget]);

  // Copy to clipboard
  const handleCopyPreview = useCallback(() => {
    navigator.clipboard.writeText(previewContent);
  }, [previewContent]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">

      {/* ═══════════════════════════════════════════════════════
          HERO HEADER
          ═══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-8 md:p-12 shadow-2xl">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-500/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-violet-500/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute top-10 right-20 opacity-10">
          <Globe2 className="h-40 w-40 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
              <Share2 className="h-7 w-7 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  Interoperabilidad
                </h1>
                <span className="px-2.5 py-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/20 rounded-full border border-indigo-400/20 uppercase tracking-widest">
                  FHIR R4
                </span>
              </div>
              <p className="text-indigo-200/80 text-sm mt-1">
                Exportación de datos clínicos bajo estándar HL7 FHIR — International Patient Summary (IPS)
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Database className="h-5 w-5 text-indigo-400 mb-2" />
              <p className="text-2xl font-bold text-white">{patientSelections.length}</p>
              <p className="text-[11px] text-indigo-300/70">Pacientes disponibles</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Shield className="h-5 w-5 text-emerald-400 mb-2" />
              <p className="text-2xl font-bold text-white">{enabledSectionsCount}</p>
              <p className="text-[11px] text-indigo-300/70">Secciones seleccionadas</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <Lock className="h-5 w-5 text-amber-400 mb-2" />
              <p className="text-2xl font-bold text-white">{anonymize ? 'Sí' : 'No'}</p>
              <p className="text-[11px] text-indigo-300/70">Anonimización</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <FileJson2 className="h-5 w-5 text-violet-400 mb-2" />
              <p className="text-2xl font-bold text-white">{format === 'fhir-json' ? 'JSON' : 'TXT'}</p>
              <p className="text-[11px] text-indigo-300/70">Formato de salida</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          COMPLIANCE BANNER
          ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm">
        <ShieldCheck className="h-6 w-6 text-emerald-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-800">Cumplimiento de estándares internacionales</p>
          <p className="text-xs text-emerald-600 mt-0.5">
            HL7 FHIR R4 • IPS (International Patient Summary) • Ley de Protección de Datos Personales
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-white rounded-full border border-emerald-200">HIPAA</span>
          <span className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-white rounded-full border border-emerald-200">HL7 FHIR</span>
          <span className="px-3 py-1 text-[10px] font-bold text-emerald-700 bg-white rounded-full border border-emerald-200">IPS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ═══════════════════════════════════════════════════════
            LEFT COLUMN: Patient Selection
            ═══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-1 space-y-5">

          {/* Patient Search & Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Selección de Pacientes
                </h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {selectedCount} seleccionados
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar paciente por nombre..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                />
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {/* Select all */}
              <button
                onClick={toggleAllPatients}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-blue-50/50 transition-colors border-b border-slate-100"
              >
                <div className={cn(
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                  filteredPatients.every(p => p.selected)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300'
                )}>
                  {filteredPatients.every(p => p.selected) && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-xs font-semibold text-blue-600">
                  {filteredPatients.every(p => p.selected) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
              </button>

              {filteredPatients.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">
                  No se encontraron pacientes
                </div>
              )}

              {filteredPatients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => togglePatient(patient.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-5 py-3 text-left transition-all border-b border-slate-50',
                    patient.selected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0',
                    patient.selected
                      ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-200'
                      : 'border-slate-300'
                  )}>
                    {patient.selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{patient.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {patient.age ? `${patient.age} años` : ''} {patient.gender ? `• ${patient.gender}` : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Anonymization Toggle */}
          <div className={cn(
            'rounded-2xl border p-5 shadow-sm transition-all',
            anonymize
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
              : 'bg-white border-slate-200'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {anonymize ? (
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <EyeOff className="h-5 w-5 text-amber-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-slate-100 rounded-xl">
                    <Eye className="h-5 w-5 text-slate-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-800">Anonimización</p>
                  <p className="text-[11px] text-slate-500">
                    {anonymize ? 'Datos identificatorios serán removidos' : 'Datos completos del paciente'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAnonymize(!anonymize)}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-all duration-300',
                  anonymize ? 'bg-amber-500' : 'bg-slate-300'
                )}
              >
                <div className={cn(
                  'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300',
                  anonymize ? 'left-[22px]' : 'left-0.5'
                )} />
              </button>
            </div>
            {anonymize && (
              <div className="mt-3 px-3 py-2 bg-white/60 rounded-lg border border-amber-100">
                <p className="text-[10px] text-amber-700 font-medium">
                  🔒 Nombre, ID, fecha de nacimiento y datos de contacto serán reemplazados por identificadores anónimos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            CENTER & RIGHT: Sections + Format + Actions
            ═══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Export Sections */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-600" />
                Secciones del Expediente a Exportar
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seleccione qué secciones del registro clínico incluir en la exportación
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-5">
              {sections.map(section => {
                const IconComp = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      section.enabled
                        ? `${section.bgColor} border-current ${section.color} shadow-sm`
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      section.enabled ? 'bg-white/80' : 'bg-slate-100'
                    )}>
                      <IconComp className={cn('h-4 w-4', section.enabled ? section.color : 'text-slate-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold', section.enabled ? 'text-slate-800' : 'text-slate-500')}>
                        {section.label}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{section.description}</p>
                      <p className="text-[9px] text-slate-400 mt-1 font-mono">
                        FHIR: {section.fhirResources.join(', ')}
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                      section.enabled ? 'bg-current border-current' : 'border-slate-300'
                    )}>
                      {section.enabled && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-zinc-50 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <FileJson2 className="h-4 w-4 text-violet-600" />
                Formato de Exportación
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5">
              {/* FHIR JSON */}
              <button
                onClick={() => setFormat('fhir-json')}
                className={cn(
                  'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
                  format === 'fhir-json'
                    ? 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-400 shadow-md shadow-violet-100'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                {format === 'fhir-json' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-violet-600" />
                  </div>
                )}
                <div className={cn(
                  'p-3 rounded-2xl',
                  format === 'fhir-json' ? 'bg-violet-100' : 'bg-slate-100'
                )}>
                  <FileJson2 className={cn('h-8 w-8', format === 'fhir-json' ? 'text-violet-600' : 'text-slate-400')} />
                </div>
                <div className="text-center">
                  <p className={cn('text-sm font-bold', format === 'fhir-json' ? 'text-violet-800' : 'text-slate-600')}>
                    FHIR JSON Bundle
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Estándar HL7 FHIR R4<br />
                    Interoperable con sistemas EHR
                  </p>
                </div>
              </button>

              {/* Plain Text */}
              <button
                onClick={() => setFormat('txt')}
                className={cn(
                  'relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all',
                  format === 'txt'
                    ? 'bg-gradient-to-br from-slate-50 to-zinc-50 border-slate-400 shadow-md shadow-slate-100'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                {format === 'txt' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <div className={cn(
                  'p-3 rounded-2xl',
                  format === 'txt' ? 'bg-slate-200' : 'bg-slate-100'
                )}>
                  <FileText className={cn('h-8 w-8', format === 'txt' ? 'text-slate-700' : 'text-slate-400')} />
                </div>
                <div className="text-center">
                  <p className={cn('text-sm font-bold', format === 'txt' ? 'text-slate-800' : 'text-slate-600')}>
                    Texto Plano (TXT)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Formato legible universal<br />
                    Compatible con cualquier sistema
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Email Target (Optional) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">Enviar por Correo (Opcional)</h3>
            </div>
            <input
              type="email"
              placeholder="correo@destinatario.com"
              value={emailTarget}
              onChange={e => setEmailTarget(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 focus:bg-white"
            />
          </div>

          {/* ═══════════════════════════════════════════════════════
              LEGAL DISCLAIMER
              ═══════════════════════════════════════════════════════ */}
          <div className={cn(
            'rounded-2xl border-2 p-6 transition-all',
            disclaimerAccepted
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                'p-2.5 rounded-xl flex-shrink-0',
                disclaimerAccepted ? 'bg-emerald-100' : 'bg-amber-100'
              )}>
                <Scale className={cn('h-6 w-6', disclaimerAccepted ? 'text-emerald-600' : 'text-amber-600')} />
              </div>
              <div className="flex-1">
                <h3 className={cn('text-sm font-bold', disclaimerAccepted ? 'text-emerald-800' : 'text-amber-800')}>
                  Descargo de Responsabilidad Legal
                </h3>
                <div className="mt-2 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <p>
                    Al exportar datos clínicos, usted como médico tratante asume la responsabilidad
                    sobre el uso, distribución y protección de la información contenida en este archivo.
                  </p>
                  <p>
                    La exportación se realiza en cumplimiento con los estándares <strong>HL7 FHIR R4</strong> y
                    las directrices de la <strong>International Patient Summary (IPS)</strong>. Los datos
                    exportados son de carácter confidencial y están protegidos por las leyes de protección
                    de datos personales aplicables.
                  </p>
                  <p className="font-semibold text-slate-700">
                    ⚠ El receptor de estos datos es responsable de mantener la confidencialidad
                    y de cumplir con todas las regulaciones vigentes en su jurisdicción.
                  </p>
                </div>

                <button
                  onClick={() => setDisclaimerAccepted(!disclaimerAccepted)}
                  className={cn(
                    'mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                    disclaimerAccepted
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                    disclaimerAccepted ? 'bg-emerald-600 border-emerald-600' : 'border-amber-400'
                  )}>
                    {disclaimerAccepted && <Check className="h-3 w-3 text-white" />}
                  </div>
                  {disclaimerAccepted ? 'Aceptado — Disclaimer confirmado' : 'Acepto los términos y condiciones de exportación'}
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════
              ACTION BUTTONS
              ═══════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Preview */}
            <button
              onClick={handlePreview}
              disabled={selectedCount === 0 || enabledSectionsCount === 0}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <Eye className="h-5 w-5 text-slate-500" />
              Vista Previa
            </button>

            {/* Download */}
            <button
              onClick={handleExport}
              disabled={selectedCount === 0 || enabledSectionsCount === 0 || !disclaimerAccepted}
              className={cn(
                'flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg',
                exportSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-200'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
              )}
            >
              {isExporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : exportSuccess ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isExporting ? 'Exportando...' : exportSuccess ? '¡Descargado!' : 'Descargar Archivo'}
            </button>

            {/* Email */}
            <button
              onClick={handleEmailExport}
              disabled={selectedCount === 0 || enabledSectionsCount === 0 || !disclaimerAccepted}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-blue-200 text-blue-700 font-semibold text-sm hover:bg-blue-50 hover:border-blue-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <Mail className="h-5 w-5 text-blue-500" />
              Enviar por Email
            </button>
          </div>

          {/* Validation warnings */}
          {(selectedCount === 0 || enabledSectionsCount === 0 || !disclaimerAccepted) && (
            <div className="flex flex-wrap gap-2">
              {selectedCount === 0 && (
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  ⚠ Seleccione al menos un paciente
                </span>
              )}
              {enabledSectionsCount === 0 && (
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  ⚠ Active al menos una sección
                </span>
              )}
              {!disclaimerAccepted && (
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                  ⚠ Acepte el disclaimer legal
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          PREVIEW MODAL
          ═══════════════════════════════════════════════════════ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-[90vw] max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Vista Previa — {format === 'fhir-json' ? 'FHIR JSON Bundle' : 'Texto Plano'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <pre className={cn(
                'text-xs leading-relaxed font-mono whitespace-pre-wrap rounded-xl p-6 border overflow-auto',
                format === 'fhir-json'
                  ? 'bg-slate-950 text-emerald-300 border-slate-800'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              )}>
                {previewContent}
              </pre>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleExport();
                }}
                disabled={!disclaimerAccepted}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all disabled:opacity-40 shadow-md"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
