import { Habit, HabitStatus } from '@/components/types/types';

export const generatePreviousMonthData = (
  currentDate: Date,
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>
): Array<{
  day: number;
  points: number;
  status: string;
  time: string;
}> => {
  const previousDate = new Date(currentDate);
  previousDate.setMonth(previousDate.getMonth() - 1);
  
  const daysInPreviousMonth = new Date(
    previousDate.getFullYear(),
    previousDate.getMonth() + 1,
    0
  ).getDate();

  const pointsPerDay = 100 / daysInPreviousMonth;
  let accumulatedPoints = 0;
  
  return Array.from({ length: daysInPreviousMonth }, (_, index) => {
    const day = index + 1;
    const dateStr = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const isCompleted = habits.some(habit => 
      habitStatus[`${habit.index}-${dateStr}`]?.status === 'completed'
    );

    if (isCompleted) {
      accumulatedPoints += pointsPerDay;
    }

    return {
      day,
      points: Math.round(accumulatedPoints * 100) / 100,
      status: isCompleted ? 'completed' : 'not-completed',
      time: ''
    };
  });
}; 