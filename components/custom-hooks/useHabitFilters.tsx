import { useEffect, useState } from 'react';
import type { Habit } from '../types/types';
import { filterVisibleHabits, filterHabitsByDay } from '@/components/services/habitFilters/habitDateFilters';
import { ErrorService } from '@/components/services/errorManagement/errorService';
import { useToast } from '@/components/ui/providers/toast/use-toast';

interface UseHabitFiltersProps {
  habits: Habit[];
  currentDate: Date;
}

export const useHabitFilters = ({ habits, currentDate }: UseHabitFiltersProps) => {
  const [visibleHabits, setVisibleHabits] = useState<Habit[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    try {
      // Filtrar por fecha (inicio/fin)
      const filteredByDate = filterVisibleHabits(habits, currentDate);
      
      // Filtrar por día de la semana
      const filteredByDay = filterHabitsByDay(filteredByDate, currentDate);
      
      setVisibleHabits(filteredByDay);
    } catch (error) {
      const { title, description, variant } = ErrorService.handleError(error as Error, 'HabitFiltering');
      toast({ 
        title, 
        description, 
        variant 
      });
    }
  }, [habits, currentDate, toast]);

  return { visibleHabits };
}; 