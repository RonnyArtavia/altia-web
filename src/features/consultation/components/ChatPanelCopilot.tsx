/**
 * ChatPanelCopilot - Modern Conversational Interface
 * Inspired by Claude.ai / ChatGPT aesthetics
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  ArrowUp,
  Sparkles,
  Paperclip,
  FileSignature,
  FileHeart,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

// Use explicit SVG URL for better compatibility
const altiaIconSvg = '/src/assets/logo/ALTIA-Icono.svg';
import type { ChatMessage, IPSDisplayData, CopilotSuggestion } from '@/features/consultation/types/medical-notes';
import { cn } from '@/lib/utils';
import { useClinicalGuard } from '@/features/consultation/hooks/useClinicalGuard';
import { SafeguardsPanel } from './SafeguardsPanel';
import { useFileUpload } from '@/features/consultation/hooks/useFileUpload';
import { LabResultReview } from './LabResultReview'; // Feature: Lab Review
import { ProcessingStatusIndicator } from './ProcessingStatusIndicator';


interface ChatPanelCopilotProps {
  width: number;
  onResize: (e: React.MouseEvent) => void;
  isRight: boolean;
  togglePosition: () => void;
  messages: ChatMessage[];
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  onSendMessage: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  onStopRecordingAndSend?: () => void;
  onPauseRecording?: () => void;
  isPaused?: boolean;
  isProcessing: boolean;
  inConsultation: boolean;
  onPlayAudio: (text: string) => void;
  isPlayingAudio: boolean;
  onFinalize: () => void;
  elapsedTime?: number;
  speechSupported?: boolean;
  interimTranscript?: string;
  speechError?: string | null;
  onClearSpeechError?: () => void;
  micPermissionStatus?: string;
  onRequestMicPermission?: () => Promise<boolean>;
  connectivityStatus?: string;
  onCheckConnectivity?: () => Promise<boolean>;
  ipsData?: IPSDisplayData;
  onAnalyzeDocument?: (fileUrl: string, mimeType: string, file?: File) => Promise<any>;
  onConfirmLabResults?: (data: any) => void;
  clinicalState?: any;
  patientName?: string;
  onApproveSuggestion?: (suggestion: CopilotSuggestion) => void;
  isPreprocessing?: boolean;
  lastProcessedTime?: Date | null;
  silenceDetectedTime?: Date | null;
  bufferCharCount?: number;
  // Save prompt props
  showSavePrompt?: boolean;
  onSaveConsultation?: () => void;
  onCancelSave?: () => void;
  onFinalizeRecording?: () => void;
  // Font size settings
  fontSize?: 'small' | 'medium' | 'large';
  fontSizePercent?: number;
  onFontSizeChange?: (size: 'small' | 'medium' | 'large') => void;
  onFontSizePercentChange?: (percent: number) => void;
}

// Quick Templates / Macros
const QUICK_TEMPLATES = [
  { id: 'exam_normal', label: 'Examen Físico Normal', text: 'Registrar examen físico normal: Paciente consciente, orientado, hidratado. Cardiopulmonar estable sin ruidos agregados. Abdomen blando depresible no doloroso.' },
  { id: 'soap_start', label: 'Estructura SOAP', text: 'Inicia nota SOAP completa.' },
  { id: 'plan_hypertension', label: 'Plan HTA', text: 'Plan para hipertensión: Enalapril 20mg PO QD, control de PA diario, dieta hiposódica.' },
];

import { PrescriptionDraft, type MedicationItem } from './PrescriptionDraft'; // Feature 4
import { PatientFollowUp } from './PatientFollowUp'; // Feature 5

export function ChatPanelCopilot({
  width,
  onResize,
  isRight,
  togglePosition,
  messages,
  inputText,
  setInputText,
  onSendMessage,
  isRecording,
  toggleRecording,
  onStopRecordingAndSend,
  onPauseRecording,
  isPaused,
  isProcessing,
  inConsultation,
  interimTranscript,
  speechSupported = true,
  elapsedTime,
  ipsData,
  onAnalyzeDocument,
  onConfirmLabResults,
  patientName,
  onApproveSuggestion,
  isPreprocessing,
  bufferCharCount = 0,
  showSavePrompt,
  onSaveConsultation,
  onCancelSave,
  onFinalizeRecording,
  fontSize = 'medium',
  fontSizePercent = 100,
  onFontSizeChange,
  onFontSizePercentChange,
}: ChatPanelCopilotProps) {

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* File Upload State */
  const { uploadFile, isUploading } = useFileUpload();

  // console.log('🎨 [ChatPanel] Render. isProcessing:', isProcessing);

  /* Slash Command State */
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');

  /* Feature 4: Prescription Draft State */
  const [showPrescriptionDraft, setShowPrescriptionDraft] = useState(false);
  const [draftItems, setDraftItems] = useState<MedicationItem[] | undefined>(undefined);

  /* Feature 5: Follow Up State */
  const [showFollowUp, setShowFollowUp] = useState(false);

  /* Feature: Lab Result Review */
  const [pendingLabResults, setPendingLabResults] = useState<any | null>(null);

  /* Clinical Guard (Real-time CDS) */
  const safeIpsData = ipsData || { allergies: [], medications: [], conditions: [], vaccines: [], encounters: [], clinicalEvolution: [] };
  const { alerts, status: guardStatus } = useClinicalGuard(inputText, safeIpsData);

  // Handle Suggestion Approval
  const handleApproveSuggestion = (suggestion: CopilotSuggestion) => {
    onApproveSuggestion?.(suggestion);
  };

  // Handle File Select
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      if (result && onAnalyzeDocument) {
        const analysisData = await onAnalyzeDocument(result.url, file.type, file);
        if (analysisData) {
          setPendingLabResults(analysisData); // Open review modal
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };



  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, interimTranscript]);

  // Height auto-adjustment for textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputText]);

  // Handle Input Change for Slash Detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    // Detect Slash
    const lastWord = val.split(' ').pop();
    if (lastWord?.startsWith('/')) {
      setShowCommandMenu(true);
      setCommandQuery(lastWord.substring(1)); // Query without '/'
    } else {
      setShowCommandMenu(false);
    }
  };

  // Insert Template
  const selectTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    const words = inputText.split(' ');
    words.pop(); // Remove the command part (e.g., "/exa")
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + tpl.text + ' ';
    setInputText(newText);
    setShowCommandMenu(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showCommandMenu) {
        // Should select first item, but simple close for now
        e.preventDefault();
        const filtered = QUICK_TEMPLATES.filter(t => t.label.toLowerCase().includes(commandQuery.toLowerCase()));
        const firstItem = filtered[0];
        if (firstItem) {
          selectTemplate(firstItem);
        }
        return;
      }
      e.preventDefault();
      onSendMessage();
    }
    if (e.key === 'Escape') {
      setShowCommandMenu(false);
    }
  };

  return (
    <aside
      style={{ width, height: '100%' }}
      className="bg-white flex flex-col shadow-xl z-20 shrink-0 border-l border-border relative transition-none font-sans"
    >
      {/* Resize Handle */}
      <div
        onMouseDown={onResize}
        className={`absolute top-0 ${isRight ? 'left-0' : 'right-0'} w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50`}
      />

      {/* Modern Header - Minimalist */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
            <img
              src={altiaIconSvg}
              alt="ALTIA"
              className="w-5 h-5 object-contain"
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              Altia Copiloto
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border">
                v2.2
              </span>
            </h2>
            <div className="flex items-start gap-2 mt-0.5">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", inConsultation ? "bg-emerald-500" : "bg-slate-300")} />
                  <span className="text-xs text-muted-foreground">
                    {inConsultation ? 'Sesión Activa' : 'En espera'}
                  </span>
                </div>

                {/* Buffer Indicator (Always Visible in Consultation) */}
                {inConsultation && (
                  <span className={cn(
                    "text-[10px] font-mono ml-3 mt-0.5 transition-colors",
                    (bufferCharCount || 0) > 150 ? "text-amber-600 animate-pulse font-bold" : "text-slate-400"
                  )}>
                    Buffer: {bufferCharCount || 0}/200
                  </span>
                )}
              </div>

              {inConsultation && elapsedTime !== undefined && (
                <div className="flex items-center gap-2 border-l border-border pl-2 h-4 self-center">
                  <span className="text-xs font-mono text-muted-foreground/80">
                    {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {/* Font Size Control */}
          {onFontSizeChange && (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-md p-0.5 border border-border/50">
              <button
                onClick={() => onFontSizeChange('small')}
                className={cn(
                  "px-1.5 py-1 text-[10px] font-medium rounded transition-all",
                  fontSize === 'small'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Letra pequeña"
              >
                A
              </button>
              <button
                onClick={() => onFontSizeChange('medium')}
                className={cn(
                  "px-1.5 py-1 text-xs font-medium rounded transition-all",
                  fontSize === 'medium'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Letra mediana"
              >
                A
              </button>
              <button
                onClick={() => onFontSizeChange('large')}
                className={cn(
                  "px-1.5 py-1 text-sm font-medium rounded transition-all",
                  fontSize === 'large'
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title="Letra grande"
              >
                A
              </button>
            </div>
          )}

          {/* Settings Trigger - Placeholder */}
          {/* <button className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
            <MoreVertical size={18} />
          </button> */}
          <div className="flex items-center gap-1">
            <button onClick={togglePosition} className="p-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
              <ArrowUp size={16} className="rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area - Document Style */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-white scroll-smooth transition-all min-h-0"
        style={{ zoom: fontSizePercent / 100 }}
      >
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className={cn("group flex gap-4 max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-500", msg.role === 'user' ? "flex-row-reverse" : "")}>

            {/* Avatar */}
            <div className={cn(
              "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium select-none mt-1 shadow-sm transition-transform hover:scale-105",
              msg.role === 'assistant'
                ? "bg-white p-1"
                : "bg-muted text-muted-foreground"
            )}>
              {/* ALTIA icon for assistant, text avatar for user */}
              {msg.role === 'assistant' ? (
                <img
                  src={altiaIconSvg}
                  alt="ALTIA"
                  className="w-6 h-6 object-contain"
                />
              ) : (
                "Dr"
              )}
            </div>

            {/* Message Content */}
            <div className={cn("flex-1 min-w-0 space-y-2", msg.role === 'user' ? "text-right" : "text-left")}>
              {/* Sender Name */}
              <div className="text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                {msg.role === 'assistant' ? 'Altia Copilot' : 'Dr. Usuario'}
              </div>

              {msg.isWelcome ? (
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 text-foreground/80 leading-relaxed">
                  {msg.content || msg.text}
                </div>
              ) : (
                <div className={cn(
                  "leading-7 whitespace-pre-wrap break-words",
                  msg.role === 'user' ? "bg-muted/50 px-4 py-2.5 rounded-2xl text-foreground inline-block text-left" : "text-foreground ai-stream-text"
                )}>
                  {msg.content || msg.text}
                </div>
              )}

              {/* Attachments / Insights */}
              {/* Grouped Insights / Alerts (Advisor) - Single Card */}
              {msg.insights && msg.insights.length > 0 && (
                <div className="mt-3 p-3 bg-white/80 border border-indigo-100 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-indigo-50">
                    <span className="text-indigo-500">✨</span>
                    <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Sugerencias Clínicas</span>
                  </div>
                  <div className="space-y-2">
                    {msg.insights.map((insight, i) => (
                      <div key={i} className="flex gap-2 text-sm items-start">
                        <span className="mt-0.5 shrink-0" title={insight.severity}>
                          {insight.severity === 'high' ? '🔴' : insight.severity === 'medium' ? '🟡' : '🔵'}
                        </span>
                        <div>
                          <span className="font-medium text-slate-700 block text-xs">{insight.title}</span>
                          <span className="text-slate-600 text-xs leading-relaxed">{insight.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions for Approval */}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1 pl-1">
                    <img
                      src={altiaIconSvg}
                      alt="ALTIA"
                      className="w-3 h-3 object-contain"
                    />
                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Sugerencias (Requieren Aprobación)</span>
                  </div>
                  {msg.suggestions.map((suggestion) => (
                    <div key={suggestion.id} className="p-3 bg-white border border-indigo-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase",
                              suggestion.type === 'diagnosis' ? "bg-red-50 text-red-700 border-red-200" :
                                suggestion.type === 'medication' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                  suggestion.type === 'lab' ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                                    "bg-slate-50 text-slate-700 border-slate-200"
                            )}>
                              {suggestion.type === 'diagnosis' ? 'Diagnóstico' :
                                suggestion.type === 'medication' ? 'Medicamento' :
                                  suggestion.type === 'lab' ? 'Laboratorio' : 'Corrección'}
                            </span>
                            <span className="font-semibold text-sm text-slate-800">{suggestion.title}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1.5 ml-0.5 leading-relaxed">{suggestion.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => onApproveSuggestion?.(suggestion)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-colors border border-emerald-100"
                            title="Aprobar y agregar a la nota"
                          >
                            <CheckCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}



        {/* Processing Message Bubble */}
        {isProcessing && (
          <div className="group flex gap-4 max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
            {/* Avatar */}
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium select-none mt-1 shadow-sm bg-white p-1">
              <img
                src={altiaIconSvg}
                alt="ALTIA"
                className="w-6 h-6 object-contain"
              />
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0 space-y-2 text-left">
              {/* Sender Name */}
              <div className="text-xs font-medium text-muted-foreground">
                Altia Copilot
              </div>

              <div className="leading-7 ai-stream-text">
                <ProcessingStatusIndicator
                  isProcessing={isProcessing}
                  className="py-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Prompt - Shown after finalize recording */}
        {showSavePrompt && (
          <div className="group flex gap-4 max-w-3xl mx-auto animate-in slide-in-from-bottom-2 duration-500">
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium select-none mt-1 shadow-sm bg-emerald-500 text-white">
              <CheckCircle size={14} />
            </div>
            <div className="flex-1 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl shadow-sm">
              <p className="font-semibold text-emerald-800 text-sm">¿Desea guardar la consulta?</p>
              <p className="text-xs text-emerald-600 mt-1">Los datos clínicos serán guardados de forma permanente en el expediente del paciente.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={onCancelSave}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSaveConsultation}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg hover:from-emerald-600 hover:to-teal-600 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  Guardar Consulta
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>



      {/* Modern Input Area ("Command Center") */}
      <div className="p-4 sm:p-6 bg-white shrink-0 relative">
        <div className="max-w-3xl mx-auto space-y-3">



          <div className={cn(
            "relative bg-background rounded-2xl border transition-all duration-200 shadow-sm",
            inConsultation
              ? "border-input hover:border-primary/40 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
              : "border-slate-200 bg-slate-50/50"
          )}>

            {/* Clinical Safeguards Panel */}
            {inConsultation && (
              <SafeguardsPanel status={guardStatus} alerts={alerts} />
            )}

            {/* Feature 4: Prescription Draft Mode */}
            {showPrescriptionDraft && (
              <PrescriptionDraft
                initialItems={draftItems || []}
                onCancel={() => { setShowPrescriptionDraft(false); setDraftItems(undefined); }}
                onConfirm={(items) => {
                  // Format prescription text
                  const scriptText = "RECETA MÉDICA:\n" + items.map(i => `- ${i.name} ${i.dose} (${i.frequency}) x ${i.duration}`).join('\n');
                  setInputText(prev => prev + (prev ? '\n\n' : '') + scriptText);
                  setShowPrescriptionDraft(false);
                  textareaRef.current?.focus();
                }}
              />
            )}

            {/* Feature 5: Patient Follow-up Automation */}
            {showFollowUp && (
              <PatientFollowUp
                onClose={() => setShowFollowUp(false)}
              />
            )}

            {/* Slash Command Menu */}
            {showCommandMenu && (
              <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 z-50">
                <div className="bg-muted/50 px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground">
                  Comandos Rápidos
                </div>
                <div className="max-h-48 overflow-y-auto p-1">
                  {QUICK_TEMPLATES.filter(t => t.label.toLowerCase().includes(commandQuery.toLowerCase())).map((tpl, i) => (
                    <button
                      key={tpl.id}
                      onClick={() => selectTemplate(tpl)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex flex-col gap-0.5",
                        i === 0 ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      )}
                    >
                      <span className="font-medium">{tpl.label}</span>
                      <span className="text-[10px] opacity-70 truncate">{tpl.text}</span>
                    </button>
                  ))}
                  {QUICK_TEMPLATES.filter(t => t.label.toLowerCase().includes(commandQuery.toLowerCase())).length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">No se encontraron comandos</div>
                  )}
                </div>
              </div>
            )}

            {/* Feature: Lab Result Review */}
            {pendingLabResults && (
              <div className="absolute bottom-full left-0 right-0 mb-4 z-50 flex justify-center">
                <LabResultReview
                  data={pendingLabResults}
                  currentPatientName={patientName || "Paciente"} // Use real name
                  onCancel={() => setPendingLabResults(null)}
                  onConfirm={() => {
                    // console.log('MOUSE [ChatPanel] Confirm clicked. Data:', pendingLabResults);
                    if (onConfirmLabResults) {
                      // console.log('CHECK [ChatPanel] Calling onConfirmLabResults...');
                      onConfirmLabResults(pendingLabResults);
                    } else {
                      // console.warn('WARN [ChatPanel] onConfirmLabResults is UNDEFINED');
                    }
                    setPendingLabResults(null);
                  }}
                />
              </div>
            )}


            {/* Recording / Preprocessing Overlay - Futuristic "Sci-Fi" Waveform */}
            {(isRecording || isPaused || isPreprocessing) && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xl rounded-2xl z-20 flex items-center justify-between px-6 border border-indigo-100 shadow-lg transition-all duration-300">

                {/* Left: Dynamic Waveform & Status */}
                <div className="flex items-center gap-4">
                  {/* Digital Waveform Visualizer */}
                  <div className="flex items-center gap-[3px] h-8">
                    {isRecording ? (
                      // Recording: Active Voice Bars
                      [...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 via-purple-500 to-rose-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.4)]"
                          style={{
                            height: `${Math.max(40, Math.random() * 100)}%`, // Initial random height
                            animationDuration: `${0.6 + Math.random() * 0.4}s`,
                            animationDelay: `${i * 0.05}s`
                          }}
                        />
                      ))
                    ) : isPaused ? (
                      // Paused: Static Amber Bars
                      [...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 rounded-full bg-amber-400/60"
                          style={{ height: '40%' }}
                        />
                      ))
                    ) : (
                      // Cleaning: Scanning Line / Processing Bars
                      [...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-full rounded-full bg-cyan-400/20"
                        >
                          <div className="w-full bg-cyan-500 rounded-full animate-[ping_1.5s_ease-out_infinite]" style={{ height: '30%', animationDelay: `${i * 0.1}s` }} />
                        </div>
                      ))
                    )}
                  </div>

                  {/* Tech Status Text */}
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-sm font-bold bg-clip-text text-transparent tracking-wide uppercase",
                      isPaused
                        ? "bg-gradient-to-r from-amber-500 to-orange-600"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600"
                    )}>
                      {isPaused ? 'PAUSADO' : (isRecording ? 'ESCUCHANDO' : 'Procesando Datos')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono tracking-widest">
                      {isPaused ? 'DICTADO DETENIDO' : (isRecording ? 'MIC: ACTIVO // 44.1kHz' : 'AI: ALTIA')}
                    </span>
                  </div>
                </div>

                {/* Right: Actions (Pause / Finalize) */}
                {(isRecording || isPaused) && (
                  <div className="flex items-center gap-2">
                    {/* Pause / Resume Button */}
                    <button
                      onClick={isPaused ? toggleRecording : onPauseRecording}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-2 border rounded-lg transition-all",
                        isPaused
                          ? "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-200"
                          : "bg-amber-50 hover:bg-amber-100 border-amber-100 hover:border-amber-200"
                      )}
                    >
                      <span className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        isPaused ? "text-emerald-700/80 group-hover:text-emerald-700" : "text-amber-700/80 group-hover:text-amber-700"
                      )}>
                        {isPaused ? 'Reanudar' : 'Pausar'}
                      </span>
                    </button>

                    {/* Finalize Button - Now calls onFinalizeRecording */}
                    <button
                      onClick={onFinalizeRecording || onStopRecordingAndSend}
                      className="group flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 rounded-lg transition-all"
                    >
                      <span className="text-xs font-bold text-rose-600 group-hover:text-rose-700 uppercase tracking-widest">Finalizar</span>
                      <div className="w-2 h-2 rounded-sm bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.6)] group-hover:scale-125 transition-transform" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              // ENABLED ALWAYS so user can start consultation by typing
              // disabled={!inConsultation}
              placeholder={inConsultation ? "Escriba o dicte la nota médica" : "Escriba o dicte la nota médica"}
              className="w-full bg-transparent border-0 px-4 py-3 text-[15px] resize-none max-h-[200px] focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50 leading-relaxed scrollbar-thin scrollbar-thumb-border"
              rows={1}
            />

            <div className="flex items-center justify-between px-2 pb-2">
              {/* Left Tools */}
              <div className="flex gap-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    "p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors hover:text-primary",
                    isUploading && "animate-pulse cursor-wait"
                  )}
                  title="Adjuntar resultados"
                >
                  <Paperclip size={18} />
                </button>
                {isRecording ? (
                  <>
                    <button
                      onClick={onPauseRecording}
                      className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2 border border-amber-200"
                      title="Pausar y Procesar"
                    >
                      <span className="text-xs font-semibold">Pausar</span>
                    </button>
                    <button
                      onClick={onFinalizeRecording || onStopRecordingAndSend}
                      className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2 border border-rose-200 animate-pulse"
                      title="Finalizar y Guardar"
                    >
                      <div className="w-3 h-3 bg-rose-600 rounded-sm" />
                      <span className="text-xs font-bold">Finalizar</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={toggleRecording}
                    disabled={!speechSupported}
                    className="p-2 rounded-lg transition-colors flex items-center gap-2 text-muted-foreground hover:bg-muted hover:text-primary"
                    title="Iniciar Dictado"
                  >
                    <Mic size={18} />
                  </button>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={onSendMessage}
                disabled={!inputText.trim() || isProcessing}
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  inputText.trim()
                    ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                <ArrowUp size={20} />
              </button>
            </div>
          </div>

          <div className="text-[10px] text-center text-muted-foreground/60 select-none">
            Altia AI puede cometer errores. Verifica la información clínica importante.
          </div>
        </div>
      </div>
    </aside >
  );
}

export default ChatPanelCopilot;