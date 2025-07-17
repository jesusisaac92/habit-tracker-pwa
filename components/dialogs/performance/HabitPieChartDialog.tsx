import React, { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { InfoIcon } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { CHART_TYPES, updateChartData } from '@/src/supabase/services/habitCharts.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';

interface HabitPieChartDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  habitPieChartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  activeIndex: number;
  renderActiveShape: (props: any) => JSX.Element;
  onPieEnter: (data: any, index: number) => void;
  currentPace?: {
    completed: number;
    partial: number;
    notCompleted: number;
  };
}

export const HabitPieChartDialog: React.FC<HabitPieChartDialogProps> = ({
  isOpen,
  onOpenChange,
  habitPieChartData,
  activeIndex,
  renderActiveShape,
  onPieEnter,
  currentPace
}) => {
  const { t } = useTranslation();
  const user = useAuth().user;
  const prevDataRef = useRef<string>('');

  const statusLabels = {
    completed: t('habitPieChart.status.completed'),
    partial: t('habitPieChart.status.partial'),
    notCompleted: t('habitPieChart.status.notCompleted')
  };

  useEffect(() => {
    if (user?.id && habitPieChartData.length > 0 && isOpen) {
      const dataString = JSON.stringify(habitPieChartData);
      
      if (dataString !== prevDataRef.current) {
        prevDataRef.current = dataString;
        updateChartData(user.id, CHART_TYPES.PIE, habitPieChartData);
      }
    }
  }, [habitPieChartData, user?.id, isOpen]);

  const allValuesAreZero = habitPieChartData.every(item => item.value === 0);

  console.log('HabitPieChartDialog - datos recibidos:', habitPieChartData);
  console.log('HabitPieChartDialog - Tipos de datos:', {
    habitPieChartData: habitPieChartData.map(item => ({
      name: item.name,
      value: item.value,
      valueType: typeof item.value,
      color: item.color
    }))
  });

  const pieDataToShow = habitPieChartData.length > 0 && habitPieChartData.some(item => Number(item.value) > 0) 
    ? habitPieChartData 
    : [{ name: "Ejemplo", value: 75, color: "#6B705C" }];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] bg-white p-3 sm:p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <div className="flex items-center justify-between relative">
            <DialogTitle className="text-base sm:text-xl font-semibold mb-2 sm:mb-4">
              {t('habitPieChart.title')}
            </DialogTitle>
            <div className="absolute right-0 top-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 group focus:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none"
              >
                <InfoIcon className="h-4 w-4 text-gray-500 transition-all duration-200 ease-in-out hover:text-blue-500 hover:scale-110" />
                <div className="absolute hidden group-hover:block right-0 top-full mt-0 translate-y-[10px] sm:-translate-y-[-10px] w-[calc(100vw-40px)] sm:w-[300px] p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg rounded-lg z-50 transform -translate-x-[5%] sm:-translate-x-[40%]"
                  style={{ maxWidth: '280px', right: '0px' }}
                >
                  <div className="text-left text-[11px] sm:text-sm leading-relaxed">
                    {t('habitPieChart.tooltip.description')}
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>{t('habitPieChart.tooltip.completed')}</li>
                      <li>{t('habitPieChart.tooltip.partial')}</li>
                      <li>{t('habitPieChart.tooltip.notCompleted')}</li>
                    </ul>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="w-full max-w-[160px] sm:max-w-[300px] mx-auto mb-2 sm:mb-4">
          {allValuesAreZero ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500 text-center mb-2">
                {t('habitPieChart.noDataToShow', 'No hay datos para mostrar')}
              </p>
              <p className="text-gray-400 text-sm text-center">
                {t('habitPieChart.completeHabitsToSeeData', 'Completa tus hábitos para ver datos en esta gráfica')}
              </p>
            </div>
          ) : (
            <div className="aspect-square w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={pieDataToShow}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="55%"
                    paddingAngle={2}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                  >
                    {pieDataToShow.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white border border-gray-200">
            <span className="text-[10px] sm:text-sm text-green-500">{statusLabels.completed}</span>
          </div>
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white border border-gray-200">
            <span className="text-[10px] sm:text-sm text-yellow-500">{statusLabels.partial}</span>
          </div>
          <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-white border border-gray-200">
            <span className="text-[10px] sm:text-sm text-red-500">{statusLabels.notCompleted}</span>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-3">
          {pieDataToShow.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between">
              <span className="text-[11px] sm:text-sm text-gray-600">{entry.name}</span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div 
                  className="w-10 sm:w-24 h-1 sm:h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] sm:text-sm font-semibold min-w-[30px] sm:min-w-[40px] text-right">
                  {entry.value}%
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 sm:hidden">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

