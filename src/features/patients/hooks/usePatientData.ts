/**
 * usePatientData - Complete patient data hooks for Firebase integration
 * Loads all FHIR medical data for a patient from Firebase/Firestore
 * Matches original Altea Copiloto v2.2 functionality
 */

import { useState, useEffect } from 'react'
import {
  getPatientById,
  getPatientMedicalHistory,
  getPatientMedications,
  getPatientAllergies,
  getPatientVitalSigns,
  getPatientEncounters
} from '../services/patientService'
import type {
  Patient,
  PatientMedicalHistory,
  PatientMedication,
  PatientAllergy,
  PatientVitalSigns,
  PatientEncounter
} from '../types/patient'

// Types are now imported from patientService

export interface PatientFullData {
  patient: Patient | null
  allergies: PatientAllergy[]
  medications: PatientMedication[]
  medicalHistory: PatientMedicalHistory[]
  immunizations: PatientImmunization[]
  encounters: PatientEncounter[]
  vitalSigns: PatientVitalSigns[]
  serviceRequests: PatientServiceRequest[]
  labResults: PatientLabResult[]
  isLoading: boolean
  error: string | null
}

// Import real functions from patientService
import {
  getPatientImmunizations,
  getPatientServiceRequests,
  getPatientLabResults,
  type PatientImmunization,
  type PatientServiceRequest,
  type PatientLabResult
} from '../services/patientService'

/**
 * Hook to load complete patient medical data from Firebase/Firestore
 * Combines all FHIR medical collections for comprehensive patient context
 */
export function usePatientFullData(patientId: string, organizationId: string): PatientFullData {
  const [data, setData] = useState<PatientFullData>({
    patient: null,
    allergies: [],
    medications: [],
    medicalHistory: [],
    immunizations: [],
    encounters: [],
    vitalSigns: [],
    serviceRequests: [],
    labResults: [],
    isLoading: false,
    error: null
  })

  useEffect(() => {
    if (!patientId || !organizationId) {
      setData(prev => ({ ...prev, isLoading: false, error: 'Missing patientId or organizationId' }))
      return
    }

    let isMounted = true

    async function loadPatientData() {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }))

        // Load all patient data in parallel for better performance
        const [
          patient,
          allergies,
          medications,
          medicalHistory,
          immunizations,
          encounters,
          vitalSigns,
          serviceRequests,
          labResults
        ] = await Promise.all([
          getPatientById(patientId, organizationId),
          getPatientAllergies(patientId, organizationId),
          getPatientMedications(patientId, organizationId),
          getPatientMedicalHistory(patientId, organizationId),
          getPatientImmunizations(patientId, organizationId),
          getPatientEncounters(patientId, organizationId),
          getPatientVitalSigns(patientId, organizationId),
          getPatientServiceRequests(patientId, organizationId),
          getPatientLabResults(patientId, organizationId)
        ])

        if (isMounted) {
          setData({
            patient,
            allergies: allergies || [],
            medications: medications || [],
            medicalHistory: medicalHistory || [],
            immunizations: immunizations || [],
            encounters: encounters || [],
            vitalSigns: vitalSigns || [],
            serviceRequests: serviceRequests || [],
            labResults: labResults || [],
            isLoading: false,
            error: null
          })
        }
      } catch (error) {
        console.error('Error loading patient data:', error)
        if (isMounted) {
          setData(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load patient data'
          }))
        }
      }
    }

    loadPatientData()

    return () => {
      isMounted = false
    }
  }, [patientId, organizationId])

  return data
}

/**
 * Hook to load basic patient information only
 */
export function usePatientBasicData(patientId: string, organizationId: string) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId || !organizationId) {
      setError('Missing patientId or organizationId')
      return
    }

    let isMounted = true

    async function loadBasicData() {
      try {
        setIsLoading(true)
        setError(null)

        const patientData = await getPatientById(patientId, organizationId)

        if (isMounted) {
          setPatient(patientData)
        }
      } catch (err) {
        console.error('Error loading basic patient data:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load patient')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadBasicData()

    return () => {
      isMounted = false
    }
  }, [patientId, organizationId])

  return { patient, isLoading, error }
}