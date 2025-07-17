"use client"

import React from 'react';
import { 
  Book, 
  Apple, 
  Coffee, 
  Moon, 
  Sun, 
  Heart, 
  Brain, 
  Dumbbell, 
  Music, 
  Pencil, 
  Code 
} from 'lucide-react';

export const HABIT_ICONS = {
  book: { icon: Book, label: 'Lectura' },
  apple: { icon: Apple, label: 'Alimentación' },
  coffee: { icon: Coffee, label: 'Café' },
  music: { icon: Music, label: 'Música' },
  code: { icon: Code, label: 'Programación' },
  dumbbell: { icon: Dumbbell, label: 'Ejercicio' },
  pencil: { icon: Pencil, label: 'Escritura' },
  brain: { icon: Brain, label: 'Estudio' },
  heart: { icon: Heart, label: 'Salud' },
  sun: { icon: Sun, label: 'Mañana' },
  moon: { icon: Moon, label: 'Noche' }
} as const;

export type HabitIconType = keyof typeof HABIT_ICONS;

export interface HabitIconProps {
  icon: React.ComponentType;
  label: string;
}
