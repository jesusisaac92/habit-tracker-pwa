import { useEffect, useRef } from 'react';
import debounce from 'lodash/debounce';

export function useDebounce<T>(value: T, delay: number): T {
  const ref = useRef(value);

  const debouncedSetValue = useRef(
    debounce((newValue: T) => {
      ref.current = newValue;
    }, delay)
  ).current;

  useEffect(() => {
    debouncedSetValue(value);
    
    return () => {
      debouncedSetValue.cancel();
    };
  }, [value, debouncedSetValue]);

  return ref.current;
} 