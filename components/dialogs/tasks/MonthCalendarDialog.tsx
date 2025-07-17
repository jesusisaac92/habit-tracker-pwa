import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { X } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Task, Habit } from '@/components/types/types';
import { MonthCalendarView } from "@/components/ui/composite/calendar/MonthCalendarView";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeDate } from '@/utils/dateUtils';
import { useHabitStore } from '@/store/useHabitStore';

interface MonthCalendarDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  selectedDate: Date;
  onDateSelect: (date: Date, isMonthChange: boolean) => void;
  onViewChange: (view: 'day' | 'month') => void;
}

export const MonthCalendarDialog = ({
  isOpen,
  onOpenChange,
  tasks,
  selectedDate,
  onDateSelect,
  onViewChange,
}: MonthCalendarDialogProps) => {
  const { t } = useTranslation('common');
  const { habits, habitStatus } = useHabitStore();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[90vw] sm:max-w-[800px] h-[90vh] sm:h-[90vh] 
          bg-white dark:bg-gray-900 p-0 overflow-hidden rounded-xl md:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {t('calendar.monthView', 'Vista de Calendario Mensual')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('calendar.description', 'Vista de calendario mensual donde puede ver y gestionar sus tareas y hábitos.')}
        </DialogDescription>
        
        <Button
          variant="ghost"
          size="sm"
          className="dialog-corner-button absolute right-4 top-4 z-50"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>

        <MonthCalendarView
          tasks={tasks}
          habits={habits}
          habitStatus={habitStatus}
          selectedDate={selectedDate}
          onDateSelect={(date, isMonthChange) => {
            const normalizedDate = normalizeDate(date);
            onDateSelect(normalizedDate, isMonthChange);
          }}
          onViewChange={onViewChange}
          descriptionId="calendar-view-description"
        />
      </DialogContent>
    </Dialog>
  );
};
