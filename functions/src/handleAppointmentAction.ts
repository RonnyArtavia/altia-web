/**
 * handleAppointmentAction — HTTP Firebase Function
 * Validates token and confirms or cancels an appointment.
 * Called from action links in notification emails/WhatsApp.
 *
 * URL: /handleAppointmentAction?token=<token>
 * Redirects to: https://altiaapp-emr.web.app/appointments/action/<token>?result=<ok|error>&msg=<message>
 */

import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import * as crypto from 'crypto'

if (!admin.apps.length) admin.initializeApp()
const db = admin.firestore()

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'altia-health-default-secret'

interface TokenPayload {
  o: string   // orgId
  a: string   // appointmentId
  act: string // action: 'confirm' | 'cancel'
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [dataB64, hash] = parts

  try {
    const payload = JSON.parse(Buffer.from(dataB64, 'base64url').toString()) as TokenPayload

    const expectedPayload = `${payload.o}:${payload.a}:${payload.act}:${TOKEN_SECRET}`
    const expectedHash = crypto.createHmac('sha256', TOKEN_SECRET).update(expectedPayload).digest('hex').slice(0, 32)

    if (hash !== expectedHash) return null

    return payload
  } catch {
    return null
  }
}

export const handleAppointmentAction = onRequest(
  { region: 'us-central1', memory: '256MiB', cors: true },
  async (req, res) => {
    const token = (req.query.token as string) || ''
    const baseUrl = 'https://altiaapp-emr.web.app'

    if (!token) {
      res.redirect(`${baseUrl}/appointments/action/invalid?result=error&msg=Token+no+proporcionado`)
      return
    }

    const payload = verifyToken(token)

    if (!payload) {
      res.redirect(`${baseUrl}/appointments/action/invalid?result=error&msg=Token+invalido+o+expirado`)
      return
    }

    const { o: orgId, a: appointmentId, act: action } = payload

    try {
      const apptRef = db.doc(`organizations/${orgId}/appointments/${appointmentId}`)
      const apptSnap = await apptRef.get()

      if (!apptSnap.exists) {
        res.redirect(`${baseUrl}/appointments/action/${token}?result=error&msg=Cita+no+encontrada`)
        return
      }

      const appt = apptSnap.data()!

      // Check if already processed
      if (appt.status === 'cancelled' && action === 'cancel') {
        res.redirect(`${baseUrl}/appointments/action/${token}?result=ok&msg=Esta+cita+ya+fue+cancelada+anteriormente`)
        return
      }
      if (appt.status === 'confirmed' && action === 'confirm') {
        res.redirect(`${baseUrl}/appointments/action/${token}?result=ok&msg=Esta+cita+ya+fue+confirmada+anteriormente`)
        return
      }

      // Apply action
      if (action === 'confirm') {
        await apptRef.update({
          status: 'confirmed',
          confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'patient',
          updatedRole: 'patient',
        })
        res.redirect(`${baseUrl}/appointments/action/${token}?result=ok&msg=Cita+confirmada+exitosamente`)
      } else if (action === 'cancel') {
        await apptRef.update({
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'patient',
          updatedRole: 'patient',
        })
        res.redirect(`${baseUrl}/appointments/action/${token}?result=ok&msg=Cita+cancelada+exitosamente`)
      } else {
        res.redirect(`${baseUrl}/appointments/action/${token}?result=error&msg=Accion+no+valida`)
      }
    } catch (err: any) {
      console.error('handleAppointmentAction error:', err)
      res.redirect(`${baseUrl}/appointments/action/${token}?result=error&msg=Error+procesando+solicitud`)
    }
  }
)
