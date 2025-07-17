import React from 'react';
import { useTranslation } from 'react-i18next';
import StreakProgressBarVertical from './StreakProgressBarVertical';

interface StreakStatCardVerticalProps {
  title: string;
  currentStreak: number;
  recordStreak: number;
  icon?: React.ReactNode;
  className?: string;
  iconBgColor?: string;
}

const StreakStatCardVertical: React.FC<StreakStatCardVerticalProps> = ({
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
      
      <div className="flex items-center">
        <StreakProgressBarVertical 
          currentStreak={currentStreak} 
          recordStreak={recordStreak}
          height={100}
        />
      </div>
    </div>
  );
};

export default StreakStatCardVertical; 