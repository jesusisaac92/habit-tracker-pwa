import { Habit, HabitStatus, ProgressDataPoint, HabitProgressData } from '@/components/types/types';
import { format, getDaysInMonth, parse, compareAsc, startOfMonth, endOfMonth, isSameMonth, isValid } from 'date-fns';

export type ViewPeriodType = 'month' | 'year';

// Constante para el factor de decaimiento
export const DECAY_RATE = 0.30; // 30% decay per day

interface TrendDataResult {
  data: ProgressDataPoint[];
  processedHabits: HabitProgressData[];
}

/**
 * Genera datos de tendencia para hábitos basados en su estado.
 * Para vista mensual: genera datos diarios con progreso acumulado y decaimiento.
 * Para vista anual: genera resumen mensual del año actual.
 */
export const generateTrendData = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  period: ViewPeriodType,
  currentDate: Date
): TrendDataResult => {
  const data: ProgressDataPoint[] = [];
  const processedHabits: HabitProgressData[] = [];

  // Procesar la lista de hábitos para mostrar en la leyenda
  habits.forEach(habit => {
    processedHabits.push({
      name: habit.name,
      color: habit.color || '#000000'
    });
  });

  if (period === 'month') {
    // DATOS DIARIOS PARA LA VISTA MENSUAL
    // Asegurarse de que estamos trabajando con el mes actual
    const normalizedDate = new Date(currentDate);
    const year = normalizedDate.getFullYear();
    const month = normalizedDate.getMonth();
    
    // Obtener el primer y último día del mes seleccionado
    const firstDayOfMonth = startOfMonth(normalizedDate);
    const lastDayOfMonth = endOfMonth(normalizedDate);
    const daysInMonth = getDaysInMonth(normalizedDate);
    
    // Calcular puntos por día (100% / días del mes)
    const pointsPerDay = 100 / daysInMonth;

    // Inicializamos los contadores para cada hábito
    const habitProgress: { [key: string]: {
      accumulatedPoints: number;
      lastCompletedPoints: number;
      daysSinceLastCompleted: number;
      previousCompletionDay?: number;
    }} = {};

    habits.forEach(habit => {
      habitProgress[habit.name] = {
        accumulatedPoints: 0,
        lastCompletedPoints: 0,
        daysSinceLastCompleted: 0
      };
    });

    // MEJORA CRÍTICA: Primero detectar el último día completado para cada hábito
    // para inicializar correctamente sus contadores de acumulación
    habits.forEach(habit => {
      // Buscar todas las completaciones para este hábito
      const completedDays: number[] = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = format(date, 'yyyy-MM-dd');
        const habitKey = `${habit.id}-${dateStr}`;
        const alternativeKey = `0-${dateStr}`;
        
        // Verificar si el hábito está completado con clave específica
        const isCompletedSpecific = habitStatus[habitKey]?.status === 'completed';
        
        // Verificar si puede reclamar la clave alternativa
        let canClaimAlternative = false;
        if (habitStatus[alternativeKey]?.status === 'completed') {
          const otherHabitsWithCompletionsForThisDay = habits.filter(h => {
            const otherHabitKey = `${h.id}-${dateStr}`;
            return h.id !== habit.id && habitStatus[otherHabitKey]?.status === 'completed';
          });
          
          if (otherHabitsWithCompletionsForThisDay.length === 0) {
            // Ningún otro hábito tiene completación específica, podemos reclamar la alternativa
            const isFirstHabit = habits.indexOf(habit) === 0;
            if (isFirstHabit) {
              canClaimAlternative = true;
            }
          }
        }
        
        if (isCompletedSpecific || canClaimAlternative) {
          completedDays.push(day);
        }
      }
      
      // Si hay días completados, calcular el acumulado inicial basado en el último día completado
      if (completedDays.length > 0) {
        completedDays.sort((a, b) => a - b);
        
        // Cálculo de puntos basado en días completados
        const pointsPerDay = 100 / daysInMonth;
        
        // Calcular puntos acumulados para todos los días completados
        let totalAccumulatedPoints = 0;
        let previousCompletionDay = 0;
        
        completedDays.forEach(day => {
          // Verificar si hubo decaimiento antes de este día
          if (previousCompletionDay > 0) {
            const daysSinceLastCompleted = day - previousCompletionDay - 1;
            if (daysSinceLastCompleted > 0) {
              // Aplicar decaimiento
              const decayFactor = Math.pow(1 - DECAY_RATE, daysSinceLastCompleted);
              totalAccumulatedPoints = totalAccumulatedPoints * decayFactor;
            }
          }
          
          // Acumular puntos para este día completado
          totalAccumulatedPoints += pointsPerDay;
          previousCompletionDay = day;
        });
        
        // Inicializar el estado del hábito con los puntos pre-calculados
        const lastCompletedDay = completedDays[completedDays.length - 1];
        const daysSinceLastCompleted = Math.max(0, daysInMonth - lastCompletedDay);
        
        habitProgress[habit.name] = {
          accumulatedPoints: totalAccumulatedPoints,
          lastCompletedPoints: totalAccumulatedPoints,
          daysSinceLastCompleted: daysSinceLastCompleted,
          previousCompletionDay: lastCompletedDay
        };
      }
    });

    // Para asegurar que tengamos todos los días, creamos un array con todos los días del mes
    // antes de procesarlos
    const allDaysInMonth: ProgressDataPoint[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (isValid(date)) {
        // Verificar que realmente pertenece al mes que estamos procesando
        // (evita el caso de días inexistentes como 31 de junio)
        if (date.getMonth() === month && date.getFullYear() === year) {
          const dateStr = format(date, 'yyyy-MM-dd');
          allDaysInMonth.push({
            period: dateStr,
            dayNumber: day
          });
        }
      }
    }
    
    // Procesar cada día del mes
    for (const dayData of allDaysInMonth) {
      const day = dayData.dayNumber as number;
      const dateStr = dayData.period as string;
      const date = new Date(dateStr);
      
      // MEJORA: Procesar los días con una mejor lógica de acumulación
      habits.forEach(habit => {
        const progress = habitProgress[habit.name];
        
        // Si ya procesamos este día durante la fase de pre-cálculo, usar esos valores
        if (progress.previousCompletionDay && day <= progress.previousCompletionDay) {
          // Calcular el estado para este día basado en días completados anteriores
          // y posibles decaimientos
          
          // Buscar si este día específico está completado
          const habitKey = `${habit.id}-${dateStr}`;
          const alternativeKey = `0-${dateStr}`;
          
          // Verificar si este día está completado para este hábito
          const isCompletedSpecific = habitStatus[habitKey]?.status === 'completed';
          
          // Verificar si puede reclamar la alternativa
          let canClaimAlternative = false;
          if (habitStatus[alternativeKey]?.status === 'completed') {
            const otherHabitsWithCompletionsForThisDay = habits.filter(h => {
              const otherHabitKey = `${h.id}-${dateStr}`;
              return h.id !== habit.id && habitStatus[otherHabitKey]?.status === 'completed';
            });
            
            if (otherHabitsWithCompletionsForThisDay.length === 0) {
              const isFirstHabit = habits.indexOf(habit) === 0;
              if (isFirstHabit) {
                canClaimAlternative = true;
              }
            }
          }
          
          const isCompleted = isCompletedSpecific || canClaimAlternative;
          
          // Simular la acumulación para este día
          const pointsPerDay = 100 / daysInMonth;
          
          // Recalcular los puntos acumulados hasta este día
          let recalculatedPoints = 0;
          let lastCompletedDay = 0;
          
          for (let i = 1; i <= day; i++) {
            const currentDate = new Date(year, month, i);
            const currentDateStr = format(currentDate, 'yyyy-MM-dd');
            const currentHabitKey = `${habit.id}-${currentDateStr}`;
            const currentAlternativeKey = `0-${currentDateStr}`;
            
            const isCurrentDayCompletedSpecific = habitStatus[currentHabitKey]?.status === 'completed';
            
            // Verificar si puede reclamar la alternativa para este día
            let canClaimCurrentAlternative = false;
            if (habitStatus[currentAlternativeKey]?.status === 'completed') {
              const otherHabitsWithCompletionsForCurrentDay = habits.filter(h => {
                const otherHabitKey = `${h.id}-${currentDateStr}`;
                return h.id !== habit.id && habitStatus[otherHabitKey]?.status === 'completed';
              });
              
              if (otherHabitsWithCompletionsForCurrentDay.length === 0) {
                const isFirstHabit = habits.indexOf(habit) === 0;
                if (isFirstHabit) {
                  canClaimCurrentAlternative = true;
                }
              }
            }
            
            const isCurrentDayCompleted = isCurrentDayCompletedSpecific || canClaimCurrentAlternative;
            
            if (isCurrentDayCompleted) {
              // Si hay días sin completar entre el último día completado y éste,
              // aplicar decaimiento
              if (lastCompletedDay > 0) {
                const daysSinceLastCompleted = i - lastCompletedDay - 1;
                if (daysSinceLastCompleted > 0) {
                  const decayFactor = Math.pow(1 - DECAY_RATE, daysSinceLastCompleted);
                  recalculatedPoints = recalculatedPoints * decayFactor;
                }
              }
              
              // Acumular puntos para este día
              recalculatedPoints += pointsPerDay;
              lastCompletedDay = i;
            }
          }
          
          // Guardar el valor recalculado
          dayData[habit.name] = Math.max(0, Math.round(recalculatedPoints * 100) / 100);
          
          // Mantener el registro de valores reales para el tooltip
          // Método más seguro para manejar los valores reales
          const dp = dayData as any;
          if (!dp._realValues) {
            dp._realValues = {};
          }
          dp._realValues[habit.name] = recalculatedPoints;
        } else {
          // Construir la clave para el estado del hábito en este día
          // Primero intentar con el ID del hábito
          const statusKey = `${habit.id}-${dateStr}`;
          // Verificar si el hábito está completado con cualquiera de las claves
          let status = habitStatus[statusKey]?.status || '';
          // También probar con el formato alternativo (0-fecha)
          const alternativeKey = `0-${dateStr}`;
          
          // MEJORA: Verificar específicamente la clave alternativa
          if (status !== 'completed') {
            // Si no tiene una completación específica, verificar si puede reclamar la alternativa
            if (habitStatus[alternativeKey]?.status === 'completed') {
              // Verificar si hay algún otro hábito que tenga una completación específica para este día
              const otherHabitsWithCompletionsForThisDay = habits.filter(h => {
                const otherHabitKey = `${h.id}-${dateStr}`;
                return h.id !== habit.id && habitStatus[otherHabitKey]?.status === 'completed';
              });
              
              if (otherHabitsWithCompletionsForThisDay.length === 0) {
                // Ningún otro hábito tiene completación específica, podemos verificar si este hábito
                // debe reclamar la alternativa
                const isFirstHabit = habits.indexOf(habit) === 0;
                if (isFirstHabit) {
                  status = 'completed';
                }
              }
            }
          }
          
          // Procesar este día según corresponda
          const pointsPerDay = 100 / daysInMonth;
          
          if (status === 'completed') {
            // Si el hábito está completado, acumular puntos
            progress.accumulatedPoints += pointsPerDay;
            progress.lastCompletedPoints = progress.accumulatedPoints;
            progress.daysSinceLastCompleted = 0;
          } else {
            // Si no está completado, aplicar decaimiento
            progress.daysSinceLastCompleted++;
            const decayFactor = Math.pow(1 - DECAY_RATE, progress.daysSinceLastCompleted);
            progress.accumulatedPoints = progress.lastCompletedPoints * decayFactor;
          }
          
          // Guardar el valor real acumulado para el tooltip
          // Método más seguro para manejar los valores reales
          const dp = dayData as any;
          if (!dp._realValues) {
            dp._realValues = {};
          }
          dp._realValues[habit.name] = progress.accumulatedPoints;
          
          // Almacenar el valor final (con 2 decimales)
          dayData[habit.name] = Math.max(0, Math.round(progress.accumulatedPoints * 100) / 100);
        }
      });
    }
    
    // Añadir todos los días procesados a data
    data.push(...allDaysInMonth);
    
    // Verificar nuevamente que todos los días generados sean del mes correcto
    const validData = data.filter(item => {
      const itemDate = new Date(item.period as string);
      return isValid(itemDate) && itemDate.getMonth() === month && itemDate.getFullYear() === year;
    });
    
    if (validData.length !== data.length) {
      data.length = 0;
      data.push(...validData);
    }
    
    // Asegurar que los datos estén ordenados cronológicamente por el número de día
    data.sort((a, b) => {
      // Ordenar primariamente por dayNumber si está disponible
      if (a.dayNumber !== undefined && b.dayNumber !== undefined) {
        return Number(a.dayNumber) - Number(b.dayNumber);
      }
      
      // Ordenar por fecha como respaldo
      try {
        const dateA = new Date(a.period as string);
        const dateB = new Date(b.period as string);
        if (isValid(dateA) && isValid(dateB)) {
          return compareAsc(dateA, dateB);
        }
      } catch (e) {
        // Error silencioso
      }
      
      return 0;
    });
    
    // Verificar específicamente la presencia del primer y último día del mes
    const firstDayPresent = data.some(d => Number(d.dayNumber) === 1);
    const lastDayPresent = data.some(d => Number(d.dayNumber) === daysInMonth);
    
    // Si faltan días críticos, agregarlos
    if (!firstDayPresent || !lastDayPresent) {
      // Si falta el primer día, agregarlo
      if (!firstDayPresent) {
        const firstDate = new Date(year, month, 1);
        const firstDateStr = format(firstDate, 'yyyy-MM-dd');
        
        const dataPoint: ProgressDataPoint = {
          period: firstDateStr,
          dayNumber: 1
        };
        
        // Asignar valores para cada hábito (iniciar en 0)
        habits.forEach(habit => {
          dataPoint[habit.name] = 0;
        });
        
        data.push(dataPoint);
      }
      
      // Si falta el último día, agregarlo
      if (!lastDayPresent) {
        const lastDate = new Date(year, month, daysInMonth);
        const lastDateStr = format(lastDate, 'yyyy-MM-dd');
        
        const dataPoint: ProgressDataPoint = {
          period: lastDateStr,
          dayNumber: daysInMonth
        };
        
        // Asignar valores para cada hábito basado en el penúltimo día o 0
        const penultimateDay = data.find(d => Number(d.dayNumber) === daysInMonth - 1);
        
        habits.forEach(habit => {
          if (penultimateDay && penultimateDay[habit.name] !== undefined) {
            // Usar valor con decaimiento del penúltimo día
            dataPoint[habit.name] = Math.max(0, Number(penultimateDay[habit.name]) * (1 - DECAY_RATE));
          } else {
            dataPoint[habit.name] = 0;
          }
        });
        
        data.push(dataPoint);
      }
      
      // Volver a ordenar después de agregar días críticos
      data.sort((a, b) => Number(a.dayNumber) - Number(b.dayNumber));
    }
    
    // Verificación final: buscar días con números incorrectos (mayores que los días del mes)
    const invalidDays = data.filter(d => Number(d.dayNumber) > daysInMonth);
    if (invalidDays.length > 0) {
      // Eliminar los días inválidos
      const validData = data.filter(d => Number(d.dayNumber) <= daysInMonth);
      data.length = 0;
      data.push(...validData);
    }
    
  } else {
    // DATOS MENSUALES PARA LA VISTA ANUAL
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    
    // Asegurarse de que estamos trabajando con el año actual
    const normalizedDate = new Date(currentDate);
    const currentYear = normalizedDate.getFullYear();
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      const monthData: { [key: string]: number } = {};
      const pointsPerDay = 100 / daysInMonth;
      
      // Calcular los puntos acumulados para cada hábito basado solo en sus propias completaciones
      habits.forEach(habit => {
        let accumulatedPoints = 0;
        let completionCount = 0;
        const completionDates: string[] = [];
        
        // Solo contar completaciones específicas para este hábito
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(currentYear, month, day);
          const dateStr = format(date, 'yyyy-MM-dd');
          
          // Verificar todas las posibles claves para este hábito
          const habitKeys = [
            `${habit.id}-${dateStr}`,                    // ID local
            `${habit.supabase_id}-${dateStr}`,           // ID de Supabase
          ];
          
          // Verificar si alguna de las claves existe
          const isCompleted = habitKeys.some(key => habitStatus[key]?.status === 'completed');
          
          if (isCompleted) {
            accumulatedPoints += pointsPerDay;
            completionCount++;
            completionDates.push(dateStr);
          }
        }
        
        // Almacenar el valor final (con 2 decimales)
        monthData[habit.name] = Math.round(accumulatedPoints * 100) / 100;
      });

      data.push({
        monthIndex: month,
        month: months[month],
        period: `${months[month]}-${currentYear}`,
        year: currentYear,
        ...monthData
      });
    }
    
    // Asegurar que los meses estén ordenados correctamente
    data.sort((a, b) => {
      if (a.monthIndex !== undefined && b.monthIndex !== undefined) {
        return Number(a.monthIndex) - Number(b.monthIndex);
      }
      return 0;
    });
  }

  return {
    data,
    processedHabits
  };
}; 