import { Habit, HabitStatus, BalanceData } from '@/components/types/types';
import { fixPrecision, isHabitActiveOnDate, getMonthName } from './common';

/**
 * Genera datos de balance mensuales para un conjunto de hábitos
 */
export function generateMonthlyBalanceData(
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  options: { 
    existingData?: any[]; 
    newCompletedDay?: boolean; 
    completedDate?: Date;
    preserveValues?: boolean;
  }
): any[] {
  // Si hay datos existentes y un día completado, respetar los valores existentes
  if (options.existingData && options.existingData.length > 0) {
    // IMPORTANTE: Hacer una copia profunda para no modificar los originales
    const deepCopy = JSON.parse(JSON.stringify(options.existingData));
    
    // Si se debe preservar valores, asegurarse de que son numéricos
    if (options.preserveValues) {
      deepCopy.forEach((item: any) => {
        habits.forEach(habit => {
          if (item[habit.name] !== undefined) {
            const value = typeof item[habit.name] === 'string'
              ? parseFloat(item[habit.name])
              : item[habit.name];
            item[habit.name] = isNaN(value) ? 0 : fixPrecision(value);
          }
        });
      });
    }
    
    // Este es el punto clave - devolver los datos existentes para que no se sobrescriban
    // Solo recalcular si es un nuevo día completado
    if (options.newCompletedDay && options.completedDate) {
      return updateMonthlyDataForCompletedDay(habits, habitStatus, options.completedDate, deepCopy);
    }
    
    return deepCopy;
  }
  
  // Si no hay datos existentes, generar nuevos
  const { newCompletedDay = false, completedDate } = options;
  
  // Usar la fecha de completación en lugar de la fecha actual si está disponible
  const dateToUse = newCompletedDay && completedDate ? completedDate : currentDate;
  const month = dateToUse.getMonth();
  const year = dateToUse.getFullYear();
  
  const lastDay = new Date(year, month + 1, 0).getDate();

  const monthData: BalanceData = {
    period: getMonthName(month),
    fullPeriod: `${getMonthName(month)}-${year}`
  };

  // Si es un nuevo día completado, solo procesar ese día
  if (newCompletedDay && completedDate) {
    // Crear nuevo conjunto de datos con solo este mes
    const initialData = [{
      period: getMonthName(month),
      fullPeriod: `${getMonthName(month)}-${year}`
    }];
    
    return updateMonthlyDataForCompletedDay(habits, habitStatus, completedDate, initialData);
  }

  // Si no es un nuevo día completado, calcular todo el mes
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

  return [monthData];
}

/**
 * Actualiza los datos de balance para un día específico completado
 */
export const updateMonthlyDataForCompletedDay = (
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

  // Verificar si el periodo ya existe en los datos
  // Buscar por combinación de mes y año (fullPeriod) para distinguir entre meses de diferentes años
  const fullPeriodKey = `${monthName}-${year}`;
  const existingPeriodIndex = existingData.findIndex(data => 
    // Verificar tanto por el period como por fullPeriod (asegurarse de que es el mismo mes y año)
    data.period === monthName && 
    (data.fullPeriod === fullPeriodKey || 
     (data.fullPeriod && data.fullPeriod.toString().includes(year.toString())))
  );
  
  // Si el periodo no existe, crear uno nuevo
  if (existingPeriodIndex === -1) {
    const newPeriodData: BalanceData = {
      period: monthName,
      fullPeriod: fullPeriodKey
    };
    
    // Inicializar valores para los hábitos completados en este día
    habits.forEach(habit => {
      const dateStr = completedDate.toISOString().split('T')[0];
      const habitKeys = [
        `${habit.id}-${dateStr}`,
        `${habit.index}-${dateStr}`,
        `${habit.supabase_id}-${dateStr}`
      ];

      let habitCompleted = false;
      for (const key of habitKeys) {
        if (habitStatus[key]?.status === 'completed') {
          newPeriodData[habit.name] = valuePerDay;
          habitCompleted = true;
          break;
        }
      }
      
      // Si el hábito no está completado, inicializar con 0
      if (!habitCompleted) {
        newPeriodData[habit.name] = 0;
      }
    });
    
    return [...existingData, newPeriodData];
  }

  // Si el periodo ya existe, actualizar los valores
  return existingData.map((periodData, index) => {
    if (index === existingPeriodIndex) {
      const updatedData = { ...periodData };
      
      // Asegurarse de que fullPeriod está definido correctamente
      if (!updatedData.fullPeriod || updatedData.fullPeriod === '0') {
        updatedData.fullPeriod = fullPeriodKey;
      }
      
      habits.forEach(habit => {
        const dateStr = completedDate.toISOString().split('T')[0];
        const habitKeys = [
          `${habit.id}-${dateStr}`,
          `${habit.index}-${dateStr}`,
          `${habit.supabase_id}-${dateStr}`
        ];

        for (const key of habitKeys) {
          if (habitStatus[key]?.status === 'completed') {
            // Inicializar valor si no existe
            if (updatedData[habit.name] === undefined) {
              updatedData[habit.name] = 0;
            }
            
            const currentValue = parseFloat(updatedData[habit.name]?.toString() || '0');
            const newValue = fixPrecision(currentValue + valuePerDay);
            updatedData[habit.name] = newValue;
            break;
          }
        }
      });

      return updatedData;
    }
    return periodData;
  });
}; 