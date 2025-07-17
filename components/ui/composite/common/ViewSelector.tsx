import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/primitives/select';

interface ViewSelectorProps {
  view: 'day' | 'month';
  onViewChange: (view: 'day' | 'month') => void;
}

export const ViewSelector = ({ view, onViewChange }: ViewSelectorProps) => {
  const { t } = useTranslation();
  
  return (
    <Select value={view} onValueChange={onViewChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={t('tasks.timeline.selectView')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">{t('tasks.timeline.dayView')}</SelectItem>
        <SelectItem value="month">{t('tasks.timeline.monthView')}</SelectItem>
      </SelectContent>
    </Select>
  );
}; 