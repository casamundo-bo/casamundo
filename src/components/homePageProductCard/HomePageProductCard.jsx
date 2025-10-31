import { useContext, useState } from "react";
import { useNavigate } from "react-router";
import myContext from "../../context/myContext";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { addQuantityToCart, deleteFromCart } from "../../redux/cartSlice";

const HomePageProductCard = () => {
    const navigate = useNavigate();
    const context = useContext(myContext);
    const { getAllProduct, currentUser } = context;

    // Modificar el selector para acceder correctamente al estado del carrito
    const cartItems = useSelector((state) => state.cart) || [];
    const dispatch = useDispatch();
    
    // Estado para almacenar las cantidades manuales por producto
    const [manualQuantities, setManualQuantities] = useState({});

    // Función para manejar cambios en la cantidad manual
    const handleQuantityChange = (item, value) => {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue < 1) {
            setManualQuantities({...manualQuantities, [item.id]: 1});
        } else if (numValue > item.stock) {
            setManualQuantities({...manualQuantities, [item.id]: item.stock});
            toast.error(`Solo hay ${item.stock} unidades disponibles`);
        } else {
            setManualQuantities({...manualQuantities, [item.id]: numValue});
        }
    };

    // Función para agregar al carrito con cantidad manual
    const addCart = (item) => {
        if (!item || item.stock <= 0) {
            toast.error("Producto sin stock disponible");
            return;
        }
        
        // Obtener la cantidad manual o usar 1 por defecto
        const quantity = manualQuantities[item.id] || 1;
        
        if (quantity > item.stock) {
            toast.error(`Solo hay ${item.stock} unidades disponibles`);
            return;
        }
        
        // Verificar si ya está en el carrito
        const existingItem = cartItems.find(cartItem => cartItem.id === item.id);
        if (existingItem) {
            // Eliminar primero para evitar duplicados
            dispatch(deleteFromCart({ itemId: item.id, userId: currentUser }));
        }
        
        // Agregar con la cantidad especificada
        dispatch(addQuantityToCart({ 
            item: item, 
            quantity: quantity, 
            userId: currentUser 
        }));
    };

    return (
        <div className="flex flex-wrap -mx-4">
            {getAllProduct.map((item, index) => {
                const isInCart = cartItems.some(cartItem => cartItem.id === item.id);
                const cartItem = cartItems.find(cartItem => cartItem.id === item.id);
                const quantityInCart = cartItem ? cartItem.quantity : 0;
                
                // Inicializar la cantidad manual si no existe
                if (manualQuantities[item.id] === undefined) {
                    manualQuantities[item.id] = 1;
                }
                
                return (
                    <div key={index} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/4 px-4 mb-8">
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div onClick={() => navigate(`/productinfo/${item.id}`)}>
                                <img
                                    src={item.imageUrl}
                                    alt={item.title}
                                    className="w-full h-48 object-contain cursor-pointer"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder.png';
                                    }}
                                />
                                <div className="p-4">
                                    <h2 className="text-lg font-semibold mb-2 cursor-pointer">{item.title}</h2>
                                    <p className="text-gray-600 text-sm mb-2">{item.category}</p>
                                    <p className="text-xl font-bold text-red-500 mb-2">Bs. {item.price}</p>
                                    <p className="text-sm text-gray-500 mb-4">Stock: {item.stock}</p>
                                </div>
                            </div>
                            
                            {/* Contador manual y botón de agregar al carrito */}
                            <div className="px-4 pb-4">
                                <div className="flex items-center space-x-2 mb-2">
                                    <label htmlFor={`quantity-${item.id}`} className="text-sm font-medium">Cantidad:</label>
                                    <input
                                        id={`quantity-${item.id}`}
                                        type="number"
                                        min="1"
                                        max={item.stock}
                                        value={manualQuantities[item.id] || 1}
                                        onChange={(e) => handleQuantityChange(item, e.target.value)}
                                        className="w-16 px-2 py-1 border rounded text-center"
                                    />
                                </div>
                                
                                <button
                                    onClick={() => addCart(item)}
                                    disabled={item.stock <= 0}
                                    className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${
                                        item.stock <= 0 
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-pink-600 hover:bg-pink-700'
                                    }`}
                                >
                                    {item.stock <= 0 ? 'Sin stock' : 'Agregar al carrito'}
                                </button>
                                
                                {/* Mostrar cantidad en carrito si ya está agregado */}
                                {isInCart && quantityInCart > 0 && (
                                    <div className="mt-2 text-center">
                                        <span className="text-sm font-medium text-green-600">
                                            {quantityInCart} en carrito
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HomePageProductCard;