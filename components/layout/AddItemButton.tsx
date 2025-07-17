import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/primitives/button";
import { Plus, CalendarPlus, ListPlus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/primitives/sheet";
import { useTranslation } from 'next-i18next';
import AddHabitDialog from '@/components/dialogs/habits/AddHabitDialog';
import { AddTaskDialog } from '@/components/dialogs/tasks/AddTaskDialog';
import { useHabitStore } from '@/store/useHabitStore';
import { Habit, Task } from '@/components/types/types';
import { useSpring, animated } from 'react-spring';
import { useAuth } from '@/src/supabase/hooks/useAuth';

interface AddItemButtonProps {
  onAddHabit?: (habit: Omit<Habit, "id" | "index">) => void;
  onAddTask?: (task: Omit<Task, "id" | "createdAt">) => void;
  selectedDate?: Date;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const AddItemButton: React.FC<AddItemButtonProps> = ({
  onAddHabit,
  onAddTask,
  selectedDate = new Date(),
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const habits = useHabitStore(state => state.habits);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsSheetOpen(false);
      }
    };

    if (isSheetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSheetOpen]);

  const handleAddHabit = (habit: Omit<Habit, "id" | "index">) => {
    if (onAddHabit) {
      onAddHabit(habit);
    }
    setIsHabitDialogOpen(false);
    setIsSheetOpen(false);
  };

  const handleAddTask = (task: Omit<Task, "id" | "createdAt">) => {
    if (onAddTask) {
      onAddTask(task);
    }
    setIsTaskDialogOpen(false);
    setIsSheetOpen(false);
  };

  const mobileSpringProps = useSpring({
    transform: isSheetOpen ? 'translateY(0%)' : 'translateY(100%)',
    opacity: isSheetOpen ? 1 : 0,
    config: {
      mass: 1,
      tension: 280,
      friction: 24
    }
  });

  const desktopSpringProps = useSpring({
    opacity: isSheetOpen ? 1 : 0,
    transform: isSheetOpen ? 'scale(1)' : 'scale(0.95)',
    config: {
      mass: 1,
      tension: 280,
      friction: 20
    },
    onRest: () => {
      if (!isSheetOpen) {
        setIsVisible(false);
      }
    }
  });

  const overlaySpringProps = useSpring({
    opacity: isSheetOpen ? 0.4 : 0,
    config: {
      duration: 100
    }
  });

  const openSheet = () => {
    setIsVisible(true);
    setTimeout(() => {
      setIsSheetOpen(true);
    }, 10);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
  };

  const MenuContent = () => (
    <div className="flex flex-col gap-2" aria-describedby="add-item-menu-description" role="dialog">
      <div id="add-item-menu-description" className="sr-only">
        {t('common.selectItemToAdd')}
      </div>
      <Button
        onClick={() => {
          setIsHabitDialogOpen(true);
          closeSheet();
        }}
        className="w-full flex items-center justify-start gap-2 h-14 text-lg"
        variant="ghost"
      >
        <CalendarPlus className="h-5 w-5" />
        {t('habits.addHabit')}
      </Button>

      <Button
        onClick={() => {
          setIsTaskDialogOpen(true);
          closeSheet();
        }}
        className="w-full flex items-center justify-start gap-2 h-14 text-lg"
        variant="ghost"
      >
        <ListPlus className="h-5 w-5" />
        {t('tasks.addTask')}
      </Button>
    </div>
  );

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        onClick={openSheet}
        aria-label={t('common.add')}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {(isVisible || isSheetOpen) && (
        <div className="fixed inset-0 z-50">
          {/* Overlay con animación */}
          <animated.div 
            style={overlaySpringProps}
            className="absolute inset-0 bg-gray-700" 
            onClick={closeSheet}
          />
          
          {/* Contenido del modal - versión móvil */}
          <animated.div 
            style={mobileSpringProps}
            className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 p-4 rounded-t-xl shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100"
              onClick={closeSheet}
            >
              <X className="h-4 w-4 text-gray-800 dark:text-gray-100" />
              <span className="sr-only">Close</span>
            </button>
            <MenuContent />
          </animated.div>

          {/* Contenido del modal - versión desktop */}
          <div className="hidden md:flex items-center justify-center h-full">
            <animated.div
              style={desktopSpringProps}
              className="relative w-[400px] bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg z-10"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute right-3 top-3 rounded-sm opacity-70 transition-opacity hover:opacity-100"
                onClick={closeSheet}
              >
                <X className="h-4 w-4 text-gray-800 dark:text-gray-100" />
              </button>
              <MenuContent />
            </animated.div>
          </div>
        </div>
      )}

      <AddHabitDialog 
        isOpen={isHabitDialogOpen}
        onOpenChange={setIsHabitDialogOpen}
        onAddHabit={handleAddHabit}
        habits={habits}
        user={{ name: user?.email || '' }}
      />  

      <AddTaskDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onAddTask={handleAddTask}
        selectedDate={selectedDate}
      />
    </>
  );
}; 