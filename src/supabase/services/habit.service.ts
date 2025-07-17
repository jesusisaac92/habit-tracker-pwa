import { supabase } from '../config/client';
import { Habit } from '@/components/types/types';

// Interfaz para los datos del hábito en Supabase
interface HabitData {
  user_id: string;
  title: string;
  description: string | null;
  time: string | null;
  start_date: string;
  end_date: string | null;
  is_indefinite: boolean;
  no_specific_time: boolean;
  selected_days: number[];
  color: string;
  icon: string;
  current_streak: number;
  record: number;
}

// Definir una interfaz para los hábitos almacenados en localStorage
interface LocalHabit {
  id: string | number;
  index: number;
  name: string;
  // Otras propiedades que pueda tener el hábito
}

export const habitService = {
  // Crear un nuevo hábito
  async createHabit(userId: string, habit: Omit<Habit, "id" | "index">): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      const habitData: HabitData = {
        user_id: userId,
        title: habit.name,
        description: habit.description || null,
        time: habit.time,
        start_date: habit.startDate,
        end_date: habit.isIndefinite ? null : habit.endDate || null,
        is_indefinite: habit.isIndefinite,
        no_specific_time: habit.noSpecificTime,
        selected_days: habit.selectedDays,
        color: habit.color,
        icon: habit.icon,
        current_streak: 0,
        record: 0
      };

      const { data, error } = await supabase
        .from('habits')
        .insert(habitData)
        .select('*')
        .single();

      if (error) {
        return { success: false, error };
      }

      try {
        const localToRemoteIds = JSON.parse(localStorage.getItem('habitIds') || '{}');
        localToRemoteIds[data.id] = data.id;
        localStorage.setItem('habitIds', JSON.stringify(localToRemoteIds));
      } catch (e) {
        // Silent error handling
      }

      return { 
        success: true, 
        data: {
          ...habit,
          id: data.id,
          supabase_id: data.id
        }
      };
    } catch (error) {
      return { success: false, error };
    }
  },
  
  // Obtener todos los hábitos de un usuario
  async getHabits(userId: string | null | undefined): Promise<{ success: boolean; data?: any; error?: any }> {
    if (!userId) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }
    
    try {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return { success: false, error };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  async deleteHabit(habitId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No hay usuario autenticado' };
      }

      const { data: habit } = await supabase
        .from('habits')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('id', habitId)
        .single();

      if (!habit) {
        return { success: false, error: 'Hábito no encontrado' };
      }

      const habitName = habit.title;

      const { error } = await supabase
        .from('habits')
        .delete()
        .match({ 
          id: habit.id,
          user_id: user.id 
        });

      if (error) {
        return { success: false, error };
      }

      try {
        const { cleanupChartDataForDeletedHabit } = await import('./habitCharts.service');
        await cleanupChartDataForDeletedHabit(user.id, habitName);
      } catch (cleanupError) {
        // Silent error handling
      }

      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  async updateHabit(habitId: string, updates: Partial<Habit>) {
    try {
      const dbUpdates = {
        title: updates.name,
        description: updates.description,
        time: updates.time,
        start_date: updates.startDate,
        end_date: updates.endDate,
        is_indefinite: updates.isIndefinite,
        no_specific_time: updates.noSpecificTime,
        selected_days: updates.selectedDays,
        color: updates.color,
        icon: updates.icon,
        time_exceptions: updates.time_exceptions,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('habits')
        .update(dbUpdates)
        .eq('id', habitId)
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  async updateHabitTimeException(habitId: string, date: string, time: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      const { data: habits, error: fetchError } = await supabase
        .from('habits')
        .select('id, time_exceptions')
        .eq('user_id', user.id);
      
      if (fetchError) {
        return { success: false, error: fetchError };
      }
      
      const habit = habits.find(h => String(h.id) === String(habitId));
      
      if (!habit) {
        return { success: false, error: 'Hábito no encontrado' };
      }
      
      const timeExceptions = habit.time_exceptions || {};
      timeExceptions[date] = {
        ...timeExceptions[date],
        time: time
      };
      
      const { error } = await supabase
        .from('habits')
        .update({ time_exceptions: timeExceptions })
        .eq('id', habit.id)
        .eq('user_id', user.id);
      
      if (error) {
        return { success: false, error };
      }

      return { success: true, data: timeExceptions };
    } catch (error) {
      return { success: false, error };
    }
  }
};

export const { createHabit, getHabits, deleteHabit, updateHabit } = habitService; 