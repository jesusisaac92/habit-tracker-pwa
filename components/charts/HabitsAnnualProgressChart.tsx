import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart } from 'recharts';
import { HabitProgressData, ProgressDataPoint, HabitsAnnualProgressChartProps } from '@/components/types/types';
import { InfoIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';

// Añadir la interfaz para el CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  year: number;
}

// Añadir el componente CustomTooltip
const CustomTooltip = ({ active, payload, label, year }: CustomTooltipProps) => {
  const { t } = useTranslation();
  
  if (!active || !payload || !payload.length || label === undefined || label === null) return null;

  const monthIndex = Number(label);
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;

  const displayDate = `${t(`calendar.months.${format(new Date(year, monthIndex, 1), 'MMMM', { locale: es }).toLowerCase()}`)} ${year}`;
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 sm:p-4 border border-gray-100 dark:border-gray-700">
      <span className="text-xs sm:text-sm font-semibold block mb-1 dark:text-gray-100">
        {displayDate}
      </span>
      <div className="space-y-0.5 sm:space-y-1">
        {sortedPayload.map((entry: any, index: number) => (
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
};

export const HabitsAnnualProgressChart: React.FC<HabitsAnnualProgressChartProps> = ({
  data = [],
  habits,
  year
}) => {
  // Validar que los datos no sean nulos o vacíos
  if (!data || !Array.isArray(data) || data.length === 0) {
    // Si no hay datos, generar datos vacíos para todos los meses
    const emptyData = [];
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthData: any = {
        monthIndex,
        month: months[monthIndex],
        period: months[monthIndex],
      };
      
      // Añadir todos los hábitos con valor 0
      habits.forEach(habit => {
        monthData[habit.name] = 0;
      });
      
      emptyData.push(monthData);
    }
    
    data = emptyData;
  }

  const { t } = useTranslation();
  
  // Si no hay hábitos, mostrar mensaje amigable
  if (!habits || habits.length === 0) {
    return (
      <NoHabitsMessage 
        title={t('annual.noHabitsTitle') || 'No hay datos anuales para mostrar'}
        description={t('annual.noHabitsDescription') || 'Crea tu primer hábito para comenzar a ver tu progreso anual en esta gráfica.'}
      />
    );
  }
  
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ].map(month => t(`calendar.monthsShort.${month}`));
  
  const safeData = Array.isArray(data) ? data : [];
  
  const formatMonthData = (monthData: any, index: number) => {
    // Si no hay datos para este mes, crear un objeto con ceros
    if (!monthData) {
      const emptyData: any = {
        monthIndex: index,
        month: months[index]
      };
      
      // Añadir todos los hábitos con valor 0
      habits.forEach(habit => {
        emptyData[habit.name] = 0;
      });
      
      return emptyData;
    }
    
    const result = {
      monthIndex: index,
      month: months[index],
      ...(monthData || {})
    };
    
    // Asegurarse de que todos los hábitos tienen un valor
    habits.forEach(habit => {
      if (result[habit.name] === undefined) {
        result[habit.name] = 0;
      }
    });
    
    return result;
  };

  const monthlyDataPoints = months.map((_, index) => {
    // Buscar por mes o por monthIndex
    const monthData = safeData.find(d => 
      d.period === months[index] || 
      d.month === months[index] || 
      d.monthIndex === index
    ) || null;
    
    return formatMonthData(monthData, index);
  });

  return (
    <div className="relative">
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
            data={monthlyDataPoints}
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
              <linearGradient id="chartBackground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="transparent" stopOpacity={1} />
                <stop offset="100%" stopColor="transparent" stopOpacity={1} />
              </linearGradient>
              {habits.map((habit, index) => (
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
            <rect x="0" y="0" width="100%" height="100%" fill="transparent" />
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#e5e7eb" 
              className="dark:stroke-gray-700"
            />
            <XAxis 
              dataKey="monthIndex"
              height={40}
              tick={{
                fontSize: 10,
                fill: '#4b5563',
                textAnchor: 'middle',
                dy: 5
              }}
              className="dark:text-gray-300"
              axisLine={{ stroke: '#e0e0e0', strokeWidth: 1.5 }}
              tickLine={false}
              padding={{ left: 5, right: 5 }}
              tickFormatter={(index) => months[index]}
            />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              width={35}
              ticks={[0, 25, 50, 75, 100]}
              interval={0}
              tick={{
                fontSize: 10,
                fill: '#4b5563'
              }}
              className="dark:text-gray-300"
              axisLine={{ stroke: '#e0e0e0', strokeWidth: 1.5 }}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip 
              content={<CustomTooltip year={year} />}
              wrapperStyle={{
                zIndex: 1000,
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              isAnimationActive={false}
              cursor={{ stroke: "#6b7280", strokeWidth: 1 }}
            />
            <ReferenceLine 
              y={50} 
              stroke="#9ca3af" 
              strokeDasharray="3 3" 
              label={{ 
                value: "50%", 
                position: "insideTopLeft",
                fill: "#4b5563",
                className: "dark:fill-gray-300",
                fontSize: 10,
                offset: 8
              }}
              className="dark:stroke-gray-500"
            />
            {habits.map((habit) => (
              <Area
                key={habit.name}
                type="monotone"
                dataKey={habit.name}
                name={habit.name}
                stroke={habit.color}
                fill={`url(#color-${habit.name})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1.5 }}
                strokeWidth={1.5}
                strokeOpacity={1}
              />
            ))}
            {/* Línea de referencia en 0 que cubre las líneas de los hábitos cuando están en 0 */}
            <ReferenceLine 
              y={0.001} 
              stroke="#ffffff"
              strokeWidth={2}
              ifOverflow="extendDomain"
              className="dark:stroke-gray-800"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};