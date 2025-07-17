import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Textarea } from "@/components/ui/primitives/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/primitives/select";
import { Calendar as DatePicker } from "@/components/ui/primitives/calendar";
import { Task, TaskLabel } from '@/components/types/types';
import { useTranslation } from 'next-i18next';
import { Flag, Check, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { SelectDatesDialog } from '../common/SelectDatesDialog';
import { ManageLabelsDialog } from '../profile/ManageLabelsDialog';
import { useTaskLabels } from '@/components/types/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/primitives/popover";
import { CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { es } from 'date-fns/locale';
import { Locale } from 'date-fns';
import { CalendarProps } from "@/components/ui/primitives/calendar";
import { Calendar } from "@/components/ui/primitives/calendar";
import 'react-calendar/dist/Calendar.css';
import { TimePickerDialog } from '@/components/ui/composite/common/TimePickerDialog';
import { TimePicker } from "@/components/ui/composite/common/TimePicker";
import { normalizeDate, formatDateToString } from '../../../utils/dateUtils';
import { Switch } from "@/components/ui/primitives/switch";
import { z } from 'zod';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { supabase } from '@/src/supabase/config/client';
import { ExtendedTask } from '@/store/useTaskStore';

const taskSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.string(),
  completed: z.boolean().default(false)
});

// Componente para el indicador de progreso
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {[1, 2].map((step) => (
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
            {step < 2 && (
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

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddTask: (task: Omit<ExtendedTask, 'id' | 'createdAt'>) => void;
  selectedDate: Date;
  initialTask?: ExtendedTask | null;
  mode?: 'add' | 'edit';
}

export const AddTaskDialog = ({ isOpen, onOpenChange, onAddTask, selectedDate, initialTask }: AddTaskDialogProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [noSpecificTime, setNoSpecificTime] = useState(false);
  const { use24HourFormat } = useTimeFormat();
  const [userId, setUserId] = useState('');

  // Actualizar cuando el diálogo se abre
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setPriority(initialTask.priority);
        setStartTime(initialTask.time?.split('-')[0] || '');
        setEndTime(initialTask.time?.split('-')[1] || '');
        setLabel(initialTask.label || '');
        setNote(initialTask.note || '');
        setIsRecurring(initialTask.is_recurring || false);
        setDueDate(initialTask.due_date ? normalizeDate(initialTask.due_date) : null);
      } else {
        // Si es una nueva tarea, resetear todo
        setTitle('');
        setPriority(null);
        setStartTime('');
        setEndTime('');
        setLabel('');
        setNote('');
        setIsRecurring(false);
        setDueDate(null);
      }
      setCurrentStep(1);
      setErrors({});
    }
  }, [isOpen, initialTask, selectedDate]);

  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getSession();
      setUserId(data.session?.user.id || '');
    };
    getUserId();
  }, []);

  // Inicializar todos los estados con los valores de la tarea existente
  const [title, setTitle] = React.useState(initialTask?.title || '');
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high' | null>(initialTask?.priority || null);

  // Determinar el tipo de horario y tiempos iniciales
  const getInitialTimeType = () => {
    if (!initialTask?.time) return 'none';
    return initialTask.time.includes('-') ? 'range' : 'specific';
  };

  const getInitialTimes = () => {
    if (!initialTask?.time) return { start: '', end: '' };
    const times = initialTask.time.split('-');
    return {
      start: times[0] || '',
      end: times[1] || ''
    };
  };

  const { start, end } = getInitialTimes();
  const [startTime, setStartTime] = React.useState(start);
  const [endTime, setEndTime] = React.useState(end);

  // Agregar un nuevo estado
  const [isRecurring, setIsRecurring] = React.useState(initialTask?.is_recurring || false);

  // Agregar junto a los otros estados
  const [label, setLabel] = React.useState(initialTask?.label || '');

  // Cambiar el estado de días recurrentes a un array de fechas
  const [selectedDates, setSelectedDates] = React.useState<Date[]>([]);

  // Agregar el estado para la nota
  const [note, setNote] = React.useState(initialTask?.note || '');

  // Agregar estado para controlar el diálogo de fechas
  const [isSelectingDates, setIsSelectingDates] = useState(false);

  // Agregar estado para gestionar etiquetas
  const [isManagingLabels, setIsManagingLabels] = useState(false);

  // Agregar junto a los otros estados al inicio del componente
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isEndTimePickerOpen, setIsEndTimePickerOpen] = useState(false);  // Para la hora de fin también

  const { labels: taskLabels, updateLabel } = useTaskLabels();

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = t('validation.titleRequired');
    }
    if (!priority) {
      newErrors.priority = t('validation.priorityRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!isRecurring && !dueDate) {
      newErrors.dueDate = t('validation.dateRequired');
    }
    if (isRecurring && selectedDates.length === 0) {
      newErrors.recurringDates = t('validation.recurringDatesRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (isFirstStepValid()) {
        setCurrentStep(2);
      }
      return;
    }

    if (!isSecondStepValid()) {
      return;
    }

    try {
      // Obtener la etiqueta seleccionada
      const selectedLabel = taskLabels.find((l: TaskLabel) => l.id === label);
      
      const taskData = {
        title,
        note: note || '',
        priority: priority || 'medium',
        completed: false,
        user_id: userId,
        time: noSpecificTime ? '' : startTime && endTime ? `${startTime}-${endTime}` : '',
        color: label ? selectedLabel?.color || '#3b82f6' : '#3b82f6',  // 🔧 CORRECCIÓN: Usar color de etiqueta
        is_recurring: isRecurring,
        label_id: selectedLabel?.id || '',  // Guardar siempre el ID
        recurring_dates: isRecurring ? selectedDates.map(date => format(date, 'yyyy-MM-dd')) : [],
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), // Fecha actual si no hay fecha
        recurring_exceptions: {},
        time_exceptions: {},  // Este campo es requerido
        custom_label_name: selectedLabel?.isCustom ? selectedLabel.name : '',
        custom_label_color: selectedLabel?.isCustom ? selectedLabel.color : '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('AddTaskDialog: Enviando tarea para crear:', taskData);
      console.log('🎨 Color asignado:', taskData.color, 'para etiqueta:', selectedLabel?.name); // Debug
      onAddTask(taskData);
      console.log('AddTaskDialog: Tarea enviada');
      handleOpenChange(false);
    } catch (error) {
      console.error('Error al crear la tarea:', error);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('tasks.enterTitle')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <span className="text-red-500 text-sm">{errors.title}</span>}
            </div>

            <div className="space-y-2">
              <Select value={priority || ''} onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}>
                <SelectTrigger className={errors.priority ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('tasks.selectPriority')} />
                </SelectTrigger>
                <SelectContent onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  // Mover el foco al body para evitar problemas de accesibilidad
                  setTimeout(() => {
                    document.body.focus();
                  }, 0);
                }}>
                  <SelectItem value="low" className="mb-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      {t('tasks.priorities.low')}
                    </div>
                  </SelectItem>
                  <SelectItem value="medium" className="mb-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      {t('tasks.priorities.medium')}
                    </div>
                  </SelectItem>
                  <SelectItem value="high" className="mb-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      {t('tasks.priorities.high')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && <span className="text-red-500 text-sm">{errors.priority}</span>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {`${t('tasks.labelLabel')} (${t('common.optional')})`}
                </label>
                <Button
                  type="button"
                  onClick={() => setIsManagingLabels(true)}
                  variant="outline"
                  size="sm"
                  className="p-0 border-none hover:bg-transparent"
                >
                  <span className="w-full flex items-center justify-center px-3 sm:px-4 py-2 sm:py-2 
                    text-xs sm:text-sm font-medium 
                    text-white bg-gradient-to-r from-blue-500 to-purple-500 
                    dark:bg-gradient-to-r dark:from-emerald-400 dark:to-cyan-400
                    rounded-md shadow-sm 
                    hover:from-blue-600 hover:to-purple-600 
                    dark:hover:from-emerald-500 dark:hover:to-cyan-500 
                    focus:outline-none 
                    transition-all duration-300 ease-in-out"
                  >
                    {t('common.manage')}
                  </span>
                </Button>
              </div>
              {label && (
                <div className="flex items-center gap-2 p-2 border rounded-md">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: taskLabels.find((l: TaskLabel) => l.id === label)?.color }}
                  />
                  <span>{taskLabels.find((l: TaskLabel) => l.id === label)?.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder={t('tasks.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('tasks.timeRange')}
              </label>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('tasks.startTime')}
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsTimePickerOpen(true)}
                    disabled={noSpecificTime}
                    className={`w-full justify-start text-left font-normal ${
                      noSpecificTime ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {startTime ? formatTimeDisplay(startTime) : t('tasks.timePicker.selectTime')}
                  </Button>
                  <TimePicker
                    isOpen={isTimePickerOpen}
                    onOpenChange={setIsTimePickerOpen}
                    value={startTime}
                    onChange={setStartTime}
                    isEndTime={false}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('tasks.endTime')}
                  </label>
                  <Button
                    variant="outline"
                    onClick={() => setIsEndTimePickerOpen(true)}
                    disabled={noSpecificTime}
                    className={`w-full justify-start text-left font-normal ${
                      noSpecificTime ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {endTime ? formatTimeDisplay(endTime) : t('tasks.timePicker.selectTime')}
                  </Button>
                  <TimePicker
                    isOpen={isEndTimePickerOpen}
                    onOpenChange={setIsEndTimePickerOpen}
                    value={endTime}
                    onChange={handleEndTimeChange}
                    isEndTime={true}
                    startTime={startTime}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={noSpecificTime}
                  onCheckedChange={(checked) => {
                    setNoSpecificTime(checked);
                    if (checked) {
                      setStartTime('');
                      setEndTime('');
                    }
                  }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('tasks.noSpecificTime')}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('tasks.dueDateLabel')}
              </label>
              <Popover modal={true} open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      isRecurring ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={isRecurring}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'dd-MM-yyyy') : t('tasks.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate || undefined}
                    minDate={new Date()}
                    onSelect={(date: Date | null) => {
                      if (date) {
                        setDueDate(normalizeDate(date));
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                  
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {t('tasks.recurring.label')}
                <span className="text-xs text-gray-500">
                  {t('tasks.recurring.description')}
                </span>
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => setIsSelectingDates(true)}
                  variant="outline"
                  className="w-full text-blue-500 hover:text-blue-600"
                >
                  {selectedDates.length > 0 
                    ? t('tasks.recurring.selectedDates', { count: selectedDates.length })
                    : t('tasks.recurring.selectDates')}
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    try {
      // Crear el objeto de tarea con los datos del formulario
      const newTask: Omit<ExtendedTask, 'id' | 'createdAt'> = {
        title,
        priority: priority || 'medium',
        due_date: formatDateToString(dueDate || selectedDate),
        completed: false,
        user_id: userId,
        time: noSpecificTime ? undefined : (startTime && endTime) ? `${startTime}-${endTime}` : undefined,
        color: label ? taskLabels.find((l: TaskLabel) => l.id === label)?.color : '#3b82f6',
        label: label ? taskLabels.find((l: TaskLabel) => l.id === label) : undefined,
        note: note,
        is_recurring: isRecurring,
        recurring_data: isRecurring ? { dates: selectedDates.map(d => format(d, 'yyyy-MM-dd')) } : undefined,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        recurring_exceptions: {},
        time_exceptions: {}
      };

      console.log('AddTaskDialog - Task being created with color:', newTask.color);
      await onAddTask(newTask);
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleEndTimeChange = (time: string) => {
    if (!startTime) {
      setEndTime(time);
      return;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = time.split(':').map(Number);
    
    // Convertir todo a minutos para comparar
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    if (endTotalMinutes <= startTotalMinutes) {
      setErrors(prev => ({
        ...prev,
        time: t('tasks.timePicker.invalidRange')
      }));
      return;
    }
    
    // Si la validación pasa, actualizamos la hora final
    setEndTime(time);
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.time;
      return newErrors;
    });
  };

  // Agregar esta función para validar los campos requeridos
  const isFirstStepValid = () => {
    return title.trim() !== '' && priority !== null;
  };

  // Agregar esta función para validar el paso 2
  const isSecondStepValid = () => {
    // Si es tarea recurrente, validar que haya fechas seleccionadas
    if (isRecurring) {
      return selectedDates.length > 0 && (noSpecificTime || (startTime !== '' && endTime !== ''));
    }

    // Si no es recurrente, validar que tenga fecha seleccionada
    if (!dueDate) return false;

    // Si tiene "Sin hora específica" activado, solo validar la fecha
    if (noSpecificTime) return true;

    // Si no tiene "Sin hora específica", debe tener hora inicio y fin
    return startTime !== '' && endTime !== '';
  };

  // Manejar el cierre del diálogo
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onOpenChange(false);
      // Limpiar estados después de que el diálogo se haya cerrado
      requestAnimationFrame(() => {
        setTitle('');
        setPriority(null);
        setStartTime('');
        setEndTime('');
        setLabel('');
        setNote('');
        setIsRecurring(false);
        setSelectedDates([]);
        setCurrentStep(1);
        setErrors({});
        setDueDate(null);
        setNoSpecificTime(false);
      });
    }
  };

  // Manejar la selección de fecha en el calendario
  const handleDateSelect = (date: Date | Date[] | null) => {
    if (date instanceof Date) {
      const normalizedDate = normalizeDate(date);
      console.log('Selected date:', normalizedDate);
      setDueDate(normalizedDate);
    }
  };

  // Determinar si estamos en modo edición
  const isEditing = !!initialTask;

  // Función para formatear la hora según el formato seleccionado
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    if (use24HourFormat) return time;

    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:w-auto sm:max-w-[600px] p-2 sm:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl"
        aria-describedby="add-task-dialog-description"
      >
        <DialogClose 
          className="absolute right-4 top-4 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-xl font-semibold text-center">
            {t('tasks.add')}
          </DialogTitle>
          <DialogDescription id="add-task-dialog-description">
            {t('tasks.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />

        <form onSubmit={(e) => e.preventDefault()}>
          {renderStepContent()}

          <div className="flex justify-between mt-6">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                {t('common.back')}
              </Button>
            )}
            <Button 
              type="button" 
              onClick={handleNext}
              disabled={currentStep === 1 ? !isFirstStepValid() : !isSecondStepValid()}
              className={`ml-auto transition-all duration-300 ${
                (currentStep === 1 && !isFirstStepValid()) || (currentStep === 2 && !isSecondStepValid())
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#1E293B] dark:hover:bg-[#2D3748] text-white font-medium py-2 rounded-md transition-all duration-200 border dark:border-gray-600'
              }`}
            >
              <span className="flex items-center gap-2">
                {currentStep === 2 ? t('tasks.createTask') : t('common.next')}
                {(currentStep === 1 && isFirstStepValid()) && (
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
          </div>
        </form>
      </DialogContent>

      <SelectDatesDialog
        isOpen={isSelectingDates}
        onOpenChange={setIsSelectingDates}
        selectedDates={selectedDates}
        onDatesChange={setSelectedDates}
      />

      <ManageLabelsDialog
        isOpen={isManagingLabels}
        onOpenChange={(open) => {
          setIsManagingLabels(open);
        }}
        onSelectLabel={(labelId) => {
          setLabel(labelId);
          setIsManagingLabels(false);
        }}
      />
    </Dialog>
  );
}; 