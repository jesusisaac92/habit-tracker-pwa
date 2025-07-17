import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Task, Habit } from '@/components/types/types';
import { ExtendedTask } from '@/store/useTaskStore';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { format } from 'date-fns';

interface TimerDialogProps {
  task: ExtendedTask & { type?: 'task' | 'habit' };
  isOpen: boolean;
  onClose: () => void;
  initialTime: number; // en minutos
  onComplete: (task: ExtendedTask, date: string) => void;
  title?: string;
  currentDate: Date;
}

export const TimerDialog = ({ task, isOpen, onClose, initialTime, onComplete, title, currentDate }: TimerDialogProps) => {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(initialTime * 60); // convertir a segundos
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { t } = useTranslation('common');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => {
          const newTime = time - 1;
          if (newTime <= 0) {
            setIsRunning(false);
            setIsCompleted(true);
          }
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReset = () => {
    setTimeLeft(initialTime * 60);
    setIsRunning(false);
    setIsCompleted(false);
  };

  const handleComplete = () => {
    if (task) {
      const formattedDate = format(currentDate, 'yyyy-MM-dd');
      onComplete(task, formattedDate);
      toast({
        title: t('tasks.completed'),
        description: t('tasks.completedDescription'),
        variant: "success"
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[400px] bg-white dark:bg-gray-900 p-6 text-center">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {title || task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Temporizador de enfoque para {title || task.title}
          </DialogDescription>
        </DialogHeader>

        <Button
          onClick={onClose}
          variant="ghost"
          className="absolute right-2 top-2 h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
        
        {!isCompleted ? (
          <div className="mt-4 mb-6">
            <div className="mx-auto px-4 max-w-full">
              <h2 className="text-lg font-semibold text-center break-all hyphens-auto overflow-hidden text-ellipsis">
                {title || task.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Modo Enfoque
              </p>
            </div>
            
            <div className="text-5xl font-bold mt-8 mb-8">
              {formatTime(timeLeft)}
            </div>
            
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => setIsRunning(!isRunning)}
                variant="default"
                className="flex-1 bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                {isRunning ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Detener
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Iniciar
                  </>
                )}
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-md flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 mb-6">
            <div className="mx-auto px-4 max-w-full">
              <h2 className="text-lg font-semibold text-center break-all hyphens-auto overflow-hidden text-ellipsis">
                {title || task.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                ¡Tiempo Completado!
              </p>
            </div>
            
            <div className="text-5xl font-bold mt-8 mb-8">
              {formatTime(timeLeft)}
            </div>
            
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleComplete}
                variant="default"
                className="flex-1 bg-black hover:bg-gray-900 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 dark:bg-gray-900 dark:hover:bg-gray-800"
              >
                <Play className="h-4 w-4" />
                Reiniciar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 