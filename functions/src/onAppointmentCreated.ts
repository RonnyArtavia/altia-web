/**
 * onAppointmentCreated — Firestore trigger
 * Sends email + WhatsApp notification when a new appointment is created
 *
 * Reads patient data from: organizations/{orgId}/patients/{patientId}
 * Reads notification config from: organizations/{orgId}/settings/notifications
 * Logs to: organizations/{orgId}/notificationLogs
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'altia-health-default-secret'

function generateActionToken(appointmentId: string, orgId: string, action: string): string {
  const payload = `${orgId}:${appointmentId}:${action}:${TOKEN_SECRET}`
  const hash = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex').slice(0, 32)
  const data = Buffer.from(JSON.stringify({ o: orgId, a: appointmentId, act: action })).toString('base64url')
  return `${data}.${hash}`
}

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

export const onAppointmentCreated = onDocumentCreated(
  {
    document: 'organizations/{orgId}/appointments/{appointmentId}',
    region: 'us-central1',
    memory: '256MiB',
  },
  async (event) => {
    const snap = event.data
    if (!snap) return

    const data = snap.data()
    const orgId = event.params.orgId
    const appointmentId = event.params.appointmentId

    // Only notify for scheduled/new appointments
    if (data.status && data.status !== 'scheduled') return

    // Get patient contact info
    const patientSnap = await db
      .doc(`organizations/${orgId}/patients/${data.patientId}`)
      .get()

    const patient = patientSnap.data()
    if (!patient) return

    const patientEmail = patient.telecom?.find((t: any) => t.system === 'email')?.value || patient.email
    const patientPhone = patient.telecom?.find((t: any) => t.system === 'phone')?.value || patient.phone

    if (!patientEmail && !patientPhone) return

    // Get notification config
    const configSnap = await db
      .doc(`organizations/${orgId}/settings/notifications`)
      .get()
    const config = configSnap.data()

    // Build appointment info
    const startDate = data.start?.toDate?.() || new Date(data.start)
    const endDate = data.end?.toDate?.() || new Date(data.end)

    const baseUrl = `https://altiaapp-emr.web.app`
    const confirmToken = generateActionToken(appointmentId, orgId, 'confirm')
    const cancelToken = generateActionToken(appointmentId, orgId, 'cancel')
    const confirmUrl = `${baseUrl}/appointments/action/${confirmToken}`
    const cancelUrl = `${baseUrl}/appointments/action/${cancelToken}`

    const patientName = data.patientName || patient.name || 'Paciente'
    const doctorName = data.doctorName || 'su medico'

    // Send email
    if (patientEmail && config?.email) {
      try {
        const { sendEmail } = await import('./sendEmailHelper')
        await sendEmail(config.email, {
          to: patientEmail,
          subject: `Cita confirmada - ${formatDate(startDate)}`,
          html: buildEmailHtml({
            patientName,
            doctorName,
            date: formatDate(startDate),
            time: `${formatTime(startDate)} - ${formatTime(endDate)}`,
            type: data.type === 'telemedicine' ? 'Telemedicina' : 'Presencial',
            reason: data.reason || '',
            confirmUrl,
            cancelUrl,
          }),
        })

        await db.collection(`organizations/${orgId}/notificationLogs`).add({
          channel: 'email',
          to: patientEmail,
          subject: `Cita confirmada - ${formatDate(startDate)}`,
          status: 'sent',
          appointmentId,
          trigger: 'appointment_created',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
        })
      } catch (err: any) {
        await db.collection(`organizations/${orgId}/notificationLogs`).add({
          channel: 'email',
          to: patientEmail,
          status: 'failed',
          error: err.message,
          appointmentId,
          trigger: 'appointment_created',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
        })
      }
    }

    // Send WhatsApp
    if (patientPhone && config?.whatsapp?.webhookUrl) {
      try {
        const message = [
          `Hola ${patientName}, su cita ha sido programada:`,
          `Fecha: ${formatDate(startDate)}`,
          `Hora: ${formatTime(startDate)} - ${formatTime(endDate)}`,
          `Doctor: ${doctorName}`,
          data.reason ? `Motivo: ${data.reason}` : '',
          '',
          `Para confirmar: ${confirmUrl}`,
          `Para cancelar: ${cancelUrl}`,
        ].filter(Boolean).join('\n')

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

        await db.collection(`organizations/${orgId}/notificationLogs`).add({
          channel: 'whatsapp',
          to: patientPhone,
          status: response.ok ? 'sent' : 'failed',
          error: response.ok ? undefined : `HTTP ${response.status}`,
          appointmentId,
          trigger: 'appointment_created',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
        })
      } catch (err: any) {
        await db.collection(`organizations/${orgId}/notificationLogs`).add({
          channel: 'whatsapp',
          to: patientPhone,
          status: 'failed',
          error: err.message,
          appointmentId,
          trigger: 'appointment_created',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdBy: 'system',
        })
      }
    }
  }
)

interface EmailTemplateData {
  patientName: string
  doctorName: string
  date: string
  time: string
  type: string
  reason: string
  confirmUrl: string
  cancelUrl: string
}

function buildEmailHtml(d: EmailTemplateData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Altia Health</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Confirmacion de Cita</p>
  </div>

  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
    <p>Hola <strong>${d.patientName}</strong>,</p>
    <p>Su cita ha sido programada con los siguientes detalles:</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Fecha</td><td style="padding: 8px 0; font-weight: 600;">${d.date}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Hora</td><td style="padding: 8px 0; font-weight: 600;">${d.time}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Doctor</td><td style="padding: 8px 0; font-weight: 600;">${d.doctorName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Modalidad</td><td style="padding: 8px 0; font-weight: 600;">${d.type}</td></tr>
        ${d.reason ? `<tr><td style="padding: 8px 0; color: #64748b;">Motivo</td><td style="padding: 8px 0;">${d.reason}</td></tr>` : ''}
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${d.confirmUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">Confirmar Cita</a>
      <a href="${d.cancelUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 0 8px;">Cancelar Cita</a>
    </div>

    <p style="color: #64748b; font-size: 13px; text-align: center;">Si tiene preguntas, contacte directamente al consultorio.</p>
  </div>

  <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">
    Altia Health &mdash; Sistema de gestion medica
  </div>
</body>
</html>`
}
