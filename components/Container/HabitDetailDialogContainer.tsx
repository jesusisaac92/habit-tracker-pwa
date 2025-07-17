import React from 'react';
import { HabitDetailDialog } from '@/components/dialogs/habits/HabitDetailDialog'; 
import { Habit } from '@/components/types/types';
import { HabitWithPerformance } from "@/components/types/types";

interface HabitDetailDialogContainerProps {
    initialIsOpen: boolean;
    selectedHabit: HabitWithPerformance | null;
    onClose: () => void;
    generateGraphData: (habitIndex: number, type?: 'monthly' | 'annual') => void;
}

export const HabitDetailDialogContainer: React.FC<HabitDetailDialogContainerProps> = ({
  initialIsOpen,
  selectedHabit,
  onClose,
  generateGraphData
}) => {
  const [isOpen, setIsOpen] = React.useState(initialIsOpen);

  React.useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const handleViewPerformance = (habit: HabitWithPerformance) => {
    console.log("2. Handling view performance for habit:", habit);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) onClose();
  };

  return (
    <HabitDetailDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      selectedHabit={selectedHabit}
      onViewPerformance={handleViewPerformance}
      generateGraphData={generateGraphData}
      currentDate={new Date()}
    />
  );
};
