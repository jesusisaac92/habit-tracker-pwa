import { useState, useEffect, useMemo, useRef } from 'react';
import { useTimelinePositioning } from '../useTimelinePositioning';
import { isSameDay } from 'date-fns';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';

interface CurrentTimeLineProps {
  currentDate: Date;  // Añadimos esta prop para recibir la fecha actual del calendario
  hourHeight?: number; // Optional prop for hour height (for zoom)
}

export const CurrentTimeLine = ({ currentDate, hourHeight }: CurrentTimeLineProps) => {
  const { use24HourFormat } = useTimeFormat();
  const { HOUR_HEIGHT } = useTimelinePositioning();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Use the provided hourHeight or fall back to HOUR_HEIGHT from the hook
  const effectiveHourHeight = hourHeight || HOUR_HEIGHT;
  
  // Función para formatear la hora según la configuración
  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (use24HourFormat) {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes} ${period}`;
    }
  };

  const [currentTime, setCurrentTime] = useState(() => {
    return formatTime(new Date());
  });

  // Verificar si es el día actual
  const isToday = useMemo(() => {
    return isSameDay(currentDate, new Date());
  }, [currentDate]);

  // Calculate position based on current time and hour height
  const position = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Convert to pixels based on the effective hour height
    return hours * effectiveHourHeight + (minutes / 60) * effectiveHourHeight;
  }, [effectiveHourHeight]); // Recalculate when hour height changes

  // Actualizar cada minuto solo si es hoy
  useEffect(() => {
    if (!isToday) return; // No actualizar si no es hoy

    const updateTime = () => {
      setCurrentTime(formatTime(new Date()));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [isToday, use24HourFormat]);

  // No renderizar nada si no es hoy
  if (!isToday) return null;

  return (
    <div 
      ref={containerRef} 
      className="timeline-current-line absolute left-0 right-0 z-40 pointer-events-none"
      style={{ 
        top: `${position}px`, // Use absolute pixels for precise positioning
        height: '1px'
      }}
    >
      <div className="absolute w-full">
        <div className="absolute inset-x-0 h-[1px] bg-black/70 dark:bg-white/70" />
        <span className="absolute left-2 -translate-y-1/2 text-xs font-medium text-black dark:text-white bg-white dark:bg-gray-900 px-1 rounded">
          {currentTime}
        </span>
      </div>
    </div>
  );
}; 