// Email Verification Service
// Local implementation with localStorage and console fallback for development

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/config/firebase'

interface VerificationCode {
  email: string
  code: string
  expiresAt: number
  attempts: number
  maxAttempts: number
}

const STORAGE_KEY = 'alta-email-verification'
const CODE_EXPIRY_MINUTES = 10
const MAX_ATTEMPTS = 3

class EmailVerificationService {
  private functions = getFunctions(app)

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private getStorageData(): VerificationCode[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private setStorageData(codes: VerificationCode[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
    } catch (error) {
      console.error('Error saving verification codes:', error)
    }
  }

  private cleanExpiredCodes(): void {
    const codes = this.getStorageData()
    const now = Date.now()
    const validCodes = codes.filter(code => code.expiresAt > now)
    this.setStorageData(validCodes)
  }

  /**
   * Sends a verification code via email using Firebase Cloud Functions
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
    try {
      this.cleanExpiredCodes()

      const codes = this.getStorageData()
      const now = Date.now()
      const expiresAt = now + (CODE_EXPIRY_MINUTES * 60 * 1000)

      // Check if valid code already exists
      const existingCodeIndex = codes.findIndex(code =>
        code.email.toLowerCase() === email.toLowerCase() && code.expiresAt > now
      )

      let verificationCode: string

      if (existingCodeIndex !== -1) {
        // Reuse existing code but reset attempts
        verificationCode = codes[existingCodeIndex].code
        codes[existingCodeIndex].attempts = 0
      } else {
        // Generate new code
        verificationCode = this.generateCode()

        // Remove any previous codes for this email
        const filteredCodes = codes.filter(code =>
          code.email.toLowerCase() !== email.toLowerCase()
        )

        // Add new code
        filteredCodes.push({
          email: email.toLowerCase(),
          code: verificationCode,
          expiresAt,
          attempts: 0,
          maxAttempts: MAX_ATTEMPTS
        })

        this.setStorageData(filteredCodes)
      }

      // Send email using Firebase Cloud Functions (fallback to console for development)
      try {
        const sendVerificationEmail = httpsCallable(this.functions, 'sendVerificationEmail')

        console.log('📧 Enviando código de verificación por email...')
        console.log(`🔢 Código: ${verificationCode} (para desarrollo)`)

        await sendVerificationEmail({
          email: email.toLowerCase(),
          token: verificationCode
        })

        console.log('✅ Email de verificación enviado exitosamente')

        return {
          success: true,
          message: `Código de verificación enviado a ${email}`
        }
      } catch (emailError: any) {
        console.error('❌ Error al enviar email de verificación:', emailError)

        // Show code in console as fallback for development
        console.log(`
🔐 CÓDIGO DE VERIFICACIÓN (FALLBACK)
📧 Email: ${email}
🔢 Código: ${verificationCode}
⏰ Válido por ${CODE_EXPIRY_MINUTES} minutos
⚠️ El email no se pudo enviar, pero puedes usar este código
        `)

        return {
          success: true, // Continue flow even if email fails
          message: `Código generado para ${email}. Revisar consola para el código.`
        }
      }

    } catch (error) {
      console.error('Error en sendVerificationCode:', error)
      return {
        success: false,
        message: 'Error al generar el código de verificación'
      }
    }
  }

  /**
   * Verifies the code entered by the user
   */
  async verifyCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    try {
      this.cleanExpiredCodes()

      const codes = this.getStorageData()
      const now = Date.now()

      const codeIndex = codes.findIndex(storedCode =>
        storedCode.email.toLowerCase() === email.toLowerCase() &&
        storedCode.expiresAt > now
      )

      if (codeIndex === -1) {
        return {
          success: false,
          message: 'Código expirado o no encontrado. Solicita un nuevo código.'
        }
      }

      const storedCode = codes[codeIndex]

      // Check max attempts
      if (storedCode.attempts >= storedCode.maxAttempts) {
        // Remove code due to too many attempts
        codes.splice(codeIndex, 1)
        this.setStorageData(codes)

        return {
          success: false,
          message: 'Demasiados intentos fallidos. Solicita un nuevo código.'
        }
      }

      // Verify code
      if (storedCode.code === code.trim()) {
        // Correct code - remove from storage
        codes.splice(codeIndex, 1)
        this.setStorageData(codes)

        return {
          success: true,
          message: 'Email verificado exitosamente'
        }
      } else {
        // Incorrect code - increment attempts
        codes[codeIndex].attempts += 1
        this.setStorageData(codes)

        const remainingAttempts = storedCode.maxAttempts - codes[codeIndex].attempts

        return {
          success: false,
          message: `Código incorrecto. Te quedan ${remainingAttempts} intento(s).`
        }
      }

    } catch (error) {
      console.error('Error verifying code:', error)
      return {
        success: false,
        message: 'Error al verificar el código'
      }
    }
  }

  /**
   * Checks if a valid code exists for an email
   */
  hasValidCode(email: string): boolean {
    this.cleanExpiredCodes()
    const codes = this.getStorageData()
    const now = Date.now()

    return codes.some(code =>
      code.email.toLowerCase() === email.toLowerCase() &&
      code.expiresAt > now
    )
  }

  /**
   * Gets remaining time in minutes for a code
   */
  getTimeRemaining(email: string): number {
    this.cleanExpiredCodes()
    const codes = this.getStorageData()
    const now = Date.now()

    const code = codes.find(code =>
      code.email.toLowerCase() === email.toLowerCase() &&
      code.expiresAt > now
    )

    if (!code) return 0

    const remainingMs = code.expiresAt - now
    return Math.ceil(remainingMs / (60 * 1000))
  }

  /**
   * Clean up codes for a specific email (used after successful registration)
   */
  cleanupCodesForEmail(email: string): void {
    const codes = this.getStorageData()
    const filteredCodes = codes.filter(code =>
      code.email.toLowerCase() !== email.toLowerCase()
    )
    this.setStorageData(filteredCodes)
  }
}

export const emailVerificationService = new EmailVerificationService()