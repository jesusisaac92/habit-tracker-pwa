import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Input } from "@/components/ui/primitives/input";
import { Textarea } from "@/components/ui/primitives/textarea";
import { Button } from "@/components/ui/primitives/button";
import { useTranslation } from 'react-i18next';

interface HelpDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  submitHelpForm: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({
  isOpen,
  onOpenChange,
  submitHelpForm
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {t('help.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            {t('help.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submitHelpForm} className="space-y-4 mt-4">
          <Input 
            name="userName" 
            placeholder={t('help.form.namePlaceholder')}
            required 
            className="w-full p-2 text-sm border rounded-md"
          />
          <Input 
            name="userEmail" 
            type="email" 
            placeholder={t('help.form.emailPlaceholder')}
            required 
            className="w-full p-2 text-sm border rounded-md"
          />
          <Textarea 
            name="userComment" 
            placeholder={t('help.form.commentPlaceholder')}
            required 
            className="w-full p-2 text-sm border rounded-md"
          />
          <Button
            type="submit"
            className="w-full bg-black hover:bg-gray-800 text-white text-sm font-semibold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
          >
            {t('help.form.submitButton')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};