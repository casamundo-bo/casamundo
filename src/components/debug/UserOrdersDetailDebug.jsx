import { useContext, useEffect, useMemo, useState } from 'react';
import myContext from '../../context/myContext';

const UserOrdersDetailDebug = () => {
  const { getAllOrder } = useContext(myContext);
  const [matchingOrders, setMatchingOrders] = useState([]);

  // Obtener usuario de localStorage con manejo de errores
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('users')) || null;
    } catch (err) {
      console.error("Error parsing localStorage 'users':", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user?.email || !Array.isArray(getAllOrder)) {
      console.log("UserOrdersDetailDebug: No hay usuario válido o las órdenes no están listas.");
      return;
    }

    const email = user.email.toLowerCase();

    // Filtrar órdenes por email
    const emailMatches = getAllOrder.filter(order =>
      order.email?.toLowerCase() === email ||
      order.userEmail?.toLowerCase() === email
    );

    setMatchingOrders(emailMatches);

    console.group("=== USER ORDERS DETAIL DEBUG ===");
    console.log(`Email de usuario: ${email}`);
    console.log(`Órdenes encontradas con ese email: ${emailMatches.length}`);
    emailMatches.forEach((order, index) => {
      console.log(`Orden ${index + 1}:`, {
        id: order.id,
        email: order.email,
        userEmail: order.userEmail,
        posiblesIDs: {
          userId: order.userId,
          uid: order.uid,
          Usuario: order.Usuario,
          user_uid: order.user?.uid
        }
      });
    });
    console.groupEnd();
  }, [getAllOrder, user]);

  if (!user?.email || matchingOrders.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-100 rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Debug: Órdenes con tu email</h3>
      <p>Se encontraron <strong>{matchingOrders.length}</strong> órdenes con el email <code>{user.email}</code></p>
      <p className="text-sm text-red-600 mt-2">
        ⚠️ Nota: Estas órdenes existen en la base de datos, pero no se están mostrando correctamente en el panel.
        Esto puede deberse a inconsistencias en los campos de ID de usuario.
      </p>
    </div>
  );
};

export default UserOrdersDetailDebug;
