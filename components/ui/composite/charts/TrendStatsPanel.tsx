import React, { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, FileText, Calendar, Info } from 'lucide-react';
import { Habit, ProgressDataPoint, ViewPeriodType } from '@/components/types/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/primitives/tooltip';

interface TrendStatsPanelProps {
  data: ProgressDataPoint[];
  habits: Habit[];
  period: ViewPeriodType;
  selectedMonth?: Date;
  year?: number;
}

interface HabitStats {
  average: number;
  max: number;
  maxDate: string;
  trend: 'up' | 'down' | 'stable';
}

interface ValueDataPoint {
  value: number;
  date: string;
  dayNumber?: number;
  monthIndex?: number;
  month?: string | number;
}

export const TrendStatsPanel: React.FC<TrendStatsPanelProps> = ({
  data,
  habits,
  period,
  selectedMonth,
  year = new Date().getFullYear()
}) => {
  const { t } = useTranslation();
  
  // Calcular estadísticas para cada hábito
  const habitStats = useMemo(() => {
    const stats: Record<string, HabitStats> = {};
    
    habits.forEach(habit => {
      // Filtrar valores válidos para este hábito
      let validValues: ValueDataPoint[] = data
        .filter(point => typeof point[habit.name] === 'number' && point[habit.name] !== undefined)
        .map(point => ({
          value: Number(point[habit.name]),
          date: point.period?.toString() || '',
          dayNumber: point.dayNumber,
          monthIndex: point.monthIndex,
          month: point.month
        }));
      
      if (validValues.length === 0) {
        stats[habit.name] = {
          average: 0,
          max: 0,
          maxDate: '',
          trend: 'stable'
        };
        return;
      }
      
      // Ordenar por número de día para procesamiento consistente
      validValues = [...validValues].sort((a, b) => {
        if (a.dayNumber !== undefined && b.dayNumber !== undefined) {
          return Number(a.dayNumber) - Number(b.dayNumber);
        }
        return 0;
      });
      
      // Para la vista mensual, identificar los días con actividad real
      let realActivityDays: ValueDataPoint[] = [];
      if (period === 'month') {
        // Encontrar los días donde efectivamente hubo actividad (no solo decaimiento visual)
        for (let i = 0; i < validValues.length; i++) {
          const current = validValues[i];
          const prev = i > 0 ? validValues[i-1] : null;
          
          // Si es el primer día o el valor actual es mayor que el anterior,
          // significa que hubo una completación real en este día
          if (!prev || current.value > prev.value) {
            realActivityDays.push(current);
          }
        }
        
        // Si no encontramos días con actividad real, usar todos los valores
        if (realActivityDays.length === 0) {
          realActivityDays = validValues;
        }
      } else {
        // Para vista anual, usar todos los valores
        realActivityDays = validValues;
      }
      
      // Calcular promedio basado en todos los valores
      const sum = validValues.reduce((acc, curr) => acc + curr.value, 0);
      const average = sum / validValues.length;
      
      // Encontrar valor máximo y su fecha
      const maxEntry = validValues.reduce((max, curr) => 
        curr.value > max.value ? curr : max, validValues[0]);
      
      // Determinar tendencia
      let trend: 'up' | 'down' | 'stable' = 'stable';
      
      if (period === 'month' && realActivityDays.length >= 2) {
        // Para vista mensual: analizar la tendencia general considerando el máximo y el último día
        
        // Encontrar el día con el valor máximo entre los días con actividad real
        const maxActivityDay = realActivityDays.reduce((max, curr) => 
          curr.value > max.value ? curr : max, realActivityDays[0]);
        
        // Obtener el último día con actividad real
        const lastActivityDay = realActivityDays[realActivityDays.length - 1];
        
        // Índices de estos días para determinar la secuencia
        const maxDayIndex = realActivityDays.findIndex(d => 
          d.dayNumber === maxActivityDay.dayNumber);
        const lastDayIndex = realActivityDays.length - 1;
        
        // Comparar el valor del último día con el valor máximo
        const maxValue = maxActivityDay.value;
        const lastValue = lastActivityDay.value;
        
        // Calcular la diferencia porcentual entre el máximo y el último día
        const difference = lastValue - maxValue;
        const percentChange = (difference / maxValue) * 100;
        
        // Determinar la tendencia basada en la diferencia y la secuencia temporal
        if (maxDayIndex === lastDayIndex) {
          // Si el último día es el día máximo, la tendencia es ascendente
          trend = 'up';
        } else if (maxDayIndex < lastDayIndex) {
          // Si el máximo ocurrió antes que el último día
          if (difference >= 0) {
            // Si el último día es igual o mayor que el máximo, tendencia ascendente
            trend = 'up';
          } else {
            // Si el último día es menor que el máximo
            if (Math.abs(percentChange) < 15) {
              // Si la diferencia es pequeña (<15%), considerarla estable
              trend = 'stable';
            } else {
              // Si la diferencia es significativa (>15%), tendencia descendente
              trend = 'down';
            }
          }
        } else {
          // Este caso no debería ocurrir (el máximo después del último día)
          trend = 'stable';
        }
        
        // Verificación adicional: si hay más de 2 días con actividad,
        // analizar también la tendencia reciente (últimos 3 días)
        if (realActivityDays.length >= 3) {
          const recentDays = realActivityDays.slice(-3);
          const firstRecentValue = recentDays[0].value;
          const lastRecentValue = recentDays[recentDays.length - 1].value;
          
          // Si hay una tendencia clara en los últimos días, puede modificar la tendencia general
          if (lastRecentValue > firstRecentValue * 1.3) {
            // Si el último valor es significativamente mayor (>30%) que el primero de los recientes,
            // la tendencia reciente es fuertemente ascendente, lo que podría modificar una tendencia descendente
            trend = trend === 'down' ? 'stable' : trend;
          } else if (lastRecentValue < firstRecentValue * 0.7) {
            // Si el último valor es significativamente menor (<70%) que el primero de los recientes,
            // la tendencia reciente es fuertemente descendente
            trend = trend === 'up' ? 'stable' : 'down';
          }
        }
      } else if (period === 'year' && validValues.length >= 2) {
        // Mejorada lógica para vista anual que considera la forma visual de la curva
        
        // Ordenar valores por mes para asegurar secuencia temporal correcta
        validValues = [...validValues].sort((a, b) => {
          const monthA = a.monthIndex !== undefined ? Number(a.monthIndex) : 
                       (typeof a.month === 'number' ? a.month : 0);
          const monthB = b.monthIndex !== undefined ? Number(b.monthIndex) : 
                       (typeof b.month === 'number' ? b.month : 0);
          return monthA - monthB;
        });
        
        // Filtrar valores significativos (>0) para análisis
        const significantValues = validValues.filter(v => v.value > 0);
        
        // Si no hay valores significativos, mantener tendencia estable
        if (significantValues.length === 0) {
          trend = 'stable';
        } else {
          // Encontrar el valor máximo y su posición
          const maxEntry = validValues.reduce((max, curr) => 
            curr.value > max.value ? curr : max, validValues[0]);
          const maxIndex = validValues.findIndex(v => v.value === maxEntry.value);
          const maxMonthIndex = maxEntry.monthIndex !== undefined ? 
                              Number(maxEntry.monthIndex) : 
                              (typeof maxEntry.month === 'number' ? maxEntry.month : -1);
          
          // Encontrar el último valor con actividad significativa (>5%)
          const lastSignificantValue = significantValues[significantValues.length - 1];
          const lastSignificantIndex = validValues.findIndex(v => 
            (v.monthIndex === lastSignificantValue.monthIndex || v.month === lastSignificantValue.month));
          
          // Determinar si el pico máximo está en la primera o segunda mitad del año
          const isMaxInFirstHalf = maxMonthIndex < 6;
          const isMaxInSecondHalf = maxMonthIndex >= 6;
          
          // Calcular promedios de valores significativos en cada mitad
          const firstHalfValues = significantValues.filter(v => {
            const monthIdx = v.monthIndex !== undefined ? Number(v.monthIndex) : 
                           (typeof v.month === 'number' ? v.month : -1);
            return monthIdx < 6;
          });
          
          const secondHalfValues = significantValues.filter(v => {
            const monthIdx = v.monthIndex !== undefined ? Number(v.monthIndex) : 
                           (typeof v.month === 'number' ? v.month : -1);
            return monthIdx >= 6;
          });
          
          const firstHalfAvg = firstHalfValues.length > 0 ? 
            firstHalfValues.reduce((sum, v) => sum + v.value, 0) / firstHalfValues.length : 0;
          
          const secondHalfAvg = secondHalfValues.length > 0 ? 
            secondHalfValues.reduce((sum, v) => sum + v.value, 0) / secondHalfValues.length : 0;
          
          // CASO 1: Si el máximo está al final del año, tendencia ascendente
          if (maxIndex === lastSignificantIndex && maxMonthIndex >= 9) { // Último trimestre
            trend = 'up';
          }
          // CASO 2: Si hay un pico alto en la primera mitad y luego valores bajos, descendente
          else if (isMaxInFirstHalf && firstHalfAvg > secondHalfAvg * 1.5) {
            trend = 'down';
          }
          // CASO 3: Si hay un pico alto en la segunda mitad y valores bajos antes, ascendente
          else if (isMaxInSecondHalf && secondHalfAvg > firstHalfAvg * 1.5) {
            trend = 'up';
          }
          // CASO 4: Analizar la tendencia después del pico máximo
          else {
            // Obtener valores después del máximo
            const valuesAfterMax = validValues.slice(maxIndex + 1).filter(v => v.value > 0);
            
            if (valuesAfterMax.length > 0) {
              // Calcular el promedio de valores después del máximo
              const avgAfterMax = valuesAfterMax.reduce((sum, v) => sum + v.value, 0) / valuesAfterMax.length;
              const percentOfMax = (avgAfterMax / maxEntry.value) * 100;
              
              // Si el promedio después del máximo es menor que el 60% del máximo, tendencia descendente
              if (percentOfMax < 60) {
                trend = 'down';
              }
              // Si el promedio después del máximo es mayor que el 90% del máximo, tendencia ascendente
              else if (percentOfMax > 90) {
                trend = 'up';
              }
              // En el medio, estable
              else {
                trend = 'stable';
              }
            }
          }
        }
      }
      
      // Formatear fecha del máximo valor
      let formattedMaxDate = '';
      if (period === 'month' && maxEntry.dayNumber) {
        // Para vista mensual, mostrar el día
        formattedMaxDate = `${maxEntry.dayNumber}`;
      } else if (period === 'year') {
        // Para vista anual, mostrar el mes
        // Intentar diferentes formatos para obtener el mes
        let monthIndex = -1;
        
        // Caso 1: Si maxEntry tiene monthIndex directo
        if (maxEntry.monthIndex !== undefined) {
          monthIndex = Number(maxEntry.monthIndex);
        }
        // Caso 2: Si maxEntry tiene month como número
        else if (maxEntry.month !== undefined && typeof maxEntry.month === 'number') {
          monthIndex = maxEntry.month;
        }
        // Caso 3: Si maxEntry tiene month como string
        else if (maxEntry.month !== undefined && typeof maxEntry.month === 'string') {
          // Intentar convertir a número primero
          const numMonth = Number(maxEntry.month);
          if (!isNaN(numMonth)) {
            monthIndex = numMonth;
          } else {
            // Buscar el índice del mes por nombre
            const monthsShort = [
              'jan', 'feb', 'mar', 'apr', 'may', 'jun', 
              'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
            ];
            const monthName = maxEntry.month.toLowerCase();
            monthIndex = monthsShort.findIndex(m => monthName.includes(m));
          }
        }
        // Caso 4: Si maxEntry.date es un índice numérico
        else if (!isNaN(Number(maxEntry.date))) {
          monthIndex = Number(maxEntry.date);
        }
        // Caso 5: Si maxEntry.date es un nombre de mes
        else {
          // Buscar el índice del mes por nombre
          const monthsShort = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun', 
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
          ];
          const monthName = maxEntry.date.toLowerCase();
          monthIndex = monthsShort.findIndex(m => monthName.includes(m));
        }
        
        // Si encontramos un índice válido de mes, formatearlo
        if (monthIndex >= 0 && monthIndex < 12) {
          // Usar nombres de meses cortos directamente de las traducciones
          const monthsTranslations = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          const monthKey = monthsTranslations[monthIndex];
          formattedMaxDate = t(`calendar.monthsShort.${monthKey}`, format(new Date(year, monthIndex, 1), 'MMM', { locale: es }));
        }
      }
      
      stats[habit.name] = {
        average: parseFloat(average.toFixed(2)),
        max: parseFloat(maxEntry.value.toFixed(2)),
        maxDate: formattedMaxDate || '-',
        trend
      };
    });
    
    return stats;
  }, [data, habits, period, year, t]);
  
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getTrendDescription = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return t('stats.improving', 'Ascendente');
      case 'down':
        return t('stats.declining', 'Descendente');
      default:
        return t('stats.stable', 'Estable');
    }
  };
  
  // Función para obtener el texto adecuado para la fecha máxima según el periodo
  const getMaxDateLabel = () => {
    return period === 'month' 
      ? t('stats.maxDate', 'Fecha máx.') 
      : t('stats.maxMonth', 'Mes máx.');
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-2 sm:p-4 shadow-sm">
      <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-5 border-b border-gray-100 dark:border-gray-700 pb-1 sm:pb-3">
        <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 dark:text-gray-300" />
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white">
          {t('stats.summary', 'Resumen estadístico')}
        </h3>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button 
                className="ml-1 inline-flex items-center justify-center rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
                onClick={(e) => {
                  // Evitar que el clic se propague
                  e.stopPropagation();
                }}
              >
                <Info className="h-3.5 w-3.5" />
                <span className="sr-only">Información sobre las estadísticas</span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="top" 
              align="center" 
              className="max-w-xs text-xs bg-white dark:bg-gray-800 p-3 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg"
              sideOffset={5}
            >
              <div className="text-gray-700 dark:text-gray-300">
                {period === 'month' 
                  ? 'Estas estadísticas muestran el rendimiento diario de cada hábito durante el mes actual. El promedio representa el porcentaje medio de completitud, el máximo muestra el día con mejor rendimiento, y la tendencia indica si el hábito está mejorando, estable o en declive.'
                  : 'Estas estadísticas muestran el rendimiento mensual de cada hábito durante el año actual. El promedio representa el porcentaje medio de completitud, el máximo muestra el mes con mejor rendimiento, y la tendencia indica si el hábito está mejorando, estable o en declive.'
                }
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
        {/* Ordenar los hábitos por promedio de mayor a menor */}
        {habits
          .slice() // Crear una copia para no modificar el array original
          .sort((a, b) => {
            const avgA = habitStats[a.name]?.average || 0;
            const avgB = habitStats[b.name]?.average || 0;
            return avgB - avgA; // Ordenar de mayor a menor
          })
          .map(habit => (
          <div 
            key={habit.name} 
            className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2 sm:p-3 border border-gray-100 dark:border-gray-600 hover:shadow-sm transition-shadow"
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
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm">
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('stats.average', 'Promedio')}
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {habitStats[habit.name]?.average}%
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm">
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('stats.maximum', 'Máximo')}
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {habitStats[habit.name]?.max}%
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm">
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {getMaxDateLabel()}
                </div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <Calendar className="h-3 w-3 sm:h-3 sm:w-3" />
                  {habitStats[habit.name]?.average > 0 ? habitStats[habit.name]?.maxDate : '-'}
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-1.5 sm:p-1.5 rounded-lg shadow-sm">
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {t('stats.trend', 'Tendencia')}
                </div>
                <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  {habitStats[habit.name]?.average > 0 ? getTrendIcon(habitStats[habit.name]?.trend || 'stable') : <Minus className="h-4 w-4 text-gray-500" />}
                  <span className="text-xs sm:text-sm">
                    {habitStats[habit.name]?.average > 0 
                      ? getTrendDescription(habitStats[habit.name]?.trend || 'stable') 
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendStatsPanel; 