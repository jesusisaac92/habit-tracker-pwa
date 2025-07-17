import { supabase } from '../config/client';
import { TaskLabel } from '@/components/types/types';

export const labelsService = {
  createLabel: async (userId: string, label: { name: string; color: string }) => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .insert([{
          user_id: userId,
          name: label.name,
          color: label.color,
          is_custom: true
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating label:', error);
      return { success: false, error };
    }
  },

  getLabels: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error getting labels:', error);
      return { success: false, error };
    }
  },

  deleteLabel: async (labelId: string) => {
    try {
      if (labelId.startsWith('custom-')) {
        const storedLabels = localStorage.getItem('customLabels');
        if (storedLabels) {
          const labels = JSON.parse(storedLabels);
          const updatedLabels = labels.filter((label: any) => label.id !== labelId);
          localStorage.setItem('customLabels', JSON.stringify(updatedLabels));
        }
        return { success: true };
      }

      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', labelId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting label:', error);
      return { success: false, error };
    }
  },

  updateLabel: async (labelId: string, updates: Partial<TaskLabel>) => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', labelId)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating label:', error);
      return { success: false, error };
    }
  }
}; 