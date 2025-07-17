import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "next-i18next";
import { useEffect } from 'react';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  habitName: string;
  userName: string;
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  isOpen,
  onClose,
  habitName,
  userName
}) => {
  const { t } = useTranslation();
  const AUTO_CLOSE_TIME = 5000;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, AUTO_CLOSE_TIME);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] p-6 bg-white dark:bg-gray-800 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-semibold">
            {t('habits.success.title', { userName })}
          </DialogTitle>

          <DialogDescription className="text-sm sm:text-base">
            {t('habits.success.message', { habitName })}
          </DialogDescription>

          <Button 
            onClick={onClose}
            className="w-full sm:w-auto px-8 mt-4"
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 