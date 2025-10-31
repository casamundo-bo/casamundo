import { useContext, useEffect, useState, useRef } from 'react';
import myContext from '../../context/myContext';
import Loader from '../loader/Loader';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import toast from 'react-hot-toast';
// import OrderDebug from '../debug/OrderDebug';  // Comentar esta importación
import { formatDate } from '../../utils/dateUtils';
import { safeText } from '../../utils/productUtils';
import { Link } from 'react-router-dom';

const OrderDetail = () => {
    const context = useContext(myContext);
    const { mode, loading, getAllOrder, setLoading, getAllOrderFunction } = context;
    
    // State to store the calculated total amount
    const [totalSalesAmount, setTotalSalesAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [confirmingOrder, setConfirmingOrder] = useState(null);
    const [localLoading, setLocalLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
    
    // Add a timeout ref to handle stuck loading states
    const loadingTimeoutRef = useRef(null);
    const loadAttemptRef = useRef(0);
    
    // Obtener el usuario actual para verificar el rol
    const user = JSON.parse(localStorage.getItem('users'));
    const isAdmin = user?.role === 'admin';
    
    // Handle both possible structures of getAllOrder
    const orders = Array.isArray(getAllOrder) ? getAllOrder : [];
    
    // Función para normalizar los datos de las órdenes
    const normalizeOrderData = (orders) => {
        if (!Array.isArray(orders)) return [];
        
        return orders.map(order => {
            // Asegurarse de que tenemos un objeto
            if (!order) return null;
            
            // Crear una copia para no modificar el original
            const normalizedOrder = { ...order };
            
            // Normalizar fechas
            if (normalizedOrder.date) {
                // Ya está como fecha, no hacer nada
            } else if (normalizedOrder.time) {
                normalizedOrder.date = normalizedOrder.time;
            } else if (normalizedOrder.createdAt) {
                normalizedOrder.date = normalizedOrder.createdAt;
            } else if (normalizedOrder.timestamp) {
                normalizedOrder.date = normalizedOrder.timestamp;
            }
            
            // Normalizar estado
            if (!normalizedOrder.status) {
                normalizedOrder.status = 'pending';
            }
            
            return normalizedOrder;
        }).filter(Boolean); // Eliminar nulls
    };
    
    // Modificar el useEffect para cargar órdenes al montar el componente
    useEffect(() => {
        console.log("OrderDetail: Intentando cargar órdenes...", new Date().toISOString());
        
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }
        
        const loadOrders = async () => {
            setLocalLoading(true);
            setLoadError(null);
            loadAttemptRef.current += 1;
            
            if (typeof getAllOrderFunction === 'function') {
                console.log("OrderDetail: Llamando a getAllOrderFunction");
                try {
                    // Forzar actualización de órdenes
                    const ordersData = await getAllOrderFunction(true);
                    console.log("OrderDetail: Órdenes cargadas correctamente", ordersData?.length || 0);
                    setLastUpdateTime(new Date());
                    
                    // Verificar si hay órdenes
                    if (!ordersData || ordersData.length === 0) {
                        console.log("OrderDetail: No se encontraron órdenes");
                        // Intentar una vez más después de un breve retraso
                        if (loadAttemptRef.current < 3) {
                            loadingTimeoutRef.current = setTimeout(loadOrders, 2000);
                        } else {
                            setLoadError("No se pudieron cargar las órdenes después de varios intentos");
                        }
                    }
                } catch (error) {
                    console.error("OrderDetail: Error al cargar órdenes", error);
                    setLoadError(`Error al cargar órdenes: ${error.message}`);
                } finally {
                    setLocalLoading(false);
                }
            } else {
                console.error("OrderDetail: getAllOrderFunction no es una función");
                setLoadError("Error en la configuración. Por favor, recargue la página.");
                setLocalLoading(false);
            }
        };
        
        loadOrders();
        
        // Configurar un intervalo para actualizar las órdenes cada 30 segundos
        const intervalId = setInterval(() => {
            console.log("OrderDetail: Actualizando órdenes automáticamente...");
            if (typeof getAllOrderFunction === 'function') {
                getAllOrderFunction(true)
                    .then(() => {
                        setLastUpdateTime(new Date());
                        console.log("Órdenes actualizadas automáticamente");
                    })
                    .catch(console.error);
            }
        }, 30000);
        
        return () => {
            clearInterval(intervalId);
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [getAllOrderFunction]);
    
    // Actualizar filteredOrders cuando cambia getAllOrder
    useEffect(() => {
        if (Array.isArray(getAllOrder) && getAllOrder.length > 0) {
            console.log("OrderDetail: getAllOrder actualizado, actualizando filteredOrders");
            
            // Normalizar los datos de las órdenes
            const normalizedOrders = normalizeOrderData(getAllOrder);
            
            // Aplicar filtro de búsqueda si existe
            if (searchTerm) {
                const filtered = normalizedOrders.filter(order => 
                    (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (order.name && order.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (order.email && order.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (order.userEmail && order.userEmail.toLowerCase().includes(searchTerm.toLowerCase()))
                );
                setFilteredOrders(filtered);
            } else {
                setFilteredOrders(normalizedOrders);
            }
            
            // Calcular el monto total de ventas
            try {
                const total = getAllOrder.reduce((acc, order) => {
                    if (Array.isArray(order.cartItems) && order.cartItems.length > 0) {
                        const orderTotal = order.cartItems.reduce((sum, item) => {
                            return sum + (Number(item.price || 0) * Number(item.quantity || 1));
                        }, 0);
                        return acc + orderTotal;
                    }
                    return acc;
                }, 0);
                
                setTotalSalesAmount(total);
            } catch (error) {
                console.error("Error calculating total sales:", error);
                setTotalSalesAmount(0);
            }
        } else {
            setFilteredOrders([]);
            setTotalSalesAmount(0);
        }
    }, [getAllOrder, searchTerm]);
    
    // Función para actualizar el estado de una orden
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            setLocalLoading(true);
            
            // Siempre usar la colección 'orders' (plural)
            const orderRef = doc(fireDB, 'orders', orderId);
            const orderDoc = await getDoc(orderRef);
            
            if (!orderDoc.exists()) {
                toast.error("Orden no encontrada");
                setLocalLoading(false);
                return;
            }
            
            // Guardar el estado en el formato que espera la aplicación
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            
            console.log(`Estado de la orden ${orderId} actualizado a: ${newStatus}`);
            
            // Refresh orders
            if (typeof getAllOrderFunction === 'function') {
                await getAllOrderFunction(true);
                setLastUpdateTime(new Date());
            }
            
            toast.success(`Estado de la orden actualizado a: ${newStatus}`);
            setConfirmingOrder(null);
        } catch (error) {
            console.error("Error al actualizar estado de la orden:", error);
            toast.error("Error al actualizar estado de la orden");
        } finally {
            setLocalLoading(false);
        }
    };
    
    // Función para forzar la actualización de órdenes
    const forceRefreshOrders = async () => {
        setLocalLoading(true);
        setLoadError(null);
        try {
            console.log("Forzando actualización de órdenes desde OrderDetail...");
            if (typeof getAllOrderFunction === 'function') {
                await getAllOrderFunction(true);
                setLastUpdateTime(new Date());
                toast.success("Órdenes actualizadas correctamente");
            } else {
                throw new Error("La función de actualización no está disponible");
            }
        } catch (error) {
            console.error("Error al actualizar órdenes:", error);
            toast.error("Error al actualizar órdenes: " + error.message);
            setLoadError("Error al actualizar órdenes: " + error.message);
        } finally {
            setLocalLoading(false);
        }
    };

    // En la sección de renderizado, añadir un botón de actualización
    return (
        <div className="container mx-auto px-4 py-8">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-semibold">Gestión de Pedidos</h2>
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-3">
                                Última actualización: {formatDate(lastUpdateTime)}
                            </span>
                            <button 
                                onClick={forceRefreshOrders}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
                                disabled={localLoading}
                            >
                                {localLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Actualizando...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Actualizar Órdenes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="mb-6">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o ID..."
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Debug component - comment out this line to fix the error */}
                    {/* {process.env.NODE_ENV !== 'production' && <OrderDebug />} */}
                    
                    {/* Error message */}
                    {loadError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            <p>{loadError}</p>
                            <button 
                                className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                onClick={forceRefreshOrders}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}
                    
                    {/* Loading indicator */}
                    {(loading || localLoading) && (
                        <div className="flex justify-center items-center h-64">
                            <Loader />
                        </div>
                    )}
                    
                    {/* Orders table */}
                    {!loading && !localLoading && !loadError && (
                        <>
                            {/* Total Sales */}
                            <div className="bg-green-50 p-4 rounded-lg shadow mb-6">
                                <h3 className="text-lg font-semibold text-green-800">Total de Ventas</h3>
                                <p className="text-2xl font-bold text-green-600">${totalSalesAmount.toFixed(2)}</p>
                            </div>
                            
                            {/* Orders count */}
                            <div className="mb-4">
                                <p className="text-gray-600">
                                    Mostrando {filteredOrders.length} de {getAllOrder?.length || 0} pedidos
                                </p>
                            </div>
                            
                            {filteredOrders.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">No se encontraron pedidos</p>
                                    <button 
                                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                        onClick={forceRefreshOrders}
                                    >
                                        Recargar Pedidos
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full bg-white border border-gray-200">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="py-2 px-4 border-b text-left">ID</th>
                                                <th className="py-2 px-4 border-b text-left">Cliente</th>
                                                <th className="py-2 px-4 border-b text-left">Contacto</th>
                                                <th className="py-2 px-4 border-b text-left">Fecha</th>
                                                <th className="py-2 px-4 border-b text-left">Estado</th>
                                                <th className="py-2 px-4 border-b text-left">Productos</th>
                                                <th className="py-2 px-4 border-b text-left">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredOrders.map((order) => {
                                                // Normalizar los campos para manejar diferentes estructuras
                                                const orderStatus = order.status === 'pending' ? 'Pendiente' : 
                                                    safeText(order.status || order.orderStatus || 'Pendiente');
                                                
                                                // Usar formatDate directamente
                                                const orderDate = formatDate(order.date || order.time || order.createdAt);
                                                
                                                const orderTotal = safeText(order.cartTotal || order.totalAmount || 0);
                                                
                                                return (
                                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                                        <td className="py-2 px-4">{order.id.substring(0, 8)}...</td>
                                                        <td className="py-2 px-4">
                                                            {safeText(order.name || order.userName || 'N/A')}
                                                            {order.createdBy === 'admin' && (
                                                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                    Creado por admin
                                                                </span>
                                                            )}
                                                            {order.userId && (
                                                                <p className="text-xs text-gray-500">ID Usuario: {order.userId.substring(0, 8)}...</p>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <p>{safeText(order.email || 'N/A')}</p>
                                                            <p>{safeText(order.phoneNumber || 'N/A')}</p>
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            {orderDate}
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <span className={`px-2 py-1 rounded text-xs ${
                                                                orderStatus === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                                                orderStatus === 'Preparando' ? 'bg-blue-100 text-blue-800' :
                                                                orderStatus === 'Entregado' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {orderStatus}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            {Array.isArray(order.cartItems) ? (
                                                                <div>
                                                                    <p>{order.cartItems.length} productos</p>
                                                                    <button 
                                                                        className="text-blue-500 hover:underline text-sm"
                                                                        onClick={() => {
                                                                            console.log("Detalles de la orden:", order);
                                                                            // Aquí podrías mostrar un modal con los detalles
                                                                        }}
                                                                    >
                                                                        Ver detalles
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-red-500">Sin productos</p>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-4">
                                                            <div className="flex flex-col space-y-2">
                                                                {/* Link para ver detalles */}
                                                                <Link
                                                                    to={`/admin/order/${order.id}`}
                                                                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 text-center"
                                                                >
                                                                    Ver detalles
                                                                </Link>
                                                                
                                                                {/* Botones para cambiar estado */}
                                                                {confirmingOrder === order.id ? (
                                                                    <div className="flex flex-col space-y-2">
                                                                        <button 
                                                                            onClick={() => updateOrderStatus(order.id, 'Pendiente')}
                                                                            className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                                                                        >
                                                                            Pendiente
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => updateOrderStatus(order.id, 'Preparando')}
                                                                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                                                        >
                                                                            Preparando
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => updateOrderStatus(order.id, 'Entregado')}
                                                                            className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                                                                        >
                                                                            Entregado
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setConfirmingOrder(null)}
                                                                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <button 
                                                                        onClick={() => setConfirmingOrder(order.id)}
                                                                        className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                                                                    >
                                                                        Cambiar Estado
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
                </div>           );
};

export default OrderDetail;
