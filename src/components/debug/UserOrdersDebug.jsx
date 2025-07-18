import { useContext, useEffect } from 'react';
import myContext from '../../context/myContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const UserOrdersDebug = () => {
  const context = useContext(myContext);
  const { getAllOrder } = context;
  
  // Obtener el usuario autenticado del localStorage
  const user = JSON.parse(localStorage.getItem('users')) || null;
  
  useEffect(() => {
    const checkUserOrders = async () => {
      if (!user?.uid) {
        console.log("UserOrdersDebug: No hay usuario autenticado");
        return;
      }
      
      try {
        console.log("=== USER ORDERS DEBUG ===");
        console.log("Usuario actual:", user.uid, user.email);
        console.log("Órdenes en context:", getAllOrder?.length || 0);
        
        // Verificar directamente en Firestore
        const q = query(
          collection(fireDB, 'orders'),
          where("userId", "==", user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log("Órdenes del usuario en Firestore (userId):", querySnapshot.docs.length);
        
        // Inicializar emailSnapshot como un array vacío por defecto
        let emailSnapshot = { docs: [] };
        
        // Verificar por email
        if (user.email) {
          const qEmail = query(
            collection(fireDB, 'orders'),
            where("email", "==", user.email)
          );
          
          emailSnapshot = await getDocs(qEmail);
          console.log("Órdenes del usuario en Firestore (email):", emailSnapshot.docs.length);
        }
        
        // Mostrar detalles de las órdenes encontradas
        if (querySnapshot.docs.length > 0 || emailSnapshot.docs.length > 0) {
          console.log("Detalles de las órdenes encontradas:");
          
          // Combinar resultados de ambas consultas
          const allDocs = [...querySnapshot.docs, ...emailSnapshot.docs];
          
          // Eliminar duplicados basados en ID
          const uniqueDocsMap = new Map();
          allDocs.forEach(doc => {
            if (!uniqueDocsMap.has(doc.id)) {
              uniqueDocsMap.set(doc.id, doc);
            }
          });
          
          // Convertir el Map de vuelta a un array
          const uniqueDocs = Array.from(uniqueDocsMap.values());
          
          uniqueDocs.forEach((doc, index) => {
            console.log(`Orden ${index + 1}:`, {
              id: doc.id,
              userId: doc.data().userId || 'N/A',
              email: doc.data().email || 'N/A',
              status: doc.data().status || 'N/A'
            });
          });
        } else {
          console.log("No se encontraron órdenes para este usuario");
        }
      } catch (error) {
        console.error("Error al verificar órdenes del usuario:", error);
      }
    };
    
    checkUserOrders();
  }, [getAllOrder, user]);
  
  return null; // Este componente no renderiza nada, solo hace debug
};

export default UserOrdersDebug;