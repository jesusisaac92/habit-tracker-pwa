import React, { useState, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'next-i18next';

interface WeekDayBarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export const WeekDayBar: React.FC<WeekDayBarProps> = ({ selectedDate, onDateSelect }) => {
  const { t } = useTranslation();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const SWIPE_THRESHOLD = 50; // Umbral de deslizamiento para cambiar de semana

  // Asegurarnos de que selectedDate sea una fecha válida
  const safeDate = useMemo(() => {
    return selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
      ? selectedDate 
      : new Date();
  }, [selectedDate]);

  // Función para ir a la semana anterior
  const goToPreviousWeek = () => {
    const newDate = new Date(safeDate);
    newDate.setDate(safeDate.getDate() - 7);
    newDate.setHours(12, 0, 0, 0);
    onDateSelect(newDate);
  };

  // Función para ir a la semana siguiente
  const goToNextWeek = () => {
    const newDate = new Date(safeDate);
    newDate.setDate(safeDate.getDate() + 7);
    newDate.setHours(12, 0, 0, 0);
    onDateSelect(newDate);
  };

  // Configurar los handlers para el swipe
  const swipeHandlers = useSwipeable({
    onSwiping: (e) => {
      setSwipeOffset(e.deltaX);
    },
    onSwipedLeft: (e) => {
      setSwipeOffset(0);
      // Solo cambiar si el deslizamiento supera el umbral
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        goToNextWeek();
      }
    },
    onSwipedRight: (e) => {
      setSwipeOffset(0);
      // Solo cambiar si el deslizamiento supera el umbral
      if (Math.abs(e.deltaX) > SWIPE_THRESHOLD) {
        goToPreviousWeek();
      }
    },
    onTouchEndOrOnMouseUp: () => {
      // Volver a la posición original
      setSwipeOffset(0);
    },
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  // Función para verificar si una fecha es hoy
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div {...swipeHandlers} className="overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.div 
          key={safeDate.getTime()}
          className="flex justify-between px-4"
          animate={{ 
            x: swipeOffset,
            opacity: 1 - Math.abs(swipeOffset) / 200
          }}
          transition={{ 
            type: "spring",
            bounce: 0
          }}
        >
          {[...Array(7)].map((_, index) => {
            const date = new Date(safeDate);
            const day = safeDate.getDay();
            
            // Convertir de formato JavaScript (0=Domingo) a formato de interfaz (0=Lunes)
            const dayInInterfaceFormat = day === 0 ? 6 : day - 1;
            
            // Calcular la diferencia para obtener el día correcto
            const diff = index - dayInInterfaceFormat;
            
            date.setDate(safeDate.getDate() + diff);

            const dayNames = [
              t('calendar.weekDays.monday').toLowerCase(),
              t('calendar.weekDays.tuesday').toLowerCase(),
              t('calendar.weekDays.wednesday').toLowerCase(),
              t('calendar.weekDays.thursday').toLowerCase(),
              t('calendar.weekDays.friday').toLowerCase(),
              t('calendar.weekDays.saturday').toLowerCase(),
              t('calendar.weekDays.sunday').toLowerCase()
            ];

            const isSelected = date.getDate() === safeDate.getDate() &&
                             date.getMonth() === safeDate.getMonth();
            
            const isTodayDate = isToday(date);

            return (
              <div 
                key={index}
                onClick={() => {
                  const newDate = new Date(date);
                  newDate.setHours(12, 0, 0, 0);
                  onDateSelect(newDate);
                }}
                className={`
                  flex flex-col items-center px-1.5 py-0.5 rounded-md cursor-pointer
                  ${isSelected ? 'bg-gray-900 text-white' : ''}
                  ${!isSelected && isTodayDate ? 'bg-gray-200/90 dark:bg-gray-600/40' : ''}
                  transition-all duration-200
                `}
              >
                <span className={`
                  text-xs 
                  ${isSelected ? 'text-white' : ''}
                  ${!isSelected && isTodayDate ? 'text-gray-900 dark:text-white' : 'text-gray-500'}
                `}>
                  {dayNames[index]}
                </span>
                <div className={`
                  text-xs 
                  ${isSelected ? 'text-white' : ''}
                  ${!isSelected && isTodayDate ? 'text-gray-900 dark:text-white' : 'text-gray-700'}
                `}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}; 