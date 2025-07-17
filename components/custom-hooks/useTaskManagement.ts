import { useState, useCallback, useEffect, useMemo } from 'react';
import { Task } from '../types/types';
import { normalizeDate, formatDateToString } from '../../utils/dateUtils';
import { format, startOfDay, parseISO, addHours } from 'date-fns';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { tasksService } from '@/src/supabase/services/tasks.service';
import { toast } from 'react-hot-toast';
import { logger } from '@/utils/logger';

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

export const useTaskManagement = (currentDate: Date) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const { user } = useAuth();
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      
      try {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
        
        if (user?.id) {
          const supabaseTasks = await tasksService.getTasks(user.id);
          
          const transformedTasks = supabaseTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority || 'medium',
            due_date: task.due_date,
            completed: task.completed || false,
            time: task.time || null,
            note: task.note || '',
            label_id: task.label_id,
            is_recurring: task.is_recurring || false,
            recurring_dates: task.recurring_dates || [],
            color: task.color || '#3b82f6',
            type: 'task' as const,
            created_at: task.created_at,
            user_id: task.user_id,
            updated_at: task.updated_at,
            recurring_exceptions: task.recurring_exceptions || {},
            custom_label_name: task.custom_label_name,
            custom_label_color: task.custom_label_color,
            time_exceptions: task.time_exceptions || {}
          }));
          
          setTasks(transformedTasks);
          localStorage.setItem('tasks', JSON.stringify(transformedTasks));
        }
      } catch (error) {
        logger.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTasks();
  }, [user?.id]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      setIsAddingTask(true);
      logger.info('Adding task:', task, 'tasks');
      
      const tempId = generateUUID();
      const tempTask: Task = {
        ...task,
        id: tempId,
        created_at: new Date().toISOString(),
        user_id: user?.id || '',
        updated_at: new Date().toISOString(),
        recurring_exceptions: {},
        custom_label_name: null,
        custom_label_color: null,
        time_exceptions: {}
      };
      
      setTasks(prevTasks => {
        const newTasks = [...prevTasks, tempTask];
        localStorage.setItem('tasks', JSON.stringify(newTasks));
        return newTasks;
      });
      
      setForceRefresh(prev => prev + 1);
      
      if (user?.id) {
        try {
          const taskData = {
            user_id: user.id,
            title: task.title,
            priority: task.priority,
            due_date: task.due_date || null,
            completed: task.completed || false,
            time: task.time || null,
            note: task.note || '',
            label_id: task.label_id || null,
            is_recurring: task.is_recurring || false,
            recurring_dates: task.recurring_dates || [],
            color: task.color || '#3b82f6',
            updated_at: new Date().toISOString(),
            recurring_exceptions: {},
            custom_label_name: null,
            custom_label_color: null,
            time_exceptions: {}
          };
          
          const savedTask = await tasksService.createTask(taskData);
          
          setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(t => 
              t.id === tempId ? { 
                ...savedTask, 
                id: savedTask.id,
                due_date: task.due_date,
                recurring_dates: task.recurring_dates || []
              } : t
            );
            localStorage.setItem('tasks', JSON.stringify(updatedTasks));
            return updatedTasks;
          });
          
          setForceRefresh(prev => prev + 1);
          
          toast.success("Tarea creada correctamente");
          
          return savedTask;
        } catch (error) {
          logger.error('Error saving task to Supabase:', error);
          toast.error("Error al guardar la tarea en el servidor");
          return tempTask;
        }
      }
      
      return tempTask;
    } catch (error) {
      logger.error('Error adding task:', error);
      toast.error("Error al crear la tarea");
      throw error;
    } finally {
      setIsAddingTask(false);
    }
  }, [tasks, user?.id]);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const currentTasks = tasks.filter(task => task.id !== taskId);
      localStorage.setItem('tasks', JSON.stringify(currentTasks));
      setTasks(currentTasks);
      
      if (user?.id) {
        try {
          await tasksService.deleteTask(taskId);
        } catch (error) {
          logger.error('Error deleting task from Supabase:', error);
        }
      }
      
      window.dispatchEvent(new CustomEvent('taskDeleted', { 
        detail: { taskId } 
      }));
      
    } catch (error) {
      logger.error('Error deleting task:', error);
    }
  }, [tasks, user?.id]);

  const toggleTaskStatus = useCallback((taskId: string) => {
    const newTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    
    localStorage.setItem('tasks', JSON.stringify(newTasks));
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  }, [tasks]);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    try {
      const currentTasks = tasks.map(task =>
        task.id === taskId 
          ? { 
              ...task, 
              ...updates,
              ...(updates.due_date ? { due_date: formatDateToString(updates.due_date) } : {})
            } 
          : task
      );
      
      localStorage.setItem('tasks', JSON.stringify(currentTasks));
      setTasks(currentTasks);
      localStorage.setItem('tasks', JSON.stringify(currentTasks));
    } catch (error) {
      logger.error('Error updating task:', error);
    }
  }, [tasks]);

  const filterTasksByDate = useCallback((tasks: Task[], date: string) => {
    return tasks.filter(task => {
      if (task.due_date === date) return true;
      
      if (task.is_recurring && task.recurring_dates) {
        return task.recurring_dates.includes(date);
      }
      
      return false;
    });
  }, []);

  const getTaskTime = useCallback((task: Task, date: string) => {
    if (!task.is_recurring) {
      return task.time;
    }
    
    if (task.recurring_exceptions?.[date]?.time) {
      return task.recurring_exceptions[date].time;
    }

    return task.time;
  }, []);

  const updateTaskTime = useCallback((taskId: string, date: string, newTime: string) => {
    try {
      const currentTasks = tasks.map(t => 
        t.id === taskId ? { ...t, time: newTime } : t
      );
      
      localStorage.setItem('tasks', JSON.stringify(currentTasks));
      setTasks(currentTasks);
      localStorage.setItem('tasks', JSON.stringify(currentTasks));
    } catch (error) {
      logger.error('Error updating task time:', error);
    }
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    
    return tasks.filter(task => {
      if (!task.is_recurring) {
        return task.due_date === formattedDate;
      }
      
      if (task.is_recurring && task.recurring_dates) {
        return task.recurring_dates.includes(formattedDate);
      }
      
      return false;
    });
  }, [tasks, currentDate, forceRefresh]);

  useEffect(() => {
    const handleStorageChange = () => {
      setTasks(JSON.parse(localStorage.getItem('tasks') || '[]'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    tasks,
    filteredTasks,
    loading,
    isAddingTask,
    error: null,
    addTask,
    toggleTaskStatus,
    deleteTask,
    updateTask,
    getTaskTime,
    updateTaskTime,
    shouldShowTask: filteredTasks,
    refreshTasks: () => setForceRefresh(prev => prev + 1)
  };
}; 