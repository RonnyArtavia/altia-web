# Expediente Electrónico de Pacientes
## Documento de Requerimientos Funcionales — Módulo de Agenda
**ID:** REQ-AGENDA-001 | **Versión:** 1.0 | **Estado:** En revisión | **Fecha:** Marzo 2026

---

## 1. Identificación del Requerimiento

| Campo | Detalle |
|---|---|
| Módulo | Agenda de Citas |
| Rol Afectado | Asistente, Médico |
| Prioridad | Alta |
| Aplicación | Expediente Electrónico de Pacientes (React Web) |
| Referencia visual | Microsoft Outlook Calendar |

---

## 2. Descripción General

El módulo de Agenda permite al rol de **Asistente** administrar las agendas de uno o varios médicos asignados. Cada médico puede tener una o más agendas; cada agenda se divide en **slots (lotes) de tiempo** configurables para controlar la cantidad de pacientes atendidos por hora.

La versión actual ya cuenta con la vista de calendario estilo Outlook con vistas de día, semana y mes. Este requerimiento extiende esa funcionalidad con capacidades de administración de agendas, filtrado, bloqueos, colores distintivos por agenda y movimiento de citas entre slots y agendas.

---

## 3. Actores

| Actor | Descripción |
|---|---|
| Asistente | Usuario principal del módulo. Administra las agendas de los médicos asignados: crea, modifica, bloquea y elimina agendas; asigna y mueve citas. |
| Médico | Propietario de una o más agendas. Sus agendas son administradas por el Asistente. |
| Paciente | Destinatario de las citas. No interactúa directamente con este módulo. |

---

## 4. Diseño General de la Pantalla

La pantalla debe seguir el patrón visual de **Microsoft Outlook Calendar**, dividida en dos áreas:

| Panel Izquierdo (Filtros) | Panel Derecho (Calendario) |
|---|---|
| Filtro de médicos | Barra superior: fecha actual, navegación prev/next, selector de vista |
| Filtro de agendas (dependiente de médicos seleccionados) | Vistas: **Día \| Semana \| Mes** |
| Opciones de gestión de agendas | Grilla de calendario con slots por agenda y color distintivo |

---

## 5. Requerimientos Funcionales

### RF-01 – Visualización de agendas con color distintivo

Al ingresar a la pantalla de agenda, el sistema muestra todas las agendas a las que el Asistente tiene acceso. Cada agenda se identifica con un **color único configurable** para facilitar su diferenciación visual en la grilla.

| Atributo | Detalle |
|---|---|
| ID | RF-01 |
| Prioridad | Alta |
| Criterio de aceptación | Cada agenda muestra sus slots con el color asignado. Dos agendas distintas nunca comparten color de forma predeterminada. |

---

### RF-02 – Filtro de médicos en panel izquierdo

En el panel izquierdo existe una sección de filtro de médicos. El Asistente puede seleccionar todos los médicos o uno o más específicos. Al cambiar la selección, la grilla se actualiza mostrando únicamente las agendas de los médicos seleccionados.

- Opción "Todos" seleccionada por defecto al ingresar.
- La lista corresponde a los médicos asignados al Asistente activo.
- La selección múltiple es permitida.

| Atributo | Detalle |
|---|---|
| ID | RF-02 |
| Prioridad | Alta |
| Criterio de aceptación | Al seleccionar uno o varios médicos, sólo se muestran sus agendas en el calendario. |

---

### RF-03 – Filtro de agendas dependiente del filtro de médicos

Debajo del filtro de médicos existe un filtro de agendas. La lista de agendas disponibles depende dinámicamente de los médicos seleccionados. El Asistente puede seleccionar todas las agendas o una o más específicas.

- Si se deselecciona un médico, sus agendas desaparecen del filtro de agendas.
- La selección múltiple es permitida.
- Las agendas se identifican por nombre y color.

| Atributo | Detalle |
|---|---|
| ID | RF-03 |
| Prioridad | Alta |
| Criterio de aceptación | La lista de agendas se actualiza en tiempo real al cambiar el filtro de médicos. |

---

### RF-04 – Gestión de Agendas (Crear, Editar, Eliminar, Bloquear)

Desde la pantalla de agenda, el Asistente tiene acceso a las siguientes acciones de gestión:

#### RF-04.1 – Crear agenda
- El Asistente puede crear una nueva agenda asociada a un médico.
- Al crear se definen: nombre, médico propietario, color, horario de atención y configuración de slots por hora.

#### RF-04.2 – Editar agenda
- El Asistente puede modificar cualquier atributo de una agenda existente.
- Los cambios aplican a slots futuros; las citas ya agendadas no se modifican automáticamente.

#### RF-04.3 – Bloquear agenda
- El Asistente puede bloquear una agenda por un rango de fechas/horas definido.
- El bloqueo puede aplicarse a: una agenda específica o todas las agendas de un médico.
- Los slots bloqueados se muestran visualmente diferenciados (patrón gris o ícono de candado) y no permiten asignación de citas.

#### RF-04.4 – Eliminar agenda
- El Asistente puede eliminar una agenda existente.
- El sistema solicita confirmación antes de proceder.
- No se puede eliminar una agenda con citas futuras activas; el sistema advierte y ofrece: cancelar las citas o moverlas a otra agenda.

| Atributo | Detalle |
|---|---|
| ID | RF-04 |
| Prioridad | Alta |
| Criterio de aceptación | El Asistente realiza todas las operaciones CRUD sobre agendas sin salir de la pantalla principal. |

---

### RF-05 – Configuración de agenda

Al crear o editar una agenda, el Asistente configura los siguientes parámetros:

| Parámetro | Descripción |
|---|---|
| Nombre | Nombre descriptivo de la agenda (ej. "Consulta General", "Urgencias"). |
| Médico | Médico al que pertenece la agenda. |
| Color | Color distintivo, seleccionable mediante un selector de color. |
| Horario de atención | Hora de inicio y fin (ej. 08:00 – 16:00). Selector de horas en intervalos de 15/30 min estilo Outlook. |
| Slots por hora | **Opción 1:** cantidad uniforme de slots/hora (ej. 2 slots = 30 min c/u). **Opción 2:** configuración por hora específica (ej. 08:00–09:00: 3 pacientes; 09:00–10:00: 2). Por defecto: 2 slots/hora (30 min). |

| Atributo | Detalle |
|---|---|
| ID | RF-05 |
| Prioridad | Alta |
| Criterio de aceptación | La configuración de slots se refleja correctamente en la grilla del calendario. |

---

### RF-06 – Bloqueo de horas o rangos en agendas

El Asistente puede bloquear uno o varios slots de tiempo, definiendo:

- Fecha o rango de fechas a bloquear.
- Hora de inicio y fin del bloqueo.
- Alcance: hora(s) específica(s), una agenda, o todas las agendas de un médico.
- Motivo del bloqueo (campo de texto opcional).

Si existen citas en el rango a bloquear, el sistema advierte y permite: cancelar las citas existentes o moverlas a otro slot disponible.

| Atributo | Detalle |
|---|---|
| ID | RF-06 |
| Prioridad | Alta |
| Criterio de aceptación | Los slots bloqueados aparecen diferenciados en la grilla y rechazan intentos de asignación de citas. |

---

### RF-07 – Movimiento de citas entre slots, agendas y médicos

El Asistente puede mover una cita existente a otro slot disponible. El movimiento puede realizarse:

- Entre slots de la misma agenda (mismo o diferente día).
- Entre agendas distintas del mismo médico.
- Entre agendas de médicos diferentes.

La interfaz debe soportar **drag & drop** en la grilla, además de un formulario de edición que permita seleccionar el nuevo slot, agenda y médico destino. Al mover una cita entre médicos, el sistema solicita confirmación explícita.

| Atributo | Detalle |
|---|---|
| ID | RF-07 |
| Prioridad | Alta |
| Criterio de aceptación | Una cita puede moverse exitosamente a cualquier slot disponible en cualquier agenda visible; la grilla refleja el cambio inmediatamente. |

---

### RF-08 – Mantener funcionalidad existente de citas

La versión actual incluye la asignación y modificación de citas en los slots. Esta funcionalidad debe conservarse sin cambios. Las mejoras de este requerimiento son aditivas y no deben afectar el flujo actual.

| Atributo | Detalle |
|---|---|
| ID | RF-08 |
| Prioridad | Alta |
| Criterio de aceptación | Los flujos existentes de creación y edición de citas funcionan correctamente luego de implementar los cambios. |

---

## 6. Reglas de Negocio

| ID Regla | Descripción |
|---|---|
| RN-01 | Un médico puede tener una o más agendas activas de forma simultánea. |
| RN-02 | Un Asistente puede administrar agendas de uno o varios médicos, según su configuración de acceso. |
| RN-03 | El slot por defecto es de 30 minutos (2 slots por hora). |
| RN-04 | No se puede crear una cita en un slot bloqueado. |
| RN-05 | No se puede eliminar una agenda con citas futuras sin resolución previa (cancelar o mover). |
| RN-06 | El color de cada agenda es único dentro del contexto del Asistente para facilitar la diferenciación visual. |
| RN-07 | El horario de atención define los slots visibles en la grilla; fuera de ese horario no se muestran slots. |
| RN-08 | Al mover una cita entre médicos, se requiere confirmación explícita del Asistente. |

---

## 7. Requerimientos No Funcionales

| ID | Descripción |
|---|---|
| RNF-01 | La grilla debe actualizarse en menos de 1 segundo al cambiar los filtros de médicos o agendas. |
| RNF-02 | El módulo debe ser funcional en resoluciones de escritorio (mínimo 1280px de ancho). |
| RNF-03 | El diseño visual sigue el patrón de Microsoft Outlook Calendar: panel izquierdo para filtros, panel derecho para la grilla, barra superior con fecha y controles de navegación. |
| RNF-04 | Los colores de agenda deben cumplir contraste mínimo WCAG AA para texto sobre fondo de color. |
| RNF-05 | La funcionalidad de drag & drop debe funcionar en Chrome, Firefox y Edge en sus versiones estables actuales. |

---

## 8. Flujos Principales

### Flujo 1 – Visualizar agendas filtradas

| Paso | Descripción |
|---|---|
| 1 | El Asistente ingresa a la pantalla de Agenda. |
| 2 | El sistema carga todas las agendas a las que tiene acceso, con sus colores respectivos. |
| 3 | El Asistente selecciona uno o varios médicos del filtro izquierdo. |
| 4 | La lista de agendas en el filtro inferior se actualiza con las agendas de los médicos seleccionados. |
| 5 | El Asistente selecciona una o más agendas del filtro de agendas. |
| 6 | La grilla muestra únicamente los slots de las agendas seleccionadas. |

### Flujo 2 – Crear una agenda

| Paso | Descripción |
|---|---|
| 1 | El Asistente selecciona "Nueva agenda" en el panel izquierdo o desde un menú contextual. |
| 2 | El sistema muestra un formulario/modal para ingresar: nombre, médico, color, horario de atención y configuración de slots. |
| 3 | El Asistente completa los campos y confirma. |
| 4 | El sistema valida los datos (horario válido, sin solapamiento con otra agenda del mismo médico). |
| 5 | El sistema crea la agenda y la muestra en la grilla y el filtro lateral con el color configurado. |

### Flujo 3 – Mover una cita

| Paso | Descripción |
|---|---|
| 1 | El Asistente localiza la cita en la grilla del calendario. |
| 2 | El Asistente arrastra la cita (drag & drop) al nuevo slot, o abre la cita y selecciona "Mover cita" desde el formulario. |
| 3 | El sistema valida que el slot destino esté disponible y no bloqueado. |
| 4 | Si el slot destino pertenece a un médico diferente, el sistema solicita confirmación. |
| 5 | El sistema mueve la cita, actualiza la grilla y registra el cambio en el historial de la cita. |

---

## 9. Preguntas Abiertas / Puntos a Confirmar

| # | Pregunta |
|---|---|
| P-01 | ¿Puede existir solapamiento de horarios entre dos agendas del mismo médico, o el sistema debe impedirlo? |
| P-02 | ¿El bloqueo de agenda aplica también a citas ya agendadas en ese rango, o solo bloquea nuevas asignaciones? |
| P-03 | ¿Debe existir un log de auditoría de los movimientos de citas y bloqueos realizados por el Asistente? |
| P-04 | ¿La notificación automática al paciente al mover su cita es parte de este módulo o de un módulo de notificaciones separado? |
| P-05 | ¿El Asistente puede eliminar agendas de cualquier médico asignado, o se necesita un nivel de permiso adicional? |
| P-06 | ¿Se requiere soporte para bloqueos recurrentes (ej. bloquear todos los lunes de 8:00 a 9:00 durante 3 meses)? |

---

## 10. Historial de Versiones

| Versión | Cambio |
|---|---|
| 1.0 – Marzo 2026 | Versión inicial del documento basada en requerimiento verbal del equipo de producto. |