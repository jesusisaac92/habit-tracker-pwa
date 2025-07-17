import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import { 
  ListChecks, 
  BarChart2, 
  CheckSquare, 
  User, 
  Settings,
  HelpCircle,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SideNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onHelpClick?: () => void;
}

export const SideNavigation: React.FC<SideNavigationProps> = ({
  activeTab,
  setActiveTab,
  onHelpClick
}) => {
  const { t } = useTranslation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navItems = [
    { id: "habits", name: t('navigation.habits'), icon: ListChecks },
    { id: "performance", name: t('navigation.performance'), icon: BarChart2 },
    { id: "tasks", name: t('navigation.tasks'), icon: CheckSquare },
    { id: "distribution", name: t('navigation.distribution'), icon: PieChart },
    { id: "profile", name: t('navigation.profile'), icon: User },
    { id: "settings", name: t('navigation.settings'), icon: Settings }
  ];

  return (
    <div className="hidden md:flex flex-col items-center fixed left-0 top-0 h-full w-16 bg-white dark:bg-gray-900 border-r dark:border-gray-800 shadow-sm z-40">
      <div className="flex flex-col items-center justify-between py-6 w-full h-full">
        <div className="flex flex-col items-center">
          <div className="mb-8 w-8 h-8 relative">
            <Image
              src="/logo.svg"
              alt="HT Logo"
              fill
              className="text-black dark:text-white"
              priority
            />
          </div>
          
          <div className="flex flex-col space-y-6 items-center">
            {navItems.map((item) => (
              <div 
                key={item.id}
                className="relative"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                    activeTab === item.id 
                      ? "bg-black dark:bg-white text-white dark:text-black shadow-md" 
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5",
                    activeTab === item.id ? "stroke-[2px]" : "stroke-[1.5px]"
                  )} />
                </button>
                
                <AnimatePresence>
                  {hoveredItem === item.id && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-16 top-1/2 transform -translate-y-1/2 z-50"
                    >
                      <div className="relative">
                        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-black dark:bg-gray-800"></div>
                        <div className="bg-black dark:bg-gray-800 text-white dark:text-gray-100 px-3 py-1.5 rounded-md whitespace-nowrap text-sm font-medium shadow-lg">
                          {item.name}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
        
        {/* Botón de ayuda en la parte inferior */}
        <div 
          className="relative mb-6"
          onMouseEnter={() => setHoveredItem("help")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <button
            onClick={onHelpClick}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <HelpCircle className="h-5 w-5 stroke-[1.5px]" />
          </button>
          
          <AnimatePresence>
            {hoveredItem === "help" && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-16 top-1/2 transform -translate-y-1/2 z-50"
              >
                <div className="relative">
                  <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-black dark:bg-gray-800"></div>
                  <div className="bg-black dark:bg-gray-800 text-white dark:text-gray-100 px-3 py-1.5 rounded-md whitespace-nowrap text-sm font-medium shadow-lg">
                    {t('menu.help')}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}; 