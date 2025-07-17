import React, { useCallback } from 'react';
import { useHabitStore } from '@/store/useHabitStore';
import { updateHabitInDB } from '@/src/supabase/services/habit.service';
import { DayTimelineDialog } from '../components/dialogs/tasks/DayTimelineDialog';

const Calendar = () => {
  const habitStore = useHabitStore();

  const handleHabitUpdate = async (habitId: string, updates: Partial<Habit>) => {
    // Actualizar en la base de datos
    await updateHabitInDB(habitId, updates);
    // Actualizar en el store
    habitStore.updateHabit(habitId, updates);
  };

  return (
    <DayTimelineDialog
      // ... otras props
      onUpdateHabit={handleHabitUpdate}
    />
  );
};

export default Calendar; 