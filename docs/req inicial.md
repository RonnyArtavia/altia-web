from pathlib import Path

md = """# Especificación de Requerimientos — Sistema de Citas y Consulta Médica (Altia + Firebase)

> Enfoque: **Secretaria/Asistente** (citas/agendas) + **Médico** (consulta/notas/IA/documentos) + **Plantillas/PDF/Notificaciones/Dashboard**.  
> Persistencia: **Firebase/Firestore**, respetando la estructura actual de colecciones y el estándar de la app: **“se crean/modifican cuando se requieren durante la ejecución”**.

---

## 0) Alcance y supuestos generales
- La app ya tiene:  
  - un **diálogo actual Nueva Cita** para asignar/cancelar citas (se extiende, no se reemplaza), ese dialogo esa en agenda y se mustra con el boton nueva cita o al hacer clic sobre un slot,  
  - un menú/pantalla actual de **Agenda** (se amplía),  
  - una página actual de **Consulta** (se reutiliza; se agregan modos/vistas/acciones).
- Roles mínimos:
  - **Secretaria/Asistente**
  - **Médico**
  - (Opcional) **Admin** / configuración (si la app lo maneja hoy).
- Estado de cita se gobierna por reglas estrictas (ver RF-A04).
- Todos los cambios deben integrarse con la UI/patrones actuales y con Firestore.

---

# A) Citas y flujo de secretaria/asistente

## RF-A01 — Búsqueda de paciente en diálogo actual para asignar citas en agenda (búsqueda por nombre) (mantener)
### Objetivo
Mantener el comportamiento actual del diálogo de asignación de cita: **primero buscar paciente por nombre**.

### Flujo
1. Secretaria abre el **diálogo actual** “Asignar cita”.
2. El diálogo inicia con búsqueda de paciente por **Nombre** (como hoy).
3. Si hay resultados: selecciona paciente y continúa flujo de asignación actual.
4. Si **no hay resultados**: habilitar flujo RF-A02 dentro del mismo diálogo.

### Aceptación
- No se elimina el flujo actual; se extiende.
- La búsqueda por nombre sigue siendo obligatoria antes de registrar.

---

## RF-A02 — Registro rápido de paciente dentro del mismo diálogo (si no existe)
### Objetivo
Si el paciente no existe, poder registrarlo sin salir del diálogo actual y continuar con la creación de la cita.

### Campos
- **Nombre** (obligatorio)
- **Identificación/Cédula** (obligatorio)
- **Teléfono** (obligatorio)
- **Correo** (opcional)
- **Motivo de consulta** (opcional)

### Reglas
- Validar que **Identificación** no exista (evitar duplicados).
- Al guardar paciente:
  - seleccionar automáticamente el paciente,
  - continuar con creación de cita en el mismo diálogo.

### Aceptación
- Todo ocurre dentro del mismo diálogo.
- En error (duplicado/validación): mostrar mensaje y conservar valores ingresados.

---

## RF-A04 — Dialogo "Opciones de Cita" en agenda al seleccionar una cita  mantener funcionalidad actual y agrregar la funcionalidad para cambiar estado de la cita
### Objetivo
Mantener cancelación actual y agregar “cambio de estado” con reglas estrictas por rol.

### Estados mínimos
- **Programada**
- **En espera**
- **En atención**
- **Finalizada**
- **Cancelada**

### Transiciones permitidas
**Secretaria/Asistente (desde diálogo actual):**
- **Programada ↔ En espera**
- **Programada → Cancelada**
- **En espera → Cancelada**
- **En espera → Programada**

> El asistente **NO** puede cambiar a “En atención” ni “Finalizada”.

**Médico:**
- **En espera → En atención** al seleccionar “Iniciar atención” desde RF-A05 o desde consulta.
- **En atención → Finalizada** al finalizar consulta.

### UI (diálogo actual)
- Mantener botón/acción “Cancelar” tal como hoy.
- Agregar opción “Cambiar estado” mostrando solo estados permitidos al asistente.

### Auditoría mínima
- Guardar timestamps: `enEsperaAt`, `enAtencionAt`, `finalizadaAt`, `canceladaAt`
- Guardar `updatedBy`, `updatedRole`

---

## RF-A05 — Nueva opcion de Menu en el menú princial para “Pacientes de hoy” (En espera/En atención + opcional finalizadas). debe estar debajo de Dashboard
### Objetivo
Mostrar al médico los pacientes del día con estado **En espera** o **En atención**, con opción de incluir **Finalizadas**.

### Filtros
- Fecha fija: **Hoy**
- Estados por defecto: **En espera**, **En atención**
- Toggle: “Mostrar finalizadas” (incluye **Finalizada**)

### Acciones por paciente
1) **Iniciar atención**
- Redirige a la **página de consulta actual**.
- Cambia estado: **En espera → En atención**.
- Habilita dictado/escritura (consulta activa).

2) **Consultar historial médico**
- Redirige a la **misma página de consulta actual**.
- **NO** cambia estado.
- Modo lectura: ver historial.
- Dentro de la página de consulta debe existir botón **“Iniciar atención”** (desde historial) que sí cambie estado En espera→En atención.

### Datos mínimos por fila
- Hora cita
- Paciente (nombre, identificación)
- Estado (En espera/En atención/Finalizada)
- Tiempo en espera (si aplica)
- Motivo (si existe)

### Nota
- RF-M01 queda cubierto por RF-A05.

---

# C) Agendas (tipo Google Calendar) — Menú actual “Agenda”

## RF-C01 — Gestión de Agendas tipo Google Calendar (multi-agenda por médico)
### Objetivo
Implementar dentro del menú/pantalla actual “Agenda” una funcionalidad similar a Google Calendar para “agendas de citas”:
- Un médico puede tener **múltiples agendas**
- La secretaria puede:
  - seleccionar uno o mas médicos, (incluyendo todos los médicos)
  - ver agendas,
  - filtrar por 1 o más agendas,
  - crear/modificar/habilitar/deshabilitar agendas,
  - bloquear fechas/horas,
  - evitar traslapes entre agendas,
  - asociar **ubicación** a cada agenda.

---

### RF-C01.1 — Selección de médico + filtros por múltiples agendas
**UI en menú actual “Agenda”:**
- Selector **Médicos** uno o mas médicos (incluyendo todos los médicos)
- Lista de agendas del médico con **multi-select** (checkboxes):
  - “Mostrar todas”
  - seleccionar 1..N agendas
- Mostrar estado por agenda:
  - Habilitada/Deshabilitada
  - Ubicación asociada

---

### RF-C01.2 — Crear/editar agenda (configuración dentro del menú actual de Agenda)
**Campos obligatorios**
- Nombre de agenda
- Médico asociado
- **Ubicación** (texto; opcional link/metadata)
- Duración default de cita (min)
- Horario recurrente (por día de semana)
- (Opcional) Buffer entre citas

**Validación anti-traslape (CRÍTICO)**
- No se permite que dos agendas del **mismo médico** se traslapen en horario.
- Aplica en creación y modificación.

**Habilitar/Deshabilitar**
- Agenda deshabilitada: no permite nuevas citas, conserva histórico.

---

### RF-C01.3 — Bloquear fechas y horas (bloqueos)
- Bloqueo por rango de fechas
- Bloqueo por día
- Bloqueo por horas
- Bloqueo recurrente

Efecto: impide asignar citas en ese bloque; detectar conflictos con citas existentes.

### RF-C01.4 — Reasginacionde citas.
- Permtir reasignar citas entre médicos y agendas
- Permitr arrastrar y solar para reasignar citas
- permitir selecionar una cita para editar fecha y hora y agenda

---

# M) Pagina /doctor/consulta Consulta médica — notas, IA, comandos, documentos

## RF-M03 — Mejorar la funcionalidad actual de consulta medica. Permitir Notas médicas: voz + texto simultáneo + ajuste de animación
- Mantener dictado y texto habilitado a la vez.
- Mientras dictado esté activo, permitir escribir.
- Al “Enviar”, procesar `voiceTranscript + typedNotes`.
- Animación de voz no debe cubrir el input (estilo ChatGPT voz).

---

## RF-M04 — Extracción de antecedentes médicos (nueva sección)
- La funciionalidad actual extraer informacion medica de las notas medicas ingresadas o dictadas por el medico como por ej sopa, medicamentos, alergias, etc. debe ser mejorada para que pueda extraer tambien  antecedentes personalies y familiares por ej Diabetis en padre, presiona arteral en la madre, alcoholismo en el abuelo materno, etc. debe mostrarlos como sección “Antecedentes”.

---

## RF-M05 — Identificación de hablante (médico vs paciente)
- Investigar si una forma de identificar el hablante, especificamente identificar al medico del paciente.
- Speaker diarization + asignación doctor/patient.
- Comandos operativos solo se ejecutan si `speakerRole==doctor`.

---

## RF-M06 — Motor de sugerencias clínicas (medicamentos/órdenes)
- La funcionalidad ya existe, debe extender y mejorarla 
- Cuando en la noa medica se reciba un medicamento o examen, debe generar una sugerencia clínica especifica apra el medicamento o examen. si ademas recibe otra inforamcion como diagnostico, antecedentes, etc,  debe generar TAMBIEN una sugerencia clínica general.

---

## RF-M07 — Aprobación (toggle) de medicamentos y órdenes en resumen
- en el resumen de la consulta se crea la lista de medicamentos y órdenes conforme se van procesando las notas medicas. Mantener esa funcionalidad y extenderla para que pueda aprobar/desaprobar los medicamentos y órdenes.
- `approved=true` por defecto al crear.
- Toggle aprobar/desaprobar para medicamentos y órdenes.
- Solo aprobados van a PDFs y envíos.
- Agregar un tooltipo para indicar que solo los medicamentos y ordenes aprobados se enviaran al paciente.

---

## RF-M08 — PDF al finalizar consulta (receta + órdenes)
- Esta funcionalidad no existe, debe ser implementada.
- Generar PDF(s) con plantilla, sello simulado y QR.
- Incluir solo ítems aprobados.
- El pdf debe ser generado utilizando un prompt configurado enla aplicaicon y debe utilizar logo y datos del medico y centro medico configurados en la app. ver RF-M09
---

## RF-M09 — Configuración de plantillas (logo + datos médico + sello) para recetas y órdenes
- Esta funcionalidad no existe, debe ser implementada.
- Configurar logo, médico, código, centro, etc.
- Sello simulado.
- Plantillas base.
- Prompt para generar detalles de la plantilla. este prompt debe ser configurable y se usara cuando se genere el pdf.

---

## RF-M10 — Envío de PDFs (correo + WhatsApp)
- Esta funcionalidad no existe, debe ser implementada.
- Enviar PDFs por correo y WhatsApp (WhatsApp vía n8n).
- Guardar logs.
- Implementar un modulo centralizado para envio de notificaciones (correo y whatsapp) que pueda ser reutilizado por otros modulos.
- Debe tener un prompt configurado en la app para generar el mensaje de whatsapp y debe tener un prompt configurado para generar el correo.
- Whatsapp se va a implementar en el futuro utilizando n8n y chatwoot, debe debar preparada con configuracion para utilizarla en un futuro.
- Notificaciones por correo debe implementarse en esta etapa, debe ser configurable para funcionar con proveedores como gmail, m365, ses, etc.
---

## RF-M11 — Comando de voz: activar “Modo Receta”
- Esta funcionalidad ya existe, debe ser mejorada.
- Debe permitir activar el modo receta mediante comandos de voz. esta funcionalidad permite al medico ver un modal con con solo los medicamentos en un formato talonario y permitir agregar, modificar o eliminar medicamentos utilizando voz o texto
- Esta funcionalidad debe activarse mediante comandos de voz como “Redactar receta / Crear receta / Crear prescripción”
- Abre modal Receta.
- El modal debe mostrar los medicamentos  que han sido aprobados, permitir mediante voz agregar, modificar o eliminar medicamentos.
- debe poder cerarse con comandos como finalizar, terminar, cerrar, entregar receta.
---

## RF-M12 — Modal Receta (solo lectura) con talonario por medicamento
- Cada medicamento en talón separado.
- Cierre por voz: “Aprobar/Terminar/Cerrar/Entregar receta”.
- Procesamiento general continúa en paralelo.

---xxxxxxx

## RF-M13 — Modal Laboratorio (solo lectura) con checklist por áreas
- Esta funcionalidad ya existe, debe ser mejorada. es muy similar a la de receta.
- Activación por voz: “Solicitud de análisis / Órdenes de laboratorio”.
- Exámenes por área, con check.
- Cierre por voz: “Aprobar/Completar/Entregar orden”.

---

## RF-M14 — Sugerencias/alertas dentro de modales
- Panel lateral con sugerencias/contraindicaciones (RF-M06) contextualizado (receta vs lab).

---

## RF-M17 — Referencias (comando + modal + PDF + envío + resumen)
- Comando: “Crear/Generar/Redactar referencia”.
- Modal muestra referencia completa, editable por voz.
- Genera PDF con plantilla + QR.
- Permite enviar por correo/WhatsApp.
- Se guarda en el resumen como sección “Referencias”.

---

## RF-M20 — QR de verificación en PDFs
- Incluir QR en receta, órdenes (lab/imágenes) y referencias.
- QR apunta a `/verify/{documentId}` (endpoint seguro).
- Crear endpoint seguro `/verify/{documentId}`. para verificar el QR.
---

# N) Notificaciones de citas (correo + WhatsApp)

## RF-N01 — Configuración de notificaciones
- Configurar proveedor correo (Gmail/M365/SES), plantillas con logo, horarios y tiempos antes.
- Configurar WhatsApp (vía n8n), horarios y tiempos antes.

## RF-N02 — Confirmación al asignar cita
- Al crear cita, enviar correo y WhatsApp con botones/enlaces Confirmar/Cancelar.

## RF-N03 — Recordatorios programados
- Enviar recordatorios según configuración.

## RF-N04 — Confirmar/Cancelar desde mensaje
- Endpoints seguros con token.
- Actualizar estado/confirmación de cita.

---

# P) Plantillas unificadas + diseño realista

## RF-M23 — Sistema unificado de plantillas
- Unificar plantillas para receta, lab/imágenes, referencia.

## RF-M25 — Motor dinámico de PDF
- Generar PDFs dinámicos desde plantillas, con inserción de logo/sello/QR.

## RF-M28 — Diseños reales de 3 plantillas (clínicas reales)
- Receta, Orden de laboratorio/imágenes, Referencia médica.
- Diseño profesional, listo para impresión.

---

# D) Dashboard con datos reales

## RF-M29 — Dashboard operativo
### Médico
- Indicadores del día: atendidos, pendientes, en curso, finalizadas, documentos generados.
- Próximas citas y accesos rápidos.
- Alertas (resultados/órdenes pendientes).

### Secretaria
- Indicadores: programadas, confirmadas, canceladas, en espera, en curso.
- Agenda del día + acciones rápidas.

---

# 6) Entidades mínimas (Firebase/Firestore) — aclaración
- Se usa Firestore.
- Debe revisarse estructura actual y extenderla.
- Crear/modificar colecciones/campos on-demand durante ejecución.
"""

