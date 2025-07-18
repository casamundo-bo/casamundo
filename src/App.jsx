import {
  BrowserRouter as Router,
  Route,
  Routes,
} from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import NoPage from "./pages/noPage/NoPage";
import ProductInfo from "./pages/productInfo/ProductInfo";
import ScrollTop from "./components/scrollTop/ScrollTop";
import CartPage from "./pages/cart/CartPage";
import AllProduct from "./pages/allProduct/AllProduct";
import Signup from "./pages/registration/Signup";
import Login from "./pages/registration/Login";
import UserDashboard from "./pages/user/UserDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AddProductPage from "./pages/admin/AddProductPage";
import UpdateProductPage from "./pages/admin/UpdateProductPage";
import AdminOrderCreationPage from "./pages/admin/AdminOrderCreationPage";
import MyState from "./context/myState"; // Changed from "./context/MyState"
import { Toaster } from "react-hot-toast";
import { ProtectedRouteForUser } from "./protectedRoute/ProtectedRouteForUser";
import { ProtectedRouteForAdmin } from "./protectedRoute/ProtectedRouteForAdmin";
import { ProtectedRouteForAdminOnly } from "./protectedRoute/ProtectedRouteForAdminOnly";
import CategoryPage from "./pages/category/CategoryPage";
import AddUser from "./pages/admin/AddUser";
import SearchResults from './pages/search/SearchResults';
import UserDebtsPage from "./pages/user/UserDebtsPage";
import AdminDebtsPage from "./pages/admin/AdminDebtsPage"; // Add this import
import AdminReportsPage from "./pages/admin/AdminReportsPage"; // Add this import
import CartDebug from "./components/debug/CartDebug";
import TimestampPatcher from './components/debug/TimestampPatcher';
import OrderPage from './pages/order/OrderPage'; // Asegúrate de que este componente exista

// Importar el nuevo componente
import UserOrdersPage from "./pages/user/UserOrdersPage";
// Importar el nuevo componente
import OrderDetailPage from "./pages/admin/OrderDetailPage";
import ThankYouPage from "./pages/thank-you/ThankYouPage";

function App() {
  return (
    <>
      {/* Componentes de depuración comentados
      <TimestampPatcher />
      <CartDebug />
      <OrderDebug />
      <UserOrdersDebug />
      <OrderDiagnostic />
      <OrderFixer />
      <RenderDebug />
      <OrderDebugHelper />
      <OrderLoadingHelper />
      <OrdersDebugViewer />
      <UserOrdersDetailDebug />
      <AdminCartDebug />
      <AdminOrderDebug />
      <OrderStatusDebug />
      */}
      <MyState>
        <Router>
          <ScrollTop />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/allproduct" element={<AllProduct />} />
            <Route path="/productinfo/:id" element={<ProductInfo />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/category/:category/:subcategory" element={<CategoryPage />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/thank-you" element={<ThankYouPage />} />
            
            {/* User Routes */}
            <Route path="/user-dashboard" element={
              <ProtectedRouteForUser>
                <UserDashboard />
              </ProtectedRouteForUser>
            } />
            <Route path="/user-orders" element={
              <ProtectedRouteForUser>
                <UserOrdersPage />
              </ProtectedRouteForUser>
            } />
            <Route path="/user-debts" element={
              <ProtectedRouteForUser>
                <UserDebtsPage />
              </ProtectedRouteForUser>
            } />
            
            {/* Admin & Operator Routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRouteForAdmin>
                <AdminDashboard />
              </ProtectedRouteForAdmin>
            } />
            
            {/* Añadir la nueva ruta para detalles de orden */}
            <Route path="/admin/order/:id" element={
              <ProtectedRouteForAdmin>
                <OrderDetailPage />
              </ProtectedRouteForAdmin>
            } />
            
            {/* Rutas de productos */}
            <Route 
              path="/add-product" 
              element={
                <ProtectedRouteForAdmin>
                  <AddProductPage />
                </ProtectedRouteForAdmin>
              } 
            />
            
            {/* Ruta original con guiones */}
            <Route 
              path="/update-product/:id" 
              element={
                <ProtectedRouteForAdmin>
                  <UpdateProductPage />
                </ProtectedRouteForAdmin>
              } 
            />
            
            {/* Nueva ruta sin guiones para compatibilidad */}
            <Route 
              path="/updateproduct/:id" 
              element={
                <ProtectedRouteForAdmin>
                  <UpdateProductPage />
                </ProtectedRouteForAdmin>
              } 
            />
            
            <Route path="/admin-orders" element={
              <ProtectedRouteForAdmin>
                <AdminOrderCreationPage />
              </ProtectedRouteForAdmin>
            } />
            
            {/* Admin Only Routes */}
            <Route path="/add-user" element={
              <ProtectedRouteForAdminOnly>
                <AddUser />
              </ProtectedRouteForAdminOnly>
            } />
            <Route path="/admin-debts" element={
              <ProtectedRouteForAdminOnly>
                <AdminDebtsPage />
              </ProtectedRouteForAdminOnly>
            } />
            <Route path="/admin-reports" element={
              <ProtectedRouteForAdminOnly>
                <AdminReportsPage />
              </ProtectedRouteForAdminOnly>
            } />
            
            <Route path="/*" element={<NoPage />} />
            {/* Asegúrate de que esta ruta esté presente */}
            <Route path="/order/:id" element={
              <ProtectedRouteForUser>
                <OrderPage />
              </ProtectedRouteForUser>
            } />
            
            {/* Resto de rutas */}
          </Routes>
          <Toaster />
        </Router>
      </MyState>
    </>
  );
}

export default App;