import React, { useState,  } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Progress } from "@/components/ui/primitives/progress";
import { Button } from "@/components/ui/primitives/button";
import { Check, Minus, X, Trophy, Target, LineChart as LineChartIcon, Trash2 } from 'lucide-react';
import { HabitWithPerformance, Difficulty } from '@/components/types/types';
import { useTranslation } from 'react-i18next';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/primitives/alert-dialog";

interface HabitPerformanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHabitPerformance: HabitWithPerformance | null;
  generateGraphData: (index: number) => void;
  getDifficultyColor: (difficulty: Difficulty) => string;
  deleteHabit?: (index: number) => void;
}

export const HabitPerformanceDialog: React.FC<HabitPerformanceDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedHabitPerformance,
  generateGraphData,
  getDifficultyColor,
  deleteHabit
}) => {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!selectedHabitPerformance) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-[500px] max-h-[80vh] sm:max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold mb-2">
            {t('habitPerformance.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${getDifficultyColor(selectedHabitPerformance.difficulty)}`}></div>
            <h3 className="text-base sm:text-lg font-semibold">{selectedHabitPerformance.name}</h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{selectedHabitPerformance.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs sm:text-sm font-medium">{t('habitPerformance.completionRate')}</p>
              <div className="flex items-center">
                <span className="text-base sm:text-lg font-bold mr-2">{selectedHabitPerformance.performance?.completionRate ?? 0}%</span>
                <Progress value={parseFloat(String(selectedHabitPerformance.performance?.completionRate ?? 0))} className="h-1 sm:h-2 flex-grow" />
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium">{t('habitPerformance.consistencyRate')}</p>
              <div className="flex items-center">
                <span className="text-base sm:text-lg font-bold mr-2">{selectedHabitPerformance.performance?.consistencyRate ?? 0}%</span>
                <Progress value={parseFloat(String(selectedHabitPerformance.performance?.consistencyRate ?? 0))} className="h-1 sm:h-2 flex-grow" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center">
              <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
              <span>{t('habitPerformance.completed')}: {selectedHabitPerformance.performance?.completed ?? 0}</span>
            </div>
            <div className="flex items-center">
              <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mr-1" />
              <span>{t('habitPerformance.partial')}: {selectedHabitPerformance.performance?.partial ?? 0}</span>
            </div>
            <div className="flex items-center">
              <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 mr-1" />
              <span>{t('habitPerformance.notCompleted')}: {selectedHabitPerformance.performance?.notCompleted ?? 0}</span>
            </div>
            <div className="flex items-center">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 mr-1" />
              <span>{t('habitPerformance.record')}: {selectedHabitPerformance.record} {t('habitPerformance.days')}</span>
            </div>
          </div>
          <div className="flex items-center">
            <Target className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1" />
            <span className="text-xs sm:text-sm">{t('habitPerformance.timeObjective')}: {selectedHabitPerformance.timeObjective} {t('habitPerformance.days')}</span>
          </div>
          <Button 
            onClick={() => generateGraphData(selectedHabitPerformance.index)} 
            className="w-full mt-3 sm:mt-4 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 ease-in-out flex items-center justify-center hover:shadow-md hover:translate-y-[-2px] active:translate-y-[0px] active:shadow-sm"
          >
            <LineChartIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
            {t('habitPerformance.viewDetailedGraph')}
          </Button>
        </div>
        <div className="mt-6 flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('habits.delete')}
          </Button>
        </div>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('habits.deleteConfirmation.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('habits.deleteConfirmation.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedHabitPerformance && deleteHabit) {
                    deleteHabit(Number(selectedHabitPerformance.id));
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('habits.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
