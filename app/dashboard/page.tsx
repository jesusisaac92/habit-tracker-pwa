"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/supabase/config/client';
import { ProfileFormDialog } from '@/components/dialogs/profile/ProfileFormDialog';
import HabitTracker from '@/components/HabitTracker';
import { profileService } from '@/src/supabase/services/profile.service';
import { LoadingSpinner } from '@/components/ui/primitives/loading/LoadingSpinner';
import { habitService } from '@/src/supabase/services/habit.service';
import { useHabitStore } from '@/store/useHabitStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useTimelineItems } from '@/components/custom-hooks/useTimelineItems';

interface ProfileFormElements extends HTMLFormControlsCollection {
  userName: HTMLInputElement;
  userLastName: HTMLInputElement;
  userBirthDate: HTMLInputElement;
  userGender: HTMLInputElement;
  userCountry: HTMLInputElement;
}

// Definir un tipo para el perfil
interface Profile {
  id?: string;
  name?: string;
  last_name?: string;
  birth_date?: string | null;
  gender?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [currentDate] = useState(() => new Date());
  const { initializeHabits } = useHabitStore();
  const { tasks, updateTask, deleteTask } = useTaskStore();
  const { timelineItems } = useTimelineItems(currentDate);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    try {
      // Extraer los datos del formulario con casting de tipo
      const elements = event.currentTarget.elements as ProfileFormElements;
      const userName = elements.userName.value;
      const userLastName = elements.userLastName.value;
      const userBirthDate = elements.userBirthDate.value;
      const userGender = elements.userGender.value;
      const userCountry = elements.userCountry.value;
      
      // Actualizar el perfil en la base de datos
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: userName,
            last_name: userLastName,
            birth_date: userBirthDate,
            gender: userGender,
            country: userCountry,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          return;
        }
        
        setShowProfileForm(false);
        // Actualizar el perfil en el estado local
        setProfile(prev => ({
          ...prev,
          name: userName,
          last_name: userLastName,
          birth_date: userBirthDate,
          gender: userGender,
          country: userCountry,
          updated_at: new Date().toISOString()
        }));
      }
    } catch (error) {
      // Error silencioso en producción
    }
  };

  useEffect(() => {
    // Verificación más simple de usuario
    const checkAuth = async () => {
      if (!loading && !user) {
        console.log('No user found, redirecting to login...')
        router.replace('/login');
      } else if (user) {
        console.log('User found:', user.email)
      }
    }
    
    checkAuth()
  }, [user, loading, router]);

  useEffect(() => {
    const checkUser = async () => {
      if (!user) return;
      
      try {
        setIsCreatingProfile(true);
        
        // Buscar perfil existente
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          setError(true);
          return;
        }

        if (profileData) {
          setProfile(profileData);
          return;
        }

        // Si no hay perfil, intentar crear uno con los datos del localStorage
        const userData = localStorage.getItem('userData');
        
        if (userData) {
          const parsedData = JSON.parse(userData);
          
          // Crear perfil con datos del localStorage
          const { data: newProfile, error: createError } = await profileService.createProfile(user.id, {
            name: parsedData.firstName || '',
            last_name: parsedData.lastName || ''
          });

          if (createError) {
            setError(true);
          } else if (newProfile) {
            setProfile(newProfile);
            localStorage.removeItem('userData');
            
            // Si el perfil es muy básico, mostrar el formulario para completarlo
            if (!newProfile.birth_date && !newProfile.gender && !newProfile.country) {
              setShowProfileForm(true);
            }
          } else {
            setError(true);
          }
        } else {
          // Si no hay datos en localStorage, crear un perfil mínimo
          
          const { data: newProfile, error: createError } = await profileService.createProfile(user.id, {
            name: '',
            last_name: ''
          });
          
          if (createError) {
            setError(true);
          } else if (newProfile) {
            setProfile(newProfile);
            // Mostrar formulario para completar el perfil
            setShowProfileForm(true);
          } else {
            setError(true);
          }
        }
      } catch (error) {
        setError(true);
      } finally {
        setIsCreatingProfile(false);
      }
    };
    
    checkUser();
  }, [user]);

  const handleDeleteHabit = async (habitId: string) => {
    const result = await habitService.deleteHabit(habitId);
    
    if (!result.success) {
      // Manejo silencioso de errores en producción
    }
  };

  if (loading || isCreatingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Error al cargar el perfil</p>
        <button 
          onClick={() => router.push('/login')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Volver al login
        </button>
      </div>
    );
  }

  if (profile) {
    return (
      <div className="min-h-screen">
        {showProfileForm && user && (
          <ProfileFormDialog
            isOpen={showProfileForm}
            onOpenChange={setShowProfileForm}
            user={user}
            updateUserProfile={async (e) => {
              await handleProfileUpdate(e);
              return true;
            }}
            mode="onboarding"
            onSubmit={async (e) => {
              e.preventDefault();
              await handleProfileUpdate(e);
              return true;
            }}
          />
        )}
        <HabitTracker 
          userEmail={user?.email || ''} 
          onSignOut={handleSignOut}
        />
      </div>
    );
  }

  // Estado de carga mientras se obtiene el perfil
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <LoadingSpinner size="lg" />
    </div>
  );
} 