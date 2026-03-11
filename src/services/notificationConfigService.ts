/**
 * Notification Config Service
 * CRUD for organizations/{orgId}/settings/notifications
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface EmailConfig {
  service?: 'gmail' | ''
  host?: string
  port?: number
  secure?: boolean
  user: string
  password: string
  from?: string
}

export interface WhatsAppConfig {
  webhookUrl: string
  apiKey?: string
}

export interface NotificationConfig {
  email?: EmailConfig
  whatsapp?: WhatsAppConfig
}

export async function getNotificationConfig(
  organizationId: string
): Promise<NotificationConfig> {
  const ref = doc(db, 'organizations', organizationId, 'settings', 'notifications')
  const snap = await getDoc(ref)
  return (snap.data() as NotificationConfig) || {}
}

export async function saveNotificationConfig(
  organizationId: string,
  config: NotificationConfig
): Promise<void> {
  const ref = doc(db, 'organizations', organizationId, 'settings', 'notifications')
  await setDoc(ref, config, { merge: true })
}
