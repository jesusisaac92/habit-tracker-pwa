import { Habit, HabitStatus } from '@/components/types/types';
import { supabase } from '@/src/supabase/config/client';

interface HabitPerformance {
  completionRate: string;
  consistencyRate: string;
  completed: number;
  partial: number;
  notCompleted: number;
  totalDays?: number;
  streak?: number;
}

export const calculateHabitPerformance = async (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): Promise<HabitPerformance> => {
  const totalDaysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const daysElapsed = currentDate.getDate();

  // Obtener el ID efectivo del hábito (puede ser index, id o supabase_id)
  const habitId = habit.supabase_id || habit.id || habit.index;
  
  // Obtener el primer y último día del mes actual
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Formatear fechas para la consulta
  const startDate = firstDayOfMonth.toISOString().split('T')[0];
  const endDate = lastDayOfMonth.toISOString().split('T')[0];

  try {
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Si no hay usuario autenticado, usar el método anterior basado en habitStatus
      return calculatePerformanceFromStatus(habit, habitStatus, currentDate);
    }
    
    // Consultar las completaciones de este hábito en el mes actual
    const { data: completions, error } = await supabase
      .from('habit_completions')
      .select('completion_date')
      .eq('user_id', user.id)
      .eq('habit_id', String(habitId))
      .eq('is_completed', true)
      .gte('completion_date', startDate)
      .lte('completion_date', endDate);
      
    if (error) {
      console.error('Error al obtener completaciones:', error);
      // En caso de error, usar el método anterior
      return calculatePerformanceFromStatus(habit, habitStatus, currentDate);
    }
    
    // Contar días completados (eliminando posibles duplicados)
    const uniqueDates = new Set(completions.map(c => c.completion_date));
    const completedDays = uniqueDates.size;
    
    // Calcular tasas
    const monthlyProgress = ((completedDays / totalDaysInMonth) * 100).toFixed(1);
    const notCompletedDays = totalDaysInMonth - completedDays;
    const monthlyNotCompleted = ((notCompletedDays / totalDaysInMonth) * 100).toFixed(1);
    
    return {
      completionRate: monthlyProgress,
      consistencyRate: (typeof habit.timeObjective === 'number' ? 
        ((completedDays / habit.timeObjective) * 100) : 0).toFixed(1),
      completed: parseFloat(monthlyProgress),
      partial: 0,
      notCompleted: parseFloat(monthlyNotCompleted),
      totalDays: habit.isIndefinite ? undefined : totalDaysInMonth,
      streak: habit.currentStreak
    };
  } catch (error) {
    console.error('Error en calculateHabitPerformance:', error);
    // En caso de error, usar el método anterior
    return calculatePerformanceFromStatus(habit, habitStatus, currentDate);
  }
};

// Función auxiliar que implementa el cálculo original basado en habitStatus
const calculatePerformanceFromStatus = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): HabitPerformance => {
  const totalDaysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();
  const daysElapsed = currentDate.getDate();

  const currentYearMonth = currentDate.toISOString().substring(0, 7);
  const habitEntries = Object.entries(habitStatus).filter(([key]) => {
    return key.startsWith(`${habit.index}-`) && key.includes(currentYearMonth);
  });

  const completedEntries = habitEntries.filter(([, status]) => status.status === 'completed').length;
  const notCompletedEntries = habitEntries.filter(([, status]) => status.status === '').length;

  const monthlyProgress = ((completedEntries / totalDaysInMonth) * 100).toFixed(1);
  const monthlyNotCompleted = (((notCompletedEntries + (totalDaysInMonth - daysElapsed)) / totalDaysInMonth) * 100).toFixed(1);

  return {
    completionRate: monthlyProgress,
    consistencyRate: (typeof habit.timeObjective === 'number' ? 
      ((completedEntries / habit.timeObjective) * 100) : 0).toFixed(1),
    completed: parseFloat(monthlyProgress),
    partial: 0,
    notCompleted: parseFloat(monthlyNotCompleted),
    totalDays: habit.isIndefinite ? undefined : totalDaysInMonth,
    streak: habit.currentStreak
  };
};

export const calculateCompletionRate = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): string => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  let completedDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = habitStatus[`${habit.index}-${dateStr}`]?.status;
    if (status === 'completed') completedDays++;
  }
  
  return ((completedDays / daysInMonth) * 100).toFixed(1);
};

export const calculateConsistencyRate = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): string => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  let consecutiveDays = 0;
  let maxConsecutive = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const status = habitStatus[`${habit.index}-${dateStr}`]?.status;
    
    if (status === 'completed') {
      consecutiveDays++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
    } else {
      consecutiveDays = 0;
    }
  }
  
  return ((maxConsecutive / daysInMonth) * 100).toFixed(1);
};

export const getCompletedDays = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): number => {
  if (habit.endDate) {
    const startDate = new Date(habit.startDate || new Date());
    const endDate = new Date(habit.endDate);
    let completedDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (habitStatus[`${habit.index}-${dateStr}`]?.status === 'completed') {
        completedDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return completedDays;
  }

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  let completedDays = 0;

  for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (habitStatus[`${habit.index}-${dateStr}`]?.status === 'completed') {
      completedDays++;
    }
  }

  return completedDays;
};

export const getNotCompletedDays = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): number => {
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  let notCompletedDays = 0;

  for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (habitStatus[`${habit.index}-${dateStr}`]?.status === '') {
      notCompletedDays++;
    }
  }
  return notCompletedDays;
};