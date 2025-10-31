import React, { useContext, useState, useEffect, useRef } from 'react';
import myContext from '../../context/myContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const OrderDebug = () => {
    const context = useContext(myContext);
    const { loading, getAllOrder, getAllOrderFunction } = context;
    
    // Track loading state changes
    const [loadingHistory, setLoadingHistory] = useState([]);
    const [orderHistory, setOrderHistory] = useState([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [stableLoading, setStableLoading] = useState(false);
    const [firestoreOrders, setFirestoreOrders] = useState([]);
    
    // Use refs to prevent excessive updates
    const loadingTimeoutRef = useRef(null);
    const loadingCountRef = useRef(0);
    
    // Handle both possible structures of getAllOrder
    const orders = Array.isArray(getAllOrder) ? getAllOrder : [];
    
    // Verificar directamente en Firestore
    useEffect(() => {
        const checkFirestore = async () => {
            try {
                const q = query(
                    collection(fireDB, 'orders'), // Cambiado de 'order' a 'orders'
                    orderBy('time', 'desc')
                );
                
                const querySnapshot = await getDocs(q);
                setFirestoreOrders(querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })));
                
                console.log("OrderDebug: Firestore orders count:", querySnapshot.docs.length);
                
                if (querySnapshot.docs.length > 0 && (!orders || orders.length === 0)) {
                    console.warn("OrderDebug: Firestore has orders but context doesn't!");
                    
                    // Intentar forzar la actualización
                    if (typeof getAllOrderFunction === 'function') {
                        console.log("OrderDebug: Forcing order refresh...");
                        getAllOrderFunction(true).catch(console.error);
                    }
                }
            } catch (error) {
                console.error("OrderDebug: Error checking Firestore", error);
            }
        };
        
        checkFirestore();
        
        // Verificar cada 30 segundos
        const intervalId = setInterval(checkFirestore, 30000);
        
        return () => clearInterval(intervalId);
    }, [getAllOrderFunction, orders]);
    
    // Monitor loading state changes with debounce
    useEffect(() => {
        const timestamp = new Date();
        
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
        }
        
        // Count rapid loading changes
        if (loading) {
            loadingCountRef.current += 1;
            
            // Force loading to complete if it's been too long (5 seconds)
            if (loadingCountRef.current > 10) {
                console.warn("OrderDebug: Forcing loading to complete after too many changes");
                setTimeout(() => {
                    loadingCountRef.current = 0;
                }, 5000);
            }
        }
        
        // Update loading history after a short delay
        loadingTimeoutRef.current = setTimeout(() => {
            setLoadingHistory(prev => {
                if (prev.length > 0 && prev[prev.length - 1].state === loading) {
                    return prev; // No change
                }
                
                // Add new entry
                const newEntry = {
                    timestamp,
                    state: loading
                };
                
                // Keep only last 10 entries
                const updated = [...prev, newEntry].slice(-10);
                
                // Check if loading state has been stable
                const stableTime = 2000; // 2 seconds
                const now = new Date();
                const isStable = updated.length > 1 && 
                    updated[updated.length - 1].state === false &&
                    (now - updated[updated.length - 1].timestamp) > stableTime;
                
                setStableLoading(isStable);
                
                return updated;
            });
            
            // Update order history if loading just completed
            if (!loading) {
                setOrderHistory(prev => {
                    const newEntry = {
                        timestamp,
                        count: orders.length
                    };
                    
                    // Keep only last 5 entries
                    return [...prev, newEntry].slice(-5);
                });
                
                setLastUpdate(timestamp);
            }
        }, 300);
        
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [loading, orders]);
    
    // Render debug info
    return (
        <div className="bg-gray-100 p-4 rounded-lg mb-6 text-xs">
            <h3 className="font-semibold mb-2">Debug Info</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p><span className="font-medium">Context Orders:</span> {orders.length}</p>
                    <p><span className="font-medium">Firestore Orders:</span> {firestoreOrders.length}</p>
                    <p><span className="font-medium">Loading:</span> {loading ? 'Yes' : 'No'}</p>
                    <p><span className="font-medium">Last Update:</span> {lastUpdate.toLocaleTimeString()}</p>
                </div>
                
                <div>
                    <p><span className="font-medium">Loading History:</span></p>
                    <ul className="text-xs">
                        {loadingHistory.map((entry, index) => (
                            <li key={index}>
                                {entry.timestamp.toLocaleTimeString()} - {entry.state ? 'Loading' : 'Idle'}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <div className="mt-2">
                <button 
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-2"
                    onClick={() => {
                        if (typeof getAllOrderFunction === 'function') {
                            getAllOrderFunction(true);
                        }
                    }}
                >
                    Force Refresh
                </button>
                
                {firestoreOrders.length > 0 && orders.length === 0 && (
                    <p className="text-red-500 mt-2">
                        ¡ADVERTENCIA! Hay órdenes en Firestore pero no en el contexto.
                    </p>
                )}
            </div>
        </div>
    );
};

export default OrderDebug;