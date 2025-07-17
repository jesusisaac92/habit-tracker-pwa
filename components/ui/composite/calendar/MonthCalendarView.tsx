import { Button } from "@/components/ui/primitives/button"
import * as React from "react"
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Badge } from "../../primitives/badge"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Task, Habit } from "@/components/types/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select"
import { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'next-i18next';
import { normalizeDate, formatDateToString } from '@/utils/dateUtils';
import { useHabitStore } from '@/store/useHabitStore';

// Definir los niveles de carga de actividades y sus colores
const activityLevels = {
  free: { max: 1, color: "bg-green-500 text-white", label: "Libre" },
  light: { max: 3, color: "bg-blue-400 text-white", label: "Ligero" },
  moderate: { max: 5, color: "bg-yellow-500 text-white", label: "Moderado" },
  busy: { max: 7, color: "bg-orange-500 text-white", label: "Ocupado" },
  overloaded: { max: Infinity, color: "bg-red-500 text-white", label: "Sobrecargado" }
};

interface MonthCalendarViewProps {
  tasks: Task[];
  habits?: Habit[];
  habitStatus?: Record<string, { status: string }>;
  selectedDate: Date;
  onDateSelect: (date: Date, isMonthChange: boolean) => void;
  onViewChange: (view: 'day' | 'month') => void;
  descriptionId?: string; // ID opcional para el aria-describedby
}

export const MonthCalendarView = ({ 
  tasks, 
  habits = [], 
  habitStatus = {}, 
  selectedDate, 
  onDateSelect, 
  onViewChange,
  descriptionId
}: MonthCalendarViewProps) => {
  const { t } = useTranslation('common');
  const [viewMode, setViewMode] = useState<'calendar' | 'month' | 'year'>('calendar');
  
  const days = [
    t('calendar.weekDays.monday').toLowerCase(),
    t('calendar.weekDays.tuesday').toLowerCase(),
    t('calendar.weekDays.wednesday').toLowerCase(),
    t('calendar.weekDays.thursday').toLowerCase(),
    t('calendar.weekDays.friday').toLowerCase(),
    t('calendar.weekDays.saturday').toLowerCase(),
    t('calendar.weekDays.sunday').toLowerCase()
  ];
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');

  // Configuración de gestos de deslizamiento
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Al deslizar a la izquierda, avanzamos al mes siguiente
      setSlideDirection('left');
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + 1);
      handleMonthChange(newDate);
    },
    onSwipedRight: () => {
      // Al deslizar a la derecha, retrocedemos al mes anterior
      setSlideDirection('right');
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() - 1);
      handleMonthChange(newDate);
    },
    preventScrollOnSwipe: true,
    trackMouse: false,
    swipeDuration: 500,
    delta: 50, // Mínima distancia para considerar un swipe
    trackTouch: true
  });

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Añadir descripción para lectores de pantalla
  const calendarDescription = t('calendar.description', 'Vista de calendario mensual donde puede ver y gestionar sus tareas y hábitos.');

  // Función para obtener tareas para una fecha específica
  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task) return false;
      
      const normalizedCompareDate = formatDateToString(date);
      
      // Verificar dueDate normal
      if (task.dueDate) {
        const normalizedTaskDate = formatDateToString(task.dueDate);
        if (normalizedTaskDate === normalizedCompareDate) return true;
      }
      
      // Verificar fechas recurrentes
      if (task.is_recurring && task.recurring_dates) {
        return task.recurring_dates.includes(normalizedCompareDate);
      }
      
      return false;
    });
  };

  // Nueva función para obtener hábitos para una fecha específica
  const getHabitsForDate = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const normalizedCompareDate = formatDateToString(date);
    
    return habits.filter(habit => {
      if (!habit) return false;
      
      // Check date range
      const startDate = habit.startDate ? new Date(habit.startDate) : null;
      const endDate = habit.endDate ? new Date(habit.endDate) : null;
      const currentDate = new Date(normalizedCompareDate);
      
      if (startDate && currentDate < startDate) return false;
      if (endDate && !habit.isIndefinite && currentDate > endDate) return false;
      
      // Check time exceptions
      if (habit.time_exceptions && habit.time_exceptions[normalizedCompareDate]) {
        return true;
      }
      
      // If no specific days are selected or all days are selected, show for all days
      if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
        return true;
      }
      
      // IMPORTANT: habit.selectedDays are stored in JavaScript format (0=Sunday, 1=Monday, ..., 6=Saturday)
      // and dayOfWeek is also in JavaScript format, so we can compare directly
      return habit.selectedDays.includes(dayOfWeek);
    });
  };

  // Función para obtener el total de actividades (tareas + hábitos) para una fecha
  const getActivitiesForDate = (date: Date) => {
    const tasks = getTasksForDate(date);
    const habits = getHabitsForDate(date);
    return [...tasks, ...habits];
  };

  // Nueva función para determinar el nivel de actividad según la cantidad
  const getActivityLevel = (count: number) => {
    if (count <= activityLevels.free.max) return activityLevels.free;
    if (count <= activityLevels.light.max) return activityLevels.light;
    if (count <= activityLevels.moderate.max) return activityLevels.moderate;
    if (count <= activityLevels.busy.max) return activityLevels.busy;
    return activityLevels.overloaded;
  };

  // Para las flechas de navegación
  const handleMonthChange = (newDate: Date) => {
    onDateSelect(newDate, true); // Indicamos explícitamente que es un cambio de mes
  };

  // Para el click en un día específico
  const handleDayClick = (date: Date) => {
    onDateSelect(date, false); // Indicamos que es un click en día
  };

  const handlePreviousMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    handleMonthChange(newDate); // Usamos la nueva función
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    handleMonthChange(newDate); // Usamos la nueva función
  };

  const handleMonthSelect = (month: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(month);
    handleMonthChange(newDate); // Usamos handleMonthChange para que no cambie a vista diaria
    setViewMode('calendar'); // Cambiamos a la vista de calendario
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    handleMonthChange(newDate); // Usamos handleMonthChange para que no cambie a vista diaria
    setViewMode('month'); // Cambiamos a la vista de meses
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of the first day of the month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    let startDay = firstDay.getDay();
    
    // Convert to our format (0 = Monday, ..., 6 = Sunday)
    // If it's Sunday (0), it should be 6
    // For other days, we subtract 1
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    const daysInMonth = lastDay.getDate();
    
    return {
      startDay, // In app format (0 = Monday, ..., 6 = Sunday)
      totalDays: daysInMonth
    };
  };

  if (viewMode === 'year') {
    const currentYear = selectedDate.getFullYear();
    const years = Array.from({ length: 12 }, (_, i) => currentYear - 5 + i);

    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(selectedDate);
                newDate.setFullYear(newDate.getFullYear() - 1);
                handleMonthChange(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="font-medium text-sm sm:text-base">
              {currentYear}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(selectedDate);
                newDate.setFullYear(newDate.getFullYear() + 1);
                handleMonthChange(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-2 flex-1" {...swipeHandlers}>
          {years.map((year) => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={cn(
                "p-4 rounded hover:bg-muted/50",
                currentYear === year && "bg-blue-500 text-white"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === 'month') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(selectedDate);
                newDate.setFullYear(newDate.getFullYear() - 1);
                handleMonthChange(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <button 
              onClick={() => setViewMode('year')}
              className="font-medium hover:underline text-sm sm:text-base"
            >
              {selectedDate.getFullYear()}
            </button>

            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                const newDate = new Date(selectedDate);
                newDate.setFullYear(newDate.getFullYear() + 1);
                handleMonthChange(newDate);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 p-2 flex-1" {...swipeHandlers}>
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthSelect(index)}
              className={cn(
                "p-4 rounded hover:bg-muted/50",
                selectedDate.getMonth() === index && "bg-blue-500 text-white"
              )}
            >
              {month}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {descriptionId && (
        <div className="sr-only" id={descriptionId}>
          {calendarDescription}
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSlideDirection('right');
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() - 1);
              handleMonthChange(newDate);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <button 
            onClick={() => setViewMode('month')}
            className="font-medium hover:underline text-sm sm:text-base"
          >
            {format(selectedDate, 'MMMM yyyy', { locale: es })}
          </button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSlideDirection('left');
              const newDate = new Date(selectedDate);
              newDate.setMonth(newDate.getMonth() + 1);
              handleMonthChange(newDate);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-rows-[auto_1fr] overflow-hidden" {...swipeHandlers}>
        <div className="grid grid-cols-7">
          {days.map((day) => (
            <div
              key={day}
              className="h-10 flex items-center justify-center text-sm font-medium border-b"
            >
              {day.toLowerCase()}
            </div>
          ))}
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div 
            key={selectedDate.getMonth() + '-' + selectedDate.getFullYear()}
            className="grid grid-cols-7 h-full"
            initial={{ 
              x: slideDirection === 'left' ? 300 : -300,
              opacity: 0 
            }}
            animate={{ 
              x: 0,
              opacity: 1 
            }}
            exit={{ 
              x: slideDirection === 'left' ? -300 : 300,
              opacity: 0 
            }}
            transition={{ 
              type: "spring", 
              stiffness: 260, 
              damping: 20 
            }}
          >
            {(() => {
              const { startDay, totalDays } = getDaysInMonth(selectedDate);
              const totalCells = Math.ceil((startDay + totalDays) / 7) * 7;
              
              return Array.from({ length: totalCells }).map((_, i) => {
                const dayNumber = i - startDay + 1;
                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dayNumber);
                const isToday = date.toDateString() === new Date().toDateString();
                const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                const dayActivities = getActivitiesForDate(date);
                const activityLevel = getActivityLevel(dayActivities.length);

                return (
                  <div
                    key={i}
                    className={cn(
                      "h-full border relative cursor-pointer hover:bg-gray-50 flex flex-col",
                      !isCurrentMonth && "bg-gray-50 text-gray-400",
                      isToday && "bg-black dark:bg-white text-white dark:text-black"
                    )}
                    onClick={() => handleDayClick(date)}
                  >
                    <span className={cn(
                      "absolute top-2 right-2 text-sm",
                      date.getDay() === 0 && "text-red-600"
                    )}>
                      {date.getDate()}
                    </span>
                    {dayActivities.length > 0 && (
                      <div className={cn(
                        "absolute bottom-1 right-1 flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                        activityLevel.color
                      )}>
                        <ClipboardList className="h-3 w-3" />
                        <span className="text-[10px] leading-none font-medium">
                          {dayActivities.length}
                        </span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};