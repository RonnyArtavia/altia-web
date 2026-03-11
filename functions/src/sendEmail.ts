/**
 * sendEmail — Callable Firebase Function
 * Sends email via nodemailer with dynamic provider support (Gmail, SMTP, SES)
 *
 * Reads credentials from: organizations/{orgId}/settings/notifications
 * Logs results to:        organizations/{orgId}/notificationLogs
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

interface SendEmailRequest {
  to: string
  subject: string
  htmlBody: string
  attachmentBase64?: string
  attachmentName?: string
  organizationId: string
}

export const sendEmail = onCall<SendEmailRequest>(
  { region: 'us-central1', memory: '256MiB' },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
    }

    const { to, subject, htmlBody, attachmentBase64, attachmentName, organizationId } = request.data

    if (!to || !subject || !organizationId) {
      throw new HttpsError('invalid-argument', 'Faltan campos requeridos: to, subject, organizationId')
    }

    // Read email config from Firestore
    const configSnap = await db
      .doc(`organizations/${organizationId}/settings/notifications`)
      .get()

    const config = configSnap.data()?.email
    if (!config?.host && !config?.service) {
      throw new HttpsError('failed-precondition', 'Configuración de email no encontrada')
    }

    // Build transporter based on provider
    let transportConfig: nodemailer.TransportOptions

    if (config.service === 'gmail') {
      // Gmail with OAuth2 or app password
      transportConfig = {
        service: 'gmail',
        auth: {
          user: config.user,
          pass: config.password,
        },
      } as nodemailer.TransportOptions
    } else {
      // Generic SMTP (M365, SES, custom)
      transportConfig = {
        host: config.host,
        port: config.port || 587,
        secure: config.secure || false,
        auth: {
          user: config.user,
          pass: config.password,
        },
      } as nodemailer.TransportOptions
    }

    const transporter = nodemailer.createTransport(transportConfig)

    // Build message
    const mailOptions: nodemailer.SendMailOptions = {
      from: config.from || config.user,
      to,
      subject,
      html: htmlBody,
    }

    if (attachmentBase64 && attachmentName) {
      mailOptions.attachments = [{
        filename: attachmentName,
        content: Buffer.from(attachmentBase64, 'base64'),
      }]
    }

    // Send
    const logRef = db.collection(`organizations/${organizationId}/notificationLogs`).doc()

    try {
      const info = await transporter.sendMail(mailOptions)

      // Log success
      await logRef.set({
        channel: 'email',
        to,
        subject,
        status: 'sent',
        messageId: info.messageId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      })

      return { success: true, messageId: info.messageId, logId: logRef.id }
    } catch (err: any) {
      // Log failure
      await logRef.set({
        channel: 'email',
        to,
        subject,
        status: 'failed',
        error: err.message || 'Unknown error',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      })

      throw new HttpsError('internal', `Error al enviar email: ${err.message}`)
    }
  }
)
