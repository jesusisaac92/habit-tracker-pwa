import React, { useEffect } from 'react';
import { AddRewardDialog } from '@/components/dialogs/tasks/AddRewardDialog';
import { MedalType } from '@/components/types/types';

interface AddRewardDialogContainerProps {
  initialIsOpen: boolean;
  onClose: (open: boolean) => void;
  medalEmojis: {
    bronce: string;
    plata: string;
    oro: string;
  };
  addReward: (rewardData: { name: string; classification: MedalType }) => void;
}

export const AddRewardDialogContainer: React.FC<AddRewardDialogContainerProps> = ({
  initialIsOpen,
  onClose,
  medalEmojis,
  addReward
}) => {
  const [isOpen, setIsOpen] = React.useState(initialIsOpen);

  useEffect(() => {
    console.log('Container: initialIsOpen changed to:', initialIsOpen);
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const handleOpenChange = (open: boolean) => {
    console.log('Container: handleOpenChange called with:', open);
    setIsOpen(open);
    if (!open) onClose(open);
  };

  return (
    <AddRewardDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      addReward={addReward}
      medalEmojis={medalEmojis}
    />
  );
};