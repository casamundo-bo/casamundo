import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import Layout from '../../components/layout/Layout';
import Loader from '../../components/loader/Loader';
import { formatDate } from '../../utils/dateUtils';
import { safeText } from '../../utils/productUtils';
import toast from 'react-hot-toast';

const OrderPage = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Obtener el usuario actual
    const user = JSON.parse(localStorage.getItem('users'));
    
    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Si no hay ID o usuario, detener la carga
                if (!id || !user) {
                    setLoading(false);
                    if (!id) {
                        setError('ID de pedido no proporcionado');
                    } else if (!user) {
                        setError('Usuario no autenticado');
                        toast.error('Debe iniciar sesión para ver detalles del pedido');
                    }
                    return;
                }
                
                console.log("Obteniendo detalles del pedido:", id);
                const orderRef = doc(fireDB, 'orders', id);
                const orderDoc = await getDoc(orderRef);
                
                if (orderDoc.exists()) {
                    const orderData = orderDoc.data();
                    
                    // Verificar que el pedido pertenece al usuario actual o es admin
                    const isAdmin = user?.role === 'admin';
                    const orderBelongsToUser = 
                        isAdmin || // Los administradores pueden ver cualquier pedido
                        orderData.userId === user?.uid || 
                        orderData.uid === user?.uid || 
                        (orderData.email && user?.email && orderData.email.toLowerCase() === user?.email.toLowerCase()) || 
                        (orderData.userEmail && user?.email && orderData.userEmail.toLowerCase() === user?.email.toLowerCase());
                    
                    console.log("¿El pedido pertenece al usuario?", orderBelongsToUser);
                    console.log("Datos del usuario:", { 
                        userUid: user?.uid,
                        userEmail: user?.email,
                        userRole: user?.role
                    });
                    console.log("Datos del pedido:", {
                        orderUserId: orderData.userId,
                        orderUid: orderData.uid,
                        orderEmail: orderData.email,
                        orderUserEmail: orderData.userEmail
                    });
                    
                    if (orderBelongsToUser) {
                        // Asegurarse de que los productos estén en el formato correcto
                        let products = [];
                        
                        if (Array.isArray(orderData.products)) {
                            products = orderData.products;
                        } else if (orderData.cartItems && Array.isArray(orderData.cartItems)) {
                            products = orderData.cartItems;
                        } else if (typeof orderData.products === 'object' && orderData.products !== null) {
                            // Convertir objeto a array si es necesario
                            products = Object.values(orderData.products);
                        }
                        
                        // Normalizar los productos para asegurar que tengan la estructura correcta
                        const normalizedProducts = products.map(product => ({
                            id: product.id || '',
                            title: product.title || 'Producto sin nombre',
                            price: parseFloat(product.price || 0),
                            quantity: parseInt(product.quantity || 1, 10),
                            imageUrl: product.imageUrl || '',
                            category: product.category || '',
                            subcategory: product.subcategory || ''
                        }));
                        
                        // Asegurarse de que date sea un valor válido
                        const orderDate = orderData.date || orderData.time || orderData.createdAt || new Date();
                        
                        setOrder({
                            id: orderDoc.id,
                            ...orderData,
                            products: normalizedProducts,
                            // Asegurar que estos campos siempre estén presentes
                            totalAmount: parseFloat(orderData.totalAmount || orderData.cartTotal || 0),
                            date: orderDate,
                            status: orderData.status || 'pending',
                            isAdminCreated: orderData.isAdminCreated || false
                        });
                    } else {
                        setError('No tienes permiso para ver este pedido');
                        toast.error('No tienes permiso para ver este pedido');
                    }
                } else {
                    setError('Pedido no encontrado');
                    toast.error('Pedido no encontrado');
                }
            } catch (err) {
                console.error('Error al cargar el pedido:', err);
                setError(`Error al cargar el pedido: ${err.message}`);
                toast.error('Error al cargar el pedido');
            } finally {
                setLoading(false);
            }
        };
        
        // Ejecutar la función solo si hay un ID
        if (id) {
            fetchOrderDetails();
        } else {
            setLoading(false);
            setError('ID de pedido no proporcionado');
        }
    }, [id]); // Eliminar user de las dependencias para evitar bucles infinitos
    
    if (loading) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <Loader />
                </div>
            </Layout>
        );
    }
    
    if (error || !order) {
        return (
            <Layout>
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                        <p className="text-red-600">{error || 'No se pudo cargar el pedido'}</p>
                    </div>
                </div>
            </Layout>
        );
    }
    
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-6">
                        <h1 className="text-2xl font-bold">Detalles del Pedido</h1>
                        <span className={`px-3 py-1 rounded-full text-sm ${
                            order.status === 'pending' || order.status === 'Pendiente' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : order.status === 'shipped' || order.status === 'Enviado'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'delivered' || order.status === 'Entregado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {order.status === 'pending' ? 'Pendiente' :
                             order.status === 'shipped' ? 'Enviado' :
                             order.status === 'delivered' ? 'Entregado' :
                             safeText(order.status)}
                        </span>
                    </div>
                    
                    {order.isAdminCreated && (
                        <div className="mb-4 bg-purple-50 p-3 rounded-lg">
                            <p className="text-purple-700">
                                <span className="font-medium">Nota:</span> Este pedido fue creado por un administrador.
                            </p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Información del Pedido</h2>
                            <p><span className="font-medium">ID del Pedido:</span> {order.id}</p>
                            <p><span className="font-medium">Fecha:</span> {formatDate(order.date)}</p>
                            <p><span className="font-medium">Estado:</span> {safeText(order.status)}</p>
                            <p><span className="font-medium">Método de Pago:</span> {safeText(order.paymentMethod || 'No especificado')}</p>
                        </div>
                        
                        <div>
                            <h2 className="text-lg font-semibold mb-2">Información de Envío</h2>
                            <p><span className="font-medium">Nombre:</span> {safeText(order.addressInfo?.name || order.userName || 'No especificado')}</p>
                            <p><span className="font-medium">Dirección:</span> {safeText(order.addressInfo?.address || 'No especificada')}</p>
                            <p><span className="font-medium">Ciudad:</span> {safeText(order.addressInfo?.city || 'No especificada')}</p>
                            <p><span className="font-medium">Teléfono:</span> {safeText(order.addressInfo?.phoneNumber || 'No especificado')}</p>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-2">Productos</h2>
                        
                        {order.products && order.products.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white border border-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="py-2 px-4 border-b text-left">Producto</th>
                                            <th className="py-2 px-4 border-b text-left">Precio</th>
                                            <th className="py-2 px-4 border-b text-left">Cantidad</th>
                                            <th className="py-2 px-4 border-b text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.products.map((product, index) => (
                                            <tr key={index} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        {product.imageUrl && (
                                                            <img 
                                                                src={product.imageUrl} 
                                                                alt={product.title} 
                                                                className="h-12 w-12 object-cover mr-3 rounded"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = '/placeholder.png';
                                                                }}
                                                            />
                                                        )}
                                                        <div>
                                                            <p className="font-medium">{safeText(product.title)}</p>
                                                            {product.category && (
                                                                <p className="text-sm text-gray-500">
                                                                    {safeText(product.category)}
                                                                    {product.subcategory && ` - ${safeText(product.subcategory)}`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">Bs. {parseFloat(product.price).toFixed(2)}</td>
                                                <td className="py-3 px-4">{product.quantity}</td>
                                                <td className="py-3 px-4 text-right">
                                                    Bs. {(parseFloat(product.price) * parseInt(product.quantity)).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-yellow-700">No hay productos disponibles para mostrar.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Subtotal:</span>
                            <span>Bs. {order.originalAmount ? parseFloat(order.originalAmount).toFixed(2) : parseFloat(order.totalAmount).toFixed(2)}</span>
                        </div>
                        
                        {order.discount > 0 && (
                            <div className="flex justify-between items-center mb-2 text-green-600">
                                <span className="font-medium">Descuento ({order.discount}%):</span>
                                <span>- Bs. {(
                                    (parseFloat(order.originalAmount || 0) - parseFloat(order.totalAmount || 0)) || 
                                    (parseFloat(order.originalAmount || 0) * (parseFloat(order.discount || 0) / 100))
                                ).toFixed(2)}</span>
                            </div>
                        )}
                        
                        {order.shippingCost > 0 && (
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium">Costo de envío:</span>
                                <span>Bs. {parseFloat(order.shippingCost).toFixed(2)}</span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t mt-2 text-lg font-bold">
                            <span>Total:</span>
                            <span>Bs. {parseFloat(order.totalAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default OrderPage;