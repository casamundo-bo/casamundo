import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import Loader from "../loader/Loader";
import { Link } from "react-router-dom";
import { formatDate } from '../../utils/dateUtils';
import toast from "react-hot-toast";

const UserDebtView = () => {
    const context = useContext(myContext);
    const { setLoading } = context;
    
    // Use local loading state to prevent interference from other components
    const [localLoading, setLocalLoading] = useState(true);
    const [userDebts, setUserDebts] = useState([]);
    const [selectedDebt, setSelectedDebt] = useState(null);
    
    // Añadir estados para el historial de transacciones
    const [showTransactionHistory, setShowTransactionHistory] = useState(false);
    const [transactionHistory, setTransactionHistory] = useState([]);
    
    // Get current user
    const user = JSON.parse(localStorage.getItem('users'));
    
    // Get user's debts
    const fetchUserDebts = async () => {
        try {
            setLocalLoading(true);
            
            // Obtener el usuario actual
            const user = JSON.parse(localStorage.getItem('users'));
            
            if (!user || !user.uid) {
                console.error("No hay usuario autenticado");
                toast.error("Debe iniciar sesión para ver sus deudas");
                setLocalLoading(false);
                return;
            }
            
            console.log("Buscando deudas para el usuario:", user.uid, user.email);
            
            // Consulta principal por userId
            const userIdQuery = query(
                collection(fireDB, "debts"),
                where("userId", "==", user.uid),
                orderBy("lastUpdated", "desc")
            );
            
            // Consulta adicional por email (para capturar deudas creadas por admin)
            const userEmailQuery = query(
                collection(fireDB, "debts"),
                where("userEmail", "==", user.email),
                orderBy("lastUpdated", "desc")
            );
            
            // Ejecutar ambas consultas
            const [userIdSnapshot, userEmailSnapshot] = await Promise.all([
                getDocs(userIdQuery),
                getDocs(userEmailQuery)
            ]);
            
            // Combinar resultados y eliminar duplicados
            const debtsMap = new Map();
            
            // Procesar resultados de la consulta por userId
            userIdSnapshot.docs.forEach(doc => {
                debtsMap.set(doc.id, {
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Procesar resultados de la consulta por email
            userEmailSnapshot.docs.forEach(doc => {
                if (!debtsMap.has(doc.id)) {
                    debtsMap.set(doc.id, {
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            // Convertir el mapa a array
            const debtsData = Array.from(debtsMap.values());
            
            if (debtsData.length === 0) {
                console.log("No se encontraron deudas para el usuario");
                setUserDebts([]);
                setLocalLoading(false);
                return;
            }
            
            console.log(`Se encontraron ${debtsData.length} deudas para el usuario`);
            
            // Normalizar los datos de las deudas
            const normalizedDebts = debtsData.map(debt => ({
                ...debt,
                // Asegurar que todos los campos necesarios estén presentes
                status: debt.status || 'pending',
                amount: parseFloat(debt.amount || 0),
                remainingAmount: parseFloat(debt.remainingAmount || 0),
                description: debt.description || 'Sin descripción',
                // Añadir información sobre si fue creada por admin
                isAdminCreated: debt.isAdminCreated || debt.createdBy !== user.uid,
                // Asegurar que las transacciones sean un array
                transactions: Array.isArray(debt.transactions) ? debt.transactions : []
            }));
            
            setUserDebts(normalizedDebts);
        } catch (error) {
            console.error("Error al obtener las deudas del usuario:", error);
            toast.error("Error al cargar las deudas");
        } finally {
            setLocalLoading(false);
        }
    };
    
    // View payment history
    const viewPaymentHistory = (debt) => {
        setSelectedDebt(debt);
    };
    
    // Close payment history modal
    const closeHistoryModal = () => {
        setSelectedDebt(null);
    };
    
    // Format date for better display
    const formatDate2 = (dateString) => {
        if (!dateString) return "Fecha no disponible";
        
        try {
            // Si es un objeto Timestamp de Firestore
            if (typeof dateString === 'object' && 'seconds' in dateString && 'nanoseconds' in dateString) {
                const date = new Date(dateString.seconds * 1000);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return date.toLocaleDateString('es-ES', options);
            }
            
            // Si es un objeto Date
            if (dateString instanceof Date) {
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return dateString.toLocaleDateString('es-ES', options);
            }
            
            // Si es una cadena de texto
            if (typeof dateString === 'string') {
                // Parse the date string directly to avoid timezone issues
                const parts = dateString.split('T')[0].split('-');
                const year = parts[0];
                const month = parts[1];
                const day = parts[2];
                
                // Create a date object with the parts
                const date = new Date(year, month - 1, day);
                
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return date.toLocaleDateString('es-ES', options);
            }
            
            // Si es un número (timestamp en milisegundos)
            if (typeof dateString === 'number') {
                const date = new Date(dateString);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                return date.toLocaleDateString('es-ES', options);
            }
            
            return "Formato de fecha desconocido";
        } catch (error) {
            console.error("Error al formatear fecha:", error);
            return "Error al formatear fecha";
        }
    };
    
    // Load debts on component mount and when user changes
    useEffect(() => {
        // Remove this line with the error
        // getUserDebts();
        
        // Keep only this correct function call
        fetchUserDebts();
        
        // Cleanup function to prevent state updates after unmount
        return () => {
            setLocalLoading(false);
        };
    }, [user?.uid]); // Use user.uid as dependency instead of the entire user object
    
    if (localLoading) {
        return <Loader />;
    }
    
    // Añadir función para ver el historial de transacciones
    const viewTransactionHistory = (debt) => {
        if (!debt || !debt.transactions || debt.transactions.length === 0) {
            toast.error("No hay historial de transacciones disponible");
            return;
        }
        
        // Ordenar transacciones por fecha (más reciente primero)
        const sortedTransactions = [...debt.transactions].sort((a, b) => {
            const dateA = a.date?.seconds ? a.date.seconds * 1000 : 0;
            const dateB = b.date?.seconds ? b.date.seconds * 1000 : 0;
            return dateB - dateA;
        });
        
        setSelectedDebt(debt);
        setTransactionHistory(sortedTransactions);
        setShowTransactionHistory(true);
    };
    
    const closeTransactionHistory = () => {
        setSelectedDebt(null);
        setTransactionHistory([]);
        setShowTransactionHistory(false);
    };

    // Modificar el componente TransactionHistoryModal para mostrar más detalles
    const TransactionHistoryModal = ({ show, debt, onClose }) => {
        if (!show) return null;
        
        // Ordenar transacciones por fecha (más recientes primero)
        const sortedTransactions = [...(debt.transactions || [])].sort((a, b) => {
            const dateA = a.date?.seconds ? a.date.seconds : 0;
            const dateB = b.date?.seconds ? b.date.seconds : 0;
            return dateB - dateA;
        });
        
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold">Historial de Transacciones</h3>
                        <button 
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-gray-700">
                            <span className="font-medium">Deuda total:</span> Bs. {debt?.amount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Monto restante:</span> Bs. {debt?.remainingAmount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-gray-700">
                            <span className="font-medium">Estado:</span> 
                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                debt.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : debt.status === 'partial' 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : 'bg-red-100 text-red-800'
                            }`}>
                                {debt.status === 'paid' 
                                    ? 'Pagado' 
                                    : debt.status === 'partial' 
                                        ? 'Pago Parcial'
                                        : 'Pendiente'}
                            </span>
                        </p>
                    </div>
                    
                    <div className="overflow-y-auto max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fecha
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Monto
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Detalles
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedTransactions.map((transaction, index) => {
                                    // Convertir Timestamp a Date si es necesario
                                    const date = transaction.date && transaction.date.seconds 
                                        ? new Date(transaction.date.seconds * 1000 + (transaction.date.nanoseconds || 0) / 1000000) 
                                        : new Date();
                                    
                                    return (
                                        <tr key={index} className={transaction.type === 'payment' ? 'bg-green-50' : 'bg-yellow-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    transaction.type === 'payment' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {transaction.type === 'payment' ? 'Pago' : 'Adición'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Bs. {transaction.amount?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {transaction.note || '-'}
                                                {transaction.orderId && (
                                                    <div className="mt-1">
                                                        <span className="text-xs text-blue-600">
                                                            ID Pedido: {transaction.orderId}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedTransactions.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No hay transacciones registradas
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6">Mis Deudas</h2>
            
            {localLoading ? (
                <div className="flex justify-center">
                    <Loader />
                </div>
            ) : userDebts.length === 0 ? (
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-lg">No tienes deudas pendientes.</p>
                    <p className="text-sm text-gray-600 mt-2">
                        Cuando realices compras a crédito, aparecerán aquí.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {userDebts.map((debt) => (
                        <div 
                            key={debt.id} 
                            className={`border rounded-lg overflow-hidden shadow-md ${
                                debt.status === 'pending' ? 'border-red-300' : 
                                debt.status === 'partial' ? 'border-yellow-300' : 
                                'border-green-300'
                            }`}
                        >
                            <div className="p-4 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-lg font-semibold">{debt.description}</h3>
                                        {/* Mostrar badge si fue creada por admin */}
                                        {debt.isAdminCreated && (
                                            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full mr-2 mb-2">
                                                Creada por administrador
                                            </span>
                                        )}
                                        <div className="text-sm text-gray-500">
                                            Última actualización: {formatDate(debt.lastUpdated)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold">
                                            Total: Bs. {debt.amount.toFixed(2)}
                                        </div>
                                        <div className={`text-sm ${
                                            debt.status === 'pending' ? 'text-red-600' : 
                                            debt.status === 'partial' ? 'text-yellow-600' : 
                                            'text-green-600'
                                        }`}>
                                            Pendiente: Bs. {debt.remainingAmount.toFixed(2)}
                                        </div>
                                        <div className="mt-1">
                                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                                debt.status === 'pending' ? 'bg-red-100 text-red-800' : 
                                                debt.status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {debt.status === 'pending' ? 'Pendiente' : 
                                                 debt.status === 'partial' ? 'Parcial' : 
                                                 'Pagada'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button
                                        onClick={() => {
                                            setSelectedDebt(debt);
                                            setTransactionHistory(debt.transactions || []);
                                            setShowTransactionHistory(true);
                                        }}
                                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                    >
                                        Ver historial
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Modal para mostrar el historial de transacciones */}
            {showTransactionHistory && selectedDebt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-semibold">Historial de Transacciones</h2>
                            <button 
                                onClick={() => setShowTransactionHistory(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-gray-700 mb-1">Detalles de la deuda</h3>
                            <p><span className="font-medium">Descripción:</span> {selectedDebt.description}</p>
                            <p><span className="font-medium">Monto total:</span> Bs. {selectedDebt.amount.toFixed(2)}</p>
                            <p><span className="font-medium">Monto pendiente:</span> Bs. {selectedDebt.remainingAmount.toFixed(2)}</p>
                            <p>
                                <span className="font-medium">Estado:</span> 
                                <span className={`ml-1 ${
                                    selectedDebt.status === 'pending' ? 'text-red-600' : 
                                    selectedDebt.status === 'partial' ? 'text-yellow-600' : 
                                    'text-green-600'
                                }`}>
                                    {selectedDebt.status === 'pending' ? 'Pendiente' : 
                                     selectedDebt.status === 'partial' ? 'Parcial' : 
                                     'Pagada'}
                                </span>
                            </p>
                            {selectedDebt.isAdminCreated && (
                                <p className="mt-2 text-purple-700 text-sm">
                                    Esta deuda fue creada por un administrador
                                </p>
                            )}
                        </div>
                        
                        {transactionHistory.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nota</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado por</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {transactionHistory.map((transaction, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(transaction.date || transaction.timestamp)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                                        transaction.type === 'addition' ? 'bg-red-100 text-red-800' : 
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                        {transaction.type === 'addition' ? 'Cargo' : 'Pago'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                                    <span className={transaction.type === 'addition' ? 'text-red-600' : 'text-green-600'}>
                                                        {transaction.type === 'addition' ? '+' : '-'} Bs. {parseFloat(transaction.amount).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    {transaction.note || 'Sin nota'}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                    {transaction.createdBy === user?.uid ? 'Tú' : 
                                                     transaction.createdByName || 'Administrador'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center py-4 text-gray-500">No hay transacciones registradas</p>
                        )}
                        
                        <div className="flex justify-end mt-4">
                            <button 
                                onClick={() => setShowTransactionHistory(false)}
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

export default UserDebtView;

// Función para ver el historial de transacciones
const handleViewTransactions = (debt) => {
    setSelectedDebt(debt);
    
    // Verificar si hay transacciones
    if (!debt.transactions || !Array.isArray(debt.transactions) || debt.transactions.length === 0) {
        setTransactionHistory([]);
    } else {
        // Ordenar transacciones por fecha (más reciente primero)
        const sortedTransactions = [...debt.transactions].sort((a, b) => {
            const dateA = a.date ? new Date(a.date.seconds * 1000) : new Date(0);
            const dateB = b.date ? new Date(b.date.seconds * 1000) : new Date(0);
            return dateB - dateA;
        });
        
        setTransactionHistory(sortedTransactions);
    }
    
    setShowTransactionHistory(true);
};