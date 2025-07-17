import React, { useState, useEffect, useRef } from 'react';
import { useTimelinePositioning } from '../useTimelinePositioning';
import { useTimeFormat } from '@/components/ui/composite/common/useTimeFormat';
import { logger } from '@/utils/logger';

interface TimelineGridProps {
  HOUR_HEIGHT: number;
  QUARTER_PIXEL_HEIGHT: number;
  activeTimeSlot: string | null;
  isDragging: boolean;
  currentDragTime?: string | null;
  showTimeLabels?: boolean;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  HOUR_HEIGHT,
  QUARTER_PIXEL_HEIGHT,
  activeTimeSlot,
  isDragging,
  currentDragTime = null,
  showTimeLabels = false
}) => {
  const { use24HourFormat } = useTimeFormat();
  const [highlightedPosition, setHighlightedPosition] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visibleLabels, setVisibleLabels] = useState<{[key: string]: number}>({});
  const prevDragTimeRef = useRef<string | null>(null);
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (isDragging && currentDragTime) {
      logger.debug('Timeline dragging:', { currentDragTime, activeTimeSlot });
    }
  }, [isDragging, currentDragTime, activeTimeSlot]);

  // Efecto para manejar las transiciones suaves
  useEffect(() => {
    if (isDragging && activeTimeSlot) {
      const [hours, minutes] = activeTimeSlot.split(':').map(Number);
      const position = (hours * 60 + minutes) * (HOUR_HEIGHT / 60);
      
      // Durante el arrastre, actualizar sin transición
      setIsTransitioning(false);
      setHighlightedPosition(position);
    } else if (highlightedPosition !== null) {
      // Al soltar, activar la transición suave
      setIsTransitioning(true);
      
      // Limpiar después de la transición
      const timer = setTimeout(() => {
        setHighlightedPosition(null);
        setIsTransitioning(false);
      }, 300); // Duración de la transición

      return () => clearTimeout(timer);
    }
  }, [isDragging, activeTimeSlot, HOUR_HEIGHT]);

  // Añadir más logs para depuración
  useEffect(() => {
    logger.debug('Timeline drag state changed:', { isDragging });
  }, [isDragging]);

  // Modificar el efecto que maneja las etiquetas visibles
  useEffect(() => {
    // Crear un objeto base con todas las horas exactas siempre visibles
    const baseLabels: {[key: string]: number} = {};
    for (let hour = 0; hour < 24; hour++) {
      const timeKey = `${String(hour).padStart(2, '0')}:00`;
      baseLabels[timeKey] = 0.8; // Opacidad base para horas exactas (más visible)
    }
    
    if (isDragging && currentDragTime) {
      try {
        // Parsear el tiempo actual de arrastre
        const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
        const dragTotalMinutes = dragHours * 60 + dragMinutes;
        
        // Crear un nuevo objeto para las etiquetas visibles, partiendo del base
        const newVisibleLabels = {...baseLabels};
        
        // Ajustar opacidad de horas exactas cercanas al punto de arrastre
        for (let hour = 0; hour < 24; hour++) {
          const timeKey = `${String(hour).padStart(2, '0')}:00`;
          const labelTotalMinutes = hour * 60;
          
          // Calcular la distancia en minutos
          const distance = Math.abs(dragTotalMinutes - labelTotalMinutes);
          
          // Definir un rango de visibilidad (siempre visible, pero con opacidad variable)
          const visibilityRange = 60; // 1 hora de rango
          
          // Ajustar opacidad basada en la cercanía
          if (distance <= visibilityRange) {
            // Opacidad máxima para la etiqueta más cercana
            newVisibleLabels[timeKey] = Math.max(0.8, 1 - (distance / visibilityRange) * 0.2);
          }
        }
        
        // Añadir etiquetas para intervalos de 15 minutos
        for (let hour = 0; hour < 24; hour++) {
          for (let minute = 15; minute < 60; minute += 15) { // Solo 15, 30, 45
            const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            const labelTotalMinutes = hour * 60 + minute;
            
            // Calcular la distancia en minutos
            const distance = Math.abs(dragTotalMinutes - labelTotalMinutes);
            
            // Definir un rango de visibilidad (30 minutos = media hora)
            const visibilityRange = 30;
            
            // Calcular opacidad basada en la distancia
            if (distance <= visibilityRange) {
              // Opacidad máxima para la etiqueta más cercana, disminuyendo gradualmente
              const opacity = 1 - (distance / visibilityRange);
              newVisibleLabels[timeKey] = Math.pow(opacity, 1.5); // Ajuste de curva para efecto más natural
            }
          }
        }
        
        // Actualizar el estado con las nuevas etiquetas visibles
        setVisibleLabels(newVisibleLabels);
        prevDragTimeRef.current = currentDragTime;
        setIsTransitioning(false);
      } catch (error) {
        logger.error('Error processing drag time:', error);
        // En caso de error, al menos mostrar las horas exactas
        setVisibleLabels(baseLabels);
      }
    } else {
      // Si no estamos arrastrando, mostrar solo las horas exactas
      setVisibleLabels(baseLabels);
      prevDragTimeRef.current = null;
    }
  }, [isDragging, currentDragTime]);

  // Eliminar el efecto adicional que limpia las etiquetas cuando isDragging cambia a false
  // Ya que ahora queremos que las horas exactas siempre estén visibles
  useEffect(() => {
    if (!isDragging) {
      logger.debug('Timeline drag ended');
      prevDragTimeRef.current = null;
      // Ya no limpiamos visibleLabels aquí
    }
  }, [isDragging]);

  // Añadir un log para monitorear el estado de visibleLabels
  useEffect(() => {
    logger.debug('Timeline visible labels updated:', { count: Object.keys(visibleLabels).length });
  }, [visibleLabels]);

  // Asegurarnos de que la cuadrícula se actualice cuando cambia HOUR_HEIGHT
  useEffect(() => {
    // Forzar actualización cuando cambia HOUR_HEIGHT (zoom)
    logger.debug('Timeline HOUR_HEIGHT updated:', { HOUR_HEIGHT });
  }, [HOUR_HEIGHT]);

  // Modificar el efecto para controlar la visibilidad de las etiquetas
  // Ahora siempre mostraremos las etiquetas
  useEffect(() => {
    setShowLabels(true); // Siempre mostrar las etiquetas
  }, []);

  // Log para el nuevo estado
  useEffect(() => {
    logger.debug('Timeline labels visibility changed:', { showLabels });
  }, [showLabels]);

  const formatHourLabel = (timeKey: string) => {
    const [hours, minutes] = timeKey.split(':').map(Number);
    
    // Solo formatear las horas exactas (minutos = 0)
    if (minutes === 0) {
      if (use24HourFormat) {
        return `${hours.toString().padStart(2, '0')}:00`;
      }
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hour12}:00 ${period}`;
    }
    
    // Para otros intervalos, mostrar el formato original
    return timeKey;
  };

  // Primero, crear una función para verificar si un tiempo es una hora exacta
  

  logger.debug('Timeline render:', { isDragging, currentDragTime, showLabels });

  return (
    <div 
      className="absolute inset-0"
      style={{ height: `${24 * HOUR_HEIGHT}px` }}
      key={`timeline-grid-${HOUR_HEIGHT}`}
    >
      {/* Líneas de cuadrícula */}
      {Array.from({ length: 24 }).map((_, hour) => {
        // Verificar si esta hora debe resaltarse
        const hourKey = `${String(hour).padStart(2, '0')}:00`;
        const isHourHighlighted = isDragging && currentDragTime && 
          currentDragTime.split(':')[0] === hourKey.split(':')[0] && 
          parseInt(currentDragTime.split(':')[1]) < 15;
        
        return (
          <div 
            key={hour}
            className="absolute w-full"
            style={{ 
              top: hour * HOUR_HEIGHT,
              height: HOUR_HEIGHT
            }}
          >
            {/* Línea de hora principal */}
            <div 
              className={`absolute w-full border-t transition-all duration-150 ease-in-out
                          ${isHourHighlighted 
                            ? 'border-blue-400 dark:border-blue-500' 
                            : 'border-gray-200 dark:border-gray-700'}`}
              style={{
                top: 0
              }}
            />

            {/* Líneas de 15 minutos */}
            {[15, 30, 45].map((minutes, index) => {
              const timeKey = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              const isHighlighted = isDragging && activeTimeSlot === timeKey;
              
              return (
                <div
                  key={minutes}
                  className={`absolute w-full border-t ${
                    isHighlighted
                      ? 'border-blue-400 dark:border-blue-500'
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                  style={{
                    top: `${(minutes / 60) * HOUR_HEIGHT}px`,
                    opacity: isHighlighted ? 0.8 : 0.1
                  }}
                />
              );
            })}
          </div>
        );
      })}

      {/* Indicador de tiempo activo */}
      {(isDragging || isTransitioning) && highlightedPosition !== null && (
        <div 
          className={`absolute left-0 w-full h-0.5 bg-blue-500
            ${isTransitioning ? 'transition-all duration-300 ease-out' : ''}`}
          style={{ 
            top: highlightedPosition,
            transform: 'translateY(-50%)',
            zIndex: 50,
            opacity: isDragging ? 1 : 0
          }}
        />
      )}

      {/* Sistema unificado de etiquetas de tiempo */}
      {showLabels && (
        <>
          {Object.keys(visibleLabels).map(timeKey => {
            const [hours, minutes] = timeKey.split(':').map(Number);
            const labelPosition = (hours * HOUR_HEIGHT) + ((minutes / 60) * HOUR_HEIGHT);
            const opacity = visibleLabels[timeKey];
            
            const isClosestLabel = (() => {
              if (!currentDragTime) return false;
              
              const [dragHours, dragMinutes] = currentDragTime.split(':').map(Number);
              const dragTotalMinutes = dragHours * 60 + dragMinutes;
              const labelTotalMinutes = hours * 60 + minutes;
              
              const distance = Math.abs(dragTotalMinutes - labelTotalMinutes);
              return distance <= 5;
            })();
            
            const isHourLabel = minutes === 0;
            
            return (
              <div 
                key={timeKey}
                className={`absolute text-xs transition-all duration-100 ease-in-out
                          ${isClosestLabel 
                            ? 'text-blue-500' 
                            : 'text-gray-500'}`}
                style={{ 
                  top: labelPosition,
                  left: '-70px', // Aumentado el espacio para las etiquetas
                  transform: 'translateY(-50%)',
                  opacity: opacity,
                  scale: isClosestLabel ? '1' : '1',
                  zIndex: isClosestLabel ? 60 : 50,
                  fontWeight: 400,
                  letterSpacing: 'normal',
                  minWidth: '55px', // Asegurar un ancho mínimo para las etiquetas
                  textAlign: 'right' // Alinear el texto a la derecha
                }}
              >
                {formatHourLabel(timeKey)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}; 