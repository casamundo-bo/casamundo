import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import { formatDate } from '../../utils/dateUtils';
import { safeText } from '../../utils/productUtils'; // Añadir esta importación

const OrdersDebugViewer = () => {
  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllOrders, setShowAllOrders] = useState(false);

  // Obtener el usuario actual
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('users')) || null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        // Consulta para todas las órdenes
        const q = query(collection(fireDB, 'orders'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const ordersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setOrders(ordersData);
        
        // Consulta para órdenes recientes (últimas 24 horas)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        console.log("Buscando órdenes recientes desde:", oneDayAgo);
        
        // Intentar buscar órdenes recientes sin filtro de fecha primero
        const recentQ = query(collection(fireDB, 'orders'), orderBy('date', 'desc'));
        const recentSnapshot = await getDocs(recentQ);
        
        const recentOrdersData = recentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Órdenes recientes encontradas:", recentOrdersData.length);
        setRecentOrders(recentOrdersData.slice(0, 5)); // Mostrar las 5 más recientes
        
        // Si el usuario está autenticado, buscar específicamente sus órdenes
        if (currentUser?.email) {
          console.log("Buscando órdenes para:", currentUser.email);
          
          const userQ = query(
            collection(fireDB, 'orders'), 
            where("email", "==", currentUser.email)
          );
          
          const userSnapshot = await getDocs(userQ);
          console.log("Órdenes encontradas por email:", userSnapshot.docs.length);
          
          // También buscar por userId
          if (currentUser.uid) {
            const userIdQ = query(
              collection(fireDB, 'orders'), 
              where("userId", "==", currentUser.uid)
            );
            
            const userIdSnapshot = await getDocs(userIdQ);
            console.log("Órdenes encontradas por userId:", userIdSnapshot.docs.length);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Error al cargar órdenes: " + err.message);
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  // Filtrar órdenes relevantes para el usuario actual
  const relevantOrders = useMemo(() => {
    if (!currentUser?.email) return [];
    
    return orders.filter(order => {
      const emailMatch = 
        order.email?.toLowerCase() === currentUser.email.toLowerCase() ||
        order.userEmail?.toLowerCase() === currentUser.email.toLowerCase();
      
      const idMatch = 
        order.userId === currentUser.uid ||
        order.uid === currentUser.uid ||
        order.Usuario === currentUser.uid;
      
      return emailMatch || idMatch;
    });
  }, [orders, currentUser]);

  if (loading) return <div className="p-4 bg-gray-100 rounded">Cargando órdenes...</div>;
  if (error) return <div className="p-4 bg-red-100 rounded">{safeText(error)}</div>;

  return (
    <div className="p-4 bg-gray-100 rounded-lg mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">Debug: Órdenes en Firestore</h3>
        <button 
          onClick={() => setShowAllOrders(!showAllOrders)}
          className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
        >
          {showAllOrders ? "Mostrar relevantes" : "Mostrar todas"}
        </button>
      </div>
      
      <p>Total de órdenes: {safeText(orders.length)}</p>
      
      {currentUser && (
        <div className="mt-2 mb-2 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="text-sm font-medium">Órdenes relacionadas con tu cuenta: {safeText(relevantOrders.length)}</p>
          <p className="text-xs text-gray-600">Email: {safeText(currentUser.email)} | UID: {safeText(currentUser.uid)}</p>
        </div>
      )}

      {recentOrders.length > 0 && (
        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
          <h4 className="font-medium text-green-800">Órdenes más recientes en el sistema:</h4>
          {recentOrders.slice(0, 3).map((order, index) => (
            <div key={order.id} className="text-xs mt-1 border-t border-green-100 pt-1">
              <p><strong>#{index+1}:</strong> {safeText(order.id.substring(0, 8))}... | 
                 <strong>Email:</strong> {safeText(order.email || 'N/A')} | 
                 <strong>Fecha:</strong> {formatDate(order.date || order.time || order.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      <h4 className="font-medium mt-3 mb-2">
        {showAllOrders 
          ? `Últimas ${Math.min(3, orders.length)} órdenes:` 
          : `Órdenes relacionadas con tu cuenta (${relevantOrders.length}):`
        }
      </h4>
      
      {(showAllOrders ? orders : relevantOrders).slice(0, showAllOrders ? 3 : 5).map(order => (
        <div key={order.id} className="border-b border-gray-200 py-2">
          <p><strong>ID:</strong> {safeText(order.id)}</p>
          <p><strong>Usuario:</strong> {safeText(order.userId || order.uid || order.Usuario || 'N/A')}</p>
          <p><strong>Email:</strong> {safeText(order.email || order.userEmail || 'N/A')}</p>
          <p><strong>Estado:</strong> {safeText(order.status || 'N/A')}</p>
          <p><strong>Fecha:</strong> {formatDate(order.date || order.time || order.createdAt)}</p>
          <p className="text-xs text-gray-500 mt-1">Campos disponibles: {safeText(Object.keys(order).join(', '))}</p>
        </div>
      ))}
      
      {relevantOrders.length === 0 && !showAllOrders && (
        <div className="text-sm text-gray-600 italic">
          No se encontraron órdenes relacionadas con tu cuenta ({safeText(currentUser?.email)}).
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <p className="font-semibold">Posibles razones:</p>
            <ul className="list-disc pl-4 mt-1">
              <li>Las órdenes se guardaron con un email o ID diferente</li>
              <li>Las órdenes no se guardaron correctamente en la base de datos</li>
              <li>El campo que identifica al usuario en las órdenes tiene un nombre diferente</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersDebugViewer;