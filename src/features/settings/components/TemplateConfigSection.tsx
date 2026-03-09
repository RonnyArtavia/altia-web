/**
 * TemplateConfigSection — Configure document templates (logo, clinic info, signature)
 */

import { useState, useEffect, useRef } from 'react'
import {
  Upload,
  Save,
  Image,
  FileSignature,
  Building2,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  getTemplateConfig,
  saveTemplateConfig,
  uploadTemplateImage,
  type TemplateConfig,
} from '@/services/templateConfigService'

interface TemplateConfigSectionProps {
  organizationId: string
}

export function TemplateConfigSection({ organizationId }: TemplateConfigSectionProps) {
  const [config, setConfig] = useState<TemplateConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingSig, setUploadingSig] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const sigRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!organizationId) return
    getTemplateConfig(organizationId)
      .then(c => setConfig(c))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [organizationId])

  const handleChange = (field: keyof TemplateConfig, value: string) => {
    setConfig(prev => prev ? { ...prev, [field]: value } : prev)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      await saveTemplateConfig(organizationId, config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Error saving template config:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (file: File, type: 'logo' | 'signature') => {
    const setter = type === 'logo' ? setUploadingLogo : setUploadingSig
    setter(true)
    try {
      const url = await uploadTemplateImage(organizationId, file, type)
      const field = type === 'logo' ? 'logoUrl' : 'signatureUrl'
      handleChange(field, url)
    } catch (err) {
      console.error(`Error uploading ${type}:`, err)
    } finally {
      setter(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-clinical-400" />
      </div>
    )
  }

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50">
            <FileSignature className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Plantillas de Documentos</CardTitle>
            <p className="text-sm text-clinical-500">
              Logo, datos del consultorio y sello para recetas, ordenes y referencias
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Logo & Signature uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Logo */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-700">Logo del consultorio</label>
            <div
              onClick={() => logoRef.current?.click()}
              className="border-2 border-dashed border-clinical-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors min-h-[120px]"
            >
              {uploadingLogo ? (
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              ) : config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="max-h-20 object-contain" />
              ) : (
                <>
                  <Image className="h-8 w-8 text-clinical-300 mb-2" />
                  <span className="text-xs text-clinical-400">Click para subir logo</span>
                </>
              )}
            </div>
            <input
              ref={logoRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
            />
            {config.logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => handleChange('logoUrl', '')}
              >
                <X size={12} className="mr-1" /> Quitar logo
              </Button>
            )}
          </div>

          {/* Signature / Stamp */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-clinical-700">Sello / Firma digital</label>
            <div
              onClick={() => sigRef.current?.click()}
              className="border-2 border-dashed border-clinical-200 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-colors min-h-[120px]"
            >
              {uploadingSig ? (
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              ) : config.signatureUrl ? (
                <img src={config.signatureUrl} alt="Sello" className="max-h-20 object-contain" />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-clinical-300 mb-2" />
                  <span className="text-xs text-clinical-400">Click para subir sello</span>
                </>
              )}
            </div>
            <input
              ref={sigRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
            />
            {config.signatureUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => handleChange('signatureUrl', '')}
              >
                <X size={12} className="mr-1" /> Quitar sello
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Clinic info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-clinical-500" />
            <span className="text-sm font-medium text-clinical-700">Datos del consultorio</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['doctorName', 'Nombre del médico'],
              ['specialty', 'Especialidad'],
              ['license', 'Cédula profesional'],
              ['clinicName', 'Nombre del consultorio'],
              ['clinicAddress', 'Dirección'],
              ['clinicPhone', 'Teléfono'],
              ['clinicEmail', 'Email del consultorio'],
            ] as [keyof TemplateConfig, string][]).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <label className="text-xs font-medium text-clinical-500">{label}</label>
                <input
                  value={(config[field] as string) || ''}
                  onChange={e => handleChange(field, e.target.value)}
                  className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none text-clinical-800"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          {/* Footer text */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-clinical-500">Texto de pie de pagina (PDF)</label>
            <input
              value={config.footerText}
              onChange={e => handleChange('footerText', e.target.value)}
              className="w-full text-sm p-2.5 border border-clinical-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none text-clinical-800"
              placeholder="Ej: Este documento es confidencial y para uso exclusivo del paciente"
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
