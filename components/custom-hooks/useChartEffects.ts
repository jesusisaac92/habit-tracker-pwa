import { useCallback, useEffect, useState, useRef } from 'react';
import { ChartEffectsService } from '../services/effectsManagement/chartEffectsService';
import { 
  Habit, 
  HabitStatus, 
  BalanceData, 
  GraphDataPoint,
  PerformanceData 
} from '@/components/types/types';

export const useChartEffects = (props: {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  selectedHabitIndex: number | undefined;
  setBalanceData: (data: BalanceData[]) => void;
  setPieChartData: (data: any[]) => void;
  setGraphData: (data: GraphDataPoint[]) => void;
  setPerformanceData: (data: PerformanceData) => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const mountedRef = useRef(true);

  const updateChartData = useCallback(async () => {
    if (!mountedRef.current || !props.habits.length) return;
    
    setIsUpdating(true);
    try {
      const updates = await ChartEffectsService.generateAllChartData(
        props.habits,
        props.habitStatus,
        props.currentDate,
        props.selectedHabitIndex
      );

      if (mountedRef.current) {
        props.setBalanceData(updates.balanceData);
        props.setPieChartData(updates.pieChartData);
        props.setGraphData(updates.graphData);
        props.setPerformanceData(updates.performanceData);
        
        // Guardar en Supabase si hay un usuario autenticado
        const { supabase } = await import('@/src/supabase/config/client');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          const { updateChartData } = await import('@/src/supabase/services/habitCharts.service');
          await updateChartData(user.id, 'balance_data', updates.balanceData);
          await updateChartData(user.id, 'pie_chart_data', updates.pieChartData);
        }
      }
    } catch (error) {
      console.error('Error updating chart data:', error);
    } finally {
      if (mountedRef.current) {
        setIsUpdating(false);
      }
    }
  }, [props]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    updateChartData();
  }, [updateChartData]);

  return { updateChartData, isUpdating };
}; 