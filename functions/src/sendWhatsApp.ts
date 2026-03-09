/**
 * sendWhatsApp — Callable Firebase Function
 * Sends WhatsApp messages via n8n webhook
 *
 * Reads config from: organizations/{orgId}/settings/notifications
 * Logs results to:   organizations/{orgId}/notificationLogs
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

interface SendWhatsAppRequest {
  to: string
  message: string
  mediaUrl?: string
  templateId?: string
  variables?: Record<string, string>
  organizationId: string
}

export const sendWhatsApp = onCall<SendWhatsAppRequest>(
  { region: 'us-central1', memory: '256MiB' },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
    }

    const { to, message, mediaUrl, templateId, variables, organizationId } = request.data

    if (!to || !message || !organizationId) {
      throw new HttpsError('invalid-argument', 'Faltan campos requeridos: to, message, organizationId')
    }

    // Read WhatsApp config from Firestore
    const configSnap = await db
      .doc(`organizations/${organizationId}/settings/notifications`)
      .get()

    const config = configSnap.data()?.whatsapp
    if (!config?.webhookUrl) {
      throw new HttpsError('failed-precondition', 'Configuración de WhatsApp (webhook n8n) no encontrada')
    }

    // Build payload for n8n webhook
    const payload: Record<string, unknown> = {
      to: to.replace(/[^\d+]/g, ''), // Clean phone number
      message,
      organizationId,
      timestamp: new Date().toISOString(),
    }

    if (mediaUrl) payload.mediaUrl = mediaUrl
    if (templateId) payload.templateId = templateId
    if (variables) payload.variables = variables

    const logRef = db.collection(`organizations/${organizationId}/notificationLogs`).doc()

    try {
      // Send to n8n webhook
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`n8n webhook error ${response.status}: ${errorText}`)
      }

      const responseData = await response.json().catch(() => ({}))

      // Log success
      await logRef.set({
        channel: 'whatsapp',
        to,
        message: message.substring(0, 200),
        status: 'sent',
        webhookResponse: JSON.stringify(responseData).substring(0, 500),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      })

      return { success: true, logId: logRef.id }
    } catch (err: any) {
      // Log failure
      await logRef.set({
        channel: 'whatsapp',
        to,
        message: message.substring(0, 200),
        status: 'failed',
        error: err.message || 'Unknown error',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
      })

      throw new HttpsError('internal', `Error al enviar WhatsApp: ${err.message}`)
    }
  }
)
