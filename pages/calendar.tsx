import React, { useCallback } from 'react';
import { useHabitStore } from '@/store/useHabitStore';
import { updateHabit } from '@/src/supabase/services/habit.service';
import { DayTimelineDialog } from '../components/dialogs/tasks/DayTimelineDialog';
import { Habit } from '@/components/types/types';

const Calendar = () => {
  const habitStore = useHabitStore();

  const handleHabitUpdate = async (habitId: string, updates: Partial<Habit>) => {
    // Actualizar en la base de datos
    await updateHabit(habitId, updates);
    // Actualizar en el store
    habitStore.updateHabit(habitId, updates);
  };

  return (
    <DayTimelineDialog
      isOpen={true}
      onOpenChange={() => {}}
      date={new Date()}
      onUpdateTask={() => {}}
      onDelete={async () => {}}
      habits={[]}
      onUpdateHabit={handleHabitUpdate}
      habitStatus={{}}
      taskLabels={[]}
    />
  );
};

export default Calendar; 