import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Habit } from '@/components/types/types';

interface HabitCompletedDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
}

export const HabitCompletedDialog: React.FC<HabitCompletedDialogProps> = ({
  isOpen,
  onOpenChange,
  habit
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¡Hábito Completado!</DialogTitle>
        </DialogHeader>
        <div>
          Has completado el hábito: {habit?.name}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 