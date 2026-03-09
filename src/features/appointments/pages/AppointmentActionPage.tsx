/**
 * AppointmentActionPage — Public page showing appointment action result
 * Route: /appointments/action/:token
 * Reads ?result=ok|error&msg=... from query params (set by handleAppointmentAction function)
 */

import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export function AppointmentActionPage() {
  const [searchParams] = useSearchParams()
  const result = searchParams.get('result')
  const msg = searchParams.get('msg') || ''

  const isOk = result === 'ok'
  const isError = result === 'error'
  const isPending = !result

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div
          className={`p-6 text-center ${
            isOk
              ? 'bg-gradient-to-r from-green-500 to-emerald-600'
              : isError
              ? 'bg-gradient-to-r from-red-500 to-rose-600'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
        >
          <div className="flex justify-center mb-3">
            {isOk && <CheckCircle className="h-16 w-16 text-white" />}
            {isError && <XCircle className="h-16 w-16 text-white" />}
            {isPending && <AlertTriangle className="h-16 w-16 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isOk ? 'Accion completada' : isError ? 'Error' : 'Procesando...'}
          </h1>
        </div>

        {/* Body */}
        <div className="p-6 text-center space-y-4">
          <p className="text-lg text-slate-700">
            {msg || (isPending ? 'Procesando su solicitud...' : 'Resultado desconocido')}
          </p>

          {isOk && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                Su solicitud ha sido procesada correctamente. Puede cerrar esta pagina.
              </p>
            </div>
          )}

          {isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Si el problema persiste, contacte directamente al consultorio.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-slate-400">Altia Health — Sistema de gestion medica</p>
        </div>
      </div>
    </div>
  )
}

export default AppointmentActionPage
