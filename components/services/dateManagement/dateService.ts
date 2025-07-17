import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit, HabitStatus } from '@/components/types/types';

export const formatDate = (date: Date): string => {
  const month = date.toLocaleDateString('es-ES', { month: 'long' }).toLowerCase();
  const year = date.getFullYear();
  return `${month} ${year}`;
};

export const getMonthName = (month: number): string => {
  return format(new Date(2000, month), 'MMM', { locale: es });
};

export const checkPastDayStatus = (
  selectedDate: Date,
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  updateHabitStatus: (habitIndex: number, date: string, status: string) => void
) => {
  // ... lógica existente de checkPastDayStatus
};

export const checkDayChange = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  updateHabitStatus: (habitIndex: number, date: string, status: string, options?: any) => void
) => {
  // ... lógica existente de checkDayChange
}; 