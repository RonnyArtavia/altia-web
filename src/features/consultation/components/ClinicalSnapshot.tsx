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
  Lightbulb,
  HelpCircle,
  CheckCircle,
  Mail,
  Sparkles,
  AlertCircle,
  Info,
  Trash2
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
                className={`text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap ${
                  isTyping ? 'after:content-["│"] after:animate-pulse after:text-indigo-500 after:font-bold' : ''
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
      className={`p-3 rounded-lg ${colors.bg} border ${colors.border} text-left hover:shadow-sm transition-all group relative pr-8 ${
        isSelectionMode ? 'cursor-pointer hover:bg-opacity-80' : ''
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

  // Group FHIR items by category
  const groupedFHIR: Record<string, FHIRPlanItem[]> = {};
  if (data.fhir && Array.isArray(data.fhir)) {
    data.fhir.forEach((item) => {
      const category = item.type;
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

      {/* RESUMEN NARRATIVO CLÍNICO - Sticky */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "#ffffff",
        borderBottom: "2px solid #e5e7eb",
        margin: "0 0 20px",
        padding: "16px 20px"
      }}>
        <div style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "#2d3748",
          fontWeight: 500,
          padding: "12px 16px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderLeft: "4px solid #4299e1",
          borderRadius: "4px"
        }}>
          <h2 className="text-lg font-bold mb-3 text-blue-800" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            📋 RESUMEN NARRATIVO CLÍNICO
          </h2>
          <p style={{ margin: 0, fontSize: 16 }}>
            {data?.narrativeSummary || "Resumen narrativo no disponible para esta consulta."}
          </p>
        </div>
      </div>

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
        <h2 style={s.h2}>Nota Clínica SOAP</h2>

        <div style={{ ...s.soapSection, background: "#ffffff", border: "1px solid #e1e7ff" }}>
          <SoapMiniRow
            label="S"
            fullKey="s"
            text={data.soap?.s || data.soap?.subjective || ''}
            color="text-blue-600"
            onSave={(k, v) => onUpdateSoap?.(k === 's' ? 's' : 'subjective', v)}
            readOnly={isHistoryView}
          />
        </div>

        <div style={{ ...s.soapSection, background: "#ffffff", border: "1px solid #d1fae5" }}>
          <SoapMiniRow
            label="O"
            fullKey="o"
            text={data.soap?.o || data.soap?.objective || ''}
            color="text-emerald-600"
            onSave={(k, v) => onUpdateSoap?.(k === 'o' ? 'o' : 'objective', v)}
            readOnly={isHistoryView}
          />
        </div>

        <div style={{ ...s.soapSection, background: "#ffffff", border: "1px solid #fef3c7" }}>
          <SoapMiniRow
            label="A"
            fullKey="a"
            text={data.soap?.a || data.soap?.assessment || ''}
            color="text-amber-600"
            onSave={(k, v) => onUpdateSoap?.(k === 'a' ? 'a' : 'assessment', v)}
            readOnly={isHistoryView}
          />
        </div>

        <div style={{ ...s.soapSection, background: "#ffffff", border: "1px solid #e0e7ff" }}>
          <SoapMiniRow
            label="P"
            fullKey="p"
            text={data.soap?.p || data.soap?.plan || ''}
            color="text-indigo-400"
            onSave={(k, v) => onUpdateSoap?.(k === 'p' ? 'p' : 'plan', v)}
            readOnly={isHistoryView}
          />
        </div>

        <hr style={s.hr} />

        {/* Resumen de la Consulta */}
        {totalItems > 0 && (
          <>
            <h2 style={s.h2}>Resumen de la Consulta</h2>
            <p style={s.p}>
              {totalItems} {totalItems === 1 ? 'registro' : 'registros'} clínico{totalItems === 1 ? '' : 's'} identificado{totalItems === 1 ? '' : 's'}:
            </p>

            {Object.entries(groupedFHIR).map(([category, items]) => (
              <div key={category} style={{ marginBottom: "16px" }}>
                <h3 style={s.h3}>
                  {category === 'medications' ? 'Medicamentos' :
                   category === 'conditions' ? 'Diagnósticos' :
                   category === 'allergies' ? 'Alergias' :
                   category} ({items.length})
                </h3>

                {items.map((item, i) => (
                  <div key={item.id || i} style={s.bullet}>
                    <strong>{item.display || item.text}</strong>
                    {(item.details || item.dose) && (
                      <div style={{ fontSize: 13, color: "#666", fontStyle: 'italic', marginTop: 4 }}>
                        {item.details || item.dose}
                      </div>
                    )}
                    {item.type === 'condition' && item.verificationStatus === 'presumptive' && (
                      <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginLeft: 8 }}>
                        (Presuntivo)
                      </span>
                    )}
                    {!isHistoryView && (
                      <div className="mt-2 flex gap-2">
                        <Button
                          onClick={() => setIsEditing?.(true)}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-auto p-1.5 text-slate-500 hover:text-indigo-600"
                        >
                          <FileEdit size={12} /> Editar
                        </Button>
                        {onRemoveFHIR && (
                          <Button
                            onClick={() => item.id && onRemoveFHIR(item.id)}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto p-1.5 text-slate-500 hover:text-red-600"
                          >
                            <Trash2 size={12} /> Eliminar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            <hr style={s.hr} />
          </>
        )}

        {/* Educación y Recomendaciones */}
        <h2 style={s.h2}>Educación y Recomendaciones</h2>
        <div style={{ ...s.soapSection, background: "#ffffff", border: "1px solid #99f6e4" }}>
          <SoapMiniRow
            label="E"
            fullKey="education"
            text={data.healthEducation || ''}
            color="text-sky-600"
            readOnly={isHistoryView}
            onSave={(_, val) => onUpdateEducation?.(val)}
          />
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