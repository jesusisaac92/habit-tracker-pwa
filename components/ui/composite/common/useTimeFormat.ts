import create from 'zustand';
import { persist } from 'zustand/middleware';

interface TimeFormatStore {
  use24HourFormat: boolean;
  setUse24HourFormat: (value: boolean) => void;
  formatTime: (time: string) => string;
}

export const useTimeFormat = create(
  persist<TimeFormatStore>(
    (set, get) => ({
      use24HourFormat: true, // Por defecto usamos formato 24h
      setUse24HourFormat: (value: boolean) => set({ use24HourFormat: value }),
      formatTime: (time: string) => {
        const [startTime, endTime] = time.split('-');
        
        const formatHour = (timeStr: string) => {
          const [hours, minutes] = timeStr.split(':');
          const hour = parseInt(hours, 10);
          
          if (!get().use24HourFormat) {
            const period = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${period}`;
          }
          return `${hours}:${minutes}`;
        };

        const formattedStart = formatHour(startTime);
        const formattedEnd = endTime ? formatHour(endTime.trim()) : '';

        return endTime ? `${formattedStart}-${formattedEnd}` : formattedStart;
      }
    }),
    {
      name: 'time-format-storage'
    }
  )
); 