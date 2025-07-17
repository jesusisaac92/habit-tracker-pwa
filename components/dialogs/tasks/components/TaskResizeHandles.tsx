import React, { useRef, useEffect, useState } from 'react';

interface TaskResizeHandlesProps {
  isEditable: boolean;
  onResizeStart: (type: 'start' | 'end') => void;
  onResize: (deltaY: number, type: 'start' | 'end') => void;
  onResizeStop: (type: 'start' | 'end') => void;
  resizeType: 'start' | 'end' | null;
  taskId: string;
}

export const TaskResizeHandles = ({ 
  isEditable, 
  onResizeStart, 
  onResize, 
  onResizeStop,
  resizeType,
  taskId 
}: TaskResizeHandlesProps) => {
  // Deshabilitamos temporalmente los resize handles
  return null;
  
  /* Código original comentado temporalmente
  if (!isEditable) return null;

  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const currentType = useRef<'start' | 'end' | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && currentType.current) {
        const deltaY = e.clientY - startY.current;
        console.log('Dragging:', { deltaY, type: currentType.current }); // Debug
        onResize(deltaY, currentType.current);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging && currentType.current) {
        console.log('Stop dragging:', currentType.current); // Debug
        onResizeStop(currentType.current);
        setIsDragging(false);
        currentType.current = null;
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, taskId, onResize, onResizeStop]);

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Start dragging:', type); // Debug
    startY.current = e.clientY;
    currentType.current = type;
    setIsDragging(true);
    onResizeStart(type);
  };

  return (
    <div className="absolute inset-0">
      {(['start', 'end'] as const).map((type) => (
        <div
          key={type}
          className={`absolute ${
            type === 'start' ? '-top-1' : '-bottom-1'
          } left-1/2 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full cursor-ns-resize transform -translate-x-1/2 hover:scale-110 transition-transform z-30 opacity-0 group-hover:opacity-100`}
          onMouseDown={(e) => handleMouseDown(e, type)}
          style={{ touchAction: 'none', pointerEvents: 'auto' }}
        />
      ))}
    </div>
  );
  */
}; 