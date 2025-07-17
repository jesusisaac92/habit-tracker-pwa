import React, { useState, useCallback, useEffect } from 'react';
import { CalendarDialog } from '@/components/dialogs/common/CalendarDialog';
import { HabitStatus } from '@/components/types/types';

interface CalendarDialogContainerProps {
  initialIsOpen: boolean;
  selectedHabitIndex: number | null;
  currentDate: Date;
  habitStatus: Record<string, HabitStatus>;
  emotionNotes: Record<string, { emotion: string, note: string }>;
  emotions: { emoji: string, text: string }[];
  onClose?: () => void; // Hacemos este prop opcional
  onUpdateHabitStatus: (habitIndex: number, date: string, status: HabitStatus['status']) => void;
  onUpdateEmotionNotes: (notes: Record<string, { emotion: string, note: string }>) => void;
}

export const CalendarDialogContainer: React.FC<CalendarDialogContainerProps> = ({
  initialIsOpen,
  selectedHabitIndex,
  currentDate,
  habitStatus,
  emotionNotes,
  emotions,
  onClose,
  onUpdateHabitStatus,
  onUpdateEmotionNotes
}) => {
  const [isOpen, setIsOpen] = useState(initialIsOpen);

  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      handleClose();
    }
  }, [handleClose]);

  const handleUpdateHabitStatus = useCallback((habitIndex: number, date: string, status: HabitStatus['status']) => {
    onUpdateHabitStatus(habitIndex, date, status);
  }, [onUpdateHabitStatus]);

  const handleUpdateEmotionNotes = useCallback((newEmotionNotes: Record<string, { emotion: string, note: string }>) => {
    onUpdateEmotionNotes(newEmotionNotes);
  }, [onUpdateEmotionNotes]);

  if (selectedHabitIndex === null) return null;

  return (
    <CalendarDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      selectedHabitIndex={selectedHabitIndex}
      currentDate={currentDate}
      habitStatus={habitStatus}
      emotionNotes={emotionNotes}
      onClose={handleClose}
      onUpdateEmotionNotes={handleUpdateEmotionNotes}
      emotions={emotions}
      onUpdateHabitStatus={handleUpdateHabitStatus}
    />
  );
};
