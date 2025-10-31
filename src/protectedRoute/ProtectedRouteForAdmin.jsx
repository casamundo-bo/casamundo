import { Navigate } from 'react-router-dom';

export const ProtectedRouteForAdmin = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('users'));
    
    // Añadir console.log para depuración
    console.log("ProtectedRouteForAdmin - User:", user);
    
    if (user) {
        const isAdmin = user.role === 'admin';
        const isOperator = user.role === 'operator';
        
        console.log("Is Admin:", isAdmin, "Is Operator:", isOperator);
        
        if (isAdmin || isOperator) {
            return children;
        }
    }
    
    // Si no hay usuario o no tiene permisos, redirigir al login
    return <Navigate to="/login" />;
};