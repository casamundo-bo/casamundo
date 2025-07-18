import { useDispatch, useSelector } from "react-redux";
import Layout from "../../components/layout/Layout";
import { Trash } from 'lucide-react'
import { decrementQuantity, deleteFromCart, incrementQuantity, clearCart, updateCartItemStock } from "../../redux/cartSlice";
import toast from "react-hot-toast";
import { useContext, useEffect, useState } from "react";
import { Timestamp, addDoc, collection, doc, getDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import BuyNowModal from "../../components/buyNowModal/BuyNowModal";
import { Navigate, useNavigate } from "react-router-dom";
import { runTransaction } from "firebase/firestore";
import myContext from "../../context/myContext";
import { DEBT_STATUS, createDebtTransaction } from "../../utils/debtUtils";

const CartPage = () => {
    // Redux
    const cartItems = useSelector((state) => state.cart) || [];
    const dispatch = useDispatch();
    
    // Context
    const { currentUser } = useContext(myContext);
    const navigate = useNavigate();
    
    // Debug - Verificar el estado del carrito
    useEffect(() => {
        console.log("Cart Items:", cartItems);
        console.log("Current User:", currentUser);
        
        // Intentar cargar el carrito desde localStorage directamente
        const cartKey = currentUser ? `cart_${currentUser}` : 'cart_guest';
        const localStorageCart = localStorage.getItem(cartKey);
        console.log("LocalStorage Cart:", localStorageCart);
    }, [cartItems, currentUser]);
    
    // Estados para la compra
    // Inicializar addressInfo con valores predeterminados
    const [addressInfo, setAddressInfo] = useState({
        name: '',
        phoneNumber: '',
        address: '',
        city: '',
        pincode: '',
        email: ''
    });
    
    // Estados de UI
    const [loading, setLoading] = useState(false);
    const [redirectToOrders, setRedirectToOrders] = useState(false);
    
    // NUEVO: Cargar datos del usuario al iniciar
    useEffect(() => {
        const loadUserData = async () => {
            const user = JSON.parse(localStorage.getItem('users'));
            
            if (user && user.uid) {
                try {
                    // Intentar obtener datos completos del usuario desde Firestore
                    const userDoc = await getDoc(doc(fireDB, 'user', user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        
                        // Pre-llenar el formulario con los datos del usuario
                        setAddressInfo({
                            name: userData.name || user.name || '',
                            phoneNumber: userData.phone || userData.phoneNumber || '',
                            address: userData.address || '',
                            city: userData.city || '',
                            pincode: userData.pincode || '',
                            email: userData.email || user.email || ''
                        });
                        
                        console.log("Datos de usuario cargados:", userData);
                    } else {
                        // Si no hay documento en Firestore, usar datos básicos del localStorage
                        setAddressInfo({
                            name: user.name || '',
                            email: user.email || '',
                            phoneNumber: '',
                            address: '',
                            city: '',
                            pincode: ''
                        });
                    }
                } catch (error) {
                    console.error("Error al cargar datos del usuario:", error);
                }
            }
        };
        
        loadUserData();
    }, [currentUser]);
    
    // Función para manipular el carrito
    const handleIncrement = (item) => {
        if (item) {
            dispatch(incrementQuantity({ item, userId: currentUser || 'guest' }));
        }
    };

    const handleDecrement = (item) => {
        if (item) {
            dispatch(decrementQuantity({ item, userId: currentUser || 'guest' }));
        }
    };

    const deleteCart = (item) => {
        if (item) {
            dispatch(deleteFromCart({ item, userId: currentUser || 'guest' }));
            toast.success("Producto eliminado del carrito");
        }
    };
    
    // Estado para almacenar los stocks actualizados
    const [realTimeStocks, setRealTimeStocks] = useState({});
    const [checkingStock, setCheckingStock] = useState(false);
    
    // Función para verificar el stock en tiempo real
    const verifyStockBeforePurchase = async () => {
        try {
            setCheckingStock(true);
            
            // Verificar si hay productos en el carrito
            if (cartItems.length === 0) {
                toast.error("El carrito está vacío");
                return false;
            }
            
            // Obtener los IDs de los productos en el carrito
            const productIds = cartItems.map(item => item.id);
            
            // Consultar el stock actual de todos los productos en el carrito
            const productsQuery = query(
                collection(fireDB, "products"),
                where("__name__", "in", productIds)
            );
            
            const productsSnapshot = await getDocs(productsQuery);
            const currentStocks = {};
            let stockError = false;
            
            // Verificar el stock de cada producto
            productsSnapshot.forEach(doc => {
                const productData = doc.data();
                const productId = doc.id;
                const cartItem = cartItems.find(item => item.id === productId);
                
                currentStocks[productId] = productData.stock || 0;
                
                // Verificar si hay suficiente stock
                if (cartItem && cartItem.quantity > productData.stock) {
                    toast.error(`No hay suficiente stock para ${productData.title || 'un producto'} (disponible: ${productData.stock})`);
                    stockError = true;
                }
            });
            
            // Actualizar el estado con los stocks actuales
            setRealTimeStocks(currentStocks);
            
            // Actualizar el stock en el carrito
            Object.entries(currentStocks).forEach(([productId, stock]) => {
                dispatch(updateCartItemStock({ 
                    itemId: productId, 
                    stock, 
                    userId: currentUser || 'guest' 
                }));
            });
            
            return !stockError;
        } catch (error) {
            console.error("Error al verificar el stock:", error);
            toast.error("Error al verificar disponibilidad de productos");
            return false;
        } finally {
            setCheckingStock(false);
        }
    };
    
    // Modificar la función buyNow para verificar el stock antes de procesar la compra
    const buyNow = async () => {
        try {
            setLoading(true);
            
            // Verificar si hay productos en el carrito
            if (cartItems.length === 0) {
                toast.error("El carrito está vacío");
                setLoading(false);
                return false;
            }
            
            // Verificar si el usuario está autenticado
            const user = JSON.parse(localStorage.getItem('users'));
            if (!user || !user.uid) {
                toast.error("Debe iniciar sesión para realizar compras");
                setLoading(false);
                navigate('/login');
                return false;
            }
            
            // Verificar el stock en tiempo real antes de procesar la compra
            const stockOk = await verifyStockBeforePurchase();
            if (!stockOk) {
                setLoading(false);
                return false;
            }
            
            // Calcular el total
            const totalAmount = cartItems.reduce((total, item) => {
                return total + item.price * item.quantity;
            }, 0);
            
            // Crear el objeto de orden con todos los campos necesarios
            const orderInfo = {
                cartItems,
                addressInfo,
                date: Timestamp.now(),
                email: addressInfo.email,
                userId: user?.uid || 'guest',
                userName: user?.name || addressInfo.name || 'Cliente',
                status: "pending",
                totalAmount,
                // Añadir campos adicionales que puedan ser necesarios para el dashboard
                paymentMethod: "Efectivo",
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            
            console.log("Procesando orden:", orderInfo);
            
            // Guardar la orden en Firestore
            const orderRef = await addDoc(collection(fireDB, "orders"), orderInfo);
            console.log("Orden creada con ID:", orderRef.id);
            
            // NUEVO: Crear una deuda pendiente para este pedido
            if (user && user.uid) {
                const newTransaction = createDebtTransaction({
                    type: 'addition',
                    amount: totalAmount,
                    orderId: orderRef.id,
                    note: `Pedido #${orderRef.id} - ${cartItems.length} productos`,
                    paymentMethod: "Efectivo"
                });
                
                const newDebt = {
                    userId: user.uid,
                    userName: user.name || user.email,
                    userEmail: user.email,
                    amount: totalAmount,
                    remainingAmount: totalAmount,
                    description: `Pedido #${orderRef.id} - Pendiente de pago`,
                    date: Timestamp.now(),
                    status: DEBT_STATUS.PENDING,
                    orderId: orderRef.id,
                    createdBy: user.uid,
                    time: Timestamp.now(),
                    paymentHistory: [],
                    transactions: [newTransaction],
                    lastUpdated: Timestamp.now()
                };
                
                const debtRef = await addDoc(collection(fireDB, "debts"), newDebt);
                
                // Actualizar la orden con la referencia a la deuda
                await updateDoc(doc(fireDB, "orders", orderRef.id), {
                    debtId: debtRef.id,
                    debtStatus: DEBT_STATUS.PENDING
                });
            }
            
            // Actualizar el stock de cada producto
            for (const item of cartItems) {
                try {
                    const productRef = doc(fireDB, "products", item.id);
                    
                    // Usar una transacción para garantizar la integridad de los datos
                    await runTransaction(fireDB, async (transaction) => {
                        const productDoc = await transaction.get(productRef);
                        
                        if (!productDoc.exists()) {
                            throw new Error(`Producto con ID ${item.id} no encontrado`);
                        }
                        
                        const productData = productDoc.data();
                        const newStock = Math.max(0, productData.stock - item.quantity);
                        
                        // Actualizar el stock
                        transaction.update(productRef, { 
                            stock: newStock,
                            updatedAt: Timestamp.now()
                        });
                        
                        console.log(`Stock actualizado para ${item.title}: ${productData.stock} -> ${newStock}`);
                    });
                } catch (error) {
                    console.error(`Error al actualizar stock para producto ${item.id}:`, error);
                    // Continuamos con los demás productos aunque falle uno
                }
            }
            
            // Limpiar el carrito después de la compra
            dispatch(clearCart({ userId: currentUser || 'guest' }));
            
            toast.success("Orden realizada con éxito");
            setRedirectToOrders(true);
        } catch (error) {
            console.error("Error al procesar la orden:", error);
            toast.error("Error al procesar la orden");
        } finally {
            setLoading(false);
        }
    };
    
    // Redireccionar después de la compra
    if (redirectToOrders) {
        return <Navigate to="/order" />;
    }
    
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Carrito de Compras</h1>
                
                {loading && (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
                    </div>
                )}
                
                {!loading && (!cartItems || cartItems.length === 0) ? (
                    <div className="text-center py-8">
                        <h2 className="text-xl font-semibold mb-4">Tu carrito está vacío</h2>
                        <button 
                            onClick={() => navigate('/')}
                            className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600"
                        >
                            Continuar Comprando
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Lista de productos */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {cartItems.map((item) => {
                                            const currentStock = realTimeStocks[item.id] !== undefined 
                                                ? realTimeStocks[item.id] 
                                                : item.stock;
                                            
                                            const hasStockIssue = currentStock < item.quantity;
                                            
                                            return (
                                                <tr key={item.id} className={hasStockIssue ? "bg-red-50" : ""}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <img 
                                                                src={item.imageUrl} 
                                                                alt={item.title} 
                                                                className="h-10 w-10 object-cover rounded-md mr-3"
                                                                onError={(e) => {
                                                                    e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                                                                }}
                                                            />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{item.title}</div>
                                                                {hasStockIssue && (
                                                                    <div className="text-xs text-red-600 font-medium">
                                                                        ¡Stock insuficiente! (Disponible: {currentStock})
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        Bs. {item.price}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <button 
                                                                onClick={() => handleDecrement(item)}
                                                                className="bg-gray-200 px-2 py-1 rounded-l-md"
                                                                disabled={item.quantity <= 1}
                                                            >
                                                                -
                                                            </button>
                                                            <span className="px-4 py-1 bg-gray-100">{item.quantity}</span>
                                                            <button 
                                                                onClick={() => handleIncrement(item)}
                                                                className="bg-gray-200 px-2 py-1 rounded-r-md"
                                                                disabled={item.quantity >= currentStock}
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        Bs. {(item.price * item.quantity).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button 
                                                            onClick={() => deleteCart(item)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Resumen de compra */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h2 className="text-lg font-semibold mb-4">Resumen de Compra</h2>
                                <div className="flex justify-between mb-2">
                                    <span>Subtotal:</span>
                                    <span>Bs. {cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 my-4"></div>
                                <div className="flex justify-between font-semibold mb-6">
                                    <span>Total:</span>
                                    <span>Bs. {cartItems.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}</span>
                                </div>
                                
                                <BuyNowModal 
                                    addressInfo={addressInfo}
                                    setAddressInfo={setAddressInfo}
                                    buyNowFunction={buyNow}
                                    isLoading={loading || checkingStock}
                                    buttonText={checkingStock ? "Verificando stock..." : "Proceder al pago"}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default CartPage;