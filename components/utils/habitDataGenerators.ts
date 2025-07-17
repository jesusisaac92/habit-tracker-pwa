import { HabitStatusMap, GraphDataPoint } from "@/components/types/types";

export const generateMonthData = (
  currentDate: Date,
  habitIndex: number,
  habitStatus: HabitStatusMap,
  isPrevious: boolean = false
): GraphDataPoint[] => {
  const date = new Date(currentDate);
  if (isPrevious) {
    const currentDay = date.getDate();
    date.setMonth(date.getMonth() - 1);
    date.setDate(Math.min(currentDay, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  }
  
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let accumulatedPoints = 0;
  const pointsPerDay = 100 / daysInMonth;
  
  const data: GraphDataPoint[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const statusKey = `${habitIndex}-${dateStr}`;
    const status = habitStatus[statusKey]?.status || 'pending';
    
    if (status === 'completed') {
      accumulatedPoints += pointsPerDay;
    }
    
    data.push({
      day,
      points: Math.round(accumulatedPoints * 100) / 100,
      status,
      time: habitStatus[statusKey]?.time || ''  
    });
  }
  
  return data;
}; 