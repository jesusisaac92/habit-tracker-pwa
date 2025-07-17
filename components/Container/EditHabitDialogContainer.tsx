import React, { useState, useCallback, useEffect } from 'react';
import { EditHabitDialog } from '@/components/dialogs/habits/EditHabitDialog';
import { Habit, Difficulty, EditingHabit } from '@/components/types/types';

interface EditHabitDialogContainerProps {
  initialIsOpen: boolean;
  initialEditingHabit: EditingHabit | null;
  onSave: (editedHabit: EditingHabit) => void;
  onClose?: () => void;
}

export const EditHabitDialogContainer: React.FC<EditHabitDialogContainerProps> = ({
  initialIsOpen,
  initialEditingHabit,
  onSave,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [editingHabit, setEditingHabit] = useState<EditingHabit | null>(initialEditingHabit);

  useEffect(() => {
    setIsOpen(initialIsOpen);
    setEditingHabit(initialEditingHabit);
  }, [initialIsOpen, initialEditingHabit]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setEditingHabit(null);
      onClose?.();
    }
  }, [onClose]);

  const handleSetEditingHabit = useCallback((updatedHabit: React.SetStateAction<EditingHabit | null>) => {
    setEditingHabit(updatedHabit);
  }, []);

  const handleSaveEditedHabit = useCallback((editedHabit: EditingHabit) => {
    if (!editedHabit || editedHabit.index === undefined) return;
    onSave(editedHabit);
    setIsOpen(false);
    setEditingHabit(null);
  }, [onSave]);

  const mapToDifficulty = useCallback((value: string): Difficulty => {
    switch (value.toLowerCase()) {
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      case 'hard': return 'hard';
      default: return 'medium';
    }
  }, []);

  return (
    <EditHabitDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      editingHabit={editingHabit}
      setEditingHabit={handleSetEditingHabit}
      onSave={handleSaveEditedHabit}
      mapToDifficulty={mapToDifficulty}
    />
  );
};