/**
 * Utilidades para el manejo de deudas
 */

// Estados de deuda estandarizados
export const DEBT_STATUS = {
    PENDING: 'pending',     // Deuda pendiente de pago
    PARTIAL: 'partial',     // Deuda parcialmente pagada
    PAID: 'paid',           // Deuda completamente pagada
    CANCELLED: 'cancelled'  // Deuda cancelada (anulada)
};

/**
 * Convierte estados antiguos al formato estandarizado
 * @param {string} status - Estado actual de la deuda
 * @returns {string} - Estado estandarizado
 */
export const normalizeDebtStatus = (status) => {
    if (!status) return DEBT_STATUS.PENDING;
    
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
        case 'pendiente':
            return DEBT_STATUS.PENDING;
        case 'parcial':
            return DEBT_STATUS.PARTIAL;
        case 'pagado':
        case 'pagada':
            return DEBT_STATUS.PAID;
        case 'cancelado':
        case 'cancelada':
        case 'anulado':
        case 'anulada':
            return DEBT_STATUS.CANCELLED;
        default:
            // Si ya está en formato estándar, devolverlo
            if (Object.values(DEBT_STATUS).includes(statusLower)) {
                return statusLower;
            }
            // Por defecto, considerar pendiente
            return DEBT_STATUS.PENDING;
    }
};

/**
 * Crea una nueva transacción para el historial de deudas
 * @param {Object} params - Parámetros de la transacción
 * @returns {Object} - Objeto de transacción
 */
export const createDebtTransaction = (params) => {
    // Obtener el usuario actual (quien realiza la acción)
    const currentUser = JSON.parse(localStorage.getItem('users')) || {};
    
    // Extraer parámetros con valores por defecto
    const {
        type = 'addition',
        amount = 0,
        orderId = '',
        note = '',
        paymentMethod = '',
        discount = 0,
        // Importante: Añadir parámetros para el usuario dueño de la deuda
        debtUserId = '', // ID del usuario dueño de la deuda
        debtUserName = '', // Nombre del usuario dueño de la deuda
        debtUserEmail = '' // Email del usuario dueño de la deuda
    } = params;
    
    // Crear objeto de transacción
    return {
        type,
        amount: parseFloat(amount),
        date: new Date(),
        orderId,
        note,
        paymentMethod,
        discount: parseFloat(discount),
        // Usar los datos del usuario dueño de la deuda, no del usuario que realiza la acción
        userId: debtUserId || currentUser.uid || '',
        userName: debtUserName || currentUser.name || '',
        userEmail: debtUserEmail || currentUser.email || '',
        // Opcionalmente, podemos añadir quién realizó la acción
        processedBy: currentUser.uid || '',
        processedByName: currentUser.name || 'admin'
    };
};

/**
 * Calcula el monto restante de una deuda
 * @param {number} totalAmount - Monto total de la deuda
 * @param {Array} transactions - Historial de transacciones
 * @returns {number} - Monto restante
 */
export const calculateRemainingAmount = (totalAmount, transactions = []) => {
    if (!transactions || !Array.isArray(transactions)) {
        return totalAmount;
    }
    
    // Sumar adiciones y restar pagos
    const remaining = transactions.reduce((total, transaction) => {
        if (transaction.type === 'addition') {
            return total + (parseFloat(transaction.amount) || 0);
        } else if (transaction.type === 'payment') {
            return total - (parseFloat(transaction.amount) || 0);
        } else if (transaction.type === 'adjustment') {
            // Los ajustes pueden ser positivos o negativos
            return total + (parseFloat(transaction.amount) || 0);
        }
        return total;
    }, 0);
    
    return Math.max(0, remaining); // No permitir montos negativos
};