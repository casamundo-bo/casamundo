import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const UserOrdersEmailCheck = () => {
  const [emailOrders, setEmailOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Obtener usuario de localStorage con manejo de errores
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('users')) || null;
    } catch (err) {
      console.error("Error parsing localStorage 'users':", err);
      return null;
    }
  }, []);
  
  useEffect(() => {
    const checkEmailOrders = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Consultar órdenes directamente por email
        const q = query(
          collection(fireDB, 'orders'),
          where("email", "==", user.email)
        );
        
        const querySnapshot = await getDocs(q);
        const orders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setEmailOrders(orders);
        
        console.log(`UserOrdersEmailCheck: Encontradas ${orders.length} órdenes con email ${user.email}`);
        if (orders.length > 0) {
          console.log("Detalles de la primera orden:", {
            id: orders[0].id,
            userId: orders[0].userId || orders[0].uid || 'N/A',
            email: orders[0].email,
            status: orders[0].status
          });
        }
      } catch (error) {
        console.error("Error al verificar órdenes por email:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkEmailOrders();
  }, [user]);
  
  if (loading || emailOrders.length === 0) return null;
  
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-red-800 mb-2">
        ⚠️ Atención: Órdenes encontradas con tu email
      </h3>
      <p className="mb-2">
        Se encontraron <strong>{emailOrders.length}</strong> órdenes asociadas con tu email ({user.email}), 
        pero no se muestran en tu panel porque están vinculadas a un ID de usuario diferente.
      </p>
      <p className="text-sm text-red-700">
        Tu ID actual: <code className="bg-red-100 px-1 rounded">{user.uid}</code><br/>
        ID en las órdenes: <code className="bg-red-100 px-1 rounded">
          {emailOrders[0]?.userId || emailOrders[0]?.uid || 'Desconocido'}
        </code>
      </p>
    </div>
  );
};

export default UserOrdersEmailCheck;