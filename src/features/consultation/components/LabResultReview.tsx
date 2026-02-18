import React from 'react';

interface LabResultReviewProps {
  data: any;
  currentPatientName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LabResultReview({ data, currentPatientName, onCancel, onConfirm }: LabResultReviewProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-4 max-w-md mx-auto">
      <h3 className="font-semibold text-lg mb-2">Revisión de Resultado</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Archivo cargado para {currentPatientName}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}