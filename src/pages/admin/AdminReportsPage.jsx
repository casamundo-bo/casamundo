import { useState } from "react";
import Layout from "../../components/layout/Layout";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AnalyticsDetail from "../../components/admin/AnalyticsDetail";

const AdminReportsPage = () => {
    const [reportType, setReportType] = useState("sales");

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
                        <h1 className="text-2xl font-bold mb-6">Reportes y Análisis</h1>
                        
                        {/* Report Type Selector */}
                        <div className="mb-6">
                            <div className="flex space-x-4 mb-4">
                                <button 
                                    className={`px-4 py-2 rounded-md ${reportType === 'sales' ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}
                                    onClick={() => setReportType('sales')}
                                >
                                    Ventas
                                </button>
                                <button 
                                    className={`px-4 py-2 rounded-md ${reportType === 'inventory' ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}
                                    onClick={() => setReportType('inventory')}
                                >
                                    Inventario
                                </button>
                                <button 
                                    className={`px-4 py-2 rounded-md ${reportType === 'customers' ? 'bg-pink-500 text-white' : 'bg-gray-200'}`}
                                    onClick={() => setReportType('customers')}
                                >
                                    Clientes
                                </button>
                            </div>
                        </div>
                        
                        {/* Report Content */}
                        <div className="bg-white p-6 rounded-lg shadow-md">
                            {reportType === 'sales' && (
                                <AnalyticsDetail />
                            )}
                            
                            {reportType === 'inventory' && (
                                <div className="text-center py-8">
                                    <h2 className="text-xl font-semibold mb-4">Reporte de Inventario</h2>
                                    <p className="text-gray-500">Esta funcionalidad estará disponible próximamente.</p>
                                </div>
                            )}
                            
                            {reportType === 'customers' && (
                                <div className="text-center py-8">
                                    <h2 className="text-xl font-semibold mb-4">Reporte de Clientes</h2>
                                    <p className="text-gray-500">Esta funcionalidad estará disponible próximamente.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminReportsPage;