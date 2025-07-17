import { supabase } from '../config/client';
import { habitService } from './habit.service';
import { tasksService } from './tasks.service';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addDays, isSameDay } from 'date-fns';

export interface DistributionData {
  name: string;
  value: number;
  color: string;
  hours: number;
  suffix?: {
    text: string;
    style: string;
  };
}

export interface WeeklyBarData {
  day: string;
  date: string;
  habits: Array<{
    name: string;
    hours: number;
    color: string;
  }>;
  taskLabels: Array<{
    labelName: string;
    hours: number;
    color: string;
  }>;
  total: number;
  freeTime: number;
}

// Función para convertir tiempo en string a minutos
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 30; // Tiempo por defecto: 30 minutos
  
  const time = timeStr.toLowerCase().trim();
  
  // Manejar rangos de tiempo como "01:00-06:00" o "1:00-6:00"
  const rangeMatch = time.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (rangeMatch) {
    const startHours = parseInt(rangeMatch[1]);
    const startMinutes = parseInt(rangeMatch[2]);
    const endHours = parseInt(rangeMatch[3]);
    const endMinutes = parseInt(rangeMatch[4]);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Calcular la duración (diferencia entre fin y inicio)
    let duration = endTotalMinutes - startTotalMinutes;
    
    // Manejar el caso donde el rango cruza medianoche (ej: 23:00-01:00)
    if (duration < 0) {
      duration = (24 * 60) + duration; // Agregar 24 horas
    }
    
    return duration;
  }
  
  // Buscar patrones como "30m", "1h", "1.5h", etc.
  const hourMatch = time.match(/(\d+(?:\.\d+)?)\s*h/);
  const minuteMatch = time.match(/(\d+)\s*m/);
  
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]) * 60);
  }
  if (minuteMatch) {
    return parseInt(minuteMatch[1]);
  }
  
  // Si es formato HH:MM (tiempo simple, no rango)
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    return hours * 60 + minutes;
  }
  
  return 30; // Fallback a 30 minutos
};

export const distributionService = {
  // Obtener distribución para un día específico
  async getDayDistribution(userId: string, date: Date): Promise<DistributionData[]> {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay();
      
      // Obtener hábitos del usuario
      const habitsResult = await habitService.getHabits(userId);
      const habits = habitsResult.success ? habitsResult.data : [];
      
      // Obtener tareas del día
      const tasks = await tasksService.getTasks(userId);
      const dayTasks = tasks.filter(task => {
        // Para tareas recurrentes, verificar si la fecha está en recurring_dates
        if (task.is_recurring && task.recurring_dates) {
          return task.recurring_dates.includes(dateStr);
        }
        // Para tareas no recurrentes, verificar due_date
        const taskDate = format(new Date(task.due_date), 'yyyy-MM-dd');
        return taskDate === dateStr;
      });
      
      // Calcular tiempo por ítem individual
      const itemTime: { [key: string]: { minutes: number; color: string; isHabit?: boolean; isTask?: boolean } } = {};
      
      // Procesar hábitos
      habits.forEach((habit: any) => {
        // Obtener fechas de inicio y fin del hábito
        const habitStart = new Date(habit.start_date);
        const habitEnd = habit.is_indefinite ? new Date('2099-12-31') : new Date(habit.end_date);
        
        // Verificar si la fecha actual está dentro del rango del hábito
        if (date >= habitStart && date <= habitEnd) {
          // Verificar si el hábito aplica para este día de la semana
          if (habit.selected_days && habit.selected_days.includes(dayOfWeek)) {
            const minutes = timeToMinutes(habit.time);
            itemTime[habit.title] = {
              minutes: (itemTime[habit.title]?.minutes || 0) + minutes,
              color: habit.color,
              isHabit: true
            };
          }
        }
      });
      
      // Procesar tareas
      dayTasks.forEach((task: any) => {
        const minutes = timeToMinutes(task.time);
        
        // Obtener el nombre de la etiqueta
        const labelName = task.custom_label_name || task.label_id || 'Sin etiqueta';
        const labelColor = task.custom_label_color || task.color || '#3b82f6';
        
        itemTime[labelName] = {
          minutes: (itemTime[labelName]?.minutes || 0) + minutes,
          color: labelColor,
          isTask: true
        };
      });
      
      // Convertir a formato de distribución
      const totalMinutes = Object.values(itemTime).reduce((sum, item) => sum + item.minutes, 0);
      
      if (totalMinutes === 0) {
        return [];
      }
      
      return Object.entries(itemTime).map(([name, data]) => ({
        name: name,
        value: Math.round((data.minutes / totalMinutes) * 100),
        color: data.color,
        hours: Number((data.minutes / 60).toFixed(1)),
        suffix: data.isHabit ? {
          text: 'Hábito',
          style: 'text-[11px] text-gray-400'
        } : data.isTask ? {
          text: 'Tarea',
          style: 'text-[11px] text-gray-400'
        } : undefined
      })).sort((a, b) => b.hours - a.hours);
      
    } catch (error) {
      console.error('Error getting day distribution:', error);
      return [];
    }
  },

  // Obtener distribución para una semana
  async getWeekDistribution(userId: string, date: Date): Promise<DistributionData[]> {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      
      // Obtener hábitos del usuario
      const habitsResult = await habitService.getHabits(userId);
      const habits = habitsResult.success ? habitsResult.data : [];
      
      // Obtener tareas de la semana
      const tasks = await tasksService.getTasks(userId);
      const weekTasks = tasks.filter(task => {
        // Para tareas recurrentes, verificar si alguna fecha está en la semana
        if (task.is_recurring && task.recurring_dates) {
          return task.recurring_dates.some((dateStr: string) => {
            const taskDate = new Date(dateStr);
            return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
          });
        }
        // Para tareas no recurrentes, verificar due_date
        const taskDate = new Date(task.due_date);
        return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
      });
      
      const itemTime: { [key: string]: { minutes: number; color: string; isHabit?: boolean; isTask?: boolean } } = {};
      
      // Procesar hábitos para toda la semana
      habits.forEach((habit: any) => {
        const dailyMinutes = timeToMinutes(habit.time);
        
        // Obtener fechas de inicio y fin del hábito
        const habitStart = new Date(habit.start_date);
        const habitEnd = habit.is_indefinite ? weekEnd : new Date(habit.end_date);
        
        // Determinar el rango real dentro de la semana
        const effectiveStart = habitStart > weekStart ? habitStart : weekStart;
        const effectiveEnd = habitEnd < weekEnd ? habitEnd : weekEnd;
        
        // Si el hábito no aplica en esta semana, saltarlo
        if (effectiveStart > effectiveEnd) {
          return;
        }
        
        // Contar días reales en que aplica el hábito
        let totalMinutes = 0;
        const currentDate = new Date(effectiveStart);
        
        while (currentDate <= effectiveEnd) {
          const dayOfWeek = currentDate.getDay();
          
          // Verificar si este día está en los días seleccionados del hábito
          if (habit.selected_days && habit.selected_days.includes(dayOfWeek)) {
            totalMinutes += dailyMinutes;
          }
          
          // Avanzar al siguiente día
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (totalMinutes > 0) {
          itemTime[habit.title] = {
            minutes: (itemTime[habit.title]?.minutes || 0) + totalMinutes,
            color: habit.color,
            isHabit: true
          };
        }
      });
      
      // Procesar tareas de la semana
      weekTasks.forEach((task: any) => {
        const minutes = timeToMinutes(task.time);
        
        // Obtener el nombre de la etiqueta
        const labelName = task.custom_label_name || task.label_id || 'Sin etiqueta';
        const labelColor = task.custom_label_color || task.color || '#3b82f6';
        
        itemTime[labelName] = {
          minutes: (itemTime[labelName]?.minutes || 0) + minutes,
          color: labelColor,
          isTask: true
        };
      });
      
      // Convertir a formato de distribución
      const totalMinutes = Object.values(itemTime).reduce((sum, item) => sum + item.minutes, 0);
      
      if (totalMinutes === 0) {
        return [];
      }
      
      return Object.entries(itemTime).map(([name, data]) => ({
        name: name,
        value: Math.round((data.minutes / totalMinutes) * 100),
        color: data.color,
        hours: Number((data.minutes / 60).toFixed(1)),
        suffix: data.isHabit ? {
          text: 'Hábito',
          style: 'text-[11px] text-gray-400'
        } : data.isTask ? {
          text: 'Tarea',
          style: 'text-[11px] text-gray-400'
        } : undefined
      })).sort((a, b) => b.hours - a.hours);
      
    } catch (error) {
      console.error('Error getting week distribution:', error);
      return [];
    }
  },

  // Obtener distribución para un mes
  async getMonthDistribution(userId: string, date: Date): Promise<DistributionData[]> {
    try {
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const daysInMonth = monthEnd.getDate();
      
      // Obtener hábitos del usuario
      const habitsResult = await habitService.getHabits(userId);
      const habits = habitsResult.success ? habitsResult.data : [];
      
      // Obtener tareas del mes
      const tasks = await tasksService.getTasks(userId);
      const monthTasks = tasks.filter(task => {
        // Para tareas recurrentes, verificar si alguna fecha está en el mes
        if (task.is_recurring && task.recurring_dates) {
          return task.recurring_dates.some((dateStr: string) => {
            const taskDate = new Date(dateStr);
            return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
          });
        }
        // Para tareas no recurrentes, verificar due_date
        const taskDate = new Date(task.due_date);
        return isWithinInterval(taskDate, { start: monthStart, end: monthEnd });
      });
      
      const itemTime: { [key: string]: { minutes: number; color: string; isHabit?: boolean; isTask?: boolean } } = {};
      
      // Procesar hábitos para todo el mes
      habits.forEach((habit: any) => {
        const dailyMinutes = timeToMinutes(habit.time);
        
        // Obtener fechas de inicio y fin del hábito
        const habitStart = new Date(habit.start_date);
        const habitEnd = habit.is_indefinite ? monthEnd : new Date(habit.end_date);
        
        // Determinar el rango real dentro del mes
        const effectiveStart = habitStart > monthStart ? habitStart : monthStart;
        const effectiveEnd = habitEnd < monthEnd ? habitEnd : monthEnd;
        
        // Si el hábito no aplica en este mes, saltarlo
        if (effectiveStart > effectiveEnd) {
          return;
        }
        
        // Contar días reales en que aplica el hábito
        let totalMinutes = 0;
        const currentDate = new Date(effectiveStart);
        
        while (currentDate <= effectiveEnd) {
          const dayOfWeek = currentDate.getDay();
          
          // Verificar si este día está en los días seleccionados del hábito
          if (habit.selected_days && habit.selected_days.includes(dayOfWeek)) {
            totalMinutes += dailyMinutes;
          }
          
          // Avanzar al siguiente día
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (totalMinutes > 0) {
          itemTime[habit.title] = {
            minutes: (itemTime[habit.title]?.minutes || 0) + totalMinutes,
            color: habit.color,
            isHabit: true
          };
        }
      });
      
      // Procesar tareas del mes
      monthTasks.forEach((task: any) => {
        const minutes = timeToMinutes(task.time);
        
        // Obtener el nombre de la etiqueta
        const labelName = task.custom_label_name || task.label_id || 'Sin etiqueta';
        const labelColor = task.custom_label_color || task.color || '#3b82f6';
        
        itemTime[labelName] = {
          minutes: (itemTime[labelName]?.minutes || 0) + minutes,
          color: labelColor,
          isTask: true
        };
      });
      
      // Convertir a formato de distribución
      const totalMinutes = Object.values(itemTime).reduce((sum, item) => sum + item.minutes, 0);
      
      if (totalMinutes === 0) {
        return [];
      }
      
      return Object.entries(itemTime).map(([name, data]) => ({
        name: name,
        value: Math.round((data.minutes / totalMinutes) * 100),
        color: data.color,
        hours: Number((data.minutes / 60).toFixed(1)),
        suffix: data.isHabit ? {
          text: 'Hábito',
          style: 'text-[11px] text-gray-400'
        } : data.isTask ? {
          text: 'Tarea',
          style: 'text-[11px] text-gray-400'
        } : undefined
      })).sort((a, b) => b.hours - a.hours);
      
    } catch (error) {
      console.error('Error getting month distribution:', error);
      return [];
    }
  },

  // Nueva función para obtener datos de barras semanales
  async getWeeklyBarData(userId: string, date: Date): Promise<WeeklyBarData[]> {
    try {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      
      // Obtener hábitos del usuario
      const habitsResult = await habitService.getHabits(userId);
      const habits = habitsResult.success ? habitsResult.data : [];
      
      // Obtener tareas de la semana
      const tasks = await tasksService.getTasks(userId);
      const weekTasks = tasks.filter(task => {
        // Para tareas recurrentes, verificar si alguna fecha está en la semana
        if (task.is_recurring && task.recurring_dates) {
          return task.recurring_dates.some((dateStr: string) => {
            const taskDate = new Date(dateStr);
            return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
          });
        }
        // Para tareas no recurrentes, verificar due_date
        const taskDate = new Date(task.due_date);
        return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
      });
      
      // Crear array de días de la semana
      const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const weeklyData: WeeklyBarData[] = [];
      
      // Para cada día de la semana
      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(weekStart, i);
        const dayOfWeek = i === 6 ? 0 : i + 1; // Convertir: Lun=1, Mar=2, ..., Dom=0
        
        const dayHabits: Array<{name: string; hours: number; color: string}> = [];
        const taskLabelGroups: { [key: string]: { hours: number; color: string } } = {};
        
        // Calcular hábitos individuales para este día
        habits.forEach((habit: any) => {
          // Verificar si el hábito está activo en este día
          const habitStart = new Date(habit.start_date);
          const habitEnd = habit.is_indefinite ? new Date('2099-12-31') : new Date(habit.end_date);
          
          // Verificar si la fecha actual está dentro del rango del hábito
          if (currentDay >= habitStart && currentDay <= habitEnd) {
            // Verificar si este día de la semana está seleccionado
            if (habit.selected_days && habit.selected_days.includes(dayOfWeek)) {
              const minutes = timeToMinutes(habit.time);
              const hours = Number((minutes / 60).toFixed(1));
              
              dayHabits.push({
                name: habit.title,
                hours: hours,
                color: habit.color
              });
            }
          }
        });
        
        // Calcular tareas agrupadas por etiquetas para este día
        weekTasks.forEach((task: any) => {
          let isTaskForThisDay = false;
          
          // Para tareas recurrentes, verificar si currentDay está en recurring_dates
          if (task.is_recurring && task.recurring_dates) {
            const currentDayStr = format(currentDay, 'yyyy-MM-dd');
            isTaskForThisDay = task.recurring_dates.includes(currentDayStr);
          } else {
            // Para tareas no recurrentes, comparar con due_date
            const taskDate = new Date(task.due_date);
            isTaskForThisDay = isSameDay(taskDate, currentDay);
          }
          
          if (isTaskForThisDay) {
            const minutes = timeToMinutes(task.time);
            const hours = Number((minutes / 60).toFixed(1));
            
            // Obtener el nombre de la etiqueta
            const labelName = task.custom_label_name || task.label_id || 'Sin etiqueta';
            const labelColor = task.custom_label_color || task.color || '#f59e0b';
            
            if (!taskLabelGroups[labelName]) {
              taskLabelGroups[labelName] = { hours: 0, color: labelColor };
            }
            taskLabelGroups[labelName].hours += hours;
          }
        });
        
        // Convertir grupos de etiquetas a array
        const taskLabels = Object.entries(taskLabelGroups).map(([labelName, data]) => ({
          labelName,
          hours: data.hours,
          color: data.color
        }));
        
        // Calcular total
        const habitsTotal = dayHabits.reduce((sum, habit) => sum + habit.hours, 0);
        const tasksTotal = taskLabels.reduce((sum, label) => sum + label.hours, 0);
        const programmedTotal = habitsTotal + tasksTotal;
        const freeTime = Math.max(0, 24 - programmedTotal);
        
        weeklyData.push({
          day: weekDays[i],
          date: format(currentDay, 'yyyy-MM-dd'),
          habits: dayHabits,
          taskLabels: taskLabels,
          total: programmedTotal,
          freeTime: Number(freeTime.toFixed(1))
        });
      }
      
      return weeklyData;
      
    } catch (error) {
      console.error('Error getting weekly bar data:', error);
      return [];
    }
  }
}; 