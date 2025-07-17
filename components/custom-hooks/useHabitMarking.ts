import { Habit, HabitStatus, EditingHabit } from "@/components/types/types";

interface UseHabitMarkingProps {
  habits: Habit[];
  currentDate: Date;
  habitStatus: Record<string, HabitStatus>;
  updateHabitStatus: (habitIndex: number, date: string, status: string) => void;
  updateHabit: (habit: EditingHabit) => void;
  setCompletedHabit: (habit: Habit | null) => void;
  setDialog: (dialogName: string, isOpen: boolean) => void;
}

export const useHabitMarking = ({
  habits,
  currentDate,
  habitStatus,
  updateHabitStatus,
  updateHabit,
  setCompletedHabit,
  setDialog
}: UseHabitMarkingProps) => {
  const markDay = (habitIndex: number, status: HabitStatus['status']) => {
    const dateString = currentDate.toISOString().split('T')[0];
    updateHabitStatus(habitIndex, dateString, status);
  };

  return { markDay };
};