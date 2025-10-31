import { formatDate } from './dateUtils';

/**
 * Normaliza y limpia los datos de una orden
 * @param {Object} orderData - Datos de la orden a normalizar
 * @returns {Object} - Datos normalizados
 */
export const normalizeOrderData = (orderData) => {
  if (!orderData) return {};

  // Crear un objeto limpio con los campos normalizados
  const normalizedOrder = {
    id: orderData.id || '',

    // Información de usuario - Estandarizar userId como campo principal
    userId: orderData.userId || orderData.uid || orderData.userid || (orderData.user?.uid ? String(orderData.user.uid) : ''),
    // Mantener estos campos para compatibilidad pero siempre usar userId internamente
    uid: orderData.userId || orderData.uid || orderData.userid || (orderData.user?.uid ? String(orderData.user.uid) : ''),
    userid: orderData.userId || orderData.uid || orderData.userid || (orderData.user?.uid ? String(orderData.user.uid) : ''),
    email: orderData.email || orderData.userEmail || '',
    userName: orderData.userName || orderData.name || '',

    // Información de la orden
    status: orderData.status || orderData.orderStatus || 'pending',
    totalAmount: orderData.totalAmount || orderData.orderAmount || 0,
    paymentMethod: orderData.paymentMethod || '',

    // Fechas normalizadas
    date: formatDate(orderData.date || orderData.orderDate || orderData.time || orderData.orderTime),
    createdAt: formatDate(orderData.createdAt),
    updatedAt: formatDate(orderData.updatedAt),

    // Detalles
    cartItems: orderData.cartItems || orderData.products || [],
    addressInfo: orderData.addressInfo || {},

    // Campos adicionales
    discount: orderData.discount || 0,
    originalAmount: orderData.originalAmount || 0,
    adminNote: orderData.adminNote || '',
    orderType: orderData.orderType || 'standard',
  };

  // Limpiar comentarios en campos string
  Object.keys(normalizedOrder).forEach(key => {
    if (typeof normalizedOrder[key] === 'string' && normalizedOrder[key].includes('//')) {
      normalizedOrder[key] = normalizedOrder[key].split('//')[0].trim();
    }
  });

  return normalizedOrder;
};

/**
 * Obtiene un conjunto consistente de nombres de campos para todas las órdenes
 * @param {Array} orders - Lista de órdenes
 * @returns {Array} - Lista de nombres de campos normalizados
 */
export const getConsistentOrderFields = (orders) => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const allFields = new Set();
  orders.forEach(order => {
    Object.keys(order).forEach(key => {
      if (!key.startsWith('_') && !key.includes('//')) {
        allFields.add(key);
      }
    });
  });

  return Array.from(allFields).sort();
};

/**
 * Sanitiza un valor para renderizado seguro
 * @param {any} value - Valor a sanitizar
 * @returns {any} - Valor sanitizado
 */
export const sanitizeOrderValue = (value) => {
  if (typeof value === 'string' && value.includes('//')) {
    return value.split('//')[0].trim();
  }
  return value;
};

/**
 * Verifica si una orden pertenece a un usuario específico
 * @param {Object} order - La orden a verificar
 * @param {Object} user - El usuario actual
 * @returns {boolean} - True si la orden pertenece al usuario
 */
export const isOrderBelongsToUser = (order, user) => {
  if (!order || !user) return false;

  if (
    (order.uid && order.uid === user.uid) ||
    (order.userId && order.userId === user.uid) ||
    (order.userid && order.userid === user.uid)
  ) return true;

  if (
    (order.email && order.email.toLowerCase() === user.email?.toLowerCase()) ||
    (order.userEmail && order.userEmail.toLowerCase() === user.email?.toLowerCase())
  ) return true;

  return false;
};
