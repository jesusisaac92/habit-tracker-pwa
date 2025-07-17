import { useState } from 'react';
import { Button } from "@/components/ui/primitives/button";
import { CalendarClock } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useHabitStore } from '@/store/useHabitStore';
import { useTimelineItems } from '@/components/custom-hooks/useTimelineItems';
import { DayTimelineDialog } from '@/components/dialogs/tasks/DayTimelineDialog';
import { Habit, HabitStatus } from '@/components/types/types';

interface TimelineButtonProps {
  currentDate: Date;
  className?: string;
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
}

export const TimelineButton: React.FC<TimelineButtonProps> = ({
  currentDate,
  className = '',
  habits,
  habitStatus
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { updateHabit } = useHabitStore();
  const { timelineItems } = useTimelineItems(currentDate);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={`h-8 w-8 ${className}`}
      >
        <CalendarClock className="h-5 w-5 text-gray-500" />
      </Button>

      <DayTimelineDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        date={currentDate}
        onUpdateTask={updateTask}
        onDelete={deleteTask}
        habits={habits}
        onUpdateHabit={updateHabit}
        habitStatus={habitStatus}
        taskLabels={[]}
      />
    </>
  );
}; 