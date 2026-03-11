/**
 * Template Configuration Service
 * CRUD for document templates stored in organizations/{orgId}/settings/templates
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/config/firebase'

export interface TemplateConfig {
  // Doctor / clinic info
  doctorName: string
  specialty: string
  license: string           // Medical license number (cédula)
  clinicName: string
  clinicAddress: string
  clinicPhone: string
  clinicEmail: string

  // Branding
  logoUrl: string           // Firebase Storage URL
  signatureUrl: string      // Digital signature/stamp URL

  // PDF footer
  footerText: string

  updatedAt: string
}

const DEFAULTS: TemplateConfig = {
  doctorName: '',
  specialty: '',
  license: '',
  clinicName: '',
  clinicAddress: '',
  clinicPhone: '',
  clinicEmail: '',
  logoUrl: '',
  signatureUrl: '',
  footerText: '',
  updatedAt: new Date().toISOString(),
}

function templateDocRef(organizationId: string) {
  return doc(db, 'organizations', organizationId, 'settings', 'templates')
}

export async function getTemplateConfig(organizationId: string): Promise<TemplateConfig> {
  const snap = await getDoc(templateDocRef(organizationId))
  if (!snap.exists()) return { ...DEFAULTS }
  return { ...DEFAULTS, ...snap.data() } as TemplateConfig
}

export async function saveTemplateConfig(
  organizationId: string,
  config: Partial<TemplateConfig>
): Promise<void> {
  await setDoc(templateDocRef(organizationId), {
    ...config,
    updatedAt: new Date().toISOString(),
  }, { merge: true })
}

export async function uploadTemplateImage(
  organizationId: string,
  file: File,
  type: 'logo' | 'signature'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `organizations/${organizationId}/templates/${type}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
