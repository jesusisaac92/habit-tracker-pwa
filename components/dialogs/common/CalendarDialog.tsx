import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { MiniCalendar } from '@/components/ui/composite/calendar/MiniCalendar';
import { ViewNoteDialog } from '@/components/dialogs/common/ViewNoteDialog';
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { HabitStatusMap, HabitStatus, ViewingNote } from '@/components/types/types';
import { useTranslation } from 'react-i18next';

interface CalendarDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHabitIndex: number | null;
  currentDate: Date;
  habitStatus: Record<string, HabitStatus>;
  emotionNotes: Record<string, { emotion: string, note: string }>;
  onClose: () => void;
  onUpdateEmotionNotes: (notes: Record<string, { emotion: string, note: string }>) => void;
  emotions: { emoji: string, text: string }[];
  onUpdateHabitStatus: (habitIndex: number, date: string, status: HabitStatus['status']) => void;
  habit?: { startDate: string };
}

export function CalendarDialog({
  isOpen,
  onOpenChange,
  selectedHabitIndex,
  currentDate,
  habitStatus,
  emotionNotes,
  emotions,
  onClose,
  onUpdateEmotionNotes,
  onUpdateHabitStatus,
  habit,
}: CalendarDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [viewingNote, setViewingNote] = useState<ViewingNote | null>(null);
  const [isViewNoteDialogOpen, setIsViewNoteDialogOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      onClose();
    }
  };

  const handleViewNote = useCallback((habitIndex: number, date: string) => {
    const noteKey = `${habitIndex}-${date}`;
    const note = emotionNotes[noteKey];
    if (note) {
      setViewingNote({
        habitIndex,
        date,
        emotion: note.emotion,
        note: note.note
      });
      setIsViewNoteDialogOpen(true);
    }
  }, [emotionNotes]);

  const getStatusClass = (status: string): string => {
    const statusClasses = {
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      partial: 'bg-amber-100 text-amber-700 border-amber-200',
      'not-completed': 'bg-rose-100 text-rose-700 border-rose-200',
      default: 'bg-gray-50 text-gray-400 border-gray-100'
    };
    return statusClasses[status as keyof typeof statusClasses] || statusClasses.default;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[90vw] sm:max-w-[450px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
          <div className="max-h-[60vh] overflow-y-auto">
            {selectedHabitIndex !== null && (
              <MiniCalendar 
                habitIndex={selectedHabitIndex}
                currentDate={currentDate}
                habitStatus={habitStatus}
                emotionNotes={emotionNotes}
                onViewNote={handleViewNote}
                getStatusClass={getStatusClass}
                startDate={habit?.startDate || new Date().toISOString().split('T')[0]}
              />
            )}
          </div>
          <DialogFooter className="mt-4 flex justify-end">
            <Button onClick={() => handleOpenChange(false)} className="text-sm">
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </>
  );
}
