"use client"

import { useTaskLabels } from '@/components/dialogs/tasks/useTaskLabels';
import { TaskLabel, Task } from '@/components/types/types';
import { useTranslation } from 'next-i18next';

const getTaskBackgroundColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 dark:bg-red-900/30';
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30';
    default:
      return 'bg-green-100 dark:bg-green-900/30';
  }
};

export const TaskContainer = ({ task, ...props }: { task: Task } & React.HTMLProps<HTMLDivElement>) => {
  const { t } = useTranslation();
  const { labels } = useTaskLabels();
  
  const taskLabel = labels.find((label: TaskLabel) => label.id === task.label);

  return (
    <div
      className={`p-4 rounded-lg mb-2 relative ${getTaskBackgroundColor(task.priority)}`}
      {...props}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-lg">{task.title}</h3>
          {task.label && taskLabel && (
            <div className="flex items-center gap-2 mt-1">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: taskLabel.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                #{t(`tasks.labels.${task.label}`)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 