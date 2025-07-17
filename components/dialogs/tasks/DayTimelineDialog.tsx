import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { useTranslation } from 'next-i18next';
import { Task, TimelineItem, Habit, TaskLabel } from '../../types/types';
import { ExtendedTask } from '@/store/useTaskStore';
import { X, ChevronLeft, ClipboardList, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Button } from "@/components/ui/primitives/button";
import { MonthCalendarView } from "@/components/ui/composite/calendar/MonthCalendarView";
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeDate, formatDateToString, areDatesEqual } from '@/utils/dateUtils';
import { useTimelinePositioning } from './useTimelinePositioning';
import { TimelineGrid } from './components/TimelineGrid';
import { TimelineItems } from './components/TimelineItems';
import { DialogModals } from './components/DialogModals';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { addDays, subDays } from 'date-fns';
import { MonthCalendarDialog } from './MonthCalendarDialog';
import Hammer from 'hammerjs';
import { CurrentTimeLine } from './components/CurrentTimeLine';
import { useTimelineItems } from '@/components/custom-hooks/useTimelineItems';
import { useHabitStore } from '@/store/useHabitStore';
import { habitService } from '@/src/supabase/services/habit.service';
import { useTaskStore } from '@/store/useTaskStore';
import { logger } from '@/utils/logger';
import { tasksService } from '@/src/supabase/services/tasks.service';
import { toast } from "@/components/ui/use-toast";

interface DayTimelineDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onUpdateTask: (taskId: string, updates: Partial<ExtendedTask>) => void;
  onDelete: (taskId: string) => Promise<void>;
  habits: Habit[];
  onUpdateHabit: (habitId: string, updates: Partial<Habit>) => void;
  habitStatus: Record<string, { status: string }>;
  taskLabels: TaskLabel[];
}

export const DayTimelineDialog = ({ 
  isOpen, 
  onOpenChange, 
  date: initialDate, 
  onUpdateTask, 
  onDelete,
  habits,
  onUpdateHabit,
  habitStatus,
  taskLabels,
}: DayTimelineDialogProps) => {
  const { t } = useTranslation('common');
  const [view, setView] = useState<'day' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState(() => normalizeDate(initialDate));
  const [editableItemId, setEditableItemId] = useState<string | null>(null);
  const [selectedTaskForNote, setSelectedTaskForNote] = useState<Task | null>(null);
  const [isViewingNote, setIsViewingNote] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string | null>(null);
  const [resizeType, setResizeType] = useState<'start' | 'end' | null>(null);
  const [interactionMode, setInteractionMode] = useState<'resize' | 'move' | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showTimeLabels, setShowTimeLabels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasAttemptedNextStep, setHasAttemptedNextStep] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isIndefinite, setIsIndefinite] = useState(false);
  const [noSpecificTime, setNoSpecificTime] = useState(false);
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedHabitName, setSavedHabitName] = useState('');

  const {
    HOUR_HEIGHT,
    QUARTER_PIXEL_HEIGHT,
    itemPositions,
    activeTimeSlot: timelineActiveTimeSlot,
    isDragging,
    calculateItemPosition,
    handleTaskDrag,
    handleTaskStop,
    snapToNearestTimeSlot,
    timeToPixels,
    pixelsToTime,
    handleZoom,
    forceUpdate: timelineForceUpdate,
    setItemPositions,
    currentDragTime,
    calculateTimeFromPosition,
    forceEndDragging,
  } = useTimelinePositioning(onUpdateTask, onUpdateHabit);

  const { timelineItems: timelineItemsFromUseTimelineItems } = useTimelineItems(currentDate);

  const formattedDate = format(currentDate, 'yyyy-MM-dd');

  // Mover el useRef aquí, al nivel superior del componente
  const hasScrolled = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Modificar el useEffect para usar la ref ya declarada
  useEffect(() => {
    if (isOpen && view === 'day' && !hasScrolled.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        const scrollPosition = timeToPixels(currentTime);

        const containerHeight = container.clientHeight;
        const offset = containerHeight / 3;

        container.scrollTo({
          top: Math.max(0, scrollPosition - offset),
          behavior: 'smooth'
        });

        hasScrolled.current = true;
      }, 300);
    }
  }, [isOpen, view, timeToPixels]);

  const { tasks, updateTaskTime, getFilteredTasks } = useTaskStore();

  const filteredTasks = useMemo(() => {
    // Opción 1: Usar directamente el objeto Date
    // Pasar true como cuarto parámetro para incluir tareas completadas en la vista de timeline
    return getFilteredTasks(currentDate, '', false, true);
    
    // Opción 2: Convertir el string a Date si necesitas formatear
    // const dateObj = new Date(formattedDate);
    // return getFilteredTasks(dateObj);
  }, [getFilteredTasks, currentDate]);

  useEffect(() => {
    setCurrentDate(normalizeDate(initialDate));
  }, [initialDate]);

  // Limpiar estados cuando se cierra el diálogo
  useEffect(() => {
    if (!isOpen) {
      setActiveTaskId(null);
      setEditableItemId(null);
      setIsViewingNote(false);
      setIsEditingTask(false);
      setTaskToEdit(null);
      setTaskToDelete(null);
      setIsSubmitting(false);
      setHasAttemptedNextStep(false);
      setStartDate(null);
      setEndDate(null);
      setIsIndefinite(false);
      setNoSpecificTime(false);
      setTimeRange({ start: '', end: '' });
      setSelectedDays([]);
      setSelectedColor(null);
      setSelectedIcon(null);
      setShowSuccess(false);
      setSavedHabitName('');
    }
  }, [isOpen]);

  const handleTaskClick = (itemId: string | number) => {
    // Solo activamos el modo resize con click simple
    if (editableItemId === itemId && interactionMode === 'resize') {
      setEditableItemId(null);
      setInteractionMode(null);
    } else if (interactionMode !== 'move') { // No activar si está en modo move
      setEditableItemId(itemId.toString());
      setInteractionMode('resize');
    }
  };

  const handleTaskDoubleClick = (itemId: string | number | null) => {
    const currentEditableId = String(itemId);
    
    if (currentEditableId === editableItemId && interactionMode === 'move') {
      setEditableItemId(null);
      setInteractionMode(null);
      setActiveTaskId(null);
      return;
    }

    const item = timelineItemsFromUseTimelineItems.find(i => String(i.id) === currentEditableId);
    if (!item) return;

    setEditableItemId(currentEditableId);
    setInteractionMode('move');
    setActiveTaskId(currentEditableId);
  };

  const showNoteDialog = (task: Task) => {
    setSelectedTaskForNote(task);
    setIsViewingNote(true);
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<ExtendedTask>) => {
    onUpdateTask(taskId, {
      ...updates,
      time_exceptions: updates.time_exceptions || {}
    });
  };

  const updateActiveTimeSlot = (
    taskId: string | number,
    deltaY: number,
    currentPos: number,
    height: number
  ) => {
    // Definimos un margen de tolerancia en píxeles
    const TOLERANCE = 10;
    
    // Calculamos los minutos con margen de tolerancia
    const minutes = Math.round((currentPos / HOUR_HEIGHT) * 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    // Función auxiliar para verificar si estamos cerca de un intervalo
    const isNearInterval = (currentMinute: number, targetMinute: number) => {
      const currentPixels = (currentMinute / 60) * HOUR_HEIGHT;
      const targetPixels = (targetMinute / 60) * HOUR_HEIGHT;
      return Math.abs(currentPixels - targetPixels) <= TOLERANCE;
    };

    // Determinamos qué intervalo está más cercano
    const currentMinute = hours * 60 + mins;
    let timeSlot = '';

    if (isNearInterval(currentMinute, hours * 60)) {
      timeSlot = `${String(hours).padStart(2, '0')}:00`;
    } else if (isNearInterval(currentMinute, hours * 60 + 15)) {
      timeSlot = `${String(hours).padStart(2, '0')}:15`;
    } else if (isNearInterval(currentMinute, hours * 60 + 30)) {
      timeSlot = `${String(hours).padStart(2, '0')}:30`;
    } else if (isNearInterval(currentMinute, hours * 60 + 45)) {
      timeSlot = `${String(hours).padStart(2, '0')}:45`;
    }

    setActiveTimeSlot(timeSlot);
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    handleTaskDrag(String(taskId), deltaY, currentPos, height, formattedDate);
  };

  const onItemStop = (itemId: string | number, currentPos: number, height: number, date: string) => {
    const item = timelineItemsFromUseTimelineItems.find(i => String(i.id) === String(itemId));
    if (!item || !item.time) return;

    const tasksAsTimelineItems: TimelineItem[] = tasks.map(task => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      time: task.time || undefined,
      color: task.color || '#3b82f6',
      label: task.label || undefined,
      completed: task.completed,
      priority: task.priority,
      note: task.note || undefined,
      dueDate: task.dueDate === null ? undefined : task.dueDate || undefined,
      created_at: task.created_at || '',
      time_exceptions: task.time_exceptions || {},
      recurring_exceptions: task.recurring_exceptions || {}
    })) as TimelineItem[];
    const { time } = snapToNearestTimeSlot(currentPos, height, item.time, itemId, item as TimelineItem, tasksAsTimelineItems, formattedDate);

    if (item.type && item.type === 'task') {
      const task = tasks.find(t => t.id === itemId);
      if (!task) return;

      if (task.is_recurring) {
        onUpdateTask(itemId.toString(), {
          recurring_exceptions: {
            ...task.recurring_exceptions,
            [date]: { time }
          }
        });
      } else {
        onUpdateTask(itemId.toString(), { time });
      }
    } else if (item.type && item.type === 'habit') {
      const habitStore = useHabitStore.getState();
      const habit = habitStore.habits.find(h => Number(h.id) === Number(itemId));
      
      if (!habit) return;
      
      if (onUpdateHabit) {
        const habitIdString = habit.id.toString();
        onUpdateHabit(habitIdString, { /* propiedad válida */ });
      }

      // Actualizar el store
      habitStore.setHabits(
        habitStore.habits.map(h => 
          h.id === Number(itemId) ? {
            ...h,
            time_exceptions: {
              ...h.time_exceptions,
              [date]: { time }
            }
          } : h
        )
      );
    }

    handleTaskStop(itemId, currentPos, height, date);
    setActiveTimeSlot(null);
    setEditableItemId(null);
    setInteractionMode(null);
    setActiveTaskId(null);
  };

  // Mover estas declaraciones al principio, antes de usarlas
  const handleDragStart = useCallback(() => {
    setShowTimeLabels(true);
  }, []);

  const handleDragStop = useCallback(() => {
    setShowTimeLabels(false);
  }, []);

  // Luego puedes usar handleTaskStopPosition que depende de handleDragStop
  const handleTaskStopPosition = useCallback((
    itemId: string | number,
    currentPos: number,
    height: number,
    date: string
  ) => {
    handleTaskStop(itemId, currentPos, height, date);
    
    // Limpiar los estados de edición después de que se complete el arrastre
    setEditableItemId(null);
    setInteractionMode(null);
    setActiveTaskId(null);
    
    // Forzar el fin del arrastre para asegurar que todos los estados visuales se limpien
    forceEndDragging();
  }, [handleTaskStop, forceEndDragging]);

  const handleResizeStart = (itemId: string | number, type: 'start' | 'end') => {
    setEditableItemId(itemId.toString());
    setResizeType(type);
    setInteractionMode('resize');
  };

  const taskToTimelineItem = (task: Task): TimelineItem => {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    return {
      id: task.id,
      type: 'task',
      title: task.title,
      time: task.time,
      color: task.color || '#3b82f6',
      label: (taskLabels.find(l => l.id === task.label_id) || task.label) || undefined,
      note: task.note,
      completed: task.completed,
      priority: task.priority,
      dueDate: (task.dueDate === null ? undefined : task.dueDate) as string | undefined, // 🔧 CORRECCIÓN: Casting explícito
      created_at: task.created_at
    };
  };

  const handleResize = (itemId: string | number, deltaY: number, type: 'start' | 'end') => {
    const task = tasks.find(t => t.id === itemId);
    if (!task?.time) return;

    const [startTime, endTime] = task.time.split('-');
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const timelineItem = taskToTimelineItem(task);
    const timelineItems = tasks.map(taskToTimelineItem);
    const position = calculateItemPosition(timelineItem, formattedDate);
    const startPos = timeToPixels(startTime);
    const endPos = timeToPixels(endTime);

    // Aumentar sensibilidad y reducir cálculos
    const adjustedDeltaY = deltaY * 0.8; // Mayor sensibilidad
    
    if (type === 'start') {
      const newStartPos = startPos + adjustedDeltaY;
      const boundedStartPos = Math.max(0, Math.min(newStartPos, endPos - HOUR_HEIGHT / 4));
      handleTaskDrag(String(itemId), adjustedDeltaY, boundedStartPos, endPos - boundedStartPos, formattedDate);
    } else {
      const newEndPos = endPos + adjustedDeltaY;
      const boundedEndPos = Math.max(startPos + HOUR_HEIGHT / 4, Math.min(newEndPos, 23 * HOUR_HEIGHT));
      handleTaskDrag(String(itemId), 0, startPos, boundedEndPos - startPos, formattedDate);
    }
  };

  const handleResizeStop = (itemId: string | number, type: 'start' | 'end') => {
    const task = tasks.find(t => t.id === itemId);
    if (!task?.time) return;

    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const timelineItem = taskToTimelineItem(task);
    const timelineItems = tasks.map(taskToTimelineItem);
    const position = calculateItemPosition(timelineItem, formattedDate);
    const currentPos = itemPositions[itemId]?.[formattedDate] ?? (position?.top || 0);
    if (currentPos === undefined) return;

    const [startTime, endTime] = task.time.split('-');
    let newTime = task.time;

    if (type === 'start') {
      const newStartTime = pixelsToTime(currentPos);
      newTime = `${newStartTime}-${endTime}`;
    } else {
      const endPos = currentPos + (position?.height || 0);
      const newEndTime = pixelsToTime(endPos);
      newTime = `${startTime}-${newEndTime}`;
    }

    onUpdateTask(itemId.toString(), { time: newTime });
    setResizeType(null);
  };

  // Función para manejar el auto-scroll
  const handleAutoScroll = useCallback((e: MouseEvent | TouchEvent, scrollContainer: HTMLElement) => {
    const SCROLL_THRESHOLD = 100;
    const MAX_SCROLL_SPEED = 12; // Reducido de 20 a 12
    const MIN_SCROLL_SPEED = 1;  // Reducido de 2 a 1
    const SCROLL_INTERVAL = 16;
    let scrollAnimationFrame: number | null = null;

    const containerRect = scrollContainer.getBoundingClientRect();
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const topDelta = clientY - containerRect.top;
    const bottomDelta = containerRect.bottom - clientY;

    // Función de suavizado mejorada
    const easeInOutQuad = (t: number): number => {
      t = Math.max(0, Math.min(1, t));
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    };

    const performScroll = () => {
      if (scrollAnimationFrame) {
        cancelAnimationFrame(scrollAnimationFrame);
      }

      scrollAnimationFrame = requestAnimationFrame(() => {
        if (topDelta < SCROLL_THRESHOLD) {
          const factor = easeInOutQuad(1 - (topDelta / SCROLL_THRESHOLD));
          const speed = MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * factor;
          scrollContainer.scrollBy({
            top: -speed,
            behavior: 'auto'
          });
        } else if (bottomDelta < SCROLL_THRESHOLD) {
          const factor = easeInOutQuad(1 - (bottomDelta / SCROLL_THRESHOLD));
          const speed = MIN_SCROLL_SPEED + (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * factor;
          scrollContainer.scrollBy({
            top: speed,
            behavior: 'auto'
          });
        }
      });
    };

    let scrollInterval: number | null = null;

    if (topDelta < SCROLL_THRESHOLD || bottomDelta < SCROLL_THRESHOLD) {
      scrollInterval = window.setInterval(performScroll, SCROLL_INTERVAL);
    }

    const cleanup = () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
      if (scrollAnimationFrame) {
        cancelAnimationFrame(scrollAnimationFrame);
      }
      document.removeEventListener('mouseup', cleanup);
      document.removeEventListener('touchend', cleanup);
      document.removeEventListener('mouseleave', cleanup);
    };

    document.addEventListener('mouseup', cleanup);
    document.addEventListener('touchend', cleanup);
    document.addEventListener('mouseleave', cleanup);
  }, []);

  // Manejador de rueda del ratón para zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.0005; // Reduce sensitivity for smoother zooming
      handleZoom(delta);
    }
  }, [handleZoom]);

  // Actualizar la configuración de Hammer y los manejadores de gestos
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Configuración base para scroll nativo suave
    container.style.cssText = `
      touch-action: pan-y;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    `;

    const mc = new Hammer.Manager(container, {
      touchAction: 'pan-y',
      recognizers: [
        [Hammer.Pinch, { 
          enable: true,
          threshold: 0.1,
          pointers: 2
        }]
      ]
    });

    // Simplificar manejo de zoom
    let lastScale = 1;
    
    mc.on('pinchstart', () => {
      lastScale = 1;
    });

    mc.on('pinchmove', (e) => {
      const deltaScale = e.scale - lastScale;
      lastScale = e.scale;
      
      requestAnimationFrame(() => {
        handleZoom(deltaScale * 0.05); // Reduce sensitivity for smoother zooming
      });
    });

    // Eliminar los listeners de scroll manual y pan
    // Dejar que el scroll nativo funcione por sí solo

    return () => {
      mc.destroy();
    };
  }, [handleZoom]);

  // Agregar este efecto para limpiar completamente el estado cuando cambia la fecha
  useEffect(() => {
    // Cuando cambia la fecha, forzar una limpieza completa
    
    // Limpiar posiciones
    setItemPositions({});
    
    // Forzar actualización visual
    setForceUpdate(prev => prev + 1);
    
    // Limpiar cualquier caché o estado compartido
    if (typeof window !== 'undefined') {
      localStorage.removeItem('habitPositions');
    }
  }, [formattedDate]);

  const controls = useAnimation();

  // Crea una nueva función para el evento onDragEnd de motion.div
  const handleSwipeDragEnd = (e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Solo permitir el deslizamiento si no hay una tarea en modo edición
    if (!editableItemId) {
      const threshold = 150;
      const velocityThreshold = 2;
      
      if (info.offset.x > threshold && info.velocity.x > velocityThreshold) {
        controls.start({ x: '100%' }).then(() => {
          setCurrentDate(subDays(currentDate, 1));
          controls.set({ x: 0 });
        });
      } else if (info.offset.x < -threshold && info.velocity.x < -velocityThreshold) {
        controls.start({ x: '-100%' }).then(() => {
          setCurrentDate(addDays(currentDate, 1));
          controls.set({ x: 0 });
        });
      } else {
        controls.start({ x: 0 });
      }
    }
  };

  const handleDateSelect = useCallback((date: Date, isMonthChange: boolean) => {
    setCurrentDate(date);
    if (!isMonthChange) {
      setView('day');
    }
  }, []);

  // Añadir estas funciones antes del return
  const handleSetEditableItemId = (id: string | number | null) => {
    setEditableItemId(id?.toString() || null);
  };

  const handleSetActiveTaskId = (id: string | number | null) => {
    setActiveTaskId(id?.toString() || null);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onUpdateTask(taskId, { completed: !task.completed });
    }
  };

  const handleHabitComplete = (habitId: string | number) => {
    const habitIdString = habitId.toString();
    const statusKey = `${habitIdString}-${formattedDate}`;
    useHabitStore.getState().updateHabitStatus(statusKey, 'completed');
  };

  const handleHabitTimeUpdate = useCallback((habitId: string, updates: Partial<Habit>) => {
    if (updates.time) {
      useHabitStore.getState().updateHabitTime(habitId, updates.time, formattedDate);
    }
    onUpdateHabit(habitId, updates);
  }, [formattedDate, onUpdateHabit]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Add any timeline specific form submission logic here if needed
  };

  return (
    <>
      {/* Diálogo de vista diaria */}
      <Dialog 
        open={isOpen}
        onOpenChange={onOpenChange}
      >
        <DialogContent 
          className="max-w-[90vw] sm:max-w-[800px] h-[90vh] sm:h-[90vh] 
            bg-white dark:bg-gray-900 p-0 overflow-hidden rounded-xl md:rounded-2xl day-timeline-dialog timeline-container"
          onInteractOutside={(e) => e.preventDefault()}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              e.preventDefault();
            }
          }}
        >
          <DialogTitle className="sr-only">
            {t('tasks.timeline.dayTitle', 'Cronograma Diario')}
          </DialogTitle>
          <DialogDescription id="timeline-dialog-description" className="sr-only">
            {t('tasks.timeline.description', 'Vista del cronograma diario donde puede ver y gestionar sus tareas y hábitos programados.')}
          </DialogDescription>
          
          <div className="absolute left-4 top-4 flex items-center gap-2 z-10">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setView('month')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="dialog-corner-button absolute right-4 top-4 z-50"
            onClick={() => {
              onOpenChange(false);
            }}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>

          <DialogHeader className="relative pt-2">
            <div className="flex flex-col items-center justify-center text-center">
              <h2 className="text-lg sm:text-xl font-semibold">
                {t('tasks.timeline.dayTitle')}
              </h2>
              {view === 'day' && (
                <span className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <span className={`
                    ${isSameDay(currentDate, new Date()) 
                      ? 'bg-black dark:bg-white text-white dark:text-black px-2 rounded-lg font-medium' 
                      : ''
                    }`}
                  >
                    {format(currentDate, 'dd')}
                  </span>
                  <span>
                    de {t(`calendar.months.${format(currentDate, 'MMMM', { locale: es }).toLowerCase()}`)} de {format(currentDate, 'yyyy')}
                  </span>
                </span>
              )}
            </div>
          </DialogHeader>

          {view === 'day' ? (
            <motion.div
              drag={editableItemId ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleSwipeDragEnd}  // Usar la nueva función aquí
              animate={controls}
              className="relative w-full h-full"
            >
              <div 
                ref={scrollContainerRef}
                className="timeline-scroll-container max-h-[70vh] sm:max-h-[calc(80vh-120px)] overflow-y-auto overflow-x-hidden"
                style={{ touchAction: 'pan-y pinch-zoom' }}
              >
                <div className="pt-4 pl-16 sm:pl-20 pr-4">
                  <div 
                    className="relative border-l border-gray-200 dark:border-gray-700 w-full"
                    style={{ 
                      height: `${24 * HOUR_HEIGHT}px`,
                      marginTop: '1rem'
                    }}
                  >
                    <TimelineGrid 
                      HOUR_HEIGHT={HOUR_HEIGHT} 
                      QUARTER_PIXEL_HEIGHT={QUARTER_PIXEL_HEIGHT}
                      activeTimeSlot={activeTimeSlot}
                      isDragging={isDragging}
                      currentDragTime={currentDragTime}
                      showTimeLabels={showTimeLabels}
                      key={`timeline-grid-${HOUR_HEIGHT}-${forceUpdate}`}
                    />
                    <CurrentTimeLine 
                      currentDate={currentDate} 
                      hourHeight={HOUR_HEIGHT}
                      key={`current-time-line-${HOUR_HEIGHT}-${forceUpdate}`} 
                    />
                    <div className="timeline-container">
                      {/* Sección de respaldo para hábitos */}
                     
                      
                      {/* Elementos con tiempo específico */}
                      <TimelineGrid
                        HOUR_HEIGHT={HOUR_HEIGHT}
                        QUARTER_PIXEL_HEIGHT={QUARTER_PIXEL_HEIGHT}
                        activeTimeSlot={activeTimeSlot}
                        isDragging={isDragging}
                      />
                      
                      <TimelineItems
                        items={timelineItemsFromUseTimelineItems as TimelineItem[]}
                        tasks={tasks}
                        currentDate={currentDate}
                        editableItemId={editableItemId}
                        setEditableItemId={handleSetEditableItemId}
                        setInteractionMode={setInteractionMode}
                        setActiveTaskId={handleSetActiveTaskId}
                        itemPositions={itemPositions}
                        QUARTER_PIXEL_HEIGHT={QUARTER_PIXEL_HEIGHT}
                        HOUR_HEIGHT={HOUR_HEIGHT}
                        calculateItemPosition={(item, date) => {
                          const position = calculateItemPosition(item, date);
                          return position || { top: 0, height: 60, left: '0%', width: '100%' };
                        }}
                        onItemDrag={(itemId, deltaY, currentPos, height) => {
                          handleDragStart();
                          handleTaskDrag(String(itemId), deltaY, currentPos, height, formattedDate);
                        }}
                        onItemEdit={(item) => {
                          if (item.type === 'task') {
                            setTaskToEdit(item as Task);
                            setIsEditingTask(true);
                          }
                        }}
                        onItemDelete={(item) => {
                          if (item.type === 'task') {
                            handleDeleteTask(item as Task);
                          }
                        }}
                        onShowNote={showNoteDialog}
                        onDoubleClick={handleTaskDoubleClick}
                        onItemStop={handleTaskStopPosition}
                        onResizeStart={handleResizeStart}
                        onResize={handleResize}
                        onResizeStop={handleResizeStop}
                        interactionMode={interactionMode}
                        onItemClick={handleTaskClick}
                        resizeType={resizeType}
                        handleAutoScroll={handleAutoScroll}
                        toggleTaskStatus={(taskId) => {
                          handleToggleTaskStatus(taskId);
                        }}
                        setTaskToEdit={setTaskToEdit}
                        setIsEditingTask={setIsEditingTask}
                        setTaskToDelete={setTaskToDelete}
                        setSelectedTaskForNote={setSelectedTaskForNote}
                        setIsViewingNote={setIsViewingNote}
                        setForceUpdate={setForceUpdate}
                        habitStatus={habitStatus}
                        forceUpdate={forceUpdate}
                        onHabitComplete={handleHabitComplete}
                        onUpdateHabit={handleHabitTimeUpdate}
                        key={`timeline-items-${HOUR_HEIGHT}-${forceUpdate}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {view === 'day' && (
                <div className="absolute right-3 bottom-3 sm:right-4 sm:bottom-4 flex flex-col gap-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
                    onClick={() => handleZoom(0.1)}
                    aria-label="Aumentar zoom"
                  >
                    <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-white" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/95 dark:bg-gray-800/95 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:scale-110 active:scale-95"
                    onClick={() => handleZoom(-0.1)}
                    aria-label="Reducir zoom"
                  >
                    <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-white" />
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <MonthCalendarView
              tasks={tasks}
              selectedDate={currentDate}
              onDateSelect={handleDateSelect}
              onViewChange={setView}
            />
          )}

          <DialogModals
            isViewingNote={isViewingNote}
            isEditingTask={isEditingTask}
            taskToDelete={taskToDelete}
            selectedTaskForNote={selectedTaskForNote}
            taskToEdit={taskToEdit}
            onViewNoteClose={() => setIsViewingNote(false)}
            onEditTaskClose={() => {
              setIsEditingTask(false);
              setTaskToEdit(null);
            }}
            onDeleteCancel={() => setTaskToDelete(null)}
            onDeleteConfirm={onDelete}
            onUpdateTask={handleTaskUpdate}
          />

          <div 
            id="time-indicator" 
            className="absolute -left-20 z-50 bg-red-500 text-white px-2 py-1 rounded-md text-sm pointer-events-none hidden"
            style={{ transform: 'translateY(-50%)' }}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo de vista mensual */}
      <MonthCalendarDialog
        isOpen={isOpen && view === 'month'}
        onOpenChange={(open) => {
          if (!open) {
            onOpenChange(false);
          }
        }}
        tasks={tasks}
        selectedDate={currentDate}
        onDateSelect={handleDateSelect}
        onViewChange={setView}
      />
    </>
  );
};