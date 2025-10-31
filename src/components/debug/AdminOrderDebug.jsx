import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const AdminOrderDebug = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                console.log("=== ADMIN ORDER DEBUG ===");
                
                // Consultar todas las órdenes
                const ordersQuery = query(
                    collection(fireDB, 'orders'),
                    orderBy('time', 'desc')
                );
                
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersData = ordersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log("Total orders in Firestore:", ordersData.length);
                
                // Filtrar órdenes creadas por admin
                const adminOrders = ordersData.filter(order => 
                    order.createdBy === 'admin' || 
                    order.adminInfo?.id
                );
                
                console.log("Admin-created orders:", adminOrders.length);
                
                if (adminOrders.length > 0) {
                    console.log("First admin order:", {
                        id: adminOrders[0].id,
                        userId: adminOrders[0].userId || adminOrders[0].uid,
                        userName: adminOrders[0].userName,
                        email: adminOrders[0].email || adminOrders[0].userEmail,
                        status: adminOrders[0].status || adminOrders[0].orderStatus
                    });
                }
                
                // Verificar estructura de las órdenes
                const orderStructures = ordersData.slice(0, 3).map(order => ({
                    id: order.id,
                    fields: Object.keys(order)
                }));
                
                console.log("Order structures sample:", orderStructures);
                
                setOrders(ordersData);
                console.log("=== END ADMIN ORDER DEBUG ===");
            } catch (error) {
                console.error("Error fetching orders:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchOrders();
    }, []);
    
    return (
        <div className="bg-gray-100 p-4 rounded-lg mb-4 text-xs">
            <h3 className="font-bold mb-2">Admin Order Debug</h3>
            {loading ? (
                <p>Loading orders data...</p>
            ) : error ? (
                <p className="text-red-500">Error: {error}</p>
            ) : (
                <div>
                    <p>Total orders: {orders.length}</p>
                    <p>Admin orders: {orders.filter(o => o.createdBy === 'admin').length}</p>
                    <details>
                        <summary className="cursor-pointer text-blue-500">Order IDs</summary>
                        <ul className="ml-4 mt-2">
                            {orders.slice(0, 10).map(order => (
                                <li key={order.id} className="mb-1">
                                    {order.id} - User: {order.userId || order.uid || 'N/A'} - 
                                    Created by: {order.createdBy || 'N/A'}
                                </li>
                            ))}
                            {orders.length > 10 && <li>... and {orders.length - 10} more</li>}
                        </ul>
                    </details>
                </div>
            )}
        </div>
    );
};

export default AdminOrderDebug;