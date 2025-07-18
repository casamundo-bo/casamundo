import { Timestamp, addDoc, collection } from "firebase/firestore";
import { useContext, useState, useEffect } from "react";
import myContext from "../../context/myContext";
import toast from "react-hot-toast";
import { fireDB } from "../../firebase/FirebaseConfig";
import { useNavigate, Link } from "react-router-dom";
import Loader from "../../components/loader/Loader";
import Layout from "../../components/layout/Layout";
import { categoryList } from "../../data/categories";

const AddProductPage = () => {
    console.log("Renderizando AddProductPage");
    const context = useContext(myContext);
    console.log("Context en AddProductPage:", context);
    const { loading, setLoading } = context;
    const navigate = useNavigate();
    
    const [product, setProduct] = useState({
        title: "",
        price: "",
        imageUrl: "",
        category: "",
        subcategory: "",
        description: "",
        stock: 0,
        hasStockControl: true, // Nuevo campo para controlar si el producto tiene control de stock
        time: Timestamp.now(),
        date: new Date().toLocaleString(
            "es-ES",
            {
                month: "short",
                day: "2-digit",
                year: "numeric",
            }
        )
    });
    
    // Estado para almacenar las subcategorías disponibles
    const [availableSubcategories, setAvailableSubcategories] = useState([]);
    
    // Actualizar subcategorías cuando cambia la categoría
    useEffect(() => {
        if (product.category) {
            const selectedCategory = categoryList.find(cat => cat.name === product.category);
            if (selectedCategory && selectedCategory.subcategories) {
                setAvailableSubcategories(selectedCategory.subcategories);
                // Resetear la subcategoría cuando cambia la categoría
                setProduct(prev => ({ ...prev, subcategory: "" }));
            } else {
                setAvailableSubcategories([]);
            }
        } else {
            setAvailableSubcategories([]);
        }
    }, [product.category]);
    
    const addProduct = async () => {
        if (
            product.title === "" || 
            product.price === "" || 
            product.imageUrl === "" || 
            product.category === "" || 
            product.description === ""
            // Removemos la validación de stock si no hay control de stock
        ) {
            return toast.error("Todos los campos son obligatorios");
        }
        
        // Si no tiene control de stock, establecemos un valor alto por defecto
        const finalProduct = {...product};
        if (!finalProduct.hasStockControl) {
            finalProduct.stock = 999999; // Un número alto para representar "sin límite"
        } else if (finalProduct.stock === "") {
            return toast.error("El stock es obligatorio cuando el control de stock está activado");
        }
        
        setLoading(true);
        
        try {
            // Ensure consistent case for category and subcategory
            const productToSave = {
                ...finalProduct,
                category: finalProduct.category.toUpperCase(),
                subcategory: finalProduct.subcategory.toUpperCase()
            };
            
            console.log("Saving product with:", productToSave);
            
            const productRef = collection(fireDB, "products");
            await addDoc(productRef, productToSave);
            toast.success("Producto añadido correctamente");
            navigate("/admin-dashboard");
        } catch (error) {
            console.error("Error al añadir producto:", error);
            toast.error("Error al añadir producto");
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Añadir Producto</h1>
                
                {loading ? (
                    <Loader />
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Título */}
                            <div>
                                <label className="block text-gray-700 mb-2">Título del Producto</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={product.title}
                                    onChange={(e) => setProduct({...product, title: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                            
                            {/* Precio */}
                            <div>
                                <label className="block text-gray-700 mb-2">Precio</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={product.price}
                                    onChange={(e) => setProduct({...product, price: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                            
                            {/* URL de Imagen */}
                            <div>
                                <label className="block text-gray-700 mb-2">URL de Imagen</label>
                                <input
                                    type="text"
                                    name="imageUrl"
                                    value={product.imageUrl}
                                    onChange={(e) => setProduct({...product, imageUrl: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                />
                            </div>
                            
                            {/* Categoría */}
                            <div>
                                <label className="block text-gray-700 mb-2">Categoría</label>
                                <select
                                    name="category"
                                    value={product.category}
                                    onChange={(e) => setProduct({...product, category: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                >
                                    <option value="">Seleccionar Categoría</option>
                                    {categoryList.map((category, index) => (
                                        <option key={index} value={category.name}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Subcategoría - Nuevo campo */}
                            <div>
                                <label className="block text-gray-700 mb-2">Subcategoría</label>
                                <select
                                    name="subcategory"
                                    value={product.subcategory}
                                    onChange={(e) => setProduct({...product, subcategory: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    disabled={!product.category || availableSubcategories.length === 0}
                                >
                                    <option value="">Seleccionar Subcategoría</option>
                                    {availableSubcategories.map((subcategory, index) => (
                                        <option key={index} value={subcategory}>{subcategory}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Control de Stock - Reemplazado con el nuevo código */}
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Control de Stock
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={product.hasStockControl}
                                        onChange={(e) => setProduct({...product, hasStockControl: e.target.checked})}
                                        className="mr-2 h-5 w-5 text-pink-500"
                                    />
                                    <span className="text-gray-700">
                                        Habilitar control de stock para este producto
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                    {product.hasStockControl 
                                        ? "El producto tendrá un límite de stock según la cantidad especificada." 
                                        : "El producto tendrá stock ilimitado, no se controlará la cantidad disponible."}
                                </p>
                            </div>
                            
                            {/* Stock - Condicionalmente visible con el nuevo código */}
                            {product.hasStockControl && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Stock
                                    </label>
                                    <input
                                        value={product.stock}
                                        onChange={(e) => setProduct({...product, stock: e.target.value})}
                                        type="number"
                                        min="0"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        placeholder="Stock"
                                        required
                                    />
                                </div>
                            )}
                            
                        </div>
                        
                        {/* Descripción */}
                        <div className="mt-6">
                            <label className="block text-gray-700 mb-2">Descripción</label>
                            <textarea
                                name="description"
                                value={product.description}
                                onChange={(e) => setProduct({...product, description: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                rows="4"
                            ></textarea>
                        </div>
                        
                        {/* Botones */}
                        <div className="mt-6 flex justify-end space-x-4">
                            <Link to="/admin-dashboard" className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                                Cancelar
                            </Link>
                            <button
                                onClick={addProduct}
                                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                            >
                                Añadir Producto
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default AddProductPage;