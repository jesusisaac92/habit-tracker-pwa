import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { MedalType } from '@/components/types/types';
import { useTranslation } from 'react-i18next';

interface AddRewardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  medalEmojis: { bronce: string; plata: string; oro: string; };
  addReward: (rewardData: { name: string; classification: MedalType; points: number }) => void;
}

export const AddRewardDialog: React.FC<AddRewardDialogProps> = ({
  isOpen,
  onOpenChange,
  addReward,
  medalEmojis
}) => {
  const { t } = useTranslation();
  const [classification, setClassification] = React.useState<MedalType>('bronce');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const points = {
      bronce: 20,
      plata: 50,
      oro: 100
    }[classification];
    
    const rewardData = {
      name: form.rewardName.value,
      classification: classification,
      points: points
    };
    
    try {
      addReward(rewardData);
      form.reset();
      setClassification('bronce');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding reward:', error);
    }
  };

  const medalTypes: Array<{value: MedalType; label: string}> = [
    { value: 'bronce', label: t('medals.bronze') },
    { value: 'plata', label: t('medals.silver') },
    { value: 'oro', label: t('medals.gold') }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[450px] bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {t('addReward.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {t('addReward.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Input 
              id="rewardName"
              name="rewardName"
              placeholder={t('addReward.namePlaceholder')}
              required
              className="h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>
          <div className="space-y-2">
            <Select 
              value={classification} 
              onValueChange={(value: MedalType) => setClassification(value)}
            >
              <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                <SelectValue placeholder={t('addReward.selectClassification')} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg">
                {medalTypes.map(({ value, label }) => (
                  <SelectItem 
                    key={value}
                    value={value} 
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 h-9 sm:h-10 text-sm sm:text-base"
                  >
                    {label} {medalEmojis[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            type="submit" 
            className="w-full bg-black text-white hover:bg-black/90 rounded-xl h-10 sm:h-11 text-sm sm:text-base mt-2 sm:mt-4"
          >
            {t('addReward.addButton')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
