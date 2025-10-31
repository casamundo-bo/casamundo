import { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';
import myContext from '../../context/myContext';
import Layout from '../../components/layout/Layout';
import ProductCard from '../../components/productCard/ProductCard';
import Loader from '../../components/loader/Loader';

const SearchResults = () => {
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('q');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const context = useContext(myContext);

  useEffect(() => {
    // Simplificar la consulta para evitar errores
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Consulta simple sin orderBy
        const q = query(collection(fireDB, 'products'));
        
        const querySnapshot = await getDocs(q);
        console.log(`Búsqueda: consulta devolvió ${querySnapshot.docs.length} documentos`);
        
        // Filtrar productos que coincidan con la búsqueda
        const filteredProducts = [];
        querySnapshot.forEach((doc) => {
          const product = doc.data();
          product.id = doc.id;
          
          // Verificar que los campos existan antes de buscar
          const title = product.title || '';
          const description = product.description || '';
          const category = product.category || '';
          
          if (
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.toLowerCase().includes(searchQuery.toLowerCase())
          ) {
            filteredProducts.push(product);
          }
        });
        
        console.log(`Búsqueda: filtrado resultó en ${filteredProducts.length} productos`);
        setProducts(filteredProducts);
      } catch (error) {
        console.error('Error al buscar productos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (searchQuery) {
      fetchProducts();
    }
  }, [searchQuery]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">
          Resultados para: <span className="text-red-600">"{searchQuery}"</span>
        </h2>
        
        {loading ? (
          <div className="flex justify-center">
            <Loader />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl text-gray-600">No se encontraron productos que coincidan con tu búsqueda.</p>
            <p className="mt-2 text-gray-500">Intenta con otras palabras o navega por nuestras categorías.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SearchResults;