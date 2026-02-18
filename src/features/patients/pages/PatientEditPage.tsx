import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { usePatientStore } from '../stores/patientStore'
import type { Patient } from '../types/patient'

export default function PatientEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userData } = useAuthStore()
  const { patients, updatePatient, loadPatients } = usePatientStore()

  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    cedula: '',
    phone: '',
    email: '',
    birthDate: '',
    gender: 'unknown' as 'male' | 'female' | 'other' | 'unknown',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'CR',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelationship: 'family',
  })

  // Load patient data
  useEffect(() => {
    if (id && patients.length === 0 && userData?.organizationId) {
      loadPatients(userData.organizationId)
    }
  }, [id, patients.length, userData?.organizationId, loadPatients])

  useEffect(() => {
    if (id && patients.length > 0) {
      const foundPatient = patients.find(p => p.id === id)
      if (foundPatient) {
        setPatient(foundPatient)
        // Parse name into firstName and lastName
        const nameParts = foundPatient.name?.split(' ') || []
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        setFormData({
          firstName,
          lastName,
          cedula: foundPatient.cedula || '',
          phone: foundPatient.phone || '',
          email: foundPatient.email || '',
          birthDate: foundPatient.birthDate || '',
          gender: foundPatient.gender || 'unknown',
          address: foundPatient.address || '',
          city: foundPatient.city || '',
          state: foundPatient.state || '',
          postalCode: foundPatient.postalCode || '',
          country: foundPatient.country || 'CR',
          emergencyContact: foundPatient.emergencyContact || '',
          emergencyPhone: foundPatient.emergencyPhone || '',
          emergencyRelationship: foundPatient.emergencyRelationship || 'family',
        })
      }
    }
  }, [id, patients])

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son obligatorios'
    }
    if (!formData.cedula.trim()) {
      newErrors.cedula = 'La cédula es obligatoria'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm() || !patient || !userData?.organizationId) {
      return
    }

    setLoading(true)

    try {
      const updatedPatientData: Partial<Patient> = {
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        cedula: formData.cedula.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        birthDate: formData.birthDate.trim() || undefined,
        gender: formData.gender,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        country: formData.country.trim() || undefined,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        emergencyPhone: formData.emergencyPhone.trim() || undefined,
        emergencyRelationship: formData.emergencyRelationship,
        updatedAt: new Date(),
      }

      await updatePatient(patient.id!, updatedPatientData, userData.organizationId)
      navigate('/doctor/patients')
    } catch (error: any) {
      console.error('Error updating patient:', error)
      // You could add a toast notification here
    } finally {
      setLoading(false)
    }
  }

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case 'male': return 'Masculino'
      case 'female': return 'Femenino'
      case 'other': return 'Otro'
      default: return 'No especificado'
    }
  }

  const getRelationshipLabel = (relationship: string) => {
    switch (relationship) {
      case 'family': return 'Familia'
      case 'friend': return 'Amigo/a'
      case 'partner': return 'Pareja'
      default: return 'Otro'
    }
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando paciente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/doctor/patients')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Editar Paciente</h1>
              <p className="text-sm text-gray-500">Actualizar información del paciente</p>
            </div>
          </div>
          <Badge variant="secondary">{patient.cedula}</Badge>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="Nombre del paciente"
                    className={errors.firstName ? 'border-red-500' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellidos *
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="Apellidos del paciente"
                    className={errors.lastName ? 'border-red-500' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cédula *
                  </label>
                  <Input
                    value={formData.cedula}
                    onChange={(e) => updateField('cedula', e.target.value)}
                    placeholder="Número de cédula"
                    className={errors.cedula ? 'border-red-500' : ''}
                  />
                  {errors.cedula && (
                    <p className="text-sm text-red-600 mt-1">{errors.cedula}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="Número de teléfono"
                    className={errors.phone ? 'border-red-500' : ''}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Nacimiento
                  </label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => updateField('birthDate', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sexo
                </label>
                <div className="flex gap-4">
                  {[
                    { value: 'male', label: 'Masculino' },
                    { value: 'female', label: 'Femenino' },
                    { value: 'other', label: 'Otro' },
                    { value: 'unknown', label: 'No especificado' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('gender', option.value)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                        formData.gender === option.value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Dirección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Calle, número, apartamento"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="Ciudad"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provincia
                  </label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="Provincia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="Código"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  País
                </label>
                <Input
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="País"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contacto de Emergencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Contacto
                  </label>
                  <Input
                    value={formData.emergencyContact}
                    onChange={(e) => updateField('emergencyContact', e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono del Contacto
                  </label>
                  <Input
                    value={formData.emergencyPhone}
                    onChange={(e) => updateField('emergencyPhone', e.target.value)}
                    placeholder="Número de teléfono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Relación
                </label>
                <div className="flex gap-3 flex-wrap">
                  {[
                    { value: 'family', label: 'Familia' },
                    { value: 'friend', label: 'Amigo/a' },
                    { value: 'partner', label: 'Pareja' },
                    { value: 'other', label: 'Otro' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateField('emergencyRelationship', option.value)}
                      className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                        formData.emergencyRelationship === option.value
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/doctor/patients')}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Guardando...' : 'Actualizar Paciente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}