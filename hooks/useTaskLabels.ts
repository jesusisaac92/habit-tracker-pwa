import { useState } from 'react';
import { TaskLabel, taskLabels as defaultLabels } from '@/components/types/types';

export const useTaskLabels = () => {
  const [labels, setLabels] = useState<TaskLabel[]>(defaultLabels);

  const updateLabels = (newLabels: TaskLabel[]) => {
    setLabels(newLabels);
  };

  return {
    labels,
    updateLabels
  };
}; 