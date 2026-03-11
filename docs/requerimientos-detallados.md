# Especificación Detallada de Requerimientos — Sistema Altia

> **Stack**: Vite + React + TypeScript + TailwindCSS + Firebase/Firestore + Firebase Functions  
> **Estructura actual**: `src/features/{auth, consultation, dashboard, patients, schedule, settings}`  
> **Persistencia**: Firestore — colección `organizations/{orgId}/...`  
> **Sistema NO está en producción** — no se requiere migración de datos

---

## Estados de cita (definición)

El sistema usará exclusivamente estos estados:

| Código | Label | Color sugerido |
|---|---|---|
| `scheduled` | Programada | azul |
| `waiting` | En espera | ámbar |
| `in-progress` | En atención | verde |
| `completed` | Finalizada | gris/clinical |
| `cancelled` | Cancelada | rojo |

> Los estados anteriores (`pending`, `booked`, `arrived`, `fulfilled`, `no-show`) se eliminan del código.

---

# A) Citas y flujo de secretaria/asistente

## RF-A01 — Búsqueda de paciente en diálogo de cita (mantener)

### Objetivo
Mantener el flujo actual del `AppointmentDialog`: buscar paciente por nombre antes de asignar cita.

### Estado actual del código
- [AppointmentDialog.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/features/schedule/components/AppointmentDialog.tsx) (607 líneas) — contiene `PatientSelector` integrado
- [PatientSelector.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/features/schedule/components/PatientSelector.tsx) — selector de paciente con búsqueda por nombre

### Cambios requeridos
1. **Sin cambios funcionales** en la búsqueda existente.
2. **Preparar extensión**: cuando la búsqueda no devuelva resultados, mostrar botón "Registrar nuevo paciente" que active RF-A02.

### Archivos afectados
| Archivo | Acción |
|---|---|
| `PatientSelector.tsx` | MODIFICAR — agregar callback `onNoResults` |
| `AppointmentDialog.tsx` | MODIFICAR — manejar "no hay resultados" para mostrar formulario RF-A02 |

---

## RF-A02 — Registro rápido de paciente dentro del mismo diálogo

### Objetivo
Si el paciente no existe, registrarlo sin salir del `AppointmentDialog` y continuar con la creación de la cita.

### Estado actual del código
- [patientService.ts](file:///Users/ronyartavia/repo/GP/Alta/src/features/patients/services/patientService.ts):
  - `findOrCreatePatient()` (línea 209–237)
  - `findPatientByCedula()` (línea 189–207)
  - `createOrUpdatePatient()` (línea 111–171)

### Campos
- **Nombre** (obligatorio)
- **Identificación/Cédula** (obligatorio) — validar que no exista
- **Teléfono** (obligatorio)
- **Correo** (opcional)
- **Motivo de consulta** (opcional)

### Cambios requeridos
1. **Crear** `schedule/components/QuickPatientForm.tsx` — formulario inline con validación de duplicados
2. **Integrar** en `AppointmentDialog.tsx` — alternar entre búsqueda y registro rápido

### Archivos afectados
| Archivo | Acción |
|---|---|
| `schedule/components/QuickPatientForm.tsx` | **NUEVO** |
| `schedule/components/AppointmentDialog.tsx` | MODIFICAR |

---

## RF-A04 — Diálogo "Opciones de Cita" con cambio de estado

### Objetivo
Mantener cancelación actual y agregar "cambio de estado" con reglas estrictas por rol.

### Estado actual del código
- [AppointmentOptionsDialog.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/features/schedule/components/AppointmentOptionsDialog.tsx) (286 líneas):
  - `handleCancel()` (línea 73–97)
  - `handleStartConsultation()` (línea 64–71)
  - `getStatusBadge()` (línea 99–116)
  - **NO tiene**: cambio de estado genérico, validación de transiciones por rol

### Transiciones permitidas
**Secretaria**: `scheduled ↔ waiting`, `scheduled → cancelled`, `waiting → cancelled`  
**Médico**: `waiting → in-progress`, `in-progress → completed`

### Auditoría
Campos: `waitingAt`, `inProgressAt`, `completedAt`, `cancelledAt`, `updatedBy`, `updatedRole`

### Cambios requeridos
1. **Reemplazar** el tipo `status` en `appointmentService.ts` — usar solo los 5 nuevos estados
2. **Crear** `schedule/utils/appointmentTransitions.ts` — reglas de transición por rol
3. **Crear** `changeAppointmentStatus()` en `appointmentService.ts` con validación + auditoría
4. **Modificar** `AppointmentOptionsDialog.tsx` — agregar sección "Cambiar estado"
5. **Actualizar** `STATUS_LABELS` en `AgendaPage.tsx`

### Archivos afectados
| Archivo | Acción |
|---|---|
| `schedule/utils/appointmentTransitions.ts` | **NUEVO** |
| `schedule/components/AppointmentOptionsDialog.tsx` | MODIFICAR |
| `schedule/services/appointmentService.ts` | MODIFICAR |
| `schedule/pages/AgendaPage.tsx` | MODIFICAR |

---

## RF-A05 — "Pacientes de hoy" (nuevo menú)

### Objetivo
Nueva opción de menú "Pacientes de hoy" debajo de Dashboard para el médico. Muestra pacientes del día con estado `waiting` / `in-progress`, con toggle para `completed`.

### Estado actual del código
- [DashboardLayout.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/components/layouts/DashboardLayout.tsx) — `getNavigationItems()` (línea 37–45) define items del sidebar
- [App.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/App.tsx) — rutas

### Datos por fila
Hora cita, Paciente (nombre, cédula), Estado (badge), Tiempo en espera (live timer), Motivo

### Acciones por paciente
1. **"Iniciar atención"**: estado `waiting → in-progress`, navegar a consulta
2. **"Consultar historial"**: navegar a consulta en modo lectura, sin cambiar estado
3. Dentro de historial: botón "Iniciar atención" que cambie estado

### Cambios requeridos
1. **Crear** `schedule/pages/TodayPatientsPage.tsx`
2. **Crear** `schedule/hooks/useTodayPatients.ts`
3. **Agregar ruta** en `App.tsx`
4. **Agregar item de menú** en `DashboardLayout.tsx`
5. **Modificar** `MedicalNotesCopilotPage.tsx` — aceptar query params `patientId`, `appointmentId`, `mode`

### Archivos afectados
| Archivo | Acción |
|---|---|
| `schedule/pages/TodayPatientsPage.tsx` | **NUEVO** |
| `schedule/hooks/useTodayPatients.ts` | **NUEVO** |
| `components/layouts/DashboardLayout.tsx` | MODIFICAR |
| `App.tsx` | MODIFICAR |
| `consultation/pages/MedicalNotesCopilotPage.tsx` | MODIFICAR |

---

# C) Agendas tipo Google Calendar

## RF-C01.1 — Selección de médico + filtros por múltiples agendas

### Objetivo
Multi-select de médicos + filtros por agendas en la página de Agenda actual.

### Estado actual del código
- [AgendaPage.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/features/schedule/pages/AgendaPage.tsx) (1336 líneas) — usa `doctorId` fijo, no tiene concepto de agendas múltiples
- [appointmentService.ts](file:///Users/ronyartavia/repo/GP/Alta/src/features/schedule/services/appointmentService.ts) — filtra solo por un `doctorId`

### Cambios requeridos
1. **Crear** colección Firestore `organizations/{orgId}/agendas`
2. **Crear** `schedule/types/agenda.ts` y `schedule/services/agendaService.ts`
3. **Crear** `schedule/components/AgendaFilters.tsx` — multi-select médicos + checkboxes agendas
4. **Modificar** `AgendaPage.tsx` — integrar filtros
5. **Modificar** `appointmentService.ts` — agregar `agendaId`, soporte multi-doctor

### Archivos afectados
| Archivo | Acción |
|---|---|
| `schedule/services/agendaService.ts` | **NUEVO** |
| `schedule/types/agenda.ts` | **NUEVO** |
| `schedule/components/AgendaFilters.tsx` | **NUEVO** |
| `schedule/pages/AgendaPage.tsx` | MODIFICAR |
| `schedule/services/appointmentService.ts` | MODIFICAR |
| `schedule/components/AppointmentDialog.tsx` | MODIFICAR |

---

## RF-C01.2 — Crear/editar agenda

### Cambios requeridos
1. **Crear** `schedule/components/AgendaFormDialog.tsx` — formulario completo con validación anti-traslape

| Archivo | Acción |
|---|---|
| `schedule/components/AgendaFormDialog.tsx` | **NUEVO** |
| `schedule/services/agendaService.ts` | MODIFICAR |

---

## RF-C01.3 — Bloqueo de fechas y horas

### Cambios requeridos
1. **Crear** colección Firestore `organizations/{orgId}/agendas/{agendaId}/blocks`
2. **Crear** `schedule/services/blockService.ts`
3. **Crear** `schedule/components/BlockScheduleDialog.tsx`
4. **Modificar** vistas Day/Week para mostrar bloques y validar al crear cita

| Archivo | Acción |
|---|---|
| `schedule/services/blockService.ts` | **NUEVO** |
| `schedule/components/BlockScheduleDialog.tsx` | **NUEVO** |
| `schedule/pages/AgendaPage.tsx` | MODIFICAR |
| `schedule/components/AppointmentDialog.tsx` | MODIFICAR |

---

## RF-C01.4 — Reasignación de citas

### Cambios requeridos
1. **Instalar** librería DnD (`@dnd-kit/core`)
2. **Crear** `schedule/components/RescheduleDialog.tsx`
3. **Modificar** DayView y WeekView para drag-and-drop
4. **Agregar** `rescheduleAppointment()` en `appointmentService.ts`

| Archivo | Acción |
|---|---|
| `schedule/components/RescheduleDialog.tsx` | **NUEVO** |
| `schedule/pages/AgendaPage.tsx` | MODIFICAR |
| `schedule/services/appointmentService.ts` | MODIFICAR |

---

# M) Consulta médica

## RF-M03 — Notas médicas voz + texto simultáneo

### Estado actual
- [ChatPanel.tsx](file:///Users/ronyartavia/repo/GP/Alta/src/features/consultation/components/ChatPanel.tsx) (659 líneas) — input de texto + botón micrófono
- [useWebSpeechRecognition.ts](file:///Users/ronyartavia/repo/GP/Alta/src/features/consultation/hooks/useWebSpeechRecognition.ts) (525 líneas)

### Cambios requeridos
1. **Modificar** `ChatPanel.tsx` — input editable durante grabación, combinar voz+texto al enviar, reposicionar animación (estilo ChatGPT, no sobre el input)
2. **Modificar** `MedicalNotesCopilotPage.tsx` — lógica de combinación

| Archivo | Acción |
|---|---|
| `consultation/components/ChatPanel.tsx` | MODIFICAR |
| `consultation/pages/MedicalNotesCopilotPage.tsx` | MODIFICAR |

---

## RF-M04 — Extracción de antecedentes médicos

### Estado actual
- [fhirPrompts.ts](file:///Users/ronyartavia/repo/GP/Alta/src/services/fhirPrompts.ts) (1198 líneas) — no incluye antecedentes familiares/personales
- `FHIRPlanItem.type` no tiene `familyHistory` ni `personalHistory`

### Cambios requeridos
1. **Modificar** `medical-notes.ts` — agregar tipos `familyHistory`, `personalHistory` + campo `relationship`
2. **Modificar** `fhirPrompts.ts` — sección de extracción de antecedentes
3. **Modificar** `aiService.ts` `parseFHIRResponse()` — manejar nuevos tipos
4. **Modificar** `ClinicalSnapshot.tsx` — sección visual "Antecedentes" con sub-secciones personales y familiares

| Archivo | Acción |
|---|---|
| `consultation/types/medical-notes.ts` | MODIFICAR |
| `services/fhirPrompts.ts` | MODIFICAR |
| `services/aiService.ts` | MODIFICAR |
| `consultation/components/ClinicalSnapshot.tsx` | MODIFICAR |

---

## RF-M05 — Identificación del médico hablante

### Objetivo
Identificar cuándo el médico está hablando, para diferenciar sus indicaciones de lo que dice el paciente. Solo se necesita detectar al médico — todo lo que no sea el médico se trata como input del paciente.

> [!NOTE]
> Alcance simplificado: no es diarización completa de N hablantes ni identificación del paciente. Solo se verifica "¿es el médico quien habla?" (speaker verification 1:1).

### Configuración del sistema
- **Configurable a nivel de sistema** (Settings).
- **Por defecto: DESACTIVADA.** El usuario la activa manualmente.
- Cuando está desactivada: se usa `useWebSpeechRecognition` (Web Speech API gratuita), todo el audio se atribuye al médico.
- Cuando está activada: se usa servicio de speech-to-text con diarization para detectar la voz del doctor.

### Estado actual
- [useWebSpeechRecognition.ts](file:///Users/ronyartavia/repo/GP/Alta/src/features/consultation/hooks/useWebSpeechRecognition.ts) — Web Speech API gratuita, NO soporta identificación de hablante

### Comparativa de proveedores

| Característica | Google Cloud STT v2 | AWS Transcribe Medical | Deepgram Nova-3 Medical | AssemblyAI Universal |
|---|---|---|---|---|
| **Español (es-ES)** | ✅ | ❌ Solo inglés | ✅ (es-ES, es-419) | ✅ (95 idiomas) |
| **Diarization** | ✅ (Preview hasta Oct 2025) | ✅ (solo inglés) | ✅ (53% mejora) | ✅ (2.9% error) |
| **Latencia** | ~650ms | ~500ms | **~300ms** | ~300ms |
| **Modelo médico** | No | ✅ (solo inglés) | ✅ **Nova-3 Medical** (WER 3.45%) | Parcial |
| **Precio c/diarization** | $0.016/min | $0.075/min | **$0.0097/min** | $0.0028/min |
| **Costo mensual*** | $140 | ❌ No viable | **$85** | $25 |
| **Integración** | Firebase Function | Backend AWS | **WebSocket directo** | WebSocket directo |

*\*20 consultas/día × 20 min × 22 días*

> [!IMPORTANT]
> **Recomendación: Deepgram Nova-3 Medical** — mejor precisión médica en español, WebSocket directo, ~$85/mes.  
> **Alternativa económica: AssemblyAI** — ~$25/mes, sin modelo médico dedicado.

### Enfoque técnico

- **Calibración**: al primer uso, el médico lee una frase. El sistema registra el `speakerTag` del médico.
- **En consulta**: el proveedor asigna `speakerTag` a cada segmento de audio. Si coincide con el perfil calibrado → es el médico. Si no → se trata como paciente.
- **Comportamiento**: solo los segmentos del médico disparan comandos operativos (prescripciones, órdenes). Lo demás se registra como síntomas/quejas del paciente.

### Cambios requeridos
1. **Crear** `services/speechConfigService.ts` — CRUD Firestore `settings/speechConfig` (toggle, proveedor, API key, perfil de voz)
2. **Crear** `consultation/services/speechService.ts` — abstracción multi-proveedor (Deepgram/AssemblyAI), WebSocket, calibración
3. **Crear** `consultation/hooks/useSpeakerDiarization.ts` — hook que detecta si el hablante actual es el médico
4. **Modificar** `MedicalNotesCopilotPage.tsx` — seleccionar hook según config (Web Speech API si desactivado, diarization si activado)
5. **Modificar** `ChatPanel.tsx` — badge "👨‍⚕️ Médico" en segmentos del doctor cuando la función está activa
6. **Modificar** `fhirPrompts.ts` — comandos operativos solo si hablante = médico
7. **Agregar config** en `SettingsPage.tsx` — toggle, proveedor, API key, botón calibrar

| Archivo | Acción |
|---|---|
| `services/speechConfigService.ts` | **NUEVO** |
| `consultation/hooks/useSpeakerDiarization.ts` | **NUEVO** |
| `consultation/services/speechService.ts` | **NUEVO** |
| `consultation/pages/MedicalNotesCopilotPage.tsx` | MODIFICAR |
| `consultation/components/ChatPanel.tsx` | MODIFICAR |
| `services/fhirPrompts.ts` | MODIFICAR |
| `settings/pages/SettingsPage.tsx` | MODIFICAR |

---

## RF-M06 — Motor de sugerencias clínicas (extender)

### Cambios requeridos
1. **Modificar** `fhirPrompts.ts` — prompt para generar sugerencia específica por medicamento/examen + sugerencia general si hay diagnóstico/antecedentes
2. **Modificar** `ClinicalSnapshot.tsx` — diferenciar sugerencias específicas vs generales

| Archivo | Acción |
|---|---|
| `services/fhirPrompts.ts` | MODIFICAR |
| `consultation/components/ClinicalSnapshot.tsx` | MODIFICAR |

---

## RF-M07 — Toggle de aprobación en medicamentos y órdenes

### Cambios requeridos
1. **Modificar** `medical-notes.ts` — agregar `approved?: boolean` a `FHIRPlanItem`
2. **Modificar** `ClinicalSnapshot.tsx` `IPSItemRow` — toggle + tooltip "Solo los aprobados se enviarán al paciente"
3. **Modificar** `aiService.ts` — default `approved: true`

| Archivo | Acción |
|---|---|
| `consultation/types/medical-notes.ts` | MODIFICAR |
| `consultation/components/ClinicalSnapshot.tsx` | MODIFICAR |
| `services/aiService.ts` | MODIFICAR |

---

## RF-M08 — PDF al finalizar consulta

### Estado actual
- **NO existe** servicio de PDF. `PrescriptionDraft.tsx` es un placeholder de 39 líneas.
- `MedicalNotesCopilotPage.tsx` `finalizeConsultation()` guarda datos pero no genera PDF

### Cambios requeridos
1. **Instalar** `jspdf`, `html2canvas`, `qrcode`
2. **Crear** `services/pdfService.ts` — funciones para generar PDF de receta, órdenes, referencia
3. **Crear** `services/templates/` — 3 templates HTML profesionales
4. **Crear** `consultation/components/PDFPreviewDialog.tsx` — preview + descargar + enviar
5. **Modificar** `MedicalNotesCopilotPage.tsx` `finalizeConsultation()` — integrar PDF

| Archivo | Acción |
|---|---|
| `services/pdfService.ts` | **NUEVO** |
| `services/templates/prescriptionTemplate.ts` | **NUEVO** |
| `services/templates/labOrderTemplate.ts` | **NUEVO** |
| `services/templates/referralTemplate.ts` | **NUEVO** |
| `consultation/components/PDFPreviewDialog.tsx` | **NUEVO** |
| `consultation/pages/MedicalNotesCopilotPage.tsx` | MODIFICAR |

---

## RF-M09 — Configuración de plantillas

### Cambios requeridos
1. **Crear** `services/templateConfigService.ts` — CRUD Firestore para `organizations/{orgId}/settings/templates`
2. **Crear** `settings/components/TemplateConfigSection.tsx` — UI de configuración (logo, datos médico, sello, prompts)
3. **Integrar** en `SettingsPage.tsx`

| Archivo | Acción |
|---|---|
| `services/templateConfigService.ts` | **NUEVO** |
| `settings/components/TemplateConfigSection.tsx` | **NUEVO** |
| `settings/pages/SettingsPage.tsx` | MODIFICAR |

---

## RF-M10 — Envío de PDFs (correo + WhatsApp vía n8n)

### Objetivo
Módulo centralizado de notificaciones completamente implementado. Correo funcional en esta etapa. WhatsApp completamente implementado con llamadas a APIs de n8n (listo para conectar cuando n8n esté configurado).

### Cambios requeridos
1. **Crear** `services/notificationService.ts` — servicio centralizado, interfaz unificada para correo y WhatsApp
2. **Crear** `services/emailService.ts` — implementación completa con Firebase Function callable
3. **Crear** `services/whatsappService.ts` — implementación completa con llamadas HTTP a n8n:
   ```typescript
   // Totalmente implementado: llamadas a n8n webhook
   async function sendWhatsApp(to: string, message: string, attachments: Blob[], config: WhatsAppConfig): Promise<NotificationResult>
   // Config incluye: webhookUrl, apiKey, templateId
   // Genera mensaje usando prompt configurado + AI
   ```
4. **Crear** Firebase Function `sendEmail` — Nodemailer con soporte multi-provider (Gmail, M365, SES)
5. **Crear** Firebase Function `sendWhatsApp` — proxy a n8n webhook con logging
6. **Crear** `settings/components/NotificationConfigSection.tsx` — configuración completa de email + WhatsApp
7. **Crear** `services/notificationLogService.ts` — guardar logs de envío en Firestore

| Archivo | Acción |
|---|---|
| `services/notificationService.ts` | **NUEVO** |
| `services/emailService.ts` | **NUEVO** |
| `services/whatsappService.ts` | **NUEVO** |
| `services/notificationLogService.ts` | **NUEVO** |
| `settings/components/NotificationConfigSection.tsx` | **NUEVO** |
| `settings/pages/SettingsPage.tsx` | MODIFICAR |
| `consultation/components/PDFPreviewDialog.tsx` | MODIFICAR |
| Firebase Functions `sendEmail` | **NUEVO** |
| Firebase Functions `sendWhatsApp` | **NUEVO** |

---

## RF-M11 — Comando de voz: "Modo Receta"

### Cambios requeridos
1. **Crear** `consultation/utils/voiceCommands.ts` — detección de comandos de voz
2. **Crear** `consultation/components/PrescriptionModal.tsx` — reemplaza PrescriptionDraft.tsx
3. **Eliminar** `PrescriptionDraft.tsx`
4. **Modificar** `MedicalNotesCopilotPage.tsx` — interceptar comandos

| Archivo | Acción |
|---|---|
| `consultation/utils/voiceCommands.ts` | **NUEVO** |
| `consultation/components/PrescriptionModal.tsx` | **NUEVO** |
| `consultation/components/PrescriptionDraft.tsx` | **ELIMINAR** |
| `consultation/pages/MedicalNotesCopilotPage.tsx` | MODIFICAR |

---

## RF-M12 — Modal Receta (solo lectura con talonario)

Incluido en RF-M11 — `PrescriptionModal.tsx` con modo edición y modo lectura.

---

## RF-M13 — Modal Laboratorio (checklist por áreas)

### Cambios requeridos
1. **Crear** `consultation/components/LabOrderModal.tsx`
2. **Modificar** `MedicalNotesCopilotPage.tsx` y `voiceCommands.ts`

| Archivo | Acción |
|---|---|
| `consultation/components/LabOrderModal.tsx` | **NUEVO** |
| `consultation/utils/voiceCommands.ts` | MODIFICAR |

---

## RF-M14 — Sugerencias/alertas dentro de modales

1. **Crear** `consultation/components/ModalSuggestionsPanel.tsx`

---

## RF-M17 — Referencias (comando + modal + PDF + envío)

1. **Crear** `consultation/components/ReferralModal.tsx`
2. **Modificar** `voiceCommands.ts`, `pdfService.ts`, `ClinicalSnapshot.tsx`

---

## RF-M20 — QR de verificación en PDFs

1. **Crear** `services/documentVerificationService.ts`
2. **Crear** `features/verify/pages/VerifyDocumentPage.tsx` — página pública
3. **Modificar** `pdfService.ts` — insertar QR
4. **Agregar ruta** pública `/verify/:id` en `App.tsx`

---

# N) Notificaciones de citas

## RF-N01 — Configuración de notificaciones
Integrado con RF-M10 — `NotificationConfigSection.tsx` con config de tiempos de recordatorio.

## RF-N02 — Confirmación al asignar cita
Firebase Function trigger `onAppointmentCreated` → enviar correo + WhatsApp con enlaces Confirmar/Cancelar.

## RF-N03 — Recordatorios programados
Firebase Scheduled Function `sendAppointmentReminders` — cada 15 min.

## RF-N04 — Confirmar/Cancelar desde mensaje
Página pública `AppointmentActionPage.tsx` con validación de token.

---

# P) Plantillas unificadas

## RF-M23 — Sistema unificado de plantillas
`services/templateEngine.ts` — motor unificado para receta, lab, referencia.

## RF-M25 — Motor dinámico de PDF
Incluido en RF-M08 (`pdfService.ts` + `templateEngine.ts`).

## RF-M28 — Diseños reales de 3 plantillas
Templates profesionales en `services/templates/`.

---

# D) Dashboard

## RF-M29 — Dashboard operativo
**Médico**: indicadores del día, próximas citas, alertas.  
**Secretaria**: programadas, confirmadas, canceladas, en espera, agenda + acciones rápidas.

---

# Firebase Functions (nueva sección)

### Funciones a implementar

| Función | Tipo | Descripción |
|---|---|---|
| `sendEmail` | Callable | Envío de email con Nodemailer (Gmail/M365/SES) |
| `sendWhatsApp` | Callable | Proxy a n8n webhook con logging |
| `speechToText` | Callable | **(Opcional)** Proxy a Google Cloud STT — solo si se elige Google Cloud como proveedor de diarization. Con Deepgram/AssemblyAI no es necesario |
| `onAppointmentCreated` | Trigger Firestore | Enviar notificación al crear cita |
| `sendAppointmentReminders` | Scheduled | Recordatorios programados cada 15 min |
| `verifyDocument` | HTTP | Endpoint público para verificación QR |

### Configuración requerida
1. Inicializar proyecto Firebase Functions (`firebase init functions`)
2. Configurar secrets: credenciales email, API keys
3. Desplegar funciones

---

# Entidades Firestore (resumen)

| Colección | Estado |
|---|---|
| `organizations/{orgId}/appointments` | Existente — actualizar tipos de estado |
| `organizations/{orgId}/patients_fhir` | Existente |
| `organizations/{orgId}/agendas` | **NUEVA** |
| `organizations/{orgId}/agendas/{id}/blocks` | **NUEVA** |
| `organizations/{orgId}/settings/templates` | **NUEVA** |
| `organizations/{orgId}/settings/notifications` | **NUEVA** |
| `organizations/{orgId}/settings/speechConfig` | **NUEVA** — config de reconocimiento de voz y diarization |
| `organizations/{orgId}/documents` | **NUEVA** |
| `organizations/{orgId}/notificationLogs` | **NUEVA** |
