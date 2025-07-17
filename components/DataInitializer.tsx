import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { loadUserChartData } from '@/src/supabase/services/habitCharts.service';
import { useChartStore } from '@/store/useChartStore';
import { supabase } from '@/src/supabase/config/client';

interface DataInitializerProps {
  children: ReactNode;
}

export const DataInitializer = ({ children }: DataInitializerProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const initializeData = async () => {
      if (user?.id) {
        console.log('[DEBUG][DataInitializer] 🔍 INICIO: Cargando datos para usuario', user.id);
        
        // Verificar estado inicial del store
        const initialStore = useChartStore.getState();
        console.log('[DEBUG][DataInitializer] Estado inicial del store:', {
          balanceData: initialStore.balanceData?.length || 0,
          pieData: initialStore.pieChartData?.length || 0,
          yearlyData: initialStore.yearlyTrendData?.length || 0
        });

        // Verificar datos en Supabase antes de cargar
        const { data: existingData } = await supabase
          .from('habit_charts')
          .select('*')
          .eq('user_id', user.id)
          .eq('chart_type', 'yearly_trend_data')
          .single();
        
        console.log('[DEBUG][DataInitializer] Datos existentes en Supabase:', existingData);

        try {
          const result = await loadUserChartData(user.id);
          console.log('[DEBUG][DataInitializer] Resultado de carga:', result);

          if (result.success) {
            // Verificar estado final del store
            const finalStore = useChartStore.getState();
            console.log('[DEBUG][DataInitializer] Estado final del store:', {
              balanceData: finalStore.balanceData?.length || 0,
              pieData: finalStore.pieChartData?.length || 0,
              yearlyData: finalStore.yearlyTrendData?.length || 0
            });

            // Verificar datos específicos de la gráfica anual
            if (finalStore.yearlyTrendData?.length > 0) {
              console.log('[DEBUG][DataInitializer] Muestra de datos anuales:', 
                finalStore.yearlyTrendData[0]);
            } else {
              console.log('[DEBUG][DataInitializer] No hay datos anuales en el store');
            }
          } else {
            console.error('[ERROR][DataInitializer] Error al cargar datos:', result.error);
            setError(result.error);
          }
        } catch (err) {
          console.error('[ERROR][DataInitializer] Error durante la inicialización:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
      setIsLoading(false);
    };

    initializeData();
  }, [user?.id]);
  
  if (isLoading) {
    return <div>Cargando datos...</div>;
  }
  
  if (error) {
    return <div>Error al cargar datos: {error.message}</div>;
  }
  
  return children;
}; 