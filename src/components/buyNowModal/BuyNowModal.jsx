/* eslint-disable react/prop-types */
import {
    Button,
    Dialog,
    DialogBody,
} from "@material-tailwind/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const BuyNowModal = ({ addressInfo, setAddressInfo, buyNowFunction, isLoading = false, buttonText = "Proceder al pago" }) => {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const navigate = useNavigate();

    const handleOpen = () => {
        // Asegurar que addressInfo tenga valores predeterminados
        // Esto evita errores en el sistema al procesar la orden
        setAddressInfo(prev => ({
            name: prev.name || 'Cliente',
            address: prev.address || 'Dirección no especificada',
            pincode: prev.pincode || '00000',
            phoneNumber: prev.phoneNumber || '0000000000',
            email: prev.email || 'cliente@ejemplo.com',
            city: prev.city || 'Ciudad'
        }));
        
        setOpen(!open);
        setEditMode(false);
    };

    // Función para procesar la compra
    const handleConfirmPurchase = async () => {
        try {
            // Llamar a la función de compra
            await buyNowFunction();
            setOpen(false);
            
            // Redireccionar a la página de agradecimiento
            navigate('/thank-you');
        } catch (error) {
            console.error("Error al procesar la compra:", error);
            // Mantener el modal abierto en caso de error
        }
    };

    // Función para manejar cambios en los campos
    const handleChange = (e) => {
        const { name, value } = e.target;
        setAddressInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para habilitar la edición de datos
    const toggleEditMode = () => {
        setEditMode(!editMode);
    };

    return (
        <>
            <button
                onClick={handleOpen}
                className="w-full bg-pink-500 text-white py-2 rounded-md hover:bg-pink-600 transition-all"
            >
                Comprar Ahora
            </button>

            <Dialog open={open} handler={handleOpen} size="md">
                <DialogBody>
                    <div className="p-4">
                        <h2 className="text-2xl font-bold mb-4">Confirmar Compra</h2>
                        
                        {!editMode ? (
                            // Modo de visualización - Solo mostrar datos
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Datos de entrega:</h3>
                                <div className="bg-gray-50 p-4 rounded-md">
                                    <p><span className="font-medium">Nombre:</span> {addressInfo.name}</p>
                                    <p><span className="font-medium">Teléfono:</span> {addressInfo.phoneNumber}</p>
                                    <p><span className="font-medium">Email:</span> {addressInfo.email}</p>
                                    <p><span className="font-medium">Dirección:</span> {addressInfo.address}</p>
                                    <p><span className="font-medium">Ciudad:</span> {addressInfo.city}</p>
                                    <p><span className="font-medium">Código postal:</span> {addressInfo.pincode}</p>
                                </div>
                                <button 
                                    onClick={toggleEditMode}
                                    className="mt-2 text-blue-500 hover:text-blue-700"
                                >
                                    Editar información
                                </button>
                            </div>
                        ) : (
                            // Modo de edición - Formulario para editar datos
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-2">Editar datos de entrega:</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={addressInfo.name}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                        <input
                                            type="text"
                                            name="phoneNumber"
                                            value={addressInfo.phoneNumber}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={addressInfo.email}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={addressInfo.address}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={addressInfo.city}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={addressInfo.pincode}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={toggleEditMode}
                                    className="mt-2 text-blue-500 hover:text-blue-700"
                                >
                                    Confirmar datos
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleOpen}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmPurchase}
                                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
                            >
                                Confirmar Compra
                            </button>
                        </div>
                    </div>
                </DialogBody>
            </Dialog>
        </>
    );
};

export default BuyNowModal;

// Buscar cualquier uso de <img> con atributo srcset y cambiarlo a srcSet
// Por ejemplo:
<img 
  src="imagen.jpg" 
  srcSet="imagen-2x.jpg 2x"  // Correcto: srcSet en lugar de srcset
  alt="Descripción" 
/>