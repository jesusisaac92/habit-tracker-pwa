import React, { useState, useCallback } from 'react';
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/primitives/tooltip";
import { CheckCircle2, MinusCircle, XCircle, Circle } from 'lucide-react';
import { HabitStatus } from '@/components/types/types';

interface MiniCalendarProps {
    habitIndex: number;
    currentDate: Date;
    habitStatus: Record<string, HabitStatus>;
    emotionNotes: Record<string, { emotion: string, note: string }>;
    onViewNote: (habitIndex: number, date: string) => void;
    getStatusClass: (status: HabitStatus['status']) => string;
    startDate: string;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ 
  habitIndex, 
  currentDate, 
  habitStatus, 
  emotionNotes, 
  onViewNote,
  getStatusClass,
  startDate
}) => {
  const [lastTap, setLastTap] = useState<number>(0);
  const DOUBLE_TAP_DELAY = 300; // milisegundos

  const handleTap = useCallback((habitIndex: number, date: string) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;
    
    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      // Doble tap detectado
      onViewNote(habitIndex, date);
    }
    
    setLastTap(now);
  }, [lastTap, onViewNote]);

 

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      case 'partial': return <MinusCircle className="h-4 w-4" />;
      case 'not-completed': return <XCircle className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'partial': return 'Parcial';
      case 'not-completed': return 'No completado';
      default: return 'Sin marcar';
    }
  };

  const getEffectiveStatus = (date: string, status: string, startDate: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    const habitStartDate = new Date(startDate);
    habitStartDate.setHours(0, 0, 0, 0);

    // Si la fecha es anterior a la fecha de inicio del hábito, retornar string vacío
    // para que no se muestre ningún estado
    if (dateToCheck < habitStartDate) {
      return '';
    }

    // Solo marcar como no completado si:
    // 1. La fecha es posterior o igual a la fecha de inicio
    // 2. La fecha es anterior a hoy
    // 3. No está marcado como completado
    if (dateToCheck >= habitStartDate && dateToCheck < today && status !== 'completed') {
      return 'not-completed';
    }

    return status;
  };

  return (
    <div className="space-y-2 sm:space-y-4 px-1 sm:px-4">
      <div className="text-left font-semibold text-base sm:text-lg text-gray-800">
        {monthNames[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(day => (
          <div key={day} className="text-center font-medium text-xs text-gray-400 py-1">
            {day}
          </div>
        ))}
        {Array.from({length: new Date(year, month, 1).getDay()}, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({length: daysInMonth}, (_, i) => {
          const day = i + 1;
          const date = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const rawStatus = habitStatus[`${habitIndex}-${date}`]?.status || '';
          const effectiveStatus = getEffectiveStatus(date, rawStatus, startDate) as HabitStatus['status'];
          const noteKey = `${habitIndex}-${date}`;
          

          return (
            <TooltipProvider key={day}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`
                      text-center
                      ${getStatusClass(effectiveStatus)}
                      relative cursor-pointer 
                      transition-all duration-200 ease-in-out 
                      hover:shadow-sm hover:scale-105
                      rounded-full
                      aspect-square
                      flex items-center justify-center
                      touch-manipulation
                      w-8 sm:w-10
                    `}
                    onDoubleClick={() => onViewNote(habitIndex, date)}
                    onTouchStart={() => handleTap(habitIndex, date)}
                  >
                    <span className="text-xs sm:text-sm font-medium">{day}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  align="center" 
                  className="bg-white border border-gray-100 shadow-sm p-2 rounded-md z-50"
                >
                  <p className="text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">
                    {getStatusText(effectiveStatus)}
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};
