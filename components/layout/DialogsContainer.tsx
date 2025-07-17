import React, { useState } from 'react';
import { useDialogStore, DialogType, DialogData } from '@/components/services/dialogManagement/dialogService';
import dynamic from 'next/dynamic';
import { Habit, HabitStatus, EditingHabit, Difficulty } from '@/components/types/types';
import { generatePreviousMonthData } from '@/components/services/chartCalculations/previousMonthCalculations';
import { generateHabitStatusDistribution } from '@/components/services/chartCalculations/habitStatusDistributionCalculations';
import { HabitContinueDialog } from '@/components/dialogs/habits/HabitContinueDialog';
import { HabitEndDialog } from '@/components/dialogs/habits/HabitEndDialog';
import { useToast } from '@/components/ui/providers/toast/use-toast';
import { useTranslation } from 'react-i18next';
import { ProfileFormDialog } from '@/components/dialogs/profile/ProfileFormDialog';
import { supabase } from '@/src/supabase/config/client';
import { updateBirthDate, updateProfileDirectly } from '@/src/supabase/services/profile.service';
import { habitService } from '@/src/supabase/services/habit.service';

// Importación dinámica de diálogos
const DialogComponents: Record<DialogType, any> = {
  addHabit: dynamic(
    () => import('@/components/dialogs/habits/AddHabitDialog').then(mod => mod.default)
  ),
  habitCompleted: dynamic(
    () => import('@/components/dialogs/habits/HabitCompletedDialog').then(mod => ({ default: mod.HabitCompletedDialog }))
  ),
  habitEnd: dynamic(
    () => import('@/components/dialogs/habits/HabitEndDialog').then(mod => ({ default: mod.HabitEndDialog }))
  ),
  habitContinue: dynamic(
    () => import('@/components/dialogs/habits/HabitContinueDialog').then(mod => ({ default: mod.HabitContinueDialog }))
  ),
  help: dynamic(
    () => import('@/components/dialogs/common/HelpDialog').then(mod => ({ default: mod.HelpDialog }))
  ),
  updateProfile: dynamic(
    () => import('@/components/dialogs/profile/UpdateProfileDialog').then(mod => mod.UpdateProfileDialog)
  ),
  graph: dynamic(
    () => import('@/components/dialogs/performance/PerformanceGraphDialog').then(mod => ({ default: mod.default }))
  ),
  balance: dynamic(
    () => import('@/components/dialogs/performance/BalanceDialog').then(mod => ({ default: mod.BalanceDialog }))
  ),
  habitPieChart: dynamic(
    () => import('@/components/dialogs/performance/PerformanceGraphDialog').then(mod => ({ default: mod.default }))
  ),
  progressTrend: dynamic(
    () => import('@/components/dialogs/performance/HabitsProgressTrendDialog').then(mod => ({ default: mod.HabitsProgressTrendDialog }))
  ),
  habitDetail: dynamic(
    () => import('@/components/dialogs/habits/HabitDetailDialog').then(mod => ({ 
      default: mod.HabitDetailDialog 
    }))
  ),
  calendar: dynamic(
    () => import('@/components/dialogs/common/CalendarDialog').then(mod => ({ default: mod.CalendarDialog }))
  ),
  editHabit: dynamic(
    () => import('@/components/dialogs/habits/EditHabitDialog').then(mod => ({ default: mod.EditHabitDialog }))
  ),
  annualPerformance: dynamic(() => import('@/components/dialogs/performance/AnnualPerformanceDialog'))
} as const;

interface BaseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data?: DialogData;
  user?: any;
}

interface DialogsContainerProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  user: any;
  setUser: (user: any) => void;
  generateGraphData?: (index: number, type: 'monthly' | 'annual') => any[];
  addHabit: (habit: Omit<Habit, "id" | "index">) => void;
  updateHabit: (habit: Habit) => void;
}

type DialogComponentProps = {
  addHabit: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onAddHabit: (habit: Omit<Habit, "id" | "index">) => void;
    user: any;
  };
  habitEnd: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    habit: Habit;
    onContinue: (habit: Habit) => void;
    onStop: () => void;
    deleteHabit: (index: number) => void;
  };
  [key: string]: any;
};

type DialogMap = {
  addHabit: typeof DialogComponents['addHabit'];
  habitEnd: typeof DialogComponents['habitEnd'];
  [key: string]: any;
};

export const DialogsContainer: React.FC<DialogsContainerProps> = ({
  habits,
  habitStatus,
  currentDate,
  user,
  setUser,
  generateGraphData,
  addHabit,
  updateHabit,
  ...commonProps
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { dialogStack, closeDialog, selectedHabit } = useDialogStore();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const getDialogProps = (type: DialogType, data?: DialogData): BaseDialogProps & Record<string, any> => {
    const baseProps = {
      isOpen: true,
      onOpenChange: (open: boolean) => {
        if (!open) closeDialog(type);
      },
      data,
      user,
      ...commonProps
    };

    switch (type) {
      case 'habitDetail':
        const habitId = data?.habitId;
        let habitToShow = selectedHabit;
        
        const fetchUpdatedHabitData = async () => {
          if (habitId) {
            try {
              const { data: userData } = await supabase.auth.getUser();
              if (!userData?.user?.id) {
                return null;
              }
              
              const { success, data: habits, error } = await habitService.getHabits(userData.user.id);
              
              if (!success || error) {
                return null;
              }
              
              const habitData = habits.find((h: any) => String(h.id) === String(habitId));
              
              if (!habitData) {
                return null;
              }
              
              return transformHabitData(habitData);
            } catch (dbError) {
              return null;
            }
          }
          return null;
        };
        
        const transformHabitData = (habitData: any) => {
          const transformedHabit = {
            id: habitData.id,
            index: habits.findIndex(h => String(h.id) === String(habitData.id)),
            name: habitData.title,
            description: habitData.description || '',
            time: habitData.time,
            startDate: habitData.start_date,
            endDate: habitData.end_date || undefined,
            isIndefinite: habitData.is_indefinite,
            noSpecificTime: habitData.no_specific_time,
            selectedDays: habitData.selected_days,
            color: habitData.color,
            icon: habitData.icon,
            currentStreak: habitData.current_streak,
            record: habitData.record,
            difficulty: 'medium' as Difficulty,
            timeObjective: habitData.is_indefinite ? "indefinite" : undefined,
            objectiveHistory: [],
            currentObjective: {
              startDate: habitData.start_date,
              endDate: habitData.end_date || undefined,
              timeObjective: habitData.is_indefinite ? "indefinite" : undefined,
              completed: false
            },
            supabase_id: habitData.id,
            type: "habit" as const,
            getColor: () => habitData.color,
            time_exceptions: habitData.time_exceptions || {}
          };
          
          return transformedHabit;
        };
        
        if (habitId && habits.length > 0) {
          const foundHabit = habits.find(h => 
            String(h.id) === String(habitId) || 
            String(h.supabase_id) === String(habitId)
          );
          
          if (foundHabit) {
            habitToShow = foundHabit;
            
            fetchUpdatedHabitData().then(updatedHabit => {
              if (updatedHabit) {
                const updatedHabits = habits.map(h => {
                  if (String(h.id) === String(habitId) || String(h.supabase_id) === String(habitId)) {
                    return {
                      ...h,
                      currentStreak: updatedHabit.currentStreak,
                      record: updatedHabit.record
                    };
                  }
                  return h;
                });
              }
            });
          }
        }
        
        return {
          ...baseProps,
          selectedHabit: habitToShow,
          habitStatus,
          currentDate,
          generateGraphData,
          onViewPerformance: () => {/* implementar si es necesario */},
          user,
        };
      case 'graph':
        try {
          const habit = selectedHabit;
          if (!habit) {
            return baseProps;
          }

          const graphData = generateGraphData ? generateGraphData(habit.index, 'monthly') : [];
          const previousMonthData = generatePreviousMonthData(currentDate, [habit], habitStatus);
          
          return {
            ...baseProps,
            selectedHabit: habit,
            selectedHabitIndex: habit.index,
            selectedHabitName: habit.name,
            habitStatus,
            currentDate: data?.currentDate || currentDate,
            graphData: graphData || [],
            previousMonthData: previousMonthData || []
          };
        } catch (error) {
          return {
            ...baseProps,
            graphData: [],
            previousMonthData: []
          };
        }
      case 'annualPerformance':
        return {
          ...baseProps,
          selectedHabit,
          habitStatus,
          currentDate
        };
      case 'editHabit':
        return {
          ...baseProps,
          editingHabit: data?.selectedHabit || null,
          setEditingHabit: (habit: EditingHabit) => {
            updateHabit(habit as Habit);
            closeDialog('editHabit');
          },
          onSave: (editedHabit: EditingHabit) => {
            updateHabit(editedHabit as Habit);
            closeDialog('editHabit');
          },
          mapToDifficulty: (value: string) => value as Difficulty
        };
      case 'updateProfile':
        return {
          ...baseProps,
          user,
          updateUserProfile: handleUpdateProfile
        };
      case 'habitContinue':
        return {
          ...baseProps,
          habit: selectedHabit,
          onConfirm: data?.onConfirm,
          currentDate,
        };
      case 'progressTrend':
        return {
          ...baseProps,
          habits,
          habitStatusMap: habitStatus,
          currentDate
        };
      default:
        return baseProps;
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement> | any): Promise<boolean> => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      const form = e.currentTarget;
      
      try {
        const userName = form.userName?.value;
        const userLastName = form.userLastName?.value;
        const birthDate = form.userBirthDate?.value;
        const country = form.userCountry?.value;
        const gender = form.userGender?.value;
        
        if (user.id) {
          const result = await updateProfileDirectly(user.id, {
            name: userName || null,
            last_name: userLastName || null,
            birth_date: birthDate || null,
            country: country || null,
            gender: gender || null
          });
          
          if (result.success) {
            setUser({
              ...user,
              name: userName || null,
              lastName: userLastName || null,
              birthDate: birthDate || null,
              country: country || null,
              gender: gender || null
            });
            
            toast({
              title: "Perfil actualizado",
              description: "Tu perfil ha sido actualizado correctamente",
            });
            
            return true;
          } else {
            toast({
              title: "Error al actualizar",
              description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
              variant: 'destructive',
            });
            return false;
          }
        }
        
        return false;
      } catch (error) {
        toast({
          title: "Error al actualizar",
          description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
          variant: 'destructive',
        });
        return false;
      }
    } else {
      try {
        const formData = e;
        
        const updatedProfile = {
          name: formData.userName,
          last_name: formData.userLastName,
          birth_date: formData.userBirthDate,
          gender: formData.userGender,
          country: formData.userCountry
        };
        
        if (user.id) {
          const result = await updateProfileDirectly(user.id, updatedProfile);
          
          if (result.success) {
            setUser({
              ...user,
              name: formData.userName,
              lastName: formData.userLastName,
              birthDate: formData.userBirthDate,
              gender: formData.userGender,
              country: formData.userCountry
            });
            
            closeDialog('updateProfile');
            
            toast({
              title: "Perfil actualizado",
              description: "Tu perfil ha sido actualizado correctamente",
            });
            
            return true;
          } else {
            toast({
              title: "Error al actualizar",
              description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
              variant: 'destructive',
            });
            return false;
          }
        }
        
        return false;
      } catch (error) {
        toast({
          title: "Error al actualizar",
          description: "No se pudo actualizar el perfil. Inténtalo de nuevo.",
          variant: 'destructive',
        });
        return false;
      }
    }
  };

  const handleDialogClose = (dialogType: DialogType) => {
    return (e?: React.MouseEvent | React.KeyboardEvent) => {
      if (e) {
        e.preventDefault();
      }
      closeDialog(dialogType);
    };
  };

  return (
    <>
      <ProfileFormDialog
        isOpen={isProfileDialogOpen}
        onOpenChange={setIsProfileDialogOpen}
        onSubmit={handleUpdateProfile}
        mode="update"
        user={user}
        updateUserProfile={handleUpdateProfile}
      />
      {dialogStack.map(({ type, data }) => {
        const Dialog = DialogComponents[type] as DialogMap[typeof type];
        if (!Dialog) return null;

        switch (type) {
          case 'addHabit':
            return (
              <Dialog
                key={`${type}-${data?.habitId || ''}`}
                isOpen={true}
                onOpenChange={(open: boolean) => {
                  if (!open) closeDialog(type);
                }}
                onAddHabit={(habit: Omit<Habit, "id" | "index">) => {
                  addHabit(habit);
                  closeDialog('addHabit');
                }}
                user={user}
              /> as React.ReactElement
            );
          case 'habitEnd':
            if (!selectedHabit) return null;
            return (
              <Dialog
                key={`${type}-${data?.habitId || ''}`}
                isOpen={true}
                onOpenChange={(open: boolean) => {
                  if (!open) closeDialog(type);
                }}
                habit={selectedHabit}
                onContinue={(habit: Habit) => data?.onContinue?.(habit)}
                onStop={() => data?.onStop?.()}
                deleteHabit={(index: number) => data?.deleteHabit?.(index)}
              /> as React.ReactElement
            );
          default:
            return (
              <Dialog
                key={`${type}-${data?.habitId || ''}`}
                {...getDialogProps(type, data)}
              /> as React.ReactElement
            );
        }
      })}
    </>
  );
}; 