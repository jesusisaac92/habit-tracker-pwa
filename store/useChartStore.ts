import create from 'zustand';
import { BalanceData, GraphDataPoint, ProgressDataPoint, HabitStatus } from '@/components/types/types';
import { supabase } from '@/src/supabase/config/client';
import { chartCalculations } from '@/components/services/chartCalculations/calculations';
import { useHabitStore } from './useHabitStore';

interface ChartStore {
  balanceData: BalanceData[];
  weeklyBalanceData: BalanceData[];
  pieChartData: Array<{ name: string; value: number; color: string; }>;
  graphData: GraphDataPoint[];
  progressData: ProgressDataPoint[];
  performanceData: any[];
  progressTrendData: any[];
  monthlyTrendData: any[];
  yearlyTrendData: any[];
  lastUpdated?: string;
  currentPeriod: 'week' | 'month' | 'year';
  lastCalculationTime: {
    weekly: string;
    monthly: string;
    yearly: string;
    pie: string;
  };
  modifiedPeriods: {
    weekly: boolean;
    monthly: boolean;
    yearly: boolean;
  };
  calculatedPeriods: {
    weekly: boolean;
    monthly: boolean;
    yearly: boolean;
  };
  lastModifiedHabits: string[];
  habitStatus?: Record<string, HabitStatus['status']>;
  lastSelectedHabitId?: string;
  
  setBalanceData: (data: BalanceData[]) => void;
  setWeeklyBalanceData: (data: BalanceData[]) => void;
  setPieChartData: (data: any[]) => void;
  setGraphData: (data: GraphDataPoint[]) => void;
  setProgressData: (data: ProgressDataPoint[]) => void;
  setPerformanceData: (data: any[]) => void;
  setProgressTrendData: (data: any[]) => void;
  setMonthlyTrendData: (data: any[]) => void;
  setYearlyTrendData: (data: any[]) => void;
  setCurrentPeriod: (period: 'week' | 'month' | 'year') => void;
  markPeriodAsModified: (period: 'weekly' | 'monthly' | 'yearly', habitIds: string[]) => void;
  calculatePeriodOnDemand: (period: 'week' | 'month' | 'year') => Promise<void>;
  
  isSyncing: boolean;
  
  regenerateChartData: () => Promise<void>;
  initializeChartData: () => Promise<void>;
  saveChartData: () => Promise<void>;
  forceRegenerateData: (newCompletedDay?: boolean, completedDate?: Date) => void;
}

export const useChartStore = create<ChartStore>((set, get) => ({
  balanceData: [],
  weeklyBalanceData: [],
  pieChartData: [],
  graphData: [],
  progressData: [],
  performanceData: [],
  progressTrendData: [],
  monthlyTrendData: [],
  yearlyTrendData: [],
  currentPeriod: 'month',
  lastCalculationTime: {
    weekly: '',
    monthly: '',
    yearly: '',
    pie: ''
  },
  modifiedPeriods: {
    weekly: true,
    monthly: true,
    yearly: true
  },
  calculatedPeriods: {
    weekly: false,
    monthly: false,
    yearly: false
  },
  lastModifiedHabits: [],
  lastSelectedHabitId: undefined,
  
  setBalanceData: (data) => set({ balanceData: data }),
  setWeeklyBalanceData: (data) => set({ weeklyBalanceData: data }),
  setPieChartData: (data) => set({ pieChartData: data }),
  setGraphData: (data) => set({ graphData: data }),
  setProgressData: (data) => set({ progressData: data }),
  setPerformanceData: (data) => set({ performanceData: data }),
  setProgressTrendData: (data) => set({ progressTrendData: data }),
  setMonthlyTrendData: (data) => set({ monthlyTrendData: data }),
  setYearlyTrendData: (data) => set({ yearlyTrendData: data }),
  
  calculatePeriodOnDemand: async (period) => {
    const habitStore = useHabitStore.getState();
    const currentDate = new Date();
    
    const { calculatedPeriods, modifiedPeriods } = get();
    const periodKey = period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : 'yearly';
    
    if (calculatedPeriods[periodKey] && !modifiedPeriods[periodKey]) {
      return;
    }
    
    set({ isSyncing: true });
    
    try {
      const typedHabitStatus: Record<string, HabitStatus> = {};
      Object.entries(habitStore.habitStatus).forEach(([key, value]) => {
        typedHabitStatus[key] = {
          status: value.status as "" | "completed" | "pending",
          time: ''
        };
      });
      
      if (period === 'week') {
        const newWeeklyData = chartCalculations.generateBalanceData(
          habitStore.habits,
          typedHabitStatus,
          currentDate,
          period,
          { existingData: get().weeklyBalanceData }
        );
        
        set({ 
          weeklyBalanceData: newWeeklyData,
          lastCalculationTime: {
            ...get().lastCalculationTime,
            weekly: new Date().toISOString()
          },
          modifiedPeriods: {
            ...modifiedPeriods,
            weekly: false
          },
          calculatedPeriods: {
            ...calculatedPeriods,
            weekly: true
          }
        });
      } else {
        const newBalanceData = chartCalculations.generateBalanceData(
          habitStore.habits,
          typedHabitStatus,
          currentDate,
          period,
          { existingData: get().balanceData }
        );
        
        set({ 
          balanceData: newBalanceData,
          lastCalculationTime: {
            ...get().lastCalculationTime,
            [periodKey]: new Date().toISOString()
          },
          modifiedPeriods: {
            ...modifiedPeriods,
            [periodKey]: false
          },
          calculatedPeriods: {
            ...calculatedPeriods,
            [periodKey]: true
          }
        });
      }
      
      if (!calculatedPeriods.weekly || modifiedPeriods.weekly) {
        const newPieChartData = chartCalculations.generatePieChartData(
          habitStore.habits,
          typedHabitStatus
        );
        
        set({ 
          pieChartData: newPieChartData,
          lastCalculationTime: {
            ...get().lastCalculationTime,
            pie: new Date().toISOString()
          }
        });
      }
      
    } catch (error) {
      // Error handling silently
    } finally {
      set({ isSyncing: false });
    }
  },
  
  markPeriodAsModified: (period, habitIds) => {
    const modifiedPeriods = { ...get().modifiedPeriods };
    
    switch(period) {
      case 'weekly':
        modifiedPeriods.weekly = true;
        break;
      case 'monthly':
        modifiedPeriods.monthly = true;
        break;
      case 'yearly':
        modifiedPeriods.yearly = true;
        break;
    }
    
    const lastModifiedHabits = [...get().lastModifiedHabits, ...habitIds];
    const uniqueHabits = Array.from(new Set(lastModifiedHabits));
    
    set({ 
      modifiedPeriods,
      lastModifiedHabits: uniqueHabits
    });
  },
  
  setCurrentPeriod: (period) => {
    const currentPeriod = get().currentPeriod;
    
    if (currentPeriod !== period) {
      set({ currentPeriod: period });
      get().calculatePeriodOnDemand(period);
    }
  },
  
  isSyncing: false,
  
  regenerateChartData: async () => {
    set({ isSyncing: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const currentPeriod = get().currentPeriod;
      await get().calculatePeriodOnDemand(currentPeriod);
      await get().saveChartData();
      
    } catch (error) {
      // Error handling silently
    } finally {
      set({ isSyncing: false });
    }
  },
  
  initializeChartData: async () => {
    try {
      set({ isSyncing: true });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSyncing: false });
        return;
      }

      const { data: chartData, error: chartError } = await supabase
        .from('habit_charts')
        .select('*')
        .eq('user_id', user.id);
      
      if (chartError || !chartData || chartData.length === 0) {
        // No data found or error occurred
      }
      
      let balanceData: BalanceData[] = [];
      let weeklyBalanceData: BalanceData[] = [];
      let pieChartData: Array<{ name: string; value: number; color: string }> = [];
      let monthlyTrendData: any[] = [];
      let yearlyTrendData: any[] = [];
      let performanceData: any[] = [];
      
      const performanceItem = chartData?.find(item => item.chart_type === 'performance_data');

      if (performanceItem) {
        try {
          let parsedData = JSON.parse(performanceItem.data);
          performanceData = parsedData.map((entry: any) => ({
            day: entry.day,
            status: entry.status,
            points: entry.points,
            time: entry.time
          }));
        } catch (e) {
          performanceData = [];
        }
      }

      chartData?.forEach(item => {
        if (item.chart_type === 'balance_data') {
          try {
            let parsedData;
            try {
              parsedData = JSON.parse(item.data);
            } catch (e) {
              parsedData = [];
            }
            
            const processedData = parsedData.map((dataItem: any) => {
              const result: any = { period: dataItem.period };
              Object.keys(dataItem).forEach(key => {
                if (key !== 'period') {
                  const value = typeof dataItem[key] === 'string' 
                    ? parseFloat(dataItem[key]) 
                    : dataItem[key];
                  result[key] = isNaN(value) ? 0 : value;
                }
              });
              return result;
            });
            
            balanceData = processedData;
          } catch (e) {
            // Silent error handling
          }
        } else if (item.chart_type === 'weekly_balance_data') {
          try {
            let parsedData;
            try {
              parsedData = JSON.parse(item.data);
            } catch (e) {
              parsedData = [];
            }
            
            const processedData = parsedData.map((dataItem: any) => {
              const result: any = { 
                period: dataItem.period,
                displayPeriod: dataItem.displayPeriod
              };
              
              Object.keys(dataItem).forEach(key => {
                if (key !== 'period' && key !== 'displayPeriod') {
                  const value = typeof dataItem[key] === 'string' 
                    ? parseFloat(dataItem[key]) 
                    : dataItem[key];
                  result[key] = isNaN(value) ? 0 : value;
                }
              });
              return result;
            });
            
            weeklyBalanceData = processedData;
          } catch (e) {
            // Silent error handling
          }
        } else if (item.chart_type === 'pie_chart_data') {
          try {
            const parsedData = JSON.parse(item.data);
            
            const processedData = parsedData.map((dataItem: any) => ({
              ...dataItem,
              value: Number(dataItem.value)
            }));
            
            pieChartData = processedData;
          } catch (e) {
            // Silent error handling
          }
        } else if (item.chart_type === 'monthly_trend_data') {
          try {
            let parsedData;
            try {
              parsedData = JSON.parse(item.data);
            } catch (e) {
              parsedData = [];
            }
            
            const processedData = parsedData.map((dataItem: any) => {
              const result: any = { 
                period: dataItem.period,
                dayNumber: dataItem.dayNumber
              };
              Object.keys(dataItem).forEach(key => {
                if (key !== 'period' && key !== 'dayNumber') {
                  const value = typeof dataItem[key] === 'string' 
                    ? parseFloat(dataItem[key]) 
                    : dataItem[key];
                  result[key] = isNaN(value) ? 0 : value;
                }
              });
              return result;
            });
            
            monthlyTrendData = processedData;
          } catch (e) {
            // Silent error handling
          }
        } else if (item.chart_type === 'yearly_trend_data') {
          try {
            let parsedData;
            try {
              parsedData = JSON.parse(item.data);
            } catch (e) {
              parsedData = [];
            }
            
            const processedData = parsedData.map((dataItem: any) => {
              // Inicializar con valores básicos
              const result: any = { 
                period: dataItem.period || '',
                monthIndex: dataItem.monthIndex || 0,
                month: dataItem.month || dataItem.monthName || '',
                points: 0,
                lastYearPoints: 0
              };
              
              // Calcular la suma total de puntos para este mes
              let totalPoints = 0;
              
              // Procesar cada propiedad, manteniendo los nombres de hábitos
              Object.entries(dataItem).forEach(([key, value]) => {
                // Mantener todas las propiedades originales
                if (key !== 'period' && key !== 'monthIndex' && key !== 'monthName') {
                  // Convertir a número si es posible
                  const numValue = typeof value === 'string' ? parseFloat(value as string) : Number(value);
                  result[key] = isNaN(numValue) ? 0 : numValue;
                  
                  // Si no es una propiedad estándar, sumar al total de puntos
                  if (key !== 'points' && key !== 'lastYearPoints' && key !== 'month' && 
                      key !== 'completedDays' && key !== 'totalDays') {
                    totalPoints += isNaN(numValue) ? 0 : numValue;
                  }
                }
              });
              
              // Asignar el total calculado a points si no existe ya
              if (!dataItem.points) {
                result.points = totalPoints;
              }
              
              // Mapear meses en español a inglés si es necesario
              if (result.month === 'ene') result.month = 'january';
              if (result.month === 'feb') result.month = 'february';
              if (result.month === 'mar') result.month = 'march';
              if (result.month === 'abr') result.month = 'april';
              if (result.month === 'may') result.month = 'may';
              if (result.month === 'jun') result.month = 'june';
              if (result.month === 'jul') result.month = 'july';
              if (result.month === 'ago') result.month = 'august';
              if (result.month === 'sep') result.month = 'september';
              if (result.month === 'oct') result.month = 'october';
              if (result.month === 'nov') result.month = 'november';
              if (result.month === 'dic') result.month = 'december';
              
              return result;
            });
            
            // Log para debug
            const juneData = processedData.find((item: any) => item.month === 'june');
            
            yearlyTrendData = processedData;
          } catch (e) {
            // Silent error handling
          }
        }
      });
      
      const now = new Date().toISOString();
      
      const hasWeeklyData = weeklyBalanceData && weeklyBalanceData.length > 0;
      const hasMonthlyOrYearlyData = balanceData && balanceData.length > 0;
      const hasMonthlyTrendData = monthlyTrendData && monthlyTrendData.length > 0;
      const hasYearlyTrendData = yearlyTrendData && yearlyTrendData.length > 0;
      
      const monthlyHasPositiveValues = hasMonthlyTrendData && monthlyTrendData.some(item => {
        return Object.entries(item).some(([key, value]) => {
          return key !== 'period' && key !== 'dayNumber' && typeof value === 'number' && value > 0;
        });
      });
      
      const yearlyHasPositiveValues = hasYearlyTrendData && yearlyTrendData.some(item => {
        return Object.entries(item).some(([key, value]) => {
          return key !== 'period' && key !== 'monthIndex' && key !== 'monthName' && 
                 key !== 'month' && typeof value === 'number' && value > 0;
        });
      });
      
      set({
        balanceData,
        weeklyBalanceData,
        pieChartData,
        monthlyTrendData,
        yearlyTrendData,
        performanceData,
        lastCalculationTime: {
          weekly: now,
          monthly: now,
          yearly: now,
          pie: now
        },
        calculatedPeriods: {
          weekly: hasWeeklyData,
          monthly: hasMonthlyOrYearlyData,
          yearly: hasMonthlyOrYearlyData
        },
        modifiedPeriods: {
          weekly: !hasWeeklyData,
          monthly: !hasMonthlyOrYearlyData,
          yearly: !hasMonthlyOrYearlyData
        }
      });
      
      const currentPeriod = get().currentPeriod;
      const needsCalculation = currentPeriod === 'week' ? !hasWeeklyData : !hasMonthlyOrYearlyData;
      
      const habitStore = useHabitStore.getState();
      const hasHabitStatus = Object.keys(habitStore.habitStatus).length > 0;
      const hasCompletedHabits = Object.values(habitStore.habitStatus).some(
        status => status && status.status === 'completed'
      );
      
      if (hasHabitStatus && hasCompletedHabits && (!monthlyHasPositiveValues || !yearlyHasPositiveValues)) {
        const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
        
        const typedHabitStatus: Record<string, HabitStatus> = {};
        Object.entries(habitStore.habitStatus).forEach(([key, value]) => {
          typedHabitStatus[key] = {
            status: value.status as "" | "completed" | "pending",
            time: ''
          };
        });
        
        const monthlyResult = generateTrendData(habitStore.habits, typedHabitStatus, 'month', new Date());
        if (monthlyResult && monthlyResult.data) {
          set({ monthlyTrendData: monthlyResult.data });
        }
        
        const yearlyResult = generateTrendData(habitStore.habits, typedHabitStatus, 'year', new Date());
        if (yearlyResult && yearlyResult.data) {
          set({ yearlyTrendData: yearlyResult.data });
        }
        
        get().saveChartData();
      }
      
      if (needsCalculation) {
        await get().calculatePeriodOnDemand(currentPeriod);
      }
      
      set({
        balanceData,
        weeklyBalanceData,
        pieChartData,
        monthlyTrendData,
        yearlyTrendData,
        performanceData,
        lastCalculationTime: {
          weekly: now,
          monthly: now,
          yearly: now,
          pie: now
        },
        calculatedPeriods: {
          weekly: hasWeeklyData,
          monthly: hasMonthlyOrYearlyData,
          yearly: hasMonthlyOrYearlyData
        },
        modifiedPeriods: {
          weekly: !hasWeeklyData,
          monthly: !hasMonthlyOrYearlyData,
          yearly: !hasMonthlyOrYearlyData
        }
      });
      
    } catch (error) {
      // Silent error handling
    } finally {
      set({ isSyncing: false });
    }
  },
  
  saveChartData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const now = new Date().toISOString();
      
      await supabase
        .from('habit_charts')
        .upsert({
          user_id: user.id,
          chart_type: 'balance_data',
          data: JSON.stringify(get().balanceData),
          created_at: now,
          updated_at: now
        }, {
          onConflict: 'user_id,chart_type',
          ignoreDuplicates: false
        });
      
      await supabase
        .from('habit_charts')
        .upsert({
          user_id: user.id,
          chart_type: 'weekly_balance_data',
          data: JSON.stringify(get().weeklyBalanceData),
          created_at: now,
          updated_at: now
        }, {
          onConflict: 'user_id,chart_type',
          ignoreDuplicates: false
        });
      
      await supabase
        .from('habit_charts')
        .upsert({
          user_id: user.id,
          chart_type: 'pie_chart_data',
          data: JSON.stringify(get().pieChartData),
          created_at: now,
          updated_at: now
        }, {
          onConflict: 'user_id,chart_type',
          ignoreDuplicates: false
        });
      
      if (get().monthlyTrendData && get().monthlyTrendData.length > 0) {
        await supabase
          .from('habit_charts')
          .upsert({
            user_id: user.id,
            chart_type: 'monthly_trend_data',
            data: JSON.stringify(get().monthlyTrendData),
            created_at: now,
            updated_at: now
          }, {
            onConflict: 'user_id,chart_type',
            ignoreDuplicates: false
          });
      }
      
      if (get().yearlyTrendData && get().yearlyTrendData.length > 0) {
        await supabase
          .from('habit_charts')
          .upsert({
            user_id: user.id,
            chart_type: 'yearly_trend_data',
            data: JSON.stringify(get().yearlyTrendData),
            created_at: now,
            updated_at: now
          }, {
            onConflict: 'user_id,chart_type',
            ignoreDuplicates: false
          });
      }
      
      if (get().performanceData && get().performanceData.length > 0) {
        await supabase
          .from('habit_charts')
          .upsert({
            user_id: user.id,
            chart_type: 'performance_data',
            data: JSON.stringify(get().performanceData),
            created_at: now,
            updated_at: now
          }, {
            onConflict: 'user_id,chart_type',
            ignoreDuplicates: false
          });
      }
      
      await supabase
        .from('chart_metadata')
        .upsert({
          user_id: user.id,
          last_update: now,
          version: 1
        });
        
    } catch (error) {
      // Silent error handling
    }
  },
  
  forceRegenerateData: (newCompletedDay = false, completedDate?: Date) => {
    const habitStore = useHabitStore.getState();
    const currentDate = new Date();
    const currentPeriod = get().currentPeriod;
    
    if (newCompletedDay && completedDate) {
      const completedHabitIds: string[] = [];
      
      if (completedDate) {
        const dateStr = completedDate.toISOString().split('T')[0];
        
        Object.entries(habitStore.habitStatus).forEach(([key, value]) => {
          if (key.includes(dateStr) && value.status === 'completed') {
            const habitId = key.split('-')[0];
            completedHabitIds.push(habitId);
          }
        });
        
        if (completedHabitIds.length > 0) {
          get().markPeriodAsModified('weekly', completedHabitIds);
          get().markPeriodAsModified('monthly', completedHabitIds);
          get().markPeriodAsModified('yearly', completedHabitIds);
        }
      }
    }
    
    let habitStatusToUse = { ...habitStore.habitStatus };
    
    if (newCompletedDay && completedDate && Object.keys(habitStatusToUse).length === 0) {
      const dateStr = completedDate.toISOString().split('T')[0];
      
      const activeHabit = habitStore.habits.find(habit => {
        const startDate = new Date(habit.startDate);
        const isAfterStart = completedDate >= startDate;
        
        let isBeforeEnd = true;
        if (!habit.isIndefinite && habit.endDate) {
          const endDate = new Date(habit.endDate);
          isBeforeEnd = completedDate <= endDate;
        }
        
        return isAfterStart && isBeforeEnd;
      });
      
      if (activeHabit) {
        const statusKey = `${activeHabit.id}-${dateStr}`;
        habitStatusToUse[statusKey] = { status: 'completed' as '' | 'completed' | 'pending' };
        
        get().markPeriodAsModified('weekly', [String(activeHabit.id)]);
        get().markPeriodAsModified('monthly', [String(activeHabit.id)]);
        get().markPeriodAsModified('yearly', [String(activeHabit.id)]);
      }
    }
    
    const typedHabitStatus: Record<string, HabitStatus> = {};
    Object.entries(habitStatusToUse).forEach(([key, value]) => {
      typedHabitStatus[key] = {
        status: value.status as "" | "completed" | "pending"
      };
      
      if ('time' in value) {
        (typedHabitStatus[key] as any).time = value.time;
      }
    });
    
    get().calculatePeriodOnDemand(currentPeriod);
    
    if (newCompletedDay && completedDate) {
      try {
        const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
        
        const monthlyResult = generateTrendData(habitStore.habits, typedHabitStatus, 'month', currentDate);
        if (monthlyResult && monthlyResult.data) {
          get().setMonthlyTrendData(monthlyResult.data);
        }
        
        const yearlyResult = generateTrendData(habitStore.habits, typedHabitStatus, 'year', currentDate);
        if (yearlyResult && yearlyResult.data) {
          get().setYearlyTrendData(yearlyResult.data);
        }
        
        get().saveChartData();
      } catch (error) {
        // Silent error handling
      }
    }
  }
}));