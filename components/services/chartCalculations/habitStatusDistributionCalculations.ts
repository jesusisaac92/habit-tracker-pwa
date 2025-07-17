import { HabitStatus } from '@/components/types/types';

interface MonthlyTrendData {
  month: string;
  [key: `year${number}`]: number;
}

export const generateHabitStatusDistribution = (
  habitIndex: number,
  currentDate: Date,
  habitStatus: Record<string, HabitStatus>
) => {
  const yearData = [];
  const currentYear = currentDate.getFullYear();
  const lastYear = currentYear - 1;

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Para cada mes
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
    let currentYearPoints = 0;
    let lastYearPoints = 0;
    const pointsPerDay = 100 / daysInMonth;
    
    // Calcular puntos del año actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, month, day);
      if (date > currentDate) break;
      
      const dateStr = date.toISOString().split('T')[0];
      const statusKey = `${habitIndex}-${dateStr}`;
      const status = habitStatus[statusKey]?.status || 'not-completed';
      
      if (status === 'completed') {
        currentYearPoints += pointsPerDay;
      }
    }

    // Calcular puntos del año anterior
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${lastYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const statusKey = `${habitIndex}-${dateStr}`;
      const status = habitStatus[statusKey]?.status || 'not-completed';
      
      if (status === 'completed') {
        lastYearPoints += pointsPerDay;
      }
    }

    yearData.push({
      month: months[month],
      [`year${currentYear}`]: Math.round(currentYearPoints * 100) / 100,
      [`year${lastYear}`]: Math.round(lastYearPoints * 100) / 100
    });
  }

  console.log('Generated Annual Data:', {
    currentYear,
    lastYear,
    sampleData: yearData.slice(0, 2)
  });

  return yearData;
}; 