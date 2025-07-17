import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Task, TimelineItem as TimelineItemType, TimelinePosition, Habit, HabitItem, TaskItem } from '@/components/types/types';
import { format } from 'date-fns';
import { useHabitStore } from '@/store/useHabitStore';
import { useTaskStore } from '@/store/useTaskStore';
import { ExtendedTask } from '@/store/useTaskStore';

export const BASE_HOUR_HEIGHT = 60; // Altura base para cada hora
const MINUTES_PER_HOUR = 60;
const QUARTER_HOUR = 15;
const MIN_ITEM_HEIGHT = 60; // Altura mínima para cada item


// Definir un tipo más simple para originalItem
type SimpleItem = {
  id: string;
  type: 'task' | 'habit';
  time?: string | null;
};

// Interfaz para representar un evento con su rango de tiempo
interface TimeRange {
  id: string | number;
  start: number; // minutos desde medianoche
  end: number;   // minutos desde medianoche
  column?: number; // columna asignada
  width?: number;  // ancho (número de columnas)
  left?: number;   // posición izquierda (columna inicial)
}

// Modificar la interfaz para timeRanges


// Añadir esta función al inicio del archivo
const getTimeDifference = (start: string, end: string) => {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  let totalStartMinutes = startHours * 60 + startMinutes;
  let totalEndMinutes = endHours * 60 + endMinutes;
  
  // Si la hora final es menor que la inicial, asumimos que cruza la medianoche
  if (totalEndMinutes < totalStartMinutes) {
    totalEndMinutes += 24 * 60; // Añadir 24 horas en minutos
  }
  
  const diffMinutes = totalEndMinutes - totalStartMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  return { hours, minutes };
};

// Añadir esta función al inicio del archivo
const isHabit = (item: TimelineItemType): item is HabitItem => {
  return item.type === 'habit';
}

const isTask = (item: TimelineItemType): item is TaskItem => {
  return item.type === 'task';
}

// Agregar esta función helper


// Primero, agregar esta función helper


// Añadir esta función auxiliar al inicio del archivo
function getTimeString(timeValue: any): string {
  if (typeof timeValue === 'string') {
    return timeValue;
  } else if (timeValue && typeof timeValue === 'object' && 'time' in timeValue) {
    return timeValue.time || '';
  }
  return '';
}

// Añadir esta función auxiliar para comparar fechas


// También necesitamos añadir la función para verificar si un hábito está activo en una fecha
const isHabitActiveOnDate = (habit: Habit, dateStr: string): boolean => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  
  // Verificar si el hábito está programado para este día de la semana
  if (habit.selectedDays && !habit.selectedDays.includes(dayOfWeek)) {
    return false;
  }
  
  // Verificar si la fecha está dentro del rango de fechas del hábito
  if (habit.startDate) {
    const [startYear, startMonth, startDay] = habit.startDate.split('-').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    if (date < startDate) {
      return false;
    }
  }
  
  if (!habit.isIndefinite && habit.endDate) {
    const [endYear, endMonth, endDay] = habit.endDate.split('-').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    if (date > endDate) {
      return false;
    }
  }
  
  return true;
};

// Cambiar la declaración para exportar la variable
export const positionCache = new Map<string, Map<string, TimelinePosition>>();

export const useTimelinePositioning = (
  onUpdateTask?: (taskId: string, updates: Partial<ExtendedTask>) => void,
  onUpdateHabit?: (habitId: string, updates: Partial<Habit>) => void
) => {
  // Añadir al inicio del hook
  const formattedDate = format(new Date(), 'yyyy-MM-dd');
  
  // 🔧 CORRECCIÓN: Obtener tasks y habits del store para usarlos en dependencias
  const { tasks } = useTaskStore();
  const { habits } = useHabitStore();

  // Recuperar posiciones guardadas al inicializar
  const [itemPositionsInMinutes, setItemPositionsInMinutes] = useState<{
    [key: string]: { [date: string]: number };
    [key: number]: { [date: string]: number };
  }>(() => {
    try {
      const savedPositions = localStorage.getItem('habitPositions');
      return savedPositions ? JSON.parse(savedPositions) : {};
    } catch (e) {
      return {};
    }
  });
  
  // Mantener el estado de posiciones en píxeles para compatibilidad
  const [itemPositions, setItemPositions] = useState<{
    [key: string]: { [date: string]: number };
    [key: number]: { [date: string]: number };
  }>({});
  
  const [isDragging, setIsDragging] = useState(false);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [manuallyMovedItems, setManuallyMovedItems] = useState<Set<string>>(new Set());
  const [forceUpdate, setForceUpdate] = useState(0);
  const [activeOverlaps, setActiveOverlaps] = useState<{
    [date: string]: {
      [itemId: string]: string[];
    };
  }>({});

  // Calcular HOUR_HEIGHT dinámicamente basado en el zoom
  const HOUR_HEIGHT = BASE_HOUR_HEIGHT * zoomLevel;
  const QUARTER_PIXEL_HEIGHT = HOUR_HEIGHT / 4;

  // Convertir tiempo (HH:MM) a píxeles
  const timeToPixels = useCallback((time?: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return (hours + minutes/60) * HOUR_HEIGHT;
  }, [HOUR_HEIGHT]);

  // Convertir tiempo (HH:MM) a minutos desde medianoche
  const timeToMinutes = (time?: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convertir píxeles a minutos (independiente del zoom)


  // Convertir minutos a píxeles (dependiente del zoom)


  // Función para alinear a los intervalos de 15 minutos
  const snapToTimeInterval = (pixels: number): number => {
    const minutesPerPixel = MINUTES_PER_HOUR / HOUR_HEIGHT;
    const totalMinutes = pixels * minutesPerPixel;
    const roundedMinutes = Math.round(totalMinutes / QUARTER_HOUR) * QUARTER_HOUR;
    return (roundedMinutes / MINUTES_PER_HOUR) * HOUR_HEIGHT;
  };

  const pixelsToTime = (pixels: number): string => {
    const snappedPixels = snapToTimeInterval(pixels);
    const totalMinutes = (snappedPixels / HOUR_HEIGHT) * MINUTES_PER_HOUR;
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
    const minutes = Math.round(totalMinutes % MINUTES_PER_HOUR);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };





  // Modificar la función doRangesOverlap para ser más clara y precisa
  const doRangesOverlap = (range1: TimeRange, range2: TimeRange): boolean => {
    // Dos rangos se solapan si:
    // 1. El inicio de uno está antes del fin del otro Y el fin de uno está después del inicio del otro
    // 2. O si tienen exactamente el mismo tiempo de inicio
    return (range1.start < range2.end && range1.end > range2.start) || 
           (range1.start === range2.start);
  };

  // Mejorar el algoritmo de optimizeItemPositions para asignar columnas de manera más efectiva
  const optimizeItemPositions = (items: TimelineItemType[], date: string): Map<string | number, { column: number, width: number }> => {
    // Paso 1: Convertir los elementos a rangos de tiempo
    const timeRanges: TimeRange[] = [];
    
    items.forEach(item => {
      if (!item.time) return;
      
      // Obtener el tiempo correcto para el elemento
      let itemTime = item.time;
      if (isHabit(item)) {
        const habitStore = useHabitStore.getState();
        const habit = habitStore.habits.find(h => Number(h.id) === Number(item.id));
        if (habit?.time_exceptions?.[date]?.time) {
          itemTime = habit.time_exceptions[date].time;
        }
      } else if (isTask(item)) {
        const taskStore = useTaskStore.getState();
        const task = taskStore.tasks.find(t => String(t.id) === String(item.id));
        if (task?.time_exceptions?.[date]?.time) {
          itemTime = task.time_exceptions[date].time;
        } else if (task?.recurring_exceptions?.[date]?.time) {
          itemTime = task.recurring_exceptions[date].time;
        }
      }
      
      const timeString = getTimeString(itemTime);
      const [startTime, endTime] = timeString.split('-');
      const start = timeToMinutes(startTime);
      const end = timeToMinutes(endTime);
      
      timeRanges.push({
        id: item.id,
        start,
        end
      });
    });
    
    // Paso 2: Ordenar los rangos primero por hora de inicio y luego por ID para estabilidad
    timeRanges.sort((a, b) => {
      const startDiff = a.start - b.start;
      if (startDiff === 0) {
        // Si tienen el mismo tiempo de inicio, ordenar por ID para estabilidad
        return String(a.id).localeCompare(String(b.id));
      }
      return startDiff;
    });
    
    // Agrupar elementos por tiempo de inicio
    const startTimeGroups = new Map<number, TimeRange[]>();
    
    timeRanges.forEach(range => {
      if (!startTimeGroups.has(range.start)) {
        startTimeGroups.set(range.start, []);
      }
      startTimeGroups.get(range.start)!.push(range);
    });
    
    // Paso 3: Asignar columnas a cada rango
    const positionsMap = new Map<string | number, { column: number, width: number }>();
    
    // Si no hay rangos, devolver un mapa vacío
    if (timeRanges.length === 0) {
      return positionsMap;
    }
    
    // Crear un mapa para rastrear qué columnas están ocupadas en cada minuto
    const occupiedColumns = new Map<number, Set<number>>();
    
    // MODIFICACIÓN CLAVE: Primero asignar columnas a grupos con el mismo tiempo de inicio
    startTimeGroups.forEach((ranges, startTime) => {
      if (ranges.length > 1) {
        ranges.forEach((range, index) => {
          range.column = index;
          positionsMap.set(range.id, { column: index, width: 1 });
        });
      }
    });
    
    // Para los rangos que no están en grupos, encontrar la primera columna disponible
    for (const range of timeRanges) {
      // Saltar si ya tiene una columna asignada (parte de un grupo)
      if (positionsMap.has(range.id)) continue;
      
      let column = 0;
      let foundColumn = false;
      
      // Verificar cada columna hasta encontrar una disponible
      while (!foundColumn) {
        let isColumnAvailable = true;
        
        // Verificar si esta columna está ocupada por algún otro rango que se solape
        for (const otherRange of timeRanges) {
          if (otherRange.id === range.id) continue;
          
          // Si el otro rango ya tiene asignada una columna y se solapa con este
          if (otherRange.column === column && doRangesOverlap(range, otherRange)) {
            isColumnAvailable = false;
            break;
          }
        }
        
        // Si la columna está disponible, asignarla
        if (isColumnAvailable) {
          foundColumn = true;
          range.column = column;
          positionsMap.set(range.id, { column, width: 1 });
        } else {
          column++;
        }
      }
    }
    
    return positionsMap;
  };

  // Añadir esta función antes de calculateItemPosition


  // Calcular la posición de un elemento en la línea de tiempo
  const calculateItemPosition = useCallback((
    item: TimelineItemType,
    date: string
  ): TimelinePosition | null => {
    // Verificar si este elemento tiene solapamientos activos
    const hasActiveOverlaps = activeOverlaps[date]?.[String(item.id)]?.length > 0;
    
    // Si estamos arrastrando este elemento
    if (isDragging && itemPositions[item.id]?.[date] !== undefined) {
      const dragPosition = itemPositions[item.id][date];
      
      // Buscar en la caché si ya tenemos una posición calculada para este item
      const cachedPosition = positionCache.get(date)?.get(String(item.id));
      
      // Verificar si el elemento tiene solapamientos en su posición actual
      const hasSolapamiento = checkForOverlapsAtPosition(item, dragPosition, date) || hasActiveOverlaps;
      
      // Si no tiene solapamientos, usar ancho completo
      if (!hasSolapamiento) {
        return {
          top: dragPosition,
          height: cachedPosition?.height || 120,
          left: '0%',
          width: '100%',
          column: 0
        };
      }
      
      // Si tiene solapamientos y tenemos una posición en caché, usarla
      if (cachedPosition) {
        return {
          ...cachedPosition,
          top: dragPosition
        };
      }
      
      // Si no hay posición en caché, calcular una nueva
      return {
        top: dragPosition,
        height: 120,
        left: '0%',
        width: '100%'
      };
    }
    
    // Obtener el tiempo correcto para tareas también
    let timeToUse = item.time;
    
    if (isTask(item)) {
      const taskStore = useTaskStore.getState();
      const task = taskStore.tasks.find(t => String(t.id) === String(item.id));
      timeToUse = task?.time_exceptions?.[date]?.time || 
                  task?.recurring_exceptions?.[date]?.time || 
                  item.time;
    } else if (isHabit(item)) {
      const habitStore = useHabitStore.getState();
      const habit = habitStore.habits.find(h => String(h.id) === String(item.id));
      timeToUse = habit?.time_exceptions?.[date]?.time || item.time;
    }

    // Si no hay arrastre, usar el tiempo de excepción o el tiempo normal
    if (timeToUse) {
      const [startTime, endTime] = timeToUse.split('-');
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);

      // Si este elemento tiene solapamientos activos durante un arrastre,
      // necesitamos calcular su posición considerando esos solapamientos
      if (hasActiveOverlaps && isDragging) {
        // Obtener todos los elementos con los que se solapa actualmente
        const overlappingIds = activeOverlaps[date][String(item.id)] || [];
        
        // Si hay solapamientos, calcular la posición con columnas
        if (overlappingIds.length > 0) {
          // Obtener todos los items activos para esta fecha
          const taskStore = useTaskStore.getState();
          const habitStore = useHabitStore.getState();
          
          // Crear un conjunto de elementos que incluya este elemento y todos con los que se solapa
          const allRelevantItems = [
            ...taskStore.tasks
              .filter(t => {
                const isRelevant = String(t.id) === String(item.id) || 
                                  overlappingIds.includes(String(t.id));
                if (isRelevant && t.dueDate) {
                  const taskDate = new Date(t.dueDate);
                  const currentDate = new Date(date);
                  const taskDateStr = taskDate.toISOString().split('T')[0];
                  const currentDateStr = currentDate.toISOString().split('T')[0];
                  return taskDateStr === currentDateStr;
                }
                return false;
              })
              .map(t => ({
                ...t,
                type: 'task' as const,
                id: String(t.id)
              })),
            ...habitStore.habits
              .filter(h => {
                return (String(h.id) === String(item.id) || 
                        overlappingIds.includes(String(h.id))) && 
                       isHabitActiveOnDate(h, date);
              })
              .map(h => ({
                ...h,
                type: 'habit' as const,
                id: String(h.id)
              }))
          ];
          
          // Asignar columnas a estos elementos
          const columnAssignments = new Map<string, number>();
          let maxColumn = 0;
          
          // Asignar columnas de manera simple
          allRelevantItems.forEach((item, index) => {
            columnAssignments.set(String(item.id), index);
            maxColumn = Math.max(maxColumn, index);
          });
          
          // Calcular ancho y posición
          const totalColumns = maxColumn + 1;
          const columnWidth = 100 / totalColumns;
          const column = columnAssignments.get(String(item.id)) || 0;
          const leftOffset = column * columnWidth;
          
          return {
            top: (startMinutes / 60) * HOUR_HEIGHT,
            height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_ITEM_HEIGHT),
            left: `${leftOffset}%`,
            width: `${columnWidth}%`,
            column
          };
        }
      }

      // Obtener todos los items activos SOLO PARA ESTE DÍA ESPECÍFICO
      const taskStore = useTaskStore.getState();
      const habitStore = useHabitStore.getState();
      
      // Normalizar los IDs a string para comparaciones consistentes
      const itemIdStr = String(item.id);
      
      // Usar getFilteredTasks para obtener tareas correctas incluindo recurrentes
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      const tasksForDate = taskStore.getFilteredTasks(dateObj, '', false, true);
      
      // Obtener todos los items con sus tiempos correctos según excepciones
      const allItems = [
        ...tasksForDate
          .map(t => {
            // Verificar si hay excepción de tiempo para esta tarea
            let taskTime = t.time;
            if (t.time_exceptions && t.time_exceptions[date]?.time) {
              taskTime = t.time_exceptions[date].time;
            } else if (t.recurring_exceptions && t.recurring_exceptions[date]?.time) {
              taskTime = t.recurring_exceptions[date].time;
            }
            
            return {
              ...t,
              type: 'task' as const,
              label: t.label || undefined,
              id: String(t.id),
              time: taskTime
            };
          }),
        ...habitStore.habits
          .filter(h => isHabitActiveOnDate(h, date))
          .map((h: Habit) => {
            // Verificar si hay excepción de tiempo para este hábito
            let habitTime = h.time;
            if (h.time_exceptions && h.time_exceptions[date]?.time) {
              habitTime = h.time_exceptions[date].time;
            }
            
            return {
              ...h,
              type: 'habit' as const,
              title: h.name,
              id: String(h.id),
              time: habitTime
            };
          })
      ];

      // Filtrar items sin tiempo y convertir a formato uniforme para procesamiento
      const timeRanges = allItems
        .filter(i => i.time && i.id !== itemIdStr && i.time.includes('-'))
        .map(i => {
          const [start, end] = i.time!.split('-');
          return {
            id: String(i.id),
            type: i.type,
            startMinutes: timeToMinutes(start),
            endMinutes: timeToMinutes(end),
            originalItem: {
              id: String(i.id),
              type: i.type,
              time: i.time
            } as SimpleItem
          };
        });

      // Añadir el item actual al array
      timeRanges.push({
        id: itemIdStr,
        type: item.type,
        startMinutes,
        endMinutes,
        originalItem: {
          id: String(item.id),
          type: item.type,
          time: item.time
        } as SimpleItem
      });

      // Encontrar todos los items que se solapan con el item actual
      const overlappingItems = timeRanges.filter(range => {
        if (range.id === itemIdStr) return false;
        
        // Verificar solapamiento real usando minutos exactos
        return (startMinutes < range.endMinutes && endMinutes > range.startMinutes);
      });

      // Si no hay solapamientos, usar ancho completo
      if (overlappingItems.length === 0) {
        const position = {
          top: (startMinutes / 60) * HOUR_HEIGHT,
          height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_ITEM_HEIGHT),
          left: '0%',
          width: '100%',
          column: 0
        };
        return position;
      }

      // MODIFICACIÓN: Usar directamente optimizeItemPositions para calcular las posiciones
      const allItemsForPositioning = [...allItems.filter(i => i.time && i.time.includes('-'))];
      
      const positionsMap = optimizeItemPositions(allItemsForPositioning, date);
      const itemPosition = positionsMap.get(String(item.id));
      
      if (itemPosition) {
        // Calcular el número total de columnas
        const totalColumns = Math.max(...Array.from(positionsMap.values(), p => p.column + 1));
        
        // Calcular ancho y posición horizontal
        const columnWidth = 100 / totalColumns;
        const itemLeft = itemPosition.column * columnWidth;
        
        const position = {
          top: (startMinutes / 60) * HOUR_HEIGHT,
          height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_ITEM_HEIGHT),
          left: `${itemLeft}%`,
          width: `${columnWidth}%`,
          column: itemPosition.column
        };
        
        // Guardar en caché
        if (!positionCache.has(date)) {
          positionCache.set(date, new Map());
        }
        positionCache.get(date)!.set(String(item.id), position);
        
        return position;
      }

      // Si no hay solapamientos, usar ancho completo
      const defaultPosition = {
        top: (startMinutes / 60) * HOUR_HEIGHT,
        height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_ITEM_HEIGHT),
        left: '0%',
        width: '100%',
        column: 0
      };
      
      // Guardar en caché
      if (!positionCache.has(date)) {
        positionCache.set(date, new Map());
      }
      positionCache.get(date)!.set(String(item.id), defaultPosition);
      
      return defaultPosition;
    }

    return null;
  }, [HOUR_HEIGHT, isDragging, itemPositions, activeOverlaps, timeToMinutes]);

  // Añadir esta función para verificar solapamientos en una posición específica
  const checkForOverlapsAtPosition = (
    item: TimelineItemType,
    position: number,
    date: string
  ): boolean => {
    // Convertir la posición a minutos
    const startMinutes = Math.round((position / HOUR_HEIGHT) * 60);
    
    // Calcular la duración en minutos basada en el tiempo original
    let duration = 60; // Duración predeterminada: 1 hora
    
    if (item.time) {
      const [startTime, endTime] = item.time.split('-');
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = timeToMinutes(endTime);
      duration = endTimeMinutes - startTimeMinutes;
    }
    
    // Calcular la hora de finalización
    const endMinutes = startMinutes + duration;
    
    // Obtener todos los elementos activos para esta fecha
    const taskStore = useTaskStore.getState();
    const habitStore = useHabitStore.getState();
    
    // 🔧 CORRECCIÓN: Usar getFilteredTasks para incluir tareas recurrentes
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month - 1 porque los meses son 0-indexados
    const tasksForDate = taskStore.getFilteredTasks(dateObj, '', false, true);
    
    // Filtrar elementos que podrían solaparse
    const potentialOverlaps = [
      ...tasksForDate
        .filter(t => String(t.id) !== String(item.id)) // Excluir el item actual
        .filter(t => t.time), // Solo incluir tareas con tiempo
      ...habitStore.habits
        .filter(h => {
          // Verificar explícitamente que el hábito está activo SOLO en esta fecha específica
          const isActive = isHabitActiveOnDate(h, date);
          
          return isActive && String(h.id) !== String(item.id);
        })
        .filter(h => h.time) // Solo incluir hábitos con tiempo
    ];
    
    // Verificar solapamientos
    for (const otherItem of potentialOverlaps) {
      if (!otherItem.time) continue;
      
      // Obtener el tiempo correcto para el elemento (considerando excepciones)
      let timeToUse = otherItem.time;
      
      if ('is_recurring' in otherItem) { // Es una tarea
        if (otherItem.time_exceptions?.[date]?.time) {
          timeToUse = otherItem.time_exceptions[date].time;
        } else if (otherItem.recurring_exceptions?.[date]?.time) {
          timeToUse = otherItem.recurring_exceptions[date].time;
        }
      } else if ('time_exceptions' in otherItem) { // Es un hábito
        if (otherItem.time_exceptions?.[date]?.time) {
          timeToUse = otherItem.time_exceptions[date].time;
        }
      }
      
      const [otherStart, otherEnd] = timeToUse.split('-');
      const otherStartMinutes = timeToMinutes(otherStart);
      const otherEndMinutes = timeToMinutes(otherEnd);
      
      // Verificar si hay solapamiento
      if (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) {
        return true; // Hay solapamiento
      }
    }
    
    return false; // No hay solapamiento
  };

  // Añadir nuevo estado para el tiempo durante el arrastre
  const [currentDragTime, setCurrentDragTime] = useState<string | null>(null);
  
  const calculateTimeFromPosition = (position: number): string => {
    const totalMinutes = Math.round((position / HOUR_HEIGHT) * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round((totalMinutes % 60) / 5) * 5; // Redondear a intervalos de 5 minutos
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleTaskDrag = useCallback((
    itemId: string | number,
    deltaY: number,
    currentPos: number,
    height: number,
    date: string
  ) => {
    const newPosition = currentPos + deltaY;
    
    // Actualizar el tiempo actual durante el arrastre con mayor precisión
    const totalMinutes = Math.round((newPosition / HOUR_HEIGHT) * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = Math.round(totalMinutes % 60);
    const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    // Actualizar el tiempo de arrastre actual
    setCurrentDragTime(currentTime);
    
    // Actualizar el slot de tiempo activo
    setActiveTimeSlot(currentTime);
    
    // Establecer el estado de arrastre
    setIsDragging(true);
    
    // Prevenir que el contenedor suba más allá de 00:00
    if (newPosition < 0) {
      setItemPositions(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [date]: 0
        }
      }));
      return;
    }

    // Prevenir que el contenedor baje más allá de 23:55
    const maxPosition = (23 * 60 + 55) * (HOUR_HEIGHT / 60);
    if (newPosition > maxPosition) {
      setItemPositions(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [date]: maxPosition
        }
      }));
      return;
    }

    // Actualizar la posición si está dentro de los límites
    setItemPositions(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [date]: newPosition
      }
    }));

    // NUEVO: Detectar solapamientos con otros elementos
    const taskStore = useTaskStore.getState();
    const habitStore = useHabitStore.getState();
    
    // Obtener el elemento que se está arrastrando
    const draggingTask = taskStore.tasks.find(t => String(t.id) === String(itemId));
    const draggingHabit = habitStore.habits.find(h => String(h.id) === String(itemId));
    const draggingItem = draggingTask || draggingHabit;
    
    if (!draggingItem) return;
    
    // Calcular la duración en minutos basada en el tiempo original
    let duration = 60; // Duración predeterminada: 1 hora
    
    if (draggingItem.time) {
      const [startTime, endTime] = draggingItem.time.split('-');
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = timeToMinutes(endTime);
      duration = endTimeMinutes - startTimeMinutes;
    }
    
    // Calcular el rango de tiempo del elemento arrastrado
    const startMinutes = totalMinutes;
    const endMinutes = startMinutes + duration;
    
    // 🔧 CORRECCIÓN: Usar getFilteredTasks para incluir tareas recurrentes
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month - 1 porque los meses son 0-indexados
    const tasksForDate = taskStore.getFilteredTasks(dateObj, '', false, true);
    
    // Filtrar elementos que podrían solaparse (solo de la misma fecha)
    const potentialOverlaps = [
      ...tasksForDate
        .filter(t => String(t.id) !== String(itemId)) // Excluir el item actual
        .filter(t => t.time), // Solo incluir tareas con tiempo
      ...habitStore.habits
        .filter(h => isHabitActiveOnDate(h, date) && String(h.id) !== String(itemId))
        .filter(h => h.time)
    ];
    
    // Encontrar elementos que se solapan actualmente
    const currentOverlaps: string[] = [];
    
    for (const otherItem of potentialOverlaps) {
      if (!otherItem.time) continue;
      
      // Obtener el tiempo correcto para el elemento (considerando excepciones)
      let timeToUse = otherItem.time;
      
      if ('is_recurring' in otherItem) { // Es una tarea
        if (otherItem.time_exceptions?.[date]?.time) {
          timeToUse = otherItem.time_exceptions[date].time;
        } else if (otherItem.recurring_exceptions?.[date]?.time) {
          timeToUse = otherItem.recurring_exceptions[date].time;
        }
      } else if ('time_exceptions' in otherItem) { // Es un hábito
        if (otherItem.time_exceptions?.[date]?.time) {
          timeToUse = otherItem.time_exceptions[date].time;
        }
      }
      
      const [otherStart, otherEnd] = timeToUse.split('-');
      const otherStartMinutes = timeToMinutes(otherStart);
      const otherEndMinutes = timeToMinutes(otherEnd);
      
      // Verificar si hay solapamiento
      if (startMinutes < otherEndMinutes && endMinutes > otherStartMinutes) {
        currentOverlaps.push(String(otherItem.id));
      }
    }
    
    // Actualizar el estado de solapamientos activos
    setActiveOverlaps(prev => {
      const newOverlaps = { ...prev };
      
      // Inicializar la fecha si no existe
      if (!newOverlaps[date]) {
        newOverlaps[date] = {};
      }
      
      // Actualizar solapamientos para el elemento arrastrado
      newOverlaps[date][String(itemId)] = currentOverlaps;
      
      // Actualizar solapamientos para los elementos con los que se solapa
      currentOverlaps.forEach(otherId => {
        if (!newOverlaps[date][otherId]) {
          newOverlaps[date][otherId] = [];
        }
        
        // Añadir el elemento arrastrado a la lista de solapamientos del otro elemento
        if (!newOverlaps[date][otherId].includes(String(itemId))) {
          newOverlaps[date][otherId] = [...newOverlaps[date][otherId], String(itemId)];
        }
      });
      
      // Limpiar solapamientos anteriores que ya no existen
      Object.keys(newOverlaps[date]).forEach(id => {
        if (id === String(itemId)) return;
        
        // Si este elemento ya no se solapa con el elemento arrastrado, eliminarlo
        if (!currentOverlaps.includes(id) && newOverlaps[date][id].includes(String(itemId))) {
          newOverlaps[date][id] = newOverlaps[date][id].filter(i => i !== String(itemId));
        }
      });
      
      return newOverlaps;
    });
    
  }, [HOUR_HEIGHT, timeToMinutes, isHabitActiveOnDate]);

  const handleTaskStop = useCallback((
    itemId: string | number,
    currentPos: number,
    height: number,
    date: string
  ) => {
    // Asegurar que la posición esté dentro de los límites
    const topLimit = 0;
    const bottomLimit = (23 * 60 + 55) * (HOUR_HEIGHT / 60);
    const boundedPosition = Math.max(topLimit, Math.min(bottomLimit, currentPos));
    
    // Calcular la nueva hora respetando los límites
    const minutes = Math.round((boundedPosition / HOUR_HEIGHT) * 60);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    
    // Buscar el hábito o la tarea
    const habitStore = useHabitStore.getState();
    const habit = habitStore.habits.find(h => String(h.id) === String(itemId));
    
    const taskStore = useTaskStore.getState();
    const task = taskStore.tasks.find(t => String(t.id) === String(itemId));
    
    // 1. Calcular nueva hora de inicio
    const newStartTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    // Manejar hábito
    if (habit) {
      // 2. Obtener la duración original
      const [originalStart, originalEnd] = (habit.time || '00:00-01:00').split('-');
      const duration = getTimeDifference(originalStart, originalEnd);
      
      // 3. Calcular nueva hora final
      const endMinutes = roundedMinutes + (duration.hours * 60) + duration.minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const newEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      
      // 4. Crear el nuevo formato de hora
      const newTime = `${newStartTime}-${newEndTime}`;
      
      // 5. Actualizar el store y la base de datos
      if (onUpdateHabit) {
        onUpdateHabit(String(itemId), {
          time_exceptions: {
            ...habit.time_exceptions,
            [date]: { time: newTime }
          }
        });
      }
    }
    // Manejar tarea
    else if (task) {
      // 2. Obtener la duración original
      const [originalStart, originalEnd] = (task.time || '00:00-01:00').split('-');
      const duration = getTimeDifference(originalStart, originalEnd);
      
      // 3. Calcular nueva hora final
      const endMinutes = roundedMinutes + (duration.hours * 60) + duration.minutes;
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      const newEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
      
      // 4. Crear el nuevo formato de hora
      const newTime = `${newStartTime}-${newEndTime}`;
      
      // 5. Actualizar el store y la base de datos
      if (onUpdateTask) {
        if (task.is_recurring) {
          onUpdateTask(String(itemId), {
            recurring_exceptions: {
              ...task.recurring_exceptions,
              [date]: { time: newTime }
            }
          });
        } else {
          onUpdateTask(String(itemId), { time: newTime });
        }
      }
    }
    
    // Actualizar posición visual
    setItemPositions(prev => ({
      ...prev,
      [itemId]: { [date]: boundedPosition }
    }));

    // Usar RAF para asegurar que las actualizaciones visuales sean suaves
    requestAnimationFrame(() => {
      // Forzar actualización para recalcular solapamientos
      setForceUpdate(prev => prev + 1);

      // Limpiar el estado de arrastre después de que todo se haya actualizado
      requestAnimationFrame(() => {
        setIsDragging(false);
        setCurrentDragTime(null);
        setActiveTimeSlot(null);
      });
    });
  }, [HOUR_HEIGHT, onUpdateHabit, onUpdateTask]);

  // Añadir un efecto para sincronizar posiciones con tiempos de HÁBITOS
  useEffect(() => {
    habits.forEach(habit => {
      const exceptionTime = habit.time_exceptions?.[formattedDate]?.time;
      const timeToUse = exceptionTime || habit.time;

      if (timeToUse) {
        const [startTime] = timeToUse.split('-');
        const [hours, minutes] = startTime.split(':').map(Number);
        const position = (hours * HOUR_HEIGHT) + (minutes * (HOUR_HEIGHT / 60));
        
        // Actualizar ambas posiciones simultáneamente
        setItemPositions(prev => ({
          ...prev,
          [habit.id]: {
            ...prev[habit.id],
            [formattedDate]: position
          }
        }));

        setItemPositionsInMinutes(prev => ({
          ...prev,
          [habit.id]: {
            ...prev[habit.id],
            [formattedDate]: hours * 60 + minutes
          }
        }));
      }
    });
  }, [habits, HOUR_HEIGHT, formattedDate]); // 🔧 Usar habits en lugar de getState()

  // 🔧 CORRECCIÓN: Añadir un efecto para sincronizar posiciones con tiempos de TAREAS
  useEffect(() => {
    tasks.forEach(task => {
      // Obtener el tiempo correcto considerando excepciones
      const exceptionTime = task.time_exceptions?.[formattedDate]?.time;
      const recurringExceptionTime = task.recurring_exceptions?.[formattedDate]?.time;
      const timeToUse = exceptionTime || recurringExceptionTime || task.time;

      if (timeToUse) {
        const [startTime] = timeToUse.split('-');
        const [hours, minutes] = startTime.split(':').map(Number);
        const position = (hours * HOUR_HEIGHT) + (minutes * (HOUR_HEIGHT / 60));
        
        // Actualizar posiciones de tareas de la misma manera que los hábitos
        setItemPositions(prev => ({
          ...prev,
          [task.id]: {
            ...prev[task.id],
            [formattedDate]: position
          }
        }));

        setItemPositionsInMinutes(prev => ({
          ...prev,
          [task.id]: {
            ...prev[task.id],
            [formattedDate]: hours * 60 + minutes
          }
        }));
      }
    });
  }, [tasks, HOUR_HEIGHT, formattedDate]); // 🔧 Usar tasks en lugar de getState()

  // Añadir antes de handleTaskStop
  const snapToNearestTimeSlot = useCallback((
    currentPos: number,
    height: number,
    currentTime: string,
    itemId: string | number,
    item: TimelineItemType,
    allItems: TimelineItemType[],
    date: string
  ) => {
    const totalMinutes = Math.round((currentPos / HOUR_HEIGHT) * 60);
    const roundedMinutes = Math.round(totalMinutes / 15) * 15;
    const hours = Math.floor(roundedMinutes / 60);
    const minutes = roundedMinutes % 60;
    
    return {
      time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
  }, [HOUR_HEIGHT]);

  // Añadir un efecto para detectar cuando se suelta el ratón en cualquier parte
  useEffect(() => {
    if (!isDragging) return; // Solo ejecutar si estamos arrastrando
    
    const handleGlobalMouseUp = (e: MouseEvent | TouchEvent) => {
      setTimeout(() => {
        setIsDragging(false);
        setCurrentDragTime(null);
        setActiveTimeSlot(null);
      }, 0);
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp, true);
    document.addEventListener('touchend', handleGlobalMouseUp, true);
    
    const safetyTimer = setTimeout(() => {
      if (isDragging) {
        setIsDragging(false);
        setCurrentDragTime(null);
        setActiveTimeSlot(null);
      }
    }, 5000);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp, true);
      document.removeEventListener('touchend', handleGlobalMouseUp, true);
      clearTimeout(safetyTimer);
    };
  }, [isDragging]);

  // Añadir una función para registrar un detector específico para el contenedor
  const registerContainerDragEndHandler = useCallback((containerElement: HTMLElement) => {
    if (!containerElement) return () => {};
    
    const handleContainerDragEnd = () => {
      setIsDragging(false);
      setCurrentDragTime(null);
      setActiveTimeSlot(null);
    };
    
    containerElement.addEventListener('mouseup', handleContainerDragEnd);
    containerElement.addEventListener('touchend', handleContainerDragEnd);
    
    return () => {
      containerElement.removeEventListener('mouseup', handleContainerDragEnd);
      containerElement.removeEventListener('touchend', handleContainerDragEnd);
    };
  }, []);

  // Añadir una función específica para forzar la limpieza del estado visual
  const forceEndDragging = useCallback(() => {
    setIsDragging(false);
    setCurrentDragTime(null);
    setActiveTimeSlot(null);
    
    setTimeout(() => {
      setForceUpdate(prev => prev + 1);
      
      document.querySelectorAll('.ring-2.ring-blue-500').forEach(el => {
        el.classList.remove('ring-2');
        el.classList.remove('ring-blue-500');
      });
      
      document.querySelectorAll('.dragging-active').forEach(el => {
        el.classList.remove('dragging-active');
      });
    }, 50);
  }, []);

  // Añadir la función handleZoom que faltaba
  const handleZoom = useCallback((zoomDelta: number) => {
    // Get the current scroll position before changing zoom
    const timelineContainer = document.querySelector('.timeline-scroll-container');
    const scrollTop = timelineContainer?.scrollTop || 0;
    const containerHeight = timelineContainer?.clientHeight || 0;
    
    // Calculate the time at the center of the viewport before zoom
    const centerPosition = scrollTop + (containerHeight / 2);
    const centerTimeBeforeZoom = pixelsToTime(centerPosition);
    
    // Calculate new zoom level with constraints
    const newZoomLevel = Math.max(0.5, Math.min(2.5, zoomLevel + zoomDelta));
    
    // Only update if zoom level actually changed
    if (newZoomLevel !== zoomLevel) {
      setZoomLevel(newZoomLevel);
      
      // Use requestAnimationFrame to adjust scroll position after the DOM has updated
      requestAnimationFrame(() => {
        if (timelineContainer) {
          // Calculate new position for the same time after zoom
          const newHourHeight = BASE_HOUR_HEIGHT * newZoomLevel;
          const [hours, minutes] = centerTimeBeforeZoom.split(':').map(Number);
          const newCenterPosition = (hours * newHourHeight) + ((minutes / 60) * newHourHeight);
          
          // Adjust scroll to keep the same time at the center
          timelineContainer.scrollTop = newCenterPosition - (containerHeight / 2);
          
          // Force update to ensure all components reflect the new zoom level
          setForceUpdate(prev => prev + 1);
        }
      });
    }
  }, [zoomLevel, pixelsToTime]);

  return {
    HOUR_HEIGHT,
    QUARTER_HOUR,
    QUARTER_PIXEL_HEIGHT,
    itemPositions,
    activeTimeSlot,
    isDragging,
    calculateItemPosition,
    handleTaskDrag,
    handleTaskStop,
    snapToNearestTimeSlot,
    timeToPixels,
    pixelsToTime,
    handleZoom,
    forceUpdate,
    setItemPositions,
    currentDragTime,
    calculateTimeFromPosition,
    registerContainerDragEndHandler,
    forceEndDragging,
    activeOverlaps,
  };
};