import { useContext, useEffect } from 'react';
import myContext from '../../context/myContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { fireDB } from '../../firebase/FirebaseConfig';

const OrderDebugHelper = () => {
  const context = useContext(myContext);
  const { getAllOrder, getAllOrderFunction } = context;
  
  useEffect(() => {
    const checkOrdersDirectly = async () => {
      try {
        console.log("=== ORDER DEBUG HELPER ===");
        console.log("Orders in context:", getAllOrder?.length || 0);
        
        // Check Firestore directly
        const q = query(
          collection(fireDB, 'orders'),
          orderBy('time', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        console.log("Orders in Firestore:", querySnapshot.docs.length);
        
        if (querySnapshot.docs.length > 0) {
          // Show details of the first few orders
          querySnapshot.docs.slice(0, 3).forEach((doc, index) => {
            const orderData = doc.data();
            console.log(`Order ${index + 1}:`, {
              id: doc.id,
              userId: orderData.userId || orderData.uid || 'N/A',
              email: orderData.email || orderData.userEmail || 'N/A',
              status: orderData.status || orderData.orderStatus || 'N/A',
              time: orderData.time ? new Date(orderData.time.seconds * 1000).toLocaleString() : 'N/A',
              totalAmount: orderData.totalAmount || orderData.orderAmount || 'N/A'
            });
          });
        } else {
          console.log("No orders found in Firestore.");
        }
      } catch (error) {
        console.error("Error checking orders:", error);
      }
    };
    
    checkOrdersDirectly();
  }, [getAllOrder]);
  
  return null; // This component doesn't render anything
};

export default OrderDebugHelper;