import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { format } from 'date-fns';

interface CompletedHabitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  completedDate: Date;
  userName: string;
}

export const CompletedHabitDialog = ({ 
  isOpen, 
  onClose, 
  habitName,
  completedDate,
  userName
}: CompletedHabitDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[90vw] w-full sm:max-w-[425px] p-6 bg-white dark:bg-gray-800 rounded-lg">
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-100 flex items-center justify-center"
          >
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" />
          </motion.div>

          <DialogTitle className="text-xl sm:text-2xl font-bold">
            ¡Excelente trabajo {userName}! 🎉
          </DialogTitle>

          <DialogDescription className="text-sm sm:text-base">
            Has completado "{habitName}"
            <br />
            para el día {format(completedDate, 'dd/MM/yyyy')}
          </DialogDescription>

          <Button 
            onClick={() => onClose()}
            className="w-full sm:w-auto mt-4 px-8"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 