import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";

const Navbar = () => {
    const user = JSON.parse(localStorage.getItem('users'));
    const cartItems = useSelector((state) => state.cart);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Determine dashboard route based on user role
    const dashboardRoute = user?.role === 'admin' || user?.role === 'operator' 
        ? '/admin-dashboard' 
        : '/user-dashboard';
        
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm('');
            setMenuOpen(false);
        }
    };

    // Detectar si es dispositivo móvil
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        
        return () => {
            window.removeEventListener('resize', checkScreenSize);
        };
    }, []);

    return (
        <div className="bg-custom-red-600 text-white sticky top-0 z-50">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row">
                    {/* Barra superior con logo y botón de menú en móvil */}
                    <div className="flex justify-between items-center py-3">
                        <Link to="/" className="text-xl font-bold">Casa Mundo</Link>
                        
                        {/* Botón de menú para móvil */}
                        <button 
                            className="md:hidden text-white focus:outline-none"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            )}
                        </button>
                    </div>
                    
                    {/* Contenedor para enlaces y buscador */}
                    <div className={`${menuOpen || !isMobile ? 'flex' : 'hidden'} flex-col md:flex-row md:justify-between md:items-center w-full pb-3 md:pb-0`}>
                        {/* Enlaces de navegación */}
                        <div className="flex flex-col md:flex-row md:space-x-4 space-y-2 md:space-y-0 py-2 md:py-0">
                            <Link to="/" className="hover:text-gray-200" onClick={() => setMenuOpen(false)}>Inicio</Link>
                            <Link to="/allproduct" className="hover:text-gray-200" onClick={() => setMenuOpen(false)}>Todos los productos</Link>
                            <Link to={dashboardRoute} className="hover:text-gray-200" onClick={() => setMenuOpen(false)}>{user?.name || 'Usuario'}</Link>
                            <Link to="/login" className="hover:text-gray-200" onClick={() => setMenuOpen(false)}>Cerrar Sesión</Link>
                            <Link to="/cart" className="hover:text-gray-200" onClick={() => setMenuOpen(false)}>Carrito({cartItems.length})</Link>
                        </div>
                        
                        {/* Buscador */}
                        <form onSubmit={handleSearch} className="relative mt-3 md:mt-0">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..." 
                                className="px-3 py-1 rounded text-black pr-8 w-full"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Navbar;