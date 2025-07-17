import * as React from 'react';
import { Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/primitives/dialog';
import { Button } from '@/components/ui/primitives/button';

interface TimePickerDialogProps {
  value: string;
  onChange: (time: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimePickerDialog({ value, onChange, isOpen, onOpenChange }: TimePickerDialogProps) {
  const [hours, setHours] = React.useState(0);
  const [minutes, setMinutes] = React.useState(0);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" aria-describedby="timepicker-dialog-description">
        <DialogTitle className="sr-only">Selector de Hora</DialogTitle>
        <div id="timepicker-dialog-description" className="sr-only">
          Utilice este selector para elegir una hora específica.
        </div>
        <div className="p-6">
          <div className="relative w-[250px] h-[250px] rounded-full border-2">
            {/* Círculo de horas */}
            <div className="absolute inset-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="absolute"
                  style={{
                    left: `${50 + 40 * Math.sin((i * Math.PI) / 6)}%`,
                    top: `${50 - 40 * Math.cos((i * Math.PI) / 6)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => setHours(i)}
                >
                  {i === 0 ? '12' : i}
                </Button>
              ))}
            </div>

            {/* Manecilla */}
            <div
              className="absolute w-1 bg-blue-500"
              style={{
                height: '40%',
                left: '50%',
                bottom: '50%',
                transformOrigin: 'bottom',
                transform: `rotate(${(hours * 30) + (minutes / 2)}deg)`
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 