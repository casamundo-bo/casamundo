/* eslint-disable react/no-unescaped-entities */
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import myContext from "../../context/myContext";
import { Timestamp, addDoc, collection } from "firebase/firestore";
import { auth, fireDB } from "../../firebase/FirebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import toast from "react-hot-toast";
import Loader from "../../components/loader/Loader";

const Signup = () => {
    const context = useContext(myContext);
    const {loading, setLoading } = context;

    // navigate 
    const navigate = useNavigate();

    // User Signup State - Adding phone and address fields
    const [userSignup, setUserSignup] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",     // New field for phone number
        address: "",   // New field for home address
        role: "user"
    });

    /**========================================================================
     *                          User Signup Function 
    *========================================================================**/

    const userSignupFunction = async () => {
        // validation - Updated to include new fields
        if (userSignup.name === "" || userSignup.email === "" || userSignup.password === "" || 
            userSignup.phone === "" || userSignup.address === "") {
            toast.error("Llene todos los campos por favor")
            return;
        }

        // Phone number validation
        const phoneRegex = /^\d{7,10}$/;
        if (!phoneRegex.test(userSignup.phone)) {
            toast.error("Por favor ingrese un número de teléfono válido (7-10 dígitos)");
            return;
        }
        
        setLoading(true);

        try {
            const users = await createUserWithEmailAndPassword(auth, userSignup.email, userSignup.password);

            // Create user object with new fields
            const user = {
                name: userSignup.name,
                uid: users.user.uid,
                email: users.user.email,
                phone: userSignup.phone,
                address: userSignup.address,
                role: userSignup.role,
                time: Timestamp.now(),
                date: new Date().toLocaleString(
                    "es-ES",
                    {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                    }
                )
            }

            // Add user to firestore
            const userRef = collection(fireDB, "user");
            await addDoc(userRef, user);
            
            // Reset form
            setUserSignup({
                name: "",
                email: "",
                password: "",
                phone: "",
                address: "",
                role: "user"
            })
            
            toast.success("Registro exitoso");
            navigate('/login')
            setLoading(false);

        } catch (error) {
            console.error(error);
            setLoading(false);
            if (error.code === 'auth/email-already-in-use') {
                toast.error("El correo electrónico ya está en uso");
            } else {
                toast.error("Error al registrar usuario");
            }
        }
    }
    return (
        <div className='flex justify-center items-center h-screen'>
            {loading && <Loader />}
            <div className='bg-gray-800 px-10 py-10 rounded-xl'>
                <div className="">
                    <h1 className='text-center text-white text-xl mb-4 font-bold'>Registro</h1>
                </div>
                <div>
                    <input type="text"
                        name='name'
                        value={userSignup.name}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                name: e.target.value
                            })
                        }}
                        className='bg-gray-600 mb-4 px-2 py-2 w-full lg:w-[400px] rounded-lg text-white placeholder:text-gray-200 outline-none'
                        placeholder='Nombre'
                    />
                </div>
                <div>
                    <input type="email"
                        name='email'
                        value={userSignup.email}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                email: e.target.value
                            })
                        }}
                        className='bg-gray-600 mb-4 px-2 py-2 w-full lg:w-[400px] rounded-lg text-white placeholder:text-gray-200 outline-none'
                        placeholder='Correo'
                    />
                </div>
                <div>
                    <input type="password"
                        value={userSignup.password}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                password: e.target.value
                            })
                        }}
                        className='bg-gray-600 mb-4 px-2 py-2 w-full lg:w-[400px] rounded-lg text-white placeholder:text-gray-200 outline-none'
                        placeholder='Contraseña'
                    />
                </div>
                {/* New phone field */}
                <div>
                    <input type="tel"
                        name='phone'
                        value={userSignup.phone}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                phone: e.target.value
                            })
                        }}
                        className='bg-gray-600 mb-4 px-2 py-2 w-full lg:w-[400px] rounded-lg text-white placeholder:text-gray-200 outline-none'
                        placeholder='Teléfono'
                    />
                </div>
                {/* New address field */}
                <div>
                    <input type="text"
                        name='address'
                        value={userSignup.address}
                        onChange={(e) => {
                            setUserSignup({
                                ...userSignup,
                                address: e.target.value
                            })
                        }}
                        className='bg-gray-600 mb-4 px-2 py-2 w-full lg:w-[400px] rounded-lg text-white placeholder:text-gray-200 outline-none'
                        placeholder='Dirección de casa'
                    />
                </div>
                <div className='flex justify-center mb-3'>
                    <button
                        onClick={userSignupFunction}
                        className='bg-red-500 w-full text-white font-bold px-2 py-2 rounded-lg'>
                        Registrarse
                    </button>
                </div>
                <div>
                    <h2 className='text-white'>¿Ya tienes una cuenta? <Link className='text-red-500 font-bold' to={'/login'}>Iniciar Sesión</Link></h2>
                </div>
            </div>
        </div>
    )
}

export default Signup;