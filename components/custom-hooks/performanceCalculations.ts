import { 
    PerformanceCalculationConfig, 
    DailyPerformanceData,
    HabitStatusMap 
  } from '@/components/types/types';
  
  interface DayData {
    status: string;
    time?: string;
  }
  
  export const DEFAULT_CONFIG: PerformanceCalculationConfig = {
    windowSize: 3,
    decayRate: 0.4,
    pointsPerDay: 0 // Se calculará basado en los días del mes
  };
  
  export const calculateDailyPoints = (
    dayData: DayData,
    index: number,
    lastCompletedDay: number,
    consecutiveCount: number,
    peakPoints: number,
    config: PerformanceCalculationConfig
  ): {
    points: number;
    newConsecutiveCount: number;
    newPeakPoints: number;
    newLastCompletedDay: number;
  } => {
    const { pointsPerDay, decayRate } = config;
    let currentPoints = 0;
    let newConsecutiveCount = consecutiveCount;
    let newPeakPoints = peakPoints;
    let newLastCompletedDay = lastCompletedDay;
  
    if (dayData.status === 'completed') {
      if (index === lastCompletedDay + 1) {
        newConsecutiveCount++;
        currentPoints = Math.min(100, pointsPerDay * (1 + newConsecutiveCount));
      } else {
        newConsecutiveCount = 1;
        currentPoints = pointsPerDay;
      }
      newPeakPoints = currentPoints;
      newLastCompletedDay = index;
    } else {
      const daysSinceLastCompleted = index - lastCompletedDay;
      if (daysSinceLastCompleted > 0 && peakPoints > 0) {
        const decayFactor = Math.max(0, 1 - (decayRate * daysSinceLastCompleted));
        currentPoints = peakPoints * decayFactor;
        newConsecutiveCount = 0;
      }
    }
  
    return {
      points: Number(currentPoints.toFixed(1)),
      newConsecutiveCount,
      newPeakPoints,
      newLastCompletedDay
    };
  };
  
  export const generateMonthData = (
    date: Date,
    habitIndex: number,
    habitStatus: HabitStatusMap,
    isPreviousMonth: boolean = false
  ): DailyPerformanceData[] => {
    const targetDate = new Date(date);
    if (isPreviousMonth) {
      targetDate.setMonth(targetDate.getMonth() - 1);
    }
  
    const daysInMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0
    ).getDate();
  
    const config = {
      ...DEFAULT_CONFIG,
      pointsPerDay: 100 / daysInMonth
    };
  
    let lastCompletedDay = -1;
    let peakPoints = 0;
    let consecutiveCount = 0;
  
    return Array.from({ length: daysInMonth }, (_, i): DailyPerformanceData => {
      const day = i + 1;
      const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const statusObj = habitStatus[`${habitIndex}-${dateString}`] || {};
      
      const {
        points,
        newConsecutiveCount,
        newPeakPoints,
        newLastCompletedDay
      } = calculateDailyPoints(
        { status: statusObj.status || '' },
        i,
        lastCompletedDay,
        consecutiveCount,
        peakPoints,
        config
      );
  
      // Actualizar variables de estado
      lastCompletedDay = newLastCompletedDay;
      peakPoints = newPeakPoints;
      consecutiveCount = newConsecutiveCount;
  
      return {
        day,
        points,
        status: statusObj.status || '',
        time: statusObj.time || '',
      };
    });
  };
  
  export const calculateTrend = (
    data: DailyPerformanceData[],
    windowSize: number = 3
  ): DailyPerformanceData[] => {
    return data.map((day, index, array) => {
      let trend = day.points;
      if (index >= windowSize) {
        const window = array.slice(index - windowSize, index + 1);
        const sum = window.reduce((acc, curr) => acc + curr.points, 0);
        trend = sum / windowSize;
      }
      return {
        ...day,
        trend: Number(trend.toFixed(1))
      };
    });
  };