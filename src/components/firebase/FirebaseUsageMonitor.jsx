import { useState, useEffect } from 'react';
import { getApp } from 'firebase/app';
import { collection, query, getDocs, getCountFromServer, getFirestore } from 'firebase/firestore';

const FirebaseUsageMonitor = () => {
  const [usageStats, setUsageStats] = useState({
    documentsCount: 0,
    collectionsCount: 0,
    storageUsed: 0,
    dailyReadsUsed: 0,
    dailyWritesUsed: 0,
    readPercentage: 0,
    writePercentage: 0,
    loading: true
  });

  useEffect(() => {
    const fetchUsageStats = async () => {
      try {
        const db = getFirestore(getApp());
        
        // Obtener colecciones principales - Corregir 'order' a 'orders'
        const collections = ['products', 'user', 'orders', 'cart', 'debts'];
        let totalDocs = 0;
        let collectionsFound = 0;
        
        // Contar documentos en cada colección
        for (const collName of collections) {
          try {
            const coll = collection(db, collName);
            const snapshot = await getCountFromServer(coll);
            const count = snapshot.data().count;
            totalDocs += count;
            if (count > 0) collectionsFound++;
            
            // Registrar el recuento para depuración
            console.log(`Collection ${collName}: ${count} documents`);
          } catch (error) {
            console.log(`Colección ${collName} no encontrada o error:`, error);
          }
        }
        
        // Calcular porcentajes de uso (basado en límites gratuitos)
        // Spark plan: 50,000 lecturas/día, 20,000 escrituras/día
        const dailyReadsEstimate = totalDocs * 5; // Estimación: cada doc se lee ~5 veces al día
        const dailyWritesEstimate = totalDocs * 0.2; // Estimación: 20% de docs se modifican al día
        
        const readPercentage = (dailyReadsEstimate / 50000) * 100;
        const writePercentage = (dailyWritesEstimate / 20000) * 100;
        
        // Estimación de almacenamiento (muy aproximada)
        const avgDocSize = 2; // KB
        const storageEstimate = (totalDocs * avgDocSize) / 1024; // En MB
        
        setUsageStats({
          documentsCount: totalDocs,
          collectionsCount: collectionsFound,
          storageUsed: storageEstimate.toFixed(2),
          dailyReadsUsed: dailyReadsEstimate,
          dailyWritesUsed: dailyWritesEstimate,
          readPercentage: readPercentage.toFixed(1),
          writePercentage: writePercentage.toFixed(1),
          loading: false
        });
      } catch (error) {
        console.error("Error al obtener estadísticas de uso:", error);
        setUsageStats(prev => ({...prev, loading: false}));
      }
    };

    fetchUsageStats();
    
    // Actualizar cada hora
    const interval = setInterval(fetchUsageStats, 3600000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (percentage) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (usageStats.loading) {
    return <div className="text-center p-4">Cargando estadísticas de uso...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-bold mb-4">Monitoreo de Uso de Firebase</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-3">
          <h3 className="font-semibold mb-2">Almacenamiento</h3>
          <p>Documentos totales: <span className="font-bold">{usageStats.documentsCount}</span></p>
          <p>Colecciones activas: <span className="font-bold">{usageStats.collectionsCount}</span></p>
          <p>Almacenamiento estimado: <span className="font-bold">{usageStats.storageUsed} MB</span> de 1GB</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min((usageStats.storageUsed / 1024) * 100, 100)}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {((usageStats.storageUsed / 1024) * 100).toFixed(2)}% del límite gratuito
          </p>
        </div>
        
        <div className="border rounded-lg p-3">
          <h3 className="font-semibold mb-2">Operaciones Diarias</h3>
          <p>Lecturas estimadas: <span className={`font-bold ${getStatusColor(usageStats.readPercentage)}`}>
            {usageStats.dailyReadsUsed} / 50,000
          </span></p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
            <div className={`h-2.5 rounded-full ${
              usageStats.readPercentage < 50 ? 'bg-green-500' : 
              usageStats.readPercentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`} style={{ width: `${Math.min(usageStats.readPercentage, 100)}%` }}></div>
          </div>
          
          <p className="mt-3">Escrituras estimadas: <span className={`font-bold ${getStatusColor(usageStats.writePercentage)}`}>
            {usageStats.dailyWritesUsed} / 20,000
          </span></p>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
            <div className={`h-2.5 rounded-full ${
              usageStats.writePercentage < 50 ? 'bg-green-500' : 
              usageStats.writePercentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
            }`} style={{ width: `${Math.min(usageStats.writePercentage, 100)}%` }}></div>
          </div>
        </div>
      </div>
      
      {/* Añadir sección de alertas y recomendaciones */}
      {(parseFloat(usageStats.readPercentage) > 70 || parseFloat(usageStats.writePercentage) > 70 || 
        (usageStats.storageUsed / 1024) * 100 > 70) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-yellow-700 mb-2">⚠️ Acercándose a los límites gratuitos</h3>
          <ul className="list-disc pl-5 text-sm text-yellow-700 space-y-1">
            {parseFloat(usageStats.readPercentage) > 70 && (
              <li>
                <strong>Lecturas elevadas:</strong> Considera implementar caché del lado del cliente y 
                reducir consultas innecesarias.
              </li>
            )}
            {parseFloat(usageStats.writePercentage) > 70 && (
              <li>
                <strong>Escrituras elevadas:</strong> Agrupa múltiples operaciones de escritura en lotes 
                cuando sea posible.
              </li>
            )}
            {(usageStats.storageUsed / 1024) * 100 > 70 && (
              <li>
                <strong>Almacenamiento elevado:</strong> Considera archivar datos antiguos o implementar 
                una política de retención de datos.
              </li>
            )}
            <li>
              <strong>Plan de acción:</strong> Si esperas que el tráfico siga aumentando, considera 
              actualizar al plan Blaze (pago por uso) para evitar interrupciones.
            </li>
          </ul>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600">
        <p className="mb-1"><span className="font-semibold">Nota:</span> Estas son estimaciones basadas en el número de documentos y operaciones típicas.</p>
        <p>Para estadísticas precisas, consulta el <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Panel de Firebase</a>.</p>
        <p className="mt-2"><span className="font-semibold">Importante:</span> Si excedes los límites gratuitos, Firebase te notificará para que actualices al plan de pago por uso. No habrá interrupción inmediata del servicio, pero podrías experimentar limitaciones de rendimiento.</p>
      </div>
    </div>
  );
};

export default FirebaseUsageMonitor;