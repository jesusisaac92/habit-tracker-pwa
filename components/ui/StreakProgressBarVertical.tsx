import React from 'react';
import { useTranslation } from 'react-i18next';

interface StreakProgressBarVerticalProps {
  currentStreak: number;
  recordStreak: number;
  label?: string;
  className?: string;
  height?: number;
}

const StreakProgressBarVertical: React.FC<StreakProgressBarVerticalProps> = ({
  currentStreak,
  recordStreak,
  label,
  className = '',
  height = 150
}) => {
  const { t } = useTranslation();
  
  // Calcular el porcentaje de progreso
  const progress = recordStreak > 0 ? Math.min((currentStreak / recordStreak) * 100, 100) : 100;
  
  // Determinar el color de la barra basado en el progreso
  const getBarColor = () => {
    if (progress < 30) return 'bg-blue-500';
    if (progress < 70) return 'bg-purple-500';
    return 'bg-green-500';
  };
  
  // Si la racha actual es igual o mayor que el récord, mostrar un indicador especial
  const isNewRecord = currentStreak >= recordStreak && recordStreak > 0;

  return (
    <div className={`flex ${className}`}>
      {/* Barra de progreso vertical */}
      <div className="flex flex-col items-center">
        <div className="relative" style={{ height: `${height}px`, width: '24px' }}>
          {/* Contenedor de la barra */}
          <div className="absolute bottom-0 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" style={{ height: '100%' }}>
            {/* Barra de progreso */}
            <div 
              className={`absolute bottom-0 w-full ${getBarColor()} transition-all duration-500 ease-out`} 
              style={{ height: `${progress}%` }}
            />
            
            {/* Línea de récord */}
            {recordStreak > 0 && !isNewRecord && (
              <div 
                className="absolute w-full h-0.5 bg-red-500"
                style={{ bottom: '100%', transform: 'translateY(1px)' }}
              >
                <div className="absolute -right-1 bottom-1/2 transform translate-y-1/2 w-2 h-2 bg-red-500 rotate-45" />
              </div>
            )}
            
            {/* Indicador de la racha actual */}
            <div 
              className="absolute w-full flex items-center justify-center"
              style={{ bottom: `${progress}%`, transform: 'translateY(50%)' }}
            >
              <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-600 shadow-sm" />
            </div>
          </div>
          
          {/* Indicador de nuevo récord */}
          {isNewRecord && (
            <div className="absolute -right-20 top-0 bg-yellow-400 text-xs font-bold px-2 py-0.5 rounded-md text-yellow-800 whitespace-nowrap">
              {t('common.newRecord', '¡Nuevo récord!')}
            </div>
          )}
        </div>
        
        {/* Etiquetas de valores */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {currentStreak}/{recordStreak > 0 ? recordStreak : currentStreak}
        </div>
      </div>
      
      {/* Información de texto */}
      <div className="ml-4 flex flex-col justify-between">
        {label && (
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
        )}
        
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{currentStreak}</span> 
            <span className="text-xs text-gray-500 dark:text-gray-400"> {t('common.days', 'días')}</span>
          </div>
          
          {recordStreak > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {t('common.record', 'Récord')}: {recordStreak} {t('common.days', 'días')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakProgressBarVertical; 