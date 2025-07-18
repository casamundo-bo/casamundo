import { formatDate } from './dateUtils';

/**
 * Safely renders any value for display in React components
 * @param {any} value - The value to render
 * @param {string} fallback - Fallback text if value is undefined/null
 * @returns {string|number|JSX.Element} A safely renderable value
 */
export const safeRender = (value, fallback = 'N/A') => {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return fallback;
  }
  
  // Handle Firestore Timestamp objects
  if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    return formatDate(value);
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return formatDate(value);
  }
  
  // Handle objects (convert to JSON string)
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  // Return primitive values as is
  return value;
};