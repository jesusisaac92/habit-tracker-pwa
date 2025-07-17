import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { BalanceChart } from '@/components/charts/BalanceChart';
import { useTranslation } from 'next-i18next';
import { Habit, BalanceData, HabitStatusMap, HabitStatus } from "@/components/types/types";
import { Button } from "@/components/ui/primitives/button";
import { X, BarChart2, Calendar } from 'lucide-react';
import { habitChartsService } from '@/src/supabase/services/habitCharts.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChartStore } from '@/store/useChartStore';
import { supabase } from '@/src/supabase/config/client';
import { chartCalculations } from '@/components/services/chartCalculations/calculations';
import { startOfWeek, endOfWeek } from 'date-fns';
import BalanceDetailPanel from '@/components/ui/composite/charts/BalanceDetailPanel';

interface BalanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  habitStatus: HabitStatusMap;
  currentDate: Date;
  balanceData: BalanceData[];
  pieChartData: Array<{ name: string; value: number; color: string; }>;
}

const { updateChartData } = habitChartsService;

type BalanceDataItem = {
  period: string;
  [key: string]: string | number;
};

export const BalanceDialog: React.FC<BalanceDialogProps> = ({
  isOpen,
  onClose,
  habits,
  habitStatus,
  currentDate,
  balanceData,
  pieChartData
}) => {
  const { t } = useTranslation();
  const [balancePeriod, setBalancePeriod] = useState<'week' | 'month' | 'year'>('month');
  const user = useAuth().user;
  const chartStore = useChartStore();
  const weeklyBalanceData = useChartStore(state => state.weeklyBalanceData);
  const [filteredBalanceData, setFilteredBalanceData] = useState<BalanceData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Función para regenerar datos mensuales basados en completaciones
  const fetchCompletionsAndRegenerateMonthly = async () => {
    try {
      if (user) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Formatear fechas para la consulta
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month + 1, 0);
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        
        const { data: completions, error } = await supabase
          .from('habit_completions')
          .select('habit_id, completion_date')
          .eq('user_id', user.id)
          .gte('completion_date', startDate)
          .lte('completion_date', endDate);
          
        if (error) {
          console.error('Error al obtener completaciones mensuales:', error);
        } else if (completions && completions.length > 0) {
          // Convertir las completaciones a formato habitStatus
          const habitStatusFromCompletions: Record<string, HabitStatus> = {};
          
          completions.forEach((completion: { habit_id: string; completion_date: string }) => {
            const key = `${completion.habit_id}-${completion.completion_date}`;
            habitStatusFromCompletions[key] = { status: 'completed' as '' | 'completed' | 'pending' };
          });
          
          // Regenerar datos mensuales con las completaciones reales
          const regeneratedMonthlyData = chartCalculations.generateBalanceData(
            habits,
            habitStatusFromCompletions,
            currentDate,
            'month',
            { preserveValues: true }
          );
          
          // Actualizar datos en el store
          chartStore.setBalanceData(regeneratedMonthlyData);
          
          // Actualizar UI con los nuevos datos
          setFilteredBalanceData(regeneratedMonthlyData);
        }
      }
    } catch (error) {
      console.error('Error regenerando datos mensuales:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Efecto para actualizar el período en el store y regenerar datos
  useEffect(() => {
    if (!isOpen) return;
    
    setIsLoadingData(true);
    
    // Guardar los datos actuales antes de cambiar de período
    const currentWeeklyData = chartStore.weeklyBalanceData || [];
    const currentBalanceData = chartStore.balanceData || [];
    
    // Verificar si ya tenemos datos no-cero para el período seleccionado
    const hasNonZeroWeeklyData = currentWeeklyData.some(item => 
      Object.entries(item)
        .filter(([key]) => key !== 'period' && key !== 'displayPeriod')
        .some(([_, value]) => Number(value) > 0)
    );
    
    const hasNonZeroMonthlyData = currentBalanceData.some(item => 
      Object.entries(item)
        .filter(([key]) => key !== 'period' && key !== 'fullPeriod')
        .some(([_, value]) => Number(value) > 0)
    );
    
    // Si cambiamos a vista semanal y no tenemos datos semanales con valores no-cero pero sí tenemos datos mensuales
    if (balancePeriod === 'week') {
      // Primero actualizar el período en el store
      chartStore.setCurrentPeriod(balancePeriod);
      
      // Buscar completaciones en la base de datos para regenerar los datos semanales
      const fetchCompletionsAndRegenerate = async () => {
        try {
          if (user) {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Obtener el primer día del mes
            const firstDayOfMonth = new Date(year, month, 1);
            // Obtener el último día del mes
            const lastDay = new Date(year, month + 1, 0);
            
            // Obtener la primera semana que incluya días del mes actual
            const firstWeekStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
            // Obtener la última semana que incluya días del mes actual
            const lastWeekEnd = endOfWeek(lastDay, { weekStartsOn: 1 });
            
            // Formatear fechas para la consulta - IMPORTANTE: incluir días de semanas compartidas
            const startDate = format(firstWeekStart, 'yyyy-MM-dd');
            const endDate = format(lastWeekEnd, 'yyyy-MM-dd');
            
            const { data: completions, error } = await supabase
              .from('habit_completions')
              .select('habit_id, completion_date')
              .eq('user_id', user.id)
              .gte('completion_date', startDate)
              .lte('completion_date', endDate);
              
            if (error) {
              console.error('Error al obtener completaciones:', error);
            } 
            
            // Siempre generar datos nuevos para el mes y año actual,
            // independientemente de si hay completaciones o no
            
            // Convertir las completaciones a formato habitStatus (o usar objeto vacío si no hay)
            const habitStatusFromCompletions: Record<string, HabitStatus> = {};
            
            if (completions && completions.length > 0) {
              completions.forEach((completion: { habit_id: string; completion_date: string }) => {
                const key = `${completion.habit_id}-${completion.completion_date}`;
                habitStatusFromCompletions[key] = { status: 'completed' as '' | 'completed' | 'pending' };
              });
            }
            
            // Regenerar datos semanales con las completaciones reales
            const regeneratedWeeklyData = chartCalculations.generateBalanceData(
              habits,
              habitStatusFromCompletions,
              currentDate,
              'week',
              { preserveValues: false } // Importante: no preservar valores viejos
            );
            
            // Actualizar datos en el store
            chartStore.setWeeklyBalanceData(regeneratedWeeklyData);
            
            // Actualizar UI con los nuevos datos
            setFilteredBalanceData(regeneratedWeeklyData);
          }
        } catch (error) {
          console.error('Error regenerando datos semanales:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      fetchCompletionsAndRegenerate();
    }
    // Si estamos en vista mensual, siempre regenerar los datos desde la base de datos
    else if (balancePeriod === 'month') {
      // Primero actualizar el período en el store
      chartStore.setCurrentPeriod(balancePeriod);
      
      // Siempre regenerar los datos mensuales
      fetchCompletionsAndRegenerateMonthly();
    }
    // Si cambiamos a vista anual y no tenemos datos anuales con valores no-cero
    else if (balancePeriod === 'year') {
      // Primero actualizar el período en el store
      chartStore.setCurrentPeriod(balancePeriod);
      
      // Buscar completaciones en la base de datos para regenerar los datos anuales
      const fetchCompletionsAndRegenerateYearly = async () => {
        try {
          if (user) {
            const year = currentDate.getFullYear();
            
            // Formatear fechas para la consulta
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            
            // Obtener primero los datos actuales de la base de datos
            const { data: chartData, error: chartError } = await supabase
              .from('habit_charts')
              .select('*')
              .eq('user_id', user.id)
              .eq('chart_type', 'balance_data');
              
            if (chartError) {
              console.error('Error al obtener datos de gráficos:', chartError);
            } else if (chartData && chartData.length > 0) {
              let existingBalanceData = [];
              try {
                existingBalanceData = JSON.parse(chartData[0].data);
                
                // Verificar valores por mes
                const junData = existingBalanceData.find((item: any) => 
                  item.period.toLowerCase() === 'jun' || 
                  (item.fullPeriod && item.fullPeriod.toLowerCase().includes('jun'))
                );
              } catch (e) {
                console.error('Error parseando datos existentes:', e);
              }
            }
            
            const { data: completions, error } = await supabase
              .from('habit_completions')
              .select('habit_id, completion_date')
              .eq('user_id', user.id)
              .gte('completion_date', startDate)
              .lte('completion_date', endDate);
              
            if (error) {
              console.error('Error al obtener completaciones anuales:', error);
            }
            
            // Siempre generar datos nuevos para el año actual,
            // independientemente de si hay completaciones o no
            
            // Convertir las completaciones a formato habitStatus (o usar objeto vacío si no hay)
            const habitStatusFromCompletions: Record<string, HabitStatus> = {};
            
            if (completions && completions.length > 0) {
              completions.forEach((completion: { habit_id: string; completion_date: string }) => {
                const key = `${completion.habit_id}-${completion.completion_date}`;
                habitStatusFromCompletions[key] = { status: 'completed' as '' | 'completed' | 'pending' };
              });
            }
            
            // Regenerar datos anuales con las completaciones reales
            const regeneratedYearlyData = chartCalculations.generateBalanceData(
              habits,
              habitStatusFromCompletions,
              currentDate,
              'year',
              { preserveValues: false } // No preservar valores viejos
            );
            
            // Verificar valores por mes después de regenerar
            const febDataRegenerated = regeneratedYearlyData.find((item: any) => 
              item.period.toLowerCase() === 'feb' || 
              (item.fullPeriod && item.fullPeriod.toLowerCase().includes('feb'))
            );
            
            // Actualizar datos en el store
            chartStore.setBalanceData(regeneratedYearlyData);
            
            // Actualizar UI con los nuevos datos
            setFilteredBalanceData(regeneratedYearlyData);
            
            // Verificar datos después de actualizar el store
            const storeData = chartStore.balanceData;
            
            const febDataInStore = storeData.find((item: any) => 
              item.period.toLowerCase() === 'feb' || 
              (item.fullPeriod && item.fullPeriod.toLowerCase().includes('feb'))
            );
          }
        } catch (error) {
          console.error('Error regenerando datos anuales:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      fetchCompletionsAndRegenerateYearly();
    } else {
      // Comportamiento normal para otros cambios de período
      chartStore.setCurrentPeriod(balancePeriod);
      
      // Regenerar datos solo si no hay datos existentes con valores no-cero
      if ((balancePeriod === 'week' && !hasNonZeroWeeklyData) || 
          (balancePeriod !== 'week' && !hasNonZeroMonthlyData)) {
        chartStore.regenerateChartData();
      }
      
      setIsLoadingData(false);
    }
  }, [balancePeriod, isOpen]);

  // Efecto para actualizar datos filtrados cuando cambia el período
  useEffect(() => {
    // Usar la fuente de datos correcta según el período
    if (balancePeriod === 'week') {
      setFilteredBalanceData(weeklyBalanceData);
    } else {
      setFilteredBalanceData(balanceData);
    }
  }, [balanceData, weeklyBalanceData, balancePeriod, currentDate]);

  // Calcular si hay valores no cero basados en los datos filtrados
  const hasNonZeroValues = useMemo(() => 
    filteredBalanceData.some(item => 
      Object.entries(item)
        .filter(([key]) => key !== 'period' && key !== 'displayPeriod')
        .some(([_, value]) => Number(value) > 0)
    ), [filteredBalanceData]);

  const shouldShowChart = filteredBalanceData.length > 0 && (hasNonZeroValues || isLoadingData);

  // Efecto para regenerar datos cuando se abre el diálogo con la vista mensual
  useEffect(() => {
    // Cuando se abre el diálogo y estamos en vista mensual, regenerar los datos
    if (isOpen && balancePeriod === 'month') {
      setIsLoadingData(true);
      fetchCompletionsAndRegenerateMonthly();
    }
  }, [isOpen]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent 
        className="w-[95vw] sm:w-[85vw] md:max-w-[900px] max-h-[90vh] 
          bg-white dark:bg-gray-900 border border-gray-200 
          dark:border-gray-800 shadow-xl rounded-lg flex flex-col overflow-hidden"
        aria-describedby="balance-dialog-description"
      >
        <div id="balance-dialog-description" className="sr-only">
          {t('balance.dialogDescription', 'Detailed balance information for your habits')}
        </div>
        
        {/* Header fijo */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 p-4 sm:p-6 pb-1">
          <DialogHeader className="pb-2 space-y-2 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1">
                  <BarChart2 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    {t('balance.detailedBalance')}
                  </DialogTitle>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400 mt-0.5 ml-6">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {balancePeriod === 'year' 
                      ? currentDate.getFullYear() 
                      : balancePeriod === 'month' 
                        ? `${t(`calendar.months.${format(currentDate, 'MMMM', { locale: es }).toLowerCase()}`)} ${currentDate.getFullYear()}`
                        : `${t(`calendar.months.${format(currentDate, 'MMMM', { locale: es }).toLowerCase()}`)} ${currentDate.getFullYear()}`
                    }
                  </span>
                </div>
              </div>
              <Button
                onClick={() => onClose()}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setBalancePeriod('week')}
                variant={balancePeriod === 'week' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
                  balancePeriod === 'week' ? 
                  'bg-black text-white hover:bg-gray-800' : 
                  'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t('common.weekly')}
              </Button>
              <Button
                onClick={() => setBalancePeriod('month')}
                variant={balancePeriod === 'month' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
                  balancePeriod === 'month' ? 
                  'bg-black text-white hover:bg-gray-800' : 
                  'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t('common.monthly')}
              </Button>
              <Button
                onClick={() => setBalancePeriod('year')}
                variant={balancePeriod === 'year' ? 'default' : 'outline'}
                size="sm"
                className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 ${
                  balancePeriod === 'year' ? 
                  'bg-black text-white hover:bg-gray-800' : 
                  'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {t('common.yearly')}
              </Button>
            </div>
          </DialogHeader>
        </div>
        
        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-0">
          <div className="flex flex-col h-full pb-4">
            {isLoadingData ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                <p className="text-gray-500 text-center mt-4">
                  {t('balance.loadingData', 'Cargando datos...')}
                </p>
              </div>
            ) : !shouldShowChart ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500 text-center mb-2">
                  {t('balance.noDataToShow', 'No hay datos para mostrar')}
                </p>
                <p className="text-gray-400 text-sm text-center">
                  {t('balance.completeHabitsToSeeData', 'Completa tus hábitos para ver datos en esta gráfica')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex-grow">
                  <BalanceChart
                    balancePeriod={balancePeriod}
                    chartType="bar"
                    balanceData={filteredBalanceData}
                    habits={habits}
                    pieChartData={pieChartData}
                    currentDate={currentDate}
                    habitStatus={habitStatus}
                  />
                </div>
                
                <BalanceDetailPanel
                  balancePeriod={balancePeriod}
                  habits={habits}
                  filteredBalanceData={filteredBalanceData}
                  currentDate={currentDate}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
