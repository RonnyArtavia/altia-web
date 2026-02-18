import React from 'react';

export interface MedicationItem {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

interface PrescriptionDraftProps {
  initialItems: MedicationItem[];
  onCancel: () => void;
  onConfirm: (items: MedicationItem[]) => void;
}

export function PrescriptionDraft({ initialItems, onCancel, onConfirm }: PrescriptionDraftProps) {
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg p-4 max-w-md mx-auto">
      <h3 className="font-semibold text-lg mb-2">Borrador de Receta</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Funcionalidad de borrador de receta
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => onConfirm(initialItems)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  );
}