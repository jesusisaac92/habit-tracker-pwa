import { Habit, HabitStatus, BalanceData } from '@/components/types/types';

// Tipo para la clave de caché
type CacheKey = string;

// Interfaces para los diferentes tipos de caché
interface BalanceDataCache {
  [key: CacheKey]: {
    data: BalanceData[];
    timestamp: number;
    habitsHash: string;
    statusHash: string;
  }
}

interface PieChartCache {
  [key: CacheKey]: {
    data: Array<{ name: string; value: number; color: string; }>;
    timestamp: number;
    habitsHash: string;
    statusHash: string;
  }
}

// Objeto global de caché
const cache: {
  balanceData: BalanceDataCache;
  pieChartData: PieChartCache;
} = {
  balanceData: {},
  pieChartData: {}
};

// Tiempo de expiración de caché en milisegundos (10 minutos)
const CACHE_EXPIRY = 10 * 60 * 1000;

/**
 * Genera un hash simple para una colección de hábitos
 */
export const generateHabitsHash = (habits: Habit[]): string => {
  // Use ID and other properties to detect changes
  return habits
    .map(h => {
      // Use id and a combination of other properties that might change
      const lastUpdate = new Date().toISOString().split('T')[0]; // Use current date as fallback
      return `${h.id}:${h.name}:${h.currentStreak}`;
    })
    .sort()
    .join('|');
};

/**
 * Genera un hash para el estado de los hábitos
 */
export const generateStatusHash = (habitStatus: Record<string, HabitStatus>): string => {
  // Conseguir todas las claves que representan hábitos completados
  const completedKeys = Object.entries(habitStatus)
    .filter(([_, status]) => status.status === 'completed')
    .map(([key]) => key)
    .sort()
    .join('|');
  
  return completedKeys;
};

/**
 * Genera una clave única para el caché basada en los parámetros
 */
export const generateCacheKey = (
  period: 'week' | 'month' | 'year',
  date: Date,
  options?: { [key: string]: any }
): string => {
  const dateStr = date.toISOString().split('T')[0];
  const optionsStr = options ? Object.entries(options)
    .filter(([_, value]) => typeof value !== 'function' && typeof value !== 'object')
    .map(([key, value]) => `${key}:${value}`)
    .join(',') : '';
  
  return `${period}-${dateStr}-${optionsStr}`;
};

/**
 * Verifica si un valor en caché ha expirado
 */
const isCacheExpired = (timestamp: number): boolean => {
  return Date.now() - timestamp > CACHE_EXPIRY;
};

/**
 * Memoriza los cálculos de balance y devuelve resultados en caché si están disponibles
 */
export const memoizedBalanceCalculation = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  currentDate: Date,
  period: 'week' | 'month' | 'year',
  options: any,
  calculationFn: Function
): BalanceData[] => {
  // Generar clave de caché
  const cacheKey = generateCacheKey(period, currentDate, options);
  const habitsHash = generateHabitsHash(habits);
  const statusHash = generateStatusHash(habitStatus);
  
  // Verificar si tenemos un resultado en caché
  const cachedResult = cache.balanceData[cacheKey];
  
  // Si hay un valor en caché válido y los hábitos/estado no han cambiado, usarlo
  if (
    cachedResult && 
    !isCacheExpired(cachedResult.timestamp) && 
    cachedResult.habitsHash === habitsHash &&
    cachedResult.statusHash === statusHash
  ) {
    return cachedResult.data;
  }
  
  // Si no hay caché o expiró, calcular y almacenar
  const result = calculationFn(habits, habitStatus, currentDate, period, options);
  
  // Guardar en caché
  cache.balanceData[cacheKey] = {
    data: result,
    timestamp: Date.now(),
    habitsHash,
    statusHash
  };
  
  return result;
};

/**
 * Memoriza los cálculos de gráfico de pastel
 */
export const memoizedPieChartCalculation = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  calculationFn: Function
): Array<{ name: string; value: number; color: string; }> => {
  // Generar clave de caché (solo usamos fecha actual para pie chart)
  const cacheKey = `pie-${new Date().toISOString().split('T')[0]}`;
  const habitsHash = generateHabitsHash(habits);
  const statusHash = generateStatusHash(habitStatus);
  
  // Verificar si tenemos un resultado en caché
  const cachedResult = cache.pieChartData[cacheKey];
  
  // Si hay un valor en caché válido y los hábitos/estado no han cambiado, usarlo
  if (
    cachedResult && 
    !isCacheExpired(cachedResult.timestamp) && 
    cachedResult.habitsHash === habitsHash &&
    cachedResult.statusHash === statusHash
  ) {
    return cachedResult.data;
  }
  
  // Si no hay caché o expiró, calcular y almacenar
  const result = calculationFn(habits, habitStatus);
  
  // Guardar en caché
  cache.pieChartData[cacheKey] = {
    data: result,
    timestamp: Date.now(),
    habitsHash,
    statusHash
  };
  
  return result;
};

/**
 * Invalida toda la caché o entradas específicas
 */
export const invalidateCache = (
  type?: 'balance' | 'pie',
  period?: 'week' | 'month' | 'year'
): void => {
  if (!type) {
    // Invalidar toda la caché
    cache.balanceData = {};
    cache.pieChartData = {};
    return;
  }
  
  if (type === 'balance' && period) {
    // Invalidar solo entradas específicas del período
    Object.keys(cache.balanceData).forEach(key => {
      if (key.startsWith(period)) {
        delete cache.balanceData[key];
      }
    });
  } else if (type === 'balance') {
    // Invalidar todas las entradas de balance
    cache.balanceData = {};
  } else if (type === 'pie') {
    // Invalidar todas las entradas de gráfico de pastel
    cache.pieChartData = {};
  }
};

/**
 * Limpia entradas expiradas de la caché
 */
export const cleanupCache = (): void => {
  // Limpiar balance data
  Object.entries(cache.balanceData).forEach(([key, value]) => {
    if (isCacheExpired(value.timestamp)) {
      delete cache.balanceData[key];
    }
  });
  
  // Limpiar pie chart data
  Object.entries(cache.pieChartData).forEach(([key, value]) => {
    if (isCacheExpired(value.timestamp)) {
      delete cache.pieChartData[key];
    }
  });
};

// Programar limpieza periódica de caché (cada 30 minutos)
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 30 * 60 * 1000);
}