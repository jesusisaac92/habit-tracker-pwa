import { useEffect, useCallback } from 'react';
import { HabitDataService } from '../services/habitDataManagement/habitDataService';
import { chartCalculations } from '../services/chartCalculations/calculations';
import { BarPieChartType, Habit, HabitStatus } from '../types/types';

interface UseDialogAndChartEffectsProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  balancePeriod: string;
  setBalanceData: (data: any) => void;
  setPieChartData: (data: any) => void;
  setChartType: (type: BarPieChartType) => void;
  setIsBalanceDialogOpen: (isOpen: boolean) => void;
}

export const useDialogAndChartEffects = ({
  habits,
  habitStatus,
  currentDate,
  balancePeriod,
  setBalanceData,
  setPieChartData,
  setChartType,
  setIsBalanceDialogOpen
}: UseDialogAndChartEffectsProps) => {
  // Consolidar funciones de generación de datos
  const generateChartData = useCallback(() => {
    const balanceData = chartCalculations.generateBalanceData(habits, habitStatus, currentDate, 'month');
    const pieData = chartCalculations.generatePieChartData(habits, habitStatus);
    
    setBalanceData(balanceData);
    setPieChartData(pieData);
  }, [habits, habitStatus, currentDate, setBalanceData, setPieChartData]);

  // Efecto para manejar eventos de diálogo
  useEffect(() => {
    const handleBalanceDialogChange = (event: CustomEvent) => {
      const { type, value } = event.detail;
      if (type === 'period') {
        generateChartData();
      } else if (type === 'chartType') {
        setChartType(value as BarPieChartType);
      }
    };

    const handleCloseDialog = () => {
      setIsBalanceDialogOpen(false);
    };

    window.addEventListener('balanceDialogChange', handleBalanceDialogChange as EventListener);
    window.addEventListener('closeBalanceDialog', handleCloseDialog);

    return () => {
      window.removeEventListener('balanceDialogChange', handleBalanceDialogChange as EventListener);
      window.removeEventListener('closeBalanceDialog', handleCloseDialog);
    };
  }, [generateChartData, setChartType, setIsBalanceDialogOpen]);

  // Efecto para actualizar datos cuando cambian las dependencias relevantes
  useEffect(() => {
    generateChartData();
  }, [balancePeriod, generateChartData]);

  return {
    generateChartData
  };
}; 