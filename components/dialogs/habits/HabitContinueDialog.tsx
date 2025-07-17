import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Habit } from "@/components/types/types";
import { CheckCircle, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/primitives/calendar";
import { format } from "date-fns";
import { Switch } from "@/components/ui/primitives/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/primitives/popover";

interface HabitContinueDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  onConfirm: (newEndDate?: string, isIndefinite?: boolean) => void;
  currentDate?: Date;
}

export function HabitContinueDialog({
  isOpen,
  onOpenChange,
  habit,
  onConfirm,
  currentDate = new Date(),
}: HabitContinueDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(undefined);
      setIsIndefinite(false);
    }
  }, [isOpen]);

  const handleDateSelect = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
      setIsIndefinite(false);
    }
  };

  const handleIndefiniteChange = (checked: boolean) => {
    setIsIndefinite(checked);
    if (checked) {
      setSelectedDate(undefined);
    }
  };

  const handleConfirm = () => {
    if (isIndefinite) {
      onConfirm(undefined, true);
    } else if (selectedDate) {
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onConfirm(formattedDate, false);
    }
    onOpenChange(false);
  };

  const disablePastDates = (date: Date): boolean => {
    // Obtener la fecha actual y la fecha de fin del hábito
    const today = new Date();
    const habitEndDate = habit?.endDate ? new Date(habit.endDate) : today;
    
    // Usar la fecha más reciente entre hoy y la fecha de fin del hábito
    const minDate = today > habitEndDate ? today : habitEndDate;
    minDate.setHours(0, 0, 0, 0);
    
    // Convertir la fecha a comparar a medianoche
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    // Deshabilitar fechas anteriores o iguales a la fecha mínima permitida
    return compareDate <= minDate;
  };

  const lastObjective = habit?.objectiveHistory 
    ? habit.objectiveHistory[habit.objectiveHistory.length - 1] 
    : {
        startDate: habit?.startDate,
        endDate: habit?.endDate,
        timeObjective: habit?.timeObjective
      };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Ignorar intentos de cerrar haciendo clic fuera
        if (open === false && isOpen) return;
        onOpenChange(open);
      }} 
      modal={true}
    >
      <DialogContent className="sm:max-w-[425px] max-w-[95%] p-6 bg-white dark:bg-gray-800 rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-center font-semibold">
            Continuar Hábito
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Historial de Objetivos */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-3">Historial de Objetivos</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex flex-col">
                    <span className="font-medium">Objetivo completado</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {habit?.timeObjective} días
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Inicio: {habit?.startDate 
                      ? format(new Date(habit.startDate + 'T00:00:00'), "dd/MM/yyyy") 
                      : '-'}
                  </div>
                  <div>
                    Fin: {habit?.endDate 
                      ? format(new Date(habit.endDate + 'T00:00:00'), "dd/MM/yyyy") 
                      : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Selector de nuevo objetivo */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Establecer nuevo objetivo</h3>
            <div className="space-y-4">
              {/* Selector de fecha objetivo */}
              <Popover modal={true} open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={isIndefinite}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha objetivo"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    minDate={new Date()}
                    onSelect={(date: Date | null) => {
                      handleDateSelect(date);
                      setShowCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Opción sin fecha límite */}
              <div className="flex items-center gap-2">
                <span className="text-sm">Continuar sin fecha límite</span>
                <Switch
                  checked={isIndefinite}
                  onCheckedChange={(checked) => {
                    handleIndefiniteChange(checked);
                    if (checked) {
                      setSelectedDate(undefined);
                    }
                    setShowCalendar(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-2">
          <Button
            onClick={handleConfirm}
            disabled={!selectedDate && !isIndefinite}
            className="w-full bg-black hover:bg-gray-900 text-white 
              dark:bg-white dark:text-black dark:hover:bg-gray-100"
          >
            Continuar con nuevo objetivo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 