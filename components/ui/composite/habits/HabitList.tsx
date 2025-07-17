import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/primitives/card";
import { Button } from "@/components/ui/primitives/button";
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, LineChart as LineChartIcon, Calendar, X, Check, Clock, BarChart as BarChartIcon, Plus, PlusCircle } from "lucide-react";
import { HABIT_ICONS, type HabitIconType } from "@/components/ui/composite/common/IconSelector";
import { Habit, HabitStatus, ObjectiveHistory } from "@/components/types/types";
import { HabitMenu as HabitMenuComponent } from "@/components/dialogs/habits/habit-menu";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/components/ui/providers/toast/use-toast";
import { 
  Book,
  Timer as Run,
  Flower as Meditation,
  Coffee, 
  Music, 
  Code, 
  Dumbbell as Gym,
  Palette as Paint,
  Languages,
  Brain,
  Pencil, 
  Heart, 
  Sun, 
  Moon
} from 'lucide-react';
import { HabitEndDialog } from "@/components/dialogs/habits/HabitEndDialog";
import { HabitContinueDialog } from "@/components/dialogs/habits/HabitContinueDialog";
import { startOfDay, format, endOfDay } from 'date-fns';
import { HabitCompletionButton } from "@/components/ui/composite/habits/HabitCompletionButton";
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { useHabitStore } from '@/store/useHabitStore';
import { getCompletedHabits } from '@/src/supabase/services/habitCompletion.service';
import { useAuth } from '@/src/supabase/hooks/useAuth'; 
import { supabase } from '@/src/supabase/config/client';

interface HabitListProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  handleHabitComplete: (habitIndex: number, dateString: string) => void;
  handleAddNote: (index: number, date: string) => void;
  generateGraphData: (index: number) => void;
  handleCalendarOpen: (index: number) => void;
  handleEditClick: (habit: Habit) => void;
  deleteHabit: (habitId: string) => void;
  hasNote: (index: number, date: string) => boolean;
  searchQuery?: string;
  updateHabitDirectly: (habit: Habit) => void;
  user: { name: string };
  getCompletionRate?: (habit: Habit) => number;
  showCompletedHabits: boolean;
  sortPreference: 'time' | 'name' | 'creationDate';
  blockFutureDates: boolean;
}

// Agregar el mapeo de iconos
const ICON_MAP = {
  book: Book,
  running: Run,
  meditation: Meditation,
  coffee: Coffee,
  music: Music,
  code: Code,
  dumbbell: Gym,
  palette: Paint,
  languages: Languages,
  brain: Brain,
  pencil: Pencil,
  heart: Heart,
  flower: Sun,
  sun: Sun,
  moon: Moon
};

// Mapeo de índices de la interfaz a índices reales de días de la semana
const mapInterfaceIndexToRealIndex = (interfaceIndex: number): number => {
  // En la interfaz: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
  // En JavaScript/estándar: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
  
  // Convertir de índice de interfaz a índice estándar
  if (interfaceIndex === 6) {
    return 0; // Domingo (último en interfaz) es 0 en estándar
  } else {
    return interfaceIndex + 1; // El resto se desplaza una posición
  }
};

// Mapeo de índices reales a índices de la interfaz
const mapRealIndexToInterfaceIndex = (realIndex: number): number => {
  // En JavaScript/estándar: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
  // En la interfaz: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
  
  // Convertir de índice estándar a índice de interfaz
  if (realIndex === 0) {
    return 6; // Domingo (0 en estándar) es el último (6) en la interfaz
  } else {
    return realIndex - 1; // El resto se desplaza una posición hacia atrás
  }
};

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  habitStatus,
  currentDate,
  handleHabitComplete,
  handleAddNote,
  generateGraphData,
  handleCalendarOpen,
  handleEditClick,
  deleteHabit,
  hasNote,
  searchQuery = '',
  updateHabitDirectly,
  user,
  getCompletionRate,
  showCompletedHabits,
  sortPreference,
  blockFutureDates
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const { use24HourFormat } = useTimeFormat();
  const { completedHabits, setCompletedHabit } = useHabitStore(state => ({
    completedHabits: state.completedHabits,
    setCompletedHabit: state.setCompletedHabit
  }));
  const [forceUpdate, setForceUpdate] = useState(0);
  const { user: authUser } = useAuth();
  const [dbCompletedHabits, setDbCompletedHabits] = useState<Record<string, boolean>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const formatTimeDisplay = (timeRange: string) => {
    if (!timeRange) return '';
    
    // Si hay un guión, es un rango de tiempo
    if (timeRange.includes('-')) {
      const [startTime, endTime] = timeRange.split('-');
      return `${formatSingleTime(startTime)}-${formatSingleTime(endTime)}`;
    }
    
    return formatSingleTime(timeRange);
  };

  const formatSingleTime = (time: string) => {
    if (!time) return '';
    if (use24HourFormat) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Primero, optimizar el filtrado con useMemo
  const filteredHabits = useMemo(() => {
    if (!authUser || !habits.length) return [];
    
    const userId = authUser.id || '';
    const userCompletions = completedHabits[userId] || {};
    const currentDateString = format(currentDate, 'yyyy-MM-dd');
    
    // Obtener el día de la semana (0 = domingo, 1 = lunes, ..., 6 = sábado)
    const currentDayOfWeek = currentDate.getDay();
    const currentInterfaceDayIndex = mapRealIndexToInterfaceIndex(currentDayOfWeek);
    
    const filtered = habits.filter(habit => {
      // Primero verificar si el hábito está dentro del rango de fechas
      const startDate = new Date(habit.startDate + 'T12:00:00');
      const currentDateTime = new Date(currentDateString + 'T12:00:00');
      const endDate = habit.endDate ? new Date(habit.endDate + 'T12:00:00') : null;
      
      const isInDateRange = currentDateTime >= startDate && (!endDate || currentDateTime <= endDate);
      
      if (!isInDateRange) {
        return false;
      }
      
      // Si el hábito no tiene días seleccionados o está vacío o tiene todos los días, mostrarlo todos los días
      if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
        // Filter by completion status
        const completionKey = `${habit.id}-${currentDateString}`;
        const isCompleted = userCompletions[completionKey] || false;
        const passesCompletionFilter = !isCompleted || showCompletedHabits;
        
        // Filter by search query
        const passesSearchFilter = !searchQuery || 
          habit.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (habit.description && habit.description.toLowerCase().includes(searchQuery.toLowerCase()));
        
        return passesCompletionFilter && passesSearchFilter;
      }
      
      // Filtrar por días de la semana seleccionados
      // Si el hábito tiene días seleccionados y el día actual no está incluido, no mostrar
      const includesCurrentDay = habit.selectedDays.includes(currentDayOfWeek);
      
      if (!includesCurrentDay) {
        return false;
      }
      
      // Filter by completion status
      const completionKey = `${habit.id}-${currentDateString}`;
      const isCompleted = userCompletions[completionKey] || false;
      const passesCompletionFilter = !isCompleted || showCompletedHabits;
      
      // Filter by search query
      const passesSearchFilter = !searchQuery || 
        habit.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (habit.description && habit.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return passesCompletionFilter && passesSearchFilter;
    });
    
    return filtered;
  }, [habits, completedHabits, authUser, currentDate, showCompletedHabits, searchQuery]);

  useEffect(() => {
    if (authUser && !isInitialized) {
      setIsInitialized(true);
    }
  }, [authUser]);

  const onHabitComplete = (habit: Habit) => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    
    setTimeout(() => {
      handleHabitComplete(habit.index, dateString);
      setForceUpdate(prev => prev + 1);
      
      if (habit.endDate && !habit.isIndefinite) {
        const currentDateNorm = new Date(currentDate.toISOString().split('T')[0] + 'T12:00:00');
        const endDateNorm = new Date(habit.endDate + 'T12:00:00');
        
        if (currentDateNorm.getTime() === endDateNorm.getTime()) {
          const completedObjective = {
            startDate: habit.startDate,
            endDate: habit.endDate,
            timeObjective: habit.timeObjective,
            completed: true
          };
          
          const habitWithHistory = {
            ...habit,
            objectiveHistory: [...(habit.objectiveHistory || []), completedObjective]
          };
          
          setSelectedHabit(habitWithHistory);
          setShowEndDialog(true);
        }
      }
    }, 0);
  };

  const handleContinue = (habit: Habit) => {
    setShowEndDialog(false);
    setShowContinueDialog(true);
  };

  const handleConfirmContinue = (habit: Habit, newEndDate?: string, isIndefinite?: boolean) => {
    const today = startOfDay(new Date());
    const todayString = format(today, 'yyyy-MM-dd');

    const completedObjective: ObjectiveHistory = {
      startDate: habit.startDate,
      endDate: habit.endDate,
      timeObjective: habit.timeObjective,
      completed: true
    };

    const newTimeObjective = isIndefinite 
      ? 'indefinite' 
      : newEndDate 
        ? Math.ceil((new Date(newEndDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : habit.timeObjective;

    const currentObjective: ObjectiveHistory = {
      startDate: todayString,
      endDate: newEndDate,
      timeObjective: newTimeObjective,
      completed: false
    };

    const updatedHabit = {
      ...habit,
      objectiveHistory: [...(habit.objectiveHistory || []), completedObjective],
      currentObjective,
      endDate: newEndDate,
      isIndefinite: isIndefinite ?? false,
      timeObjective: newTimeObjective,
      startDate: todayString
    };

    updateHabitDirectly(updatedHabit);
    setShowContinueDialog(false);
  };

  const onStop = () => {
    setShowEndDialog(false);
  };

  const hasHabitsForDate = habits.some(habit => {
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const startDate = new Date(habit.startDate + 'T12:00:00');
    const currentDateTime = new Date(dateString + 'T12:00:00');
    const endDate = habit.endDate ? new Date(habit.endDate + 'T12:00:00') : null;
    
    // Primero verificar si el hábito está dentro del rango de fechas
    const isInDateRange = currentDateTime >= startDate && (!endDate || currentDateTime <= endDate);
    if (!isInDateRange) {
      return false;
    }
    
    // Verificar si el día de la semana actual está incluido en los días seleccionados
    const currentDayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Si el hábito no tiene días seleccionados o está vacío o tiene todos los días, mostrarlo todos los días
    if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
      return true;
    }
    
    // Si el hábito tiene días seleccionados y el día actual no está incluido, no mostrar
    return habit.selectedDays.includes(currentDayOfWeek);
  });

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await useHabitStore.getState().deleteHabit(habitId);
    } catch (error) {
    }
  };

  const getHabitTime = (habit: Habit, dateString: string) => {
    if (habit.time_exceptions?.[dateString]) {
      return habit.time_exceptions[dateString].time;
    }
    return habit.time;
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isHabitCompleted = (habit: Habit) => {
    if (!authUser) return false;
    const dateString = format(currentDate, 'yyyy-MM-dd');
    const completionKey = `${habit.id}-${dateString}`;
    const completed = completedHabits[authUser.id]?.[completionKey] || false;
    
    return completed;
  };

  if (!isInitialized) {
    return <div className="flex justify-center py-8">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <AnimatePresence mode="sync">
          {habits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <div className="mb-4">
                <PlusCircle className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {t('habits.noHabits.title')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
                {t('habits.noHabits.message')}
              </p>
            </motion.div>
          ) : filteredHabits.length > 0 ? (
            filteredHabits.map((habit) => (
              <motion.div
                key={habit.id}
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-white dark:bg-gray-900 rounded-lg relative overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_8px_-1px_rgba(0,0,0,0.15),0_2px_4px_-2px_rgba(0,0,0,0.15)] transition-shadow duration-300">
                  {isHabitCompleted(habit) && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="bg-green-500 text-white dark:bg-[#1C4532] dark:text-[#4ADE80] px-4 py-1.5 rounded-full text-sm font-medium shadow-md">
                        {t('habits.status.completed')}
                      </div>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-start gap-3 min-w-0 max-w-[calc(100%-120px)]">
                        <div 
                          className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                          style={{ 
                            backgroundColor: habit.color || 'rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          {(() => {
                            const iconData = HABIT_ICONS[habit.icon as HabitIconType];
                            if (!iconData) {
                              return <Book className="w-5 h-5 text-white" />;
                            }
                            const Icon = iconData.icon;
                            return (
                              <Icon 
                                className="w-5 h-5 text-white"
                              />
                            );
                          })()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-gray-900 dark:text-white truncate block">
                            {habit.name}
                          </span>
                          {habit.description && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
                              {habit.description}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-xs text-gray-400/60">
                            <Clock className="h-3 w-3" />
                            {habit.noSpecificTime ? 
                              'S/H' : 
                              (() => {
                                const time = getHabitTime(habit, format(currentDate, 'yyyy-MM-dd'));
                                return time ? formatTimeDisplay(time) : "--:--";
                              })()
                            }
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {!isHabitCompleted(habit) && (
                          <HabitCompletionButton
                            onComplete={() => onHabitComplete(habit)}
                            className="mr-2"
                            date={currentDate}
                            blockFutureDates={blockFutureDates}
                            habit={habit}
                          />
                        )}
                        <HabitMenuComponent
                          habitIndex={habit.index}
                          dateString={format(currentDate, 'yyyy-MM-dd')}
                          generateGraphData={generateGraphData}
                          handleCalendarOpen={handleCalendarOpen}
                          handleEditClick={() => handleEditClick(habit)}
                          deleteHabit={handleDeleteHabit}
                          habit={habit}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center p-8 text-center"
            >
              {habits.length > 0 ? (
                // Cuando todos los hábitos del día están completados
                <>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-full mb-4">
                    <Check className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('habits.completionMessages.title')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md">
                    {t('habits.completionMessages.message')}
                  </p>
                </>
              ) : (
                // Cuando no hay hábitos programados para esta fecha
                <>
                  <div className="bg-gray-200 dark:bg-gray-700 p-4 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {t('habits.noHabitsForDate.title', 'No hay hábitos para hoy')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 max-w-md">
                    {t('habits.noHabitsForDate.message', 'No tienes hábitos programados para este día de la semana o fecha específica.')}
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <HabitEndDialog
        isOpen={showEndDialog}
        onOpenChange={setShowEndDialog}
        habit={selectedHabit}
        onContinue={() => selectedHabit && handleContinue(selectedHabit)}
        onStop={onStop}
        deleteHabit={handleDeleteHabit}
      />

      <HabitContinueDialog
        isOpen={showContinueDialog}
        onOpenChange={setShowContinueDialog}
        habit={selectedHabit}
        onConfirm={(newEndDate?: string, isIndefinite?: boolean) => 
          selectedHabit && handleConfirmContinue(selectedHabit, newEndDate, isIndefinite)
        }
      />
    </div>
  );
};