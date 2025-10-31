import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import myContext from "../../context/myContext";
import Loader from "../loader/Loader";
import { deleteDoc, doc } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import toast from "react-hot-toast";

const ProductDetail = () => {
    const context = useContext(myContext);
    const { loading, setLoading, getAllProduct, getAllProductFunction, loadMoreProducts, hasMore } = context;
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredProducts, setFilteredProducts] = useState([]);

    useEffect(() => {
        getAllProductFunction();
    }, []);

    // Filtrar productos cuando cambia el término de búsqueda
    useEffect(() => {
        if (getAllProduct && getAllProduct.length > 0) {
            if (searchTerm.trim() === "") {
                setFilteredProducts(getAllProduct);
            } else {
                const filtered = getAllProduct.filter(
                    product => 
                        product.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        product.category?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setFilteredProducts(filtered);
            }
        } else {
            setFilteredProducts([]);
        }
    }, [searchTerm, getAllProduct]);

    const navigate = useNavigate();

    const deleteProduct = async (id) => {
        setLoading(true)
        try {
            await deleteDoc(doc(fireDB, 'products', id))
            toast.success('Producto eliminado exitosamente')
            getAllProductFunction(true); // Forzar actualización
            setLoading(false)
        } catch (error) {
            console.error(error)
            toast.error('Error al eliminar el producto')
            setLoading(false)
        }
    }
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Todos los Productos</h2>
            </div>
            
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                />
            </div>
            
            {loading ? (
                <Loader />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-pink-50">
                            <tr>
                                <th className="py-3 px-4 text-left">Imagen</th>
                                <th className="py-3 px-4 text-left">Título</th>
                                <th className="py-3 px-4 text-left">Precio</th>
                                <th className="py-3 px-4 text-left">Categoría</th>
                                <th className="py-3 px-4 text-left">Stock</th>
                                <th className="py-3 px-4 text-left">Fecha</th>
                                <th className="py-3 px-4 text-left">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((item, index) => {
                                const displayImage = item.imageUrl || item.productImageUrl;
                                
                                return (
                                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-4">
                                            <img 
                                                src={displayImage} 
                                                alt={item.title} 
                                                className="w-16 h-16 object-cover rounded"
                                                onError={(e) => {
                                                    console.log("Error loading image:", displayImage);
                                                    e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                                                }}
                                            />
                                        </td>
                                        <td className="py-3 px-4">{item.title}</td>
                                        <td className="py-3 px-4">Bs. {item.price}</td>
                                        <td className="py-3 px-4">{item.category}</td>
                                        <td className="px-4 py-2 text-center">
                                          {item.hasStockControl === false || item.stock === 999999 ? (
                                            <span className="text-green-600 font-medium">Ilimitado</span>
                                          ) : (
                                            item.stock
                                          )}
                                        </td>
                                        <td className="py-3 px-4">{item.date}</td>
                                        <td className="py-3 px-4 flex space-x-2">
                                            <button
                                                onClick={() => navigate(`/updateproduct/${item.id}`)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(item.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={loadMoreProducts}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
                            >
                                Cargar más productos
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductDetail;