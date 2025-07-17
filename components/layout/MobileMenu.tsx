import React, { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/primitives/button";  
import { X } from "lucide-react";
import Image from 'next/image';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { animated, useSpring } from 'react-spring';
import { useDrag } from '@use-gesture/react';

interface MobileMenuProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  onHelpClick: () => void;
  user: any;
  setActiveTab: (tab: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  setIsOpen,
  onSettingsClick,
  onProfileClick,
  onHelpClick,
  user,
  setActiveTab
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [{ x }, api] = useSpring(() => ({ 
    x: isOpen ? 0 : -320,
    config: { tension: 300, friction: 30 }
  }));

  useEffect(() => {
    api.start({ x: isOpen ? 0 : -320 });
  }, [isOpen, api]);

  const bind = useDrag(({ movement: [mx], down }) => {
    if (down) {
      api.start({ x: Math.min(0, mx), immediate: true });
    } else {
      if (mx < -50) {
        setIsOpen(false);
        api.start({ x: -320 });
      } else {
        api.start({ x: 0 });
      }
    }
  });

  const closeMenu = () => {
    api.start({ 
      x: -320,
      config: { tension: 300, friction: 30 }
    });
    
    setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  const handleItemClick = (id: string) => {
    switch (id) {
      case 'habits':
      case 'performance':
      case 'tasks':
      case 'distribution':
      case 'profile':
        setActiveTab(id);
        break;
      case 'settings':
        setActiveTab('settings');
        onSettingsClick();
        break;
    }
    closeMenu();
  };

  const menuItems = [
    { id: "habits", name: t('menu.habits'), icon: LucideIcons.ListChecks },
    { id: "performance", name: t('menu.performance'), icon: LucideIcons.BarChart2 },
    { id: "tasks", name: t('menu.tasks'), icon: LucideIcons.CheckSquare },
    { id: "distribution", name: t('menu.distribution'), icon: LucideIcons.PieChart },
    { id: "profile", name: t('menu.profile'), icon: LucideIcons.User },
    { id: "settings", name: t('menu.settings'), icon: LucideIcons.Settings }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        api.start({ 
          x: -320,
          config: { tension: 300, friction: 30 }
        });
        setTimeout(() => {
          setIsOpen(false);
        }, 300);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen, api]);

  return (
    isOpen ? (
      <animated.div 
        {...bind()}
        ref={menuRef}
        style={{ 
          transform: x.to((x) => `translateX(${x}px)`),
          touchAction: 'pan-y'
        }}
        className="md:hidden fixed top-0 left-0 w-64 h-full bg-white dark:bg-gray-900 shadow-lg z-50"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="w-8 h-8 relative">
              <Image
                src="/logo.svg"
                alt="Logo"
                fill
                className="text-black dark:text-white"
                priority
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMenu}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              aria-label={t('menu.close')}
            >
              <X className="h-6 w-6 dark:text-white" />
            </Button>
          </div>
          <nav className="flex-grow">
            {menuItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => handleItemClick(item.id)}
                className="w-full justify-start text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white transition-colors duration-200"
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span>{item.name}</span>
              </Button>
            ))}
          </nav>
          <div className="p-4 border-t dark:border-gray-700">
            <Button 
              variant="outline" 
              className="w-full dark:text-white dark:hover:bg-gray-800" 
              onClick={onHelpClick}
            >
              <LucideIcons.HelpCircle className="mr-2 h-5 w-5" />
              {t('menu.help')}
            </Button>
          </div>
        </div>
      </animated.div>
    ) : null
  );
}; 