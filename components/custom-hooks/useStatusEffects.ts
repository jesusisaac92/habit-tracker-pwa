import { useEffect } from 'react';
import { Habit, HabitStatus } from '@/components/types/types';
import { StatusEffectsService } from '../services/effectsManagement/statusEffectsService';

interface Props {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  updateHabitStatus: (
    habitIndex: number, 
    date: string, 
    status: HabitStatus['status'],
    options?: { time?: string; points?: number; }
  ) => void;
}

export function useStatusEffects(
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  updateHabitStatus: Props['updateHabitStatus']
) {
  // Efecto para verificar cambios de día
  useEffect(() => {
    StatusEffectsService.checkDayChange(habits, habitStatus, updateHabitStatus);
    
    return StatusEffectsService.scheduleStatusChecks(() => {
      StatusEffectsService.checkDayChange(habits, habitStatus, updateHabitStatus);
    });
  }, [habits, habitStatus, updateHabitStatus]);

  // Efecto para verificar estados de días pasados
  useEffect(() => {
    StatusEffectsService.checkPastDayStatus(
      currentDate,
      habits,
      habitStatus,
      updateHabitStatus
    );
  }, [currentDate, habits, habitStatus, updateHabitStatus]);
} 