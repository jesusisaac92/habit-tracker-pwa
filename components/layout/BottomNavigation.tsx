import React from 'react';
import { useTranslation } from 'next-i18next';
import { 
  ListChecks, 
  BarChart2, 
  CheckSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileMenuOpen: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen
}) => {
  const { t } = useTranslation();

  const navItems = [
    { id: "habits", name: t('menu.habits'), icon: ListChecks },
    { id: "performance", name: t('menu.performance'), icon: BarChart2 },
    { id: "tasks", name: t('menu.tasks'), icon: CheckSquare }
  ];

  return (
    <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-lg z-40 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full px-1",
              "transition-colors duration-200",
              activeTab === item.id 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 mb-1",
              activeTab === item.id ? "stroke-[2.5px]" : "stroke-[1.5px]"
            )} />
            <span className="text-xs font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};