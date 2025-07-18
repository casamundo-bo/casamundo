import { useNavigate, useParams } from "react-router";
import myContext from "../../context/myContext";
import { useContext, useEffect, useState } from "react";
import { Timestamp, doc, getDoc, setDoc } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import toast from "react-hot-toast";
import Loader from "../../components/loader/Loader";

const categoryList = [
    {
        name: 'LISO'
    },
    {
        name: 'CALAMINADO'
    },
    {
        name: 'LUMINOSO'
    },
    {
        name: 'CALAMINADO COLOR ENTERO'
    },
    {
        name: 'INFANTIL'
    },
    {
        name: 'SABANAS'
    },
    {
        name: 'LAMINADO GANSO - MANTAS'
    },
    {
        name: 'LAMINADO - MANTA LUMINOSA'
    }
];

// Define subcategories for each main category
const sizeOptions = {
    'LISO': ['TWIN', 'QUEEN', 'KING'],
    'CALAMINADO': ['QUEEN'],
    'LUMINOSO': ['TWIN', 'FULL', 'QUEEN', 'KING'],
    'CALAMINADO COLOR ENTERO': ['FULL'],
    'INFANTIL': ['TWIN'],
    'SABANAS': ['FULL'],
    'LAMINADO GANSO - MANTAS': ['TWIN', 'FULL'],
    'LAMINADO - MANTA LUMINOSA': ['UNA PLAZA', 'DOS PLAZAS']
};

const UpdateProductPage = () => {
    const context = useContext(myContext);
    const { loading, setLoading, getAllProductFunction } = context;

    // navigate 
    const navigate = useNavigate();
    const { id } = useParams();

    // product state
    // Inside the useState initialization for product
    const [product, setProduct] = useState({
        title: "",
        price: "",
        imageUrl: "",
        category: "",
        subcategory: "",
        description: "",
        stock: 0,
        hasStockControl: true, // Add this field with default value
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

    // Show size options based on selected category
    const [showSizeOptions, setShowSizeOptions] = useState(false);
    const [availableSizes, setAvailableSizes] = useState([]);
    const [originalTitle, setOriginalTitle] = useState("");

    // Extract base title and size from product title
    const extractTitleAndSize = (fullTitle, category) => {
        if (!fullTitle || !category || !sizeOptions[category]) return { baseTitle: fullTitle, size: "" };
        
        // Check if title ends with any of the sizes for this category
        for (const size of sizeOptions[category]) {
            if (fullTitle.endsWith(` - ${size}`)) {
                return {
                    baseTitle: fullTitle.replace(` - ${size}`, ''),
                    size: size
                };
            }
        }
        
        return { baseTitle: fullTitle, size: "" };
    };

    // Get single product function
    const getSingleProductFunction = async () => {
        setLoading(true);
        try {
            const productTemp = await getDoc(doc(fireDB, "products", id));
            const productData = productTemp.data();
            
            // Extract base title and size if applicable
            const { baseTitle, size } = extractTitleAndSize(productData.title, productData.category);
            
            setProduct({
                ...productData,
                title: baseTitle,
                size: size || ""
            });
            
            setOriginalTitle(productData.title);
            
            // Set size options if category has them
            if (productData.category && sizeOptions[productData.category]) {
                setShowSizeOptions(true);
                setAvailableSizes(sizeOptions[productData.category]);
            }
            
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    // Update showSizeOptions when category changes
    useEffect(() => {
        if (product.category && sizeOptions[product.category]) {
            setShowSizeOptions(true);
            setAvailableSizes(sizeOptions[product.category]);
        } else {
            setShowSizeOptions(false);
            setAvailableSizes([]);
            // Reset size if changing to a category without sizes
            setProduct({...product, size: ""});
        }
    }, [product.category]);

    useEffect(() => {
        getSingleProductFunction();
    }, []);

    // Update product function
    const updateProduct = async () => {
        // Validation
        if (
            product.title === "" || 
            product.price === "" || 
            product.productImageUrl === "" || 
            product.category === "" || 
            product.description === "" ||
            (product.hasStockControl && (product.stock === 0 || product.stock === "")) ||
            (showSizeOptions && product.size === "")
        ) {
            return toast.error("Todos los campos son obligatorios");
        }
    
        setLoading(true);
        try {
            // If it's a category with size options, include the size in the title
            let finalTitle = product.title;
            if (showSizeOptions && product.size) {
                finalTitle = `${product.title} - ${product.size}`;
            }
    
            // Create product object with all fields
            const productData = {
                ...product,
                title: finalTitle,
                // If no stock control, set a high value
                stock: !product.hasStockControl ? 999999 : product.stock,
                time: Timestamp.now()
            };
    
            // Update in Firestore
            await setDoc(doc(fireDB, "products", id), productData);
            
            toast.success("Producto actualizado exitosamente");
            getAllProductFunction();
            navigate('/admin-dashboard');
            
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar el producto");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <div className="bg-red-600 text-white p-3 flex">
                <div className="flex items-center">
                    <a href="/" className="text-xl font-bold mr-6">C - M</a>
                    <a href="/" className="mr-4">Inicio</a>
                    <a href="/allproduct" className="mr-4">Todos los productos</a>
                    <a href="/admin-dashboard" className="mr-4">Dashboard</a>
                </div>
            </div>

            {loading && <Loader />}

            {/* Update Product Form */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-2xl font-bold mb-6 text-center text-pink-600">Actualizar Producto</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Title */}
                        <div>
                            <label className="block text-gray-700 mb-2">Título</label>
                            <input
                                type="text"
                                name="title"
                                value={product.title}
                                onChange={(e) => setProduct({...product, title: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="Nombre del producto"
                            />
                        </div>
                        
                        {/* Price */}
                        <div>
                            <label className="block text-gray-700 mb-2">Precio</label>
                            <input
                                type="number"
                                name="price"
                                value={product.price}
                                onChange={(e) => setProduct({...product, price: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="Precio del producto"
                            />
                        </div>
                        
                        {/* Image URL */}
                        <div>
                            <label className="block text-gray-700 mb-2">URL de la Imagen</label>
                            <input
                                type="text"
                                name="productImageUrl"
                                value={product.productImageUrl}
                                onChange={(e) => setProduct({...product, productImageUrl: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                placeholder="URL de la imagen"
                            />
                        </div>
                        
                        {/* Category */}
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
                        
                        {/* Size (conditional) */}
                        {showSizeOptions && (
                            <div>
                                <label className="block text-gray-700 mb-2">Tamaño</label>
                                <select
                                    name="size"
                                    value={product.size}
                                    onChange={(e) => setProduct({...product, size: e.target.value})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                >
                                    <option value="">Seleccionar Tamaño</option>
                                    {availableSizes.map((size, index) => (
                                        <option key={index} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Stock control - Add this before the stock input */}
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
                        
                        {/* Stock - Only show when hasStockControl is true */}
                        {product.hasStockControl && (
                            <div>
                                <label className="block text-gray-700 mb-2">Stock</label>
                                <input
                                    type="number"
                                    name="stock"
                                    value={product.stock}
                                    onChange={(e) => setProduct({...product, stock: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    placeholder="Cantidad disponible"
                                    min="0"
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Description */}
                    <div className="mt-6">
                        <label className="block text-gray-700 mb-2">Descripción</label>
                        <textarea
                            name="description"
                            value={product.description}
                            onChange={(e) => setProduct({...product, description: e.target.value})}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Descripción del producto"
                            rows="4"
                        ></textarea>
                    </div>
                    
                    <div className="mt-6">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={updateProduct}
                                className="bg-pink-500 text-white font-bold py-2 px-4 rounded"
                                disabled={loading}
                            >
                                {loading ? "Actualizando..." : "Actualizar Producto"}
                            </button>
                            <a
                                href="/admin-dashboard"
                                className="text-pink-500 font-bold"
                            >
                                Cancelar
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateProductPage;