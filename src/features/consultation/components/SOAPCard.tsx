/**
 * SOAPCard - SOAP Note Display Component
 * Professional medical note card with structured SOAP display
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Stethoscope,
  Activity,
  ClipboardCheck,
  Edit,
  Calendar,
  User
} from 'lucide-react';
import type { SOAPData } from '../types/medical-notes';

interface SOAPCardProps {
  soapData: SOAPData;
  patientName?: string;
  timestamp?: Date;
  onEdit?: () => void;
}

export function SOAPCard({
  soapData,
  patientName,
  timestamp,
  onEdit
}: SOAPCardProps) {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const soapSections = [
    {
      key: 's',
      title: 'SUBJETIVO',
      icon: <User className="h-4 w-4" />,
      content: soapData.s,
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600'
    },
    {
      key: 'o',
      title: 'OBJETIVO',
      icon: <Stethoscope className="h-4 w-4" />,
      content: soapData.o,
      color: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-900',
      iconColor: 'text-emerald-600'
    },
    {
      key: 'a',
      title: 'EVALUACIÓN',
      icon: <Activity className="h-4 w-4" />,
      content: soapData.a,
      color: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-600'
    },
    {
      key: 'p',
      title: 'PLAN',
      icon: <ClipboardCheck className="h-4 w-4" />,
      content: soapData.p,
      color: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-900',
      iconColor: 'text-purple-600'
    }
  ];

  const hasContent = Object.values(soapData).some(value => value.trim());

  if (!hasContent) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200/60 shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Nota SOAP</h3>
          <p className="text-xs text-gray-500 text-center">
            No hay contenido SOAP disponible.
            <br />
            Inicia una consulta para generar la nota.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200/60 shadow-sm hover:shadow-lg hover:border-gray-300/50 transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Nota SOAP</CardTitle>
              {patientName && (
                <p className="text-sm text-gray-600 mt-1">
                  Paciente: {patientName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300">
              Generada
            </Badge>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {timestamp && (
          <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
            <Calendar className="h-3 w-3" />
            <span>{formatTimestamp(timestamp)}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid gap-6">
          {soapSections.map(section => (
            <div key={section.key} className={`rounded-xl border-2 ${section.color} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`${section.iconColor}`}>
                  {section.icon}
                </div>
                <h3 className={`text-sm font-bold ${section.textColor}`}>
                  {section.title}
                </h3>
              </div>
              <div className={`${section.textColor} text-sm leading-relaxed`}>
                {section.content ? (
                  <p className="whitespace-pre-wrap">{section.content}</p>
                ) : (
                  <p className="italic text-gray-500">Sin contenido registrado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}