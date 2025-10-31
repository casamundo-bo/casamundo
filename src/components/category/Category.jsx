// category 
import { useNavigate } from 'react-router';
import { useState } from 'react';

const category = [
    {
        image: 'https://i.postimg.cc/7YphN6np/LISO1.png',
        name: 'EDREDÓN LISO'
    },
    {
        image: 'https://i.postimg.cc/FK195Xpj/CALAMINADO.png',
        name: 'EDREDÓN CALAMINADO'
    },
    {
        image: 'https://i.postimg.cc/QMSWSDt1/LUMINOSO.png',
        name: 'EDREDÓN LUMINOSO'
    },
    {
        image: 'https://i.postimg.cc/26hdwJsD/COLOR-ENTERO.png',
        name: 'EDREDÓN CALAMINADO COLOR ENTERO'
    },
    {
        image: 'https://i.postimg.cc/9FZMf2GV/INFANTIL.png',
        name: 'EDREDÓN INFANTIL'
    },
    {
        image: 'https://i.postimg.cc/cCJRSHKs/SABANAS.png',
        name: 'SABANAS'
    },
    {
        image: 'https://i.postimg.cc/cJr60nhk/LAMINADO-MANTA-GANSO.png',
        name: 'LAMINADO GANSO - MANTAS'
    },
    {
        image: 'https://i.postimg.cc/zXBsdFGQ/LAMINADO-MANTA-LUMINOSA.png',
        name: 'LAMINADO LUMINOSO - MANTAS'
    }
];

// Define subcategories for each main category
const subcategories = {
    'EDREDÓN LISO': ['TWIN', 'QUEEN', 'KING'],
    'EDREDÓN CALAMINADO': ['QUEEN'],
    'EDREDÓN LUMINOSO': ['TWIN', 'FULL', 'QUEEN', 'KING'],
    'EDREDÓN CALAMINADO COLOR ENTERO': ['FULL'],
    'EDREDÓN INFANTIL': ['TWIN'],
    'SABANAS': ['FULL'],
    'LAMINADO GANSO - MANTAS': ['TWIN', 'FULL'],
    'LAMINADO LUMINOSO - MANTAS': ['UNA PLAZA', 'DOS PLAZAS']
};

const Category = () => {
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showSubcategories, setShowSubcategories] = useState(false);
    
    // Function to handle category selection
    const handleCategoryClick = (categoryName) => {
        setSelectedCategory(categoryName);
        setShowSubcategories(true);
    };
    
    // Function to handle subcategory navigation
    const handleSubcategoryClick = (subcategory) => {
        console.log(`Navigating to category: ${selectedCategory}, subcategory: ${subcategory}`);
        navigate(`/category/${encodeURIComponent(selectedCategory)}/${encodeURIComponent(subcategory)}`);
    };
    
    // Function to navigate to main category (all subcategories)
    const handleViewAllClick = () => {
        console.log(`Navigating to category: ${selectedCategory}`);
        navigate(`/category/${encodeURIComponent(selectedCategory)}`);
        setShowSubcategories(false);
        setSelectedCategory(null);
    };
    
    // Function to go back to categories
    const handleBackClick = () => {
        setShowSubcategories(false);
        setSelectedCategory(null);
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-center mb-8 text-pink-700">Nuestras Categorías</h1>
            
            {!showSubcategories ? (
                // Show main categories
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {category.map((item, index) => {
                        return (
                            <div 
                                key={index} 
                                className="flex flex-col items-center bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer"
                                onClick={() => handleCategoryClick(item.name)}
                            >
                                <div className="w-full h-40 flex items-center justify-center mb-4 p-4 rounded-lg bg-[#e5e5e5]">
                                    <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-full h-full object-contain" 
                                    />
                                </div>
                                <h2 className="text-lg font-semibold text-center text-gray-800 capitalize min-h-[3rem] flex items-center">
                                    {item.name.toLowerCase()}
                                </h2>
                            </div>
                        )
                    })}
                </div>
            ) : (
                // Show subcategories for selected category
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-6">
                        <button 
                            onClick={handleBackClick}
                            className="text-pink-600 hover:text-pink-800 flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Volver a categorías
                        </button>
                        <h2 className="text-2xl font-bold text-pink-700 capitalize">{selectedCategory.toLowerCase()}</h2>
                        <button 
                            onClick={handleViewAllClick}
                            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 transition-colors"
                        >
                            Ver todos
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {subcategories[selectedCategory].map((subcat, index) => (
                            <div 
                                key={index} 
                                className="flex flex-col items-center bg-pink-50 rounded-lg shadow-sm p-4 hover:shadow-md hover:bg-pink-100 transition-all cursor-pointer"
                                onClick={() => handleSubcategoryClick(subcat)}
                            >
                                <div className="w-16 h-16 flex items-center justify-center mb-3 rounded-full bg-pink-200">
                                    <span className="text-2xl text-pink-700">{subcat.charAt(0)}</span>
                                </div>
                                <h3 className="text-md font-medium text-center text-gray-800">
                                    {subcat}
                                </h3>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Category;