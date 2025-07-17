import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/primitives/button";
import { Plus, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useTranslation } from 'next-i18next';
import { Card, CardContent } from "@/components/ui/primitives/card";
import { Calendar as DatePicker } from "@/components/ui/primitives/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { WeekDayBar } from "@/components/ui/composite/calendar/WeekDayBar";
import { TaskList } from "@/components/ui/composite/tasks/TaskList";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeDate } from '@/utils/dateUtils';
import { AddTaskDialog } from '@/components/dialogs/tasks/AddTaskDialog';
import { useTaskManagement } from '@/components/custom-hooks/useTaskManagement';
import { Task } from '@/components/types/types';
import { useTaskStore } from '@/store/useTaskStore';
import { Spinner } from "@/components/ui/primitives/spinner";
import { supabase } from '@/src/supabase/config/client';
import { tasksService } from '@/src/supabase/services/tasks.service';
import { logger } from '@/utils/logger';

interface TasksTabProps {
  taskSearchQuery: string;
  setTaskSearchQuery: (query: string) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  sortBy: 'time' | 'priority';
  setSortBy: (sort: 'time' | 'priority') => void;
  isActive?: boolean;
}

export const TasksTab = ({
  taskSearchQuery,
  setTaskSearchQuery,
  currentDate,
  setCurrentDate,
  showCompleted,
  setShowCompleted,
  sortBy,
  setSortBy,
  isActive
}: TasksTabProps) => {
  const { t } = useTranslation();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const { tasks, addTask, filteredTasks } = useTaskManagement(currentDate);
  const { loading: storeLoading } = useTaskStore();

  // Mover la referencia fuera del useEffect
  const hasInitiatedLoad = useRef(false);
  
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
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      const month = format(date, 'MMMM', { locale: es }).toLowerCase();
      const monthName = t(`calendar.months.${month}`).toLowerCase();
      return `${monthName} ${format(date, 'yyyy')}`;
    } catch (error) {
      logger.error('Error formatting date:', error);
      return '';
    }
  };

  const handleAddTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const success = await addTask(task);
      setIsAddingTask(false);

      if (success) {
        setIsLoading(true);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tasks = await tasksService.getTasks(user.id);
          if (tasks && Array.isArray(tasks)) {
            useTaskStore.getState().setTasks(tasks);
            
            setRefreshKey(prev => prev + 1);
            setTimeout(() => {
              setRefreshKey(prev => prev + 1);
              setIsLoading(false);
            }, 100);
          }
        }

        window.dispatchEvent(new Event('tasksChanged'));
      }
    } catch (error) {
      logger.error('Error adding task:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleTasksChanged = () => {
      logger.debug('Tasks changed, refreshing...');
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('tasksChanged', handleTasksChanged);
    return () => window.removeEventListener('tasksChanged', handleTasksChanged);
  }, []);

  useEffect(() => {
    if (isActive) {
      logger.debug('TasksTab: Loading tasks for date:', format(currentDate, 'yyyy-MM-dd'));
      
      if (!hasInitiatedLoad.current) {
        logger.debug('TasksTab: First load of tasks, isActive=true');
        hasInitiatedLoad.current = true;
      } else {
        logger.debug('TasksTab: Updating tasks due to date change');
      }
      
      setIsLoading(true);
      
      const loadTasks = async () => {
        try {
          await useTaskStore.getState().initializeTasks();
          logger.debug('TasksTab: Task loading completed');
        } catch (error) {
          logger.error('Error loading tasks:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadTasks();
      
      logger.debug('TasksTab: Current tasks state:', tasks);
    }
  }, [isActive, currentDate]);

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

      {(isLoading || storeLoading) ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent border-gray-300 rounded-full animate-spin"></div>
        </div>
      ) : (
        <TaskList 
          key={refreshKey}
          searchQuery={taskSearchQuery}
          setSearchQuery={setTaskSearchQuery}
          currentDate={currentDate}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onTaskClick={(task) => {
            logger.debug('Task clicked:', task);
          }}
          hideLoading={true}
        />
      )}

      <AddTaskDialog
        isOpen={isAddingTask}
        onOpenChange={setIsAddingTask}
        onAddTask={handleAddTask}
        selectedDate={currentDate}
        initialTask={null}
      />
    </div>
  );
}; 