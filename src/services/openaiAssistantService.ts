// src/services/openaiAssistantService.ts
/// <reference types="vite/client" />
/**
 * Servicio para conectar con OpenAI Assistant API
 * Tu Assistant "Urbanmetrics" es el cerebro central de la aplicación
 */

import { ValuationData, ValuationReport, UserType } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID || '';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Formatea los datos del inmueble para enviar al Assistant
 */
const formatPropertyDataForAssistant = (data: ValuationData): string => {
  const address = `${data.streetType} ${data.streetName}, ${data.streetNumber}${data.block ? `, Bloque ${data.block}` : ''}${data.entrance ? `, Entrada ${data.entrance}` : ''}${data.floorLevel ? `, Planta ${data.floorLevel}` : ''}${data.door ? `, Puerta ${data.door}` : ''}`;
  
  return `
SOLICITUD DE VALORACIÓN INMOBILIARIA

DATOS DEL SOLICITANTE:
- Tipo de usuario: ${data.userType}
- Correo electrónico: ${data.email}
- Finalidad principal: ${data.mainPurpose}
${data.secondaryPurposes?.length ? `- Finalidades secundarias: ${data.secondaryPurposes.join(', ')}` : ''}

UBICACIÓN DEL INMUEBLE:
- Dirección completa: ${address}
- Código postal: ${data.postalCode}
- Municipio: ${data.municipality}
- Provincia: ${data.province}
- Referencia catastral: ${data.cadastralReference || 'No proporcionada'}

CARACTERÍSTICAS DEL INMUEBLE:
- Tipo de inmueble: ${data.propertyType}
- Año de construcción: ${data.constructionYear || 'No especificado'}
- Tipo de superficie: ${data.surfaceType || 'No especificado'}
- Superficie: ${data.area} m²
${data.plotArea ? `- Superficie de parcela: ${data.plotArea} m²` : ''}
- Habitaciones: ${data.rooms || 'No especificado'}
- Baños: ${data.bathrooms || 'No especificado'}
- Ascensor: ${data.elevator === true ? 'Sí' : data.elevator === false ? 'No' : 'No especificado'}
${data.terrace ? `- Terraza: Sí (${data.terraceType}, ${data.terraceArea} m²)` : '- Terraza: No'}

ANEXOS:
${data.annexes && data.annexes.length > 0 
  ? data.annexes.map(annex => {
      const qty = data.annexQuantities?.[annex] || 1;
      const surfaces = data.annexSurfaces?.[annex];
      const surfaceInfo = surfaces && surfaces.length > 0 
        ? surfaces.map(s => `${s.area}m² (${s.surfaceType})`).join(', ')
        : 'Sin superficie especificada';
      return `- ${annex}: ${qty} unidad(es), ${surfaceInfo}`;
    }).join('\n')
  : '- Sin anexos'}

ZONAS COMUNES:
${data.hasCommonZones 
  ? `Sí: ${data.commonAmenities?.join(', ') || 'No especificadas'}` 
  : 'No aplica o desconocido'}

INFORMACIÓN ADICIONAL:
${data.additionalInfo || 'Ninguna'}

${data.detailedReport ? 'SE SOLICITA INFORME DETALLADO con análisis de comparables, ajustes y explicación completa del valor.' : 'Informe estándar.'}

Por favor, genera un informe de valoración inmobiliaria orientativa completo siguiendo la estructura y principios establecidos en tus instrucciones.
`.trim();
};

/**
 * Crea un nuevo thread en OpenAI
 */
const createThread = async (): Promise<string> => {
  const response = await fetch(`${OPENAI_API_BASE}/threads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error creando thread: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
};

/**
 * Añade un mensaje al thread
 */
const addMessageToThread = async (threadId: string, content: string): Promise<void> => {
  const response = await fetch(`${OPENAI_API_BASE}/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      role: 'user',
      content: content
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error añadiendo mensaje: ${error.error?.message || response.statusText}`);
  }
};

/**
 * Ejecuta el Assistant en el thread
 */
const runAssistant = async (threadId: string): Promise<string> => {
  const response = await fetch(`${OPENAI_API_BASE}/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      assistant_id: ASSISTANT_ID
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error ejecutando assistant: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.id;
};

/**
 * Espera a que el run se complete
 */
const waitForRunCompletion = async (threadId: string, runId: string): Promise<void> => {
  let status = 'queued';
  let attempts = 0;
  const maxAttempts = 60; // 60 intentos * 2 segundos = 2 minutos máximo

  while (status !== 'completed' && status !== 'failed' && status !== 'cancelled' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
    
    const response = await fetch(`${OPENAI_API_BASE}/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!response.ok) {
      throw new Error('Error verificando estado del run');
    }

    const data = await response.json();
    status = data.status;
    attempts++;

    if (status === 'failed') {
      throw new Error(`El Assistant falló: ${data.last_error?.message || 'Error desconocido'}`);
    }

    if (status === 'cancelled') {
      throw new Error('La ejecución fue cancelada');
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error('Tiempo de espera agotado. El informe está tardando demasiado.');
  }
};

/**
 * Obtiene los mensajes del thread
 */
const getThreadMessages = async (threadId: string): Promise<string> => {
  const response = await fetch(`${OPENAI_API_BASE}/threads/${threadId}/messages`, {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    }
  });

  if (!response.ok) {
    throw new Error('Error obteniendo mensajes');
  }

  const data = await response.json();
  
  // El primer mensaje es la respuesta más reciente del assistant
  const assistantMessage = data.data.find((msg: any) => msg.role === 'assistant');
  
  if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
    throw new Error('No se recibió respuesta del Assistant');
  }

  // Extraer el texto del contenido
  const textContent = assistantMessage.content.find((c: any) => c.type === 'text');
  return textContent?.text?.value || '';
};

/**
 * Genera un informe de valoración usando tu OpenAI Assistant
 */
export const generateValuationWithAssistant = async (data: ValuationData): Promise<ValuationReport> => {
  if (!OPENAI_API_KEY) {
    throw new Error('VITE_OPENAI_API_KEY no está configurada');
  }

  if (!ASSISTANT_ID) {
    throw new Error('VITE_OPENAI_ASSISTANT_ID no está configurado');
  }

  try {
    // 1. Crear un nuevo thread
    const threadId = await createThread();

    // 2. Añadir el mensaje con los datos del inmueble
    const propertyMessage = formatPropertyDataForAssistant(data);
    await addMessageToThread(threadId, propertyMessage);

    // 3. Ejecutar el Assistant
    const runId = await runAssistant(threadId);

    // 4. Esperar a que termine
    await waitForRunCompletion(threadId, runId);

    // 5. Obtener la respuesta
    const reportContent = await getThreadMessages(threadId);

    // 6. Extraer valores del informe
    const values = extractValuesFromReport(reportContent);
    const estimatedValue = extractEstimatedValue(reportContent, data);
    const pricePerSquareMeter = data.area ? Math.round(estimatedValue / data.area) : 0;

    // Usar valores extraídos o calcular fallback
    const marketMin = values.marketMin || Math.round(estimatedValue * 0.95);
    const marketMax = values.marketMax || Math.round(estimatedValue * 1.05);
    const mortgageMin = values.mortgageMin || Math.round(estimatedValue * 0.80);
    const mortgageMax = values.mortgageMax || Math.round(estimatedValue * 0.90);
    const listingPrice = values.listingPrice || Math.round(estimatedValue * 1.05);

    // Extraer siguientes pasos del informe
    const nextSteps = extractNextSteps(reportContent);

    return {
      propertyDescription: `${data.propertyType} de ${data.area}m² en ${data.municipality}, ${data.province}`,
      valuationApproach: 'Metodología ECO/805/2003 y ECM/599/2025',
      estimatedValue,
      pricePerSquareMeter,
      confidence: 'alto',
      summary: reportContent,
      reportContent,
      userType: data.userType,
      mainPurpose: data.mainPurpose,
      secondaryPurpose: data.secondaryPurposes?.join(', ') || '',
      timestamp: new Date().toISOString(),
      valuationRange: {
        min: marketMin,
        max: marketMax
      },
      bankEstimateRange: {
        min: mortgageMin,
        max: mortgageMax
      },
      listingPriceRecommendation: listingPrice,
      nextSteps: nextSteps
    };
  } catch (error) {
    console.error('Error con OpenAI Assistant:', error);
    throw error;
  }
};

/**
 * Intenta extraer el valor estimado del contenido del informe
 */
const extractEstimatedValue = (content: string, data: ValuationData): number => {
  // Buscar patrones de valor en el texto
  const patterns = [
    /valor\s+de\s+mercado[:\s]*(?:entre\s+)?([\d.,]+)\s*(?:€|EUR|euros)?\s*[-–y]\s*([\d.,]+)\s*(?:€|EUR|euros)?/i,
    /valor\s+de\s+mercado[:\s]*(?:€|EUR)?\s*([\d.,]+)\s*(?:€|EUR|euros)?/i,
    /valoración[:\s]+(?:€|EUR)?\s*([\d.,]+)/i,
    /([\d.,]+)\s*(?:€|EUR|euros)/i,
    /estimado[:\s]+(?:€|EUR)?\s*([\d.,]+)/i
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // Si hay rango (match[2] existe), calcular promedio
      if (match[2]) {
        const min = parseValue(match[1]);
        const max = parseValue(match[2]);
        if (min > 10000 && max > 10000) {
          return Math.round((min + max) / 2);
        }
      }
      // Valor único
      const value = parseValue(match[1]);
      if (value > 10000) {
        return Math.round(value);
      }
    }
  }

  // Fallback: calcular un valor estimado básico
  return calculateFallbackValue(data);
};

/**
 * Extrae los tres valores del informe: mercado, hipotecario y venta
 */
const extractValuesFromReport = (content: string): { marketMin: number; marketMax: number; mortgageMin: number; mortgageMax: number; listingPrice: number } => {
  const result = { marketMin: 0, marketMax: 0, mortgageMin: 0, mortgageMax: 0, listingPrice: 0 };
  
  // Valor de mercado (buscar rango)
  const marketPattern = /valor\s+de\s+mercado[:\s]*(?:entre\s+)?([\d.,]+)\s*(?:€|EUR|euros)?\s*[-–y]\s*([\d.,]+)\s*(?:€|EUR|euros)?/i;
  const marketMatch = content.match(marketPattern);
  if (marketMatch) {
    result.marketMin = parseValue(marketMatch[1]);
    result.marketMax = parseValue(marketMatch[2]);
  }
  
  // Valor hipotecario
  const mortgagePattern = /valor\s+(?:hipotecario|garantía\s+hipotecaria)[:\s]*(?:entre\s+)?([\d.,]+)\s*(?:€|EUR|euros)?\s*[-–y]\s*([\d.,]+)\s*(?:€|EUR|euros)?/i;
  const mortgageMatch = content.match(mortgagePattern);
  if (mortgageMatch) {
    result.mortgageMin = parseValue(mortgageMatch[1]);
    result.mortgageMax = parseValue(mortgageMatch[2]);
  }
  
  // Valor de venta recomendado
  const listingPattern = /valor\s+de\s+venta\s+recomendado[:\s]*([\d.,]+)\s*(?:€|EUR|euros)?/i;
  const listingMatch = content.match(listingPattern);
  if (listingMatch) {
    result.listingPrice = parseValue(listingMatch[1]);
  }
  
  return result;
};

/**
 * Parsea un valor numérico desde string (maneja formatos españoles)
 */
const parseValue = (str: string): number => {
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
};

/**
 * Extrae los siguientes pasos recomendados del informe
 */
const extractNextSteps = (content: string): string[] => {
  // Buscar la sección de siguientes pasos
  const sectionPattern = /(?:siguientes\s+pasos|pasos\s+recomendados|recomendaciones)[:\s]*\n([\s\S]*?)(?=\n##|\n---|\*\*AVISO|$)/i;
  const sectionMatch = content.match(sectionPattern);
  
  if (sectionMatch) {
    const sectionContent = sectionMatch[1];
    // Extraer items numerados o con viñetas
    const stepPattern = /(?:^|\n)\s*(?:\d+[.)]\s*|[-•*]\s*)(.+)/g;
    const steps: string[] = [];
    let match;
    
    while ((match = stepPattern.exec(sectionContent)) !== null) {
      const step = match[1].trim();
      if (step.length > 10 && steps.length < 6) {
        steps.push(step);
      }
    }
    
    if (steps.length > 0) {
      return steps;
    }
  }
  
  // Fallback: pasos por defecto
  return [
    'Verificar la situación urbanística y registral del inmueble',
    'Solicitar nota simple actualizada del Registro de la Propiedad',
    'Comprobar superficies en el Catastro',
    'Si es para hipoteca, solicitar tasación oficial ECO/805/2003',
    'Preparar documentación para la comercialización del inmueble'
  ];
};

/**
 * Calcula un valor de fallback si no se puede extraer del informe
 */
const calculateFallbackValue = (data: ValuationData): number => {
  const pricesByProvince: Record<string, number> = {
    'Madrid': 4500,
    'Barcelona': 5200,
    'Valencia': 2800,
    'Sevilla': 2200,
    'Bilbao': 3800,
    'Vizcaya': 3800,
    'Alicante': 2600,
    'Málaga': 2400,
    'Murcia': 1800,
    'Zaragoza': 2400,
    'Islas Baleares': 4200,
    'Las Palmas': 2800,
    'Santa Cruz de Tenerife': 2600
  };

  const basePrice = pricesByProvince[data.province] || 2500;
  let adjustedPrice = basePrice;

  // Ajustes
  const age = data.constructionYear ? new Date().getFullYear() - data.constructionYear : 20;
  if (age > 50) adjustedPrice *= 0.75;
  else if (age > 30) adjustedPrice *= 0.85;
  else if (age > 10) adjustedPrice *= 0.95;

  if (data.elevator) adjustedPrice *= 1.05;
  if (data.terrace) adjustedPrice *= 1.08;

  return Math.round(adjustedPrice * (data.area || 100));
};

/**
 * Verifica si el servicio está configurado correctamente
 */
export const isAssistantConfigured = (): boolean => {
  return Boolean(OPENAI_API_KEY && ASSISTANT_ID);
};

export { formatPropertyDataForAssistant };
