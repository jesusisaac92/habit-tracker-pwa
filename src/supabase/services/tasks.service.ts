import { supabase } from '../config/client'
import { Task } from '../types/database.types'

export const tasksService = {
  createTask: async (task: Omit<Task, 'id' | 'created_at'>) => {
    try {
      console.log('🎨 ===== SERVICE: createTask DEBUG =====');
      console.log('📝 Task recibida:', task.title);
      console.log('🎨 Color recibido en servicio:', task.color);
      console.log('🏷️ Label ID:', task.label_id);
      console.log('🌈 Custom label color:', task.custom_label_color);
      
      const safeTask = {
        ...task,
        custom_label_name: task.custom_label_name === null ? '' : (task.custom_label_name || ''),
        custom_label_color: task.custom_label_color === null ? '' : (task.custom_label_color || ''),
        recurring_dates: task.recurring_dates === null ? [] : (task.recurring_dates || []),
        note: task.note === null ? '' : (task.note || ''),
        time: task.time === null ? '' : (task.time || ''),
        color: task.color || '#3b82f6', // 🔧 CORRECCIÓN: Usar color por defecto en lugar de cadena vacía
        label_id: task.label_id === null ? '' : (task.label_id || '')
      };

      console.log('🎨 Color final para DB:', safeTask.color);
      console.log('🎨 =====================================');

      const { data, error } = await supabase
        .from('tasks')
        .insert([safeTask])
        .select();

      if (error) {
        throw error;
      }
      return data?.[0];
    } catch (error) {
      return null;
    }
  },

  getTasks: async (userId: string) => {
    if (!userId) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data;
    } catch (error) {
      return [];
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    try {
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!currentTask) throw new Error('Task not found');

      const timeExceptions = {
        ...currentTask.time_exceptions,
        ...(updates.time_exceptions || {})
      };

      const recurringExceptions = {
        ...currentTask.recurring_exceptions,
        ...(updates.recurring_exceptions || {})
      };

      const updateData = {
        ...updates,
        time_exceptions: timeExceptions,
        recurring_exceptions: recurringExceptions,
        recurring_dates: updates.recurring_dates || currentTask.recurring_dates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      return null;
    }
  },

  deleteTask: async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  toggleTaskCompletion: async (taskId: string, userId: string, date: string, isCompleted: boolean) => {
    try {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!taskData) throw new Error('Tarea no encontrada');

      const exceptions = taskData.recurring_exceptions || {};
      exceptions[date] = {
        ...exceptions[date],
        completed: isCompleted
      };

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          recurring_exceptions: exceptions,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      if (isCompleted) {
        await supabase
          .from('task_completions')
          .insert({
            task_id: taskId,
            user_id: userId,
            completion_date: date,
            is_completed: true
          });
      } else {
        await supabase
          .from('task_completions')
          .delete()
          .match({ task_id: taskId, completion_date: date });
      }

      return true;
    } catch (error) {
      return null;
    }
  },

  getTaskCompletions: async (userId: string, startDate: string, endDate: string) => {
    try {
      const { data, error } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate);

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }
} 