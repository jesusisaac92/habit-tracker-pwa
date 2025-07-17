import React from 'react';
import { useTranslation } from 'react-i18next';
import StreakProgressBar from './StreakProgressBar';

interface StreakStatCardProps {
  title: string;
  currentStreak: number;
  recordStreak: number;
  icon?: React.ReactNode;
  className?: string;
  iconBgColor?: string;
}

const StreakStatCard: React.FC<StreakStatCardProps> = ({
  title,
  currentStreak,
  recordStreak,
  icon,
  className = '',
  iconBgColor = 'bg-blue-100 dark:bg-blue-900',
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        {icon && (
          <div className={`p-2 rounded-full ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {currentStreak} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('common.days', 'días')}</span>
        </div>
        {recordStreak > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('common.record', 'Récord')}: {recordStreak} {t('common.days', 'días')}
          </div>
        )}
      </div>
      
      <StreakProgressBar 
        currentStreak={currentStreak} 
        recordStreak={recordStreak}
      />
    </div>
  );
};

export default StreakStatCard; 