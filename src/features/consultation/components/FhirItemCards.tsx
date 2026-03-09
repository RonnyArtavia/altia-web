/**
 * FhirItemCards - Clinical order cards for chat (prescription, labs, referrals)
 * Approve / Reject workflow per category
 */

import { Pill, TestTube, FileText, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FHIRPlanItem } from '../types/medical-notes'

interface GroupedFhirItems {
  medications: FHIRPlanItem[]
  labOrders: FHIRPlanItem[]
  referrals: FHIRPlanItem[]
  other: FHIRPlanItem[]
}

export function groupFhirItems(items: FHIRPlanItem[]): GroupedFhirItems {
  const result: GroupedFhirItems = { medications: [], labOrders: [], referrals: [], other: [] }
  for (const item of items) {
    if (item.type === 'medication') result.medications.push(item)
    else if (item.type === 'labOrder' || item.type === 'order') result.labOrders.push(item)
    else if (item.type === 'referral') result.referrals.push(item)
    else result.other.push(item)
  }
  return result
}

/** Build detail line: "500 MG . Oral . cada 8 horas por 5 dias" */
function medDetailLine(item: FHIRPlanItem): string {
  const parts: string[] = []
  if (item.dose) parts.push(item.dose)
  if (item.details && item.details !== item.dose) parts.push(item.details)
  if (item.notes && !parts.some(p => p.includes(item.notes!))) parts.push(item.notes)
  return parts.join(' \u2022 ') || 'Sin detalles especificados'
}

// --- Shared action bar ---

type CardStatus = 'pending' | 'approved' | 'rejected'

function ActionBar({ status, approveLabel, onApprove, onReject }: {
  status: CardStatus
  approveLabel: string
  onApprove?: () => void
  onReject?: () => void
}) {
  if (status === 'approved') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold border-t border-emerald-100">
        <CheckCircle size={14} />
        Aprobado
      </div>
    )
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-semibold border-t border-red-100">
        <XCircle size={14} />
        Rechazado
      </div>
    )
  }
  if (!onApprove && !onReject) return null
  return (
    <div className="flex border-t border-slate-100">
      {onReject && (
        <button
          onClick={onReject}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors border-r border-slate-100"
        >
          <XCircle size={16} />
          Rechazar
        </button>
      )}
      {onApprove && (
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-colors"
        >
          <CheckCircle size={16} />
          {approveLabel}
        </button>
      )}
    </div>
  )
}

// --- Prescription Card ---

interface CardProps {
  items: FHIRPlanItem[]
  onRemove?: (id: string) => void
  onApprove?: () => void
  onReject?: () => void
  status?: CardStatus
}

export function PrescriptionCard({ items, onRemove, onApprove, onReject, status = 'pending' }: CardProps) {
  if (items.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <Pill size={16} className="text-indigo-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Receta</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((med) => (
          <div key={med.id} className="flex items-center gap-3 px-4 py-3 group/row hover:bg-slate-50/50 transition-colors">
            <div className="w-0.5 self-stretch rounded-full bg-indigo-400/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-700 leading-tight">
                {med.display || med.text}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {medDetailLine(med)}
              </p>
              {med.warning && (
                <div className={cn(
                  "inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md",
                  med.warningLevel === 'critical' ? "bg-red-50 text-red-700 border border-red-200" :
                  med.warningLevel === 'warning' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                  "bg-blue-50 text-blue-600 border border-blue-200"
                )}>
                  <AlertTriangle size={10} />
                  {med.warning}
                </div>
              )}
            </div>
            {onRemove && status === 'pending' && (
              <button
                onClick={() => onRemove(med.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100 shrink-0"
                title="Quitar medicamento"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <ActionBar status={status} approveLabel="Aprobar Receta" onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// --- Lab Order Card ---

export function LabOrderCard({ items, onRemove, onApprove, onReject, status = 'pending' }: CardProps) {
  if (items.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <TestTube size={16} className="text-purple-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Orden de Laboratorio</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((lab) => (
          <div key={lab.id} className="flex items-center gap-3 px-4 py-3 group/row hover:bg-slate-50/50 transition-colors">
            <div className="w-0.5 self-stretch rounded-full bg-purple-400/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-700 leading-tight">
                {lab.display || lab.text}
              </p>
              {lab.details && (
                <p className="text-xs text-slate-500 mt-0.5">{lab.details}</p>
              )}
            </div>
            {onRemove && status === 'pending' && (
              <button
                onClick={() => onRemove(lab.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100 shrink-0"
                title="Quitar examen"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <ActionBar status={status} approveLabel="Aprobar Orden" onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// --- Referral Card ---

export function ReferralCard({ items, onRemove, onApprove, onReject, status = 'pending' }: CardProps) {
  if (items.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <FileText size={16} className="text-emerald-500" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Referencia</span>
      </div>

      <div className="divide-y divide-slate-100">
        {items.map((ref) => (
          <div key={ref.id} className="flex items-center gap-3 px-4 py-3 group/row hover:bg-slate-50/50 transition-colors">
            <div className="w-0.5 self-stretch rounded-full bg-emerald-400/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-700 leading-tight">
                {ref.specialty || ref.display || ref.text}
              </p>
              {(ref.reasonForReferral || ref.details) && (
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {ref.reasonForReferral || ref.details}
                </p>
              )}
            </div>
            {onRemove && status === 'pending' && (
              <button
                onClick={() => onRemove(ref.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100 shrink-0"
                title="Quitar referencia"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      <ActionBar status={status} approveLabel="Aprobar Referencia" onApprove={onApprove} onReject={onReject} />
    </div>
  )
}
