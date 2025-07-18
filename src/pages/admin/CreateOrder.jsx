// ... importaciones existentes ...
// import AdminOrderDebug from '../../components/debug/AdminOrderDebug';
// import AdminCartDebug from '../../components/debug/AdminCartDebug';
import Layout from '../../components/layout/Layout';
import AdminOrderCreation from '../../components/admin/AdminOrderCreation';

const CreateOrder = () => {
    return (
        <Layout>
            {/* Componentes de depuración comentados
            <AdminOrderDebug />
            <AdminCartDebug />
            */}
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Crear Pedido</h1>
                <AdminOrderCreation />
            </div>
        </Layout>
    );
};

export default CreateOrder;