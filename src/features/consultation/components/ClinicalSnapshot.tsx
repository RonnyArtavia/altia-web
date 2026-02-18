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

  // Icon mapping for categories
  const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    medications: <Pill size={16} />,
    conditions: <Stethoscope size={16} />,
    allergies: <AlertTriangle size={16} />,
  };

  // Color classes for categories
  const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    medications: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    conditions: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    allergies: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  };

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

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2 text-slate-800 text-left">
      {/* Alerts */}
      {data.alerts && Array.isArray(data.alerts) && data.alerts.length > 0 && (
        <Card className="bg-red-50 border-red-100 shadow-sm">
          <CardContent className="p-4 flex items-start gap-3 text-red-800 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
            <span className="break-words">{data.alerts[0]}</span>
          </CardContent>
        </Card>
      )}

      {/* SOAP Card */}
      <Card className="shadow-sm animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <CardHeader
          className={`px-5 py-2.5 text-white text-xs font-bold uppercase tracking-widest flex-row items-center justify-between ${
            isHistoryView ? 'bg-slate-600' : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileEdit size={14} />
            <span>Nota Clínica SOAP</span>
          </div>
          {!isHistoryView && <span className="text-[10px] opacity-60">IA Generada</span>}
        </CardHeader>
        <CardContent className="p-5 space-y-0.5 text-left text-slate-800">
          <SoapMiniRow
            label="S"
            fullKey="s"
            text={data.soap?.s || data.soap?.subjective || ''}
            color="text-blue-600"
            onSave={(k, v) => onUpdateSoap?.(k === 's' ? 's' : 'subjective', v)}
            readOnly={isHistoryView}
          />
          <SoapMiniRow
            label="O"
            fullKey="o"
            text={data.soap?.o || data.soap?.objective || ''}
            color="text-emerald-600"
            onSave={(k, v) => onUpdateSoap?.(k === 'o' ? 'o' : 'objective', v)}
            readOnly={isHistoryView}
          />
          <SoapMiniRow
            label="A"
            fullKey="a"
            text={data.soap?.a || data.soap?.assessment || ''}
            color="text-amber-600"
            onSave={(k, v) => onUpdateSoap?.(k === 'a' ? 'a' : 'assessment', v)}
            readOnly={isHistoryView}
          />
          <SoapMiniRow
            label="P"
            fullKey="p"
            text={data.soap?.p || data.soap?.plan || ''}
            color="text-indigo-400"
            onSave={(k, v) => onUpdateSoap?.(k === 'p' ? 'p' : 'plan', v)}
            readOnly={isHistoryView}
          />
        </CardContent>
      </Card>

      {/* IPS Clinical Extract Card */}
      {totalItems > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="px-5 py-3 bg-gradient-to-r from-indigo-400 to-violet-400 text-white flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileHeart size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">
                {isHistoryView ? 'Extracto Clínico' : 'Resumen IPS'}
              </span>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {totalItems} {totalItems === 1 ? 'Registro' : 'Registros'}
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {Object.entries(groupedFHIR).map(([category, items]) => {
              const defaultColor = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
              const colors = CATEGORY_COLORS[category] || defaultColor;
              const icon = CATEGORY_ICONS[category] || <FileHeart size={16} />;

              return (
                <div key={category} className="space-y-2">
                  <div className={`flex items-center justify-between ${colors.text}`}>
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {category === 'medications' ? 'Medicamentos' :
                         category === 'conditions' ? 'Diagnósticos' :
                         category === 'allergies' ? 'Alergias' :
                         category}
                      </span>
                      <Badge className={`${colors.bg} ${colors.text} text-xs`}>
                        {items.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {items.map((item, i) => (
                      <IPSItemRow
                        key={item.id || i}
                        item={item}
                        colors={colors}
                        onUpdate={onUpdateFHIR}
                        onRemove={onRemoveFHIR}
                        readOnly={isHistoryView}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Patient Education Section */}
      <Card className="shadow-sm">
        <CardHeader className="px-5 py-2.5 bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-widest flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-sky-600" />
            <span>Educación y Recomendaciones</span>
          </div>
          {!isHistoryView && (
            <Button
              variant="ghost"
              size="sm"
              className="text-sky-600 hover:text-sky-800 hover:bg-sky-200 h-auto p-1.5"
              title="Enviar por correo"
            >
              <Mail size={14} />
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          <SoapMiniRow
            label="E"
            fullKey="education"
            text={data.healthEducation || ''}
            color="text-sky-600"
            readOnly={isHistoryView}
            onSave={(_, val) => onUpdateEducation?.(val)}
          />
        </CardContent>
      </Card>

      {/* Finalize Button */}
      {onFinalize && !isHistoryView && (
        <div className="space-y-3 pt-2">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Atención:</strong> La consulta médica <span className="font-bold underline">no ha sido guardada</span>.
                Puede realizar cambios ahora. Una vez guardada, la información será <span className="font-bold">permanente e inmodificable</span>.
              </p>
            </CardContent>
          </Card>

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
  );
}

export default ClinicalSnapshot;