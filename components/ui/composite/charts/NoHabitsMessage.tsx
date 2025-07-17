import React from 'react';
import { useTranslation } from 'next-i18next';

interface NoHabitsMessageProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const NoHabitsMessage: React.FC<NoHabitsMessageProps> = ({
  title,
  description,
  icon
}) => {
  const { t } = useTranslation();
  
  const defaultIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="64" 
      height="64" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="text-gray-400 mb-4"
    >
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path>
      <path d="M10 2c1 .5 2 2 2 5"></path>
    </svg>
  );
  
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
      {icon || defaultIcon}
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
        {title || t('balance.noHabitsTitle') || 'No hay hábitos para mostrar'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {description || t('balance.noHabitsDescription') || 'Crea tu primer hábito para comenzar a ver estadísticas en esta gráfica.'}
      </p>
    </div>
  );
};

export default NoHabitsMessage;
