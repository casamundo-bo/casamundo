import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const OrderFixer = () => {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [fixedCount, setFixedCount] = useState(0);
  const [showButton, setShowButton] = useState(true);
  const [orderIssues, setOrderIssues] = useState([]);

  // Obtener el usuario actual
  const currentUser = JSON.parse(localStorage.getItem('users')) || null;

  const fixOrders = async () => {
    if (!currentUser?.uid || !currentUser?.email) {
      setMessage('No hay usuario autenticado');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Analizando órdenes...');

      // Buscar órdenes con el email del usuario
      const qEmail = query(
        collection(fireDB, 'orders'),
        where('email', '==', currentUser.email)
      );

      const emailSnapshot = await getDocs(qEmail);
      
      // También buscar por userEmail (campo alternativo)
      const qUserEmail = query(
        collection(fireDB, 'orders'),
        where('userEmail', '==', currentUser.email)
      );
      
      const userEmailSnapshot = await getDocs(qUserEmail);
      
      // Combinar resultados y eliminar duplicados
      const ordersMap = new Map();
      const issues = [];
      
      // Procesar órdenes con email
      emailSnapshot.forEach(doc => {
        const data = doc.data();
        const orderData = {
          id: doc.id,
          ...data
        };
        
        // Verificar problemas con los campos de ID
        const hasUid = !!data.uid;
        const hasUserId = !!data.userId;
        const hasUserid = !!data.userid;
        
        // Si no tiene ningún campo de ID o tiene un ID incorrecto
        if ((!hasUid && !hasUserId && !hasUserid) || 
            (hasUid && data.uid !== currentUser.uid) ||
            (hasUserId && data.userId !== currentUser.uid) ||
            (hasUserid && data.userid !== currentUser.uid)) {
          
          issues.push({
            id: doc.id,
            email: data.email,
            uid: data.uid || null,
            userId: data.userId || null,
            userid: data.userid || null,
            needsFix: true
          });
          
          ordersMap.set(doc.id, orderData);
        }
      });
      
      // Procesar órdenes con userEmail
      userEmailSnapshot.forEach(doc => {
        if (!ordersMap.has(doc.id)) {
          const data = doc.data();
          const orderData = {
            id: doc.id,
            ...data
          };
          
          // Verificar problemas con los campos de ID
          const hasUid = !!data.uid;
          const hasUserId = !!data.userId;
          const hasUserid = !!data.userid;
          
          // Si no tiene ningún campo de ID o tiene un ID incorrecto
          if ((!hasUid && !hasUserId && !hasUserid) || 
              (hasUid && data.uid !== currentUser.uid) ||
              (hasUserId && data.userId !== currentUser.uid) ||
              (hasUserid && data.userid !== currentUser.uid)) {
            
            issues.push({
              id: doc.id,
              email: data.userEmail || data.email,
              uid: data.uid || null,
              userId: data.userId || null,
              userid: data.userid || null,
              needsFix: true
            });
            
            ordersMap.set(doc.id, orderData);
          }
        }
      });
      
      setOrderIssues(issues);
      const ordersToFix = Array.from(ordersMap.values());

      if (ordersToFix.length === 0) {
        setStatus('complete');
        setMessage('No se encontraron órdenes que necesiten corrección');
        return;
      }

      setMessage(`Encontradas ${ordersToFix.length} órdenes para corregir...`);
      let fixed = 0;

      // Actualizar cada orden para añadir los campos correctos
      for (const order of ordersToFix) {
        try {
          const orderRef = doc(fireDB, 'orders', order.id);
          
          // Actualizar con todos los campos de ID para asegurar consistencia
          await updateDoc(orderRef, {
            uid: currentUser.uid,
            userId: currentUser.uid,
            userid: currentUser.uid,
            // También asegurarse de que estos campos estén presentes
            userEmail: currentUser.email,
            email: currentUser.email,
            userName: currentUser.name || currentUser.displayName || currentUser.email.split('@')[0]
          });
          
          fixed++;
          setFixedCount(fixed);
          setMessage(`Corrigiendo órdenes... (${fixed}/${ordersToFix.length})`);
        } catch (error) {
          console.error(`Error al corregir la orden ${order.id}:`, error);
        }
      }

      setMessage(`¡Listo! Se corrigieron ${fixed} órdenes. Recarga la página para ver los cambios.`);
      setStatus('complete');
      setShowButton(false);
    } catch (error) {
      console.error('Error al corregir órdenes:', error);
      setMessage(`Error: ${error.message}`);
      setStatus('error');
    }
  };

  if (!currentUser) return null;

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-orange-800">Reparador de Órdenes</h3>
      
      {status === 'idle' && showButton && (
        <>
          <p className="mb-2 text-sm">
            Este reparador vinculará todas las órdenes asociadas a tu email con tu ID de usuario actual.
            Esto asegura que todas tus órdenes aparezcan correctamente en tu panel.
          </p>
          <button
            onClick={fixOrders}
            className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
          >
            Reparar mis órdenes
          </button>
        </>
      )}
      
      {status === 'loading' && (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-700 mr-2"></div>
          <p className="text-sm">{message}</p>
        </div>
      )}
      
      {status === 'complete' && (
        <div>
          <p className="text-sm text-orange-800">{message}</p>
          {fixedCount > 0 && (
            <button
              onClick={() => window.location.reload()}
              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm"
            >
              Recargar página
            </button>
          )}
        </div>
      )}
      
      {status === 'error' && (
        <p className="text-sm text-red-600">{message}</p>
      )}
      
      {orderIssues.length > 0 && status === 'complete' && (
        <div className="mt-4 border-t border-orange-200 pt-2">
          <h4 className="text-sm font-semibold text-orange-800 mb-1">Detalles de las correcciones:</h4>
          <div className="max-h-40 overflow-y-auto text-xs">
            {orderIssues.map((issue, index) => (
              <div key={index} className="mb-1 pb-1 border-b border-orange-100">
                <div><strong>ID de orden:</strong> {issue.id.substring(0, 8)}...</div>
                <div><strong>Email:</strong> {issue.email}</div>
                <div>
                  <strong>Campos corregidos:</strong> 
                  {!issue.uid && !issue.userId && !issue.userid ? ' Todos los IDs faltaban' : 
                   `${issue.uid !== currentUser.uid ? ' uid,' : ''}${issue.userId !== currentUser.uid ? ' userId,' : ''}${issue.userid !== currentUser.uid ? ' userid' : ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderFixer;