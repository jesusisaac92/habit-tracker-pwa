import { Habit, HabitStatus, BalanceData } from '@/components/types/types';
import { generateWeeklyBalanceData } from './weeklyBalanceCalculations';
import { generateMonthlyBalanceData } from './monthlyCalculations';
import { generateYearlyBalanceData } from './yearlyCalculations';
import { memoizedBalanceCalculation, memoizedPieChartCalculation } from './memoization';
import { fixPrecision } from './common';

interface GenerateBalanceDataOptions {
  existingData?: BalanceData[];
  newCompletedDay?: boolean;
  completedDate?: Date;
  preserveValues?: boolean;
}

/**
 * Punto central para generar datos de balance para diferentes períodos
 */
function generateBalanceData(
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  period: 'week' | 'month' | 'year',
  options: GenerateBalanceDataOptions = {}
): BalanceData[] {
  // Determinar la función de cálculo según el período
  let calculationFunction;
  
  switch (period) {
    case 'week':
      calculationFunction = generateWeeklyBalanceData;
      break;
    case 'month':
      calculationFunction = generateMonthlyBalanceData;
      break;
    case 'year':
      calculationFunction = generateYearlyBalanceData;
      break;
    default:
      calculationFunction = generateMonthlyBalanceData;
  }
  
  // Usar memorización para el cálculo
  return memoizedBalanceCalculation(
    habits, 
    habitStatus, 
    currentDate, 
    period, 
    options, 
    calculationFunction
  );
}

/**
 * Genera datos para el gráfico de pastel
 */
function generatePieChartData(
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>
): Array<{ name: string; value: number; color: string }> {
  // Función original de cálculo para el gráfico de pastel
  const calculatePieChartData = (
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>
  ): Array<{ name: string; value: number; color: string }> => {
    const result: Array<{ name: string; value: number; color: string }> = [];
    // Filtrar hábitos activos (consideramos un hábito como archivado si tiene un flag como endDate definido)
    const activeHabits = habits.filter(habit => !habit.endDate || new Date(habit.endDate) > new Date());
    
    if (activeHabits.length === 0) {
      return [];
    }
    
    // Agrupar hábitos por alguna propiedad que podamos usar como categoría
    // Usamos una estructura para agrupar los hábitos
    const habitGroups: Record<string, Habit[]> = {};
    
    // Agrupar hábitos por una propiedad que definamos como categoría (usamos el icon como ejemplo)
    activeHabits.forEach(habit => {
      // Usamos el icon como categoría si no tenemos otra propiedad más adecuada
      const category = habit.icon || 'Sin categoría';
      if (!habitGroups[category]) {
        habitGroups[category] = [];
      }
      habitGroups[category].push(habit);
    });
    
    // Calcular completados por categoría
    Object.entries(habitGroups).forEach(([category, habitsInCategory]) => {
      let completed = 0;
      let total = 0;
      
      habitsInCategory.forEach(habit => {
        const statusKeys = Object.keys(habitStatus).filter(key => 
          typeof habit.id === 'string' ? key.startsWith(habit.id) : key.startsWith(String(habit.id))
        );
        const habitCompletedCount = statusKeys.filter(key => habitStatus[key]?.status === 'completed').length;
        
        completed += habitCompletedCount;
        total += statusKeys.length > 0 ? statusKeys.length : 1; // Evitar división por cero
      });
      
      const percentCompleted = total > 0 ? (completed / total) * 100 : 0;
      
      // Asignar un color basado en la categoría (de forma determinista)
      const categoryHash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = categoryHash % 360;
      const color = `hsl(${hue}, 70%, 60%)`;
      
      result.push({
        name: category,
        value: Math.round(percentCompleted * 10) / 10, // Redondear a 1 decimal
        color
      });
    });
    
    // Ordenar por valor de mayor a menor
    return result.sort((a, b) => b.value - a.value);
  };
  
  // Usar memorización para el cálculo
  return memoizedPieChartCalculation(habits, habitStatus, calculatePieChartData);
}

export const chartCalculations = {
  generateBalanceData,
  generatePieChartData,
  fixPrecision
};