/**
 * Notification Log Service
 * CRUD for organizations/{orgId}/notificationLogs
 */

import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface NotificationLog {
  id: string
  channel: 'email' | 'whatsapp'
  to: string
  subject?: string
  message?: string
  status: 'sent' | 'failed'
  error?: string
  messageId?: string
  createdAt: any
  createdBy: string
}

export async function getRecentLogs(
  organizationId: string,
  maxResults = 20
): Promise<NotificationLog[]> {
  const ref = collection(db, 'organizations', organizationId, 'notificationLogs')
  const q = query(ref, orderBy('createdAt', 'desc'), limit(maxResults))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationLog))
}
