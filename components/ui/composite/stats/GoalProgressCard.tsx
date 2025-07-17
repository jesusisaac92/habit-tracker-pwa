import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Target, Check, CalendarCheck } from 'lucide-react';

interface GoalProgressCardProps {
  totalDays: number;
  daysCompleted: number;
  daysCompletedLabel?: string;
  creationDate?: string;
  className?: string;
  variant?: 'dark' | 'light';
  showGoalLabel?: boolean;
  showDaysCompleted?: boolean;
  selectedDays?: number[];
}

// Constante para los días de la semana
const WEEKDAYS = [
  { key: 'L', value: 1 },
  { key: 'M', value: 2 },
  { key: 'X', value: 3 },
  { key: 'J', value: 4 },
  { key: 'V', value: 5 },
  { key: 'S', value: 6 },
  { key: 'D', value: 0 }
];

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  totalDays,
  daysCompleted,
  daysCompletedLabel,
  creationDate,
  className = '',
  variant = 'dark',
  showGoalLabel = true,
  showDaysCompleted = false,
  selectedDays
}) => {
  const { t } = useTranslation();
  
  // Calcular días restantes
  const daysRemaining = Math.max(0, totalDays - daysCompleted);
  
  // Calcular porcentaje de progreso
  const progressPercentage = totalDays > 0 ? Math.min(100, (daysCompleted / totalDays) * 100) : 0;
  
  // Formatear la fecha de creación
  const formattedDate = creationDate || '';
  
  // Definir clases según la variante
  const styles = {
    dark: {
      container: "bg-gray-900 text-white",
      dot: "bg-teal-400",
      label: "text-gray-300 text-sm sm:text-base",
      dateLabel: "text-gray-400",
      value: "text-white",
      valueLabel: "text-gray-400",
      progressBar: "bg-gray-700",
      progressFill: "bg-teal-400",
      stats: "text-gray-400",
      percentage: "text-green-500",
      goalLabel: "bg-gray-800 text-gray-300 border border-gray-700",
      dayActive: "bg-blue-500 text-white",
      dayInactive: "bg-gray-100 text-gray-400",
      completedLabel: "text-teal-400"
    },
    light: {
      container: "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700",
      dot: "bg-blue-500",
      label: "text-gray-600 dark:text-gray-300 text-sm sm:text-base",
      dateLabel: "text-gray-500 dark:text-gray-400",
      value: "text-gray-900 dark:text-white",
      valueLabel: "text-gray-500 dark:text-gray-400",
      progressBar: "bg-gray-200 dark:bg-gray-700",
      progressFill: "bg-blue-500",
      stats: "text-gray-600 dark:text-gray-400",
      percentage: "text-green-600 dark:text-green-500",
      goalLabel: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
      dayActive: "bg-blue-500 text-white",
      dayInactive: "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500",
      completedLabel: "text-blue-500"
    }
  };
  
  const style = styles[variant];
  
  return (
    <div className={`rounded-xl p-4 sm:p-6 shadow-sm w-full block ${style.container} ${className}`}>
      {/* Header Section - Objetivo */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-500" />
          <span className={style.label + " font-medium"}>{t('goal.objective', 'Objetivo')}</span>
        </div>
        {creationDate && (
          <div className={`flex items-center ${style.dateLabel} text-xs sm:text-sm`}>
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            <span>{t('goal.created', 'Creado')}: {formattedDate}</span>
          </div>
        )}
      </div>

      {/* Scheduled Days Section */}
      {selectedDays && selectedDays.length > 0 && (
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-gray-700" />
            {t('balance.scheduledDays', 'Días programados')}
          </h3>
          <div className="flex justify-center gap-2">
            {WEEKDAYS.map(({ key, value }) => {
              const isActive = selectedDays.includes(value);
              return (
                <div
                  key={key}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500 text-white shadow-sm scale-105"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {key}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Main Counter */}
      <div className="text-center space-y-2 mb-6 relative">
        {/* Etiqueta "Meta establecida" ahora arriba del número */}
        {showGoalLabel && (
          <div className="flex justify-center mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style.goalLabel}`}>
              {t('goal.established', 'Meta establecida')}
            </span>
          </div>
        )}
        
        <div className={`text-4xl sm:text-5xl font-bold ${style.value}`}>{totalDays}</div>
        <p className={`${style.valueLabel} text-sm sm:text-base`}>{t('goal.days', 'días')}</p>
      </div>
      
      {/* Progress Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className={style.label + " font-medium"}>{t('goal.progress', 'Progreso')}</span>
          </div>
          <div className={`flex items-center ${style.percentage}`}>
            <span className="text-xs mr-1">↑</span>
            <span className="text-lg font-bold">{progressPercentage.toFixed(0)}%</span>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className={`relative h-3 w-full ${style.progressBar} rounded-full overflow-hidden`}>
          <div 
            className={`absolute h-3 ${style.progressFill} rounded-full transition-all duration-300 ease-in-out`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs sm:text-sm">
          {showDaysCompleted && (
            <div className="flex items-center">
              <span className={style.stats + " font-medium"}>
                {daysCompletedLabel || `${daysCompleted} ${t('goal.daysCompleted', 'completados')}`}
              </span>
            </div>
          )}
          <span className={style.stats + " font-medium"}>{daysRemaining} {t('goal.daysRemaining', 'días restantes')}</span>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressCard; 