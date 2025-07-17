import { Habit, HabitStatus, BalanceData } from '@/components/types/types';
import { fixPrecision, isHabitActiveOnDate, getMonthName } from './common';

/**
 * Genera datos de balance anuales para un conjunto de hábitos
 */
export const generateYearlyBalanceData = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  options: {
    existingData?: BalanceData[];
    newCompletedDay?: boolean;
    completedDate?: Date;
  } = {}
): BalanceData[] => {
  // Si hay datos existentes y es un nuevo día completado, usar la misma lógica que en monthly
  if (options.existingData && options.existingData.length > 0) {
    // Si los datos existentes son mensuales (solo junio), convertirlos a formato anual
    if (options.existingData.length === 1 && options.existingData[0].period === 'jun') {
      const monthData = options.existingData[0];
      const year = currentDate.getFullYear();
      const yearlyData: BalanceData[] = [];
      
      // Crear datos para todos los meses del año
      for (let month = 0; month < 12; month++) {
        const monthName = getMonthName(month);
        const monthObj: BalanceData = {
          period: monthName,
          fullPeriod: `${monthName}-${year}`
        };
        
        // Copiar los valores del mes actual si coinciden
        if (monthName === 'jun') {
          Object.keys(monthData).forEach(key => {
            if (key !== 'period' && key !== 'fullPeriod') {
              monthObj[key] = monthData[key];
            }
          });
        } else {
          // Para otros meses, inicializar con cero
          habits.forEach(habit => {
            monthObj[habit.name] = 0;
          });
        }
        
        yearlyData.push(monthObj);
      }
      
      return yearlyData;
    }
    
    // IMPORTANTE: Hacer una copia profunda para no modificar los originales
    const deepCopy = JSON.parse(JSON.stringify(options.existingData));
    
    // Solo recalcular si es un nuevo día completado
    if (options.newCompletedDay && options.completedDate) {
      return updateYearlyDataForCompletedDay(habits, habitStatus, options.completedDate, deepCopy);
    }
    
    return deepCopy;
  }
  
  // El resto del código original para generar datos anuales desde cero...
  const { existingData = [], newCompletedDay = false, completedDate } = options;
  const year = currentDate.getFullYear();
  const yearlyData: BalanceData[] = [];

  // Si es un nuevo día completado, solo actualizar el mes correspondiente
  if (newCompletedDay && completedDate) {
    return updateYearlyDataForCompletedDay(habits, habitStatus, completedDate, existingData);
  }

  // Procesar cada mes del año
  for (let month = 0; month < 12; month++) {
    const monthData: BalanceData = {
      period: getMonthName(month),
      fullPeriod: `${getMonthName(month)}-${year}`
    };

    const lastDay = new Date(year, month + 1, 0).getDate();

    habits.forEach(habit => {
      let completedDays = 0;

      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        if (!isHabitActiveOnDate(habit, date)) continue;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
      }

      const valuePerDay = fixPrecision(100 / lastDay);
      monthData[habit.name] = fixPrecision(completedDays * valuePerDay);
    });

    yearlyData.push(monthData);
  }

  // Si hay datos existentes, actualizar solo los meses que han cambiado
  if (existingData.length > 0) {
    return existingData.map(existingMonth => {
      const updatedMonth = yearlyData.find(
        newMonth => newMonth.period === existingMonth.period
      );
      return updatedMonth || existingMonth;
    });
  }

  return yearlyData;
};

/**
 * Actualiza los datos anuales para un día específico completado
 */
export const updateYearlyDataForCompletedDay = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  completedDate: Date,
  existingData: BalanceData[]
): BalanceData[] => {
  const month = completedDate.getMonth();
  const year = completedDate.getFullYear();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthName = getMonthName(month);
  const valuePerDay = fixPrecision(100 / lastDay);

  return existingData.map(periodData => {
    if (periodData.period === monthName) {
      const updatedData = { ...periodData };
      
      habits.forEach(habit => {
        const dateStr = completedDate.toISOString().split('T')[0];
        const habitKeys = [
          `${habit.id}-${dateStr}`,
          `${habit.index}-${dateStr}`,
          `${habit.supabase_id}-${dateStr}`
        ];

        for (const key of habitKeys) {
          if (habitStatus[key]?.status === 'completed') {
            const currentValue = parseFloat(updatedData[habit.name]?.toString() || '0');
            updatedData[habit.name] = fixPrecision(currentValue + valuePerDay);
            break;
          }
        }
      });

      return updatedData;
    }
    return periodData;
  });
}; 