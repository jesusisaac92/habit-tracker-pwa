"use client";
import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Habit, BalanceData, WeekData, HabitStatusMap, HabitStatus } from "@/components/types/types";
import { useTranslation } from 'next-i18next';
import { supabase } from '@/src/supabase/config/client';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';
import { generateWeeklyBalanceData } from '@/components/services/chartCalculations/weeklyBalanceCalculations';
import { useChartStore } from '@/store/useChartStore';
import { chartCalculations } from '@/components/services/chartCalculations/calculations';

interface BalanceChartProps {
  balancePeriod: 'week' | 'month' | 'year';
  chartType: 'bar' | 'pie';
  balanceData: BalanceData[];
  habits: Habit[];
  pieChartData: Array<{ name: string; value: number; color: string; }>;
  currentDate: Date;
  habitStatus: HabitStatusMap;
}

// Modificar la definición del tipo BalanceDataItem para permitir propiedades dinámicas
type BalanceDataItem = {
  period: string;
  fullPeriod?: string;
  [key: string]: string | number | undefined | Record<string, any>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const { t } = useTranslation();
  const isMobile = window?.innerWidth < 640;
  
  if (!active || !payload || !payload.length) return null;

  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
  
  // Extraer información del período para mostrar en formato moderno
  let weekNumber = "";
  let dateRange = "";
  
  if (payload[0]?.payload?.fullPeriod) {
    // Si tenemos fullPeriod, extraer el número de semana y el rango de fechas
    const fullPeriod = payload[0]?.payload?.fullPeriod;
    
    // Para vista semanal con formato "week-2025-06-02-2025-06-08"
    if (fullPeriod.startsWith('week-')) {
      const dates = fullPeriod.substring(5).split('-');
      if (dates.length >= 6) {
        const startDay = dates[2];
        const startMonth = dates[1];
        const endDay = dates[5];
        const endMonth = dates[4];
        
        dateRange = `${startDay}/${startMonth} - ${endDay}/${endMonth}`;
      }
      
      // Obtener el número de semana desde displayPeriod o period
      if (payload[0]?.payload?.displayPeriod && payload[0].payload.displayPeriod.startsWith('S')) {
        const match = payload[0].payload.displayPeriod.match(/S(\d+)/);
        if (match) {
          weekNumber = `Semana ${match[1]}`;
        }
      } else {
        const match = payload[0]?.payload?.period?.match(/S(\d+)/);
        if (match) {
          weekNumber = `Semana ${match[1]}`;
        }
      }
    }
    // Para otros formatos, usar comportamiento anterior
    else {
      const match = fullPeriod.match(/S(\d+)\s+\((.+)\)/);
      
      if (match) {
        weekNumber = `Semana ${match[1]}`;
        dateRange = match[2];
      } else {
        // Si no coincide con el patrón esperado, usar el valor completo
        weekNumber = fullPeriod;
      }
    }
  } else if (label) {
    // Si no hay fullPeriod pero hay label, intentar extraer información
    if (label.startsWith('S')) {
      // Para vista semanal
      const match = label.match(/S(\d+)/);
      if (match) {
        weekNumber = `Semana ${match[1]}`;
      } else {
        weekNumber = label;
      }
      
      // Intentar extraer fechas del período completo
      const dateMatch = label.match(/\((.*?)\)/);
      if (dateMatch) {
        dateRange = dateMatch[1];
      }
    } else {
      // Para vistas mensual o anual
      weekNumber = label;
    }
  }

  // Filtrar solo los valores mayores que 0
  const filteredPayload = sortedPayload.filter(entry => entry.value > 0);
  
  if (!active || !filteredPayload.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-3 border border-gray-100">
      <span className={`${isMobile ? 'text-[16px]' : 'text-[18px] sm:text-[20px]'} font-bold block mb-1 text-center`}>
        {weekNumber}
      </span>
      
      {dateRange && (
        <span className={`${isMobile ? 'text-[12px]' : 'text-[14px] sm:text-[16px]'} text-gray-500 block mb-2 text-center`}>
          {dateRange}
        </span>
      )}
      
      <div className="w-full h-px bg-gray-200 my-2"></div>
      
      <div className="space-y-1 mt-2">
        {filteredPayload.map((entry: any, index: number) => (
          <div 
            key={`item-${index}`}
            className="flex items-center justify-between"
            style={{ 
              width: isMobile ? '150px' : '200px',
              fontSize: isMobile ? '11px' : 'clamp(12px, 3.5vw, 14px)'
            }}
          >
            <div className="flex items-center gap-1.5">
              <div 
                className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full flex-shrink-0`}
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-gray-700">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {entry.value >= 100 ? '100' : parseFloat(entry.value.toString()).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente personalizado para barras redondeadas
const RoundedBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  
  // Radio de las esquinas redondeadas
  const radius = 4;
  
  // Ajustar la altura para asegurar que las barras con valor 100 se muestren correctamente
  // Si el valor es 100 o cercano, ajustar ligeramente la altura para que quepa en la gráfica
  const adjustedHeight = height >= 280 ? height - 10 : height;
  const adjustedY = height >= 280 ? y + 10 : y;
  
  // Solo redondear las esquinas superiores
  return (
    <path
      d={`
        M${x},${adjustedY + adjustedHeight}
        L${x},${adjustedY + radius}
        Q${x},${adjustedY} ${x + radius},${adjustedY}
        L${x + width - radius},${adjustedY}
        Q${x + width},${adjustedY} ${x + width},${adjustedY + radius}
        L${x + width},${adjustedY + adjustedHeight}
        Z
      `}
      fill={fill}
    />
  );
};

// Añadir esta función en la parte superior del componente
const capitalizeFirstLetter = (string: string): string => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const BalanceChart: React.FC<BalanceChartProps> = ({
  balancePeriod,
  chartType,
  balanceData,
  habits,
  pieChartData,
  currentDate,
  habitStatus
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const weeklyBalanceData = useChartStore(state => state.weeklyBalanceData);
  const [weeklyCompletions, setWeeklyCompletions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<BalanceData[]>([]);
  
  // Cargar datos de completaciones para la vista semanal
  useEffect(() => {
    if (balancePeriod === 'week' && user?.id) {
      const fetchCompletions = async () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Formatear fechas para la consulta
        const startDate = firstDay.toISOString().split('T')[0];
        const endDate = lastDay.toISOString().split('T')[0];
        
        try {
          const { data, error } = await supabase
            .from('habit_completions')
            .select('habit_id, completion_date')
            .eq('user_id', user.id)
            .gte('completion_date', startDate)
            .lte('completion_date', endDate);
            
          if (error) {
            return;
          }
          
          // Organizar completaciones por hábito
          const completionsByHabit: Record<string, string[]> = {};
          
          data?.forEach(completion => {
            if (!completionsByHabit[completion.habit_id]) {
              completionsByHabit[completion.habit_id] = [];
            }
            completionsByHabit[completion.habit_id].push(completion.completion_date);
          });
          
          setWeeklyCompletions(completionsByHabit);
        } catch (error) {
          // Error handling
        }
      };
      
      fetchCompletions();
    }
  }, [balancePeriod, currentDate, user?.id]);
  
  const getMonthName = (month: number): string => {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    if (balancePeriod === 'year') {
      return t(`calendar.months.${monthKeys[month]}`);
    }
    return t(`calendar.months.${monthKeys[month]}`).slice(0, 3);
  };

  const generateBalanceData = () => {
    const data: BalanceData[] = [];
    
    if (balancePeriod === 'month') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthKeys = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      
      const monthData: BalanceDataItem = { period: t(`calendar.monthsShort.${monthKeys[month]}`) };

      // Calcular el número de días en el mes
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      // Calcular el valor de cada día para que el total sea 100
      const pointsPerDay = 100 / daysInMonth;

      habits.forEach(habit => {
        let completedDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          // Verificar si el hábito se completó este día
          const habitKeys = [
            `${habit.index}-${date}`,
            `${habit.id}-${date}`,
            `${habit.supabase_id}-${date}`
          ];
          
          let isCompleted = false;
          for (const key of habitKeys) {
            if (habitStatus[key]?.status === 'completed') {
              isCompleted = true;
              break;
            }
          }
          
          if (isCompleted) {
            completedDays++;
          }
        }

        // Calcular puntos usando el valor dinámico por día
        const totalPoints = completedDays * pointsPerDay;
        // Redondear a 1 decimal para mejor visualización
        monthData[habit.name] = Math.round(totalPoints * 10) / 10;
      });

      data.push(monthData);
    } else if (balancePeriod === 'week') {
      return groupDataByWeek(data, habits);
    } else if (balancePeriod === 'year') {
      // Para la vista anual, usamos generateAnnualData
      return generateAnnualData();
    }
    
    return data;
  };

  // Modificar la función groupDataByWeek para usar datos de completaciones
  const groupDataByWeek = async (data: BalanceData[], habits: Habit[]): Promise<BalanceData[]> => {
    const weeklyData: BalanceData[] = [];
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Calcular el número de días en el mes
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Determinar en qué día de la semana comienza el mes (0 = domingo, 1 = lunes, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Calcular el número de semanas en el mes
    const totalWeeks = Math.ceil((daysInMonth + firstDayOfWeek) / 7);
    
    // Inicializar estructura para almacenar puntos por semana y hábito
    const weeklyPoints: Record<number, Record<string, number>> = {};
    
    // Inicializar cada semana con 0 puntos para cada hábito
    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      weeklyPoints[weekNumber] = {};
      habits.forEach(habit => {
        weeklyPoints[weekNumber][habit.name] = 0;
      });
    }
    
    // Obtener las completaciones directamente de la base de datos
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Formatear el primer y último día del mes para la consulta
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        // Consultar todas las completaciones del mes actual
        const { data: completions, error } = await supabase
          .from('habit_completions')
          .select('habit_id, completion_date')
          .eq('user_id', user.id)
          .gte('completion_date', startDate)
          .lte('completion_date', endDate);
          
        if (error) {
          // Error handling
        } else if (completions && completions.length > 0) {
          // Mapear IDs de hábitos a nombres
          const habitIdToName: Record<string, string> = {};
          habits.forEach(habit => {
            if (habit.supabase_id) habitIdToName[habit.supabase_id] = habit.name;
            if (habit.id) habitIdToName[String(habit.id)] = habit.name;
          });
          
          // Procesar cada completación
          completions.forEach(completion => {
            // Obtener el nombre del hábito
            const habitName = habitIdToName[completion.habit_id];
            
            if (habitName) {
              // Convertir la fecha de completación a objeto Date
              const completionDate = new Date(completion.completion_date);
              const day = completionDate.getDate();
              
              // Calcular a qué semana pertenece este día
              const weekNumber = Math.ceil((day + firstDayOfWeek) / 7);
              
              // Cada día completado vale 100/7 puntos (aproximadamente 14.29)
              const pointsPerDay = 100 / 7;
              
              // Sumar los puntos a la semana correspondiente
              if (weeklyPoints[weekNumber] && weeklyPoints[weekNumber][habitName] !== undefined) {
                weeklyPoints[weekNumber][habitName] += pointsPerDay;
              }
            }
          });
        } else {
          // No se encontraron completaciones para este mes
        }
      }
    } catch (error) {
      // Error handling
    }
    
    // Crear objetos de datos para cada semana
    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const weekData: BalanceData = {
        period: `S${weekNumber}`,
        fullPeriod: `Semana ${weekNumber}`,
      };
      
      // Asignar los puntos calculados para cada hábito en esta semana
      habits.forEach(habit => {
        // Redondear a 1 decimal para mejor visualización
        weekData[habit.name] = Math.round(weeklyPoints[weekNumber][habit.name] * 10) / 10;
      });
      
      weeklyData.push(weekData);
    }
    
    return weeklyData;
  };

  // Modificar la función generateAnnualData para manejar el año correctamente
  const generateAnnualData = (): BalanceData[] => {
    const currentYear = currentDate.getFullYear();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Crear un mapa para almacenar los datos existentes
    const existingDataMap = new Map();
    
    // Crear estructura base para datos vacíos
    const createEmptyData = (month: string) => ({
      period: month,
      ...Object.fromEntries(habits.map(habit => [habit.name, 0]))
    });
    
    // Procesar los datos existentes primero
    if (balanceData && balanceData.length > 0) {
      balanceData.forEach(monthItem => {
        // Extraer el mes y año
        const [monthPart] = monthItem.period.split('-');
        
        // Mapeo de nombres de meses en inglés y español
        const monthMapping: Record<string, string> = {
          'Jan': 'Ene', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Abr',
          'May': 'May', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago',
          'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dic',
          'Ene': 'Ene', 'Abr': 'Abr', 'Ago': 'Ago', 'Dic': 'Dic'
        };
        
        // Obtener los valores del hábito (solo los que no son undefined)
        const habitValues = Object.entries(monthItem)
          .filter(([key, value]) => key !== 'period' && value !== undefined);
        
        if (habitValues.length > 0) {
          // Normalizar el nombre del mes (primeros 3 caracteres)
          const normalizedMonth = monthPart.substring(0, 3);
          const spanishMonth = monthMapping[normalizedMonth] || normalizedMonth;
          
          if (monthNames.includes(spanishMonth)) {
            const dataForMonth = {
              period: spanishMonth,
              ...Object.fromEntries(habitValues)
            };
            existingDataMap.set(spanishMonth, dataForMonth);
          }
        }
      });
    }
    
    // Crear el array final
    const annualData = monthNames.map(month => {
      const existingData = existingDataMap.get(month);
      if (existingData) {
        return existingData;
      }
      return createEmptyData(month);
    });
    
    return annualData;
  };

  // Actualizar aquí el método getChartDataForPeriod para usar weeklyBalanceData
  const getChartDataForPeriod = async () => {
    if (balancePeriod === 'week') {
      // Si tenemos datos semanales en el store, usarlos
      if (weeklyBalanceData && weeklyBalanceData.length > 0) {
        // Verificar si hay valores mayores que cero
        const hasNonZeroValues = weeklyBalanceData.some((item: BalanceData) => 
          Object.entries(item)
            .filter(([key]) => key !== 'period' && key !== 'displayPeriod')
            .some(([_, value]) => Number(value) > 0)
        );
        
        // Si ya tenemos valores no cero, usarlos directamente
        if (hasNonZeroValues) {
          return weeklyBalanceData;
        }
      }
      
      // Buscar completaciones en la base de datos
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
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
            // Error handling
          } else if (completions && completions.length > 0) {
            // Convertir las completaciones a formato habitStatus
            const habitStatusFromCompletions: Record<string, HabitStatus> = {};
            
            completions.forEach(completion => {
              const key = `${completion.habit_id}-${completion.completion_date}`;
              habitStatusFromCompletions[key] = { status: 'completed' as '' | 'completed' | 'pending' };
            });
            
            // Calcular datos semanales usando estas completaciones
            const generatedWeeklyData = chartCalculations.generateBalanceData(
              habits,
              habitStatusFromCompletions,
              currentDate,
              'week',
              { existingData: weeklyBalanceData || [] }
            );
            
            // Verificar si los datos generados tienen valores no cero
            const hasGeneratedNonZeroValues = generatedWeeklyData.some((item: BalanceData) => 
              Object.entries(item)
                .filter(([key]) => key !== 'period' && key !== 'displayPeriod')
                .some(([_, value]) => Number(value) > 0)
            );
            
            if (hasGeneratedNonZeroValues) {
              // Actualizar el store con los nuevos datos
              if (useChartStore) {
                useChartStore.getState().setWeeklyBalanceData(generatedWeeklyData);
              }
              
              return generatedWeeklyData;
            }
          }
        }
      } catch (error) {
        // Error handling
      }
      
      // Si llegamos aquí, generar datos desde cero
      return generateWeeklyBalanceData(habits, habitStatus, currentDate);
    } else if (balancePeriod === 'year') {
      return generateAnnualData();
    } else {
      return balanceData;
    }
  };

  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true);
      try {
        const data = await getChartDataForPeriod();
        
        // Verificar si hay valores mayores que cero
        const hasNonZeroValues = data.some((item: BalanceData) => 
          Object.entries(item)
            .filter(([key]) => key !== 'period' && key !== 'displayPeriod')
            .some(([_, value]) => Number(value) > 0)
        );
        
        setChartData(data);
      } catch (error) {
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadChartData();
  }, [balancePeriod, balanceData, habits]);

  // Función para verificar si un hábito está activo en un año específico
  const isHabitActiveInYear = (habit: Habit, year: number) => {
    const startDate = new Date(habit.startDate);
    const startYear = startDate.getFullYear();
    
    // Si el hábito empieza después del año que estamos viendo, no está activo
    if (startYear > year) return false;
    
    // Si el hábito es indefinido o no tiene fecha de fin, está activo
    if (habit.isIndefinite || !habit.endDate) return true;
    
    // Si tiene fecha de fin, verificar si termina después del año que estamos viendo
    const endDate = new Date(habit.endDate);
    const endYear = endDate.getFullYear();
    return endYear >= year;
  };

  // Filtrar hábitos activos para el año actual
  const activeHabits = habits.filter(habit => 
    isHabitActiveInYear(habit, currentDate.getFullYear())
  );

  const renderChart = () => {
    // Si no hay hábitos, mostrar mensaje amigable en lugar de gráfica vacía
    if (habits.length === 0) {
      return <NoHabitsMessage />;
    }
    
    // Si es gráfico de tipo pie
    if (chartType === 'pie') {
      // ... código existente para gráfico pie ...
    }
    
    // Para gráfico de barras
    const processedData = chartData.map(item => {
      // Verificar que item sea válido
      if (!item || typeof item !== 'object') {
        return { period: '' };
      }
      
      const newItem = { ...item };
      
      // Conservar displayPeriod y fullPeriod si existen
      if (item.displayPeriod !== undefined) {
        newItem.displayPeriod = item.displayPeriod;
      }
      
      if (item.fullPeriod !== undefined) {
        newItem.fullPeriod = item.fullPeriod;
      }
      
      // Extraer año y mes del período si está en el nuevo formato
      let monthPart = '';
      let yearPart = '';
      
      if (typeof item.period === 'string' && item.period.includes('-')) {
        [monthPart, yearPart] = item.period.split('-');
      } else if (typeof item.period === 'string') {
        // Si no hay guión, usar todo el period como monthPart
        monthPart = item.period;
      }
      
      // Asegurarse de que todos los valores numéricos sean visibles en la gráfica
      Object.keys(newItem).forEach(key => {
        if (key !== 'period' && key !== 'displayPeriod' && key !== 'fullPeriod') {
          const value = typeof newItem[key] === 'string' 
            ? parseFloat(newItem[key]) 
            : newItem[key];
          
          if (value !== undefined) {
            // Limitar el valor a 100 como máximo
            if (typeof value === 'number' && value > 0) {
              newItem[key] = value >= 100 ? 100 : Math.round(value * 10) / 10;
            } else {
              newItem[key] = 0;
            }
          }
        }
      });
      
      // Si estamos en vista anual, usar solo el mes
      if (balancePeriod === 'year') {
        // Si el mes está en inglés, convertirlo a español
        const englishToSpanish: { [key: string]: string } = {
          'Jan': 'Ene', 'Feb': 'Feb', 'Mar': 'Mar', 'Apr': 'Abr',
          'May': 'May', 'Jun': 'Jun', 'Jul': 'Jul', 'Aug': 'Ago',
          'Sep': 'Sep', 'Oct': 'Oct', 'Nov': 'Nov', 'Dec': 'Dic'
        };
        
        newItem.period = englishToSpanish[monthPart] || monthPart;
      }
      // Para vista semanal, usar displayPeriod si está disponible
      else if ((balancePeriod as string) === 'week' && item.displayPeriod) {
        // En vez de reemplazar period con displayPeriod, usar displayLabel para mostrar
        newItem.displayLabel = String(item.displayPeriod);
        // Mantener el period original para no perder la referencia
      }
      
      return newItem;
    });

    if (balancePeriod === 'year') {
      // Asegurarse de que tenemos datos para todos los meses usando nombres en español
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const lowerMonthNames = monthNames.map(m => m.toLowerCase());
      
      // Crear un mapa para cada mes con sus valores originales
      const originalData: Record<string, any> = {};
      
      // Primero, extraer los datos originales sin procesar de balanceData
      balanceData.forEach(item => {
        // Ignorar items inválidos
        if (!item || !item.period) return;
        
        const period = item.period.toLowerCase();
        
        // Determinar a qué mes corresponde este item
        const monthIndex = lowerMonthNames.findIndex(month => 
          period === month || 
          period.startsWith(month) ||
          (item.fullPeriod && item.fullPeriod.toLowerCase().includes(month))
        );
        
        if (monthIndex >= 0) {
          // Guardar los datos originales de este mes
          originalData[monthNames[monthIndex]] = { 
            ...item,
            // Asegurar que period use el formato estandarizado
            period: monthNames[monthIndex]
          };
        }
      });
      
      // Procesar los datos que vienen de chartData (pueden ser diferentes)
      processedData.forEach(item => {
        if (!item || !item.period) return;
        
        const period = item.period;
        
        // Conservar displayPeriod y fullPeriod si existen
        const displayPeriod = item.displayPeriod;
        const fullPeriod = item.fullPeriod;
        
        // Normalizar nombre del mes
        const normalizedPeriod = period.charAt(0).toUpperCase() + period.slice(1).toLowerCase();
        
        // Si este mes existe en los datos originales, asegurarse de conservar sus valores
        if (monthNames.includes(normalizedPeriod) && originalData[normalizedPeriod]) {
          // Copiar los valores originales, pero mantener el format period estandarizado
          Object.keys(originalData[normalizedPeriod]).forEach(key => {
            if (key !== 'period' && key !== 'fullPeriod' && key !== 'displayPeriod') {
              item[key] = originalData[normalizedPeriod][key];
            }
          });
          
          // Preservar displayPeriod y fullPeriod originales si existían
          if (displayPeriod !== undefined) {
            item.displayPeriod = displayPeriod;
          }
          
          if (fullPeriod !== undefined) {
            item.fullPeriod = fullPeriod;
          }
        }
      });
      
      // Array final que contendrá todos los meses en orden
      const finalData = monthNames.map(month => {
        // Buscar el mes en los datos procesados
        const matchingEntry = processedData.find(item => 
          item.period === month || 
          item.period.toLowerCase() === month.toLowerCase()
        );
        
        if (matchingEntry) {
          return matchingEntry;
        }
        
        // Si no está en los datos procesados pero sí en los originales
        if (originalData[month]) {
          // Preservar displayPeriod y fullPeriod si existen
          const result = { ...originalData[month] };
          return result;
        }
        
        // Si no hay datos para este mes, crear un objeto vacío
        const emptyMonth: BalanceDataItem = { 
          period: month,
          displayPeriod: month, // Asegurar que displayPeriod esté presente
          fullPeriod: `${month}-${currentDate.getFullYear()}` // Asegurar que fullPeriod esté presente
        };
        activeHabits.forEach(habit => {
          emptyMonth[habit.name] = 0;
        });
        return emptyMonth;
      });

      return (
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <BarChart 
              data={finalData}
              margin={{ 
                top: 30,
                right: 10, 
                left: window?.innerWidth < 640 ? 10 : 20, 
                bottom: window?.innerWidth < 640 ? 20 : 5
              }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                horizontal={false}
                vertical={false}
                stroke="#ff0000"
                horizontalPoints={[]}
              />
              <XAxis 
                dataKey="period"
                tickFormatter={(value) => {
                  // Usar displayLabel si está disponible en los datos
                  const item = finalData.find(d => d.period === value);
                  if (item && item.displayLabel) {
                    return String(item.displayLabel);
                  }
                  
                  // Usar displayPeriod si está disponible
                  if (item && item.displayPeriod) {
                    return String(item.displayPeriod);
                  }
                  
                  // Si no, extraer solo la parte "S1", "S2", etc. del valor
                  if (value && typeof value === 'string') {
                    // Para semanas, mostrar "Sem. 1", "Sem. 2", etc.
                    if ((balancePeriod as string) === 'week' && value.startsWith('S')) {
                      const match = value.match(/S(\d+)/);
                      if (match) {
                        return `Sem. ${match[1]}`;
                      }
                      return value.split(' ')[0];
                    }
                    // Para otros períodos, mostrar el valor como está
                    return value;
                  }
                  return '';
                }}
                tick={{ 
                  fontSize: window?.innerWidth < 640 ? 10 : 12,
                  width: window?.innerWidth < 640 ? 30 : 'auto'
                }}
                interval={0}
                height={window?.innerWidth < 640 ? 10 : 15}
                angle={0}
                textAnchor="middle"
              />
              <YAxis
                tick={{ 
                  fontSize: window?.innerWidth < 640 ? 9 : 12 
                }}
                width={window?.innerWidth < 640 ? 32 : 40}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tickCount={6}
                allowDataOverflow={true}
                padding={{ top: 15 }}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value: any, name: string) => {
                  // Si el valor es 100 o mayor, mostrar exactamente 100
                  if (value >= 100) return ['100', name];
                  // Para otros valores, mantener un decimal
                  return [`${parseFloat(value.toString()).toFixed(1)}`, name];
                }}
                wrapperStyle={{
                  zIndex: 1000,
                  width: window?.innerWidth < 640 ? '200px' : '250px'
                }}
              />
              {activeHabits.map((habit) => (
                <Bar 
                  key={habit.name}
                  dataKey={habit.name}
                  fill={habit.color}
                  maxBarSize={window?.innerWidth < 640 ? 40 : 60}
                  shape={<RoundedBar />}
                  label={{
                    position: 'top',
                    formatter: (value: any) => {
                      if (!value || value <= 0) return '';
                      
                      // Si el valor es 100 o mayor, mostrar exactamente 100 sin decimales
                      if (value >= 100) return '100';
                      
                      // Para otros valores, mantener un decimal
                      const formattedValue = parseFloat(value.toString()).toFixed(1);
                      return formattedValue;
                    },
                    fontSize: window?.innerWidth < 640 ? 9 : 12,
                    offset: 15
                  }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // Si no es vista anual, retornar con los datos procesados normalmente
    return (
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart 
            data={processedData}
            margin={{ 
              top: 30,
              right: 10, 
              left: window?.innerWidth < 640 ? 2 : 20, 
              bottom: window?.innerWidth < 640 ? 20 : 5
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              horizontal={false}
              vertical={false}
              stroke="#ff0000"
              horizontalPoints={[]}
            />
            <XAxis 
              dataKey="period"
              tickFormatter={(value) => {
                // Usar displayLabel si está disponible en los datos
                const item = processedData.find(d => d.period === value);
                if (item && item.displayLabel) {
                  return String(item.displayLabel);
                }
                
                // Usar displayPeriod si está disponible
                if (item && item.displayPeriod) {
                  return String(item.displayPeriod);
                }
                
                // Si no, extraer solo la parte "S1", "S2", etc. del valor
                if (value && typeof value === 'string') {
                  // Para semanas, mostrar "Sem. 1", "Sem. 2", etc.
                  if ((balancePeriod as string) === 'week' && value.startsWith('S')) {
                    const match = value.match(/S(\d+)/);
                    if (match) {
                      return `Sem. ${match[1]}`;
                    }
                    return value.split(' ')[0];
                  }
                  // Para otros períodos, mostrar el valor como está
                  return value;
                }
                return '';
              }}
              tick={{ 
                fontSize: window?.innerWidth < 640 ? 10 : 12,
                width: window?.innerWidth < 640 ? 30 : 'auto'
              }}
              interval={0}
              height={window?.innerWidth < 640 ? 10 : 15}
              angle={0}
              textAnchor="middle"
            />
            <YAxis
              tick={{ 
                fontSize: window?.innerWidth < 640 ? 9 : 12 
              }}
              width={window?.innerWidth < 640 ? 32 : 40}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              ticks={[0, 20, 40, 60, 80, 100]}
              tickCount={6}
              allowDataOverflow={true}
              padding={{ top: 15 }}
            />
            <Tooltip
              content={<CustomTooltip />}
              formatter={(value: any, name: string) => {
                // Si el valor es 100 o mayor, mostrar exactamente 100
                if (value >= 100) return ['100', name];
                // Para otros valores, mantener un decimal
                return [`${parseFloat(value.toString()).toFixed(1)}`, name];
              }}
              wrapperStyle={{
                zIndex: 1000,
                width: window?.innerWidth < 640 ? '200px' : '250px'
              }}
            />
            {activeHabits.map((habit) => (
              <Bar 
                key={habit.name}
                dataKey={habit.name}
                fill={habit.color}
                maxBarSize={window?.innerWidth < 640 ? 40 : 60}
                shape={<RoundedBar />}
                label={{
                  position: 'top',
                  formatter: (value: any) => {
                    if (!value || value <= 0) return '';
                    
                    // Si el valor es 100 o mayor, mostrar exactamente 100 sin decimales
                    if (value >= 100) return '100';
                    
                    // Para otros valores, mantener un decimal
                    const formattedValue = parseFloat(value.toString()).toFixed(1);
                    return formattedValue;
                  },
                  fontSize: window?.innerWidth < 640 ? 9 : 12,
                  offset: 15
                }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full min-h-[20rem] flex flex-col">
      <div className="w-full h-full rounded-lg border border-gray-100 shadow-sm bg-white p-3">
        {renderChart()}
      </div>
    </div>
  );
};
