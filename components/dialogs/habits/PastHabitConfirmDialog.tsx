import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { motion } from "framer-motion";
import { Calendar, Check, X } from "lucide-react";
import { useTranslation } from "next-i18next";
import { format } from "date-fns";
import { Habit } from "@/components/types/types";

interface PastHabitConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  date: Date;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PastHabitConfirmDialog: React.FC<PastHabitConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  habit,
  date,
  onConfirm,
  onCancel
}) => {
  const { t } = useTranslation();
  
  if (!habit) return null;

  const formattedDate = format(date, 'dd/MM/yyyy');
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] p-6 bg-white dark:bg-gray-800">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-semibold text-center">
          ¿Olvidaste marcar este hábito?
          </DialogTitle>

          <DialogDescription className="text-sm sm:text-base text-center">
            ¿Estás seguro que completaste el hábito{' '}
            <span className="inline-block bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white px-2 py-0.5 rounded mx-1 font-medium">
              {habit.name}
            </span>{' '}
            el día <strong>{formattedDate}</strong>?
          </DialogDescription>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
            <Button 
              onClick={() => {
                onCancel();
                onOpenChange(false);
              }}
              variant="outline"
              className="w-full flex items-center justify-center"
            >
              <X className="w-4 h-4 mr-2" />
              No realizado
            </Button>
            
            <Button 
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 flex items-center justify-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Sí, lo completé
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 