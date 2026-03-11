/**
 * QuickPatientForm — Registro rápido de paciente dentro del diálogo de cita
 * RF-A02: Formulario inline sin salir del AppointmentDialog
 * - Pre-rellena campos desde la búsqueda previa
 * - Actualiza el patientStore para que el nuevo paciente aparezca en búsquedas futuras
 */

import { useState } from 'react'
import { UserPlus, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { findPatientByCedula, createOrUpdatePatient, getPatientById } from '@/features/patients/services/patientService'
import { usePatientStore } from '@/features/patients/stores/patientStore'
import type { PatientSearchContext } from './PatientSelector'

interface Patient {
  id: string
  name: string
  email?: string
  cedula?: string
  phone?: string
}

interface QuickPatientFormProps {
  organizationId: string
  searchContext?: PatientSearchContext | null
  onPatientCreated: (patient: Patient) => void
  onCancel: () => void
}

/** Detecta qué campo rellenar basado en el contexto de búsqueda */
function resolveInitialValues(ctx: PatientSearchContext | null | undefined) {
  if (!ctx?.query?.trim()) return { name: '', cedula: '', phone: '' }
  const q = ctx.query.trim()

  if (ctx.filter === 'name') return { name: q, cedula: '', phone: '' }
  if (ctx.filter === 'cedula') return { name: '', cedula: q, phone: '' }
  if (ctx.filter === 'phone') return { name: '', cedula: '', phone: q }

  // filter === 'all': heurística — solo dígitos/guiones → cédula o teléfono
  const onlyDigitsAndDashes = /^[\d\-\s]+$/.test(q)
  if (onlyDigitsAndDashes) {
    // Si tiene guiones es cédula; si no, teléfono
    return q.includes('-')
      ? { name: '', cedula: q, phone: '' }
      : { name: '', cedula: '', phone: q }
  }

  // Texto → nombre
  return { name: q, cedula: '', phone: '' }
}

export function QuickPatientForm({ organizationId, searchContext, onPatientCreated, onCancel }: QuickPatientFormProps) {
  const initial = resolveInitialValues(searchContext)

  const [name, setName] = useState(initial.name)
  const [cedula, setCedula] = useState(initial.cedula)
  const [phone, setPhone] = useState(initial.phone)
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { loadPatients } = usePatientStore()

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) newErrors.name = 'Nombre requerido (mínimo 2 caracteres)'
    if (!cedula.trim()) newErrors.cedula = 'Cédula / Identificación requerida'
    if (!phone.trim()) newErrors.phone = 'Teléfono requerido'
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Correo inválido'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      // Verificar cédula duplicada
      const existing = await findPatientByCedula(cedula.trim(), organizationId)
      if (existing) {
        setErrors({ cedula: 'Ya existe un paciente con esa cédula' })
        toast.error('Paciente ya registrado con esa cédula')
        setIsSubmitting(false)
        return
      }

      // Crear paciente
      const patientId = await createOrUpdatePatient(
        {
          name: name.trim(),
          cedula: cedula.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        },
        organizationId
      )

      // Refrescar el store para que PatientSelector vea el nuevo paciente
      await loadPatients(organizationId)

      toast.success('Paciente registrado exitosamente')
      onPatientCreated({
        id: patientId,
        name: name.trim(),
        cedula: cedula.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      })
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar paciente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b">
        <Button variant="ghost" size="sm" onClick={onCancel} className="p-1 h-7">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Registrar nuevo paciente</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="qp-name" className="text-xs font-medium">
            Nombre completo <span className="text-red-500">*</span>
          </Label>
          <Input
            id="qp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez García"
            className={errors.name ? 'border-red-400' : ''}
            autoFocus
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="qp-cedula" className="text-xs font-medium">
            Cédula / Identificación <span className="text-red-500">*</span>
          </Label>
          <Input
            id="qp-cedula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ej: 1-2345-6789"
            className={errors.cedula ? 'border-red-400' : ''}
          />
          {errors.cedula && <p className="text-xs text-red-500">{errors.cedula}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="qp-phone" className="text-xs font-medium">
            Teléfono <span className="text-red-500">*</span>
          </Label>
          <Input
            id="qp-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 8888-8888"
            className={errors.phone ? 'border-red-400' : ''}
          />
          {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="qp-email" className="text-xs font-medium">Correo electrónico</Label>
          <Input
            id="qp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={errors.email ? 'border-red-400' : ''}
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="qp-reason" className="text-xs font-medium">Motivo de consulta</Label>
          <Textarea
            id="qp-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo principal de la visita..."
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Registrando...</>
            ) : (
              <><UserPlus className="h-4 w-4 mr-2" />Registrar</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
