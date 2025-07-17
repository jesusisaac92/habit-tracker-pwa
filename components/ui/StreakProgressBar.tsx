import React from 'react';
import { useTranslation } from 'react-i18next';

interface StreakProgressBarProps {
  currentStreak: number;
  recordStreak: number;
  label?: string;
  className?: string;
}

const StreakProgressBar: React.FC<StreakProgressBarProps> = ({
  currentStreak,
  recordStreak,
  label,
  className = '',
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
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentStreak} / {recordStreak} {t('common.days', 'días')}
          </span>
        </div>
      )}
      
      <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Barra de progreso */}
        <div 
          className={`h-full ${getBarColor()} transition-all duration-500 ease-out`} 
          style={{ width: `${progress}%` }}
        />
        
        {/* Indicador de la racha actual */}
        <div 
          className="absolute top-0 h-full flex items-center justify-center"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-600 shadow-sm" />
        </div>
        
        {/* Línea de récord */}
        {recordStreak > 0 && !isNewRecord && (
          <div 
            className="absolute top-0 h-full w-0.5 bg-red-500"
            style={{ left: '100%', transform: 'translateX(-1px)' }}
          >
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
          </div>
        )}
        
        {/* Indicador de nuevo récord */}
        {isNewRecord && (
          <div className="absolute -top-6 right-0 bg-yellow-400 text-xs font-bold px-2 py-0.5 rounded-md text-yellow-800">
            {t('common.newRecord', '¡Nuevo récord!')}
          </div>
        )}
      </div>
      
      {/* Etiquetas de valores */}
      <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
        <span>0</span>
        <span>{recordStreak > 0 ? recordStreak : currentStreak} {t('common.days', 'días')}</span>
      </div>
    </div>
  );
};

export default StreakProgressBar; 