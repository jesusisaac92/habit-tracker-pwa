import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Task, ViewingNote, Emotion } from '../../types/types';
import { useTranslation } from 'next-i18next';
import { X } from 'lucide-react';

interface ViewNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  viewingNote: {
    title?: string;
    note?: string;
    emotion?: string;
  } | null;
  emotions: Emotion[];
  onEdit: () => void;
  task?: Task | null;
}

export const ViewNoteDialog: React.FC<ViewNoteDialogProps> = ({
  isOpen,
  onOpenChange,
  viewingNote,
  emotions,
  onEdit
}) => {
  const { t } = useTranslation();

  if (!viewingNote) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:w-[440px] p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg font-semibold">
            {viewingNote?.title}
          </DialogTitle>
          <div className="text-sm text-gray-500">
            {viewingNote?.note}
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};