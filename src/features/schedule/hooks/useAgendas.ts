/**
 * useAgendas — Hooks para gestión de agendas RF-C01
 */

import { useState, useEffect, useMemo } from 'react'
import {
  subscribeToAgendas,
  createAgenda,
  updateAgenda,
  deleteAgenda,
  toggleAgendaEnabled,
  validateNoOverlap,
  subscribeToBlocks,
  createBlock,
  deleteBlock,
} from '../services/agendaService'
import type { Agenda, DayKey, DaySchedule, ScheduleBlock } from '../types/agenda'

// ─── useAgendas ───────────────────────────────────────────────

interface UseAgendasOptions {
  organizationId: string
  doctorId?: string | null
  enabled?: boolean
}

export function useAgendas({ organizationId, doctorId = null, enabled = true }: UseAgendasOptions) {
  const [agendas, setAgendas] = useState<Agenda[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled || !organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeToAgendas(organizationId, doctorId ?? null, (data) => {
      setAgendas(data)
      setLoading(false)
    })

    return unsub
  }, [organizationId, doctorId, enabled])

  return { agendas, loading }
}

// ─── useAgendaMutations ───────────────────────────────────────

export function useAgendaMutations(organizationId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const create = async (data: Omit<Agenda, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    setIsSubmitting(true)
    try {
      return await createAgenda(organizationId, data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const update = async (agendaId: string, data: Partial<Omit<Agenda, 'id' | 'createdAt'>>): Promise<void> => {
    setIsSubmitting(true)
    try {
      await updateAgenda(organizationId, agendaId, data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async (agendaId: string): Promise<void> => {
    setIsSubmitting(true)
    try {
      await deleteAgenda(organizationId, agendaId)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggle = async (agendaId: string, enabled: boolean): Promise<void> => {
    await toggleAgendaEnabled(organizationId, agendaId, enabled)
  }

  const checkOverlap = async (
    schedule: Record<DayKey, DaySchedule>,
    doctorId: string,
    excludeAgendaId?: string
  ) => {
    return validateNoOverlap(organizationId, schedule, doctorId, excludeAgendaId)
  }

  return { create, update, remove, toggle, checkOverlap, isSubmitting }
}

// ─── useScheduleBlocks ────────────────────────────────────────

export function useScheduleBlocks(organizationId: string, agendaId: string | null) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!organizationId || !agendaId) {
      setBlocks([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsub = subscribeToBlocks(organizationId, agendaId, (data) => {
      setBlocks(data)
      setLoading(false)
    })

    return unsub
  }, [organizationId, agendaId])

  const addBlock = async (data: Omit<ScheduleBlock, 'id' | 'createdAt'>) => {
    if (!agendaId) return
    await createBlock(organizationId, agendaId, data)
  }

  const removeBlock = async (blockId: string) => {
    if (!agendaId) return
    await deleteBlock(organizationId, agendaId, blockId)
  }

  return { blocks, loading, addBlock, removeBlock }
}

// ─── useMultiAgendaBlocks ─────────────────────────────────────
/**
 * Suscripción a bloques de múltiples agendas para overlays visuales en calendario
 */
export function useMultiAgendaBlocks(organizationId: string, agendaIds: string[]) {
  const [blocksByAgenda, setBlocksByAgenda] = useState<Record<string, ScheduleBlock[]>>({})

  useEffect(() => {
    if (!organizationId || agendaIds.length === 0) {
      setBlocksByAgenda({})
      return
    }

    const unsubscribers: (() => void)[] = agendaIds.map(agendaId => {
      return subscribeToBlocks(organizationId, agendaId, (data) => {
        setBlocksByAgenda(prev => ({ ...prev, [agendaId]: data }))
      })
    })

    return () => unsubscribers.forEach(u => u())
  }, [organizationId, agendaIds.join(',')])

  const blocks = useMemo(
    () => Object.values(blocksByAgenda).flat(),
    [blocksByAgenda]
  )

  return { blocks }
}
