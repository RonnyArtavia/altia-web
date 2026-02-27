/**
 * VoiceRecordingService - Servicio de grabación de voz para la web
 *
 * Implementa grabación de audio de alta calidad optimizada para transcripción médica
 * Compatible con Web Audio API y MediaRecorder
 */

export interface RecordingConfig {
  // Configuración de audio
  sampleRate: number
  channels: number
  bitRate: number
  format: 'webm' | 'mp4' | 'wav'

  // Configuración de procesamiento
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean

  // Configuración de segmentación
  maxDuration: number // máximo en ms
  chunkSize: number // tamaño de chunk en ms

  // Configuración de transcripción
  enableRealTime: boolean
  language: string
}

export interface AudioChunk {
  id: string
  blob: Blob
  duration: number
  timestamp: number
  sequenceNumber: number
}

export interface RecordingSession {
  id: string
  startTime: number
  endTime?: number
  chunks: AudioChunk[]
  totalDuration: number
  status: 'recording' | 'paused' | 'stopped' | 'error'
  config: RecordingConfig
  transcription?: {
    partial: string
    final: string
    confidence: number
    entities: any[]
  }
}

export type RecordingEventType =
  | 'recording_started'
  | 'recording_stopped'
  | 'recording_paused'
  | 'recording_resumed'
  | 'chunk_available'
  | 'transcription_partial'
  | 'transcription_final'
  | 'error'
  | 'permission_denied'
  | 'device_unavailable'

export interface RecordingEvent {
  type: RecordingEventType
  data?: any
  timestamp: number
  sessionId: string
}

export class VoiceRecordingService {
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private currentSession: RecordingSession | null = null
  private eventListeners: Map<RecordingEventType, Function[]> = new Map()

  private defaultConfig: RecordingConfig = {
    // Configuración optimizada para transcripción médica
    sampleRate: 16000, // 16kHz es óptimo para speech-to-text
    channels: 1, // Mono es suficiente para voz
    bitRate: 128000, // 128kbps balance calidad/tamaño
    format: 'webm', // Mejor soporte en navegadores

    // Optimizaciones de audio
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,

    // Configuración de grabación
    maxDuration: 300000, // 5 minutos máximo
    chunkSize: 5000, // Chunks de 5 segundos para transcripción en tiempo real

    // Transcripción
    enableRealTime: true,
    language: 'es-ES' // Español por defecto
  }

  constructor(config?: Partial<RecordingConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config }
    this.setupAudioContext()
  }

  private async setupAudioContext(): Promise<void> {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.audioContext = new AudioContextClass({
        sampleRate: this.defaultConfig.sampleRate
      })
    } catch (error) {
      console.error('Error configurando AudioContext:', error)
      this.emitEvent('error', { error: 'AudioContext no soportado' })
    }
  }

  /**
   * Solicitar permisos de micrófono
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: this.defaultConfig.echoCancellation,
          noiseSuppression: this.defaultConfig.noiseSuppression,
          autoGainControl: this.defaultConfig.autoGainControl,
          sampleRate: this.defaultConfig.sampleRate,
          channelCount: this.defaultConfig.channels
        }
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      return true
    } catch (error) {
      console.error('Error solicitando permisos de micrófono:', error)

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.emitEvent('permission_denied', { error })
        } else if (error.name === 'NotFoundError') {
          this.emitEvent('device_unavailable', { error })
        } else {
          this.emitEvent('error', { error })
        }
      }

      return false
    }
  }

  /**
   * Iniciar grabación
   */
  async startRecording(config?: Partial<RecordingConfig>): Promise<string | null> {
    const finalConfig = { ...this.defaultConfig, ...config }

    if (!this.mediaStream) {
      const hasPermissions = await this.requestPermissions()
      if (!hasPermissions) {
        return null
      }
    }

    try {
      // Configurar MediaRecorder
      const mimeType = this.getBestMimeType(finalConfig.format)
      this.mediaRecorder = new MediaRecorder(this.mediaStream!, {
        mimeType,
        audioBitsPerSecond: finalConfig.bitRate
      })

      // Crear nueva sesión
      const sessionId = this.generateSessionId()
      this.currentSession = {
        id: sessionId,
        startTime: Date.now(),
        chunks: [],
        totalDuration: 0,
        status: 'recording',
        config: finalConfig
      }

      // Configurar event listeners
      this.setupMediaRecorderListeners()

      // Iniciar grabación con chunks temporizados
      this.mediaRecorder.start(finalConfig.chunkSize)

      this.emitEvent('recording_started', {
        sessionId,
        config: finalConfig
      })

      // Configurar límite de tiempo
      if (finalConfig.maxDuration > 0) {
        setTimeout(() => {
          if (this.currentSession?.status === 'recording') {
            this.stopRecording()
          }
        }, finalConfig.maxDuration)
      }

      return sessionId

    } catch (error) {
      console.error('Error iniciando grabación:', error)
      this.emitEvent('error', { error })
      return null
    }
  }

  /**
   * Pausar grabación
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.currentSession?.status === 'recording') {
      this.mediaRecorder.pause()
      this.currentSession.status = 'paused'
      this.emitEvent('recording_paused', { sessionId: this.currentSession.id })
    }
  }

  /**
   * Reanudar grabación
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.currentSession?.status === 'paused') {
      this.mediaRecorder.resume()
      this.currentSession.status = 'recording'
      this.emitEvent('recording_resumed', { sessionId: this.currentSession.id })
    }
  }

  /**
   * Detener grabación
   */
  stopRecording(): RecordingSession | null {
    if (this.mediaRecorder && this.currentSession) {
      this.mediaRecorder.stop()
      this.currentSession.status = 'stopped'
      this.currentSession.endTime = Date.now()
      this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime

      this.emitEvent('recording_stopped', {
        sessionId: this.currentSession.id,
        duration: this.currentSession.totalDuration,
        chunksCount: this.currentSession.chunks.length
      })

      const session = this.currentSession
      this.currentSession = null
      return session
    }
    return null
  }

  /**
   * Obtener estado actual
   */
  getRecordingState(): RecordingSession | null {
    return this.currentSession
  }

  /**
   * Limpiar recursos
   */
  cleanup(): void {
    if (this.mediaRecorder && this.currentSession?.status === 'recording') {
      this.stopRecording()
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.currentSession = null
    this.eventListeners.clear()
  }

  /**
   * Agregar listener de eventos
   */
  addEventListener(type: RecordingEventType, listener: Function): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }
    this.eventListeners.get(type)!.push(listener)
  }

  /**
   * Remover listener de eventos
   */
  removeEventListener(type: RecordingEventType, listener: Function): void {
    const listeners = this.eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // Métodos privados

  private setupMediaRecorderListeners(): void {
    if (!this.mediaRecorder || !this.currentSession) return

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0 && this.currentSession) {
        const chunk: AudioChunk = {
          id: this.generateChunkId(),
          blob: event.data,
          duration: this.currentSession.config.chunkSize,
          timestamp: Date.now(),
          sequenceNumber: this.currentSession.chunks.length
        }

        this.currentSession.chunks.push(chunk)

        this.emitEvent('chunk_available', {
          sessionId: this.currentSession.id,
          chunk,
          totalChunks: this.currentSession.chunks.length
        })

        // Enviar a transcripción en tiempo real si está habilitada
        if (this.currentSession.config.enableRealTime) {
          this.processChunkForTranscription(chunk)
        }
      }
    }

    this.mediaRecorder.onerror = (event: any) => {
      console.error('Error en MediaRecorder:', event.error)
      this.emitEvent('error', { error: event.error })
    }
  }

  private async processChunkForTranscription(chunk: AudioChunk): Promise<void> {
    try {
      // Simular transcripción en tiempo real (en producción sería llamada a API)
      const mockTranscription = await this.simulateTranscription(chunk.blob)

      if (this.currentSession) {
        this.emitEvent('transcription_partial', {
          sessionId: this.currentSession.id,
          transcription: mockTranscription,
          chunkId: chunk.id
        })
      }
    } catch (error) {
      console.error('Error en transcripción de chunk:', error)
    }
  }

  private async simulateTranscription(blob: Blob): Promise<string> {
    // Simulación de transcripción (reemplazar con API real)
    const mockTexts = [
      "El paciente refiere dolor abdominal",
      "Presión arterial 120/80",
      "Temperatura 37.2 grados",
      "Frecuencia cardíaca 72 latidos por minuto",
      "Saturación de oxígeno 98%",
      "Sin alteraciones en la auscultación pulmonar",
      "Abdomen blando, no doloroso a la palpación",
      "Extremidades sin edemas"
    ]

    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500))
    return mockTexts[Math.floor(Math.random() * mockTexts.length)]
  }

  private getBestMimeType(format: RecordingConfig['format']): string {
    const mimeTypes = {
      webm: ['audio/webm;codecs=opus', 'audio/webm'],
      mp4: ['audio/mp4', 'audio/aac'],
      wav: ['audio/wav', 'audio/wave']
    }

    const candidates = mimeTypes[format]

    for (const mimeType of candidates) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    // Fallback a webm básico
    return 'audio/webm'
  }

  private emitEvent(type: RecordingEventType, data?: any): void {
    const event: RecordingEvent = {
      type,
      data,
      timestamp: Date.now(),
      sessionId: this.currentSession?.id || ''
    }

    const listeners = this.eventListeners.get(type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Error en listener de evento:', error)
        }
      })
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateChunkId(): string {
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Verificar soporte del navegador
   */
  static isSupported(): boolean {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.MediaRecorder &&
      (window.AudioContext || (window as any).webkitAudioContext)
    )
  }

  /**
   * Obtener dispositivos de audio disponibles
   */
  static async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return devices.filter(device => device.kind === 'audioinput')
    } catch (error) {
      console.error('Error obteniendo dispositivos:', error)
      return []
    }
  }
}

// Export singleton instance
let voiceServiceInstance: VoiceRecordingService | null = null

export function getVoiceRecordingService(config?: Partial<RecordingConfig>): VoiceRecordingService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceRecordingService(config)
  }
  return voiceServiceInstance
}