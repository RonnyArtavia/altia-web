/**
 * PDF Service — Generate prescription, lab order, and referral PDFs
 * Uses jsPDF for generation and qrcode for verification QR
 */

import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import type { FHIRPlanItem } from '@/features/consultation/types/medical-notes'
import type { TemplateConfig } from './templateConfigService'

// ─── Helpers ────────────────────────────────────────────────

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 100, margin: 1 })
}

function formatDate(d: Date = new Date()): string {
  return d.toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Shared Layout ──────────────────────────────────────────

interface PDFContext {
  doc: jsPDF
  config: TemplateConfig
  patientName: string
  patientAge?: string
  patientGender?: string
  verificationId?: string
  verificationUrl?: string
}

/** Returns Y position after header */
async function drawHeader(ctx: PDFContext): Promise<number> {
  const { doc, config } = ctx
  const pageW = doc.internal.pageSize.getWidth()
  let y = 15

  // Logo
  if (config.logoUrl) {
    try {
      const img = await loadImage(config.logoUrl)
      doc.addImage(img, 'PNG', 15, y, 30, 30)
    } catch { /* skip logo on error */ }
  }

  // Clinic info — right aligned
  const leftX = config.logoUrl ? 50 : 15
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(config.clinicName || 'Consultorio', leftX, y + 5)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  if (config.doctorName) doc.text(`Dr(a). ${config.doctorName} — ${config.specialty || ''}`, leftX, y + 12)
  if (config.license) doc.text(`Cédula: ${config.license}`, leftX, y + 17)
  if (config.clinicAddress) doc.text(config.clinicAddress, leftX, y + 22)
  if (config.clinicPhone || config.clinicEmail) {
    doc.text([config.clinicPhone, config.clinicEmail].filter(Boolean).join(' | '), leftX, y + 27)
  }

  // Date — far right
  doc.setFontSize(9)
  doc.text(formatDate(), pageW - 15, y + 5, { align: 'right' })

  y += 35

  // Line separator
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(15, y, pageW - 15, y)
  y += 5

  // Patient info
  doc.setTextColor(0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Paciente:', 15, y + 5)
  doc.setFont('helvetica', 'normal')
  const patientLine = [ctx.patientName, ctx.patientAge, ctx.patientGender].filter(Boolean).join(' — ')
  doc.text(patientLine, 40, y + 5)
  y += 12

  return y
}

async function drawFooter(ctx: PDFContext): Promise<void> {
  const { doc, config } = ctx
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  let footerY = pageH - 35

  // Separator
  doc.setDrawColor(200)
  doc.setLineWidth(0.3)
  doc.line(15, footerY, pageW - 15, footerY)
  footerY += 5

  // Signature
  if (config.signatureUrl) {
    try {
      const img = await loadImage(config.signatureUrl)
      doc.addImage(img, 'PNG', 15, footerY - 15, 35, 20)
    } catch { /* skip */ }
  }

  // QR
  if (ctx.verificationUrl) {
    try {
      const qr = await generateQRDataURL(ctx.verificationUrl)
      doc.addImage(qr, 'PNG', pageW - 40, footerY - 5, 25, 25)
      doc.setFontSize(6)
      doc.setTextColor(150)
      doc.text('Verificar documento', pageW - 28, footerY + 22, { align: 'center' })
    } catch { /* skip */ }
  }

  // Footer text
  if (config.footerText) {
    doc.setFontSize(7)
    doc.setTextColor(130)
    doc.text(config.footerText, pageW / 2, pageH - 8, { align: 'center' })
  }
}

// ─── PDF Generators ─────────────────────────────────────────

export interface PDFGenerateOptions {
  config: TemplateConfig
  patientName: string
  patientAge?: string
  patientGender?: string
  verificationUrl?: string
}

/**
 * Generate prescription PDF from medication items
 */
export async function generatePrescriptionPDF(
  items: FHIRPlanItem[],
  opts: PDFGenerateOptions
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ctx: PDFContext = { doc, ...opts }
  const pageW = doc.internal.pageSize.getWidth()
  let y = await drawHeader(ctx)

  // Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175) // indigo
  doc.text('RECETA MEDICA', pageW / 2, y + 3, { align: 'center' })
  y += 12

  // Table header
  doc.setFillColor(245, 245, 250)
  doc.rect(15, y, pageW - 30, 8, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(60)
  doc.text('Medicamento', 18, y + 5.5)
  doc.text('Dosis / Indicaciones', 90, y + 5.5)
  y += 10

  // Rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30)
  items.forEach((med, i) => {
    if (y > 240) { doc.addPage(); y = 20 }
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 255)
      doc.rect(15, y - 2, pageW - 30, 10, 'F')
    }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i + 1}. ${med.display || med.text}`, 18, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const detail = [med.dose, med.details].filter(Boolean).join(' — ')
    const lines = doc.splitTextToSize(detail || 'Sin detalles', pageW - 110)
    doc.text(lines, 90, y + 4)
    y += Math.max(10, lines.length * 5 + 4)
  })

  await drawFooter(ctx)
  return doc.output('blob')
}

/**
 * Generate lab order PDF from lab order items
 */
export async function generateLabOrderPDF(
  items: FHIRPlanItem[],
  opts: PDFGenerateOptions
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ctx: PDFContext = { doc, ...opts }
  const pageW = doc.internal.pageSize.getWidth()
  let y = await drawHeader(ctx)

  // Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(126, 34, 206) // purple
  doc.text('ORDEN DE LABORATORIO', pageW / 2, y + 3, { align: 'center' })
  y += 12

  // Checklist
  items.forEach((lab, i) => {
    if (y > 250) { doc.addPage(); y = 20 }
    // Checkbox
    doc.setDrawColor(150)
    doc.rect(18, y, 4, 4)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30)
    doc.text(`${lab.display || lab.text}`, 26, y + 3.5)

    if (lab.details) {
      doc.setFontSize(8)
      doc.setTextColor(100)
      doc.text(lab.details, 26, y + 8)
      y += 12
    } else {
      y += 8
    }
  })

  await drawFooter(ctx)
  return doc.output('blob')
}

/**
 * Generate referral PDF
 */
export async function generateReferralPDF(
  item: FHIRPlanItem,
  opts: PDFGenerateOptions
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ctx: PDFContext = { doc, ...opts }
  const pageW = doc.internal.pageSize.getWidth()
  let y = await drawHeader(ctx)

  // Title
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(5, 150, 105) // emerald
  doc.text('REFERENCIA MEDICA', pageW / 2, y + 3, { align: 'center' })
  y += 14

  // Specialty
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text('Especialidad de referencia:', 15, y)
  doc.setFont('helvetica', 'normal')
  doc.text(item.specialty || item.display || item.text, 65, y)
  y += 10

  // Reason
  doc.setFont('helvetica', 'bold')
  doc.text('Motivo de referencia:', 15, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const reason = item.reasonForReferral || item.details || 'No especificado'
  const reasonLines = doc.splitTextToSize(reason, pageW - 30)
  doc.text(reasonLines, 15, y)
  y += reasonLines.length * 5 + 8

  // Clinical summary
  if (item.clinicalSummary) {
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen clinico:', 15, y)
    y += 6
    doc.setFont('helvetica', 'normal')
    const summaryLines = doc.splitTextToSize(item.clinicalSummary, pageW - 30)
    doc.text(summaryLines, 15, y)
  }

  await drawFooter(ctx)
  return doc.output('blob')
}
