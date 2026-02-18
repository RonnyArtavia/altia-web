/**
 * PatientSelector - Patient Selection Modal for Appointments
 * Allows searching and selecting patients for appointment creation
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, User, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { usePatientStore } from '@/features/patients/stores/patientStore'
import { cn } from '@/lib/utils'

interface Patient {
  id: string
  userId?: string
  name: string
  email?: string
  cedula?: string
  phone?: string
  dateOfBirth?: string
}

interface PatientSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (patient: Patient) => void
  organizationId: string
}

export function PatientSelector({ open, onClose, onSelect, organizationId }: PatientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'email' | 'cedula' | 'phone'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'email'>('name')

  // Use the patient store
  const { patients, isLoading, loadPatients } = usePatientStore()

  // Load patients when component mounts
  useEffect(() => {
    if (organizationId && patients.length === 0 && !isLoading) {
      loadPatients(organizationId)
    }
  }, [organizationId, patients.length, isLoading, loadPatients])

  // Filter and sort patients based on search query and filters
  const filteredAndSortedPatients = useMemo(() => {
    let filtered = [...patients]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()

      filtered = filtered.filter((patient) => {
        const nameMatch = patient.name?.toLowerCase().includes(query) || false
        const emailMatch = patient.email?.toLowerCase().includes(query) || false
        const cedulaMatch = patient.cedula?.includes(query) || false
        const phoneMatch = patient.phone?.includes(query) || false

        switch (searchFilter) {
          case 'name':
            return nameMatch
          case 'email':
            return emailMatch
          case 'cedula':
            return cedulaMatch
          case 'phone':
            return phoneMatch
          case 'all':
          default:
            return nameMatch || emailMatch || cedulaMatch || phoneMatch
        }
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'es')
        case 'email':
          return (a.email || '').localeCompare(b.email || '', 'es')
        case 'recent':
          // Sort by recent appointments (would need appointment data)
          return a.name.localeCompare(b.name, 'es')
        default:
          return a.name.localeCompare(b.name, 'es')
      }
    })

    return filtered
  }, [patients, searchQuery, searchFilter, sortBy])

  const handleSelect = () => {
    if (!selectedPatientId) return

    const selectedPatient = patients.find((p) => p.id === selectedPatientId)
    if (selectedPatient) {
      onSelect({
        id: selectedPatient.id,
        userId: selectedPatient.userId,
        name: selectedPatient.name,
        email: selectedPatient.email,
        cedula: selectedPatient.cedula,
        phone: selectedPatient.phone,
        dateOfBirth: selectedPatient.birthDate,
      })
    }
  }

  const handlePatientClick = (patient: any) => {
    setSelectedPatientId(patient.id)
    // Auto-select on click for better UX
    setTimeout(() => {
      onSelect({
        id: patient.id,
        userId: patient.userId,
        name: patient.name,
        email: patient.email,
        cedula: patient.cedula,
        phone: patient.phone,
        dateOfBirth: patient.birthDate,
      })
    }, 150)
  }

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      setSelectedPatientId(null)
      setSearchFilter('all')
      setSortBy('name')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] p-0">
        {/* Header */}
        <div className="p-4 border-b">
          <DialogTitle className="text-lg font-medium">Contactos sugeridos</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">Buscar y seleccionar paciente para la cita</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Simple Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar pacientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando pacientes...</p>
            </div>
          )}

          {/* Enhanced No Results */}
          {!isLoading && filteredAndSortedPatients.length === 0 && searchQuery && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="text-center py-8">
                <Search className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-orange-900 mb-2">No se encontraron pacientes</h3>
                <p className="text-orange-700 mb-4">
                  No hay pacientes que coincidan con "{searchQuery}" en {searchFilter === 'all' ? 'cualquier campo' : searchFilter}
                </p>
                <div className="flex justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchFilter('all')
                    }}
                    className="border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    Limpiar búsqueda
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo paciente
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Patients */}
          {!isLoading && patients.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay pacientes</h3>
              <p className="text-gray-600">
                No hay pacientes registrados en esta organización
              </p>
            </div>
          )}

          {/* Patient List - Outlook Style */}
          {!isLoading && filteredAndSortedPatients.length > 0 && (
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              {filteredAndSortedPatients.map((patient, index) => (
                <button
                  key={patient.id}
                  className={cn(
                    "w-full p-3 text-left transition-all hover:bg-gray-50 border-b last:border-b-0",
                    "flex items-center space-x-3",
                    selectedPatientId === patient.id && "bg-blue-50 border-blue-200"
                  )}
                  onClick={() => handlePatientClick(patient)}
                >
                  {/* Avatar Circle */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {patient.name}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {patient.email || patient.phone || patient.cedula || 'Sin información de contacto'}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedPatientId === patient.id && (
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {filteredAndSortedPatients.length} de {patients.length} pacientes
          </div>
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {selectedPatientId && (
              <Button type="button" onClick={handleSelect} className="bg-blue-600 hover:bg-blue-700">
                Seleccionar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}