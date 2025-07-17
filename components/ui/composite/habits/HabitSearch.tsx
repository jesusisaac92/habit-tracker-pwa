import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/primitives/button';

interface SearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  className?: string;
  placeholder?: string;
}

export const SearchInput: React.FC<SearchProps> = ({
  searchQuery,
  setSearchQuery,
  className = '',
  placeholder
}) => {
  const { t } = useTranslation();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsSearchExpanded(false);
    setSearchQuery('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target as Node) && 
        isSearchExpanded && 
        !searchQuery // Solo cierra si no hay texto en la búsqueda
      ) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchExpanded, searchQuery]);

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Icono de lupa (visible cuando la búsqueda no está expandida) */}
      {!isSearchExpanded && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSearchExpanded(true)}
          className="w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm 
            shadow-sm hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all"
        >
          <Search className="h-4 w-4 text-gray-700 dark:text-gray-200" />
        </Button>
      )}

      {/* Campo de búsqueda expandido */}
      {isSearchExpanded && (
        <div className="absolute right-0 top-0 z-10 animate-in fade-in slide-in-from-top-5 duration-200">
          <div className="relative flex items-center">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={placeholder || t('habits.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-[200px] sm:w-[250px] pl-8 pr-8 py-2 text-sm 
                border border-gray-200 dark:border-gray-700 
                rounded-lg bg-white dark:bg-gray-800 
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                shadow-lg transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={handleClose}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 
                  text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};