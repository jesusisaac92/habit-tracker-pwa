import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/primitives/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DateNavigationProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export const DateNavigation = ({ date, onDateChange }: DateNavigationProps) => {
  const { t } = useTranslation();

  const goToPreviousDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <Button variant="ghost" onClick={goToPreviousDay}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">
        {format(date, 'dd MMMM yyyy', { locale: es })}
      </span>
      <Button variant="ghost" onClick={goToNextDay}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}; 