import React, { useState, useEffect, useCallback } from 'react';
import { Task, Habit, TimelineItem } from '@/components/types/types';
import { TimelineGrid } from './components/TimelineGrid';
import { TimelineItems } from './components/TimelineItems';
import { useTimelinePositioning } from './useTimelinePositioning';
import { useTranslation } from 'next-i18next';
import { format } from 'date-fns';

interface DayTimelineProps {
  tasks: Task[];
  habits: Habit[];
  date: Date;
  onTaskUpdate: (task: Task) => void;
  onHabitUpdate: (habit: Habit) => void;
  onTaskDelete: (task: Task) => void;
  onHabitDelete: (habit: Habit) => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  tasks,
  habits,
  date,
  onTaskUpdate,
  onHabitUpdate,
  onTaskDelete,
  onHabitDelete,
}) => {
  const { t } = useTranslation();
  const [editableItemId, setEditableItemId] = useState<string | number | null>(null);
  const [interactionMode, setInteractionMode] = useState<'resize' | 'move' | null>(null);
  const [resizeType, setResizeType] = useState<'start' | 'end' | null>(null);

  const {
    HOUR_HEIGHT,
    QUARTER_PIXEL_HEIGHT,
    itemPositions,
    calculateItemPosition: calculateTaskPositionOriginal,
    handleTaskDrag: handleTaskDragOriginal,
    handleTaskStop,
  } = useTimelinePositioning();

  const handleItemDrag = useCallback((itemId: string | number, deltaY: number, currentPos: number, height: number) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    handleTaskDragOriginal(String(itemId), deltaY, currentPos, height, formattedDate);
  }, [handleTaskDragOriginal, date]);

  // Combinar tareas y hábitos en un solo array de TimelineItem
  const timelineItems = [
    ...tasks.map(task => ({
      ...task,
      type: 'task' as const,
      color: task.label?.color || '#000000',
      time: task.time || undefined,
      label: task.label ? {
        id: task.label.id,
        name: task.label.name,
        color: task.label.color
      } : undefined
    })),
    ...habits.map(habit => ({
      ...habit,
      type: 'habit' as const,
      color: habit.color || '#000000',
      time: habit.time || undefined,
      label: undefined,
      title: habit.name
    }))
  ].filter(item => item.time); // Solo mostrar items con tiempo asignado

  const calculateItemPosition = useCallback((item: TimelineItem, allItems: TimelineItem[]) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    if (item.type === 'task') {
      const taskItems = allItems.filter(i => i.type === 'task').map(i => ({
        ...i,
        color: i.color || '#000000'
      }));
      return calculateTaskPositionOriginal(item, taskItems, formattedDate);
    }
    return calculateTaskPositionOriginal(item, allItems, formattedDate);
  }, [calculateTaskPositionOriginal, date]);

  // Manejar el auto-scroll cuando se arrastra cerca de los bordes
  const handleAutoScroll = (e: MouseEvent | TouchEvent, scrollSpeed: number) => {
    const container = document.querySelector('.timeline-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    const threshold = 50;

    if (y - containerRect.top < threshold) {
      container.scrollTop -= scrollSpeed;
    } else if (containerRect.bottom - y < threshold) {
      container.scrollTop += scrollSpeed;
    }
  };

  const handleResize = (itemId: string | number, deltaY: number, type: 'start' | 'end') => {
    handleItemDrag(String(itemId), deltaY, 0, 0);
  };

  return (
    <div className="timeline-container relative overflow-y-auto h-full">
      <TimelineGrid
        HOUR_HEIGHT={HOUR_HEIGHT}
        QUARTER_PIXEL_HEIGHT={QUARTER_PIXEL_HEIGHT}
        activeTimeSlot={null}
        isDragging={false}
      />
      <TimelineItems
        items={timelineItems}
        tasks={tasks}
        currentDate={date}
        habitStatus={{}}
        editableItemId={editableItemId}
        setEditableItemId={setEditableItemId}
        setInteractionMode={setInteractionMode}
        setActiveTaskId={setEditableItemId}
        itemPositions={itemPositions}
        QUARTER_PIXEL_HEIGHT={QUARTER_PIXEL_HEIGHT}
        HOUR_HEIGHT={HOUR_HEIGHT}
        calculateItemPosition={calculateItemPosition}
        onItemDrag={handleItemDrag}
        onItemEdit={(item) => {
          if (item.type === 'task') { 
            onTaskUpdate(item as Task);
          } else {
            onHabitUpdate(item as Habit);
          }
        }}
        onItemDelete={(item) => {
          if (item.type === 'task') {
            onTaskDelete(item as Task);
          } else {
            onHabitDelete(item as Habit);
          }
        }}
        onDoubleClick={setEditableItemId}
        onItemStop={handleTaskStop}
        onResizeStart={(itemId, type) => {
          setEditableItemId(itemId);
          setResizeType(type);
          setInteractionMode('resize');
        }}
        onResize={handleResize}
        onResizeStop={() => {
          setEditableItemId(null);
          setResizeType(null);
          setInteractionMode(null);
        }}
        interactionMode={interactionMode}
        onItemClick={() => {}}
        resizeType={resizeType}
        handleAutoScroll={handleAutoScroll}
        setTaskToEdit={onTaskUpdate}
        setIsEditingTask={() => {}}
        setTaskToDelete={onTaskDelete}
        toggleTaskStatus={() => {}}
        setSelectedTaskForNote={() => {}}
        setForceUpdate={() => {}}
        setIsViewingNote={() => {}}
      />
    </div>
  );
};