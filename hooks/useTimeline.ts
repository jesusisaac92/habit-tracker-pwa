import React, { useCallback } from 'react';

const handleStorageChange = useCallback((e: StorageEvent) => {
  if (e.key === 'habitStatus') {
    // Evitar actualizaciones recursivas
    const newStatus = JSON.parse(e.newValue || '{}');
    if (JSON.stringify(newStatus) !== JSON.stringify(habitStatus)) {
      setHabitStatus(newStatus);
    }
  }
}, [habitStatus]); 