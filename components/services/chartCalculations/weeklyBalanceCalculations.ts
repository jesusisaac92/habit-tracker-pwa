import { Habit, HabitStatus, BalanceData } from '@/components/types/types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { fixPrecision, isHabitActiveOnDate } from './common';
import { useChartStore } from '@/store/useChartStore';

/**
 * Genera datos para la vista semanal del gráfico de balance
 */
export const generateWeeklyBalanceData = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  options: {
    existingData?: BalanceData[];
    newCompletedDay?: boolean;
    completedDate?: Date;
    preserveValues?: boolean;
  } = {}
): BalanceData[] => {
  const { existingData = [], newCompletedDay = false, completedDate, preserveValues = false } = options;

  // Si es un nuevo día completado, solo actualizar la semana correspondiente
  if (newCompletedDay && completedDate) {
    return updateWeeklyDataForCompletedDay(habits, habitStatus, completedDate, existingData);
  }
  
  // Si hay datos existentes y se quiere preservar valores, asegurarse que son numéricos
  if (preserveValues && existingData && existingData.length > 0) {
    // Log de la fecha de completación si está disponible
    if (newCompletedDay && completedDate) {
      // Identificar a qué semana pertenece la fecha completada
      const targetWeek = getWeekOfMonth(completedDate);
    }
    
    // Procesar los datos
    const processedData = existingData.map(weekData => {
      const weekNum = extractWeekNumber(weekData.period);
      
      // Si tenemos un nuevo día completado, actualizamos los valores
      if (newCompletedDay && completedDate) {
        const completedWeek = getWeekOfMonth(completedDate);
        if (weekNum === completedWeek) {
          // Crear nuevo objeto con los valores existentes
          const updatedWeekData = { ...weekData };
          
          // Añadir puntos para el hábito completado (14.29 puntos por día - 100/7)
          habits.forEach(habit => {
            const habitKey = habit.name;
            const currentValue = typeof updatedWeekData[habitKey] === 'number' ? 
              updatedWeekData[habitKey] as number : 0;
            
            // Buscar si el hábito se completó en esta fecha
            const dateStr = completedDate?.toISOString().split('T')[0] || '';
            const habitStatusKeys = [
              `${habit.id}-${dateStr}`,
              `${habit.index}-${dateStr}`,
              `${habit.supabase_id}-${dateStr}`
            ];
            
            let isCompleted = false;
            habitStatusKeys.forEach(key => {
              if (habitStatus[key]?.status === 'completed') {
                isCompleted = true;
              }
            });
            
            if (isCompleted) {
              const pointsPerDay = 100 / 7; // Aproximadamente 14.29 puntos por día
              updatedWeekData[habitKey] = Math.round((currentValue + pointsPerDay) * 10) / 10;
            }
          });
          
          return updatedWeekData;
        }
      }
      
      return weekData;
    });
    
    return processedData;
  }
  
  const data: BalanceData[] = [];
  
  // Usar la fecha de completación en lugar de la fecha actual si está disponible
  const dateToUse = newCompletedDay && completedDate ? completedDate : currentDate;
  
  const currentMonth = dateToUse.getMonth();
  const currentYear = dateToUse.getFullYear();
  
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstWeekStart = startOfWeek(firstDayOfMonth, { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(lastDayOfMonth, { weekStartsOn: 1 });

  // Crear un mapa de semanas
  const weeks = new Map<number, { 
    start: Date; 
    end: Date; 
    label: string; 
    belongsToCurrentMonth: boolean 
  }>();

  let currentWeekStart = new Date(firstWeekStart);
  let weekNumber = 1;

  while (currentWeekStart <= lastWeekEnd) {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const dateRangeLabel = `(${format(currentWeekStart, 'dd MMM yyyy', { locale: es })}-${format(weekEnd, 'dd MMM yyyy', { locale: es })})`;
    
    const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
    
    // Modificar la lógica para contar días por mes
    const daysCountByMonth = daysInWeek.reduce((acc, day) => {
      const monthKey = `${day.getFullYear()}-${day.getMonth()}`;
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Encontrar el mes con más días en la semana
    let maxDays = 0;
    let dominantMonthKey = '';
    Object.entries(daysCountByMonth).forEach(([monthKey, count]) => {
      if (count > maxDays) {
        maxDays = count;
        dominantMonthKey = monthKey;
      }
    });

    // Determinar si la semana pertenece al mes actual
    const currentMonthKey = `${currentYear}-${currentMonth}`;
    const belongsToCurrentMonth = dominantMonthKey === currentMonthKey;

    weeks.set(weekNumber, {
      start: new Date(currentWeekStart),
      end: new Date(weekEnd),
      label: dateRangeLabel,
      belongsToCurrentMonth
    });

    currentWeekStart = new Date(weekEnd);
    currentWeekStart.setDate(currentWeekStart.getDate() + 1);
    weekNumber++;
  }

  const filteredWeeks = Array.from(weeks.entries())
    .filter(([_, week]) => week.belongsToCurrentMonth)
    .map(([originalNum, week]) => ({ originalNum, week }));

  filteredWeeks.forEach((item, index) => {
    const { week } = item;
    const newWeekNumber = index + 1;
    const simpleLabel = `S${newWeekNumber}`;
    const startDayFormat = format(week.start, 'dd', { locale: es });
    const endDayFormat = format(week.end, 'dd MMM', { locale: es });
    const weekLabel = `(${startDayFormat} - ${endDayFormat})`;
    const fullLabel = `S${newWeekNumber} ${weekLabel}`;
    
    // Crear un identificador único para la semana
    const fullPeriodKey = `week-${format(week.start, 'yyyy-MM-dd')}-${format(week.end, 'yyyy-MM-dd')}`;

    const weekData: BalanceData = {
      period: fullLabel,
      displayPeriod: simpleLabel,
      fullPeriod: fullPeriodKey
    };

    habits.forEach(habit => {
      let completedDays = 0;
      const daysInWeek = eachDayOfInterval({ start: week.start, end: week.end });

      daysInWeek.forEach(day => {
        if (!isHabitActiveOnDate(habit, day)) return;

        const dateStr = format(day, 'yyyy-MM-dd');
        const habitKeys = [
          `${habit.id}-${dateStr}`,
          `${habit.index}-${dateStr}`,
          `${habit.supabase_id}-${dateStr}`
        ];

        for (const key of habitKeys) {
          if (habitStatus[key]?.status === 'completed') {
            completedDays++;
            break;
          }
        }
      });

      const valuePerDay = fixPrecision(100 / 7);
      weekData[habit.name] = fixPrecision(completedDays * valuePerDay);
    });

    data.push(weekData);
  });

  return data;
};

/**
 * Actualiza los datos semanales para un día específico completado
 */
export const updateWeeklyDataForCompletedDay = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  completedDate: Date,
  existingData: BalanceData[]
): BalanceData[] => {
  // Log de claves de habitStatus para ver si hay completaciones
  const completedEntries = Object.entries(habitStatus)
    .filter(([_, value]) => value.status === 'completed')
    .map(([key]) => key);

  const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(completedDate, { weekStartsOn: 1 });
  
  // Determinar a qué mes pertenece esta semana
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const daysCountByMonth = daysInWeek.reduce((acc, day) => {
    const monthKey = `${day.getFullYear()}-${day.getMonth()}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Encontrar el mes con más días
  let maxDays = 0;
  let dominantMonthKey = '';
  Object.entries(daysCountByMonth).forEach(([monthKey, count]) => {
    if (count > maxDays) {
      maxDays = count;
      dominantMonthKey = monthKey;
    }
  });

  // Extraer año y mes del mes dominante
  const [dominantYear, dominantMonth] = dominantMonthKey.split('-').map(Number);
  
  // Actualizar solo si la semana pertenece al mes dominante
  return existingData.map(weekData => {
    const weekStart = startOfWeek(completedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(completedDate, { weekStartsOn: 1 });
    const weekLabel = `(${format(weekStart, 'dd', { locale: es })} - ${format(weekEnd, 'dd MMM', { locale: es })})`;
    
    if (weekData.period.includes(weekLabel)) {
      const updatedData = { ...weekData };
      
      habits.forEach(habit => {
        const dateStr = format(completedDate, 'yyyy-MM-dd');
        const habitKeys = [
          `${habit.id}-${dateStr}`,
          `${habit.index}-${dateStr}`,
          `${habit.supabase_id}-${dateStr}`
        ];
        
        let isCompleted = false;
        for (const key of habitKeys) {
          if (habitStatus[key]?.status === 'completed') {
            isCompleted = true;
            break;
          }
        }
        
        if (isCompleted) {
          const currentValue = typeof updatedData[habit.name] === 'number' ? 
            updatedData[habit.name] as number : 0;
          const valuePerDay = fixPrecision(100 / 7);
          updatedData[habit.name] = fixPrecision(currentValue + valuePerDay);
        }
      });
      
      return updatedData;
    }
    
    return weekData;
  });
};

// Función auxiliar para extraer el número de semana del formato "S1 (fecha-fecha)"
function extractWeekNumber(periodString: string): number {
  const match = periodString.match(/S(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Función auxiliar para obtener la semana del mes a la que pertenece una fecha
function getWeekOfMonth(date: Date): number {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const offsetDate = date.getDate() + firstDayOfWeek - 1;
  return Math.floor(offsetDate / 7) + 1;
}

// Función auxiliar para formatear fechas como "DD mmm"
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('es', { month: 'short' }).toLowerCase();
  return `${day} ${month}`;
}

// Función para formatear fechas como "YYYY-MM-DD" para las claves de habitStatus
function formatDateForKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
} 