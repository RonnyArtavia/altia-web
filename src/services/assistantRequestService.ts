// Assistant Request Service
// Handles assistant registration requests and approval workflow

import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface AssistantRequest {
  id: string
  userId: string
  email: string
  fullName: string
  doctorId?: string
  doctorName?: string
  doctorLicenseNumber: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: Date
  processedAt?: Date
  processedBy?: string
  notes?: string
}

class AssistantRequestService {
  private readonly collection = 'assistantRequests'

  /**
   * Create a new assistant request
   */
  async createAssistantRequest(
    userId: string,
    email: string,
    fullName: string,
    doctorId: string,
    doctorName: string,
    doctorLicenseNumber: string
  ): Promise<void> {
    try {
      const requestId = `${userId}_${Date.now()}`

      const assistantRequest: Omit<AssistantRequest, 'id'> = {
        userId,
        email: email.toLowerCase(),
        fullName,
        doctorId: doctorId || '',
        doctorName: doctorName || '',
        doctorLicenseNumber,
        status: 'pending',
        requestedAt: new Date()
      }

      const docRef = doc(db, this.collection, requestId)
      await setDoc(docRef, {
        ...assistantRequest,
        requestedAt: Timestamp.now()
      })

      console.log('✅ Assistant request created successfully:', requestId)
    } catch (error) {
      console.error('❌ Error creating assistant request:', error)
      throw new Error('Error al crear la solicitud de asistente')
    }
  }

  /**
   * Get all pending assistant requests
   */
  async getPendingRequests(): Promise<AssistantRequest[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where('status', '==', 'pending')
      )

      const querySnapshot = await getDocs(q)
      const requests: AssistantRequest[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate()
        } as AssistantRequest)
      })

      return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    } catch (error) {
      console.error('Error fetching pending requests:', error)
      throw new Error('Error al obtener las solicitudes pendientes')
    }
  }

  /**
   * Get assistant request by user ID
   */
  async getRequestByUserId(userId: string): Promise<AssistantRequest | null> {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      const data = doc.data()

      return {
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate() || new Date(),
        processedAt: data.processedAt?.toDate()
      } as AssistantRequest
    } catch (error) {
      console.error('Error fetching request by user ID:', error)
      throw new Error('Error al obtener la solicitud del usuario')
    }
  }

  /**
   * Approve an assistant request
   */
  async approveRequest(
    requestId: string,
    doctorId: string,
    processedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collection, requestId)

      await setDoc(docRef, {
        status: 'approved',
        doctorId,
        processedAt: Timestamp.now(),
        processedBy,
        notes: notes || ''
      }, { merge: true })

      console.log('✅ Assistant request approved:', requestId)
    } catch (error) {
      console.error('❌ Error approving request:', error)
      throw new Error('Error al aprobar la solicitud')
    }
  }

  /**
   * Reject an assistant request
   */
  async rejectRequest(
    requestId: string,
    processedBy: string,
    notes: string
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collection, requestId)

      await setDoc(docRef, {
        status: 'rejected',
        processedAt: Timestamp.now(),
        processedBy,
        notes
      }, { merge: true })

      console.log('✅ Assistant request rejected:', requestId)
    } catch (error) {
      console.error('❌ Error rejecting request:', error)
      throw new Error('Error al rechazar la solicitud')
    }
  }

  /**
   * Find doctor by license number (for validation)
   */
  async findDoctorByLicense(licenseNumber: string): Promise<{ id: string; name: string } | null> {
    try {
      // Search in users collection for doctors with this license
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'doctor'),
        where('medicalLicense', '==', licenseNumber)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doctorDoc = querySnapshot.docs[0]
      const doctorData = doctorDoc.data()

      return {
        id: doctorDoc.id,
        name: doctorData.name || doctorData.displayName || 'Médico sin nombre'
      }
    } catch (error) {
      console.error('Error finding doctor by license:', error)
      return null
    }
  }

  /**
   * Validate doctor license number and get doctor info
   */
  async validateDoctorLicense(licenseNumber: string): Promise<{
    isValid: boolean
    doctorId?: string
    doctorName?: string
  }> {
    try {
      const doctor = await this.findDoctorByLicense(licenseNumber)

      if (doctor) {
        return {
          isValid: true,
          doctorId: doctor.id,
          doctorName: doctor.name
        }
      } else {
        return {
          isValid: false
        }
      }
    } catch (error) {
      console.error('Error validating doctor license:', error)
      return {
        isValid: false
      }
    }
  }

  /**
   * Get all requests for a specific doctor
   */
  async getRequestsByDoctor(doctorId: string): Promise<AssistantRequest[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where('doctorId', '==', doctorId)
      )

      const querySnapshot = await getDocs(q)
      const requests: AssistantRequest[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate()
        } as AssistantRequest)
      })

      return requests.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    } catch (error) {
      console.error('Error fetching requests by doctor:', error)
      throw new Error('Error al obtener las solicitudes del médico')
    }
  }

  /**
   * Get all approved assistants for a doctor
   */
  async getApprovedAssistants(doctorId: string): Promise<AssistantRequest[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where('doctorId', '==', doctorId),
        where('status', '==', 'approved')
      )

      const querySnapshot = await getDocs(q)
      const requests: AssistantRequest[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        requests.push({
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate()
        } as AssistantRequest)
      })

      return requests.sort((a, b) => (b.processedAt?.getTime() || 0) - (a.processedAt?.getTime() || 0))
    } catch (error) {
      console.error('Error fetching approved assistants:', error)
      throw new Error('Error al obtener los asistentes aprobados')
    }
  }

  /**
   * Update assistant status (for suspensions, reactivations, etc.)
   */
  async updateAssistantStatus(
    userId: string,
    newStatus: 'approved' | 'suspended' | 'revoked',
    processedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      // Find the request by userId
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('No se encontró la solicitud del asistente')
      }

      const requestDoc = querySnapshot.docs[0]
      const docRef = doc(db, this.collection, requestDoc.id)

      await setDoc(docRef, {
        status: newStatus,
        processedAt: Timestamp.now(),
        processedBy,
        notes: notes || ''
      }, { merge: true })

      console.log(`✅ Assistant status updated to ${newStatus}:`, requestDoc.id)
    } catch (error) {
      console.error(`❌ Error updating assistant status:`, error)
      throw new Error(`Error al actualizar el estado del asistente`)
    }
  }
}

export const assistantRequestService = new AssistantRequestService()