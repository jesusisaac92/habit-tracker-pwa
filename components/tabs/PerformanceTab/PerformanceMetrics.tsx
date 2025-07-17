import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives/card";
import { Habit, HabitStatus, PeriodType, ViewPeriodType, ProgressDataPoint, HabitProgressData, GenerateTrendDataFn, HabitWithPerformance } from "@/components/types/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { SearchInput } from "@/components/ui/composite/habits/HabitSearch";
import { Button } from "@/components/ui/primitives/button";
import { BarChart as BarChartIcon, TrendingUp, Plus } from "lucide-react";
import { HABIT_ICONS, type HabitIconType } from "@/components/ui/composite/common/IconSelector";
import { useTranslation } from 'react-i18next';
import { formatDateToYYYYMMDD } from '@/lib/utils/dateUtils';
import { HabitsProgressTrendDialog } from '@/components/dialogs/performance/HabitsProgressTrendDialog';
import { calculateHabitPerformance } from '@/components/services/habitCalculations/habitPerformanceCalculations';
import { generateTrendData } from '@/components/services/chartCalculations/trendCalculations';

interface PerformanceMetricsProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  generateGraphData: (index: number) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  generateBalanceData: (forceRegenerate?: boolean) => void;
  generatePieChartData: () => void;
  setIsBalanceDialogOpen: (value: boolean) => void;
  setIsProgressTrendDialogOpen: (value: boolean) => void;
  handleHabitSelect: (habit: HabitWithPerformance) => void;
  deleteHabit: (habitId: number) => void;
  calculateHabitPerformance: (
    habit: Habit,
    habitStatus: Record<string, HabitStatus>,
    currentDate: Date
  ) => Promise<{
    completionRate: string;
    consistencyRate: string;
    completed: number;
    partial: number;
    notCompleted: number;
    totalDays?: number;
    streak?: number;
  }>;
  setProgressData: (data: ProgressData[]) => void;
  setProcessedHabits: (habits: ProcessedHabit[]) => void;
  isProgressTrendDialogOpen: boolean;
  period: ViewPeriodType;
  setPeriod: (period: ViewPeriodType) => void;
  generateTrendData: (
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    period: ViewPeriodType,
    currentDate: Date
  ) => {
    data: ProgressData[];
    processedHabits: ProcessedHabit[];
  } | null;
  progressData: ProgressData[];
  processedHabits: ProcessedHabit[];
}

interface ProgressData {
  period: string;
  [key: string]: string | number;
}

interface ProcessedHabit {
  name: string;
  color: string;
}

export const PerformanceMetrics = ({
  habits,
  habitStatus,
  currentDate,
  generateGraphData,
  searchQuery,
  setSearchQuery,
  generateBalanceData,
  generatePieChartData,
  setIsBalanceDialogOpen,
  setIsProgressTrendDialogOpen,
  handleHabitSelect,
  deleteHabit,
  calculateHabitPerformance,
  setProgressData,
  setProcessedHabits,
  isProgressTrendDialogOpen,
  period,
  setPeriod,
  generateTrendData,
  progressData,
  processedHabits
}: PerformanceMetricsProps) => {
  const { t } = useTranslation();
  const [habitPerformances, setHabitPerformances] = useState<Record<string, { completed: number }>>({});
  const [isLoadingPerformances, setIsLoadingPerformances] = useState(false);

  const handleHabitClick = async (habit: Habit) => {
    try {
      // Calcular el rendimiento del hábito
      const performance = await calculateHabitPerformance(habit, habitStatus, currentDate);
      
      // Crear el objeto HabitWithPerformance
      const habitWithPerformance: HabitWithPerformance = {
        ...habit,
        performance: {
          completionRate: performance.completionRate,
          consistencyRate: performance.consistencyRate,
          completed: performance.completed,
          partial: performance.partial,
          notCompleted: performance.notCompleted,
          totalDays: performance.totalDays,
          streak: performance.streak
        }
      };
      
      // Llamar a handleHabitSelect con el hábito y su rendimiento
      handleHabitSelect(habitWithPerformance);
    } catch (error) {
      console.error('Error al calcular el rendimiento del hábito:', error);
      // Si hay un error, enviar el hábito sin datos de rendimiento
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
      handleHabitSelect(habitWithPerformance);
    }
  };

  // Cargar los datos de rendimiento de forma asíncrona
  useEffect(() => {
    const loadPerformances = async () => {
      if (!habits || habits.length === 0) return;
      
      setIsLoadingPerformances(true);
      const performances: Record<string, { completed: number }> = {};
      
      try {
        // Procesar cada hábito de forma secuencial para evitar demasiadas solicitudes simultáneas
        for (const habit of habits) {
          const performance = await calculateHabitPerformance(habit, habitStatus, currentDate);
          performances[habit.id || habit.name] = { 
            completed: performance.completed 
          };
        }
        
        setHabitPerformances(performances);
      } catch (error) {
        console.error('Error al cargar rendimientos:', error);
      } finally {
        setIsLoadingPerformances(false);
      }
    };
    
    loadPerformances();
  }, [habits, habitStatus, currentDate, calculateHabitPerformance]);

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Card de Balance General */}
      <Card className="bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-shadow rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">
            {t('performance.generalBalance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-0 sm:flex sm:gap-4">
          <Button 
            onClick={() => {
              generateBalanceData(false);
              generatePieChartData();
              setIsBalanceDialogOpen(true);
            }} 
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-2 
              text-xs sm:text-sm font-medium text-white bg-black 
              border border-gray-700 rounded-md shadow-sm 
              hover:bg-gray-800 focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-gray-500 
              transition-all duration-300 ease-in-out 
              transform hover:scale-105 hover:-translate-y-1 
              hover:shadow-lg"
          >
            <BarChartIcon className="h-4 w-4 text-gray-300 mr-1.5 sm:mr-2" />
            <span className="whitespace-nowrap">{t('performance.viewDetailedBalance')}</span>
          </Button>

          <Button 
            onClick={() => {
              const result = generateTrendData(habits, habitStatus, period, currentDate);
              if (result) {
                setProgressData(result.data);
                setProcessedHabits(result.processedHabits);
                setIsProgressTrendDialogOpen(true);
              }
            }}  
            className="w-full flex items-center justify-center px-3 sm:px-4 py-2.5 sm:py-2 
              text-xs sm:text-sm font-medium 
              text-white bg-gradient-to-r from-blue-500 to-purple-500 
              dark:bg-gradient-to-r dark:from-emerald-400 dark:to-cyan-400
              border border-transparent rounded-md shadow-sm 
              hover:from-blue-600 hover:to-purple-600
              transition-all duration-300 ease-in-out 
              transform hover:scale-105 hover:-translate-y-1 
              hover:shadow-lg"
          >
            <TrendingUp className="h-4 w-4 text-white mr-1.5 sm:mr-2" />
            <span className="whitespace-nowrap">{t('balance.viewProgressTrends')}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Lista de hábitos */}
      <div className="overflow-y-auto max-h-[260px] pr-2">
        <div className="space-y-4">
          {habits.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Plus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('performance.noHabits')}</p>
            </div>
          ) : isLoadingPerformances ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-500 mt-2">{t('common.loading')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {habits
                .filter(habit => {
                  const searchTerm = searchQuery.toLowerCase().trim();
                  return searchTerm === '' || 
                    habit.name.toLowerCase().includes(searchTerm) ||
                    (habit.description || '').toLowerCase().includes(searchTerm);
                })
                .map((habit, index) => {
                  const habitId = habit.id || habit.name;
                  const performance = habitPerformances[habitId] || { completed: 0 };
                  
                  return (
                    <Card 
                      key={index} 
                      className="bg-white dark:bg-gray-900 shadow-md hover:shadow-lg transition-shadow rounded-2xl"
                    >
                      <CardContent className="flex justify-between items-center p-4">
                        <div className="flex items-center space-x-3">
                          <div 
                            style={{ backgroundColor: habit.color }} 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                          >
                            {(() => {
                              const IconComponent = HABIT_ICONS[habit.icon as HabitIconType]?.icon;
                              return IconComponent && <IconComponent className="h-4 w-4 text-white" />;
                            })()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {habit.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {t('performance.completionRate')}: {performance.completed}%
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                          onClick={() => handleHabitClick(habit)}
                        >
                          {t('performance.view')}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <HabitsProgressTrendDialog 
        isOpen={isProgressTrendDialogOpen}
        onClose={() => setIsProgressTrendDialogOpen(false)}
        habits={habits}
        habitStatusMap={habitStatus}
        currentDate={currentDate}
      />
    </div>
  );
};
