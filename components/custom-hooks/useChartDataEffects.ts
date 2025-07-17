import { useEffect, useCallback } from 'react';
import { HabitDataService } from '../services/habitDataManagement/habitDataService';
import { generatePreviousMonthData } from '../services/chartCalculations/previousMonthCalculations';
import { generateTrendData } from '../services/chartCalculations/trendCalculations';
import { Habit } from '../types/types';
import { HabitStatus } from './habitCalculations';
import { ViewPeriodType } from '../types/types';

interface UseChartDataEffectsProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  period: ViewPeriodType;
  selectedHabitIndex: number | undefined;
  setBalanceData: (data: any) => void;
  setPieChartData: (data: any) => void;
  setGraphData: (data: any) => void;
  setPerformanceData: (data: any) => void;
  setPreviousMonthData: (data: any) => void;
  setProgressTrendData: (data: any) => void;
}

export const useChartDataEffects = ({
  habits,
  habitStatus,
  currentDate,
  period,
  selectedHabitIndex,
  setBalanceData,
  setPieChartData,
  setGraphData,
  setPerformanceData,
  setPreviousMonthData,
  setProgressTrendData
}: UseChartDataEffectsProps) => {
  // Consolidar la generación de datos en una única función
  const updateAllChartData = useCallback(() => {
    // Generar todos los datos necesarios
    const data = HabitDataService.generateAllChartData(
      habits, 
      habitStatus, 
      currentDate,
      selectedHabitIndex ?? undefined
    );

    // Actualizar todos los estados relacionados
    HabitDataService.updateAllChartData({
      setBalanceData,
      setPieChartData,
      setGraphData,
      setPerformanceData
    }, data);

    // Generar datos mensuales previos
    const previousMonthDataResult = generatePreviousMonthData(currentDate, habits, habitStatus);
    setPreviousMonthData(previousMonthDataResult);

    // Generar datos de tendencias
    const trendDataResult = generateTrendData(habits, habitStatus, period, currentDate);
    setProgressTrendData(trendDataResult.data);
  }, [habits, habitStatus, currentDate, period, selectedHabitIndex]);

  // Único useEffect para manejar todas las actualizaciones de datos
  useEffect(() => {
    // Actualizar datos inmediatamente
    updateAllChartData();

    // Configurar intervalo de actualización
    const updateInterval = setInterval(updateAllChartData, 60000); // Actualizar cada minuto

    // Función de limpieza
    return () => {
      clearInterval(updateInterval);
    };
  }, [updateAllChartData]);

  return {
    updateAllChartData
  };
}; 