import { useEffect, useRef } from 'react';
import { safeText } from '../../utils/productUtils';

const TimestampPatcher = () => {
  const originalToStringRef = useRef(null);
  const originalValueOfRef = useRef(null);
  const fixAttemptedRef = useRef(false);
  const originalConsoleErrorRef = useRef(console.error);

  useEffect(() => {
    // Guardar la referencia original de console.error
    originalConsoleErrorRef.current = console.error;
    
    // Sobrescribir console.error para detectar errores de Timestamp
    console.error = function(...args) {
      // Verificar si es un error de Timestamp
      const errorMessage = args.join(' ');
      if (
        errorMessage.includes('Objects are not valid as a React child') && 
        errorMessage.includes('seconds') && 
        errorMessage.includes('nanoseconds') &&
        !fixAttemptedRef.current
      ) {
        console.warn('TimestampPatcher: Detectado error de renderizado de Timestamp');
        fixAttemptedRef.current = true;
        
        // Aplicar parche
        setTimeout(() => {
          applyTimestampFixes();
          // Resetear la bandera después de un tiempo para permitir futuros arreglos
          setTimeout(() => {
            fixAttemptedRef.current = false;
          }, 5000);
        }, 0);
      }
      
      // Llamar a la función original
      originalConsoleErrorRef.current.apply(console, args);
    };

    // Guardar referencias originales
    originalToStringRef.current = Object.prototype.toString;
    originalValueOfRef.current = Object.prototype.valueOf;
    
    // Función para aplicar los parches
    const applyTimestampFixes = () => {
      // Parche para Object.prototype.toString
      Object.prototype.toString = function() {
        // Si es un objeto Timestamp de Firestore
        if (
          this && 
          typeof this === 'object' && 
          'seconds' in this && 
          'nanoseconds' in this
        ) {
          return safeText(this);
        }
        
        // Comportamiento normal para otros objetos
        return originalToStringRef.current.call(this);
      };

      // Parche para Object.prototype.valueOf
      Object.prototype.valueOf = function() {
        // Si es un objeto Timestamp de Firestore
        if (
          this && 
          typeof this === 'object' && 
          'seconds' in this && 
          'nanoseconds' in this
        ) {
          // Convertir a string usando safeText
          return safeText(this);
        }
        
        // Comportamiento normal para otros objetos
        return originalValueOfRef.current.call(this);
      };
      
      // Parche directo para Timestamp
      if (window && typeof window === 'object') {
        // Intentar encontrar la clase Timestamp en el objeto global
        const globalObj = window;
        
        // Buscar en todas las propiedades del objeto global
        Object.keys(globalObj).forEach(key => {
          try {
            const obj = globalObj[key];
            // Si encontramos un objeto que tiene una propiedad Timestamp
            if (obj && typeof obj === 'object' && obj.Timestamp) {
              const TimestampClass = obj.Timestamp;
              
              // Sobrescribir el método toString de la clase Timestamp
              if (TimestampClass.prototype && !TimestampClass._patched) {
                const originalTimestampToString = TimestampClass.prototype.toString;
                
                TimestampClass.prototype.toString = function() {
                  return safeText(this);
                };
                
                // Marcar como parcheado para evitar múltiples parches
                TimestampClass._patched = true;
                
                console.log('TimestampPatcher: Clase Timestamp parcheada');
              }
            }
          } catch (e) {
            // Ignorar errores al acceder a propiedades
          }
        });
      }
      
      console.log('TimestampPatcher: Parches aplicados');
    };

    // Aplicar parches inmediatamente
    applyTimestampFixes();

    // Limpiar al desmontar
    return () => {
      // Restaurar console.error original
      console.error = originalConsoleErrorRef.current;
      
      // Restaurar Object.prototype.toString original
      if (originalToStringRef.current) {
        Object.prototype.toString = originalToStringRef.current;
      }
      
      // Restaurar Object.prototype.valueOf original
      if (originalValueOfRef.current) {
        Object.prototype.valueOf = originalValueOfRef.current;
      }
      
      console.log('TimestampPatcher: Parches eliminados');
    };
  }, []);

  return null; // Este componente no renderiza nada
};

export default TimestampPatcher;