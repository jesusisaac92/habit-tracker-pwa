import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DraggableCore, DraggableEventHandler, DraggableData } from 'react-draggable';
import { 
  TimelineItem, 
  TaskItem, 
  HabitItem, 
  Task, 
  Habit,
  TimelinePosition,
  } from '@/components/types/types';
import { ExtendedTask as ExtendedTaskStore } from '@/store/useTaskStore';
import { Flag, MessageSquare, Pencil, Trash2, MoreVertical, Check, Trophy, Clock, Circle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/primitives/button';
import { useTimelinePositioning } from '../useTimelinePositioning';
import { TaskResizeHandles } from './TaskResizeHandles';
import { type HabitIconType } from '@/components/ui/composite/common/IconSelector';
import { format } from 'date-fns';
import { HabitDetailsDialog } from '@/components/dialogs/habits/HabitDetailsDialog';
import { TaskDetailsDialog } from './TaskDetailsDialog';
import { useTaskLabels } from '@/components/dialogs/tasks/useTaskLabels';
import { useHabitStore } from '@/store/useHabitStore';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { logger } from '@/utils/logger';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { habitCompletionService } from '@/src/supabase/services/habitCompletion.service';

interface TimelineItemsProps {
  items: TimelineItem[];
  tasks: Task[];
  currentDate: Date;
  editableItemId: string | number | null;
  setEditableItemId: (id: string | number | null) => void;
  setInteractionMode: (mode: 'resize' | 'move' | null) => void;
  setActiveTaskId: (id: string | number | null) => void;
  itemPositions: { 
    [key: string]: { [date: string]: number };
    [key: number]: { [date: string]: number };
  };
  QUARTER_PIXEL_HEIGHT: number;
  HOUR_HEIGHT: number;
  calculateItemPosition: (item: TimelineItem, date: string) => TimelinePosition | null;
  onItemDrag: (itemId: string | number, deltaY: number, currentPos: number, height: number, date?: string) => void;
  onItemEdit: (item: Task | Habit) => void;
  onItemDelete: (item: Task | Habit) => void;
  onShowNote?: (item: Task) => void;
  onDoubleClick: (itemId: string | number | null) => void;
  onItemStop: (itemId: string | number, currentPos: number, height: number, date: string) => void;
  onResizeStart: (itemId: string | number, type: 'start' | 'end') => void;
  onResize: (itemId: string | number, deltaY: number, type: 'start' | 'end') => void;
  onResizeStop: (itemId: string | number, type: 'start' | 'end') => void;
  interactionMode: 'resize' | 'move' | null;
  onItemClick: (itemId: string | number) => void;
  resizeType: 'start' | 'end' | null;
  handleAutoScroll: (e: MouseEvent | TouchEvent, scrollContainer: HTMLElement) => void;
  onEditHabit?: (habit: Habit) => void;
  onDeleteHabit?: (habitId: number) => void;
  setTaskToEdit: (task: Task) => void;
  setIsEditingTask: (isEditing: boolean) => void;
  setTaskToDelete: (task: Task) => void;
  toggleTaskStatus: (taskId: string) => void;
  setSelectedTaskForNote: (task: Task) => void;
  setForceUpdate: (cb: (prev: number) => number) => void;
  setIsViewingNote: (isViewing: boolean) => void;
  habitStatus: Record<string, { status: string }>;
  forceUpdate: number;
  onHabitComplete?: (habitId: string | number) => void;
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void;
  onShowHabitDetails?: (habit: Habit) => void;
}



function isTaskItem(item: TimelineItem): item is TaskItem {
  return 'type' in item && item.type === 'task';
}

function isHabitItem(item: TimelineItem): item is HabitItem {
  return 'type' in item && item.type === 'habit';
}



export const TimelineItems: React.FC<TimelineItemsProps> = ({
  items,
  tasks,
  currentDate,
  editableItemId,
  setEditableItemId,
  setInteractionMode,
  setActiveTaskId,
  itemPositions,
  QUARTER_PIXEL_HEIGHT,
  HOUR_HEIGHT,
  calculateItemPosition,
  onItemDrag,
  onItemEdit,
  onItemDelete,
  onShowNote,
  onDoubleClick,
  onItemStop,
  onResizeStart,
  onResize,
  onResizeStop,
  interactionMode,
  onItemClick,
  resizeType,
  handleAutoScroll,
  onEditHabit,
  onDeleteHabit,
  setTaskToEdit,
  setIsEditingTask,
  setTaskToDelete,
  toggleTaskStatus,
  setSelectedTaskForNote,
  setForceUpdate,
  setIsViewingNote,
  habitStatus,
  forceUpdate,
  onHabitComplete,
  onUpdateHabit,
  onShowHabitDetails,
}) => {
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [activeItemId, setActiveItemId] = useState<string | number | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isHabitDetailsOpen, setIsHabitDetailsOpen] = useState(false);
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const lastDeltaRef = useRef(0);
  const DOUBLE_TAP_DELAY = 300;
  const formattedDate = format(currentDate, 'yyyy-MM-dd');
  const { labels: taskLabels } = useTaskLabels();
  const [isCompletedMap, setIsCompletedMap] = useState<Record<string, boolean>>({});
  const { use24HourFormat } = useTimeFormat();
  const itemRef = useRef<HTMLDivElement>(null);
  const [dragPositions, setDragPositions] = useState<{[key: string]: number}>({});
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const LONG_PRESS_DURATION = 800; // Aumentar a 800ms
  const [isLongPressing, setIsLongPressing] = useState(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const MOVE_THRESHOLD = 10; // píxeles de movimiento permitidos durante long press
  const [touchActionStyle, setTouchActionStyle] = useState<'none' | 'pan-y'>('pan-y');
  
  // Crear un mapa de refs para cada elemento arrastrable
  const draggableRefs = useRef<{[key: string]: React.RefObject<HTMLDivElement>}>({});
  
  // Función para obtener o crear un ref para un elemento
  const getDraggableRef = (itemId: string | number) => {
    const id = String(itemId);
    if (!draggableRefs.current[id]) {
      draggableRefs.current[id] = React.createRef<HTMLDivElement>();
    }
    return draggableRefs.current[id];
  };

  const { user } = useAuth();

  // Cargar estados de completado de hábitos cuando el componente se monte
  useEffect(() => {
    const loadHabitCompletionStates = async () => {
      if (!user?.id) return;
      
      // Filtrar solo los hábitos de la lista de items
      const habitItems = items.filter(isHabitItem);
      
      // Para cada hábito, verificar si está completado
      const completionPromises = habitItems.map(habit => 
        habitCompletionService.isHabitCompleted(String(habit.id), user.id, formattedDate)
      );
      
      try {
        const results = await Promise.all(completionPromises);
        
        // Actualizar el estado local con los resultados
        const newCompletedMap = { ...isCompletedMap };
        
        habitItems.forEach((habit, index) => {
          const result = results[index];
          if (result.success && result.isCompleted) {
            const completionKey = getCompletionKey(habit.id, formattedDate);
            newCompletedMap[completionKey] = true;
          }
        });
        
        setIsCompletedMap(newCompletedMap);
      } catch (error) {
        logger.error('Error loading habit completion states:', error);
      }
    };
    
    loadHabitCompletionStates();
  }, [items, user, formattedDate, forceUpdate]);

  const isItemCompleted = (item: TimelineItem): boolean => {
    // Para tareas, verificar la propiedad completed
    if (item.type === 'task') {
      return item.completed || false;
    }
    
    // Para hábitos, verificar en habitStatus y habit_completions
    if (item.type === 'habit') {
      const dateString = format(currentDate, 'yyyy-MM-dd');
      const completionKey = getCompletionKey(item.id, dateString);
      
      // 1. Verificar en el estado local isCompletedMap
      if (isCompletedMap[completionKey]) {
        return true;
      }

      // 2. Verificar en habitStatus usando el ID
      const idKey = `${item.id}-${dateString}`;
      if (habitStatus[idKey]?.status === 'completed') {
        return true;
      }

      // 3. Verificar en habitStatus usando el índice si está disponible
      const habitStore = useHabitStore.getState();
      const originalHabit = habitStore.habits.find(h => Number(h.id) === Number(item.id));
      if (originalHabit) {
        const indexKey = `${originalHabit.index}-${dateString}`;
        if (habitStatus[indexKey]?.status === 'completed') {
          return true;
        }
      }

      // 4. Verificar en el store de hábitos
      if (user?.id && originalHabit) {
        const isCompletedInStore = habitStore.isHabitCompleted(
          user.id,
          String(item.id),
          dateString
        );
        
        if (isCompletedInStore) {
          return true;
        }
      }
    }
    
    return false;
  };

  const getCompletionKey = (itemId: string | number, date: string) => `${itemId}-${date}`;

  const getItemTime = (item: TimelineItem, formattedDate: string): string => {
    // Para tareas
    if (item.type === 'task') {
      if (item.recurring_exceptions?.[formattedDate]?.time) {
        return item.recurring_exceptions[formattedDate].time || '';
      }
      return item.time || '';
    }

    // Para hábitos
    if (item.type === 'habit') {
      if (item.time_exceptions?.[formattedDate]?.time) {
        return item.time_exceptions[formattedDate].time || '';
      }
      return item.time || '';
    }

    return '';
  };

  const getItemStyle = (
    item: TimelineItem, 
    isCompleted: boolean, 
    position: TimelinePosition | null, 
    currentPos: number
  ): React.CSSProperties => {
    // Asegurarse de que position nunca sea null
    const safePosition = position || {
      top: 0,
      height: HOUR_HEIGHT,
      left: '0%',
      width: '100%',
      column: 0
    };
    
    const baseStyle = {
      width: safePosition.width,
      left: safePosition.left,
      height: `${position?.height || QUARTER_PIXEL_HEIGHT * 5}px`,
      position: 'absolute' as const,
      transform: `translateY(${currentPos}px)`,
      transition: editableItemId === item.id 
        ? 'none'
        : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out',
      willChange: 'transform',
    };

    if (isTaskItem(item)) {
      // 🔧 CORRECCIÓN: Dar prioridad a item.color que es donde se guarda el color de la etiqueta
      const labelColor = item.color || item.label?.color || '#3b82f6';
      return {
        ...baseStyle,
        backgroundColor: isCompleted ? 'rgba(75, 85, 99, 0.3)' : `${labelColor}20`,
        borderLeft: `4px solid ${isCompleted ? 'rgb(107, 114, 128)' : labelColor}`,
        opacity: isCompleted ? 0.7 : 1,
        zIndex: editableItemId === item.id ? 20 : 10,
        touchAction: editableItemId === item.id ? 'pan-y' : 'none',
        transition: editableItemId === item.id ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform'
      };
    }

    if (isHabitItem(item)) {
      const habitColor = item.color || '#3b82f6';
      return {
        ...baseStyle,
        backgroundColor: isCompleted ? 'rgba(75, 85, 99, 0.3)' : `${habitColor}20`,
        borderLeft: `4px solid ${isCompleted ? 'rgb(107, 114, 128)' : habitColor}`,
        opacity: isCompleted ? 0.7 : 1,
        zIndex: editableItemId === item.id ? 20 : 10,
        touchAction: editableItemId === item.id ? 'pan-y' : 'none',
        transition: editableItemId === item.id ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform'
      };
    }

    return baseStyle;
  };

  const formatTimeDisplay = (timeInput: string | { time?: string }) => {
    const timeString = typeof timeInput === 'string' ? timeInput : (timeInput?.time || '');
    if (!timeString) return '';
    
    const [startTime, endTime] = timeString.split('-');
    
    const formatSingleTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      
      if (use24HourFormat) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      } else {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
      }
    };
    
    if (endTime) {
      return `${formatSingleTime(startTime)}-${formatSingleTime(endTime)}`;
    }
    return formatSingleTime(startTime);
  };

  const handleItemClick = (item: TimelineItem) => {
    const now = Date.now();
    const isDoubleTap = now - lastTap < DOUBLE_TAP_DELAY;
    setLastTap(now);
    
    // Verificar si el elemento está completado
    const isCompleted = isItemCompleted(item);
    
    // Si el elemento está completado, no permitir la edición
    if (isCompleted) {
      return;
    }
    
    if (item.type !== 'habit') {
      onItemClick(item.id);
    }

    // Solo activar modo arrastre en doble toque/clic
    if (isDoubleTap) {
      const position = calculateItemPosition(item, formattedDate);
      if (position) {
        setDragPositions(prev => ({
          ...prev,
          [item.id]: position.top
        }));
        setEditableItemId(String(item.id));
        setInteractionMode('move');
        setTouchActionStyle('none');
        
        // Limpiar cualquier long press pendiente
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setIsLongPressing(false);
      }
    }
  };

  const renderItemContent = (
    item: TimelineItem, 
    formattedDate: string,
    isCompleted: boolean
  ) => {
    const timeRange = item.type === 'habit' 
      ? (item.time_exceptions?.[formattedDate]?.time || item.time)
      : (item.time_exceptions?.[formattedDate]?.time || 
         item.recurring_exceptions?.[formattedDate]?.time || 
         item.time);

    const getDurationInMinutes = () => {
      if (!timeRange) return 0;
      const [startTime, endTime] = timeRange.split('-');
      if (!endTime) return 5;
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    };

    const durationInMinutes = getDurationInMinutes();
    const isCompactContainer = durationInMinutes <= 30;
    const isVeryCompactContainer = durationInMinutes <= 15;
    const showTimeInline = durationInMinutes <= 50;
    const position = calculateItemPosition(item, formattedDate);
    const isFullWidth = position?.width === '100%';
    const isNarrow = position?.width !== '100%';
    const containerWidthInPixels = position?.width ? getApproximateWidthInPixels(position.width) : 0;
    const isVeryNarrow = containerWidthInPixels < 40;
    
    const containerHeightInPixels = position?.height || 0;
    const isShortContainer = containerHeightInPixels < 30;
    const isVeryShortContainer = containerHeightInPixels < 20;
    
    const getFontSizeClass = (width: number | string, height: number) => {
      const widthInPx = typeof width === 'string' ? getApproximateWidthInPixels(width) : width;
      
      if (height < 15) return 'text-[5px] sm:text-[6px] md:text-[7px] leading-none';
      if (height < 20) return 'text-[6px] sm:text-[7px] md:text-[8px] leading-none';
      if (height < 30) {
        if (widthInPx < 40) return 'text-[6px] sm:text-[7px] md:text-[8px] leading-none';
        return 'text-[7px] sm:text-[8px] md:text-[9px] leading-none';
      }
      
      if (widthInPx < 30) return 'text-[6px] sm:text-[7px] md:text-[8px] leading-tight';
      if (widthInPx < 40) return 'text-[7px] sm:text-[8px] md:text-[9px] leading-tight';
      if (widthInPx < 80) return 'text-[9px] sm:text-[10px] md:text-[11px] leading-tight';
      if (widthInPx < 120) return 'text-[10px] sm:text-[11px] md:text-[12px] leading-snug';
      if (widthInPx < 200) return 'text-[11px] sm:text-[12px] md:text-[13px] leading-snug';
      return 'text-[12px] sm:text-[13px] md:text-[14px] leading-normal';
    };
    
    const getMaxTitleLength = (width: number | string, height: number) => {
      const widthInPx = typeof width === 'string' ? getApproximateWidthInPixels(width) : width;
      
      if (height < 15) return 3;
      if (height < 20) return 5;
      
      if (widthInPx < 30) return 8;
      if (widthInPx < 40) return 10;
      if (widthInPx < 60) return 15;
      if (widthInPx < 80) return 20;
      if (widthInPx < 120) return 30;
      if (widthInPx < 200) return 45;
      return 60;
    };
    
    const shouldUseVerticalText = containerWidthInPixels < 25 && containerHeightInPixels > 30;
    const shouldUseInitialsOnly = (containerWidthInPixels < 25 && containerHeightInPixels <= 30) || 
                               containerHeightInPixels < 15;
    
    const fontSizeClass = position?.width ? 
      getFontSizeClass(position.width, containerHeightInPixels) : 'text-sm';
    
    const maxTitleLength = position?.width ? 
      getMaxTitleLength(position.width, containerHeightInPixels) : 30;
    
    const isTooSmallForMultiline = containerHeightInPixels < 25 || durationInMinutes < 20;
    
    let textOrientationClass = isTooSmallForMultiline 
      ? 'truncate'
      : 'whitespace-normal break-words overflow-hidden';
      
    if (shouldUseVerticalText) {
      textOrientationClass = 'writing-vertical-lr transform rotate-180 h-full';
    } else if (shouldUseInitialsOnly || isVeryShortContainer) {
      textOrientationClass = 'truncate text-center';
    }
    
    // Add line-through class when completed
    const completedTextClass = isCompleted ? 'line-through decoration-2 decoration-gray-600 dark:decoration-gray-300' : '';
    
    const processTitle = () => {
      if (shouldUseInitialsOnly) {
        return item.title.split(' ')
          .map(word => word.charAt(0))
          .join('')
          .substring(0, 3);
      }
      
      if (shouldUseVerticalText) {
        return item.title.split(' ')
          .map(word => word.charAt(0))
          .join('')
          .substring(0, 4);
      }
      
      if (isVeryNarrow || isVeryShortContainer) {
        const words = item.title.split(' ');
        if (words.length > 1) {
          return words[0].substring(0, maxTitleLength);
        }
        return item.title.substring(0, maxTitleLength);
      }
      
      return item.title.length > maxTitleLength 
        ? item.title.substring(0, maxTitleLength) + '...' 
        : item.title;
    };
    
    const truncatedTitle = processTitle();
    const paddingClass = isVeryShortContainer || isVeryCompactContainer ? 'p-0' : 'p-1';
    const showMenuButton = !shouldUseInitialsOnly && containerHeightInPixels >= 15;
    
    const getMaxHeightClass = () => {
      if (containerHeightInPixels < 15) return 'max-h-[10px]';
      if (containerHeightInPixels < 20) return 'max-h-[15px]';
      if (containerHeightInPixels < 30) return 'max-h-[25px]';
      if (containerHeightInPixels < 40) return 'max-h-[35px]';
      return '';
    };
    
    const maxHeightClass = getMaxHeightClass();
    
    // Definir las clases de texto para el título
    const titleTextClasses = [
      fontSizeClass,
      'font-medium',
      textOrientationClass,
      maxHeightClass,
      isTooSmallForMultiline ? 'text-ellipsis' : '',
      isCompleted ? 'line-through decoration-2 decoration-gray-600 dark:decoration-gray-300' : '',
    ].filter(Boolean).join(' ');

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {isCompactContainer ? (
          <div className={`absolute inset-0 flex flex-col justify-center ${paddingClass}`}>
            <div className="flex items-center justify-between w-full h-full">
              <div className={`flex-1 min-w-0 ${showMenuButton ? 'pr-4' : ''} h-full flex flex-col justify-center overflow-hidden`}>
                {position?.width && parseFloat(String(position.width)) >= 5 && (
                  <span className={titleTextClasses}>
                    {truncatedTitle}
                  </span>
                )}
              </div>
              {showMenuButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.type === 'task') {
                      const originalTask = tasks.find(t => t.id === item.id);
                      if (originalTask) {
                        setSelectedTask(originalTask);
                        setIsTaskDetailsOpen(true);
                      }
                    } else if (item.type === 'habit') {
                      const habitStore = useHabitStore.getState();
                      const fullHabit = habitStore.habits.find(h => String(h.id) === String(item.id));
                      if (fullHabit) {
                        setSelectedHabit(fullHabit);
                        setIsHabitDetailsOpen(true);
                      }
                    }
                  }}
                >
                  <MoreHorizontal className="h-3 w-3 text-gray-600" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 min-w-0 max-w-[calc(100%-25px)]">
                <div className={titleTextClasses}>
                  {truncatedTitle}
                </div>
                {showTimeInline && isFullWidth && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeDisplay(timeRange || '')}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.type === 'task') {
                    const originalTask = tasks.find(t => t.id === item.id);
                    if (originalTask) {
                      setSelectedTask(originalTask);
                      setIsTaskDetailsOpen(true);
                    }
                  } else if (item.type === 'habit') {
                    const habitStore = useHabitStore.getState();
                    const fullHabit = habitStore.habits.find(h => String(h.id) === String(item.id));
                    if (fullHabit) {
                      setSelectedHabit(fullHabit);
                      setIsHabitDetailsOpen(true);
                    }
                  }
                }}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
            {!showTimeInline && isFullWidth && (
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeDisplay(timeRange || '')}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderTimelineItem = (itemWithTime: TimelineItem) => {
    // Calcular valores iniciales necesarios
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const initialPosition = calculateItemPosition(itemWithTime, formattedDate);
    const initialDragPosition = dragPositions[String(itemWithTime.id)];
    const initialCurrentPos = initialDragPosition ?? (itemPositions[itemWithTime.id]?.[formattedDate] ?? initialPosition?.top ?? 0);
    const initialIsCompleted = isItemCompleted(itemWithTime);

    const itemId = String(itemWithTime.id);
    const itemTime = getItemTime(itemWithTime, formattedDate);
    
    const hasSpecificTime = Boolean(
      !itemWithTime.noSpecificTime && itemTime && 
      typeof itemTime === 'string' && itemTime.includes('-')
    );
    
    // Si es un hábito y no tiene tiempo específico, no renderizarlo aquí
    if (itemWithTime.type === 'habit' && !hasSpecificTime) {
      return null;
    }
    
    // Calcular la altura correcta basada en la duración del hábito
    const getItemHeight = (item: TimelineItem): number => {
      const timeString = getItemTime(item, formattedDate);
      if (!timeString) return QUARTER_PIXEL_HEIGHT * 5; // 5 minutos por defecto
      
      const [startTime, endTime] = timeString.split('-');
      if (!endTime) {
        // Si solo hay una hora (sin rango), usar 5 minutos
        return QUARTER_PIXEL_HEIGHT * 5;
      }
      
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      const durationInMinutes = 
        (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
      
      // Convertir minutos a píxeles usando la proporción correcta
      return (durationInMinutes * HOUR_HEIGHT) / 60;
    };

    // Calcular la posición del elemento y su altura
    const position = calculateItemPosition(itemWithTime, formattedDate);
    if (position) {
      const calculatedHeight = getItemHeight(itemWithTime);
      position.height = calculatedHeight;
    }
    
    // Determinar si el elemento está completado usando la función isItemCompleted
    const isCompleted = isItemCompleted(itemWithTime);
    
    // Obtener la posición actual (considerando arrastre)
    const storedPosition = itemPositions[itemId]?.[formattedDate];
    const dragPosition = dragPositions[itemId];
    const currentPos = dragPosition !== undefined ? dragPosition : 
                     storedPosition !== undefined ? storedPosition : 
                     position?.top || 0;
    
    // Calcular el estilo del elemento
    const itemStyle = getItemStyle(
      itemWithTime, 
      isCompleted,
      position, 
      currentPos
    );
    
    // Obtener el ref específico para este elemento
    const itemRef = getDraggableRef(itemId);

    // Verificar si el elemento está completado para determinar si se puede mover
    const isCompletedItem = isItemCompleted(itemWithTime);
    
    return (
      <DraggableCore
        key={itemId}
        nodeRef={itemRef}
        onStart={(e) => {
          // No permitir el inicio del arrastre si el elemento está completado
          if (isCompletedItem) {
            e.preventDefault();
            return;
          }
          
          if (String(itemWithTime.id) === editableItemId && interactionMode === 'move') {
            e.preventDefault();
            
            // Mantener la posición actual del elemento
            const currentPosition = itemPositions[itemWithTime.id]?.[formattedDate] ?? position?.top ?? 0;
            
            // Calcular el offset correcto desde el punto de toque
            const touch = 'touches' in e ? e.touches[0] : e;
            dragOffsetRef.current = touch.clientY - currentPosition;
            
            // Mantener la posición actual en dragPositions
            setDragPositions(prev => ({
              ...prev,
              [itemWithTime.id]: currentPosition
            }));

            setActiveItemId(itemWithTime.id);
            setActiveTaskId(itemWithTime.id);
          }
        }}
        onDrag={(e, data) => {
          // No permitir el arrastre si el elemento está completado
          if (isCompletedItem) {
            return;
          }
          
          if (String(itemWithTime.id) === editableItemId && interactionMode === 'move') {
            e.preventDefault();
            e.stopPropagation();
            
            const touch = 'touches' in e ? e.touches[0] : e;
            const newPosition = touch.clientY - dragOffsetRef.current;
            const deltaY = newPosition - currentPos;

            // Validar límites
            const itemHeight = position?.height || 0;
            const maxEndTime = (23 * 60 + 45) * (HOUR_HEIGHT / 60); // 23:45

            // Prevenir que suba más allá de 00:00
            if (newPosition < 0) {
              setDragPositions(prev => ({
                ...prev,
                [itemWithTime.id]: 0
              }));
              return;
            }

            // Calcular la nueva posición limitando a 23:45
            let finalPosition = newPosition;
            if (finalPosition + itemHeight > maxEndTime) {
              finalPosition = maxEndTime - itemHeight;
            }

            setDragPositions(prev => ({
              ...prev,
              [itemWithTime.id]: finalPosition
            }));

            onItemDrag(
              itemWithTime.id,
              finalPosition - currentPos,
              currentPos,
              itemHeight,
              formattedDate
            );
          }
        }}
        onStop={(e, data) => {
          // No permitir detener el arrastre si el elemento está completado
          if (isCompletedItem) {
            return;
          }
          
          if (String(itemWithTime.id) === editableItemId && interactionMode === 'move') {
            e.preventDefault();
            e.stopPropagation();
            
            const finalDragPosition = dragPositions[itemWithTime.id];
            
            if (finalDragPosition !== undefined) {
              onItemStop(itemWithTime.id, finalDragPosition, position?.height || 0, formattedDate);
              
              requestAnimationFrame(() => {
                const newPosition = calculateItemPosition(itemWithTime, formattedDate);
                
                if (newPosition) {
                  const element = document.querySelector(`[data-item-id="${itemWithTime.id}"]`) as HTMLElement;
                  if (element) {
                    element.style.width = String(newPosition.width);
                    element.style.left = String(newPosition.left);
                  }
                }

                requestAnimationFrame(() => {
                  setDragPositions({});
                  onDoubleClick(null);
                });
              });
            }
          }
        }}
        disabled={isCompletedItem || !editableItemId || String(itemWithTime.id) !== editableItemId || interactionMode !== 'move'}
        enableUserSelectHack={false}
        cancel=".button"
        allowAnyClick={true}
        scale={1.5}
        grid={[1, 5]}
      >
        <div 
          ref={itemRef}
          data-item-id={itemWithTime.id}
          className={`timeline-item absolute p-2 rounded-md shadow-sm
            ${isCompletedItem 
              ? 'cursor-default' 
              : String(itemWithTime.id) === editableItemId
                ? 'cursor-move ring-2 ring-blue-500 touch-none' 
                : isLongPressing 
                  ? 'cursor-pointer scale-[0.98] opacity-90' 
                  : 'cursor-pointer'
            } group touch-manipulation relative`}
          style={{
            ...itemStyle,
            touchAction: touchActionStyle,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
          onClick={(e) => handleItemClick(itemWithTime)}
          onTouchStart={(e) => {
            // No permitir el inicio del toque si el elemento está completado
            if (isCompletedItem) {
              return;
            }
            
            const touch = e.touches[0];
            touchStartPos.current = { x: touch.clientX, y: touch.clientY };
            
            const position = calculateItemPosition(itemWithTime, formattedDate);
            if (position) {
              const currentPosition = itemPositions[itemWithTime.id]?.[formattedDate] ?? position.top;
              dragOffsetRef.current = touch.clientY - currentPosition;
            }
          }}
          onTouchMove={(e) => {
            // No permitir el movimiento del toque si el elemento está completado
            if (isCompletedItem) {
              return;
            }
            
            if (longPressTimer.current && touchStartPos.current) {
              const touch = e.touches[0];
              const deltaX = touch.clientX - touchStartPos.current.x;
              const deltaY = touch.clientY - touchStartPos.current.y;
              
              if (Math.abs(deltaX) > MOVE_THRESHOLD || Math.abs(deltaY) > MOVE_THRESHOLD) {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
                setTouchActionStyle('pan-y');
              }
            }
          }}
          onTouchEnd={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            touchStartPos.current = null;
            setTouchActionStyle('pan-y');
            setIsLongPressing(false);
          }}
          onTouchCancel={() => {
            if (longPressTimer.current) {
              clearTimeout(longPressTimer.current);
              longPressTimer.current = null;
            }
            touchStartPos.current = null;
            setTouchActionStyle('pan-y');
            setIsLongPressing(false);
          }}
        >
          {renderItemContent(itemWithTime, formattedDate, isCompleted)}
          {!isCompletedItem && editableItemId === itemWithTime.id && interactionMode === 'resize' && (
            <TaskResizeHandles
              isEditable={true}
              taskId={String(itemWithTime.id)}
              onResizeStart={(type) => onResizeStart(itemWithTime.id, type)}
              onResize={(deltaY, type) => onResize(itemWithTime.id, deltaY, type)}
              onResizeStop={(type) => onResizeStop(itemWithTime.id, type)}
              resizeType={resizeType}
            />
          )}
        </div>
      </DraggableCore>
    );
  };

  useEffect(() => {
    if (items.length > 0 && taskLabels.length > 0) {
      // Completar la información de las etiquetas para las tareas
      const updatedItems = items.map(item => {
        if (isTaskItem(item) && item.label && item.label.id && (!item.label.color || !item.label.name)) {
          const fullLabel = taskLabels.find(l => l.id === item.label?.id);
          if (fullLabel) {
            return {
              ...item,
              label: fullLabel // Reemplazar con la etiqueta completa
            };
          }
        }
        return item;
      });
      
      // Solo actualizar si hay cambios
      if (JSON.stringify(updatedItems) !== JSON.stringify(items)) {
        // Aquí necesitaríamos una forma de actualizar los items
        // Esto podría requerir un prop adicional o un contexto
      }
    }
  }, [items, taskLabels]);

  // Añadir esta función para calcular el ancho aproximado en píxeles
  const getApproximateWidthInPixels = (width: string | number): number => {
    if (typeof width === 'number') return width;
    
    // Si es un porcentaje, convertirlo a píxeles aproximados (asumiendo un ancho de contenedor de 300px)
    if (String(width).endsWith('%')) {
      const percentage = parseFloat(String(width));
      return (percentage / 100) * 300; // 300px es un ancho aproximado del contenedor
    }
    
    return parseFloat(String(width));
  };

  return (
    <>
      {items.map(item => renderTimelineItem(item))}
      <HabitDetailsDialog
        habit={selectedHabit}
        currentDate={currentDate}
        isOpen={isHabitDetailsOpen}
        onClose={() => setIsHabitDetailsOpen(false)}
        onEdit={(habit) => onEditHabit?.(habit)}
        onDelete={(habitId) => onDeleteHabit?.(habitId)}
      />

      <TaskDetailsDialog
        task={selectedTask ? {
          ...selectedTask,
          recurring_exceptions: selectedTask.recurring_exceptions || {}
        } as ExtendedTaskStore : null}
        currentDate={currentDate}
        isOpen={isTaskDetailsOpen}
        onClose={() => setIsTaskDetailsOpen(false)}
        onUpdateTask={(taskId, updates) => onUpdateHabit && onUpdateHabit(taskId, updates as any)}
        onEdit={(task) => {
          setTaskToEdit(task);
          setIsEditingTask(true);
        }}
        onDelete={(task) => setTaskToDelete(task)}
        onComplete={(task) => {
          toggleTaskStatus(String(task.id));
          const updatedTask = { ...task, completed: !task.completed };
          setSelectedTaskForNote(updatedTask);
          setForceUpdate(prev => prev + 1);
          setTimeout(() => setIsViewingNote(false), 200);
        }}
      />
    </>
  );
};

