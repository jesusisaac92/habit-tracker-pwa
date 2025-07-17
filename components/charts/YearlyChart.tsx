import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, Legend, Area, Tooltip, ReferenceDot, Scatter } from 'recharts';
import { BarChart as BarChartIcon, Info as InfoIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/src/supabase/config/client';
import { useAuth } from '@/src/supabase/hooks/useAuth';

interface YearlyChartProps {
  yearlyData: Array<{
    monthIndex: number;
    month: string;
    period: string;
    year: number;
    [key: string]: any;
  }>;
  currentDate: Date;
  showHeader?: boolean;
  selectedHabit?: any;
  onYearChange?: (year: number) => void;
}

const YearlyChart: React.FC<YearlyChartProps> = ({ 
  yearlyData = [],
  currentDate,
  showHeader = true,
  selectedHabit,
  onYearChange
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [chartData, setChartData] = useState<any[]>([]);
  const [lastYearData, setLastYearData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // Título con el año para cuando no se muestra el encabezado completo
  const yearlyTitle = `${t('charts.yearlyPerformance', 'Rendimiento Anual')} ${selectedYear}`;

  // Función para cambiar el año seleccionado
  const changeYear = (direction: 'prev' | 'next') => {
    const newYear = direction === 'prev' ? selectedYear - 1 : selectedYear + 1;
    setSelectedYear(newYear);
    // Notificar al componente padre sobre el cambio de año
    if (onYearChange) {
      onYearChange(newYear);
    }
  };

  // Cargar datos directamente desde habit_completions
  useEffect(() => {
    const loadCompletionData = async () => {
      if (!user?.id || !selectedHabit) {
        return;
      }
      
      setLoading(true);
      try {
        // Determinar el ID correcto del hábito para la consulta
        const habitId = selectedHabit.supabase_id || selectedHabit.id;
        
        // Obtener completaciones para el hábito seleccionado en el año seleccionado
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        
        // Intentar primero con el ID de Supabase
        const { data: completionsData, error: completionsError } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('habit_id', habitId)
          .gte('completion_date', startDate)
          .lte('completion_date', endDate);
          
        if (completionsError) {
          setLoading(false);
          return;
        }
        
        // Procesar los datos para la gráfica
        const monthlyData = processCompletionsData(completionsData, selectedHabit, selectedYear);
        
        setChartData(monthlyData);
        
        // Cargar datos del año anterior para comparación
        const lastYear = selectedYear - 1;
        const lastYearStartDate = `${lastYear}-01-01`;
        const lastYearEndDate = `${lastYear}-12-31`;
        
        const { data: lastYearCompletions, error: lastYearError } = await supabase
          .from('habit_completions')
          .select('*')
          .eq('user_id', user.id)
          .eq('habit_id', habitId)
          .gte('completion_date', lastYearStartDate)
          .lte('completion_date', lastYearEndDate);
          
        if (lastYearError) {
          setLastYearData([]);
        } else {
          // Verificar si hay datos para el año anterior
          if (lastYearCompletions && lastYearCompletions.length > 0) {
            const lastYearProcessed = processCompletionsData(lastYearCompletions, selectedHabit, lastYear);
            
            // Verificar si hay valores mayores que cero en los datos procesados
            const hasData = lastYearProcessed.some(item => {
              const value = item[selectedHabit.name];
              return typeof value === 'number' && value > 0;
            });
            
            setLastYearData(lastYearProcessed);
          } else {
            setLastYearData([]);
          }
        }
      } catch (error) {
        setChartData([]);
        setLastYearData([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadCompletionData();
  }, [user?.id, selectedYear, selectedHabit]);
  
  // Procesar datos de completaciones para mostrar en la gráfica
  const processCompletionsData = (completions: any[], habit: any, year: number) => {
    // Crear un mapa para agrupar completaciones por mes
    const completionsByMonth: Record<number, number> = {};
    
    // Inicializar estructura de datos para todos los meses
    for (let month = 0; month < 12; month++) {
      completionsByMonth[month] = 0;
    }
    
    // Contar completaciones por mes
    completions.forEach(completion => {
      // Verificar que completion_date existe
      if (!completion.completion_date) {
        return;
      }
      
      // Parsear la fecha correctamente, asegurando que se use el formato YYYY-MM-DD
      const dateStr = completion.completion_date;
      
      // Extraer directamente el año, mes y día del formato YYYY-MM-DD
      const [yearStr, monthStr, dayStr] = dateStr.split('-');
      
      // Convertir a números (resta 1 al mes para obtener el índice 0-11)
      const completionYear = parseInt(yearStr, 10);
      const completionMonth = parseInt(monthStr, 10) - 1; // Restar 1 porque los meses en JS son 0-11
      
      // Verificar que la fecha pertenece al año que estamos procesando
      if (completionYear === year) {
        completionsByMonth[completionMonth] = (completionsByMonth[completionMonth] || 0) + 1;
      }
    });
    
    // Calcular porcentajes de completación por mes
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    return monthNames.map((monthName, index) => {
      // Calcular días en el mes para el año específico
      const daysInMonth = new Date(year, index + 1, 0).getDate();
      
      // Calcular porcentaje para el hábito
      const completions = completionsByMonth[index] || 0;
      const percentage = (completions / daysInMonth) * 100;
      
      // Calcular el objetivo mensual basado en días programados
      const monthlyTarget = calculateMonthlyTarget(habit, year, index);
      
      return {
        monthIndex: index,
        month: monthName,
        period: `${monthName}-${year}`,
        year: year,
        [habit.name]: parseFloat(percentage.toFixed(2)),
        monthlyTarget: monthlyTarget
      };
    });
  };
  
  // Función para calcular el objetivo mensual basado en días programados
  const calculateMonthlyTarget = (habit: any, year: number, monthIndex: number): number => {
    // Si el hábito no tiene días específicos seleccionados, retornar 0
    if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
      return 0; // No hay objetivo específico para días programados (es diario)
    }
    
    // Verificar que el índice del mes es correcto (0-11)
    
    // Calcular el primer día del mes
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    // Calcular el último día del mes
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    
    // Obtener el número total de días en el mes
    const totalDaysInMonth = lastDayOfMonth.getDate();
    
    // Verificar si el hábito tiene una fecha de inicio posterior al mes actual
    let adjustedFirstDay = new Date(firstDayOfMonth);
    let adjustedLastDay = new Date(lastDayOfMonth);
    
    if (habit.startDate) {
      const startDate = new Date(habit.startDate);
      
      if (startDate > lastDayOfMonth) {
        return 0; // El hábito comienza después de este mes
      }
      
      // Si el hábito comienza durante este mes, ajustar el primer día
      if (startDate > firstDayOfMonth && startDate <= lastDayOfMonth) {
        adjustedFirstDay = new Date(startDate);
      }
    }
    
    // Verificar si el hábito tiene una fecha de fin anterior al mes actual
    if (habit.endDate) {
      const endDate = new Date(habit.endDate);
      
      if (endDate < firstDayOfMonth) {
        return 0; // El hábito termina antes de este mes
      }
      
      // Si el hábito termina durante este mes, ajustar el último día
      if (endDate >= firstDayOfMonth && endDate < lastDayOfMonth) {
        adjustedLastDay = new Date(endDate);
      }
    }
    
    // Contar cuántos días programados hay en este mes
    let programmedDaysCount = 0;
    const currentDate = new Date(adjustedFirstDay);
    const specificDates: string[] = [];
    
    // Crear un mapa para contar días por día de la semana
    const dayCountMap: Record<number, number> = {};
    habit.selectedDays.forEach((day: number) => {
      dayCountMap[day] = 0;
    });
    
    // Verificar cada día del mes
    while (currentDate <= adjustedLastDay) {
      const dayOfWeek = currentDate.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
      
      // Verificar si este día de la semana está programado
      const isProgrammed = habit.selectedDays.includes(dayOfWeek);
      
      if (isProgrammed) {
        programmedDaysCount++;
        dayCountMap[dayOfWeek] = (dayCountMap[dayOfWeek] || 0) + 1;
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // CORRECCIÓN: Calculamos el objetivo mensual como una proporción directa
    // (días programados / días totales del mes) * 100
    const monthlyTarget = (programmedDaysCount / totalDaysInMonth) * 100;
    
    return parseFloat(monthlyTarget.toFixed(1));
  };

  // Combinar datos actuales y del año anterior
  const combinedChartData = React.useMemo(() => {
    if (chartData.length === 0) return [];
    
    return chartData.map((currentYearItem, index) => {
      const lastYearItem = lastYearData[index];
      const habitName = selectedHabit?.name || '';
      
      // Verificar si tenemos datos del año anterior
      const hasLastYearData = lastYearItem && typeof lastYearItem[habitName] === 'number' && lastYearItem[habitName] > 0;
      
      // Crear un nuevo objeto con los datos combinados
      const result = {
        ...currentYearItem,
        // Agregar datos del año anterior como lastYearPoints
        lastYearPoints: hasLastYearData ? lastYearItem[habitName] || 0 : 0
      };
      
      return result;
    });
  }, [chartData, lastYearData, selectedHabit]);

  // Usar datos cargados o datos proporcionados
  const validatedData = React.useMemo(() => {
    if (combinedChartData.length > 0) {
      return combinedChartData;
    }
    
    if (!Array.isArray(yearlyData)) {
      return [];
    }

    return yearlyData.map(item => {
      if (typeof item !== 'object' || item === null) {
        return {
          monthIndex: 0,
          month: '',
          period: '',
          year: currentDate.getFullYear(),
          value: 0
        };
      }
      return item;
    });
  }, [yearlyData, combinedChartData, currentDate]);

  // Preparar datos para los puntos de objetivo
  const targetPointsData = React.useMemo(() => {
    if (!selectedHabit || !validatedData.length) return [];
    
    return validatedData
      .map((item, index) => {
        if (item.monthlyTarget && item.monthlyTarget > 0) {
          // Devolver un objeto con la estructura correcta para ReferenceDot
          return {
            x: index,  // Usar el índice como coordenada X
            y: item.monthlyTarget,  // Usar el valor del objetivo como coordenada Y
            month: item.month,
            targetValue: item.monthlyTarget
          };
        }
        return null;
      })
      .filter((item): item is {x: number, y: number, month: string, targetValue: number} => item !== null); // Eliminar los valores null
  }, [validatedData, selectedHabit]);

  useEffect(() => {
    // Efecto para actualizar datos cuando cambian
  }, [validatedData]);

  // Efecto para manejar cambios de año
  useEffect(() => {
    if (isNaN(selectedYear)) return;
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-gray-500 dark:text-gray-400">
            {t('common.loading', 'Cargando...')}
          </p>
        </div>
      </div>
    );
  }

  if (!validatedData.length) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-gray-500 dark:text-gray-400">
            {t('charts.noData', 'No hay datos disponibles')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {showHeader && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
              <BarChartIcon className="h-4 w-4" />
              <span>{t('charts.yearView', 'Vista Anual')}</span>
            </div>
            <div className="relative group">
              <button className="text-gray-400 hover:text-blue-500 transition-colors">
                <InfoIcon className="h-4 w-4" />
              </button>
              <div className="absolute left-0 top-full mt-2 w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 z-50 hidden group-hover:block">
                <h4 className="font-semibold text-sm mb-1">{t('charts.guide', 'Guía de la Gráfica')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {t('charts.yearlyDescription', 'Esta gráfica muestra tu rendimiento anual:')}
                </p>
                <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc pl-5 space-y-1">
                  <li>{t('charts.yearlyGuide1', 'Cada barra representa un mes del año')}</li>
                  <li>{t('charts.yearlyGuide2', 'Compara tu consistencia a lo largo del año')}</li>
                  <li>{t('charts.yearlyGuide3', 'El área gris muestra la tendencia del año anterior')}</li>
                  {targetPointsData.length > 0 && (
                    <li>Los puntos azules muestran el objetivo mensual basado en días programados</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => changeYear('prev')} 
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-gray-700 dark:text-gray-300 font-medium">{selectedYear}</span>
              <button 
                onClick={() => changeYear('next')} 
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {/* Leyenda para puntos de objetivo */}
            {targetPointsData.length > 0 && (
              <div className="flex items-center text-xs text-gray-500">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                <span>Objetivo mensual</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full overflow-x-auto overflow-y-hidden">
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={validatedData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 11, fill: '#888888' }}
                xAxisId={0}
              />
              <YAxis 
                domain={[0, 100]} 
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fontSize: 11, fill: '#888888' }}
                width={30}
                yAxisId={0}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const habitName = Object.keys(data).find(keyName => 
                      !['monthIndex', 'month', 'period', 'year', 'lastYearPoints', 'monthlyTarget'].includes(keyName)
                    );
                    const value = habitName ? data[habitName] : 0;
                    const lastYearValue = data.lastYearPoints || 0;
                    const monthlyTarget = data.monthlyTarget || 0;
                    
                    // Calcular la diferencia entre el año actual y el anterior
                    const difference = value - lastYearValue;
                    const diffFormatted = difference.toFixed(1);
                    const diffSign = difference >= 0 ? '+' : '';
                    const diffArrow = difference >= 0 ? '↑' : '↓';
                    const diffColor = difference >= 0 ? 'text-green-500' : 'text-red-500';
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow">
                        <p className="text-xs font-medium">{(() => {
                          // Convertir la abreviatura del mes a nombre completo
                          const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                          const monthIndex = data.monthIndex;
                          return monthNames[monthIndex] || data.month;
                        })()}</p>
                        <p className="text-xs text-purple-500">
                          <span>{String(t('charts.current', 'Actual'))}: </span>
                          <span className="font-medium">{value.toFixed(1)}%</span>
                        </p>
                        {lastYearValue > 0 && (
                          <p className="text-xs text-gray-500">
                            <span>{String(t('charts.previous', 'Anterior'))} ({selectedYear - 1}): </span>
                            <span className="font-medium">{lastYearValue.toFixed(1)}%</span>
                          </p>
                        )}
                        {lastYearValue > 0 && (
                          <p className={`text-xs ${diffColor}`}>
                            <span>Dif: </span>
                            <span className="font-medium">{diffArrow} {diffSign}{diffFormatted}%</span>
                          </p>
                        )}
                        {monthlyTarget > 0 && (
                          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-blue-500 font-medium">
                              <span>Objetivo: </span>
                              <span className="font-medium">
                                {monthlyTarget.toFixed(1)}%
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Área para el año anterior */}
              <Area 
                type="monotone"
                dataKey="lastYearPoints"
                stroke="#9ca3af"
                strokeWidth={2}
                fillOpacity={0.2}
                fill="#9ca3af"
                name={`${t('charts.year', 'Año')} ${selectedYear - 1}`}
                connectNulls={true}
                xAxisId={0}
                yAxisId={0}
              />
              {/* Barras para el año actual */}
              {validatedData.length > 0 && Object.keys(validatedData[0]).some(key => 
                !['monthIndex', 'month', 'period', 'year', 'lastYearPoints'].includes(key)
              ) && (
                <Bar 
                  dataKey={Object.keys(validatedData[0]).find(key => 
                    !['monthIndex', 'month', 'period', 'year', 'lastYearPoints'].includes(key)
                  ) || ''} 
                  fill="#8884d8" 
                  radius={[4, 4, 0, 0]} 
                  name={`${t('charts.year', 'Año')} ${selectedYear}`}
                  barSize={20}
                  xAxisId={0}
                  yAxisId={0}
                  shape={(props: any) => {
                    // Obtener el mes actual
                    const currentMonth = new Date().getMonth();
                    const isCurrentMonth = props.payload.monthIndex === currentMonth;
                    
                    // Para todos los meses, usar una barra normal sin flecha
                    const { x, y, width, height, fill } = props;
                    return (
                      <rect 
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill={fill || "#8884d8"}
                        rx={4}
                        ry={4}
                      />
                    );
                  }}
                />
              )}
              {/* Puntos para el objetivo mensual - solo mostrar el del mes actual */}
              {validatedData.map((item, index) => {
                // Obtener el mes actual
                const currentMonth = new Date().getMonth();
                // Solo mostrar el punto si es el mes actual y tiene objetivo
                return (item.monthlyTarget && item.monthlyTarget > 0 && item.monthIndex === currentMonth) ? (
                  <ReferenceDot
                    key={`target-dot-${index}`}
                    x={item.month}
                    y={item.monthlyTarget}
                    r={4}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={1}
                    isFront={true}
                  />
                ) : null;
              })}
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

export default YearlyChart; 