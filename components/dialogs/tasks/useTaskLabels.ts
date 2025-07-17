import { useState, useEffect } from 'react';
import { TaskLabel } from '../../types/types';
import { useTranslation } from 'react-i18next';
import { useLabelsStore } from '@/store/useLabelsStore';

export const useTaskLabels = () => {
  const { t } = useTranslation();
  const { labels, addLabel, updateLabel, deleteLabel } = useLabelsStore();
  
  // Cargar etiquetas al montar el componente
  useEffect(() => {
    // Función asíncrona para cargar etiquetas
    const loadLabels = async () => {
      try {
        await useLabelsStore.getState().updateLabels();
      } catch (error) {
        console.error('Error loading labels:', error);
      }
    };
    
    loadLabels();
  }, []);

  // Función para agregar una etiqueta personalizada
  const addCustomLabel = async (name: string, color: string) => {
    try {
      const newLabel: TaskLabel = {
        id: `custom-${Date.now()}`, // Temporal, será reemplazado por Supabase
        name,
        color,
        isCustom: true
      };
      
      await addLabel(newLabel);
      return newLabel;
    } catch (error) {
      console.error('Error adding custom label:', error);
      return null;
    }
  };

  // Función wrapper para eliminar etiqueta
  const deleteCustomLabel = async (labelId: string) => {
    try {
      await deleteLabel(labelId);
    } catch (error) {
      console.error('Error deleting label:', error);
    }
  };

  // Función wrapper para actualizar etiqueta
  const updateCustomLabel = async (labelId: string, updates: Partial<TaskLabel>) => {
    try {
      await updateLabel(labelId, updates);
    } catch (error) {
      console.error('Error updating label:', error);
    }
  };

  return {
    labels,
    addCustomLabel,
    updateLabel: updateCustomLabel,
    deleteCustomLabel,
    defaultLabels: labels.filter((label: TaskLabel) => !label.isCustom)
  };
}; 