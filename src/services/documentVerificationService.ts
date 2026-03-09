/**
 * Document Verification Service
 * Creates verification records in Firestore and generates verification URLs
 * Collection: organizations/{orgId}/documents
 */

import { collection, doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface VerificationDocument {
  id: string
  organizationId: string
  type: 'prescription' | 'labOrder' | 'referral'
  patientName: string
  doctorName: string
  itemCount: number
  itemSummary: string  // Brief description of contents
  createdAt: string
  createdBy: string    // Doctor UID
  isValid: boolean
}

/**
 * Create a verification record and return its ID + URL
 */
export async function createVerificationRecord(
  organizationId: string,
  data: Omit<VerificationDocument, 'id' | 'createdAt' | 'isValid'>
): Promise<{ id: string; url: string }> {
  const colRef = collection(db, 'organizations', organizationId, 'documents')
  const docRef = doc(colRef)
  const id = docRef.id

  const record: VerificationDocument = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
    isValid: true,
  }

  await setDoc(docRef, record)

  const baseUrl = window.location.origin
  const url = `${baseUrl}/verify/${organizationId}/${id}`

  return { id, url }
}

/**
 * Fetch a verification record (for the public verification page)
 */
export async function getVerificationRecord(
  organizationId: string,
  documentId: string
): Promise<VerificationDocument | null> {
  const docRef = doc(db, 'organizations', organizationId, 'documents', documentId)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return snap.data() as VerificationDocument
}
