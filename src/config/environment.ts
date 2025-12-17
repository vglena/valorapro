// src/config/environment.ts

/**
 * Valida que una variable de entorno exista
 * @param key - Nombre de la variable (sin VITE_ al inicio)
 * @param defaultValue - Valor por defecto opcional
 * @returns El valor de la variable o el default
 */
const validateEnv = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[`VITE_${key}`] || defaultValue || '';
  
  if (!value && !defaultValue) {
    console.warn(`⚠️ Missing environment variable: VITE_${key}`);
  }
  
  return value;
};

/**
 * Objeto centralizado con toda la configuración
 * Se usa en toda la app: import { ENV_CONFIG } from './config/environment'
 */
export const ENV_CONFIG = {
  emailjs: {
    serviceId: validateEnv('EMAILJS_SERVICE_ID'),
    templateId: validateEnv('EMAILJS_TEMPLATE_ID'),
    publicKey: validateEnv('EMAILJS_PUBLIC_KEY'),
    
    /**
     * Verifica si EmailJS está configurado correctamente
     * Retorna true solo si los 3 valores existen
     */
    isConfigured: () => {
      const { serviceId, templateId, publicKey } = ENV_CONFIG.emailjs;
      return serviceId !== '' && templateId !== '' && publicKey !== '';
    }
  },
  nominatim: {
    // Nominatim es público, pero se centraliza aquí para cambiar fácilmente
    apiUrl: validateEnv('NOMINATIM_API_URL', 'https://nominatim.openstreetmap.org')
  }
};
