import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { HabitsProgressChart } from '@/components/charts/HabitsProgressChart';
import { HabitsAnnualProgressChart } from '@/components/charts/HabitsAnnualProgressChart';
import { useTranslation } from 'next-i18next';
import { Habit, BalanceData, HabitStatusMap, HabitStatus, ViewPeriodType, ProgressDataPoint } from "@/components/types/types";
import { Button } from "@/components/ui/primitives/button";
import { X, LineChart, Calendar } from 'lucide-react';
import { CHART_TYPES, habitChartsService } from '@/src/supabase/services/habitCharts.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { format, isValid, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChartStore } from '@/store/useChartStore';
import { supabase } from '@/src/supabase/config/client';
import { generateTrendData } from '@/components/services/chartCalculations/trendCalculations';
import { useHabitStore } from '@/store/useHabitStore';
import TrendStatsPanel from '@/components/ui/composite/charts/TrendStatsPanel';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';

interface HabitsProgressTrendDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  habits: Habit[];
  habitStatusMap: HabitStatusMap;
  currentDate?: Date;
}

interface ChartServiceResult {
  success: boolean;
  error?: any;
  data?: any;
}

export const HabitsProgressTrendDialog: React.FC<HabitsProgressTrendDialogProps> = ({
  isOpen,
  onClose = () => {},
  habits,
  habitStatusMap,
  currentDate
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  const [displayType, setDisplayType] = useState<ViewPeriodType>('month');
  const { monthlyTrendData, yearlyTrendData, setMonthlyTrendData, setYearlyTrendData } = useChartStore();
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [customHabitStatusMap, setCustomHabitStatusMap] = useState<HabitStatusMap>({});
  const updateHabitStatus = useHabitStore(state => state.updateHabitStatus);
  
  // Referencia para evitar operaciones duplicadas
  const isUpdating = useRef(false);
  const hasInitialData = useRef({
    month: false,
    year: false
  });
  
  // Usar la fecha proporcionada o la fecha actual como respaldo
  const today = currentDate || new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  
  // Crear una fecha para el primer día del mes seleccionado en lugar del día actual
  // Esto es importante para asegurar que se generen todos los días correctamente
  const selectedMonth = new Date(currentYear, currentMonth, 1); // primer día del mes
  
  // Mostrar el nombre del mes actual en español
  const currentMonthName = format(selectedMonth, 'MMMM', { locale: es });
  
  // Filtrar los hábitos activos para la fecha actual
  const activeHabits = useMemo(() => {
    if (!habits || !habits.length) return [];
    
    return habits.filter(habit => {
      // Si no tiene fecha de finalización, siempre está activo
      if (!habit.endDate) return true;
      
      // Si tiene fecha de finalización, verificar si es posterior a la fecha actual
      const endDate = new Date(habit.endDate);
      const currentMonthEndDate = new Date(currentYear, currentMonth + 1, 0); // último día del mes actual
      
      return endDate >= currentMonthEndDate;
    });
  }, [habits, currentYear, currentMonth]);
  
  // Manejador para cerrar el diálogo
  const handleClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  // Manejar cambio de tipo de visualización
  const handleDisplayTypeChange = (type: ViewPeriodType) => {
    // Forzar regeneración de datos al cambiar de tipo
    if (type !== displayType) {
      // Resetear banderas para forzar recálculo
      hasInitialData.current = {
        ...hasInitialData.current,
        [type]: false
      };
      setIsDataLoaded(false);
      setDisplayType(type);
    }
  };

  // Cargar los datos de completación de hábitos directamente desde la base de datos
  // para asegurar que tenemos el estado correcto incluso después de cerrar sesión
  useEffect(() => {
    const loadCompletedHabits = async () => {
      if (!userId || activeHabits.length === 0 || !isOpen) return;
      
      try {
        // Calcular el rango de fechas para el mes actual
        const startDate = formatISO(new Date(currentYear, currentMonth, 1)).split('T')[0];
        const endDate = formatISO(new Date(currentYear, currentMonth + 1, 0)).split('T')[0];
        
        const { data, error } = await supabase
          .from('habit_completions')
          .select('habit_id, completion_date')
          .eq('user_id', userId)
          .gte('completion_date', startDate)
          .lte('completion_date', endDate)
          .eq('is_completed', true);
          
        if (error) {
          return;
        }
        
        if (data && data.length > 0) {
          // Crear un nuevo mapa de estado de hábitos
          const newHabitStatusMap: HabitStatusMap = {};
          
          // Primero procesar completaciones específicas
          data.forEach(completion => {
            const dateStr = completion.completion_date;
            const habitId = completion.habit_id;
            const key = `${habitId}-${dateStr}`;
            
            // Agregar la clave específica al mapa de estado
            newHabitStatusMap[key] = { status: 'completed' };
            // Actualizar el estado global de hábitos
            updateHabitStatus(key, 'completed');
            
            // Agregar la entrada alternativa solo para el primer hábito de cada fecha
            const alternativeKey = `0-${dateStr}`;
            newHabitStatusMap[alternativeKey] = { status: 'completed' };
            updateHabitStatus(alternativeKey, 'completed');
          });
          
          // Solo actualizar si hay cambios para evitar bucles de renderizado
          if (Object.keys(newHabitStatusMap).length > 0) {
            // Comparar con el mapa actual
            const isDifferent = JSON.stringify(newHabitStatusMap) !== JSON.stringify(customHabitStatusMap);
            
            if (isDifferent) {
              setCustomHabitStatusMap(newHabitStatusMap);
              
              // Forzar regeneración de datos
              hasInitialData.current.month = false;
              hasInitialData.current.year = false;
              setIsDataLoaded(false);
            }
          }
        }
      } catch (error) {
        // Error silencioso
      }
    };
    
    if (isOpen && userId) {
      loadCompletedHabits();
    }
  }, [isOpen, userId, activeHabits, currentMonth, currentYear, updateHabitStatus]);

  // Inicializar datos de tendencia
  useEffect(() => {
    const loadOrGenerateChartData = async () => {
      if (!userId || activeHabits.length === 0 || isUpdating.current || !isOpen) return;
      
      // Marcar como actualizando para evitar llamadas múltiples
      isUpdating.current = true;
      
      try {
        // Unir los mapas de estado de hábitos para tener tanto los locales como los cargados de la base de datos
        const combinedHabitStatusMap = {
          ...habitStatusMap,
          ...customHabitStatusMap
        };
        
        // Verificar si ya tenemos datos para este tipo
        if (displayType === 'month' && !hasInitialData.current.month) {
          // Usar el primer día del mes para generar datos completos
          const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
          const trendResult = generateTrendData(activeHabits, combinedHabitStatusMap, 'month', monthStart);
          
          if (trendResult.data && trendResult.data.length > 0) {
            // Ordenar los datos por número de día
            const sortedData = [...trendResult.data].sort((a, b) => {
              if (a.dayNumber !== undefined && b.dayNumber !== undefined) {
                return Number(a.dayNumber) - Number(b.dayNumber);
              }
              return 0;
            });
            
            // Verificar que tenemos todos los días del mes
            const daysInMonth = new Date(selectedMonth.getFullYear(), 
                                        selectedMonth.getMonth() + 1, 0).getDate();
            
            // Verificar los datos extremos para identificar errores
            if (sortedData.length > 0) {
              const firstItem = sortedData[0];
              const lastItem = sortedData[sortedData.length - 1];
              
              // Verificar si hay días erróneos (ej. día 31 en un mes de 30 días)
              const lastDayNumber = lastItem && lastItem.dayNumber ? parseInt(String(lastItem.dayNumber)) : 0;
              if (lastDayNumber > daysInMonth) {
                // Filtrar días inválidos
                const validData = sortedData.filter(item => {
                  const dayNumber = item.dayNumber ? parseInt(String(item.dayNumber)) : 0;
                  return dayNumber <= daysInMonth;
                });
                
                sortedData.length = 0;
                sortedData.push(...validData);
              }
            }
            
            // Solo actualizar el estado si los datos son diferentes
            if (JSON.stringify(sortedData) !== JSON.stringify(monthlyTrendData)) {
              // Guardar en el store
              setMonthlyTrendData(sortedData);
              
              // Guardar en Supabase (sin esperar)
              habitChartsService.updateChartData(userId, CHART_TYPES.MONTHLY_TREND, sortedData)
                .catch((err) => {
                  // Error silencioso
                });
            }
            
            // Marcar como inicializado
            hasInitialData.current.month = true;
          }
        } else if (displayType === 'year' && !hasInitialData.current.year) {
          // Limpiar datos anuales actuales
          setYearlyTrendData([]);
          
          const trendResult = generateTrendData(activeHabits, combinedHabitStatusMap, 'year', selectedMonth);
          
          if (trendResult.data && trendResult.data.length > 0) {
            // Ordenar los datos por mes
            const sortedData = [...trendResult.data].sort((a, b) => {
              if (a.monthIndex !== undefined && b.monthIndex !== undefined) {
                return Number(a.monthIndex) - Number(b.monthIndex);
              }
              return 0;
            });
            
            // Solo actualizar el estado si los datos son diferentes
            if (JSON.stringify(sortedData) !== JSON.stringify(yearlyTrendData)) {
              // Guardar en el store
              setYearlyTrendData(sortedData);
              
              // Guardar en Supabase (sin esperar)
              habitChartsService.updateChartData(userId, CHART_TYPES.YEARLY_TREND, sortedData)
                .catch((err) => {
                  // Error silencioso
                });
            }
            
            // Marcar como inicializado
            hasInitialData.current.year = true;
          }
        }
        
        // Verificar si los datos actuales existen antes de marcar como cargado
        if ((displayType === 'month' && monthlyTrendData && monthlyTrendData.length > 0) || 
            (displayType === 'year' && yearlyTrendData && yearlyTrendData.length > 0)) {
          if (!isDataLoaded) {
            setIsDataLoaded(true);
          }
        } else if (!isDataLoaded) {
          // Si aún no hay datos y no se ha marcado como cargado, forzar a cargar
          if (displayType === 'month') {
            hasInitialData.current.month = false;
          } else {
            hasInitialData.current.year = false;
          }
          // Intentar de nuevo en el próximo ciclo
        }
      } catch (error) {
        setIsDataLoaded(true);
      } finally {
        isUpdating.current = false;
      }
    };
    
    if (isOpen && activeHabits.length > 0 && !isDataLoaded) {
      loadOrGenerateChartData();
    } else if (!isOpen) {
      // Resetear cuando se cierra el diálogo
      hasInitialData.current = { month: false, year: false };
    }
  }, [isOpen, userId, activeHabits, displayType, selectedMonth, isDataLoaded, habitStatusMap, customHabitStatusMap, setMonthlyTrendData, setYearlyTrendData, monthlyTrendData, yearlyTrendData]);

  // Forzar regeneración de datos cuando se abre el diálogo
  useEffect(() => {
    if (isOpen && userId && activeHabits.length > 0) {
      // Resetear banderas para forzar la regeneración de datos
      hasInitialData.current = { month: false, year: false };
      setIsDataLoaded(false);
      
      // Cargar explícitamente los datos de completación para todo el año actual
      const loadCompletionsForCurrentYear = async () => {
        try {
          // Calcular fechas para todo el año
          const startDate = `${currentYear}-01-01`;
          const endDate = `${currentYear}-12-31`;
          
          const { data, error } = await supabase
            .from('habit_completions')
            .select('habit_id, completion_date')
            .eq('user_id', userId)
            .gte('completion_date', startDate)
            .lte('completion_date', endDate)
            .eq('is_completed', true);
            
          if (error) {
            return;
          }
          
          if (data && data.length > 0) {
            // Crear un nuevo mapa de estado de hábitos
            const newHabitStatusMap: HabitStatusMap = {};
            
            // Procesar todas las completaciones
            data.forEach(completion => {
              const dateStr = completion.completion_date;
              const habitId = completion.habit_id;
              const key = `${habitId}-${dateStr}`;
              
              // Agregar la clave específica al mapa de estado
              newHabitStatusMap[key] = { status: 'completed' };
              // Actualizar el estado global de hábitos
              updateHabitStatus(key, 'completed');
              
              // Agregar la entrada alternativa
              const alternativeKey = `0-${dateStr}`;
              newHabitStatusMap[alternativeKey] = { status: 'completed' };
              updateHabitStatus(alternativeKey, 'completed');
            });
            
            // Actualizar el estado local
            setCustomHabitStatusMap(newHabitStatusMap);
            
            // Forzar generación inmediata de datos anuales después de cargar completaciones
            setTimeout(() => {
              // Combinar mapas de estado
              const combinedHabitStatusMap = {
                ...habitStatusMap,
                ...newHabitStatusMap
              };
              
              // Generar datos anuales directamente
              const trendResult = generateTrendData(activeHabits, combinedHabitStatusMap, 'year', new Date(currentYear, currentMonth, 1));
              
              if (trendResult.data && trendResult.data.length > 0) {
                // Actualizar directamente los datos en el store
                setYearlyTrendData(trendResult.data);
                
                // Marcar como cargado si estamos en vista anual
                if (displayType === 'year') {
                  setIsDataLoaded(true);
                }
              }
            }, 100);
          }
        } catch (error) {
          // Error silencioso
        }
      };
      
      loadCompletionsForCurrentYear();
    }
  }, [isOpen, userId, activeHabits, currentYear, currentMonth, updateHabitStatus, habitStatusMap, setYearlyTrendData, displayType]);

  // Marcar datos como cargados cuando los datos están disponibles - simplificado para evitar bucles
  useEffect(() => {
    if (!isDataLoaded && isOpen) {
      const hasData = (displayType === 'month' && monthlyTrendData && monthlyTrendData.length > 0) || 
                      (displayType === 'year' && yearlyTrendData && yearlyTrendData.length > 0);
      
      if (hasData) {
        setIsDataLoaded(true);
      }
    }
  }, [displayType, monthlyTrendData, yearlyTrendData, isDataLoaded, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="min-w-[95vw] sm:min-w-[85vw] max-w-[98vw] sm:max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
        {/* Header y botones fijos */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-800">
          <DialogHeader className="flex flex-col space-y-2 pb-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1">
                  <LineChart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
                  <DialogTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                    {t('performance.progressTrends')}
                  </DialogTitle>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1 ml-5 sm:ml-6">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">
                    {displayType === 'month' ? (
                      <span className="capitalize">
                        {currentMonthName} {currentYear}
                      </span>
                    ) : (
                      <span>{currentYear}</span>
                    )}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                className="p-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full"
                onClick={handleClose}
              >
                <X size={16} />
              </Button>
            </div>
            
            {/* Botones de selección de período */}
            <div className="flex justify-start gap-2 sm:gap-4 pt-1 sm:pt-2 ml-5 sm:ml-6">
              <Button
                variant={displayType === 'month' ? 'default' : 'outline'} 
                onClick={() => handleDisplayTypeChange('month')}
                className={`chart-period-button text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 ${displayType === 'month' ? 'bg-black hover:bg-gray-900 text-white dark:bg-black dark:hover:bg-gray-900' : ''}`}
                data-state={displayType === 'month' ? 'active' : 'inactive'}
              >
                {t('common.monthly')}
              </Button>
              <Button
                variant={displayType === 'year' ? 'default' : 'outline'} 
                onClick={() => handleDisplayTypeChange('year')}
                className={`chart-period-button text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2 ${displayType === 'year' ? 'bg-black hover:bg-gray-900 text-white dark:bg-black dark:hover:bg-gray-900' : ''}`}
                data-state={displayType === 'year' ? 'active' : 'inactive'}
              >
                {t('common.yearly')}
              </Button>
            </div>
          </DialogHeader>
        </div>
          
        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-0 sm:px-2 pt-3 sm:pt-2">
          <div className="flex flex-col gap-3 sm:gap-4 bg-white dark:bg-gray-800">
            <div className="w-full h-[220px] sm:h-[280px] md:h-[350px] rounded-lg">
              {!isDataLoaded ? (
                <NoHabitsMessage
                  title={t('progress.noDataTitle') || 'No hay datos para mostrar'}
                  description={t('progress.noDataDescription') || 'Completa tus hábitos para ver datos en esta gráfica.'}
                />
              ) : activeHabits.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center flex-col text-gray-500">
                  <span className="text-sm sm:text-lg mb-1 sm:mb-2">{t('performance.noActiveHabits')}</span>
                  <span className="text-xs sm:text-sm">{t('performance.noActiveHabitsDescription')}</span>
                </div>
              ) : displayType === 'month' ? (
                <HabitsProgressChart 
                  data={monthlyTrendData || []} 
                  habits={activeHabits}
                  period="month"
                  selectedMonth={selectedMonth}
                  habitStatus={customHabitStatusMap}
                />
              ) : (
                <HabitsAnnualProgressChart 
                  data={yearlyTrendData || []} 
                  habits={activeHabits}
                  year={currentYear}
                />
              )}
            </div>

            {/* Panel de estadísticas */}
            {isDataLoaded && activeHabits.length > 0 && (
              <div className="mt-10 sm:mt-12 md:mt-10 mb-4 pt-12 sm:pt-6">
                <TrendStatsPanel
                  data={displayType === 'month' ? monthlyTrendData || [] : yearlyTrendData || []}
                  habits={activeHabits}
                  period={displayType}
                  selectedMonth={selectedMonth}
                  year={currentYear}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};