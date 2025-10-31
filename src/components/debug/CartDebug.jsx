import { useSelector } from "react-redux";
import { useContext, useEffect } from "react";
import myContext from "../../context/myContext";

const CartDebug = () => {
    const cartItems = useSelector((state) => state.cart) || [];
    const { currentUser } = useContext(myContext);
    
    useEffect(() => {
        console.log("=== CART DEBUG ===");
        console.log("Current User:", currentUser);
        console.log("Cart Items from Redux:", cartItems);
        
        // Check localStorage directly
        const guestCartKey = 'cart_guest';
        const userCartKey = currentUser ? `cart_${currentUser}` : null;
        
        console.log("Guest Cart in localStorage:", localStorage.getItem(guestCartKey));
        if (userCartKey) {
            console.log(`User Cart (${userCartKey}) in localStorage:`, localStorage.getItem(userCartKey));
        }
        console.log("=== END CART DEBUG ===");
    }, [cartItems, currentUser]);
    
    return null; // Este componente no renderiza nada, solo es para depuración
};

export default CartDebug;