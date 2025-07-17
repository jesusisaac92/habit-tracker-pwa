import { Habit } from '@/components/types/types';

/**
 * Corrige la precisión de un número a un decimal
 * @param value - Número a corregir
 * @returns Número con un decimal de precisión
 */
export const fixPrecision = (value: number): number => {
  return parseFloat(value.toFixed(1));
};

/**
 * Verifica si un hábito está activo en una fecha específica
 * @param habit - Hábito a verificar
 * @param date - Fecha a verificar
 * @returns true si el hábito está activo en la fecha especificada
 */
export const isHabitActiveOnDate = (habit: Habit, date: Date): boolean => {
  const startDate = new Date(habit.startDate);
  if (date < startDate) return false;
  
  if (!habit.isIndefinite && habit.endDate) {
    const endDate = new Date(habit.endDate);
    if (date > endDate) return false;
  }
  
  // Obtener el día de la semana en formato JavaScript estándar (0=Domingo, 1=Lunes, ..., 6=Sábado)
  const dayOfWeek = date.getDay();
  
  // Si el hábito no tiene días seleccionados o está vacío o tiene todos los días, está activo todos los días
  if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
    return true;
  }
  
  // Verificar si el día actual está incluido en los días seleccionados
  // Los días en selectedDays están en formato JavaScript estándar (0=Domingo, 1=Lunes, ..., 6=Sábado)
  return habit.selectedDays.includes(dayOfWeek);
};

/**
 * Obtiene el nombre del mes en formato corto
 * @param month - Número del mes (0-11)
 * @param locale - Código de idioma (default: 'es')
 * @returns Nombre del mes en formato corto
 */
export const getMonthName = (month: number, locale: string = 'es'): string => {
  return new Date(2000, month).toLocaleString(locale, { month: 'short' });
};

/**
 * Verifica si una fecha es futura
 * @param date - Fecha a verificar
 * @returns true si la fecha es futura
 */
export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date > today;
};

/**
 * Obtiene las claves de hábito para una fecha específica
 * @param habit - Hábito
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @returns Array de claves posibles para el hábito
 */
export const getHabitKeys = (habit: Habit, dateString: string): string[] => {
  return [
    `${habit.id}-${dateString}`,
    `${habit.index}-${dateString}`,
    `${habit.supabase_id}-${dateString}`
  ];
};

/**
 * Calcula el valor por día basado en el número total de días
 * @param totalDays - Número total de días en el período
 * @returns Valor por día (100/totalDays)
 */
export const calculatePointsPerDay = (totalDays: number): number => {
  return fixPrecision(100 / totalDays);
};