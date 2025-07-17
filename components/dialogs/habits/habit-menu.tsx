import React, { useState } from 'react';
import { Button } from "@/components/ui/primitives/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import * as Popover from '@radix-ui/react-popover';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/primitives/alert-dialog";
import { useDialogStore } from '@/components/services/dialogManagement/dialogService';
import { useTranslation } from 'next-i18next';
import { Habit } from "@/components/types/types";

interface HabitMenuProps {
  habitIndex: number;
  dateString: string;
  generateGraphData: (index: number) => void;
  handleCalendarOpen: (index: number) => void;
  handleEditClick: (habit: any) => void;
  deleteHabit: (habitId: string) => void;
  habit: any;
}

export const HabitMenu = ({
  habitIndex,
  dateString,
  generateGraphData,
  handleCalendarOpen,
  handleEditClick: onEditClick,
  deleteHabit,
  habit
}: HabitMenuProps) => {
  const { t } = useTranslation();
  const { openDialog } = useDialogStore();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleDelete = async () => {
    const habitId = habit.supabase_id || habit.id;
    
    await deleteHabit(habitId.toString());
    setShowDeleteAlert(false);
  };

  const handleEdit = () => {
    try {
      if (!habit.id && !habit.supabase_id) {
        throw new Error('El hábito no tiene ID válido');
      }

      onEditClick(habit);
    } catch (err: any) {
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button 
          variant="ghost" 
          className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="rounded-md min-w-[160px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700 p-1"
          sideOffset={5}
          align="end"
        >
          <div className="flex flex-col">
            <button
              className="flex items-center px-2 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              onClick={handleEdit}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span>{t('habits.menu.edit')}</span>
            </button>

            <button
              className="flex items-center px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm"
              onClick={() => setShowDeleteAlert(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{t('habits.menu.delete')}</span>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent className="max-w-[90vw] w-full sm:max-w-[425px] p-4 sm:p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <AlertDialogHeader className="space-y-2 sm:space-y-3">
            <AlertDialogTitle className="text-lg sm:text-xl font-semibold">
              {t('habits.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              {t('habits.deleteDialog.description', { habitName: habit.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 sm:mt-6 flex-col sm:flex-row gap-2">
            <AlertDialogAction 
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              {t('habits.deleteDialog.confirm')}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
              {t('habits.deleteDialog.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Popover.Root>
  );
}