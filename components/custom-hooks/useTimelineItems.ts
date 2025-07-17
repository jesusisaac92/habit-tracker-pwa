import { useMemo } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { useHabitStore } from '@/store/useHabitStore';
import { TimelineItem } from '@/components/types/types';
import { format } from 'date-fns';

export const useTimelineItems = (currentDate: Date) => {
  const { getFilteredTasks, tasks, forceRefresh } = useTaskStore();
  const { habits } = useHabitStore();

  const timelineItems = useMemo(() => {
    const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');
    const tasksForDate = getFilteredTasks(currentDate, '', false, true);

    // Filtrar y mapear tareas - ahora ya están filtradas por fecha
    const taskItems = tasksForDate
      .filter(task => {
        if (!task.due_date && !task.dueDate) {
          return false;
        }
        return true;
      })
      .map(task => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        time: task.time,
        color: task.color || '#3b82f6',
        label: task.label || undefined,
        note: task.note,
        completed: task.completed,
        priority: task.priority,
        dueDate: task.dueDate || task.due_date,
        created_at: task.created_at,
        time_exceptions: task.time_exceptions || {},
        recurring_exceptions: task.recurring_exceptions || {}
      }));

    // Filtrar y mapear hábitos
    const habitItems = habits
      .filter(habit => {
        const [year, month, day] = formattedCurrentDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        
        // Verificar si el hábito está programado para este día de la semana
        let isScheduledForToday = true;
        if (habit.selectedDays && habit.selectedDays.length > 0 && habit.selectedDays.length < 7) {
          isScheduledForToday = habit.selectedDays.includes(dayOfWeek);
        }
        
        // Verificar si la fecha está dentro del rango de fechas del hábito
        let isWithinDateRange = true;
        if (habit.startDate) {
          const [startYear, startMonth, startDay] = habit.startDate.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);
          if (date < startDate) {
            isWithinDateRange = false;
          }
        }
        
        if (!habit.isIndefinite && habit.endDate) {
          const [endYear, endMonth, endDay] = habit.endDate.split('-').map(Number);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          if (date > endDate) {
            isWithinDateRange = false;
          }
        }
        
        return isScheduledForToday && isWithinDateRange;
      })
      .map(habit => ({
        id: habit.id,
        type: 'habit' as const,
        title: habit.name,
        name: habit.name,
        time: habit.time,
        color: habit.color,
        selectedDays: habit.selectedDays,
        startDate: habit.startDate,
        endDate: habit.endDate,
        isIndefinite: habit.isIndefinite,
        time_exceptions: habit.time_exceptions || {}
      }));

    const allItems = [...taskItems, ...habitItems].filter(item => item.time);
    return allItems;
  }, [getFilteredTasks, currentDate, habits, tasks, forceRefresh]);

  return { timelineItems };
}; 