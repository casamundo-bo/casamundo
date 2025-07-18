// ... código existente ...
import { collection, getDocs, doc, getDoc, addDoc, Timestamp, runTransaction, query, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import { DEBT_STATUS, createDebtTransaction, normalizeDebtStatus } from '../../utils/debtUtils';

// Modificar la función handleBuy donde se procesa la orden del usuario
const handleBuy = async () => {
    // Validaciones existentes...
    
    try {
        setLoading(true);
        
        // Obtener el usuario actual
        const user = JSON.parse(localStorage.getItem('users'));
        console.log("Usuario obtenido:", user?.uid, user?.email);
        
        if (!user || !user.uid) {
            toast.error("Debe iniciar sesión para realizar compras");
            setLoading(false);
            return;
        }
        
        // Calcular el total del carrito
        const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        console.log("Total del carrito:", cartTotal);
        
        // Usar datos predeterminados si no hay información de envío
        const finalAddressInfo = {
            name: addressInfo.name || user.name || user.email || 'Cliente',
            address: addressInfo.address || 'Dirección no especificada',
            pincode: addressInfo.pincode || '00000',
            phoneNumber: addressInfo.phoneNumber || user.phoneNumber || '0000000000',
            email: addressInfo.email || user.email || 'cliente@ejemplo.com',
            city: addressInfo.city || 'Ciudad'
        };
        
        // MEJORA: Asegurar que todos los campos de usuario estén correctamente definidos
        const orderInfo = {
            userId: user.uid,
            uid: user.uid, // Campo duplicado para compatibilidad
            userName: user.name || user.email || 'Usuario sin nombre',
            userEmail: user.email || '',
            email: user.email || '', // Campo duplicado para compatibilidad
            products: cartItems.map(item => ({
                ...item,
                date: Timestamp.now() // Asegurar que cada producto tenga fecha
            })),
            addressInfo: finalAddressInfo,
            date: Timestamp.now(),
            time: Timestamp.now(),
            status: 'pendiente',
            paymentMethod: paymentMethod,
            amount: cartTotal,
            // NUEVO: Añadir campos adicionales para mejorar trazabilidad
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            orderNumber: Date.now().toString().slice(-8), // Número de orden simplificado
            userRole: user.role || 'customer'
        };
        
        // Guardar la orden en Firestore
        const orderRef = await addDoc(collection(fireDB, "orders"), orderInfo);
        
        // MODIFICADO: Buscar la deuda global del usuario, independientemente del estado
        // Primero buscamos deudas activas (pendientes o parciales)
        const activeDebtQuery = query(
            collection(fireDB, "debts"),
            where("userId", "==", user.uid),
            where("status", "in", [DEBT_STATUS.PENDING, DEBT_STATUS.PARTIAL])
        );
        
        let debtSnapshot = await getDocs(activeDebtQuery);
        
        // Si no hay deudas activas, buscamos cualquier deuda del usuario (incluso pagadas)
        // para reutilizarla en lugar de crear una nueva
        if (debtSnapshot.empty) {
            const anyDebtQuery = query(
                collection(fireDB, "debts"),
                where("userId", "==", user.uid),
                orderBy("lastUpdated", "desc"),
                limit(1)
            );
            debtSnapshot = await getDocs(anyDebtQuery);
        }
        
        // Crear la transacción para el historial usando la utilidad
        const newTransaction = createDebtTransaction({
            type: 'addition',
            amount: cartTotal,
            orderId: orderRef.id,
            note: `Pedido #${orderRef.id} - ${cartItems.length} productos`,
            paymentMethod: paymentMethod
        });
        
        let debtId = null;
        let debtStatus = paymentMethod === 'credit' ? DEBT_STATUS.PENDING : DEBT_STATUS.PAID;
        
        if (!debtSnapshot.empty) {
            // El usuario ya tiene una deuda, actualizarla
            const debtDoc = debtSnapshot.docs[0];
            const debtData = debtDoc.data();
            
            // Calcular el nuevo monto total
            const newAmount = parseFloat(debtData.amount || 0) + cartTotal;
            
            // Calcular el monto restante según el método de pago
            const newRemainingAmount = paymentMethod === 'credit' 
                ? parseFloat(debtData.remainingAmount || 0) + cartTotal 
                : parseFloat(debtData.remainingAmount || 0);
            
            // Determinar el nuevo estado de la deuda
            let newStatus = debtData.status;
            if (paymentMethod === 'credit') {
                // Si es a crédito, la deuda está pendiente o parcial
                newStatus = newRemainingAmount > 0 ? DEBT_STATUS.PARTIAL : DEBT_STATUS.PAID;
            } else if (newRemainingAmount <= 0) {
                // Si no es a crédito y no queda monto pendiente, marcar como pagada
                newStatus = DEBT_STATUS.PAID;
            }
            
            // Obtener el historial de transacciones existente o crear uno nuevo
            const transactions = debtData.transactions || [];
            
            // Añadir la nueva transacción al historial
            transactions.push(newTransaction);
            
            // Actualizar el documento de deuda
            await updateDoc(doc(fireDB, "debts", debtDoc.id), {
                amount: newAmount,
                remainingAmount: newRemainingAmount,
                status: newStatus,
                transactions: transactions,
                lastUpdated: Timestamp.now(),
                description: `Deuda global - Último pedido: #${orderRef.id}`
            });
            
            debtId = debtDoc.id;
            debtStatus = newStatus;
            
            toast.success(paymentMethod === 'credit' 
                ? "Pedido añadido a tu deuda global" 
                : "Pedido registrado en tu historial de pagos");
        } else {
            // Crear una nueva deuda global
            const newDebt = {
                userId: user.uid,
                userName: user.name || user.email,
                userEmail: user.email,
                amount: cartTotal,
                // Si es a crédito, el monto restante es el total
                // Si es otro método, el monto restante es 0 (pagado)
                remainingAmount: paymentMethod === 'credit' ? cartTotal : 0,
                description: `Deuda global - Primer pedido: #${orderRef.id}`,
                date: Timestamp.now(),
                status: debtStatus,
                orderId: orderRef.id,
                createdBy: user.uid,
                time: Timestamp.now(),
                paymentHistory: [],
                transactions: [newTransaction],
                lastUpdated: Timestamp.now()
            };
            
            const newDebtRef = await addDoc(collection(fireDB, "debts"), newDebt);
            debtId = newDebtRef.id;
            
            if (paymentMethod === 'credit') {
                toast.success("Nueva deuda global creada para tu cuenta");
            } else {
                toast.success("Pedido registrado como pagado en tu historial global");
            }
        }
        
        // MEJORA: Actualizar la orden con la referencia a la deuda
        await updateDoc(doc(fireDB, "orders", orderRef.id), {
            debtId: debtId,
            debtStatus: debtStatus
        });
        
        toast.success("Pedido realizado exitosamente");
        setLoading(false);
        
        // Limpiar el carrito y redirigir
        dispatch(deleteFromCart());
        navigate('/order-success');
        
    } catch (error) {
        console.error("Error al realizar el pedido:", error);
        toast.error("Error al realizar el pedido");
        setLoading(false);
    }
};