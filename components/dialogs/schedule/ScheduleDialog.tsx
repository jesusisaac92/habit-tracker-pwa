import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  items: any[];
  itemStatus: Record<string, any>;
}

export const ScheduleDialog: React.FC<ScheduleDialogProps> = ({
  isOpen,
  onOpenChange,
  date,
  items,
  itemStatus
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Horario del día</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {/* Aquí va el contenido del horario */}
          <p>Horario para {format(date, "EEEE, d 'de' MMMM", { locale: es })}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 