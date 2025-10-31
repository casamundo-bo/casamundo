import { useContext, useEffect, useMemo } from "react";
import Layout from "../../components/layout/Layout";
import myContext from "../../context/myContext";
import Loader from "../../components/loader/Loader";
import { Link } from "react-router-dom";
import { formatDate } from '../../utils/dateUtils';
import { safeText } from '../../utils/productUtils';
import UserOrdersDebug from "../../components/debug/UserOrdersDebug";  // Comentar esta importación
import UserOrdersDetailDebug from "../../components/debug/UserOrdersDetailDebug";  // Comentar esta importación

const UserDashboard = () => {
  const {
    getAllOrder,
    loading,
    getAllOrderFunction
  } = useContext(myContext);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('users')) || null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const loadOrders = async () => {
      if (getAllOrder?.length === 0 && typeof getAllOrderFunction === 'function') {
        console.log("UserDashboard: Cargando órdenes...");
        await getAllOrderFunction();
      }
    };
    loadOrders();
  }, [getAllOrder, getAllOrderFunction]);

  const filteredOrders = useMemo(() => {
    if (!user?.uid || !Array.isArray(getAllOrder)) {
      console.log("No se puede filtrar: usuario no autenticado o no hay órdenes");
      return [];
    }

    return getAllOrder.filter(order => {
      const matchesUserId = 
        (order.userId && order.userId === user.uid) || 
        (order.uid && order.uid === user.uid);
      const matchesEmail = 
        (order.email && order.email === user.email) || 
        (order.userEmail && order.userEmail === user.email);
      return matchesUserId || matchesEmail;
    });
  }, [getAllOrder, user]);

  return (
    <Layout>
      {/* Componentes de depuración comentados
      <UserOrdersDebug />
      <UserOrdersDetailDebug />
      */}
      
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Mi Cuenta</h2>
        
        {/* Sección de accesos rápidos - Simplificada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/user-orders" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Mis Pedidos</h3>
                <p className="text-gray-600 text-sm">Ver historial de compras</p>
              </div>
            </div>
          </Link>
          
          <Link to="/user-debts" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center">
              <div className="bg-pink-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Mis Deudas</h3>
                <p className="text-gray-600 text-sm">Gestionar deudas pendientes</p>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Información básica del usuario */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-xl font-semibold mb-4">Información de la cuenta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Nombre:</p>
              <p className="font-medium">{safeText(user?.name || user?.displayName || 'Usuario')}</p>
            </div>
            <div>
              <p className="text-gray-600">Email:</p>
              <p className="font-medium">{safeText(user?.email || 'No disponible')}</p>
            </div>
          </div>
        </div>
        
        {/* Resumen de pedidos recientes */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Pedidos Recientes</h3>
            <Link to="/user-orders" className="text-blue-500 hover:underline">Ver todos</Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : filteredOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">{safeText(order.id.substring(0, 8))}...</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(order.time || order.date || order.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs ${
                          order.status === 'Pendiente' || order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'Enviado' || order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Entregado' || order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {safeText(order.status === 'pending' ? 'Pendiente' : 
                           order.status === 'shipped' ? 'Enviado' : 
                           order.status === 'delivered' ? 'Entregado' : 
                           order.status || 'Pendiente')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {/* Modificar esta línea para usar la ruta correcta */}
                        <Link to={`/order/${order.id}`} className="text-blue-500 hover:underline">
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No tienes pedidos realizados con esta cuenta.</p>
              <Link to="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                Ir a comprar
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserDashboard;