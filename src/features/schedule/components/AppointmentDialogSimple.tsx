/**
 * AppointmentDialog - Simple version for testing
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PatientSelector } from './PatientSelector'

interface AppointmentDialogProps {
  open: boolean
  onClose: () => void
  onSave?: (data: any) => void
  date?: Date
  timeSlot?: string
  appointment?: any
  appointmentRequest?: any
  doctorId: string
  organizationId: string
}

export function AppointmentDialogSimple({
  open,
  onClose,
  onSave,
  date,
  timeSlot,
  appointment,
  appointmentRequest,
  doctorId,
  organizationId
}: AppointmentDialogProps) {
  const [patientName, setPatientName] = useState('')
  const [showPatientSelector, setShowPatientSelector] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  console.log('AppointmentDialog rendered with:', { open, date, timeSlot, doctorId, organizationId })

  const handlePatientSelect = (patient: any) => {
    setSelectedPatient(patient)
    setPatientName(patient.name)
    setShowPatientSelector(false)
    console.log('Patient selected:', patient)
  }

  const handleSave = () => {
    console.log('Save clicked with data:', { patientName, date, timeSlot })
    if (onSave) {
      onSave({ patientName, date, timeSlot })
    }
    onClose()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Editar Cita' : 'Nueva Cita'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paciente
            </label>
            {selectedPatient ? (
              <div className="p-2 bg-gray-100 rounded-md flex justify-between items-center">
                <span>{selectedPatient.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPatient(null)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowPatientSelector(true)}
                className="w-full"
              >
                Seleccionar Paciente
              </Button>
            )}
          </div>

          {date && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha
              </label>
              <div className="p-2 bg-gray-100 rounded-md">
                {date.toLocaleDateString()}
              </div>
            </div>
          )}

          {timeSlot && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Hora
              </label>
              <div className="p-2 bg-gray-100 rounded-md">
                {timeSlot}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedPatient}
            >
              {appointment ? 'Actualizar' : 'Crear'} Cita
            </Button>
          </div>
          </div>
        </ScrollArea>

        {/* Patient Selector Modal */}
        <PatientSelector
          open={showPatientSelector}
          onClose={() => setShowPatientSelector(false)}
          onSelect={handlePatientSelect}
          organizationId={organizationId}
        />
      </DialogContent>
    </Dialog>
  )
}