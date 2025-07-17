import { format } from 'date-fns';
import { Difficulty } from '@/components/types/types';

// Tipos
export interface Habit {
  id: number;
  index: number;
  name: string;
  description: string;
  timeObjective: number | 'indefinite';
  difficulty: Difficulty;
  time: string | null;
  noSpecificTime: boolean;
  color: string;
  record: number;
  currentStreak: number;
  startDate: string;
  selectedDays: number[];
}

export interface HabitStatus {
  status: string;
  timestamp: string;
}

export interface HabitStatusMap {
  [key: string]: HabitStatus;
}

interface StreakResult {
  streak: number;
}

// Función auxiliar para obtener fechas en un rango
const getDatesInRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const calculateCurrentStreak = (
  habitName: string,
  today: Date,
  startDate: Date,
  habitStatus: Record<string, HabitStatus>,
  habitIndex: number,
  selectedDays: number[]
): StreakResult => {
  let currentStreak = 0;

  // 1. Obtener las fechas completadas correctamente
  const completedDates = Object.entries(habitStatus)
    .filter(([key, value]) => 
      key.startsWith(`${habitIndex}-`) && 
      value.status === 'completed'
    )
    .map(([key]) => {
      // Extraer la fecha completa, no solo el año
      const [_, dateStr] = key.split(`${habitIndex}-`);
      return dateStr;
    })
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (completedDates.length === 0) return { streak: 0 };

  // 2. Iniciar la racha con el primer día
  currentStreak = 1;
  let lastDate = new Date(completedDates[0]);

  // 3. Verificar días consecutivos
  for (let i = 1; i < completedDates.length; i++) {
    const currentDate = new Date(completedDates[i]);
    
    // Calcular diferencia en días
    const diffDays = Math.round(
      (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays === 1) {
      currentStreak++;
      lastDate = currentDate;
    } else {
      break;
    }
  }

  return { streak: currentStreak };
};

export const calculateRecord = (
  habit: Habit,
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date
): number => {
  let maxStreak = 0;
  let currentStreak = 0;
  
  // 1. Obtener todas las fechas completadas ordenadas
  const completedDates = Object.entries(habitStatus)
    .filter(([key, value]) => 
      key.startsWith(`${habit.index}-`) && 
      value.status === 'completed'
    )
    .map(([key]) => {
      const [_, dateStr] = key.split(`${habit.index}-`);
      return dateStr;
    })
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (completedDates.length === 0) return 0;

  // 2. Calcular la racha más larga
  currentStreak = 1;
  let lastDate = new Date(completedDates[0]);

  for (let i = 1; i < completedDates.length; i++) {
    const currentDate = new Date(completedDates[i]);
    
    const diffDays = Math.round(
      (lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
      lastDate = currentDate;
    } else {
      currentStreak = 1;
      lastDate = currentDate;
    }
  }

  // El récord será el máximo entre la racha actual y el récord anterior
  maxStreak = Math.max(maxStreak, currentStreak);

  return maxStreak;
};

export const getCompletedDays = (
  habit: Habit,
  habitStatus: HabitStatusMap
): number => {
  return Object.entries(habitStatus)
    .filter(([key, value]) => 
      key.startsWith(`${habit.index}-`) && 
      value.status === 'completed'
    ).length;
};