/**
 * useVoiceRecording - Hook React para grabación de voz médica
 *
 * Proporciona una interfaz simple para grabar voz con transcripción en tiempo real
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  getVoiceRecordingService,
  type RecordingConfig,
  type RecordingSession,
  type RecordingEvent,
  type RecordingEventType,
  VoiceRecordingService
} from '@/services/voice/VoiceRecordingService'

export interface UseVoiceRecordingOptions {
  config?: Partial<RecordingConfig>
  autoTranscribe?: boolean
  onTranscriptionUpdate?: (partial: string, isFinal: boolean) => void
  onRecordingComplete?: (session: RecordingSession, finalTranscription?: string) => void
  onError?: (error: any) => void
}

export interface VoiceRecordingState {
  // Estado de grabación
  isRecording: boolean
  isPaused: boolean
  isInitializing: boolean
  hasPermission: boolean | null

  // Datos de sesión
  currentSession: RecordingSession | null
  duration: number
  chunksCount: number

  // Transcripción
  partialTranscription: string
  finalTranscription: string
  transcriptionConfidence: number

  // Estado de error
  lastError: string | null
  isSupported: boolean

  // Dispositivos
  availableDevices: MediaDeviceInfo[]
  selectedDevice: string | null
}

export interface UseVoiceRecordingReturn {
  // Estado
  state: VoiceRecordingState

  // Funciones principales
  startRecording: (config?: Partial<RecordingConfig>) => Promise<boolean>
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => Promise<RecordingSession | null>
  cancelRecording: () => void

  // Funciones de configuración
  requestPermissions: () => Promise<boolean>
  refreshDevices: () => Promise<void>
  selectDevice: (deviceId: string) => void

  // Funciones de utilidad
  getRecordingDuration: () => number
  exportRecording: (format?: 'blob' | 'base64' | 'url') => Promise<string | Blob | null>
  clearError: () => void
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const {
    config,
    autoTranscribe = true,
    onTranscriptionUpdate,
    onRecordingComplete,
    onError
  } = options

  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isPaused: false,
    isInitializing: false,
    hasPermission: null,
    currentSession: null,
    duration: 0,
    chunksCount: 0,
    partialTranscription: '',
    finalTranscription: '',
    transcriptionConfidence: 0,
    lastError: null,
    isSupported: VoiceRecordingService.isSupported(),
    availableDevices: [],
    selectedDevice: null
  })

  const serviceRef = useRef<VoiceRecordingService | null>(null)
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Inicializar servicio
  useEffect(() => {
    serviceRef.current = getVoiceRecordingService(config)

    // Configurar listeners de eventos
    const eventHandlers: Partial<Record<RecordingEventType, (event: RecordingEvent) => void>> = {
      recording_started: (event) => {
        setState(prev => ({
          ...prev,
          isRecording: true,
          isPaused: false,
          isInitializing: false,
          currentSession: serviceRef.current?.getRecordingState() || null
        }))

        // Iniciar contador de duración
        durationIntervalRef.current = setInterval(() => {
          setState(prev => ({
            ...prev,
            duration: Date.now() - (prev.currentSession?.startTime || Date.now())
          }))
        }, 100)
      },

      recording_stopped: (event) => {
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false
        }))

        // Limpiar contador
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }

        // Notificar completación
        const session = serviceRef.current?.getRecordingState()
        if (session && onRecordingComplete) {
          onRecordingComplete(session, state.finalTranscription)
        }
      },

      recording_paused: () => {
        setState(prev => ({ ...prev, isPaused: true }))
      },

      recording_resumed: () => {
        setState(prev => ({ ...prev, isPaused: false }))
      },

      chunk_available: (event) => {
        setState(prev => ({
          ...prev,
          chunksCount: event.data?.totalChunks || 0
        }))
      },

      transcription_partial: (event) => {
        const transcription = event.data?.transcription || ''
        setState(prev => ({
          ...prev,
          finalTranscription: prev.finalTranscription + ' ' + transcription,
          partialTranscription: ''
        }))

        if (onTranscriptionUpdate) {
          onTranscriptionUpdate(transcription, true)
        }
      },

      error: (event) => {
        const errorMessage = event.data?.error?.message || 'Error desconocido'
        setState(prev => ({
          ...prev,
          lastError: errorMessage,
          isRecording: false,
          isPaused: false,
          isInitializing: false
        }))

        if (onError) {
          onError(event.data?.error)
        }

        // Limpiar contador
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current)
          durationIntervalRef.current = null
        }
      },

      permission_denied: (event) => {
        setState(prev => ({
          ...prev,
          hasPermission: false,
          lastError: 'Permisos de micrófono denegados',
          isInitializing: false
        }))

        if (onError) {
          onError(new Error('Permisos de micrófono denegados'))
        }
      },

      device_unavailable: (event) => {
        setState(prev => ({
          ...prev,
          lastError: 'Dispositivo de audio no disponible',
          isInitializing: false
        }))

        if (onError) {
          onError(new Error('Dispositivo de audio no disponible'))
        }
      }
    }

    // Registrar listeners
    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
      if (handler && serviceRef.current) {
        serviceRef.current.addEventListener(eventType as RecordingEventType, handler)
      }
    })

    // Cargar dispositivos disponibles
    refreshDevices()

    // Cleanup
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }

      // Remover listeners
      Object.entries(eventHandlers).forEach(([eventType, handler]) => {
        if (handler && serviceRef.current) {
          serviceRef.current.removeEventListener(eventType as RecordingEventType, handler)
        }
      })

      // Limpiar servicio
      if (serviceRef.current) {
        serviceRef.current.cleanup()
      }
    }
  }, [config, onTranscriptionUpdate, onRecordingComplete, onError])

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!serviceRef.current) return false

    setState(prev => ({ ...prev, isInitializing: true }))

    try {
      const granted = await serviceRef.current.requestPermissions()
      setState(prev => ({
        ...prev,
        hasPermission: granted,
        isInitializing: false
      }))
      return granted
    } catch (error) {
      setState(prev => ({
        ...prev,
        hasPermission: false,
        isInitializing: false,
        lastError: 'Error solicitando permisos'
      }))
      return false
    }
  }, [])

  const startRecording = useCallback(async (recordingConfig?: Partial<RecordingConfig>): Promise<boolean> => {
    if (!serviceRef.current || !state.isSupported) return false

    setState(prev => ({ ...prev, isInitializing: true, lastError: null }))

    try {
      // Verificar permisos
      if (state.hasPermission !== true) {
        const granted = await requestPermissions()
        if (!granted) return false
      }

      // Limpiar transcripciones anteriores
      setState(prev => ({
        ...prev,
        partialTranscription: '',
        finalTranscription: '',
        transcriptionConfidence: 0,
        duration: 0,
        chunksCount: 0
      }))

      // Iniciar grabación
      const sessionId = await serviceRef.current.startRecording(recordingConfig)
      return sessionId !== null

    } catch (error) {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        lastError: 'Error iniciando grabación'
      }))
      if (onError) onError(error)
      return false
    }
  }, [state.isSupported, state.hasPermission, requestPermissions, onError])

  const pauseRecording = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.pauseRecording()
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.resumeRecording()
    }
  }, [])

  const stopRecording = useCallback(async (): Promise<RecordingSession | null> => {
    if (serviceRef.current) {
      return serviceRef.current.stopRecording()
    }
    return null
  }, [])

  const cancelRecording = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.cleanup()
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        currentSession: null,
        partialTranscription: '',
        finalTranscription: '',
        duration: 0,
        chunksCount: 0
      }))
    }
  }, [])

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await VoiceRecordingService.getAvailableDevices()
      setState(prev => ({ ...prev, availableDevices: devices }))
    } catch (error) {
      console.error('Error cargando dispositivos:', error)
    }
  }, [])

  const selectDevice = useCallback((deviceId: string) => {
    setState(prev => ({ ...prev, selectedDevice: deviceId }))
  }, [])

  const getRecordingDuration = useCallback((): number => {
    return state.duration
  }, [state.duration])

  const exportRecording = useCallback(async (format: 'blob' | 'base64' | 'url' = 'blob'): Promise<string | Blob | null> => {
    if (!state.currentSession || state.currentSession.chunks.length === 0) {
      return null
    }

    try {
      // Combinar todos los chunks en un blob
      const blobs = state.currentSession.chunks.map(chunk => chunk.blob)
      const combinedBlob = new Blob(blobs, { type: blobs[0].type })

      switch (format) {
        case 'blob':
          return combinedBlob

        case 'base64':
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1]
              resolve(base64)
            }
            reader.readAsDataURL(combinedBlob)
          })

        case 'url':
          return URL.createObjectURL(combinedBlob)

        default:
          return combinedBlob
      }
    } catch (error) {
      console.error('Error exportando grabación:', error)
      if (onError) onError(error)
      return null
    }
  }, [state.currentSession, onError])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }))
  }, [])

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    requestPermissions,
    refreshDevices,
    selectDevice,
    getRecordingDuration,
    exportRecording,
    clearError
  }
}