"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/primitives/loading/LoadingSpinner';
import HabitTracker from '@/components/HabitTracker';

// Crear un componente de layout para la página de hábitos
const HabitsPageLayout = ({ children }: { children: React.ReactNode }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Verificar si ya tenemos datos en el store
    const hasInitialized = localStorage.getItem('habit-storage');
    if (hasInitialized) {
      setIsDataLoaded(true);
      return;
    }

    const preloadData = async () => {
      try {
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error al cargar datos de hábitos:', error);
        setIsDataLoaded(true);
      }
    };

    preloadData();
  }, [user, router]);

  if (!isDataLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return children;
};

// Página principal de hábitos
export default function HabitsPage() {
  const { user } = useAuth();
  
  if (!user) {
    return null;
  }

  return (
    <HabitsPageLayout>
      <HabitTracker userEmail={user.email} />
    </HabitsPageLayout>
  );
} 