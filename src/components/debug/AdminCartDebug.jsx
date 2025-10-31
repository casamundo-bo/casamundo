import { useEffect } from 'react';
import { useSelector } from 'react-redux';

const AdminCartDebug = () => {
    const cartItems = useSelector((state) => state.cart) || [];
    
    useEffect(() => {
        console.log("=== ADMIN CART DEBUG ===");
        console.log("Admin Cart Items from Redux:", cartItems);
        
        // Verificar el carrito administrativo en localStorage
        const adminCartKey = 'admin_cart';
        console.log("Admin Cart in localStorage:", localStorage.getItem(adminCartKey));
        
        console.log("=== END ADMIN CART DEBUG ===");
    }, [cartItems]);
    
    return null; // Este componente no renderiza nada, solo es para depuración
};

export default AdminCartDebug;