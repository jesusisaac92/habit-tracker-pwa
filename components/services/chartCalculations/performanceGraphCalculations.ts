import { GraphPeriodType, HabitStatusMap } from '@/components/types/types';
import { generateMonthData } from '@/components/utils/habitDataGenerators';
import { Habit } from '@/components/types/types';
import { useTranslation } from 'next-i18next';

export const generatePerformanceGraphData = (
  habit: Habit,
  habitStatus: Record<string, any>,
  currentDate: Date
) => {
  if (!habitStatus || !habit) {
    return [];
  }

  try {
    // Generar datos para el mes actual
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Crear array con los días del mes
    const monthData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Intentar con diferentes claves posibles
      const possibleKeys = [
        `${habit.id}-${dateString}`,                    // ID local
        `${habit.supabase_id}-${dateString}`,          // ID de Supabase
        `${habit.index}-${dateString}`,                // Índice (legacy)
        `0-${dateString}`                              // Clave alternativa
      ].filter(Boolean); // Eliminar claves undefined/null
      
      // Verificar cada clave posible
      let isCompleted = false;
      let timeValue = '';
      let matchedKey = '';
      
      for (const key of possibleKeys) {
        const status = habitStatus[key]?.status;
        if (status === 'completed' || status === 1) {
          isCompleted = true;
          timeValue = habitStatus[key]?.time || '';
          matchedKey = key;
          break;
        }
      }
      
      return {
        day,
        status: isCompleted ? 'completed' : 'not-completed',
        points: isCompleted ? 100 : 0,
        time: timeValue
      };
    });

    return monthData;

  } catch (error) {
    return [];
  }
};

// Función auxiliar para calcular el rendimiento diario
export const calculateDailyPerformance = (
  data: any[],
  daysInMonth: number
) => {
  const pointsPerDay = 100 / daysInMonth;
  const decayRate = 0.30; // 30% de reducción por día

  const result = data.map((day, index) => {
    let accumulatedPoints = 0;
    let lastCompletedPoints = 0;
    let daysSinceLastCompleted = 0;

    for (let i = 0; i <= index; i++) {
      if (data[i]?.status === 'completed') {
        accumulatedPoints += pointsPerDay;
        lastCompletedPoints = accumulatedPoints;
        daysSinceLastCompleted = 0;
      } else {
        daysSinceLastCompleted++;
        const decayFactor = Math.pow(1 - decayRate, daysSinceLastCompleted);
        accumulatedPoints = lastCompletedPoints * decayFactor;
      }
    }

    return {
      ...day,
      points: Math.round(accumulatedPoints * 100) / 100
    };
  });

  return result;
};

export const generateAnnualPerformanceData = (selectedHabit: any, habitStatus: any, currentDate: Date) => {
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const currentYear = currentDate.getFullYear();
  const previousYear = currentYear - 1;
  
  // Filtrar habitStatus para incluir entradas del año actual y anterior
  const currentYearStatus: Record<string, any> = {};
  const previousYearStatus: Record<string, any> = {};
  
  Object.entries(habitStatus).forEach(([key, value]) => {
    // Las claves tienen formato: "habitId-YYYY-MM-DD"
    if (key.includes(`-${currentYear}-`)) {
      currentYearStatus[key] = value;
    } else if (key.includes(`-${previousYear}-`)) {
      previousYearStatus[key] = value;
    }
  });

  return monthKeys.map((monthKey, index) => {
    // Datos del mes actual
    const monthDate = new Date(currentYear, index, 1);
    const monthData = generatePerformanceGraphData(selectedHabit, currentYearStatus, monthDate);
    const daysInMonth = new Date(currentYear, index + 1, 0).getDate();
    
    const pointsPerDay = 100 / daysInMonth;
    const completedDays = monthData.filter(day => day.status === 'completed').length;
    const currentPercentage = (completedDays * pointsPerDay);

    // Datos del mismo mes pero del año anterior
    const previousYearDate = new Date(previousYear, index, 1);
    const previousMonthData = generatePerformanceGraphData(selectedHabit, previousYearStatus, previousYearDate);
    const daysInPreviousMonth = new Date(previousYear, index + 1, 0).getDate();
    
    const previousPointsPerDay = 100 / daysInPreviousMonth;
    const previousCompletedDays = previousMonthData.filter(day => day.status === 'completed').length;
    const previousPercentage = (previousCompletedDays * previousPointsPerDay);

    return {
      month: monthKey,
      points: currentPercentage,
      lastYearPoints: previousPercentage,
      completedDays,
      totalDays: daysInMonth,
      previousCompletedDays,
      previousTotalDays: daysInPreviousMonth,
      period: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
      year: currentYear
    };
  });
};
