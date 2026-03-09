/**
 * Notification Service — Unified interface for email and WhatsApp
 * Calls Firebase callable functions (sendEmail / sendWhatsApp)
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebase'

export interface NotificationResult {
  success: boolean
  channel: 'email' | 'whatsapp'
  error?: string
  logId?: string
}

// ─── Email ──────────────────────────────────────────────────

interface SendEmailParams {
  to: string
  subject: string
  htmlBody: string
  attachmentBase64?: string
  attachmentName?: string
  organizationId: string
}

export async function sendEmailNotification(params: SendEmailParams): Promise<NotificationResult> {
  try {
    const fn = httpsCallable<SendEmailParams, { success: boolean; messageId?: string; logId?: string }>(functions, 'sendEmail')
    const result = await fn(params)
    return { success: true, channel: 'email', logId: result.data.logId }
  } catch (err: any) {
    console.error('Email notification error:', err)
    return { success: false, channel: 'email', error: err.message || 'Error al enviar email' }
  }
}

// ─── WhatsApp ───────────────────────────────────────────────

interface SendWhatsAppParams {
  to: string
  message: string
  mediaUrl?: string
  templateId?: string
  variables?: Record<string, string>
  organizationId: string
}

export async function sendWhatsAppNotification(params: SendWhatsAppParams): Promise<NotificationResult> {
  try {
    const fn = httpsCallable<SendWhatsAppParams, { success: boolean; logId?: string }>(functions, 'sendWhatsApp')
    const result = await fn(params)
    return { success: true, channel: 'whatsapp', logId: result.data.logId }
  } catch (err: any) {
    console.error('WhatsApp notification error:', err)
    return { success: false, channel: 'whatsapp', error: err.message || 'Error al enviar WhatsApp' }
  }
}

// ─── Unified ────────────────────────────────────────────────

export async function sendNotification(
  channel: 'email' | 'whatsapp',
  params: {
    to: string
    subject?: string
    message: string
    htmlBody?: string
    attachmentBase64?: string
    attachmentName?: string
    mediaUrl?: string
    organizationId: string
  }
): Promise<NotificationResult> {
  if (channel === 'email') {
    return sendEmailNotification({
      to: params.to,
      subject: params.subject || 'Documento medico',
      htmlBody: params.htmlBody || params.message,
      attachmentBase64: params.attachmentBase64,
      attachmentName: params.attachmentName,
      organizationId: params.organizationId,
    })
  }

  return sendWhatsAppNotification({
    to: params.to,
    message: params.message,
    mediaUrl: params.mediaUrl,
    organizationId: params.organizationId,
  })
}
