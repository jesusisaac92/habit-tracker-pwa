import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Habit } from '@/components/types/types';
import { Pencil, Trash2, X, Clock, Book, Tag, Play, MessageSquare, Check } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { format } from 'date-fns';
import { HABIT_ICONS, type HabitIconType } from '@/components/ui/composite/common/IconSelector';
import { TimerDialog } from '@/components/dialogs/tasks/components/TimerDialog';
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { useHabitStore } from '@/store/useHabitStore';

interface HabitDetailsDialogProps {
  habit: Habit | null;
  currentDate: Date;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (habit: Habit) => void;
  onDelete?: (habitId: number) => void;
}

export const HabitDetailsDialog = ({
  habit,
  currentDate,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: HabitDetailsDialogProps) => {
  const { t } = useTranslation('common');
  const { formatTime } = useTimeFormat();
  const { toast } = useToast();
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  
  const habitStore = useHabitStore();
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  
  const isHabitCompleted = React.useMemo(() => {
    if (!habit) return false;
    
    const indexKey = `${habit.index}-${formattedDate}`;
    const idKey = `${habit.id}-${formattedDate}`;
    
    // Verificar primero en el store
    const storeStatus = (
      (habitStore.habitStatus?.[indexKey]?.status === 'completed') || 
      (habitStore.habitStatus?.[idKey]?.status === 'completed')
    );
    
    if (storeStatus) return true;
    
    // Si no está en el store, verificar en localStorage
    try {
      const localStorageStatus = localStorage.getItem('habitStatus');
      if (localStorageStatus) {
        const parsedStatus = JSON.parse(localStorageStatus);
        return (
          parsedStatus[indexKey]?.status === 'completed' ||
          parsedStatus[idKey]?.status === 'completed'
        );
      }
    } catch (error) {
      // Silent error handling
    }
    
    return false;
  }, [habit, formattedDate, habitStore.habitStatus]);
  
  if (!habit) return null;

  const habitTime = habit.time_exceptions?.[formattedDate]?.time ?? habit.time;
  const formattedTime = habitTime ? formatTime(habitTime) : 'Sin hora asignada';

  const getHabitIcon = () => {
    // Asegurarnos de que usamos el icono correcto del hábito
    const iconKey = habit.icon || 'default';
    const IconComponent = HABIT_ICONS[iconKey as HabitIconType]?.icon || Book;

    return (
      <div 
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        style={{ 
          backgroundColor: habit.color,
          boxShadow: `0 0 0 2px ${habit.color}20`
        }}
      >
        <IconComponent className="h-5 w-5 text-white" />
      </div>
    );
  };

  const calculateFocusTime = (timeRange: string): number => {
    const [start, end] = timeRange.split('-').map(time => {
      const [hours, minutes] = time.trim().split(':').map(Number);
      return hours * 60 + minutes;
    });
    return end - start;
  };

  const handleStartTimer = (habit: Habit) => {
    if (!habitTime) {
      toast({
        title: t('habits.noTimeSet'),
        description: t('habits.cannotStartTimer'),
        variant: "warning"
      });
      return;
    }
    setIsTimerOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[425px] bg-white dark:bg-gray-900 p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {habit.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detalles del hábito
            </DialogDescription>
          </DialogHeader>
          
          <Button
            onClick={onClose}
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-start gap-2 mt-2">
            <div 
              className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: habit.color + '20' }}
            >
              {getHabitIcon()}
            </div>
            <h2 className="text-lg font-semibold break-all hyphens-auto pr-8 max-w-[calc(100%-60px)] overflow-hidden">
              {habit.name}
            </h2>
          </div>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <div className="flex items-center gap-2">
                {isHabitCompleted ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span>
                  {isHabitCompleted 
                    ? t('habits.completed') 
                    : t('habits.notCompleted')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{formattedTime}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStartTimer(habit)}
                className={`h-6 w-6 p-0 ${
                  isHabitCompleted 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                disabled={isHabitCompleted}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Etiqueta:</span>
              <span 
                className="text-sm px-2 py-0.5 rounded-md"
                style={{ 
                  backgroundColor: `${habit.color}20`,
                  color: habit.color
                }}
              >
                #Hábito
              </span>
            </div>

            <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <MessageSquare className="h-4 w-4 text-gray-500 mt-1" />
              <div className="flex-1">
                <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                  Descripción:
                </span>
                <p className="text-sm">
                  {habit.description || t('habits.noDescription')}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {habit && habitTime && (
        <TimerDialog
          task={{
            ...habit,
            title: habit.name,
            type: 'habit'
          } as any}
          isOpen={isTimerOpen}
          onClose={() => setIsTimerOpen(false)}
          initialTime={calculateFocusTime(habitTime)}
          onComplete={() => {}}
          title={habit.name}
          currentDate={currentDate}
        />
      )}
    </>
  );
}; 