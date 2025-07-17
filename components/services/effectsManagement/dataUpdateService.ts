import { 
  Habit, 
  HabitStatus, 
  MonthlyDataType,
  ProgressDataPoint 
} from '@/components/types/types';
import { generateAnnualData } from '@/components/custom-hooks/habitAnalytics';

interface AnnualDataResult {
  monthlyData: MonthlyDataType[];
  annualData: Array<{
    month: string;
    completionRate: number;
    improvementVsLastYear: number | undefined;
  }>;
  annualSummary: {
    totalCompleted: number;
    totalPartial: number;
    totalNotCompleted: number;
  };
}

export class DataUpdateService {
  private static cache = new Map<string, any>();
  private static CACHE_DURATION = 60 * 1000; // 1 minuto

  private static getCacheKey(habitIndex: number, year: number): string {
    return `annual-${habitIndex}-${year}`;
  }

  // Actualizar datos anuales con tipos específicos
  static updateAnnualData(
    habitIndex: number,
    year: number,
    habitStatus: Record<string, HabitStatus>
  ): AnnualDataResult {
    const cacheKey = this.getCacheKey(habitIndex, year);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const { monthlyData, annualSummary } = generateAnnualData(
      habitIndex,
      year,
      habitStatus
    );

    const result = {
      monthlyData,
      annualData: monthlyData.map(data => ({
        ...data,
        improvementVsLastYear: data.improvementVsLastYear ?? undefined
      })),
      annualSummary
    };

    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  // Actualizar datos de progreso con tipos específicos
  static updateProgressData(
    progressChartData: ProgressDataPoint[],
    setProgressChartData: (data: ProgressDataPoint[]) => void
  ): void {
    const newData = progressChartData.map((item) => ({
      ...item,
      value: parseFloat(Number(item.value).toFixed(2)),
    }));

    if (JSON.stringify(newData) !== JSON.stringify(progressChartData)) {
      setProgressChartData(newData);
    }
  }

  // Manejar actualizaciones debounced con cleanup apropiado
  static debouncedUpdate(
    updateFunction: () => void,
    delay: number
  ): () => void {
    let timeoutId: NodeJS.Timeout | undefined;
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(updateFunction, delay);
    };
  }

  // Limpiar recursos con manejo de errores
  static cleanup(cleanupFunctions: (() => void)[]): void {
    cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
  }
}
