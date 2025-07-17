"use client"

import * as React from "react"
import { motion, useMotionValue, useTransform, animate } from "framer-motion"
import { Check, Lock, X } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useMemo, useState, useEffect } from "react"
import { Habit, HabitStatus } from "@/components/types/types"
import { markHabitAsCompleted, habitCompletionService } from '@/src/supabase/services/habitCompletion.service'
import { useAuth } from '@/src/supabase/hooks/useAuth'
import { format, isBefore, startOfDay } from 'date-fns'
import { useHabitStore, type HabitStore } from '@/store/useHabitStore'
import { queueHabitCompletion, saveCompletionLocally } from '@/src/services/persistenceService'
import { supabase } from '@/src/supabase/config/client'
import { useToast } from "@/components/ui/providers/toast/use-toast"
import { updateChartMetadata } from '@/src/supabase/services/chartMetadata.service'
import { useChartStore } from '@/store/useChartStore'
import { habitChartsService, CHART_TYPES } from '@/src/supabase/services/habitCharts.service'
import { PastHabitConfirmDialog } from "@/components/dialogs/habits/PastHabitConfirmDialog"

interface HabitCompletionButtonProps {
  onComplete?: () => void
  className?: string
  isLocked?: boolean
  date: Date
  blockFutureDates: boolean
  habit: Habit
}

export function HabitCompletionButton({ 
  onComplete, 
  className,
  date,
  blockFutureDates,
  habit
}: HabitCompletionButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCompleted, setIsCompleted] = React.useState(false)
  const [isInitiallyCompleted, setIsInitiallyCompleted] = useState(false)
  const [isPastConfirmDialogOpen, setIsPastConfirmDialogOpen] = useState(false)
  const progress = useMotionValue(0)
  const opacity = useTransform(progress, [0, 100], [0, 1])
  
  const { user } = useAuth()
  const setCompletedHabit = useHabitStore((state: HabitStore) => state.setCompletedHabit)
  const { toast } = useToast()

  const [forceUpdate, setForceUpdate] = useState(0);

  const getCorrectHabitId = async (habit: Habit, userId: string): Promise<string> => {
    if (habit.supabase_id) {
      return habit.supabase_id;
    }
    
    const { data } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('title', habit.name)
      .maybeSingle();
      
    if (data?.id) {
      habit.supabase_id = data.id;
      return data.id;
    }
    
    const { data: newHabit, error: createError } = await supabase
      .from('habits')
      .insert({
        user_id: userId,
        title: habit.name,
        description: habit.description || '',
        time: habit.time || '',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        is_indefinite: true,
        color: habit.color || '#000000',
        icon: habit.icon || 'default',
        selected_days: habit.selectedDays || []
      })
      .select('id')
      .single();
      
    if (createError) {
      throw new Error('No se pudo crear el hábito');
    }
    
    return newHabit.id;
  };

  const handleComplete = async () => {
    if (isLocked || isPastDate || isLoading || isCompleted || isInitiallyCompleted) return;
    
    setIsLoading(true);
    
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const habitId = await getCorrectHabitId(habit, user?.id || '');
      
      // Actualizar estado local
      setIsCompleted(true);
      
      // Actualizar el store para reflejar el cambio inmediatamente
      const habitIndex = habit.index !== undefined ? habit.index : 0;
      setCompletedHabit(
        user?.id || '',
        habitId,
        dateString,
        true
      );
      
      // Emitir evento habitCompleted para actualizar gráficos
      const habitCompletedEvent = new CustomEvent('habitCompleted', {
        detail: { 
          habitId, 
          date: dateString, 
          completedDate: date 
        }
      });
      window.dispatchEvent(habitCompletedEvent);
      
      // También disparar el evento chartDataUpdated para compatibilidad
      const updateEvent = new CustomEvent('chartDataUpdated', {
        detail: { timestamp: new Date().getTime() }
      });
      window.dispatchEvent(updateEvent);
      
      // Guardar en la base de datos si estamos conectados
      if (user?.id) {
        const result = await markHabitAsCompleted(habitId, user.id, dateString, habit.time);
        if (!result.success) {
          // Guardar la acción pendiente para intentar más tarde
          queueHabitCompletion(habitId, user.id, dateString, habit.time);
        }
      } else {
        // Guardar localmente si no hay conexión
        saveCompletionLocally(habitId, user?.id || '', dateString, habit.time);
      }
      
      // Actualizar las estadísticas y gráficos
      useChartStore.getState().forceRegenerateData(true, date);
      
      // Llamar al callback onComplete si existe
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador específico para cuando el hábito está bloqueado
  const handleLockedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Mostrar un toast informativo
    toast({
      title: "Hábito no disponible",
      description: "Este hábito no está disponible porque corresponde a una fecha futura.",
      variant: "warning",
      duration: 3000
    });
  };
  
  // Manejador específico para cuando el hábito es de un día pasado y no fue completado
  const handlePastDateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Abrir el diálogo de confirmación
    setIsPastConfirmDialogOpen(true);
  };
  
  // Función para completar un hábito de fecha pasada
  const completePastHabit = async () => {
    setIsLoading(true);
    
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const habitId = await getCorrectHabitId(habit, user?.id || '');
      
      // Actualizar estado local
      setIsCompleted(true);
      
      // Actualizar el store
      setCompletedHabit(
        user?.id || '',
        habitId,
        dateString,
        true
      );
      
      // Guardar en la base de datos
      if (user?.id) {
        await markHabitAsCompleted(habitId, user.id, dateString, habit.time);
      }
      
      // Actualizar las estadísticas y gráficos
      useChartStore.getState().forceRegenerateData(true, date);
      
      // Mostrar confirmación
      toast({
        title: "Hábito completado",
        description: `Has marcado "${habit.name}" como completado para el ${format(date, 'dd/MM/yyyy')}.`,
        variant: "success",
        duration: 3000
      });
      
      // Llamar al callback onComplete si existe
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el hábito. Inténtalo de nuevo.",
        variant: "error",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para cancelar la completación de un hábito pasado
  const cancelPastHabitCompletion = () => {
    toast({
      title: "Acción cancelada",
      description: "No se ha modificado el estado del hábito.",
      variant: "default",
      duration: 2000
    });
  };

  const circleOffset = useTransform(progress, [0, 100], [113, 0])

  const isLocked = useMemo(() => {
    if (blockFutureDates) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);
      return selectedDate > today;
    }
    return false;
  }, [date, blockFutureDates]);
  
  // Verificar si es una fecha pasada
  const isPastDate = useMemo(() => {
    const today = startOfDay(new Date());
    const selectedDate = startOfDay(new Date(date));
    return isBefore(selectedDate, today) && !isCompleted && !isInitiallyCompleted;
  }, [date, isCompleted, isInitiallyCompleted]);

  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (!user?.id) return;
      
      const dateString = format(date, 'yyyy-MM-dd');
      const habitId = await getCorrectHabitId(habit, user.id);
      
      try {
        const { data } = await supabase
          .from('habit_completions')
          .select('id')
          .eq('habit_id', habitId)
          .eq('user_id', user.id)
          .eq('completion_date', dateString)
          .maybeSingle();
        
        if (data) {
          setIsInitiallyCompleted(true);
          setIsCompleted(true);
          return;
        }
        
        const isCompletedInStore = useHabitStore.getState().isHabitCompleted(
          user.id,
          habitId,
          dateString
        );
        
        if (isCompletedInStore) {
          setIsInitiallyCompleted(true);
          setIsCompleted(true);
        } else {
          setIsInitiallyCompleted(false);
          setIsCompleted(false);
        }
      } catch (error) {
        // Silent error handling
      }
    };
    
    checkCompletionStatus();
    
    const interval = setInterval(checkCompletionStatus, 2000);
    return () => clearInterval(interval);
  }, [user, habit, date]);

  // Determinar qué manejador de eventos usar
  const getClickHandler = () => {
    if (isLocked) return handleLockedClick;
    if (isPastDate) return handlePastDateClick;
    return handleComplete;
  };

  return (
    <>
      <button
        className={cn(
          "relative w-10 h-10 rounded-full",
          (isCompleted || isInitiallyCompleted)
            ? "bg-emerald-500 border-2 border-emerald-600 shadow-lg"
            : isPastDate
              ? "bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-800 cursor-pointer"
              : isLocked
                ? "bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600",
          className
        )}
        onClick={getClickHandler()}
        disabled={isLoading || isCompleted || isInitiallyCompleted}
        style={{
          backgroundColor: (isCompleted || isInitiallyCompleted) ? "#10b981" : "",
          boxShadow: (isCompleted || isInitiallyCompleted) ? "0 4px 6px rgba(0, 0, 0, 0.1)" : "none"
        }}
      >
        {(isCompleted || isInitiallyCompleted) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Check className="h-6 w-6 text-white" />
          </div>
        )}
        
        {isLocked && !isCompleted && !isInitiallyCompleted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
        )}
        
        {isPastDate && !isCompleted && !isInitiallyCompleted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <X className="h-5 w-5 text-red-500 dark:text-red-400" />
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"
            />
          </div>
        )}
      </button>
      
      {/* Diálogo de confirmación para hábitos de días pasados */}
      <PastHabitConfirmDialog
        isOpen={isPastConfirmDialogOpen}
        onOpenChange={setIsPastConfirmDialogOpen}
        habit={habit}
        date={date}
        onConfirm={completePastHabit}
        onCancel={cancelPastHabitCompletion}
      />
    </>
  )
}