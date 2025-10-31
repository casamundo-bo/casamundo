import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import Loader from "../loader/Loader";
import { formatDate } from '../../utils/dateUtils';
import { collection, getDocs, query, where } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import { sanitizeValue } from "../../utils/dataUtils";
import { safeText } from '../../utils/productUtils';
import { Link } from 'react-router-dom'; // Asegúrate de importar Link

const UserOrderView = () => {
  const context = useContext(myContext);
  const { loading } = context;

  const [userOrders, setUserOrders] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [inconsistentOrders, setInconsistentOrders] = useState([]);

  const user = JSON.parse(localStorage.getItem('users'));

  const fetchOrders = async () => {
    if (!user || !user.email) return;
    try {
      setLocalLoading(true);
      const qUserId = query(collection(fireDB, "orders"), where("userId", "==", user.uid));
      const qUid = query(collection(fireDB, "orders"), where("uid", "==", user.uid));
      const qUserid = query(collection(fireDB, "orders"), where("userid", "==", user.uid));
      const qEmail = query(collection(fireDB, "orders"), where("email", "==", user.email));
      const qUserEmail = query(collection(fireDB, "orders"), where("userEmail", "==", user.email));

      const [snap1, snap2, snap3, snap4, snap5] = await Promise.all([
        getDocs(qUserId),
        getDocs(qUid),
        getDocs(qUserid),
        getDocs(qEmail),
        getDocs(qUserEmail)
      ]);

      const ordersMap = new Map();
      const inconsistentOrdersArray = [];

      const processSnapshot = (snapshot, source) => {
        snapshot.forEach((doc) => {
          if (!ordersMap.has(doc.id)) {
            const data = doc.data();
            const cleanData = {};
            Object.entries(data).forEach(([key, value]) => {
              if (typeof value === 'string' && value.includes('//')) {
                cleanData[key] = value.split('//')[0].trim();
              } else {
                cleanData[key] = value;
              }
            });
            const orderData = { ...cleanData, id: doc.id, _source: source };
            if (
              source.includes('email') &&
              orderData.userId !== user.uid &&
              orderData.uid !== user.uid &&
              (!orderData.userId && !orderData.uid)
            ) {
              inconsistentOrdersArray.push(orderData);
            }
            ordersMap.set(doc.id, orderData);
          }
        });
      };

      processSnapshot(snap1, 'userId');
      processSnapshot(snap2, 'uid');
      processSnapshot(snap3, 'userid');
      processSnapshot(snap4, 'email');
      processSnapshot(snap5, 'userEmail');

      setUserOrders(Array.from(ordersMap.values()));
      setInconsistentOrders(inconsistentOrdersArray);
    } catch (error) {
      console.error("Error getting user orders: ", error);
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.uid, user?.email]);

  if (localLoading) return <Loader />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-6">Mis Pedidos</h2>

      {inconsistentOrders.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
          <h3 className="text-yellow-800 font-medium mb-2">
            Atención: Órdenes encontradas con tu email
          </h3>
          <p className="text-sm text-yellow-700 mb-2">
            Se encontraron {inconsistentOrders.length} órdenes asociadas con tu email ({user.email}),
            pero están vinculadas a un ID de usuario diferente o no tienen ID.
          </p>
          <p className="text-sm text-yellow-700">
            <strong>Tu ID actual:</strong> {safeText(user.uid)}<br />
            <strong>ID en las órdenes:</strong> {safeText(
              inconsistentOrders[0]?.userId ||
              inconsistentOrders[0]?.uid ||
              "Sin ID de usuario"
            )}
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Estas órdenes se muestran a continuación junto con tus otras órdenes.
          </p>
        </div>
      )}

      {userOrders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No tienes pedidos realizados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 border-b text-left">ID</th>
                <th className="py-2 px-4 border-b text-left">Fecha</th>
                <th className="py-2 px-4 border-b text-left">Estado</th>
                <th className="py-2 px-4 border-b text-left">Total</th>
                <th className="py-2 px-4 border-b text-left">Email</th>
                <th className="py-2 px-4 border-b text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {userOrders.map((order) => (
                <tr key={order.id} className={`border-b hover:bg-gray-50 ${
                  order._source && order._source.includes('email') &&
                  order.userId !== user.uid && order.uid !== user.uid
                    ? 'bg-yellow-50' : ''
                }`}>
                  <td className="py-2 px-4 border-b">{safeText(order.id.substring(0, 8))}...</td>
                  <td className="py-2 px-4 border-b">{formatDate(order.date || order.time || order.createdAt)}</td>
                  <td className="py-2 px-4 border-b">
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
                  <td className="py-2 px-4 border-b">${safeText(order.cartTotal || order.totalAmount || 0)}</td>
                  <td className="py-2 px-4 border-b">{safeText(order.email || order.userEmail || '')}</td>
                  <td className="py-2 px-4 border-b">
                    {/* Reemplazar el botón por un Link que redirija a la página de detalles de la orden */}
                    <Link 
                      to={`/order/${order.id}`} 
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 inline-block"
                    >
                      Ver detalles
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserOrderView;
