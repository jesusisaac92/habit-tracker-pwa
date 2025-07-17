import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Calendar, CalendarProps } from "@/components/ui/primitives/calendar";
import { useTranslation } from 'next-i18next';
import { Button } from "@/components/ui/primitives/button";
import { normalizeDate } from '@/utils/dateUtils';

interface SelectDatesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
}

export const SelectDatesDialog = ({ 
  isOpen, 
  onOpenChange, 
  selectedDates, 
  onDatesChange 
}: SelectDatesDialogProps) => {
  const { t } = useTranslation();

  const handleDateSelect = (date: Date | null) => {
    if (!date) return;
    
    // Normalizar la fecha seleccionada
    const normalizedDate = normalizeDate(date);
    
    // Verificar si la fecha ya está seleccionada usando el formato yyyy-MM-dd
    const isDateSelected = selectedDates.some(
      selectedDate => 
        normalizeDate(selectedDate).toISOString().split('T')[0] === 
        normalizedDate.toISOString().split('T')[0]
    );

    if (isDateSelected) {
      // Si ya está seleccionada, la removemos
      onDatesChange(
        selectedDates.filter(d => 
          normalizeDate(d).toISOString().split('T')[0] !== 
          normalizedDate.toISOString().split('T')[0]
        )
      );
    } else {
      // Si no está seleccionada, la agregamos
      onDatesChange([...selectedDates, normalizedDate]);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir que el evento se propague
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] 
                  w-[95vw] sm:w-[400px] max-h-[90vh] 
                  bg-white dark:bg-gray-800 
                  rounded-lg shadow-lg overflow-hidden
                  p-0"
        aria-describedby="select-dates-dialog-description"
      >
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-lg font-semibold">
            {t('tasks.recurring.selectDates')}
          </DialogTitle>
          <DialogDescription id="select-dates-dialog-description" className="sr-only">
            {t('tasks.recurring.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-3">
          <Calendar
            mode="single"
            selected={undefined}
            minDate={new Date()}
            onSelect={handleDateSelect}
            className="w-full"
            tileClassName={({ date }) => {
              return selectedDates.some(selectedDate => 
                selectedDate.toDateString() === date.toDateString()
              ) ? 'selected-date' : '';
            }}
            initialFocus
          />
        </div>

        <div className="px-4 py-3 border-t">
          <p className="text-sm text-gray-600 text-center mb-3">
            {selectedDates.length} {selectedDates.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}
          </p>
          <Button 
            onClick={handleClose}
            className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-medium 
                      py-2 rounded-md transition-all duration-200"
          >
            Listo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
