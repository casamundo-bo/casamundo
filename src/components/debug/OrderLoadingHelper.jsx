import { useContext, useEffect, useState } from 'react';
import myContext from '../../context/myContext';

const OrderLoadingHelper = () => {
  const context = useContext(myContext);
  const { getAllOrderFunction, getAllOrder } = context;
  const [loadAttempt, setLoadAttempt] = useState(0);
  
  useEffect(() => {
    // Force refresh orders when component mounts
    const loadOrders = async () => {
      console.log("OrderLoadingHelper: Forcing order refresh, attempt:", loadAttempt + 1);
      
      if (getAllOrderFunction) {
        try {
          await getAllOrderFunction(true);
          console.log("OrderLoadingHelper: Orders loaded successfully, count:", 
            Array.isArray(getAllOrder) ? getAllOrder.length : 'N/A');
        } catch (error) {
          console.error("OrderLoadingHelper: Error loading orders:", error);
          
          // Retry up to 3 times with increasing delay
          if (loadAttempt < 3) {
            const delay = (loadAttempt + 1) * 2000; // 2s, 4s, 6s
            console.log(`OrderLoadingHelper: Retrying in ${delay/1000}s...`);
            
            setTimeout(() => {
              setLoadAttempt(prev => prev + 1);
            }, delay);
          }
        }
      } else {
        console.error("OrderLoadingHelper: getAllOrderFunction is not available");
      }
    };
    
    loadOrders();
  }, [getAllOrderFunction, loadAttempt]);
  
  return null; // This component doesn't render anything
};

export default OrderLoadingHelper;