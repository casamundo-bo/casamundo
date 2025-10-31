import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    serverTimestamp, 
    Timestamp,
    arrayUnion,
    onSnapshot,
    setDoc,
    collectionGroup,
    limit
} from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import toast from "react-hot-toast";
import { DEBT_STATUS, createDebtTransaction, normalizeDebtStatus } from "../../utils/debtUtils";

const DebtDetail = () => {
    // Contexto
    const context = useContext(myContext);
    const { getAllUser, loading, setLoading, getAllUserFunction, refreshDebtsAfterChange, getAllDebtsFunction } = context;
    
    // Estados principales
    const [debts, setDebts] = useState([]);
    const [filteredDebts, setFilteredDebts] = useState([]);
    const [totalDebtAmount, setTotalDebtAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDebt, setSelectedDebt] = useState(null);
    
    // Estado para modales
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showAddAmountForm, setShowAddAmountForm] = useState(false);
    const [showTransactionHistory, setShowTransactionHistory] = useState(false);
    const [transactionHistory, setTransactionHistory] = useState([]);
    
    // Estado para mostrar pedidos relacionados
    const [showRelatedOrders, setShowRelatedOrders] = useState(false);
    const [relatedOrders, setRelatedOrders] = useState([]);
    const [userDebtSummary, setUserDebtSummary] = useState({});
    
    // Estados de formularios
    const [formData, setFormData] = useState({
        userId: "",
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        status: "pending",
        remainingAmount: "",
        paymentHistory: []
    });
    
    const [paymentForm, setPaymentForm] = useState({
        debtId: "",
        paymentAmount: "",
        paymentDate: new Date().toISOString().split('T')[0],
        paymentNote: ""
    });
    
    const [addAmountForm, setAddAmountForm] = useState({
        debtId: "",
        additionalAmount: "",
        addDate: new Date().toISOString().split('T')[0],
        addNote: ""
    });
    const [showPriceEditForm, setShowPriceEditForm] = useState(false);
    const [priceEditForm, setPriceEditForm] = useState({
        orderId: "",
        currentPrice: 0,
        newPrice: 0,
        editNote: ""
    });
    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
    // Estado para controlar envíos múltiples
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Cargar usuarios al iniciar el componente
    useEffect(() => {
        if (!getAllUser || getAllUser.length === 0) {
            getAllUserFunction();
        }
    }, [getAllUser, getAllUserFunction]);

    // Cargar deudas al iniciar
    useEffect(() => {
        fetchDebts();
    }, []);
    
    // Manejar la búsqueda
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredDebts(debts);
        } else {
            const filtered = debts.filter(
                debt => 
                    (debt.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                    (debt.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                    (debt.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase())
            );
            setFilteredDebts(filtered);
        }
    }, [searchTerm, debts]);
    
    // Calcular total de deudas
    useEffect(() => {
        const total = filteredDebts.reduce((sum, debt) => {
            return sum + (parseFloat(debt.remainingAmount) || 0);
        }, 0);
        setTotalDebtAmount(total);
    }, [filteredDebts]);
    
    // Función mejorada para obtener todas las deudas
    const fetchDebts = async () => {
        try {
            setLoading(true);
            console.log("Obteniendo deudas...");
            
            const debtsRef = collection(fireDB, "debts");
            const debtsSnapshot = await getDocs(debtsRef);
            
            const debtsArray = [];
            
            debtsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data) {
                    debtsArray.push({
                        id: doc.id,
                        ...data,
                        // Asegurar que createdAt y date estén presentes y sean consistentes
                        createdAt: data.createdAt || data.date || serverTimestamp(),
                        date: data.date || data.createdAt || serverTimestamp()
                    });
                }
            });
            
            console.log(`Se encontraron ${debtsArray.length} deudas`, debtsArray);
            
            if (debtsArray.length === 0) {
                console.log("No se encontraron deudas en la base de datos. Verificando la colección 'debts'...");
            }
            
            // Agrupar deudas por usuario para el resumen
            const userSummary = {};
            
            debtsArray.forEach(debt => {
                if (!debt.userId) return;
                
                if (!userSummary[debt.userId]) {
                    userSummary[debt.userId] = {
                        userName: debt.userName || "Usuario sin nombre",
                        userEmail: debt.userEmail || "",
                        totalDebt: 0,
                        totalPaid: 0,
                        remainingDebt: 0,
                        debtCount: 0
                    };
                }
                
                const debtAmount = parseFloat(debt.amount) || 0;
                const remainingAmount = parseFloat(debt.remainingAmount) || 0;
                const paidAmount = debtAmount - remainingAmount;
                
                userSummary[debt.userId].totalDebt += debtAmount;
                userSummary[debt.userId].totalPaid += paidAmount;
                userSummary[debt.userId].remainingDebt += remainingAmount;
                userSummary[debt.userId].debtCount += 1;
            });
            
            setUserDebtSummary(userSummary);
            setDebts(debtsArray);
            setFilteredDebts(debtsArray);
            
        } catch (error) {
            console.error("Error al obtener deudas:", error);
            toast.error("Error al cargar las deudas");
        } finally {
            setLoading(false);
        }
    };    
    
    // Funciones para actualizar data global
    const updateGlobalDebtsData = async () => {
        await fetchDebts();
        
        if (typeof refreshDebtsAfterChange === 'function') {
            await refreshDebtsAfterChange();
        } else if (typeof getAllDebtsFunction === 'function') {
            await getAllDebtsFunction(true);
        }
    };

    // Función para obtener pedidos relacionados con una deuda
    const fetchRelatedOrders = async (userId, debtId) => {
        try {
            setLoading(true);
            
            // Buscar órdenes directamente relacionadas con la deuda
            const debtOrdersQuery = query(
                collection(fireDB, "orders"),
                where("debtId", "==", debtId)
            );
            
            // Buscar todas las órdenes del usuario
            const userOrdersQuery = query(
                collection(fireDB, "orders"),
                where("userId", "==", userId)
            );
            
            const [debtOrdersSnapshot, userOrdersSnapshot] = await Promise.all([
                getDocs(debtOrdersQuery),
                getDocs(userOrdersQuery)
            ]);
            
            // Procesar órdenes relacionadas con la deuda
            const directlyRelatedOrders = [];
            debtOrdersSnapshot.forEach(doc => {
                directlyRelatedOrders.push({
                    id: doc.id,
                    ...doc.data(),
                    isDirectlyRelated: true
                });
            });
            
            // Procesar todas las órdenes del usuario
            const allUserOrders = [];
            userOrdersSnapshot.forEach(doc => {
                // Evitar duplicados
                if (!directlyRelatedOrders.some(order => order.id === doc.id)) {
                    allUserOrders.push({
                        id: doc.id,
                        ...doc.data(),
                        isDirectlyRelated: false
                    });
                }
            });
            
            // Combinar y ordenar por fecha (más reciente primero)
            const combinedOrders = [...directlyRelatedOrders, ...allUserOrders].sort((a, b) => {
                const dateA = a.date?.seconds || 0;
                const dateB = b.date?.seconds || 0;
                return dateB - dateA;
            });
            
            setRelatedOrders(combinedOrders);
            setShowRelatedOrders(true);
            
        } catch (error) {
            console.error("Error al obtener pedidos relacionados:", error);
            toast.error("Error al cargar los pedidos relacionados");
        } finally {
            setLoading(false);
        }
    };

// Función para obtener detalles de un pedido específico para edición
const fetchOrderDetailsForEdit = async (orderId) => {
    try {
        setLoading(true);
        
        console.log("Obteniendo detalles del pedido para edición:", orderId);
        
        const orderDoc = await getDoc(doc(fireDB, "orders", orderId));
        
        if (orderDoc.exists()) {
            const orderData = orderDoc.data();
            console.log("Datos del pedido obtenidos para edición:", orderData);
            
            setSelectedOrderForEdit({
                id: orderId,
                ...orderData
            });
            
            setPriceEditForm({
                orderId: orderId,
                currentPrice: parseFloat(orderData.totalAmount) || 0,
                newPrice: parseFloat(orderData.totalAmount) || 0,
                editNote: ""
            });
            
            setShowPriceEditForm(true);
        } else {
            console.error("No se encontró el pedido:", orderId);
            toast.error("No se encontró información del pedido");
        }
    } catch (error) {
        console.error("Error al obtener detalles del pedido:", error);
        toast.error("Error al cargar detalles del pedido");
    } finally {
        setLoading(false);
    }
};

// Función para actualizar el precio de un pedido
const updateOrderPrice = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
        toast.error("Ya hay una operación en curso, por favor espera");
        return;
    }
    
    if (!priceEditForm.orderId || !selectedOrderForEdit) {
        toast.error("No se ha seleccionado ningún pedido");
        return;
    }
    
    const newPrice = parseFloat(priceEditForm.newPrice);
    const currentPrice = parseFloat(priceEditForm.currentPrice);
    
    if (isNaN(newPrice) || newPrice <= 0) {
        toast.error("Por favor ingresa un precio válido mayor a cero");
        return;
    }
    
    try {
        setIsSubmitting(true);
        setLoading(true);
        
        const orderRef = doc(fireDB, "orders", priceEditForm.orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
            toast.error("El pedido ya no existe");
            return;
        }
        
        const orderData = orderDoc.data();
        const originalAmount = parseFloat(orderData.originalAmount) || parseFloat(orderData.totalAmount) || 0;
        const oldTotalAmount = parseFloat(orderData.totalAmount) || 0;
        const priceDifference = newPrice - oldTotalAmount;
        
        // Calcular el nuevo porcentaje de descuento basado en el nuevo precio
        let newDiscount = 0;
        if (originalAmount > 0 && newPrice < originalAmount) {
            newDiscount = ((originalAmount - newPrice) / originalAmount) * 100;
        }
        
        // Actualizar el pedido con el nuevo precio
        await updateDoc(orderRef, {
            totalAmount: newPrice,
            discount: newDiscount,
            adminNote: orderData.adminNote 
                ? `${orderData.adminNote}\n[${new Date().toLocaleString()}] Precio editado de Bs. ${oldTotalAmount.toFixed(2)} a Bs. ${newPrice.toFixed(2)}. Nota: ${priceEditForm.editNote}`
                : `[${new Date().toLocaleString()}] Precio editado de Bs. ${oldTotalAmount.toFixed(2)} a Bs. ${newPrice.toFixed(2)}. Nota: ${priceEditForm.editNote}`,
            lastUpdated: Timestamp.now()
        });
        
        console.log(`Precio del pedido actualizado: ${oldTotalAmount} -> ${newPrice}`);
        
        // Si el pedido tiene una deuda asociada, actualizarla también
        if (orderData.debtId) {
            const debtRef = doc(fireDB, "debts", orderData.debtId);
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
                    orderId: priceEditForm.orderId,
                    note: `Ajuste de precio en pedido #${priceEditForm.orderId}: ${priceDifference >= 0 ? 'Incremento' : 'Reducción'} de Bs. ${Math.abs(priceDifference).toFixed(2)}. Nota: ${priceEditForm.editNote}`,
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
                console.warn(`La deuda asociada (${orderData.debtId}) no existe`);
            }
        } else {
            console.log("El pedido no tiene una deuda asociada");
        }
        
        toast.success("Precio del pedido actualizado correctamente");
        setShowPriceEditForm(false);
        
        // Actualizar la lista de deudas
        await updateGlobalDebtsData();
        
        // Si estamos viendo los pedidos relacionados, actualizarlos
        if (showRelatedOrders && selectedDebt) {
            await fetchRelatedOrders(selectedDebt.userId, selectedDebt.id);
        }
        
    } catch (error) {
        console.error("Error al actualizar el precio del pedido:", error);
        toast.error("Error al actualizar el precio: " + error.message);
    } finally {
        setLoading(false);
        setIsSubmitting(false);
    }
};

    // Función para ver el historial de transacciones
    const viewTransactionHistory = (debt) => {
        if (!debt || !debt.transactions) {
            setTransactionHistory([]);
            toast.error("No hay historial de transacciones disponible");
            return;
        }
        
        // Ordenar transacciones por fecha (más reciente primero)
        const sortedTransactions = [...debt.transactions].sort((a, b) => {
            const dateA = a.date?.seconds || 0;
            const dateB = b.date?.seconds || 0;
            return dateB - dateA;
        });
        
        setTransactionHistory(sortedTransactions);
        setSelectedDebt(debt); // Guardar la deuda seleccionada para mostrar totales
        setShowTransactionHistory(true);
    };


    // Modificar la función addDebt para asegurar que userName sea una cadena
    const addDebt = async (e) => {
        e.preventDefault();
        
        // Evitar múltiples envíos
        if (isSubmitting) {
            toast.error("Ya hay una operación en curso, por favor espera");
            return;
        }
        
        // Validaciones básicas
        if (!formData.userId || !formData.amount || formData.amount <= 0) {
            toast.error("Por favor completa todos los campos correctamente");
            return;
        }
        
        try {
            setIsSubmitting(true);
            setLoading(true);
            
            console.log("Intentando crear deuda con datos:", formData);
            
            // Verificar si ya existe una deuda similar para este usuario (ampliamos el tiempo a 5 minutos)
            const debtRef = collection(fireDB, "debts");
            const q = query(
                debtRef, 
                where("userId", "==", formData.userId),
                where("createdAt", ">=", new Date(Date.now() - 300000)), // Últimos 5 minutos (300000 ms)
                where("amount", "==", parseFloat(formData.amount))
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                toast.error("Ya existe una deuda similar creada recientemente para este usuario");
                setLoading(false);
                setIsSubmitting(false);
                return;
            }
            
            // Obtener información del usuario
            const userDoc = await getDoc(doc(fireDB, "user", formData.userId));
            if (!userDoc.exists()) {
                toast.error("Usuario no encontrado");
                setLoading(false);
                setIsSubmitting(false);
                return;
            }
            
            const userData = userDoc.data();
            
            // Asegurar que userName sea una cadena válida
            const userName = userData.name || userData.displayName || userData.email?.split('@')[0] || "Usuario sin nombre";
            
            // Crear la deuda con un ID único generado por Firestore
            const debtData = {
                userId: formData.userId,
                userName: userName, // Asegurar que sea una cadena
                userEmail: userData.email || "",
                amount: parseFloat(formData.amount),
                remainingAmount: parseFloat(formData.amount),
                description: formData.description || "Deuda",
                status: formData.status || "pending", // Asegurarse de que el status sea correcto
                createdAt: serverTimestamp(),
                date: serverTimestamp(), // Añadir campo date para compatibilidad con índices
                lastUpdated: serverTimestamp(),
                transactions: [{
                    type: "creación",
                    amount: parseFloat(formData.amount),
                    date: Timestamp.now(),
                    description: "Creación de deuda",
                    userId: formData.userId,
                    userName: userName, // Añadir también al historial de transacciones
                    userEmail: userData.email || "",
                    processedBy: JSON.parse(localStorage.getItem('users'))?.name || "admin"
                }],
                relatedOrders: [] // Array para almacenar IDs de órdenes relacionadas
            };
            
            console.log("Creando nueva deuda:", debtData);
            
            // Añadir la deuda a Firestore
            const docRef = await addDoc(collection(fireDB, "debts"), debtData);
            console.log("Deuda creada con ID:", docRef.id);
            
            // Limpiar el formulario
            setFormData({
                userId: "",
                amount: "",
                description: "",
                date: new Date().toISOString().split('T')[0],
                status: "pending",
                remainingAmount: "",
                paymentHistory: []
            });
            
            toast.success("Deuda agregada correctamente");
            
            // Actualizar la lista de deudas
            await fetchDebts();
            
        } catch (error) {
            console.error("Error al agregar deuda:", error);
            toast.error("Error al agregar la deuda: " + error.message);
        } finally {
            setLoading(false);
            setTimeout(() => {
                setIsSubmitting(false);
            }, 1000);
        }
    };
    
    // Función para registrar pagos
        // Función para registrar un pago a una deuda
        const registerPayment = async (e) => {
            e.preventDefault();
            
            if (!paymentForm.paymentAmount || isNaN(parseFloat(paymentForm.paymentAmount)) || parseFloat(paymentForm.paymentAmount) <= 0) {
                toast.error("Por favor ingresa un monto válido mayor a cero");
                return;
            }
            
            if (!selectedDebt) {
                toast.error("No se ha seleccionado ninguna deuda");
                return;
            }
            
            try {
                setIsSubmitting(true);
                setLoading(true);
                
                const debtRef = doc(fireDB, "debts", selectedDebt.id);
                
                // Verificar que la deuda sigue existiendo
                const debtDoc = await getDoc(debtRef);
                if (!debtDoc.exists()) {
                    toast.error("La deuda ya no existe");
                    setLoading(false);
                    setIsSubmitting(false);
                    return;
                }
                
                const debtData = debtDoc.data();
                
                // Calcular nuevos montos
                const paymentAmount = parseFloat(paymentForm.paymentAmount);
                const currentRemaining = parseFloat(debtData.remainingAmount || 0);
                
                if (paymentAmount > currentRemaining) {
                    toast.error(`El pago no puede ser mayor al monto pendiente (Bs. ${currentRemaining.toFixed(2)})`);
                    setLoading(false);
                    setIsSubmitting(false);
                    return;
                }
                
                const newRemainingAmount = currentRemaining - paymentAmount;
                
                // Determinar el nuevo estado
                const newStatus = newRemainingAmount <= 0 ? "paid" : 
                             newRemainingAmount < parseFloat(debtData.amount || 0) ? "partial" : "pending";
                
                // Crear registro de transacción
                // CAMBIO: Usar Timestamp.now() en lugar de serverTimestamp() para arrayUnion
                const transactionData = {
                    type: "payment",
                    amount: paymentAmount,
                    date: Timestamp.now(), // Cambiado de serverTimestamp() a Timestamp.now()
                    description: paymentForm.paymentNote || "Pago de deuda",
                    processedBy: JSON.parse(localStorage.getItem('users'))?.name || "admin",
                    userId: selectedDebt.userId,
                    userName: selectedDebt.userName || "",
                    userEmail: selectedDebt.userEmail || ""
                };
                
                // Actualizar la deuda
                await updateDoc(debtRef, {
                    remainingAmount: newRemainingAmount,
                    status: newStatus,
                    lastUpdated: serverTimestamp(), // Aquí sí podemos usar serverTimestamp()
                    transactions: arrayUnion(transactionData)
                });
                
                // Crear registro de pago separado
                await addDoc(collection(fireDB, "debtPayments"), {
                    debtId: selectedDebt.id,
                    userId: selectedDebt.userId,
                    userName: selectedDebt.userName || "",
                    userEmail: selectedDebt.userEmail || "",
                    amount: paymentAmount,
                    description: paymentForm.paymentNote || "Pago de deuda",
                    createdAt: serverTimestamp(), // Aquí también podemos usar serverTimestamp()
                    processedBy: JSON.parse(localStorage.getItem('users'))?.name || "admin"
                });
                
                toast.success(`Pago de Bs. ${paymentAmount.toFixed(2)} registrado exitosamente`);
                
                // Cerrar formulario y actualizar datos
                setShowPaymentForm(false);
                setPaymentForm({
                    debtId: "",
                    paymentAmount: "",
                    paymentDate: new Date().toISOString().split('T')[0],
                    paymentNote: ""
                });
                await fetchDebts();
                await updateGlobalDebtsData();
                
            } catch (error) {
                console.error("Error al registrar pago:", error);
                toast.error("Error al registrar el pago: " + error.message);
            } finally {
                setLoading(false);
                setTimeout(() => {
                    setIsSubmitting(false);
                }, 1000);
            }
        };
    
        // Función para añadir monto adicional a una deuda existente
        const addAmountToDebt = async (e) => {
            e.preventDefault();
            
            if (!addAmountForm.additionalAmount || isNaN(parseFloat(addAmountForm.additionalAmount)) || parseFloat(addAmountForm.additionalAmount) <= 0) {
                toast.error("Por favor ingresa un monto válido mayor a cero");
                return;
            }
            
            if (!selectedDebt) {
                toast.error("No se ha seleccionado ninguna deuda");
                return;
            }
            
            try {
                setIsSubmitting(true);
                setLoading(true);
                
                const debtRef = doc(fireDB, "debts", selectedDebt.id);
                
                // Verificar que la deuda sigue existiendo
                const debtDoc = await getDoc(debtRef);
                if (!debtDoc.exists()) {
                    toast.error("La deuda ya no existe");
                    setLoading(false);
                    setIsSubmitting(false);
                    return;
                }
                
                const debtData = debtDoc.data();
                
                // Calcular nuevos montos
                const additionalAmount = parseFloat(addAmountForm.additionalAmount);
                const newAmount = parseFloat(debtData.amount || 0) + additionalAmount;
                const newRemainingAmount = parseFloat(debtData.remainingAmount || 0) + additionalAmount;
                
                // Determinar el nuevo estado
                const newStatus = newRemainingAmount <= 0 ? "paid" : 
                             newRemainingAmount < newAmount ? "partial" : "pending";
                
                // Crear registro de transacción
                // CAMBIO: Usar Timestamp.now() en lugar de serverTimestamp() para arrayUnion
                const transactionData = {
                    type: "addition",
                    amount: additionalAmount,
                    date: Timestamp.now(), // Cambiado de serverTimestamp() a Timestamp.now()
                    description: addAmountForm.addNote || "Monto adicional agregado",
                    processedBy: JSON.parse(localStorage.getItem('users'))?.name || "admin",
                    userId: selectedDebt.userId,
                    userName: selectedDebt.userName || "",
                    userEmail: selectedDebt.userEmail || ""
                };
                
                // Actualizar la deuda
                await updateDoc(debtRef, {
                    amount: newAmount,
                    remainingAmount: newRemainingAmount,
                    status: newStatus,
                    lastUpdated: serverTimestamp(), // Aquí sí podemos usar serverTimestamp()
                    transactions: arrayUnion(transactionData)
                });
                
                toast.success(`Monto adicional de Bs. ${additionalAmount.toFixed(2)} agregado exitosamente`);
                
                // Cerrar formulario y actualizar datos
                setShowAddAmountForm(false);
                setAddAmountForm({
                    debtId: "",
                    additionalAmount: "",
                    addDate: new Date().toISOString().split('T')[0],
                    addNote: ""
                });
                await fetchDebts();
                await updateGlobalDebtsData();
                
            } catch (error) {
                console.error("Error al agregar monto adicional:", error);
                toast.error("Error al agregar monto adicional: " + error.message);
            } finally {
                setLoading(false);
                setTimeout(() => {
                    setIsSubmitting(false);
                }, 1000);
            }
        };

    // Función para eliminar una deuda
    const deleteDebt = async (debtId) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta deuda? Esta acción no se puede deshacer.")) {
            return;
        }
        
        try {
            setLoading(true);
            
            await deleteDoc(doc(fireDB, "debts", debtId));
            
            toast.success("Deuda eliminada correctamente");
            
            // Actualizar la lista de deudas
            await fetchDebts();
            await updateGlobalDebtsData();
            
        } catch (error) {
            console.error("Error al eliminar deuda:", error);
            toast.error("Error al eliminar la deuda: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Añadir función para obtener resumen de deudas por usuario
    const getUserDebtSummary = (userId) => {
        if (!userId || !userDebtSummary[userId]) return null;
        return userDebtSummary[userId];
    };

        // Estado para mostrar detalles de un pedido específico
        const [showOrderDetails, setShowOrderDetails] = useState(false);
        const [selectedOrder, setSelectedOrder] = useState(null);
        const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
            // Función para obtener detalles de un pedido específico
    const fetchOrderDetails = async (orderId) => {
        try {
            setLoadingOrderDetails(true);
            
            console.log("Obteniendo detalles del pedido:", orderId);
            
            const orderDoc = await getDoc(doc(fireDB, "orders", orderId));
            
            if (orderDoc.exists()) {
                const orderData = orderDoc.data();
                console.log("Datos del pedido obtenidos:", orderData);
                
                // Verificar si los productos existen y tienen el formato correcto
                if (!orderData.products || !Array.isArray(orderData.products) || orderData.products.length === 0) {
                    console.warn("El pedido no tiene productos o no están en formato de array:", orderData);
                    
                    // Intentar recuperar los productos del carrito si están en otro formato
                    let productsArray = [];
                    
                    // Si hay un campo cartItems, usarlo como fuente de productos
                    if (orderData.cartItems && Array.isArray(orderData.cartItems)) {
                        productsArray = orderData.cartItems;
                    } 
                    // Si hay un campo items, usarlo como fuente de productos
                    else if (orderData.items && Array.isArray(orderData.items)) {
                        productsArray = orderData.items;
                    }
                    // Si no hay productos, crear un producto genérico basado en el monto total
                    else {
                        productsArray = [{
                            id: 'generic-product',
                            title: 'Pedido creado por administrador',
                            price: orderData.totalAmount || 0,
                            quantity: 1,
                            imageUrl: '',
                            category: 'Pedido administrativo',
                            subcategory: ''
                        }];
                    }
                    
                    orderData.products = productsArray;
                    console.log("Productos recuperados o generados:", productsArray);
                }
                
                // Asegurar que cada producto tenga los campos necesarios
                orderData.products = orderData.products.map(product => ({
                    id: product.id || 'unknown-id',
                    title: product.title || 'Producto sin nombre',
                    price: parseFloat(product.price || 0),
                    quantity: parseInt(product.quantity || 1, 10),
                    imageUrl: product.imageUrl || '',
                    category: product.category || '',
                    subcategory: product.subcategory || ''
                }));
                
                // Asegurarse de que todos los campos necesarios estén presentes
                const completeOrderData = {
                    id: orderId,
                    ...orderData,
                    // Asegurar que estos campos siempre estén presentes
                    userName: orderData.userName || 'Usuario sin nombre',
                    userEmail: orderData.userEmail || orderData.email || '',
                    products: orderData.products || [],
                    totalAmount: parseFloat(orderData.totalAmount || 0),
                    originalAmount: parseFloat(orderData.originalAmount || orderData.totalAmount || 0),
                    discount: parseFloat(orderData.discount || 0),
                    // Convertir fechas si es necesario
                    date: orderData.date || Timestamp.now(),
                    // Asegurar que addressInfo esté presente
                    addressInfo: orderData.addressInfo || {},
                    // Información adicional para pedidos creados por administrador
                    isAdminCreated: orderData.isAdminCreated || false,
                    createdBy: orderData.createdBy || 'unknown',
                    adminNote: orderData.adminNote || ''
                };
                
                setSelectedOrder(completeOrderData);
                setShowOrderDetails(true);
            } else {
                console.error("No se encontró el pedido:", orderId);
                toast.error("No se encontró información del pedido");
            }
        } catch (error) {
            console.error("Error al obtener detalles del pedido:", error);
            toast.error("Error al cargar detalles del pedido");
        } finally {
            setLoadingOrderDetails(false);
        }
    };
    //CAMBIO HASTA ARRIBA Añadir función para mostrar deudas agrupadas por usuario
    const getDebtsByUser = () => {
        const userDebts = {};
        
        filteredDebts.forEach(debt => {
            if (!debt.userId) return;
            
            if (!userDebts[debt.userId]) {
                userDebts[debt.userId] = {
                    userId: debt.userId,
                    userName: debt.userName || "Usuario sin nombre",
                    userEmail: debt.userEmail || "",
                    debts: []
                };
            }
            
            userDebts[debt.userId].debts.push(debt);
        });
        
        return Object.values(userDebts);
    };

    // Resto del componente (renderizado)
    return (
        <div className="container mx-auto px-4 py-6">
            {loading && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-4 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-center mt-2">Cargando...</p>
                </div>
            </div>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario de creación de deuda */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-4">Crear Nueva Deuda</h2>
                    <form onSubmit={addDebt}>
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Usuario</label>
                            <select 
                                className="w-full p-2 border rounded"
                                value={formData.userId}
                                onChange={(e) => setFormData({...formData, userId: e.target.value})}
                                required
                            >
                                <option value="">Seleccionar Usuario</option>
                                {getAllUser && getAllUser.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Monto (Bs)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded"
                                value={formData.amount}
                                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Descripción</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                required
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Procesando..." : "Crear Deuda"}
                        </button>
                    </form>
                </div>
                
                {/* Resumen de deudas */}
                <div className="md:col-span-2 bg-white p-4 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">Deudas Pendientes</h2>
                        <div className="text-right">
                            <p className="text-sm">Total: <span className="font-bold text-red-600">Bs. {totalDebtAmount.toFixed(2)}</span></p>
                            <p className="text-xs text-gray-500">Deudas: {filteredDebts.length}</p>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <input 
                            type="text"
                            placeholder="Buscar por nombre, email o descripción..."
                            className="w-full p-2 border rounded"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Vista de deudas agrupadas por usuario */}
                    <div className="overflow-auto max-h-[600px]">
                        <h3 className="font-medium text-gray-700 mb-2">Deudas por Usuario</h3>
                        
                        {getDebtsByUser().map(userDebt => {
                            const summary = getUserDebtSummary(userDebt.userId);
                            return (
                                <div key={userDebt.userId} className="mb-4 border rounded p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-semibold">{userDebt.userName}</h4>
                                            <p className="text-sm text-gray-600">{userDebt.userEmail}</p>
                                        </div>
                                        {summary && (
                                            <div className="text-right">
                                                <p className="text-sm">Total: <span className="font-bold">Bs. {summary.totalDebt.toFixed(2)}</span></p>
                                                <p className="text-sm">Pagado: <span className="font-bold text-green-600">Bs. {summary.totalPaid.toFixed(2)}</span></p>
                                                <p className="text-sm">Pendiente: <span className="font-bold text-red-600">Bs. {summary.remainingDebt.toFixed(2)}</span></p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="mt-2">
                                        <h5 className="text-sm font-medium mb-1">Deudas ({userDebt.debts.length})</h5>
                                        <div className="space-y-2">
                                            {userDebt.debts.map(debt => (
                                                <div 
                                                    key={debt.id} 
                                                    className={`p-2 rounded text-sm ${
                                                        debt.status === 'paid' ? 'bg-green-50 border border-green-200' : 
                                                        debt.status === 'partial' ? 'bg-yellow-50 border border-yellow-200' : 
                                                        'bg-red-50 border border-red-200'
                                                    }`}
                                                >
                                                    <div className="flex justify-between">
                                                        <p className="font-medium">{debt.description}</p>
                                                        <p>
                                                            <span className={`${
                                                                debt.status === 'paid' ? 'text-green-600' : 
                                                                debt.status === 'partial' ? 'text-yellow-600' : 
                                                                'text-red-600'
                                                            }`}>
                                                                Bs. {parseFloat(debt.remainingAmount).toFixed(2)}
                                                            </span>
                                                            <span className="text-gray-500 text-xs ml-1">/ {parseFloat(debt.amount).toFixed(2)}</span>
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex justify-end mt-1 space-x-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedDebt(debt);
                                                                setShowPaymentForm(true);
                                                                setPaymentForm({
                                                                    ...paymentForm,
                                                                    debtId: debt.id,
                                                                    paymentAmount: debt.remainingAmount
                                                                });
                                                            }}
                                                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                                                            disabled={debt.status === 'paid' || debt.remainingAmount <= 0}
                                                        >
                                                            Registrar Pago
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedDebt(debt);
                                                                setShowAddAmountForm(true);
                                                                setAddAmountForm({
                                                                    ...addAmountForm,
                                                                    debtId: debt.id
                                                                });
                                                            }}
                                                            className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                                                        >
                                                            Añadir Monto
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => viewTransactionHistory(debt)}
                                                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                                                        >
                                                            Historial
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => fetchRelatedOrders(debt.userId, debt.id)}
                                                            className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                                                        >
                                                            Ver Pedidos
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => deleteDebt(debt.id)}
                                                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {filteredDebts.length === 0 && (
                            <div className="text-center py-4 text-gray-500">
                                No se encontraron deudas que coincidan con la búsqueda
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Modal para registrar pagos */}
            {showPaymentForm && selectedDebt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Registrar Pago</h2>
                        <p className="mb-4">
                            <span className="font-medium">Deuda:</span> {selectedDebt.description}<br />
                            <span className="font-medium">Usuario:</span> {selectedDebt.userName}<br />
                            <span className="font-medium">Monto pendiente:</span> Bs. {parseFloat(selectedDebt.remainingAmount).toFixed(2)}
                        </p>
                        
                        <form onSubmit={registerPayment}>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Monto a pagar (Bs)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded"
                                    value={paymentForm.paymentAmount}
                                    onChange={(e) => setPaymentForm({...paymentForm, paymentAmount: e.target.value})}
                                    min="0.01"
                                    max={selectedDebt.remainingAmount}
                                    step="0.01"
                                    required
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded"
                                    value={paymentForm.paymentNote}
                                    onChange={(e) => setPaymentForm({...paymentForm, paymentNote: e.target.value})}
                                    placeholder="Ej: Pago parcial, Pago completo, etc."
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                                <button 
                                    type="button" 
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                                    onClick={() => setShowPaymentForm(false)}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Procesando..." : "Registrar Pago"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal para añadir monto adicional */}
            {showAddAmountForm && selectedDebt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-semibold mb-4">Añadir Monto Adicional</h2>
                        <p className="mb-4">
                            <span className="font-medium">Deuda:</span> {selectedDebt.description}<br />
                            <span className="font-medium">Usuario:</span> {selectedDebt.userName}<br />
                            <span className="font-medium">Monto actual:</span> Bs. {parseFloat(selectedDebt.amount).toFixed(2)}<br />
                            <span className="font-medium">Monto pendiente:</span> Bs. {parseFloat(selectedDebt.remainingAmount).toFixed(2)}
                        </p>
                        
                        <form onSubmit={addAmountToDebt}>
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Monto adicional (Bs)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-2 border rounded"
                                    value={addAmountForm.additionalAmount}
                                    onChange={(e) => setAddAmountForm({...addAmountForm, additionalAmount: e.target.value})}
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>
                            
                            <div className="mb-3">
                                <label className="block text-sm font-medium mb-1">Nota (opcional)</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded"
                                    value={addAmountForm.addNote}
                                    onChange={(e) => setAddAmountForm({...addAmountForm, addNote: e.target.value})}
                                    placeholder="Ej: Cargo adicional, Intereses, etc."
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                                <button 
                                    type="button" 
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
                                    onClick={() => setShowAddAmountForm(false)}
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Procesando..." : "Añadir Monto"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal para mostrar detalles del pedido */}
    {showOrderDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold">Detalles del Pedido #{selectedOrder.id}</h2>
                    <button 
                        onClick={() => setShowOrderDetails(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                {loadingOrderDetails ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-medium text-gray-700">Información del Cliente</h3>
                                <p><span className="font-medium">Nombre:</span> {selectedOrder.userName || 'No disponible'}</p>
                                <p><span className="font-medium">Email:</span> {selectedOrder.userEmail || 'No disponible'}</p>
                                <p><span className="font-medium">Teléfono:</span> {selectedOrder.addressInfo?.phoneNumber || 'No disponible'}</p>
                                <p><span className="font-medium">Dirección:</span> {selectedOrder.addressInfo?.address || 'No disponible'}</p>
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-700">Información del Pedido</h3>
                                <p><span className="font-medium">Fecha:</span> {selectedOrder.date ? new Date(selectedOrder.date.seconds * 1000).toLocaleString() : 'No disponible'}</p>
                                <p><span className="font-medium">Estado:</span> {selectedOrder.status || 'No disponible'}</p>
                                <p><span className="font-medium">Método de Pago:</span> {selectedOrder.paymentMethod || 'No disponible'}</p>
                                <p><span className="font-medium">Creado por:</span> {selectedOrder.isAdminCreated ? 'Administrador' : 'Usuario'}</p>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-medium text-gray-700 mb-2">Productos</h3>
                            {selectedOrder.products && selectedOrder.products.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedOrder.products.map((product, index) => (
                                                <tr key={index}>
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
                                                                <div className="text-xs text-gray-500">{product.category} {product.subcategory ? `- ${product.subcategory}` : ''}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">Bs. {parseFloat(product.price).toFixed(2)}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{product.quantity}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">Bs. {(parseFloat(product.price) * parseInt(product.quantity)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No hay productos disponibles para este pedido</p>
                            )}
                        </div>
                        
                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center">
                                <span className="font-medium">Subtotal:</span>
                                <span>Bs. {selectedOrder.originalAmount.toFixed(2)}</span>
                            </div>
                            {selectedOrder.discount > 0 && (
                                <div className="flex justify-between items-center text-green-600">
                                    <span className="font-medium">Descuento ({selectedOrder.discount}%):</span>
                                    <span>- Bs. {(selectedOrder.originalAmount - selectedOrder.totalAmount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center font-bold text-lg mt-2">
                                <span>Total:</span>
                                <span>Bs. {selectedOrder.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {selectedOrder.adminNote && (
                            <div className="border-t pt-4">
                                <h3 className="font-medium text-gray-700 mb-2">Nota Administrativa</h3>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedOrder.adminNote}</p>
                            </div>
                        )}
                        
                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={() => setShowOrderDetails(false)}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )}


    {/* Modal para editar el precio de un pedido */}
    {showPriceEditForm && selectedOrderForEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold">Editar Precio del Pedido</h2>
                    <button 
                        onClick={() => setShowPriceEditForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onSubmit={updateOrderPrice}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Pedido ID
                        </label>
                        <input
                            type="text"
                            value={selectedOrderForEdit.id}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Precio Actual (Bs.)
                        </label>
                        <input
                            type="number"
                            value={priceEditForm.currentPrice}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            disabled
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nuevo Precio (Bs.)
                        </label>
                        <input
                            type="number"
                            value={priceEditForm.newPrice}
                            onChange={(e) => setPriceEditForm({...priceEditForm, newPrice: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nota de Edición
                        </label>
                        <textarea
                            value={priceEditForm.editNote}
                            onChange={(e) => setPriceEditForm({...priceEditForm, editNote: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            rows="3"
                            placeholder="Razón del cambio de precio"
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={() => setShowPriceEditForm(false)}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Actualizando...' : 'Actualizar Precio'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )}

    
            {/* Modal para ver historial de transacciones */}
                {/* Modal para ver historial de transacciones */}
    {showTransactionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Historial de Transacciones</h2>
                    <div className="text-right">
                        <p className="text-sm">
                            <span className="font-medium">Usuario:</span> {selectedDebt?.userName || 'N/A'}
                        </p>
                        <p className="text-sm">
                            <span className="font-medium">Total:</span> Bs. {parseFloat(selectedDebt?.amount || 0).toFixed(2)}
                        </p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-4 text-left">FECHA</th>
                                <th className="py-3 px-4 text-left">MODELO</th>
                                <th className="py-3 px-4 text-left">MEDIDA</th>
                                <th className="py-3 px-4 text-center">CANTIDAD</th>
                                <th className="py-3 px-4 text-right">PRECIO</th>
                                <th className="py-3 px-4 text-right">TOTAL</th>
                                <th className="py-3 px-4 text-right">A CUENTA</th>
                                <th className="py-3 px-4 text-right">SALDO</th>
                                <th className="py-3 px-4 text-center">ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm">
                            {transactionHistory.map((transaction, index) => {
                                // Calcular saldo acumulado
                                let runningBalance = 0;
                                if (transaction.type === 'addition') {
                                    runningBalance = parseFloat(transaction.amount || 0);
                                } else if (transaction.type === 'payment') {
                                    runningBalance = -parseFloat(transaction.amount || 0);
                                }
                                
                                // Formatear fecha
                                const date = transaction.date?.toDate ? 
                                    transaction.date.toDate().toLocaleDateString() : 
                                    new Date(transaction.date).toLocaleDateString();
                                
                                return (
                                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-4">{date}</td>
                                        <td className="py-3 px-4">
                                            {transaction.type === 'addition' ? 'Cargo' : 
                                             transaction.type === 'payment' ? 'Pago' : 
                                             transaction.type === 'creación' ? 'Creación' : 
                                             transaction.type}
                                        </td>
                                        <td className="py-3 px-4">
                                            {transaction.paymentMethod || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {transaction.quantity || 1}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            Bs. {parseFloat(transaction.amount || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            Bs. {parseFloat(transaction.amount || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {transaction.type === 'payment' ? 
                                                `Bs. ${parseFloat(transaction.amount || 0).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {transaction.type === 'addition' ? 
                                                `Bs. ${parseFloat(transaction.amount || 0).toFixed(2)}` : 
                                                transaction.remainingAmount ? 
                                                    `Bs. ${parseFloat(transaction.remainingAmount).toFixed(2)}` : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {transaction.orderId ? (
                                                <button 
                                                    onClick={() => fetchOrderDetails(transaction.orderId)}
                                                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                                >
                                                    Ver Pedido
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                                <td colSpan="5" className="py-3 px-4 text-right">TOTALES:</td>
                                <td className="py-3 px-4 text-right">
                                    Bs. {parseFloat(selectedDebt?.amount || 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    Bs. {(parseFloat(selectedDebt?.amount || 0) - parseFloat(selectedDebt?.remainingAmount || 0)).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    Bs. {parseFloat(selectedDebt?.remainingAmount || 0).toFixed(2)}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                
                <div className="flex justify-end mt-4">
                    <button 
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        onClick={() => setShowTransactionHistory(false)}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )}
            
            {/* Modal para ver pedidos relacionados */}
                {/* Busca la sección donde se muestran los pedidos relacionados y modifícala */}
    {/* Esto suele estar dentro de un modal o sección condicional con showRelatedOrders */}
    
    {/* Modal para mostrar pedidos relacionados */}
    {showRelatedOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold">Pedidos Relacionados</h2>
                    <button 
                        onClick={() => setShowRelatedOrders(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : relatedOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método de Pago</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {relatedOrders.map((order) => (
                                    <tr key={order.id} className={order.isDirectlyRelated ? "bg-blue-50" : ""}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.id.substring(0, 8)}...
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {order.date ? new Date(order.date.seconds * 1000).toLocaleString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-gray-100 text-gray-800'}`}>
                                                {order.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                Bs. {parseFloat(order.totalAmount).toFixed(2)}
                                            </div>
                                            {order.discount > 0 && (
                                                <div className="text-xs text-green-600">
                                                    Descuento: {order.discount}%
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {order.paymentMethod || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => fetchOrderDetails(order.id)}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Ver
                                                </button>
                                                {/* Nuevo botón para editar precio */}
                                                <button
                                                    onClick={() => fetchOrderDetailsForEdit(order.id)}
                                                    className="text-orange-600 hover:text-orange-900"
                                                >
                                                    Editar Precio
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-4">No se encontraron pedidos relacionados</p>
                )}
                
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={() => setShowRelatedOrders(false)}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )}
        </div>
    );
};

export default DebtDetail;