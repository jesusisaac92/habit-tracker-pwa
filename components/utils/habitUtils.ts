import { Task, Habit } from '@/components/types/types';

export const convertHabitToTask = (habit: Habit): Task => {
  return {
    id: `habit-${habit.id}`, // Asegurarnos de que el ID sea string
    type: 'task',
    title: habit.name,
    priority: 'medium',
    dueDate: habit.startDate,
    createdAt: habit.startDate,
    time: habit.time,
    completed: habit.completed,
    completedAt: habit.completedAt,
    getColor: () => habit.color,
    label: {
      id: 'habit',
      name: 'Hábito',
      color: habit.color
    }
  };  
};   