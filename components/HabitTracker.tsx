"use client"

import React, { useState, useEffect, useRef, useCallback, Suspense, memo, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/primitives/tabs"
import 'simplebar-react/dist/simplebar.min.css';
import { 
  Habit, 
  HabitStatus, 
  GraphDataPoint, 
  BalanceData,  
  EditingHabit,
  MonthlyDataType,
  HabitWithPerformance, 
  ProgressDataPoint,
  ViewPeriodType,  
  DialogType,
  Task
} from "@/components/types/types";
import { DialogsContainer } from '@/components/layout/DialogsContainer';
import { SettingsTab } from '@/components/tabs/SettingsTab/SettingsTab';
import { useHabitManagement } from '@/components/custom-hooks/useHabitManagement';
import { useTranslation } from 'next-i18next';
import { TabNavigation } from '@/components/layout/TabNavigation';
import { HabitsTab } from '@/components/tabs/HabitsTab/HabitsTab';
import { PerformanceTab } from '@/components/tabs/PerformanceTab/PerformanceTab';
import { TasksTab } from '@/components/tabs/TasksTab/TasksTab';
import { DistributionTab } from '@/components/tabs/DistributionTab/DistributionTab';
import { ProfileTab } from '@/components/tabs/ProfileTab/ProfileTab';
import { useTheme } from 'next-themes';
import { generateTrendData } from '@/components/services/chartCalculations/trendCalculations';
import { useDialogStore, useDialogTransitions } from '@/components/services/dialogManagement/dialogService';
import { ChartEffectsService } from '@/components/services/effectsManagement/chartEffectsService';
import '@/components/ui/config/i18n';
import { changeLanguage } from '@/components/ui/config/i18n';
import { format } from 'date-fns';
import { AddItemButton } from '@/components/layout/AddItemButton';  
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useTaskManagement } from '@/components/custom-hooks/useTaskManagement';
import { profileService } from '@/src/supabase/services/profile.service';
import { supabase } from '@/src/supabase/config/client';
import { UpdateProfileDialog } from '@/components/dialogs/profile/UpdateProfileDialog';
import { createHabit, getHabits, habitService } from '@/src/supabase/services/habit.service';
import { useToast } from '@/components/ui/providers/toast/use-toast';
import { HabitMenu } from '@/components/dialogs/habits/habit-menu';
import { useHabitStore } from '@/store/useHabitStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useTimelineItems } from '@/components/custom-hooks/useTimelineItems';
import { logger } from '@/utils/logger';

interface PerformanceData {
  [key: string]: any;
}

const convertHabitStatus = (status: Record<string, any>): Record<string, import("@/components/types/types").HabitStatus> => {
  const converted: Record<string, import("@/components/types/types").HabitStatus> = {};
  
  Object.entries(status).forEach(([key, value]) => {
    const newStatus = value.status === "not-completed" ? "pending" : value.status;
    converted[key] = {
      ...value,
      status: newStatus as "" | "completed" | "pending"
    };
  });
  
  return converted;
};

interface HabitTrackerProps {
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}

interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  birthDate?: string;
  age?: number | undefined;
  gender?: string;
  country?: string;
  lastName?: string;
  joinDate?: string;
}

const HabitTracker = ({ userEmail, onSignOut }: HabitTrackerProps) => {
  // 1. Referencias y estados básicos primero
  const swipeRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { openDialog, closeDialog } = useDialogStore();
  
  // Agregar estados faltantes
  const [activeTab, setActiveTab] = useState("habits");
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const { t, i18n } = useTranslation();
  const [isAddHabitDialogOpen, setIsAddHabitDialogOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// 2. Estados de datos principales
  const {
    habits,
    habitStatus,
    currentDate,
    setCurrentDate,
    addHabit,
    deleteHabit,
    updateHabitStatus,
    updateHabit,
    setHabits,
    sortPreference,
    setSortPreference,
    getSortedHabits,
    showCompletedHabits,
    setShowCompletedHabits,
    blockFutureDates,
    setBlockFutureDates
  } = useHabitManagement();

  // 3. Estados de gráficos y datos
  const [balanceData, setBalanceData] = useState<BalanceData[]>([]);
  const [pieChartData, setPieChartData] = useState<{ name: string; value: number; color: string; }[]>([]);
  const [graphData, setGraphData] = useState<GraphDataPoint[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({});
  const [selectedHabitIndex, setSelectedHabitIndex] = useState<number | undefined>(undefined);

  // 4. Memoización de dependencias estables
  const chartDependencies = useMemo(() => ({
    habits,
    habitStatus,
    currentDate,
    selectedHabitIndex
  }), [habits, habitStatus, currentDate, selectedHabitIndex]);

  const chartSetters = useMemo(() => ({
    setBalanceData,
    setPieChartData,
    setGraphData,
    setPerformanceData
  }), []);

  // Agregar el hook de gestión de tareas
  const {
    addTask,
    toggleTaskStatus,
    deleteTask,
    updateTask,
    filteredTasks
  } = useTaskManagement(currentDate);

  // 5. Efectos
  const { initializeHabits } = useHabitStore();

  const { timelineItems } = useTimelineItems(currentDate);

  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      if (!mounted) return;
      try {
        // 🔧 CORRECCIÓN: Inicializar tanto hábitos como tareas al cargar la app
        const promises = [];
        
        if (habits.length === 0) {
          promises.push(initializeHabits());
        }
        
        // Agregar inicialización de tareas para que aparezcan en el horario del día
        const taskStore = useTaskStore.getState();
        if (taskStore.tasks.length === 0) {
          promises.push(taskStore.initializeTasks());
        }
        
        // Ejecutar ambas inicializaciones en paralelo
        await Promise.all(promises);
        
        setIsLoading(false);
      } catch (error) {
        logger.error('Error initializing app:', error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeApp();
    return () => { mounted = false; };
  }, [initializeHabits, habits.length]);

  useEffect(() => {
    // Mover actualizaciones aquí
  }, [habitStatus]);

  // Función para calcular la edad a partir de la fecha de nacimiento
  const calculateAge = (birthDate: string | undefined): number | undefined => {
    if (!birthDate) return undefined;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Actualizar la interfaz del estado
  const [user, setUser] = useState<UserProfile>({
    name: '',
    email: '',
    avatar: undefined,
    birthDate: undefined,
    gender: undefined,
    country: undefined,
    lastName: undefined,
    joinDate: undefined,
    id: undefined,
  });

  // Actualizar la función loadUserProfile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (userEmail) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userData.user.id)
              .single();
            
            if (profileData) {
              // Mapear correctamente los campos
              setUser({
                id: profileData.id,
                name: profileData.name || '',
                email: userEmail,
                lastName: profileData.last_name,
                birthDate: profileData.birth_date, // Asegúrate de que este mapeo sea correcto
                gender: profileData.gender,
                country: profileData.country,
                joinDate: profileData.created_at
              });
            }
          }
        } catch (error) {
          logger.error('Error loading user profile:', error);
        }
      }
    };
    
    loadUserProfile();
  }, [userEmail]);

  // Función para actualizar el perfil (actualizar)
  const updateUserProfile = async (formData: any) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        await profileService.updateProfile(authUser.id, {
          name: formData.userName,
          last_name: formData.userLastName,
          birth_date: formData.userBirthDate,
          gender: formData.userGender,
          country: formData.userCountry
        } as any);
        
        // Actualizar el estado local
        setUser({
          ...user,
          name: formData.userName,
          lastName: formData.userLastName,
          birthDate: formData.userBirthDate,
          age: calculateAge(formData.userBirthDate) as any,
          gender: formData.userGender,
          country: formData.userCountry
        });
      }
    } catch (error) {
      logger.error('Error updating user profile:', error);
    }
  };

  // Reemplazar la función handleUpdateProfile actual con esta versión
  const handleUpdateProfile = async (formData: any): Promise<boolean> => {
    try {
      // Prevenir comportamiento por defecto si es un evento
      if (formData && formData.preventDefault) {
        formData.preventDefault();
      }
      
      // Extraer los valores necesarios del formData
      const formValues = {
        userName: formData.userName || formData.get?.('userName'),
        userLastName: formData.userLastName || formData.get?.('userLastName'),
        userBirthDate: formData.userBirthDate || formData.get?.('userBirthDate'),
        userGender: formData.userGender || formData.get?.('userGender'),
        userCountry: formData.userCountry || formData.get?.('userCountry')
      };
      
      // Llamar a la función de actualización
      await updateUserProfile(formValues);
      
      // Cerrar el diálogo
      closeDialog('updateProfile');
      
      return true;
    } catch (error) {
      logger.error('Error updating profile:', error);
      return false;
    }
  };

  // Mover esta función antes del useMemo
  const handleDeleteHabit = async (habitId: string) => {
    logger.info('Attempting to delete habit with ID:', habitId);
    
    try {
      await useHabitStore.getState().deleteHabit(habitId);
      toast({
        title: "Hábito eliminado",
        description: "El hábito ha sido eliminado correctamente.",
      });
    } catch (error) {
      logger.error('Error deleting habit:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el hábito. Inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  // Agregar después de los estados y antes del renderizado
  const memoizedHabitsTabProps = useMemo(() => ({
    habits,
    habitStatus: convertHabitStatus(habitStatus),
    currentDate,
    setCurrentDate,
    handleHabitComplete: (habitIndex: number, dateString?: string) => {
      if (blockFutureDates) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(currentDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
          return;
        }
      }
      
      // Usar la fecha proporcionada o la fecha actual del componente
      const dateToUse = dateString || format(currentDate, 'yyyy-MM-dd');
      updateHabitStatus(habitIndex, dateToUse, 'completed');
    },
    generateGraphData: (habitIndex: number) => {
      return ChartEffectsService.generatePerformanceData(habits[habitIndex], convertHabitStatus(habitStatus), currentDate);
    },
    handleCalendarOpen: (habitIndex: number) => {
      openDialog('calendar', { habitId: habitIndex });
    },
    handleEditClick: (habit: Habit) => {
      openDialog('editHabit', { selectedHabit: habit });
    },
    deleteHabit: handleDeleteHabit,
    updateHabitDirectly: updateHabit,
    showCompletedHabits,
    sortPreference,
    searchQuery,
    setSearchQuery,
    
    hasNote: (index: number, date: string) => false,
    handleAddNote: () => {},
    user,
    setIsAddHabitDialogOpen,
    blockFutureDates,
    onDeleteHabit: handleDeleteHabit
  }), [
    habits, 
    habitStatus, 
    currentDate, 
    setCurrentDate, 
    updateHabitStatus, 
    openDialog, 
    handleDeleteHabit, 
    updateHabit, 
    showCompletedHabits, 
    sortPreference, 
    searchQuery, 
    user, 
    setIsAddHabitDialogOpen, 
    blockFutureDates
  ]);

  const memoizedPerformanceTabProps = useMemo(() => ({
    habits,
    habitStatus: convertHabitStatus(habitStatus),
    currentDate,
    generateGraphData: (habitIndex: number) => {
      return ChartEffectsService.generatePerformanceData(habits[habitIndex], convertHabitStatus(habitStatus), currentDate);
    },
    generateTrendData,
    deleteHabit,
    handleHabitSelect: (habit: Habit) => {
      const habitWithPerformance: HabitWithPerformance = {
        ...habit,
        performance: {
          completionRate: '0',
          consistencyRate: '0',
          completed: 0,
          partial: 0,
          notCompleted: 0
        }
      };
      openDialog('habitDetail', { habitId: habitWithPerformance.id });
    },
    searchQuery,
    setSearchQuery
  }), [habits, habitStatus, currentDate, deleteHabit, openDialog, searchQuery]);

  const memoizedTasksTabProps = useMemo(() => ({
    tasks: filteredTasks,
    taskSearchQuery: searchQuery,
    setTaskSearchQuery: setSearchQuery,
    currentDate,
    setCurrentDate,
    showCompleted,
    setShowCompleted,
    sortBy,
    setSortBy,
    onToggleStatus: toggleTaskStatus,
    onDeleteTask: deleteTask,
    onUpdateTask: updateTask
  }), [filteredTasks, searchQuery, currentDate, setCurrentDate, showCompleted, sortBy, toggleTaskStatus, deleteTask, updateTask]);

  const profileTabProps = {
    user: {
      ...user,
      name: user.name || '',
      email: user.email || '',
      gender: user.gender || '',
      country: user.country || '',
    },
    searchQuery,
    setSearchQuery,
    onUpdateProfile: () => openDialog('updateProfile'),
    onSignOut: onSignOut || (() => {})
  };

  const settingsTabProps = {
    i18n,
    theme,
    setTheme,
    showMoreSettings,
    setShowMoreSettings,
    sortPreference,
    setSortPreference,
    showCompletedHabits,
    setShowCompletedHabits,
    blockFutureDates,
    setBlockFutureDates
  };

  const { updateHabit: updateHabitInStore } = useHabitStore();

  const dialogContainerProps = {
    habits,
    habitStatus: convertHabitStatus(habitStatus),
    currentDate,
    generateGraphData: (habitIndex: number, type = 'monthly') => {
      if (habitIndex === undefined || habitIndex < 0 || habitIndex >= habits.length) {
        logger.warn(`Invalid habit index: ${habitIndex}`);
        return [];
      }
      
      const habit = habits[habitIndex];
      logger.debug('Generating graph data for habit:', {
        index: habitIndex,
        id: habit.id,
        supabase_id: habit.supabase_id,
        name: habit.name,
        type
      });
      
      if (!habit.supabase_id) {
        logger.warn(`Habit at index ${habitIndex} is missing supabase_id:`, habit);
      }
      
      return ChartEffectsService.generatePerformanceData(habit, convertHabitStatus(habitStatus), currentDate);
    },
    addHabit,
    updateHabit: async (habit: EditingHabit) => {
      try {
        logger.info('Attempting to update habit:', habit);
        const result = await updateHabitInStore(habit.id.toString(), habit);
        if (result.success) {
          closeDialog('editHabit');
          toast({
            title: "Hábito actualizado",
            description: "Los cambios han sido guardados exitosamente",
            variant: "success"
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        logger.error('Error updating habit:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el hábito",
          variant: "destructive"
        });
      }
    },
    closeDialog,
    user,
    setUser,
    dialogs: {
      updateProfile: {
        component: UpdateProfileDialog,
        props: {
          user: user,
          updateUserProfile: handleUpdateProfile
        }
      }
    }
  };

  // Reemplazar la función handleAddTask actual con la que usa el hook
  const handleAddTask = useCallback(async (task: Omit<Task, "id" | "createdAt">) => {
    const taskWithDefaults = {
      ...task,
      time_exceptions: task.time_exceptions || {}
    };
    
    await useTaskStore.getState().addTask(taskWithDefaults as any);
    
    const event = new CustomEvent('forceTasksRefresh', {
      detail: { date: task.dueDate }
    });
    window.dispatchEvent(event);
  }, []);

  const handleHelpClick = () => {
    openDialog('help', {});
  };

  // Añadir esta línea cerca del inicio del componente HabitTracker
  const { toast } = useToast();

  // Luego el resto del código puede usar toast normalmente
  const handleAddHabit = async (habit: Omit<Habit, "id" | "index">) => {
    try {
      if (!user?.id) {
        logger.error('No authenticated user found');
        return;
      }

      const { success, data: newHabit, error } = await habitService.createHabit(user.id, habit);
      if (!success || error) throw error;

      // Actualizar el store con el nuevo hábito
      if (newHabit) {
        addHabit(newHabit);
      }

      // No mostrar el toast de éxito ya que tenemos el diálogo de felicitaciones

    } catch (error) {
      logger.error('Error al crear hábito:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el hábito. Por favor, inténtalo de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // 🔧 OPTIMIZACIÓN: Solo cargar tareas si no están ya cargadas y no se están cargando
    // (ahora que se cargan automáticamente en initializeApp, esto es principalmente redundancia/seguridad)
    if (value === 'tasks') {
      const taskStore = useTaskStore.getState();
      
      if (taskStore.tasks.length === 0 && !taskStore.loading) {
        taskStore.setLoading(true);
        
        setTimeout(() => {
          taskStore.initializeTasks();
        }, 50);
      }
    }
  };

  // Añadir este useEffect en HabitTracker.tsx
  useEffect(() => {
    logger.debug('Active tab changed to:', activeTab);
  }, [activeTab]);

  // 6. Renderizado condicional
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
      </div>
    );
  }

  // 7. Renderizado principal
  return (
    <div ref={swipeRef}>
      <div className="container mx-auto p-4 pb-20 md:pb-4 md:pl-20 relative">
        <Tabs 
          value={activeTab} 
          onValueChange={handleTabChange} 
          defaultValue="habits" 
          className="w-full"
        >
          <TabNavigation 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentDate={currentDate}
            habits={habits}
            habitStatus={convertHabitStatus(habitStatus)}
            setMobileMenuOpen={setMobileMenuOpen}
            onAddHabit={handleAddHabit}
            onAddTask={handleAddTask}
            selectedDate={currentDate}
            onHelpClick={handleHelpClick}
          />
          
          <TabsContent value="habits">
            <HabitsTab {...memoizedHabitsTabProps} />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTab {...memoizedPerformanceTabProps} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksTab 
              taskSearchQuery={searchQuery}
              setTaskSearchQuery={setSearchQuery}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              showCompleted={showCompleted}
              setShowCompleted={setShowCompleted}
              sortBy={sortBy}
              setSortBy={setSortBy}
              isActive={activeTab === 'tasks'}
            />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionTab 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              currentDate={currentDate}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileTab {...profileTabProps} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab {...settingsTabProps} />
          </TabsContent>
        </Tabs>

        <MobileMenu 
          isOpen={mobileMenuOpen}
          setIsOpen={setMobileMenuOpen}
          onSettingsClick={() => setActiveTab('settings')}
          onProfileClick={() => setActiveTab('profile')}
          onHelpClick={handleHelpClick}
          user={user}
          setActiveTab={setActiveTab}
        />

        <DialogsContainer {...dialogContainerProps} />
        
        {/* Botón flotante solo visible en móvil */}
        <div className="fixed bottom-20 right-6 z-50 md:hidden">
          <AddItemButton 
            onAddHabit={handleAddHabit}
            onAddTask={handleAddTask}
            selectedDate={currentDate}
            variant="default"
            size="icon"
            className="w-14 h-14 shadow-lg flex items-center justify-center bg-[#1c1c1c] hover:bg-[#2c2c2c] text-white dark:bg-gray-800 dark:hover:bg-gray-700 rounded-2xl"
          />
        </div>

        <BottomNavigation 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
        />
      </div>
    </div>
  );
};

// Exportar componente memoizado
export default memo(HabitTracker);