import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import myContext from "../../context/myContext";
import Loader from "../../components/loader/Loader";
import ProductCard from "../../components/productCard/ProductCard";
import { Link } from "react-router-dom";
import { getSubcategoriesForCategory } from "../../data/categories";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, deleteFromCart } from "../../redux/cartSlice";
import toast from "react-hot-toast";
import { createSerializableProduct } from "../../utils/productUtils";

function CategoryPage() {
  const context = useContext(myContext);
  const { loading, getAllProduct, currentUser } = context;
  const { category, subcategory } = useParams();
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [activeSubcategory, setActiveSubcategory] = useState(subcategory || "");
  const subcategories = getSubcategoriesForCategory(category);
  
  // Add Redux dispatch and cart state
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart);

  useEffect(() => {
    // Set active subcategory from URL params
    if (subcategory) {
      setActiveSubcategory(subcategory);
    }
    
    // Filter products based on category and subcategory
    if (getAllProduct && getAllProduct.length > 0) {
      console.log("Filtering products for:", category, subcategory);
      
      let filtered = getAllProduct.filter(product => 
        product.category && product.category.toUpperCase() === category.toUpperCase()
      );
      
      if (subcategory) {
        filtered = filtered.filter(product => 
          product.subcategory && product.subcategory.toUpperCase() === subcategory.toUpperCase()
        );
      }
      
      console.log("Filtered products:", filtered);
      setFilteredProducts(filtered);
    }
  }, [category, subcategory, getAllProduct]);

  // Add cart functions
  const handleAddToCart = (product) => {
    if (product && product.stock > 0) {
      const serializedProduct = createSerializableProduct(product);
      if (serializedProduct) {
        dispatch(addToCart({ item: serializedProduct, userId: currentUser || 'guest' }));
        toast.success("Producto agregado al carrito");
      }
    } else {
      toast.error("Producto sin stock disponible");
    }
  };

  const handleRemoveFromCart = (product) => {
    if (product) {
      dispatch(deleteFromCart({ 
        itemId: product.id, 
        userId: currentUser || 'guest' 
      }));
      toast.success("Producto eliminado del carrito");
    }
  };

  const isProductInCart = (productId) => {
    return cartItems.some(item => item.id === productId);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-pink-500 mb-6">
          {category} {subcategory ? `- ${subcategory}` : ""}
        </h1>

        {/* Subcategory tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link 
            to={`/category/${category}`}
            className={`px-4 py-2 rounded-md ${!activeSubcategory ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Todos
          </Link>
          
          {subcategories.map((subcat, index) => (
            <Link 
              key={index}
              to={`/category/${category}/${subcat}`}
              className={`px-4 py-2 rounded-md ${activeSubcategory === subcat ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {subcat}
            </Link>
          ))}
        </div>

        {loading ? (
          <Loader />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  addToCart={handleAddToCart}
                  removeFromCart={handleRemoveFromCart}
                  isInCart={isProductInCart(product.id)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-gray-500">No hay productos en esta categoría.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default CategoryPage;