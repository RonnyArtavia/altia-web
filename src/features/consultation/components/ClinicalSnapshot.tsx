/**
 * ClinicalSnapshot - Real-time Medical Note Display Component
 * Shows "Nota en Progreso (Tiempo Real)" with SOAP sections and IPS summary
 * Matches original functionality from ClinicalSnapshotCopilot
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileEdit,
  FileHeart,
  Pill,
  Stethoscope,
  AlertTriangle,
  X,
  Check,
  HelpCircle,
  CheckCircle,
  Mail,
  Sparkles,
  AlertCircle,
  Info,
  Trash2,
  NotebookPen,
  FileBarChart,
  BookOpen,
  FlaskConical,
  Activity,
  ClipboardList,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type {
  ClinicalState,
  SOAPData,
  FHIRPlanItem,
  CopilotSuggestion
} from '../types/medical-notes';

// SOAP Mini Row with typewriter effect
interface SoapMiniRowProps {
  label: string;
  fullKey: string;
  text: string;
  color: string;
  onSave?: (key: string, value: string) => void;
  readOnly?: boolean;
}

function SoapMiniRow({
  label,
  fullKey,
  text,
  color,
  onSave,
  readOnly = false
}: SoapMiniRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [displayText, setDisplayText] = useState(text || '');
  const [isTyping, setIsTyping] = useState(false);
  const previousTextRef = useRef(text || '');
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Sync value if text changes externally
  useEffect(() => {
    setValue(text);
  }, [text]);

  // Typewriter effect when text changes
  useEffect(() => {
    // Clean up any existing animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }

    const safeText = text || '';
    const safePrevText = previousTextRef.current || '';

    // Skip if same as before
    if (safeText === safePrevText) {
      return;
    }

    // If empty, just set immediately
    if (!safeText) {
      setDisplayText('');
      setIsTyping(false);
      previousTextRef.current = '';
      return;
    }

    // If new text is an extension of previous text, animate only the new part
    if (safeText.length > safePrevText.length && safeText.startsWith(safePrevText)) {
      setIsTyping(true);
      const baseText = safePrevText;
      const newChars = safeText.slice(safePrevText.length);
      let charIndex = 0;

      // Set base text immediately
      setDisplayText(baseText);

      animationRef.current = setInterval(() => {
        if (charIndex < newChars.length) {
          setDisplayText(baseText + newChars.slice(0, charIndex + 1));
          charIndex++;
        } else {
          if (animationRef.current) clearInterval(animationRef.current);
          animationRef.current = null;
          setIsTyping(false);
          previousTextRef.current = safeText;
        }
      }, 12);
    } else {
      // Text replaced entirely - show immediately
      setDisplayText(safeText);
      setIsTyping(false);
      previousTextRef.current = safeText;
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [text]);

  const handleSave = () => {
    onSave?.(fullKey, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setValue(text);
    setIsEditing(false);
  };

  return (
    <div className="flex gap-4 items-start group text-left py-3 border-b border-slate-50 last:border-0 relative hover:bg-slate-50/50 transition-colors rounded-lg px-2 -mx-2">
      <div
        className={`w-8 h-8 rounded-lg ${color} bg-opacity-10 flex items-center justify-center font-bold text-sm shrink-0 border border-current border-opacity-20 mt-1`}
      >
        {label}
      </div>

      <div className="flex-1 text-left min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full text-sm p-3 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none min-h-[100px] resize-y bg-white text-slate-700 shadow-sm"
              autoFocus
              placeholder={`Escriba la sección ${label}...`}
            />
            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <X size={14} /> Cancelar
              </Button>
              <Button
                onClick={handleSave}
                size="sm"
                className="gap-1"
              >
                <Check size={14} /> Guardar
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative group/text">
            {displayText ? (
              <p
                className={`text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap ${isTyping ? 'after:content-["│"] after:animate-pulse after:text-indigo-500 after:font-bold' : ''
                  }`}
              >
                {displayText}
              </p>
            ) : (
              <span className="text-slate-400 italic flex items-center gap-2 text-sm">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                Esperando datos...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Edit Trigger */}
      {!isEditing && !readOnly && (
        <Button
          onClick={() => setIsEditing(true)}
          variant="ghost"
          size="sm"
          className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-0 h-auto p-1.5"
          title="Editar sección"
        >
          <FileEdit size={14} />
        </Button>
      )}
    </div>
  );
}

// IPS Item Row Component
interface IPSItemRowProps {
  item: FHIRPlanItem;
  colors: { bg: string; text: string; border: string };
  onUpdate?: (id: string, updates: Partial<FHIRPlanItem>) => void;
  onRemove?: (id: string) => void;
  readOnly?: boolean;
  // Selection Props for email functionality
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

function IPSItemRow({
  item,
  colors,
  onUpdate,
  onRemove,
  readOnly = false,
  isSelectionMode,
  isSelected,
  onToggleSelection
}: IPSItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplay, setEditDisplay] = useState(item.display || item.text || '');
  const [editDetails, setEditDetails] = useState(item.details || '');

  // Sync local state when item updates from parent
  useEffect(() => {
    setEditDisplay(item.display || item.text || '');
    setEditDetails(item.details || '');
  }, [item.display, item.text, item.details]);

  const handleSave = () => {
    if (item.id) {
      onUpdate?.(item.id, {
        display: editDisplay,
        text: editDisplay, // Keep both for compatibility
        details: editDetails
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDisplay(item.display || item.text || '');
    setEditDetails(item.details || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-3 rounded-lg bg-white border border-indigo-200 shadow-sm space-y-3">
        <div className="space-y-2">
          <input
            value={editDisplay}
            onChange={(e) => setEditDisplay(e.target.value)}
            className="w-full text-sm font-semibold p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700"
            placeholder="Nombre del recurso"
            autoFocus
          />
          <input
            value={editDetails}
            onChange={(e) => setEditDetails(e.target.value)}
            className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600"
            placeholder="Detalles (dosis, frecuencia, notas...)"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleCancel} variant="ghost" size="sm">
            <X size={14} />
          </Button>
          <Button onClick={handleSave} size="sm" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
            <Check size={14} />
          </Button>
        </div>
      </div>
    );
  }

  const isPresumptive = item.type === 'condition' && item.verificationStatus === 'presumptive';

  return (
    <div
      className={`p-3 rounded-lg ${colors.bg} border ${colors.border} text-left hover:shadow-sm transition-all group relative pr-8 ${isSelectionMode ? 'cursor-pointer hover:bg-opacity-80' : ''
        }`}
      onClick={isSelectionMode ? onToggleSelection : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="text-left flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${colors.text}`}>
              {item.display || item.text}
            </p>
            {/* Presumptive Badge */}
            {isPresumptive && (
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1"
              >
                <HelpCircle size={10} /> Presuntivo
              </Badge>
            )}
          </div>
          {(item.details || item.dose) && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {item.details || item.dose}
            </p>
          )}
        </div>
      </div>

      {/* Promote Presumptive Action */}
      {isPresumptive && !readOnly && onUpdate && (
        <Button
          onClick={() => item.id && onUpdate(item.id, { verificationStatus: 'confirmed' })}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-8 text-amber-400 hover:text-emerald-600 hover:bg-emerald-50 h-auto p-1.5"
          title="Confirmar como Diagnóstico Definitivo"
        >
          <CheckCircle size={14} />
        </Button>
      )}

      {/* Row Actions (Edit/Delete) */}
      {!readOnly && !isSelectionMode && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-auto p-1.5"
            title="Editar"
          >
            <FileEdit size={12} />
          </Button>
          {onRemove && (
            <Button
              onClick={() => item.id && onRemove(item.id)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-auto p-1.5"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Main Component
interface ClinicalSnapshotProps {
  data: ClinicalState;
  onFinalize?: () => void;
  isHistoryView?: boolean;
  onUpdateSoap?: (section: keyof SOAPData, value: string) => void;
  onUpdateFHIR?: (id: string, updates: Partial<FHIRPlanItem>) => void;
  onRemoveFHIR?: (id: string) => void;
  onUpdateEducation?: (text: string) => void;
  onApproveSuggestion?: (suggestion: CopilotSuggestion) => void;
}

export function ClinicalSnapshot({
  data,
  onFinalize,
  isHistoryView = false,
  onUpdateSoap,
  onUpdateFHIR,
  onRemoveFHIR,
  onUpdateEducation,
  onApproveSuggestion
}: ClinicalSnapshotProps) {
  if (!data) return null;

  // Normalize singular FHIR types to their plural form used in the UI
  const typeNormalize: Record<string, string> = {
    condition: 'conditions',
    medication: 'medications',
    allergy: 'allergies',
    procedure: 'procedures',
    labOrder: 'labOrders',
    imagingOrder: 'imagingOrders',
    labResult: 'labResults',
  };

  // Spanish labels for category fallback
  const categoryLabels: Record<string, string> = {
    conditions: 'Diagnósticos',
    medications: 'Medicamentos',
    allergies: 'Alergias',
    procedures: 'Procedimientos',
    labOrders: 'Órdenes de Laboratorio',
    imagingOrders: 'Órdenes de Imagen',
    labResults: 'Resultados de Laboratorio',
    referral: 'Referencia',
    observation: 'Observaciones',
    serviceRequest: 'Solicitudes',
  };

  // Group FHIR items by category (normalize to plural)
  const groupedFHIR: Record<string, FHIRPlanItem[]> = {};
  if (data.fhir && Array.isArray(data.fhir)) {
    data.fhir.forEach((item) => {
      const category = typeNormalize[item.type] || item.type;
      if (!groupedFHIR[category]) {
        groupedFHIR[category] = [];
      }
      groupedFHIR[category].push(item);
    });
  }

  const totalItems = data.fhir?.length || 0;

  const s = {
    p: { margin: "0 0 14px", color: "#333", lineHeight: 1.75 },
    h1: { fontSize: 24, fontWeight: 700, margin: "0 0 8px", color: "#111" },
    h2: { fontSize: 19, fontWeight: 700, margin: "24px 0 8px", color: "#111" },
    h3: { fontSize: 16, fontWeight: 700, margin: "16px 0 6px", color: "#333" },
    hr: { border: "none", borderTop: "1px solid #e8e8e8", margin: "16px 0" },
    th: {
      textAlign: "left" as const, padding: "10px 14px", borderBottom: "2px solid #e2e2e2",
      fontWeight: 600, fontSize: 13, color: "#555",
      fontFamily: "'DM Sans', sans-serif", background: "#fafafa",
    },
    td: { padding: "9px 14px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" as const, color: "#333" },
    table: { width: "100%", borderCollapse: "collapse" as const, margin: "12px 0 20px", fontSize: 14 },
    bullet: { margin: "0 0 6px", paddingLeft: 4, color: "#333", fontSize: 14 },
    soapSection: {
      background: "#fefefe",
      border: "1px solid #e8e8e8",
      borderRadius: "3px",
      padding: "8px 12px",
      margin: "0 0 4px",
      minHeight: "auto"
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />



      <div className="w-full" style={{
        fontFamily: "'Source Serif 4', Georgia, serif",
        fontSize: 15,
        lineHeight: 1.7,
        color: "#1a1a1a",
        padding: "0 20px 40px",
      }}>

        {/* Alerts */}
        {data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0 && (
          <div style={{ margin: "0 0 20px", padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "4px" }}>
            <div className="flex items-start gap-3 text-red-800 text-sm font-medium">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
              <span className="break-words">{data.alerts[0]}</span>
            </div>
          </div>
        )}

        {/* Nota Clínica SOAP */}
        <div style={{
          borderLeft: "3px solid #94a3b8",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <NotebookPen size={15} color="#64748b" strokeWidth={1.8} />
            <h2 style={{ ...s.h2, color: "#475569", margin: 0 }}>
              Nota Clínica SOAP
            </h2>
          </div>

          <div style={s.soapSection}>
            <SoapMiniRow
              label="S"
              fullKey="s"
              text={data.soap?.s || data.soap?.subjective || ''}
              color="text-blue-600"
              onSave={(k, v) => onUpdateSoap?.(k === 's' ? 's' : 'subjective', v)}
              readOnly={isHistoryView}
            />
          </div>

          <div style={s.soapSection}>
            <SoapMiniRow
              label="O"
              fullKey="o"
              text={data.soap?.o || data.soap?.objective || ''}
              color="text-emerald-600"
              onSave={(k, v) => onUpdateSoap?.(k === 'o' ? 'o' : 'objective', v)}
              readOnly={isHistoryView}
            />
          </div>

          <div style={s.soapSection}>
            <SoapMiniRow
              label="A"
              fullKey="a"
              text={data.soap?.a || data.soap?.assessment || ''}
              color="text-amber-600"
              onSave={(k, v) => onUpdateSoap?.(k === 'a' ? 'a' : 'assessment', v)}
              readOnly={isHistoryView}
            />
          </div>

          <div style={s.soapSection}>
            <SoapMiniRow
              label="P"
              fullKey="p"
              text={data.soap?.p || data.soap?.plan || ''}
              color="text-indigo-400"
              onSave={(k, v) => onUpdateSoap?.(k === 'p' ? 'p' : 'plan', v)}
              readOnly={isHistoryView}
            />
          </div>
        </div>

        <hr style={s.hr} />

        {/* Resumen de la Consulta */}
        {totalItems > 0 && (
          <div style={{
            borderLeft: "3px solid #94a3b8",
            paddingLeft: "16px",
            margin: "24px 0"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <FileBarChart size={15} color="#64748b" strokeWidth={1.8} />
              <h2 style={{ ...s.h2, color: "#475569", margin: 0 }}>
                Resumen de la Consulta
              </h2>
            </div>

            <div style={{ display: "grid", gap: "20px" }}>
              {/* Diagnósticos Card */}
              {groupedFHIR.conditions && groupedFHIR.conditions.length > 0 && (
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  borderLeft: "3px solid #94a3b8"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    <Stethoscope size={15} color="#64748b" strokeWidth={1.8} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#475569",
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Diagnósticos
                      </h3>
                    </div>
                    <div style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      {groupedFHIR.conditions.length}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {groupedFHIR.conditions.map((item, i) => (
                      <div key={item.id || i} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "6px",
                            lineHeight: 1.4
                          }}>
                            {item.display || item.text}
                          </div>
                          {item.details && (
                            <div style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              fontStyle: "italic",
                              marginBottom: "6px"
                            }}>
                              {item.details}
                            </div>
                          )}
                          {item.verificationStatus === 'presumptive' && (
                            <span style={{
                              display: "inline-block",
                              fontSize: "11px",
                              color: "#f59e0b",
                              fontWeight: 600,
                              background: "#fef3c7",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid #fcd34d"
                            }}>
                              Presuntivo
                            </span>
                          )}
                        </div>
                        {!isHistoryView && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <Button
                              onClick={() => onUpdateFHIR?.(item.id, item)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                              title="Editar diagnóstico"
                            >
                              <FileEdit size={16} />
                            </Button>
                            {onRemoveFHIR && (
                              <Button
                                onClick={() => item.id && onRemoveFHIR(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicamentos Card */}
              {groupedFHIR.medications && groupedFHIR.medications.length > 0 && (
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  borderLeft: "3px solid #94a3b8"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    <Pill size={15} color="#64748b" strokeWidth={1.8} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#475569",
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Medicamentos
                      </h3>
                    </div>
                    <div style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      {groupedFHIR.medications.length}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {groupedFHIR.medications.map((item, i) => (
                      <div key={item.id || i} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "6px",
                            lineHeight: 1.4
                          }}>
                            {item.display || item.text}
                          </div>
                          {(item.details || item.dose) && (
                            <div style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              marginBottom: "6px"
                            }}>
                              Dosis: {item.details || item.dose}
                            </div>
                          )}
                          {item.warning && (
                            <span style={{
                              display: "inline-block",
                              fontSize: "11px",
                              color: item.warningLevel === 'critical' ? "#dc2626" : "#f59e0b",
                              fontWeight: 600,
                              background: item.warningLevel === 'critical' ? "#fee2e2" : "#fef3c7",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${item.warningLevel === 'critical' ? "#fecaca" : "#fcd34d"}`
                            }}>
                              ⚠ {item.warning}
                            </span>
                          )}
                        </div>
                        {!isHistoryView && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <Button
                              onClick={() => onUpdateFHIR?.(item.id, item)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Editar medicamento"
                            >
                              <FileEdit size={16} />
                            </Button>
                            {onRemoveFHIR && (
                              <Button
                                onClick={() => item.id && onRemoveFHIR(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alergias Card */}
              {groupedFHIR.allergies && groupedFHIR.allergies.length > 0 && (
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  borderLeft: "3px solid #f87171"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    <AlertCircle size={15} color="#ef4444" strokeWidth={1.8} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#475569",
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Alergias
                      </h3>
                    </div>
                    <div style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      {groupedFHIR.allergies.length}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {groupedFHIR.allergies.map((item, i) => (
                      <div key={item.id || i} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "6px",
                            lineHeight: 1.4
                          }}>
                            {item.display || item.text}
                          </div>
                          {item.details && (
                            <div style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              fontStyle: "italic"
                            }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                        {!isHistoryView && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <Button
                              onClick={() => onUpdateFHIR?.(item.id, item)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Editar alergia"
                            >
                              <FileEdit size={16} />
                            </Button>
                            {onRemoveFHIR && (
                              <Button
                                onClick={() => item.id && onRemoveFHIR(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedimientos Card */}
              {groupedFHIR.procedures && groupedFHIR.procedures.length > 0 && (
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  borderLeft: "3px solid #94a3b8"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    <Activity size={15} color="#64748b" strokeWidth={1.8} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#475569",
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Procedimientos
                      </h3>
                    </div>
                    <div style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      {groupedFHIR.procedures.length}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {groupedFHIR.procedures.map((item, i) => (
                      <div key={item.id || i} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "6px",
                            lineHeight: 1.4
                          }}>
                            {item.display || item.text}
                          </div>
                          {item.details && (
                            <div style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              fontStyle: "italic"
                            }}>
                              {item.details}
                            </div>
                          )}
                        </div>
                        {!isHistoryView && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <Button
                              onClick={() => onUpdateFHIR?.(item.id, item)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Editar procedimiento"
                            >
                              <FileEdit size={16} />
                            </Button>
                            {onRemoveFHIR && (
                              <Button
                                onClick={() => item.id && onRemoveFHIR(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Órdenes Médicas Card */}
              {(groupedFHIR.labOrders || groupedFHIR.imagingOrders) &&
                (groupedFHIR.labOrders?.length > 0 || groupedFHIR.imagingOrders?.length > 0) && (
                  <div style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    borderLeft: "3px solid #94a3b8"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid #f1f5f9"
                    }}>
                      <ClipboardList size={15} color="#64748b" strokeWidth={1.8} />
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#475569",
                          margin: 0,
                          fontFamily: "'DM Sans', sans-serif"
                        }}>
                          Órdenes Médicas
                        </h3>
                      </div>
                      <div style={{
                        background: "#f1f5f9",
                        color: "#64748b",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600
                      }}>
                        {[...(groupedFHIR.labOrders || []), ...(groupedFHIR.imagingOrders || [])].length}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      {[...(groupedFHIR.labOrders || []), ...(groupedFHIR.imagingOrders || [])].map((item, i) => (
                        <div key={item.id || i} style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "12px",
                          transition: "all 0.2s ease"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "#1f2937",
                              marginBottom: "6px",
                              lineHeight: 1.4
                            }}>
                              {item.display || item.text}
                            </div>
                            {item.details && (
                              <div style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                fontStyle: "italic"
                              }}>
                                {item.details}
                              </div>
                            )}
                          </div>
                          {!isHistoryView && (
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <Button
                                onClick={() => onUpdateFHIR?.(item.id, item)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                                title="Editar orden"
                              >
                                <FileEdit size={16} />
                              </Button>
                              {onRemoveFHIR && (
                                <Button
                                  onClick={() => item.id && onRemoveFHIR(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Resultados de Laboratorio Card */}
              {groupedFHIR.labResults && groupedFHIR.labResults.length > 0 && (
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  borderLeft: "3px solid #94a3b8"
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "16px",
                    paddingBottom: "10px",
                    borderBottom: "1px solid #f1f5f9"
                  }}>
                    <FlaskConical size={15} color="#64748b" strokeWidth={1.8} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#475569",
                        margin: 0,
                        fontFamily: "'DM Sans', sans-serif"
                      }}>
                        Resultados de Laboratorio
                      </h3>
                    </div>
                    <div style={{
                      background: "#f1f5f9",
                      color: "#64748b",
                      padding: "2px 10px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600
                    }}>
                      {groupedFHIR.labResults.length}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    {groupedFHIR.labResults.map((item, i) => (
                      <div key={item.id || i} style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "14px 16px",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: "#1f2937",
                            marginBottom: "6px",
                            lineHeight: 1.4
                          }}>
                            {item.display || item.text}
                          </div>
                          {item.details && (
                            <div style={{
                              fontSize: "13px",
                              color: "#6b7280",
                              marginBottom: "6px"
                            }}>
                              {item.details}
                            </div>
                          )}
                          {item.flag && (
                            <span style={{
                              display: "inline-block",
                              fontSize: "11px",
                              color: item.flag === 'critical' ? "#dc2626" : item.flag === 'high' ? "#f59e0b" : "#059669",
                              fontWeight: 600,
                              background: item.flag === 'critical' ? "#fee2e2" : item.flag === 'high' ? "#fef3c7" : "#d1fae5",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: `1px solid ${item.flag === 'critical' ? "#fecaca" : item.flag === 'high' ? "#fcd34d" : "#a7f3d0"}`
                            }}>
                              {item.flag === 'critical' && '🚨'} {item.flag === 'high' && '⬆'} {item.flag === 'low' && '⬇'} {item.flag}
                            </span>
                          )}
                        </div>
                        {!isHistoryView && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <Button
                              onClick={() => onUpdateFHIR?.(item.id, item)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
                              title="Editar resultado"
                            >
                              <FileEdit size={16} />
                            </Button>
                            {onRemoveFHIR && (
                              <Button
                                onClick={() => item.id && onRemoveFHIR(item.id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Otras categorías dinámicas */}
              {Object.entries(groupedFHIR).map(([category, items]) => {
                // Skip categories we've already handled
                if (['conditions', 'medications', 'allergies', 'procedures', 'labOrders', 'imagingOrders', 'labResults'].includes(category)) {
                  return null;
                }

                return items.length > 0 ? (
                  <div key={category} style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                    borderLeft: "3px solid #94a3b8"
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "16px",
                      paddingBottom: "10px",
                      borderBottom: "1px solid #f1f5f9"
                    }}>
                      <Tag size={15} color="#64748b" strokeWidth={1.8} />
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "#475569",
                          margin: 0,
                          fontFamily: "'DM Sans', sans-serif"
                        }}>
                          {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                        </h3>
                      </div>
                      <div style={{
                        background: "#f1f5f9",
                        color: "#64748b",
                        padding: "2px 10px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600
                      }}>
                        {items.length}
                      </div>
                    </div>

                    <div style={{ display: "grid", gap: "10px" }}>
                      {items.map((item, i) => (
                        <div key={item.id || i} style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "12px",
                          transition: "all 0.2s ease"
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: "15px",
                              fontWeight: 600,
                              color: "#1f2937",
                              marginBottom: "6px",
                              lineHeight: 1.4
                            }}>
                              {item.display || item.text}
                            </div>
                            {item.details && (
                              <div style={{
                                fontSize: "13px",
                                color: "#6b7280",
                                fontStyle: "italic"
                              }}>
                                {item.details}
                              </div>
                            )}
                          </div>
                          {!isHistoryView && (
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <Button
                                onClick={() => onUpdateFHIR?.(item.id, item)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-slate-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                                title={`Editar ${category}`}
                              >
                                <FileEdit size={16} />
                              </Button>
                              {onRemoveFHIR && (
                                <Button
                                  onClick={() => item.id && onRemoveFHIR(item.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title={`Eliminar ${category}`}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Educación y Recomendaciones */}
        <div style={{
          borderLeft: "3px solid #94a3b8",
          paddingLeft: "16px",
          margin: "24px 0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <BookOpen size={15} color="#64748b" strokeWidth={1.8} />
            <h2 style={{ ...s.h2, color: "#475569", margin: 0 }}>
              Educación y Recomendaciones
            </h2>
          </div>
          <div style={s.soapSection}>
            <SoapMiniRow
              label="E"
              fullKey="education"
              text={data.healthEducation || ''}
              color="text-sky-600"
              readOnly={isHistoryView}
              onSave={(_, val) => onUpdateEducation?.(val)}
            />
          </div>
        </div>

        {/* Finalize Button */}
        {onFinalize && !isHistoryView && (
          <div style={{ marginTop: "24px" }}>
            <hr style={s.hr} />
            <div style={{ background: "#fefbf2", border: "1px solid #fed7aa", borderRadius: "4px", padding: "12px 16px", marginBottom: "12px" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">
                  <strong>Atención:</strong> La consulta médica <span className="font-bold underline">no ha sido guardada</span>.
                  Puede realizar cambios ahora. Una vez guardada, la información será <span className="font-bold">permanente e inmodificable</span>.
                </p>
              </div>
            </div>

            <Button
              onClick={onFinalize}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 gap-2"
            >
              <Check size={16} />
              Guardar y Cerrar Consulta
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default ClinicalSnapshot;