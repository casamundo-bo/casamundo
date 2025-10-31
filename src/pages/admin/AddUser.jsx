import { useState, useContext } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import myContext from "../../context/myContext";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";

const AddUser = () => {
    const context = useContext(myContext);
    const { loading, setLoading } = context;
    const navigate = useNavigate();

    const [userData, setUserData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",     // New field for phone number
        address: "",   // New field for home address
        role: "operator" // Default role for new users
    });

    const addUser = async (e) => {
        e.preventDefault();
        
        if (!userData.name || !userData.email || !userData.password || !userData.phone || !userData.address) {
            return toast.error("Todos los campos son requeridos");
        }

        // Phone number validation
        const phoneRegex = /^\d{8}$/;
        if (!phoneRegex.test(userData.phone)) {
            toast.error("Por favor ingrese un número de teléfono válido (8 dígitos)");
            return;
        }

        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
            );

            const user = {
                name: userData.name,
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                phone: userData.phone,
                address: userData.address,
                role: userData.role,
                time: Timestamp.now(),
                date: new Date().toLocaleString(
                    "es-ES",
                    {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                    }
                )
            };

            const userRef = collection(fireDB, "user");
            await addDoc(userRef, user);

            setUserData({
                name: "",
                email: "",
                password: "",
                phone: "",
                address: "",
                role: "operator"
            });

            toast.success("Usuario creado exitosamente");
            navigate('/admin-dashboard');
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("El correo electrónico ya está en uso");
            } else {
                toast.error("Error al crear usuario");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Agregar Nuevo Usuario</h2>
                
                <form onSubmit={addUser}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={userData.name}
                            onChange={(e) => setUserData({...userData, name: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Nombre completo"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Correo Electrónico
                        </label>
                        <input
                            type="email"
                            value={userData.email}
                            onChange={(e) => setUserData({...userData, email: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={userData.password}
                            onChange={(e) => setUserData({...userData, password: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Contraseña"
                        />
                    </div>
                    
                    {/* New phone field */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            value={userData.phone}
                            onChange={(e) => setUserData({...userData, phone: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Número de teléfono"
                        />
                    </div>
                    
                    {/* New address field */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Dirección
                        </label>
                        <input
                            type="text"
                            value={userData.address}
                            onChange={(e) => setUserData({...userData, address: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Dirección de casa"
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Rol
                        </label>
                        <select
                            value={userData.role}
                            onChange={(e) => setUserData({...userData, role: e.target.value})}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="operator">Operador</option>
                            <option value="admin">Administrador</option>
                            <option value="user">Usuario</option>
                        </select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                        >
                            {loading ? 'Creando...' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
                
                <div className="mt-4 text-center">
                    <Link to="/admin-dashboard" className="text-blue-500 hover:text-blue-700">
                        Volver al Panel de Administración
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AddUser;