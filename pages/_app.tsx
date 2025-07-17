import { useEffect } from 'react';
import { AppProps } from 'next/app';
import { processPendingCompletions } from '@/src/services/persistenceService';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { loadUserChartData } from '@/src/supabase/services/habitCharts.service';
import { useChartStore } from '@/store/useChartStore';

export default function App({ Component, pageProps }: AppProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Procesar completaciones pendientes al iniciar
    processPendingCompletions();
    
    // También procesar cuando se recupera la conexión
    const handleOnline = () => {
      console.log('Conexión recuperada, procesando completaciones pendientes');
      processPendingCompletions();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    console.log('Estado inicial de autenticación:', { 
      hayUsuario: !!user, 
      userId: user?.id,
      timestamp: new Date().toISOString()
    });
    
    if (user && user.id) {
      console.log('Usuario autenticado, cargando datos de gráficos...');
      
      // Cargar datos con un pequeño retraso para asegurar que todo esté inicializado
      setTimeout(() => {
        loadUserChartData(user.id)
          .then(result => {
            if (result.success) {
              console.log('Datos de gráficos cargados correctamente');
              
              // Verificar el estado del store después de cargar
              const chartStore = useChartStore.getState();
              console.log('Estado del store después de cargar:', {
                balanceData: chartStore.balanceData?.length || 0,
                pieChartData: chartStore.pieChartData?.length || 0,
                performanceData: chartStore.performanceData?.length || 0,
                monthlyTrendData: chartStore.monthlyTrendData?.length || 0,
                yearlyTrendData: chartStore.yearlyTrendData?.length || 0
              });
            } else {
              console.error('Error al cargar datos de gráficos:', result.error);
            }
          })
          .catch(error => {
            console.error('Excepción al cargar datos de gráficos:', error);
          });
      }, 500);
    }
  }, [user]);

  return <Component {...pageProps} />;
} 