import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import type { UserData } from '@/types'

interface AuthState {
  user: User | null
  userData: UserData | null
  isLoading: boolean
  isInitializing: boolean
  hasHydrated: boolean
  error: string | null

  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordResetEmail: (email: string) => Promise<void>
  initializeAuth: () => Promise<void>
  clearError: () => void
  updateUserData: (updates: Partial<UserData>) => void
  refreshUserData: () => Promise<void>
  isDoctor: () => boolean
  isSecretary: () => boolean
  isPatient: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userData: null,
      isLoading: false,
      isInitializing: true,
      hasHydrated: false,
      error: null,

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          // Fetch user data from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          const userDocSnap = await getDoc(userDocRef)

          if (!userDocSnap.exists()) {
            throw new Error('No se encontró el perfil de usuario. Contacte al administrador.')
          }

          const userData = userDocSnap.data() as UserData
          userData.uid = firebaseUser.uid
          userData.email = firebaseUser.email || ''

          // Validate role for web platform
          if (userData.role !== 'doctor' && userData.role !== 'secretary') {
            await firebaseSignOut(auth)
            throw new Error('Esta plataforma está disponible solo para médicos y asistentes.')
          }

          set({
            user: firebaseUser,
            userData,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          let message = 'Error al iniciar sesión'
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = 'Correo electrónico o contraseña incorrectos'
          } else if (error.code === 'auth/user-not-found') {
            message = 'No existe una cuenta con este correo electrónico'
          } else if (error.code === 'auth/too-many-requests') {
            message = 'Demasiados intentos. Intente más tarde.'
          } else if (error.message) {
            message = error.message
          }
          set({ isLoading: false, error: message, user: null, userData: null })
          throw error
        }
      },

      signUp: async (email: string, password: string, userData: Partial<UserData>) => {
        set({ isLoading: true, error: null })
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const firebaseUser = userCredential.user

          const newUserData: UserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || email,
            name: userData.name || '',
            displayName: userData.name || '',
            role: userData.role || 'doctor',
            organizationId: userData.organizationId || firebaseUser.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Medical fields
            specialty: userData.specialty,
            medicalLicense: userData.medicalLicense,
            // Contact information
            phoneNumber: userData.phoneNumber,
            // Patient specific fields
            cedula: userData.cedula,
            gender: userData.gender,
            dateOfBirth: userData.dateOfBirth,
            address: userData.address,
          }

          // Save user data to Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid)
          await setDoc(userDocRef, {
            ...newUserData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          })

          set({
            user: firebaseUser,
            userData: newUserData,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          let message = 'Error al crear la cuenta'
          if (error.code === 'auth/email-already-in-use') {
            message = 'Ya existe una cuenta con este correo electrónico'
          } else if (error.code === 'auth/weak-password') {
            message = 'La contraseña debe tener al menos 6 caracteres'
          } else if (error.code === 'auth/invalid-email') {
            message = 'El correo electrónico no es válido'
          } else if (error.code === 'auth/operation-not-allowed') {
            message = 'El registro de usuarios está deshabilitado'
          } else if (error.message) {
            message = error.message
          }
          set({ isLoading: false, error: message })
          throw error
        }
      },

      signOut: async () => {
        try {
          await firebaseSignOut(auth)
          set({
            user: null,
            userData: null,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          console.error('Error signing out:', error)
          // Force clear state even on error
          set({ user: null, userData: null, isLoading: false })
        }
      },

      sendPasswordResetEmail: async (email: string) => {
        set({ isLoading: true, error: null })
        try {
          await sendPasswordResetEmail(auth, email.toLowerCase(), {
            url: window.location.origin + '/login',
            handleCodeInApp: false
          })
          set({ isLoading: false, error: null })
        } catch (error: any) {
          let message = 'Error al enviar el correo de restablecimiento'
          if (error.code === 'auth/user-not-found') {
            message = 'No existe una cuenta asociada a este correo electrónico'
          } else if (error.code === 'auth/invalid-email') {
            message = 'El correo electrónico no es válido'
          } else if (error.code === 'auth/too-many-requests') {
            message = 'Demasiados intentos. Intenta más tarde.'
          } else if (error.message) {
            message = error.message
          }
          set({ isLoading: false, error: message })
          throw error
        }
      },

      initializeAuth: async () => {
        set({ isInitializing: true })

        return new Promise<void>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              try {
                const userDocRef = doc(db, 'users', firebaseUser.uid)
                const userDocSnap = await getDoc(userDocRef)

                if (userDocSnap.exists()) {
                  const userData = userDocSnap.data() as UserData
                  userData.uid = firebaseUser.uid
                  userData.email = firebaseUser.email || ''

                  set({
                    user: firebaseUser,
                    userData,
                    isInitializing: false,
                    hasHydrated: true,
                  })
                } else {
                  set({
                    user: firebaseUser,
                    userData: null,
                    isInitializing: false,
                    hasHydrated: true,
                  })
                }
              } catch (error) {
                console.error('Error fetching user data:', error)
                set({
                  user: firebaseUser,
                  userData: null,
                  isInitializing: false,
                  hasHydrated: true,
                })
              }
            } else {
              set({
                user: null,
                userData: null,
                isInitializing: false,
                hasHydrated: true,
              })
            }
            resolve()
          })

          // Store unsubscribe for cleanup
          ;(window as any).__authUnsubscribe = unsubscribe
        })
      },

      clearError: () => set({ error: null }),

      updateUserData: (updates: Partial<UserData>) => {
        const current = get().userData
        if (current) {
          set({ userData: { ...current, ...updates } })
        }
      },

      refreshUserData: async () => {
        const { user } = get()
        if (!user) return

        try {
          const userDocRef = doc(db, 'users', user.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserData
            userData.uid = user.uid
            userData.email = user.email || ''
            set({ userData })
          }
        } catch (error) {
          console.error('Error refreshing user data:', error)
        }
      },

      isDoctor: () => get().userData?.role === 'doctor',
      isSecretary: () => get().userData?.role === 'secretary',
      isPatient: () => get().userData?.role === 'patient',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        userData: state.userData,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Error rehydrating auth store:', error)
          }
          // Use the state setter instead of useAuthStore.setState to avoid circular reference
          if (state) {
            state.hasHydrated = true
          }
        }
      },
    }
  )
)
