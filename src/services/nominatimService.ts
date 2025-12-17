// src/services/nominatimService.ts

import { ENV_CONFIG } from '../config/environment';

/**
 * RATE LIMITING
 * Nominatim tiene límites: máx 1 request/segundo
 * Nosotros usamos 300ms para ser respetuosos
 */
const RATE_LIMIT_DELAY = 300; // ms
let lastRequestTime = 0;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const enforceRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    await sleep(RATE_LIMIT_DELAY - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
};

/**
 * Busca direcciones en Nominatim (autocompletado)
 * @param query - Texto a buscar (ej: "Calle Mayor 10, Madrid")
 * @returns Array de sugerencias
 */
export const searchAddresses = async (query: string) => {
  if (!query.trim() || query.length < 3) {
    return [];
  }

  try {
    await enforceRateLimit();
    
    const response = await fetch(
      `${ENV_CONFIG.nominatim.apiUrl}/search?format=json&q=${encodeURIComponent(
        query
      )}&addressdetails=1&limit=8&countrycodes=es`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Deduplicar (evita sugerencias duplicadas)
    return data.filter((value: any, index: number, self: any[]) =>
      index === self.findIndex((t) => t.display_name === value.display_name)
    );
  } catch (error) {
    console.error('Error searching addresses:', error);
    return [];
  }
};

/**
 * Obtiene coordenadas (lat/lon) de una dirección
 * Usado para mostrar en el mapa
 */
export const geocodeAddress = async (
  streetType: string,
  streetName: string,
  streetNumber: string,
  municipality: string,
  province: string
) => {
  if (!municipality || !province) {
    return null;
  }

  const query = [streetType, streetName, streetNumber, municipality, province]
    .filter(Boolean)
    .join(' ');

  try {
    await enforceRateLimit();
    
    const response = await fetch(
      `${ENV_CONFIG.nominatim.apiUrl}/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};
