import { Habit } from '@/components/types/types';

export const filterVisibleHabits = (habits: Habit[], currentDate: string) => {  
  try {
    return habits.filter(habit => {
      // Asegurarse de que la fecha de inicio sea válida
      const startDate = new Date(habit.startDate);
      if (isNaN(startDate.getTime())) {
        console.warn('Fecha de inicio inválida:', habit.startDate);
        return false;
      } 

      // Normalizar la fecha actual
      const normalizedCurrentDate = new Date(currentDate);
      if (isNaN(normalizedCurrentDate.getTime())) {
        console.warn('Fecha actual inválida:', currentDate);
        return false;
      }

      // Verificar si el hábito debe mostrarse
      const startDateStr = startDate.toISOString().split('T')[0];
      const currentDateStr = normalizedCurrentDate.toISOString().split('T')[0];

      if (startDateStr > currentDateStr) {
        return false;
      }

      if (!habit.isIndefinite && habit.endDate) {
        const endDate = new Date(habit.endDate);
        if (!isNaN(endDate.getTime())) {
          const endDateStr = endDate.toISOString().split('T')[0];
          if (endDateStr < currentDateStr) {
            return false;
          }
        }
      }

      return true;
    });
  } catch (error) {
    console.error('Error en filterVisibleHabits:', error);
    return [];
  }
}; 