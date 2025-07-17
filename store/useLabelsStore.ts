import create from 'zustand';
import type { SetState, GetState } from 'zustand';
import { TaskLabel } from '@/components/types/types';
import { DEFAULT_TASK_LABELS } from '@/components/types/defaultLabels';
import { labelsService } from '@/src/supabase/services/labels.service';
import { supabase } from '@/src/supabase/config/client';

interface LabelsStore {
  labels: TaskLabel[];
  updateLabels: () => Promise<void>;
  addLabel: (label: TaskLabel) => Promise<void>;
  deleteLabel: (labelId: string) => Promise<void>;
  updateLabel: (labelId: string, updates: Partial<TaskLabel>) => Promise<void>;
}

export const useLabelsStore = create<LabelsStore>((set: SetState<LabelsStore>, get: GetState<LabelsStore>) => ({
  labels: [...DEFAULT_TASK_LABELS],
  
  updateLabels: async () => {
    try {
      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ labels: [...DEFAULT_TASK_LABELS] });
        return;
      }

      // Cargar etiquetas desde Supabase
      const result = await labelsService.getLabels(user.id);
      
      if (result.success && result.data) {
        // Convertir etiquetas de Supabase al formato TaskLabel
        const supabaseLabels: TaskLabel[] = result.data.map(label => ({
          id: label.id,
          name: label.name,
          color: label.color,
          isCustom: label.is_custom
        }));
        
        // Combinar etiquetas por defecto con las de Supabase
        set({ labels: [...DEFAULT_TASK_LABELS, ...supabaseLabels] });
      } else {
        // Fallback: intentar cargar desde localStorage
        const storedLabels = localStorage.getItem('customLabels');
        if (storedLabels) {
          const customLabels = JSON.parse(storedLabels) as TaskLabel[];
          set({ labels: [...DEFAULT_TASK_LABELS, ...customLabels] });
        } else {
          set({ labels: [...DEFAULT_TASK_LABELS] });
        }
      }
    } catch (error) {
      // Fallback: usar localStorage
      const storedLabels = localStorage.getItem('customLabels');
      if (storedLabels) {
        const customLabels = JSON.parse(storedLabels) as TaskLabel[];
        set({ labels: [...DEFAULT_TASK_LABELS, ...customLabels] });
      } else {
        set({ labels: [...DEFAULT_TASK_LABELS] });
      }
    }
  },

  addLabel: async (label: TaskLabel) => {
    try {
      // Obtener usuario autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { labels } = get();
      
      // Verificar si ya existe una etiqueta con el mismo nombre
      const existingLabel = labels.find(l => l.name === label.name && l.isCustom);
      if (existingLabel) {
        return;
      }

      // Crear etiqueta en Supabase
      const result = await labelsService.createLabel(user.id, {
        name: label.name,
        color: label.color
      });

      if (result.success && result.data) {
        // Crear la etiqueta en formato TaskLabel
        const newLabel: TaskLabel = {
          id: result.data.id,
          name: result.data.name,
          color: result.data.color,
          isCustom: result.data.is_custom
        };
        
        // Actualizar el estado local
        set({ labels: [...labels, newLabel] });
      } else {
        // Fallback: guardar en localStorage
        const storedLabels = localStorage.getItem('customLabels');
        const currentCustomLabels = storedLabels ? JSON.parse(storedLabels) : [];
        const updatedCustomLabels = [...currentCustomLabels, label];
        localStorage.setItem('customLabels', JSON.stringify(updatedCustomLabels));
        set({ labels: [...labels, label] });
      }
    } catch (error) {
      // Fallback: usar localStorage
      const { labels } = get();
      const storedLabels = localStorage.getItem('customLabels');
      const currentCustomLabels = storedLabels ? JSON.parse(storedLabels) : [];
      const updatedCustomLabels = [...currentCustomLabels, label];
      localStorage.setItem('customLabels', JSON.stringify(updatedCustomLabels));
      set({ labels: [...labels, label] });
    }
  },

  deleteLabel: async (labelId: string) => {
    try {
      const { labels } = get();
      
      // Si es una etiqueta con prefijo 'custom-', usar localStorage (legacy)
      if (labelId.startsWith('custom-')) {
        const storedLabels = localStorage.getItem('customLabels');
        if (storedLabels) {
          const customLabels = JSON.parse(storedLabels);
          const updatedLabels = customLabels.filter((label: any) => label.id !== labelId);
          localStorage.setItem('customLabels', JSON.stringify(updatedLabels));
        }
        
        // También actualizar el estado local
        const updatedLabels = labels.filter((label: TaskLabel) => label.id !== labelId);
        set({ labels: updatedLabels });
        return;
      }

      // Para etiquetas de Supabase, eliminar de la base de datos
      const result = await labelsService.deleteLabel(labelId);
      
      if (result.success) {
        // Actualizar el estado local
        const updatedLabels = labels.filter((label: TaskLabel) => label.id !== labelId);
        set({ labels: updatedLabels });
      } else {
        // Fallback: al menos actualizar el estado local
        const updatedLabels = labels.filter((label: TaskLabel) => label.id !== labelId);
        set({ labels: updatedLabels });
      }
    } catch (error) {
      // Fallback: actualizar solo el estado local
      const { labels } = get();
      const updatedLabels = labels.filter((label: TaskLabel) => label.id !== labelId);
      set({ labels: updatedLabels });
    }
  },

  updateLabel: async (labelId: string, updates: Partial<TaskLabel>) => {
    try {
      const { labels } = get();
      
      // Si es una etiqueta con prefijo 'custom-', usar localStorage (legacy)
      if (labelId.startsWith('custom-')) {
        const updatedLabels = labels.map((label: TaskLabel) => 
          label.id === labelId ? { ...label, ...updates } : label
        );
        set({ labels: updatedLabels });
        
        const customLabels = updatedLabels.filter((label: TaskLabel) => label.isCustom);
        localStorage.setItem('customLabels', JSON.stringify(customLabels));
        return;
      }

      // Para etiquetas de Supabase, actualizar en la base de datos
      const result = await labelsService.updateLabel(labelId, {
        name: updates.name,
        color: updates.color
      });
      
      if (result.success && result.data) {
        // result.data es un array, tomar el primer elemento
        const updatedData = Array.isArray(result.data) ? result.data[0] : result.data;
        
        // Actualizar el estado local
        const updatedLabels = labels.map((label: TaskLabel) => 
          label.id === labelId ? { 
            ...label, 
            name: updatedData.name,
            color: updatedData.color
          } : label
        );
        set({ labels: updatedLabels });
      } else {
        // Fallback: actualizar solo el estado local
        const updatedLabels = labels.map((label: TaskLabel) => 
          label.id === labelId ? { ...label, ...updates } : label
        );
        set({ labels: updatedLabels });
      }
    } catch (error) {
      // Fallback: actualizar solo el estado local
      const { labels } = get();
      const updatedLabels = labels.map((label: TaskLabel) => 
        label.id === labelId ? { ...label, ...updates } : label
      );
      set({ labels: updatedLabels });
    }
  }
})); 