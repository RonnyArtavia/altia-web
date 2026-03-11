# Altia Health — Historia Clínica Electrónica con Inteligencia Artificial

## Resumen Ejecutivo: Un enfoque híbrido para la transformación digital de la consulta médica

**Fecha:** 12 de marzo de 2026  
**Versión:** 1.0  
**Plataforma:** React · TypeScript · Firebase · Google Gemini AI · FHIR R4  

---

## 1. La Tesis Central

Altia Health **no es** un sistema de historia clínica electrónica basado exclusivamente en inteligencia artificial. Tampoco es un expediente clínico electrónico tradicional al que se le "pegó" un chatbot como accesorio.

**Altia Health es un sistema híbrido deliberadamente diseñado** para colocar la inteligencia artificial donde más valor aporta — la escucha, transcripción y estructuración de la narrativa clínica del paciente — mientras preserva los módulos operativos tradicionales que el médico ya conoce y en los que confía: agenda, gestión de pacientes, órdenes, recetas, y configuración de su práctica.

La premisa es simple: **el médico no debería sentir que está aprendiendo a usar un sistema completamente nuevo.** Debería sentir que su sistema de siempre ahora *le escucha* y *le entiende*.

---

## 2. El Problema que Resolvemos

| Dolor del Médico | Cómo lo agrava el EHR tradicional | Cómo lo resuelve Altia |
| :--- | :--- | :--- |
| Pasar más tiempo escribiendo que atendiendo | Formularios extensos, clicks infinitos | **Dictado por voz** → el médico habla, la IA estructura |
| Pérdida de contexto clínico | Datos dispersos en múltiples pantallas | **Perfil Clínico unificado** con 7 pestañas en una sola vista |
| Errores de transcripción manual | Copy-paste, abreviaturas no estandarizadas | **Extracción automática de FHIR R4**: diagnósticos, medicamentos, órdenes |
| Interacciones medicamentosas no detectadas | Sin alertas en tiempo real | **Motor de interacciones farmacológicas** integrado con 12+ clases de fármacos |
| Dificultad para compartir información | PDFs genéricos, fax | **4 canales de salida**: PDF verificable con QR, Email, WhatsApp, Pantalla |
| Incumplimiento de estándares | Datos propietarios, no exportables | **Exportación FHIR R4 / IPS** con anonimización y bundles JSON |

---

## 3. La Arquitectura Híbrida

### 3.1 El Componente de IA — "El Copiloto Clínico"

Este es el diferenciador. El módulo de consulta de Altia Health funciona como un **copiloto médico conversacional**:

#### Captura de Voz Médica
- Servicio de grabación profesional optimizado para voz médica (16 kHz, mono, supresión de ruido, cancelación de eco).
- Grabación en segmentos de 5 segundos para transcripción en tiempo real.
- Soporte nativo para español (es-ES) con reconocimiento de abreviaturas médicas latinoamericanas (dx, tx, rx, hta, dm, px).
- Doble motor: Web Speech API para reconocimiento en navegador + servicio de grabación para procesamiento posterior.

#### Procesamiento con IA Generativa
- Motor principal: **Google Gemini** con cadena de resiliencia multi-modelo (gemini-2.5-flash → 2.5-flash-lite → 2.0-flash → 1.5-flash → 1.5-pro).
- Si un modelo falla, el sistema intenta automáticamente con el siguiente — sin intervención del médico.
- Sistema de prompts de **1,384 líneas** diseñado específicamente para documentación médica en español.
- Detección de actualizaciones incrementales: reconoce cuándo el médico está *añadiendo* información a una nota existente vs. dictando una consulta nueva.

#### Salida Estructurada Automática
A partir de texto libre o dictado, la IA genera:

| Recurso FHIR | Ejemplo de extracción |
| :--- | :--- |
| **Condition** (Diagnósticos) | "Tiene hipertensión arterial" → `ICD-10: I10, Hipertensión esencial` |
| **MedicationRequest** (Prescripciones) | "Le receto losartán 50mg" → Medicamento + dosis + frecuencia |
| **ServiceRequest** (Órdenes de laboratorio) | "Pídanle un hemograma completo" → Orden de laboratorio con código |
| **AllergyIntolerance** | "Es alérgico a la penicilina" → Alergia codificada con severidad |
| **Observation** (Signos vitales) | "Presión 130/85" → Observación FHIR con valores numéricos |
| **FamilyMemberHistory** | "Su padre era diabético" → Historial familiar estructurado |
| **Nota SOAP completa** | Subjetivo / Objetivo / Evaluación / Plan — listo para el expediente |

#### Seguridad Clínica en Tiempo Real
- **Motor de interacciones farmacológicas** que cruza las prescripciones propuestas contra la medicación activa del paciente.
- Base de datos de interacciones que cubre: penicilinas, AINEs, opioides, anticoagulantes, IECA, betabloqueantes, benzodiacepinas, estatinas, inhibidores de PDE5, y más.
- Alertas con niveles de severidad (alto / medio / bajo / seguro).
- Ejemplos: Warfarina + AINE → riesgo de sangrado, Sildenafilo + Nitratos → contraindicación absoluta, Betabloqueante + Insulina → hipoglucemia enmascarada.

---

### 3.2 Los Módulos Tradicionales — "Lo que el Médico ya Conoce"

Aquí está la clave del enfoque híbrido. Estos módulos no son innovadores desde el punto de vista tecnológico — son **deliberadamente familiares**:

#### Panel de Control (Dashboard)
- Vista de bienvenida con estadísticas del día: pacientes atendidos, pendientes, citas agendadas.
- Tarjetas de acceso rápido a las funciones más usadas.
- Diseño limpio con glassmorphism y animaciones sutiles que elevan la percepción de calidad sin agregar complejidad.

#### Agenda del Día (anteriormente "Consultas diarias")
- Lista de pacientes del día con estados visuales: en espera, en atención, finalizado.
- Toggle para mostrar/ocultar consultas finalizadas.
- Fecha actual siempre visible — el médico sabe exactamente dónde está.
- Acceso directo al Perfil Clínico de cada paciente con un clic.

#### Gestión de Pacientes
- Búsqueda en tiempo real con filtros.
- Registro rápido de paciente nuevo desde la misma agenda (sin salir del flujo).
- Datos demográficos, contacto y resumen clínico accesibles desde cualquier punto del sistema.

#### Agenda / Calendario
- Vista mensual y semanal sincronizada con Firestore.
- Creación de citas, reprogramación y bloqueo de horarios.
- Confirmación automática vía Cloud Functions con notificaciones por email y WhatsApp.

#### Configuración de la Práctica
- Perfil del médico: nombre, especialidad, número de licencia.
- Branding de documentos: logo de clínica, firma digital, texto de pie de página.
- Preferencias de notificación: activación/desactivación de emails y WhatsApp de confirmación.

---

### 3.3 El Puente — El Perfil Clínico de 7 Pestañas

El **Perfil Clínico** es donde los dos mundos se encuentran. Es una vista unificada a pantalla completa que combina la salida de la IA con los módulos operativos tradicionales:

| Pestaña | Componente IA | Componente Tradicional |
| :--- | :--- | :--- |
| **Nota Clínica (SOAP)** | ✅ Generada por IA desde dictado | Editable manualmente por el médico |
| **Resumen Clínico (IPS)** | ✅ IPS auto-generado desde FHIR | Historial importado de consultas previas |
| **Órdenes** | ✅ Órdenes extraídas del dictado | Editor tradicional con resultados editables |
| **Referencias** | ✅ Referencias detectadas en la narrativa | Formulario estándar de referencia |
| **Farmacia** | ✅ Prescripciones extraídas automáticamente | Panel de receta con alertas de interacción |
| **Seguimiento** | — | Programación de citas de seguimiento |
| **Historial** | — | Navegador de consultas anteriores |

**Esto es crítico**: el médico no tiene que elegir entre "usar la IA" o "hacerlo manual". Puede dictar toda la consulta y dejar que la IA haga el trabajo pesado, o puede ignorar la IA completamente y trabajar en los formularios tradicionales — o puede combinar ambos. **El sistema no impone un flujo único.**

---

## 4. Canales de Salida Documental

Cada documento clínico (recetas, órdenes de laboratorio, referencias médicas, resúmenes clínicos) puede salir del sistema por **4 canales independientes**:

### 📄 Impreso / PDF
- Generación con jsPDF en formato carta.
- Encabezado profesional con datos del médico y clínica.
- Código QR de verificación embebido — cada documento tiene una URL única para validar autenticidad.
- Pie de página con licencia médica y firma digital.

### 📧 Email
- Apertura del cliente de correo nativo con cuerpo pre-llenado.
- Contenido formateado como texto plano con estructura clara.
- Datos del paciente y detalle del documento incluidos.

### 💬 WhatsApp
- Deep-link a `wa.me` con número del paciente (normalización automática de números costarricenses +506).
- Mensaje pre-formateado con emojis y estructura legible.
- Un solo clic para enviar desde el navegador.

### 🖥️ Pantalla (Vista Previa)
- Modal in-app con renderizado HTML estilizado del documento.
- Encabezado con gradiente, datos del paciente, contenido organizado por secciones.
- Botón de impresión integrado dentro del modal.
- Diseño responsive con backdrop blur y animaciones de entrada.

---

## 5. Interoperabilidad y Estándares

### Cumplimiento FHIR R4
- Todos los datos clínicos se persisten como **recursos FHIR R4 normalizados** en Firestore.
- Exportación de datos en formato **HL7 FHIR R4 JSON Bundle** desde el módulo de Interoperabilidad.
- Generación de **International Patient Summary (IPS)** por paciente.

### Exportación de Datos
- Selección individual o por lotes de pacientes.
- 8 secciones de exportación seleccionables: perfil clínico, medicamentos, laboratorios, referencias, demografía, etc.
- **Toggle de anonimización** para desidentificar datos antes de la exportación (investigación, auditoría).
- Formatos: JSON (FHIR Bundle nativo) o TXT (texto plano legible).
- Descarga directa o envío por email.
- Disclaimer legal integrado con aceptación obligatoria.

### Verificación Documental
- Cada prescripción, orden de laboratorio y referencia genera un **registro de verificación** inmutable en Firestore.
- URL de verificación única embebida como código QR en los PDFs.
- Protección contra falsificación de documentos médicos.

---

## 6. Stack Tecnológico

| Capa | Tecnología | Justificación |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Rendimiento, type-safety, HMR instantáneo |
| **Estilos** | Tailwind CSS 3.4 + shadcn/ui + Radix | Design system consistente, accesibilidad nativa |
| **Estado** | Zustand + React Query | Ligero, predecible, cache inteligente de queries |
| **Backend** | Firebase (Firestore, Auth, Functions, Storage) | Tiempo real, escalable, sin servidor |
| **IA** | Google Gemini (multi-modelo) | Capacidad médica en español, costo optimizado |
| **Voz** | Web Audio API + Web Speech API | Cero dependencias externas, funciona offline (parcial) |
| **PDF** | jsPDF 4.2 | Generación client-side sin servidor |
| **Estándar Clínico** | HL7 FHIR R4 | Interoperabilidad internacional |
| **Notificaciones** | Cloud Functions → Email + WhatsApp | Entrega asíncrona confiable |

---

## 7. ¿Por Qué un Enfoque Híbrido?

### El problema de los sistemas 100% IA
Los sistemas de historia clínica que dependen exclusivamente de IA enfrentan barreras de adopción severas:

1. **Desconfianza del médico**: "¿Qué pasa si la IA interpreta mal lo que dije?"
2. **Regulación**: Los organismos de salud exigen trazabilidad y control humano sobre el expediente.
3. **Curva de aprendizaje radical**: El médico tiene que aprender un paradigma completamente nuevo.
4. **Situaciones de contingencia**: Si la IA falla, el sistema completo se detiene.

### El problema de los EHR 100% tradicionales
Los expedientes electrónicos convencionales tienen sus propias limitaciones bien documentadas:

1. **Carga administrativa**: Hasta el 50% del tiempo del médico se invierte en documentación.
2. **Burnout profesional**: La documentación excesiva es la causa #1 de agotamiento entre médicos.
3. **Datos desestructurados**: Texto libre que no se puede analizar, exportar ni interoperar.
4. **Desconexión del paciente**: El médico mira la pantalla en lugar de mirar al paciente.

### La propuesta de Altia Health

> **"Un sistema donde la IA trabaja *dentro* del flujo tradicional — no lo reemplaza."**

- El médico puede empezar hablándole al sistema (modo IA) y el sistema estructura la nota SOAP, extrae diagnósticos, genera recetas.
- Pero si el médico prefiere, puede ir directamente a la pestaña de Órdenes y llenar el formulario manualmente — exactamente como lo haría en cualquier EHR.
- Los módulos de Agenda, Pacientes y Configuración son **completamente tradicionales** — cero curva de aprendizaje.
- La IA es una **capa de aceleración**, no un requisito. El sistema funciona perfectamente sin ella.

---

## 8. Módulos Implementados — Estado Actual

| Módulo | Tipo | Estado |
| :--- | :--- | :--- |
| Autenticación y roles (médico/asistente) | 🏥 Tradicional | ✅ Completo |
| Panel de Control (Dashboard) | 🏥 Tradicional | ✅ Completo |
| Gestión de Pacientes | 🏥 Tradicional | ✅ Completo |
| Agenda / Calendario | 🏥 Tradicional | ✅ Completo |
| Agenda del Día | 🏥 Tradicional | ✅ Completo |
| Configuración de práctica y plantillas | 🏥 Tradicional | ✅ Completo |
| Perfil Clínico — 7 pestañas | 🔀 Híbrido | ✅ Completo |
| Copiloto Clínico (voz + IA + SOAP) | 🤖 IA | ✅ Completo |
| Grabación de voz médica | 🤖 IA | ✅ Completo |
| Extracción FHIR desde texto libre | 🤖 IA | ✅ Completo |
| Motor de interacciones farmacológicas | 🤖 IA | ✅ Completo |
| Salida multi-canal (PDF/Email/WhatsApp/Pantalla) | 🔀 Híbrido | ✅ Completo |
| Interoperabilidad FHIR R4 + IPS | 🔀 Híbrido | ✅ Completo |
| Verificación documental con QR | 🔀 Híbrido | ✅ Completo |
| Notificaciones (Email + WhatsApp) | 🏥 Tradicional | ✅ Completo |

**Leyenda:** 🤖 IA = Módulo impulsado por inteligencia artificial · 🏥 Tradicional = Módulo EHR clásico · 🔀 Híbrido = Combina IA con controles manuales

---

## 9. Flujo Típico de una Consulta

```
1. El médico abre "Agenda del Día" → ve sus pacientes del día     [Tradicional]
2. Selecciona un paciente → se abre el "Perfil Clínico"            [Híbrido]
3. Opción A: Dicta la consulta por voz                              [IA]
   → La IA genera: nota SOAP + diagnósticos + medicamentos + órdenes
   → El médico revisa y ajusta lo que la IA generó
4. Opción B: Llena manualmente las pestañas de Órdenes, Receta     [Tradicional]
5. Revisa la pestaña de Farmacia → alerta de interacción           [IA]
6. Envía la receta por WhatsApp al paciente                         [Híbrido]
7. Imprime la orden de laboratorio con QR de verificación           [Híbrido]
8. Cierra la consulta → datos persistidos como FHIR R4              [IA]
```

---

## 10. Conclusión

Altia Health no pretende ser el futuro lejano de la medicina digital. Pretende ser **el puente pragmático** entre el expediente clínico electrónico que los médicos ya conocen y la inteligencia artificial que puede liberarlos de la carga administrativa.

La estrategia es clara:

- **Donde la IA aporta valor medible** (transcripción, estructuración, alertas de seguridad) → la IA está al frente.
- **Donde la familiaridad importa más que la innovación** (agenda, gestión de pacientes, configuración) → la interfaz es tradicional y predecible.
- **Donde ambos mundos convergen** (perfil clínico, salida documental, interoperabilidad) → el médico elige su nivel de automatización.

> *"No se trata de reemplazar al médico con IA. Se trata de devolverle al médico el tiempo que la burocracia le quitó."*

---

**Altia Health** · Historia Clínica Electrónica Híbrida · FHIR R4 · Google Gemini AI  
*Desarrollado en Costa Rica 🇨🇷 y España 🇪🇸*
