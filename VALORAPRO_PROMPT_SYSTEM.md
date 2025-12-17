# ValoraPro - Sistema de Prompt para Gemini AI

## Descripción General

ValoraPro utiliza **Google Gemini 1.5 Pro** como motor de generación de informes de valoración inmobiliaria orientativa. El sistema está estructurado para generar informes técnicos rigurosos siguiendo la normativa española de valoración inmobiliaria.

## Sistema de Roles y Normas

El asistente AI actúa como "cerebro técnico" especializado en:

- **Normativa**: Orden ECO/805/2003 y su modificación por la Orden ECM/599/2025
- **Tipo de informe**: Valoración orientativa (pre-tasación), NO tasación oficial
- **Principios obligatorios**: Finalidad, mejor uso, prudencia, proporcionalidad, transparencia, sostenibilidad

## Reglas Técnicas Implementadas

1. **Sin suposiciones no justificadas** - El IA evalúa solo datos proporcionados
2. **Advertencias sobre documentación faltante** - Urbanística, registral, catastral
3. **Diferenciación clara de valores**:
   - Valor de mercado
   - Valor hipotecario prudente
   - Valor comercial orientativo
4. **Detección de riesgos urbanísticos** - Incumplimientos, fuera de ordenación, etc.
5. **Lenguaje técnico claro** - Comprensible para particulares y profesionales

## Flujo de Datos

```
Usuario (Formulario Web)
        ↓
   Form Data (ValuationData)
        ↓
   formatPropertyDataForGemini()
        ↓
   Gemini API con System Prompt
        ↓
   Contenido Técnico Completo
        ↓
   ValuationReport (JSON estructurado)
        ↓
   Presentación HTML/PDF
```

## Estructura del Informe Generado

Cada informe incluye obligatoriamente:

1. **Identificación del inmueble** - Dirección, referencias, características básicas
2. **Localización y entorno** - Análisis de ubicación y contexto
3. **Análisis urbanístico** - Planeamiento y situación legal (cuando disponible)
4. **Situación legal** - Cumplimiento urbanístico, incumplimientos detectados
5. **Descripción física** - Superficies, elementos, anexos
6. **Método de valoración** - Justificación del enfoque comparativo
7. **Análisis de mercado** - Comparables (cuando procede)
8. **Determinación de valores**:
   - Valor de mercado
   - Valor hipotecario prudente
   - Valor comercial orientativo
9. **Advertencias y riesgos** - Condicionantes y limitaciones
10. **Conclusiones** - Resumen ejecutivo claro

## Cierre Legal Obligatorio

Todo informe finaliza con:

> "Informe de valoración inmobiliaria orientativa generado automáticamente. No sustituye una tasación oficial firmada por técnico competente y sociedad de tasación homologada cuando sea legalmente exigible."

## Variables de Entorno Requeridas

```
VITE_GEMINI_API_KEY=<tu-api-key-de-gemini>
```

## Campos de Datos Utilizados

### Ubicación
- `streetType`, `streetName`, `streetNumber`
- `block`, `entrance`, `floorLevel`, `door`
- `postalCode`, `municipality`, `province`
- `cadastralReference`

### Descripción Física
- `propertyType` - Tipo de inmueble
- `constructionYear` - Año de construcción
- `surfaceType` - Tipo de superficie considerada
- `area` - Superficie en m²
- `rooms`, `bathrooms` - Divisiones
- `elevator`, `terrace`, `terraceArea`

### Elementos Adicionales
- `annexes` - Garajes, trasteros, patios, jardines
- `commonAmenities` - Piscina, padel, zonas verdes, etc.
- `hasCommonZones` - Presencia de zonas comunes

### Contexto y Finalidad
- `userType` - Particular o profesional
- `mainPurpose` - Motivo principal de la valoración
- `secondaryPurposes` - Propósitos secundarios
- `detailedReport` - Nivel de análisis
- `additionalInfo` - Notas libres

## Cálculo Estimado de Valores

El sistema realiza un análisis previo que estima:

- **Valor de mercado**: Basado en precios de referencia por provincia, tipo de inmueble
- **Ajustes por antigüedad**: Menos valor si > 50 años, descuento progresivo
- **Ajustes por tipo**: Garajes/trasteros reducen valor, unifamiliares lo aumentan
- **Ajustes por elementos**: Ascensor (+5%), terraza (+10%)
- **Rango de confianza**: ±15% para mostrar variabilidad

El informe completo generado por Gemini proporciona el análisis técnico detallado.

## Finalidades Admitidas del Informe

✅ Herencias y particiones
✅ Divorcios y liquidaciones de gananciales
✅ Análisis previo de venta o compra
✅ Orientación de precio y negociación
✅ Pre-análisis profesional para inmobiliarias y despachos

## Limitaciones y Declaraciones

- ❌ No es tasación oficial
- ❌ No válida para garantía hipotecaria bancaria
- ❌ No sustituye técnico firmante ni sociedad homologada
- ⚠️ Requiere documentación esencial para máxima precisión
- ⚠️ Recomendaciones expresas sobre riesgos detectados

## Integración en ValuationResult.tsx

El componente de presentación formatea el contenido de Gemini usando:

- **ReactMarkdown** para formateo del contenido técnico
- **Estilos Tailwind** para presentación profesional
- **Iconos Lucide** para visualización de datos

## Mejoras Futuras

- Integración con datos catastrales reales (API del Catastro)
- Análisis de precios históricos por zona
- Machine Learning para refinamiento de estimaciones
- Generación de PDF con firma digital
- Exportación a formatos técnicos estándar (tasaciones)
