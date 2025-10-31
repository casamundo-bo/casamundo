import Layout from "../../components/layout/Layout";
import DebtDetail from "../../components/admin/DebtDetail";
import AdminSidebar from "../../components/admin/AdminSidebar";

const AdminDebtsPage = () => {
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
                        <h1 className="text-2xl font-bold mb-6">Gestión de Deudas</h1>
                        <DebtDetail />
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default AdminDebtsPage;