// =======================
// ENUMS DE DOMINIO
// =======================

export enum PropertyType {
  FLAT = 'Piso',
  PENTHOUSE = 'Ático',
  DUPLEX = 'Dúplex',
  GARAGE = 'Garaje',
  STORAGE = 'Trastero',
  SEMI_DETACHED = 'Unifamiliar adosada',
  DETACHED = 'Unifamiliar aislada',
  RUSTIC_ESTATE = 'Finca rústica',
  OFFICE = 'Oficina',
  COMMERCIAL = 'Local comercial',
  BUILDING = 'Edificio',
  INDUSTRIAL_WAREHOUSE = 'Nave industrial',
  URBAN_PLOT = 'Parcela suelo urbano',
  DEVELOPABLE_PLOT = 'Parcela suelo urbanizable',
  RUSTIC_PLOT = 'Parcela suelo no urbanizable (rústico)'
}

export enum SurfaceType {
  USEFUL = 'Útil',
  CONSTRUCTED = 'Construida',
  CONSTRUCTED_WITH_COMMON = 'Construida con elementos comunes'
}

export enum Annex {
  GARAGE = 'Garaje',
  STORAGE = 'Trastero',
  PATIO = 'Patio',
  GARDEN = 'Jardín',
  SOLARIUM = 'Solarium'
}

export enum CommonAreaAmenity {
  GREEN_AREAS = 'Zonas verdes',
  POOL = 'Piscina',
  KIDS_AREA = 'Zona infantil',
  PADEL = 'Pista de padel',
  TENNIS = 'Pista de tenis',
  BASKETBALL = 'Pista de baloncesto',
  SOCCER = 'Cancha de fútbol',
  GOURMET_ROOM = 'Sala gourmet'
}

export enum TerraceType {
  COVERED = 'Cubierta',
  OPEN = 'Descubierta'
}

// =======================
// CONTEXTO DE USUARIO
// =======================

export enum UserType {
  PARTICULAR = 'Usuario particular',
  PROFESSIONAL = 'Profesional inmobiliario / Broker'
}

export enum ValuationMainPurpose {
  BUY_SELL = 'Vender o comprar un inmueble',
  MORTGAGE = 'Solicitar hipoteca / banco',
  INHERITANCE_DIVORCE = 'Herencia, divorcio o reparto patrimonial',
  PLOT_ANALYSIS = 'Analizar un suelo (qué se puede hacer y cuánto vale)',
  NEGOTIATION = 'Negociar una oferta',
  URBAN_DOUBT = 'Resolver dudas urbanísticas',
  UNKNOWN = 'No lo sé, necesito orientación'
}

export enum ValuationSecondaryPurpose {
  GENERAL_INTEREST = 'Solo quiero saber cuánto vale aproximadamente el inmueble',
  MORTGAGE_ORIENTATION = 'Para tener una idea orientativa antes de pedir una hipoteca',
  NEGOTIATION_DEFENSE = 'Para defender un precio al comprar o vender',
  ASSET_DISTRIBUTION = 'Para repartir bienes con una base de valor orientativa',
  RISK_DETECTION = 'Para detectar riesgos que puedan afectar al valor o a la venta'
}

// =======================
// DATOS DE ENTRADA
// =======================

export interface AnnexSurfaceData {
  surfaceType: SurfaceType | '';
  area: number;
}

export interface ValuationData {
  // Contexto usuario
  userType: UserType;
  email: string;

  // Tipo de inmueble
  propertyType: PropertyType | '';
  plotArea?: number;

  // Dirección
  streetType: string;
  streetName: string;
  streetNumber: string;
  block: string;
  entrance: string;
  floorLevel: string;
  door: string;
  postalCode: string;
  municipality: string;
  province: string;

  // Datos registrales / constructivos
  constructionYear?: number | '';
  cadastralReference: string;

  // Superficie principal
  surfaceType: SurfaceType | '';
  area: number;

  rooms: number | '';
  bathrooms: number | '';

  // Anexos
  annexes: Annex[];
  annexQuantities: Record<string, number>;
  annexSurfaces: Record<string, AnnexSurfaceData[]>;

  // Zonas comunes
  hasCommonZones: boolean | null;
  commonAmenities: CommonAreaAmenity[];

  // Características
  elevator: boolean | null;
  terrace: boolean | null;
  terraceType?: TerraceType | '';
  terraceArea?: number;

  // Finalidad
  mainPurpose: ValuationMainPurpose | '';
  secondaryPurposes: ValuationSecondaryPurpose[];
  otherSecondaryPurpose: string;

  // Herramientas / opciones
  useGoogleMaps: boolean;
  detailedReport: boolean;

  // Observaciones libres
  additionalInfo: string;
}

// =======================
// COMPARABLES DE MERCADO
// =======================

export interface MarketComparable {
  id: string;          // T1, T2, ...
  location: string;
  postalCode: string;
  surface: number;
  price: number;
  unitPrice: number;
  adjustment: string; // Ej: "-5% por peor estado"
}

// =======================
// INFORME DE SALIDA
// =======================

export interface ValuationReport {
  // Identificación básica
  propertyDescription: string;
  valuationApproach: string;
  estimatedValue: number;
  pricePerSquareMeter: number;
  confidence: 'alto' | 'medio' | 'bajo';
  summary: string;
  reportContent?: string; // Contenido completo del informe de Gemini
  userType: UserType;
  mainPurpose: ValuationMainPurpose | string;
  secondaryPurpose?: string;
  timestamp: string;

  // Valor de mercado
  valuationRange?: {
    min: number;
    max: number;
  };

  confidenceLevel?: 'Alta' | 'Media' | 'Baja';

  explanation?: string;

  // Valor de garantía hipotecaria (prudente)
  bankEstimateRange?: {
    min: number;
    max: number;
  } | null;

  // Precio recomendado de venta
  listingPriceRecommendation?: number | null;

  // Resumen ejecutivo (especialmente brokers)
  executiveSummaryBullets?: string[] | null;

  // Factores y riesgos
  positiveFactors?: string[];
  negativeFactors?: string[];
  risks?: string[];
  nextSteps?: string[];

  // Análisis de ubicación
  locationAnalysis?: string | null;

  // Informe detallado explicativo
  detailedAnalysis?: string | null;

  // Tabla estructurada de comparables
  marketComparables?: MarketComparable[];
}

