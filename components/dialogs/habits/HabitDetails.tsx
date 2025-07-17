import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { Button } from "@/components/ui/primitives/button";
import { Switch } from "@/components/ui/primitives/switch";
import { Clock, Pencil } from 'lucide-react';
import { TimeSelect } from '@/components/ui/composite/common/TimeSelect';
import { Habit } from '@/components/types/types';

interface HabitDetailsProps {
  habit: Habit;
  onEdit: (habit: Habit, isStateUpdate?: boolean) => void;
  onDelete: (habit: Habit) => void;
  onComplete: (habit: Habit) => void;
}

export const HabitDetails = ({ habit, onEdit, onDelete, onComplete }: HabitDetailsProps) => {
  const { t } = useTranslation();
  const [isEditingTime, setIsEditingTime] = useState(false);

  const handleTimeChange = (newTime: string | null) => {
    onEdit({
      ...habit,
      time: newTime,
      noSpecificTime: !newTime
    }, true); // true indica que es una actualización de estado
    setIsEditingTime(false);
  };

  return (
    <div className="space-y-4">
      {/* ... otros elementos ... */}

      {/* Sección de tiempo */}
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        {isEditingTime ? (
          <TimeSelect
            value={habit.time || ''}
            onChange={handleTimeChange}
            onClose={() => setIsEditingTime(false)}
          />
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span>{habit.time || t('habits.noTime')}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingTime(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <Switch
              checked={!habit.noSpecificTime}
              onCheckedChange={(checked) => {
                onEdit({
                  ...habit,
                  noSpecificTime: !checked,
                  time: !checked ? null : habit.time
                }, true);
              }}
            />
          </div>
        )}
      </div>

      {/* ... resto del contenido ... */}
    </div>
  );
}; 