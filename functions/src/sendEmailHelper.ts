/**
 * sendEmailHelper — Shared email sender using nodemailer
 * Used by triggers and scheduled functions that can't call callable functions
 */

import * as nodemailer from 'nodemailer'

interface EmailConfig {
  service?: string
  host?: string
  port?: number
  secure?: boolean
  user: string
  password: string
  from?: string
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}

export async function sendEmail(config: EmailConfig, options: SendEmailOptions): Promise<void> {
  let transportConfig: nodemailer.TransportOptions

  if (config.service === 'gmail') {
    transportConfig = {
      service: 'gmail',
      auth: { user: config.user, pass: config.password },
    } as nodemailer.TransportOptions
  } else {
    transportConfig = {
      host: config.host,
      port: config.port || 587,
      secure: config.secure || false,
      auth: { user: config.user, pass: config.password },
    } as nodemailer.TransportOptions
  }

  const transporter = nodemailer.createTransport(transportConfig)

  await transporter.sendMail({
    from: config.from || config.user,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  })
}
