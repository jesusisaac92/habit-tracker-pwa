import create from 'zustand';
import { Task, TaskLabel, DEFAULT_TASK_LABELS } from '@/components/types/types';
import { tasksService } from '@/src/supabase/services/tasks.service';
import { format } from 'date-fns';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { supabase } from '@/src/supabase/config/client';
import { normalizeDate } from '../utils/dateUtils';

// Añadir un control de logs global
const TASK_DEBUG = false;

// Función auxiliar para generar UUID
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Definir un tipo extendido para getFilteredTasks
interface GetFilteredTasksFunction {
  (date: Date, searchQuery?: string, showCompleted?: boolean, includeCompletedInTimeline?: boolean): ExtendedTask[];
  lastDate: string;
  lastTaskCount: number;
}

interface TaskException {
  time?: string;
  completed?: boolean;
}

// Instead, extend the imported Task interface
export interface ExtendedTask extends Task {
  recurring_exceptions: { [date: string]: TaskException };
  time_exceptions: { [date: string]: { time: string } };
}

export interface TaskStore {
  tasks: ExtendedTask[];
  loading: boolean;
  isLoading: boolean;
  isAddingTask: boolean;
  forceRefresh: number;
  user: any;
  setTasks: (tasks: ExtendedTask[]) => void;
  addTask: (task: Omit<ExtendedTask, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<ExtendedTask>) => void;
  toggleTaskStatus: (taskId: string, date: string) => void;
  updateTaskTime: (taskId: string, date: string, newTime: string) => Promise<boolean>;
  getFilteredTasks: GetFilteredTasksFunction; // Usar el tipo extendido
  initializeTasks: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  loadTasks: () => Promise<boolean>;
}

// Crear un sistema de actualización debounced
const createDebouncedUpdate = () => {
  let timeout: NodeJS.Timeout;
  return (callback: () => void) => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, 200);
  };
};

export const useTaskStore = create<TaskStore>((set, get) => {
  const debouncedUpdate = createDebouncedUpdate();

  const triggerUpdate = () => {
    debouncedUpdate(() => {
      set(state => ({ forceRefresh: state.forceRefresh + 1 }));
    });
  };

  // Crear un objeto para almacenar las funciones y propiedades
  const store = {
    tasks: [],
    loading: false,
    isLoading: false,
    isAddingTask: false,
    forceRefresh: 0,
    user: null,
    
    setTasks: (tasks: ExtendedTask[]) => set({ 
      tasks: Array.isArray(tasks) ? tasks : [] 
    }),
    
    addTask: async (task: Omit<ExtendedTask, 'id' | 'createdAt'>) => {
      try {
        set({ isAddingTask: true });
        
        console.log('🎨 ===== STORE: addTask DEBUG =====');
        console.log('📝 Task recibida:', task.title);
        console.log('🎨 Color recibido:', task.color);
        console.log('🏷️ Label ID:', task.label_id);
        console.log('🌈 Custom label color:', task.custom_label_color);
        console.log('🎨 ================================');
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ isAddingTask: false });
          return false;
        }
        
        const taskData = {
          title: task.title,
          note: task.note || '',
          due_date: task.due_date || null,
          priority: task.priority || 'medium',
          completed: task.completed || false,
          user_id: user.id,
          time: task.time || '',
          color: task.color || '#3b82f6', // 🔧 CORRECCIÓN: Usar color por defecto en lugar de cadena vacía
          is_recurring: task.is_recurring || false,
          label_id: task.label_id || '',
          recurring_dates: task.recurring_dates || [],
          recurring_exceptions: task.recurring_exceptions || {},
          time_exceptions: task.time_exceptions || {},
          updated_at: new Date().toISOString(),
          custom_label_name: task.custom_label_name || '',
          custom_label_color: task.custom_label_color || ''
        };

        console.log('🎨 ===== STORE: taskData FINAL =====');
        console.log('🎨 Color final enviado al servicio:', taskData.color);
        console.log('🎨 ==================================');

        const result = await tasksService.createTask(taskData);
        
        if (result) {
          const transformedTask = {
            ...result,
            dueDate: result.due_date,
            due_date: result.due_date ? (typeof result.due_date === 'string' ? result.due_date.split('T')[0] : format(new Date(result.due_date), 'yyyy-MM-dd')) : null,
            recurring_exceptions: result.recurring_exceptions || {},
            is_recurring: !!result.recurring_dates?.length,
            recurring_data: result.recurring_dates?.length ? { dates: result.recurring_dates } : undefined,
            startTime: result.start_time || null,
            endTime: result.end_time || null,
            custom_label_name: result.custom_label_name,
            custom_label_color: result.custom_label_color
          };
          
          set(state => ({
            tasks: [...state.tasks, transformedTask],
            forceRefresh: state.forceRefresh + 1,
            isAddingTask: false
          }));
          
          window.dispatchEvent(new Event('taskStoreUpdated'));
          
          return true;
        }
        
        set({ isAddingTask: false });
        return false;
      } catch (error) {
        set({ isAddingTask: false });
        return false;
      }
    },
    
    deleteTask: async (taskId: string) => {
      try {
        await tasksService.deleteTask(taskId);
        
        set(state => ({
          tasks: state.tasks.filter(task => task.id !== taskId),
          forceRefresh: state.forceRefresh + 1
        }));
      } catch (error) {
        // Silent error handling
      }
    },
    
    updateTask: (taskId: string, updates: Partial<ExtendedTask>) => {
      const state = get();
      const taskIndex = state.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;
      
      const updatedTask = { ...state.tasks[taskIndex], ...updates };
      const updatedTasks = [...state.tasks];
      updatedTasks[taskIndex] = updatedTask;
      
      set({ tasks: updatedTasks });
      triggerUpdate(); // Usar el sistema debounced

      (async () => {
        try {
          const supabaseUpdates = {
            ...updates,
            updated_at: new Date().toISOString()
          };
          await tasksService.updateTask(taskId, supabaseUpdates);
        } catch (error) {
          // Silent error handling
        }
      })();
    },
    
    toggleTaskStatus: async (taskId: string, date: string) => {
      try {
        const tasks = get().tasks;
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        const task = tasks[taskIndex];

        if (task.is_recurring) {
          const exceptions = task.recurring_exceptions ? { ...task.recurring_exceptions } : {};
          const isCompleted = exceptions[date]?.completed !== true;
          
          exceptions[date] = {
            ...exceptions[date],
            completed: isCompleted
          };

          // Actualizar solo las excepciones en la base de datos
          await tasksService.toggleTaskCompletion(
            taskId,
            task.user_id,
            date,
            isCompleted
          );

          // Actualizar el estado local manteniendo recurring_dates
          const updatedTasks = [...tasks];
          updatedTasks[taskIndex] = {
            ...task,
            recurring_exceptions: exceptions
          };

          set({ 
            tasks: updatedTasks,
            forceRefresh: get().forceRefresh + 1
          });
        } else {
          // Para tareas no recurrentes, mantener la lógica actual
          const isCompleted = !task.completed;
          await tasksService.updateTask(taskId, { completed: isCompleted });
          
          const updatedTasks = [...tasks];
          updatedTasks[taskIndex] = {
            ...task,
            completed: isCompleted
          };
          
          set({ 
            tasks: updatedTasks,
            forceRefresh: get().forceRefresh + 1
          });
        }

        window.dispatchEvent(new Event('taskStoreUpdated'));
      } catch (error) {
        // Silent error handling
      }
    },
    
    updateTaskTime: async (taskId: string, date: string, newTime: string) => {
      try {
        const state = get();
        const taskIndex = state.tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex === -1) return false;
        
        const task = state.tasks[taskIndex];
        
        // Siempre usar time_exceptions
        const timeExceptions = {
          ...task.time_exceptions,
          [date]: { time: newTime }
        };

        // Actualizar en la base de datos
        const updatedTask = await tasksService.updateTask(taskId, {
          time_exceptions: timeExceptions
        });

        if (updatedTask) {
          set(state => ({
            tasks: state.tasks.map(t => 
              t.id === taskId 
                ? { ...t, time_exceptions: timeExceptions }
                : t
            ),
            forceRefresh: state.forceRefresh + 1
          }));
          return true;
        }
        
        return false;
      } catch (error) {
        return false;
      }
    },
    
    getFilteredTasks: ((date: Date, searchQuery = '', showCompleted = false, includeCompletedInTimeline = true): ExtendedTask[] => {
      try {
        const tasks = get().tasks;
        const formattedDate = format(date, 'yyyy-MM-dd');
        
        const filteredTasks = tasks.filter(task => {
          // Crear una copia profunda de la tarea para evitar modificar el original
          let taskCopy = JSON.parse(JSON.stringify(task));
          
          let dateMatches = false;
          
          if (!taskCopy.is_recurring) {
            dateMatches = taskCopy.due_date === formattedDate;
          } else {
            dateMatches = Array.isArray(taskCopy.recurring_dates) && 
                         taskCopy.recurring_dates.includes(formattedDate);
            
            if (dateMatches) {
              taskCopy.due_date = formattedDate;
              
              if (taskCopy.recurring_exceptions && taskCopy.recurring_exceptions[formattedDate]) {
                const exception = taskCopy.recurring_exceptions[formattedDate];
                
                if (exception.completed !== undefined) {
                  taskCopy.completed = exception.completed;
                }
                
                if (exception.time !== undefined) {
                  taskCopy.time = exception.time;
                }
              }
            }
          }
          
          const searchMatches = !searchQuery || 
            taskCopy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (taskCopy.note && taskCopy.note.toLowerCase().includes(searchQuery.toLowerCase()));
          
          const completedMatches = (includeCompletedInTimeline || showCompleted !== false || !taskCopy.completed);
          
          if (dateMatches && searchMatches && completedMatches) {
            return true;
          }
          
          return false;
        });
        
        return filteredTasks as ExtendedTask[];
      } catch (error) {
        return [];
      }
    }) as GetFilteredTasksFunction,
    
    initializeTasks: async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          set({ tasks: [] });
          return;
        }
        
        const tasks = await tasksService.getTasks(user.id);
        
        if (tasks && Array.isArray(tasks)) {
          const transformedTasks = tasks.map(task => {
            let startTime = null;
            let endTime = null;
            
            if (task.time) {
              const [start, end] = task.time.split('-');
              startTime = start.trim();
              endTime = end.trim();
            }

            return {
              ...task,
              label_id: task.label_id || '',
              dueDate: task.due_date,
              due_date: task.due_date ? (typeof task.due_date === 'string' ? task.due_date.split('T')[0] : format(new Date(task.due_date), 'yyyy-MM-dd')) : null,
              recurring_exceptions: task.recurring_exceptions || {},
              is_recurring: !!task.recurring_dates?.length,
              recurring_data: task.recurring_dates?.length ? { dates: task.recurring_dates } : undefined,
              time: task.time || null,
              startTime,
              endTime,
              custom_label_name: task.custom_label_name,
              custom_label_color: task.custom_label_color,
              priority: task.priority || 'medium',
              recurring_dates: Array.isArray(task.recurring_dates) ? task.recurring_dates : []
            };
          });
          
          set({ tasks: transformedTasks });
        }
      } catch (error) {
        // Silent error handling
      }
    },
    
    setLoading: (loading: boolean) => set({ loading }),
    
    loadTasks: async () => {
      try {
        set({ loading: true });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set({ loading: false });
          return false;
        }
        
        const tasks = await tasksService.getTasks(user.id);
        
        if (tasks) {
          const transformedTasks = tasks.map(task => {
            let startTime = null;
            let endTime = null;
            
            if (task.time) {
              const [start, end] = task.time.split('-');
              startTime = start.trim();
              endTime = end.trim();
            }

            return {
              ...task,
              dueDate: task.due_date,
              due_date: task.due_date ? (typeof task.due_date === 'string' ? task.due_date.split('T')[0] : format(new Date(task.due_date), 'yyyy-MM-dd')) : null,
              recurring_exceptions: task.recurring_exceptions || {},
              is_recurring: !!task.recurring_dates?.length,
              recurring_data: task.recurring_dates?.length ? { dates: task.recurring_dates } : undefined,
              time: task.time || null,
              startTime,
              endTime,
              custom_label_name: task.custom_label_name,
              custom_label_color: task.custom_label_color
            };
          });
          
          set({ tasks: transformedTasks, loading: false });
          return true;
        }
        
        set({ loading: false });
        return false;
      } catch (error) {
        set({ loading: false });
        return false;
      }
    },
  };
  
  // Añadir las propiedades estáticas al objeto getFilteredTasks
  store.getFilteredTasks.lastDate = '';
  store.getFilteredTasks.lastTaskCount = 0;
  
  return store;
});

// Añadir caché local como en useHabitStore
const loadTasksFromCache = () => {
  try {
    const cachedTasks = localStorage.getItem('cachedTasks');
    if (cachedTasks) {
      return JSON.parse(cachedTasks);
    }
  } catch (e) {
    // Silent error handling
  }
  return null;
};