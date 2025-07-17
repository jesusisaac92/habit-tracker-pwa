import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { InfoIcon } from "lucide-react";
import { 
  HabitsProgressChartProps, 
  ViewPeriodType,
  HabitStatus,
  Habit
} from '@/components/types/types';
import { format, parse, isValid, getDaysInMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';
import { useChartStore } from '@/store/useChartStore';
import { useTheme } from 'next-themes';
import { DECAY_RATE } from '@/components/services/chartCalculations/trendCalculations';
import { useHabitStore } from '@/store/useHabitStore';

type PeriodType = 'month' | 'year';

interface ProgressDataPoint {
  period: string;
  dayNumber?: number;
  _realValues?: Record<string, number>;
  [habitName: string]: string | number | undefined | Record<string, number>;
}

interface HabitProgressData {
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  selectedMonth: Date;
  period: ViewPeriodType;
}

const CustomTooltip = ({ active, payload, label, selectedMonth, period }: CustomTooltipProps) => {
  const { t } = useTranslation();
  
  if (!active || !payload || !payload.length || !label) {
    return null;
  }
  
  try {
    // Intentar convertir la fecha si está en formato ISO
    let displayDate = label;
    
    if (typeof label === 'string' && label.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const date = new Date(label);
      if (isValid(date)) {
        // Usar el formato con nombre del mes
        displayDate = format(date, 'd MMMM', { locale: es });
      }
    } else if (!isNaN(Number(label))) {
      // Si el label es un número (día del mes), construir la fecha correcta usando selectedMonth
      const day = Number(label);
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const date = new Date(year, month, day);
      
      if (isValid(date)) {
        // Usar el formato con nombre del mes
        displayDate = format(date, 'd MMMM', { locale: es });
      }
    }
    
    // Ordenar los hábitos por valor (de mayor a menor)
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-4 border border-gray-100 dark:border-gray-700">
        <span className="text-xs sm:text-sm font-semibold block mb-1 dark:text-gray-100">
          {displayDate}
        </span>
        <div className="space-y-0.5 sm:space-y-1">
          {sortedPayload.map((entry, index) => (
            <div 
              key={`item-${index}`}
              className="flex justify-between items-center"
              style={{ 
                width: window?.innerWidth < 640 ? '150px' : '200px',
                fontSize: window?.innerWidth < 640 ? '10px' : '12px'
              }}
            >
              <span style={{ color: entry.color }}>{entry.name}</span>
              <span className="dark:text-white">{entry.value.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    // Silent error handling
    return null;
  }
};

export const HabitsProgressChart: React.FC<HabitsProgressChartProps> = ({
  data = [],
  habits,
  selectedMonth = new Date(),
  period = 'month',
  habitStatus
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Usar directamente useChartStore para los datos de tendencia
  const { monthlyTrendData, yearlyTrendData } = useChartStore();
  // Usar useHabitStore para obtener la información completa de habitStatus
  const globalHabitStatus = useHabitStore(state => state.habitStatus);

  // Procesamiento de datos para mostrar correctamente las tendencias
  const processData = useCallback((chartData: ProgressDataPoint[]) => {
    // Solo procesar datos si hay datos y hábitos disponibles
    if (!chartData || chartData.length === 0 || !habits || habits.length === 0) {
      return chartData;
    }
    
    // Inicializar variables
    const month = selectedMonth.getMonth();
    const year = selectedMonth.getFullYear();
    const daysInMonth = getDaysInMonth(new Date(year, month, 1));
    
    // Crear un mapeo de id de hábito a objeto hábito para fácil acceso
    const habitMap: Record<string, Habit> = {};
    habits.forEach(habit => {
      // Convertir todos los IDs a string para consistencia
      const habitId = String(habit.id);
      habitMap[habitId] = habit;
      // También indexar por supabase_id si está disponible
      if (habit.supabase_id) {
        const supabaseId = String(habit.supabase_id);
        habitMap[supabaseId] = habit;
      }
    });
    
    // Crear un mapeo de id de hábito a nombre
    const habitIdToName: Record<string, string> = {};
    habits.forEach(habit => {
      habitIdToName[String(habit.id)] = habit.name;
      if (habit.supabase_id) {
        habitIdToName[String(habit.supabase_id)] = habit.name;
      }
    });
    
    // Crear una copia de los datos para no modificar los originales
    const processedData = [...chartData];
    
    // CAMBIO IMPORTANTE: Eliminar todas las propiedades de hábitos existentes en los datos
    // para asegurarnos de que no hay residuos de cálculos anteriores
    processedData.forEach(dataPoint => {
      habits.forEach(h => {
        if (dataPoint[h.name] !== undefined) {
          delete dataPoint[h.name];
        }
      });
      
      // Inicializar _realValues
      dataPoint._realValues = {};
    });
    
    // Crear un mapa para rastrear las completaciones por fecha y hábito
    const completionsByDate: Record<string, string[]> = {};
    
    // Crear un mapa para rastrear las fechas completadas por hábito
    const habitCompletions: Record<string, string[]> = {};
    habits.forEach(habit => {
      habitCompletions[habit.name] = [];
    });
    
    // 1. Extraer todas las completaciones del habitStatus y globalHabitStatus
    // combinado con la nueva lógica para obtener esta información
    const allStatusKeys = [
      ...Object.keys(habitStatus || {}),
      ...Object.keys(globalHabitStatus || {})
    ];
    
    // Filtrar por el mes actual
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const keysForCurrentMonth = allStatusKeys.filter(key => key.includes(monthStr));
    
    keysForCurrentMonth.forEach(key => {
      const isCompleted = 
        (habitStatus && habitStatus[key]?.status === 'completed') || 
        (globalHabitStatus && globalHabitStatus[key]?.status === 'completed');
      
      if (isCompleted) {
        const [habitId, dateStr] = key.split('-');
        
        // Si es clave alternativa (0-fecha), saltarla por ahora
        if (habitId === '0') return;
        
        // Obtener el nombre del hábito
        const habitName = habitIdToName[habitId];
        
        if (habitName) {
          // Registrar la fecha en el hábito correspondiente
          if (!habitCompletions[habitName]) {
            habitCompletions[habitName] = [];
          }
          habitCompletions[habitName].push(dateStr);
          
          // Registrar también qué hábito completó esta fecha
          if (!completionsByDate[dateStr]) {
            completionsByDate[dateStr] = [];
          }
          completionsByDate[dateStr].push(habitId);
        }
      }
    });
    
    // Ordenar las fechas de cada hábito cronológicamente
    Object.keys(habitCompletions).forEach(habitName => {
      habitCompletions[habitName].sort();
    });
    
    // Si no hay completaciones en habitCompletions, intentar obtenerlas directamente de habitStatus
    if (Object.values(habitCompletions).every(dates => dates.length === 0)) {
      // Procesar cada hábito
      habits.forEach(habit => {
        const habitId = String(habit.id);
        const supabaseId = habit.supabase_id ? String(habit.supabase_id) : null;
        
        // Buscar completaciones directamente por el ID del hábito
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          // Verificar con el ID principal
          const keyWithId = `${habitId}-${dateStr}`;
          let isCompleted = 
            (habitStatus && habitStatus[keyWithId]?.status === 'completed') ||
            (globalHabitStatus && globalHabitStatus[keyWithId]?.status === 'completed');
          
          // Si no está completado y hay un supabaseId, verificar con ese también
          if (!isCompleted && supabaseId) {
            const keyWithSupabaseId = `${supabaseId}-${dateStr}`;
            isCompleted = 
              (habitStatus && habitStatus[keyWithSupabaseId]?.status === 'completed') ||
              (globalHabitStatus && globalHabitStatus[keyWithSupabaseId]?.status === 'completed');
          }
          
          // Si está completado, registrarlo
          if (isCompleted) {
            if (!habitCompletions[habit.name]) {
              habitCompletions[habit.name] = [];
            }
            habitCompletions[habit.name].push(dateStr);
            
            if (!completionsByDate[dateStr]) {
              completionsByDate[dateStr] = [];
            }
            completionsByDate[dateStr].push(habitId);
          }
        }
      });
      
      // Ordenar las fechas de nuevo
      Object.keys(habitCompletions).forEach(habitName => {
        habitCompletions[habitName].sort();
      });
    }
    
    // Ahora, procesar cada hábito de manera independiente
    habits.forEach(habit => {
      // Obtener las fechas completadas para este hábito
      const completedDates = habitCompletions[habit.name] || [];
      
      // Inicializar acumuladores para este hábito específico
      let accumulatedPoints = 0;
      let lastCompletedPoints = 0;
      let daysSinceLastCompleted = 0;
      let lastCompletedDay = 0;
      
      // Procesar cada día del mes para este hábito
      processedData.forEach((dataPoint, index) => {
        if (!dataPoint.period || !dataPoint.dayNumber) return;
        
        const dateStr = dataPoint.period.toString();
        const dayNumber = Number(dataPoint.dayNumber);
        
        // Verificar si este día está completado para este hábito
        const isCompleted = completedDates.includes(dateStr);
        
        // Calcular puntos por día (100% / días en el mes)
        const pointsPerDay = 100 / daysInMonth;
        
        if (isCompleted) {
          // Si este día está completado
          if (lastCompletedDay > 0 && dayNumber > lastCompletedDay + 1) {
            // Si hay días sin completar entre la última completación y esta,
            // aplicar decaimiento desde el último día completado
            const daysSinceLastCompleted = dayNumber - lastCompletedDay - 1;
            if (daysSinceLastCompleted > 0) {
              const decayFactor = Math.pow(1 - DECAY_RATE, daysSinceLastCompleted);
              accumulatedPoints = lastCompletedPoints * decayFactor;
            }
          }
          
          // Sumar los puntos del día actual
          accumulatedPoints += pointsPerDay;
          lastCompletedPoints = accumulatedPoints;
          lastCompletedDay = dayNumber;
          daysSinceLastCompleted = 0;
        } else {
          // Si no está completado, aplicar decaimiento desde el último día completado
          if (lastCompletedDay > 0) {
            daysSinceLastCompleted = dayNumber - lastCompletedDay;
            const decayFactor = Math.pow(1 - DECAY_RATE, daysSinceLastCompleted);
            accumulatedPoints = lastCompletedPoints * decayFactor;
          } else {
            // Si nunca ha habido una completación, mantener en 0
            accumulatedPoints = 0;
          }
        }
        
        // Guardar el valor real para el tooltip
        if (!dataPoint._realValues) dataPoint._realValues = {};
        dataPoint._realValues[habit.name] = accumulatedPoints;
        
        // Guardar el valor redondeado para la gráfica
        dataPoint[habit.name] = Number(accumulatedPoints.toFixed(2));
      });
    });
    
    return processedData;
  }, [habits, habitStatus, selectedMonth, period, globalHabitStatus]);

  // Utilizar los datos del store directamente si están disponibles
  const chartData = useMemo(() => {
    if (period === 'month' && monthlyTrendData && monthlyTrendData.length > 0) {
      return processData(monthlyTrendData);
    } else if (period === 'year' && yearlyTrendData && yearlyTrendData.length > 0) {
      return yearlyTrendData;
    }
    return processData(data);
  }, [period, monthlyTrendData, yearlyTrendData, data, processData]);

  // Si no hay hábitos, mostrar mensaje amigable
  if (!habits || habits.length === 0) {
    return (
      <NoHabitsMessage 
        title={t('progress.noHabitsTitle') || 'No hay progreso para mostrar'}
        description={t('progress.noHabitsDescription') || 'Crea tu primer hábito para comenzar a ver tu progreso en esta gráfica.'}
      />
    );
  }

  // Obtener los ticks personalizados
  const getCustomTicks = () => {
    // Para mostrar todos los días, generamos un array con todos los días disponibles
    if (chartData.length === 0) return undefined;
    
    // Extract all period values from processed data
    return chartData.map(item => item.period as string);
  };

  const customTicks = React.useMemo(() => getCustomTicks(), [chartData]);

  // Asegurar que se muestra el día 30 ajustando el intervalo
  const getTickInterval = () => {
    // Para dispositivos móviles, mostrar menos ticks
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return chartData.length <= 15 ? 1 : 3; // Mostrar cada 3 días en móvil
    }
    
    // Para pantallas web (medianas y grandes), mostrar todos los días
    return 0; // Mostrar todos los ticks en modo web
  };

  // Función para formatear las fechas en el eje X
  const formatXAxisTick = (value: string) => {
    if (period === 'month') {
      try {
        // Si el valor tiene formato de fecha YYYY-MM-DD
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Extraer directamente el día del mes a partir del string
          const day = parseInt(value.split('-')[2]);
          if (!isNaN(day)) {
            return day.toString();
          }
        }
        
        // Si es un valor directo de día (sin formato de fecha)
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          return numValue.toString();
        }
      } catch (e) {
        // Silent error handling
      }
    }
    
    return value;
  };

  // Personalizar el tooltip para asegurar que el día mostrado es correcto
  const CustomTooltipWrapper = (props: CustomTooltipProps) => {
    if (!props.active || !props.payload || !props.payload.length || !props.label) return null;
    
    try {
      // Asegurarnos de que selectedMonth siempre esté disponible
      const tooltipProps = {
        ...props,
        selectedMonth: selectedMonth
      };
      
      // Identificar el día real basado en el punto de datos activo
      // En la gráfica, cuando se muestra un tooltip, necesitamos encontrar el día real
      // que corresponde a la posición en el eje X
      
      // 1. Primero verificamos si el label es un número (día del mes)
      const numericDay = parseInt(props.label);
      
      // 2. Si es un número, creamos una fecha completa para ese día del mes seleccionado
      if (!isNaN(numericDay)) {
        // Encontrar el punto de datos que corresponde a este día
        const dataPoint = chartData.find(d => d.dayNumber === numericDay);
        
        if (dataPoint) {
          // Si encontramos el punto de datos, usamos su periodo como label
          return <CustomTooltip {...tooltipProps} label={numericDay.toString()} />;
        }
      }
      
      // 3. Si el label es una fecha en formato YYYY-MM-DD
      if (typeof props.label === 'string' && props.label.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Extraer el día de la fecha en el label
        const parts = props.label.split('-');
        const day = parseInt(parts[2]);
        
        if (!isNaN(day)) {
          // Usar el día extraído como label
          return <CustomTooltip {...tooltipProps} label={day.toString()} />;
        }
      }
      
      // Si llegamos aquí, usamos el tooltip normal con el label original
      return <CustomTooltip {...tooltipProps} />;
    } catch (e) {
      // Silent error handling
      return <CustomTooltip {...props} selectedMonth={selectedMonth} />;
    }
  };

  return (
    <div className="relative w-full">
      {/* Capa de fondo con sombra y bordes redondeados */}
      <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-xl shadow-md" style={{ zIndex: 0 }}></div>
      
      <div className="w-full h-[300px] sm:h-[350px] md:h-[400px] bg-white dark:bg-gray-800 rounded-xl" style={{ 
        position: 'relative', 
        zIndex: 1,
        padding: '5px 2px 10px 2px',
        border: '1px solid rgba(229, 231, 235, 0.5)',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
      }}>
        <ResponsiveContainer width="100%" height="100%" className="bg-white dark:bg-gray-800">
          <AreaChart
            data={chartData}
            margin={{ 
              top: 20, 
              right: 5,
              left: 5,
              bottom: 20
            }}
            className="bg-white dark:bg-gray-800 overflow-visible"
            style={{ backgroundColor: 'transparent' }}
          >
            <defs>
              {habits.map(habit => (
                <linearGradient 
                  key={`gradient-${habit.name}`} 
                  id={`color-${habit.name}`} 
                  x1="0" y1="0" 
                  x2="0" y2="1"
                >
                  <stop offset="5%" stopColor={habit.color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={habit.color} stopOpacity={0.05}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={isDark ? "#374151" : "#e5e7eb"}
            />
            <XAxis 
              dataKey="period"
              tickFormatter={formatXAxisTick}
              tickLine={false}
              axisLine={period === 'year' ? false : { stroke: isDark ? "#4b5563" : "#d1d5db", strokeWidth: 1.5 }}
              tick={{ fill: isDark ? "#9ca3af" : "#4b5563", fontSize: window?.innerWidth < 640 ? 9 : 10 }}
              interval={getTickInterval()}
              padding={{ left: 5, right: 5 }}
              ticks={customTicks}
              height={40}
              dy={5}
              className="dark:text-gray-300"
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              axisLine={{ stroke: isDark ? "#4b5563" : "#d1d5db", strokeWidth: 1.5 }}
              tick={{ fill: isDark ? "#9ca3af" : "#4b5563", fontSize: 10 }}
              tickLine={false}
              tickCount={5}
              width={35}
              className="dark:text-gray-300"
            />
            <Tooltip 
              content={
                <CustomTooltipWrapper 
                  selectedMonth={selectedMonth} 
                  period={period}
                />
              }
              cursor={period === 'year' ? false : { stroke: isDark ? "#6b7280" : "#9ca3af", strokeWidth: 1 }}
            />
            <ReferenceLine 
              y={50} 
              stroke={isDark ? "#6b7280" : "#9ca3af"} 
              strokeDasharray="3 3" 
              label={{ 
                value: "50%", 
                position: "insideTopLeft",
                fill: isDark ? "#9ca3af" : "#4b5563",
                fontSize: 10,
                offset: 8,
                className: "dark:fill-gray-300"
              }}
              className="dark:stroke-gray-500"
            />
            {habits.map((habit, index) => (
              <Area
                key={habit.name}
                type="monotone"
                dataKey={habit.name}
                name={habit.name}
                stroke={habit.color}
                fill={`url(#color-${habit.name})`}
                dot={false}
                activeDot={period === 'year' ? false : { r: 5, strokeWidth: 2 }}
                strokeWidth={1.5}
                strokeOpacity={1}
                isAnimationActive={true}
              />
            ))}
            {/* Línea de referencia en 0 que cubre las líneas de los hábitos cuando están en 0 */}
            <ReferenceLine 
              y={0.001} 
              stroke={isDark ? "#1f2937" : "#ffffff"} 
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

HabitsProgressChart.displayName = 'HabitsProgressChart';

export default HabitsProgressChart;