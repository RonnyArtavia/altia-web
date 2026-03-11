/**
 * Firebase Cloud Functions — Alta / Altia Health
 * Callable functions, triggers, and scheduled functions
 */

// Callable functions
export { sendEmail } from './sendEmail'
export { sendWhatsApp } from './sendWhatsApp'

// Firestore triggers
export { onAppointmentCreated } from './onAppointmentCreated'

// Scheduled functions
export { sendAppointmentReminders } from './sendAppointmentReminders'

// HTTP functions
export { handleAppointmentAction } from './handleAppointmentAction'
