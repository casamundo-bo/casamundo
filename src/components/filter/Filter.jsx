import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";

const Filter = ({ selectedCategory, setSelectedCategory }) => {
    const context = useContext(myContext);
    const { getAllProduct } = context;
    
    // Extract unique categories from products
    const [categories, setCategories] = useState([]);
    
    // 5. Problema con la estructura de la base de datos
    
    //Verifica en Firebase que:
    //1. La colección 'products' existe
    //2. Los documentos tienen los campos esperados (especialmente 'time' si estás ordenando por él)
    
    // 6. Problema con el componente Filter.jsx
    // Añadir verificación de datos
    useEffect(() => {
      console.log("Filter - getAllProduct:", getAllProduct);
      if (getAllProduct && getAllProduct.length > 0) {
        const uniqueCategories = [...new Set(getAllProduct.map(product => product.category))];
        console.log("Categorías únicas:", uniqueCategories);
        setCategories(uniqueCategories);
      } else {
        console.log("No hay productos para extraer categorías");
      }
    }, [getAllProduct]);
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-wrap justify-center gap-4 mb-8">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-md transition-colors ${
                        selectedCategory === 'all'
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    Todos
                </button>
                
                {categories.map((category, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-md transition-colors capitalize ${
                            selectedCategory === category
                                ? 'bg-pink-600 text-white'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Filter;