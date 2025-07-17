import React, { useMemo, useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTranslation } from 'next-i18next';
import { MonthlyTrendData } from '@/components/types/types';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';
import { supabase } from '@/src/supabase/config/client';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface YearlyTrendChartProps {
  yearlyData: MonthlyTrendData[];
  year?: number;
}

// Extender la interfaz para incluir propiedades adicionales que pueden estar presentes
interface ExtendedTrendData extends Partial<MonthlyTrendData> {
  monthName?: string;
  monthIndex?: number;
  historicalAverage?: number;
  [key: string]: any; // Permitir propiedades dinámicas
}

const YearlyTrendChart: React.FC<YearlyTrendChartProps> = ({ yearlyData = [], year }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [directDbData, setDirectDbData] = useState<any[]>([]);
  const [chartYear, setChartYear] = useState<number | null>(null);

  // Cargar datos directamente desde la base de datos
  useEffect(() => {
    const loadYearlyData = async () => {
      if (!user?.id) return;

      try {
        // Obtener los datos de yearly_trend_data directamente de la tabla habit_charts
        const { data, error } = await supabase
          .from('habit_charts')
          .select('data')
          .eq('user_id', user.id)
          .eq('chart_type', 'yearly_trend_data')
          .single();

        if (error) {
          return;
        }

        if (data && data.data) {
          let parsedData;
          try {
            parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;

            // Si se proporciona un año específico, filtrar los datos para ese año
            if (year) {
              parsedData = parsedData.filter((item: any) => item.year === year);
              
              // Si no hay datos para el año específico, no usar datos de la BD
              if (parsedData.length === 0) {
                setDirectDbData([]);
                return;
              }
            }

            // Extraer el año de los datos si está disponible
            if (parsedData && parsedData.length > 0 && parsedData[0].year) {
              setChartYear(parsedData[0].year);
            }

            // Procesar los datos para el formato correcto
            const processedData = parsedData.map((item: any) => {
              // Calcular la suma de todos los valores de hábitos
              let points = 0;
              const habitNames: string[] = [];

              Object.entries(item).forEach(([key, value]) => {
                if (key !== 'period' && key !== 'monthIndex' && key !== 'month' && 
                    key !== 'monthName' && key !== 'points' && key !== 'lastYearPoints' &&
                    key !== 'completedDays' && key !== 'totalDays' && key !== 'year') {
                  const numValue = typeof value === 'string' ? parseFloat(value as string) : Number(value);
                  if (!isNaN(numValue)) {
                    points += numValue;
                    habitNames.push(key);
                  }
                }
              });

              // Mapear meses en español a inglés
              let month = item.month || '';
              if (month === 'ene') month = 'january';
              if (month === 'feb') month = 'february';
              if (month === 'mar') month = 'march';
              if (month === 'abr') month = 'april';
              if (month === 'may') month = 'may';
              if (month === 'jun') month = 'june';
              if (month === 'jul') month = 'july';
              if (month === 'ago') month = 'august';
              if (month === 'sep') month = 'september';
              if (month === 'oct') month = 'october';
              if (month === 'nov') month = 'november';
              if (month === 'dic') month = 'december';

              return {
                ...item,
                month,
                points: points > 0 ? points : (item.points || 0),
                lastYearPoints: item.lastYearPoints || 0,
                habitNames
              };
            });

            setDirectDbData(processedData);
          } catch (e) {
            // Error silencioso
          }
        }
      } catch (error) {
        // Error silencioso
      }
    };

    loadYearlyData();
  }, [user?.id, year]);

  // Añadir useEffect para verificar los datos cuando cambian
  useEffect(() => {
    // Encontrar nombres de hábitos en los datos (cualquier propiedad que no sea estándar)
    const habitNames = new Set<string>();
    yearlyData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'month' && key !== 'points' && key !== 'lastYearPoints' && 
            key !== 'period' && key !== 'monthIndex' && key !== 'historicalAverage' &&
            key !== 'year') {
          habitNames.add(key);
        }
      });
    });

    // Extraer el año de los datos si está disponible, o usar el año proporcionado como prop
    if (year) {
      setChartYear(year);
    } else if (yearlyData && yearlyData.length > 0 && yearlyData[0].year) {
      setChartYear(yearlyData[0].year);
    }
  }, [yearlyData, year]);

  // Usar los datos directos de la BD si están disponibles, de lo contrario usar los props
  const dataToUse = useMemo(() => {
    // Si hay un año específico proporcionado, priorizar los datos de props
    if (year) {
      return yearlyData;
    }
    
    // Si no hay año específico pero hay datos de BD, usar esos
    if (directDbData && directDbData.length > 0) {
      return directDbData;
    }
    
    return yearlyData;
  }, [directDbData, yearlyData, year]);

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const diff = data.points - data.lastYearPoints;
      const diffFormatted = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
      
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow">
          <p className="text-xs font-medium mb-1">Mes: {label}</p>
          <div className="space-y-0.5">
            <p className="text-xs">
              <span className="text-purple-500">Actual: </span>
              <span className="font-medium">{data.points.toFixed(1)}%</span>
            </p>
            <p className="text-xs">
              <span className="text-gray-400">Año anterior: </span>
              <span>{data.lastYearPoints?.toFixed(1) || '0'}%</span>
            </p>
            {diff !== 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Dif: </span>
                <span className={diff >= 0 ? "text-green-500" : "text-red-500"}>
                  {diff >= 0 ? '↑' : '↓'}{Math.abs(diff).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartData = useMemo(() => {
    if (!dataToUse || dataToUse.length === 0) {
      return [];
    }

    return dataToUse.map((item) => {
      // Usar nombres de meses abreviados para el eje X
      const getShortMonthName = (month: string) => {
        const monthMap: Record<string, string> = {
          'january': t('calendar.monthsShort.january', { defaultValue: 'Ene' }),
          'february': t('calendar.monthsShort.february', { defaultValue: 'Feb' }),
          'march': t('calendar.monthsShort.march', { defaultValue: 'Mar' }),
          'april': t('calendar.monthsShort.april', { defaultValue: 'Abr' }),
          'may': t('calendar.monthsShort.may', { defaultValue: 'May' }),
          'june': t('calendar.monthsShort.june', { defaultValue: 'Jun' }),
          'july': t('calendar.monthsShort.july', { defaultValue: 'Jul' }),
          'august': t('calendar.monthsShort.august', { defaultValue: 'Ago' }),
          'september': t('calendar.monthsShort.september', { defaultValue: 'Sep' }),
          'october': t('calendar.monthsShort.october', { defaultValue: 'Oct' }),
          'november': t('calendar.monthsShort.november', { defaultValue: 'Nov' }),
          'december': t('calendar.monthsShort.december', { defaultValue: 'Dic' })
        };
        return monthMap[month.toLowerCase()] || month.substring(0, 3);
      };

      const monthName = getShortMonthName(item.month);
      const fullMonthName = t(`months.${item.month}`, { defaultValue: item.month });
      const lastYearPoints = item.lastYearPoints || 0;
      
      // Encontrar todos los nombres de hábitos en este mes
      const habitValues = Object.entries(item)
        .filter(([key]) => 
          key !== 'month' && key !== 'points' && key !== 'lastYearPoints' && 
          key !== 'period' && key !== 'monthIndex' && key !== 'historicalAverage' &&
          key !== 'completedDays' && key !== 'totalDays' && key !== 'habitNames'
        )
        .reduce((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? parseFloat(value) : Number(value);
          return acc;
        }, {} as Record<string, number>);
      
      return {
        ...item,
        monthName,
        fullMonthName,
        historicalAverage: (item.points + lastYearPoints) / 2,
        ...habitValues
      };
    });
  }, [dataToUse, t]);

  if (!dataToUse || dataToUse.length === 0) {
    return <NoHabitsMessage />;
  }

  return (
    <div className="w-full h-[400px] xs:h-[450px] sm:h-[500px]">
      <ResponsiveContainer>
        <ComposedChart
          data={chartData} 
          margin={{
            top: 20,
            right: 30,
            left: -10,
            bottom: 30 // Aumentar el margen inferior para los nombres de meses
          }}
        >
          <Bar
            dataKey="points"
            fill="#8884d8"
            opacity={0.6}
            name={t('charts.monthlyAverage')}
            radius={[4, 4, 0, 0]}
            maxBarSize={50}
          />
          
          <XAxis 
            dataKey="monthName" 
            tick={{ 
              fontSize: 10,
              dy: 10 // Mover las etiquetas hacia abajo
            }}
            height={50} // Aumentar la altura del eje X
            tickMargin={10} // Aumentar el margen entre las etiquetas y el eje
            interval={0} // Mostrar todas las etiquetas
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            width={45}
            tickMargin={8}
          />
          <Tooltip 
            content={CustomTooltip} 
            formatter={(value: any, name: any, props: any) => {
              // Usar el nombre completo del mes en el tooltip
              if (name === 'monthName') {
                return props.payload.fullMonthName;
              }
              return value;
            }}
          />
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
  );
};

export default YearlyTrendChart;