import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import Layout from '../../components/layout/Layout';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/loader/Loader';
import myContext from '../../context/myContext';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/dateUtils';
import { safeText } from '../../utils/productUtils';
// Importar utilidades para deudas
import { DEBT_STATUS, createDebtTransaction } from '../../utils/debtUtils';

const OrderDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const context = useContext(myContext);
    const { getAllOrderFunction } = context;
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);
    const [editedPrice, setEditedPrice] = useState("");
    const [savingPrice, setSavingPrice] = useState(false);
    
    // Obtener el usuario actual para verificar el rol
    const user = JSON.parse(localStorage.getItem('users'));
    const isAdmin = user?.role === 'admin';
    
    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const orderRef = doc(fireDB, 'orders', id);
                const orderDoc = await getDoc(orderRef);
                
                if (!orderDoc.exists()) {
                    setError('La orden no existe');
                    setLoading(false);
                    return;
                }
                
                const orderData = {
                    id: orderDoc.id,
                    ...orderDoc.data()
                };
                
                setOrder(orderData);
            } catch (error) {
                console.error('Error al obtener detalles de la orden:', error);
                setError(`Error al cargar los detalles: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);
    
    const updateOrderStatus = async (newStatus) => {
        try {
            setUpdatingStatus(true);
            
            const orderRef = doc(fireDB, 'orders', id);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            
            // Actualizar el estado local
            setOrder(prev => ({
                ...prev,
                status: newStatus,
                updatedAt: Timestamp.now()
            }));
            
            // Actualizar la lista de órdenes en el contexto
            if (typeof getAllOrderFunction === 'function') {
                await getAllOrderFunction(true);
            }
            
            toast.success(`Estado actualizado a: ${newStatus}`);
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            toast.error(`Error al actualizar estado: ${error.message}`);
        } finally {
            setUpdatingStatus(false);
        }
    };
    
    // Función para renderizar el estado con el color adecuado
    const renderStatus = (status) => {
        const statusText = status === 'pending' ? 'Pendiente' :
                          status === 'shipped' ? 'Enviado' :
                          status === 'delivered' ? 'Entregado' :
                          status || 'Pendiente';
        
        const statusClass = status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                           status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                           status === 'delivered' ? 'bg-green-100 text-green-800' :
                           'bg-gray-100 text-gray-800';
        
        return (
            <span className={`px-3 py-1 rounded-full text-sm ${statusClass}`}>
                {statusText}
            </span>
        );
    };
    
    // New function to handle price editing
    const handlePriceEdit = (itemId, currentPrice) => {
        setEditingItemId(itemId);
        setEditedPrice(currentPrice.toString());
    };

    // New function to save edited price
    const saveEditedPrice = async (itemId) => {
        // Validate price
        const newPrice = parseFloat(editedPrice);
        if (isNaN(newPrice) || newPrice < 0) {
            toast.error("Por favor ingrese un precio válido");
            return;

        }
    
        try {
            setSavingPrice(true);
            
            // Obtener el item original
            const oldItem = order.cartItems.find(item => item.id === itemId);
            if (!oldItem) {
                toast.error("Producto no encontrado en la orden");
                return;
            }
            
            const oldItemPrice = parseFloat(oldItem.price) || 0;
            const oldItemQuantity = parseInt(oldItem.quantity) || 0;
            const oldItemTotal = oldItemPrice * oldItemQuantity;
            const newItemTotal = newPrice * oldItemQuantity;
            const priceDifference = newItemTotal - oldItemTotal;
            
            console.log("Cambio de precio:", {
                itemId,
                oldPrice: oldItemPrice,
                newPrice,
                quantity: oldItemQuantity,
                oldTotal: oldItemTotal,
                newTotal: newItemTotal,
                difference: priceDifference
            });
            
            // Create a copy of the order with updated price and subtotal
            const updatedCartItems = order.cartItems.map(item => {
                if (item.id === itemId) {
                    // Actualizar tanto el precio como el subtotal del item
                    return { 
                        ...item, 
                        price: newPrice,
                        subtotal: newPrice * item.quantity // Añadir/actualizar el subtotal
                    };
                }
                return item;
            });
            
            // Calculate new total
            const newTotal = updatedCartItems.reduce(
                (sum, item) => sum + (item.price * item.quantity), 
                0
            );
            
            // Actualizar también el cartTotal y totalAmount para asegurar consistencia
            const orderRef = doc(fireDB, 'orders', id);
            await updateDoc(orderRef, {
                cartItems: updatedCartItems,
                cartTotal: newTotal,
                totalAmount: newTotal, // Asegurar que totalAmount también se actualice
                subtotal: newTotal,    // Actualizar subtotal si existe
                updatedAt: Timestamp.now(),
                lastUpdated: Timestamp.now() // Asegurar que lastUpdated también se actualice
            });
            
            console.log("Orden actualizada con nuevo total:", newTotal);
            
            // Si el pedido tiene una deuda asociada, actualizar también la deuda
            if (order.debtId) {
                const debtRef = doc(fireDB, "debts", order.debtId);
                const debtDoc = await getDoc(debtRef);
                
                if (debtDoc.exists()) {
                    const debtData = debtDoc.data();
                    
                    // Actualizar montos de la deuda
                    const debtAmount = parseFloat(debtData.amount) || 0;
                    const debtRemainingAmount = parseFloat(debtData.remainingAmount) || 0;
                    
                    const newDebtAmount = debtAmount + priceDifference;
                    const newRemainingAmount = debtRemainingAmount + priceDifference;
                    
                    console.log("Actualizando deuda:", {
                        debtId: order.debtId,
                        oldAmount: debtAmount,
                        newAmount: newDebtAmount,
                        oldRemaining: debtRemainingAmount,
                        newRemaining: newRemainingAmount
                    });
                    
                    // Crear transacción para el cambio de precio
                    const priceChangeTransaction = createDebtTransaction({
                        type: priceDifference >= 0 ? 'addition' : 'payment',
                        amount: Math.abs(priceDifference),
                        orderId: id,
                        note: `Ajuste de precio en producto "${oldItem.title}": ${priceDifference >= 0 ? 'Incremento' : 'Reducción'} de Bs. ${Math.abs(priceDifference).toFixed(2)}`,
                        paymentMethod: 'ajuste_administrativo',
                        debtUserId: debtData.userId,
                        debtUserName: debtData.userName || 'Usuario sin nombre',
                        debtUserEmail: debtData.userEmail || ''
                    });
                    
                    // Actualizar también los detalles del pedido en la deuda
                    let updatedOrderDetails = debtData.orderDetails || [];
                    
                    // Si ya existe un detalle para este pedido, actualizarlo
                    const orderDetailIndex = updatedOrderDetails.findIndex(detail => detail.orderId === id);
                    if (orderDetailIndex >= 0) {
                        updatedOrderDetails[orderDetailIndex] = {
                            ...updatedOrderDetails[orderDetailIndex],
                            amount: newTotal,
                            items: updatedCartItems,
                            updatedAt: Timestamp.now()
                        };
                    }
                    
                    // Actualizar la deuda
                    await updateDoc(debtRef, {
                        amount: newDebtAmount > 0 ? newDebtAmount : 0,
                        remainingAmount: newRemainingAmount > 0 ? newRemainingAmount : 0,
                        transactions: [...(debtData.transactions || []), priceChangeTransaction],
                        orderDetails: updatedOrderDetails,
                        lastUpdated: Timestamp.now(),
                        status: newRemainingAmount <= 0 ? DEBT_STATUS.PAID : 
                               (newRemainingAmount < newDebtAmount ? DEBT_STATUS.PARTIAL : DEBT_STATUS.PENDING)
                    });
                    
                    console.log("Deuda actualizada correctamente");
                } else {
                    console.warn(`La deuda asociada (${order.debtId}) no existe`);
                }
            }
            
            // Update local state
            setOrder({
                ...order,
                cartItems: updatedCartItems,
                cartTotal: newTotal,
                totalAmount: newTotal,
                subtotal: newTotal,
                updatedAt: Timestamp.now(),
                lastUpdated: Timestamp.now()
            });
            
            toast.success("Precio actualizado correctamente");
            
            // Reset editing state
            setEditingItemId(null);
            setEditedPrice("");
            
            // Refresh orders list in context
            if (typeof getAllOrderFunction === 'function') {
                await getAllOrderFunction(true);
            }
            
            // Actualizar también la lista de deudas si existe la función
            if (context.getAllDebtsFunction && typeof context.getAllDebtsFunction === 'function') {
                await context.getAllDebtsFunction(true);
            } else {
                console.warn("No se encontró la función getAllDebtsFunction en el contexto");
                // Intentar forzar una actualización de las deudas
                try {
                    const debtsQuery = query(collection(fireDB, "debts"));
                    const debtsSnapshot = await getDocs(debtsQuery);
                    console.log(`Forzando actualización: Se encontraron ${debtsSnapshot.docs.length} deudas`);
                } catch (error) {
                    console.error("Error al forzar actualización de deudas:", error);
                }
            }
        } catch (error) {
            console.error("Error al actualizar precio:", error);
            toast.error(`Error al actualizar precio: ${error.message}`);
        } finally {
            setSavingPrice(false);
        }
    };

    // Agregar estados para edición de precio
    const [isEditingPrice, setIsEditingPrice] = useState(false);
    const [newPrice, setNewPrice] = useState("");
    const [editNote, setEditNote] = useState("");
    // Remove this duplicate declaration:
    // const [savingPrice, setSavingPrice] = useState(false);
    
    // Función para actualizar el precio del pedido y la deuda asociada
    const handlePriceUpdate = async (e) => {
        e.preventDefault();
        
        if (savingPrice) {
            toast.error("Ya hay una operación en curso, por favor espera");
            return;
        }
        
        const updatedPrice = parseFloat(newPrice);
        if (isNaN(updatedPrice) || updatedPrice < 0) {
            toast.error("Por favor ingrese un precio válido");
            return;
        }
        
        try {
            setSavingPrice(true);
            
            // Obtener el precio actual
            const currentPrice = parseFloat(order.totalAmount) || 0;
            const priceDifference = updatedPrice - currentPrice;
            
            // Actualizar el pedido con el nuevo precio
            const orderRef = doc(fireDB, 'orders', id);
            await updateDoc(orderRef, {
                totalAmount: updatedPrice,
                adminNote: order.adminNote 
                    ? `${order.adminNote}\n[${new Date().toLocaleString()}] Precio editado de Bs. ${currentPrice.toFixed(2)} a Bs. ${updatedPrice.toFixed(2)}. Nota: ${editNote}`
                    : `[${new Date().toLocaleString()}] Precio editado de Bs. ${currentPrice.toFixed(2)} a Bs. ${updatedPrice.toFixed(2)}. Nota: ${editNote}`,
                lastUpdated: Timestamp.now()
            });
            
            // Si el pedido tiene una deuda asociada, actualizarla también
            if (order.debtId) {
                const debtRef = doc(fireDB, "debts", order.debtId);
                const debtDoc = await getDoc(debtRef);
                
                if (debtDoc.exists()) {
                    const debtData = debtDoc.data();
                    
                    // Calcular los nuevos montos de la deuda
                    const debtAmount = parseFloat(debtData.amount) || 0;
                    const debtRemainingAmount = parseFloat(debtData.remainingAmount) || 0;
                    
                    // Ajustar el monto total y el monto restante de la deuda
                    const newDebtAmount = debtAmount + priceDifference;
                    const newRemainingAmount = debtRemainingAmount + priceDifference;
                    
                    // Crear una transacción para registrar el cambio de precio
                    const priceChangeTransaction = createDebtTransaction({
                        type: priceDifference >= 0 ? 'addition' : 'payment',
                        amount: Math.abs(priceDifference),
                        orderId: id,
                        note: `Ajuste de precio en pedido #${id}: ${priceDifference >= 0 ? 'Incremento' : 'Reducción'} de Bs. ${Math.abs(priceDifference).toFixed(2)}. Nota: ${editNote}`,
                        paymentMethod: 'ajuste_administrativo',
                        debtUserId: debtData.userId,
                        debtUserName: debtData.userName || 'Usuario sin nombre',
                        debtUserEmail: debtData.userEmail || ''
                    });
                    
                    // Obtener el historial de transacciones existente
                    const transactions = debtData.transactions || [];
                    
                    // Añadir la nueva transacción al historial
                    transactions.push(priceChangeTransaction);
                    
                    // Actualizar el documento de deuda
                    await updateDoc(debtRef, {
                        amount: newDebtAmount > 0 ? newDebtAmount : 0,
                        remainingAmount: newRemainingAmount > 0 ? newRemainingAmount : 0,
                        transactions: transactions,
                        lastUpdated: Timestamp.now(),
                        status: newRemainingAmount <= 0 ? DEBT_STATUS.PAID : 
                               (newRemainingAmount < newDebtAmount ? DEBT_STATUS.PARTIAL : DEBT_STATUS.PENDING)
                    });
                    
                    console.log(`Deuda actualizada: Monto ${debtAmount} -> ${newDebtAmount}, Restante ${debtRemainingAmount} -> ${newRemainingAmount}`);
                } else {
                    console.warn(`La deuda asociada (${order.debtId}) no existe`);
                }
            }
            
            // Actualizar el estado local
            setOrder({
                ...order,
                totalAmount: updatedPrice,
                adminNote: order.adminNote 
                    ? `${order.adminNote}\n[${new Date().toLocaleString()}] Precio editado de Bs. ${currentPrice.toFixed(2)} a Bs. ${updatedPrice.toFixed(2)}. Nota: ${editNote}`
                    : `[${new Date().toLocaleString()}] Precio editado de Bs. ${currentPrice.toFixed(2)} a Bs. ${updatedPrice.toFixed(2)}. Nota: ${editNote}`,
                lastUpdated: Timestamp.now()
            });
            
            // Actualizar la lista global de pedidos
            if (typeof getAllOrderFunction === 'function') {
                await getAllOrderFunction(true);
            }
            
            toast.success("Precio actualizado correctamente");
            setIsEditingPrice(false);
            setNewPrice("");
            setEditNote("");
            
        } catch (error) {
            console.error("Error al actualizar precio:", error);
            toast.error(`Error al actualizar precio: ${error.message}`);
        } finally {
            setSavingPrice(false);
        }
    };
    
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <div className="md:w-1/4">
                        <AdminSidebar />
                    </div>
                    
                    {/* Main Content */}
                    <div className="md:w-3/4">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold">Detalles de la Orden</h1>
                            <button 
                                onClick={() => navigate('/admin-dashboard')}
                                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                            >
                                Volver
                            </button>
                        </div>
                        
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader />
                            </div>
                        ) : error ? (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                <p>{error}</p>
                                <button 
                                    className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                    onClick={() => navigate('/admin-dashboard')}
                                >
                                    Volver al Dashboard
                                </button>
                            </div>
                        ) : order ? (
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                {/* Información básica */}
                                <div className="p-6 border-b">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-2">Orden #{order.id.substring(0, 8)}...</h2>
                                            <p className="text-gray-600">
                                                Fecha: {formatDate(order.date || order.time || order.createdAt)}
                                            </p>
                                        </div>
                                        <div>
                                            {renderStatus(order.status)}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Información del cliente */}
                                <div className="p-6 border-b">
                                    <h3 className="text-lg font-semibold mb-3">Información del Cliente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p><span className="font-medium">Nombre:</span> {safeText(order.name || order.userName || 'N/A')}</p>
                                            <p><span className="font-medium">Email:</span> {safeText(order.email || order.userEmail || 'N/A')}</p>
                                            <p><span className="font-medium">Teléfono:</span> {safeText(order.phoneNumber || 'N/A')}</p>
                                        </div>
                                        <div>
                                            <p><span className="font-medium">ID de Usuario:</span> {safeText(order.userId || 'N/A')}</p>
                                            {order.createdBy === 'admin' && (
                                                <p><span className="font-medium">Creado por:</span> Administrador</p>
                                            )}
                                            {order.shippingAddress && (
                                                <p><span className="font-medium">Dirección:</span> {safeText(order.shippingAddress)}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Productos */}
                                <div className="p-6 border-b">
                                    <h3 className="text-lg font-semibold mb-3">Productos</h3>
                                    {Array.isArray(order.cartItems) && order.cartItems.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {order.cartItems.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    {item.imageUrl && (
                                                                        <div className="flex-shrink-0 h-10 w-10 mr-4">
                                                                            <img 
                                                                                className="h-10 w-10 rounded-full object-cover" 
                                                                                src={item.imageUrl} 
                                                                                alt={item.title} 
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">
                                                                            {safeText(item.title)}
                                                                        </div>
                                                                        {item.category && (
                                                                            <div className="text-sm text-gray-500">
                                                                                {safeText(item.category)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            
                                                            {/* Price cell with edit functionality */}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {editingItemId === item.id ? (
                                                                    <div className="flex items-center">
                                                                        <input
                                                                            type="number"
                                                                            value={editedPrice}
                                                                            onChange={(e) => setEditedPrice(e.target.value)}
                                                                            className="w-20 px-2 py-1 border rounded mr-2"
                                                                            min="0"
                                                                            step="0.01"
                                                                        />
                                                                        <button
                                                                            onClick={() => saveEditedPrice(item.id)}
                                                                            disabled={savingPrice}
                                                                            className="text-green-600 hover:text-green-800 mr-2"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingItemId(null)}
                                                                            className="text-red-600 hover:text-red-800"
                                                                        >
                                                                            ✗
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center">
                                                                        <span>Bs. {safeText(item.price)}</span>
                                                                        <button
                                                                            onClick={() => handlePriceEdit(item.id, item.price)}
                                                                            className="ml-2 text-blue-600 hover:text-blue-800"
                                                                        >
                                                                            ✎
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            
                                                            {/* Quantity cell */}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {safeText(item.quantity)}
                                                            </td>
                                                            
                                                            {/* Subtotal cell */}
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                Bs. {(item.price * item.quantity).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-gray-50">
                                                        <td colSpan="3" className="px-6 py-4 text-right font-medium">Total:</td>
                                                        <td className="px-6 py-4 font-bold">
                                                            Bs. {safeText(order.cartTotal || order.totalAmount || 
                                                                order.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500">No hay productos en esta orden</p>
                                    )}
                                </div>
                                
                                {/* Notas */}
                                {order.notes && (
                                    <div className="p-6 border-b">
                                        <h3 className="text-lg font-semibold mb-3">Notas</h3>
                                        <p className="text-gray-700">{safeText(order.notes)}</p>
                                    </div>
                                )}
                                
                                {/* Acciones */}
                                <div className="p-6">
                                    <h3 className="text-lg font-semibold mb-3">Actualizar Estado</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => updateOrderStatus('pending')}
                                            disabled={order.status === 'pending' || updatingStatus}
                                            className={`px-4 py-2 rounded ${
                                                order.status === 'pending' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                            }`}
                                        >
                                            Pendiente
                                        </button>
                                        <button
                                            onClick={() => updateOrderStatus('shipped')}
                                            disabled={order.status === 'shipped' || updatingStatus}
                                            className={`px-4 py-2 rounded ${
                                                order.status === 'shipped' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        >
                                            Enviado
                                        </button>
                                        <button
                                            onClick={() => updateOrderStatus('delivered')}
                                            disabled={order.status === 'delivered' || updatingStatus}
                                            className={`px-4 py-2 rounded ${
                                                order.status === 'delivered' 
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                            }`}
                                        >
                                            Entregado
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No se encontró la orden</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OrderDetailPage;