/**
 * Output Service — Handles document output channels
 * Channels: PDF/Print, Email, WhatsApp, Screen Preview
 * 
 * Uses:
 * - jsPDF for PDF generation (already installed)
 * - mailto: links for email
 * - WhatsApp API standard: https://wa.me/{phone}?text={encoded}
 * - Screen preview via callback
 */

import jsPDF from 'jspdf'
import type { TemplateConfig } from './templateConfigService'

// ─── Types ──────────────────────────────────────────────────

export type OutputChannel = 'email' | 'whatsapp' | 'print' | 'screen'

export interface OutputContext {
  /** Type of document: orders, referrals, pharmacy, etc. */
  documentType: 'orders' | 'referrals' | 'pharmacy' | 'clinical-summary'
  /** Patient name */
  patientName: string
  /** Patient phone (for WhatsApp) */
  patientPhone?: string
  /** Patient email */
  patientEmail?: string
  /** Doctor name */
  doctorName?: string
  /** Clinic name */
  clinicName?: string
  /** Title of the document */
  title: string
  /** Content lines — structured as label:value pairs or plain text */
  content: ContentLine[]
  /** Template config for PDF header/footer */
  templateConfig?: TemplateConfig
}

export interface ContentLine {
  type: 'header' | 'subheader' | 'field' | 'text' | 'separator' | 'list-item'
  label?: string
  value?: string
}

// ─── Document Title Maps ────────────────────────────────────

const DOC_TYPE_TITLES: Record<string, string> = {
  orders: 'Órdenes Médicas',
  referrals: 'Referencia Médica',
  pharmacy: 'Receta Médica',
  'clinical-summary': 'Resumen Clínico',
}

// ─── Format Helpers ─────────────────────────────────────────

function formatContentAsText(ctx: OutputContext): string {
  const lines: string[] = []
  lines.push(`═══════════════════════════════`)
  lines.push(`📋 ${ctx.title || DOC_TYPE_TITLES[ctx.documentType] || 'Documento Médico'}`)
  lines.push(`═══════════════════════════════`)
  lines.push('')
  lines.push(`👤 Paciente: ${ctx.patientName}`)
  if (ctx.doctorName) lines.push(`🩺 Médico: ${ctx.doctorName}`)
  if (ctx.clinicName) lines.push(`🏥 ${ctx.clinicName}`)
  lines.push(`📅 Fecha: ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}`)
  lines.push('')
  lines.push(`───────────────────────────────`)

  for (const line of ctx.content) {
    switch (line.type) {
      case 'header':
        lines.push('')
        lines.push(`▸ ${line.value || line.label || ''}`)
        lines.push('─────────────────')
        break
      case 'subheader':
        lines.push(`  ▹ ${line.value || line.label || ''}`)
        break
      case 'field':
        lines.push(`  ${line.label || ''}: ${line.value || '—'}`)
        break
      case 'text':
        lines.push(`  ${line.value || ''}`)
        break
      case 'separator':
        lines.push('───────────────────────────────')
        break
      case 'list-item':
        lines.push(`  • ${line.value || ''}`)
        break
    }
  }

  lines.push('')
  lines.push(`───────────────────────────────`)
  lines.push(`Generado por Altia Health — ${new Date().toLocaleString('es-CR')}`)
  lines.push(`Este documento es informativo.`)

  return lines.join('\n')
}

function formatContentAsHTML(ctx: OutputContext): string {
  let html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #4F46E5, #7C3AED); padding: 20px; border-radius: 12px; color: white; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 20px;">${ctx.title || DOC_TYPE_TITLES[ctx.documentType] || 'Documento Médico'}</h1>
        <p style="margin: 5px 0 0; font-size: 12px; opacity: 0.8;">${ctx.clinicName || 'Altia Health'}</p>
      </div>
      
      <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 15px;">
        <p style="margin: 0; font-size: 14px;"><strong>Paciente:</strong> ${ctx.patientName}</p>
        ${ctx.doctorName ? `<p style="margin: 5px 0 0; font-size: 14px;"><strong>Médico:</strong> ${ctx.doctorName}</p>` : ''}
        <p style="margin: 5px 0 0; font-size: 12px; color: #94A3B8;">Fecha: ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
  `

  for (const line of ctx.content) {
    switch (line.type) {
      case 'header':
        html += `<h3 style="margin: 15px 0 5px; font-size: 15px; color: #1E293B; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px;">${line.value || line.label}</h3>`
        break
      case 'subheader':
        html += `<h4 style="margin: 10px 0 3px; font-size: 13px; color: #475569;">${line.value || line.label}</h4>`
        break
      case 'field':
        html += `<p style="margin: 3px 0; font-size: 13px;"><strong style="color: #64748B;">${line.label}:</strong> ${line.value || '—'}</p>`
        break
      case 'text':
        html += `<p style="margin: 3px 0; font-size: 13px; color: #475569;">${line.value}</p>`
        break
      case 'separator':
        html += `<hr style="border: none; border-top: 1px solid #E2E8F0; margin: 15px 0;" />`
        break
      case 'list-item':
        html += `<p style="margin: 3px 0 3px 15px; font-size: 13px;">• ${line.value}</p>`
        break
    }
  }

  html += `
      <div style="margin-top: 25px; padding: 12px; background: #F1F5F9; border-radius: 8px; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #94A3B8;">Generado por Altia Health — ${new Date().toLocaleString('es-CR')}</p>
        <p style="margin: 3px 0 0; font-size: 10px; color: #CBD5E1;">Este documento es informativo y no sustituye la consulta médica presencial.</p>
      </div>
    </div>
  `
  return html
}

// ─── PDF Generation ─────────────────────────────────────────

function generateOutputPDF(ctx: OutputContext): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 15

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(79, 70, 229) // indigo
  doc.text(ctx.title || DOC_TYPE_TITLES[ctx.documentType] || 'Documento Médico', pageW / 2, y, { align: 'center' })
  y += 8

  if (ctx.clinicName) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(ctx.clinicName, pageW / 2, y, { align: 'center' })
    y += 6
  }

  // Date
  doc.setFontSize(9)
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageW - 15, 15, { align: 'right' })

  // Separator
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(15, y, pageW - 15, y)
  y += 6

  // Patient info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text(`Paciente: ${ctx.patientName}`, 15, y)
  if (ctx.doctorName) {
    doc.text(`Médico: ${ctx.doctorName}`, pageW - 15, y, { align: 'right' })
  }
  y += 8

  // Content
  for (const line of ctx.content) {
    if (y > 255) {
      doc.addPage()
      y = 20
    }

    switch (line.type) {
      case 'header':
        y += 3
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30, 64, 175)
        doc.text(line.value || line.label || '', 15, y)
        y += 2
        doc.setDrawColor(200, 210, 230)
        doc.setLineWidth(0.3)
        doc.line(15, y, pageW - 15, y)
        y += 4
        break

      case 'subheader':
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(60)
        doc.text(line.value || line.label || '', 20, y)
        y += 5
        break

      case 'field': {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100)
        doc.text(`${line.label || ''}:`, 20, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30)
        const fieldLines = doc.splitTextToSize(line.value || '—', pageW - 75)
        doc.text(fieldLines, 55, y)
        y += Math.max(5, fieldLines.length * 4 + 2)
        break
      }

      case 'text': {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60)
        const textLines = doc.splitTextToSize(line.value || '', pageW - 35)
        doc.text(textLines, 20, y)
        y += textLines.length * 4 + 2
        break
      }

      case 'separator':
        y += 2
        doc.setDrawColor(220)
        doc.setLineWidth(0.2)
        doc.line(15, y, pageW - 15, y)
        y += 4
        break

      case 'list-item': {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(30)
        doc.text('•', 20, y)
        const itemLines = doc.splitTextToSize(line.value || '', pageW - 40)
        doc.text(itemLines, 25, y)
        y += itemLines.length * 4 + 2
        break
      }
    }
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text('Generado por Altia Health — Este documento es informativo.', pageW / 2, footerY, { align: 'center' })

  return doc.output('blob')
}

// ─── Channel Handlers ───────────────────────────────────────

/** Generate PDF and trigger print / download */
export function handlePrintOutput(ctx: OutputContext): void {
  const blob = generateOutputPDF(ctx)
  const url = URL.createObjectURL(blob)
  
  // Open in new window for print
  const win = window.open(url, '_blank')
  if (win) {
    win.addEventListener('load', () => {
      setTimeout(() => win.print(), 500)
    })
  } else {
    // Fallback: download
    const a = document.createElement('a')
    a.href = url
    a.download = `${ctx.documentType}-${ctx.patientName.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }
}

/** Open email client with pre-filled content */
export function handleEmailOutput(ctx: OutputContext): void {
  const subject = encodeURIComponent(
    `${ctx.title || DOC_TYPE_TITLES[ctx.documentType]} — ${ctx.patientName}`
  )
  const body = encodeURIComponent(formatContentAsText(ctx))
  const to = ctx.patientEmail ? encodeURIComponent(ctx.patientEmail) : ''

  window.open(`mailto:${to}?subject=${subject}&body=${body}`, '_self')
}

/**
 * Open WhatsApp with pre-filled message
 * Uses standard: https://wa.me/{phone}?text={encoded}
 * If phone not available, opens without a number (user selects contact)
 */
export function handleWhatsAppOutput(ctx: OutputContext): void {
  const text = formatContentAsText(ctx)
  const encoded = encodeURIComponent(text)
  
  // Normalize phone: remove spaces, dashes, parentheses, ensure international format
  let phone = (ctx.patientPhone || '').replace(/[\s\-()]/g, '')
  
  // If phone starts with 0, assume local number, remove leading 0
  if (phone.startsWith('0')) phone = phone.slice(1)
  
  // If phone doesn't start with +, add +506 (Costa Rica default)
  if (phone && !phone.startsWith('+')) {
    // If it's 8 digits (CR format), add country code
    if (phone.length === 8) phone = `506${phone}`
  }

  // Remove + for URL
  phone = phone.replace(/^\+/, '')

  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`

  window.open(url, '_blank')
}

/** Return formatted HTML for screen preview */
export function getScreenPreviewHTML(ctx: OutputContext): string {
  return formatContentAsHTML(ctx)
}

/** Return PDF blob for programmatic use */
export function generatePDFBlob(ctx: OutputContext): Blob {
  return generateOutputPDF(ctx)
}

// ─── Main Dispatcher ────────────────────────────────────────

/**
 * Handle output for any channel. Call this from OutputFooter's onOutput callback.
 * For 'screen' channel, returns the preview HTML string.
 */
export function handleOutput(
  channel: OutputChannel,
  ctx: OutputContext
): string | void {
  switch (channel) {
    case 'print':
      handlePrintOutput(ctx)
      return
    case 'email':
      handleEmailOutput(ctx)
      return
    case 'whatsapp':
      handleWhatsAppOutput(ctx)
      return
    case 'screen':
      return getScreenPreviewHTML(ctx)
  }
}
