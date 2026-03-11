import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, User, Briefcase, MapPin, CreditCard, Globe } from 'lucide-react'
import type { UserData } from '@/types'

interface ProfileFormData {
  name: string
  phoneNumber: string
  specialty: string
  medicalLicense: string
  yearsOfExperience: number
  education: string
  clinicName: string
  clinicAddress: string
  consultationFee: number
  bio: string
  languages: string
}

export function ProfileEditPage() {
  const navigate = useNavigate()
  const { userData, user, updateUserData, refreshUserData } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    phoneNumber: '',
    specialty: '',
    medicalLicense: '',
    yearsOfExperience: 0,
    education: '',
    clinicName: '',
    clinicAddress: '',
    consultationFee: 0,
    bio: '',
    languages: ''
  })

  // Cargar datos del perfil
  useEffect(() => {
    if (!userData) return

    setFormData({
      name: userData.name || '',
      phoneNumber: userData.phoneNumber || '',
      specialty: userData.specialty || '',
      medicalLicense: userData.medicalLicense || '',
      yearsOfExperience: userData.yearsOfExperience || 0,
      education: userData.education || '',
      clinicName: userData.clinicName || '',
      clinicAddress: userData.clinicAddress || '',
      consultationFee: userData.consultationFee || 0,
      bio: userData.bio || '',
      languages: userData.languages || ''
    })
    setIsLoading(false)
  }, [userData])

  const handleInputChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
    if (successMessage) setSuccessMessage(null)
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'El nombre es requerido'
    if (!formData.specialty.trim()) return 'La especialidad es requerida'
    if (!formData.medicalLicense.trim()) return 'El número de colegiado es requerido'
    if (formData.yearsOfExperience < 0) return 'Los años de experiencia no pueden ser negativos'
    if (formData.consultationFee < 0) return 'La tarifa de consulta no puede ser negativa'
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!user?.uid) {
      setError('Error de autenticación. Por favor, inicie sesión nuevamente.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const updateData = {
        ...formData,
        updatedAt: new Date(),
        displayName: formData.name
      }

      // Actualizar en Firestore
      await updateDoc(doc(firestore, 'users', user.uid), {
        ...formData,
        updatedAt: new Date().toISOString(),
        displayName: formData.name
      })

      // Actualizar en el store local
      updateUserData(updateData as Partial<UserData>)

      // Refrescar datos del usuario
      await refreshUserData()

      setSuccessMessage('Perfil actualizado correctamente')

      // Navegar de vuelta a configuración después de 2 segundos
      setTimeout(() => {
        navigate('/doctor/settings')
      }, 2000)

    } catch (error: any) {
      console.error('Error updating profile:', error)
      setError('Error al guardar el perfil. Por favor, intente nuevamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/doctor/settings')
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Configuración
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-clinical-900">Editar Perfil Profesional</h1>
        <p className="text-sm text-clinical-500">
          Actualiza tu información profesional y configuración de consulta
        </p>
      </div>

      {/* Mensajes de estado */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      <div className="space-y-6">
        {/* Información Personal */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Información Personal</CardTitle>
                <p className="text-sm text-clinical-500">Datos básicos de contacto</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Dr. Juan Pérez"
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+506 1234-5678"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                value={userData?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-clinical-500 mt-1">
                Para cambiar el correo, contacte al administrador
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Información Profesional */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Briefcase className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Información Profesional</CardTitle>
                <p className="text-sm text-clinical-500">Credenciales médicas y especialización</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="specialty">Especialidad *</Label>
                <Input
                  id="specialty"
                  value={formData.specialty}
                  onChange={(e) => handleInputChange('specialty', e.target.value)}
                  placeholder="Medicina General, Cardiología, etc."
                />
              </div>
              <div>
                <Label htmlFor="license">Número de Colegiado *</Label>
                <Input
                  id="license"
                  value={formData.medicalLicense}
                  onChange={(e) => handleInputChange('medicalLicense', e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience">Años de Experiencia</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="languages">Idiomas</Label>
                <Input
                  id="languages"
                  value={formData.languages}
                  onChange={(e) => handleInputChange('languages', e.target.value)}
                  placeholder="Español, Inglés, Francés"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="education">Formación Académica</Label>
              <Textarea
                id="education"
                value={formData.education}
                onChange={(e) => handleInputChange('education', e.target.value)}
                placeholder="Universidad, especializaciones, certificaciones..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Información del Consultorio */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <MapPin className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Consultorio</CardTitle>
                <p className="text-sm text-clinical-500">Información del lugar de consulta</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clinicName">Nombre del Consultorio</Label>
              <Input
                id="clinicName"
                value={formData.clinicName}
                onChange={(e) => handleInputChange('clinicName', e.target.value)}
                placeholder="Centro Médico San José"
              />
            </div>

            <div>
              <Label htmlFor="clinicAddress">Dirección del Consultorio</Label>
              <Textarea
                id="clinicAddress"
                value={formData.clinicAddress}
                onChange={(e) => handleInputChange('clinicAddress', e.target.value)}
                placeholder="Avenida Central, San José, Costa Rica"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Consulta */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Configuración de Consulta</CardTitle>
                <p className="text-sm text-clinical-500">Tarifas y configuración</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="consultationFee">Tarifa de Consulta (₡)</Label>
              <Input
                id="consultationFee"
                type="number"
                min="0"
                value={formData.consultationFee}
                onChange={(e) => handleInputChange('consultationFee', parseFloat(e.target.value) || 0)}
                placeholder="25000"
              />
              <p className="text-xs text-clinical-500 mt-1">
                Tarifa en colones costarricenses
              </p>
            </div>

            <div>
              <Label htmlFor="bio">Biografía Profesional</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Breve descripción de tu práctica médica y enfoques de tratamiento..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
            {isSaving ? (
              <>
                <Spinner className="h-4 w-4" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>

          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ProfileEditPage