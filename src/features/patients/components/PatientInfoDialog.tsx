import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Calendar,
  Edit, Stethoscope, X, Heart, AlertCircle, Copy, ExternalLink
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { createAppointment } from '@/features/schedule/services/appointmentService'
import type { Patient } from '../types/patient'

interface PatientInfoDialogProps {
  patient: Patient | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (patient: Patient) => void
  onStartConsultation?: (patient: Patient) => void
}

export function PatientInfoDialog({
  patient,
  isOpen,
  onClose,
  onEdit,
  onStartConsultation
}: PatientInfoDialogProps) {
  const navigate = useNavigate()
  const { userData } = useAuthStore()
  const [isStartingConsultation, setIsStartingConsultation] = useState(false)

  if (!patient) return null

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return 'No especificada'
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      return age >= 0 ? `${age} años` : 'Fecha inválida'
    } catch {
      return 'Fecha inválida'
    }
  }

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'male': return 'Masculino'
      case 'female': return 'Femenino'
      case 'other': return 'Otro'
      default: return 'No especificado'
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit(patient)
    } else {
      navigate(`/doctor/patients/${patient.id}/edit`)
    }
    onClose()
  }

  const handleStartConsultation = async () => {
    if (!userData?.uid || !userData.organizationId) {
      console.error('Error: No user data available for consultation')
      return
    }

    setIsStartingConsultation(true)

    try {
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour later

      const appointmentId = await createAppointment({
        patientId: patient.id!,
        patientName: patient.name!,
        doctorId: userData.uid,
        doctorName: userData.name || 'Doctor',
        organizationId: userData.organizationId,
        start: now,
        end: end,
        type: 'in-person',
        status: 'in-progress',
        reason: 'Consulta inmediata desde lista de pacientes',
        description: 'Consulta iniciada desde el diálogo de información del paciente'
      })

      onClose()

      if (onStartConsultation) {
        onStartConsultation(patient)
      } else {
        // Navigate to consultation page
        navigate(`/doctor/consultation?appointmentId=${appointmentId}&patientId=${patient.id}`)
      }
    } catch (error) {
      console.error('Error starting consultation:', error)
    } finally {
      setIsStartingConsultation(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header with background gradient */}
        <div className="relative -m-6 mb-6 bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            {/* Patient Avatar - larger and more prominent */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-lg font-bold text-white ring-4 ring-white/30 shadow-lg">
              {patient.photoURL ? (
                <img
                  src={patient.photoURL}
                  alt={patient.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                patient.name
                  ?.split(' ')
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">{patient.name}</h3>
              <div className="flex items-center gap-4 text-sm text-white/90">
                {patient.cedula && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {patient.cedula}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {calculateAge(patient.birthDate)}
                </span>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {getGenderLabel(patient.gender)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">{calculateAge(patient.birthDate)}</div>
              <div className="text-xs text-blue-600/70 uppercase tracking-wide">Edad</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 mb-1">{getGenderLabel(patient.gender)?.charAt(0) || '?'}</div>
              <div className="text-xs text-purple-600/70 uppercase tracking-wide">Género</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">👤</div>
              <div className="text-xs text-green-600/70 uppercase tracking-wide">Activo</div>
            </div>
          </div>

          {/* Contact Info - Modern Cards */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 text-lg mb-4">Información de Contacto</h4>

            <div className="grid gap-4">
              {patient.phone && (
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <Phone className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="font-semibold text-gray-900">{patient.phone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(patient.phone || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {patient.email && (
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                      <Mail className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Correo electrónico</p>
                      <p className="font-semibold text-gray-900">{patient.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(patient.email || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {patient.address && (
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/30 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                      <MapPin className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Dirección</p>
                      <p className="font-semibold text-gray-900">{patient.address}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(patient.address || '')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {!patient.phone && !patient.email && !patient.address && (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <AlertCircle className="h-5 w-5 text-gray-400" />
                <p className="text-gray-600">Sin información de contacto disponible</p>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {(patient.emergencyContact || patient.emergencyPhone) && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-lg mb-4">Contacto de Emergencia</h4>

              <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
                <div className="space-y-3">
                  {patient.emergencyContact && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <User className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-red-600/70">Nombre</p>
                        <p className="font-semibold text-red-900">{patient.emergencyContact}</p>
                      </div>
                    </div>
                  )}

                  {patient.emergencyPhone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Phone className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-red-600/70">Teléfono</p>
                        <p className="font-semibold text-red-900">{patient.emergencyPhone}</p>
                      </div>
                    </div>
                  )}

                  {patient.emergencyRelationship && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Heart className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-red-600/70">Relación</p>
                        <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                          {patient.emergencyRelationship}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions - Fixed bottom bar */}
        <div className="sticky bottom-0 -mx-6 -mb-6 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <Button
              onClick={handleStartConsultation}
              disabled={isStartingConsultation}
              className="flex-1 gap-2 h-12 text-base font-semibold shadow-lg"
              size="lg"
            >
              <Stethoscope className="h-5 w-5" />
              {isStartingConsultation ? 'Iniciando consulta...' : 'Iniciar Consulta'}
            </Button>

            <Button
              variant="outline"
              onClick={handleEdit}
              className="gap-2 h-12 text-base font-medium px-6 border-2 hover:bg-gray-50"
              size="lg"
            >
              <Edit className="h-5 w-5" />
              Editar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}