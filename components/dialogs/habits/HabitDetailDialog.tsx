import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/primitives/dialog";
import { Progress } from "@/components/ui/primitives/progress";
import { Button } from "@/components/ui/primitives/button";
import { Check, Minus, X, Trophy, Target, Calendar, BarChart as BarChartIcon, Zap, LineChart as LineChartIcon, ChevronDown, ChevronRight, Info as InfoIcon, Activity } from 'lucide-react';
import { HabitWithPerformance } from '@/components/types/types';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialogStore } from '@/components/services/dialogManagement/dialogService';
import PerformanceChart from "@/components/charts/PerformanceChart";
import YearlyChart from "@/components/charts/YearlyChart";
import { Tooltip, TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { calculateDailyPerformance, generateAnnualPerformanceData, generatePerformanceGraphData } from '@/components/services/chartCalculations/performanceGraphCalculations';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Legend, Area } from 'recharts';
import { useHabitStore } from '@/store/useHabitStore';
import { useChartStore } from '@/store/useChartStore';
import { supabase } from '@/src/supabase/config/client';
import { habitService } from '@/src/supabase/services/habit.service';
import StreakCard2 from '@/components/ui/composite/stats/StreakCard2';
import GoalProgressCard from '@/components/ui/composite/stats/GoalProgressCard';

interface HabitDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHabit: HabitWithPerformance | null;
  onViewPerformance: (habit: HabitWithPerformance) => void;
  generateGraphData: (habitIndex: number, type?: 'monthly' | 'annual') => any[];
  currentDate: Date;
  habitStatus?: Record<string, any>;
}

interface YearlyDataItem {
  monthIndex: number;
  month: string;
  period: string;
  year: number;
  [key: string]: string | number;
}

export const HabitDetailDialog = ({
  isOpen,
  onOpenChange,
  selectedHabit,
  onViewPerformance,
  generateGraphData,
  currentDate,
  habitStatus
}: HabitDetailDialogProps) => {
  const { t, i18n } = useTranslation();
  const { openDialog } = useDialogStore();
  const [showGraphButtons, setShowGraphButtons] = useState(false);
  const chartStore = useChartStore();
  const [user, setUser] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [updatedHabit, setUpdatedHabit] = useState<HabitWithPerformance | null>(null);
  const displayHabit = updatedHabit || selectedHabit;

  // Función para calcular el número de ocurrencias de días específicos entre fechas
  const calculateTotalSpecificDays = (startDateStr: string, endDateStr: string | undefined, selectedDays: number[]): number => {
    if (!startDateStr) return 0;
    
    const startDate = new Date(startDateStr);
    // Si no hay fecha de fin, usar la fecha actual
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    
    // Crear copias para no modificar las fechas originales
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Si todos los días están seleccionados o ninguno, calcular el total de días entre fechas
    if (selectedDays.length === 7 || selectedDays.length === 0) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día final
      return diffDays;
    }
    
    let totalDays = 0;
    const currentDate = new Date(start);
    const dayMap: Record<number, number> = {};
    const specificDates: string[] = [];
    
    // Iterar desde la fecha de inicio hasta la fecha de fin
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      // Comprobar si el día de la semana actual está en los días seleccionados
      if (selectedDays.includes(dayOfWeek)) {
        totalDays++;
        dayMap[dayOfWeek] = (dayMap[dayOfWeek] || 0) + 1;
        specificDates.push(`${currentDate.toLocaleDateString()} (${['D','L','M','X','J','V','S'][dayOfWeek]})`);
      }
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return totalDays;
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    loadUser();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
        const [year, month, day] = dateString.split('-');
        const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
            12,
            0,
            0
        );
        
        return format(date, 'dd/MM/yyyy', {
            locale: i18n.language === 'es' ? es : undefined
        });
    } catch (error) {
        return dateString;
    }
  };

  // Función para calcular el progreso envuelta en useCallback
  const calculateProgress = useCallback(async (habit: HabitWithPerformance): Promise<{ progress: number; daysLeft: number }> => {
    if (habit.isIndefinite || habit.timeObjective === 'indefinite') {
      return { progress: 0, daysLeft: -1 };
    }

    const startDate = new Date(habit.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const endDate = habit.endDate ? new Date(habit.endDate) : undefined;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    let totalDays = 0;
    
    // Usar siempre calculateTotalSpecificDays para consistencia
    // Esta función ya maneja tanto días específicos como todos los días
    if (habit.startDate && (habit.endDate || !habit.isIndefinite)) {
      const selectedDaysToUse = habit.selectedDays && habit.selectedDays.length > 0 ? habit.selectedDays : [];
      totalDays = calculateTotalSpecificDays(
        habit.startDate, 
        habit.endDate, 
        selectedDaysToUse
      );
    } else {
      // Fallback solo si no hay fechas válidas
      totalDays = typeof habit.timeObjective === 'number' ? habit.timeObjective : 0;
    }
    
    // Consultar directamente la tabla habit_completions para obtener los días completados
    let completedDays = 0;
    let completedDates: string[] = [];
    
    try {
      const habitId = habit.supabase_id || habit.id;
      
      if (user?.id && habitId) {
        const { data: completionsData, error } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('habit_id', habitId)
          .eq('is_completed', true);
        
        if (!error && completionsData) {
          completedDays = completionsData.length;
          completedDates = completionsData.map(item => item.completion_date);
        }
      }
    } catch (error) {
      // console.error('Error al obtener los días completados:', error);
    }
    
    // Calcular días programados pasados (oportunidades perdidas)
    let passedProgrammedDays = 0;
    
    if (habit.selectedDays && habit.selectedDays.length > 0 && habit.selectedDays.length < 7) {
      const currentDate = new Date(startDate);
      
      // Iterar desde la fecha de inicio hasta hoy
      while (currentDate <= today) {
        const dayOfWeek = currentDate.getDay();
        
        // Si este día estaba programado
        if (habit.selectedDays.includes(dayOfWeek)) {
          const dateString = currentDate.toISOString().split('T')[0];
          
          // Si este día programado no fue completado, lo contamos como oportunidad perdida
          if (!completedDates.includes(dateString)) {
            passedProgrammedDays++;
          }
        }
        
        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Calcular el progreso basado en días completados
    const progress = completedDays;
    
    // Calcular días restantes teniendo en cuenta los días que ya pasaron
    const daysLeft = Math.max(0, totalDays - passedProgrammedDays);
    
    return { progress, daysLeft };
  }, [user]);

  const getTimeObjectiveDisplay = (habit: HabitWithPerformance) => {
    // Usar siempre calculateTotalSpecificDays para consistencia
    if (habit.startDate && (habit.endDate || !habit.isIndefinite)) {
      const selectedDaysToUse = habit.selectedDays && habit.selectedDays.length > 0 ? habit.selectedDays : [];
      const specificDays = calculateTotalSpecificDays(
        habit.startDate, 
        habit.endDate, 
        selectedDaysToUse
      );
      return t('habitDetail.daysValue', { days: specificDays });
    }
    
    if (habit.isIndefinite || habit.timeObjective === 'indefinite') {
      return t('habits.indefinite');
    }

    if (typeof habit.timeObjective === 'number') {
      return t('habitDetail.daysValue', { days: habit.timeObjective });
    }

    return t('habitDetail.daysValue', { days: 0 });
  };

  useEffect(() => {
    const fetchLatestHabitData = async () => {
      if (selectedHabit && user?.id) {
        try {
          const { success, data: habits, error } = await habitService.getHabits(user.id);
          
          if (!success || error) {
            return;
          }
          
          const habitData = habits.find((h: any) => 
            String(h.id) === String(selectedHabit.id) || 
            String(h.id) === String(selectedHabit.supabase_id)
          );
          
          if (!habitData) {
            return;
          }
          
          if (
            updatedHabit?.record !== habitData.record || 
            updatedHabit?.currentStreak !== habitData.current_streak
          ) {
            setUpdatedHabit({
              ...selectedHabit,
              record: habitData.record || 0,
              currentStreak: habitData.current_streak || 0
            });
          }
        } catch (error) {
          return;
        }
      }
    };
    
    fetchLatestHabitData();
    
    const intervalId = setInterval(fetchLatestHabitData, 5000);
    
    return () => clearInterval(intervalId);
  }, [selectedHabit, user?.id, updatedHabit]);

  useEffect(() => {
    if (isOpen && selectedHabit) {
      const updateStats = async () => {
        if (user?.id) {
          try {
            const { success, data: habits, error } = await habitService.getHabits(user.id);
            
            if (!success || error) {
              return;
            }
            
            const habitData = habits.find((h: any) => 
              String(h.id) === String(selectedHabit.id) || 
              String(h.id) === String(selectedHabit.supabase_id)
            );
            
            if (habitData) {
              if (
                selectedHabit.record !== habitData.record || 
                selectedHabit.currentStreak !== habitData.current_streak
              ) {
                setUpdatedHabit({
                  ...selectedHabit,
                  record: habitData.record || 0,
                  currentStreak: habitData.current_streak || 0
                });
              }
            }
          } catch (error) {
            return;
          }
        }
      };
      
      updateStats();
    }
  }, [isOpen, selectedHabit, user?.id]);

  const habitStats = [
    { 
      icon: Trophy, 
      color: 'text-yellow-500', 
      label: t('habitDetail.record'), 
      value: t('habitDetail.daysValue', { days: displayHabit?.record || 0 }),
      dataStat: 'record'
    },
    { 
      icon: Zap, 
      color: 'text-blue-500', 
      label: t('habitDetail.currentStreak'), 
      value: t('habitDetail.daysValue', { days: displayHabit?.currentStreak || 0 }),
      dataStat: 'streak'
    },
    { 
      icon: Target, 
      color: 'text-green-500', 
      label: t('habitDetail.timeObjective'), 
      value: displayHabit ? getTimeObjectiveDisplay(displayHabit) : ''
    },
    { 
      icon: Calendar, 
      color: 'text-purple-500', 
      label: t('habitDetail.startDate'), 
      value: displayHabit?.startDate ? formatDate(displayHabit.startDate) : ''
    },
  ];

  const getMonthName = (month: number): string => {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return t(`calendar.monthsShort.${monthKeys[month]}`);
  };
  
  const getFullMonthName = (month: number): string => {
    const monthsInSpanish = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    
    const translated = t(`calendar.months.${monthKeys[month]}`);
    
    if (translated === `calendar.months.${monthKeys[month]}` || translated === monthKeys[month]) {
      return monthsInSpanish[month];
    }
    
    return translated;
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const currentValue = Number(payload[0].value);
      const previousValue = Number(payload[0].payload.previousMonth || 0);
      const difference = currentValue - previousValue;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow">
          <div className="text-xs font-medium mb-1">
            {`${label} de ${getMonthName(currentDate.getMonth())}`}
          </div>
          <div className="space-y-0.5">
            <div className="text-xs">
              <span className="text-purple-500">Actual: </span>
              <span className="font-medium">{currentValue.toFixed(1)}%</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400">Anterior: </span>
              <span>{previousValue.toFixed(1)}%</span>
            </div>
            {difference !== 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Dif: </span>
                <span className={difference >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {difference >= 0 ? '↑' : '↓'}{Math.abs(difference).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const graphData = useMemo(() => {
    if (selectedHabit && habitStatus) {
      const rawData = generatePerformanceGraphData(selectedHabit, habitStatus, currentDate);
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      
      return calculateDailyPerformance(rawData, daysInMonth);
    }
    return [];
  }, [selectedHabit, currentDate, habitStatus]);

  const previousMonthData = useMemo(() => {
    if (selectedHabit && habitStatus) {
      const previousMonthDate = new Date(currentDate);
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      
      const rawData = generatePerformanceGraphData(selectedHabit, habitStatus, previousMonthDate);
      
      const daysInPreviousMonth = new Date(
        previousMonthDate.getFullYear(),
        previousMonthDate.getMonth() + 1,
        0
      ).getDate();
      
      return calculateDailyPerformance(rawData, daysInPreviousMonth);
    }
    return [];
  }, [selectedHabit, currentDate, habitStatus]);

  const [yearlyData, setYearlyData] = useState<YearlyDataItem[]>([]);

  const [currentMonthPerformance, setCurrentMonthPerformance] = useState<{
    actual: number;
    anterior: number;
    diferencia: number;
  }>({
    actual: 0,
    anterior: 0,
    diferencia: 0
  });

  const updateCurrentPerformance = (actual: number, anterior: number) => {
    const diferencia = actual - anterior;
    setCurrentMonthPerformance({
      actual,
      anterior,
      diferencia
    });
  };

  useEffect(() => {
    if (chartStore && selectedHabit) {
      const shouldReset = isOpen && 
        (!chartStore.lastSelectedHabitId || 
         chartStore.lastSelectedHabitId !== String(selectedHabit.id));
      
      if (shouldReset) {
        chartStore.lastSelectedHabitId = String(selectedHabit.id);
        
        chartStore.setPerformanceData([]);
        setYearlyData([]);
        setCurrentMonthPerformance({ actual: 0, anterior: 0, diferencia: 0 });
        
        if (isOpen && selectedHabit.index !== undefined && selectedHabit.index >= 0) {
          generateGraphData(selectedHabit.index, 'monthly');
        }
      }
    } else if (!isOpen && chartStore) {
      chartStore.lastSelectedHabitId = undefined;
    }
  }, [isOpen, selectedHabit, chartStore, generateGraphData]);

  useEffect(() => {
    const loadYearlyData = async () => {
      if (selectedHabit && user?.id) {
        try {
          const habitId = selectedHabit.supabase_id || selectedHabit.id;
          
          if (!habitId) {
            return;
          }
          
          const { data: completionsData, error: completionsError } = await supabase
            .from('habit_completions')
            .select('*')
            .eq('user_id', user.id)
            .eq('habit_id', habitId);
            
          let realCompletionRate: Record<number, number> = {};
          
          if (!completionsError && completionsData && completionsData.length > 0) {
            const completionsByMonth: Record<number, number> = {};
            completionsData.forEach(completion => {
              const date = new Date(completion.completion_date);
              const monthIndex = date.getMonth();
              if (!completionsByMonth[monthIndex]) {
                completionsByMonth[monthIndex] = 0;
              }
              completionsByMonth[monthIndex]++;
            });
            
            Object.keys(completionsByMonth).forEach(monthIndex => {
              const daysInMonth = new Date(
                currentDate.getFullYear(),
                parseInt(monthIndex) + 1,
                0
              ).getDate();
              
              realCompletionRate[parseInt(monthIndex)] = (completionsByMonth[parseInt(monthIndex)] / daysInMonth) * 100;
            });
          }

          const { data, error } = await supabase
            .from('habit_charts')
            .select('*')
            .eq('user_id', user.id)
            .eq('chart_type', 'yearly_trend_data')
            .single();

          if (error) {
            const generatedData = generateInitialYearlyData();
            await saveYearlyData(generatedData);
            setYearlyData(generatedData);
            return;
          }

          if (data && data.data) {
            let existingData = [];
            
            try {
              if (typeof data.data === 'string') {
                existingData = JSON.parse(data.data);
              } else if (Array.isArray(data.data)) {
                existingData = data.data;
              }

              if (!Array.isArray(existingData)) {
                existingData = generateInitialYearlyData();
              }

              const updatedData = JSON.parse(JSON.stringify(existingData));
              
              Object.keys(realCompletionRate).forEach(monthIndex => {
                if (updatedData[monthIndex]) {
                  updatedData[monthIndex] = {
                    ...updatedData[monthIndex],
                    [selectedHabit.name]: realCompletionRate[parseInt(monthIndex)]
                  };
                }
              });
              
              await saveYearlyData(updatedData);
              setYearlyData(updatedData);
            } catch (parseError) {
              const generatedData = generateInitialYearlyData();
              await saveYearlyData(generatedData);
              setYearlyData(generatedData);
            }
            return;
          }

          const generatedData = generateInitialYearlyData();
          await saveYearlyData(generatedData);
          setYearlyData(generatedData);
        } catch (error) {
          setYearlyData([]);
        }
      }
    };

    const generateInitialYearlyData = () => {
      if (!selectedHabit) {
        return [];
      }
      
      const habitStatusToUse = habitStatus || {};
      const annualData = generateAnnualPerformanceData(selectedHabit, habitStatusToUse, currentDate);
      
      return annualData.map((item, index) => {
        const monthAbbr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][index];
        return {
          monthIndex: index,
          month: monthAbbr,
          period: `${monthAbbr}-${currentDate.getFullYear()}`,
          year: currentDate.getFullYear(),
          [selectedHabit.name]: item.points || 0
        };
      });
    };

    const saveYearlyData = async (data: any[]) => {
      try {
        const { error: insertError } = await supabase
          .from('habit_charts')
          .upsert({
            user_id: user.id,
            chart_type: 'yearly_trend_data',
            data: JSON.stringify(data)
          }, {
            onConflict: 'user_id,chart_type'
          });

        if (insertError) {
          return;
        }
      } catch (error) {
        return;
      }
    };

    loadYearlyData();
  }, [selectedHabit, currentDate, habitStatus, user?.id]);

  useEffect(() => {
    // Este efecto se ejecutará cada vez que habitStatus cambie
    // Los datos se recalcularán automáticamente gracias a la dependencia [habitStatus] en el useMemo
  }, [habitStatus]);

  const effectiveGraphData = useMemo(() => {
    if (chartStore?.performanceData && chartStore.performanceData.length > 0 && selectedHabit) {
      return chartStore.performanceData;
    }
    return graphData;
  }, [chartStore?.performanceData, graphData, selectedHabit]);

  // Calculate progress for the goal progress card
  const [progressData, setProgressData] = useState<{ progress: number; daysLeft: number }>({ progress: 0, daysLeft: 0 });

  useEffect(() => {
    const loadProgress = async () => {
      if (displayHabit) {
        const progress = await calculateProgress(displayHabit);
        setProgressData(progress);
      }
    };
    
    loadProgress();
  }, [displayHabit, user, calculateProgress]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] md:max-w-[800px] p-6 rounded-lg shadow-lg max-h-[90vh] overflow-y-auto dialog-content">
        {/* Botón de cierre (X) posicionado en la esquina superior derecha */}
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </button>
        
        {/* Header con estilo moderno */}
        <div className="flex items-center mb-8 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center">
            <div className="mr-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
                {t('performance.graphTitle') || 'Gráfica de Rendimiento'}
              </DialogTitle>
              <p className="text-sm text-blue-500 font-medium uppercase mt-1">
                {selectedHabit?.name || ''}
              </p>
            </div>
          </div>
        </div>
        
        <DialogDescription className="sr-only">
          {t('habitDetail.description') || 'Detalles y estadísticas del hábito seleccionado'}
        </DialogDescription>

        <div className="space-y-6">
          {/* Tarjeta de objetivo */}
          {displayHabit && !displayHabit.isIndefinite && (
            (typeof displayHabit.timeObjective === 'number') || 
            (displayHabit.selectedDays?.length > 0) ||
            (displayHabit.startDate && displayHabit.endDate)
          ) && (
            <div className="w-full block">
              <GoalProgressCard 
                totalDays={
                  // Usar siempre calculateTotalSpecificDays para consistencia
                  displayHabit.startDate && (displayHabit.endDate || !displayHabit.isIndefinite)
                    ? calculateTotalSpecificDays(
                        displayHabit.startDate, 
                        displayHabit.endDate, 
                        // Si no hay días específicos, usar array vacío (representa todos los días)
                        Array.isArray(displayHabit.selectedDays) && displayHabit.selectedDays.length > 0 
                          ? displayHabit.selectedDays 
                          : []
                      )
                    : typeof displayHabit.timeObjective === 'number'
                      ? displayHabit.timeObjective
                      : 0
                }
                daysCompleted={progressData.progress}
                daysCompletedLabel={`${progressData.progress} ${progressData.progress === 1 ? 'día completado' : 'días completados'}`}
                creationDate={displayHabit.startDate ? formatDate(displayHabit.startDate) : undefined}
                className="w-full block"
                variant="light"
                showGoalLabel={true}
                selectedDays={displayHabit.selectedDays}
                showDaysCompleted={true}
              />
            </div>
          )}
          
          {/* Gráficas */}
          <div className="space-y-6">
            {/* Gráfica de rendimiento mensual */}
            <div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center mb-4">
                  <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                    <div className="mr-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <LineChartIcon className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                        {t('charts.monthlyPerformance', 'Rendimiento Mensual')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400" />
                        {getFullMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Estadísticas resumidas */}
                  {displayHabit && (
                    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                      <div className="flex-1 min-w-[90px] bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Actual</div>
                        <div className="text-sm font-medium text-purple-500">
                          {`${currentMonthPerformance.actual.toFixed(1)}%`}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[90px] bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Anterior</div>
                        <div className="text-sm font-medium text-gray-500">
                          {`${currentMonthPerformance.anterior.toFixed(1)}%`}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[90px] bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400">Diferencia</div>
                        <div className={`text-sm font-medium ${
                          currentMonthPerformance.diferencia >= 0 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }`}>
                          {`${currentMonthPerformance.diferencia >= 0 ? '↑' : '↓'} ${Math.abs(currentMonthPerformance.diferencia).toFixed(1)}%`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <PerformanceChart 
                  selectedHabitName={selectedHabit?.name || ''}
                  currentDate={currentDate}
                  graphData={effectiveGraphData} 
                  selectedHabitIndex={selectedHabit?.index !== undefined ? selectedHabit.index : null}
                  habitId={selectedHabit?.supabase_id || null}
                  getMonthName={getMonthName}
                  CustomTooltip={CustomTooltip}
                  previousMonthData={previousMonthData}
                  currentMonthPerformance={currentMonthPerformance}
                  updateCurrentPerformance={(actual, anterior) => {
                    // Solo actualizar si los valores son realmente diferentes
                    if (currentMonthPerformance?.actual !== actual || 
                        currentMonthPerformance?.anterior !== anterior) {
                      updateCurrentPerformance(actual, anterior);
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Gráfica de rendimiento anual */}
            <div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center mb-4">
                  <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                    <div className="mr-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <BarChartIcon className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
                        {t('charts.yearlyPerformance', 'Rendimiento Anual')}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gray-500 dark:text-gray-400" />
                        {selectedYear}
                      </p>
                    </div>

                  </div>
                  
                  {/* Estadísticas resumidas anuales */}
                  {displayHabit && yearlyData.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                      <div className="flex-1 min-w-[90px] bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Mejor mes
                        </div>
                        <div className="text-sm font-medium text-blue-500">
                          {(() => {
                            // Verificar si estamos en un año futuro
                            const currentRealYear = new Date().getFullYear();
                            const selectedYear = currentDate.getFullYear();
                            const isViewingFutureYear = selectedYear > currentRealYear;
                            
                            // Si estamos viendo un año futuro, no debería haber datos para mostrar
                            if (isViewingFutureYear) {
                              return <span className="text-gray-500">Sin datos</span>;
                            }
                            
                            if (yearlyData.length > 0 && selectedHabit) {
                              let maxValue = 0;
                              let maxMonth = '';
                              
                              yearlyData.forEach(item => {
                                const value = item[selectedHabit.name];
                                if (typeof value === 'number' && value > maxValue) {
                                  maxValue = value;
                                  maxMonth = item.month;
                                }
                              });
                              
                              return maxValue > 0 ? `${maxMonth} (${maxValue.toFixed(1)}%)` : 'N/A';
                            }
                            return 'N/A';
                          })()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-[150px] bg-gray-50 dark:bg-gray-800/50 rounded-md p-2">
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          Mes actual
                        </div>
                        <div className="text-sm font-medium w-full">
                          {(() => {
                            // Verificar si estamos en un año futuro
                            const currentRealYear = new Date().getFullYear();
                            const selectedYear = currentDate.getFullYear();
                            const isViewingFutureYear = selectedYear > currentRealYear;
                            
                            // Si estamos viendo un año futuro, no debería haber datos para el mes actual
                            if (isViewingFutureYear) {
                              return <span className="text-gray-500">Sin datos</span>;
                            }
                            
                            const currentMonth = new Date().getMonth();
                            const monthData = yearlyData.find(item => item.monthIndex === currentMonth);
                            
                            // Calcular el valor actual
                            let value = 0;
                            if (monthData && selectedHabit && selectedHabit.name in monthData) {
                              value = Number(monthData[selectedHabit.name]) || 0;
                            }
                            
                            // Calcular el objetivo mensual
                            let target = 0;
                            if (selectedHabit && selectedHabit.selectedDays && selectedHabit.selectedDays.length > 0 && selectedHabit.selectedDays.length < 7) {
                              // Obtener el primer día del mes actual
                              const firstDay: Date = new Date(selectedYear, currentMonth, 1);
                              // Obtener el último día del mes actual
                              const lastDay: Date = new Date(selectedYear, currentMonth + 1, 0);
                              
                              // Ajustar por fecha de inicio del hábito
                              let adjustedFirstDay: Date = new Date(firstDay);
                              if (selectedHabit.startDate) {
                                const startDate = new Date(selectedHabit.startDate);
                                if (startDate > firstDay && startDate <= lastDay) {
                                  adjustedFirstDay = new Date(startDate);
                                }
                              }
                              
                              // Contar días programados en el mes
                              let programmedDays = 0;
                              const tempDate: Date = new Date(adjustedFirstDay);
                              while (tempDate <= lastDay) {
                                if (selectedHabit.selectedDays.includes(tempDate.getDay())) {
                                  programmedDays++;
                                }
                                tempDate.setDate(tempDate.getDate() + 1);
                              }
                              
                              // Calcular el objetivo como porcentaje de días programados
                              target = (programmedDays / lastDay.getDate()) * 100;
                            } else {
                              target = 100; // Si no hay días específicos, el objetivo es 100%
                            }
                            
                            return (
                              <div className="flex items-center gap-2 w-full">
                                <span className="text-purple-500">{value.toFixed(1)}%</span>
                                <span className="text-gray-400">/</span>
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                                  <span className="text-xs text-gray-500 mr-1">Obj.</span>
                                  <span className="text-xs text-gray-500">{target.toFixed(1)}%</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <YearlyChart 
                  yearlyData={yearlyData} 
                  currentDate={currentDate} 
                  showHeader={false}
                  selectedHabit={selectedHabit}
                  onYearChange={handleYearChange}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
