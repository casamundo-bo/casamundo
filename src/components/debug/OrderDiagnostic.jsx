import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import { formatDate } from '../../utils/dateUtils';
import { sanitizeValue } from '../../utils/dataUtils';
import { safeText } from '../../utils/productUtils'; // Añadir esta importación

// First, let's create the utils file if it doesn't exist
import { normalizeOrderData, getConsistentOrderFields } from '../../utils/orderUtils';

const OrderDiagnostic = () => {
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [fixAttempted, setFixAttempted] = useState(false);
  const [fixResults, setFixResults] = useState(null);

  // Obtener el usuario actual
  const currentUser = JSON.parse(localStorage.getItem('users')) || null;

  const runDiagnostic = async () => {
    if (!currentUser?.uid || !currentUser?.email) {
      return;
    }

    setIsRunning(true);
    setDiagnosticResults(null);
    setFixResults(null);

    try {
      const results = {
        userInfo: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || 'N/A'
        },
        orderCounts: {
          total: 0,
          byUserId: 0,
          byUid: 0,
          byEmail: 0,
          byUserEmail: 0,
          inconsistent: 0
        },
        recentOrders: [],
        inconsistentOrders: [],
        possibleFixes: []
      };

      // 1. Obtener todas las órdenes
      const allOrdersQuery = query(
        collection(fireDB, 'orders'),
        orderBy('date', 'desc')
      );
      const allOrdersSnapshot = await getDocs(allOrdersQuery);
      results.orderCounts.total = allOrdersSnapshot.docs.length;

      // 2. Buscar órdenes por userId
      const userIdQuery = query(
        collection(fireDB, 'orders'),
        where('userId', '==', currentUser.uid)
      );
      const userIdSnapshot = await getDocs(userIdQuery);
      results.orderCounts.byUserId = userIdSnapshot.docs.length;

      // 3. Buscar órdenes por uid
      const uidQuery = query(
        collection(fireDB, 'orders'),
        where('uid', '==', currentUser.uid)
      );
      const uidSnapshot = await getDocs(uidQuery);
      results.orderCounts.byUid = uidSnapshot.docs.length;

      // 4. Buscar órdenes por email
      const emailQuery = query(
        collection(fireDB, 'orders'),
        where('email', '==', currentUser.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      results.orderCounts.byEmail = emailSnapshot.docs.length;

      // 5. Buscar órdenes por userEmail
      const userEmailQuery = query(
        collection(fireDB, 'orders'),
        where('userEmail', '==', currentUser.email)
      );
      const userEmailSnapshot = await getDocs(userEmailQuery);
      results.orderCounts.byUserEmail = userEmailSnapshot.docs.length;

      // Luego, en la función runDiagnostic, modifica la parte donde recopilas órdenes recientes:
      
      // 6. Recopilar órdenes recientes
      results.recentOrders = allOrdersSnapshot.docs
        .slice(0, 5)
        .map(doc => {
          const rawData = doc.data();
          // Add _fields property to track available fields
          const fields = Object.keys(rawData)
            .filter(key => !key.includes('//') && typeof rawData[key] !== 'function')
            .sort();
            
          return {
            ...rawData,
            id: doc.id,
            _fields: fields
          };
        });
      
      // Process inconsistent orders similarly
      const inconsistentOrders = emailSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return !data.userId || data.userId !== currentUser.uid;
        })
        .map(doc => {
          const rawData = doc.data();
          const fields = Object.keys(rawData)
            .filter(key => !key.includes('//') && typeof rawData[key] !== 'function')
            .sort();
            
          return {
            ...rawData,
            id: doc.id,
            _fields: fields
          };
        });

      results.inconsistentOrders = inconsistentOrders;
      results.orderCounts.inconsistent = inconsistentOrders.length;

      // 8. Sugerir posibles soluciones
      if (inconsistentOrders.length > 0) {
        results.possibleFixes.push({
          type: 'updateUserId',
          description: `Actualizar ${inconsistentOrders.length} órdenes con tu email para asignarles tu ID de usuario`,
          count: inconsistentOrders.length
        });
      }

      setDiagnosticResults(results);
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      setDiagnosticResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const applyFix = async (fixType) => {
    if (!currentUser?.uid || !diagnosticResults) return;

    setIsRunning(true);
    setFixResults(null);

    try {
      let results = {
        success: false,
        message: '',
        updatedCount: 0,
        details: []
      };

      if (fixType === 'updateUserId') {
        // Actualizar órdenes inconsistentes
        const ordersToUpdate = diagnosticResults.inconsistentOrders;
        let updatedCount = 0;

        for (const order of ordersToUpdate) {
          try {
            await updateDoc(doc(fireDB, 'orders', order.id), {
              userId: currentUser.uid,
              // También asegurar que estos campos estén presentes
              userEmail: currentUser.email,
              userName: currentUser.displayName || currentUser.email.split('@')[0]
            });

            updatedCount++;
            results.details.push({
              id: order.id,
              status: 'updated',
              message: 'ID de usuario actualizado correctamente'
            });
          } catch (updateError) {
            results.details.push({
              id: order.id,
              status: 'error',
              message: updateError.message
            });
          }
        }

        results.updatedCount = updatedCount;
        results.success = updatedCount > 0;
        results.message = updatedCount > 0
          ? `Se actualizaron ${updatedCount} órdenes correctamente`
          : 'No se pudo actualizar ninguna orden';
      }

      setFixResults(results);
      setFixAttempted(true);
    } catch (error) {
      console.error('Error al aplicar solución:', error);
      setFixResults({
        success: false,
        message: `Error: ${error.message}`,
        updatedCount: 0,
        details: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Ejecutar diagnóstico automáticamente al montar el componente
    if (currentUser?.uid) {
      runDiagnostic();
    }
  }, []);

  if (!currentUser) {
    return null;
  }

  // Fix the table rendering
  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">Diagnóstico de Órdenes</h3>
      
      {isRunning ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          <p>Analizando órdenes...</p>
        </div>
      ) : (
        <>
          {!diagnosticResults && (
            <button
              onClick={runDiagnostic}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Ejecutar diagnóstico
            </button>
          )}

          {diagnosticResults && !diagnosticResults.error && (
            <div className="mt-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-2">Información de usuario</h4>
                  <p className="text-sm"><strong>ID:</strong> {safeText(diagnosticResults.userInfo.uid)}</p>
                  <p className="text-sm"><strong>Email:</strong> {safeText(diagnosticResults.userInfo.email)}</p>
                </div>
                
                <div className="bg-white p-3 rounded shadow-sm">
                  <h4 className="font-medium text-gray-700 mb-2">Conteo de órdenes</h4>
                  <p className="text-sm"><strong>Total en sistema:</strong> {safeText(diagnosticResults.orderCounts.total)}</p>
                  <p className="text-sm"><strong>Por userId:</strong> {safeText(diagnosticResults.orderCounts.byUserId)}</p>
                  <p className="text-sm"><strong>Por uid:</strong> {safeText(diagnosticResults.orderCounts.byUid)}</p>
                  <p className="text-sm"><strong>Por email:</strong> {safeText(diagnosticResults.orderCounts.byEmail)}</p>
                  <p className="text-sm"><strong>Por userEmail:</strong> {safeText(diagnosticResults.orderCounts.byUserEmail)}</p>
                </div>
              </div>

              {diagnosticResults.inconsistentOrders.length > 0 && (
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 mb-4">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Órdenes inconsistentes detectadas: {safeText(diagnosticResults.inconsistentOrders.length)}
                  </h4>
                  <p className="text-sm text-yellow-700 mb-2">
                    Se encontraron órdenes con tu email pero sin tu ID de usuario correcto.
                  </p>
                  
                  {!fixAttempted && (
                    <button
                      onClick={() => applyFix('updateUserId')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm"
                      disabled={isRunning}
                    >
                      Corregir órdenes
                    </button>
                  )}
                  
                  {fixResults && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      fixResults.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      <p><strong>{safeText(fixResults.message)}</strong></p>
                      {fixResults.updatedCount > 0 && (
                        <p className="mt-1">Recarga la página para ver los cambios.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {diagnosticResults.recentOrders.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Órdenes recientes en el sistema</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="py-2 px-3 text-left">ID</th>
                          <th className="py-2 px-3 text-left">Email</th>
                          <th className="py-2 px-3 text-left">UserID</th>
                          <th className="py-2 px-3 text-left">Fecha</th>
                          <th className="py-2 px-3 text-left">Campos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnosticResults.recentOrders.map(order => (
                          <tr key={order.id} className="border-b">
                            <td className="py-2 px-3">{safeText(order.id.substring(0, 8))}...</td>
                            <td className="py-2 px-3">{safeText(order.email || order.userEmail || 'N/A')}</td>
                            <td className="py-2 px-3">{safeText(order.userId || order.uid || 'N/A')}</td>
                            <td className="py-2 px-3">{safeText(order.date || order.time || order.createdAt) || 'N/A'}</td>
                            <td className="py-2 px-3">
                              <span className="text-gray-500">
                                {safeText(Array.isArray(order._fields) ? 
                                  order._fields.join(', ') : 
                                  Object.keys(order).filter(k => !k.startsWith('_') && k !== 'id').join(', '))}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {diagnosticResults?.error && (
            <div className="bg-red-100 text-red-800 p-3 rounded mt-2">
              <p><strong>Error:</strong> {safeText(diagnosticResults.error)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OrderDiagnostic;