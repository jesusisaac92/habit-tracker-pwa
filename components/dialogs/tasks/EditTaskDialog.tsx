import React from 'react';
import { Task } from '../../types/types';
import { ExtendedTask } from '@/store/useTaskStore';
import { AddTaskDialog } from './AddTaskDialog';
import { format } from 'date-fns';

interface EditTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: ExtendedTask | null;
  onUpdateTask: (taskId: string, updates: Partial<ExtendedTask>) => void;
}

export const EditTaskDialog = ({ isOpen, onOpenChange, task, onUpdateTask }: EditTaskDialogProps) => {
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Primero notificar el cierre
      onOpenChange(false);
      // Dar tiempo al diálogo para cerrarse antes de limpiar
      requestAnimationFrame(() => {
        // Limpiar cualquier estado pendiente
      });
    }
  };

  const handleTaskUpdate = (updates: Omit<ExtendedTask, 'id' | 'createdAt'>) => {
    if (task) {
      onUpdateTask(task.id, {
        ...updates,
        time_exceptions: updates.time_exceptions || {},
        recurring_exceptions: updates.recurring_exceptions || {}
      });
      handleOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <AddTaskDialog
      key={`edit-${task.id}-${isOpen}`}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      onAddTask={handleTaskUpdate}
      selectedDate={new Date(task.dueDate || new Date())}
      initialTask={{
        ...task,
        dueDate: task.dueDate
      }}
    />
  );
}; 