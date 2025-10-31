import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import { 
    Chart as ChartJS, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { formatDate } from '../../utils/dateUtils';

// Registrar los componentes de Chart.js
ChartJS.register(
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    Tooltip, 
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const AnalyticsDetail = () => {
    const context = useContext(myContext);
    const { getAllOrder, getAllProduct, getAllUser } = context;
    
    // Estado para los datos de ventas
    const [salesData, setSalesData] = useState({
        totalSales: 0,
        monthlySales: {},
        categorySales: {},
        topProducts: [],
        recentOrders: [],
        salesByDay: {}
    });

    // Estado para los filtros de fecha
    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: '',
        filterType: 'all' // 'all', 'day', 'month', 'year'
    });

    // Estado para los datos filtrados
    const [filteredSalesData, setFilteredSalesData] = useState({
        totalSales: 0,
        monthlySales: {},
        categorySales: {},
        orderCount: 0,
        categoryCount: 0
    });

    // Add state for top users
    const [topUsers, setTopUsers] = useState([]);

    // Función para calcular el total de ventas de un pedido
    const calculateOrderTotal = (order) => {
        // Si el pedido tiene un totalAmount, usarlo
        if (order.totalAmount && !isNaN(parseFloat(order.totalAmount))) {
            return parseFloat(order.totalAmount);
        }
        
        // Si no, calcular desde los items del carrito
        if (order.cartItems && Array.isArray(order.cartItems)) {
            return order.cartItems.reduce((total, item) => {
                const price = parseFloat(item.price) || 0;
                const quantity = parseInt(item.quantity) || 1;
                return total + (price * quantity);
            }, 0);
        }
        
        return 0;
    };

    // Function to calculate top users by order count
    const calculateTopUsers = (orders, users) => {
        // Create a map to count orders per user
        const userOrderCount = {};
        
        // Count orders for each user
        orders.forEach(order => {
            const email = order.email;
            if (email) {
                userOrderCount[email] = (userOrderCount[email] || 0) + 1;
            }
        });
        
        // Convert to array of objects for sorting
        const userOrderArray = Object.entries(userOrderCount).map(([email, count]) => {
            // Find user details if available
            const userDetails = users.find(user => user.email === email) || {};
            return {
                email,
                name: userDetails.name || email.split('@')[0],
                orderCount: count,
                totalSpent: orders
                    .filter(order => order.email === email)
                    .reduce((sum, order) => sum + calculateOrderTotal(order), 0)
            };
        });
        
        // Sort by order count (descending)
        userOrderArray.sort((a, b) => b.orderCount - a.orderCount);
        
        // Return top 10
        return userOrderArray.slice(0, 10);
    };

    // Procesar los datos de pedidos cuando cambian
    useEffect(() => {
        if (!getAllOrder) return;
        
        const orders = Array.isArray(getAllOrder) ? getAllOrder : (getAllOrder?.orders || []);
        
        if (orders.length === 0) return;
        
        try {
            // Calcular el total de ventas
            let totalSales = 0;
            const monthlySales = {};
            const categorySales = {};
            const productSales = {};
            const salesByDay = {};
            
            orders.forEach(order => {
                // Calcular el total del pedido
                const orderTotal = calculateOrderTotal(order);
                totalSales += orderTotal;
                
                // Procesar fecha para estadísticas mensuales y diarias
                let orderDate = new Date();
                if (order.date) {
                    if (typeof order.date === 'string') {
                        try {
                            // Manejo mejorado para fechas en formato string
                            if (order.date.includes('/')) {
                                // Para formatos como "1/4/2025, 11:40:49 p. m."
                                const datePart = order.date.split(',')[0]; // Obtener solo "1/4/2025"
                                const parts = datePart.split('/');
                                
                                if (parts.length === 3) {
                                    // Formato MM/DD/YYYY o DD/MM/YYYY
                                    // En español generalmente es DD/MM/YYYY
                                    const day = parseInt(parts[0]);
                                    const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-11
                                    const year = parseInt(parts[2]);
                                    
                                    // Crear fecha con los componentes
                                    orderDate = new Date(year, month, day);
                                    
                                    // Verificar si la fecha es válida
                                    if (isNaN(orderDate.getTime())) {
                                        // Intentar con formato MM/DD/YYYY
                                        orderDate = new Date(year, day - 1, month + 1);
                                    }
                                } else {
                                    // Intentar parsear directamente
                                    orderDate = new Date(order.date);
                                }
                            } else {
                                // Otros formatos de fecha
                                orderDate = new Date(order.date);
                            }
                            
                            // Verificación final
                            if (isNaN(orderDate.getTime())) {
                                console.warn("No se pudo parsear la fecha:", order.date);
                                return false;
                            }
                        } catch (e) {
                            console.warn("Error al parsear fecha:", order.date, e);
                            return false; // Excluir pedidos con fechas que no se pueden parsear
                        }
                    } else if (order.date.seconds) {
                        // Manejo directo de objetos Timestamp de Firestore
                        orderDate = new Date(order.date.seconds * 1000 + (order.date.nanoseconds || 0) / 1000000);
                    } else if (order.date.toDate && typeof order.date.toDate === 'function') {
                        orderDate = order.date.toDate();
                    }
                }
                
                // Formato para mes: "YYYY-MM"
                const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                monthlySales[monthKey] = (monthlySales[monthKey] || 0) + orderTotal;
                
                // Formato para día: "YYYY-MM-DD"
                const dayKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
                salesByDay[dayKey] = (salesByDay[dayKey] || 0) + orderTotal;
                
                // Procesar categorías y productos
                if (order.cartItems && Array.isArray(order.cartItems)) {
                    order.cartItems.forEach(item => {
                        const category = item.category || 'Sin categoría';
                        const productId = item.id || 'unknown';
                        const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                        
                        categorySales[category] = (categorySales[category] || 0) + itemTotal;
                        
                        if (!productSales[productId]) {
                            productSales[productId] = {
                                id: productId,
                                title: item.title || 'Producto sin nombre',
                                imageUrl: item.imageUrl || '',
                                total: 0,
                                quantity: 0
                            };
                        }
                        
                        productSales[productId].total += itemTotal;
                        productSales[productId].quantity += (parseInt(item.quantity) || 1);
                    });
                }
            });
            
            // Ordenar productos por ventas totales
            const topProducts = Object.values(productSales)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
            
            // Ordenar pedidos por fecha (más recientes primero)
            const recentOrders = [...orders]
                .sort((a, b) => {
                    let dateA = new Date();
                    let dateB = new Date();
                    
                    if (a.date) {
                        if (typeof a.date === 'string') {
                            dateA = new Date(a.date);
                        } else if (a.date.seconds) {
                            dateA = new Date(a.date.seconds * 1000 + (a.date.nanoseconds || 0) / 1000000);
                        } else if (a.date.toDate && typeof a.date.toDate === 'function') {
                            dateA = a.date.toDate();
                        }
                    }
                    
                    if (b.date) {
                        if (typeof b.date === 'string') {
                            dateB = new Date(b.date);
                        } else if (b.date.seconds) {
                            dateB = new Date(b.date.seconds * 1000 + (b.date.nanoseconds || 0) / 1000000);
                        } else if (b.date.toDate && typeof b.date.toDate === 'function') {
                            dateB = b.date.toDate();
                        }
                    }
                    
                    return dateB - dateA;
                })
                .slice(0, 5);
            
            // Calculate top users
            const topUsersList = calculateTopUsers(orders, Array.isArray(getAllUser) ? getAllUser : []);
            setTopUsers(topUsersList);
            
            // Actualizar el estado con los datos procesados
            setSalesData({
                totalSales,
                monthlySales,
                categorySales,
                topProducts,
                recentOrders,
                salesByDay
            });
            
            // Inicializar los datos filtrados con todos los datos
            setFilteredSalesData({
                totalSales,
                monthlySales,
                categorySales,
                orderCount: orders.length,
                categoryCount: Object.keys(categorySales).length
            });
            
        } catch (error) {
            console.error("Error al procesar datos de ventas:", error);
            toast.error("Error al cargar datos de analíticas");
        }
        
    }, [getAllOrder, getAllUser]);

    // Manejar cambios en los filtros de fecha
    const handleDateFilterChange = (e) => {
        const { name, value } = e.target;
        setDateFilter(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Aplicar filtro por tipo (Hoy, Este Mes, Este Año, Todos)
    const applyFilterType = (type) => {
        // Actualizar el estado del filtro
        const today = new Date();
        let startDate = '';
        let endDate = '';
        
        switch (type) {
            case 'day':
                // Para "Hoy", usar la fecha actual
                startDate = today.toISOString().split('T')[0];
                endDate = today.toISOString().split('T')[0];
                break;
            case 'month':
                // Para "Este Mes", usar el primer día del mes actual hasta hoy
                startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
                endDate = today.toISOString().split('T')[0];
                break;
            case 'year':
                // Para "Este Año", usar el primer día del año actual hasta hoy
                startDate = `${today.getFullYear()}-01-01`;
                endDate = today.toISOString().split('T')[0];
                break;
            default:
                // 'all' - sin filtro
                break;
        }
        
        console.log(`Aplicando filtro: ${type}, Fecha inicio: ${startDate}, Fecha fin: ${endDate}, Fecha actual: ${today.toISOString()}`);
        
        // Actualizar el estado del filtro después de establecer las fechas
        setDateFilter({
            startDate,
            endDate,
            filterType: type
        });
        
        // Aplicar el filtro inmediatamente
        filterSalesData(type, startDate, endDate);
    };

    // Aplicar filtro personalizado con fechas seleccionadas
    const applyCustomFilter = () => {
        // Verificar que ambas fechas estén seleccionadas
        if (!dateFilter.startDate || !dateFilter.endDate) {
            alert('Por favor selecciona fechas de inicio y fin para aplicar el filtro personalizado');
            return;
        }
        
        // Actualizar el tipo de filtro a 'custom'
        setDateFilter(prev => ({
            ...prev,
            filterType: 'custom'
        }));
        
        // Aplicar el filtro con las fechas seleccionadas
        filterSalesData('custom', dateFilter.startDate, dateFilter.endDate);
    };

    // Filtrar datos de ventas por fecha
    const filterSalesData = (filterType, startDate, endDate) => {
        try {
            if (filterType === 'all') {
                // Mostrar todos los datos
                setFilteredSalesData({
                    totalSales: salesData.totalSales,
                    monthlySales: salesData.monthlySales,
                    categorySales: salesData.categorySales,
                    orderCount: Array.isArray(getAllOrder) ? getAllOrder.length : (getAllOrder?.orders?.length || 0),
                    categoryCount: Object.keys(salesData.categorySales).length
                });
                return;
            }
            
            // Obtener las órdenes
            const orders = Array.isArray(getAllOrder) ? getAllOrder : (getAllOrder?.orders || []);
            console.log(`Total de órdenes disponibles: ${orders.length}`);
            
            // Convertir fechas de filtro a objetos Date y normalizarlas
            const filterStartDate = startDate ? new Date(startDate + 'T00:00:00') : null;
            const filterEndDate = endDate ? new Date(endDate + 'T23:59:59') : null;
            
            console.log(`Filtro: ${filterType}, Fecha inicio: ${filterStartDate}, Fecha fin: ${filterEndDate}`);
            
            // Filtrar pedidos por fecha
            const filteredOrders = orders.filter(order => {
                // Obtener la fecha del pedido
                const orderDate = parseOrderDate(order.date);
                if (!orderDate) {
                    console.log(`Orden sin fecha válida:`, order.id || 'ID desconocido');
                    return false;
                }
                
                // Para depuración - mostrar la fecha en formato ISO para comparación
                console.log(`Orden ${order.id || 'sin ID'}: ${orderDate.toISOString().split('T')[0]}`);
                
                // Aplicar filtro según el tipo
                if (filterType === 'day') {
                    // Para filtro diario, comparar solo la fecha (ignorando la hora)
                    const orderDateStr = orderDate.toISOString().split('T')[0];
                    const filterDateStr = filterStartDate.toISOString().split('T')[0];
                    console.log(`Comparando: ${orderDateStr} con ${filterDateStr}`);
                    return orderDateStr === filterDateStr;
                } 
                else if (filterType === 'month') {
                    // Para filtro mensual, comparar año y mes
                    return orderDate.getFullYear() === filterStartDate.getFullYear() &&
                           orderDate.getMonth() === filterStartDate.getMonth();
                }
                else if (filterType === 'year') {
                    // Para filtro anual, comparar solo el año
                    return orderDate.getFullYear() === filterStartDate.getFullYear();
                }
                else if (filterType === 'custom') {
                    // Para filtro personalizado, usar rango de fechas
                    // Convertir a fechas sin hora para comparación justa
                    const orderDateStr = orderDate.toISOString().split('T')[0];
                    const startDateStr = filterStartDate ? filterStartDate.toISOString().split('T')[0] : null;
                    const endDateStr = filterEndDate ? filterEndDate.toISOString().split('T')[0] : null;
                    
                    if (startDateStr && endDateStr) {
                        return orderDateStr >= startDateStr && orderDateStr <= endDateStr;
                    } else if (startDateStr) {
                        return orderDateStr >= startDateStr;
                    } else if (endDateStr) {
                        return orderDateStr <= endDateStr;
                    }
                }
                
                return true;
            });
            
            console.log(`Filtro aplicado: ${filterType}. Pedidos filtrados: ${filteredOrders.length} de ${orders.length}`);
            
            // Recalcular estadísticas con los pedidos filtrados
            let totalSales = 0;
            const monthlySales = {};
            const categorySales = {};
            
            filteredOrders.forEach(order => {
                const orderTotal = calculateOrderTotal(order);
                totalSales += orderTotal;
                
                // Procesar fecha para estadísticas mensuales
                const orderDate = parseOrderDate(order.date);
                
                // Verificar si la fecha es válida antes de usarla
                if (orderDate && !isNaN(orderDate.getTime())) {
                    const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                    monthlySales[monthKey] = (monthlySales[monthKey] || 0) + orderTotal;
                }
                
                // Procesar categorías
                if (order.cartItems && Array.isArray(order.cartItems)) {
                    order.cartItems.forEach(item => {
                        const category = item.category || 'Sin categoría';
                        const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
                        categorySales[category] = (categorySales[category] || 0) + itemTotal;
                    });
                }
            });
            
            // Actualizar estado con datos filtrados
            setFilteredSalesData({
                totalSales,
                monthlySales,
                categorySales,
                orderCount: filteredOrders.length,
                categoryCount: Object.keys(categorySales).length
            });
        } catch (error) {
            console.error("Error al filtrar datos:", error);
        }
    };

    // Función auxiliar para parsear fechas de pedidos
    const parseOrderDate = (dateValue) => {
        if (!dateValue) return null;
        
        let orderDate = null;
        
        try {
            // Para depuración
            console.log("Parseando fecha:", typeof dateValue, dateValue);
            
            if (typeof dateValue === 'string') {
                // Manejar fechas en formato string
                if (dateValue.includes('/')) {
                    // Para formatos como "8/4/2025, 5:10:44 p. m." (formato español: día/mes/año)
                    const datePart = dateValue.split(',')[0].trim(); // Obtener solo "8/4/2025"
                    const parts = datePart.split('/');
                    
                    if (parts.length === 3) {
                        // En formato español: día/mes/año
                        const day = parseInt(parts[0]);
                        const month = parseInt(parts[1]) - 1; // Los meses en JS son 0-11
                        const year = parseInt(parts[2]);
                        
                        console.log(`Parseando fecha en formato español: día=${day}, mes=${month+1}, año=${year}`);
                        
                        // Crear fecha con formato español (día/mes/año)
                        orderDate = new Date(year, month, day);
                    } else {
                        orderDate = new Date(dateValue);
                    }
                } else {
                    orderDate = new Date(dateValue);
                }
            } else if (dateValue.seconds !== undefined) {
                // Timestamp de Firestore
                orderDate = new Date(dateValue.seconds * 1000 + (dateValue.nanoseconds || 0) / 1000000);
            } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
                orderDate = dateValue.toDate();
            }
            
            // Verificar si la fecha es válida
            if (!orderDate || isNaN(orderDate.getTime())) {
                console.warn("Fecha inválida después del parseo:", dateValue);
                return null;
            }
            
            return orderDate;
        } catch (e) {
            console.warn("Error al parsear fecha:", dateValue, e);
            return null;
        }
    };

    return (
        <div>
            {/* Filtros de fecha */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-pink-600 mb-4">Analíticas de Ventas</h2>
                
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100 mb-4">
                    <h3 className="text-lg font-medium text-pink-600 mb-3">Filtrar por Fecha</h3>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                        <button 
                            onClick={() => applyFilterType('all')} 
                            className={`px-4 py-2 rounded-lg ${dateFilter.filterType === 'all' ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-600'}`}
                        >
                            Todos
                        </button>
                        <button 
                            onClick={() => applyFilterType('day')} 
                            className={`px-4 py-2 rounded-lg ${dateFilter.filterType === 'day' ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-600'}`}
                        >
                            Hoy
                        </button>
                        <button 
                            onClick={() => applyFilterType('month')} 
                            className={`px-4 py-2 rounded-lg ${dateFilter.filterType === 'month' ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-600'}`}
                        >
                            Este Mes
                        </button>
                        <button 
                            onClick={() => applyFilterType('year')} 
                            className={`px-4 py-2 rounded-lg ${dateFilter.filterType === 'year' ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-600'}`}
                        >
                            Este Año
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                            <input 
                                type="date" 
                                name="startDate"
                                value={dateFilter.startDate}
                                onChange={handleDateFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                            <input 
                                type="date" 
                                name="endDate"
                                value={dateFilter.endDate}
                                onChange={handleDateFilterChange}
                                className="w-full p-2 border border-gray-300 rounded-md"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <button 
                            onClick={applyCustomFilter}
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                        >
                            Aplicar Filtro
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                    <h3 className="text-lg font-medium text-pink-600 mb-2">Total de Ventas</h3>
                    <p className="text-3xl font-bold text-pink-700">Bs. {filteredSalesData.totalSales.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 mt-1">Todas las ventas</p>
                </div>
                
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                    <h3 className="text-lg font-medium text-pink-600 mb-2">Órdenes</h3>
                    <p className="text-3xl font-bold text-pink-700">{filteredSalesData.orderCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Total de órdenes</p>
                </div>
                
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
                    <h3 className="text-lg font-medium text-pink-600 mb-2">Categorías</h3>
                    <p className="text-3xl font-bold text-pink-700">{filteredSalesData.categoryCount}</p>
                    <p className="text-sm text-gray-500 mt-1">Categorías con ventas</p>
                </div>
            </div>
            
            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Gráfico de ventas mensuales */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Ventas Mensuales</h3>
                    <div className="h-64">
                        <Bar 
                            data={{
                                labels: Object.keys(filteredSalesData.monthlySales).map(month => {
                                    const [year, monthNum] = month.split('-');
                                    return `${monthNum}/${year}`;
                                }),
                                datasets: [
                                    {
                                        label: 'Ventas (Bs.)',
                                        data: Object.values(filteredSalesData.monthlySales),
                                        backgroundColor: 'rgba(236, 72, 153, 0.6)',
                                        borderColor: 'rgba(236, 72, 153, 1)',
                                        borderWidth: 1
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: {
                                            callback: function(value) {
                                                return 'Bs. ' + value;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                
                {/* Gráfico de ventas por categoría */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Ventas por Categoría</h3>
                    <div className="h-64">
                        <Pie 
                            data={{
                                labels: Object.keys(filteredSalesData.categorySales),
                                datasets: [
                                    {
                                        data: Object.values(filteredSalesData.categorySales),
                                        backgroundColor: [
                                            'rgba(236, 72, 153, 0.6)',
                                            'rgba(249, 168, 212, 0.6)',
                                            'rgba(244, 114, 182, 0.6)',
                                            'rgba(251, 207, 232, 0.6)',
                                            'rgba(253, 242, 248, 0.6)',
                                            'rgba(219, 39, 119, 0.6)',
                                            'rgba(190, 24, 93, 0.6)',
                                            'rgba(157, 23, 77, 0.6)',
                                            'rgba(131, 24, 67, 0.6)',
                                            'rgba(112, 26, 117, 0.6)'
                                        ],
                                        borderColor: [
                                            'rgba(236, 72, 153, 1)',
                                            'rgba(249, 168, 212, 1)',
                                            'rgba(244, 114, 182, 1)',
                                            'rgba(251, 207, 232, 1)',
                                            'rgba(253, 242, 248, 1)',
                                            'rgba(219, 39, 119, 1)',
                                            'rgba(190, 24, 93, 1)',
                                            'rgba(157, 23, 77, 1)',
                                            'rgba(131, 24, 67, 1)',
                                            'rgba(112, 26, 117, 1)'
                                        ],
                                        borderWidth: 1
                                    }
                                ]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                const label = context.label || '';
                                                const value = context.raw || 0;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = Math.round((value / total) * 100);
                                                return `${label}: Bs. ${value.toFixed(2)} (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Productos más vendidos */}
            <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">Productos Más Vendidos</h3>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesData.topProducts.map((product, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <img className="h-10 w-10 rounded-full object-cover" src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.title} />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{product.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{product.quantity}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">Bs. {product.total.toFixed(2)}</div>
                                    </td>
                                </tr>
                            ))}
                            {salesData.topProducts.length === 0 && (
                                <tr>
                                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay datos disponibles
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Top 10 Clientes por Cantidad de Pedidos */}
            <div className="mt-8 mb-6">
                <h2 className="text-xl font-semibold mb-4">Top 10 Clientes por Cantidad de Pedidos</h2>
                <div className="bg-white p-4 rounded-lg shadow">
                    {topUsers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad de Pedidos</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gastado</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {topUsers.map((user, index) => (
                                        <tr key={user.email} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.name} ({user.email})
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.orderCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Bs. {user.totalSpent.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No hay datos de pedidos disponibles</p>
                    )}
                </div>
            </div>
            
            {/* Pedidos recientes */}
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Pedidos Recientes</h3>
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {salesData.recentOrders.map((order, index) => {
                                let orderDate = new Date();
                                if (order.date) {
                                    if (typeof order.date === 'string') {
                                        orderDate = new Date(order.date);
                                    } else if (order.date.seconds) {
                                        orderDate = new Date(order.date.seconds * 1000 + (order.date.nanoseconds || 0) / 1000000);
                                    } else if (order.date.toDate && typeof order.date.toDate === 'function') {
                                        orderDate = order.date.toDate();
                                    }
                                }
                                
                                const formattedDate = orderDate.toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                });
                                
                                const addressInfo = order.addressInfo || {};
                                const cartItems = order.cartItems || [];
                                const orderTotal = calculateOrderTotal(order);
                                
                                return (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{formattedDate}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{addressInfo.name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{order.email || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {cartItems.length > 0 
                                                    ? `${cartItems.length} productos` 
                                                    : 'Sin productos'}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {cartItems.slice(0, 2).map((item, idx) => (
                                                    <div key={idx}>{item.title} ({item.quantity})</div>
                                                ))}
                                                {cartItems.length > 2 && (
                                                    <div>+{cartItems.length - 2} más</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-pink-600">Bs. {orderTotal.toFixed(2)}</div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {salesData.recentOrders.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No hay pedidos recientes
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDetail;