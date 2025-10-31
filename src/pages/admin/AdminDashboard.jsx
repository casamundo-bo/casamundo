import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import ProductDetail from '../../components/admin/ProductDetail';
import OrderDetail from '../../components/admin/OrderDetail';
import UserDetail from '../../components/admin/UserDetail';
import AnalyticsDetail from '../../components/admin/AnalyticsDetail';
import DebtDetail from '../../components/admin/DebtDetail';
import React, { useContext, useState, useEffect, useRef } from 'react';
import myContext from '../../context/myContext';
import 'react-tabs/style/react-tabs.css';
import { Link, useNavigate } from 'react-router-dom';
import FirebaseUsageMonitor from '../../components/firebase/FirebaseUsageMonitor';
import Layout from '../../components/layout/Layout';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/loader/Loader';
// Eliminar importaciones de componentes de depuración
// import OrderStatusDebug from '../../components/debug/OrderStatusDebug';
// import OrderDebugHelper from '../../components/debug/OrderDebugHelper';
// import OrdersDebugViewer from '../../components/debug/OrdersDebugViewer';
// import OrderLoadingHelper from '../../components/debug/OrderLoadingHelper';

const AdminDashboard = () => {
    const user = JSON.parse(localStorage.getItem('users'));
    const isAdmin = user?.role === 'admin';
    const isOperator = user?.role === 'operator';
    
    const context = useContext(myContext);
    const { 
        loading, 
        getAllProduct, 
        getAllOrder, 
        getAllUser,
        getAllDebts,
        getAllProductFunction, 
        getAllOrderFunction, 
        getAllUserFunction,
        getAllDebtsFunction
    } = context;
    
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    
    // Add state to manage the selected tab
    const [tabIndex, setTabIndex] = useState(0);
    const [localLoading, setLocalLoading] = useState(true);
    
    // Create the ref at the top level of the component, not inside useEffect
    const isFirstLoad = useRef(true);
    const ordersLoaded = useRef(false);
    const productsLoaded = useRef(false);
    const usersLoaded = useRef(false);
    
    // Cargar datos cuando el componente se monta
    useEffect(() => {
        // Modificar la función loadInitialData (alrededor de la línea 52)
        const loadInitialData = async () => {
            setLocalLoading(true);
            
            try {
                // Cargar productos si es necesario
                if (!productsLoaded.current && getAllProduct.length === 0) {
                    await getAllProductFunction();
                    productsLoaded.current = true;
                }
                
                // Cargar órdenes si es necesario
                if (!ordersLoaded.current && getAllOrder.length === 0) {
                    await getAllOrderFunction();
                    ordersLoaded.current = true;
                }
                
                // Cargar usuarios si es necesario
                if (!usersLoaded.current && getAllUser.length === 0) {
                    await getAllUserFunction();
                    usersLoaded.current = true;
                }
                
                // Cargar deudas
                await getAllDebtsFunction();
                
            } catch (error) {
                console.error("Error cargando datos iniciales:", error);
            } finally {
                setLocalLoading(false);
                isFirstLoad.current = false;
            }
        };
        
        loadInitialData();
    }, [getAllProductFunction, getAllUserFunction, isAdmin]);

    // Add a separate effect to load orders when tab changes to Orders tab
    useEffect(() => {
        const loadOrdersForTab = async () => {
            if (tabIndex === 1) {
                if (!ordersLoaded.current && typeof getAllOrderFunction === 'function') {
                    console.log("AdminDashboard: Cargando órdenes al cambiar a pestaña de pedidos...");
                    try {
                        await getAllOrderFunction();
                        ordersLoaded.current = true;
                    } catch (error) {
                        console.error("Error loading orders:", error);
                    }
                }
            }
        };
        
        loadOrdersForTab();
    }, [tabIndex, getAllOrderFunction]);

    // Function to handle tab selection
    const handleTabSelect = (index) => {
        console.log(`Changing tab to index ${index}`);
        setTabIndex(index);
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                {/* Componentes de depuración comentados
                <OrderStatusDebug />
                <OrderDebugHelper />
                <OrdersDebugViewer />
                <OrderLoadingHelper />
                */}
                
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar */}
                    <AdminSidebar />
                    
                    {/* Main content */}
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
                        
                        {localLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader />
                            </div>
                        ) : (
                            <>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-pink-50 p-6 rounded-lg shadow-md">
                                        <h2 className="text-lg font-semibold mb-2">Productos</h2>
                                        <p className="text-3xl font-bold">{Array.isArray(getAllProduct) ? getAllProduct.length : 0}</p>
                                    </div>
                                    
                                    <div className="bg-pink-50 p-6 rounded-lg shadow-md">
                                        <h2 className="text-lg font-semibold mb-2">Pedidos</h2>
                                        <p className="text-3xl font-bold">{Array.isArray(getAllOrder) ? getAllOrder.length : 0}</p>
                                    </div>
                                    
                                    {isAdmin && (
                                        <div className="bg-pink-50 p-6 rounded-lg shadow-md">
                                            <h2 className="text-lg font-semibold mb-2">Usuarios</h2>
                                            <p className="text-3xl font-bold">{Array.isArray(getAllUser) ? getAllUser.length : 0}</p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Tabs - Add onSelect handler and selectedIndex */}
                                <Tabs selectedIndex={tabIndex} onSelect={handleTabSelect}>
                                    <TabList className="flex border-b mb-4">
                                        <Tab className="px-4 py-2 border-b-2 border-transparent hover:border-pink-500 focus:outline-none cursor-pointer">
                                            Productos
                                        </Tab>
                                        <Tab className="px-4 py-2 border-b-2 border-transparent hover:border-pink-500 focus:outline-none cursor-pointer">
                                            Pedidos
                                        </Tab>
                                        {isAdmin && (
                                            <Tab className="px-4 py-2 border-b-2 border-transparent hover:border-pink-500 focus:outline-none cursor-pointer">
                                                Usuarios
                                            </Tab>
                                        )}
                                        {isAdmin && (
                                            <Tab className="px-4 py-2 border-b-2 border-transparent hover:border-pink-500 focus:outline-none cursor-pointer">
                                                Analíticas
                                            </Tab>
                                        )}
                                    </TabList>
                                    
                                    {/* Products Tab */}
                                    <TabPanel>
                                        <ProductDetail />
                                    </TabPanel>
                                    
                                    {/* Orders Tab */}
                                    <TabPanel>
                                        {tabIndex === 1 && <OrderDetail />}
                                        {/* Eliminar el componente de depuración y el comentario */}
                                    </TabPanel>
                                    
                                    {/* Users Tab - Only for Admin */}
                                    {isAdmin && (
                                        <TabPanel>
                                            <UserDetail />
                                        </TabPanel>
                                    )}
                                    
                                    {/* Analytics Tab - Only for Admin */}
                                    {isAdmin && (
                                        <TabPanel>
                                            <div className="space-y-8">
                                                <AnalyticsDetail />
                                                <FirebaseUsageMonitor />
                                            </div>
                                        </TabPanel>
                                    )}
                                </Tabs>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDashboard;
