# Plan de Implementación — Sistema Altia

> **Documento para desarrollador senior**  
> Referencia: [requerimientos-detallados.md](file:///Users/ronyartavia/repo/GP/Alta/docs/requerimientos-detallados.md)  
> Cada fase debe validarse antes de iniciar la siguiente.

---

## Tracking de progreso

Cada tarea y fase tiene un estado de tracking:

| Estado | Símbolo | Significado |
|---|---|---|
| Pendiente | `[ ]` | No iniciada |
| En progreso | `[/]` | En desarrollo |
| Completada | `[x]` | Implementada y validada |
| Bloqueada | `[!]` | Bloqueada por dependencia |

---

# FASE 1 — Citas y flujo de secretaria/asistente
**RF**: RF-A01, RF-A02, RF-A04, RF-A05  
**Objetivo**: Completar el flujo de citas con búsqueda, registro rápido, cambio de estados y vista "Pacientes de hoy"

---

## [x] T-1.0 — Reemplazo de estados de cita
**Estimación**: 3–4 horas | **Prioridad**: ⬤ Alta (bloqueante para toda la Fase 1)

**Contexto**: El sistema actual usa estados FHIR (`pending`, `booked`, `arrived`, `fulfilled`, `cancelled`, `no-show`). Como el sistema NO está en producción, se reemplazan directamente por: `scheduled`, `waiting`, `in-progress`, `completed`, `cancelled`.

**Tareas**:

1. **Modificar** `src/features/schedule/services/appointmentService.ts`:
   - Línea 34 — Reemplazar type `status`:
     ```typescript
     status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled'
     ```
   - Agregar campos de auditoría al type `AppointmentData`:
     ```typescript
     waitingAt?: Date
     inProgressAt?: Date
     completedAt?: Date
     cancelledAt?: Date
     updatedBy?: string
     updatedRole?: string
     ```
   - En `toAppointmentData()` (línea 56–81): mapear los nuevos campos
   - En `toFirestoreData()` (línea 83–92): serializar timestamps de auditoría

2. **Modificar** `src/features/schedule/pages/AgendaPage.tsx`:
   - Línea 34–42 — Reemplazar `STATUS_LABELS`:
     ```typescript
     const STATUS_LABELS: Record<string, { label: string; color: string }> = {
       scheduled: { label: 'Programada', color: 'bg-blue-500/10 text-blue-700' },
       waiting: { label: 'En espera', color: 'bg-amber-500/10 text-amber-700' },
       'in-progress': { label: 'En atención', color: 'bg-green-500/10 text-green-700' },
       completed: { label: 'Finalizada', color: 'bg-clinical-100 text-clinical-600' },
       cancelled: { label: 'Cancelada', color: 'bg-danger/10 text-danger-700' },
     }
     ```
   - Línea 46–59 — Actualizar type `AppointmentData` (local) para que coincida
   - Buscar y reemplazar cualquier referencia a los estados antiguos (`pending`, `booked`, etc.) en todo el archivo

3. **Modificar** `src/features/schedule/components/AppointmentDialog.tsx`:
   - Línea 53–67 — Actualizar type `AppointmentData` (local)
   - En `handleSave()` (línea 214): cambiar `status: 'booked'` → `status: 'scheduled'`

4. **Modificar** `src/features/schedule/components/AppointmentOptionsDialog.tsx`:
   - Línea 27–40 — Actualizar type `AppointmentData` (local)
   - Actualizar `getStatusBadge()` (línea 99–116) con los nuevos estados

5. **Buscar globalmente** `'pending'`, `'booked'`, `'arrived'`, `'fulfilled'`, `'no-show'` en `src/` y reemplazar o eliminar

**Verificación**:
- [ ] Build sin errores TypeScript (`npm run build` o `npx tsc --noEmit`)
- [ ] Crear una cita → verificar que se guarda con `status: 'scheduled'` en Firestore
- [ ] Los badges de estado muestran los labels correctos en la vista de agenda

---

## [x] T-1.1 — Reglas de transición de estado por rol
**Estimación**: 3–4 horas | **Depende de**: T-1.0

**Tareas**:

1. **Crear** `src/features/schedule/utils/appointmentTransitions.ts`:
   ```typescript
   export const STATUS_CONFIG = {
     scheduled: { label: 'Programada', color: '...' },
     waiting: { label: 'En espera', color: '...' },
     'in-progress': { label: 'En atención', color: '...' },
     completed: { label: 'Finalizada', color: '...' },
     cancelled: { label: 'Cancelada', color: '...' },
   }

   const TRANSITIONS: Record<string, Record<string, string[]>> = {
     secretary: {
       scheduled: ['waiting', 'cancelled'],
       waiting: ['scheduled', 'cancelled'],
     },
     doctor: {
       waiting: ['in-progress'],
       'in-progress': ['completed'],
     },
   }

   export function getAllowedTransitions(currentStatus: string, role: string): string[]
   export function canTransition(from: string, to: string, role: string): boolean
   export function getTransitionTimestampField(status: string): string | null
     // 'waiting' → 'waitingAt', 'in-progress' → 'inProgressAt', etc.
   ```

2. **Agregar** `changeAppointmentStatus()` en `src/features/schedule/services/appointmentService.ts`:
   ```typescript
   export async function changeAppointmentStatus(
     appointmentId: string,
     organizationId: string,
     newStatus: string,
     userId: string,
     userRole: string
   ): Promise<void> {
     const appointment = await getAppointmentById(appointmentId, organizationId)
     if (!appointment) throw new Error('Cita no encontrada')
     if (!canTransition(appointment.status, newStatus, userRole)) {
       throw new Error(`Transición no permitida: ${appointment.status} → ${newStatus}`)
     }
     const timestampField = getTransitionTimestampField(newStatus)
     const updates: any = {
       status: newStatus,
       updatedBy: userId,
       updatedRole: userRole,
     }
     if (timestampField) updates[timestampField] = new Date()
     await updateAppointment(appointmentId, organizationId, updates)
   }
   ```

**Verificación**:
- [ ] Test: `canTransition('scheduled', 'waiting', 'secretary')` → `true`
- [ ] Test: `canTransition('scheduled', 'in-progress', 'secretary')` → `false`
- [ ] Test: `canTransition('waiting', 'in-progress', 'doctor')` → `true`
- [ ] Llamar `changeAppointmentStatus()` con transición válida → verificar en Firestore que se guardan timestamps y auditoría
- [ ] Llamar con transición inválida → verificar que lanza error

---

## [x] T-1.2 — UI de cambio de estado en AppointmentOptionsDialog
**Estimación**: 3–4 horas | **Depende de**: T-1.1

**Tareas**:

1. **Modificar** `src/features/schedule/components/AppointmentOptionsDialog.tsx`:
   - Importar `getAllowedTransitions` y `changeAppointmentStatus`
   - Obtener `userRole` y `userId` del auth store
   - Agregar sección "Cambiar estado" con botones para cada estado permitido:
     ```tsx
     const allowed = getAllowedTransitions(appointment.status, userRole)
     {allowed.map(status => (
       <Button key={status} onClick={() => handleStatusChange(status)}>
         {STATUS_CONFIG[status].label}
       </Button>
     ))}
     ```
   - En `handleStatusChange`: llamar `changeAppointmentStatus()`, cerrar diálogo, toast de confirmación
   - Mantener botón "Cancelar cita" existente

**Verificación**:
- [ ] Como secretaria: abrir opciones de cita Programada → aparecen "En espera" y "Cancelada" (NO "En atención" ni "Finalizada")
- [ ] Cambiar a "En espera" → badge actualizado en agenda, timestamp `waitingAt` en Firestore
- [ ] Como médico: abrir opciones de cita En espera → aparece "En atención"
- [ ] Cambiar a "En atención" → badge actualizado, `inProgressAt` guardado

---

## [x] T-1.3 — Registro rápido de paciente en diálogo de cita
**Estimación**: 4–5 horas | **Depende de**: ninguna (puede hacerse en paralelo con T-1.0/1.1)

**Tareas**:

1. **Crear** `src/features/schedule/components/QuickPatientForm.tsx`:
   - Campos con validación:
     - `nombre` (requerido, mín 2 chars)
     - `cedula` (requerido)
     - `telefono` (requerido)
     - `correo` (opcional, validar formato email)
     - `motivoConsulta` (opcional, textarea)
   - Al submit:
     1. `findPatientByCedula(cedula, orgId)` → si existe, toast error "Paciente ya registrado con esa cédula"
     2. Si no existe: `createOrUpdatePatient({name, cedula, phone, email}, orgId)`
     3. Callback `onPatientCreated(patient)` → retornar al flujo de cita
   - Botón "Cancelar" para volver a la búsqueda

2. **Modificar** `src/features/schedule/components/PatientSelector.tsx`:
   - Agregar prop `onNoResults?: () => void`
   - Cuando búsqueda retorne 0 resultados: mostrar "No se encontraron pacientes" + botón "Registrar nuevo paciente"

3. **Modificar** `src/features/schedule/components/AppointmentDialog.tsx`:
   - Estado `showQuickRegister: boolean`
   - `PatientSelector` pasa `onNoResults={() => setShowQuickRegister(true)}`
   - Cuando `showQuickRegister=true`: renderizar `QuickPatientForm` en la sección de paciente
   - `QuickPatientForm.onPatientCreated` → setear paciente, `setShowQuickRegister(false)`

**Verificación**:
- [ ] Buscar paciente que no existe → aparece botón "Registrar nuevo paciente"
- [ ] Registrar nuevo paciente → se selecciona automáticamente, se puede crear la cita
- [ ] Intentar registrar con cédula duplicada → toast de error, formulario conserva valores
- [ ] Verificar paciente creado en Firestore `patients_fhir`

---

## [x] T-1.4 — Página "Pacientes de hoy"
**Estimación**: 6–8 horas | **Depende de**: T-1.0, T-1.1

**Tareas**:

1. **Crear** `src/features/schedule/hooks/useTodayPatients.ts`:
   ```typescript
   export function useTodayPatients(
     doctorId: string,
     organizationId: string,
     includeCompleted: boolean
   ) {
     // onSnapshot: appointments donde start >= hoy 00:00 y start < mañana 00:00
     // Filtro: status in ['waiting', 'in-progress'] + si includeCompleted: 'completed'
     // Calcular tiempoEnEspera desde waitingAt (live)
     // Ordenar por hora de cita
     return { patients, loading, error }
   }
   ```

2. **Crear** `src/features/schedule/pages/TodayPatientsPage.tsx`:
   - Header: "Pacientes de hoy" + fecha actual + toggle "Mostrar finalizadas"
   - Tabla responsive (cards en mobile):
     - Hora (`HH:mm`)
     - Paciente (nombre, cédula)
     - Estado (badge con color)
     - Tiempo en espera (live timer `00:15:32`, actualización cada segundo — solo si status es `waiting`)
     - Motivo
     - Acciones:
       - **"Iniciar atención"** (solo si `waiting`): `changeAppointmentStatus(id, orgId, 'in-progress', userId, 'doctor')` → navegar a `/doctor/consultation?patientId=X&appointmentId=Y`
       - **"Ver historial"**: navegar a `/doctor/consultation?patientId=X&mode=history`
   - Empty state: "No hay pacientes en espera"

3. **Agregar ruta** en `src/App.tsx`:
   - Dentro de rutas `/doctor/*`: `<Route path="today-patients" element={<TodayPatientsPage />} />`
   - Dentro de rutas `/assistant/*`: igual

4. **Agregar item de menú** en `src/components/layouts/DashboardLayout.tsx` `getNavigationItems()`:
   - Insertar después de Dashboard:
     ```typescript
     { href: `${basePrefix}/today-patients`, label: 'Pacientes de hoy', icon: Stethoscope }
     ```

5. **Modificar** `src/features/consultation/pages/MedicalNotesCopilotPage.tsx`:
   - Leer query params con `useSearchParams`
   - Soportar `patientId`, `appointmentId`, `mode` (`normal` | `history`)
   - Si `mode=history`: abrir en modo lectura
   - Si hay `appointmentId`: cargar datos de la cita, habilitar consulta activa
   - Dentro del modo history: botón "Iniciar atención" que cambie `waiting → in-progress` y pase a modo normal

**Verificación**:
- [ ] Item "Pacientes de hoy" visible en sidebar (con icono Stethoscope)
- [ ] Crear cita → cambiar a "En espera" → aparece en la lista
- [ ] Timer de espera se actualiza en tiempo real
- [ ] Click "Iniciar atención" → navega a consulta → estado cambia a "En atención"
- [ ] Click "Ver historial" → modo lectura (sin dictado activo)
- [ ] Toggle "Mostrar finalizadas" → aparecen/desaparecen las completadas

---

## Validación de Fase 1
- [x] Todos los estados de cita funcionan con los nuevos valores
- [x] Transiciones respetan reglas por rol
- [x] Registro rápido de paciente funciona end-to-end dentro del diálogo
- [x] "Pacientes de hoy" muestra datos en tiempo real
- [x] Build sin errores TypeScript (nuevos archivos — errores pre-existentes excluidos)

---

# FASE 2 — Agendas tipo Google Calendar
**RF**: RF-C01.1, RF-C01.2, RF-C01.3, RF-C01.4

---

## [ ] T-2.1 — Modelo de datos y servicio de agendas
**Estimación**: 5–6 horas | **Depende de**: ninguna

**Tareas**:

1. **Crear** `src/features/schedule/types/agenda.ts`:
   ```typescript
   export interface Agenda {
     id: string
     name: string
     doctorId: string
     doctorName: string
     location: string
     defaultDuration: number  // minutos
     schedule: Record<string, { start: string; end: string; enabled: boolean }>
     bufferMinutes: number
     enabled: boolean
     color: string  // hex
     createdAt: Date
     updatedAt: Date
   }

   export interface ScheduleBlock {
     id: string
     agendaId: string
     type: 'date-range' | 'day' | 'hours' | 'recurring'
     startDate?: Date
     endDate?: Date
     dayOfWeek?: number
     startTime?: string
     endTime?: string
     reason: string
     recurrence?: 'weekly' | 'monthly' | 'none'
     createdBy: string
     createdAt: Date
   }
   ```

2. **Crear** `src/features/schedule/services/agendaService.ts`:
   - CRUD completo para `organizations/{orgId}/agendas`
   - `createAgenda()`, `getAgendasByDoctor()`, `getAllAgendas()`, `updateAgenda()`, `toggleAgendaEnabled()`
   - `validateNoOverlap(newSchedule, existingAgendas, doctorId)` — detectar traslapes entre agendas del mismo médico

3. **Crear** `src/features/schedule/services/blockService.ts`:
   - CRUD para `organizations/{orgId}/agendas/{agendaId}/blocks`
   - `createBlock()`, `getBlocksForRange()`, `isSlotBlocked()`, `deleteBlock()`
   - Detección de conflictos con citas existentes

4. **Modificar** `src/features/schedule/services/appointmentService.ts`:
   - Agregar `agendaId?: string` al type `AppointmentData`
   - Agregar soporte para filtrar por `agendaId[]` y múltiples `doctorId[]`

**Verificación**:
- [ ] Crear agenda en Firestore → leer correctamente
- [ ] Validación anti-traslape detecta conflictos entre agendas del mismo médico
- [ ] Crear bloqueo → verificar que `isSlotBlocked()` retorna true

---

## [ ] T-2.2 — UI de filtros y gestión de agendas
**Estimación**: 6–8 horas | **Depende de**: T-2.1

**Tareas**:

1. **Crear** `src/features/schedule/components/AgendaFilters.tsx`:
   - Dropdown multi-select de médicos (para secretaria)
   - Checkboxes por agenda con color dot, nombre, ubicación
   - Botón "Todas" / "Ninguna"
   - Indicador de habilitada/deshabilitada
   - Callback `onFilterChange({ doctorIds, agendaIds })`

2. **Crear** `src/features/schedule/components/AgendaFormDialog.tsx`:
   - Crear/editar agenda: nombre, médico, ubicación, duración default, buffer
   - Horario recurrente: por cada día, toggle + hora inicio/fin
   - Validación anti-traslape al guardar
   - Toggle habilitar/deshabilitar

3. **Modificar** `src/features/schedule/pages/AgendaPage.tsx`:
   - Integrar `AgendaFilters` en barra superior o lateral
   - Botón "⚙ Gestionar agendas" → `AgendaFormDialog`
   - Pasar filtros seleccionados a las vistas
   - Colorear citas según agenda

4. **Modificar** `src/features/schedule/components/AppointmentDialog.tsx`:
   - Agregar selector de agenda al crear cita
   - Usar duración default de la agenda seleccionada

**Verificación**:
- [ ] Crear agenda → aparece en filtros
- [ ] Filtrar por agenda → solo citas de esa agenda visibles
- [ ] Deshabilitar agenda → no permite nuevas citas
- [ ] Crear cita con agenda seleccionada → `agendaId` guardado en Firestore
- [ ] Crear agenda con traslape → error de validación

---

## [ ] T-2.3 — Bloqueos de horario
**Estimación**: 4–5 horas | **Depende de**: T-2.1

**Tareas**:

1. **Crear** `src/features/schedule/components/BlockScheduleDialog.tsx`:
   - Tipo de bloqueo (rango, día, horas, recurrente)
   - Selección de rango/horario
   - Razón del bloqueo
   - Detección de conflictos con citas existentes

2. **Modificar** vistas Day/Week en `AgendaPage.tsx`:
   - Renderizar bloques como overlay con patrón rayado rojo/gris
   - Impedir click en slots bloqueados

3. **Modificar** `AppointmentDialog.tsx`:
   - Validar que el horario NO esté bloqueado antes de guardar

**Verificación**:
- [ ] Crear bloqueo → aparece visualmente en la agenda
- [ ] Intentar crear cita en slot bloqueado → error
- [ ] Bloqueo recurrente se aplica correctamente semanalmente

---

## [ ] T-2.4 — Reasignación de citas (drag-and-drop)
**Estimación**: 6–8 horas | **Depende de**: T-2.2

**Tareas**:

1. **Instalar** `@dnd-kit/core @dnd-kit/sortable` (`npm install @dnd-kit/core @dnd-kit/sortable`)
2. **Crear** `src/features/schedule/components/RescheduleDialog.tsx`: selector de nueva fecha/hora/agenda/médico
3. **Modificar** DayView y WeekView en `AgendaPage.tsx`: drag-and-drop de citas entre slots
4. **Agregar** `rescheduleAppointment()` en `appointmentService.ts`

**Verificación**:
- [ ] Arrastrar cita a otro slot → diálogo de confirmación
- [ ] Confirmar reasignación → cita actualizada en Firestore
- [ ] Arrastrar a slot bloqueado → error

---

## Validación de Fase 2
- [ ] Multi-agenda funcional con filtros
- [ ] CRUD de agendas con anti-traslape
- [ ] Bloqueos correctos
- [ ] Drag-and-drop funcional
- [ ] Build sin errores TypeScript

---

# FASE 3 — Consulta médica core (notas, IA, voz)
**RF**: RF-M03, RF-M04, RF-M05, RF-M06, RF-M07

---

## [ ] T-3.1 — Voz + texto simultáneo
**Estimación**: 3–4 horas | **Depende de**: ninguna

**Tareas**:

1. **Modificar** `src/features/consultation/components/ChatPanel.tsx`:
   - Remover `disabled` del input cuando `isRecording=true`
   - Reposicionar animación de voz: badge compacto encima del input (no sobre él), estilo ChatGPT voice:
     - Indicador circular pequeño con pulso
     - Texto "Escuchando..." junto al indicador
   - Al enviar: `const combined = [voiceTranscript, inputText].filter(Boolean).join('\n')`

2. **Modificar** `src/features/consultation/pages/MedicalNotesCopilotPage.tsx`:
   - `onSendMessage`: usar transcript combinado
   - Limpiar `voiceTranscript` después de enviar

**Verificación**:
- [ ] Activar micrófono → input de texto sigue editable
- [ ] Dictar algo + escribir algo → enviar → ambos se procesan por la IA
- [ ] Animación de voz NO tapa el input

---

## [ ] T-3.2 — Extracción de antecedentes médicos
**Estimación**: 4–5 horas | **Depende de**: ninguna

**Tareas**:

1. **Modificar** `src/features/consultation/types/medical-notes.ts`:
   - `FHIRPlanItem.type` — agregar: `'familyHistory' | 'personalHistory'`
   - `FHIRPlanItem` — agregar: `relationship?: string`

2. **Modificar** `src/services/fhirPrompts.ts`:
   - Agregar sección al prompt después de CONDITIONS:
     ```
     ### ANTECEDENTES FAMILIARES (familyHistory)
     Extraer antecedentes familiares con relación.
     { "type": "familyHistory", "display": "Diabetes tipo 2", "relationship": "padre" }

     ### ANTECEDENTES PERSONALES (personalHistory)
     { "type": "personalHistory", "display": "Apendicectomía", "date": "2015" }
     ```

3. **Modificar** `src/services/aiService.ts` `parseFHIRResponse()`: manejar `familyHistory` y `personalHistory`, campo `relationship`

4. **Modificar** `src/features/consultation/components/ClinicalSnapshot.tsx`:
   - Nueva sección colapsable "Antecedentes" después de Diagnósticos
   - Sub-secciones: "Personales" (icono usuario) y "Familiares" (icono familia)
   - Familiares: mostrar `display (relationship)`

**Verificación**:
- [ ] Dictar: "El padre tiene diabetes y la madre hipertensión" → sección Antecedentes Familiares muestra ambos
- [ ] Dictar: "Fue operado de apendicitis en 2015" → Antecedentes Personales
- [ ] Sección colapsa/expande correctamente

---

## [ ] T-3.3 — Identificación del médico hablante (configurable)
**Estimación**: 8–10 horas | **Depende de**: ninguna

> [!IMPORTANT]
> **Configurable a nivel de sistema: desactivado por defecto.** Cuando se activa, detecta cuándo habla el médico. Todo lo que no sea el médico se trata como input del paciente. No es diarización completa — solo verificación "¿es el médico?" (speaker verification 1:1).

### Proveedor recomendado: Deepgram Nova-3 Medical

| Criterio | Valor |
|---|---|
| Precisión médica | WER 3.45% |
| Latencia | ~300ms |
| Conexión | WebSocket directo (sin Firebase Function) |
| Costo | ~$0.01/min (~$85/mes) |

**Tareas**:

1. **Crear** `src/services/speechConfigService.ts`:
   - CRUD para `organizations/{orgId}/settings/speechConfig`
   - Tipo:
     ```typescript
     interface SpeechConfig {
       enabled: boolean  // default false
       provider: 'deepgram' | 'assemblyai'
       apiKey: string
       doctorSpeakerTag?: string  // tag calibrado del médico
       calibratedAt?: Date
     }
     ```

2. **Crear** `src/features/consultation/services/speechService.ts`:
   - Interfaz:
     ```typescript
     interface SpeechSegment {
       text: string
       isDoctor: boolean  // true = médico, false = otro (paciente)
       timestamp: number
     }
     ```
   - Implementación Deepgram: WebSocket a `wss://api.deepgram.com/v1/listen?diarize=true&model=nova-3-medical&language=es`
   - Calibración: recibe audio del doctor → guarda su `speakerTag`
   - En uso: compara `speakerTag` de cada segmento con el tag calibrado → retorna `isDoctor`

3. **Crear** `src/features/consultation/hooks/useSpeakerDiarization.ts`:
   - Lee config de speech desde Firestore
   - Si `enabled=false`: retorna `{ enabled: false }` (no hace nada)
   - Si `enabled=true`:
     - Captura audio con `MediaRecorder` (chunks cada 250ms)
     - Envía al WebSocket, recibe transcripción con `speakerTag`
     - Compara con perfil calibrado del doctor → `isDoctor: true/false`
   - Estado: `{ enabled, isListening, segments, doctorCalibrated }`
   - Calibración: popup "Diga una frase para registrar su voz" → guarda tag en Firestore

4. **Modificar** `src/features/consultation/pages/MedicalNotesCopilotPage.tsx`:
   - Seleccionar hook según config:
     ```typescript
     const diarization = useSpeakerDiarization()
     const webSpeech = useWebSpeechRecognition()
     const speechHook = diarization.enabled ? diarization : webSpeech
     ```
   - Cuando `isDoctor=true`: procesar como nota médica / comando
   - Cuando `isDoctor=false`: registrar como input del paciente (síntomas, quejas)

5. **Modificar** `src/features/consultation/components/ChatPanel.tsx`:
   - Si función activa: badge "👨‍⚕️ Médico" en segmentos del doctor
   - Sin badge especial en segmentos no-médico (se marcan implícitamente como paciente)
   - Si función desactivada: comportamiento actual sin badges

6. **Modificar** `src/services/fhirPrompts.ts`:
   - Si `isDoctor=true`: comportamiento normal (comandos, prescripciones, órdenes)
   - Si `isDoctor=false`: solo registrar síntomas/quejas, no ejecutar comandos

7. **Modificar** `src/features/settings/pages/SettingsPage.tsx`:
   - Sección "🎙 Identificación de voz del médico":
     - Toggle "Activar" (default OFF)
     - Selector de proveedor: Deepgram (recomendado) / AssemblyAI
     - Input de API key
     - Botón "Calibrar mi voz"
     - Estado: "Desactivado" / "Activo" / "Requiere calibración"

**Verificación**:
- [ ] Con función **desactivada**: todo funciona exactamente igual que antes (Web Speech API)
- [ ] Activar en Settings → guardar → verificar en Firestore
- [ ] Calibración: doctor dice frase → `doctorSpeakerTag` guardado
- [ ] En consulta: cuando habla el doctor → badge "👨‍⚕️ Médico" visible
- [ ] Cuando habla otra persona → sin badge, se registra como paciente
- [ ] Prescripción dictada por el doctor → se procesa
- [ ] Desactivar → vuelve a Web Speech API sin badges

---

## [ ] T-3.4 — Motor de sugerencias clínicas mejorado
**Estimación**: 3–4 horas | **Depende de**: ninguna

**Tareas**:
1. **Modificar** `src/services/fhirPrompts.ts`:
   - Instrucción dual: sugerencia específica por medicamento/examen + sugerencia general si hay diagnóstico/antecedentes
2. **Modificar** `ClinicalSnapshot.tsx`:
   - Diferenciar sugerencias específicas (badge azul) vs generales (badge verde)

**Verificación**:
- [ ] Dictar: "Prescribir amoxicilina por faringitis" → sugerencia del medicamento + sugerencia del diagnóstico

---

## [ ] T-3.5 — Toggle de aprobación en medicamentos y órdenes
**Estimación**: 3 horas | **Depende de**: ninguna

**Tareas**:
1. **Modificar** `medical-notes.ts` — agregar `approved?: boolean` (default `true`)
2. **Modificar** `aiService.ts` — setear `approved: true` al crear items
3. **Modificar** `IPSItemRow` en `ClinicalSnapshot.tsx`:
   - Checkbox/switch de aprobación
   - Desaprobados: opacity-50 + line-through
   - Tooltip: "Solo los medicamentos y órdenes aprobados se enviarán al paciente"

**Verificación**:
- [ ] Medicamento creado → aprobado por defecto (checkbox marcado)
- [ ] Desaprobar → visual tachado/opaco
- [ ] Re-aprobar → visual normal
- [ ] Tooltip visible al hover

---

## Validación de Fase 3
- [ ] Voz + texto simultáneo funcional
- [ ] Antecedentes se extraen y muestran correctamente
- [ ] Speaker diarization configurable: funciona desactivado (gratuito) y activado (Deepgram)
- [ ] Sugerencias clínicas duales funcionan
- [ ] Toggle de aprobación funcional
- [ ] Build sin errores TypeScript

---

# FASE 4 — Comandos de voz y modales
**RF**: RF-M11, RF-M12, RF-M13, RF-M14, RF-M17

---

## [ ] T-4.1 — Sistema de detección de comandos de voz
**Estimación**: 4–5 horas | **Depende de**: ninguna

**Tareas**:

1. **Crear** `src/features/consultation/utils/voiceCommands.ts`:
   ```typescript
   interface VoiceCommand {
     patterns: RegExp[]
     action: 'open-prescription' | 'close-modal' | 'open-lab' | 'close-lab' |
             'open-referral' | 'close-referral'
   }

   const COMMANDS: VoiceCommand[] = [
     { patterns: [/redactar?\s*receta/i, /crear?\s*receta/i, /crear?\s*prescripci[oó]n/i], action: 'open-prescription' },
     { patterns: [/finalizar/i, /terminar/i, /cerrar/i, /entregar/i, /aprobar/i], action: 'close-modal' },
     { patterns: [/solicitud\s*de\s*an[aá]lisis/i, /[oó]rdenes?\s*de\s*laboratorio/i], action: 'open-lab' },
     { patterns: [/crear?\s*referencia/i, /generar?\s*referencia/i, /redactar?\s*referencia/i], action: 'open-referral' },
   ]

   export function detectVoiceCommand(text: string): string | null
   ```

2. **Modificar** `src/features/consultation/pages/MedicalNotesCopilotPage.tsx`:
   - Antes de enviar al AI: `const cmd = detectVoiceCommand(transcript)`
   - Si es comando: ejecutar acción (abrir/cerrar modal)
   - Estado: `activeModal: 'prescription' | 'lab' | 'referral' | null`

**Verificación**:
- [ ] "Crear receta" → se detecta como `open-prescription`
- [ ] "Terminar" → `close-modal`
- [ ] Texto médico normal → `null` (no se confunde con comando)

---

## [ ] T-4.2 — Modal de Receta con talonario
**Estimación**: 6–8 horas | **Depende de**: T-3.5, T-4.1

**Tareas**:

1. **Crear** `src/features/consultation/components/PrescriptionModal.tsx`:
   - Modal grande/pantalla completa
   - Lista de medicamentos aprobados en formato talonario (cada uno en tarjeta)
   - Tarjeta: nombre, dosis, frecuencia, duración, indicaciones, botón eliminar/editar
   - Input de voz/texto activo dentro del modal para agregar/modificar
   - Panel lateral de sugerencias (`ModalSuggestionsPanel`)
   - Modos: edición y solo lectura
   - Cierre por botón o voz: "finalizar", "cerrar", "entregar receta"

2. **Crear** `src/features/consultation/components/ModalSuggestionsPanel.tsx`:
   - Contexto: `'prescription' | 'lab'`
   - Filtra sugerencias del clinical state por tipo
   - Muestra contraindicaciones/alertas

3. **Eliminar** `PrescriptionDraft.tsx`

**Verificación**:
- [ ] Comando "Crear receta" → modal abre con medicamentos aprobados
- [ ] Agregar medicamento por voz → aparece en lista
- [ ] Eliminar medicamento → se elimina
- [ ] Panel de sugerencias muestra contraindicaciones
- [ ] "Finalizar" → modal cierra

---

## [ ] T-4.3 — Modal de Laboratorio
**Estimación**: 5–6 horas | **Depende de**: T-4.1

**Tareas**:
1. **Crear** `src/features/consultation/components/LabOrderModal.tsx`:
   - Exámenes agrupados por área (Hematología, Química clínica, etc.)
   - Checkbox por examen
   - Input de voz/texto
   - Panel de sugerencias
   - Cierre por voz

**Verificación**:
- [ ] "Órdenes de laboratorio" → modal abre
- [ ] Seleccionar exámenes → check viable
- [ ] Agregar examen por voz → aparece

---

## [ ] T-4.4 — Modal de Referencia
**Estimación**: 4–5 horas | **Depende de**: T-4.1

**Tareas**:
1. **Crear** `src/features/consultation/components/ReferralModal.tsx`:
   - Campos: especialidad destino, diagnósticos, motivo, resumen clínico
   - Auto-relleno desde clinical state
   - Editable por voz y texto
2. **Modificar** `ClinicalSnapshot.tsx`: sección "Referencias" en el resumen

**Verificación**:
- [ ] "Crear referencia" → modal abre con datos precargados
- [ ] Editar por voz → campos actualizados
- [ ] Referencia guardada aparece en sección "Referencias" del resumen

---

## Validación de Fase 4
- [ ] Todos los comandos de voz detectados correctamente
- [ ] Modales de Receta, Laboratorio y Referencia funcionales
- [ ] Panel de sugerencias contextualizado en cada modal
- [ ] Build sin errores TypeScript

---

# FASE 5 — PDFs, envíos y verificación QR
**RF**: RF-M08, RF-M09, RF-M20, RF-M10, RF-M23, RF-M25, RF-M28

---

## [ ] T-5.1 — Configuración de plantillas
**Estimación**: 4–5 horas | **Depende de**: ninguna

**Tareas**:
1. **Crear** `src/services/templateConfigService.ts`: CRUD Firestore `organizations/{orgId}/settings/templates`
2. **Crear** `src/features/settings/components/TemplateConfigSection.tsx`:
   - Upload de logo (Firebase Storage), datos médico, sello, prompts
3. **Integrar** en `SettingsPage.tsx`

**Verificación**:
- [ ] Configurar logo, datos, sello → guardado en Firestore
- [ ] Preview del header del PDF muestra logo correctamente

---

## [ ] T-5.2 — Generación de PDFs
**Estimación**: 8–10 horas | **Depende de**: T-3.5, T-5.1

**Tareas**:
1. **Instalar** `jspdf html2canvas qrcode`
2. **Crear** `src/services/templateEngine.ts`: motor unificado para los 3 tipos de PDF
3. **Crear** `src/services/pdfService.ts`: `generatePrescriptionPDF()`, `generateLabOrderPDF()`, `generateReferralPDF()`
4. **Crear** templates en `src/services/templates/`:
   - `prescriptionTemplate.ts`: receta profesional (logo, tabla medicamentos, sello, QR)
   - `labOrderTemplate.ts`: orden de laboratorio (checklist, datos paciente, QR)
   - `referralTemplate.ts`: referencia médica (formato carta, QR)
5. **Crear** `src/features/consultation/components/PDFPreviewDialog.tsx`: preview + descargar + enviar
6. **Modificar** `MedicalNotesCopilotPage.tsx` `finalizeConsultation()`: generar PDF con items aprobados

**Verificación**:
- [ ] Finalizar consulta con medicamentos → PDF generado con datos correctos
- [ ] PDF incluye logo, datos médico, sello, QR
- [ ] Solo items aprobados aparecen en el PDF
- [ ] PDF descargable

---

## [ ] T-5.3 — QR de verificación
**Estimación**: 4–5 horas | **Depende de**: T-5.2

**Tareas**:
1. **Crear** `src/services/documentVerificationService.ts`: CRUD `organizations/{orgId}/documents`
2. **Crear** `src/features/verify/pages/VerifyDocumentPage.tsx`: página pública de verificación
3. **Agregar ruta** `/verify/:id` en `App.tsx`
4. **Modificar** `pdfService.ts`: crear documento en Firestore, generar QR con URL, insertarlo en PDF

**Verificación**:
- [ ] Generar PDF → tiene QR visible
- [ ] Escanear QR → abre página con datos del documento
- [ ] Datos mostrados coinciden con el documento original

---

## [ ] T-5.4 — Configuración e implementación de Firebase Functions
**Estimación**: 6–8 horas | **Depende de**: ninguna (pero necesario para T-5.5)

**Tareas**:

1. **Inicializar proyecto Functions**:
   ```bash
   cd functions && firebase init functions
   # TypeScript, ESLint
   ```

2. **Configurar secrets**:
   ```bash
   firebase functions:secrets:set EMAIL_DEFAULT_PASSWORD
   ```

3. **Implementar** `functions/src/sendEmail.ts`:
   - Callable function
   - Nodemailer con soporte dinámico: Gmail (OAuth2), M365 (SMTP), SES (AWS SDK)
   - Recibe: `{ to, subject, htmlBody, attachmentBase64, attachmentName, organizationId }`
   - Lee credenciales de `organizations/{orgId}/settings/notifications`
   - Logging a `organizations/{orgId}/notificationLogs`

4. **Implementar** `functions/src/sendWhatsApp.ts`:
   - Callable function
   - Envía request HTTP POST a n8n webhook URL configurado
   - Payload: `{ to, message, mediaUrl, templateId, variables }`
   - Lee config de `organizations/{orgId}/settings/notifications`
   - Logging completo
   - Manejo de errores y retry

5. **(Opcional)** `functions/src/speechToText.ts`:
   - Solo necesario si se elige **Google Cloud** como proveedor de diarization (no aplica para Deepgram/AssemblyAI que conectan directamente vía WebSocket)
   - Callable function, Google Cloud STT v2 con diarization

6. **Configurar** `firebase.json` y desplegar

**Verificación**:
- [ ] `firebase deploy --only functions` exitoso
- [ ] Test: llamar `sendEmail` desde el emulador → email recibido
- [ ] Test: llamar `sendWhatsApp` → request enviado a n8n webhook (puede fallar si n8n no está configurado, pero la request se hace correctamente)

---

## [ ] T-5.5 — Servicio de notificaciones (correo + WhatsApp n8n)
**Estimación**: 6–8 horas | **Depende de**: T-5.4

**Tareas**:

1. **Crear** `src/services/notificationService.ts`:
   ```typescript
   export interface NotificationResult {
     success: boolean
     channel: 'email' | 'whatsapp'
     error?: string
     logId?: string
   }
   export async function sendNotification(
     channel: 'email' | 'whatsapp',
     to: string, subject: string, body: string,
     attachments?: { blob: Blob; name: string }[],
     organizationId: string
   ): Promise<NotificationResult>
   ```

2. **Crear** `src/services/emailService.ts`:
   - Wrapper que llame a Firebase Function `sendEmail`
   - Generar cuerpo de email usando prompt configurado + AI
   - Soporte de attachments (PDF como base64)

3. **Crear** `src/services/whatsappService.ts`:
   - Wrapper que llame a Firebase Function `sendWhatsApp`
   - Generar mensaje usando prompt configurado + AI
   - Formato: mensaje + URL del PDF guardado en Storage
   - **Implementación completa** incluyendo:
     - Envío de mensaje de texto
     - Envío de media (PDF)
     - Uso de templates parametrizados
     - Error handling y retry logic

4. **Crear** `src/services/notificationLogService.ts`:
   - CRUD para `organizations/{orgId}/notificationLogs`
   - Registrar cada envío con: canal, destinatario, resultado, timestamp

5. **Crear** `src/features/settings/components/NotificationConfigSection.tsx`:
   - Email: provider, credenciales, prompt de email
   - WhatsApp: webhook URL n8n, API key, prompt de mensaje, templates
   - Test de conexión para ambos canales

6. **Integrar** en `SettingsPage.tsx` y `PDFPreviewDialog.tsx`

**Verificación**:
- [ ] Enviar PDF por correo → email recibido con adjunto
- [ ] Enviar por WhatsApp → request correcto a n8n (log guardado en Firestore)
- [ ] Logs de envío visibles en Firestore
- [ ] Config de email → test de conexión exitoso
- [ ] Config WhatsApp → test muestra request que se enviaría

---

## Validación de Fase 5
- [ ] PDFs generados correctamente para receta, lab, referencia
- [ ] QR funcional en todos los PDFs
- [ ] Envío por correo funcional
- [ ] Envío por WhatsApp implementado completamente (con llamadas a n8n)
- [ ] Firebase Functions desplegadas y funcionales
- [ ] Settings de plantillas y notificaciones guardados

---

# FASE 6 — Notificaciones de citas
**RF**: RF-N01, RF-N02, RF-N03, RF-N04

---

## [ ] T-6.1 — Notificación al crear cita
**Estimación**: 5–6 horas | **Depende de**: T-5.4, T-5.5

**Tareas**:
1. **Implementar** Firebase Function trigger `onAppointmentCreated`:
   - Trigger en `organizations/{orgId}/appointments` on create
   - Enviar correo + WhatsApp (si configurado) con datos de la cita
   - Incluir enlaces con token: `?token=X&action=confirm` y `?token=X&action=cancel`
   - Generar token seguro (JWT o hash)
   - Guardar log de notificación

**Verificación**:
- [ ] Crear cita → correo recibido con datos y enlaces

---

## [ ] T-6.2 — Recordatorios programados
**Estimación**: 4–5 horas | **Depende de**: T-6.1

**Tareas**:
1. **Implementar** Firebase Scheduled Function `sendAppointmentReminders`:
   - Ejecutar cada 15 min
   - Buscar citas próximas según config (`appointmentReminderMinutes`)
   - No enviar si ya se envió (campo `reminderSentAt`)
   - Enviar por correo + WhatsApp

**Verificación**:
- [ ] Cita programada para dentro de 1 hora → recordatorio enviado

---

## [ ] T-6.3 — Confirmar/Cancelar desde mensaje
**Estimación**: 4–5 horas | **Depende de**: T-6.1

**Tareas**:
1. **Crear** Firebase Function HTTP `handleAppointmentAction`:
   - Valida token → confirma o cancela cita → redirige a página de resultado
2. **Crear** `src/features/appointments/pages/AppointmentActionPage.tsx`:
   - Página pública con resultado de la acción
3. **Agregar ruta** en `App.tsx`

**Verificación**:
- [ ] Click "Confirmar" en correo → cita confirmada, página muestra éxito
- [ ] Click "Cancelar" → cita cancelada
- [ ] Token inválido → error

---

## Validación de Fase 6
- [ ] Notificación automática al crear cita
- [ ] Recordatorios programados funcionales
- [ ] Confirmar/Cancelar desde email funcional

---

# FASE 7 — Dashboard operativo
**RF**: RF-M29

---

## [ ] T-7.1 — Dashboard con datos reales
**Estimación**: 5–6 horas | **Depende de**: Fases 1–6

**Tareas**:

1. **Modificar** `src/features/dashboard/hooks/useDashboardData.ts`:
   - Queries Firestore: citas de hoy por estado, documentos generados, próximas citas, alertas

2. **Modificar** `src/features/dashboard/pages/DoctorDashboard.tsx`:
   - **Médico**: KPIs (atendidos, pendientes, en curso, finalizadas, docs generados), próximas citas con "Iniciar atención", alertas
   - **Secretaria**: KPIs (programadas, confirmadas, canceladas, en espera), mini agenda, acciones rápidas

**Verificación**:
- [ ] Indicadores reflejan datos reales de Firestore
- [ ] Vista diferenciada por rol
- [ ] Datos se actualizan al modificar citas

---

## Validación de Fase 7
- [ ] Dashboard funcional para ambos roles
- [ ] Datos en tiempo real

---

# Resumen de fases y estimaciones

| Fase | Descripción | Tareas | Estimación |
|---|---|---|---|
| Fase 1 | Citas y flujo secretaria/asistente | T-1.0 a T-1.4 | 3–4 días |
| Fase 2 | Agendas tipo Google Calendar | T-2.1 a T-2.4 | 4–5 días |
| Fase 3 | Consulta médica core | T-3.1 a T-3.5 | 4–5 días |
| Fase 4 | Comandos de voz y modales | T-4.1 a T-4.4 | 3–4 días |
| Fase 5 | PDFs, envíos y Firebase Functions | T-5.1 a T-5.5 | 5–6 días |
| Fase 6 | Notificaciones de citas | T-6.1 a T-6.3 | 2–3 días |
| Fase 7 | Dashboard operativo | T-7.1 | 1–2 días |
| **Total** | | **22 tareas** | **22–29 días (~5–6 semanas)** |

## Archivos nuevos totales: 37
## Archivos a modificar: 17+
## Firebase Functions: 6

> [!TIP]
> Cada fase debe ser validada antes de iniciar la siguiente. Use el checklist de tracking `[ ]` / `[/]` / `[x]` para registrar el progreso de cada tarea y cada fase.
