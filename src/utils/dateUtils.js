/**
 * Convierte cualquier valor tipo Timestamp, Date, ISO string o número a una cadena legible.
 * @param {any} value - Valor que puede ser Firestore Timestamp, Date, string o número.
 * @param {string} [locale='es-BO'] - Formato de localización.
 * @returns {string} Fecha formateada o mensaje por defecto.
 */
// Modificar la función formatDate para manejar mejor las fechas ya formateadas
export const formatDate = (value, locale = 'es-BO') => {
  if (!value) return 'N/A';

  try {
    // Si ya es una cadena formateada con formato de fecha local (contiene comas y a. m./p. m.)
    if (typeof value === 'string' && 
        (value.includes('a. m.') || value.includes('p. m.') || 
         value.includes('AM') || value.includes('PM') || 
         value.includes('a.m.') || value.includes('p.m.'))) {
      return value; // Devolver la cadena tal como está sin intentar reformatearla
    }

    // Firestore Timestamp: { seconds, nanoseconds }
    if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(locale);
      }
      return 'Fecha inválida';
    }

    // Firebase Timestamp.toDate()
    if (typeof value?.toDate === 'function') {
      try {
        const date = value.toDate();
        return date.toLocaleString(locale);
      } catch (e) {
        console.warn('Error al convertir Timestamp.toDate():', e);
        return 'Fecha inválida';
      }
    }

    // Manejar formato "DD MMM YYYY" (ej: "01 abr 2025")
    if (typeof value === 'string' && /^\d{1,2}\s+[a-zA-Z]{3,}\s+\d{4}$/.test(value)) {
      // Mapeo de abreviaturas de meses en español
      const mesesAbreviados = {
        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
      };
      
      // Extraer partes de la fecha
      const partes = value.split(/\s+/);
      const dia = parseInt(partes[0], 10);
      const mesAbr = partes[1].toLowerCase().substring(0, 3);
      const año = parseInt(partes[2], 10);
      
      // Verificar si el mes es válido
      if (mesAbr in mesesAbreviados) {
        const date = new Date(año, mesesAbreviados[mesAbr], dia);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString(locale);
        }
      }
    }

    // ISO String, fecha en texto o número
    if (typeof value === 'string' || typeof value === 'number') {
      // Intentar convertir a Date
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(locale);
      }
      
      // Si es un string que no se pudo convertir, intentar formatos específicos
      if (typeof value === 'string') {
        // Formato DD/MM/YYYY o DD-MM-YYYY
        const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
        if (dmyRegex.test(value)) {
          const matches = value.match(dmyRegex);
          const day = parseInt(matches[1], 10);
          const month = parseInt(matches[2], 10) - 1; // Meses en JS son 0-11
          const year = parseInt(matches[3], 10);
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString(locale);
          }
        }
        
        // Formato YYYY/MM/DD o YYYY-MM-DD
        const ymdRegex = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;
        if (ymdRegex.test(value)) {
          const matches = value.match(ymdRegex);
          const year = parseInt(matches[1], 10);
          const month = parseInt(matches[2], 10) - 1; // Meses en JS son 0-11
          const day = parseInt(matches[3], 10);
          
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date.toLocaleString(locale);
          }
        }
        
        // Si llegamos aquí y es un string que parece una fecha pero no pudimos convertirlo,
        // devolvemos el string original en lugar de "Fecha inválida"
        if (value.includes('/') || value.includes('-') || value.includes(':')) {
          console.warn(`formatDate: No se pudo convertir el formato de fecha: ${value}`);
          return value; // Devolver el valor original
        }
      }
    }

    // Si es un objeto Date
    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        return value.toLocaleString(locale);
      }
      return 'Fecha inválida';
    }

    // Si es un objeto pero no es un Date ni un Timestamp
    if (typeof value === 'object') {
      // Intentar convertir a string JSON
      try {
        return `Objeto: ${JSON.stringify(value)}`;
      } catch (e) {
        return 'Objeto no serializable';
      }
    }

    // Si llegamos aquí, devolver el valor convertido a string
    return String(value);
  } catch (error) {
    console.warn('Error en formatDate:', error);
    
    // En caso de error, intentar devolver el valor original como string
    if (value !== undefined && value !== null) {
      return String(value);
    }
    
    return 'Fecha inválida';
  }
};

/**
 * Verifica si un valor es una fecha válida
 * @param {any} value - Valor a verificar
 * @returns {boolean} - true si es una fecha válida
 */
export const isValidDate = (value) => {
  if (!value) return false;
  
  try {
    // Firestore Timestamp
    if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      const date = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      return !isNaN(date.getTime());
    }
    
    // Firebase Timestamp.toDate()
    if (typeof value?.toDate === 'function') {
      try {
        const date = value.toDate();
        return !isNaN(date.getTime());
      } catch (e) {
        return false;
      }
    }
    
    // Date object
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    // String o número
    if (typeof value === 'string' || typeof value === 'number') {
      // Formato "DD MMM YYYY"
      if (typeof value === 'string' && /^\d{1,2}\s+[a-zA-Z]{3,}\s+\d{4}$/.test(value)) {
        const mesesAbreviados = {
          'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
        };
        
        const partes = value.split(/\s+/);
        const mesAbr = partes[1].toLowerCase().substring(0, 3);
        
        if (!(mesAbr in mesesAbreviados)) {
          return false;
        }
      }
      
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Convierte una fecha a formato ISO para almacenar en Firestore
 * @param {any} date - Fecha a convertir (Date, string, Timestamp)
 * @returns {string} - Fecha en formato ISO o null si es inválida
 */
export const toISODate = (date) => {
  if (!date) return null;
  
  try {
    // Si ya es un string ISO
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(date)) {
      return date;
    }
    
    // Firestore Timestamp
    if (typeof date === 'object' && 'seconds' in date && 'nanoseconds' in date) {
      const jsDate = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
      return jsDate.toISOString();
    }
    
    // Firebase Timestamp.toDate()
    if (typeof date?.toDate === 'function') {
      try {
        return date.toDate().toISOString();
      } catch (e) {
        return null;
      }
    }
    
    // Date object
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // String o número
    const jsDate = new Date(date);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString();
    }
    
    return null;
  } catch (error) {
    console.warn('Error en toISODate:', error);
    return null;
  }
};
