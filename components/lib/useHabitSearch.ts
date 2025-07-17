import { useState, useMemo } from 'react';
import { Habit } from '../types/types';

export const useHabitSearch = (habits: Habit[]) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHabits = useMemo(() => {
    return habits.filter(habit => 
      habit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      habit.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [habits, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredHabits
  };
};