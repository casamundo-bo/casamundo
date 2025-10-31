import { useNavigate } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { incrementQuantity, decrementQuantity, addToCart, deleteFromCart, setQuantityForItem } from "../../redux/cartSlice";
import { useContext, useState, useEffect } from "react";
import myContext from "../../context/myContext";
import toast from "react-hot-toast";
import useRealTimeStock from "../../hooks/useRealTimeStock";

const ProductCard = ({ product, addToCart: propAddToCart, removeFromCart, isInCart }) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const cartItems = useSelector((state) => state.cart);
    const { currentUser } = useContext(myContext);
    
    // Estado para el contador manual
    const [manualQuantity, setManualQuantity] = useState(1);
    
    // Destructure product properties safely with fallbacks
    const { 
        id, 
        title = '', 
        price = 0, 
        imageUrl: productImageUrl = '', 
        description = '', 
        stock: initialStock = 0,
        category = '',
        hasStockControl = true // Valor predeterminado es true (tiene control de stock)
    } = product || {};
    
    // Usar el hook de stock en tiempo real
    const { currentStock, hasStockControl: realTimeHasStockControl, loading: stockLoading, checkStockAvailability } = useRealTimeStock(id, initialStock, hasStockControl);
    
    // Actualizar la cantidad manual cuando cambie el stock
    useEffect(() => {
        if (realTimeHasStockControl && manualQuantity > currentStock) {
            setManualQuantity(Math.max(1, currentStock));
        }
    }, [currentStock, manualQuantity, realTimeHasStockControl]);
    
    // Use a consistent image URL variable
    const displayImageUrl = productImageUrl || product?.productImageUrl || '';
    
    // Get current quantity in cart
    const cartItem = cartItems.find(item => item.id === id);
    const quantityInCart = cartItem ? cartItem.quantity : 0;
    
    // Manejar cambio en el contador manual
    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value);
        if (isNaN(value) || value < 1) {
            setManualQuantity(1);
        } else if (realTimeHasStockControl && value > currentStock) {
            setManualQuantity(currentStock);
            toast.error(`Solo hay ${currentStock} unidades disponibles`);
        } else {
            setManualQuantity(value);
        }
    };
    
    // Función para agregar al carrito con cantidad manual
    const handleAddToCart = () => {
        if (realTimeHasStockControl && !checkStockAvailability(manualQuantity)) {
            return;
        }
        
        // Si ya está en el carrito, usar la función setQuantityForItem
        if (cartItem) {
            dispatch(setQuantityForItem({ 
                item: { ...product, stock: currentStock, hasStockControl: realTimeHasStockControl }, 
                quantity: manualQuantity, 
                userId: currentUser || 'guest' 
            }));
        } else {
            // Agregar con la cantidad manual usando el stock actualizado
            dispatch(addToCart({ 
                item: { ...product, stock: currentStock, hasStockControl: realTimeHasStockControl }, 
                quantity: manualQuantity, 
                userId: currentUser || 'guest' 
            }));
        }
        
        toast.success(`${manualQuantity} ${title} agregado al carrito`);
    };
    
    return (
        <div className="p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-white relative">
            {/* Imagen y detalles del producto */}
            <div onClick={() => navigate(`/productinfo/${id}`)}>
                <img 
                    src={displayImageUrl} 
                    alt={title}
                    className="w-full h-48 object-contain mb-2 cursor-pointer"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.png';
                    }}
                />
                <h2 className="text-lg font-semibold mb-1 cursor-pointer">{title}</h2>
                <p className="text-gray-600 text-sm mb-2">{category}</p>
                <p className="text-xl font-bold text-red-500 mb-2">Bs. {price}</p>
                
                {/* Mostrar stock en tiempo real con indicador de carga o "ilimitado" */}
                <div className="flex items-center mb-4">
                    <p className="text-sm text-gray-500">
                        Stock: {stockLoading ? (
                            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin ml-1"></span>
                        ) : !realTimeHasStockControl ? (
                            <span className="text-green-600 font-medium">ilimitado</span>
                        ) : (
                            currentStock
                        )}
                    </p>
                    {realTimeHasStockControl && currentStock <= 5 && currentStock > 0 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            ¡Últimas unidades!
                        </span>
                    )}
                </div>
            </div>
            
            {/* Contador manual y botón de agregar al carrito */}
            <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                    <label htmlFor={`quantity-${id}`} className="text-sm font-medium">Cantidad:</label>
                    <input
                        id={`quantity-${id}`}
                        type="number"
                        min="1"
                        max={!realTimeHasStockControl ? 999 : currentStock}
                        value={manualQuantity}
                        onChange={handleQuantityChange}
                        className="w-16 px-2 py-1 border rounded text-center"
                        disabled={realTimeHasStockControl && currentStock <= 0}
                    />
                </div>
                
                <button
                    onClick={handleAddToCart}
                    disabled={realTimeHasStockControl && (currentStock <= 0 || stockLoading)}
                    className={`w-full py-2 px-4 rounded text-white font-medium transition-colors ${
                        realTimeHasStockControl && (currentStock <= 0 || stockLoading)
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-pink-600 hover:bg-pink-700'
                    }`}
                >
                    {stockLoading ? 'Cargando...' : (realTimeHasStockControl && currentStock <= 0) ? 'Sin stock' : 'Agregar al carrito'}
                </button>
            </div>
            
            {/* Mostrar controles de cantidad si ya está en el carrito */}
            {isInCart && quantityInCart > 0 && (
                <div className="mt-2 flex items-center justify-between bg-gray-100 p-2 rounded">
                    <button 
                        onClick={() => dispatch(decrementQuantity({ 
                            item: { ...product, stock: currentStock, hasStockControl: realTimeHasStockControl }, 
                            userId: currentUser || 'guest' 
                        }))}
                        className="bg-gray-200 px-2 py-1 rounded"
                    >
                        -
                    </button>
                    <span>{quantityInCart}</span>
                    <button 
                        onClick={() => {
                            if (!realTimeHasStockControl || quantityInCart < currentStock) {
                                dispatch(incrementQuantity({ 
                                    item: { ...product, stock: currentStock, hasStockControl: realTimeHasStockControl }, 
                                    userId: currentUser || 'guest' 
                                }));
                            } else {
                                toast.error(`Stock máximo alcanzado (${currentStock})`);
                            }
                        }}
                        className="bg-gray-200 px-2 py-1 rounded"
                        disabled={realTimeHasStockControl && quantityInCart >= currentStock}
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductCard;