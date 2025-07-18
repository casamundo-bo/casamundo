import { useContext, useEffect, useState } from "react";
import myContext from "../../context/myContext";
import { doc, collection, query, where, getDocs, getDoc, deleteDoc } from "firebase/firestore";
import { fireDB } from "../../firebase/FirebaseConfig";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const UserDetail = () => {
    const user = JSON.parse(localStorage.getItem('users'));
    const isAdmin = user?.role === 'admin';
    
    const context = useContext(myContext);
    const { getAllUser, setLoading, getAllUserFunction, loading, hasMore } = context;
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredUsers, setFilteredUsers] = useState([]);

    // Asegurarse de que los datos de usuarios se cargan al montar el componente
    useEffect(() => {
        if (!isAdmin) {
            return; // Si no es admin, no cargar datos de usuarios
        }
        
        console.log("UserDetail montado, cargando usuarios...");
        if (typeof getAllUserFunction === 'function') {
            getAllUserFunction();
        }
    }, [getAllUserFunction, isAdmin]);

    // Agregar un log para depuración
    useEffect(() => {
        console.log("getAllUser actualizado:", getAllUser);
        console.log("Cantidad de usuarios:", getAllUser?.length || 0);
    }, [getAllUser]);

    // Filtrar usuarios cuando cambia el término de búsqueda o la lista de usuarios
    useEffect(() => {
        if (getAllUser && getAllUser.length > 0) {
            if (searchTerm.trim() === "") {
                setFilteredUsers(getAllUser);
            } else {
                const filtered = getAllUser.filter(
                    user => 
                        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                setFilteredUsers(filtered);
            }
        } else {
            setFilteredUsers([]);
        }
    }, [searchTerm, getAllUser]);

    // Reemplazar la función deactivateUser por deleteUser
    const deleteUser = async (userId, userEmail, userRole) => {
        // Confirmar antes de eliminar
        if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userEmail}?`)) {
            return;
        }

        setLoading(true);
        try {
            // Buscar el documento del usuario por su uid
            const userQuery = query(
                collection(fireDB, "user"),
                where("uid", "==", userId)
            );
            
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
                toast.error("Usuario no encontrado");
                setLoading(false);
                return;
            }
            
            // Obtener el ID del documento
            const userDoc = userSnapshot.docs[0];
            const userDocId = userDoc.id;
            
            // Eliminar el usuario
            await deleteDoc(doc(fireDB, "user", userDocId));
            
            // Actualizar la lista de usuarios
            getAllUserFunction(true); // Forzar actualización
            
            toast.success("Usuario eliminado correctamente");
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            toast.error("Error al eliminar el usuario");
        } finally {
            setLoading(false);
        }
    };

    // Función para cargar más usuarios
    const loadMoreUsers = () => {
        if (typeof context.loadMoreUsers === 'function') {
            context.loadMoreUsers();
        }
    };

    // Si no es admin, mostrar mensaje de acceso denegado
    if (!isAdmin) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-bold text-red-500">Acceso Denegado</h2>
                <p className="mt-2">No tienes permisos para ver esta información.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="py-5 flex justify-between items-center">
                <h1 className="text-xl text-pink-300 font-bold">Todos los Usuarios</h1>
                <Link to={'/adduser'}>
                    <button className="px-5 py-2 bg-pink-50 border border-pink-100 rounded-lg">Agregar Usuario</button>
                </Link>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
            </div>

            {loading && <div className="text-center py-4">Cargando...</div>}

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border border-collapse rounded">
                    <thead>
                        <tr className="bg-pink-50">
                            <th className="p-4 border">#</th>
                            <th className="p-4 border">Nombre</th>
                            <th className="p-4 border">Email</th>
                            <th className="p-4 border">ID</th>
                            <th className="p-4 border">Rol</th>
                            <th className="p-4 border">Estado</th>
                            <th className="p-4 border">Fecha</th>
                            <th className="p-4 border">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers && filteredUsers.length > 0 ? (
                            filteredUsers.map((user, index) => (
                                <tr key={user.uid || index} className="hover:bg-pink-50 transition-colors">
                                    <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500">
                                        {index + 1}
                                    </td>
                                    <td className="h-12 px-6">{user.name}</td>
                                    <td className="h-12 px-6">{user.email}</td>
                                    <td className="h-12 px-6">{user.uid}</td>
                                    <td className="h-12 px-6">{user.role}</td>
                                    <td className="h-12 px-6">
                                        <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                        </span>
                                    </td>
                                    <td className="h-12 px-6">{user.date}</td>
                                    <td className="h-12 px-6">
                                        <button
                                            onClick={() => deleteUser(user.uid, user.email, user.role)}
                                            className={`px-4 py-2 text-white rounded transition-colors duration-300
                                                ${user.role === 'admin' 
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-red-500 hover:bg-red-600'}`}
                                            disabled={user.role === 'admin'}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="8" className="h-12 px-6 text-center text-gray-500">
                                    {searchTerm ? "No se encontraron usuarios con ese criterio de búsqueda" : "No hay usuarios para mostrar"}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Load More Button - Only show if not searching and there are more users */}
            {hasMore && !searchTerm && (
                <div className="flex justify-center mt-8">
                    <button 
                        onClick={loadMoreUsers}
                        className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
                        disabled={loading}
                    >
                        {loading ? 'Cargando...' : 'Cargar más usuarios'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserDetail;