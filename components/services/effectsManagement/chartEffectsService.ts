import { 
  Habit, 
  HabitStatus, 
  GraphDataPoint, 
  BalanceData,
  ProgressDataPoint
} from '@/components/types/types';
import { generateTrendData, ViewPeriodType } from '../chartCalculations/trendCalculations';
import { generatePerformanceGraphData } from '../chartCalculations/performanceGraphCalculations';
import { HabitDataService } from '../habitDataManagement/habitDataService';

export class ChartEffectsService {
  private static cache = new Map<string, any>();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  private static pendingUpdates = new Map<string, Promise<any>>();

  private static getCacheKey(habitId: number, date: string, type: string): string {
    return `${habitId}-${date}-${type}`;
  }

  private static getFromCache(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private static setInCache(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Generar datos para gráficos de rendimiento
  static generatePerformanceData(
    habit: Habit,
    habitStatus: Record<string, HabitStatus>,
    currentDate: Date
  ): GraphDataPoint[] {
    if (!habit || habit.index === undefined) {
      console.warn('Invalid habit or missing index property:', habit);
      return [];
    }
    
    const cacheKey = this.getCacheKey(
      habit.index,
      currentDate.toISOString(),
      'performance'
    );

    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const data = generatePerformanceGraphData(habit, habitStatus, currentDate);
      this.setInCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error generating performance data:', error);
      return [];
    }
  }

  // Generar datos de tendencias (corregido el tipo de period)
  static generateTrendData(
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    period: ViewPeriodType,
    currentDate: Date
  ): { data: ProgressDataPoint[] } {
    return generateTrendData(habits, habitStatus, period, currentDate);
  }

  // Actualizar datos de gráficos (implementación completa)
  static updateChartData(
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    currentDate: Date,
    selectedHabitIndex: number | undefined,
    setters: {
      setBalanceData: (data: BalanceData[]) => void;
      setPieChartData: (data: any[]) => void;
      setGraphData: (data: GraphDataPoint[]) => void;
      setPerformanceData: (data: any) => void;
    }
  ) {
    try {
      const data = HabitDataService.generateAllChartData(
        habits,
        habitStatus,
        currentDate,
        selectedHabitIndex
      );

      setters.setBalanceData(data.balanceData);
      setters.setPieChartData(data.pieChartData);
      setters.setGraphData(data.graphData);
      setters.setPerformanceData(data.performanceData);
    } catch (error) {
      console.error('Error updating chart data:', error);
    }
  }

  // Programar actualizaciones periódicas de gráficos con manejo de errores
  static scheduleChartUpdates(
    interval: number,
    updateFunction: () => void
  ): () => void {
    let timer: NodeJS.Timeout;
    
    const safeUpdate = () => {
      try {
        updateFunction();
      } catch (error) {
        console.error('Error in scheduled chart update:', error);
      }
    };

    timer = setInterval(safeUpdate, interval);
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }

  // Añadir control de concurrencia para actualizaciones
  static async updateChartDataWithConcurrency(
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    currentDate: Date,
    selectedHabitIndex: number | undefined,
    setters: {
      setBalanceData: (data: BalanceData[]) => void;
      setPieChartData: (data: any[]) => void;
      setGraphData: (data: GraphDataPoint[]) => void;
      setPerformanceData: (data: any) => void;
    }
  ) {
    const updateKey = `update-${currentDate.toISOString()}-${selectedHabitIndex}`;

    // Si ya hay una actualización pendiente, esperar a que termine
    if (this.pendingUpdates.has(updateKey)) {
      await this.pendingUpdates.get(updateKey);
      return;
    }

    const updatePromise = (async () => {
      try {
        const data = await HabitDataService.generateAllChartData(
          habits,
          habitStatus,
          currentDate,
          selectedHabitIndex
        );

        setters.setBalanceData(data.balanceData);
        setters.setPieChartData(data.pieChartData);
        setters.setGraphData(data.graphData);
        setters.setPerformanceData(data.performanceData);
      } catch (error) {
        console.error('Error updating chart data:', error);
      } finally {
        this.pendingUpdates.delete(updateKey);
      }
    })();

    this.pendingUpdates.set(updateKey, updatePromise);
    await updatePromise;
  }

  // Añadir método público para verificar el estado de las actualizaciones
  static isUpdating(): boolean {
    return this.pendingUpdates.size > 0;
  }

  static async generateAllChartData(
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    currentDate: Date,
    selectedHabitIndex: number | undefined
  ) {
    // Add null check to prevent errors when selectedHabitIndex is invalid
    const selectedHabit = selectedHabitIndex !== undefined && habits[selectedHabitIndex] 
      ? habits[selectedHabitIndex] 
      : habits[0] || null;

    return {
      balanceData: this.generateBalanceData(habits, habitStatus, currentDate),
      pieChartData: this.generatePieChartData(habits, habitStatus),
      graphData: selectedHabit 
        ? this.generatePerformanceData(selectedHabit, habitStatus, currentDate)
        : [],
      performanceData: this.calculatePerformanceMetrics(habits, habitStatus, currentDate)
    };
  }

  static generateBalanceData(habits: Habit[], habitStatus: Record<string, HabitStatus>, currentDate: Date): BalanceData[] {
    return habits.map(habit => ({
      id: habit.id,
      name: habit.name,
      value: 0,
      color: habit.color,
      period: currentDate.toISOString().split('T')[0]
    }));
  }

  static generatePieChartData(habits: Habit[], habitStatus: Record<string, HabitStatus>) {
    return habits.map(habit => ({
      name: habit.name,
      value: 0,
      color: habit.color
    }));
  }

  static calculatePerformanceMetrics(habits: Habit[], habitStatus: Record<string, HabitStatus>, currentDate: Date) {
    return {
      completionRate: 0,
      streakAverage: 0,
      totalCompleted: 0
    };
  }
}
