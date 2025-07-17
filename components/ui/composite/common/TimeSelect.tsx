import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { generateTimeOptions } from '@/utils/timeUtils';

interface TimeSelectProps {
  value: string;
  onChange: (time: string | null) => void;
  onClose?: () => void;
}

export const TimeSelect = ({ value, onChange, onClose }: TimeSelectProps) => {
  const timeOptions = generateTimeOptions(15); // Intervalos de 15 minutos

  return (
    <Select
      value={value}
      onValueChange={onChange}
      onOpenChange={(open) => !open && onClose?.()}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Seleccionar hora" />
      </SelectTrigger>
      <SelectContent>
        {timeOptions.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}; 