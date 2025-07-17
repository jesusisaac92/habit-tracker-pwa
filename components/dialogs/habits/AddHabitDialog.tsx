import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Textarea } from "@/components/ui/primitives/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { useTranslation } from 'next-i18next';
import { useToast } from "@/components/ui/providers/toast/use-toast";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { Calendar } from "@/components/ui/primitives/calendar";
import { format, startOfDay } from 'date-fns';
import { MouseEvent } from 'react';
import { Value } from 'react-calendar/dist/cjs/shared/types';
import { Switch } from "@/components/ui/primitives/switch"
import { Habit, Difficulty } from '@/components/types/types';
import { Palette } from 'lucide-react';
import { HexColorPicker } from "react-colorful";
import { HABIT_ICONS, type HabitIconType } from '@/components/ui/composite/common/IconSelector';
import { 
  Book,
  Timer as Run,           // Para ejercicio
  Flower as Meditation,    // Para meditación
  Coffee, 
  Music, 
  Code, 
  Dumbbell as Gym,
  Palette as Paint,
  Languages,
  Brain,
  Pencil, 
  Heart, 
  Sun, 
  Moon,
  Check,
  Hand,
  Pointer,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { SuccessDialog } from '@/components/dialogs/common/SuccessDialog';
import { useDateManagement } from '@/components/custom-hooks/useDateManagement';
import { Calendar as CalendarIcon } from "lucide-react";
import { TimePicker } from "@/components/ui/composite/common/TimePicker";
import { Clock } from 'lucide-react';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { useHabitStore } from '@/store/useHabitStore';
import { Label } from "@/components/ui/primitives/label";
import { supabase } from '@/src/supabase/config/client';
import { authService } from '@/src/supabase/services/auth.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/primitives/tooltip";

interface HabitFormElements extends HTMLFormControlsCollection {
  habitTime: HTMLInputElement;
  name: HTMLInputElement;
  description: HTMLInputElement;
  difficulty: HTMLSelectElement;
}

interface HabitForm extends HTMLFormElement {
  readonly elements: HabitFormElements;
}


// Definir colores predefinidos
const PRESET_COLORS = [
  '#4A4A3A', // Olive Branch
  '#C2B4A0', // Burlap
  '#E5E1DD', // Coconut Flour
  '#8B5E3C', // Cinnamon Stick
  '#2F3337', // Slate
  '#9A8D7F', // Complementario - Taupe
  '#D8C3A5', // Complementario - Arena
  '#6B705C', // Complementario - Verde sage
  '#A98467', // Complementario - Marrón medio
  '#5C574F'  // Complementario - Gris cálido
];

interface AddHabitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddHabit: (habit: Omit<Habit, "id" | "index">) => void;
  user: { name: string };
  habits: Habit[];
}

// Componente para el indicador de progreso
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                ${currentStep > step 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : currentStep === step
                  ? 'border-blue-500 text-blue-500'
                  : 'border-gray-300 text-gray-300'
                }`}
            >
              {currentStep > step ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < 4 && (
              <div
                className={`w-8 h-0.5 ${
                  currentStep > step ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// Agregar interfaz para el estado del formulario
interface FormData {
  name: string;
  description: string;
  time: string | null;
  startDate: Date | undefined;
  endDate: Date | undefined;
  isIndefinite: boolean;
  noSpecificTime: boolean;
  selectedDays: number[];
  color: string | null;
  icon: string;
}

interface Profile {
  name: string;
  last_name: string;
}

const AddHabitDialog: React.FC<AddHabitDialogProps> = ({
  isOpen,
  onOpenChange,
  onAddHabit,
  user: userProp = { name: 'Usuario' },
  habits = []
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const addHabitFormRef = useRef<HabitForm>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<string>(''); // Quitar el valor por defecto 'book'
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    time: null,
    startDate: undefined,
    endDate: undefined,
    isIndefinite: false,
    noSpecificTime: false,
    selectedDays: [],
    color: null,
    icon: '' // Quitar el valor por defecto 'book'
  });
  const [[page, direction], setPage] = useState([0, 0]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { createLocalDate, formatDateString } = useDateManagement();
  const [savedHabitName, setSavedHabitName] = useState('');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<'start' | 'end' | false>(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [noSpecificTime, setNoSpecificTime] = useState(false);
  const { use24HourFormat } = useTimeFormat();
  const [timeRange, setTimeRange] = useState<{
    start: string;
    end: string;
  }>({
    start: '',
    end: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { user: authUser } = useAuth();
  const [hasAttemptedNextStep, setHasAttemptedNextStep] = useState(false);
  const [isSelectingTime, setIsSelectingTime] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        time: null,
        startDate: undefined,
        endDate: undefined,
        isIndefinite: false,
        noSpecificTime: false,
        selectedDays: [],
        color: null,
        icon: ''
      });
      setCurrentStep(1);
      setErrors({});
      setSelectedDays([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setIsIndefinite(false);
      setSelectedColor(null);
      setShowCustomPicker(false);
      setSelectedIcon('');
      setSelectedTime('');
      setNoSpecificTime(false);
      setHasAttemptedNextStep(false);
      setIsSelectingTime(false);
      setTimeRange({
        start: '',
        end: ''
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (authUser) {
      setUserId(authUser.id);
    }
  }, [authUser]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authUser?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, last_name')
          .eq('id', authUser.id)
          .single();

        if (data && !error) {
          setUserProfile(data);
        }
      }
    };

    fetchUserProfile();
  }, [authUser?.id]);

  // Mapeo de índices de la interfaz a índices reales de días de la semana
  const mapInterfaceIndexToRealIndex = (interfaceIndex: number): number => {
    // En la interfaz: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
    // En JavaScript/estándar: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
    
    // Convertir de índice de interfaz a índice estándar
    if (interfaceIndex === 6) {
      return 0; // Domingo (último en interfaz) es 0 en estándar
    } else {
      return interfaceIndex + 1; // El resto se desplaza una posición
    }
  };

  const handleDaySelection = (dayIndex: number) => {
    const realDayIndex = mapInterfaceIndexToRealIndex(dayIndex);
    console.log(`Selección de día: Índice interfaz=${dayIndex} (${['L','M','X','J','V','S','D'][dayIndex]}) -> Índice real=${realDayIndex} (${['D','L','M','X','J','V','S'][realDayIndex]})`);
    
    setSelectedDays(prev => {
      const newSelectedDays = prev.includes(realDayIndex)
        ? prev.filter(d => d !== realDayIndex)
        : [...prev, realDayIndex];
      
      console.log('Días seleccionados actualizados:', newSelectedDays.map(d => `${d} (${['D','L','M','X','J','V','S'][d]})`));
      return newSelectedDays;
    });
  };

  const toggleAllDays = () => {
    if (selectedDays.length === 7) {
      // Si todos los días están seleccionados, deseleccionar todos
      console.log('Deseleccionando todos los días');
      setSelectedDays([]);
    } else {
      // Si no todos los días están seleccionados, seleccionar todos
      // Usar los índices estándar de JavaScript: 0=Domingo, 1=Lunes, ..., 6=Sábado
      console.log('Seleccionando todos los días');
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  // Agregar función para verificar nombres duplicados
  const checkDuplicateName = (name: string): boolean => {
    if (!name.trim()) return false;
    
    const normalizedNewName = name.trim().toLowerCase();
    return habits.some(habit => 
      habit.name.toLowerCase() === normalizedNewName
    );
  };

  // Agregar manejador para el campo de nombre con validación en tiempo real
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData({ ...formData, name: newName });
    
    // Validar en tiempo real siempre, no solo cuando se ha intentado avanzar
    const newErrors = { ...errors };
    
    if (newName.trim() === '') {
      newErrors.habitName = t('errors.required');
    } else if (checkDuplicateName(newName)) {
      newErrors.habitName = 'Ya existe un hábito con este nombre. Por favor, elige un nombre diferente.';
    } else {
      delete newErrors.habitName;
    }
    
    setErrors(newErrors);
  };

  const debugHabitCreation = (formData: FormData, startDate: Date) => {
    // Función vacía para producción
  };

  const calculateTimeObjective = (startDateValue: string, endDateValue: string | null): number | "indefinite" => {
    let result: number | "indefinite";
    
    if (isIndefinite) {
      result = "indefinite";
    } else if (endDateValue && startDateValue) {
      const start = new Date(startDateValue);
      const end = new Date(endDateValue);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)));
      result = days;
    } else {
      result = "indefinite";
    }

    return result;
  };

  const handleStartDateSelect = (value: Value) => {
    if (value instanceof Date) {
      const selectedDate = new Date(value);
      const currentDate = new Date();

      // Normalizar ambas fechas a medianoche
      selectedDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);

      // Si la fecha seleccionada es anterior a la fecha actual, usar la fecha actual
      const finalDate = selectedDate < currentDate ? currentDate : selectedDate;
      
      setStartDate(finalDate);
      setIsStartDateOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | null) => {
    if (date instanceof Date) {
      setEndDate(date);
      setIsEndDateOpen(false);
      // Enfocar el body para evitar problemas de accesibilidad
      setTimeout(() => {
        // Asegurarse de que ningún elemento dentro del calendario tenga el foco
        const calendarElement = document.querySelector('.react-calendar');
        if (calendarElement) {
          const focusableElements = calendarElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
          focusableElements.forEach((el) => {
            const element = el as HTMLElement;
            element.blur();
          });
        }
        document.body.focus();
      }, 0);
    }
  };

  const validateStep1 = () => {
    return formData.name.trim() !== '' && formData.description.trim() !== '';
  };

  // Actualizar validateStep1 para incluir verificación de duplicados
  const validateStep1Updated = () => {
    const nameValid = formData.name.trim() !== '';
    const descriptionValid = formData.description.trim() !== '';
    const notDuplicate = !checkDuplicateName(formData.name);
    
    return nameValid && descriptionValid && notDuplicate;
  };

  const validateStep2 = () => {
    return startDate !== undefined && 
           (isIndefinite || endDate !== undefined) &&
           (noSpecificTime || selectedTime !== '');
  };

  const validateStep3 = () => {
    // Para el paso 3 (período del hábito y días de la semana), solo validamos las fechas
    return startDate !== undefined && 
           (isIndefinite || endDate !== undefined);
  };

  const validateStep4 = () => {
    const newErrors: Record<string, string> = {};

    if (!selectedColor) {
      newErrors.color = t('validation.colorRequired');
    }
    if (!selectedIcon) {
      newErrors.icon = t('validation.iconRequired');
    }
    // No validamos selectedDays porque es opcional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    // Validar el paso actual
    if (currentStep === 1) {
      const newErrors: Record<string, string> = {};
      
      if (formData.name.trim() === '') {
        newErrors.habitName = t('errors.required');
      } else if (checkDuplicateName(formData.name)) {
        newErrors.habitName = 'Ya existe un hábito con este nombre. Por favor, elige un nombre diferente.';
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      // Limpiar errores si todo está bien
      setErrors({});
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Si estamos seleccionando la hora, no validar las fechas
      if (isSelectingTime) {
        return;
      }
      
      // Validar el rango de tiempo si no está marcado "sin hora específica"
      if (!noSpecificTime && (!timeRange.start || !timeRange.end)) {
        toast({
          title: "Error",
          description: "Por favor selecciona hora de inicio y fin o marca sin hora específica",
          variant: "destructive"
        });
        return;
      }

      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      setHasAttemptedNextStep(true);
      
      // Validar que tengamos fecha de inicio y (fecha fin o indefinido)
      if (!startDate) {
        toast({
          title: "Error en las fechas",
          description: "Por favor selecciona una fecha de inicio",
          variant: "destructive"
        });
        return;
      }

      if (!isIndefinite && !endDate) {
        toast({
          title: "Error en las fechas",
          description: "Por favor selecciona una fecha de fin o marca como sin límite",
          variant: "destructive"
        });
        return;
      }

      setCurrentStep(4);
    }
  };

  const renderError = (field: string) => {
    if (errors[field]) {
      return (
        <span className="text-sm text-red-500">
          {errors[field]}
        </span>
      );
    }
    return null;
  };

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                {t('habits.name')}
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                className="mt-1"
                placeholder={t('habits.name')}
              />
              {errors.habitName && (
                <div className="flex items-center gap-1 mt-1.5">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-red-500 text-xs">{errors.habitName}</p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                {t('habits.description')}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                placeholder={t('habits.description')}
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {/* Rango horario */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Rango horario</p>
              
              {/* Hora de inicio */}
              <div className="space-y-2">
                <p className="text-sm">Hora de inicio</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Indicar que estamos seleccionando la hora
                    setIsSelectingTime(true);
                    setIsTimePickerOpen('start');
                  }}
                  disabled={noSpecificTime}
                  className={`w-full justify-start text-left font-normal ${
                    noSpecificTime ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {timeRange.start ? formatTimeDisplay(timeRange.start) : "SELECCIONAR HORA"}
                </Button>
              </div>

              {/* Hora de fin */}
              <div className="space-y-2">
                <p className="text-sm">Hora de fin</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Indicar que estamos seleccionando la hora
                    setIsSelectingTime(true);
                    setIsTimePickerOpen('end');
                  }}
                  disabled={noSpecificTime || !timeRange.start}
                  className={`w-full justify-start text-left font-normal ${
                    noSpecificTime || !timeRange.start ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {timeRange.end 
                    ? formatTimeDisplay(timeRange.end) 
                    : !timeRange.start 
                      ? <span className="text-gray-400">SELECCIONAR HORA</span>
                      : "SELECCIONAR HORA"
                  }
                </Button> 
              </div>  

              {/* Sin hora específica - Oculto pero manteniendo funcionalidad */}
              <div className="hidden">
                <Switch
                  checked={noSpecificTime}
                  onCheckedChange={setNoSpecificTime}
                  className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200"
                />
                <span className="text-sm">Sin hora específica</span>
              </div>
            </div>

            {/* TimePicker Modal */}
            <TimePicker
              isOpen={isTimePickerOpen !== false}
              onOpenChange={(open) => {
                // Si se está cerrando el TimePicker, ya no estamos seleccionando la hora
                if (!open) {
                  setIsSelectingTime(false);
                }
                setIsTimePickerOpen(false);
              }}
              value={isTimePickerOpen === 'start' ? timeRange.start : timeRange.end}
              onChange={(time) => {
                if (isTimePickerOpen === 'end' && timeRange.start) {
                  // Validar que la hora de fin sea posterior a la de inicio
                  const [startHour, startMinute] = timeRange.start.split(':').map(Number);
                  const [endHour, endMinute] = time.split(':').map(Number);
                  
                  const startTimeMinutes = startHour * 60 + startMinute;
                  const endTimeMinutes = endHour * 60 + endMinute;
                  
                  if (endTimeMinutes <= startTimeMinutes) {
                    toast({
                      title: "Error en el horario",
                      description: "La hora de fin debe ser posterior a la hora de inicio",
                      variant: "destructive"
                    });
                    return;
                  }
                }
                
                setTimeRange(prev => ({
                  ...prev,
                  [isTimePickerOpen === 'start' ? 'start' : 'end']: time
                }));
                // Ya no estamos seleccionando la hora
                setIsSelectingTime(false);
                setIsTimePickerOpen(false);
              }}
              isEndTime={isTimePickerOpen === 'end'}
              startTime={isTimePickerOpen === 'end' ? timeRange.start : undefined}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {/* Período del hábito */}
            <div className="space-y-2">
              {/* Título para la sección de fechas */}
              <p className="text-sm font-medium">Período del hábito</p>
              
              {/* Selector de fecha de inicio */}
              <div className="space-y-1">
                <label className="text-sm text-gray-600 dark:text-gray-400">
                  Fecha de inicio
                </label>
                <Popover 
                  modal={true} 
                  open={isStartDateOpen} 
                  onOpenChange={(open) => {
                    // Si se está cerrando el popover, asegurarse de que no quede ningún elemento con foco dentro
                    if (!open) {
                      // Usar setTimeout para asegurar que esto ocurra después del ciclo de eventos de React
                      setTimeout(() => {
                        // Enfocar el body u otro elemento seguro fuera del popover
                        document.body.focus();
                        
                        // Asegurarse de que todos los elementos interactivos dentro del popover
                        // pierdan el foco antes de cerrar
                        const popoverElement = document.querySelector('[data-state="open"][role="dialog"]');
                        if (popoverElement) {
                          const focusableElements = popoverElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                          focusableElements.forEach((el) => {
                            const element = el as HTMLElement;
                            element.blur();
                          });
                        }
                      }, 0);
                    }
                    setIsStartDateOpen(open);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`w-full justify-start text-left font-normal ${hasAttemptedNextStep && !startDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd-MM-yyyy") : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start"
                    onInteractOutside={(e) => {
                      // Prevenir que el clic fuera cierre el popover si estamos interactuando con el calendario
                      if (e.target && (e.target as HTMLElement).closest('.react-calendar')) {
                        e.preventDefault();
                      }
                    }}
                    onEscapeKeyDown={() => {
                      // Asegurarse de que al presionar Escape, el foco se maneje correctamente
                      setTimeout(() => {
                        document.body.focus();
                      }, 0);
                    }}
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      minDate={new Date()}
                      onSelect={(date: Date | null) => {
                        if (date) {
                          if (endDate && date > endDate) {
                            toast({
                              title: "Error en las fechas",
                              description: "La fecha de inicio no puede ser posterior a la fecha de fin",
                              variant: "destructive"
                            });
                            return;
                          }
                          setStartDate(date);
                          // Cerrar el popover después de seleccionar la fecha
                          setIsStartDateOpen(false);
                          // Enfocar el body para evitar problemas de accesibilidad
                          setTimeout(() => {
                            // Asegurarse de que ningún elemento dentro del calendario tenga el foco
                            const calendarElement = document.querySelector('.react-calendar');
                            if (calendarElement) {
                              const focusableElements = calendarElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                              focusableElements.forEach((el) => {
                                const element = el as HTMLElement;
                                element.blur();
                              });
                            }
                            document.body.focus();
                          }, 0);
                        }
                      }}
                      disabled={(date) => {
                        if (endDate) {
                          return date > endDate;
                        }
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {hasAttemptedNextStep && !startDate && (
                  <p className="text-red-500 text-xs">Por favor selecciona una fecha de inicio</p>
                )}
              </div>

              {/* Selector de fecha final */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-sm text-gray-600 dark:text-gray-400">
                    Fecha de fin
                  </label>
                  <Popover 
                    modal={true} 
                    open={isEndDateOpen} 
                    onOpenChange={(open) => {
                      // Si se está cerrando el popover, asegurarse de que no quede ningún elemento con foco dentro
                      if (!open) {
                        // Usar setTimeout para asegurar que esto ocurra después del ciclo de eventos de React
                        setTimeout(() => {
                          // Enfocar el body u otro elemento seguro fuera del popover
                          document.body.focus();
                          
                          // Asegurarse de que todos los elementos interactivos dentro del popover
                          // pierdan el foco antes de cerrar
                          const popoverElement = document.querySelector('[data-state="open"][role="dialog"]');
                          if (popoverElement) {
                            const focusableElements = popoverElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                            focusableElements.forEach((el) => {
                              const element = el as HTMLElement;
                              element.blur();
                            });
                          }
                        }, 0);
                      }
                      setIsEndDateOpen(open);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${hasAttemptedNextStep && !isIndefinite && !endDate ? 'border-red-500 focus:ring-red-500' : ''}`}
                        disabled={isIndefinite || !startDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd-MM-yyyy") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0" 
                      align="start"
                      onInteractOutside={(e) => {
                        // Prevenir que el clic fuera cierre el popover si estamos interactuando con el calendario
                        if (e.target && (e.target as HTMLElement).closest('.react-calendar')) {
                          e.preventDefault();
                        }
                      }}
                      onEscapeKeyDown={() => {
                        // Asegurarse de que al presionar Escape, el foco se maneje correctamente
                        setTimeout(() => {
                          document.body.focus();
                        }, 0);
                      }}
                    >
                      <Calendar
                        mode="single"
                        selected={endDate}
                        minDate={startDate || new Date()}
                        onSelect={(date: Date | null) => {
                          if (date) {
                            setEndDate(date);
                            // Cerrar el popover después de seleccionar la fecha
                            setIsEndDateOpen(false);
                            // Enfocar el body para evitar problemas de accesibilidad
                            setTimeout(() => {
                              // Asegurarse de que ningún elemento dentro del calendario tenga el foco
                              const calendarElement = document.querySelector('.react-calendar');
                              if (calendarElement) {
                                const focusableElements = calendarElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                                focusableElements.forEach((el) => {
                                  const element = el as HTMLElement;
                                  element.blur();
                                });
                              }
                              document.body.focus();
                            }, 0);
                          }
                        }}
                        disabled={(date) => {
                          if (startDate) {
                            return date < startDate;
                          }
                          return true;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {hasAttemptedNextStep && !isIndefinite && !endDate && (
                    <p className="text-red-500 text-xs">Por favor selecciona una fecha de fin</p>
                  )}
                </div>

                {/* Botón "Sin límite" - Oculto pero manteniendo funcionalidad */}
                <Button
                  variant="outline"
                  className={`hidden`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsIndefinite(!isIndefinite);
                  }}
                >
                  <span className="text-lg">∞</span>
                  <span className="text-sm">{t('habits.indefinite')}</span>
                </Button>
              </div>

              {/* Mostrar la duración cuando ambas fechas están seleccionadas */}
              {startDate && endDate && !isIndefinite && (
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Duración total: {calculateDuration(startDate, endDate)} días
                  </div>
                </div>
              )}
            </div>

            {/* Selector de días de la semana */}
            <div className="space-y-2 mt-6">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">
                  {t('habits.weekDays.label', 'Días de la semana')}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleAllDays}
                  className="text-xs h-7 px-2 text-gray-600 hover:text-black"
                >
                  {selectedDays.length === 7 
                    ? t('habits.weekDays.deselectAll', 'Deseleccionar todos') 
                    : t('habits.weekDays.selectAll', 'Seleccionar todos')}
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[
                  { short: 'L', full: 'Lunes' },
                  { short: 'M', full: 'Martes' },
                  { short: 'X', full: 'Miércoles' },
                  { short: 'J', full: 'Jueves' },
                  { short: 'V', full: 'Viernes' },
                  { short: 'S', full: 'Sábado' },
                  { short: 'D', full: 'Domingo' }
                ].map((day, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    className={`h-10 p-0 ${
                      selectedDays.includes(mapInterfaceIndexToRealIndex(index))
                        ? 'bg-black text-white dark:bg-gray-700 dark:text-white'
                        : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                    onClick={() => handleDaySelection(index)}
                    title={day.full}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedDays.length === 0 
                  ? t('habits.weekDays.selectAll', 'Todos los días seleccionados por defecto')
                  : selectedDays.length === 7
                  ? t('habits.weekDays.allSelected', 'Todos los días seleccionados')
                  : t('habits.weekDays.selected', 'Días seleccionados: {{count}}', { count: selectedDays.length })}
              </p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            {/* Selector de color */}
            <div className="space-y-2">
              <Popover modal={true} open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-center text-left font-normal"
                  >
                    <div className="flex items-center gap-2">
                      {selectedColor ? (
                        <>
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: selectedColor }}
                          />
                          <span>{t('habits.colorPicker.selected')}</span>
                        </>
                      ) : (
                        <>
                          <Palette className="h-4 w-4" />
                          <span>{t('habits.colorPicker.label')}</span>
                        </>
                      )}
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3">
                  {!showCustomPicker ? (
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-full h-8 rounded-md transition-transform hover:scale-105 ${
                            selectedColor === color ? 'ring-2 ring-offset-2 ring-black' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setSelectedColor(color);
                            setIsColorPickerOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <HexColorPicker
                        color={selectedColor || '#000000'}
                        onChange={setSelectedColor}
                      />
                      <Button
                        onClick={() => setIsColorPickerOpen(false)}
                        className="w-full bg-black text-white hover:bg-gray-800"
                      >
                        {t('habits.colorPicker.selected')}
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => setShowCustomPicker(!showCustomPicker)}
                  >
                    {showCustomPicker 
                      ? t('habits.colorPicker.hideCustom') 
                      : t('habits.colorPicker.customColor')
                    }
                  </Button>
                </PopoverContent>
              </Popover>
            </div>

            {/* Selector de icono */}
            <div className="space-y-2">
              <Popover modal={true} open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full flex items-center gap-2">
                    {selectedIcon ? (
                      <>
                        {(() => {
                          const Icon = HABIT_ICONS[selectedIcon as HabitIconType].icon;
                          return <Icon className="h-4 w-4" />;
                        })()}
                        <span>{t('habits.iconPicker.selected')}</span>
                      </>
                    ) : (
                      <>
                        <Pointer className="h-4 w-4 text-gray-500" />
                        <span>{t('habits.iconPicker.select')}</span>
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-3">
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(HABIT_ICONS).map(([key, { icon: Icon, label }]) => (
                      <Button
                        key={key}
                        variant="ghost"
                        className={`p-2 ${selectedIcon === key ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        onClick={() => {
                          setSelectedIcon(key as HabitIconType);
                          setIsIconPickerOpen(false);
                        }}
                        title={label}
                      >
                        <Icon className="h-6 w-6" />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // En el componente principal, agregar el título del paso actual
  const getStepTitle = (step: number) => {
    switch (step) {
      case 1:
        return t('habits.steps.basicInfo.title', 'Información básica');
      case 2:
        return t('habits.steps.schedule.title', 'Rango horario');
      case 3:
        return t('habits.steps.period.title', 'Período del hábito');
      case 4:
        return t('habits.steps.customize.title', 'Personalización');
      default:
        return '';
    }
  };

  const getStepDescription = (step: number) => {
    switch (step) {
      case 1:
        return t('habits.steps.basicInfo.description', 'Nombre y descripción de tu hábito');
      case 2:
        return t('habits.steps.schedule.description', 'Define el horario para realizar este hábito');
      case 3:
        return t('habits.steps.period.description', 'Establece la duración y los días para este hábito');
      case 4:
        return t('habits.steps.customize.description', 'Personaliza el aspecto de tu hábito');
      default:
        return '';
    }
  };

  // Función para actualizar el formData
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Agregar el manejador de submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Si estamos seleccionando la hora, no continuar con el envío
    if (isSubmitting || isSelectingTime) return;
    
    setIsSubmitting(true);
    setHasAttemptedNextStep(true);

    try {
      // Validar que tengamos una fecha de inicio
      if (!startDate) {
        toast({
          title: "Error en las fechas",
          description: "Por favor selecciona una fecha de inicio",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Validar que la fecha de fin sea posterior a la fecha de inicio
      if (endDate && startDate && endDate < startDate) {
        toast({
          title: "Error en las fechas",
          description: "La fecha de fin debe ser posterior a la fecha de inicio",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Validar que si no es indefinido, tenga fecha de fin
      if (!isIndefinite && !endDate) {
        toast({
          title: "Error en las fechas",
          description: "Por favor selecciona una fecha de fin o marca como sin límite",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Validar que tenga un color y un icono seleccionados
      if (!selectedColor || !selectedIcon) {
        toast({
          title: "Faltan datos",
          description: "Por favor selecciona un color y un icono para el hábito",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
      
      if (currentStep === 4 && validateStep4()) {
        const habitName = formData.name.trim();
        
        // Asegurarnos de que las fechas estén en la zona horaria local y a medianoche
        const startDateFormatted = format(startDate, 'yyyy-MM-dd');
        const endDateFormatted = endDate && !isIndefinite ? format(endDate, 'yyyy-MM-dd') : undefined;

        // Usar los índices estándar de JavaScript: 0=Domingo, 1=Lunes, ..., 6=Sábado
        const finalSelectedDays = selectedDays.length > 0 ? selectedDays : [0, 1, 2, 3, 4, 5, 6];
        
        console.log('GUARDANDO HÁBITO:');
        console.log('Nombre:', habitName);
        console.log('Días seleccionados:', finalSelectedDays);
        console.log('Días seleccionados (nombres):', finalSelectedDays.map(d => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d]));
        console.log('Fecha actual:', new Date());
        console.log('Día de la semana actual:', new Date().getDay(), '(', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()], ')');

        const newHabit = {
          ...formData,
          index: habits?.length || 0,
          type: 'habit' as const,
          getColor: () => selectedColor || '#000000',
          name: habitName,
          description: formData.description.trim(),
          time: noSpecificTime ? null : `${timeRange.start}-${timeRange.end}`,
          difficulty: 'medium' as Difficulty,
          color: selectedColor!,
          noSpecificTime,
          record: 0,
          currentStreak: 0,
          timeObjective: calculateTimeObjective(startDateFormatted, endDateFormatted || null),
          startDate: startDateFormatted,
          endDate: endDateFormatted,
          isIndefinite,
          icon: selectedIcon,
          selectedDays: finalSelectedDays,
          objectiveHistory: [],
          currentObjective: {
            startDate: startDateFormatted,
            endDate: endDateFormatted,
            timeObjective: calculateTimeObjective(startDateFormatted, endDateFormatted || null),
            completed: false
          },
          user_id: userId,
          time_exceptions: {}
        };

        onAddHabit(newHabit);
        // Solo mostrar el diálogo de éxito, no el toast
        setShowSuccess(true);
        setSavedHabitName(habitName);
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agregar función para verificar si el paso actual está completo
  const isCurrentStepComplete = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && 
               formData.description.trim() !== '' &&
               !checkDuplicateName(formData.name);
      case 2:
        return noSpecificTime || (timeRange.start !== '' && timeRange.end !== '');
      case 3:
        return startDate !== undefined && 
               (isIndefinite || endDate !== undefined);
      case 4:
        // La selección de días es opcional, solo validamos color e icono
        return selectedColor !== null && selectedIcon !== '';
      default:
        return false;
    }
  };

  // Agregar la función formatTimeDisplay
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    if (use24HourFormat) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const calculateDuration = (startDate: Date, endDate: Date) => {
    // Incluir tanto el día inicial como el final en el cálculo
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir el día final
    return diffDays;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Solo permitir cerrar si no estamos seleccionando una fecha o una hora
        if (!isStartDateOpen && !isEndDateOpen && !isTimePickerOpen) {
          // Remove focus from any buttons before closing the dialog
          if (!open) {
            // Use setTimeout to ensure this happens after React's event loop
            setTimeout(() => {
              // Focus the body element or any safe element outside the dialog
              document.body.focus();
              // Reset the attempted next step flag when closing
              setHasAttemptedNextStep(false);
              setIsSelectingTime(false);
              
              // Asegurarse de que todos los elementos interactivos dentro del diálogo
              // pierdan el foco antes de cerrar
              const dialogElement = document.querySelector('[role="dialog"]');
              if (dialogElement) {
                const focusableElements = dialogElement.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                focusableElements.forEach((el) => {
                  const element = el as HTMLElement;
                  element.blur();
                });
              }
            }, 0);
          }
          onOpenChange(open);
        }
      }}>
        <DialogContent 
          className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl"
          // Agregar el atributo inert cuando el diálogo está cerrado
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.body.focus();
          }}
        >
          <DialogClose 
            className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <DialogHeader className="bg-white dark:bg-gray-800">
            <DialogTitle>{getStepTitle(currentStep)}</DialogTitle>
            <DialogDescription>{getStepDescription(currentStep)}</DialogDescription>
          </DialogHeader>
          
          <StepIndicator currentStep={currentStep} />
          
          <form 
            className="space-y-4 bg-white dark:bg-gray-800" 
            ref={addHabitFormRef}
            onSubmit={handleSubmit}
          >
            {renderStepContent()}
            
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  paginate(-1);
                  setCurrentStep(prev => prev - 1);
                }}
                disabled={currentStep === 1}
              >
                {t('habits.navigation.previous')}
              </Button>
              
              {currentStep === 4 ? (
                <Button 
                  type="submit"
                  className={`transition-all duration-300 ${
                    isCurrentStepComplete() 
                      ? 'bg-black text-white hover:bg-gray-800 dark:border dark:border-gray-600 dark:bg-transparent dark:hover:bg-gray-700/50 dark:text-white hover:scale-105 transform flex items-center gap-2' 
                      : 'bg-gray-400 text-gray-300 dark:bg-gray-600/50 dark:border dark:border-gray-600/50 cursor-not-allowed'
                  }`}
                  disabled={!isCurrentStepComplete()}
                >
                  <span className="flex items-center gap-2">
                    {t('habits.navigation.finish')}
                    {isCurrentStepComplete() && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-white"
                      >
                        ✓
                      </motion.div>
                    )}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={async () => {
                    await handleNext();
                    paginate(1);
                  }}
                  className={`transition-all duration-300 ${
                    isCurrentStepComplete() 
                      ? 'bg-black text-white hover:bg-gray-800 dark:border dark:border-gray-600 dark:bg-transparent dark:hover:bg-gray-700/50 dark:text-white hover:scale-105 transform flex items-center gap-2' 
                      : 'bg-gray-400 text-gray-300 dark:bg-gray-600/50 dark:border dark:border-gray-600/50 cursor-not-allowed'
                  }`}
                  disabled={!isCurrentStepComplete()}
                >
                  <span className="flex items-center gap-2">
                    {t('habits.navigation.next')}
                    {isCurrentStepComplete() && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-white"
                      >
                        →
                      </motion.div>
                    )}
                  </span>
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SuccessDialog 
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setFormData({
            name: '',
            description: '',
            time: null,
            startDate: undefined,
            endDate: undefined,
            isIndefinite: false,
            noSpecificTime: false,
            selectedDays: [],
            color: null,
            icon: ''
          });
        }}
        habitName={savedHabitName}
        userName={userProfile ? `${userProfile.name}` : 'Usuario'}
      />
    </>
  );
};

export default AddHabitDialog;