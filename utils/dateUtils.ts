import { format, parseISO, startOfDay, isSameDay as dateFnsIsSameDay } from 'date-fns';

// Normaliza una fecha eliminando la información de tiempo y zona horaria
export const normalizeDate = (date: Date | string): Date => {
  try {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date);
    
    if (isNaN(d.getTime())) {
      return new Date();
    }
    
    const normalized = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      12, 0, 0, 0
    );
    
    if (isNaN(normalized.getTime())) {
      return new Date();
    }
    
    return normalized;
  } catch (error) {
    return new Date();
  }
};

// Convierte una fecha a string en formato yyyy-MM-dd
export const formatDateToString = (date: Date | string): string => {
  const d = normalizeDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Nueva función para parsear string a Date
export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

// Agregar esta función de nuevo
export const areDatesEqual = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getTime() === d2.getTime();
};

export const isSameDay = dateFnsIsSameDay;

export const isDateWithinRange = ({ currentDay, adjustedDay, startDate, endDate, isIndefinite }: {
  currentDay: Date;
  adjustedDay: Date;
  startDate: string;
  endDate?: string;
  isIndefinite?: boolean;
}) => {
  const currentDateStr = format(currentDay, 'yyyy-MM-dd');
  return startDate <= currentDateStr && (isIndefinite || !endDate || endDate >= currentDateStr);
};

export const isDateSelected = ({ currentDay, adjustedDay, selectedDays }: {
  currentDay: number;
  adjustedDay: number;
  selectedDays?: number[];
}) => {
  return Array.isArray(selectedDays) ? selectedDays.includes(adjustedDay) : false;
}; 