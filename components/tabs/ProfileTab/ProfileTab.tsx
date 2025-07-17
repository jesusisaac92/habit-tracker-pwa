import React from 'react';
import { Button } from "@/components/ui/primitives/button";
import { Menu, Plus, LogOut, Edit, Calendar, Globe, Clock } from "lucide-react";
import { useTranslation } from 'next-i18next';
import { SearchInput } from "@/components/ui/composite/habits/HabitSearch";
import { Card, CardContent } from "@/components/ui/primitives/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/primitives/avatar";
import { useHabitStore } from "@/store/useHabitStore";
import { logger } from '@/utils/logger';

// Función para calcular la edad a partir de la fecha de nacimiento
const calculateAge = (birthDate: string | undefined): number | undefined => {
  if (!birthDate) return undefined;
  
  try {
    // Asegurarse de que estamos trabajando con una fecha en formato YYYY-MM-DD
    const parts = birthDate.split('T')[0].split('-');
    if (parts.length !== 3) return undefined;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Los meses en JavaScript son 0-11
    const day = parseInt(parts[2]);
    
    // Crear la fecha con la hora establecida a mediodía
    const birth = new Date(year, month, day, 12, 0, 0);
    const today = new Date();
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (e) {
    logger.error('Error calculando edad:', e);
    return undefined;
  }
};

interface ProfileTabProps {
  user: {
    name: string;
    email: string;
    birthDate?: string;
    gender: string | undefined;
    country: string | undefined;
    lastName?: string;
    joinDate?: string;
  };
  onUpdateProfile: () => void;
  onSignOut: () => void;
}

export function ProfileTab({ user, onSignOut, onUpdateProfile }: ProfileTabProps) {
  const { t } = useTranslation();
  const { clearHabits } = useHabitStore();
  
  // Calcular la edad a partir de la fecha de nacimiento
  const age = calculateAge(user.birthDate);
  
  logger.debug('Datos completos del usuario en ProfileTab:', user);
  
  // Función para formatear la fecha correctamente
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    
    try {
      // Asegurarse de que estamos trabajando con una fecha en formato YYYY-MM-DD
      const parts = dateString.split('T')[0].split('-');
      if (parts.length !== 3) return '-';
      
      // Crear la fecha con la hora establecida a mediodía para evitar problemas de zona horaria
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Los meses en JavaScript son 0-11
      const day = parseInt(parts[2]);
      
      // Crear la fecha con la hora establecida a mediodía
      const date = new Date(year, month, day, 12, 0, 0);
      
      // Formatear la fecha en el formato local (DD/MM/YYYY)
      return date.toLocaleDateString();
    } catch (e) {
      logger.error('Error formateando fecha:', e);
      return '-';
    }
  };
  
  const handleSignOut = async () => {
    try {
      // 1. Limpiar el estado de los hábitos
      clearHabits();

      // 2. Limpiar localStorage
      localStorage.clear();

      // 3. Llamar a la función original de signOut
      await onSignOut();
    } catch (error) {
      logger.error('Error al cerrar sesión:', error);
    }
  };
  
  return (
    <div className="p-4 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {user.name} {user.lastName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="text-gray-400 dark:text-gray-500 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                Fecha de nacimiento
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {formatDate(user.birthDate)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe className="text-gray-400 dark:text-gray-500 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
                País
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {user.country || '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 md:flex md:justify-start md:space-x-4 space-y-3 md:space-y-0">
          <button
            onClick={onUpdateProfile}
            className="w-full md:w-auto flex items-center justify-center gap-2 py-3 md:py-2 px-4 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Edit size={18} />
            <span>Editar Perfil</span>
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full md:w-auto flex items-center justify-center gap-2 py-3 md:py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
} 