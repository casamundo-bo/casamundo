import { createSlice } from '@reduxjs/toolkit'
import toast from 'react-hot-toast'

// Helper function to get user-specific cart from localStorage
const getUserCart = (userId) => {
    // Identificar si es un carrito administrativo
    const isAdminCart = userId === 'admin_cart';
    const cartKey = isAdminCart ? 'admin_cart' : (userId ? `cart_${userId}` : 'cart_guest');
    
    try {
        const cartData = localStorage.getItem(cartKey);
        // Reducir logs innecesarios - solo mostrar si hay datos o en modo desarrollo
        if (cartData || process.env.NODE_ENV === 'development') {
            console.log(`Obteniendo carrito para ${cartKey}:`, cartData ? JSON.parse(cartData) : []);
        }
        return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
        console.error("Error parsing cart data:", error);
        return [];
    }
};

// Helper function to save user-specific cart to localStorage
const saveUserCart = (userId, cartData) => {
    // Identificar si es un carrito administrativo
    const isAdminCart = userId === 'admin_cart';
    const cartKey = isAdminCart ? 'admin_cart' : (userId ? `cart_${userId}` : 'cart_guest');
    
    try {
        // Reducir logs innecesarios - solo mostrar en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log(`Guardando carrito para ${cartKey}:`, cartData);
        }
        localStorage.setItem(cartKey, JSON.stringify(cartData));
    } catch (error) {
        console.error("Error saving cart data:", error);
    }
};

// Helper to serialize item to avoid non-serializable values
const serializeItem = (item) => {
    // Check if item is defined
    if (!item) {
        console.error("Attempted to serialize undefined item");
        return null;
    }
    
    // Create a copy of the item with only the properties we need
    const serialized = {
        id: item.id,
        title: item.title || "Producto sin nombre",
        price: parseFloat(item.price) || 0,
        imageUrl: item.imageUrl || item.productImageUrl || "",
        description: item.description || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        stock: parseInt(item.stock) || 0,
        hasStockControl: typeof item.hasStockControl === 'boolean' ? item.hasStockControl : true
    };
    
    // Convert Timestamp to a serializable format if present
    if (item.time && typeof item.time === 'object' && 'seconds' in item.time && 'nanoseconds' in item.time) {
        serialized.timeMs = item.time.seconds * 1000 + Math.floor(item.time.nanoseconds / 1000000);
        serialized.timeString = new Date(serialized.timeMs).toISOString();
    } else if (item.time instanceof Date) {
        serialized.timeMs = item.time.getTime();
        serialized.timeString = item.time.toISOString();
    } else if (item.timeMs) {
        serialized.timeMs = item.timeMs;
        serialized.timeString = new Date(item.timeMs).toISOString();
    }
    
    // Handle date field if present
    if (item.date) {
        serialized.date = String(item.date);
    }
    
    return serialized;
};

// Get initial state from localStorage based on current user
// This will be updated when the user logs in/out
const initialState = getUserCart(null);

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart(state, action) {
            const { item, userId } = action.payload;
            const serializedItem = serializeItem(item);
            
            // Check if serialization was successful
            if (!serializedItem) {
                toast.error("Error adding item to cart");
                return state;
            }
            
            const existingItem = state.find(cartItem => cartItem.id === serializedItem.id);
            
            if (existingItem) {
                if (existingItem.quantity < serializedItem.stock) {
                    existingItem.quantity += 1;
                    toast.success("Cantidad aumentada");
                } else {
                    toast.error(`Solo hay ${serializedItem.stock} unidades disponibles`);
                }
            } else {
                if (serializedItem.stock > 0) {
                    state.push({...serializedItem, quantity: 1});
                    toast.success("Producto agregado al carrito");
                } else {
                    toast.error("Producto fuera de stock");
                }
            }
            saveUserCart(userId, state);
        },
        
        incrementQuantity(state, action) {
            const { item, userId } = action.payload;
            const serializedItem = serializeItem(item);
            
            if (!serializedItem) {
                return state;
            }
            
            const cartItem = state.find(cartItem => cartItem.id === serializedItem.id);
            
            if (cartItem) {
                // Si no tiene control de stock o tiene suficiente stock, incrementar
                if (!serializedItem.hasStockControl || cartItem.quantity < serializedItem.stock) {
                    cartItem.quantity += 1;
                    toast.success(`Cantidad actualizada (${cartItem.quantity}${serializedItem.hasStockControl ? `/${serializedItem.stock}` : ''})`);
                } else {
                    toast.error(`Stock máximo alcanzado (${serializedItem.stock} unidades)`);
                }
                saveUserCart(userId, state);
            }
        },
        
        decrementQuantity(state, action) {
            const { item, userId } = action.payload;
            const serializedItem = serializeItem(item);
            
            if (!serializedItem) {
                return state;
            }
            
            const cartItem = state.find(cartItem => cartItem.id === serializedItem.id);
            if (cartItem && cartItem.quantity > 1) {
                cartItem.quantity -= 1;
                toast.success("Cantidad disminuida");
                saveUserCart(userId, state);
            }
        },
        
        deleteFromCart(state, action) {
            const { itemId, item, userId } = action.payload;
            
            // Handle both ways of identifying the item (by id or by item object)
            const id = itemId || (item ? item.id : null);
            
            if (!id) {
                console.error("No valid item ID provided for deletion");
                return state;
            }
            
            const newState = state.filter(cartItem => cartItem.id !== id);
            saveUserCart(userId, newState);
            return newState;
        },
        
        clearCart(state, action) {
            const { userId } = action.payload;
            saveUserCart(userId, []);
            return [];
        },
        
        // Add a reducer to load the cart for a specific user
        loadUserCart(state, action) {
            const { userId } = action.payload;
            const userCart = getUserCart(userId);
            return userCart;
        },
        
        // Add this new reducer if you specifically need setUserCart
        setUserCart(state, action) {
            // This is essentially the same as loadUserCart
            const { userId } = action.payload;
            const userCart = getUserCart(userId);
            return userCart;
        },
        
        // Añadir un nuevo reducer para cargar específicamente el carrito administrativo
        loadAdminCart(state, action) {
            // Estandarizar para que acepte un parámetro userId como las otras funciones
            const userId = action.payload?.userId || 'admin_cart';
            const adminCart = getUserCart(userId);
            return adminCart;
        },
        
        // Mejorado: Reducer para establecer una cantidad específica para un producto
        setQuantityForItem(state, action) {
            const { item, quantity, userId } = action.payload;
            
            // Validar que tengamos un item válido
            if (!item || !item.id) {
                toast.error("Error al agregar producto");
                return state;
            }
            
            // Serializar el item para evitar valores no serializables
            const serializedItem = serializeItem(item);
            if (!serializedItem) {
                toast.error("Error al procesar el producto");
                return state;
            }
            
            // Convertir la cantidad a un número entero válido
            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
                toast.error("La cantidad debe ser un número positivo");
                return state;
            }
            
            // Verificar si la cantidad excede el stock (solo si tiene control de stock)
            if (serializedItem.hasStockControl && parsedQuantity > serializedItem.stock) {
                toast.error(`Solo hay ${serializedItem.stock} unidades disponibles`);
                return state;
            }
            
            // Buscar si el producto ya existe en el carrito
            const existingItemIndex = state.findIndex(cartItem => cartItem.id === serializedItem.id);
            
            if (existingItemIndex >= 0) {
                // Actualizar la cantidad del item existente
                state[existingItemIndex].quantity = parsedQuantity;
                toast.success(`Cantidad actualizada (${parsedQuantity})`);
            } else {
                // Agregar el nuevo item al carrito
                state.push({
                    ...serializedItem,
                    quantity: parsedQuantity
                });
                toast.success(`${serializedItem.title} agregado al carrito`);
            }
            
            // Guardar el carrito actualizado
            saveUserCart(userId, state);
        },
        
        // Nuevo reducer para agregar una cantidad específica de un producto
        addQuantityToCart(state, action) {
            const { item, quantity, userId } = action.payload;
            
            // Validar que tengamos un item válido
            if (!item || !item.id) {
                toast.error("Error al agregar producto");
                return state;
            }
            
            // Serializar el item para evitar valores no serializables
            const serializedItem = serializeItem(item);
            if (!serializedItem) {
                toast.error("Error al procesar el producto");
                return state;
            }
            
            // Convertir la cantidad a un número entero válido
            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
                toast.error("La cantidad debe ser un número positivo");
                return state;
            }
            
            // Verificar si la cantidad excede el stock
            if (parsedQuantity > serializedItem.stock) {
                toast.error(`Solo hay ${serializedItem.stock} unidades disponibles`);
                return state;
            }
            
            // Buscar si el producto ya existe en el carrito
            const existingItem = state.find(cartItem => cartItem.id === serializedItem.id);
            
            if (existingItem) {
                // Calcular la nueva cantidad total
                const newQuantity = existingItem.quantity + parsedQuantity;
                
                // Verificar si la nueva cantidad excede el stock
                if (newQuantity > serializedItem.stock) {
                    toast.error(`No se puede agregar ${parsedQuantity} más. Excedería el stock disponible.`);
                    return state;
                }
                
                // Actualizar la cantidad
                existingItem.quantity = newQuantity;
                toast.success(`Cantidad actualizada: ${newQuantity}`);
            } else {
                // Si no existe, agregarlo con la cantidad especificada
                state.push({...serializedItem, quantity: parsedQuantity});
                toast.success(`${serializedItem.title} agregado al carrito (${parsedQuantity})`);
            }
            
            // Guardar el carrito actualizado
            saveUserCart(userId, state);
        },  // Añadida la coma aquí
        
        // Añadir esta acción en la sección de reducers
        updateCartItemStock(state, action) {
            const { itemId, stock, userId } = action.payload;
            
            const cartItem = state.find(item => item.id === itemId);
            
            if (cartItem) {
                // Actualizar el stock del item
                cartItem.stock = stock;
                
                // Si la cantidad en el carrito es mayor que el stock disponible, ajustarla
                if (cartItem.quantity > stock) {
                    cartItem.quantity = stock;
                    toast.warning(`La cantidad de "${cartItem.title}" ha sido ajustada debido a cambios en el inventario`);
                }
                
                saveUserCart(userId, state);
            }
        }
    }
})

export const { 
    addToCart, 
    deleteFromCart, 
    incrementQuantity, 
    decrementQuantity, 
    clearCart,
    loadUserCart,
    setUserCart,
    loadAdminCart,
    setQuantityForItem,
    addQuantityToCart,  // Añadida la coma aquí
    updateCartItemStock  // Exportar el nuevo reducer
} = cartSlice.actions;

export default cartSlice.reducer;
