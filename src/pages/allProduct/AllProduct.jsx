import { useNavigate } from "react-router";
import Layout from "../../components/layout/Layout";
import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { addToCart, deleteFromCart } from "../../redux/cartSlice";
import { createSerializableProduct } from "../../utils/productUtils";

const AllProduct = () => {
    // Router hooks
    const navigate = useNavigate();

    // Context
    const context = useContext(myContext);
    const { getAllProduct, loading, loadMoreProducts, hasMore, getAllProductFunction, currentUser } = context;

    // Redux
    const cartItems = useSelector((state) => state.cart);
    const dispatch = useDispatch();

    // Estado para controlar si ya se ha cargado inicialmente
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    // Modificar el useEffect para evitar recargas innecesarias
    useEffect(() => {
        // Solo cargar productos si no hay productos en el contexto o si no se ha hecho la carga inicial
        if ((!getAllProduct || getAllProduct.length === 0) && !initialLoadDone) {
            console.log("AllProduct - Cargando productos iniciales...");
            getAllProductFunction(false); // Usar caché si está disponible
            setInitialLoadDone(true);
        } else {
            console.log("AllProduct - Usando productos en caché:", getAllProduct.length);
        }
    }, [getAllProduct, getAllProductFunction, initialLoadDone]);

    // Funciones para el carrito
    const addCart = (product) => {
        // Serialize the product to avoid non-serializable values
        const serializedProduct = createSerializableProduct(product);
        
        if (serializedProduct && serializedProduct.stock > 0) {
            dispatch(addToCart({ item: serializedProduct, userId: currentUser }));
            toast.success("Producto agregado al carrito");
        } else {
            toast.error("Producto fuera de stock");
        }
    }
    
    const deleteCart = (product) => {
        // Serialize the product to avoid non-serializable values
        const serializedProduct = createSerializableProduct(product);
        
        if (serializedProduct) {
            dispatch(deleteFromCart({ item: serializedProduct, userId: currentUser }));
            toast.success("Producto eliminado del carrito");
        }
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Todos los Productos</h1>
                </div>
                
                {loading ? (
                    <div className="flex justify-center">
                        <div className="spinner-border text-pink-500" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {getAllProduct.map((item, index) => {
                                const { id, title, price, imageUrl, description, stock, hasStockControl } = item;
                                
                                // Determinar si el producto tiene control de stock basado en el campo hasStockControl
                                const isUnlimitedStock = hasStockControl === false;
                                
                                return (
                                    <div key={index} className="p-4 border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 bg-white">
                                        <div onClick={() => navigate(`/productinfo/${id}`)}>
                                            <img 
                                                src={imageUrl} 
                                                alt={title}
                                                className="w-full h-48 object-contain mb-2 cursor-pointer"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = '/placeholder.png';
                                                }}
                                            />
                                            <h2 className="text-lg font-semibold mb-1 cursor-pointer">{title}</h2>
                                            <p className="text-xl font-bold text-red-500 mb-2">Bs. {price}</p>
                                            
                                            {/* Mostrar "ilimitado" o el stock actual */}
                                            <p className="text-sm text-gray-500 mb-4">
                                                Stock: {isUnlimitedStock ? (
                                                    <span className="text-green-600 font-medium">ilimitado</span>
                                                ) : (
                                                    stock
                                                )}
                                            </p>
                                        </div>
                                        
                                        {/* Botón de agregar al carrito */}
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => addCart(item)}
                                                className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 w-full"
                                            >
                                                Agregar al carrito
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Botón para cargar más productos */}
                        {hasMore && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={loadMoreProducts}
                                    className="bg-pink-500 text-white px-6 py-2 rounded-md hover:bg-pink-600"
                                >
                                    Cargar más productos
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default AllProduct;