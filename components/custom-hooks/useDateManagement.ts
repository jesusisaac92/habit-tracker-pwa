import { format, startOfDay } from 'date-fns';

export const useDateManagement = () => {
  const createLocalDate = (date: Date): Date => {
    // Asegurarnos de que la fecha esté en la zona horaria local y al inicio del día
    const localDate = startOfDay(new Date(date));
    return localDate;
  };

  const formatDateString = (date: Date): string => {
    // Formato YYYY-MM-DD consistente
    return format(date, 'yyyy-MM-dd');
  };

  return {
    createLocalDate,
    formatDateString
  };
}; 