import create from 'zustand';
import { Habit, Difficulty } from '@/components/types/types';
import { habitService } from '@/src/supabase/services/habit.service';
import { supabase } from '@/src/supabase/config/client';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { getCompletedHabits } from '@/src/supabase/services/habitCompletion.service';

// Función auxiliar para cargar hábitos desde el caché
const loadHabitsFromCache = () => {
  try {
    const cachedHabits = localStorage.getItem('cachedHabits');
    if (cachedHabits) {
      return JSON.parse(cachedHabits);
    }
  } catch (e) {
    // Silent error handling
  }
  return null;
};

// Exportar la interfaz
export interface HabitStore {
  habits: Habit[];
  getHabitStatus: (key: string) => string;
  habitStatus: Record<string, { status: string }>;
  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  deleteHabit: (habitId: string | number) => Promise<void>;
  initializeHabits: () => Promise<void>;
  updateHabit: (habitId: string, updatedHabit: Partial<Habit>) => Promise<{
    success: boolean;
    error?: string;
  }>;
  clearHabits: () => void;
  completedHabits: Record<string, Record<string, boolean>>;
  setCompletedHabit: (userId: string, habitId: string, date: string, completed: boolean) => void;
  isHabitCompleted: (userId: string, habitId: string, date: string) => boolean;
  isLoadingCompletions: boolean;
  setIsLoadingCompletions: (loading: boolean) => void;
  initializeCompletions: (userId: string, date: Date) => Promise<void>;
  updateHabitStatus: (statusKey: string, status: string) => void;
  updateHabitTime: (habitId: string, newTime: string, date: string) => void;
}

export const useHabitStore = create<HabitStore>((set, get) => ({
  habits: [],
  getHabitStatus: (key: string) => get().habitStatus[key]?.status || '',
  habitStatus: {},
  setHabits: (habits) => set({ 
    habits: Array.isArray(habits) ? habits : [] 
  }),
  addHabit: (habit) => set((state) => ({
    habits: [...(state.habits || []), {
      ...habit,
      id: String(habit.id),
      supabase_id: habit.supabase_id ? String(habit.supabase_id) : String(habit.id)
    }]
  })),
  deleteHabit: async (habitId) => {
    try {
      const result = await habitService.deleteHabit(habitId.toString());
      
      if (result.success) {
        set((state) => ({
          habits: state.habits.filter(habit => 
            habit.id.toString() !== habitId.toString() && 
            habit.supabase_id !== habitId.toString()
          )
        }));
        
        localStorage.removeItem('habits');
        localStorage.removeItem('habitStatus');
        localStorage.removeItem('habitIds');
      }
    } catch (error) {
      // Silent error handling
    }
  },
  initializeHabits: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ habits: [] });
        return;
      }

      const { data: habits, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const transformedHabits = habits?.map((habit, index) => {
        let startDate = habit.start_date;
        if (startDate && startDate.includes('T')) {
          startDate = startDate.split('T')[0];
        }
        
        let endDate = habit.end_date;
        if (endDate && endDate.includes('T')) {
          endDate = endDate.split('T')[0];
        }

        const timeExceptions = habit.time_exceptions || {};

        return {
          id: habit.id,
          index: index,
          name: habit.title,
          description: habit.description || '',
          time: habit.time,
          startDate: startDate,
          endDate: endDate || undefined,
          isIndefinite: habit.is_indefinite,
          noSpecificTime: habit.no_specific_time,
          selectedDays: habit.selected_days,
          color: habit.color,
          icon: habit.icon,
          currentStreak: habit.current_streak,
          record: habit.record,
          difficulty: 'medium' as Difficulty,
          timeObjective: "indefinite" as const,
          objectiveHistory: [],
          currentObjective: {
            startDate: new Date().toISOString(),
            endDate: undefined,
            target: 0,
            progress: 0,
            isCompleted: false,
            timeObjective: 0,
            completed: false
          },
          supabase_id: habit.id,
          completedDates: [],
          type: "habit" as const,
          getColor: () => habit.color,
          time_exceptions: timeExceptions
        };
      }) || [];

      set({ habits: transformedHabits });

    } catch (error) {
      // Silent error handling
      throw error;
    }
  },
  updateHabit: async (habitId: string, updatedHabit: Partial<Habit>) => {
    try {
      const result = await habitService.updateHabit(habitId, updatedHabit);
      
      if (result.success) {
        set((state) => {
          const newHabits = state.habits.map(habit => {
            if (habit.id.toString() === habitId.toString()) {
              return {
                ...habit,
                ...updatedHabit
              };
            }
            return habit;
          });
          
          return { habits: newHabits };
        });
        
        return { success: true };
      }
      
      return { success: false, error: String(result.error) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
  clearHabits: () => {
    set({ habits: [], habitStatus: {} });
  },
  completedHabits: {},
  setCompletedHabit: (userId: string, habitId: string, date: string, completed: boolean) => {
    // Removed debug log
    
    set(state => {
      const userCompletions = state.completedHabits[userId] || {};
      const key = `${habitId}-${date}`;
      
      const updatedCompletions = {
        ...state.completedHabits,
        [userId]: {
          ...userCompletions,
          [key]: completed
        }
      };
      
      // Removed debug log
      
      // Forzar actualización en localStorage
      try {
        localStorage.setItem('completedHabitsCache', JSON.stringify(updatedCompletions));
      } catch (e) {
        console.error('Error guardando en localStorage:', e);
      }
      
      return {
        completedHabits: updatedCompletions
      };
    });
  },
  isHabitCompleted: (userId: string, habitId: string, date: string) => {
    const userCompletions = get().completedHabits[userId] || {};
    const key = `${habitId}-${date}`;
    const isCompleted = !!userCompletions[key];
    
    // Removed debug log
    
    return isCompleted;
  },
  isLoadingCompletions: true,
  setIsLoadingCompletions: (loading: boolean) => set({ isLoadingCompletions: loading }),
  initializeCompletions: async (userId: string, date: Date) => {
    if (!userId) return;
    
    set({ isLoadingCompletions: true });
    const startDate = startOfWeek(date);
    const endDate = endOfWeek(date);
    
    try {
      const promises = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = format(d, 'yyyy-MM-dd');
        promises.push(getCompletedHabits(userId, dateString));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(({ success, data }, index) => {
        if (success && data) {
          const dateString = format(new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
          data.forEach(item => {
            get().setCompletedHabit(userId, item.habit_id, dateString, true);
          });
        }
      });
    } catch (error) {
      // Silent error handling
    } finally {
      set({ isLoadingCompletions: false });
    }
  },
  updateHabitStatus: (statusKey: string, status: string) => {
    set((state) => ({
      habitStatus: {
        ...state.habitStatus,
        [statusKey]: { status }
      }
    }));
  },
  updateHabitTime: (habitId: string, newTime: string, date: string) => {
    set(state => {
      const habits = [...state.habits];
      const habitIndex = habits.findIndex(h => String(h.id) === habitId);
      
      if (habitIndex !== -1) {
        const updatedHabit = {...habits[habitIndex]};
        
        if (date) {
          if (!updatedHabit.time_exceptions) {
            updatedHabit.time_exceptions = {};
          }
          
          updatedHabit.time_exceptions[date] = {
            ...(updatedHabit.time_exceptions[date] || {}),
            time: newTime
          };
        } else {
          updatedHabit.time = newTime;
        }
        
        habits[habitIndex] = updatedHabit;
        return { ...state, habits };
      }
      
      return state;
    });
  }
}));

