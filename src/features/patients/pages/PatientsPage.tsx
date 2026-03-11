import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, Users, ChevronRight, Phone, Mail, MoreHorizontal, Eye, Edit, Stethoscope } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { usePatientStore } from '../stores/patientStore'
import { PatientInfoDialog } from '../components/PatientInfoDialog'
import { createAppointment } from '@/features/schedule/services/appointmentService'

export default function PatientsPage() {
  const navigate = useNavigate()
  const { userData } = useAuthStore()
  const {
    patients,
    isLoading,
    error,
    loadPatients,
    activeFilter,
    setActiveFilter,
  } = usePatientStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatientForDialog, setSelectedPatientForDialog] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    if (userData?.organizationId) {
      loadPatients(userData.organizationId)
    }
  }, [userData?.organizationId, loadPatients])

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients
    const q = searchQuery.toLowerCase()
    return patients.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.cedula?.includes(searchQuery) ||
        p.phone?.includes(searchQuery)
    )
  }, [patients, searchQuery])

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return ''
    try {
      const birth = new Date(birthDate)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
      return age >= 0 ? `${age} años` : ''
    } catch {
      return ''
    }
  }

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'male': return 'M'
      case 'female': return 'F'
      case 'other': return 'O'
      default: return '-'
    }
  }

  const formatDate = (date?: any) => {
    if (!date) return '-'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('es-CR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const handleViewPatient = (patient: any, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    setSelectedPatientForDialog(patient)
    setIsDialogOpen(true)
  }

  const handleEditPatient = (patient: any, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }
    navigate(`/doctor/patients/${patient.id}/edit`)
  }

  const handleStartConsultation = async (patient: any, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (!userData?.uid || !userData.organizationId) {
      console.error('Error: No user data available for consultation')
      return
    }

    try {
      const now = new Date()
      const end = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour later

      const appointmentId = await createAppointment({
        patientId: patient.id,
        patientName: patient.name,
        doctorId: userData.uid,
        doctorName: userData.name || 'Doctor',
        organizationId: userData.organizationId,
        start: now,
        end: end,
        type: 'in-person',
        status: 'in-progress',
        reason: 'Consulta inmediata desde lista de pacientes',
        description: 'Consulta iniciada desde la página de pacientes'
      })

      // Navigate to consultation page
      navigate(`/doctor/consultation?appointmentId=${appointmentId}&patientId=${patient.id}`)
    } catch (error) {
      console.error('Error starting consultation:', error)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedPatientForDialog(null)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-clinical-900">Pacientes</h1>
          <p className="text-sm text-clinical-500">
            {patients.length} paciente{patients.length !== 1 ? 's' : ''} registrado{patients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('new')} variant="gradient" className="gap-2 shadow-glow-primary">
          <UserPlus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clinical-400" />
          <Input
            placeholder="Buscar por nombre, cédula, teléfono o email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full sm:w-80 text-sm rounded-xl bg-clinical-50/80 backdrop-blur-sm border-clinical-200/60 focus:bg-white focus:border-primary-400 focus:ring-primary-400/30 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'recent', 'agenda'] as const).map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-lg transition-all h-9 font-medium",
                activeFilter === filter ? "bg-primary-600 text-white shadow-md border-primary-600" : "bg-white text-clinical-600 border-clinical-200 hover:bg-clinical-50 hover:text-clinical-900"
              )}
            >
              {filter === 'all' ? 'Todos' : filter === 'recent' ? 'Recientes' : 'Con cita'}
            </Button>
          ))}
        </div>
      </div>

      {/* Patient List */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-clinical-400">
            <p className="text-sm text-danger">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => userData?.organizationId && loadPatients(userData.organizationId)}
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : filteredPatients.length === 0 ? (
        <Card className="border-dashed border-clinical-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-clinical-400">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-clinical-100 to-clinical-50 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-clinical-400" />
            </div>
            <p className="font-semibold text-clinical-600">
              {searchQuery ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
            </p>
            <p className="text-sm mt-1 text-clinical-400">
              {searchQuery
                ? 'Intenta cambiando los términos de búsqueda'
                : 'Agrega tu primer paciente para comenzar'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('new')} variant="gradient" className="mt-5 gap-2" size="sm">
                <UserPlus className="h-4 w-4" />
                Agregar paciente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border border-clinical-100 rounded-xl shadow-sm bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-clinical-50/50">
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Identificación</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Edad/Género</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead className="w-16">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow
                  key={patient.id}
                  className="cursor-pointer hover:bg-primary-50/40 transition-colors border-b border-clinical-100/60 last:border-0"
                  onClick={() => handleViewPatient(patient)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400/20 to-accent-400/20 text-sm font-bold text-primary-700 ring-2 ring-white shadow-sm">
                        {patient.photoURL ? (
                          <img
                            src={patient.photoURL}
                            alt={patient.name}
                            className="h-10 w-10 rounded-full object-cover"
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
                      <div>
                        <div className="font-semibold text-clinical-900">
                          {patient.name}
                        </div>
                        {patient.address && (
                          <div className="text-sm text-clinical-500 truncate max-w-[200px]">
                            {patient.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {patient.cedula || '-'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      {patient.email && (
                        <div className="flex items-center gap-1.5 text-sm text-clinical-600">
                          <Mail className="h-3.5 w-3.5 text-clinical-400" />
                          <span className="truncate max-w-[150px]">{patient.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-clinical-600">
                          <Phone className="h-3.5 w-3.5 text-clinical-400" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{calculateAge(patient.birthDate)}</span>
                      <Badge variant="outline" className="text-xs">
                        {getGenderLabel(patient.gender)}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-medium bg-success-50 text-success-700 border border-success-200">
                      Activo
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm text-clinical-500">
                      {formatDate(patient.createdAt)}
                    </div>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => handleViewPatient(patient, e)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleStartConsultation(patient, e)}
                          className="text-primary font-medium"
                        >
                          <Stethoscope className="mr-2 h-4 w-4" />
                          Perfil Clínico
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditPatient(patient, e)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Patient Info Dialog */}
      <PatientInfoDialog
        patient={selectedPatientForDialog}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  )
}
