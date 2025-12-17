import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ValuationData,
  ValuationReport,
  UserType,
} from './types';
import { generateValuationWithAssistant, isAssistantConfigured } from './services/openaiAssistantService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

/**
 * GENERA INFORME DE VALORACIÓN
 * Prioridad: OpenAI Assistant (tu cerebro central) > Gemini (backup)
 */
export const generateValuationReport = async (data: ValuationData): Promise<ValuationReport> => {
  // PRIORIDAD 1: Usar tu OpenAI Assistant como cerebro central
  if (isAssistantConfigured()) {
    console.log('🧠 Usando OpenAI Assistant (Urbanmetrics) como cerebro central');
    return await generateValuationWithAssistant(data);
  }

  // PRIORIDAD 2: Fallback a Gemini si OpenAI no está configurado
  console.log('⚠️ OpenAI Assistant no configurado, usando Gemini como backup');
  return await generateWithGemini(data);
};

/**
 * SYSTEM PROMPT para Gemini (backup)
 * Define el rol y comportamiento del IA en la generación de informes
 */
const VALUATION_SYSTEM_PROMPT = `Eres un asistente experto en valoraciones inmobiliarias en España, especializado en tasaciones y valoraciones conforme a la Orden ECO/805/2003 y su modificación vigente por la Orden ECM/599/2025.

Actúas como el "cerebro técnico" del proceso de generación de informes de valoración inmobiliaria orientativa (pre-tasación). No eres una sociedad de tasación homologada ni un técnico firmante.

Tu función es analizar los datos proporcionados, aplicar la normativa española de valoración y urbanismo, y generar el contenido íntegro de un informe de valoración inmobiliaria orientativa, con rigor técnico, prudencia y lenguaje comprensible para particulares y profesionales inmobiliarios y jurídicos.

PRINCIPIOS OBLIGATORIOS A APLICAR:
- Principio de finalidad de la valoración
- Principio de mayor y mejor uso legalmente posible
- Principio de prudencia (especialmente en valor hipotecario)
- Principio de proporcionalidad
- Principio de transparencia
- Principio de sostenibilidad y riesgos medioambientales cuando proceda
- Prohibición expresa de incluir elementos especulativos no consolidados

REGLAS TÉCNICAS OBLIGATORIAS:
1. No hagas suposiciones no justificadas.
2. Si falta documentación esencial (urbanística, registral, catastral o de superficies), indícalo expresamente como advertencia o condicionante.
3. No asignes ordenanza, calificación urbanística o aprovechamiento si no consta información suficiente; en ese caso, declara la imposibilidad de verificación.
4. Si existen indicios de incumplimiento urbanístico, fuera de ordenación, disconformidad o situación legal análoga, explícalo claramente y detalla sus implicaciones prácticas en:
   - Posibilidad de obras
   - Compraventa
   - Herencias y divorcios
   - Financiación hipotecaria
5. Diferencia siempre y de forma expresa entre:
   - Valor de mercado
   - Valor hipotecario prudente
   - Valor comercial orientativo para negociación
6. Declara explícitamente cualquier hipótesis utilizada.
7. Utiliza un lenguaje técnico claro, sin jerga innecesaria, comprensible para no expertos.
8. El informe resultante NO debe presentarse como tasación oficial ni válido para garantía hipotecaria bancaria.

ESTRUCTURA OBLIGATORIA DEL INFORME:
1. Identificación del inmueble
2. Localización y descripción del entorno
3. Análisis urbanístico y planeamiento aplicable (según la información disponible)
4. Situación legal y grado de cumplimiento urbanístico
5. Descripción física del inmueble y superficies consideradas
6. Método de valoración aplicado y justificación de su elección
7. Análisis de mercado y comparables (cuando proceda)
8. Determinación de valores:
   - Valor de mercado
   - Valor hipotecario prudente
   - Valor comercial orientativo
9. Advertencias, condicionantes y riesgos detectados
10. Conclusión y resumen final claro y comprensible

CIERRE LEGAL OBLIGATORIO (incluir literalmente al final del informe):
"Informe de valoración inmobiliaria orientativa generado automáticamente. No sustituye una tasación oficial firmada por técnico competente y sociedad de tasación homologada cuando sea legalmente exigible."`;

/**
 * Formatea los datos del inmueble en texto estructurado para Gemini
 */
const formatPropertyDataForGemini = (data: ValuationData): string => {
  const address = `${data.streetType} ${data.streetName}, ${data.streetNumber}${data.block ? `, Bloque ${data.block}` : ''}${data.entrance ? `, Entrada ${data.entrance}` : ''}${data.floorLevel ? `, ${data.floorLevel}` : ''}${data.door ? `, ${data.door}` : ''}`;
  
  return `DATOS DEL INMUEBLE PARA VALORACIÓN:

IDENTIFICACIÓN:
- Tipo de usuario: ${data.userType}
- Correo de contacto: ${data.email}
- Finalidad de la valoración: ${data.mainPurpose}${data.secondaryPurposes?.length ? ` (secundarias: ${data.secondaryPurposes.join(', ')})` : ''}

UBICACIÓN:
- Dirección completa: ${address}
- Código postal: ${data.postalCode}
- Municipio: ${data.municipality}
- Provincia: ${data.province}
- Referencia catastral: ${data.cadastralReference || 'No proporcionada'}

TIPO Y CARACTERÍSTICAS ESTRUCTURALES:
- Tipo de inmueble: ${data.propertyType}
- Año de construcción: ${data.constructionYear}
- Tipo de superficie considerada: ${data.surfaceType || 'No especificado'}
- Superficie útil/construida: ${data.area}m²
- Planta en venta (si aplica): ${data.floorLevel || 'No aplica'}

ELEMENTOS DEL INMUEBLE:
- Número de habitaciones: ${data.rooms || 'No especificado'}
- Número de baños: ${data.bathrooms || 'No especificado'}
- Ascensor: ${data.elevator ? 'Sí' : data.elevator === null ? 'No aplica' : 'No'}
- Terraza: ${data.terrace ? `Sí (${data.terraceType}, ${data.terraceArea}m²)` : 'No'}

ANEXOS Y ELEMENTOS ADICIONALES:
${data.annexes && data.annexes.length > 0 
  ? data.annexes.map(annex => `- ${annex}: ${data.annexQuantities?.[annex] || 1} unidad(es), ${data.annexSurfaces?.[annex] || '0'}m²`).join('\n')
  : '- Ninguno reportado'}

ELEMENTOS COMUNES (si aplica):
${data.hasCommonZones 
  ? `Sí: ${data.commonAmenities?.join(', ') || 'No especificados'}` 
  : 'No aplica o no se dispone de información'}

INFORMACIÓN ADICIONAL:
${data.additionalInfo ? `- Notas: ${data.additionalInfo}` : '- Sin observaciones adicionales'}
${data.detailedReport ? '- Se solicita informe detallado con análisis de comparables' : '- Informe estándar'}`;
};

/**
 * Genera un informe de valoración usando Gemini API (BACKUP)
 */
const generateWithGemini = async (data: ValuationData): Promise<ValuationReport> => {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY no está configurada');
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro',
      systemInstruction: VALUATION_SYSTEM_PROMPT
    });

    const propertyDataText = formatPropertyDataForGemini(data);
    const userPrompt = `Genera un informe de valoración inmobiliaria orientativa completo basado en los siguientes datos del inmueble:\n\n${propertyDataText}`;

    const response = await model.generateContent(userPrompt);
    const reportContent = response.response.text();

    // Calcula valores estimados (análisis básico del contenido)
    const estimatedValue = calculateEstimatedValue(data);
    const pricePerSquareMeter = data.area ? Math.round(estimatedValue / data.area) : 0;

    return {
      propertyDescription: `${data.propertyType} de ${data.area}m² en ${data.municipality}, ${data.province}`,
      valuationApproach: 'Enfoque comparativo y de coste de reposición según normas españolas',
      estimatedValue,
      pricePerSquareMeter,
      confidence: 'medio',
      summary: reportContent,
      reportContent,
      userType: data.userType,
      mainPurpose: data.mainPurpose,
      secondaryPurpose: data.secondaryPurposes?.join(', ') || '',
      timestamp: new Date().toISOString(),
      valuationRange: {
        min: Math.round(estimatedValue * 0.85),
        max: Math.round(estimatedValue * 1.15)
      }
    };
  } catch (error) {
    console.error('Error generando informe con Gemini:', error);
    throw new Error('No se pudo generar el informe. Verifica tu clave API de Gemini.');
  }
};

/**
 * Calcula un valor estimado inicial basado en datos del inmueble
 * (análisis simplificado para preview; el IA proporciona el análisis detallado)
 */
const calculateEstimatedValue = (data: ValuationData): number => {
  // Precios base por m² según provincia y tipo (estimados referenciales)
  const pricesByProvince: Record<string, number> = {
    'Madrid': 4500,
    'Barcelona': 5200,
    'Valencia': 2800,
    'Sevilla': 2200,
    'Bilbao': 3800,
    'Alicante': 2600,
    'Málaga': 2400,
    'Murcia': 1800,
    'Zaragoza': 2400,
    'Palma de Mallorca': 4200
  };

  const basePrice = pricesByProvince[data.province] || 3000;
  let adjustedPrice = basePrice;

  // Ajustes por antigüedad
  const constructionYear = typeof data.constructionYear === 'number' ? data.constructionYear : new Date().getFullYear();
  const age = new Date().getFullYear() - constructionYear;
  if (age > 50) adjustedPrice *= 0.75;
  else if (age > 30) adjustedPrice *= 0.85;
  else if (age > 10) adjustedPrice *= 0.95;

  // Ajustes por tipo de inmueble
  if (data.propertyType?.includes('Garaje') || data.propertyType?.includes('Trastero')) {
    adjustedPrice *= 0.3;
  } else if (data.propertyType?.includes('Piso')) {
    adjustedPrice *= 1;
  } else if (data.propertyType?.includes('Unifamiliar')) {
    adjustedPrice *= 1.2;
  }

  // Ajustes por elementos
  if (data.elevator) adjustedPrice *= 1.05;
  if (data.terrace) adjustedPrice *= 1.1;

  return Math.round(adjustedPrice * (data.area || 100));
};

/**
 * Parse direcciones desde texto (búsqueda)
 */
export const parseAddressFromText = (text: string) => {
  const lines = text.split('\n').filter(l => l.trim());
  return {
    streetType: '',
    streetName: '',
    streetNumber: '',
    postalCode: '',
    municipality: '',
    province: '',
    parsed: lines.join(', ')
  };
};
