"use client"

import { useEffect, useRef } from 'react';

export function KeepAlive() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Función para mantener viva la sesión
    const keepAlive = () => {
      console.log('Keeping application state alive:', new Date().toISOString());
      // Aquí podríamos hacer una petición ligera al servidor si fuera necesario
    };
    
    // Iniciar un intervalo para mantener viva la aplicación
    intervalRef.current = setInterval(keepAlive, 60000); // Cada minuto
    
    // Manejar eventos de visibilidad
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab is visible again - resuming normal operation');
        // Reiniciar el intervalo cuando la pestaña vuelve a estar visible
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(keepAlive, 60000);
      } else {
        console.log('Tab is hidden - reducing keep-alive frequency');
        // Reducir la frecuencia cuando la pestaña está oculta
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(keepAlive, 300000); // Cada 5 minutos
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Este componente no renderiza nada visible
  return null;
} 