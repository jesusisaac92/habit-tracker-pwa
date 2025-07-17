import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Task, TaskLabel } from '@/components/types/types';
import { Pencil, Trash2, X, Flag, Check, Tag, AlignLeft, Clock, Play } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { TimerDialog } from './TimerDialog';
import { useTaskLabels } from '@/components/dialogs/tasks/useTaskLabels';
import { ExtendedTask } from '@/store/useTaskStore';
import { useTaskStore } from '@/store/useTaskStore';
import { logger } from '@/utils/logger';

interface TaskDetailsDialogProps {
  task: ExtendedTask | null;
  currentDate: Date;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: ExtendedTask) => void;
  onDelete: (task: ExtendedTask) => void;
  onComplete: (task: ExtendedTask) => void;
  onStartTimer?: (task: ExtendedTask) => void;
  onUpdateTask: (taskId: string, updates: Partial<ExtendedTask>) => void;
}

// Primero agregamos una función auxiliar para calcular la duración
const calculateFocusTime = (timeRange: string): number => {
  const [start, end] = timeRange.split('-').map(time => {
    const [hours, minutes] = time.trim().split(':').map(Number);
    return hours * 60 + minutes;
  });
  return end - start;
};

export const TaskDetailsDialog: React.FC<TaskDetailsDialogProps> = ({
  task,
  currentDate,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onComplete,
  onStartTimer,
  onUpdateTask
}) => {
  const { t } = useTranslation('common');
  const { formatTime } = useTimeFormat();
  const { toast } = useToast();
  const [isTimerOpen, setIsTimerOpen] = useState(false);
  const { labels: taskLabels } = useTaskLabels();
  const { toggleTaskStatus } = useTaskStore();
  
  // Agregar estado local para manejar el estado de completado
  const [isCompleted, setIsCompleted] = useState(task?.completed || false);

  // Actualizar el estado local cuando cambia la tarea
  useEffect(() => {
    if (!task) return;
    
    // Verificar si la tarea está completada directamente o a través de excepciones recurrentes
    const formattedDate = currentDate ? format(currentDate, 'yyyy-MM-dd') : '';
    const isTaskCompleted = task.completed || 
                           (task.recurring_exceptions && 
                            formattedDate && 
                            task.recurring_exceptions[formattedDate]?.completed === true);
    
    setIsCompleted(Boolean(isTaskCompleted));
  }, [task, currentDate]);

  useEffect(() => {
    if (task?.label) {
      logger.debug('Task label details:', {
        fullLabel: task.label,
        id: task.label.id,
        name: task.label.name,
        color: task.label.color
      });
    }
  }, [task?.label]);

  useEffect(() => {
    logger.debug('Task labels state:', {
      availableLabels: taskLabels,
      currentTaskLabel: task?.label,
      matchedLabel: task?.label ? taskLabels.find(l => l.id === task.label?.id) : null
    });
  }, [task, taskLabels]);

  if (!task) return null;
  if (!currentDate || !(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    logger.error('Invalid currentDate provided to TaskDetailsDialog:', { currentDate });
    return null;
  }

  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const taskTime = task.time_exceptions?.[formattedDate]?.time || 
                  task.recurring_exceptions?.[formattedDate]?.time || 
                  task.time;

  logger.debug('Task time calculation:', {
    taskId: task.id,
    timeExceptions: task.time_exceptions?.[formattedDate]?.time,
    recurringExceptions: task.recurring_exceptions?.[formattedDate]?.time,
    baseTime: task.time,
    finalTime: taskTime
  });

  // Formatear la hora según la configuración
  const formattedTime = taskTime ? formatTime(taskTime) : 'Sin hora asignada';

  // Calcular el tiempo de enfoque
  const getFocusTimeText = (timeRange: string | null) => {
    if (!timeRange) return '';
    
    const minutes = calculateFocusTime(timeRange);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}min de enfoque`;
    } else if (hours > 0) {
      return `${hours}h de enfoque`;
    } else {
      return `${remainingMinutes}min de enfoque`;
    }
  };

  // Modificar el botón de Play
  const handleStartTimer = (task: ExtendedTask) => {
    if (isCompleted) {
      toast({
        title: t('tasks.alreadyCompleted'),
        description: t('tasks.cannotStartCompleted'),
        variant: "warning"
      });
      return;
    }
    setIsTimerOpen(true);
    if (onStartTimer) {
      onStartTimer(task);
    }
  };

  // En la sección de etiquetas del diálogo
  const taskLabel = taskLabels.find(label => label.id === task.label_id);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="w-[95vw] max-w-[95vw] sm:max-w-[425px] bg-white dark:bg-gray-900 shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 rounded-2xl"
          aria-describedby="task-details-description"
        >
          <div id="task-details-description" className="sr-only">
            Detalles de la tarea
          </div>
          
          {/* Botón X en posición absoluta con z-index alto */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-3 top-3 h-8 w-8 rounded-full z-50 bg-white dark:bg-gray-900"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Contenedor principal con scroll */}
          <div className="mt-2 max-h-[80vh] overflow-y-auto pr-2">
            {/* Título con margen para el botón X */}
            <div className="pr-8 mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-base sm:text-lg font-semibold break-words text-left">
                {task.title}
              </h2>
            </div>
            
            <div className="space-y-4 py-2 bg-white dark:bg-gray-900">
              {/* Prioridad */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <Flag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Prioridad:</span>
                <span 
                  className={`text-sm px-2 py-0.5 rounded-md ${
                    task.priority === 'high' ? 'bg-red-100 text-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-500'
                  }`}
                >
                  {t(`tasks.priorities.${task.priority}`)}
                </span>
              </div>

              {/* Hora y Tiempo de Enfoque */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Hora:</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formattedTime}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartTimer(task)}
                  disabled={isCompleted}
                  className={`ml-auto h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 ${
                    isCompleted ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Play className={`h-4 w-4 ${isCompleted ? 'text-gray-400' : ''}`} />
                </Button>
              </div>

              {/* Etiqueta */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <Tag className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Etiqueta:</span>
                {taskLabel ? (
                  <span 
                    className="text-sm px-2 py-0.5 rounded-md"
                    style={{ 
                      backgroundColor: `${taskLabel.color}20`,
                      color: taskLabel.color
                    }}
                  >
                    #{taskLabel.name}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">
                    Sin etiqueta
                  </span>
                )}
              </div>

              {/* Nota */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlignLeft className="h-4 w-4" />
                  <span>Notas:</span>
                </div>
                <div className="pl-6 text-gray-600 dark:text-gray-400">
                  {task?.note || 'Sin notas'}
                </div>
              </div>

              {/* Botones fijos en la parte inferior */}
              <div className="sticky bottom-0 pt-2 bg-white dark:bg-gray-900">
                {/* Botón de Completar */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (task) {
                      logger.debug('Complete button clicked:', {
                        taskId: task.id,
                        currentDate: formattedDate,
                        isRecurring: task.is_recurring,
                        exceptions: task.recurring_exceptions,
                        taskState: task
                      });

                      toggleTaskStatus(task.id, formattedDate);
                      
                      logger.debug('Task status toggled:', {
                        taskId: task.id,
                        currentDate: formattedDate,
                        taskState: task
                      });
                      
                      window.dispatchEvent(new Event('tasksChanged'));
                      setTimeout(() => onClose(), 200);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 py-2 rounded-md mb-2"
                >
                  <Check className={`h-4 w-4 ${isCompleted ? 'text-green-500' : ''}`} />
                  {isCompleted ? t('tasks.completed') : t('tasks.complete')}
                </Button>

                {/* Contenedor para botones de Editar y Eliminar */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Botón de Editar */}
                  <Button
                    onClick={() => {
                      onEdit(task);
                      onClose();
                    }}
                    variant="outline"
                    className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 py-2 rounded-md"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('common.edit')}
                  </Button>

                  {/* Botón de Eliminar */}
                  <Button
                    onClick={() => {
                      onDelete(task);
                      onClose();
                    }}
                    variant="outline"
                    className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 py-2 rounded-md text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {task && taskTime && (
        <TimerDialog
          task={{
            ...task,
            type: 'task'
          }}
          isOpen={isTimerOpen}
          onClose={() => setIsTimerOpen(false)}
          initialTime={calculateFocusTime(taskTime)}
          onComplete={onComplete}
          title={task.title}
          currentDate={currentDate}
        />
      )}
    </>
  );
}; 