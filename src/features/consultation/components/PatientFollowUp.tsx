import React from 'react';

interface PatientFollowUpProps {
  onClose: () => void;
}

export function PatientFollowUp({ onClose }: PatientFollowUpProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-4 max-w-md mx-auto">
      <h3 className="font-semibold text-lg mb-2">Seguimiento de Paciente</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Funcionalidad de seguimiento automático
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors w-full"
      >
        Cerrar
      </button>
    </div>
  );
}