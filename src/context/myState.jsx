import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import MyContext from './myContext';
import {
  collection,
  query,
  getDocs,
  limit,
  startAfter,
  orderBy,
  where
} from 'firebase/firestore';
import { fireDB } from '../firebase/FirebaseConfig';
import { auth } from '../firebase/FirebaseConfig';
import { useDispatch } from 'react-redux';
import { loadUserCart } from '../redux/cartSlice';
import { normalizeOrderData } from '../utils/orderUtils';

const CACHE_DURATION = 5 * 60 * 1000;
const PAGE_SIZE = 20;

function MyState({ children }) {
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [getAllProduct, setGetAllProduct] = useState([]);
  const [getAllOrder, setGetAllOrder] = useState([]);
  const [getAllUser, setGetAllUser] = useState([]);
  // Añadir estado para deudas
  const [getAllDebts, setGetAllDebts] = useState([]);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [productCache, setProductCache] = useState({});
  const [cacheExpiry, setCacheExpiry] = useState({});
  const orderCacheRef = useRef([]);
  // Añadir referencia para caché de deudas
  const debtsCacheRef = useRef([]);

  const dispatch = useDispatch();
  const loadingTimeoutRef = useRef(null);

  // Usuario autenticado
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user.uid);
        dispatch(loadUserCart({ userId: user.uid }));
      } else {
        setCurrentUser(null);
        dispatch(loadUserCart({ userId: 'guest' }));
      }
    });
    return () => unsubscribe();
  }, [dispatch]);

  // Verifica si la caché es válida
  const isCacheValid = useCallback((key) => {
    return cacheExpiry[key] && cacheExpiry[key] > Date.now();
  }, [cacheExpiry]);

  const getProductByCategory = useCallback(async (categoryName) => {
    if (!categoryName) return [];
    const category = categoryName.toString().toUpperCase();
    if (productCache[category] && isCacheValid(category)) return productCache[category];
    setLoading(true);
    try {
      const q = query(collection(fireDB, 'products'), where('category', '==', category));
      const querySnapshot = await getDocs(q);
      const productsArray = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        category: doc.data().category?.toUpperCase() || '',
        subcategory: doc.data().subcategory?.toUpperCase() || ''
      }));
      setProductCache((prev) => ({ ...prev, [category]: productsArray }));
      setCacheExpiry((prev) => ({ ...prev, [category]: Date.now() + CACHE_DURATION }));
      return productsArray;
    } catch (error) {
      console.error('Error al obtener productos por categoría:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [productCache, isCacheValid]);

  const getAllProductFunction = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(fireDB, 'products'), limit(PAGE_SIZE));
      const querySnapshot = await getDocs(q);
      const productArray = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        category: doc.data().category?.toUpperCase() || '',
        subcategory: doc.data().subcategory?.toUpperCase() || ''
      }));
      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);
      setGetAllProduct(productArray);
    } catch (error) {
      console.error("Error en getAllProductFunction:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMoreProducts = useCallback(async () => {
    if (!lastVisible || !hasMore) return;
    setLoading(true);
    try {
      const q = query(
        collection(fireDB, 'products'),
        orderBy('time', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const newProducts = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            category: data.category?.toUpperCase() || '',
            subcategory: data.subcategory?.toUpperCase() || ''
          };
        });
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
        setHasMore(querySnapshot.docs.length === PAGE_SIZE);
        setGetAllProduct((prev) => [...prev, ...newProducts]);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more products:", error);
    } finally {
      setLoading(false);
    }
  }, [lastVisible, hasMore]);

  const getAllOrderFunction = useCallback(async (forceRefresh = false) => {
    if (orderCacheRef.current.length > 0 && !forceRefresh) {
      return orderCacheRef.current;
    }

    setLoadingOrders(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => setLoading(true), 500);

    try {
      const q = query(collection(fireDB, "orders"), orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);

      const ordersArray = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const cleanedData = {};
        Object.keys(data).forEach((key) => {
          let value = data[key];
          if (value && typeof value === 'object' && 'seconds' in value) {
            value = new Date(value.seconds * 1000 + value.nanoseconds / 1000000).toISOString();
          }
          cleanedData[key] = value;
        });
        return normalizeOrderData({ ...cleanedData, id: doc.id });
      });

      orderCacheRef.current = ordersArray;
      setGetAllOrder(ordersArray);
      return ordersArray;
    } catch (error) {
      console.error("Error al cargar órdenes:", error);
      return [];
    } finally {
      clearTimeout(loadingTimeoutRef.current);
      setLoading(false);
      setLoadingOrders(false);
    }
  }, []);

  const getAllUserFunction = useCallback(async () => {
    if (getAllUser.length > 0) return getAllUser;
    setLoading(true);
    try {
      const q = query(collection(fireDB, 'user'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const usersList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setGetAllUser(usersList);
      return usersList;
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshOrdersAfterCreation = useCallback(async () => {
    await getAllOrderFunction(true);
    return true;
  }, [getAllOrderFunction]);

  // Función para obtener todas las deudas
  const getAllDebtsFunction = async () => {
    try {
      setLoadingDebts(true);
      
      // Verificar si hay datos en caché y si son recientes (menos de 1 minuto)
      const now = Date.now();
      const cacheTime = debtsCacheRef.current.timestamp || 0;
      
      if (debtsCacheRef.current.data && now - cacheTime < 60000) {
        setGetAllDebts(debtsCacheRef.current.data);
        setLoadingDebts(false);
        return;
      }
      
      const q = query(collection(fireDB, "debts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const debtsArray = [];
      const debtIds = new Set(); // Para evitar duplicados
      
      querySnapshot.forEach((doc) => {
        const debtData = doc.data();
        const debtId = doc.id;
        
        // Verificar si ya tenemos esta deuda en el array
        if (!debtIds.has(debtId)) {
          debtIds.add(debtId);
          debtsArray.push({
            ...debtData,
            id: debtId,
            // Convertir timestamps a fechas para facilitar el manejo
            createdAt: debtData.createdAt ? new Date(debtData.createdAt.seconds * 1000) : new Date(),
            lastUpdated: debtData.lastUpdated ? new Date(debtData.lastUpdated.seconds * 1000) : null
          });
        }
      });
      
      // Actualizar caché
      debtsCacheRef.current = {
        data: debtsArray,
        timestamp: now
      };
      
      setGetAllDebts(debtsArray);
    } catch (error) {
      console.error("Error al obtener deudas:", error);
    } finally {
      setLoadingDebts(false);
    }
  };
  
  // Add a function to refresh debts after changes - REMOVE THIS DUPLICATE DECLARATION
  // const refreshDebtsAfterChange = async () => {
  //     await getAllDebtsFunction(true);
  // };

  // Función para refrescar deudas después de crear/actualizar
  const refreshDebtsAfterChange = useCallback(async () => {
      await getAllDebtsFunction(true);
      return true;
  }, [getAllDebtsFunction]);

    // Cargar productos al montar
    useEffect(() => {
      getAllProductFunction();
      return () => {
        clearTimeout(loadingTimeoutRef.current);
      };
    }, [getAllProductFunction]);

    const contextValue = useMemo(() => ({
      loading,
      setLoading,
      loadingDebts,
      getAllProduct,
      getAllOrder,
      getAllUser,
      getAllDebts,
      getAllProductFunction,
      getAllOrderFunction,
      getAllUserFunction,
      getAllDebtsFunction,
      loadMoreProducts,
      hasMore,
      currentUser,
      getProductByCategory,
      refreshOrdersAfterCreation,
      refreshDebtsAfterChange,
    }), [
      loading,
      loadingDebts,
      getAllProduct,
      getAllOrder,
      getAllUser,
      getAllDebts,
      hasMore,
      currentUser,
      getProductByCategory,
      getAllProductFunction,
      getAllOrderFunction,
      getAllUserFunction,
      getAllDebtsFunction,
      loadMoreProducts,
      refreshOrdersAfterCreation,
      refreshDebtsAfterChange,
    ]);

    return (
      <MyContext.Provider value={contextValue}>
        {children}
      </MyContext.Provider>
    );
}

export default MyState;
