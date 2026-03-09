/**
 * FHIR Helper Functions - Exact replication from altea-movil
 */

import type { FHIRPlanItem } from '../features/consultation/types/consultation'

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to ensure all items have IDs
export const ensureIds = (items: FHIRPlanItem[]): FHIRPlanItem[] => {
  return items.map(item => ({
    ...item,
    id: item.id || generateId()
  }));
};

// Helper to merge FHIR lists with deduplication
export const mergeFHIRLists = (currentItems: FHIRPlanItem[], newItems: FHIRPlanItem[]): FHIRPlanItem[] => {
  let mergedItems = [...currentItems];

  for (const item of newItems) {
    const displayLower = item.display?.toLowerCase() || '';
    const type = item.type;

    if (item.action === 'Remove') {
      // Remove matching item
      // Require type match AND name match (fuzzy)
      mergedItems = mergedItems.filter(existing => {
        const typeMatch = existing.type === item.type;
        const nameMatch = existing.display?.toLowerCase().trim().includes(displayLower.trim()) ||
          displayLower.trim().includes(existing.display?.toLowerCase().trim() || '');

        // If type matches and name matches, filter it OUT (return false)
        return !(typeMatch && nameMatch);
      });

      console.log(`🗑️ [mergeFHIRLists] Removed item: ${item.display} (${item.type})`);

    } else if (item.action === 'Modify') {
      // Update existing item
      let found = false;
      mergedItems = mergedItems.map(existing => {
        const typeMatch = existing.type === item.type;
        const nameMatch = existing.display?.toLowerCase().trim().includes(displayLower.trim()) ||
          displayLower.trim().includes(existing.display?.toLowerCase().trim() || '');

        if (typeMatch && nameMatch) {
          found = true;
          console.log(`✏️ [mergeFHIRLists] Modified item: ${item.display} (${item.type})`);
          return { ...existing, ...item, action: 'Add' }; // Reset action to Add
        }
        return existing;
      });

      // If not found, add as new
      if (!found) {
        mergedItems.push({ ...item, action: 'Add' });
        console.log(`➕ [mergeFHIRLists] Added new item (modify not found): ${item.display} (${item.type})`);
      }

    } else {
      // Add - check for duplicates by type and name similarity
      const isDuplicate = mergedItems.some(existing => {
        const typeMatch = existing.type === item.type;
        const nameMatch = existing.display?.toLowerCase().includes(displayLower) ||
          displayLower.includes(existing.display?.toLowerCase() || '');
        return typeMatch && nameMatch;
      });

      if (!isDuplicate) {
        mergedItems.push({ ...item, action: 'Add' });
        console.log(`➕ [mergeFHIRLists] Added new item: ${item.display} (${item.type})`);
      } else {
        console.log(`⚠️ [mergeFHIRLists] Skipped duplicate: ${item.display} (${item.type})`);
      }
    }
  }

  return mergedItems;
};

export const normalizeFHIR = (items: unknown[]): FHIRPlanItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map((item: any) => ({
    type: item.type || 'medication',
    action: item.action || 'Add',
    display: item.display || item.name || item.drug || item.item || 'Ítem sin nombre',
    details: item.details || item.instructions || item.dosage || 'Sin detalles especificados',
    code: item.code || undefined,          // CIE-10 code for conditions
    codeSystem: item.codeSystem || undefined, // ICD-10, ATC, LOINC, etc.
    warning: item.warning || undefined,    // Warning for incomplete data
    warningLevel: item.warningLevel || undefined,
    verificationStatus: item.verificationStatus || undefined,
    // Extract category from FHIR structure or direct string
    category: typeof item.category === 'string'
      ? item.category
      : Array.isArray(item.category)
        ? item.category[0]?.coding?.[0]?.code || item.category[0]?.code
        : undefined,
    // Preserve any other fields
    ...item,
    id: item.id || generateId(),
    approved: item.approved !== undefined ? item.approved : true
  } as FHIRPlanItem));
};

export const createEmptyClinicalState = () => ({
  soap: { s: '', o: '', a: '', p: '' },
  fhir: [],
  alerts: [],
  healthEducation: ''
});

export const safeText = (text: string | undefined | null, fallback: string = ''): string => {
  if (typeof text !== 'string') return fallback;
  return text.trim() || fallback;
};