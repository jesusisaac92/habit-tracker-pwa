import { useEffect, useRef, useCallback } from 'react';
import debounce from 'lodash/debounce';

interface UseMenuEffectsProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const useMenuEffects = ({ isOpen, setIsOpen }: UseMenuEffectsProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  const debouncedClose = useCallback(
    debounce(() => setIsOpen(false), 100),
    [setIsOpen]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      debouncedClose.cancel();
    };
  }, [isOpen, debouncedClose]);

  return { menuRef, debouncedClose };
}; 