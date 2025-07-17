"use client"
 
import * as React from "react"
import ReactCalendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { Value } from 'react-calendar/dist/cjs/shared/types';

export type CalendarProps = React.ComponentProps<typeof ReactCalendar> & {
  selected?: Date | Date[];
  defaultMonth?: Date;
  mode?: 'single' | 'multiple' | 'range';
  onSelect?: ((date: Date | null) => void) | ((dates: Date[] | null) => void);
  initialFocus?: boolean;
  disabled?: (date: Date) => boolean;
}
 
export function Calendar({
  className,
  selected,
  defaultMonth,
  mode = 'single',
  onSelect,
  ...props
}: CalendarProps) {
  const { t, i18n } = useTranslation();

  const getMonthKey = (date: Date) => {
    const month = date.toLocaleDateString('es', { month: 'long' }).toLowerCase();
    return month;
  };

  return (
    <ReactCalendar
      {...props}
      className={cn(
        "react-calendar border-none",
        "bg-white dark:bg-gray-800",
        "rounded-md shadow-sm",
        // Estilos responsivos
        "w-full max-w-full sm:max-w-[380px]",
        "p-3",
        // Estilos del calendario
        "[&_.react-calendar__navigation]:mb-2",
        "[&_.react-calendar__navigation__label]:text-sm [&_.react-calendar__navigation__label]:font-medium",
        "[&_.react-calendar__navigation__arrow]:w-8 [&_.react-calendar__navigation__arrow]:h-8",
        "[&_.react-calendar__month-view__weekdays]:mb-2",
        "[&_.react-calendar__month-view__weekdays__weekday]:text-xs [&_.react-calendar__month-view__weekdays__weekday]:font-normal [&_.react-calendar__month-view__weekdays__weekday]:text-gray-500",
        "[&_.react-calendar__month-view__days__day]:h-9 [&_.react-calendar__month-view__days__day]:w-9 [&_.react-calendar__month-view__days__day]:p-0 [&_.react-calendar__month-view__days__day]:font-normal",
        "[&_.react-calendar__tile]:rounded-md [&_.react-calendar__tile]:text-sm",
        "[&_.react-calendar__tile--now]:bg-gray-100 [&_.react-calendar__tile--now]:text-gray-900 dark:[&_.react-calendar__tile--now]:bg-gray-800 dark:[&_.react-calendar__tile--now]:text-gray-100",
        "[&_.react-calendar__tile--active]:bg-blue-500 [&_.react-calendar__tile--active]:text-white",
        "[&_.react-calendar__tile--active:hover]:bg-blue-600",
        "[&_.react-calendar__tile:hover]:bg-gray-100 dark:[&_.react-calendar__tile:hover]:bg-gray-800",
        "[&_.react-calendar__tile:disabled]:opacity-50 [&_.react-calendar__tile:disabled]:cursor-not-allowed",
        className
      )}
      value={selected as Value}
      selectRange={mode === 'multiple' || mode === 'range'}
      formatMonthYear={(locale, date) => {
        const monthKey = getMonthKey(date);
        const monthName = t(`calendar.months.${monthKey}`).toLowerCase();
        return `${monthName} ${date.getFullYear()}`;
      }}
      onChange={(date: Value) => {
        if (!onSelect) return;
        
        if (mode === 'multiple') {
          (onSelect as (dates: Date[] | null) => void)(
            Array.isArray(date) ? date.filter((d): d is Date => d instanceof Date) : []
          );
        } else {
          (onSelect as (date: Date | null) => void)(
            date instanceof Date ? date : null
          );
        }
      }}
      prevLabel={<ChevronLeft className="w-4 h-4" />}
      nextLabel={<ChevronRight className="w-4 h-4" />}
      prev2Label={null}
      next2Label={null}
      formatShortWeekday={(locale, date) => {
        const weekdayMap: { [key: string]: string } = {
          'lun': 'monday',
          'mar': 'tuesday',
          'mié': 'wednesday',
          'jue': 'thursday',
          'vie': 'friday',
          'sáb': 'saturday',
          'dom': 'sunday'
        };
        
        const weekday = date.toLocaleDateString('es', { weekday: 'short' }).toLowerCase();
        const weekdayKey = weekdayMap[weekday];
        return t(`calendar.weekDays.${weekdayKey}`).toLowerCase();
      }}
    />
  )
}

Calendar.displayName = "Calendar"
