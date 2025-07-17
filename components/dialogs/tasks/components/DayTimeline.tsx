import React, { useState, useEffect } from 'react';
import { Task, Habit, TimelineItem } from '@/components/types/types';
import { TimelineGrid } from './TimelineGrid';
import { TimelineItems } from './TimelineItems';
import { useTimelinePositioning } from '../useTimelinePositioning';
import { useTranslation } from 'next-i18next';

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
  const [forceUpdate, setForceUpdate] = useState(0);

  const {
    HOUR_HEIGHT,
    QUARTER_PIXEL_HEIGHT,
    itemPositions,
    calculateItemPosition,
    handleTaskDrag,
    handleTaskStop,
  } = useTimelinePositioning();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    const formattedHour = hour % 12 || 12;
    const period = hour < 12 ? 'AM' : 'PM';
    return `${formattedHour}:00 ${period}`;
  };

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
      title: habit.name,
      color: habit.color,
      time: habit.time || undefined,
      label: undefined,
      getColor: () => habit.color
    }))
  ].filter(item => item.time); // Solo mostrar items con tiempo asignado

  // Manejar el auto-scroll cuando se arrastra cerca de los bordes
  const handleAutoScroll = (e: MouseEvent | TouchEvent, scrollContainer: HTMLElement) => {
    const containerRect = scrollContainer.getBoundingClientRect();
    const y = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
    const threshold = 50;
    const scrollSpeed = 10;

    if (y - containerRect.top < threshold) {
      scrollContainer.scrollTop -= scrollSpeed;
    } else if (containerRect.bottom - y < threshold) {
      scrollContainer.scrollTop += scrollSpeed;
    }
  };

  const handleItemDrag = (itemId: string | number, deltaY: number, currentPos: number, height: number) => {
    const formattedDate = date.toISOString().split('T')[0];
    handleTaskDrag(itemId, deltaY, currentPos, height, formattedDate);
  };

  const handleResize = (itemId: string | number, deltaY: number, type: 'start' | 'end') => {
    const formattedDate = date.toISOString().split('T')[0];
    handleTaskDrag(itemId, deltaY, 0, 0, formattedDate);
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
        editableItemId={editableItemId}
        setEditableItemId={setEditableItemId}
        setInteractionMode={setInteractionMode}
        setActiveTaskId={() => {}}
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
        setTaskToEdit={() => {}}
        setIsEditingTask={() => {}}
        setTaskToDelete={() => {}}
        setSelectedTaskForNote={() => {}}
        setIsViewingNote={() => {}}
        setForceUpdate={setForceUpdate}
        toggleTaskStatus={() => {}}
        habitStatus={{}}
        forceUpdate={forceUpdate}
      />
    </div>
  );
}; 