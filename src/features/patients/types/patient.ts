// Patient types for web application
// Based on FHIR Patient resource with Costa Rica-specific fields

export interface Patient {
    id: string
    fhirId?: string
    userId?: string
    name: string
    email?: string
    phone?: string
    cedula?: string
    birthDate?: string
    age?: number
    gender?: 'male' | 'female' | 'other' | 'unknown'
    address?: string
    streetAndNumber?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    hasUpcomingAppointments?: boolean
    isFavorite?: boolean
    organizationId?: string
    emergencyContact?: string
    emergencyPhone?: string
    emergencyRelationship?: string
    photoURL?: string
    allergies?: string[]
    medications?: string[]
    medicalConditions?: string[]
}

export interface PatientFormData {
    name: string
    email?: string
    phone?: string
    cedula?: string
    age: number
    gender: 'male' | 'female' | 'other'
    address?: string
}

export interface PatientStats {
    total: number
    recent: number
    withAppointments: number
    byGender: {
        male: number
        female: number
        other: number
    }
    byAgeGroup: {
        '0-18': number
        '19-35': number
        '36-55': number
        '56-70': number
        '70+': number
    }
}

export type PatientFilter = 'all' | 'recent' | 'agenda'

export interface PatientSearchOptions {
    query?: string
    filter?: PatientFilter
    limit?: number
    offset?: number
    sortBy?: keyof Patient
    sortOrder?: 'asc' | 'desc'
}

// Medical data interfaces
export interface PatientMedicalHistory {
    id: string
    patientId: string
    condition: string
    diagnosedDate: Date
    status: 'active' | 'resolved' | 'chronic'
    notes?: string
    doctorId?: string
    doctorName?: string
}

export interface PatientMedication {
    id: string
    patientId: string
    name: string
    dose: string
    frequency: string
    startDate: Date
    endDate?: Date
    status: 'active' | 'discontinued' | 'completed'
    prescribedBy?: string
    notes?: string
}

export interface PatientAllergy {
    id: string
    patientId: string
    allergen: string
    severity: 'mild' | 'moderate' | 'severe'
    reaction?: string
    dateIdentified?: Date
    notes?: string
}

export interface PatientVitalSigns {
    id: string
    patientId: string
    date: Date
    bloodPressureSystolic?: number
    bloodPressureDiastolic?: number
    heartRate?: number
    temperature?: number
    weight?: number
    height?: number
    respiratoryRate?: number
    oxygenSaturation?: number
    recordedBy?: string
    notes?: string
}

export interface PatientEncounter {
    id: string
    patientId: string
    date: Date
    type: 'consultation' | 'telemedicine' | 'emergency' | 'follow-up'
    doctorId: string
    doctorName: string
    notes: string
    diagnosis?: string
    status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled'
    organizationId: string
}
