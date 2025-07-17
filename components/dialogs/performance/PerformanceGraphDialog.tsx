import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import PerformanceChart from "@/components/charts/PerformanceChart";
import { Button } from "@/components/ui/primitives/button";
import { InfoIcon, BarChart, LineChart as LineChartIcon, X } from "lucide-react";
import { useTranslation } from 'next-i18next';
import YearlyTrendChart from '@/components/charts/YearlyTrendChart';
import { TooltipProps } from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { GenerateGraphDataFunction, GraphPeriodType, ViewMode, MonthlyTrendData, PeriodType } from '@/components/types/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateAnnualPerformanceData } from '@/components/services/chartCalculations/performanceGraphCalculations';
import { Habit } from "@/components/types/types";
import { CHART_TYPES, updateChartData } from '@/src/supabase/services/habitCharts.service';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { useChartStore } from '@/store/useChartStore';

// Interfaz para las props del componente personalizado
interface CustomDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

// Componente personalizado para reemplazar DialogDescription y evitar errores de hidratación
const CustomDialogDescription: React.FC<CustomDialogDescriptionProps> = ({ 
  children, 
  className = "" 
}) => (
  <div className={`text-sm text-muted-foreground ${className}`}>
    {children}
  </div>
);

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      previousMonth: number;
    };
  }>;
  label?: string;
}

interface PerformanceGraphDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedHabitIndex: number | null;
    selectedHabit: Habit;
    selectedHabitName: string;
    currentDate: Date;
    generateGraphData: (index: number, type: 'monthly' | 'annual') => any[];
    graphData: any[];
    habitStatus: Record<string, any>;
    previousMonthData: any[];
    CustomTooltipProp: (props: TooltipProps<ValueType, NameType>) => JSX.Element | null;
}

const PerformanceGraphDialog: React.FC<PerformanceGraphDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedHabitIndex,
  selectedHabit,
  selectedHabitName,
  currentDate = new Date(),
  generateGraphData,
  graphData = [],
  habitStatus,
  previousMonthData = [],
  CustomTooltipProp
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const { t } = useTranslation();
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const user = useAuth().user;
  const chartStore = useChartStore();
  const prevGraphDataRef = useRef<string>('');
  const prevYearlyDataRef = useRef<string>('');

  const mapViewModeToGraphPeriod = (mode: ViewMode): GraphPeriodType => {
    return mode === 'year' ? 'annual' : 'monthly';
  };

  useEffect(() => {
    if (isOpen && 
        selectedHabitIndex !== null && 
        habitStatus && 
        Object.keys(habitStatus).length > 0 && 
        generateGraphData) {
      if (viewMode === 'month') {
        generateGraphData(selectedHabitIndex, 'monthly');
      } else {
        const habitKeys = Object.keys(habitStatus);
        const habitEntries = Object.entries(habitStatus);
        
        const annualData = generateAnnualPerformanceData(selectedHabit, habitStatus, currentDate);
        setYearlyData(annualData);
      }
    }
  }, [isOpen, selectedHabitIndex, viewMode, selectedHabit, habitStatus, currentDate, generateGraphData]);

  const handleViewChange = (newMode: 'month' | 'year') => {
    setViewMode(newMode);
  };

  const getMonthName = (month: number): string => {
    const monthKeys = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    return t(`calendar.monthsShort.${monthKeys[month]}`);
  };

  const LocalCustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const currentValue = Number(payload[0].value);
      const previousValue = Number(payload[0].payload.previousMonth || 0);
      const difference = currentValue - previousValue;
      
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow">
          <div className="text-xs font-medium mb-1">
            {`${label} de ${getMonthName(currentDate.getMonth())}`}
          </div>
          <div className="space-y-0.5">
            <div className="text-xs">
              <span className="text-purple-500">Actual: </span>
              <span className="font-medium">{currentValue.toFixed(1)}%</span>
            </div>
            <div className="text-xs">
              <span className="text-gray-400">Anterior: </span>
              <span>{previousValue.toFixed(1)}%</span>
            </div>
            {difference !== 0 && (
              <div className="text-xs">
                <span className="text-gray-500">Dif: </span>
                <span className={difference >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {difference >= 0 ? '↑' : '↓'}{Math.abs(difference).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const transformedYearlyData: MonthlyTrendData[] = useMemo(() => {
    if (!yearlyData || yearlyData.length === 0) return [];
    
    const transformed = yearlyData.map(data => ({
      month: data.month,
      points: data.points,
      lastYearPoints: data.lastYearPoints,
      period: data.period,
      historicalAverage: (data.points + data.lastYearPoints) / 2,
      completedDays: data.completedDays,
      totalDays: data.totalDays,
      year: data.year || currentDate.getFullYear()
    }));

    return transformed;
  }, [yearlyData, currentDate]);

  useEffect(() => {
    if (isOpen && selectedHabitIndex !== null && habitStatus && currentDate) {
      console.log(`[DEBUG] Regenerando datos para el año ${currentDate.getFullYear()}`);
      const annualData = generateAnnualPerformanceData(selectedHabit, habitStatus, currentDate);
      setYearlyData(annualData);
    }
  }, [isOpen, selectedHabitIndex, habitStatus, currentDate?.getFullYear(), selectedHabit]);

  useEffect(() => {
    if (isOpen && selectedHabitIndex !== null && user?.id) {
      if (viewMode === 'month' && graphData.length > 0) {
        const dataString = JSON.stringify(graphData);
        
        if (dataString !== prevGraphDataRef.current) {
          prevGraphDataRef.current = dataString;
          updateChartData(user.id, CHART_TYPES.PERFORMANCE, graphData);
        }
      } else if (viewMode === 'year' && yearlyData.length > 0) {
        const dataString = JSON.stringify(yearlyData);
        
        if (dataString !== prevYearlyDataRef.current) {
          prevYearlyDataRef.current = dataString;
        }
      }
    }
  }, [isOpen, selectedHabitIndex, viewMode, graphData, yearlyData, user?.id]);

  const effectiveGraphData = useMemo(() => {
    if (chartStore.performanceData && chartStore.performanceData.length > 0 && viewMode === 'month') {
      return chartStore.performanceData;
    }
    return graphData;
  }, [chartStore.performanceData, graphData, viewMode]);

  const effectiveYearlyData = useMemo(() => {
    return yearlyData;
  }, [yearlyData]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[700px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
        <button 
          onClick={() => onOpenChange(false)}
          className="hidden sm:flex absolute top-4 right-4 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        {selectedHabitIndex !== null && (
          <div>
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4 flex items-center gap-2">
                {t('performance.graphTitle')}: {selectedHabitName}
                <div className="relative">
                  <button
                    type="button"
                    className="h-6 w-6 group focus:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none"
                  >
                    <InfoIcon className="h-4 w-4 text-gray-500 transition-all duration-200 ease-in-out hover:text-blue-500 hover:scale-110" />
                    <div className="absolute hidden group-hover:block right-[-10px] sm:right-0 top-full mt-2 w-[250px] sm:w-[300px] p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg rounded-lg z-50">
                      <div className="absolute w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-600 transform rotate-45 right-[14px] -top-1.5" />
                      
                      <div className="space-y-2 text-left font-normal relative z-10 bg-white dark:bg-gray-800 max-w-full overflow-hidden">
                        <div className="font-semibold text-xs sm:text-sm whitespace-normal break-words">
                          {viewMode === 'month' 
                            ? t('performance.tooltip.title')
                            : t('annualPerformance.title', { habitName: selectedHabitName })
                          }
                        </div>
                        <div className="text-xs sm:text-sm whitespace-normal break-words">
                          {viewMode === 'month'
                            ? t('performance.tooltip.description')
                            : t('annualPerformance.chartDescription')
                          }
                        </div>
                        {viewMode === 'month' && (
                          <ul className="text-xs sm:text-sm list-disc pl-4 space-y-1">
                            <li>{t('performance.tooltip.point1')}</li>
                            <li>{t('performance.tooltip.point2')}</li>
                          </ul>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </DialogTitle>
              
              {/* Usando nuestro componente personalizado en lugar de DialogDescription */}
              <CustomDialogDescription className="text-sm sm:text-md text-gray-600 dark:text-gray-400 flex justify-between items-center">
                <span>
                  {currentDate ? (
                    <>
                      {viewMode === 'month' ? (
                        <>
                          {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
                        </>
                      ) : (
                        <>{currentDate.getFullYear()}</>
                      )}
                    </>
                  ) : (
                    viewMode === 'month' ? getMonthName(new Date().getMonth()) : new Date().getFullYear()
                  )}
                </span>
                
                {/* Botones para cambiar vista */}
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleViewChange('month')}
                    className={`
                      min-w-[100px] sm:min-w-[120px] 
                      text-xs sm:text-sm
                      px-2 sm:px-3
                      transition-all duration-200
                      ${viewMode === 'month' 
                        ? 'shadow-md scale-105' 
                        : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    <LineChartIcon 
                      className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${
                        viewMode === 'month' 
                          ? 'text-blue-500' 
                          : ''
                      }`} 
                    />
                    {t('charts.monthView')}
                  </Button>
                  <Button
                    variant={viewMode === 'year' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleViewChange('year')}
                    className={`
                      min-w-[100px] sm:min-w-[120px]
                      text-xs sm:text-sm
                      px-2 sm:px-3
                      transition-all duration-200
                      ${viewMode === 'year' 
                        ? 'shadow-md scale-105' 
                        : 'text-gray-500 hover:text-gray-700'
                      }
                    `}
                  >
                    <BarChart 
                      className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${
                        viewMode === 'year' 
                          ? 'text-blue-500' 
                          : ''
                      }`} 
                    />
                    {t('charts.yearView')}
                  </Button>
                </div>
              </CustomDialogDescription>
            </DialogHeader>
            {viewMode === 'month' ? (
              <PerformanceChart
                selectedHabitName={selectedHabitName}
                currentDate={currentDate}
                graphData={effectiveGraphData || []}
                selectedHabitIndex={selectedHabitIndex}
                getMonthName={getMonthName}
                previousMonthData={previousMonthData || []}
                CustomTooltip={LocalCustomTooltip}
              />
            ) : (
              <>
                <YearlyTrendChart
                  yearlyData={transformedYearlyData}
                  year={currentDate.getFullYear()}
                />
              </>
            )}
            <Button className="sm:hidden w-full mt-6" onClick={() => onOpenChange(false)}>
              <div className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                {t('common.close')}
              </div>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PerformanceGraphDialog;
