import { Habit, HabitStatusMap } from '../types/types';

interface MedalProgress {
  bronze: boolean;
  silver: boolean;
  gold: boolean;
  progress: number;
}

export const calculateMedalProgress = (
  habit: Habit,
  completedDays: number,
  habitStatus: HabitStatusMap
): MedalProgress => {
  if (habit.endDate) {
    // Calcular días totales desde inicio hasta fin
    const startDate = new Date(habit.startDate);
    const endDate = new Date(habit.endDate);
    
    // Contar días completados
    let totalCompleted = 0;
    let totalDays = 0;
    
    // Iterar por cada día entre inicio y fin
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Ajustar el día de la semana para que coincida con nuestro formato (0 = Lunes)
      const adjustedDay = currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1;
      
      // Solo contar los días seleccionados
      if (habit.selectedDays && Array.isArray(habit.selectedDays) && habit.selectedDays.includes(adjustedDay)) {
        totalDays++;
        if (habitStatus[`${habit.index}-${dateStr}`]?.status === 'completed') {
          totalCompleted++;
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log('Cálculo de medallas:', {
      habitName: habit.name,
      totalDays,
      totalCompleted,
      rate: (totalCompleted / totalDays) * 100
    });

    const completionRate = (totalCompleted / totalDays) * 100;

    return {
      bronze: completionRate >= 60,
      silver: completionRate >= 80,
      gold: completionRate >= 100,
      progress: Math.min(completionRate, 100)
    };
  }

  // Para hábitos sin fecha final - basado en días consecutivos
  let consecutiveDays = 0;
  let maxConsecutiveDays = 0;
  let currentDate = new Date();
  const startDate = new Date(habit.startDate);
  currentDate.setHours(0, 0, 0, 0);

  // Retroceder día por día mientras encontremos días completados
  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const status = habitStatus[`${habit.index}-${dateStr}`]?.status;
    
    if (status === 'completed') {
      consecutiveDays++;
      maxConsecutiveDays = Math.max(maxConsecutiveDays, consecutiveDays);
    } else {
      break; // Romper la racha al encontrar un día no completado
    }
    
    currentDate.setDate(currentDate.getDate() - 1);
    
    // No ir más atrás de la fecha de inicio
    if (currentDate < startDate) break;
  }

  // Criterios para medallas en hábitos sin fecha final:
  return {
    bronze: maxConsecutiveDays >= 30,  // 30 días consecutivos
    silver: maxConsecutiveDays >= 90,  // 90 das consecutivos
    gold: maxConsecutiveDays >= 180,   // 180 das consecutivos
    progress: Math.min((maxConsecutiveDays / 180) * 100, 100)
  };
};

// Función para obtener el texto del siguiente objetivo
export const getNextMedalObjective = (progress: number): string => {
  if (progress < 25) {
    return 'Completa el 25% para obtener la medalla de bronce';
  } else if (progress < 50) {
    return 'Completa el 50% para obtener la medalla de plata';
  } else if (progress < 100) {
    return 'Completa el 100% para obtener la medalla de oro';
  }
  return '¡Has conseguido todas las medallas!';
};

// Función para verificar si se debe otorgar una nueva medalla
export const checkNewMedal = (
  previousProgress: number, 
  currentProgress: number
): 'bronze' | 'silver' | 'gold' | null => {
  if (previousProgress < 25 && currentProgress >= 25) return 'bronze';
  if (previousProgress < 50 && currentProgress >= 50) return 'silver';
  if (previousProgress < 100 && currentProgress >= 100) return 'gold';
  return null;
}; 