/**
 * useVoiceRecognition - Web Speech API Integration
 * Provides real voice recognition functionality with pause/resume controls
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Speech Recognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

interface UseVoiceRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecognitionResult {
  isListening: boolean;
  isPaused: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  pauseListening: () => void;
  resumeListening: () => void;
  toggleListening: () => void;
  clearTranscript: () => void;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionResult {
  const {
    language = 'es-ES',
    continuous = true,
    interimResults = true,
    maxAlternatives = 1,
    onTranscriptUpdate,
    onError
  } = options;

  // State management
  const [isListening, setIsListening] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const isPausedRef = useRef(false);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    // Configure recognition
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;
    recognition.maxAlternatives = maxAlternatives;

    // Event handlers
    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
      setIsPaused(false);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscriptText = '';
      let finalTranscriptText = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPart = result[0].transcript;

        if (result.isFinal) {
          finalTranscriptText += transcriptPart;
        } else {
          interimTranscriptText += transcriptPart;
        }
      }

      // Update state
      setInterimTranscript(interimTranscriptText);

      if (finalTranscriptText) {
        setFinalTranscript(prev => prev + finalTranscriptText);
        setTranscript(prev => prev + finalTranscriptText);

        // Call callback with final transcript
        onTranscriptUpdate?.(finalTranscriptText, true);
      }

      // Call callback with interim results
      if (interimTranscriptText) {
        onTranscriptUpdate?.(interimTranscriptText, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Error de reconocimiento de voz';

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No se detectó voz. Intente hablar más cerca del micrófono.';
          break;
        case 'audio-capture':
          errorMessage = 'No se pudo acceder al micrófono. Verifique los permisos.';
          break;
        case 'not-allowed':
          errorMessage = 'Permiso de micrófono denegado. Active los permisos en su navegador.';
          break;
        case 'network':
          errorMessage = 'Error de red. Verifique su conexión a internet.';
          break;
        case 'service-not-allowed':
          errorMessage = 'El servicio de reconocimiento de voz no está disponible.';
          break;
        default:
          errorMessage = `Error: ${event.error}`;
      }

      setError(errorMessage);
      onError?.(errorMessage);
      setIsListening(false);
      setIsPaused(false);
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
      setIsPaused(false);
      setInterimTranscript('');

      // Restart if we were listening and not manually stopped
      if (isListeningRef.current && !isPausedRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSupported, continuous, interimResults, language, maxAlternatives, onTranscriptUpdate, onError]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Speech recognition is not supported');
      return;
    }

    try {
      isListeningRef.current = true;
      isPausedRef.current = false;
      recognitionRef.current.start();
      setError(null);
    } catch (error) {
      console.error('Error starting recognition:', error);
      setError('No se pudo iniciar el reconocimiento de voz');
      onError?.('No se pudo iniciar el reconocimiento de voz');
    }
  }, [isSupported, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      isListeningRef.current = false;
      isPausedRef.current = false;
      recognitionRef.current.stop();
    }
  }, []);

  // Pause listening
  const pauseListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      isPausedRef.current = true;
      recognitionRef.current.stop();
      setIsPaused(true);
    }
  }, [isListening]);

  // Resume listening
  const resumeListening = useCallback(() => {
    if (isPaused && recognitionRef.current) {
      isPausedRef.current = false;
      isListeningRef.current = true;
      setIsPaused(false);
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error resuming recognition:', error);
        setError('No se pudo reanudar el reconocimiento de voz');
        onError?.('No se pudo reanudar el reconocimiento de voz');
      }
    }
  }, [isPaused, onError]);

  // Toggle listening (start/stop)
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isPaused,
    transcript,
    interimTranscript,
    finalTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    toggleListening,
    clearTranscript
  };
}

export default useVoiceRecognition;