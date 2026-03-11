/**
 * VerifyDocumentPage — Public page to verify document authenticity via QR
 * Route: /verify/:orgId/:docId
 */

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2, FileText, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getVerificationRecord,
  type VerificationDocument,
} from '@/services/documentVerificationService'

const TYPE_LABELS: Record<string, string> = {
  prescription: 'Receta Medica',
  labOrder: 'Orden de Laboratorio',
  referral: 'Referencia Medica',
}

export function VerifyDocumentPage() {
  const { orgId, docId } = useParams<{ orgId: string; docId: string }>()
  const [loading, setLoading] = useState(true)
  const [document, setDocument] = useState<VerificationDocument | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!orgId || !docId) { setError(true); setLoading(false); return }

    getVerificationRecord(orgId, docId)
      .then(doc => {
        if (!doc) setError(true)
        else setDocument(doc)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orgId, docId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-sm text-slate-500">Verificando documento...</span>
        </div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-red-800">Documento no encontrado</h2>
            <p className="text-sm text-red-600">
              El documento no existe o el enlace de verificacion es invalido.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isValid = document.isValid
  const createdDate = new Date(document.createdAt).toLocaleDateString('es-CR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full ${isValid ? 'border-emerald-200' : 'border-red-200'}`}>
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className={`h-5 w-5 ${isValid ? 'text-emerald-600' : 'text-red-600'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verificacion de Documento
            </span>
          </div>
          {isValid ? (
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-2" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-2" />
          )}
          <CardTitle className={`text-xl ${isValid ? 'text-emerald-800' : 'text-red-800'}`}>
            {isValid ? 'Documento Verificado' : 'Documento Invalidado'}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <InfoRow label="Tipo" value={TYPE_LABELS[document.type] || document.type} />
            <InfoRow label="Paciente" value={document.patientName} />
            <InfoRow label="Medico" value={document.doctorName} />
            <InfoRow label="Contenido" value={document.itemSummary} />
            <InfoRow label="Items" value={`${document.itemCount}`} />
            <InfoRow label="Fecha" value={createdDate} />
          </div>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Este documento fue generado electronicamente por Altia Health.
            La autenticidad ha sido verificada mediante codigo QR.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-xs font-medium text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 text-right">{value}</span>
    </div>
  )
}
