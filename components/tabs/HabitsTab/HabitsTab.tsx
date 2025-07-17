import React, { useState, useEffect } from 'react';
import { HabitList } from "@/components/ui/composite/habits/HabitList";
import { Button } from "@/components/ui/primitives/button";
import { Plus, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useTranslation } from 'next-i18next';
import { Habit, HabitStatus, GraphDataPoint } from "@/components/types/types";
import { Card, CardContent } from "@/components/ui/primitives/card";
import { Calendar as DatePicker } from "@/components/ui/primitives/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { WeekDayBar } from "@/components/ui/composite/calendar/WeekDayBar";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { SearchInput } from "@/components/ui/composite/habits/HabitSearch";
import { useDialogStore } from '@/components/services/dialogManagement/dialogService';
import { useHabitFilters } from '@/components/custom-hooks/useHabitFilters';
import { getCompletedHabits } from '@/src/supabase/services/habitCompletion.service';
import { useHabitStore } from '@/store/useHabitStore';

type SortOption = 'time' | 'name' | 'creationDate';

interface HabitsTabProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  handleHabitComplete: (habitIndex: number, dateString?: string) => void;
  generateGraphData: (habitIndex: number) => GraphDataPoint[];
  handleCalendarOpen: (habitIndex: number) => void;
  handleEditClick: (habit: Habit) => void;
  deleteHabit: (habitId: string) => void;
  updateHabitDirectly: (habit: Habit) => void;
  showCompletedHabits: boolean;
  sortPreference: SortOption;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  hasNote: (index: number, date: string) => boolean;
  handleAddNote: () => void;
  user: any;
  setIsAddHabitDialogOpen: (open: boolean) => void;
  blockFutureDates: boolean;
  onDeleteHabit: (habitId: string) => void;
}

export const HabitsTab = ({
  habits,
  habitStatus,
  currentDate,
  setCurrentDate,
  handleHabitComplete,
  generateGraphData,
  handleCalendarOpen,
  handleEditClick,
  deleteHabit,
  updateHabitDirectly,
  showCompletedHabits,
  sortPreference,
  searchQuery,
  setSearchQuery,
  hasNote,
  handleAddNote,
  user,
  setIsAddHabitDialogOpen,
  blockFutureDates,
  onDeleteHabit
}: HabitsTabProps) => {
  const { t } = useTranslation();
  const { openDialog } = useDialogStore();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingHabits, setIsLoadingHabits] = useState(true);
  const isLoadingCompletions = useHabitStore(state => state.isLoadingCompletions);
  const initializeCompletions = useHabitStore(state => state.initializeCompletions);

  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1);
    newDate.setHours(12, 0, 0, 0);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 1);
    newDate.setHours(12, 0, 0, 0);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('es', { month: 'long' }).toLowerCase();
    const monthName = t(`calendar.months.${month}`).toLowerCase();
    return `${monthName} ${date.getFullYear()}`;
  };

  const { visibleHabits } = useHabitFilters({ habits, currentDate });

  useEffect(() => {
    if (user) {
      initializeCompletions(user.id, currentDate);
    }
  }, [user, currentDate]);

  return (
    <div className="space-y-4">
      <Card className="bg-white dark:bg-gray-800 rounded-lg relative overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_6px_rgba(0,0,0,0.06)] transition-shadow duration-300">
        <CardContent className="p-4">
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
                      {formatDate(currentDate)}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <DatePicker
                    selected={currentDate}
                    onSelect={(date: Date | null) => {
                      if (date) {
                        const newDate = new Date(date);
                        newDate.setHours(12, 0, 0, 0);
                        setCurrentDate(newDate);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
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
              selectedDate={currentDate}
              onDateSelect={(date) => {
                const newDate = new Date(date);
                newDate.setHours(12, 0, 0, 0);
                setCurrentDate(newDate);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isLoadingCompletions ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <HabitList 
          habits={visibleHabits}
          habitStatus={habitStatus}
          currentDate={currentDate}
          handleHabitComplete={handleHabitComplete}
          handleAddNote={handleAddNote}
          generateGraphData={generateGraphData}
          handleCalendarOpen={handleCalendarOpen}
          handleEditClick={handleEditClick}
          deleteHabit={deleteHabit}
          hasNote={hasNote}
          updateHabitDirectly={updateHabitDirectly}
          user={user}
          showCompletedHabits={showCompletedHabits}
          sortPreference={sortPreference}
          searchQuery={searchQuery}
          blockFutureDates={blockFutureDates}
        />
      )}
    </div>
  );
}; 