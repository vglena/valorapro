
import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './Layout';
import { InputGroup } from './InputGroup';
import { ValuationResult } from './ValuationResult';
import { 
  ValuationData, 
  PropertyType, 
  Annex, 
  CommonAreaAmenity, 
  SurfaceType, 
  AnnexSurfaceData, 
  TerraceType, 
  UserType, 
  ValuationMainPurpose, 
  ValuationSecondaryPurpose, 
  ValuationReport 
} from './types';
import { generateValuationReport, parseAddressFromText } from './geminiService';
import { Loader2, Send, FileText, Building2, MapPin, Users, Ruler, Warehouse, Target, Search, X, User, Briefcase, Info, Mail, Eye, ShieldCheck, Check, ClipboardList, Plus, Trash2, ArrowLeft, Download, HardHat, LandPlot, CheckCircle } from 'lucide-react';
import { ENV_CONFIG } from './config/environment';
import { searchAddresses, geocodeAddress } from './services/nominatimService';

// Declare html2pdf as it is loaded via script tag
declare var html2pdf: any;
// Declare emailjs
declare var emailjs: any;

const STREET_TYPES = [
  'Calle', 'Avenida', 'Plaza', 'Paseo', 'Ronda', 'Travesía', 
  'Carretera', 'Camino', 'Pasaje', 'Bulevar', 'Glorieta', 'Cuesta'
];

const PROVINCES = [
    'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona', 'Burgos', 'Cáceres',
    'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara',
    'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
    'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca',
    'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo', 'Valencia',
    'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza', 'Ceuta', 'Melilla'
];

const App: React.FC = () => {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [formData, setFormData] = useState<ValuationData>({
    userType: UserType.PARTICULAR,
    email: '',
    propertyType: '',
    plotArea: undefined, // Initialize plot area
    streetType: 'Calle', // Default to Calle
    streetName: '',
    streetNumber: '',
    block: '',
    entrance: '',
    floorLevel: '',
    door: '',
    postalCode: '',
    municipality: '',
    province: '',
    constructionYear: new Date().getFullYear(),
    cadastralReference: '',
    surfaceType: '',
    area: 90,
    rooms: '',
    bathrooms: '',
    annexes: [],
    annexQuantities: {},
    annexSurfaces: {},
    hasCommonZones: null,
    commonAmenities: [],
    elevator: null,
    terrace: null,
    terraceType: '',
    terraceArea: 0,
    mainPurpose: '',
    secondaryPurposes: [],
    otherSecondaryPurpose: '',
    useGoogleMaps: false,
    detailedReport: false,
    additionalInfo: ''
  });

  const [report, setReport] = useState<ValuationReport | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Tech Contact State
  const [showTechDropdown, setShowTechDropdown] = useState(false);
  const [selectedTechProvince, setSelectedTechProvince] = useState('');
  
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Search & Autocomplete State
  const [addressSearch, setAddressSearch] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Map Coordinates State
  const [mapCoordinates, setMapCoordinates] = useState<{lat: number, lon: number} | null>(null);

  // Initialize EmailJS
  useEffect(() => {
    if (typeof emailjs !== 'undefined' && ENV_CONFIG.emailjs.isConfigured()) {
      emailjs.init(ENV_CONFIG.emailjs.publicKey);
    }
  }, []);

  // Debounce logic for autocomplete
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addressSearch.length > 2) {
        const results = await searchAddresses(addressSearch);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressSearch]);
  // Effect to update map coordinates when address fields change manually
  useEffect(() => {
    const timer = setTimeout(async () => {
      if ((formData.streetName && formData.municipality) || 
          (formData.municipality && formData.province)) {
        const coords = await geocodeAddress(
          formData.streetType,
          formData.streetName,
          formData.streetNumber,
          formData.municipality,
          formData.province
        );
        if (coords) {
          setMapCoordinates(coords);
        }
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    formData.streetType,
    formData.streetName,
    formData.streetNumber,
    formData.municipality,
    formData.province
  ]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleBooleanSelectChange = (id: keyof ValuationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [id]: value === '' ? null : value === 'Si'
    }));
  };

  const handleUserTypeSelect = (type: UserType) => {
    setFormData(prev => ({ ...prev, userType: type }));
  };

  // Annex Handling
  const handleAddAnnex = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const annex = e.target.value as Annex;
      if (!annex) return;
      if (!formData.annexes.includes(annex)) {
          setFormData(prev => ({
              ...prev,
              annexes: [...prev.annexes, annex],
              annexQuantities: { ...prev.annexQuantities, [annex]: 1 },
              annexSurfaces: { ...prev.annexSurfaces, [annex]: [{ surfaceType: '', area: 0 }] }
          }));
      }
      e.target.value = "";
  };

  const handleRemoveAnnex = (annex: Annex) => {
      setFormData(prev => {
          const newAnnexes = prev.annexes.filter(a => a !== annex);
          const newQuantities = { ...prev.annexQuantities };
          delete newQuantities[annex];
          const newSurfaces = { ...prev.annexSurfaces };
          delete newSurfaces[annex];
          return { ...prev, annexes: newAnnexes, annexQuantities: newQuantities, annexSurfaces: newSurfaces };
      });
  };

  const handleAnnexQuantityChange = (annex: Annex, qty: number) => {
    const quantity = Math.max(1, qty); 
    setFormData(prev => {
      const currentSurfaces = prev.annexSurfaces[annex] || [];
      let newSurfaces = [...currentSurfaces];
      if (quantity > currentSurfaces.length) {
         const diff = quantity - currentSurfaces.length;
         for(let i=0; i<diff; i++) newSurfaces.push({ surfaceType: '', area: 0 });
      } else if (quantity < currentSurfaces.length) {
         newSurfaces = newSurfaces.slice(0, quantity);
      }
      return {
        ...prev,
        annexQuantities: { ...prev.annexQuantities, [annex]: quantity },
        annexSurfaces: { ...prev.annexSurfaces, [annex]: newSurfaces }
      };
    });
  };

  const handleAnnexSurfaceChange = (annex: Annex, index: number, field: keyof AnnexSurfaceData, value: string | number) => {
    setFormData(prev => {
      const currentSurfaces = [...(prev.annexSurfaces[annex] || [])];
      if (currentSurfaces[index]) {
         currentSurfaces[index] = { ...currentSurfaces[index], [field]: value };
      }
      return { ...prev, annexSurfaces: { ...prev.annexSurfaces, [annex]: currentSurfaces } };
    });
  };

  const handleCommonZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "") {
        setFormData(prev => ({ ...prev, hasCommonZones: null }));
        return;
    }
    const hasZones = e.target.value === 'Si';
    setFormData(prev => ({
      ...prev,
      hasCommonZones: hasZones,
      commonAmenities: hasZones ? prev.commonAmenities : []
    }));
  };

  const handleAmenityChange = (amenity: CommonAreaAmenity) => {
    setFormData(prev => {
      const current = prev.commonAmenities;
      if (current.includes(amenity)) {
        return { ...prev, commonAmenities: current.filter(a => a !== amenity) };
      } else {
        return { ...prev, commonAmenities: [...current, amenity] };
      }
    });
  };

  const handleAddressSearch = async (textOverride?: string) => {
    const query = textOverride || addressSearch;
    if (!query.trim()) return;
    setSearchingAddress(true);
    setShowSuggestions(false); 
    try {
      const parsedData = await parseAddressFromText(query);
      setFormData(prev => ({
        ...prev,
        streetType: parsedData.streetType || prev.streetType,
        streetName: parsedData.streetName || prev.streetName,
        streetNumber: parsedData.streetNumber || prev.streetNumber,
        postalCode: parsedData.postalCode || prev.postalCode,
        municipality: parsedData.municipality || prev.municipality,
        province: parsedData.province || prev.province,
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    // 1. Immediately update Map Coordinates
    if (suggestion.lat && suggestion.lon) {
      setMapCoordinates({
        lat: parseFloat(suggestion.lat),
        lon: parseFloat(suggestion.lon)
      });
    }

    // 2. Update search bar
    let displayName = suggestion.display_name;
    setAddressSearch(displayName);
    setShowSuggestions(false);

    // 3. Populate form DIRECTLY from Nominatim structured data (instant, no AI needed)
    if (suggestion.address) {
        const addr = suggestion.address;
        
        let sType = 'Calle';
        let sName = addr.road || addr.pedestrian || addr.street || addr.square || addr.plaza || addr.avenue || '';
        
        // Smart Street Type Extraction
        // Nominatim puts "Calle de Alcalá" in 'road'. We need to split 'Calle' and 'Alcalá'.
        for (const t of STREET_TYPES) {
             if (sName.toLowerCase().startsWith(t.toLowerCase())) {
                 sType = t; // Use our standardized enum string
                 // Remove the type from the name (case insensitive replace)
                 const regex = new RegExp(`^${t}\\s*`, 'i');
                 sName = sName.replace(regex, '').trim();
                 // Remove "de " particle if left at start, e.g. "de Alcalá" -> "Alcalá"
                 sName = sName.replace(/^de\s+/i, '').trim();
                 break;
             }
        }

        const sNumber = addr.house_number || '';
        const zip = addr.postcode || '';
        const muni = addr.city || addr.town || addr.municipality || addr.village || '';
        let prov = addr.county || addr.state || addr.province || '';

        // Clean province name (e.g. "Comunidad de Madrid" -> "Madrid")
        prov = prov.replace(/Comunidad (Autónoma )?de /i, '').replace(/Provincia de /i, '').trim();

        // Check if cleaned province matches our list, if so use it, otherwise keep raw
        const matchProv = PROVINCES.find(p => p.toLowerCase() === prov.toLowerCase());
        if (matchProv) prov = matchProv;

        setFormData(prev => ({
            ...prev,
            streetType: sType,
            streetName: sName,
            streetNumber: sNumber,
            postalCode: zip,
            municipality: muni,
            province: prov
        }));
    } else {
        // Fallback to AI if for some reason structured data is missing
        handleAddressSearch(displayName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación completa antes de enviar
    const errors: string[] = [];
    
    if (!formData.propertyType) errors.push('Tipo de inmueble requerido');
    if (!formData.streetName) errors.push('Nombre de vía requerido');
    if (!formData.municipality) errors.push('Municipio requerido');
    if (!formData.province) errors.push('Provincia requerida');
    if (!formData.postalCode) errors.push('Código postal requerido');
    if (!formData.email) errors.push('Email requerido');
    if (formData.area <= 0) errors.push('Área debe ser mayor a 0');
    if (formData.elevator === null) errors.push('Debe indicar si tiene ascensor');
    if (formData.terrace === null) errors.push('Debe indicar si tiene terraza');
    if (formData.hasCommonZones === null) errors.push('Debe indicar si tiene zonas comunes');
    if (!formData.mainPurpose) errors.push('Finalidad principal requerida');
    
    // Validaciones condicionales
    if ([PropertyType.SEMI_DETACHED, PropertyType.DETACHED, PropertyType.INDUSTRIAL_WAREHOUSE].includes(formData.propertyType as PropertyType)) {
      if (!formData.plotArea || formData.plotArea <= 0) {
        errors.push('Superficie de parcela requerida para este tipo');
      }
    }
    
    if (errors.length > 0) {
      alert(`Por favor corrige los siguientes errores:\n\n${errors.map(e => `• ${e}`).join('\n')}`);
      return;
    }

    setLoading(true);
    setReport(null);
    setShowTechDropdown(false);

    try {
      const result = await generateValuationReport(formData);
      setReport(result);
      setStep('result');
      window.scrollTo(0, 0);
    } catch (error: any) {
      console.error('Valuation Error:', error);
      
      let message = 'Error al generar el informe';
      
      if (error.message?.includes('API')) {
        message = 'Error de conexión con el servicio. Intenta más tarde.';
      } else if (error.message?.includes('quota')) {
        message = 'Límite de solicitudes alcanzado. Intenta más tarde.';
      }
      
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  // PDF Generation - Usa impresión nativa del navegador (más fiable)
  const handleDownloadPDF = () => {
    if (!report) {
      alert('No hay informe para descargar');
      return;
    }
    
    // Crear ventana de impresión con el informe formateado
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permite las ventanas emergentes para descargar el PDF');
      return;
    }

    const direccion = `${formData.streetType} ${formData.streetName}, ${formData.streetNumber}${formData.floorLevel ? `, Planta ${formData.floorLevel}` : ''}${formData.door ? `, Puerta ${formData.door}` : ''}`;
    const formatEur = (n?: number | null) => n ? new Intl.NumberFormat('es-ES', {maximumFractionDigits: 0}).format(n) + ' €' : '-';
    
    // Convertir markdown a HTML con mejor parseo
    const convertMarkdown = (md: string): string => {
      let html = md;
      
      // Primero procesar tablas (antes de otros reemplazos)
      const tableRegex = /\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n?)+)/g;
      html = html.replace(tableRegex, (match, headerRow, bodyRows) => {
        const headers = headerRow.split('|').map((h: string) => h.trim()).filter((h: string) => h);
        const rows = bodyRows.trim().split('\n').filter((r: string) => r.includes('|'));
        
        let table = '<table><thead><tr>';
        headers.forEach((h: string) => { table += `<th>${h}</th>`; });
        table += '</tr></thead><tbody>';
        
        rows.forEach((row: string) => {
          const cells = row.split('|').map((c: string) => c.trim()).filter((c: string) => c);
          if (cells.length > 0) {
            table += '<tr>';
            cells.forEach((c: string) => { table += `<td>${c}</td>`; });
            table += '</tr>';
          }
        });
        
        return table + '</tbody></table>';
      });
      
      // Eliminar sección 10 (ya aparece en la web como "Siguientes Pasos Recomendados")
      html = html.replace(/#{0,2}\s*10\.\s*SIGUIENTES PASOS RECOMENDADOS[^]*?(?=#{0,2}\s*11\.|$)/gi, '');
      
      // Eliminar aviso legal duplicado (varias formas en que puede aparecer)
      html = html.replace(/\*\*AVISO LEGAL[:\*]*\*\*[^]*?Banco de España\.?/gi, '');
      html = html.replace(/AVISO LEGAL:[^]*?Banco de España\.?/gi, '');
      html = html.replace(/Este informe no constituye una tasación oficial[^]*?Banco de España\.?/gi, '');
      
      // Limpiar líneas vacías y caracteres sueltos
      html = html.replace(/^[-•]\s*$/gm, ''); // Viñetas vacías
      html = html.replace(/^\*\*\s*\*\*$/gm, ''); // Negritas vacías
      html = html.replace(/^-{2,}$/gm, ''); // Líneas de guiones (---, --)
      html = html.replace(/^_{2,}$/gm, ''); // Líneas de guiones bajos
      html = html.replace(/^\*{2,}$/gm, ''); // Líneas de asteriscos
      
      // Procesar títulos - solo hasta el final de la línea
      html = html.replace(/#{2,}\s*(\d+)\.\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]*[A-ZÁÉÍÓÚÑ])(?=\s*\n|\s*$)/gm, '<h2>$1. $2</h2>');
      html = html.replace(/^#{2,}\s*(.+)$/gm, '<h2>$1</h2>');
      html = html.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
      
      // Procesar negritas
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      
      // Procesar listas - agrupar items consecutivos
      const lines = html.split('\n');
      let inList = false;
      let listType = '';
      const processedLines: string[] = [];
      
      lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        // Saltar líneas vacías o con solo guiones/espacios
        if (!trimmedLine || /^[-_*\s]+$/.test(trimmedLine)) {
          if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            inList = false;
          }
          return;
        }
        
        const bulletMatch = line.match(/^[-•]\s+(.+)$/);
        const numMatch = line.match(/^\d+\.\s+(.+)$/);
        
        if (bulletMatch) {
          if (!inList || listType !== 'ul') {
            if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            processedLines.push('<ul>');
            inList = true;
            listType = 'ul';
          }
          processedLines.push(`<li>${bulletMatch[1]}</li>`);
        } else if (numMatch) {
          if (!inList || listType !== 'ol') {
            if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            processedLines.push('<ol>');
            inList = true;
            listType = 'ol';
          }
          processedLines.push(`<li>${numMatch[1]}</li>`);
        } else {
          if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
            inList = false;
          }
          processedLines.push(line);
        }
      });
      if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      
      html = processedLines.join('\n');
      
      // Convertir saltos de línea restantes
      html = html.replace(/\n{2,}/g, '</p><p>');
      html = html.replace(/\n/g, ' ');
      
      // Limpiar espacios y tags vacíos
      html = html.replace(/<p>\s*<\/p>/g, '');
      html = html.replace(/<p>\s*(<h[23]>)/g, '$1');
      html = html.replace(/(<\/h[23]>)\s*<\/p>/g, '$1');
      html = html.replace(/(<\/table>)\s*<\/p>/g, '$1');
      html = html.replace(/<p>\s*(<table>)/g, '$1');
      html = html.replace(/<p>\s*(<ul>|<ol>)/g, '$1');
      html = html.replace(/(<\/ul>|<\/ol>)\s*<\/p>/g, '$1');
      
      return html;
    };

    const content = convertMarkdown(report.reportContent || '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Informe Valoración - ${formData.streetName || 'Inmueble'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            color: #333; 
            line-height: 1.4; 
            padding: 25px 35px;
            max-width: 800px;
            margin: 0 auto;
            font-size: 10pt;
          }
          h1 { 
            font-size: 15pt; 
            color: #1a5490; 
            text-align: center; 
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 12px;
            font-size: 9pt;
          }
          h2 { 
            font-size: 11pt; 
            color: #1a5490; 
            margin: 12px 0 5px 0;
            border-bottom: 1px solid #ddd;
            padding-bottom: 2px;
          }
          h3 { 
            font-size: 10pt; 
            color: #333; 
            margin: 8px 0 3px 0;
            font-weight: 600;
          }
          p { margin: 3px 0; text-align: justify; }
          strong { font-weight: 600; }
          
          .summary-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1a5490;
            padding: 10px 12px;
            margin: 10px 0 15px 0;
            display: flex;
            justify-content: space-around;
          }
          .summary-item { text-align: center; }
          .summary-label { font-size: 7pt; color: #666; text-transform: uppercase; margin-bottom: 1px; }
          .summary-value { font-size: 11pt; font-weight: bold; color: #1a5490; }
          .summary-value.green { color: #2e7d32; }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 8px 0;
            font-size: 8pt;
          }
          th { 
            background: #1a5490; 
            color: white; 
            padding: 5px 6px; 
            text-align: left;
            font-weight: 600;
            font-size: 8pt;
          }
          td { 
            padding: 4px 6px; 
            border: 1px solid #ddd; 
          }
          tr:nth-child(even) { background: #f8f9fa; }
          
          ul, ol { margin: 2px 0 2px 18px; padding: 0; }
          li { margin: 1px 0; line-height: 1.3; }
          
          .content p { margin: 4px 0; }
          
          .legal-notice {
            margin-top: 20px;
            padding: 8px 10px;
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            font-size: 7pt;
            color: #666;
          }
          .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 7pt;
            color: #999;
          }
          
          @media print {
            body { padding: 15px 25px; }
            h2 { page-break-after: avoid; }
            table { page-break-inside: avoid; }
            .summary-box { page-break-inside: avoid; }
            .next-steps { page-break-inside: avoid; }
            .next-steps h2 { color: #1a5490; margin-bottom: 8px; }
            .next-steps ol { margin: 0; padding-left: 20px; }
            .next-steps li { margin: 4px 0; }
          }
        </style>
      </head>
      <body>
        <h1>ESTUDIO DE VALOR DE MERCADO</h1>
        <p class="subtitle">${formData.propertyType?.toUpperCase() || 'INMUEBLE'} · ${direccion}<br>${formData.postalCode} ${formData.municipality}, ${formData.province}</p>
        
        <div class="summary-box">
          <div class="summary-item">
            <div class="summary-label">Valor de Mercado</div>
            <div class="summary-value">${formatEur(report.valuationRange?.min)} - ${formatEur(report.valuationRange?.max)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Valor Hipotecario</div>
            <div class="summary-value" style="color: #555;">${formatEur(report.bankEstimateRange?.min)} - ${formatEur(report.bankEstimateRange?.max)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Precio Venta Recomendado</div>
            <div class="summary-value green">${formatEur(report.listingPriceRecommendation)}</div>
          </div>
        </div>
        
        <div class="content">
          <p>${content}</p>
        </div>
        
        ${report.nextSteps && report.nextSteps.length > 0 ? `
        <div class="next-steps">
          <h2>SIGUIENTES PASOS RECOMENDADOS</h2>
          <ol>
            ${report.nextSteps.map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>
        ` : ''}
        
        <div class="legal-notice">
          <strong>AVISO LEGAL:</strong> Este informe no constituye una tasación oficial conforme a la Orden ECO/805/2003 ni a la Orden ECM/599/2025. 
          Los valores mostrados son estimaciones basadas en datos de mercado. Para finalidades hipotecarias será necesaria una tasación 
          realizada por una sociedad homologada por el Banco de España.
        </div>
        
        <div class="footer">
          Informe generado por ValoraPro · ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
        
        <script>
          window.onload = function() {
            // Intentar abrir diálogo de impresión con destino PDF
            if (window.matchMedia) {
              window.print();
            } else {
              window.print();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  // Open Email Modal
  const handleOpenEmailModal = () => {
    setEmailToSend(formData.email);
    setShowEmailModal(true);
    setEmailSuccess(false);
  };

  // SEND REAL EMAIL (EMAILJS)
  const handleConfirmSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToSend || !report) return;

    if (!ENV_CONFIG.emailjs.isConfigured()) {
      alert("⚠️ CONFIGURACIÓN REQUERIDA:\n\nPara enviar correos, debes:\n\n1. Registrarte en EmailJS.com (gratis)\n2. Crear un template\n3. Copiar tus credenciales en el archivo .env.local\n\nEjemplo:\nVITE_EMAILJS_SERVICE_ID=service_xxx\nVITE_EMAILJS_TEMPLATE_ID=template_yyy\nVITE_EMAILJS_PUBLIC_KEY=user_zzz");
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSend)) {
      alert('Por favor, ingresa un email válido');
      return;
    }

    setSendingEmail(true);

    try {
        const valMin = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(report.valuationRange?.min ?? 0);
        const valMax = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(report.valuationRange?.max ?? 0);
        
        // Construct a nice HTML body for the email
        // Note: In EmailJS templates, you typically use {{message}} or specific fields.
        // We will send structured data assuming the user creates a template with these variables.
        const templateParams = {
            to_email: emailToSend,
            to_name: formData.userType === UserType.PROFESSIONAL ? 'Profesional' : 'Usuario',
            reply_to: 'no-reply@valorapro.com',
            property_address: `${formData.streetType} ${formData.streetName}, ${formData.streetNumber}, ${formData.municipality}`,
            property_type: formData.propertyType,
            property_area: `${formData.area} m²`,
            valuation_min: valMin,
            valuation_max: valMax,
            confidence: report.confidenceLevel,
            summary: report.explanation,
            message_html: `
                <h3>Informe de Valoración - ValoraPro</h3>
                <p><strong>Dirección:</strong> ${formData.streetType} ${formData.streetName}, ${formData.streetNumber}, ${formData.municipality}</p>
                <p><strong>Tipo:</strong> ${formData.propertyType} (${formData.area} m²)</p>
                <hr />
                <h4>Resultado:</h4>
                <p style="font-size: 18px; color: #0284c7;"><strong>${valMin} - ${valMax}</strong></p>
                <p><strong>Confianza:</strong> ${report.confidenceLevel}</p>
                <br />
                <h4>Resumen:</h4>
                <p>${report.explanation}</p>
            `
        };

        await emailjs.send(
            ENV_CONFIG.emailjs.serviceId,
            ENV_CONFIG.emailjs.templateId,
            templateParams
        );

        setSendingEmail(false);
        setEmailSuccess(true);

        // Auto close after success
        setTimeout(() => {
            setShowEmailModal(false);
            setEmailSuccess(false);
        }, 3000);

    } catch (error) {
        console.error('FAILED to send email:', error);
        setSendingEmail(false);
        alert('Hubo un error al enviar el correo. Por favor verifica tu configuración de EmailJS o inténtalo más tarde.');
    }
  };

  // Generate OpenStreetMap Embed URL (gratuito, sin API key)
  const getMapSrc = () => {
    if (mapCoordinates) {
      const { lat, lon } = mapCoordinates;
      // OpenStreetMap embed
      return `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.005},${lat-0.003},${lon+0.005},${lat+0.003}&layer=mapnik&marker=${lat},${lon}`;
    }
    // Default fallback: View of Spain
    return `https://www.openstreetmap.org/export/embed.html?bbox=-9.5,36,3.5,43.8&layer=mapnik`;
  };
  
  const mapSrc = getMapSrc();

  return (
    <Layout>
      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
              <button 
                onClick={() => setShowEmailModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              >
                 <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                 <Mail className="w-5 h-5 text-brand-600" /> Enviar Informe
              </h3>
              
              {!emailSuccess ? (
                  <form onSubmit={handleConfirmSendEmail} className="space-y-4 mt-4">
                      <p className="text-sm text-slate-500">
                         Introduce la dirección de correo electrónico donde quieres recibir el informe de valoración completo.
                      </p>
                      <div>
                         <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Destinatario</label>
                         <input 
                            type="email" 
                            required
                            value={emailToSend}
                            onChange={(e) => setEmailToSend(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                         />
                      </div>
                      
                      {/* Note for the developer/user about configuration */}
                      <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-100">
                         Nota: El envío requiere configuración de API Keys en el código.
                      </div>

                      <button 
                         type="submit"
                         disabled={sendingEmail}
                         className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                      >
                         {sendingEmail ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Conectando con servidor...</>
                         ) : (
                            <><Send className="w-4 h-4" /> Enviar Informe Ahora</>
                         )}
                      </button>
                  </form>
              ) : (
                  <div className="py-8 text-center animate-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                         <CheckCircle className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">¡Informe Enviado!</h4>
                      <p className="text-slate-500 text-sm">El servidor ha confirmado el envío a <strong>{emailToSend}</strong>.</p>
                  </div>
              )}
           </div>
        </div>
      )}

      {/* --- FORM SCREEN --- */}
      {step === 'form' && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Form */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Nueva Valoración</h1>
                <p className="text-slate-500">Completa los datos del inmueble para recibir tu informe profesional en segundos.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                 {/* Main Form Area */}
                 <div className="lg:col-span-8 space-y-6">
                    {/* 1. Profile Select */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700">¿Quién eres?</label>
                            {formData.userType === UserType.PARTICULAR ? (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Modo Explicativo</span>
                            ) : (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Modo Ejecutivo</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleUserTypeSelect(UserType.PARTICULAR)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm transition-all border ${
                                formData.userType === UserType.PARTICULAR 
                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' 
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <User className="w-4 h-4" /> Particular
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUserTypeSelect(UserType.PROFESSIONAL)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded text-sm transition-all border ${
                                formData.userType === UserType.PROFESSIONAL
                                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium' 
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <Briefcase className="w-4 h-4" /> Profesional
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <form onSubmit={handleSubmit} className="space-y-8">
                             {/* ... (Existing Form Fields Logic Copied from previous App.tsx but without map/email in side) ... */}
                             
                             {/* 2. PROPERTY TYPE */}
                             <section>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800 border-b pb-2 border-slate-100">
                                    <FileText className="w-5 h-5 text-brand-600" /> Tipo de Inmueble
                                </h2>
                                <InputGroup id="propertyType" label="Selecciona el tipo de inmueble" value={formData.propertyType} onChange={handleInputChange} options={Object.values(PropertyType)} required />
                                
                                {/* CONDITIONAL PLOT INPUT FOR HOUSES AND INDUSTRIAL */}
                                {[PropertyType.SEMI_DETACHED, PropertyType.DETACHED, PropertyType.INDUSTRIAL_WAREHOUSE].includes(formData.propertyType as PropertyType) && (
                                    <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2 mb-2 text-blue-900">
                                            <LandPlot className="w-4 h-4" />
                                            <span className="text-sm font-bold">Datos de la Parcela</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label htmlFor="plotArea" className="text-sm font-medium text-slate-700 whitespace-nowrap">Superficie de Parcela (m²):</label>
                                            <div className="relative w-full max-w-[150px]">
                                                <input 
                                                    type="number" 
                                                    id="plotArea" 
                                                    value={formData.plotArea || ''} 
                                                    onChange={(e) => setFormData(prev => ({...prev, plotArea: parseFloat(e.target.value)}))}
                                                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">m²</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-700 mt-2">Introduce la superficie total del terreno para una valoración correcta.</p>
                                    </div>
                                )}

                                {/* Annexes Logic */}
                                <div className="mt-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="mb-2 text-sm font-bold text-slate-700 flex items-center gap-2"><Warehouse className="w-4 h-4 text-brand-500" /> Anexos</label>
                                    <div className="mb-3 relative">
                                        <select className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-brand-500 focus:border-brand-500 appearance-none" onChange={handleAddAnnex} value="">
                                            <option value="" disabled>+ Añadir anexo...</option>
                                            {Object.values(Annex).map(annex => (<option key={annex} value={annex} disabled={formData.annexes.includes(annex)}>{annex} {formData.annexes.includes(annex) ? '(Añadido)' : ''}</option>))}
                                        </select>
                                        <Plus className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                                    </div>
                                    <div className="space-y-4">
                                        {formData.annexes.map((annexOption) => {
                                            const quantity = formData.annexQuantities[annexOption] || 1;
                                            const surfaces = formData.annexSurfaces[annexOption] || [];
                                            return (
                                                <div key={annexOption} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                    <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                                                        <span className="font-semibold text-sm text-slate-800">{annexOption}</span>
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-slate-500">Nº</label>
                                                            <input type="number" min="1" value={quantity} onChange={(e) => handleAnnexQuantityChange(annexOption, parseInt(e.target.value) || 1)} className="w-14 px-2 py-1 text-sm border border-slate-300 rounded bg-slate-50" />
                                                            <button type="button" onClick={() => handleRemoveAnnex(annexOption)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                    {Array.from({ length: quantity }).map((_, idx) => (
                                                        <div key={idx} className="grid grid-cols-2 gap-2 mb-1 last:mb-0">
                                                            <select value={surfaces[idx]?.surfaceType || ''} onChange={(e) => handleAnnexSurfaceChange(annexOption, idx, 'surfaceType', e.target.value)} className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded" required>
                                                                <option value="" disabled>Tipo Sup.</option>
                                                                {Object.values(SurfaceType).map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                                            </select>
                                                            <div className="relative">
                                                                <input type="number" placeholder="m²" value={surfaces[idx]?.area || ''} onChange={(e) => handleAnnexSurfaceChange(annexOption, idx, 'area', parseFloat(e.target.value))} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded" required />
                                                                <span className="absolute right-2 top-1.5 text-xs text-slate-400 pointer-events-none">m²</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                             </section>

                             {/* 3. UBICACION */}
                             <section>
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800 border-b pb-2 border-slate-100"><MapPin className="w-5 h-5 text-brand-600" /> Ubicación</h2>
                                {/* Search Logic */}
                                <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200" ref={dropdownRef}>
                                    <div className="flex gap-2 relative">
                                        <div className="relative flex-1">
                                            <input type="text" value={addressSearch} onChange={(e) => { setAddressSearch(e.target.value); if(e.target.value.length===0) setShowSuggestions(false); }} onFocus={() => { if (suggestions.length>0) setShowSuggestions(true); }} placeholder="Buscador: Ej: Calle Mayor 10, Madrid" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())} className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-md text-sm" />
                                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                                                    <ul>
                                                        {suggestions.map((s, index) => (
                                                            <li key={index} onClick={() => handleSuggestionClick(s)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3 border-b border-slate-100">
                                                                <MapPin className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                                                <span className="text-sm text-slate-800 line-clamp-2">{s.display_name}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <button type="button" onClick={() => handleAddressSearch()} disabled={searchingAddress} className="bg-brand-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2">{searchingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-12 gap-3 mb-3">
                                    <div className="col-span-4"><InputGroup id="streetType" label="Tipo de vía" value={formData.streetType} onChange={handleInputChange} options={STREET_TYPES} required /></div>
                                    <div className="col-span-8"><InputGroup id="streetName" label="Nombre de la vía" value={formData.streetName} onChange={handleInputChange} placeholder="Ej: Mayor" required /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <InputGroup id="streetNumber" label="Número" value={formData.streetNumber} onChange={handleInputChange} placeholder="12" required />
                                    <InputGroup id="block" label="Bloque" value={formData.block} onChange={handleInputChange} />
                                    <InputGroup id="entrance" label="Portal" value={formData.entrance} onChange={handleInputChange} />
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <InputGroup id="floorLevel" label="Piso" value={formData.floorLevel} onChange={handleInputChange} />
                                    <InputGroup id="door" label="Puerta" value={formData.door} onChange={handleInputChange} />
                                    <InputGroup id="postalCode" label="C. Postal" value={formData.postalCode} onChange={handleInputChange} required />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <InputGroup id="municipality" label="Municipio" value={formData.municipality} onChange={handleInputChange} required />
                                    <InputGroup id="province" label="Provincia" value={formData.province} onChange={handleInputChange} required />
                                </div>
                                <div className="mb-3">
                                   <InputGroup id="constructionYear" label="Año de construcción" type="number" value={formData.constructionYear || ''} onChange={handleInputChange} placeholder="Ej: 2005" required />
                                </div>
                                <InputGroup id="cadastralReference" label="Referencia Catastral" value={formData.cadastralReference} onChange={handleInputChange} />
                             </section>

                             {/* 4. SUPERFICIES */}
                             <section>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800 border-b pb-2 border-slate-100"><Ruler className="w-5 h-5 text-brand-600" /> Superficies</h3>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Inmueble Principal</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputGroup id="surfaceType" label="Tipo" value={formData.surfaceType} onChange={handleInputChange} options={Object.values(SurfaceType)} required className="text-sm" />
                                        <InputGroup id="area" label="Metros (m²)" type="number" value={formData.area} onChange={handleInputChange} required className="text-sm" />
                                    </div>
                                </div>
                             </section>

                             {/* 5. CARACTERISTICAS */}
                             <section>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800 border-b pb-2 border-slate-100"><Building2 className="w-5 h-5 text-brand-600" /> Características</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">Habitaciones</label><input id="rooms" type="number" value={formData.rooms} onChange={handleInputChange} className="px-3 py-2 bg-white border border-slate-300 rounded-md" /></div>
                                    <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">Baños</label><input id="bathrooms" type="number" value={formData.bathrooms} onChange={handleInputChange} className="px-3 py-2 bg-white border border-slate-300 rounded-md" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">Ascensor <span className="text-red-500">*</span></label><select id="elevator" value={formData.elevator === null ? '' : (formData.elevator ? 'Si' : 'No')} onChange={(e) => handleBooleanSelectChange('elevator', e.target.value)} className="px-3 py-2 bg-white border border-slate-300 rounded-md" required><option value="" disabled>Seleccionar</option><option value="Si">Si</option><option value="No">No</option></select></div>
                                    <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">Terraza <span className="text-red-500">*</span></label><select id="terrace" value={formData.terrace === null ? '' : (formData.terrace ? 'Si' : 'No')} onChange={(e) => handleBooleanSelectChange('terrace', e.target.value)} className="px-3 py-2 bg-white border border-slate-300 rounded-md" required><option value="" disabled>Seleccionar</option><option value="Si">Si</option><option value="No">No</option></select></div>
                                    {formData.terrace && (
                                        <div className="col-span-2 grid grid-cols-2 gap-4">
                                            <InputGroup id="terraceType" label="Tipo de terraza" value={formData.terraceType || ''} onChange={handleInputChange} options={Object.values(TerraceType)} required />
                                            <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">Superficie (m²)</label><input type="number" value={formData.terraceArea || ''} onChange={(e) => setFormData(prev => ({ ...prev, terraceArea: parseFloat(e.target.value) }))} className="px-3 py-2 bg-white border border-slate-300 rounded-md" required /></div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                    <div className="flex flex-col"><label className="mb-1 text-sm font-medium text-slate-700">¿Zonas Comunes? <span className="text-red-500">*</span></label><select id="hasCommonZones" value={formData.hasCommonZones === null ? '' : (formData.hasCommonZones ? 'Si' : 'No')} onChange={handleCommonZoneChange} className="px-3 py-2 bg-white border border-slate-300 rounded-md" required><option value="" disabled>Seleccionar</option><option value="No">No</option><option value="Si">Si</option></select></div>
                                    {formData.hasCommonZones && (
                                        <div className="flex flex-col">
                                            <label className="mb-1 text-sm font-medium text-slate-700 flex items-center gap-1"><Users className="w-3 h-3" /> Instalaciones</label>
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200 h-full">
                                                {Object.values(CommonAreaAmenity).map((amenity) => (
                                                    <label key={amenity} className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:text-brand-700 group">
                                                        <div className="relative flex items-center justify-center w-4 h-4 mr-1"><input type="checkbox" checked={formData.commonAmenities.includes(amenity)} onChange={() => handleAmenityChange(amenity)} className="peer appearance-none w-4 h-4 border border-slate-300 rounded bg-white checked:bg-brand-600 checked:border-brand-600" /><Check className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" /></div>
                                                        <span className="truncate" title={amenity}>{amenity}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                             </section>

                             {/* 6. FINALIDAD */}
                             <section className="bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800"><Target className="w-5 h-5 text-brand-600" /> Finalidad</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputGroup id="mainPurpose" label="Finalidad Principal" value={formData.mainPurpose} onChange={handleInputChange} options={Object.values(ValuationMainPurpose)} required className="h-full" />
                                    <div className="flex flex-col h-full"><label className="mb-1 text-sm font-medium text-slate-700">Duda Específica</label><select className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md" value={formData.secondaryPurposes[0] || ""} onChange={(e) => { const val = e.target.value; setFormData(prev => ({ ...prev, secondaryPurposes: val ? [val as ValuationSecondaryPurpose] : [] })); }}><option value="" disabled>Selecciona una opción...</option>{Object.values(ValuationSecondaryPurpose).map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
                                </div>
                                <div className="mt-4"><label className="mb-1 text-sm font-medium text-slate-700">Otros motivos / Detalles</label><input type="text" value={formData.otherSecondaryPurpose} onChange={(e) => setFormData(prev => ({...prev, otherSecondaryPurpose: e.target.value}))} className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded" /></div>
                             </section>
                             
                             {/* FORMATO */}
                             <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-800"><ClipboardList className="w-5 h-5 text-brand-600" /> Formato</h3>
                                <div className="space-y-2">
                                    <label className="flex items-start cursor-pointer group">
                                        <div className="relative flex items-center justify-center w-5 h-5 mr-3 mt-0.5"><input type="checkbox" checked={formData.detailedReport} onChange={(e) => setFormData(prev => ({ ...prev, detailedReport: e.target.checked }))} className="peer appearance-none w-5 h-5 border border-slate-300 rounded bg-white checked:bg-brand-600 checked:border-brand-600" /><Check className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" /></div>
                                        <div><span className="text-sm font-medium text-slate-800">Quiero recibir, además del valor, un informe detallado explicativo</span></div>
                                    </label>
                                    <p className="pl-8 text-xs text-slate-500">Incluye análisis de mercado, comparables, ajustes, riesgos y explicación del valor.</p>
                                </div>
                             </section>

                             {/* 7. INFO EXTRA & EMAIL */}
                             <section className="space-y-6">
                                <div><label htmlFor="additionalInfo" className="mb-1 text-sm font-medium text-slate-700 block">Comentarios</label><textarea id="additionalInfo" value={formData.additionalInfo} onChange={handleInputChange} rows={3} placeholder="Cuéntanos brevemente tu caso..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md resize-none" /></div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label htmlFor="email" className="block text-sm font-bold text-slate-800 mb-2">¿Dónde te enviamos el informe? <span className="text-red-500">*</span></label>
                                    <div className="relative"><input type="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-md" placeholder="tu@email.com" /><Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" /></div>
                                </div>
                             </section>

                             <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 px-4 rounded-xl transition-all shadow-md shadow-brand-200 disabled:opacity-70 text-lg">
                                {loading ? (<><Loader2 className="w-6 h-6 animate-spin" /> Analizando mercado...</>) : (<><Send className="w-6 h-6" /> Generar Valoración</>)}
                             </button>
                        </form>
                    </div>
                 </div>

                 {/* Right Sidebar (Map) - Now on the side or bottom depending on screen */}
                 <div className="lg:col-span-4 space-y-6">
                    <div className="sticky top-24">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Ubicación en Mapa</h3>
                            <div className="rounded-lg overflow-hidden border border-slate-300 shadow-sm relative bg-slate-100 aspect-square">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src={mapSrc} 
                                    style={{ border: 0 }} 
                                    title="Mapa de Ubicación"
                                    loading="lazy"
                                ></iframe>
                            </div>
                        </div>
                        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-900 leading-relaxed">
                            <p className="font-semibold mb-1 flex items-center gap-2"><Info className="w-4 h-4" /> Nota Informativa</p>
                            Aviso: Este informe es una valoración estimativa basada en datos de mercado y algoritmos de inteligencia artificial. No constituye una tasación oficial con validez legal hipotecaria.
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      )}

      {/* --- RESULT SCREEN --- */}
      {step === 'result' && report && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
             
             {/* Action Bar (Sticky Top) */}
             <div className="sticky top-20 z-40 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                 <button 
                   onClick={() => setStep('form')}
                   className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
                 >
                    <ArrowLeft className="w-4 h-4" /> Volver al formulario
                 </button>

                 <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto justify-end">
                     <button 
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shadow-sm"
                     >
                        <Download className="w-4 h-4" /> Descargar Informe
                     </button>
                     <button 
                        onClick={handleOpenEmailModal}
                        className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shadow-sm"
                     >
                        <Mail className="w-4 h-4" /> Enviar por Correo
                     </button>
                     <div className="relative">
                        <button 
                           onClick={() => {
                               // Pre-select province logic if opening
                               if (!showTechDropdown && formData.province) {
                                   const match = PROVINCES.find(p => p.toLowerCase() === formData.province.toLowerCase());
                                   if (match) setSelectedTechProvince(match);
                               }
                               setShowTechDropdown(!showTechDropdown);
                           }}
                           className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all shadow-md shadow-brand-200"
                        >
                            <HardHat className="w-4 h-4" /> Contactar con un Técnico
                        </button>

                        {/* Tech Dropdown */}
                        {showTechDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                                <h4 className="text-sm font-bold text-slate-800 mb-2">Solicitar Técnico Oficial</h4>
                                <p className="text-xs text-slate-500 mb-3">Selecciona la provincia para asignarte al tasador homologado más cercano.</p>
                                <select 
                                   value={selectedTechProvince}
                                   onChange={(e) => setSelectedTechProvince(e.target.value)}
                                   className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm mb-3 focus:ring-brand-500 focus:outline-none"
                                >
                                    <option value="" disabled>Seleccionar provincia...</option>
                                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button 
                                   disabled={!selectedTechProvince}
                                   className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-800 transition-colors"
                                   onClick={() => {
                                       alert(`Solicitud enviada a un técnico en ${selectedTechProvince}. Nos pondremos en contacto contigo.`);
                                       setShowTechDropdown(false);
                                   }}
                                >
                                   Solicitar Contacto
                                </button>
                            </div>
                        )}
                     </div>
                 </div>
             </div>

             {/* Report Component */}
             <div id="valuation-report-content" className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <ValuationResult report={report} userType={formData.userType} />
             </div>
          </div>
      )}
    </Layout>
  );
};

export default App;



