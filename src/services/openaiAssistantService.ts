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
 * PRECIOS €/m² TRAMO ALTO DEL MERCADO (Diciembre 2024 - Actualizado)
 * Estos son valores del tramo alto, no medias
 */
const PRECIOS_M2_TRAMO_ALTO: Record<string, number> = {
  // Andalucía
  'Málaga': 5200,
  'Marbella': 8500,
  'Sevilla': 4500,
  'Granada': 3800,
  'Córdoba': 3200,
  'Cádiz': 4200,
  'Almería': 3200,
  'Huelva': 2800,
  'Jaén': 2600,
  // Madrid
  'Madrid': 7500,
  // Cataluña
  'Barcelona': 7000,
  'Tarragona': 3800,
  'Girona': 4200,
  'Lleida': 2800,
  // Comunidad Valenciana
  'Valencia': 4500,
  'Alicante': 4200,
  'Castellón': 3200,
  // País Vasco
  'Bilbao': 5500,
  'San Sebastián': 8500,
  'Vitoria': 4500,
  // Baleares
  'Palma de Mallorca': 6500,
  'Ibiza': 10000,
  // Canarias
  'Las Palmas': 4200,
  'Santa Cruz de Tenerife': 3800,
  // Otras
  'Zaragoza': 3800,
  'Murcia': 3400,
  'Valladolid': 3200,
  'A Coruña': 3800,
  'Vigo': 3600,
  'Oviedo': 3600,
  'Santander': 4200,
  'Pamplona': 4500,
  'Logroño': 3200,
  // Default para otras ciudades
  'DEFAULT': 3500
};

/**
 * Obtiene el precio €/m² del tramo alto para una ubicación
 */
const getPrecioM2TramoAlto = (municipality: string, province: string): number => {
  // Buscar primero por municipio
  if (PRECIOS_M2_TRAMO_ALTO[municipality]) {
    return PRECIOS_M2_TRAMO_ALTO[municipality];
  }
  // Luego por provincia
  if (PRECIOS_M2_TRAMO_ALTO[province]) {
    return PRECIOS_M2_TRAMO_ALTO[province];
  }
  // Default
  return PRECIOS_M2_TRAMO_ALTO['DEFAULT'];
};

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
    let reportContent = await getThreadMessages(threadId);

    // 6. Calcular superficie construida con elementos comunes (CCC)
    // Coeficientes:
    // - CONSTRUIDA → ÚTIL: ÷ 1.15
    // - ÚTIL → CCC: × 1.25 (horizontal/pisos) o × 1.20 (vertical/unifamiliar)
    
    let superficieCCC = data.area;
    const esUnifamiliar = data.propertyType?.includes('Unifamiliar') || false;
    const coefUtilACCC = esUnifamiliar ? 1.20 : 1.25;
    
    if (data.surfaceType === 'Útil') {
      // Útil → CCC
      superficieCCC = Math.round(data.area * coefUtilACCC * 100) / 100;
    } else if (data.surfaceType === 'Construida') {
      // Construida → Útil: ÷ 1.15, luego Útil → CCC
      const superficieUtil = data.area / 1.15;
      superficieCCC = Math.round(superficieUtil * coefUtilACCC * 100) / 100;
    }
    // Si ya es CCC (Construida con elementos comunes), se usa directamente

    // 7. Extraer valores del asistente y aplicar incremento interno
    const values = extractValuesFromReport(reportContent, data);
    
    // Fallback con €/m² del tramo alto si el asistente no devuelve valores
    const precioM2TramoAlto = getPrecioM2TramoAlto(data.municipality, data.province);
    const valorFallback = Math.round(precioM2TramoAlto * superficieCCC);
    
    // INCREMENTO INTERNO +15% (se aplica a los valores del asistente)
    const INCREMENTO_INTERNO = 1.15;
    
    // Usar valor del asistente con incremento, o fallback si no hay valor
    const baseMarket = values.marketValue > 0 ? values.marketValue : valorFallback;
    const marketValue = Math.round(baseMarket * INCREMENTO_INTERNO);
    const mortgageValue = Math.round(marketValue * 0.85);
    const freeMarketValue = Math.round(marketValue * 1.05);
    const listingPrice = Math.round(marketValue * 1.05);
    
    const pricePerSquareMeter = superficieCCC ? Math.round(marketValue / superficieCCC) : 0;

    // Formatear valores para el informe
    const formatoEuro = (valor: number) => valor.toLocaleString('es-ES');
    
    // Reemplazar la superficie en el informe con la CCC calculada
    const patronSuperficie = /Superficie\s+utilizada\s+a\s+efectos\s+de\s+valoraci[oó]n[^:]*:\s*[\d.,]+\s*m²/gi;
    reportContent = reportContent.replace(patronSuperficie, 
      `Superficie utilizada a efectos de valoración (superficie construida con elementos comunes): ${superficieCCC} m²`);
    
    // Reemplazar SOLO la sección de VALORES EMITIDOS (sin tocar ADVERTENCIAS)
    // El patrón captura desde "VALORES EMITIDOS" hasta justo antes de cualquier sección de advertencias
    const patronValoresEmitidos = /\*?\*?VALORES\s+EMITIDOS\*?\*?:?\s*\n((?:(?!\n\*?\*?ADVERTENCIAS)[\s\S])*?)(?=\n\*?\*?ADVERTENCIAS|\n---|\*\*---\*\*|$)/i;
    const nuevosValoresEmitidos = `**VALORES EMITIDOS:**

1. VALOR DE MERCADO (ECO/ECM): **${formatoEuro(marketValue)} €**
2. VALOR DE GARANTÍA HIPOTECARIA: **${formatoEuro(mortgageValue)} €**
3. VALOR DE MERCADO LIBRE (no OM): **${formatoEuro(freeMarketValue)} €**
4. VALOR DE VENTA RECOMENDADO: **${formatoEuro(listingPrice)} €**

`;
    
    reportContent = reportContent.replace(patronValoresEmitidos, nuevosValoresEmitidos);

    // Extraer siguientes pasos del informe
    const nextSteps = extractNextSteps(reportContent);

    return {
      propertyDescription: `${data.propertyType} de ${data.area}m² en ${data.municipality}, ${data.province}`,
      valuationApproach: 'Metodología ECO/805/2003 y ECM/599/2025',
      estimatedValue: marketValue,
      pricePerSquareMeter,
      confidence: 'alto',
      summary: reportContent,
      reportContent,
      userType: data.userType,
      mainPurpose: data.mainPurpose,
      secondaryPurpose: data.secondaryPurposes?.join(', ') || '',
      timestamp: new Date().toISOString(),
      valuationRange: {
        min: marketValue,
        max: marketValue
      },
      bankEstimateRange: {
        min: mortgageValue,
        max: mortgageValue
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
 * Extrae los cuatro valores únicos del informe
 * REGLA: El asistente debe emitir valores únicos, no rangos
 */
const extractValuesFromReport = (content: string, data: ValuationData): { 
  marketValue: number; 
  mortgageValue: number; 
  listingPrice: number; 
  freeMarketValue: number;
} => {
  const result = { marketValue: 0, mortgageValue: 0, listingPrice: 0, freeMarketValue: 0 };
  
  // Patrones para valores únicos en NEGRITA (como indica el prompt)
  // **1. VALOR DE MERCADO (ECO/ECM):** XXX.XXX €
  
  // Valor de mercado (único)
  const marketPatterns = [
    /\*\*1\.\s*VALOR\s+DE\s+MERCADO[^:]*:\*\*\s*([\d.,]+)\s*€?/i,
    /valor\s+de\s+mercado[^:]*:\s*\*?\*?([\d.,]+)\s*€?/i,
    /VALOR\s+DE\s+MERCADO[^:]*:\s*([\d.,]+)\s*€/i
  ];
  
  for (const pattern of marketPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseValue(match[1]);
      if (value > 10000) {
        result.marketValue = value;
        break;
      }
    }
  }
  
  // Valor hipotecario (único)
  const mortgagePatterns = [
    /\*\*2\.\s*VALOR\s+DE\s+GARANT[ÍI]A\s+HIPOTECARIA[^:]*:\*\*\s*([\d.,]+)\s*€?/i,
    /valor\s+(?:de\s+)?garant[ií]a\s+hipotecaria[^:]*:\s*\*?\*?([\d.,]+)\s*€?/i,
    /valor\s+hipotecario[^:]*:\s*([\d.,]+)\s*€/i
  ];
  
  for (const pattern of mortgagePatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseValue(match[1]);
      if (value > 10000) {
        result.mortgageValue = value;
        break;
      }
    }
  }
  
  // Valor de mercado libre (único)
  const freeMarketPatterns = [
    /\*\*3\.\s*VALOR\s+DE\s+MERCADO\s+LIBRE[^:]*:\*\*\s*([\d.,]+)\s*€?/i,
    /valor\s+de\s+mercado\s+libre[^:]*:\s*\*?\*?([\d.,]+)\s*€?/i
  ];
  
  for (const pattern of freeMarketPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseValue(match[1]);
      if (value > 10000) {
        result.freeMarketValue = value;
        break;
      }
    }
  }
  
  // Valor de venta recomendado (único)
  const listingPatterns = [
    /\*\*4\.\s*VALOR\s+DE\s+VENTA\s+RECOMENDADO[^:]*:\*\*\s*([\d.,]+)\s*€?/i,
    /valor\s+de\s+venta\s+recomendado[^:]*:\s*\*?\*?([\d.,]+)\s*€?/i,
    /precio\s+de\s+venta[^:]*:\s*([\d.,]+)\s*€/i
  ];
  
  for (const pattern of listingPatterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseValue(match[1]);
      if (value > 10000) {
        result.listingPrice = value;
        break;
      }
    }
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
