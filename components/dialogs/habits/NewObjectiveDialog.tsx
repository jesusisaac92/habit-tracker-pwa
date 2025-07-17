import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Label } from "@/components/ui/primitives/label";
import { Input } from "@/components/ui/primitives/input";
import { Button } from "@/components/ui/primitives/button";
import { useTranslation } from 'react-i18next';

interface NewObjectiveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newObjectiveDays: string;
  setNewObjectiveDays: React.Dispatch<React.SetStateAction<string>>;
  handleNewObjective: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const NewObjectiveDialog: React.FC<NewObjectiveDialogProps> = ({
  isOpen,
  onOpenChange,
  newObjectiveDays,
  setNewObjectiveDays,
  handleNewObjective
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold mb-2 sm:mb-4">
            {t('objective.newTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {t('objective.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleNewObjective} className="space-y-4 mt-4">
          <div>
            <Label 
              htmlFor="newObjectiveDays" 
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('objective.daysLabel')}
            </Label>
            <Input
              id="newObjectiveDays"
              type="number"
              value={newObjectiveDays}
              onChange={(e) => setNewObjectiveDays(e.target.value)}
              min="1"
              required
              className="mt-1 w-full text-sm"
            />
          </div>
          <Button 
            type="submit"
            className="w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-300 shadow-sm"
          >
            {t('objective.setButton')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};