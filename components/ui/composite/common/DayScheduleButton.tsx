import React from 'react';
import { Button } from "@/components/ui/primitives/button";
import { CalendarClock } from "lucide-react";
import { DayTimelineDialog } from '@/components/dialogs/tasks/DayTimelineDialog';

interface DayScheduleButtonProps {
  showTimeline: boolean;
  setShowTimeline: (show: boolean) => void;
  currentDate: Date;
  onUpdateTask: (taskId: string, updates: any) => void;
  onDelete: (taskId: string) => Promise<void>;
}

export const DayScheduleButton: React.FC<DayScheduleButtonProps> = ({
  showTimeline,
  setShowTimeline,
  currentDate,
  onUpdateTask,
  onDelete
}) => {
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowTimeline(true)}
        className="h-12 w-12 p-0 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <CalendarClock className="h-5 w-5 text-gray-500" />
      </Button>

      <DayTimelineDialog
        isOpen={showTimeline}
        onOpenChange={setShowTimeline}
        date={currentDate}
        onUpdateTask={onUpdateTask}
        onDelete={onDelete}
        habits={[]}
        onUpdateHabit={() => {}}
        habitStatus={{}}
        taskLabels={[]}
      />
    </>
  );
}; 