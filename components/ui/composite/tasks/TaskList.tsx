import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/primitives/card";
import { Button } from "@/components/ui/primitives/button";
import { Plus, Calendar, Flag, ChevronLeft, ChevronRight, MessageSquare, Pencil, Trash2, Filter, Clock } from 'lucide-react';
import { useTaskManagement } from '../../../custom-hooks/useTaskManagement';
import { useTranslation } from 'next-i18next';
import { Task, TaskLabel } from '@/components/types/types';
import { AddTaskDialog } from '../../../dialogs/tasks/AddTaskDialog';
import { Switch } from "@/components/ui/primitives/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as DatePicker } from "@/components/ui/primitives/calendar";
import { ViewNoteDialog } from '@/components/dialogs/common/ViewNoteDialog';
import { MonthCalendarView } from '../calendar/MonthCalendarView';
import { useTaskLabels } from '@/components/types/types';
import { format } from 'date-fns';
import { normalizeDate } from '../../../../utils/dateUtils';
import { EditTaskDialog } from '../../../dialogs/tasks/EditTaskDialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/primitives/alert-dialog";
import { Separator } from "@/components/ui/primitives/separator";
import { SearchInput } from '../habits/HabitSearch';
import { WeekDayBar } from '../calendar/WeekDayBar';
import { es } from 'date-fns/locale';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { TaskDetailsDialog } from '@/components/dialogs/tasks/components/TaskDetailsDialog';
import { DayTimelineDialog } from '@/components/dialogs/tasks/DayTimelineDialog';
import { useHabitStore } from '@/store/useHabitStore';
import { useTaskStore } from '@/store/useTaskStore';
import { Spinner } from "@/components/ui/primitives/spinner";
import { ExtendedTask } from '@/store/useTaskStore';
import { logger } from '@/utils/logger';

interface TaskListProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  currentDate: Date;
  showCompleted: boolean;
  setShowCompleted: (value: boolean) => void;
  sortBy: 'time' | 'priority';
  setSortBy: (value: 'time' | 'priority') => void;
  onTaskClick: (task: Task) => void;
  hideLoading?: boolean;
}

const createDebouncedUpdate = () => {
  let timeout: NodeJS.Timeout;
  return (callback: () => void) => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, 200);
  };
};

export const TaskList: React.FC<TaskListProps> = ({
  searchQuery,
  setSearchQuery,
  currentDate,
  showCompleted,
  setShowCompleted,
  sortBy,
  setSortBy,
  onTaskClick,
  hideLoading = false
}) => {
  const { t } = useTranslation();
  
  const {
    tasks,
    addTask,
    toggleTaskStatus,
    deleteTask,
    updateTask,
    updateTaskTime,
    getFilteredTasks,
    isAddingTask,
    forceRefresh
  } = useTaskStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const debouncedUpdate = useMemo(() => createDebouncedUpdate(), []);

  const sortTasks = useCallback((tasks: ExtendedTask[]) => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'time') {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      } else {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
    });
  }, [sortBy]);

  const filteredTasks = useMemo(() => {
    logger.debug('Iniciando filtrado de tareas:', {
      currentDate: format(currentDate, 'yyyy-MM-dd'),
      totalTasks: tasks.length
    });

    const filtered = getFilteredTasks(currentDate, searchQuery, showCompleted);
    
    logger.debug('Resultado del filtrado:', {
      filteredCount: filtered.length,
      tasks: filtered.map(t => ({
        id: t.id,
        title: t.title,
        isRecurring: t.is_recurring,
        exceptions: t.recurring_exceptions
      }))
    });

    return sortTasks(filtered);
  }, [getFilteredTasks, currentDate, searchQuery, showCompleted, sortTasks, refreshKey]);

  const [selectedTaskForNote, setSelectedTaskForNote] = useState<ExtendedTask | null>(null);
  const [isViewingNote, setIsViewingNote] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<ExtendedTask | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ExtendedTask | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isViewingNoteOnly, setIsViewingNoteOnly] = useState(false);

  const { habits, habitStatus } = useHabitStore();

  // Estado local para controlar la apertura del diálogo
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);

  const { labels } = useTaskLabels();

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!hideLoading) {
      setLoading(true);
    }
    
    useTaskStore.getState().initializeTasks()
      .then(() => {
        setLoading(false);
      })
      .catch(error => {
        logger.error('Error initializing tasks:', error);
        setLoading(false);
      });
  }, [hideLoading]);

  // Función para verificar si una fecha es hoy
  const isToday = (date: string) => {
    return date === format(currentDate, 'yyyy-MM-dd');
  };

  // Calcular estadísticas usando las mismas tareas
  const todaysTasks = tasks.filter(task => {
    if (!task.is_recurring) {
      return task.due_date && isToday(task.due_date);
    }
    
    // Para tareas recurrentes, verificar si están activas hoy
    if (task.completed) {
      const completedDate = format(new Date(task.created_at || ''), 'yyyy-MM-dd');
      return !isToday(completedDate); // No contar si fue completada hoy
    }
    return true; // Contar tareas recurrentes no completadas
  });

  const completedTasks = todaysTasks.filter(task => task.completed).length;
  const totalTasks = todaysTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleUpdateTask = (taskId: string, updates: Partial<ExtendedTask>) => {
    updateTask(taskId, updates);
  };

  useEffect(() => {
    // Refrescar la lista de tareas cuando cambie el estado
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      const parsedTasks = JSON.parse(savedTasks);
      // Actualizar el estado local si es necesario
    }
  }, [tasks]); // Dependencia en tasks para detectar cambios

  useEffect(() => {
    logger.debug('5. TaskList tasks changed:', tasks); // Log 5
    logger.debug('6. Filtered tasks:', filteredTasks); // Log 6
  }, [tasks, filteredTasks]);

  // Añadir un efecto para escuchar cambios directos en las tareas
  useEffect(() => {
    const handleTasksChanged = () => {
      logger.debug('Tasks changed event received');
      // Forzar actualización inmediata
      setForceUpdate(prev => prev + 1);
      
      // Programar otra actualización después de un breve retraso
      setTimeout(() => {
        setForceUpdate(prev => prev + 1);
      }, 100);
    };
    
    document.addEventListener('tasksChanged', handleTasksChanged);
    
    return () => {
      document.removeEventListener('tasksChanged', handleTasksChanged);
    };
  }, []);

  // Simplificar handleAddTask
  const handleAddTask = async (task: Partial<Task>) => {
    try {
      logger.debug('Before adding task:', task);
      
      // Cerrar el diálogo antes de añadir la tarea
      setIsAddTaskDialogOpen(false);
      
      // Añadir la tarea usando el store
      await addTask({
        ...task,
        recurring_exceptions: task.recurring_exceptions || {}
      } as Omit<ExtendedTask, 'id' | 'createdAt'>);
      
      // Forzar actualización inmediata
      setRefreshKey(prev => prev + 1);
      
      // Forzar otra actualización después de un breve retraso
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 50);
    } catch (error) {
      logger.error('Error adding task:', error);
    }
  };

  // Agregar console.log para debug
  logger.debug('TaskList updateTaskTime:', typeof updateTaskTime);

  const handleDateChange = (date: Date) => {
    logger.debug('Fecha cambiada:', format(date, 'yyyy-MM-dd'));
  };

  // Añadir un efecto para escuchar el evento personalizado
  useEffect(() => {
    const handleTasksUpdated = () => {
      logger.debug('Tasks updated event received');
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('tasksUpdated', handleTasksUpdated);
    
    return () => {
      window.removeEventListener('tasksUpdated', handleTasksUpdated);
    };
  }, []);

  // Añadir un efecto para forzar la actualización cuando se añade una tarea
  useEffect(() => {
    const handleForceRefresh = (event: CustomEvent) => {
      logger.debug('Force refresh event received:', event.detail);
      
      // Forzar actualización
      setForceUpdate(prev => prev + 1);
      
      // Si la tarea es para la fecha actual, asegurarse de que se muestre
      if (event.detail && event.detail.date) {
        const taskDate = event.detail.date;
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        
        if (taskDate === currentDateStr) {
          logger.debug('Task is for current date, forcing update');
          // Forzar actualización adicional después de un breve retraso
          setTimeout(() => {
            setForceUpdate(prev => prev + 1);
          }, 100);
        }
      }
    };
    
    window.addEventListener('forceTasksRefresh', handleForceRefresh as EventListener);
    
    return () => {
      window.removeEventListener('forceTasksRefresh', handleForceRefresh as EventListener);
    };
  }, [currentDate]);

  // Añadir un efecto para escuchar actualizaciones del store
  useEffect(() => {
    const handleStoreUpdate = () => {
      logger.debug('Task store updated event received');
      // Forzar múltiples actualizaciones
      setRefreshKey(prev => prev + 1);
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
    };
    
    window.addEventListener('taskStoreUpdated', handleStoreUpdate);
    return () => window.removeEventListener('taskStoreUpdated', handleStoreUpdate);
  }, []);

  // También añadir este efecto para reaccionar a forceRefresh
  useEffect(() => {
    if (forceRefresh > 0) {
      setRefreshKey(prev => prev + 1);
    }
  }, [forceRefresh]);

  // Mejorar el efecto para escuchar el evento taskAdded
  useEffect(() => {
    const handleTaskAdded = (event: CustomEvent) => {
      logger.debug('Task added event received:', event.detail);
      setRefreshKey(prev => prev + 1);
    };
    
    document.addEventListener('taskAdded', handleTaskAdded as EventListener);
    
    return () => {
      document.removeEventListener('taskAdded', handleTaskAdded as EventListener);
    };
  }, []);

  // Añadir un efecto para escuchar el evento taskDeleted
  useEffect(() => {
    const handleTaskDeleted = () => {
      logger.debug('Task deleted event received');
      // Forzar actualización inmediata
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('taskDeleted', handleTaskDeleted);
    
    return () => {
      window.removeEventListener('taskDeleted', handleTaskDeleted);
    };
  }, []);

  // Mejorar el efecto para escuchar el evento taskAddedDelayed
  useEffect(() => {
    const handleTaskAddedDelayed = (event: CustomEvent) => {
      logger.debug('Task added delayed event received with detail:', event.detail);
      
      // Verificar si la tarea es para la fecha actual
      if (event.detail && event.detail.task && event.detail.date) {
        const taskDate = event.detail.date;
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        
        logger.debug('Comparing dates (delayed):', { taskDate, currentDateStr });
        
        if (taskDate === currentDateStr) {
          logger.debug('Task is for current date, updating UI (delayed)');
          setRefreshKey(prev => prev + 1);
          
          // Programar otra actualización después de un breve retraso
          setTimeout(() => {
            logger.debug('Executing delayed UI update');
            setRefreshKey(prev => prev + 1);
          }, 100);
        }
      } else {
        // Si no hay detalles, actualizar de todos modos
        logger.debug('No task details, updating UI anyway (delayed)');
        setRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('taskAddedDelayed', handleTaskAddedDelayed as EventListener);
    
    return () => {
      window.removeEventListener('taskAddedDelayed', handleTaskAddedDelayed as EventListener);
    };
  }, [currentDate]);

  // Asegurarse de que el componente se actualice cuando cambie forceRefresh
  useEffect(() => {
    // Este efecto se ejecutará cuando cambie forceRefresh
    logger.debug('TaskList actualizándose debido a cambio en forceRefresh');
  }, [forceRefresh]);

  // Añadir un efecto para escuchar actualizaciones de hora de tareas
  useEffect(() => {
    const handleTaskTimeUpdated = (event: CustomEvent) => {
      logger.debug('Task time updated event received:', event.detail);
      
      // Forzar actualización de la lista
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('taskTimeUpdated', handleTaskTimeUpdated as EventListener);
    
    return () => {
      window.removeEventListener('taskTimeUpdated', handleTaskTimeUpdated as EventListener);
    };
  }, []);

  // Añadir un efecto para recargar las tareas cuando cambie la fecha
  useEffect(() => {
    // Refrescar la lista cuando cambie la fecha
    setRefreshKey(prev => prev + 1);
  }, [currentDate]);

  useEffect(() => {
    // Añadir este log para ver las tareas antes del filtrado
    logger.debug('TaskList - Tareas antes de filtrar:', tasks);
    
    // Añadir este log para ver la fecha actual que se está usando para filtrar
    const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');
    logger.debug('TaskList - Fecha actual para filtrado:', formattedCurrentDate);
    
    // Añadir este log para ver las tareas después del filtrado
    logger.debug('TaskList - Tareas filtradas:', filteredTasks);
  }, [tasks, filteredTasks, currentDate]);

  useEffect(() => {
    const handleTaskUpdate = (event: CustomEvent) => {
      debouncedUpdate(() => {
        setRefreshKey(prev => prev + 1);
      });
    };

    const events = ['tasksChanged', 'taskStoreUpdated', 'taskAdded', 'taskDeleted'];
    
    events.forEach(event => {
      window.addEventListener(event, handleTaskUpdate as EventListener);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleTaskUpdate as EventListener);
      });
    };
  }, []);

  return (
    <div className="space-y-4 relative">
      {/* Indicador de carga cuando se está añadiendo una tarea */}
      {isAddingTask && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
          <Spinner size="md" />
          <span className="ml-2 text-sm font-medium">Añadiendo tarea...</span>
        </div>
      )}

      {/* Controles de filtro y timeline */}
      <div className="flex items-center gap-4 mb-4">
        {/* Botón de filtro */}
        <Button 
          variant="outline" 
          size="sm" 
          className={`relative ${
            showFilters 
              ? 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200' 
              : 'bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800'
          }`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          {(showCompleted || sortBy !== 'time') && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </Button>

        {/* Opciones de filtro siempre en línea */}
        <div className={`flex items-center gap-4 transition-all duration-200 ${showFilters ? 'opacity-100' : 'opacity-0 hidden'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">
              <span className="hidden sm:inline">{t('tasks.showCompleted')}</span>
              <span className="sm:hidden">Completadas</span>
            </span>
            <Switch
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
              className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200 
                        dark:data-[state=unchecked]:bg-gray-600"
            />
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">
              <span className="hidden sm:inline">{t('tasks.sortBy.label')}</span>
              <span className="sm:hidden">Ordenar</span>
            </span>
            <Select value={sortBy} onValueChange={(value: 'time' | 'priority') => setSortBy(value)}>
              <SelectTrigger className="h-8 w-24 sm:w-32">
                <SelectValue placeholder={t('tasks.sortBy.title')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">{t('tasks.sortBy.time')}</SelectItem>
                <SelectItem value="priority">{t('tasks.sortBy.priority')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lista de tareas sin Card wrapper */}
      {loading && !hideLoading ? (
        <div className="flex justify-center">
          <span className="loading">{t('common.loading')}</span>
        </div>
      ) : (
        filteredTasks.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {t('tasks.empty')}
          </div>
        ) : (
          <div className="max-h-[240px] overflow-y-auto pr-2">
            <div className="space-y-2">
              {filteredTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  currentDate={currentDate}
                  onToggle={toggleTaskStatus}
                  onViewNote={(task) => {
                    setSelectedTaskForNote(task);
                    setIsViewingNote(true);
                  }}
                  onEdit={(task) => {
                    setTaskToEdit(task);
                    setIsEditingTask(true);
                  }}
                  onDelete={(task) => setTaskToDelete(task)}
                  onViewNoteOnly={(task) => {
                    setSelectedTaskForNote(task);
                    setIsViewingNoteOnly(true);
                  }}
                  onClick={(task) => onTaskClick(task)}
                />
              ))}
            </div>
          </div>
        )
      )}

      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onAddTask={handleAddTask}
        selectedDate={currentDate}
        initialTask={null}
      />

      <TaskDetailsDialog
        task={selectedTaskForNote}
        currentDate={currentDate}
        isOpen={isViewingNote}
        onClose={() => setIsViewingNote(false)}
        onEdit={(task) => {
          setTaskToEdit(task);
          setIsEditingTask(true);
        }}
        onDelete={(task) => setTaskToDelete(task)}
        onComplete={(task) => {
          toggleTaskStatus(task.id, format(currentDate, 'yyyy-MM-dd'));
          window.dispatchEvent(new Event('tasksChanged'));
          setTimeout(() => setIsViewingNote(false), 200);
        }}
        onUpdateTask={(taskId: string, updates: Partial<ExtendedTask>) => updateTask(taskId, updates)}
      />

      <EditTaskDialog
        isOpen={isEditingTask}
        onOpenChange={setIsEditingTask}
        task={taskToEdit}
        onUpdateTask={(taskId: string, updates: Partial<ExtendedTask>) => updateTask(taskId, updates)}
      />

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90%] sm:w-[440px] rounded-lg bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-700">
          <AlertDialogHeader className="p-6 pb-3">
            <AlertDialogTitle className="text-lg font-semibold text-center">
              {t('tasks.deleteConfirmation.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-gray-500 dark:text-gray-400 mt-2">
              {t('tasks.deleteConfirmation.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 p-6 pt-3">
            <AlertDialogCancel 
              onClick={(e) => {
                e.stopPropagation();
                setTaskToDelete(null);
              }}
              className="w-full sm:w-auto mt-2 sm:mt-0 order-1 sm:order-none"
            >
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (taskToDelete) {
                  deleteTask(taskToDelete.id);
                  setTaskToDelete(null);
                }
              }}
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DayTimelineDialog
        isOpen={isTimelineOpen}
        onOpenChange={setIsTimelineOpen}
        date={currentDate}
        onUpdateTask={(taskId: string, updates: Partial<ExtendedTask>) => updateTask(taskId, updates)}
        onDelete={deleteTask}
        habits={[]}
        onUpdateHabit={() => {}}
        habitStatus={{}}
        taskLabels={labels}
      />

      <ViewNoteDialog
        isOpen={isViewingNoteOnly}
        onOpenChange={setIsViewingNoteOnly}
        viewingNote={{
          title: selectedTaskForNote?.title || '',
          note: selectedTaskForNote?.note || undefined
        }}
        emotions={[]}
        onEdit={() => {}}
      />
    </div>
  );
};

// Modificar la interfaz TaskItemProps
interface TaskItemProps {
  task: ExtendedTask;
  currentDate: Date;
  onToggle: (taskId: string, date: string) => void;
  onViewNote: (task: ExtendedTask) => void;
  onEdit: (task: ExtendedTask) => void;
  onDelete: (task: ExtendedTask) => void;
  onViewNoteOnly: (task: ExtendedTask) => void;
  onClick: (task: ExtendedTask) => void;
}

// Componente para cada tarea individual
const TaskItem = ({ 
  task, 
  currentDate,
  onToggle, 
  onViewNote, 
  onEdit, 
  onDelete,
  onViewNoteOnly,
  onClick
}: TaskItemProps) => {
  const { t } = useTranslation();
  const { labels } = useTaskLabels();
  const { use24HourFormat } = useTimeFormat();
  const [showActions, setShowActions] = useState(false);
  const taskRef = useRef<HTMLDivElement>(null);
  const [isCompleted, setIsCompleted] = useState(task.completed);

  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const taskTime = task.time_exceptions?.[formattedDate]?.time || 
                  task.recurring_exceptions?.[formattedDate]?.time || 
                  task.time;

  logger.debug('TaskItem - Task details:', {
    title: task.title,
    recurring_exceptions: task.recurring_exceptions,
    formattedDate,
    exception: task.recurring_exceptions?.[formattedDate],
    taskTime,
    timeCalculation: {
      taskId: task.id,
      timeExceptions: task.time_exceptions?.[formattedDate]?.time,
      recurringExceptions: task.recurring_exceptions?.[formattedDate]?.time,
      baseTime: task.time,
      finalTime: taskTime
    }
  });

  const formatTimeDisplay = (time: string | { time?: string }) => {
    if (typeof time === 'object') {
      return time.time || '';
    }
    if (!time) return '';
    if (use24HourFormat) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Efecto para cerrar los botones cuando se toca fuera de la tarjeta
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskRef.current && !taskRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Función para manejar el toque/clic
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  const renderLabel = () => {
    if (task.custom_label_name && task.custom_label_color) {
      // Renderizar etiqueta personalizada
      return (
        <span 
          className="text-xs px-1.5 py-0.5 rounded-md"
          style={{ 
            color: task.custom_label_color,
            backgroundColor: `${task.custom_label_color}15`
          }}
        >
          #{task.custom_label_name}
        </span>
      );
    } else if (task.label_id) {
      // Renderizar etiqueta predeterminada
      const predefinedLabel = labels.find((label: TaskLabel) => label.id === task.label_id);
      if (predefinedLabel) {
        return (
          <span 
            className="text-xs px-1.5 py-0.5 rounded-md"
            style={{ 
              color: predefinedLabel.color,
              backgroundColor: `${predefinedLabel.color}15`
            }}
          >
            #{predefinedLabel.name}
          </span>
        );
      }
    }
    return null;
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    logger.debug('Checkbox toggle en TaskItem:', {
      taskId: task.id,
      date: formattedDate,
      currentStatus: isCompleted
    });
    
    e.stopPropagation();
    e.preventDefault();
    setIsCompleted(!isCompleted);
    await onToggle(task.id, format(currentDate, 'yyyy-MM-dd'));
    window.dispatchEvent(new Event('tasksChanged'));
  };

  // Añadir esta función para determinar si la tarea está completada
  const isTaskCompleted = useMemo(() => {
    if (task.is_recurring) {
      // Para tareas recurrentes, verificar las excepciones
      return task.recurring_exceptions?.[formattedDate]?.completed === true;
    }
    // Para tareas normales, usar el campo completed
    return task.completed;
  }, [task, formattedDate]);

  return (
    <div 
      ref={taskRef}
      className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 min-w-0 max-w-[calc(100%-120px)]">
        <input
          type="checkbox"
          checked={isTaskCompleted}
          onChange={handleToggle}
          className="mt-1 rounded border-gray-300 cursor-pointer flex-shrink-0"
        />
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium truncate block ${isTaskCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
            {task.note && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 flex-shrink-0 flex items-center text-xs text-gray-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewNoteOnly(task);
                }}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {taskTime && (
              <span className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1">
                <Clock className="h-3 w-3 text-gray-400" />
                {formatTimeDisplay(taskTime)}
              </span>
            )}
            {task.priority && (
              <span className="flex items-center text-xs">
                <Flag className={`h-3 w-3 ${
                  task.priority === 'high' ? 'text-red-500' : 
                  task.priority === 'medium' ? 'text-yellow-500' : 
                  'text-green-500'
                }`} />
                <span className="ml-1 hidden sm:inline">
                  {t(`tasks.priorities.${task.priority}`)}
                </span>
              </span>
            )}
            {renderLabel()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        <div className={`flex items-center gap-2 transition-all duration-200 ${
          showActions ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
        }`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            <Pencil className="h-3 w-3 text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(task);
              setShowActions(false);
            }}
          >
            <Trash2 className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};