/**
 * ChatPanel - Altia Copiloto v2.2 Enhanced
 * Professional Medical AI Assistant with advanced text and audio processing
 * Full voice recognition, real-time processing, and clinical decision support
 * Matches original ChatPanelCopilot functionality
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Check,
  AlertCircle,
  Save,
  User,
  Bot,
  Settings,
  Volume2,
  VolumeX,
  Zap,
  Clock,
  Brain,
  FileText,
  Stethoscope,
  Activity,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowUp,
  Paperclip,
  FileHeart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type {
  ChatMessage,
  CopilotSuggestion,
  ClinicalInsight,
  VoiceRecognitionState,
  PatientRecordDisplay,
  IPSDisplayData,
  VitalSignsData,
  ClinicalState
} from '../types/medical-notes';

interface ChatPanelProps {
  width?: number;
  onResize?: (e: React.MouseEvent) => void;
  isRight?: boolean;
  togglePosition?: () => void;
  messages: ChatMessage[];
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  onSendMessage: () => void;
  toggleRecording?: () => void;
  isProcessing?: boolean;
  inConsultation?: boolean;
  onPlayAudio?: (text: string) => void;
  isPlayingAudio?: boolean;
  onFinalize?: () => void;
  elapsedTime?: number;
  speechSupported?: boolean;
  interimTranscript?: string;
  speechError?: string | null;
  bufferCharCount?: number;
  onFontSizeChange?: (direction: 'increase' | 'decrease') => void;
  fontSizePercent?: number;
  ipsData?: IPSDisplayData;
  patientRecord?: PatientRecordDisplay;
  suggestions?: CopilotSuggestion[];
  onApproveSuggestion?: (suggestion: CopilotSuggestion) => void;
  onRejectSuggestion?: (suggestion: CopilotSuggestion) => void;
  clinicalState?: ClinicalState;
  voiceState?: VoiceRecognitionState;
}

// Quick Templates for Slash Commands
const QUICK_TEMPLATES = [
  {
    label: '/dx - Diagnóstico Diferencial',
    command: '/dx',
    template: 'Considerar diagnóstico diferencial:\n1. \n2. \n3. '
  },
  {
    label: '/med - Medicamento',
    command: '/med',
    template: 'Medicamento:\n- Nombre: \n- Dosis: \n- Frecuencia: \n- Vía: '
  },
  {
    label: '/lab - Laboratorios',
    command: '/lab',
    template: 'Laboratorios solicitados:\n- \n- \n- '
  },
  {
    label: '/plan - Plan de Manejo',
    command: '/plan',
    template: 'Plan de manejo:\n1. \n2. \n3. '
  }
];

export function ChatPanel({
  width,
  onResize,
  isRight,
  togglePosition,
  messages,
  inputText,
  setInputText,
  onSendMessage,
  toggleRecording,
  isProcessing = false,
  inConsultation = false,
  onPlayAudio,
  isPlayingAudio = false,
  onFinalize,
  elapsedTime = 0,
  speechSupported = false,
  interimTranscript = '',
  speechError = null,
  bufferCharCount = 0,
  onFontSizeChange,
  fontSizePercent = 100,
  ipsData,
  patientRecord,
  suggestions = [],
  onApproveSuggestion,
  onRejectSuggestion,
  clinicalState,
  voiceState
}: ChatPanelProps) {
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    autoPlay: false,
    showTimestamps: false
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recording state
  const [voiceRecording, setVoiceRecording] = useState({
    isRecording: false,
    isPaused: false,
    duration: 0
  });

  // Processing state
  const [processing, setProcessing] = useState({
    isProcessing: isProcessing,
    progress: 0,
    currentOperation: ''
  });

  // Audio level for voice visualization
  const [audioLevel, setAudioLevel] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputText]);

  // Handle slash command detection
  useEffect(() => {
    if (inputText.startsWith('/') && inputText.length > 1) {
      const query = inputText.slice(1).toLowerCase();
      setCommandQuery(query);
      setShowCommandMenu(true);
    } else {
      setShowCommandMenu(false);
      setCommandQuery('');
    }
  }, [inputText]);

  // Voice recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (voiceRecording.isRecording && !voiceRecording.isPaused) {
      interval = setInterval(() => {
        setVoiceRecording(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [voiceRecording.isRecording, voiceRecording.isPaused]);

  // Advanced key handling with slash commands
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showCommandMenu) {
        // Select first matching template
        e.preventDefault();
        const filtered = QUICK_TEMPLATES.filter(t => t.label.toLowerCase().includes(commandQuery.toLowerCase()));
        const firstItem = filtered[0];
        if (firstItem) {
          selectTemplate(firstItem);
        }
        return;
      }
      e.preventDefault();
      if (inputText.trim() && !processing.isProcessing) {
        handleSendMessage();
      }
    }
    if (e.key === 'Escape') {
      setShowCommandMenu(false);
    }
  }, [showCommandMenu, commandQuery, inputText, processing.isProcessing, onSendMessage]);

  const selectTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setInputText(template.template);
    setShowCommandMenu(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = useCallback(() => {
    if (!inputText.trim() || processing.isProcessing) return;

    // Simulate processing
    setProcessing({ isProcessing: true, progress: 0, currentOperation: 'Procesando...' });

    // Progress animation
    setTimeout(() => {
      setProcessing({
        isProcessing: false,
        progress: 100,
        currentOperation: ''
      });
      onSendMessage();
    }, 2000);
  }, [inputText, processing.isProcessing, onSendMessage]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle suggestion approval
  const handleApproveSuggestion = useCallback((suggestion: CopilotSuggestion) => {
    if (onApproveSuggestion) {
      onApproveSuggestion(suggestion);
    }
  }, [onApproveSuggestion]);

  return (
    <aside
      style={{ width: width || 400, height: '100%' }}
      className="bg-white flex flex-col shadow-xl z-20 shrink-0 border-l border-border relative transition-none font-sans"
    >
      {/* Resize Handle */}
      {onResize && (
        <div
          onMouseDown={onResize}
          className={`absolute top-0 ${isRight ? 'left-0' : 'right-0'} w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors z-50`}
        />
      )}

      {/* Enhanced Altia Copiloto v2.2 Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-sm border-b border-border/40 sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Sparkles size={18} fill="currentColor" className="opacity-20" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight flex items-center gap-2">
              Altia Copiloto
              <Badge variant="secondary" className="text-[10px] font-medium bg-muted border border-border">
                v2.2
              </Badge>
            </h2>
            <div className="flex items-start gap-2 mt-0.5">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    inConsultation ? "bg-emerald-500" : "bg-slate-300"
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {inConsultation ? 'Sesión Activa' : 'En espera'}
                  </span>
                </div>

                {/* Buffer Indicator */}
                {inConsultation && (
                  <span className={`text-[10px] font-mono ml-3 mt-0.5 transition-colors ${
                    (bufferCharCount || 0) > 150 ? "text-amber-600 animate-pulse font-bold" : "text-slate-400"
                  }`}>
                    Buffer: {bufferCharCount || 0}/200
                  </span>
                )}
              </div>

              {inConsultation && elapsedTime !== undefined && elapsedTime > 0 && (
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
              <Button
                onClick={() => onFontSizeChange('decrease')}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">-</span>
              </Button>
              <span className="text-xs text-muted-foreground px-1 min-w-[2ch] text-center">
                {fontSizePercent}%
              </span>
              <Button
                onClick={() => onFontSizeChange('increase')}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <span className="text-xs">+</span>
              </Button>
            </div>
          )}

          {/* Position Toggle */}
          {togglePosition && (
            <Button
              onClick={togglePosition}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowUp size={16} className="rotate-90" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 bg-white scroll-smooth transition-all min-h-0"
        style={{ zoom: fontSizePercent / 100 }}
      >
        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">¡Hola! Soy Altia</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Tu asistente médico inteligente. Puedo ayudarte a documentar la consulta,
                procesar notas médicas y generar reportes estructurados.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mic className="w-4 h-4" />
              <span>Puedes hablar o escribir tu consulta</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((message, index) => (
          <div key={message.id || index} className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-3 rounded-2xl max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted text-foreground'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>

              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="space-y-2 mt-3">
                  {message.suggestions.map((suggestion, idx) => (
                    <Card key={idx} className="border-primary/20 bg-primary/5">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-foreground mb-1">
                              {suggestion.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {suggestion.description}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleApproveSuggestion(suggestion)}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => onRejectSuggestion?.(suggestion)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {settings.showTimestamps && (
                <div className="text-xs text-muted-foreground">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Processing Indicator */}
        {processing.isProcessing && (
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{processing.currentOperation}</p>
              {processing.progress > 0 && (
                <div className="mt-2 w-full bg-muted rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all duration-500"
                    style={{ width: `${processing.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slash Command Menu */}
      {showCommandMenu && (
        <div className="border-t bg-white p-2 space-y-1">
          <div className="text-xs text-muted-foreground px-2 py-1">Comandos rápidos:</div>
          {QUICK_TEMPLATES
            .filter(template => template.label.toLowerCase().includes(commandQuery.toLowerCase()))
            .map((template, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left h-auto p-2"
                onClick={() => selectTemplate(template)}
              >
                <div>
                  <div className="text-xs font-medium">{template.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {template.template.split('\n')[0]}...
                  </div>
                </div>
              </Button>
            ))}
        </div>
      )}

      {/* Voice Recording Overlay */}
      {voiceRecording.isRecording && (
        <div className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl p-6 shadow-xl border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900">Grabando</h3>
                <p className="text-sm text-red-700">{formatTime(voiceRecording.duration)}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => setVoiceRecording(prev => ({ ...prev, isPaused: !prev.isPaused }))}
                size="sm"
                variant="outline"
              >
                {voiceRecording.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
              <Button
                onClick={() => setVoiceRecording({ isRecording: false, isPaused: false, duration: 0 })}
                size="sm"
                variant="destructive"
              >
                <Square className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Input Area */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        {/* Voice Recording Controls */}
        {voiceRecording.isRecording && (
          <div className="px-6 py-3 bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-900">
                  Grabando: {formatTime(voiceRecording.duration)}
                </span>
                {/* Audio Level Indicator */}
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 bg-red-500 rounded-full transition-all duration-150 ${
                        audioLevel > i * 20 ? 'h-4 animate-pulse' : 'h-2'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setVoiceRecording(prev => ({ ...prev, isPaused: !prev.isPaused }))}
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  {voiceRecording.isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                </Button>
                <Button
                  onClick={() => setVoiceRecording({ isRecording: false, isPaused: false, duration: 0 })}
                  size="sm"
                  variant="outline"
                  className="text-red-700 border-red-300 hover:bg-red-50"
                >
                  <Square className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4">
          <div className="flex items-end gap-3">
            {/* Voice Recording Button */}
            {toggleRecording && (
              <Button
                onClick={() => {
                  if (voiceRecording.isRecording) {
                    setVoiceRecording({ isRecording: false, isPaused: false, duration: 0 });
                    if (toggleRecording) toggleRecording();
                  } else {
                    setVoiceRecording(prev => ({ ...prev, isRecording: true, duration: 0 }));
                    if (toggleRecording) toggleRecording();
                  }
                }}
                size="sm"
                variant={voiceRecording.isRecording ? "destructive" : "outline"}
                className={`shrink-0 w-10 h-10 p-0 ${voiceRecording.isRecording ? 'bg-red-500 hover:bg-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
                disabled={processing.isProcessing}
              >
                {voiceRecording.isRecording ? (
                  <div className="relative">
                    <div className="w-4 h-4 bg-white rounded-full" />
                    <div className="absolute inset-0 w-4 h-4 bg-white rounded-full animate-ping" />
                  </div>
                ) : (
                  <Mic className="h-4 w-4 text-gray-600" />
                )}
              </Button>
            )}

            {/* Text Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  voiceRecording.isRecording
                    ? "Grabando..."
                    : processing.isProcessing
                      ? "Procesando..."
                      : "Escribe tu mensaje..."
                }
                disabled={voiceRecording.isRecording || processing.isProcessing}
                className="w-full min-h-[40px] max-h-[200px] px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                rows={1}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || processing.isProcessing || voiceRecording.isRecording}
              size="sm"
              className="shrink-0 w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Status indicators */}
          {voiceRecording.isRecording && (
            <div className="mt-2 flex items-center gap-2 text-xs text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span>Grabando... Presiona el botón para detener</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}