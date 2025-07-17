import React, { useState, useCallback, useEffect } from 'react';
import { Menu } from "lucide-react";
import { useTranslation } from 'next-i18next';
import { SearchInput } from "@/components/ui/composite/habits/HabitSearch";
import { 
  Habit, 
  HabitStatus, 
  PeriodType,
  BalanceData, 
  ProgressDataPoint, 
  HabitProgressData,
  GraphDataPoint,
  TrendDataResult
} from "@/components/types/types";
import { generateTrendData, ViewPeriodType } from '@/components/services/chartCalculations/trendCalculations';
import { PerformanceMetrics } from './PerformanceMetrics';
import { HabitsProgressTrendDialog } from '@/components/dialogs/performance/HabitsProgressTrendDialog';
import { BalanceDialog } from '@/components/dialogs/performance/BalanceDialog';
import { calculateHabitPerformance } from '@/components/services/habitCalculations/habitPerformanceCalculations';
import { useDialogStore } from '@/components/services/dialogManagement/dialogService';
import { useChartStore } from '@/store/useChartStore';
import { useToast } from '@/components/ui/providers/toast/use-toast';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { CHART_TYPES } from '@/src/supabase/services/habitCharts.service';
import { chartCalculations } from '@/components/services/chartCalculations/calculations';
import { useHabitStore } from '@/store/useHabitStore';

// Definir el tipo de período para el balance
type BalancePeriodType = 'week' | 'month' | 'year';

interface PerformanceTabProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  generateGraphData: (habitIndex: number) => GraphDataPoint[];
  generateTrendData: (habits: Habit[], habitStatus: Record<string, HabitStatus>, period: ViewPeriodType, currentDate: Date) => TrendDataResult;
  deleteHabit: (habitId: number) => void;
  handleHabitSelect: (habit: Habit) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface ProcessedHabit {
  name: string;
  color: string;
}

// Actualizar la referencia a la función calculateHabitPerformance
const calculateHabitPerformanceAsync = calculateHabitPerformance;

export const PerformanceTab = ({
  habits,
  habitStatus,
  currentDate,
  generateGraphData,
  generateTrendData,
  deleteHabit,
  handleHabitSelect,
  searchQuery,
  setSearchQuery
}: PerformanceTabProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { openDialog, setSelectedHabit } = useDialogStore();
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [isProgressTrendDialogOpen, setIsProgressTrendDialogOpen] = useState(false);
  const [period, setPeriod] = useState<ViewPeriodType>('month');
  const [balancePeriod, setBalancePeriod] = useState<BalancePeriodType>('month');
  const { user } = useAuth();
  
  const [progressData, setProgressData] = useState<any[]>([]);
  const [processedHabits, setProcessedHabits] = useState<ProcessedHabit[]>([]);
  const [forceUpdate, setForceUpdate] = useState<number>(0);

  const chartStore = useChartStore();
  
  // Sincronizar el período del chartStore con el estado local
  useEffect(() => {
    chartStore.setCurrentPeriod(balancePeriod);
  }, [balancePeriod]);

  // Función para generar datos del balance usando el nuevo sistema
  const generateBalanceData = (forceRegenerate = false) => {
    if (!habits.length) return;
    
    // Asegurarse de que el período esté configurado
    chartStore.setCurrentPeriod(balancePeriod);
    
    // Convertir habitStatus al formato correcto
    const typedHabitStatus: Record<string, HabitStatus> = {};
    Object.entries(habitStatus).forEach(([key, value]) => {
      typedHabitStatus[key] = {
        status: value.status as "" | "completed" | "pending",
        time: ''
      };
    });
    
    // Usar el sistema centralizado para regenerar datos
    if (forceRegenerate) {
      chartStore.forceRegenerateData(true, currentDate);
    } else {
      // Generar datos según el período actual
      if (balancePeriod === 'week') {
        // Datos semanales - usar weeklyBalanceData
        const weeklyData = chartCalculations.generateBalanceData(
          habits, 
          typedHabitStatus, 
          currentDate,
          balancePeriod,
          { existingData: chartStore.weeklyBalanceData }
        );
        chartStore.setWeeklyBalanceData(weeklyData);
      } else {
        // Datos mensuales/anuales - usar balanceData
        const balanceData = chartCalculations.generateBalanceData(
          habits, 
          typedHabitStatus, 
          currentDate,
          balancePeriod,
          { existingData: chartStore.balanceData }
        );
        chartStore.setBalanceData(balanceData);
      }
      
      // Actualizar datos de gráfico circular
      const pieChartData = chartCalculations.generatePieChartData(habits, typedHabitStatus);
      chartStore.setPieChartData(pieChartData);
    }
  };

  // Función para generar datos del gráfico circular
  const generatePieChartData = () => {
    // Convertir habitStatus al formato correcto
    const typedHabitStatus: Record<string, HabitStatus> = {};
    Object.entries(habitStatus).forEach(([key, value]) => {
      typedHabitStatus[key] = {
        status: value.status as "" | "completed" | "pending",
        time: ''
      };
    });
    
    const pieData = chartCalculations.generatePieChartData(habits, typedHabitStatus);
    chartStore.setPieChartData(pieData);
    return pieData;
  };

  const handlePeriodChange = useCallback((newPeriod: ViewPeriodType) => {
    setPeriod(newPeriod);
    
    // Actualizar también el período de balance si es necesario
    if (newPeriod === 'month' || newPeriod === 'year') {
      setBalancePeriod(newPeriod);
    }
    
    // Regenerar datos de tendencia
    const result = generateTrendData(habits, habitStatus, newPeriod, currentDate);
    if (result) {
      setProgressData(result.data);
      setProcessedHabits(result.processedHabits);
    }
    
    // Regenerar datos de balance con el nuevo período
    generateBalanceData();
  }, [habits, habitStatus, generateTrendData, currentDate]);

  // Nueva función para manejar cambios en el período de balance
  const handleBalancePeriodChange = useCallback((newPeriod: BalancePeriodType) => {
    setBalancePeriod(newPeriod);
    chartStore.setCurrentPeriod(newPeriod);
    generateBalanceData();
  }, [habits, habitStatus, currentDate]);

  const handleHabitSelectLocal = (habit: Habit) => {
    setSelectedHabit(habit);
    openDialog('habitDetail', { habitId: habit.id });
  };

  useEffect(() => {
    // Genera los datos iniciales para las gráficas
    if (habits.length > 0) {
      generateBalanceData();
      generatePieChartData();
      
      // Generar datos iniciales de tendencia
      const result = generateTrendData(habits, habitStatus, period, currentDate);
      if (result) {
        setProgressData(result.data);
        setProcessedHabits(result.processedHabits);
      }
    }
  }, [habits, habitStatus, currentDate]);

  // Función para regenerar los datos de las gráficas
  const handleRegenerateChartData = () => {
    if (!user?.id || habits.length === 0) {
      toast({
        title: "Error",
        description: "No se pueden regenerar los datos. Asegúrate de estar conectado y tener hábitos creados.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Usar el método centralizado para regenerar datos
      chartStore.regenerateChartData();
      
      // Regenerar datos de tendencia
      const result = generateTrendData(habits, habitStatus, period, currentDate);
      if (result) {
        setProgressData(result.data);
        setProcessedHabits(result.processedHabits);
      }
      
      toast({
        title: "Éxito",
        description: "Los datos han sido regenerados correctamente",
        variant: "success"
      });
      
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un error al regenerar los datos",
        variant: "destructive"
      });
    }
  };

  const handleProgressTrendOpen = useCallback(() => {
    const result = generateTrendData(habits, habitStatus, period, currentDate);
    if (result) {
      setProgressData(result.data);
      setProcessedHabits(result.processedHabits);
    }
    setIsProgressTrendDialogOpen(true);
  }, [habits, habitStatus, generateTrendData, currentDate, period]);

  const handleOpenBalanceDialog = useCallback(() => {
    if (!chartStore.balanceData || chartStore.balanceData.length === 0) {
      toast({
        title: "Sin datos disponibles",
        description: "No hay datos suficientes para mostrar el gráfico de balance.",
        variant: "default"
      });
      return;
    }
    setIsBalanceDialogOpen(true);
  }, [chartStore.balanceData, toast]);

  useEffect(() => {
    const handleHabitCompleted = (event: Event) => {
      console.log('[DEBUG] Evento habitCompleted recibido:', (event as CustomEvent)?.detail);
      
      // Extraer la fecha del evento si está disponible
      const completedDate = (event as CustomEvent)?.detail?.completedDate || new Date();
      console.log('[DEBUG] Fecha completada a usar:', completedDate);
      
      // Extraer información detallada del evento
      const habitId = (event as CustomEvent)?.detail?.habitId;
      const habitName = (event as CustomEvent)?.detail?.habitName;
      console.log('[DEBUG] Detalles del hábito completado:', { 
        habitId, 
        habitName, 
        fecha: completedDate instanceof Date ? completedDate.toISOString() : completedDate
      });
      
      // Primero, actualizar manualmente el estado para asegurar que el habitStatus contenga la completación
      if (habitId) {
        const dateStr = completedDate instanceof Date 
          ? completedDate.toISOString().split('T')[0]
          : new Date(completedDate).toISOString().split('T')[0];
          
        const statusKey = `${habitId}-${dateStr}`;
        console.log(`[DEBUG] Actualizando manualmente habitStatus para clave: ${statusKey}`);
        
        // Crear una copia actualizada del habitStatus actual con tipos correctos
        const updatedHabitStatus: Record<string, HabitStatus> = { ...habitStatus };
        updatedHabitStatus[statusKey] = { 
          status: "completed" as "" | "completed" | "pending"
        };
        
        // Asegurarse de que el periodo sea 'week' para actualizar los datos semanales
        if (chartStore.currentPeriod !== 'week') {
          console.log('[DEBUG] Cambiando periodo a semana para asegurar actualización de datos semanales');
          chartStore.setCurrentPeriod('week');
        }
        
        // Forzar que los datos semanales se actualicen inmediatamente
        console.log('[DEBUG] Actualizando directamente weeklyBalanceData');
        
        // Si no hay datos semanales, generarlos primero
        if (!chartStore.weeklyBalanceData || chartStore.weeklyBalanceData.length === 0) {
          console.log('[DEBUG] No hay datos semanales, generándolos primero');
          
          // Obtener los datos semanales
          const weeklyData = chartCalculations.generateBalanceData(
            habits,
            updatedHabitStatus,
            currentDate,
            'week',
            { newCompletedDay: true, completedDate }
          );
          
          // Actualizar el store
          chartStore.setWeeklyBalanceData(weeklyData);
        } else {
          // Si ya hay datos semanales, actualizarlos para la semana específica
          console.log('[DEBUG] Actualizando datos semanales existentes');
          
          // Encontrar a qué semana corresponde la fecha completada
          const weekStart = new Date(completedDate);
          const day = weekStart.getDay();
          weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1)); // Lunes
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // Domingo
          
          // Formatear las fechas para buscar la semana
          const weekLabel = `(${weekStart.getDate()} ${getMonthShortName(weekStart)}-${weekEnd.getDate()} ${getMonthShortName(weekEnd)})`;
          console.log(`[DEBUG] Buscando semana con etiqueta similar a: ${weekLabel}`);
          
          // Buscar la semana correspondiente en los datos existentes
          const updatedWeeklyData = chartStore.weeklyBalanceData.map((weekData: BalanceData) => {
            // Verificar si esta es la semana que contiene la fecha completada
            if (weekData.period.includes(weekStart.getDate().toString()) || 
                matchesWeekRange(weekData.period, completedDate)) {
              console.log(`[DEBUG] Encontrada semana correspondiente: ${weekData.period}`);
              
              // Crear copia con los valores actualizados
              const updatedWeek = { ...weekData };
              
              // Buscar el hábito completado
              const targetHabit = habits.find(h => h.id === habitId || h.supabase_id === habitId);
              
              if (targetHabit) {
                // Aumentar el valor en 14.3 puntos (100/7) para representar un día
                const currentValue = parseFloat(updatedWeek[targetHabit.name]?.toString() || '0');
                const newValue = Math.round((currentValue + 14.3) * 10) / 10; // 14.3 puntos por día
                
                updatedWeek[targetHabit.name] = newValue;
                console.log(`[DEBUG] Actualizado ${targetHabit.name} en ${weekData.period}: ${currentValue} -> ${newValue}`);
              }
              
              return updatedWeek;
            }
            
            return weekData;
          });
          
          // Actualizar el store con los datos modificados
          chartStore.setWeeklyBalanceData(updatedWeeklyData);
        }
        
        // Regenerar datos con el habitStatus actualizado manualmente y el flag de completación
        console.log('[DEBUG] Llamando a forceRegenerateData para asegurar la actualización');
        chartStore.forceRegenerateData(true, completedDate);
        
        // Regenerar datos de tendencia
        const result = generateTrendData(habits, updatedHabitStatus, period, currentDate);
        if (result) {
          setProgressData(result.data);
          setProcessedHabits(result.processedHabits);
        }
      } else {
        // Comportamiento original si no tenemos el ID del hábito
        console.log('[DEBUG] Llamando a forceRegenerateData con newCompletedDay=true (sin ID de hábito)');
        chartStore.forceRegenerateData(true, completedDate);
        
        // Regenerar datos de tendencia
        const result = generateTrendData(habits, habitStatus, period, currentDate);
        if (result) {
          setProgressData(result.data);
          setProcessedHabits(result.processedHabits);
        }
      }
    };
    
    // Función auxiliar para verificar si una fecha está dentro del rango de una semana
    const matchesWeekRange = (periodString: string, date: Date): boolean => {
      // Formato típico: "S1 (02 jun-08 jun)"
      const rangeMatch = periodString.match(/\((\d+)\s+([a-z]+)-(\d+)\s+([a-z]+)\)/i);
      
      if (!rangeMatch) return false;
      
      const startDay = parseInt(rangeMatch[1]);
      const startMonth = getMonthNumberFromShortName(rangeMatch[2]);
      const endDay = parseInt(rangeMatch[3]);
      const endMonth = getMonthNumberFromShortName(rangeMatch[4]);
      
      const year = date.getFullYear();
      const startDate = new Date(year, startMonth, startDay);
      const endDate = new Date(year, endMonth, endDay);
      
      return date >= startDate && date <= endDate;
    };
    
    // Función auxiliar para obtener el nombre corto del mes
    const getMonthShortName = (date: Date): string => {
      const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return monthNames[date.getMonth()];
    };
    
    // Función auxiliar para obtener el número del mes a partir del nombre corto
    const getMonthNumberFromShortName = (monthName: string): number => {
      const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      return monthNames.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
    };
    
    window.addEventListener('habitCompleted', handleHabitCompleted);
    return () => {
      window.removeEventListener('habitCompleted', handleHabitCompleted);
    };
  }, [habits, habitStatus, period, currentDate, chartStore]);

  return (
    <div className="space-y-4">
      <PerformanceMetrics 
        habits={habits}
        habitStatus={habitStatus}
        currentDate={currentDate}
        generateGraphData={generateGraphData}
        generateBalanceData={generateBalanceData}
        generatePieChartData={generatePieChartData}
        setIsBalanceDialogOpen={setIsBalanceDialogOpen}
        setIsProgressTrendDialogOpen={setIsProgressTrendDialogOpen}
        handleHabitSelect={handleHabitSelectLocal}
        deleteHabit={deleteHabit}
        calculateHabitPerformance={calculateHabitPerformanceAsync}
        setProgressData={setProgressData}
        setProcessedHabits={setProcessedHabits}
        isProgressTrendDialogOpen={isProgressTrendDialogOpen}
        period={period}
        setPeriod={setPeriod}
        generateTrendData={generateTrendData}
        progressData={progressData}
        processedHabits={processedHabits}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <BalanceDialog 
        isOpen={isBalanceDialogOpen} 
        onClose={() => setIsBalanceDialogOpen(false)} 
        habits={habits}
        habitStatus={habitStatus}
        currentDate={currentDate}
        balanceData={chartStore.balanceData || []}
        pieChartData={chartStore.pieChartData || []}
      />

      <HabitsProgressTrendDialog 
        isOpen={isProgressTrendDialogOpen}
        onClose={() => setIsProgressTrendDialogOpen(false)}
        habits={habits}
        habitStatusMap={habitStatus}
        currentDate={currentDate}
      />
    </div>
  );
}; 