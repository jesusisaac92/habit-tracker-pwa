import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Textarea } from "@/components/ui/primitives/textarea";
import { motion } from 'framer-motion';
import { Habit, EditingHabit, Difficulty } from '@/components/types/types';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, X, Check, Palette, Pointer, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { Calendar as CalendarComponent } from "@/components/ui/primitives/calendar";
import { format } from 'date-fns';
import { Switch } from "@/components/ui/primitives/switch";
import { TimePicker } from "@/components/ui/composite/common/TimePicker";
import { HexColorPicker } from "react-colorful";
import { HABIT_ICONS, type HabitIconType } from '@/components/ui/composite/common/IconSelector';
import { Label } from "@/components/ui/primitives/label";

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

// Mapeo de índices reales a índices de la interfaz
const mapRealIndexToInterfaceIndex = (realIndex: number): number => {
  // En JavaScript/estándar: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado
  // En la interfaz: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes, 5=Sábado, 6=Domingo
  
  // Convertir de índice estándar a índice de interfaz
  if (realIndex === 0) {
    return 6; // Domingo (0 en estándar) es el último (6) en la interfaz
  } else {
    return realIndex - 1; // El resto se desplaza una posición hacia atrás
  }
};

// Componente StepIndicator (igual que en AddHabitDialog)
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
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
            {step < 3 && (
              <div
                className={`w-12 h-0.5 ${
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

// Definir los colores predefinidos
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

interface EditHabitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingHabit: EditingHabit | null;
  setEditingHabit: (habit: React.SetStateAction<EditingHabit | null>) => void;
  onSave: (habit: EditingHabit) => void;
  mapToDifficulty: (value: string) => Difficulty;
}

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

const EditHabitDialog: React.FC<EditHabitDialogProps> = ({
  isOpen,
  onOpenChange,
  editingHabit,
  setEditingHabit,
  onSave,
  mapToDifficulty
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [timeRange, setTimeRange] = useState<{ start: string; end: string }>({
    start: editingHabit?.time?.split('-')[0] || '',
    end: editingHabit?.time?.split('-')[1] || ''
  });
  const [formData, setFormData] = useState<FormData>({
    name: editingHabit?.name || '',
    description: editingHabit?.description || '',
    time: editingHabit?.time || null,
    startDate: editingHabit?.startDate ? new Date(editingHabit.startDate) : undefined,
    endDate: editingHabit?.endDate ? new Date(editingHabit.endDate) : undefined,
    isIndefinite: editingHabit?.isIndefinite || false,
    noSpecificTime: editingHabit?.noSpecificTime || false,
    selectedDays: editingHabit?.selectedDays || [],
    color: editingHabit?.color || null,
    icon: editingHabit?.icon || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [noSpecificTime, setNoSpecificTime] = useState(editingHabit?.noSpecificTime || false);
  const [selectedTime, setSelectedTime] = useState(editingHabit?.time || '');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    editingHabit?.startDate ? new Date(editingHabit.startDate + 'T12:00:00') : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    editingHabit?.endDate ? new Date(editingHabit.endDate + 'T12:00:00') : undefined
  );
  const [isIndefinite, setIsIndefinite] = useState(editingHabit?.isIndefinite || false);
  const [isStartDateOpen, setIsStartDateOpen] = useState(false);
  const [isEndDateOpen, setIsEndDateOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(editingHabit?.color || null);
  const [selectedIcon, setSelectedIcon] = useState(editingHabit?.icon || '');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);

  useEffect(() => {
    if (editingHabit) {
      setFormData({
        name: editingHabit.name || '',
        description: editingHabit.description || '',
        time: editingHabit.time || null,
        startDate: editingHabit.startDate ? new Date(editingHabit.startDate) : undefined,
        endDate: editingHabit.endDate ? new Date(editingHabit.endDate) : undefined,
        isIndefinite: editingHabit.isIndefinite || false,
        noSpecificTime: editingHabit.noSpecificTime || false,
        selectedDays: editingHabit.selectedDays || [],
        color: editingHabit.color || null,
        icon: editingHabit.icon || ''
      });
      setSelectedColor(editingHabit.color || null);
      setSelectedIcon(editingHabit.icon || '');
      setTimeRange({
        start: editingHabit.time?.split('-')[0] || '',
        end: editingHabit.time?.split('-')[1] || ''
      });
    }
  }, [editingHabit]);

  const validateStep1 = () => {
    return formData.name.trim() !== '' && formData.description.trim() !== '';
  };

  const validateStep2 = () => {
    return formData.startDate !== undefined && 
           (formData.isIndefinite || formData.endDate !== undefined) &&
           (formData.noSpecificTime || (timeRange.start && timeRange.end));
  };

  const validateStep3 = useCallback(() => {
    if (!selectedColor || !selectedIcon) {
      setErrors({
        ...(selectedColor ? {} : { color: t('validation.colorRequired') }),
        ...(selectedIcon ? {} : { icon: t('validation.iconRequired') })
      });
      return false;
    }
    return true;
  }, [selectedColor, selectedIcon, t]);

  const isCurrentStepComplete = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.startDate !== undefined && 
               (formData.isIndefinite || formData.endDate !== undefined) &&
               (formData.noSpecificTime || (timeRange.start && timeRange.end));
      case 3:
        return !!selectedColor && !!selectedIcon;
      default:
        return false;
    }
  }, [currentStep, formData, timeRange, selectedColor, selectedIcon]);

  const handleNext = useCallback(() => {
    if (currentStep === 3) {
      if (validateStep3() && editingHabit) {
        if (selectedColor && selectedIcon) {
          console.log('GUARDANDO HÁBITO EDITADO:');
          console.log('Nombre:', formData.name);
          console.log('Días seleccionados:', formData.selectedDays);
          console.log('Días seleccionados (nombres):', formData.selectedDays.map(d => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d]));
          console.log('Fecha actual:', new Date());
          console.log('Día de la semana actual:', new Date().getDay(), '(', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()], ')');
          
          const updatedHabit = {
            ...editingHabit,
            name: formData.name,
            description: formData.description,
            noSpecificTime: formData.noSpecificTime,
            isIndefinite: formData.isIndefinite,
            selectedDays: formData.selectedDays,
            startDate: formData.startDate?.toISOString().split('T')[0],
            endDate: formData.endDate?.toISOString().split('T')[0],
            time: formData.noSpecificTime ? null : `${timeRange.start}-${timeRange.end}`,
            color: selectedColor || '#000000',
            icon: selectedIcon || 'book'
          };
          console.log('Enviando actualización con ID:', updatedHabit.id);
          onSave(updatedHabit);
          onOpenChange(false);
        }
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, validateStep3, editingHabit, formData, timeRange, selectedColor, selectedIcon, onSave, onOpenChange]);

  // Función para manejar la selección de días
  const handleDaySelection = (dayIndex: number) => {
    const realDayIndex = mapInterfaceIndexToRealIndex(dayIndex);
    console.log(`Edición - Selección de día: Índice interfaz=${dayIndex} (${['L','M','X','J','V','S','D'][dayIndex]}) -> Índice real=${realDayIndex} (${['D','L','M','X','J','V','S'][realDayIndex]})`);
    
    setFormData(prev => {
      const newSelectedDays = prev.selectedDays.includes(realDayIndex)
        ? prev.selectedDays.filter(d => d !== realDayIndex)
        : [...prev.selectedDays, realDayIndex];
      
      console.log('Edición - Días seleccionados actualizados:', newSelectedDays.map(d => `${d} (${['D','L','M','X','J','V','S'][d]})`));
      return {
        ...prev,
        selectedDays: newSelectedDays
      };
    });
  };

  // Función para seleccionar/deseleccionar todos los días
  const toggleAllDays = () => {
    if (formData.selectedDays.length === 7) {
      // Si todos los días están seleccionados, deseleccionar todos
      console.log('Edición - Deseleccionando todos los días');
      setFormData(prev => ({
        ...prev,
        selectedDays: []
      }));
    } else {
      // Si no todos los días están seleccionados, seleccionar todos
      // Usar los índices estándar de JavaScript: 0=Domingo, 1=Lunes, ..., 6=Sábado
      console.log('Edición - Seleccionando todos los días');
      setFormData(prev => ({
        ...prev,
        selectedDays: [0, 1, 2, 3, 4, 5, 6]
      }));
    }
  };

  // Renderizado de pasos
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
                placeholder={t('habits.name')}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                {t('habits.description')}
              </Label>
              <Textarea
                id="description"
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
            <div>
              <Label className="font-medium">Rango horario</Label>
              
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-sm text-gray-500">Hora de inicio</Label>
                  <Button
                    variant="outline"
                    onClick={() => setIsStartTimeOpen(true)}
                    disabled={noSpecificTime}
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {timeRange.start || "SELECCIONAR HORA"}
                  </Button>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Hora de fin</Label>
                  <Button
                    variant="outline"
                    onClick={() => setIsEndTimeOpen(true)}
                    disabled={noSpecificTime}
                    className="w-full justify-start text-left font-normal mt-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {timeRange.end || "SELECCIONAR HORA"}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={noSpecificTime}
                    onCheckedChange={(checked) => {
                      setNoSpecificTime(checked);
                      setFormData(prev => ({ ...prev, noSpecificTime: checked }));
                    }}
                  />
                  <Label>Sin hora específica</Label>
                </div>
              </div>
            </div>

            {/* Selector de días de la semana */}
            <div className="space-y-2">
              <Label className="font-medium">Días de la semana</Label>
              <div className="grid grid-cols-7 gap-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDaySelection(index)}
                    className={`
                      h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium
                      ${formData.selectedDays.includes(mapInterfaceIndexToRealIndex(index))
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={toggleAllDays}
              >
                {formData.selectedDays.length === 7 
                  ? 'Deseleccionar todos' 
                  : 'Seleccionar todos'}
              </Button>
            </div>

            {/* Fechas */}
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                onClick={() => setIsStartDateOpen(true)}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate ? format(formData.startDate, 'PP') : 'Fecha de inicio'}
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start text-left font-normal"
                  onClick={() => !formData.isIndefinite && setIsEndDateOpen(true)}
                  disabled={formData.isIndefinite}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.endDate ? format(formData.endDate, 'PP') : 'Fecha de fin'}
                </Button>

                <Button
                  variant="outline"
                  className={`flex items-center gap-2 px-3 ${
                    formData.isIndefinite 
                      ? 'bg-blue-500 text-white border-transparent hover:bg-blue-600' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, isIndefinite: !prev.isIndefinite }))}
                >
                  <span className="text-lg">∞</span>
                  <span className="text-sm">Sin límite</span>
                </Button>
              </div>
            </div>

            {/* TimePicker Modal */}
            <TimePicker
              isOpen={isStartTimeOpen}
              onOpenChange={setIsStartTimeOpen}
              value={timeRange.start}
              onChange={(time) => {
                setTimeRange(prev => ({ ...prev, start: time }));
                setFormData(prev => ({ ...prev, time: `${time}-${prev.time?.split('-')[1] || ''}` }));
              }}
            />
            <TimePicker
              isOpen={isEndTimeOpen}
              onOpenChange={setIsEndTimeOpen}
              value={timeRange.end}
              onChange={(time) => {
                setTimeRange(prev => ({ ...prev, end: time }));
                setFormData(prev => ({ ...prev, time: `${prev.time?.split('-')[0] || ''}-${time}` }));
              }}
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            {/* Selector de color */}
            <div className="space-y-2">
              <Popover modal={true} open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button"
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
                          type="button"
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
                        onChange={(color) => {
                          setSelectedColor(color);
                        }}
                      />
                      <Button
                        type="button"
                        onClick={() => setIsColorPickerOpen(false)}
                        className="w-full bg-black text-white hover:bg-gray-800"
                      >
                        {t('habits.colorPicker.selected')}
                      </Button>
                    </div>
                  )}
                  <Button
                    type="button"
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
              {errors.color && <p className="text-red-500 text-xs">{errors.color}</p>}
            </div>

            {/* Selector de icono */}
            <div className="space-y-2">
              <Popover modal={true} open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full flex items-center gap-2"
                  >
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
                        type="button"
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
              {errors.icon && <p className="text-red-500 text-xs">{errors.icon}</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[425px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogClose className="absolute right-4 top-4">
          <X className="h-4 w-4" />
        </DialogClose>
        
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {currentStep === 1 
              ? t('habits.steps.basicInfo.title')
              : currentStep === 2 
              ? t('habits.steps.schedule.title')
              : t('habits.steps.customize.title')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {currentStep === 1 
              ? t('habits.steps.basicInfo.description')
              : currentStep === 2 
              ? t('habits.steps.schedule.description')
              : t('habits.steps.customize.description')}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />
        
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {renderStepContent()}
          
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(prev => prev - 1)}
              disabled={currentStep === 1}
            >
              {t('habits.navigation.previous')}
            </Button>
            
            <Button
              type="button"
              onClick={() => handleNext()}
              className={`transition-all duration-300 ${
                isCurrentStepComplete() 
                  ? 'bg-black text-white hover:bg-gray-800 dark:border dark:border-gray-600 dark:bg-transparent dark:hover:bg-gray-700/50 dark:text-white hover:scale-105 transform flex items-center gap-2' 
                  : 'bg-gray-400 text-gray-300 dark:bg-gray-600/50 dark:border dark:border-gray-600/50 cursor-not-allowed'
              }`}
              disabled={!isCurrentStepComplete()}
            >
              {currentStep === 3 ? t('habits.navigation.finish') : t('habits.navigation.next')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { EditHabitDialog };
