import create from 'zustand';
import { Habit } from '@/components/types/types';

// Definir los tipos de diálogos disponibles
export type DialogType = 
  | 'addHabit' 
  | 'help' 
  | 'updateProfile' 
  | 'graph' 
  | 'balance' 
  | 'habitPieChart'
  | 'progressTrend'
  | 'habitDetail'
  | 'calendar'
  | 'editHabit'
  | 'annualPerformance'
  | 'habitEnd'
  | 'habitContinue'
  | 'habitCompleted';

// Interfaz para datos adicionales del diálogo
export interface DialogData {
  habitId?: string | number;
  [key: string]: any;
}

// Interfaz para un elemento en el stack de diálogos
interface DialogStackItem {
  type: DialogType;
  data?: DialogData;
}

interface DialogState {
  dialogStack: DialogStackItem[];
  selectedHabit: Habit | null;
  openDialog: (type: DialogType, data?: DialogData) => void;
  closeDialog: (type: DialogType) => void;
  setSelectedHabit: (habit: Habit | null) => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  dialogStack: [],
  selectedHabit: null,
  openDialog: (type, data) => 
    set((state) => ({
      dialogStack: [...state.dialogStack, { type, data }],
      selectedHabit: state.selectedHabit
    })),
  closeDialog: (type) =>
    set((state) => ({
      dialogStack: state.dialogStack.filter(dialog => dialog.type !== type),
      selectedHabit: state.selectedHabit
    })),
  setSelectedHabit: (habit) => 
    set((state) => ({
      dialogStack: state.dialogStack,
      selectedHabit: habit
    })),
})); 

// Añadir interfaz para las transiciones
interface DialogTransitions {
  toAnnualPerformance: (habitId: number) => void;
  // Añadir más transiciones según sea necesario
}

// Crear el hook para las transiciones
export const useDialogTransitions = (): DialogTransitions => {
  const { openDialog, closeDialog } = useDialogStore();

  return {
    toAnnualPerformance: (habitId: number) => {
      closeDialog('habitDetail');
      openDialog('annualPerformance', { habitId });
    },
    // Añadir más transiciones según sea necesario
  };
}; 