import { useState, useCallback, useEffect } from 'react';
import { Habit, Difficulty, EditingHabit, HabitStatusMap } from '@/components/types/types';
import { useToast } from '@/components/ui/providers/toast/use-toast';
import { calculateCurrentStreak, calculateRecord, HabitStatus as CalcHabitStatus } from './habitCalculations';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useHabitStore } from '@/store/useHabitStore';
import { getCompletedHabits } from '@/src/supabase/services/habitCompletion.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';

type SortOption = 'time' | 'name' | 'creationDate';

interface HabitStatus {
  status: string;
  timestamp: string;
}

export const useHabitManagement = () => {
  const { habits, setHabits, addHabit: addHabitToStore, completedHabits, setCompletedHabit, isHabitCompleted } = useHabitStore();
  const { user } = useAuth();

  const [habitStatus, setHabitStatus] = useState<Record<string, HabitStatus>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStatus = localStorage.getItem('habitStatus');
        return savedStatus ? JSON.parse(savedStatus) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(() => {
    // Obtener la fecha actual del sistema
    const systemDate = new Date();
    // Crear una nueva fecha con la fecha del sistema a medianoche
    return new Date(
      systemDate.getFullYear(),
      systemDate.getMonth(),
      systemDate.getDate()
    );
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [completedHabitLocal, setCompletedHabitLocal] = useState<Habit | null>(null);
  const [isHabitCompletedDialogOpen, setIsHabitCompletedDialogOpen] = useState(false);
  const [sortPreference, setSortPreference] = useState<SortOption>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('habitSortPreference') as SortOption || 'time';
    }
    return 'time';
  });
  const [showCompletedHabits, setShowCompletedHabits] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('showCompletedHabits') === 'true';
    }
    return false;
  });
  const [blockFutureDates, setBlockFutureDates] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('blockFutureDates') === 'true';
    }
    return false;
  });

  // Guardar hábitos cuando cambien
  useEffect(() => {
    if (habits.length > 0) {
      localStorage.setItem('habits', JSON.stringify(habits));
    }
  }, [habits]);

  // Cargar estado de hábitos del localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem('habitStatus');
    if (savedStatus) {
      setHabitStatus(JSON.parse(savedStatus));
    }
  }, []);

  // Efecto para recalcular rachas al cargar
  useEffect(() => {
    try {
      const savedStatus = localStorage.getItem('habitStatus');
      const savedHabits = localStorage.getItem('habits');
      
      if (savedStatus && savedHabits) {
        const loadedStatus = JSON.parse(savedStatus) as Record<string, HabitStatus>;
        const loadedHabits = JSON.parse(savedHabits) as Habit[];
        
        if (Array.isArray(loadedHabits)) {
          setHabitStatus(loadedStatus);
          setHabits(loadedHabits);
        }
      }
    } catch {
      localStorage.removeItem('habits'); // Limpiar datos inválidos
      localStorage.removeItem('habitStatus');
    }
  }, []); // Solo al montar el componente

  // Guardar habitStatus cuando cambie
  useEffect(() => {
    localStorage.setItem('habitStatus', JSON.stringify(habitStatus));
  }, [habitStatus]);

  const addHabit = useCallback((newHabit: Omit<Habit, "id" | "index">) => {
    // Evitar duplicados verificando si ya existe un hábito con el mismo nombre y tiempo
    const habitExists = habits.some(
      h => h.name === newHabit.name && h.time === newHabit.time
    );

    if (!habitExists) {
      const habitToAdd = {
        ...newHabit,
        id: Date.now(),  // Usar timestamp como ID único
        index: habits.length
      };
      
      addHabitToStore(habitToAdd);
      return habitToAdd;
    }
    return null;
  }, [habits, addHabitToStore]);

  const deleteHabit = useCallback((habitId: number) => {
    // Calcular los nuevos hábitos primero
    const updatedHabits = habits.filter((h: Habit) => h.id !== habitId);
    
    // Actualizar el estado con el nuevo array directamente
    setHabits(updatedHabits);
    localStorage.setItem('habits', JSON.stringify(updatedHabits));

    const habitIndex = habits.find(h => h.id === habitId)?.index;
    if (habitIndex !== undefined) {
      setHabitStatus(prev => {
        const newStatus = { ...prev };
        Object.keys(newStatus).forEach(key => {
          if (key.startsWith(`${habitIndex}-`)) {
            delete newStatus[key];
          }
        });
        localStorage.setItem('habitStatus', JSON.stringify(newStatus));
        return newStatus;
      });
    }
  }, [setHabits, habits]);

  const updateHabitStatus = useCallback((
    habitIndex: number, 
    dateString: string, 
    status: string,
    options?: any
  ) => {
    // Crear una copia del estado actual para evitar mutaciones directas
    const newStatus = { ...habitStatus };
    
    // Crear la clave única para este hábito y fecha
    const habitKey = `${habitIndex}-${dateString}`;
    
    // Actualizar el estado para esta clave específica
    newStatus[habitKey] = {
      status,
      ...(options || {})
    };
    
    // Actualizar el estado
    setHabitStatus(newStatus);
    
    // Guardar en localStorage
    localStorage.setItem('habitStatus', JSON.stringify(newStatus));
  }, [habitStatus]);

  // Efecto para manejar los toasts
  useEffect(() => {
    if (isUpdating) {
      setTimeout(() => {
        toast({
          title: "Hábito actualizado",
          description: "Los cambios han sido guardados exitosamente",
          variant: "success"
        });
        setIsUpdating(false);
      }, 0);
    }
  }, [isUpdating, toast]);

  const updateHabit = useCallback((editedHabit: EditingHabit) => {
    setIsUpdating(true);
    
    // Calcular los nuevos hábitos primero
    const newHabits = habits.map((habit: Habit) => {
      if (habit.index === editedHabit.index) {
        return {
          ...habit,
          ...editedHabit,
          record: habit.record || 0,
          currentStreak: habit.currentStreak || 0
        };
      }
      return habit;
    });
    
    // Actualizar el estado directamente con el nuevo array
    setHabits(newHabits);
    localStorage.setItem('habits', JSON.stringify(newHabits));
  }, [habits, setHabits]);

  const checkHabitCompletion = (habit: Habit, dateStr: string) => {
    if (habit.endDate && dateStr === habit.endDate) {
      // Si es el último día y está completado
      if (habitStatus[`${habit.index}-${dateStr}`]?.status === 'completed') {
        setCompletedHabitLocal(habit);
        setIsHabitCompletedDialogOpen(true);
      }
    }
  };

  // Modificar handleDateChange para mantener la fecha correcta
  const handleDateChange = (direction: 'prev' | 'next') => {
    const systemDate = new Date(); // Fecha actual del sistema
    setCurrentDate(prevDate => {
      // Si es "next" y la nueva fecha sería mayor que la fecha actual del sistema, 
      // devolver la fecha del sistema
      if (direction === 'next') {
        const nextDate = new Date(prevDate);
        nextDate.setDate(prevDate.getDate() + 1);
        if (nextDate > systemDate) {
          return new Date(
            systemDate.getFullYear(),
            systemDate.getMonth(),
            systemDate.getDate()
          );
        }
        return nextDate;
      }
      // Para "prev", simplemente restar un día
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() - 1);
      return newDate;
    });
  };

  // Función para ordenar hábitos
  const getSortedHabits = useCallback(() => {
    let filteredHabits = [...habits];
    
    // Debug de la configuración actual
    console.log('getSortedHabits - Config:', { 
      showCompletedHabits, 
      fromLocalStorage: localStorage.getItem('showCompletedHabits'),
      userId: user?.id
    });
    
    // Si showCompletedHabits es false, filtrar los hábitos completados
    if (user) {
      const userId = user.id;
      const dateString = format(currentDate, 'yyyy-MM-dd');
      
      // Forzar la lectura de la configuración desde localStorage
      const shouldShowCompleted = localStorage.getItem('showCompletedHabits') === 'true';
      
      console.log('Filtrando hábitos completados:', {
        shouldShowCompleted,
        totalHabits: filteredHabits.length
      });
      
      if (!shouldShowCompleted) {
        filteredHabits = filteredHabits.filter(habit => {
          // Verificar en el store global si el hábito está completado
          const isCompletedInStore = isHabitCompleted(userId, String(habit.id), dateString);
          // Verificar en el estado local
          const habitKey = `${habit.index}-${dateString}`;
          const isCompletedLocal = habitStatus[habitKey]?.status === 'completed';
          
          const isCompleted = isCompletedInStore || isCompletedLocal;
          
          console.log(`Hábito ${habit.name}:`, { 
            isCompletedInStore, 
            isCompletedLocal, 
            isCompleted,
            willShow: !isCompleted
          });
          
          return !isCompleted;
        });
        
        console.log('Hábitos después de filtrar:', filteredHabits.length);
      }
    }

    // Aplicar el ordenamiento
    return filteredHabits.sort((a, b) => {
      switch (sortPreference) {
        case 'time':
          if (!a.time && !b.time) return 0;
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        
        case 'name':
          return a.name.localeCompare(b.name);
        
        case 'creationDate':
          // Convertir los IDs a números antes de la comparación
          return Number(b.id) - Number(a.id);
        
        default:
          return 0;
      }
    });
  }, [habits, sortPreference, showCompletedHabits, habitStatus, currentDate, user, isHabitCompleted]);

  // Guardar preferencia cuando cambie
  useEffect(() => {
    localStorage.setItem('habitSortPreference', sortPreference);
  }, [sortPreference]);

  // Guardar preferencia de mostrar hábitos completados
  useEffect(() => {
    localStorage.setItem('showCompletedHabits', showCompletedHabits.toString());
  }, [showCompletedHabits]);

  // Guardar preferencia cuando cambie
  useEffect(() => {
    localStorage.setItem('blockFutureDates', blockFutureDates.toString());
  }, [blockFutureDates]);

  const updateHabitTime = useCallback((habitId: number, newTime: string) => {
    // Calcular los nuevos hábitos primero
    const newHabits = habits.map((habit: Habit) => {
      if (habit.id === habitId) {
        return {
          ...habit,
          time: newTime
        };
      }
      return habit;
    });
    
    // Actualizar el estado directamente
    setHabits(newHabits);
    localStorage.setItem('habits', JSON.stringify(newHabits));
  }, [habits, setHabits]);

  // Modificar este efecto
  useEffect(() => {
    try {
      if (habits.length > 0) {
        setHabitStatus(prev => {
          const currentStatus = { ...prev };
          habits.forEach(habit => {
            const habitKey = `${habit.index}-${format(currentDate, 'yyyy-MM-dd')}`;
            if (!currentStatus[habitKey]) {
              currentStatus[habitKey] = {
                status: '',
                timestamp: new Date().toISOString()
              };
            }
          });
          return currentStatus;
        });
      }
    } catch {
      // Silent error handling
    }
  }, [habits, currentDate]); // Depender de habits y currentDate

  // Añadir un efecto para cargar los hábitos completados
  useEffect(() => {
    const loadCompletedHabits = async () => {
      if (user) {
        // Cargar hábitos completados para la semana actual
        const startDate = startOfWeek(new Date());
        const endDate = endOfWeek(new Date());
        
        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateString = format(d, 'yyyy-MM-dd');
          const { success, data } = await getCompletedHabits(user.id, dateString);
          
          if (success && data) {
            data.forEach(item => {
              setCompletedHabit(user.id, item.habit_id, dateString, true);
            });
          }
        }
      }
    };
    
    loadCompletedHabits();
  }, [user]);

  // Reemplazar el setter original con una función personalizada
  const setShowCompletedHabitsAndUpdate = useCallback((value: boolean) => {
    console.log('Actualizando showCompletedHabits a:', value);
    
    // Actualizar el estado
    setShowCompletedHabits(value);
    
    // Forzar la actualización en localStorage
    localStorage.setItem('showCompletedHabits', value.toString());
    
    // Notificar al usuario
    toast({
      title: value ? "Mostrando hábitos completados" : "Ocultando hábitos completados",
      description: value ? "Ahora verás todos los hábitos, incluso los completados" : "Los hábitos completados se ocultarán automáticamente",
      variant: "success"
    });
    
    // Recargar la página para asegurar que los cambios se apliquen
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }, [toast]);

  return {
    habits,
    habitStatus,
    currentDate,
    setCurrentDate,
    addHabit,
    deleteHabit,
    updateHabitStatus,
    updateHabit,
    updateHabitTime,
    setHabits,
    completedHabit: completedHabitLocal,
    setCompletedHabit: setCompletedHabitLocal,
    isHabitCompletedDialogOpen,
    setIsHabitCompletedDialogOpen,
    handleDateChange,
    sortPreference,
    setSortPreference,
    getSortedHabits,
    showCompletedHabits,
    setShowCompletedHabits: setShowCompletedHabitsAndUpdate,
    blockFutureDates,
    setBlockFutureDates
  };
};