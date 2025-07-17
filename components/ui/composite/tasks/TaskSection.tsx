import { useTranslation } from 'next-i18next';
import { Button } from "@/components/ui/primitives/button";
import { WeekDayBar } from "../calendar/WeekDayBar";
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { Calendar as DatePicker } from "@/components/ui/primitives/calendar";

interface TaskSectionProps {
  selectedDate: Date;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  setSelectedDate: (date: Date) => void;
  setIsAddingTask: (adding: boolean) => void;
  formatDate: (date: Date) => string;
  children: React.ReactNode;
}

export const TaskSection = ({
  selectedDate,
  isCalendarOpen,
  setIsCalendarOpen,
  goToPreviousDay,
  goToNextDay,
  setSelectedDate,
  setIsAddingTask,
  formatDate,
  children
}: TaskSectionProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousDay}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost"
                className="flex items-center gap-2 hover:bg-transparent"
              >
                <span className="text-sm font-medium">
                  {formatDate(selectedDate)}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <DatePicker
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={(date: Date | null) => {
                  if (date instanceof Date) {
                    const normalized = new Date(date);
                    normalized.setHours(12, 0, 0, 0);
                    setSelectedDate(normalized);
                    setIsCalendarOpen(false);
                  }
                }}
                className="rounded-md border bg-white dark:bg-gray-800"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextDay}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <WeekDayBar 
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />

        <Button 
          onClick={() => setIsAddingTask(true)}
          className="w-full bg-black hover:bg-gray-900 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('tasks.add')}
        </Button>
      </div>
      {children}
    </div>
  );
}; 