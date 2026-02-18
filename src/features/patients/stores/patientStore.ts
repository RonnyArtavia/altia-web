/**
 * Patient Store — Zustand-based patient state management
 */

import { create } from 'zustand'
import type { Patient } from '../types/patient'
import {
    getPatientsForOrganization,
    createOrUpdatePatient,
    updatePatient as updatePatientService,
    deletePatient as deletePatientService,
    getPatientById,
} from '../services/patientService'

interface PatientStore {
    patients: Patient[]
    selectedPatient: Patient | null
    searchQuery: string
    activeFilter: 'all' | 'agenda' | 'recent'
    isLoading: boolean
    error: string | null
    organizationId: string | null

    setPatients: (patients: Patient[]) => void
    selectPatient: (patient: Patient | null) => void
    setSearchQuery: (query: string) => void
    setActiveFilter: (filter: 'all' | 'agenda' | 'recent') => void
    setOrganizationId: (id: string | null) => void

    loadPatients: (organizationId?: string) => Promise<void>
    searchPatients: (query: string) => Promise<void>
    createPatient: (patientData: Partial<Patient>, organizationId: string) => Promise<Patient>
    updatePatient: (id: string, updates: Partial<Patient>, organizationId: string) => Promise<Patient>
    deletePatient: (id: string, organizationId: string) => Promise<void>
    resetStore: () => void
}

export const usePatientStore = create<PatientStore>((set, get) => ({
    patients: [],
    selectedPatient: null,
    searchQuery: '',
    activeFilter: 'all',
    isLoading: false,
    error: null,
    organizationId: null,

    setPatients: (patients) => set({ patients }),
    selectPatient: (patient) => set({ selectedPatient: patient }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setActiveFilter: (filter) => set({ activeFilter: filter }),
    setOrganizationId: (id) => set({ organizationId: id }),

    loadPatients: async (organizationId?: string) => {
        try {
            set({ isLoading: true, error: null })
            const targetOrgId = organizationId || get().organizationId
            if (organizationId) set({ organizationId })

            if (targetOrgId) {
                const patients = await getPatientsForOrganization(targetOrgId)
                set({ patients, isLoading: false })
            } else {
                set({ patients: [], isLoading: false })
            }
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load patients',
                isLoading: false,
            })
        }
    },

    searchPatients: async (query: string) => {
        try {
            set({ isLoading: true, error: null })
            const currentPatients = get().patients
            const q = query.toLowerCase()
            const filtered = currentPatients.filter(
                (p) =>
                    p.name?.toLowerCase().includes(q) ||
                    p.email?.toLowerCase().includes(q) ||
                    p.cedula?.includes(query) ||
                    p.phone?.includes(query)
            )
            set({ patients: filtered, isLoading: false, searchQuery: query })
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to search patients',
                isLoading: false,
            })
        }
    },

    createPatient: async (patientData, organizationId) => {
        try {
            set({ isLoading: true, error: null })
            const patientId = await createOrUpdatePatient(patientData, organizationId)
            const newPatient = await getPatientById(patientId, organizationId)
            if (!newPatient) throw new Error('Failed to retrieve created patient')

            set((state) => ({
                patients: [...state.patients, newPatient],
                isLoading: false,
            }))
            return newPatient
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create patient',
                isLoading: false,
            })
            throw error
        }
    },

    updatePatient: async (id, updates, organizationId) => {
        try {
            set({ isLoading: true, error: null })
            await updatePatientService(id, updates, organizationId)
            const updatedPatient = await getPatientById(id, organizationId)
            if (!updatedPatient) throw new Error('Failed to retrieve updated patient')

            set((state) => ({
                patients: state.patients.map((p) => (p.id === id ? updatedPatient : p)),
                selectedPatient: state.selectedPatient?.id === id ? updatedPatient : state.selectedPatient,
                isLoading: false,
            }))
            return updatedPatient
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update patient',
                isLoading: false,
            })
            throw error
        }
    },

    deletePatient: async (id, organizationId) => {
        try {
            set({ isLoading: true, error: null })
            await deletePatientService(id, organizationId)
            set((state) => ({
                patients: state.patients.filter((p) => p.id !== id),
                selectedPatient: state.selectedPatient?.id === id ? null : state.selectedPatient,
                isLoading: false,
            }))
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete patient',
                isLoading: false,
            })
            throw error
        }
    },

    resetStore: () =>
        set({
            patients: [],
            selectedPatient: null,
            searchQuery: '',
            activeFilter: 'all',
            isLoading: false,
            error: null,
            organizationId: null,
        }),
}))
