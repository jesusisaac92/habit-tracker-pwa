import { useEffect, useCallback } from 'react';
import { 
  Habit, 
  HabitStatus, 
  MonthlyDataType, 
  ProgressDataPoint 
} from '@/components/types/types';
import { DataUpdateService } from '../services/effectsManagement/dataUpdateService';

export const useDataEffects = (
  selectedHabit: Habit | null,
  habitStatus: Record<string, HabitStatus>,
  progressChartData: ProgressDataPoint[],
  setters: {
    setMonthlyData: (data: MonthlyDataType[]) => void;
    setAnnualData: (data: any[]) => void;
    setAnnualSummary: (data: any) => void;
    setGraphData: (data: any[]) => void;
    setProgressChartData: (data: ProgressDataPoint[]) => void;
  }
) => {
  // Efecto para datos anuales
  useEffect(() => {
    if (selectedHabit) {
      const { monthlyData, annualData, annualSummary } = DataUpdateService.updateAnnualData(
        selectedHabit.index,
        new Date().getFullYear(),
        habitStatus
      );
      
      setters.setMonthlyData(monthlyData);
      setters.setAnnualData(annualData);
      setters.setAnnualSummary(annualSummary);
      setters.setGraphData([]);
    }
  }, [selectedHabit, habitStatus, setters]);

  // Efecto para datos de progreso
  useEffect(() => {
    DataUpdateService.updateProgressData(
      progressChartData,
      setters.setProgressChartData
    );
  }, [progressChartData, setters.setProgressChartData]);
}; 