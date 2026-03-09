/**
 * sendAppointmentReminders — Scheduled Firebase Function
 * Runs every 15 minutes. Sends reminder notifications for upcoming appointments.
 *
 * Reads reminder config from: organizations/{orgId}/settings/notifications
 *   → field: appointmentReminderMinutes (default: 60)
 * Skips appointments where reminderSentAt is already set.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
}

export const sendAppointmentReminders = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    // Get all organizations
    const orgsSnap = await db.collection('organizations').get()

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id

      // Get notification config
      const configSnap = await db
        .doc(`organizations/${orgId}/settings/notifications`)
        .get()
      const config = configSnap.data()

      // Skip if no notification channels configured
      if (!config?.email && !config?.whatsapp?.webhookUrl) continue

      const reminderMinutes = config?.appointmentReminderMinutes || 60

      // Query upcoming appointments within the reminder window
      const now = new Date()
      const windowEnd = new Date(now.getTime() + reminderMinutes * 60 * 1000)

      const appointmentsSnap = await db
        .collection(`organizations/${orgId}/appointments`)
        .where('start', '>=', admin.firestore.Timestamp.fromDate(now))
        .where('start', '<=', admin.firestore.Timestamp.fromDate(windowEnd))
        .where('status', 'in', ['scheduled', 'confirmed'])
        .get()

      for (const apptDoc of appointmentsSnap.docs) {
        const appt = apptDoc.data()

        // Skip if reminder already sent
        if (appt.reminderSentAt) continue

        // Get patient contact info
        const patientSnap = await db
          .doc(`organizations/${orgId}/patients/${appt.patientId}`)
          .get()
        const patient = patientSnap.data()
        if (!patient) continue

        const patientEmail = patient.telecom?.find((t: any) => t.system === 'email')?.value || patient.email
        const patientPhone = patient.telecom?.find((t: any) => t.system === 'phone')?.value || patient.phone

        if (!patientEmail && !patientPhone) continue

        const startDate = appt.start?.toDate?.() || new Date(appt.start)
        const endDate = appt.end?.toDate?.() || new Date(appt.end)
        const patientName = appt.patientName || patient.name || 'Paciente'
        const doctorName = appt.doctorName || 'su medico'
        const minutesUntil = Math.round((startDate.getTime() - now.getTime()) / 60000)

        let sent = false

        // Send email reminder
        if (patientEmail && config?.email) {
          try {
            const { sendEmail } = await import('./sendEmailHelper')
            await sendEmail(config.email, {
              to: patientEmail,
              subject: `Recordatorio: Cita en ${minutesUntil} minutos`,
              html: buildReminderEmailHtml({
                patientName,
                doctorName,
                date: formatDate(startDate),
                time: `${formatTime(startDate)} - ${formatTime(endDate)}`,
                minutesUntil,
                type: appt.type === 'telemedicine' ? 'Telemedicina' : 'Presencial',
              }),
            })
            sent = true

            await db.collection(`organizations/${orgId}/notificationLogs`).add({
              channel: 'email',
              to: patientEmail,
              subject: `Recordatorio de cita`,
              status: 'sent',
              appointmentId: apptDoc.id,
              trigger: 'appointment_reminder',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'system',
            })
          } catch (err: any) {
            await db.collection(`organizations/${orgId}/notificationLogs`).add({
              channel: 'email',
              to: patientEmail,
              status: 'failed',
              error: err.message,
              appointmentId: apptDoc.id,
              trigger: 'appointment_reminder',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'system',
            })
          }
        }

        // Send WhatsApp reminder
        if (patientPhone && config?.whatsapp?.webhookUrl) {
          try {
            const message = [
              `Hola ${patientName}, le recordamos su cita:`,
              `Fecha: ${formatDate(startDate)}`,
              `Hora: ${formatTime(startDate)} - ${formatTime(endDate)}`,
              `Doctor: ${doctorName}`,
              `Faltan aproximadamente ${minutesUntil} minutos.`,
            ].join('\n')

            const response = await fetch(config.whatsapp.webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(config.whatsapp.apiKey ? { 'Authorization': `Bearer ${config.whatsapp.apiKey}` } : {}),
              },
              body: JSON.stringify({
                to: patientPhone.replace(/[^\d+]/g, ''),
                message,
                organizationId: orgId,
              }),
            })

            if (response.ok) sent = true

            await db.collection(`organizations/${orgId}/notificationLogs`).add({
              channel: 'whatsapp',
              to: patientPhone,
              status: response.ok ? 'sent' : 'failed',
              error: response.ok ? undefined : `HTTP ${response.status}`,
              appointmentId: apptDoc.id,
              trigger: 'appointment_reminder',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'system',
            })
          } catch (err: any) {
            await db.collection(`organizations/${orgId}/notificationLogs`).add({
              channel: 'whatsapp',
              to: patientPhone,
              status: 'failed',
              error: err.message,
              appointmentId: apptDoc.id,
              trigger: 'appointment_reminder',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'system',
            })
          }
        }

        // Mark reminder as sent
        if (sent) {
          await apptDoc.ref.update({
            reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
      }
    }
  }
)

interface ReminderEmailData {
  patientName: string
  doctorName: string
  date: string
  time: string
  minutesUntil: number
  type: string
}

function buildReminderEmailHtml(d: ReminderEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Altia Health</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Recordatorio de Cita</p>
  </div>

  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
    <p>Hola <strong>${d.patientName}</strong>,</p>
    <p>Le recordamos que tiene una cita programada en aproximadamente <strong>${d.minutesUntil} minutos</strong>:</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Fecha</td><td style="padding: 8px 0; font-weight: 600;">${d.date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Hora</td><td style="padding: 8px 0; font-weight: 600;">${d.time}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Doctor</td><td style="padding: 8px 0; font-weight: 600;">${d.doctorName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Modalidad</td><td style="padding: 8px 0; font-weight: 600;">${d.type}</td></tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 13px; text-align: center;">Por favor, llegue con al menos 10 minutos de anticipacion.</p>
  </div>

  <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
    Altia Health &mdash; Sistema de gestion medica
  </div>
</body>
</html>`
}
