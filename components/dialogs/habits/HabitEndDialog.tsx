import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/primitives/alert-dialog";
import { Button } from "@/components/ui/primitives/button";
import { Habit } from "@/components/types/types";
import { Trophy } from "lucide-react";

interface HabitEndDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  onContinue: (habit: Habit) => void;
  onStop: () => void;
  deleteHabit: (habitId: string) => void;
}

export function HabitEndDialog({
  isOpen,
  onOpenChange,
  habit,
  onContinue,
  onStop,
  deleteHabit,
}: HabitEndDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  if (!habit) return null;

  return (
    <>
      <Dialog 
        open={isOpen && !showDeleteAlert} 
        onOpenChange={(open) => {
          if (open === false && isOpen) return;
          onOpenChange(open);
        }}
        modal={true}
      >
        <DialogContent className="sm:max-w-[425px] max-w-[95%] p-6 bg-white dark:bg-gray-800 rounded-lg">
          <DialogHeader className="space-y-4">
            <div className="mx-auto bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl text-center font-semibold">
              ¡Felicitaciones! Has completado tu objetivo
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
              Has alcanzado la fecha final del hábito "{habit?.name}". ¿Te gustaría continuar con este hábito?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            <Button 
              onClick={() => onContinue(habit)}
              className="w-full bg-black hover:bg-gray-900 text-white dark:bg-white dark:text-black 
                dark:hover:bg-gray-100 font-medium rounded-lg py-2"
            >
              Me gustaría continuar
            </Button>
            <Button 
              onClick={() => setShowDeleteAlert(true)}
              variant="outline"
              className="w-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 
                dark:hover:bg-gray-800 font-medium rounded-lg py-2"
            >
              Finalizar hábito
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={showDeleteAlert} 
        onOpenChange={(open) => {
          if (open === false && showDeleteAlert) return;
          setShowDeleteAlert(open);
        }}
      >
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] 
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          w-[95%] max-w-[400px] max-h-[85vh] rounded-lg p-6 shadow-lg
          sm:w-full sm:max-w-lg md:max-w-xl"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold">
              ¿Estás seguro?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
              Esta acción no se puede deshacer. El hábito "{habit.name}" será eliminado permanentemente 
              y perderás todo su historial y progreso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-4 mt-6">
            <AlertDialogCancel 
              onClick={() => {
                setShowDeleteAlert(false);
              }}
              className="w-full sm:w-auto border border-gray-200 dark:border-gray-700"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteHabit(habit.id.toString());
                setShowDeleteAlert(false);
                onOpenChange(false);
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              Sí, finalizar hábito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

