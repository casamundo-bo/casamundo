import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, deleteFromCart, clearCart } from "../../redux/cartSlice";
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, runTransaction, where, limit } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import myContext from "../../context/myContext";
import toast from "react-hot-toast";
import { createSerializableProduct } from "../../utils/productUtils";
import { DEBT_STATUS, createDebtTransaction } from "../../utils/debtUtils";

const AdminOrderCreation = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const context = useContext(myContext);
    const { loading, setLoading, getAllOrderFunction } = context;
    
    // Estado para el carrito
    const cartItems = useSelector((state) => state.cart);
    
    // Estados para el formulario
    const [step, setStep] = useState(1);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedUserData, setSelectedUserData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    
    // Estado para cantidades manuales
    const [productQuantities, setProductQuantities] = useState({});
    
    const [addressInfo, setAddressInfo] = useState({
        name: '',
        phoneNumber: '',
        address: '',
        city: '',
        pincode: ''
    });
    const [orderType, setOrderType] = useState('normal'); // normal o deuda
    const [paymentMethod, setPaymentMethod] = useState('efectivo');
    const [discount, setDiscount] = useState('0');
    const [adminNote, setAdminNote] = useState('');
    const [processingOrder, setProcessingOrder] = useState(false);
    
    // Añadir estados para manejar deudas existentes
    const [existingDebts, setExistingDebts] = useState([]);
    const [selectedDebtId, setSelectedDebtId] = useState('new');
    const [loadingDebts, setLoadingDebts] = useState(false);
    
    // Cargar usuarios al montar el componente
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(fireDB, 'user'), orderBy('date', 'desc'));
                const querySnapshot = await getDocs(q);
                const usersArray = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUsers(usersArray);
            } catch (error) {
                console.error("Error al cargar usuarios:", error);
                toast.error("Error al cargar usuarios");
            }
        };
        
        fetchUsers();
        
        // Cargar carrito administrativo
        dispatch(clearCart({ userId: 'admin_cart' }));
        
    }, [dispatch]);
    
    // Cargar datos del usuario seleccionado
    useEffect(() => {
        const fetchUserData = async () => {
            if (!selectedUser) {
                setSelectedUserData(null);
                // Reiniciar todos los campos cuando no hay usuario seleccionado
                setAddressInfo({
                    name: '',
                    phoneNumber: '',
                    address: '',
                    city: '',
                    pincode: ''
                });
                setPaymentMethod('efectivo');
                return;
            }
            
            try {
                const userDoc = await getDoc(doc(fireDB, 'user', selectedUser));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setSelectedUserData({
                        ...userData,
                        uid: selectedUser
                    });
                    
                    // Inicializar objeto de dirección completo
                    let completeAddressInfo = {
                        name: userData.name || '',
                        phoneNumber: userData.phoneNumber || '',
                        email: userData.email || '',
                        address: '',
                        city: '',
                        pincode: ''
                    };
                    
                    // Si el usuario tiene información de dirección guardada, usarla
                    if (userData.addressInfo) {
                        completeAddressInfo = {
                            ...completeAddressInfo,
                            ...userData.addressInfo
                        };
                    }
                    
                    // Buscar la última orden del usuario para obtener datos adicionales
                    const ordersQuery = query(
                        collection(fireDB, 'orders'),
                        where('userId', '==', selectedUser),
                        orderBy('date', 'desc'),
                        limit(1)
                    );
                    
                    const ordersSnapshot = await getDocs(ordersQuery);
                    
                    if (!ordersSnapshot.empty) {
                        const lastOrder = ordersSnapshot.docs[0].data();
                        
                        // Si la orden tiene información de dirección, usarla para completar
                        if (lastOrder.addressInfo) {
                            completeAddressInfo = {
                                ...completeAddressInfo,
                                ...lastOrder.addressInfo,
                                // Asegurar que el nombre y teléfono se mantengan si ya existen
                                name: completeAddressInfo.name || lastOrder.addressInfo.name || '',
                                phoneNumber: completeAddressInfo.phoneNumber || lastOrder.addressInfo.phoneNumber || ''
                            };
                        }
                        
                        // Establecer el método de pago preferido del usuario basado en su última orden
                        if (lastOrder.paymentMethod) {
                            setPaymentMethod(lastOrder.paymentMethod);
                        }
                    }
                    
                    // Actualizar el estado con la información completa
                    setAddressInfo(completeAddressInfo);
                    
                } else {
                    toast.error("Usuario no encontrado");
                    setSelectedUserData(null);
                }
            } catch (error) {
                console.error("Error al cargar datos del usuario:", error);
                toast.error("Error al cargar datos del usuario");
                setSelectedUserData(null);
            }
        };
        
        fetchUserData();
    }, [selectedUser]);
    
    // Filtrar productos basados en el término de búsqueda
    useEffect(() => {
        const fetchProducts = async () => {
            if (!searchTerm.trim()) {
                setFilteredProducts([]);
                return;
            }
            
            try {
                const q = query(
                    collection(fireDB, 'products'),
                    orderBy('title'),
                    limit(10)
                );
                const querySnapshot = await getDocs(q);
                const productsArray = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Filtrar productos que coincidan con el término de búsqueda
                const filtered = productsArray.filter(product => 
                    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                
                setFilteredProducts(filtered);
                
                // Inicializar cantidades para nuevos productos
                const newQuantities = { ...productQuantities };
                filtered.forEach(product => {
                    if (!newQuantities[product.id]) {
                        newQuantities[product.id] = 1;
                    }
                });
                setProductQuantities(newQuantities);
                
            } catch (error) {
                console.error("Error al buscar productos:", error);
                toast.error("Error al buscar productos");
            }
        };
        
        if (searchTerm.trim().length >= 2) {
            fetchProducts();
        } else {
            setFilteredProducts([]);
        }
    }, [searchTerm]);
    
    // ... código existente ...

// Agregar esta función después de los efectos useEffect y antes de handleUserSelect
const handleQuantityChange = (productId, value) => {
    // Convertir el valor a número entero
    const quantity = parseInt(value, 10);
    
    // Obtener el producto para verificar el stock
    const product = filteredProducts.find(p => p.id === productId);
    
    if (!product) {
        console.error("Producto no encontrado:", productId);
        return;
    }
    
    // Validar que la cantidad sea un número válido
    if (isNaN(quantity) || quantity < 1) {
        // Si es inválido, establecer a 1
        setProductQuantities(prev => ({
            ...prev,
            [productId]: 1
        }));
        return;
    }
    
    // Validar que no exceda el stock
    if (quantity > product.stock) {
        toast.error(`Solo hay ${product.stock} unidades disponibles`);
        setProductQuantities(prev => ({
            ...prev,
            [productId]: product.stock
        }));
        return;
    }
    
    // Actualizar el estado con la cantidad válida
    setProductQuantities(prev => ({
        ...prev,
        [productId]: quantity
    }));
};

    // Manejar selección de usuario
    const handleUserSelect = (e) => {
        setSelectedUser(e.target.value);
    };
    
    // Manejar cambios en la información de dirección
    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setAddressInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
// ... código existente ...

// Agregar esta función después de handleQuantityChange
const addProductToCart = (product) => {
    if (!product) return;
    
    // Obtener la cantidad del estado productQuantities
    const quantity = productQuantities[product.id] || 1;
    
    // Validar la cantidad contra el stock disponible
    if (quantity > product.stock) {
        toast.error(`Solo hay ${product.stock} unidades disponibles`);
        return;
    }
    
    if (quantity <= 0) {
        toast.error("La cantidad debe ser mayor a cero");
        return;
    }
    
    // Crear un producto serializable
    const serializedProduct = createSerializableProduct(product);
    
    if (!serializedProduct) {
        toast.error("Error al procesar el producto");
        return;
    }
    
    // Usar la acción setQuantityForItem para agregar con cantidad específica
    dispatch({
        type: 'cart/setQuantityForItem',
        payload: {
            item: serializedProduct,
            quantity: quantity,
            userId: 'admin_cart'
        }
    });
    
    toast.success(`${quantity} ${product.title} agregado al carrito`);
    
    // Limpiar el término de búsqueda después de agregar al carrito
    setSearchTerm('');
    setFilteredProducts([]);
};

// Reemplazar la función handleAddToCart existente con esta versión mejorada
const handleAddToCart = (product) => {
    addProductToCart(product);
};

// ... resto del código ...
    // Eliminar producto del carrito
    const handleRemoveFromCart = (itemId) => {
        dispatch(deleteFromCart({
            itemId,
            userId: 'admin_cart'
        }));
    };
    
    // Calcular total del carrito
    const cartTotal = cartItems.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    
    // Calcular total final con descuento
    const calculateFinalTotal = () => {
        const discountAmount = parseFloat(discount) || 0;
        return Math.max(0, cartTotal - discountAmount);
    };
    
    const finalAmount = calculateFinalTotal();
    
    // Avanzar al siguiente paso
    const handleNextStep = () => {
        if (step === 1 && !selectedUser) {
            toast.error('Seleccione un usuario');
            return;
        }
        
        if (step === 2 && cartItems.length === 0) {
            toast.error('Añada al menos un producto al carrito');
            return;
        }
        
        setStep(prev => prev + 1);
    };
    
    // Retroceder al paso anterior
    const handlePrevStep = () => {
        setStep(prev => prev - 1);
    };
    
    // Nuevo efecto para cargar deudas pendientes del usuario seleccionado
    useEffect(() => {
        const fetchUserDebts = async () => {
            if (!selectedUser) {
                setExistingDebts([]);
                setSelectedDebtId('new');
                return;
            }
            
            try {
                setLoadingDebts(true);
                console.log(`Buscando todas las deudas para usuario ${selectedUser}`);
                
                // Modificar la consulta para buscar todas las deudas del usuario sin filtrar por estado
                const q = query(
                    collection(fireDB, 'debts'),
                    where('userId', '==', selectedUser)
                );
                
                const querySnapshot = await getDocs(q);
                const debtsArray = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`Todas las deudas encontradas para usuario ${selectedUser}:`, debtsArray.length);
                
                // Primero buscar deudas activas (pendientes o parciales)
                const activeDebts = debtsArray.filter(debt => 
                    debt.status === DEBT_STATUS.PENDING || 
                    debt.status === DEBT_STATUS.PARTIAL ||
                    debt.status === 'pendiente' || 
                    debt.status === 'parcial'
                );
                
                console.log(`Deudas activas encontradas:`, activeDebts.length);
                
                // Si hay deudas activas, usarlas
                if (activeDebts.length > 0) {
                    setExistingDebts(activeDebts);
                    setSelectedDebtId(activeDebts[0].id);
                } 
                // Si no hay deudas activas pero hay otras deudas, mostrar la más reciente
                else if (debtsArray.length > 0) {
                    // Ordenar por fecha de última actualización (más reciente primero)
                    const sortedDebts = [...debtsArray].sort((a, b) => {
                        const dateA = a.lastUpdated?.toDate?.() || new Date(a.lastUpdated || a.date);
                        const dateB = b.lastUpdated?.toDate?.() || new Date(b.lastUpdated || b.date);
                        return dateB - dateA;
                    });
                    
                    setExistingDebts(sortedDebts);
                    setSelectedDebtId(sortedDebts[0].id);
                    
                    console.log(`No hay deudas activas, usando la más reciente:`, sortedDebts[0].id);
                } else {
                    setExistingDebts([]);
                    setSelectedDebtId('new');
                    console.log(`No se encontraron deudas para este usuario`);
                }
                
            } catch (error) {
                console.error("Error al cargar deudas del usuario:", error);
                toast.error("Error al cargar deudas existentes");
                setExistingDebts([]);
                setSelectedDebtId('new');
            } finally {
                setLoadingDebts(false);
            }
        };
        
        if (selectedUser) {
            fetchUserDebts();
        } else {
            setExistingDebts([]);
            setSelectedDebtId('new');
        }
    }, [selectedUser, orderType]);

    // Función unificada para crear pedido
    const handleCreateOrder = async () => {
        // Validaciones
        if (cartItems.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        
        if (!addressInfo.name || !addressInfo.phoneNumber || !addressInfo.address) {
            toast.error('Complete la información de entrega');
            return;
        }
        
        try {
            setLoading(true);
            setProcessingOrder(true);
            
            // Verificar que selectedUserData existe
            if (!selectedUserData) {
                throw new Error('Datos de usuario no disponibles');
            }
            
            // Sanitizar los productos del carrito para asegurar que no hay valores undefined
            const sanitizedProducts = cartItems.map(item => {
                // Crear un objeto limpio con solo los campos necesarios
                return {
                    id: item.id || '',
                    title: item.title || '',
                    price: parseFloat(item.price || 0),
                    quantity: parseInt(item.quantity || 1, 10),
                    imageUrl: item.imageUrl || '',
                    category: item.category || '',
                    subcategory: item.subcategory || '',
                    // Usar Timestamp para fechas en lugar de ISO string
                    date: Timestamp.now()
                };
            });
            
            console.log('Productos sanitizados para la orden:', sanitizedProducts);
            // Calcular el total del carrito
            const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            const finalAmount = parseFloat(discount) > 0 
                ? cartTotal - (cartTotal * parseFloat(discount) / 100) 
                : cartTotal;
            
            // Crear objeto de orden con campos unificados y sin duplicaciones
            const orderData = {
                userId: selectedUser,
                userName: selectedUserData.name || 'Usuario sin nombre',
                userEmail: selectedUserData.email || '',
                products: sanitizedProducts,
                addressInfo: addressInfo,
                status: "pending", // Siempre comenzar como pendiente
                date: Timestamp.now(),
                time: Timestamp.now(),
                paymentMethod: paymentMethod,
                totalAmount: finalAmount,
                discount: parseFloat(discount) || 0,
                originalAmount: cartTotal,
                adminNote: adminNote,
                createdBy: JSON.parse(localStorage.getItem('users'))?.uid || 'unknown',
                isAdminCreated: true
            };
            
            console.log('Creando orden para usuario:', selectedUser, selectedUserData.name, selectedUserData.email);
            
            // Guardar orden en Firestore
            const orderRef = await addDoc(collection(fireDB, 'orders'), orderData);
            console.log('Orden creada con ID:', orderRef.id);
            
            // MODIFICADO: Todos los pedidos generan una deuda, con estado según el método de pago
            // Si es a crédito, la deuda queda pendiente
            // Si es otro método, la deuda se marca como pagada
            let debtId = null;
            let debtStatus = orderType === 'deuda' ? DEBT_STATUS.PENDING : DEBT_STATUS.PAID;
            
            // Crear la transacción para el historial
            const newTransaction = createDebtTransaction({
                type: 'addition',
                amount: finalAmount,
                orderId: orderRef.id,
                note: `Pedido #${orderRef.id} - Creado por administrador`,
                paymentMethod: paymentMethod,
                discount: parseFloat(discount) || 0,
                // Añadir información del usuario dueño de la deuda
                debtUserId: selectedUser,
                debtUserName: selectedUserData.name || 'Usuario sin nombre',
                debtUserEmail: selectedUserData.email || ''
            });
            
            // MODIFICADO: Buscar cualquier deuda global activa del usuario, independientemente de la selección
            const globalDebtQuery = query(
                collection(fireDB, 'debts'),
                where('userId', '==', selectedUser),
                where('status', 'in', [DEBT_STATUS.PENDING, DEBT_STATUS.PARTIAL, DEBT_STATUS.PAID])
            );
            
            const globalDebtSnapshot = await getDocs(globalDebtQuery);
            
            // Si existe una deuda global, usarla independientemente de la selección
            if (!globalDebtSnapshot.empty) {
                // Ordenar por estado: primero las pendientes, luego las parciales, luego las pagadas
                const sortedDebts = globalDebtSnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .sort((a, b) => {
                        const priorityMap = {
                            [DEBT_STATUS.PENDING]: 0,
                            [DEBT_STATUS.PARTIAL]: 1,
                            [DEBT_STATUS.PAID]: 2
                        };
                        return priorityMap[a.status] - priorityMap[b.status];
                    });
                
                // Usar la primera deuda según la prioridad
                const debtToUse = sortedDebts[0];
                
                // Resto del código para actualizar la deuda...
                const newAmount = parseFloat(debtToUse.amount || 0) + finalAmount;
                
                // Calcular el monto restante según el tipo de orden
                const newRemainingAmount = orderType === 'deuda' 
                    ? parseFloat(debtToUse.remainingAmount || 0) + finalAmount 
                    : parseFloat(debtToUse.remainingAmount || 0);
                
                // Determinar el nuevo estado de la deuda
                let newStatus = debtToUse.status;
                if (orderType === 'deuda') {
                    // Si es a deuda, la deuda está pendiente o parcial
                    newStatus = newRemainingAmount > 0 ? DEBT_STATUS.PARTIAL : DEBT_STATUS.PAID;
                } else if (newRemainingAmount <= 0) {
                    // Si no es a deuda y no queda monto pendiente, marcar como pagada
                    newStatus = DEBT_STATUS.PAID;
                }
                
                // Obtener el historial de transacciones existente o crear uno nuevo
                const transactions = debtToUse.transactions || [];
                
                // Añadir la nueva transacción al historial
                transactions.push(newTransaction);
                
                // Actualizar el documento de deuda
                await updateDoc(doc(fireDB, 'debts', debtToUse.id), {
                    amount: newAmount,
                    remainingAmount: newRemainingAmount,
                    status: newStatus,
                    transactions: transactions,
                    lastUpdated: Timestamp.now(),
                    description: `Deuda global - Último pedido: #${orderRef.id}`
                });
                
                debtId = debtToUse.id;
                debtStatus = newStatus;
                
                toast.success(orderType === 'deuda' 
                    ? "Pedido añadido a la deuda global del usuario" 
                    : "Pedido registrado en el historial global del usuario");
            } else {
                // Crear una nueva deuda global
                const newDebt = {
                    userId: selectedUser,
                    userName: selectedUserData.name || selectedUserData.email,
                    userEmail: selectedUserData.email,
                    amount: finalAmount,
                    // Si es a deuda, el monto restante es el total
                    // Si es otro tipo, el monto restante es 0 (pagado)
                    remainingAmount: orderType === 'deuda' ? finalAmount : 0,
                    description: `Deuda global - Pedido #${orderRef.id}`,
                    date: Timestamp.now(),
                    status: debtStatus, // Usar el estado determinado anteriormente
                    orderId: orderRef.id,
                    createdBy: JSON.parse(localStorage.getItem('users'))?.uid || 'unknown',
                    time: Timestamp.now(),
                    paymentHistory: [],
                    transactions: [newTransaction],
                    lastUpdated: Timestamp.now()
                };
                
                const newDebtRef = await addDoc(collection(fireDB, "debts"), newDebt);
                debtId = newDebtRef.id;
                
                if (orderType === 'deuda') {
                    toast.success("Nueva deuda global creada para el usuario");
                } else {
                    toast.success("Pedido registrado como pagado en nueva deuda global");
                }
            }
            
            // Actualizar la orden con la referencia a la deuda
            await updateDoc(doc(fireDB, "orders", orderRef.id), {
                debtId: debtId,
                debtStatus: debtStatus
            });
            
            // Actualizar stock de productos
            for (const item of cartItems) {
                try {
                    const productRef = doc(fireDB, 'products', item.id);
                    await runTransaction(fireDB, async (transaction) => {
                        const productDoc = await transaction.get(productRef);
                        if (!productDoc.exists()) {
                            throw new Error(`Producto ${item.id} no encontrado`);
                        }
                        
                        const productData = productDoc.data();
                        const currentStock = productData.stock || 0;
                        const newStock = Math.max(0, currentStock - item.quantity);
                        
                        transaction.update(productRef, { 
                            stock: newStock,
                            updatedAt: Timestamp.now()
                        });
                        
                        console.log(`Stock actualizado para ${item.title}: ${currentStock} -> ${newStock}`);
                    });
                } catch (error) {
                    console.error(`Error al actualizar stock del producto ${item.id}:`, error);
                    // Continuamos con los demás productos aunque falle uno
                }
            }
            
            // Limpiar el carrito y mostrar mensaje de éxito
            dispatch(clearCart({ userId: 'admin_cart' }));
            
            toast.success(`Pedido creado exitosamente para ${selectedUserData.name || 'usuario'}`);
            
            // Actualizar la lista de órdenes
            getAllOrderFunction();
            
            // Resetear estados
            setStep(1);
            setSelectedUser('');
            setSelectedUserData(null);
            setAddressInfo({
                name: '',
                phoneNumber: '',
                address: '',
                city: '',
                pincode: ''
            });
            setOrderType('normal');
            setPaymentMethod('efectivo');
            setDiscount('0');
            setAdminNote('');
            setProcessingOrder(false);
            setLoading(false);
            
            // Opcional: redirigir a la página de órdenes
            navigate('/admin-dashboard');
            
        } catch (error) {
            console.error('Error al crear pedido:', error);
            toast.error('Error al crear pedido: ' + error.message);
            setProcessingOrder(false);
            setLoading(false);
        }
    };

    // Renderizado del componente
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Crear Pedido Administrativo</h2>
                <button
                    onClick={() => navigate('/admin-dashboard')}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                    Volver al Dashboard
                </button>
            </div>
            
            {/* Indicador de pasos */}
            <div className="flex items-center justify-between mb-8">
                <div className={`flex-1 text-center ${step >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    1. Seleccionar Usuario
                </div>
                <div className="w-10 h-1 bg-gray-300"></div>
                <div className={`flex-1 text-center ${step >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    2. Añadir Productos
                </div>
                <div className="w-10 h-1 bg-gray-300"></div>
                <div className={`flex-1 text-center ${step >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                    3. Detalles de Entrega
                </div>
            </div>
            
            {/* Paso 1: Selección de usuario */}
            {step === 1 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Seleccionar Usuario</h3>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">Usuario:</label>
                        <select 
                            className="w-full p-2 border rounded"
                            value={selectedUser}
                            onChange={handleUserSelect}
                        >
                            <option value="">Seleccione un usuario</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {selectedUserData && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Información del Usuario</h4>
                            <p><span className="font-medium">Nombre:</span> {selectedUserData.name}</p>
                            <p><span className="font-medium">Email:</span> {selectedUserData.email}</p>
                            <p><span className="font-medium">Teléfono:</span> {selectedUserData.phoneNumber || 'No disponible'}</p>
                        </div>
                    )}
                    
                    <div className="flex justify-end mt-6">
                        <button
                            onClick={handleNextStep}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            disabled={!selectedUser}
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
            
            {/* Paso 2: Selección de productos */}
            {step === 2 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold mb-4">Añadir Productos</h3>     
                    {/* Resultados de búsqueda */}
{/* Sección de búsqueda de productos */}
<div className="mb-6">
    <h3 className="text-lg font-medium mb-2">Buscar Productos</h3>
    <div className="flex mb-4">
        <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            className="flex-grow p-2 border rounded-l"
        />
        <button
            onClick={() => setSearchTerm('')}
            className="bg-gray-200 px-4 py-2 rounded-r"
        >
            Limpiar
        </button>
    </div>
    
    {/* Resultados de búsqueda */}
    {filteredProducts.length > 0 && (
        <div className="border rounded-lg overflow-hidden mb-4">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                        <tr key={product.id}>
                            <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                    {product.imageUrl && (
                                        <img 
                                            src={product.imageUrl} 
                                            alt={product.title} 
                                            className="h-10 w-10 object-cover mr-2"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/placeholder.png';
                                            }}
                                        />
                                    )}
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                        <div className="text-xs text-gray-500">{product.category}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">Bs. {product.price}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
{/* Aquí debe estar el input que causa el error */}
<input
    type="number"
    min="1"
    max={product.stock}
    value={productQuantities[product.id] || 1}
    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
    className="w-16 px-2 py-1 border rounded text-center"
/>

                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                                <button
                                    onClick={() => addProductToCart(product)}
                                    disabled={product.stock <= 0}
                                    className={`px-3 py-1 rounded text-white ${
                                        product.stock <= 0 ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                                >
                                    {product.stock <= 0 ? 'Sin stock' : 'Agregar'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
</div>
                        {/* Carrito de compras */}
                        <div className="mt-6">
                            <h4 className="font-medium mb-2">Carrito ({cartItems.length}):</h4>
                            
                            {cartItems.length === 0 ? (
                                <div className="p-4 bg-gray-100 rounded text-center">
                                    El carrito está vacío
                                </div>
                            ) : (
                                <div className="border rounded">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="p-3 border-b flex justify-between items-center">
                                            <div className="flex items-center">
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.title}
                                                    className="w-12 h-12 object-cover mr-3"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/placeholder.png';
                                                    }}
                                                />
                                                <div>
                                                    <p className="font-medium">{item.title}</p>
                                                    <p className="text-sm text-gray-600">
                                                        Bs. {item.price} x {item.quantity} = Bs. {item.price * item.quantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveFromCart(item.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <div className="p-3 bg-gray-50 font-medium text-right">
                                        Total: Bs. {cartTotal.toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-between mt-6">
                            <button
                                onClick={handlePrevStep}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={handleNextStep}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                disabled={cartItems.length === 0}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Paso 3: Detalles de entrega y pago */}
                {step === 3 && (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-4">Detalles de Entrega y Pago</h3>
                        
                        {/* Información de entrega */}
                        <div className="mb-6">
                            <h4 className="font-medium mb-3">Información de Entrega</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-gray-700 mb-1">Nombre:</label>
                                    <input 
                                        type="text"
                                        name="name"
                                        className="w-full p-2 border rounded"
                                        value={addressInfo.name}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">Teléfono:</label>
                                    <input 
                                        type="text"
                                        name="phoneNumber"
                                        className="w-full p-2 border rounded"
                                        value={addressInfo.phoneNumber}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-gray-700 mb-1">Dirección:</label>
                                    <input 
                                        type="text"
                                        name="address"
                                        className="w-full p-2 border rounded"
                                        value={addressInfo.address}
                                        onChange={handleAddressChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">Ciudad:</label>
                                    <input 
                                        type="text"
                                        name="city"
                                        className="w-full p-2 border rounded"
                                        value={addressInfo.city}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 mb-1">Código Postal:</label>
                                    <input 
                                        type="text"
                                        name="pincode"
                                        className="w-full p-2 border rounded"
                                        value={addressInfo.pincode}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Información de pago */}
                        <div className="mb-6">
                            <h4 className="font-medium mb-3">Información de Pago</h4>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-1">Tipo de Pedido:</label>
                                <div className="flex space-x-4">
                                    <label className="inline-flex items-center">
                                        <input 
                                            type="radio" 
                                            value="normal" 
                                            checked={orderType === 'normal'}
                                            onChange={() => setOrderType('normal')}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Normal (Pago inmediato)</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input 
                                            type="radio" 
                                            value="deuda" 
                                            checked={orderType === 'deuda'}
                                            onChange={() => setOrderType('deuda')}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">A Crédito (Deuda)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-1">Método de Pago:</label>
                                <select 
                                    className="w-full p-2 border rounded"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                                    <option value="qr">Pago QR</option>
                                    {orderType === 'deuda' && (
                                        <option value="credito">Crédito (Pago posterior)</option>
                                    )}
                                </select>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-1">Descuento (Bs.):</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 border rounded"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 mb-1">Nota Administrativa:</label>
                                <textarea 
                                    className="w-full p-2 border rounded"
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    rows="3"
                                    placeholder="Notas adicionales para este pedido..."
                                ></textarea>
                            </div>
                        </div>
                        
                        {/* Resumen del pedido */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-3">Resumen del Pedido</h4>
                            <div className="flex justify-between mb-2">
                                <span>Subtotal:</span>
                                <span>Bs. {cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span>Descuento:</span>
                                <span>Bs. {parseFloat(discount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span>Bs. {finalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-between mt-6">
                            <button
                                onClick={handlePrevStep}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={handleCreateOrder}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                disabled={processingOrder || !addressInfo.name || !addressInfo.phoneNumber || !addressInfo.address}
                            >
                                {processingOrder ? 'Procesando...' : 'Crear Pedido'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    export default AdminOrderCreation;