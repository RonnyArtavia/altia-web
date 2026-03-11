/**
 * PDFPreviewDialog — Preview, download, and (future) send generated PDFs
 */

import { useState, useEffect } from 'react'
import { Download, Loader2, X, FileText, Pill, TestTube, Mail, MessageSquare, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { FHIRPlanItem } from '../types/medical-notes'
import type { TemplateConfig } from '@/services/templateConfigService'
import {
  generatePrescriptionPDF,
  generateLabOrderPDF,
  generateReferralPDF,
  type PDFGenerateOptions,
} from '@/services/pdfService'
import { createVerificationRecord } from '@/services/documentVerificationService'
import { sendNotification, type NotificationResult } from '@/services/notificationService'

export type PDFDocumentType = 'prescription' | 'labOrder' | 'referral'

interface PDFPreviewDialogProps {
  open: boolean
  onClose: () => void
  type: PDFDocumentType
  items: FHIRPlanItem[]
  config: TemplateConfig
  patientName: string
  patientAge?: string
  patientGender?: string
  patientEmail?: string
  patientPhone?: string
  organizationId?: string
  doctorUid?: string
}

const TYPE_CONFIG: Record<PDFDocumentType, { label: string; icon: typeof Pill; color: string }> = {
  prescription: { label: 'Receta Medica', icon: Pill, color: 'text-indigo-600' },
  labOrder: { label: 'Orden de Laboratorio', icon: TestTube, color: 'text-purple-600' },
  referral: { label: 'Referencia Medica', icon: FileText, color: 'text-emerald-600' },
}

export function PDFPreviewDialog({
  open,
  onClose,
  type,
  items,
  config,
  patientName,
  patientAge,
  patientGender,
  patientEmail,
  patientPhone,
  organizationId,
  doctorUid,
}: PDFPreviewDialogProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sendingWA, setSendingWA] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const typeInfo = TYPE_CONFIG[type]
  const Icon = typeInfo.icon

  useEffect(() => {
    if (!open || items.length === 0) return

    let cancelled = false
    setGenerating(true)
    setError(null)

    const generate = async () => {
      try {
        // Create verification record for QR
        let verificationUrl: string | undefined
        if (organizationId) {
          try {
            const itemSummary = items.map(i => i.display || i.text).join(', ')
            const { url } = await createVerificationRecord(organizationId, {
              organizationId,
              type,
              patientName,
              doctorName: config.doctorName || 'Doctor',
              itemCount: items.length,
              itemSummary: itemSummary.length > 200 ? itemSummary.slice(0, 197) + '...' : itemSummary,
              createdBy: doctorUid || '',
            })
            verificationUrl = url
          } catch (err) {
            console.warn('Could not create verification record:', err)
          }
        }

        const opts: PDFGenerateOptions = { config, patientName, patientAge, patientGender, verificationUrl }

        let result: Blob
        if (type === 'prescription') {
          result = await generatePrescriptionPDF(items, opts)
        } else if (type === 'labOrder') {
          result = await generateLabOrderPDF(items, opts)
        } else {
          result = await generateReferralPDF(items[0], opts)
        }
        if (cancelled) return
        setBlob(result)
        setPreviewUrl(URL.createObjectURL(result))
      } catch (err) {
        if (!cancelled) setError('Error al generar el PDF')
        console.error('PDF generation error:', err)
      } finally {
        if (!cancelled) setGenerating(false)
      }
    }
    generate()

    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [open, type, items, config, patientName, patientAge, patientGender])

  const handleDownload = () => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = `${type === 'prescription' ? 'Receta' : type === 'labOrder' ? 'Orden_Lab' : 'Referencia'}_${patientName.replace(/\s+/g, '_')}.pdf`
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const blobToBase64 = (b: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.readAsDataURL(b)
    })

  const handleSendEmail = async () => {
    if (!blob || !patientEmail || !organizationId) return
    setSendingEmail(true)
    setSendResult(null)
    try {
      const base64 = await blobToBase64(blob)
      const fileName = `${typeInfo.label.replace(/\s+/g, '_')}_${patientName.replace(/\s+/g, '_')}.pdf`
      const res: NotificationResult = await sendNotification('email', {
        to: patientEmail,
        subject: `${typeInfo.label} - ${patientName}`,
        message: `Adjunto su ${typeInfo.label.toLowerCase()} generada en Altia Health.`,
        htmlBody: `<p>Estimado/a ${patientName},</p><p>Adjunto encontrara su <strong>${typeInfo.label.toLowerCase()}</strong>.</p><p>Atentamente,<br/>${config.doctorName || 'Su medico'}</p>`,
        attachmentBase64: base64,
        attachmentName: fileName,
        organizationId,
      })
      setSendResult({ ok: res.success, msg: res.success ? 'Email enviado correctamente' : (res.error || 'Error al enviar') })
    } catch {
      setSendResult({ ok: false, msg: 'Error al enviar email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSendWhatsApp = async () => {
    if (!blob || !patientPhone || !organizationId) return
    setSendingWA(true)
    setSendResult(null)
    try {
      const res: NotificationResult = await sendNotification('whatsapp', {
        to: patientPhone,
        message: `Hola ${patientName}, le compartimos su ${typeInfo.label.toLowerCase()} generada en Altia Health.`,
        organizationId,
      })
      setSendResult({ ok: res.success, msg: res.success ? 'WhatsApp enviado correctamente' : (res.error || 'Error al enviar') })
    } catch {
      setSendResult({ ok: false, msg: 'Error al enviar WhatsApp' })
    } finally {
      setSendingWA(false)
    }
  }

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBlob(null)
    setPreviewUrl(null)
    setSendResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon size={20} className={typeInfo.color} />
            {typeInfo.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {generating && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-clinical-400" />
              <span className="text-sm text-clinical-500">Generando PDF...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <X className="h-8 w-8 text-red-400" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {previewUrl && !generating && (
            <iframe
              src={previewUrl}
              className="w-full h-[60vh] border border-clinical-200 rounded-lg"
              title="PDF Preview"
            />
          )}
        </div>

        {sendResult && (
          <div className={`mx-1 p-2 rounded-lg text-sm ${sendResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {sendResult.ok && <Check size={14} className="inline mr-1" />}
            {sendResult.msg}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cerrar
          </Button>

          {patientEmail && organizationId && (
            <Button
              variant="outline"
              onClick={handleSendEmail}
              disabled={!blob || sendingEmail}
              className="text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              {sendingEmail ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Mail size={16} className="mr-2" />}
              Enviar Email
            </Button>
          )}

          {patientPhone && organizationId && (
            <Button
              variant="outline"
              onClick={handleSendWhatsApp}
              disabled={!blob || sendingWA}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              {sendingWA ? <Loader2 size={16} className="mr-2 animate-spin" /> : <MessageSquare size={16} className="mr-2" />}
              Enviar WhatsApp
            </Button>
          )}

          <Button
            onClick={handleDownload}
            disabled={!blob}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Download size={16} className="mr-2" />
            Descargar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
