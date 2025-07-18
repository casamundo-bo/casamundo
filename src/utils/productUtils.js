/**
 * Creates a serializable version of a product object
 * Removes or converts non-serializable values like Firebase Timestamps
 */
export const createSerializableProduct = (product) => {
    if (!product || !product.id) {
        console.error("Producto inválido para serializar");
        return null;
    }
    
    try {
        return {
            id: product.id,
            title: safeText(product.title) || "Producto sin nombre",
            price: parseFloat(product.price) || 0,
            imageUrl: product.imageUrl || product.productImageUrl || "",
            description: safeText(product.description) || "",
            category: safeText(product.category) || "",
            subcategory: safeText(product.subcategory) || "",
            stock: parseInt(product.stock) || 0,
            hasStockControl: typeof product.hasStockControl === 'boolean' 
                ? product.hasStockControl 
                : product.stock !== 999999
        };
    } catch (error) {
        console.error("Error al serializar producto:", error);
        return null;
    }
};

import { formatDate } from './dateUtils';

/**
 * Convierte cualquier valor a un string seguro para renderizar en JSX
 * @param {any} value - Valor que puede ser string, número, objeto o null.
 * @param {string} [fallback='N/A'] - Texto a mostrar cuando el valor es falsy
 * @returns {string}
 */
export const safeText = (value, fallback = 'N/A') => {
  if (value === null || value === undefined) return fallback;
  
  // Manejar cadenas vacías
  if (typeof value === 'string' && value.trim() === '') return fallback;

  if (typeof value === 'object') {
    // Timestamp de Firestore
    if ('seconds' in value && 'nanoseconds' in value) {
      return formatDate(value);
    }
    
    // Manejar arrays
    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }
    
    return '[obj]';
  }

  return String(value);
};

/**
 * Formatea el precio para mostrar en la interfaz
 * @param {number|string} price - Precio a formatear
 * @param {string} [currency='Bs.'] - Símbolo de moneda
 * @returns {string} - Precio formateado
 */
export const formatPrice = (price, currency = 'Bs.') => {
  if (price === null || price === undefined) return 'N/A';
  
  const numPrice = Number(price);
  if (isNaN(numPrice)) return `${currency} 0`;
  
  return `${currency} ${numPrice.toFixed(2)}`;
};