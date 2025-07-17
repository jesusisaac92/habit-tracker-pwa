import { Habit } from '@/components/types/types';

export const filterVisibleHabits = (
  habits: Habit[],
  currentDate: Date
): Habit[] => {
  try {
    // Validar que currentDate sea una fecha válida
    if (!currentDate || isNaN(currentDate.getTime())) {
      return [];
    }
    
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    return habits.filter(habit => {
      try {
        // Verificar que startDate existe y es una cadena válida
        if (!habit.startDate) {
          return false;
        }

        // Extraer solo la parte de fecha si viene en formato ISO
        const startDateStr = habit.startDate.includes('T') 
          ? habit.startDate.split('T')[0] 
          : habit.startDate;

        // Crear fechas locales sin componente de tiempo
        const startParts = startDateStr.split('-').map(Number);
        if (startParts.length !== 3 || startParts.some(isNaN)) {
          return false;
        }
        
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        if (isNaN(startDate.getTime())) {
          return false;
        }
        
        let endDate = null;
        if (habit.endDate) {
          const endParts = habit.endDate.split('-').map(Number);
          if (endParts.length !== 3 || endParts.some(isNaN)) {
            return false;
          }
          
          endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
          if (isNaN(endDate.getTime())) {
            return false;
          }
        }
        
        // Comparar las fechas directamente
        const afterOrEqualToStart = today >= startDate;
        const beforeOrEqualToEnd = habit.isIndefinite ? true : (endDate ? today <= endDate : true);
        
        return afterOrEqualToStart && beforeOrEqualToEnd;
      } catch (error) {
        return false;
      }
    });
  } catch (error) {
    return [];
  }
};

export const filterHabitsByDay = (
  habits: Habit[],
  currentDate: Date
): Habit[] => {
  try {
    if (!currentDate || isNaN(currentDate.getTime())) {
      return [];
    }
    
    // Obtener el día de la semana en formato JavaScript estándar (0=Domingo, 1=Lunes, ..., 6=Sábado)
    const dayOfWeek = currentDate.getDay();
    
    return habits.filter(habit => {
      try {
        // Si no tiene días seleccionados o tiene un array vacío o tiene todos los días, mostrar todos los días
        if (!Array.isArray(habit.selectedDays) || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
          return true;
        }
        
        // Verificar si el día actual está en la lista de días seleccionados
        // Los días en selectedDays están en formato JavaScript estándar (0=Domingo, 1=Lunes, ..., 6=Sábado)
        return habit.selectedDays.includes(dayOfWeek);
      } catch (error) {
        return false;
      }
    });
  } catch (error) {
    return [];
  }
}; 