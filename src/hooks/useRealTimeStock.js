import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';
import toast from 'react-hot-toast';

/**
 * Hook personalizado para escuchar cambios en el stock de un producto en tiempo real
 * @param {string} productId - ID del producto a monitorear
 * @param {number} initialStock - Stock inicial del producto
 * @param {boolean} initialHasStockControl - Indica si el producto tiene control de stock
 * @returns {Object} - Objeto con el stock actual y funciones para verificar disponibilidad
 */
const useRealTimeStock = (productId, initialStock = 0, initialHasStockControl = true) => {
  const [currentStock, setCurrentStock] = useState(initialStock);
  const [hasStockControl, setHasStockControl] = useState(initialHasStockControl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    // Referencia al documento del producto
    const productRef = doc(fireDB, 'products', productId);
    
    // Configurar el listener en tiempo real
    const unsubscribe = onSnapshot(
      productRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const productData = docSnapshot.data();
          setCurrentStock(productData.stock || 0);
          
          // Priorizar el campo hasStockControl explícito
          setHasStockControl(
              typeof productData.hasStockControl === 'boolean' 
                  ? productData.hasStockControl 
                  : productData.stock === 999999 ? false : true
          );
        } else {
          console.warn(`Producto con ID ${productId} no encontrado`);
          setCurrentStock(0);
          setHasStockControl(true);
        }
        setLoading(false);
      },
      (err) => {
        console.error(`Error al monitorear el stock del producto ${productId}:`, err);
        setError(err);
        setLoading(false);
      }
    );
    
    // Limpiar el listener cuando el componente se desmonte
    return () => unsubscribe();
  }, [productId]);

  /**
   * Verifica si hay suficiente stock disponible para una cantidad dada
   * @param {number} quantity - Cantidad a verificar
   * @returns {boolean} - true si hay suficiente stock, false en caso contrario
   */
  const checkStockAvailability = (quantity) => {
    // Si no hay control de stock, siempre hay disponibilidad
    if (!hasStockControl) return true;
    
    if (quantity > currentStock) {
      toast.error(`Solo hay ${currentStock} unidades disponibles`);
      return false;
    }
    return true;
  };

  return {
    currentStock,
    hasStockControl,
    loading,
    error,
    checkStockAvailability
  };
};

export default useRealTimeStock;