// User Validation Service
// Handles user existence checks and validation without exposing sensitive information

import {
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
  deleteUser
} from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

class UserValidationService {
  /**
   * Check if email already exists in Firebase Auth
   * This is the most reliable method to check email existence
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; message: string }> {
    try {
      console.log('🔍 Checking email existence for:', email)

      // Use fetchSignInMethodsForEmail to check if email exists
      const signInMethods = await fetchSignInMethodsForEmail(auth, email.toLowerCase())

      console.log('📧 Sign-in methods found:', signInMethods)

      if (signInMethods.length > 0) {
        console.log('❌ Email already exists!')
        return {
          exists: true,
          message: 'Ya existe una cuenta asociada a este correo electrónico'
        }
      }

      console.log('✅ Email available')
      return {
        exists: false,
        message: 'Email disponible'
      }
    } catch (error: any) {
      console.error('🚨 Error checking email existence:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)

      // Handle Firebase Auth errors
      if (error.code === 'auth/invalid-email') {
        return {
          exists: false,
          message: 'El formato del correo electrónico no es válido'
        }
      } else if (error.code === 'auth/network-request-failed') {
        return {
          exists: false,
          message: 'Error de conexión. Verifica tu conexión a internet.'
        }
      } else if (error.code === 'auth/too-many-requests') {
        return {
          exists: false,
          message: 'Demasiadas consultas. Intenta más tarde.'
        }
      }

      // For other errors, assume email doesn't exist to allow continuation
      // but log the error for debugging
      console.warn('⚠️ Assuming email does not exist due to error')
      return {
        exists: false,
        message: 'No se pudo verificar el email. Continuando...'
      }
    }
  }

  /**
   * Check if email exists in our Firestore users collection
   * This is a backup method to check our user database
   */
  async checkEmailInFirestore(email: string): Promise<{ exists: boolean; userData?: any }> {
    try {
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('email', '==', email.toLowerCase()))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data()
        return {
          exists: true,
          userData
        }
      }

      return {
        exists: false
      }
    } catch (error) {
      console.error('Error checking email in Firestore:', error)
      return {
        exists: false
      }
    }
  }

  /**
   * Comprehensive email validation before registration
   */
  async validateEmailForRegistration(email: string): Promise<{
    isValid: boolean
    canProceed: boolean
    message: string
  }> {
    console.log('🚀 Starting email validation for registration:', email)

    // First check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format')
      return {
        isValid: false,
        canProceed: false,
        message: 'El formato del correo electrónico no es válido'
      }
    }

    console.log('✅ Email format is valid')

    // Use Firebase Auth's fetchSignInMethodsForEmail method (less invasive)
    console.log('🔍 Using fetchSignInMethodsForEmail for email existence check...')
    const authCheck = await this.checkEmailExists(email)
    console.log('📊 Auth check result:', authCheck)

    if (authCheck.exists) {
      console.log('🚫 Email exists in Firebase Auth - blocking registration')
      return {
        isValid: true, // Email format is valid
        canProceed: false, // But can't proceed because it exists
        message: authCheck.message
      }
    }

    // Also check Firestore as backup
    console.log('🔍 Checking Firestore as backup...')
    const firestoreCheck = await this.checkEmailInFirestore(email)
    console.log('📊 Firestore check result:', firestoreCheck)

    if (firestoreCheck.exists) {
      console.log('🚫 Email exists in Firestore - blocking registration')
      return {
        isValid: true,
        canProceed: false,
        message: 'Ya existe una cuenta asociada a este correo electrónico'
      }
    }

    console.log('🎉 Email is available for registration!')
    return {
      isValid: true,
      canProceed: true,
      message: 'Email disponible para registro'
    }
  }

  /**
   * Test email validation by trying to create a temporary account
   * This is a more aggressive check but ensures 100% accuracy
   * Use only when absolutely necessary due to Firebase quota usage
   */
  async testEmailAvailabilityWithTempAccount(email: string): Promise<{
    available: boolean
    message: string
  }> {
    try {
      console.log('🧪 Creating temporary account to test email:', email)

      // Try to create a temporary account
      const tempPassword = 'TempPass123!' + Date.now()
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword)

      console.log('✅ Temporary account created successfully - email is available')

      // If successful, immediately delete the temporary account
      await deleteUser(userCredential.user)
      console.log('🗑️ Temporary account deleted')

      return {
        available: true,
        message: 'Email disponible'
      }
    } catch (error: any) {
      console.log('🧪 Temp account creation failed:', error.code, error.message)

      if (error.code === 'auth/email-already-in-use') {
        console.log('❌ Email is already in use!')
        return {
          available: false,
          message: 'Ya existe una cuenta asociada a este correo electrónico'
        }
      } else if (error.code === 'auth/invalid-email') {
        return {
          available: false,
          message: 'El formato del correo electrónico no es válido'
        }
      } else if (error.code === 'auth/network-request-failed') {
        return {
          available: false,
          message: 'Error de conexión. Verifica tu conexión a internet.'
        }
      }

      // For other errors, assume available
      console.error('🚨 Unexpected error in temp account test:', error)
      return {
        available: true,
        message: 'No se pudo verificar completamente. Continuando...'
      }
    }
  }

  /**
   * Validate email format only
   */
  isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const userValidationService = new UserValidationService()