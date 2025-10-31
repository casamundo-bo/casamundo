/**
 * Sanitiza un valor para renderizado seguro
 * @param {any} value - Valor a sanitizar
 * @returns {any} - Valor sanitizado
 */
export const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    // Eliminar cualquier texto de comentario
    if (value.includes('//')) {
      return value.split('//')[0].trim();
    }
  }
  return value;
};

/**
 * Limpia los datos antes de guardarlos en Firestore
 * @param {Object} data - Datos a limpiar
 * @returns {Object} - Datos limpios
 */
export const cleanDataForFirestore = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const cleanedData = {};
  
  Object.keys(data).forEach(key => {
    let value = data[key];
    
    // Limpiar strings
    if (typeof value === 'string') {
      // Eliminar cualquier texto de comentario
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }
      
      // Si después de limpiar está vacío, no lo incluimos
      if (value === '') {
        return;
      }
    }
    
    // Limpiar objetos anidados
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      value = cleanDataForFirestore(value);
    }
    
    // Limpiar arrays
    if (Array.isArray(value)) {
      value = value.map(item => {
        if (item && typeof item === 'object') {
          return cleanDataForFirestore(item);
        }
        return item;
      });
    }
    
    cleanedData[key] = value;
  });
  
  return cleanedData;
};