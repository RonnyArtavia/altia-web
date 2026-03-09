/**
 * NotificationConfigSection — Configure email provider and WhatsApp webhook
 */

import { useState, useEffect } from 'react'
import {
  Mail,
  MessageSquare,
  Save,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  getNotificationConfig,
  saveNotificationConfig,
  type NotificationConfig,
  type EmailConfig,
  type WhatsAppConfig,
} from '@/services/notificationConfigService'
import { sendEmailNotification, sendWhatsAppNotification } from '@/services/notificationService'

interface NotificationConfigSectionProps {
  organizationId: string
}

export function NotificationConfigSection({ organizationId }: NotificationConfigSectionProps) {
  const [email, setEmail] = useState<EmailConfig>({
    service: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: '',
  })
  const [whatsapp, setWhatsapp] = useState<WhatsAppConfig>({
    webhookUrl: '',
    apiKey: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testingWA, setTestingWA] = useState(false)
  const [testResult, setTestResult] = useState<{ type: string; ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    if (!organizationId) return
    getNotificationConfig(organizationId)
      .then(cfg => {
        if (cfg.email) setEmail(prev => ({ ...prev, ...cfg.email }))
        if (cfg.whatsapp) setWhatsapp(prev => ({ ...prev, ...cfg.whatsapp }))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [organizationId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const config: NotificationConfig = {}
      if (email.user) config.email = email
      if (whatsapp.webhookUrl) config.whatsapp = whatsapp
      await saveNotificationConfig(organizationId, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving notification config:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!email.user) return
    setTestingEmail(true)
    setTestResult(null)
    try {
      const res = await sendEmailNotification({
        to: email.user,
        subject: 'Prueba de configuracion - Altia Health',
        htmlBody: '<h2>Prueba exitosa</h2><p>Tu configuracion de email funciona correctamente.</p>',
        organizationId,
      })
      setTestResult({
        type: 'email',
        ok: res.success,
        msg: res.success ? 'Email de prueba enviado' : (res.error || 'Error al enviar'),
      })
    } catch {
      setTestResult({ type: 'email', ok: false, msg: 'Error de conexion' })
    } finally {
      setTestingEmail(false)
    }
  }

  const handleTestWhatsApp = async () => {
    if (!whatsapp.webhookUrl) return
    setTestingWA(true)
    setTestResult(null)
    try {
      const res = await sendWhatsAppNotification({
        to: 'test',
        message: 'Prueba de conexion - Altia Health',
        organizationId,
      })
      setTestResult({
        type: 'whatsapp',
        ok: res.success,
        msg: res.success ? 'Mensaje de prueba enviado' : (res.error || 'Error al enviar'),
      })
    } catch {
      setTestResult({ type: 'whatsapp', ok: false, msg: 'Error de conexion' })
    } finally {
      setTestingWA(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-clinical-400" />
      </div>
    )
  }

  return (
    <Card className="border-l-4 border-l-teal-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-50">
            <Send className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Notificaciones (Email y WhatsApp)</CardTitle>
            <p className="text-sm text-clinical-500">
              Configura proveedores para enviar documentos a pacientes
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Email config */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-clinical-500" />
            <span className="text-sm font-medium text-clinical-700">Proveedor de Email</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-clinical-500">Servicio</label>
              <select
                value={email.service || ''}
                onChange={e => {
                  const v = e.target.value as 'gmail' | ''
                  setEmail(prev => ({
                    ...prev,
                    service: v,
                    host: v === 'gmail' ? '' : prev.host,
                  }))
                  setSaved(false)
                }}
                className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800 bg-white"
              >
                <option value="">SMTP Personalizado</option>
                <option value="gmail">Gmail</option>
              </select>
            </div>

            {!email.service && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-clinical-500">Host SMTP</label>
                  <input
                    value={email.host || ''}
                    onChange={e => { setEmail(p => ({ ...p, host: e.target.value })); setSaved(false) }}
                    className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                    placeholder="smtp.ejemplo.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-clinical-500">Puerto</label>
                  <input
                    type="number"
                    value={email.port || 587}
                    onChange={e => { setEmail(p => ({ ...p, port: parseInt(e.target.value) || 587 })); setSaved(false) }}
                    className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-clinical-500">Usuario / Email</label>
              <input
                value={email.user}
                onChange={e => { setEmail(p => ({ ...p, user: e.target.value })); setSaved(false) }}
                className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-clinical-500">Contrasena / App Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={email.password}
                  onChange={e => { setEmail(p => ({ ...p, password: e.target.value })); setSaved(false) }}
                  className="w-full text-sm p-2.5 pr-10 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                  placeholder="********"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-clinical-400 hover:text-clinical-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-clinical-500">Remitente (From)</label>
              <input
                value={email.from || ''}
                onChange={e => { setEmail(p => ({ ...p, from: e.target.value })); setSaved(false) }}
                className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                placeholder="consultorio@ejemplo.com (opcional)"
              />
            </div>
          </div>

          {email.user && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              {testingEmail ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
              Enviar email de prueba
            </Button>
          )}
        </div>

        <Separator />

        {/* WhatsApp config */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-clinical-500" />
            <span className="text-sm font-medium text-clinical-700">WhatsApp (via n8n Webhook)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-clinical-500">URL del Webhook (n8n)</label>
              <input
                value={whatsapp.webhookUrl}
                onChange={e => { setWhatsapp(p => ({ ...p, webhookUrl: e.target.value })); setSaved(false) }}
                className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                placeholder="https://n8n.tudominio.com/webhook/..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-clinical-500">API Key (opcional)</label>
              <input
                value={whatsapp.apiKey || ''}
                onChange={e => { setWhatsapp(p => ({ ...p, apiKey: e.target.value })); setSaved(false) }}
                className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none text-clinical-800"
                placeholder="Bearer token para autenticacion"
              />
            </div>
          </div>

          {whatsapp.webhookUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestWhatsApp}
              disabled={testingWA}
              className="text-teal-600 border-teal-200 hover:bg-teal-50"
            >
              {testingWA ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
              Probar conexion WhatsApp
            </Button>
          )}
        </div>

        {/* Test result feedback */}
        {testResult && (
          <div className={`p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {testResult.ok ? <Check size={14} className="inline mr-1" /> : null}
            {testResult.msg}
          </div>
        )}

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : saved ? (
              <Check size={16} className="mr-2" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            {saved ? 'Guardado' : 'Guardar configuracion'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
