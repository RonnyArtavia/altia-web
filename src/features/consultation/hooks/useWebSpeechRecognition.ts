/**
 * useWebSpeechRecognition - Web Speech API hook for browser voice recognition
 *
 * Features:
 * - Real-time transcription with interim results
 * - Spanish (es-ES) language support
 * - Auto-restart on interruption in continuous mode
 * - Detailed error messages in Spanish
 * - Browser support detection
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  errorCode: string | null;
  isSupported: boolean;
  permissionStatus: 'unknown' | 'granted' | 'denied' | 'prompt';
  connectivityStatus: 'unknown' | 'checking' | 'ok' | 'blocked' | 'timeout';
}

interface UseWebSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoRestart?: boolean;
  onResult?: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

// Error messages in Spanish for better UX
const ERROR_MESSAGES: Record<string, string> = {
  'no-speech': 'No se detectó voz. Intente hablar más fuerte o acercarse al micrófono.',
  'audio-capture': 'No se pudo acceder al micrófono. Verifique que esté conectado y habilitado.',
  'not-allowed': 'Permiso de micrófono denegado. Por favor, habilite el acceso al micrófono en la configuración del navegador.',
  'network': 'Error de conexión con el servicio de voz. Verifique su conexión a internet y que no haya firewall bloqueando.',
  'aborted': 'Reconocimiento de voz cancelado.',
  'service-not-allowed': 'Servicio de reconocimiento de voz no disponible.',
  'bad-grammar': 'Error en la configuración del reconocimiento.',
  'language-not-supported': 'El idioma seleccionado no está soportado.',
  default: 'Error en el reconocimiento de voz. Intente nuevamente.',
};

// Errors that should trigger automatic retry
const RETRYABLE_ERRORS = ['network', 'aborted', 'no-speech'];

// Check if we can reach Google's speech services
async function checkSpeechServiceConnectivity(): Promise<{ ok: boolean; issue?: string }> {
  try {
    // Try to reach Google's servers (used by Chrome for speech recognition)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return { ok: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { ok: false, issue: 'timeout' };
    }
    return { ok: false, issue: 'blocked' };
  }
}

// Declare Web Speech API types
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useWebSpeechRecognition(options: UseWebSpeechRecognitionOptions = {}) {
  const {
    language = 'es-ES',
    continuous = true,
    interimResults = true, // Default to true for real-time feedback
    autoRestart = true,
    onResult,
    onInterimResult,
    onError,
    onListeningChange,
  } = options;

  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    errorCode: null,
    isSupported: false,
    permissionStatus: 'unknown',
    connectivityStatus: 'unknown',
  });

  const recognitionRef = useRef<any>(null);
  const shouldRestartRef = useRef(false);
  const isManualStopRef = useRef(false);
  const retryCountRef = useRef(0);
  const startTimeRef = useRef(0); // For tracking session duration
  const rapidFailuresRef = useRef(0); // For tracking rapid loops
  const maxRetries = 3;
  const retryDelayMs = 1000;

  // Store callbacks in refs to avoid infinite loops
  const onResultRef = useRef(onResult);
  const onInterimResultRef = useRef(onInterimResult);
  const onErrorRef = useRef(onError);
  const onListeningChangeRef = useRef(onListeningChange);

  // Update refs when callbacks change
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onInterimResultRef.current = onInterimResult;
  }, [onInterimResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onListeningChangeRef.current = onListeningChange;
  }, [onListeningChange]);

  // Check browser support and setup recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Compatibility check for standard and webkit prefixed API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognition) {
        // console.log('🎤 [useWebSpeechRecognition] Browser supports Speech Recognition:', SpeechRecognition.name || 'Native');
        setState((prev) => ({ ...prev, isSupported: true }));

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        // Configuration optimized for stability
        recognition.continuous = continuous;
        recognition.lang = language;
        recognition.interimResults = interimResults;
        recognition.maxAlternatives = 1;

        // Note: Removed 'grammars' assignment as it can cause issues in some browsers/versions


        recognition.onstart = () => {
          startTimeRef.current = Date.now();
          setState((prev) => ({
            ...prev,
            isListening: true,
            error: null,
            errorCode: null,
            permissionStatus: 'granted',
          }));
          onListeningChangeRef.current?.(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          let interimTranscript = '';

          // Reset rapid failures if we get ANY result (it means it's working)
          if (event.results.length > 0) {
            rapidFailuresRef.current = 0;
          }

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (!result || !result[0]) continue;
            const transcript = result[0].transcript;

            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setState((prev) => ({
              ...prev,
              transcript: prev.transcript ? `${prev.transcript} ${finalTranscript.trim()}` : finalTranscript.trim(),
              interimTranscript: '',
            }));
            onResultRef.current?.(finalTranscript.trim());
          }

          if (interimTranscript) {
            setState((prev) => ({ ...prev, interimTranscript }));
            onInterimResultRef.current?.(interimTranscript);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const errorCode = event.error || 'default';
          let isRetryable = RETRYABLE_ERRORS.includes(errorCode);

          // EDGE SPECIFIC: Microsoft Edge often fails with 'network' error because it lacks Google API keys.
          // This is not a retryable network error; it's a permanent lack of service.
          const isEdge = navigator.userAgent.includes('Edg/');
          if (isEdge && errorCode === 'network') {
            isRetryable = false;
            console.warn('🎤 Edge detected with network error. likely no API access. Disabling retry.');
          }

          // Try automatic retry for network errors
          if (isRetryable && retryCountRef.current < maxRetries && shouldRestartRef.current && !isManualStopRef.current) {
            retryCountRef.current++;
            console.log(`Speech recognition error (${errorCode}), retrying... (${retryCountRef.current}/${maxRetries})`);

            // Show temporary message
            setState((prev) => ({
              ...prev,
              error: `Reintentando conexión... (${retryCountRef.current}/${maxRetries})`,
              errorCode,
            }));

            // Retry after delay
            setTimeout(() => {
              if (shouldRestartRef.current && recognitionRef.current && !isManualStopRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  // Ignore if already started
                }
              }
            }, retryDelayMs * retryCountRef.current);
            return;
          }

          // Custom message for Edge/Network
          if (isEdge && errorCode === 'network') {
            const edgeMessage = 'Microsoft Edge no soporta este servicio de voz (falta de API Keys de Google). Por favor use Google Chrome.';
            setState((prev) => ({
              ...prev,
              error: edgeMessage,
              errorCode,
              isListening: false,
              permissionStatus: prev.permissionStatus,
            }));
            if (edgeMessage) onErrorRef.current?.(edgeMessage);
            onListeningChangeRef.current?.(false);
            shouldRestartRef.current = false;
            return;
          }

          // Max retries reached or non-retryable error
          const errorMessage = (ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default) as string;
          const finalMessage = retryCountRef.current >= maxRetries
            ? `${errorMessage} (después de ${maxRetries} intentos)`
            : errorMessage;

          setState((prev) => ({
            ...prev,
            error: finalMessage,
            errorCode,
            isListening: false,
            // Update permission status if denied, otherwise keep previous
            permissionStatus: errorCode === 'not-allowed' ? 'denied' as const : prev.permissionStatus,
          }));

          if (finalMessage) {
            onErrorRef.current?.(finalMessage);
          }
          onListeningChangeRef.current?.(false);

          // Don't restart on permission errors
          if (errorCode === 'not-allowed') {
            shouldRestartRef.current = false;
          }

          // Reset retry counter
          retryCountRef.current = 0;
        };

        recognition.onend = () => {
          setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
          onListeningChangeRef.current?.(false);

          // Check for rapid failures (loops)
          const sessionDuration = Date.now() - (startTimeRef.current || 0);
          if (sessionDuration < 1000) {
            rapidFailuresRef.current++;
            console.warn(`🎤 Short recognition session detected (${sessionDuration}ms). Count: ${rapidFailuresRef.current}`);
          } else {
            rapidFailuresRef.current = 0;
          }

          // Stop restarting if we detect a loop (e.g. 5 failures in a row)
          if (rapidFailuresRef.current >= 5) {
            console.error('🎤 Recognition loop detected. Stopping auto-restart.');
            shouldRestartRef.current = false;
            setState(prev => ({
              ...prev,
              error: 'El servicio de voz se detiene repetidamente. Verifique su micrófono o conexión.',
              errorCode: 'loop-detected'
            }));
            return;
          }

          // Auto-restart if enabled and not manually stopped
          if (autoRestart && shouldRestartRef.current && !isManualStopRef.current) {
            setTimeout(() => {
              if (shouldRestartRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  // Ignore if already started
                }
              }
            }, 100);
          }
        };

        return () => {
          isManualStopRef.current = true;
          shouldRestartRef.current = false;
          recognition.stop();
        };
      } else {
        setState((prev) => ({
          ...prev,
          isSupported: false,
          error: 'Su navegador no soporta reconocimiento de voz. Por favor, use Chrome, Edge o Safari.',
        }));
        return undefined;
      }
    }
    return undefined;
  }, [language, continuous, interimResults, autoRestart]); // Removed callbacks from dependency array

  // Check connectivity to Google's speech services
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, connectivityStatus: 'checking' }));

    const result = await checkSpeechServiceConnectivity();

    if (result.ok) {
      setState((prev) => ({ ...prev, connectivityStatus: 'ok', error: null, errorCode: null }));
      return true;
    } else {
      const status = result.issue === 'timeout' ? 'timeout' : 'blocked';
      const errorMessage =
        status === 'timeout'
          ? 'Tiempo de espera agotado al conectar con el servicio de voz. Su conexión puede ser lenta.'
          : 'No se puede conectar con el servicio de voz de Google. Posible bloqueo de firewall o VPN.';

      setState((prev) => ({
        ...prev,
        connectivityStatus: status,
        error: errorMessage,
        errorCode: 'connectivity-' + status,
      }));
      return false;
    }
  }, []);

  const startListening = useCallback(
    async (skipConnectivityCheck = false) => {
      if (!recognitionRef.current) {
        setState((prev) => ({
          ...prev,
          error: 'Su navegador no soporta reconocimiento de voz.',
          errorCode: 'not-supported',
        }));
        return;
      }

      // STEP 1: Request microphone permission FIRST if not already granted
      if (state.permissionStatus !== 'granted') {
        // console.log('🎤 Requesting microphone permission...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the stream immediately - we just needed to trigger the permission dialog
          stream.getTracks().forEach((track) => track.stop());
          setState((prev) => ({ ...prev, permissionStatus: 'granted' }));
          // console.log('✅ Microphone permission granted');
        } catch (error: any) {
          console.error('❌ Microphone permission denied:', error);
          const errorCode = error?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture';
          const errorMessage = (ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default) as string;
          setState((prev) => ({
            ...prev,
            permissionStatus: errorCode === 'not-allowed' ? 'denied' as const : prev.permissionStatus,
            error: errorMessage,
            errorCode,
          }));
          return;
        }
      }

      // STEP 2: Optional connectivity pre-check (REMOVED to avoid blocking first attempt)
      // Browsers handle connection internally and will throw 'network' error if it fails
      if (!skipConnectivityCheck && state.connectivityStatus === 'unknown') {
        // checkConnectivity check removed to prevent blocking
      }

      // STEP 3: Start speech recognition
      try {
        // console.log('🎙️ Starting speech recognition...');
        isManualStopRef.current = false;
        shouldRestartRef.current = true;
        retryCountRef.current = 0; // Reset retry counter
        recognitionRef.current.start();
        // State will be updated in onstart callback
      } catch (error: any) {
        // Handle "already started" error
        if (error?.message?.includes('already started')) {
          return;
        }
        console.error('Failed to start speech recognition:', error);
        setState((prev) => ({
          ...prev,
          error: 'No se pudo iniciar el reconocimiento de voz. Intente nuevamente.',
          errorCode: 'start-failed',
          isListening: false,
        }));
      }
    },
    [checkConnectivity, state.connectivityStatus, state.permissionStatus]
  );

  const stopListening = useCallback(() => {
    isManualStopRef.current = true;
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (state.isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, errorCode: null }));
  }, []);

  // Request microphone permission explicitly
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setState((prev) => ({ ...prev, permissionStatus: 'granted' as const, error: null, errorCode: null }));
      return true;
    } catch (error: any) {
      const errorCode = error?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture';
      const errorMessage = (ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default) as string;
      setState((prev) => ({
        ...prev,
        permissionStatus: 'denied' as const,
        error: errorMessage,
        errorCode,
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearError,
    requestPermission,
    checkConnectivity,
  };
}

export default useWebSpeechRecognition;
