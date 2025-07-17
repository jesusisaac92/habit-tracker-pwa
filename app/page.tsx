"use client"

import { useAuth } from '@/src/supabase/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/primitives/loading/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    // Solo redirigir si es la primera carga
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else {
        router.replace('/dashboard');
      }
      // Después de la primera redirección, no volver a redirigir
      setIsRedirecting(false);
    }
  }, [user, loading, router]);

  // Si ya hemos iniciado una redirección, no mostrar nada para evitar parpadeos
  if (!isRedirecting) return null;

  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
}