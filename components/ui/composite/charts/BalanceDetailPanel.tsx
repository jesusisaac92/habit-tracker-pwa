import React from 'react';
import { Info, FileText, Calendar, Target, TrendingUp } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Habit, BalanceData } from "@/components/types/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/primitives/tooltip";

interface BalanceDetailPanelProps {
  balancePeriod: 'week' | 'month' | 'year';
  habits: Habit[];
  filteredBalanceData: BalanceData[];
  currentDate: Date;
}

// Agregar helper para los días de la semana
const WEEKDAYS = [
  { key: 'L', value: 1 },
  { key: 'M', value: 2 },
  { key: 'X', value: 3 },
  { key: 'J', value: 4 },
  { key: 'V', value: 5 },
  { key: 'S', value: 6 },
  { key: 'D', value: 0 }
];

const BalanceDetailPanel: React.FC<BalanceDetailPanelProps> = ({
  balancePeriod,
  habits,
  filteredBalanceData,
  currentDate
}) => {
  const { t } = useTranslation();

  // Función para contar cuántos días específicos hay en un mes
  const countSpecificDaysInMonth = (selectedDays: number[], date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    let count = 0;
    let dayCountMap: Record<number, number> = {};

    for (let day = 1; day <= lastDay; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();
      if (selectedDays.includes(dayOfWeek)) {
        count++;
        dayCountMap[dayOfWeek] = (dayCountMap[dayOfWeek] || 0) + 1;
      }
    }

    return { totalDays: count, dayCountMap };
  };

  // Función para obtener el nombre corto del día
  const getDayName = (dayNumber: number): string => {
    const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    return days[dayNumber];
  };

  // Función para calcular el objetivo propuesto según el período
  const calculateProposedObjective = (habit: Habit, period: 'week' | 'month' | 'year') => {
    if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
      return 100;
    }

    if (period === 'week') {
      const valuePerDay = 100 / 7;
      return Number((valuePerDay * habit.selectedDays.length).toFixed(1));
    } else if (period === 'month') {
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const valuePerDay = 100 / daysInMonth;
      const specificDaysCount = countSpecificDaysInMonth(habit.selectedDays, currentDate).totalDays;
      return Number((valuePerDay * specificDaysCount).toFixed(1));
    }

    return 100;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Calcular estadísticas para cada hábito
  const calculateHabitStats = (habit: Habit) => {
    let percentValue = 0;
    let activeDays = habit.selectedDays?.length || 7;
    let dayDetails = { totalDays: 0, dayCountMap: {} as Record<number, number> };
    
    // Si no hay días específicos seleccionados o están todos seleccionados, usar el total de días del mes
    if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
      dayDetails.totalDays = getDaysInMonth(currentDate);
    } else if (habit.selectedDays) {
      dayDetails = countSpecificDaysInMonth(habit.selectedDays, currentDate);
    }

    if (filteredBalanceData && filteredBalanceData.length > 0) {
      if (balancePeriod === 'week') {
        let totalValue = 0;
        let weeksWithData = 0;
        
        filteredBalanceData.forEach(weekData => {
          if (weekData[habit.name] !== undefined) {
            const weekValue = Number(weekData[habit.name]);
            if (!isNaN(weekValue)) {
              totalValue += weekValue;
              weeksWithData++;
            }
          }
        });
        
        if (weeksWithData > 0) {
          percentValue = totalValue / weeksWithData;
        }
      } else if (balancePeriod === 'month') {
        const dataItem = filteredBalanceData[0];
        const rawValue = dataItem?.[habit.name];
        percentValue = Number(rawValue);
        activeDays = dayDetails.totalDays;
      } else if (balancePeriod === 'year') {
        let totalValue = 0;
        let monthsWithData = 0;
        
        filteredBalanceData.forEach(monthData => {
          if (monthData[habit.name] !== undefined) {
            const monthValue = Number(monthData[habit.name]);
            if (!isNaN(monthValue)) {
              totalValue += monthValue;
              monthsWithData++;
            }
          }
        });
        
        if (monthsWithData > 0) {
          percentValue = totalValue / monthsWithData;
        }
      }
    }

    const proposedObjective = calculateProposedObjective(habit, balancePeriod);
    
    // Asegurar que los valores se redondean a 1 decimal para la comparación
    const roundedCurrentValue = Math.round(percentValue * 10) / 10;
    const roundedObjective = Math.round(proposedObjective * 10) / 10;

    // Aumentar la tolerancia a 0.3% para manejar diferencias cercanas
    const tolerance = 0.3;
    
    // Calcular la diferencia absoluta entre los valores
    const difference = Math.abs(roundedCurrentValue - roundedObjective);
    
    // Considerar como logrado si:
    // 1. El valor actual es mayor o igual al objetivo
    // 2. O la diferencia es menor que la tolerancia
    const isAchieved = roundedCurrentValue >= roundedObjective || difference <= tolerance;

    return {
      currentValue: percentValue,
      objective: proposedObjective,
      activeDays: dayDetails.totalDays,
      dayCountMap: dayDetails.dayCountMap,
      isAchieved,
      hasSpecificDays: habit.selectedDays && habit.selectedDays.length > 0 && habit.selectedDays.length < 7
    };
  };

  const renderActiveDays = (selectedDays: number[] | undefined) => {
    if (!selectedDays || selectedDays.length === 0 || selectedDays.length === 7) {
      return (
        <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm h-[4.5rem]">
          <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {t('balance.scheduledDays', 'Días programados')}
          </div>
          <div className="flex items-center mt-2.5 text-sm text-gray-600 dark:text-gray-300">
            toda la semana
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm h-[4.5rem]">
        <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {t('balance.scheduledDays', 'Días programados')}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {WEEKDAYS.map(({ key, value }) => {
            const isActive = selectedDays.includes(value);
            return (
              <div
                key={key}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                  ${isActive 
                    ? 'bg-gray-600 text-white' 
                    : 'text-gray-400 dark:text-gray-500'}`}
              >
                {key}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayDetails = (dayCountMap: Record<number, number>, totalDays: number, hasSpecificDays: boolean) => {
    if (balancePeriod !== 'month') return null;

    return (
      <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm mt-2">
        <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {t('balance.scheduledDays', 'Días programados')}: 
          <span className="font-medium">{totalDays}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-2 sm:p-4 shadow-sm mt-4">
      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-5 border-b border-gray-100 dark:border-gray-700 pb-1 sm:pb-3">
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
          {balancePeriod === 'week' 
            ? t('balance.weeklyAvgStats', 'Promedio de todas las semanas') 
            : balancePeriod === 'month'
              ? t('balance.monthlyStats', 'Estadísticas mensuales')
              : t('balance.yearlyAvgStats', 'Promedio de todos los meses')
          }
        </h3>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                className="ml-1 inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">Información sobre el balance</span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              align="center" 
              className="max-w-xs text-xs bg-white dark:bg-gray-800 p-3 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg"
              sideOffset={5}
            >
              <div className="text-gray-700 dark:text-gray-300">
                {balancePeriod === 'week' 
                  ? 'Este porcentaje representa el promedio de todas las semanas del mes actual. Se calcula sumando el porcentaje de cada semana y dividiendo por el número de semanas con datos.'
                  : balancePeriod === 'month'
                    ? 'Este porcentaje representa el rendimiento del mes actual. Se calcula como el número de días completados dividido por el total de días del mes.'
                    : 'Este porcentaje representa el promedio de todos los meses con datos del año actual. Se calcula sumando el porcentaje de cada mes y dividiendo por el número de meses con datos.'
                }
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {habits
          .slice()
          .sort((a, b) => {
            // Obtener los valores actuales para ambos hábitos
            const statsA = calculateHabitStats(a);
            const statsB = calculateHabitStats(b);
            
            // Ordenar de mayor a menor por el valor actual
            if (statsB.currentValue !== statsA.currentValue) {
              return statsB.currentValue - statsA.currentValue;
            }
            
            // Si los valores son iguales, ordenar por nombre
            return a.name.localeCompare(b.name);
          })
          .map(habit => {
            const stats = calculateHabitStats(habit);
            
            return (
              <div 
                key={habit.name} 
                className={`bg-gray-50 dark:bg-gray-700 rounded-xl p-2 sm:p-3 border border-gray-100 dark:border-gray-600 hover:shadow-sm transition-shadow ${
                  balancePeriod === 'year' ? 'sm:col-span-1' : ''
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-3 pb-1 border-b border-gray-100 dark:border-gray-600">
                  <div 
                    className="w-3 h-3 sm:w-3 sm:h-3 rounded-full" 
                    style={{ backgroundColor: habit.color }}
                  ></div>
                  <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                    {habit.name}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className={`grid ${balancePeriod === 'year' ? 'grid-cols-1' : 'grid-cols-2'} gap-2 sm:gap-3 text-xs sm:text-sm`}>
                    {balancePeriod !== 'year' && (
                      <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm">
                        <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          {t('balance.proposedObjective', 'Objetivo propuesto')}
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {stats.objective}%
                        </div>
                      </div>
                    )}

                    <div className={`bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm ${
                      balancePeriod === 'year' ? 'flex justify-between items-center' : ''
                    }`}>
                      <div className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t('balance.current', 'Actual')}
                      </div>
                      <div className={`font-medium ${
                        stats.isAchieved && balancePeriod !== 'year' ? 'text-green-600 dark:text-green-500' : 'text-gray-900 dark:text-white'
                      }`}>
                        {stats.currentValue.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {balancePeriod === 'week' && (
                    <>
                      {renderActiveDays(habit.selectedDays)}
                    </>
                  )}

                  {balancePeriod === 'month' && (
                    <>
                      {renderDayDetails(stats.dayCountMap, stats.activeDays, stats.hasSpecificDays)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default BalanceDetailPanel; 