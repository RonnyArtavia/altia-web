// Password Reset Service
// Handles password reset requests and validation

import { sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

class PasswordResetService {
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, verify that the user exists in our system
      const userExists = await this.verifyUserExists(email.toLowerCase())

      if (!userExists) {
        return {
          success: false,
          message: 'No existe una cuenta asociada a este correo electrónico'
        }
      }

      await sendPasswordResetEmail(auth, email.toLowerCase(), {
        url: window.location.origin + '/login',
        handleCodeInApp: false
      })

      console.log('✅ Password reset email sent to:', email)

      return {
        success: true,
        message: `Se ha enviado un enlace de restablecimiento de contraseña a ${email}`
      }
    } catch (error: any) {
      console.error('❌ Error sending password reset email:', error)

      let message = 'Error al enviar el correo de restablecimiento'

      if (error.code === 'auth/user-not-found') {
        message = 'No existe una cuenta asociada a este correo electrónico'
      } else if (error.code === 'auth/invalid-email') {
        message = 'El correo electrónico no es válido'
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos. Intenta más tarde.'
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Error de conexión. Verifica tu conexión a internet.'
      } else if (error.message) {
        message = error.message
      }

      return {
        success: false,
        message
      }
    }
  }

  /**
   * Verify that a user exists in our Firestore users collection
   */
  private async verifyUserExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', email.toLowerCase()))
      const querySnapshot = await getDocs(q)

      return !querySnapshot.empty
    } catch (error) {
      console.error('Error checking user existence:', error)
      return false // Assume user doesn't exist if we can't check
    }
  }

  /**
   * Verify password reset code (for custom implementations)
   */
  async verifyPasswordResetCode(code: string): Promise<{ success: boolean; message: string; email?: string }> {
    try {
      const email = await verifyPasswordResetCode(auth, code)

      return {
        success: true,
        message: 'Código de restablecimiento válido',
        email
      }
    } catch (error: any) {
      console.error('❌ Error verifying password reset code:', error)

      let message = 'Código de restablecimiento inválido o expirado'

      if (error.code === 'auth/expired-action-code') {
        message = 'El código de restablecimiento ha expirado. Solicita uno nuevo.'
      } else if (error.code === 'auth/invalid-action-code') {
        message = 'El código de restablecimiento no es válido'
      } else if (error.code === 'auth/user-disabled') {
        message = 'Esta cuenta ha sido deshabilitada'
      } else if (error.message) {
        message = error.message
      }

      return {
        success: false,
        message
      }
    }
  }

  /**
   * Confirm password reset with new password
   */
  async confirmPasswordReset(code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      if (newPassword.length < 6) {
        return {
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres'
        }
      }

      await confirmPasswordReset(auth, code, newPassword)

      console.log('✅ Password reset completed successfully')

      return {
        success: true,
        message: 'Tu contraseña ha sido restablecida exitosamente'
      }
    } catch (error: any) {
      console.error('❌ Error confirming password reset:', error)

      let message = 'Error al restablecer la contraseña'

      if (error.code === 'auth/expired-action-code') {
        message = 'El enlace de restablecimiento ha expirado. Solicita uno nuevo.'
      } else if (error.code === 'auth/invalid-action-code') {
        message = 'El enlace de restablecimiento no es válido'
      } else if (error.code === 'auth/weak-password') {
        message = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.'
      } else if (error.code === 'auth/user-disabled') {
        message = 'Esta cuenta ha sido deshabilitada'
      } else if (error.message) {
        message = error.message
      }

      return {
        success: false,
        message
      }
    }
  }

  /**
   * Check if email is valid format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const passwordResetService = new PasswordResetService()