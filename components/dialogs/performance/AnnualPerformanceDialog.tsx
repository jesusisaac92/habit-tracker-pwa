import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/primitives/dialog";
import { Habit, HabitStatus } from "@/components/types/types";
import { BarChart3, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/primitives/button";
import { generateHabitStatusDistribution } from '@/components/services/chartCalculations/habitStatusDistributionCalculations';
import { CHART_TYPES, updateChartData } from '@/src/supabase/services/habitCharts.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';

interface AnnualPerformanceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHabit: Habit | null;
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
}

const YearNavigator = ({ selectedYear, onYearChange }: { 
  selectedYear: number;
  onYearChange: (year: number) => void;
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onYearChange(selectedYear - 1)}
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[100px] text-center text-lg font-semibold">
        {selectedYear}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onYearChange(selectedYear + 1)}
        className="hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

const AnnualPerformanceDialog: React.FC<AnnualPerformanceDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedHabit,
  habitStatus,
  currentDate
}) => {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const user = useAuth().user;
  const prevDataRef = useRef<string>('');

  const chartData = useMemo(() => {
    if (!selectedHabit) return [];
    
    return generateHabitStatusDistribution(selectedHabit.index, currentDate, habitStatus);
  }, [selectedHabit, habitStatus, currentDate]);

  const yearColors = useMemo(() => ({
    [selectedYear]: '#8884d8',
    [selectedYear - 1]: '#d3d3d3'
  }), [selectedYear]);

  const annualSummary = useMemo(() => {
    const total = chartData.length;
    const completed = chartData.filter(d => Number(d.points) > 0).length;
    
    return {
      totalCompleted: completed,
      totalPartial: 0,
      totalNotCompleted: total - completed
    };
  }, [chartData]);

  useEffect(() => {
    if (user?.id && chartData.length > 0 && isOpen) {
      const dataString = JSON.stringify(chartData);
      
      if (dataString !== prevDataRef.current) {
        prevDataRef.current = dataString;
        updateChartData(user.id, CHART_TYPES.YEARLY_TREND, chartData);
      }
    }
  }, [chartData, user?.id, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-start">
          <DialogHeader className="flex flex-col sm:flex-row justify-between items-center">
            <DialogTitle className="flex items-center gap-2">
              <span>
                {t('habitDetail.annualPerformance')}: {selectedHabit?.name}
              </span>
              <div className="relative">
                <button
                  type="button"
                  className="h-6 w-6 group focus:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none"
                >
                  <BarChart3 className="h-4 w-4 text-gray-500
                  transition-all duration-200 ease-in-out
                 hover:text-blue-500 hover:scale-110"
                   />
                  <div className="absolute hidden group-hover:block 
                    top-full left-0 sm:left-auto sm:right-0 mt-1
                    w-[280px] sm:w-[300px]
                    p-3 sm:p-4 
                    bg-white dark:bg-gray-800 
                    border border-gray-200 dark:border-gray-600 
                    shadow-lg rounded-lg z-50
                    -translate-x-[88%] sm:translate-x-[80%]"
                  >
                    <div className="space-y-2 text-left font-normal relative z-10 bg-white dark:bg-gray-800">
                      <p className="text-[11px] sm:text-sm leading-relaxed sm:leading-normal">
                        {t('annualPerformance.chartDescription')}
                      </p>
                      <ul className="text-[11px] sm:text-sm list-disc pl-4 space-y-1">
                        <li>{t('annualPerformance.chartPoints.lineStyles')}</li>
                        <li>{t('annualPerformance.chartPoints.comparison')}</li>
                        <li>{t('annualPerformance.chartPoints.percentage')}</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <YearNavigator 
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
        
        <div className="w-full h-[400px] flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <p className="text-center text-gray-500 dark:text-gray-300">
            {t('habitDetail.chartUnavailable')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnualPerformanceDialog;
