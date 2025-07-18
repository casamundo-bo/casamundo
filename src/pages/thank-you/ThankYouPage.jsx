import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';

const ThankYouPage = () => {
    return (
        <Layout>
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-4">
                            <svg 
                                className="h-12 w-12 text-green-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24" 
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M5 13l4 4L19 7"
                                ></path>
                            </svg>
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                            ¡Gracias por su compra!
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Su pedido ha sido procesado correctamente. Pronto recibirá un correo electrónico con los detalles de su compra.
                        </p>
                        <div className="flex flex-col space-y-4">
                            <Link 
                                to="/" 
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                            >
                                Volver al inicio
                            </Link>
                            <Link 
                                to="/user-orders" 
                                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                            >
                                Ver mis pedidos
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ThankYouPage;