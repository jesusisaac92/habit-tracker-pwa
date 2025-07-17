import { useTranslation } from 'next-i18next';

interface TaskStatisticsProps {
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
}

export const TaskStatistics = ({ completedTasks, totalTasks, completionRate }: TaskStatisticsProps) => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('tasks.statistics.title')}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
          <span>{t('tasks.statistics.completed', { completed: completedTasks, total: totalTasks })}</span>
          <span>{t('tasks.statistics.rate', { rate: completionRate })}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
    </div>
  );
}; 