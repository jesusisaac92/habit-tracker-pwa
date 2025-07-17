import React, { useState } from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/primitives/tabs";
import { useTranslation } from 'next-i18next';
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { SearchInput } from "@/components/ui/composite/habits/HabitSearch";
import { TimelineButton } from "@/components/ui/composite/timeline/TimelineButton";
import { Habit, HabitStatus, Task } from '@/components/types/types';
import { AddItemButton } from "@/components/layout/AddItemButton";
import { SideNavigation } from "@/components/layout/SideNavigation";
import { useTaskStore } from '@/store/useTaskStore';
import { useTimelineItems } from '@/components/custom-hooks/useTimelineItems';

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentDate: Date;
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  setMobileMenuOpen: (open: boolean) => void;
  onAddHabit: (habit: Omit<Habit, "id" | "index">) => void;
  onAddTask: (task: Omit<Task, "id" | "createdAt">) => void;
  selectedDate: Date;
  onHelpClick?: () => void;
}

const convertHabitStatus = (status: Record<string, any>): Record<string, HabitStatus> => {
  const converted: Record<string, HabitStatus> = {};
  Object.entries(status).forEach(([key, value]) => {
    const newStatus = value.status === "not-completed" ? "pending" : value.status;
    converted[key] = {
      ...value,
      status: newStatus
    };
  });
  return converted;
};

export const TabNavigation = ({ 
  activeTab, 
  setActiveTab, 
  searchQuery,
  setSearchQuery,
  currentDate,
  habits,
  habitStatus,
  setMobileMenuOpen,
  onAddHabit,
  onAddTask,
  selectedDate,
  onHelpClick
}: TabNavigationProps) => {
  const { t } = useTranslation();
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { timelineItems } = useTimelineItems(currentDate);

  return (
    <>
      {/* Barra lateral para desktop */}
      <SideNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onHelpClick={onHelpClick} 
      />
      
      {/* Barra superior */}
      <div className="flex justify-between items-center gap-4 md:pl-16">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-0 hover:bg-transparent -ml-2"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200" />
          </Button>
          
          {/* Título de la sección actual (visible en móvil y desktop) */}
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white md:ml-[-50px] -ml-1">
            {t(`navigation.${activeTab}`)}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <AddItemButton 
              onAddHabit={onAddHabit}
              onAddTask={onAddTask}
              selectedDate={selectedDate}
              variant="outline"
              size="icon"
              className="h-8 w-8 bg-transparent hover:bg-gray-100 text-black dark:text-white dark:hover:bg-gray-800"
            />
          </div>
          <TimelineButton 
            currentDate={currentDate}
            className="mr-2"
            habits={habits}
            habitStatus={habitStatus}
          />
          <SearchInput 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        </div>
      </div>
    </>
  );
}; 