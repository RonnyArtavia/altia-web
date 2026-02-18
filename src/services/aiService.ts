/**
 * AI FHIR Service - Exactly replicating the original implementation
 * Main service for converting medical text to FHIR structures using AI
 */

import { buildOriginalSystemPrompt, buildOriginalPromptWithContext } from './fhirPromptsOriginal';

export interface AIServiceConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  systemPrompt?: string;
}

export interface MedicalContext {
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  patientHistory?: any;
  patientAllergies?: any[];
  patientMedications?: any[];
  patientRecord?: any;
  patientIPS?: any;
  clinicalState?: any;
  [key: string]: any;
}

export interface FHIRExtractionResult {
  type: 'note' | 'question' | 'noise' | 'clarification';
  reason?: string;
  intent?: 'direct_command' | 'suggestion';
  soap: {
    s: string;
    o: string;
    a: string;
    p: string;
  };
  healthEducation: string;
  fhir: Array<{
    id: string;
    type: string;
    status: string;
    text: string;
    display: string;
    details?: string;
    code?: string;
    codeSystem?: string;
    verificationStatus?: string;
    action?: string;
    dose?: string;
    warning?: string;
    warningLevel?: string;
  }>;
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    data: any;
  }>;
  alerts: string[];
  summary: string;
  answer?: string;
  ipsSummary?: any;
}

export interface AIServiceResponse {
  success: boolean;
  data?: FHIRExtractionResult;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

/**
 * AI FHIR Service Class - Exact replica of original
 */
export class AIFHIRService {
  private config: Required<AIServiceConfig>;

  constructor(config: AIServiceConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      model: config.model || 'gemini-2.5-flash',
      maxTokens: config.maxTokens || 8192,
      temperature: config.temperature || 0.3,
      timeout: config.timeout || 60000,
      systemPrompt: config.systemPrompt || ''
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required for AIFHIRService');
    }
  }

  /**
   * Convert medical text to FHIR structures - Exact replica
   */
  async textToFHIR(
    text: string,
    context?: MedicalContext
  ): Promise<AIServiceResponse> {
    try {
      // Validate input
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: {
            code: 'EMPTY_TEXT',
            message: 'Text cannot be empty'
          }
        };
      }

      // Build context string for original prompt
      const today = new Date().toISOString().split('T')[0];
      const contextString = '';

      // Build system prompt exactly like original
      const systemPrompt = buildOriginalSystemPrompt(
        contextString,
        today,
        context?.patientRecord,
        context?.patientIPS,
        context?.clinicalState || { soap: { s: '', o: '', a: '', p: '' }, fhir: [], alerts: [], healthEducation: '' }
      );

      // Store the system prompt in config for use in API calls
      this.config.systemPrompt = systemPrompt;

      // Build user prompt exactly like original
      const userPrompt = buildOriginalPromptWithContext(text, context);

      // Log user prompt information
      console.log('AIFHIRService: User prompt length:', userPrompt.length, 'characters');
      if (context) {
        console.log('AIFHIRService: Context includes:',
          context.patientName ? 'patientName' : '',
          context.patientAge ? 'patientAge' : '',
          context.patientGender ? 'patientGender' : '',
          context.patientHistory ? 'patientHistory' : '',
          context.patientAllergies ? 'patientAllergies' : '',
          context.patientMedications ? 'patientMedications' : ''
        );
      }

      // Call AI API
      const startTime = Date.now();
      const apiResponse = await this.callAIAPI(userPrompt);
      const duration = Date.now() - startTime;

      console.log(`AI API call completed in ${duration}ms`);

      // 🔍 DEBUG: Log raw AI response before parsing
      console.log('=================================================');
      console.log('🤖 RAW AI RESPONSE (before parsing):');
      console.log('=================================================');
      console.log('Response length:', apiResponse.content.length, 'characters');
      console.log('First 500 chars:', apiResponse.content.substring(0, 500));
      console.log('Last 500 chars:', apiResponse.content.substring(apiResponse.content.length - 500));
      console.log('=================================================');

      // Parse response - exact same as original
      const extractedData = this.parseFHIRResponse(apiResponse.content);

      // Generate IPS Summary for display (if needed)
      if (extractedData.fhir && extractedData.fhir.length > 0) {
        extractedData.ipsSummary = this.generateIPSSummary(extractedData);
        console.log('AIFHIRService: ✅ IPS summary generated', {
          fhirResources: extractedData.fhir.length
        });
      }

      return {
        success: true,
        data: extractedData,
        usage: apiResponse.usage
      };
    } catch (error) {
      console.error('Error in textToFHIR:', error);
      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          details: error
        }
      };
    }
  }

  /**
   * Call AI API with model fallback - Exact replica of original logic
   */
  private async callAIAPI(userPrompt: string): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCost: number;
    };
  }> {
    // Log the system prompt being used
    console.log('AIFHIRService: ========== SYSTEM PROMPT BEING USED ==========');
    console.log('AIFHIRService: Prompt length:', this.config.systemPrompt.length, 'characters');
    console.log('AIFHIRService: First 300 characters of prompt:');
    console.log(this.config.systemPrompt.substring(0, 300) + '...');
    console.log('AIFHIRService: ==============================================');

    // Models to try in order (same as original version)
    const models = [
      'gemini-2.5-flash',       // Primary: Best quality
      'gemini-2.5-flash-lite',  // Fallback: Faster if primary fails
      'gemini-2.0-flash',       // Legacy fallback
      'gemini-1.5-flash',       // Last resort
      'gemini-1.5-pro'          // Final fallback
    ];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `${this.config.systemPrompt}\n\n${userPrompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        response_mime_type: "application/json"
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Try each model in sequence
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
        console.log(`🔄 AIFHIRService: Trying model: ${model}`);

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`❌ Model ${model} failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
            continue; // Try next model
          }

          const data = await response.json();

          // Extract content from Gemini response format
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (!content) {
            console.warn(`❌ Model ${model} returned empty content`);
            continue; // Try next model
          }

          console.log(`✅ Model ${model} succeeded`);

          // Calculate usage and cost
          let usage;
          if (data.usageMetadata) {
            const promptTokens = data.usageMetadata.promptTokenCount || 0;
            const completionTokens = data.usageMetadata.candidatesTokenCount || 0;
            const totalTokens = data.usageMetadata.totalTokenCount || promptTokens + completionTokens;

            // Gemini pricing (free tier for now)
            const estimatedCost = 0; // Free model

            usage = {
              promptTokens,
              completionTokens,
              totalTokens,
              estimatedCost
            };
          }

          clearTimeout(timeoutId);
          return {
            content,
            usage
          };
        } catch (modelError) {
          console.warn(`❌ Model ${model} error:`, modelError instanceof Error ? modelError.message : modelError);
          continue; // Try next model
        }
      }

      // All models failed
      throw new Error('All Gemini models failed');
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`AI API timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Parse FHIR response from AI - Enhanced to handle simplified format
   */
  private parseFHIRResponse(content: string): FHIRExtractionResult {
    try {
      // Try to parse JSON directly
      const parsed = JSON.parse(content);

      if (parsed.type === 'NOTA_MEDICA') {
        // Handle simplified format - direct extraction
        const convertedFhir: any[] = [];

        // Convert simplified medications to FHIR format
        if (parsed.medications && Array.isArray(parsed.medications)) {
          parsed.medications.forEach((med: any, index: number) => {
            // Build detailed medication display with all components
            let medicationDisplay = med.name || 'Medicamento';

            if (med.dose) medicationDisplay += ` ${med.dose}`;
            if (med.frequency) medicationDisplay += ` ${med.frequency}`;
            if (med.duration) medicationDisplay += ` por ${med.duration}`;
            if (med.route) medicationDisplay += ` (${med.route})`;
            if (med.instructions) medicationDisplay += ` - ${med.instructions}`;

            convertedFhir.push({
              id: `medication_${Date.now()}_${index}`,
              type: 'medication',
              status: 'active',
              text: medicationDisplay,
              display: medicationDisplay,
              details: `Medicamento prescrito: ${medicationDisplay}`,
              // Store individual components for better extraction
              dose: med.dose || '',
              frequency: med.frequency || '',
              duration: med.duration || '',
              route: med.route || '',
              instructions: med.instructions || ''
            });
          });
        }

        // Convert simplified conditions
        if (parsed.conditions && Array.isArray(parsed.conditions)) {
          parsed.conditions.forEach((condition: any, index: number) => {
            convertedFhir.push({
              id: `condition_${Date.now()}_${index}`,
              type: 'condition',
              status: condition.status === 'activa' ? 'active' : condition.status || 'active',
              text: condition.name || '',
              display: condition.name || '',
              details: `Diagnóstico: ${condition.name}`,
              verificationStatus: 'confirmed'
            });
          });
        }

        // Convert simplified lab tests
        if (parsed.labTests && Array.isArray(parsed.labTests)) {
          parsed.labTests.forEach((lab: any, index: number) => {
            convertedFhir.push({
              id: `lab_${Date.now()}_${index}`,
              type: 'labOrder',
              status: 'active',
              text: lab.name || '',
              display: lab.name || '',
              details: `Examen de laboratorio: ${lab.name}`
            });
          });
        }

        // Convert simplified imaging
        if (parsed.imaging && Array.isArray(parsed.imaging)) {
          parsed.imaging.forEach((img: any, index: number) => {
            convertedFhir.push({
              id: `imaging_${Date.now()}_${index}`,
              type: 'imagingOrder',
              status: 'active',
              text: img.name || '',
              display: img.name || '',
              details: `Estudio de imagen: ${img.name}`,
              bodySite: img.region || ''
            });
          });
        }

        console.log('🔄 Converting simplified NOTA_MEDICA format:', {
          soapSubjective: parsed.soap?.subjective,
          soapObjective: parsed.soap?.objective,
          soapAssessment: parsed.soap?.assessment,
          soapPlan: parsed.soap?.plan,
          medicationsCount: parsed.medications?.length || 0,
          conditionsCount: parsed.conditions?.length || 0,
          fhirResourcesCount: convertedFhir.length,
          alertsCount: parsed.alerts?.length || 0,
          suggestionsCount: parsed.suggestions?.length || 0
        });

        return {
          type: 'note',
          intent: 'direct_command',
          soap: {
            s: parsed.soap?.subjective || '',
            o: parsed.soap?.objective || '',
            a: parsed.soap?.assessment || '',
            p: parsed.soap?.plan || ''
          },
          healthEducation: parsed.healthEducation || '',
          fhir: convertedFhir,
          suggestions: parsed.suggestions || [],
          alerts: parsed.alerts || [],
          summary: parsed.message || 'Nota médica procesada',
          answer: parsed.answer,
          // Enhanced: Include the IPS summary for proper integration
          ipsSummary: parsed.ipsSummary || this.buildIPSSummaryFromData(parsed)
        };
      }

      // Handle other formats (questions, etc.)
      return {
        type: parsed.type || 'note',
        reason: parsed.reason,
        intent: parsed.intent || 'direct_command',
        soap: {
          s: parsed.soap?.s || parsed.soap?.subjective || '',
          o: parsed.soap?.o || parsed.soap?.objective || '',
          a: parsed.soap?.a || parsed.soap?.assessment || '',
          p: parsed.soap?.p || parsed.soap?.plan || ''
        },
        healthEducation: parsed.healthEducation || '',
        fhir: parsed.fhir || [],
        suggestions: parsed.suggestions || [],
        alerts: parsed.alerts || [],
        summary: parsed.summary || parsed.message || 'Nota médica procesada',
        answer: parsed.answer,
        ipsSummary: parsed.ipsSummary
      };
    } catch (error) {
      console.error('Failed to parse FHIR response:', error);
      console.error('Raw content:', content);

      // Return fallback structure
      return {
        type: 'note',
        intent: 'direct_command',
        soap: { s: '', o: '', a: '', p: '' },
        healthEducation: '',
        fhir: [],
        suggestions: [],
        alerts: ['Error parsing AI response'],
        summary: 'Error en el procesamiento de la respuesta'
      };
    }
  }

  /**
   * Build IPS summary from parsed data when not provided by AI
   */
  private buildIPSSummaryFromData(parsed: any): any {
    const summary: any = {
      newFindings: [],
      alerts: [],
      recommendations: []
    };

    // Add new findings from medications
    if (parsed.medications && parsed.medications.length > 0) {
      parsed.medications.forEach((med: any) => {
        let finding = `Prescripción: ${med.name}`;
        if (med.dose) finding += ` ${med.dose}`;
        if (med.frequency) finding += ` ${med.frequency}`;
        if (med.duration) finding += ` por ${med.duration}`;
        summary.newFindings.push(finding);
      });
    }

    // Add new findings from conditions
    if (parsed.conditions && parsed.conditions.length > 0) {
      parsed.conditions.forEach((cond: any) => {
        summary.newFindings.push(`Diagnóstico: ${cond.name}`);
      });
    }

    // Add alerts
    if (parsed.alerts && parsed.alerts.length > 0) {
      summary.alerts = parsed.alerts;
    }

    // Add suggestions as recommendations
    if (parsed.suggestions && parsed.suggestions.length > 0) {
      summary.recommendations = parsed.suggestions;
    }

    return summary;
  }

  /**
   * Generate IPS Summary from FHIR data
   */
  private generateIPSSummary(data: FHIRExtractionResult): any {
    const summary: any = {
      diagnoses: [],
      medications: [],
      observations: [],
      serviceRequests: []
    };

    // Process FHIR resources
    data.fhir?.forEach(resource => {
      switch (resource.type) {
        case 'condition':
          summary.diagnoses.push({
            display: resource.display,
            code: resource.code,
            status: resource.status
          });
          break;
        case 'medication':
          summary.medications.push({
            display: resource.display,
            dose: resource.dose,
            details: resource.details
          });
          break;
        case 'observation':
          summary.observations.push({
            display: resource.display,
            value: resource.details
          });
          break;
        case 'labOrder':
        case 'imagingOrder':
          summary.serviceRequests.push({
            display: resource.display,
            type: resource.type
          });
          break;
      }
    });

    return summary;
  }
}

// Default instance - will be initialized with API key when available
let serviceInstance: AIFHIRService | null = null;

export function getAIFHIRService(apiKey?: string): AIFHIRService | null {
  if (!apiKey) {
    return null;
  }

  if (!serviceInstance) {
    serviceInstance = new AIFHIRService({ apiKey });
  }

  return serviceInstance;
}