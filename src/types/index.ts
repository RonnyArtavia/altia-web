/**
 * Shared types for the application
 */

export interface UserData {
  uid: string
  email: string
  name?: string
  displayName?: string
  role: 'doctor' | 'secretary' | 'patient'
  organizationId?: string
  doctorId?: string
  secretaryProfileId?: string
  createdAt: Date
  updatedAt?: Date

  // Contact information
  phoneNumber?: string

  // Doctor-specific fields
  specialty?: string
  medicalLicense?: string
  yearsOfExperience?: number
  education?: string
  clinicName?: string
  clinicAddress?: string
  clinicLatitude?: number
  clinicLongitude?: number
  consultationFee?: number
  bio?: string
  languages?: string
  photoURL?: string

  // Patient-specific fields
  cedula?: string
  gender?: 'male' | 'female' | 'other'
  dateOfBirth?: string
  address?: string
  emergencyContact?: {
    name: string
    relationship: string
    phone: string
  }
  bloodType?: string
  allergies?: string[]
  medicalHistory?: string
}

export type UserRole = UserData['role']
