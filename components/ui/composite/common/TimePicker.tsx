import * as React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/primitives/dialog';
import { Button } from '@/components/ui/primitives/button';
import { useTranslation } from 'next-i18next';
import { useTimeFormat } from './useTimeFormat';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEndTime?: boolean;
  startTime?: string;
}

export function TimePicker({ value, onChange, isOpen, onOpenChange, isEndTime = false, startTime }: TimePickerProps) {
  const { t } = useTranslation();
  const { use24HourFormat } = useTimeFormat();
  const [mode, setMode] = React.useState<'hours' | 'minutes'>('hours');
  const [selectedHour, setSelectedHour] = React.useState(0);
  const [selectedMinute, setSelectedMinute] = React.useState(0);
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM');
  const [mouseAngle, setMouseAngle] = React.useState(0);
  const clockRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [hoveredHour, setHoveredHour] = React.useState<number | null>(null);
  const [hoveredMinute, setHoveredMinute] = React.useState<number | null>(null);

  const convertTo24Hour = (hour: number, period: 'AM' | 'PM'): number => {
    if (period === 'PM' && hour !== 12) {
      return hour + 12;
    }
    if (period === 'AM' && hour === 12) {
      return 0;
    }
    return hour;
  };

  const isValidTimeRange = (startHour: number, startPeriod: 'AM' | 'PM', endHour: number, endPeriod: 'AM' | 'PM') => {
    const start = convertTo24Hour(startHour, startPeriod);
    const end = convertTo24Hour(endHour, endPeriod);
    return end > start;
  };

  const handleTimeSelect = (hour: number, minute: number) => {
    if (mode === 'hours') {
      setSelectedHour(hour);
      setMode('minutes');
    } else {
      const time = `${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      onChange(time);
      onOpenChange(false);
    }
  };

  const getDisplayHour = (hour: number): number => {
    if (!use24HourFormat) {
      // Formato 12h: siempre mostrar 1-12
      if (hour === 0 || hour === 12) return 12;
      return hour > 12 ? hour - 12 : hour;
    } else {
      // Formato 24h (actual)
      if (period === 'AM') {
        return hour === 12 ? 0 : hour;
      } else {
        return hour === 12 ? 12 : hour + 12;
      }
    }
  };

  const handleHourSelect = (hour: number) => {
    // Convertir la hora seleccionada al formato 24h
    let adjustedHour;
    if (period === 'AM') {
      adjustedHour = hour === 12 ? 0 : hour;
    } else { // PM
      adjustedHour = hour === 12 ? 12 : hour + 12;
    }
    
    setSelectedHour(adjustedHour);
    setMode('minutes');
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const time = `${selectedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    if (isEndTime && startTime) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const endHour = selectedHour;
      const endMinute = minute;

      // Convertir todo a minutos para comparar, teniendo en cuenta AM/PM
      const startTotalMinutes = (convertTo24Hour(startHour, period)) * 60 + startMinute;
      const endTotalMinutes = (convertTo24Hour(endHour, period)) * 60 + endMinute;

      if (endTotalMinutes <= startTotalMinutes) {
        setError(t('tasks.timePicker.invalidRange'));
        return;
      }
    }

    onChange(time);
    setError(null);
    onOpenChange(false);
  };

  const calculateAngle = (clientX: number, clientY: number) => {
    if (!clockRef.current) return;

    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angle = Math.atan2(
      clientY - centerY,
      clientX - centerX
    ) * (180 / Math.PI) + 90;

    setMouseAngle(angle);

    // Calcular hora/minuto basado en el ángulo
    if (mode === 'hours') {
      const hour = Math.round(((angle + 360) % 360) / 30) % 12 || 12;
      // Ajustar la hora según el periodo AM/PM
      if (period === 'AM') {
        setSelectedHour(hour === 12 ? 0 : hour);
      } else { // PM
        setSelectedHour(hour === 12 ? 12 : hour + 12);
      }
    } else {
      const minute = Math.round(((angle + 360) % 360) / 6) % 60;
      setSelectedMinute(minute);
    }
  };

  // Función para calcular el ángulo de la aguja indicadora
  const getIndicatorAngle = () => {
    if (mode === 'hours') {
      // Para las horas, convertimos la hora seleccionada a formato 12h para el ángulo
      let hour12Format;
      if (selectedHour === 0 || selectedHour === 12) {
        hour12Format = 12;
      } else if (selectedHour > 12) {
        hour12Format = selectedHour - 12;
      } else {
        hour12Format = selectedHour;
      }
      // Cada hora representa 30 grados (360/12)
      return (hour12Format * 30) % 360;
    } else {
      // Cada minuto representa 6 grados (360/60)
      return (selectedMinute * 6) % 360;
    }
  };

  // Manejadores de eventos táctiles
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    calculateAngle(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    calculateAngle(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Manejadores de eventos de mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    calculateAngle(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    calculateAngle(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Función auxiliar para verificar si una hora está seleccionada
  const isHourSelected = (displayHour: number): boolean => {
    if (use24HourFormat) {
      // En formato 24h, comparamos directamente
      return selectedHour === displayHour;
    } else {
      // En formato 12h, necesitamos considerar AM/PM
      if (period === 'AM') {
        if (displayHour === 12) {
          return selectedHour === 0; // 12 AM es 0 en formato 24h
        } else {
          return selectedHour === displayHour;
        }
      } else { // PM
        if (displayHour === 12) {
          return selectedHour === 12; // 12 PM es 12 en formato 24h
        } else {
          return selectedHour === displayHour + 12; // Otras horas PM son +12 en formato 24h
        }
      }
    }
  };

  React.useEffect(() => {
    // Agregar listeners globales para mouse up y touch end
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Reiniciar estados cuando se abre el TimePicker
  React.useEffect(() => {
    if (isOpen) {
      setMode('hours');
      // Si hay un valor existente, usarlo para inicializar
      if (value) {
        const [hours, minutes] = value.split(':').map(Number);
        setSelectedHour(hours);
        setSelectedMinute(minutes);
        setPeriod(hours >= 12 ? 'PM' : 'AM');
      } else {
        // Si no hay valor, reiniciar a valores por defecto
        setSelectedHour(0);
        setSelectedMinute(0);
        setPeriod('AM');
      }
    }
  }, [isOpen, value]);

  // Actualizar la hora cuando cambiamos entre AM y PM
  React.useEffect(() => {
    if (selectedHour !== undefined) {
      if (period === 'AM' && selectedHour >= 12) {
        // Cambiar de PM a AM
        setSelectedHour(selectedHour === 12 ? 0 : selectedHour - 12);
      } else if (period === 'PM' && selectedHour < 12) {
        // Cambiar de AM a PM
        setSelectedHour(selectedHour === 0 ? 12 : selectedHour + 12);
      }
    }
  }, [period]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Remove focus from any buttons before closing the dialog
      if (!open) {
        // Use setTimeout to ensure this happens after React's event loop
        setTimeout(() => {
          // Focus the body element or any safe element outside the dialog
          document.body.focus();
        }, 0);
      }
      // Evitar que se propague cualquier error relacionado con fechas
      try {
        onOpenChange(open);
      } catch (error) {
        console.error("Error al cambiar estado del TimePicker:", error);
      }
    }}>
      <DialogContent 
        className="p-0 max-w-fit bg-white dark:bg-gray-800 shadow-[0_2px_12px_rgba(0,0,0,0.15)] rounded-lg"
        aria-describedby="time-picker-description"
      >
        <DialogTitle className="sr-only">
          {t('tasks.timePicker.title', 'Selector de Hora')}
        </DialogTitle>
        <DialogDescription id="time-picker-description" className="sr-only">
          {t('tasks.timePicker.description', 'Seleccione la hora deseada')}
        </DialogDescription>
        <div className="flex flex-col items-center px-4">
          <h2 className="text-sm text-gray-500 dark:text-gray-400 my-4">
            {t('tasks.timePicker.selectTime')}
          </h2>

          {error && (
            <div className="text-red-500 text-sm mb-2 text-center">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-t-lg w-full">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMode('hours')}
                className={`text-3xl font-medium dark:text-gray-200 ${mode === 'hours' ? 'text-blue-500' : ''}`}
              >
                {!use24HourFormat
                  ? (selectedHour === 0 
                      ? '12' 
                      : selectedHour > 12 
                        ? (selectedHour - 12).toString().padStart(2, '0')
                        : selectedHour.toString().padStart(2, '0'))
                  : selectedHour === 0 
                    ? '00' 
                    : selectedHour.toString().padStart(2, '0')}
              </button>
              <span className="text-3xl font-medium text-gray-400 dark:text-gray-500">:</span>
              <button
                onClick={() => setMode('minutes')}
                className={`text-3xl font-medium dark:text-gray-200 ${mode === 'minutes' ? 'text-blue-500' : ''}`}
              >
                {selectedMinute.toString().padStart(2, '0')}
              </button>
            </div>
            <div className="border-l h-10 border-gray-300 dark:border-gray-600" />
            <div className="flex flex-col gap-0.5">
              <button 
                className={`px-3 py-0.5 text-sm rounded ${
                  period === 'AM' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
                onClick={() => setPeriod('AM')}
              >
                AM
              </button>
              <button 
                className={`px-3 py-0.5 text-sm rounded ${
                  period === 'PM' 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                }`}
                onClick={() => setPeriod('PM')}
              >
                PM
              </button>
            </div>
          </div>
          
          <div 
            ref={clockRef}
            className="relative w-[160px] h-[160px] mx-auto bg-white dark:bg-gray-800 mb-4"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          >
            <div className="absolute inset-0 rounded-full border-2 dark:border-gray-600">
              {/* Línea indicadora */}
              <div
                className="absolute w-[2px] bg-blue-500 origin-bottom rounded-full"
                style={{
                  height: '40%',
                  left: '50%',
                  bottom: '50%',
                  transform: `rotate(${getIndicatorAngle()}deg)`
                }}
              />

              {/* Centro del reloj */}
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {mode === 'hours' ? (
                // Círculo de horas
                Array.from({ length: 12 }).map((_, i) => {
                  const baseHour = i === 0 ? 12 : i;
                  const displayHour = use24HourFormat 
                    ? (period === 'AM' 
                        ? (baseHour === 12 ? 0 : baseHour)  // AM en 24h: 0-11
                        : (baseHour === 12 ? 12 : baseHour + 12))  // PM en 24h: 12-23
                    : baseHour;  // Formato 12h: siempre 1-12
                  return (
                    <Button
                      key={i}
                      variant="ghost"
                      className={`absolute w-8 h-8 rounded-full transition-colors duration-150 ${
                        isHourSelected(displayHour) 
                          ? 'bg-blue-500 text-white' 
                          : hoveredHour === displayHour 
                            ? 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40' 
                            : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      }`}
                      style={{
                        left: `${50 + 40 * Math.sin((i * Math.PI) / 6)}%`,
                        top: `${50 - 40 * Math.cos((i * Math.PI) / 6)}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={() => handleHourSelect(displayHour)}
                      onMouseEnter={() => setHoveredHour(displayHour)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      {displayHour === 0 ? "00" : displayHour.toString().padStart(2, '0')}
                    </Button>
                  );
                })
              ) : (
                // Círculo de minutos
                Array.from({ length: 12 }).map((_, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className={`absolute w-10 h-10 rounded-full transition-colors duration-150 ${
                      selectedMinute === i * 5 
                        ? 'bg-blue-500 text-white' 
                        : hoveredMinute === i * 5 
                          ? 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/40' 
                          : 'hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                    style={{
                      left: `${50 + 40 * Math.sin((i * Math.PI) / 6)}%`,
                      top: `${50 - 40 * Math.cos((i * Math.PI) / 6)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => handleMinuteSelect(i * 5)}
                    onMouseEnter={() => setHoveredMinute(i * 5)}
                    onMouseLeave={() => setHoveredMinute(null)}
                  >
                    {(i * 5).toString().padStart(2, '0')}
                  </Button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 