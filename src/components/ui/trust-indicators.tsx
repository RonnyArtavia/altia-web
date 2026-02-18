import React from 'react'
import { Shield, Lock, CheckCircle } from 'lucide-react'

export function TrustIndicators() {
  const indicators = [
    {
      icon: Lock,
      text: 'Datos encriptados',
    },
    {
      icon: Shield,
      text: 'Cumple FHIR',
    },
    {
      icon: CheckCircle,
      text: 'Certificado SSL',
    },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mt-6 pt-6 border-t border-clinical-100">
      {indicators.map((indicator, index) => {
        const Icon = indicator.icon
        return (
          <div
            key={indicator.text}
            className="flex items-center gap-2 text-clinical-500 animate-fade-in"
            style={{
              animationDelay: `${index * 0.1}s`,
              animationFillMode: 'backwards'
            }}
          >
            <Icon className="h-4 w-4 text-success-500" />
            <span className="text-xs font-medium">{indicator.text}</span>
          </div>
        )
      })}
    </div>
  )
}