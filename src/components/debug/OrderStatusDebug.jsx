import { useContext, useEffect } from 'react';
import myContext from '../../context/myContext';
import { collection, getDocs, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const OrderStatusDebug = () => {
    const context = useContext(myContext);
    const { getAllOrder, getAllOrderFunction } = context;
    
    useEffect(() => {
        const checkOrdersDirectly = async () => {
            try {
                console.log("=== ORDER STATUS DEBUG ===");
                console.log("Orders in context:", getAllOrder?.length || 0);
                
                // Verificar directamente en Firestore
                const q = query(
                    collection(fireDB, 'orders'),
                    orderBy('time', 'desc')
                );
                
                const querySnapshot = await getDocs(q);
                console.log("Orders in Firestore:", querySnapshot.docs.length);
                
                if (querySnapshot.docs.length > 0) {
                    // Mostrar algunos detalles de la primera orden
                    const firstOrder = querySnapshot.docs[0].data();
                    console.log("First order details:", {
                        id: querySnapshot.docs[0].id,
                        userId: firstOrder.userId || 'N/A',
                        email: firstOrder.email || 'N/A',
                        createdBy: firstOrder.createdBy || 'user',
                        status: firstOrder.status || 'N/A'
                    });
                    
                    // Contar órdenes creadas por admin
                    const adminCreatedOrders = querySnapshot.docs.filter(doc => 
                        doc.data().createdBy === 'admin'
                    ).length;
                    
                    console.log("Admin-created orders:", adminCreatedOrders);
                } else {
                    console.log("No orders found in Firestore. Attempting to create a test order...");
                    
                    // Intentar crear una orden de prueba para verificar permisos
                    try {
                        const testOrder = {
                            test: true,
                            time: Timestamp.now(),
                            status: 'test',
                            createdBy: 'debug',
                            date: new Date().toISOString(),
                            cartItems: [{ name: 'Test Product', price: 10, quantity: 1 }],
                            addressInfo: { name: 'Test User', address: 'Test Address' },
                            totalAmount: 10
                        };
                        
                        const docRef = await addDoc(collection(fireDB, 'orders'), testOrder);
                        console.log("Test order created successfully with ID:", docRef.id);
                        
                        // Forzar actualización de órdenes
                        if (typeof getAllOrderFunction === 'function') {
                            console.log("Forcing order refresh after test order creation");
                            await getAllOrderFunction(true);
                        }
                    } catch (error) {
                        console.error("Failed to create test order:", error);
                        console.log("Error code:", error.code);
                        console.log("Error message:", error.message);
                    }
                }
                
                console.log("=== END ORDER STATUS DEBUG ===");
            } catch (error) {
                console.error("Error in OrderStatusDebug:", error);
                console.log("Error code:", error.code);
                console.log("Error message:", error.message);
            }
        };
        
        checkOrdersDirectly();
    }, [getAllOrder, getAllOrderFunction]);
    
    return null; // Este componente no renderiza nada, solo es para depuración
};

export default OrderStatusDebug;