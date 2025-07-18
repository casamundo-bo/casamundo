import { Link, useLocation } from 'react-router-dom';

const AdminSidebar = () => {
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('users'));
    const isAdmin = user?.role === 'admin';
    const isOperator = user?.role === 'operator';

    return (
        <div className="bg-pink-50 p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-pink-600">Panel de Administración</h2>
            <ul className="space-y-2">
                <li>
                    <Link 
                        to="/admin-dashboard" 
                        className={`block p-2 rounded-md ${location.pathname === '/admin-dashboard' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                    >
                        Dashboard
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/add-product" 
                        className={`block p-2 rounded-md ${location.pathname === '/add-product' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                    >
                        Agregar Producto
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/admin-orders" 
                        className={`block p-2 rounded-md ${location.pathname === '/admin-orders' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                    >
                        Crear Pedido
                    </Link>
                </li>
                {isAdmin && (
                    <>
                        <li>
                            <Link 
                                to="/add-user" 
                                className={`block p-2 rounded-md ${location.pathname === '/add-user' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                            >
                                Agregar Usuario
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/admin-debts" 
                                className={`block p-2 rounded-md ${location.pathname === '/admin-debts' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                            >
                                Gestionar Deudas
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/admin-reports" 
                                className={`block p-2 rounded-md ${location.pathname === '/admin-reports' ? 'bg-pink-500 text-white' : 'hover:bg-pink-100'}`}
                            >
                                Reportes
                            </Link>
                        </li>
                    </>
                )}
                <li>
                    <Link 
                        to="/" 
                        className="block p-2 rounded-md hover:bg-pink-100"
                    >
                        Volver a la Tienda
                    </Link>
                </li>
            </ul>
        </div>
    );
};

export default AdminSidebar;