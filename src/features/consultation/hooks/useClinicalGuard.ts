import { useMemo } from 'react';
import type { IPSDisplayData } from '@/features/consultation/types/medical-notes';

export type AlertLevel = 'high' | 'medium' | 'low' | 'safe';

export interface RiskAlert {
    id: string;
    level: AlertLevel;
    message: string;
    trigger: string;
}

// Expanded Drug Classes Database (simulating a medical knowledge base)
const DRUG_CLASSES: Record<string, string[]> = {
    'penicilina': ['amoxicilina', 'ampicilina', 'penicilina', 'augmentin', 'amoxicilina-clavulánico', 'cloxacilina'],
    'aines': ['aspirina', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'ketorolaco', 'meloxicam', 'celecoxib', 'indometacina'],
    'opioides': ['tramadol', 'morfina', 'codeina', 'fentanilo', 'oxicodona', 'hidromorfona'],
    'anticoagulantes': ['warfarina', 'heparina', 'rivaroxabán', 'apixabán', 'dabigatrán'],
    'ace_inhibidores': ['enalapril', 'lisinopril', 'captopril', 'ramipril', 'benazepril'],
    'beta_bloqueadores': ['propranolol', 'metoprolol', 'atenolol', 'carvedilol', 'bisoprolol'],
    'diureticos': ['furosemida', 'hidroclorotiazida', 'espironolactona', 'amilorida'],
    'benzodiacepinas': ['alprazolam', 'lorazepam', 'diazepam', 'clonazepam', 'midazolam'],
    'estatinas': ['atorvastatina', 'simvastatina', 'rosuvastina', 'pravastatina'],
    'insulina': ['insulina', 'insulina glargina', 'insulina lispro', 'insulina aspart'],
    'antibioticos_macrólidos': ['azitromicina', 'claritromicina', 'eritromicina'],
    'sulfa': ['trimetoprim-sulfametoxazol', 'sulfasalazina', 'sulfadiazina']
};

// Comprehensive Drug Interactions Database
const INTERACTIONS: Record<string, { with: string[], msg: string, level: AlertLevel }>[] = [
    // Anticoagulantes + AINEs
    {
        'warfarina': {
            with: ['aspirina', 'ibuprofeno', 'naproxeno', 'diclofenaco', 'ketorolaco'],
            msg: '⚠️ SANGRADO: Riesgo aumentado de hemorragia (Anticoagulante + AINE)',
            level: 'high'
        }
    },
    // Nitratos + Inhibidores PDE5
    {
        'sildenafil': {
            with: ['nitroglicerina', 'isosorbide', 'mononitrato de isosorbide'],
            msg: '🚨 HIPOTENSIÓN: Contraindicación absoluta (Nitrato + Inhibidor PDE5)',
            level: 'high'
        }
    },
    // ACE inhibidores + Diuréticos ahorradores de potasio
    {
        'enalapril': {
            with: ['espironolactona', 'amilorida'],
            msg: '⚠️ HIPERPOTASEMIA: Monitorizar K+ (IECA + Diurético ahorrador K+)',
            level: 'medium'
        }
    },
    // Beta bloqueadores + Insulina
    {
        'propranolol': {
            with: ['insulina', 'insulina glargina'],
            msg: '⚠️ HIPOGLUCEMIA: Enmascara síntomas (Beta bloqueador + Insulina)',
            level: 'medium'
        }
    },
    // Benzodiacepinas + Opioides
    {
        'alprazolam': {
            with: ['tramadol', 'morfina', 'codeina'],
            msg: '🚨 DEPRESIÓN RESPIRATORIA: Evitar combinación (Benzodiacepina + Opioide)',
            level: 'high'
        }
    },
    // Estatinas + Macrólidos
    {
        'atorvastatina': {
            with: ['claritromicina', 'eritromicina'],
            msg: '⚠️ MIOPATÍA: Riesgo de rabdomiólisis (Estatina + Macrólido)',
            level: 'medium'
        }
    }
];

// Medication Dosage Validation Rules
const DOSAGE_RULES: Record<string, {
    maxDaily: number,
    unit: string,
    routes: string[],
    frequencies: string[],
    contraindications: string[]
}> = {
    'ibuprofeno': {
        maxDaily: 3200,
        unit: 'mg',
        routes: ['oral', 'vo', 'por boca'],
        frequencies: ['cada 6 horas', 'cada 8 horas', 'tid', 'qid', 'c/6h', 'c/8h'],
        contraindications: ['úlcera péptica', 'insuficiencia renal', 'embarazo tercer trimestre']
    },
    'paracetamol': {
        maxDaily: 4000,
        unit: 'mg',
        routes: ['oral', 'vo', 'iv', 'intravenoso'],
        frequencies: ['cada 4-6 horas', 'cada 6 horas', 'qid', 'tid', 'c/4-6h'],
        contraindications: ['insuficiencia hepática severa']
    },
    'enalapril': {
        maxDaily: 40,
        unit: 'mg',
        routes: ['oral', 'vo'],
        frequencies: ['una vez al día', 'dos veces al día', 'qd', 'bid', 'c/12h'],
        contraindications: ['embarazo', 'angioedema previo', 'hiperpotasemia']
    },
    'metformina': {
        maxDaily: 2550,
        unit: 'mg',
        routes: ['oral', 'vo'],
        frequencies: ['dos veces al día', 'tres veces al día', 'bid', 'tid', 'c/12h'],
        contraindications: ['insuficiencia renal', 'acidosis láctica', 'insuficiencia hepática']
    }
};

export function useClinicalGuard(currentText: string, ipsData: IPSDisplayData) {

    const activeAlerts = useMemo(() => {
        const alerts: RiskAlert[] = [];
        const lowerText = currentText.toLowerCase();

        // 1. Allergy Detection (Active writing)
        // Check if user is typing a drug name that matches patient allergies
        if (ipsData.allergies.length > 0) {
            ipsData.allergies.forEach(allergy => {
                const allergen = allergy.name?.toLowerCase() || '';

                // Helper for fuzzy matching (simple Levenshtein for typos like "amxicilina")
                const isMatch = (text: string, target: string) => {
                    if (text.includes(target)) return true;
                    // Simple fuzzy: allow 1-2 missing/wrong chars if target is long enough
                    if (target.length > 5) {
                        const words = text.split(/\s+/);
                        return words.some(w => {
                            if (Math.abs(w.length - target.length) > 2) return false;
                            let errors = 0;
                            let i = 0, j = 0;
                            while (i < w.length && j < target.length) {
                                if (w[i] !== target[j]) {
                                    errors++;
                                    // Try skip in w
                                    if (w[i + 1] === target[j]) i++;
                                    // Try skip in target
                                    else if (w[i] === target[j + 1]) j++;
                                }
                                i++; j++;
                            }
                            return errors <= 2;
                        });
                    }
                    return false;
                };

                // Direct match
                if (isMatch(lowerText, allergen)) {
                    alerts.push({
                        id: `alg-${allergen}`,
                        level: 'high',
                        message: `ALERGIA DETECTADA: Paciente alérgico a ${allergy.name}`,
                        trigger: allergen
                    });
                }

                // Class match (simple heuristic)
                const relatedDrugs = DRUG_CLASSES[allergen];
                if (relatedDrugs) {
                    relatedDrugs.forEach(drug => {
                        if (isMatch(lowerText, drug)) {
                            alerts.push({
                                id: `alg-rel-${drug}`,
                                level: 'high',
                                message: `RIESGO CRUZADO: ${drug} relacionado con alergia a ${allergy.name}`,
                                trigger: drug
                            });
                        }
                    });
                }
            });
        }

        // 2. Enhanced Drug Interaction Detection
        const activeMeds = ipsData.medications.map(m => m.name?.toLowerCase() || '');

        // Check comprehensive drug interactions
        INTERACTIONS.forEach(interactionObj => {
            const drugName = Object.keys(interactionObj)[0];
            const interaction = interactionObj[drugName];

            // Check if any active medication matches the drug with interactions
            const hasActiveMed = activeMeds.some(med => med.includes(drugName));

            if (hasActiveMed) {
                // Check if current text includes any interacting drug
                interaction.with.forEach(interactingDrug => {
                    if (lowerText.includes(interactingDrug)) {
                        alerts.push({
                            id: `int-${drugName}-${interactingDrug}`,
                            level: interaction.level,
                            message: interaction.msg,
                            trigger: interactingDrug
                        });
                    }
                });
            }
        });

        // 3. Dosage and Route Validation
        Object.keys(DOSAGE_RULES).forEach(drugName => {
            if (lowerText.includes(drugName)) {
                const rules = DOSAGE_RULES[drugName];

                // Extract dosage from text (simple regex)
                const dosageMatch = lowerText.match(new RegExp(`${drugName}\\s*(\\d+)\\s*mg`, 'i'));
                if (dosageMatch) {
                    const dosage = parseInt(dosageMatch[1]);
                    if (dosage > rules.maxDaily) {
                        alerts.push({
                            id: `dose-${drugName}-high`,
                            level: 'high',
                            message: `🚨 SOBREDOSIS: ${drugName} ${dosage}mg excede dosis máxima diaria (${rules.maxDaily}mg)`,
                            trigger: `${drugName} ${dosage}mg`
                        });
                    }
                }

                // Check for invalid routes
                const routePattern = /(vía|via|route|ruta)\s*(\w+)|\b(iv|im|vo|oral|intravenoso|intramuscular|subcutáneo|sublingual)\b/i;
                const routeMatch = lowerText.match(routePattern);
                if (routeMatch) {
                    const route = (routeMatch[2] || routeMatch[3] || '').toLowerCase();
                    if (route && !rules.routes.some(validRoute => validRoute.includes(route))) {
                        alerts.push({
                            id: `route-${drugName}-invalid`,
                            level: 'medium',
                            message: `⚠️ VÍA INADECUADA: ${drugName} por ${route}. Vías válidas: ${rules.routes.join(', ')}`,
                            trigger: route
                        });
                    }
                }

                // Check for missing frequency
                const hasFrequency = rules.frequencies.some(freq => lowerText.includes(freq));
                if (!hasFrequency && lowerText.includes('mg')) {
                    alerts.push({
                        id: `freq-${drugName}-missing`,
                        level: 'low',
                        message: `💡 FRECUENCIA FALTANTE: Especificar frecuencia para ${drugName}`,
                        trigger: drugName
                    });
                }

                // Check contraindications against patient conditions
                rules.contraindications.forEach(contraindication => {
                    const hasContraindication = ipsData.conditions?.some(condition =>
                        condition.name?.toLowerCase().includes(contraindication.toLowerCase())
                    );
                    if (hasContraindication) {
                        alerts.push({
                            id: `contra-${drugName}-${contraindication}`,
                            level: 'high',
                            message: `🚨 CONTRAINDICACIÓN: ${drugName} contraindicado en ${contraindication}`,
                            trigger: contraindication
                        });
                    }
                });
            }
        });

        // 4. Incomplete Prescription Validation
        // Detect medication names but missing critical information
        const medicationPattern = /\b(recetar|prescribir|indicar|dar)\s+(\w+)/gi;
        let match;
        while ((match = medicationPattern.exec(currentText)) !== null) {
            const medication = match[2].toLowerCase();

            // Check if it's a known medication that needs dose/frequency
            const needsValidation = Object.keys(DOSAGE_RULES).some(drug =>
                medication.includes(drug) || drug.includes(medication)
            );

            if (needsValidation) {
                const hasDose = /\d+\s*(mg|ml|g|mcg|μg)/i.test(currentText);
                const hasFrequency = /(cada|c\/|qd|bid|tid|qid|una vez|dos veces|tres veces)/i.test(currentText);

                if (!hasDose) {
                    alerts.push({
                        id: `dose-missing-${medication}`,
                        level: 'medium',
                        message: `⚠️ DOSIS FALTANTE: Especificar dosis para ${medication}`,
                        trigger: medication
                    });
                }

                if (!hasFrequency) {
                    alerts.push({
                        id: `freq-missing-${medication}`,
                        level: 'medium',
                        message: `⚠️ FRECUENCIA FALTANTE: Especificar frecuencia para ${medication}`,
                        trigger: medication
                    });
                }
            }
        }

        // 5. Age-based Contraindications (simplified)
        // This would require patient age from context
        if (lowerText.includes('aspirina') && lowerText.includes('niño')) {
            alerts.push({
                id: 'age-aspirin-child',
                level: 'high',
                message: '🚨 EDAD: Aspirina contraindicada en menores (Síndrome de Reye)',
                trigger: 'aspirina en niños'
            });
        }

        return alerts;
    }, [currentText, ipsData]);

    // Overall Status
    const guardStatus: AlertLevel = useMemo(() => {
        if (activeAlerts.some(a => a.level === 'high')) return 'high';
        if (activeAlerts.some(a => a.level === 'medium')) return 'medium';
        if (activeAlerts.some(a => a.level === 'low')) return 'low';
        return 'safe';
    }, [activeAlerts]);

    return {
        alerts: activeAlerts,
        activeAlerts: activeAlerts, // For compatibility with SafeguardsPanel
        status: guardStatus
    };
}