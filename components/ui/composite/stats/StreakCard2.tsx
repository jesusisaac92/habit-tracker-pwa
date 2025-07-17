import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Trophy } from 'lucide-react';

interface StreakCard2Props {
  currentStreak: number;
  recordStreak: number;
  className?: string;
  isActive?: boolean;
  variant?: 'dark' | 'light';
}

const StreakCard2: React.FC<StreakCard2Props> = ({
  currentStreak,
  recordStreak,
  className = '',
  isActive = true,
  variant = 'light'
}) => {
  const { t } = useTranslation();
  
  // Calcular el porcentaje de progreso
  const progress = recordStreak > 0 ? Math.min((currentStreak / recordStreak) * 100, 100) : 100;
  
  // Calcular días restantes para superar el récord
  const daysToRecord = Math.max(0, recordStreak - currentStreak);
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm ${className}`}>
      <div className="flex items-start mb-4">
        {/* Icono de fuego */}
        <div className="mr-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <Flame className="h-6 w-6 text-amber-500" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200">
              {t('streak.current', 'Racha Actual')}
            </h3>
            
            {isActive && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                {t('streak.active', 'Activo')}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Número de días y texto centrados */}
      <div className="text-center my-6">
        <div className="text-6xl font-bold text-gray-900 dark:text-white">
          {currentStreak}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {currentStreak === 1 ? t('streak.day', 'día') : t('streak.days', 'días')}
        </div>
      </div>
      
      {/* Récord */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center">
          <Trophy className="h-4 w-4 text-amber-500 mr-2" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('streak.record', 'Récord')}: 
            <span className="text-amber-500 font-bold ml-1">
              {recordStreak} {recordStreak === 1 ? t('streak.day', 'día') : t('streak.days', 'días')}
            </span>
          </span>
        </div>
      </div>
      
      {/* Barra de progreso integrada - ancho completo */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('progress.towardRecord', 'Progreso hacia el récord')}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentStreak}/{recordStreak}
          </span>
        </div>
        
        {/* Barra de progreso */}
        <div className="relative h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Mensaje de días restantes */}
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-center">
          {daysToRecord > 0 ? (
            <span>
              {daysToRecord} {daysToRecord === 1 ? 
                t('progress.dayToRecord', 'día para superar tu récord') : 
                t('progress.daysToRecord', 'días para superar tu récord')
              }
            </span>
          ) : (
            <span>{t('progress.newRecord', '¡Nuevo récord!')}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StreakCard2; 