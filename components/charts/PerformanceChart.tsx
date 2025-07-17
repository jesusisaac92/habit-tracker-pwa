"use client"
import React, { useMemo, useEffect, useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ReferenceLine,
  Legend,
  ComposedChart,
  Bar
} from 'recharts';
import { useTranslation } from 'next-i18next';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { calculateDailyPerformance } from '@/components/services/chartCalculations/performanceGraphCalculations';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';
import { supabase } from '@/src/supabase/config/client';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { format } from 'date-fns';
import { useHabitStore } from '@/store/useHabitStore';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: any;
    dataKey: string;
    payload: {
      day: number;
      points: number;
      status: string;
      time: string;
      trend?: number;
      previousMonth?: number;
    };
  }>;
  label?: string | number;
}

interface PerformanceChartProps {
  selectedHabitName: string;
  currentDate: Date;
  graphData: Array<{
    day: number;
    points: number;
    status: string;
    time: string;
  }>;
  selectedHabitIndex?: number | null;
  habitId?: string | null;
  getMonthName: (month: number) => string;
  CustomTooltip: (props: TooltipProps<ValueType, NameType>) => JSX.Element | null;
  previousMonthData?: Array<{
    day: number;
    points: number;
    status: string;
    time: string;
  }>;
  currentMonthPerformance?: {
    actual: number;
    anterior: number;
    diferencia: number;
  };
  updateCurrentPerformance?: (actual: number, anterior: number) => void;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  selectedHabitName,
  currentDate,
  graphData = [],
  selectedHabitIndex,
  habitId,
  getMonthName,
  CustomTooltip,
  previousMonthData = [],
  currentMonthPerformance,
  updateCurrentPerformance,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [completions, setCompletions] = useState<any[]>([]);
  const updateHabitStatus = useHabitStore(state => state.updateHabitStatus);

  // Cargar completaciones desde la base de datos
  useEffect(() => {
    const loadCompletions = async () => {
      // Use habitId directly if provided, otherwise try to find it using selectedHabitIndex
      let effectiveHabitId = habitId;
      
      if (!effectiveHabitId && selectedHabitIndex !== null && selectedHabitIndex !== undefined) {
        // Fallback to finding the habit ID from the index
        const habitStore = useHabitStore.getState();
        const habits = habitStore.habits;
        effectiveHabitId = habits.find(h => h.index === selectedHabitIndex)?.supabase_id || null;
      }
      
      if (!user?.id || !effectiveHabitId) {
        return;
      }
      
      try {
        // Calcular el rango de fechas para el mes actual
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Primero, obtener todas las completaciones para este hábito (no solo del mes actual)
        // para poder calcular correctamente el récord y la racha actual
        const { data: allCompletions, error: allCompletionsError } = await supabase
          .from('habit_completions')
          .select('habit_id, completion_date')
          .eq('user_id', user.id)
          .eq('habit_id', effectiveHabitId)
          .eq('is_completed', true)
          .order('completion_date', { ascending: false });
          
        if (allCompletionsError) {
          return;
        }
        
        // Filtrar solo las completaciones del mes actual para la visualización
        const { data, error } = await supabase
          .from('habit_completions')
          .select('habit_id, completion_date')
          .eq('user_id', user.id)
          .eq('habit_id', effectiveHabitId)
          .gte('completion_date', format(startDate, 'yyyy-MM-dd'))
          .lte('completion_date', format(endDate, 'yyyy-MM-dd'))
          .eq('is_completed', true);

        if (error) {
          return;
        }

        if (data) {
          setCompletions(data);
          
          // Actualizar el estado global de hábitos
          data.forEach(completion => {
            const key = `${completion.habit_id}-${completion.completion_date}`;
            updateHabitStatus(key, 'completed');
          });
          
          // Calcular la racha actual y el récord si tenemos todas las completaciones
          if (allCompletions && allCompletions.length > 0) {
            // Filtrar solo las completaciones para este hábito específico
            const habitCompletions = allCompletions.filter(
              completion => completion.habit_id === effectiveHabitId
            );
            
            if (habitCompletions.length > 0) {
              // Ordenar por fecha (más reciente primero)
              habitCompletions.sort((a, b) => 
                new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
              );
              
              // Calcular la racha actual
              let currentStreak = 0;
              let today = new Date();
              today.setHours(0, 0, 0, 0);
              
              for (let i = 0; i < habitCompletions.length; i++) {
                const completionDate = new Date(habitCompletions[i].completion_date);
                completionDate.setHours(0, 0, 0, 0);
                
                // Si es el primer día o es consecutivo al anterior
                if (i === 0) {
                  // El primer día siempre cuenta
                  currentStreak = 1;
                } else {
                  const prevDate = new Date(habitCompletions[i-1].completion_date);
                  prevDate.setHours(0, 0, 0, 0);
                  
                  // Verificar si es consecutivo (diferencia de 1 día)
                  const diffDays = Math.floor((prevDate.getTime() - completionDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (diffDays === 1) {
                    currentStreak++;
                  } else {
                    // Si no es consecutivo, terminamos
                    break;
                  }
                }
              }
              
              // Actualizar el hábito en la base de datos con la nueva racha y récord
              const { data: habitData } = await supabase
                .from('habits')
                .select('id, current_streak, record')
                .eq('id', effectiveHabitId)
                .single();
                
              if (habitData) {
                const currentRecord = habitData.record || 0;
                const newRecord = Math.max(currentRecord, currentStreak);
                
                // Solo actualizar si hay cambios
                if (currentStreak !== habitData.current_streak || newRecord !== currentRecord) {
                  await supabase
                    .from('habits')
                    .update({
                      current_streak: currentStreak,
                      record: newRecord
                    })
                    .eq('id', effectiveHabitId);
                }
              }
            }
          }
        }
      } catch (error) {
        return;
      }
    };

    loadCompletions();
  }, [user?.id, selectedHabitIndex, habitId, currentDate, updateHabitStatus]);

  // Si no hay hábito seleccionado, mostrar mensaje amigable
  if ((selectedHabitIndex === null && !habitId) || !selectedHabitName) {
    return (
      <NoHabitsMessage 
        title={t('performance.noHabitTitle') || 'No hay hábito seleccionado'}
        description={t('performance.noHabitDescription') || 'Selecciona un hábito para ver su rendimiento en esta gráfica.'}
      />
    );
  }
  
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  // Procesar los datos con las completaciones cargadas
  const processedData = useMemo(() => {
    const monthData = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Buscar si hay una completación para este día
      const isCompleted = completions.some(completion => 
        completion.completion_date === dateStr
      );

      return {
        day,
        points: isCompleted ? 100 : 0,
        status: isCompleted ? 'completed' : 'not-completed',
        time: ''
      };
    });

    return calculateDailyPerformance(monthData, daysInMonth);
  }, [completions, currentDate, daysInMonth]);

  // Procesar datos del mes anterior
  const processedPreviousData = useMemo(() => {
    return previousMonthData ? calculateDailyPerformance(previousMonthData, daysInMonth) : [];
  }, [previousMonthData, daysInMonth]);

  // Calcular y actualizar el rendimiento actual
  useEffect(() => {
    if (processedData.length > 0 && updateCurrentPerformance) {
      // Obtener el valor del día actual o el último día si estamos en un mes diferente
      const currentDay = currentDate.getDate();
      const currentDayData = processedData[currentDay - 1] || processedData[processedData.length - 1];
      const currentValue = currentDayData?.points || 0;
      
      // Obtener el valor del mismo día del mes anterior
      const previousValue = processedPreviousData[currentDay - 1]?.points || 0;
      
      // Solo actualizar si los valores son diferentes a los actuales
      if (currentMonthPerformance && 
         (currentMonthPerformance.actual !== currentValue || 
          currentMonthPerformance.anterior !== previousValue)) {
        // Actualizar el rendimiento en el componente padre
        updateCurrentPerformance(currentValue, previousValue);
      } else if (!currentMonthPerformance) {
        // Primera carga, actualizar sin comparar
        updateCurrentPerformance(currentValue, previousValue);
      }
    }
  }, [processedData, processedPreviousData, currentDate, updateCurrentPerformance, currentMonthPerformance]);

  const dataWithPreviousMonth = useMemo(() => {
    // Añadir un punto inicial con día 0 y puntos 0
    const initialPoint = {
      day: 0,
      points: 0,
      status: 'not-completed',
      time: '',
      previousMonth: 0
    };
    
    const fullMonthData = Array.from({ length: daysInMonth }, (_, i) => {
      const existingDay = processedData.find(d => d.day === i + 1);
      
      return {
        ...(existingDay || {
          day: i + 1,
          points: 0,
          status: 'not-completed',
          time: ''
        }),
        previousMonth: processedPreviousData[i]?.points || 0
      };
    });
    
    return [initialPoint, ...fullMonthData];
  }, [processedData, currentDate, processedPreviousData, daysInMonth]);

  // Obtener el día actual para la línea de referencia
  const currentDay = useMemo(() => {
    const now = new Date();
    // Solo mostrar la línea de referencia si estamos en el mes actual
    if (now.getMonth() === currentDate.getMonth() && 
        now.getFullYear() === currentDate.getFullYear()) {
      return now.getDate();
    }
    return null;
  }, [currentDate]);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full overflow-x-auto overflow-y-hidden">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={dataWithPreviousMonth} 
              margin={{ 
                top: 20,
                right: 30,
                left: -10,
                bottom: 20
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis 
                dataKey="day"
                stroke="#888888"
                tick={{
                  fill: '#888888', 
                  fontSize: 11,
                  transform: 'translate(0, 10)',
                }}
                tickLine={{stroke: '#888888' }}
                interval={2}
              />
              <YAxis 
                stroke="#888888"
                tick={{fill: '#888888', fontSize: 11 }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                width={45}
                tickMargin={8}
              />
              {currentDay && (
                <ReferenceLine 
                  x={currentDay} 
                  stroke="#facc15" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    position: 'insideTopRight',
                    fill: '#facc15',
                    fontSize: 10,
                    fontWeight: 500,
                    offset: 10
                  }}
                />
              )}
              <Line 
                type="basis"
                dataKey="points"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                name={t('charts.performance')}
              />
              <Line 
                type="basis"
                dataKey="previousMonth"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name={t('charts.previousMonth')}
                connectNulls={true}
                isAnimationActive={false}
                legendType="line"
              />
              <RechartsTooltip content={CustomTooltip} />
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{
                  paddingTop: '10px',
                  fontSize: '12px'
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
