import { Habit, HabitStatus } from '@/components/types/types';
import { format } from 'date-fns';

type UpdateHabitStatusFn = (
  habitIndex: number,
  date: string,
  status: HabitStatus['status'],
  options?: { time?: string; points?: number; }
) => void;

export class StatusEffectsService {
  // Verificar cambios de día y actualizar estados
  static checkDayChange(
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    updateHabitStatus: UpdateHabitStatusFn
  ) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    habits.forEach(habit => {
      const key = `${habit.index}-${yesterdayStr}`;
      const habitStartDate = new Date(habit.startDate || new Date());
      
      if (habitStartDate <= yesterday && !habitStatus[key]) {
        updateHabitStatus(
          habit.index,
          yesterdayStr,
          '',
          {
            time: '23:59',
            points: -1.5
          }
        );
      }
    });
  } 

  // Verificar estados de días pasados
  static checkPastDayStatus(
    currentDate: Date,
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    updateHabitStatus: UpdateHabitStatusFn
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateTime = new Date(currentDate);
    selectedDateTime.setHours(0, 0, 0, 0);

    if (selectedDateTime >= today) return;

    habits.forEach(habit => {
      const habitStartDate = new Date(habit.startDate || new Date());
      habitStartDate.setHours(0, 0, 0, 0);
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      if (selectedDateTime >= habitStartDate && 
          selectedDateTime < today && 
          !habitStatus[`${habit.index}-${dateStr}`]) {
        updateHabitStatus(habit.index, dateStr, '');
      }
    });
  }

  // Programar verificaciones periódicas
  static scheduleStatusChecks(callback: () => void) {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        callback();
      }
    }, 60000);

    return () => clearInterval(interval);
  }
}
