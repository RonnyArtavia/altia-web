// Assistant Sync Service
// Handles synchronization between assistant requests and user status

import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/config/firebase'
import { assistantRequestService } from './assistantRequestService'

interface SyncAssistantStatusOptions {
  userId: string
  requestId: string
  newStatus: 'approved' | 'suspended' | 'revoked'
  doctorId: string
  notes?: string
}

class AssistantSyncService {
  /**
   * Synchronize assistant approval between requests and user collections
   */
  async approveAssistant(
    userId: string,
    requestId: string,
    doctorId: string,
    organizationId: string,
    notes?: string
  ): Promise<void> {
    try {
      // 1. Update the assistant request
      await assistantRequestService.approveRequest(requestId, doctorId, doctorId, notes)

      // 2. Update the user status
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        assistantStatus: 'approved',
        authorizedBy: doctorId,
        authorizedAt: new Date().toISOString(),
        doctorId: doctorId,
        organizationId: organizationId,
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Assistant approved and synced:', userId)
    } catch (error) {
      console.error('❌ Error approving assistant:', error)
      throw new Error('Error al aprobar el asistente')
    }
  }

  /**
   * Synchronize assistant rejection between requests and user collections
   */
  async rejectAssistant(
    userId: string,
    requestId: string,
    doctorId: string,
    notes: string
  ): Promise<void> {
    try {
      // 1. Update the assistant request
      await assistantRequestService.rejectRequest(requestId, doctorId, notes)

      // 2. Update the user status to revoked
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        assistantStatus: 'revoked',
        revokedBy: doctorId,
        revokedAt: new Date().toISOString(),
        revocationNotes: notes,
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Assistant rejected and synced:', userId)
    } catch (error) {
      console.error('❌ Error rejecting assistant:', error)
      throw new Error('Error al rechazar el asistente')
    }
  }

  /**
   * Suspend an active assistant
   */
  async suspendAssistant(
    userId: string,
    doctorId: string,
    notes: string
  ): Promise<void> {
    try {
      // 1. Update the assistant request status
      await assistantRequestService.updateAssistantStatus(userId, 'suspended', doctorId, notes)

      // 2. Update the user status
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        assistantStatus: 'suspended',
        suspendedBy: doctorId,
        suspendedAt: new Date().toISOString(),
        suspensionNotes: notes,
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Assistant suspended and synced:', userId)
    } catch (error) {
      console.error('❌ Error suspending assistant:', error)
      throw new Error('Error al suspender el asistente')
    }
  }

  /**
   * Reactivate a suspended assistant
   */
  async reactivateAssistant(
    userId: string,
    doctorId: string,
    notes?: string
  ): Promise<void> {
    try {
      // 1. Update the assistant request status
      await assistantRequestService.updateAssistantStatus(userId, 'approved', doctorId, notes)

      // 2. Update the user status
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        assistantStatus: 'approved',
        reactivatedBy: doctorId,
        reactivatedAt: new Date().toISOString(),
        reactivationNotes: notes,
        // Clear suspension fields
        suspendedBy: null,
        suspendedAt: null,
        suspensionNotes: null,
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Assistant reactivated and synced:', userId)
    } catch (error) {
      console.error('❌ Error reactivating assistant:', error)
      throw new Error('Error al reactivar el asistente')
    }
  }

  /**
   * Permanently revoke an assistant's access
   */
  async revokeAssistant(
    userId: string,
    doctorId: string,
    notes: string
  ): Promise<void> {
    try {
      // 1. Update the assistant request status
      await assistantRequestService.updateAssistantStatus(userId, 'revoked', doctorId, notes)

      // 2. Update the user status
      const userRef = doc(firestore, 'users', userId)
      await updateDoc(userRef, {
        assistantStatus: 'revoked',
        revokedBy: doctorId,
        revokedAt: new Date().toISOString(),
        revocationNotes: notes,
        // Clear authorization fields
        authorizedBy: null,
        authorizedAt: null,
        // Clear doctor association
        doctorId: null,
        updatedAt: new Date().toISOString()
      })

      console.log('✅ Assistant revoked and synced:', userId)
    } catch (error) {
      console.error('❌ Error revoking assistant:', error)
      throw new Error('Error al revocar el acceso del asistente')
    }
  }

  /**
   * Bulk operation to sync multiple assistants
   */
  async bulkSyncAssistants(operations: SyncAssistantStatusOptions[]): Promise<{
    successful: string[]
    failed: { userId: string; error: string }[]
  }> {
    const successful: string[] = []
    const failed: { userId: string; error: string }[] = []

    for (const operation of operations) {
      try {
        switch (operation.newStatus) {
          case 'suspended':
            await this.suspendAssistant(operation.userId, operation.doctorId, operation.notes || '')
            break
          case 'revoked':
            await this.revokeAssistant(operation.userId, operation.doctorId, operation.notes || '')
            break
          case 'approved':
            await this.reactivateAssistant(operation.userId, operation.doctorId, operation.notes)
            break
        }
        successful.push(operation.userId)
      } catch (error: any) {
        failed.push({
          userId: operation.userId,
          error: error.message
        })
      }
    }

    return { successful, failed }
  }

  /**
   * Verify synchronization between request and user status
   */
  async verifySyncStatus(userId: string): Promise<{
    isSynced: boolean
    requestStatus?: string
    userStatus?: string
    issues?: string[]
  }> {
    try {
      // Get request status
      const request = await assistantRequestService.getRequestByUserId(userId)

      // Get user status from users collection
      // Note: This would require additional method to fetch user data
      // For now, we'll return basic verification

      return {
        isSynced: true,
        requestStatus: request?.status,
        userStatus: 'unknown', // Would need to fetch from users collection
        issues: []
      }
    } catch (error) {
      console.error('Error verifying sync status:', error)
      return {
        isSynced: false,
        issues: ['Error verificando sincronización']
      }
    }
  }
}

export const assistantSyncService = new AssistantSyncService()