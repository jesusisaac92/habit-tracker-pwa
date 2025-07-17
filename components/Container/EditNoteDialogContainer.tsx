import React, { useState, useCallback, useEffect } from 'react';
import { EditNoteDialog } from '@/components/dialogs/EditNoteDialog';
import { HabitStatus, Emotion } from '@/components/types/types';

interface EditNoteDialogContainerProps {
  initialIsOpen: boolean;
  selectedEmotion: string | null;  // Permitir null
  emotions: Emotion[];
  noteText: string;
  editingNoteKey: string;  // No permitir null
  habitStatus: Record<string, HabitStatus>;
  tempHabitIndex: number;  // No permitir null
  onEmotionSelect: (emotion: string) => void;
  onNoteTextChange: (text: string) => void;
  onDeleteNote: () => void;
  onEditSubmit: (editedNote: { emotion: string; note: string }) => void;
  onMarkDay: (habitIndex: number, date: string, status: HabitStatus['status']) => void;
  onOpenChange?: (open: boolean) => void;
  isEditing?: boolean;
}

export const EditNoteDialogContainer = ({
  initialIsOpen,
  selectedEmotion,
  emotions,
  noteText,
  editingNoteKey,
  habitStatus,
  tempHabitIndex,
  onEmotionSelect,
  onNoteTextChange,
  onDeleteNote,
  onEditSubmit,
  onMarkDay,
  onOpenChange,
  isEditing = false
}: EditNoteDialogContainerProps) => {
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const [isOpen, setIsOpen] = useState(initialIsOpen);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onOpenChange?.(false);
    }
  }, [onOpenChange]);

  const handleEdit = useCallback((editedNote: { emotion: string; note: string }) => {
    onEditSubmit(editedNote);
  }, [onEditSubmit]);

  const handleUpdateStatus = useCallback((
    habitIndex: number,
    date: string,
    status: HabitStatus['status']
  ) => {
    onMarkDay(habitIndex, date, status);
  }, [onMarkDay]);

  return (
    <EditNoteDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      viewingNote={{
        habitIndex: tempHabitIndex,
        date: editingNoteKey.split('-')[1],
        emotion: selectedEmotion || emotions[0]?.emoji || '😊',
        note: noteText
      }}
      emotions={emotions.filter(emotion => emotion.emoji)}
      habitStatus={habitStatus}
      onEdit={handleEdit}
      onDelete={onDeleteNote}
      onMarkDay={handleUpdateStatus}
      onEmotionSelect={onEmotionSelect}
      onNoteTextChange={onNoteTextChange}
      isEditing={isEditing}
    />
  );
};
