import { supabase } from '../config/client';
import { useChartStore } from '@/store/useChartStore';
import { 
  chartCalculations
} from '@/components/services/chartCalculations/calculations';
import { updateChartMetadata } from './chartMetadata.service';
import { HabitStatus } from '@/components/types/types';

// Definir constantes para los tipos de gráficos
export const CHART_TYPES = {
  BALANCE: 'balance_data',
  WEEKLY_BALANCE: 'weekly_balance_data',
  PIE: 'pie_chart_data',
  PERFORMANCE: 'performance_data',
  PROGRESS_TREND: 'progress_trend_data',
  MONTHLY_TREND: 'monthly_trend_data',
  YEARLY_TREND: 'yearly_trend_data'
};

export interface ChartData {
  user_id: string;
  chart_type: string;
  data: string; // JSON string
  created_at: string;
  updated_at: string;
}

interface ChartItem {
  period: string;
  fullPeriod?: string;
  displayPeriod?: string;
  [key: string]: string | number | undefined;
}

export const habitChartsService = {
  /**
   * Obtiene los datos de gráficos para un usuario específico
   */
  async getChartData(userId: string, chartType: string): Promise<{ success: boolean; data?: any; error?: any }> {
    if (!userId) {
      return { success: false, error: 'No se proporcionó un ID de usuario' };
    }

    const { data, error } = await supabase
      .from('habit_charts')
      .select('*')
      .eq('user_id', userId)
      .eq('chart_type', chartType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { success: false, error };
    }

    let parsedData = null;
    if (data && data.data) {
      try {
        parsedData = JSON.parse(data.data);
      } catch (parseError) {
        return { success: false, error: parseError };
      }
    }

    const normalizedData = habitChartsService.normalizeChartData(chartType, parsedData);
    return { success: true, data: normalizedData };
  },

  /**
   * Carga todos los datos de gráficos para un usuario y actualiza el store
   */
  async loadUserChartData(userId: string): Promise<{ success: boolean; error?: any }> {
    try {
      if (!userId) {
        return { success: false, error: 'No se proporcionó un ID de usuario' };
      }
      
      // Cargar todos los tipos de gráficos
      const chartTypes = Object.values(CHART_TYPES);
      
      for (const chartType of chartTypes) {
        const result = await habitChartsService.getChartData(userId, chartType);
        
        if (result.success && result.data) {
          let parsedData;
          
          try {
            // Intentar parsear los datos
            parsedData = typeof result.data === 'string' 
              ? JSON.parse(result.data) 
              : result.data;
            
            // Normalizar según el tipo
            if (chartType === CHART_TYPES.BALANCE) {
              // Asegurarnos de que los valores decimales se mantengan
              parsedData = parsedData.map((item: any) => {
                const result: any = { period: item.period };
                Object.entries(item).forEach(([key, value]) => {
                  if (key !== 'period') {
                    // Usar parseFloat para mantener decimales
                    const numValue = parseFloat(value as string);
                    // Asegurar que siempre tenga al menos un decimal
                    result[key] = numValue % 1 === 0 ? parseFloat(numValue.toFixed(1)) : numValue;
                  } else {
                    result[key] = value;
                  }
                });
                return result;
              });
            } else if (chartType === CHART_TYPES.PIE) {
              parsedData = habitChartsService.normalizeChartData(chartType, parsedData);
            } else if (chartType === CHART_TYPES.MONTHLY_TREND) {
              // Detectar si estamos ante el formato antiguo (weekly) o el nuevo (daily)
              const isOldFormat = Array.isArray(parsedData) && parsedData.length > 0 && 
                                  (parsedData[0].week !== undefined || parsedData[0].startDate !== undefined);
              
              if (isOldFormat) {
                // Obtener los hábitos y estado actual para regenerar los datos
                const { data: habits } = await supabase
                  .from('habits')
                  .select('*')
                  .eq('user_id', userId);
                
                const { data: habitStatusData } = await supabase
                  .from('habit_status')
                  .select('*')
                  .eq('user_id', userId);
                
                const habitStatus: Record<string, any> = {};
                if (habitStatusData) {
                  habitStatusData.forEach((status: any) => {
                    const key = status.key || '';
                    habitStatus[key] = status;
                  });
                }
                
                // Regenerar los datos usando el formato correcto
                const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
                const currentDate = new Date();
                const result = generateTrendData(habits || [], habitStatus, 'month', currentDate);
                parsedData = result.data;
                
                // Guardar los datos regenerados
                this.updateChartData(userId, CHART_TYPES.MONTHLY_TREND, parsedData)
                  .catch(err => console.error('Error al actualizar datos mensuales:', err));
              } else {
                // Normalizar datos de tendencia mensual para asegurar que son numéricos
                parsedData = Array.isArray(parsedData) ? parsedData.map((item: any) => {
                  const result: any = { 
                    period: item.period,
                    dayNumber: item.dayNumber 
                  };
                  Object.entries(item).forEach(([key, value]) => {
                    if (key !== 'period' && key !== 'dayNumber') {
                      // Usar parseFloat para mantener decimales
                      const numValue = parseFloat(value as string);
                      result[key] = isNaN(numValue) ? 0 : numValue;
                    }
                  });
                  return result;
                }) : [];
              }
            } else if (chartType === CHART_TYPES.YEARLY_TREND) {
              // Detectar si estamos ante el formato antiguo o el nuevo
              const isOldFormat = Array.isArray(parsedData) && parsedData.length > 0 && 
                                  (parsedData[0].month !== undefined && parsedData[0].percentage !== undefined);
              
              if (isOldFormat) {
                // Obtener los hábitos y estado actual para regenerar los datos
                const { data: habits } = await supabase
                  .from('habits')
                  .select('*')
                  .eq('user_id', userId);

                const { data: habitStatusData } = await supabase
                  .from('habit_status')
                  .select('*')
                  .eq('user_id', userId);

                const habitStatus: Record<string, any> = {};
                if (habitStatusData) {
                  habitStatusData.forEach((status: any) => {
                    const key = status.key || '';
                    habitStatus[key] = status;
                  });
                }
                
                // Regenerar los datos usando el formato correcto
                const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
                const currentDate = new Date();
                const result = generateTrendData(habits || [], habitStatus, 'year', currentDate);
                parsedData = result.data;
                
                // Guardar los datos regenerados
                try {
                  await this.updateChartData(userId, CHART_TYPES.YEARLY_TREND, parsedData);
                } catch (err) {
                  console.error('[ERROR][habitCharts.service] Error al actualizar datos anuales:', err);
                }
              } else {
                // Normalizar datos de tendencia anual para asegurar que son numéricos
                parsedData = Array.isArray(parsedData) ? parsedData.map((item: any) => {
                  // Inicializar resultado con propiedades base
                  const result: any = { 
                    period: item.period,
                    monthIndex: item.monthIndex,
                    month: item.month || item.monthName,
                    points: 0,  // Inicializar points en 0
                    lastYearPoints: 0  // Inicializar lastYearPoints en 0
                  };
                  
                  // Calcular la suma de todos los valores de hábitos para points
                  let totalPoints = 0;
                  
                  // Mantener los nombres de los hábitos y sus valores
                  Object.entries(item).forEach(([key, value]) => {
                    if (key !== 'period' && key !== 'monthIndex' && key !== 'monthName' && 
                        key !== 'month' && key !== 'points' && key !== 'lastYearPoints') {
                      // Usar parseFloat para mantener decimales
                      const numValue = parseFloat(value as string);
                      result[key] = isNaN(numValue) ? 0 : numValue;
                      
                      // Sumar al total de points si es un valor numérico
                      if (!isNaN(numValue)) {
                        totalPoints += numValue;
                      }
                    }
                  });
                  
                  // Asignar el total calculado a points
                  result.points = totalPoints;
                  
                  // Si ya tiene un valor de points, mantenerlo
                  if (item.points && !isNaN(parseFloat(item.points as string))) {
                    result.points = parseFloat(item.points as string);
                  }
                  
                  // Si ya tiene un valor de lastYearPoints, mantenerlo
                  if (item.lastYearPoints && !isNaN(parseFloat(item.lastYearPoints as string))) {
                    result.lastYearPoints = parseFloat(item.lastYearPoints as string);
                  }
                  
                  return result;
                }) : [];
              }
            }
            
            // Actualizar el store
            const chartStore = useChartStore.getState();
            
            switch (chartType) {
              case CHART_TYPES.BALANCE:
                chartStore.setBalanceData(parsedData);
                break;
              case CHART_TYPES.WEEKLY_BALANCE:
                chartStore.setWeeklyBalanceData(parsedData);
                break;
              case CHART_TYPES.PIE:
                chartStore.setPieChartData(parsedData);
                break;
              case CHART_TYPES.MONTHLY_TREND:
                chartStore.setMonthlyTrendData(parsedData);
                break;
              case CHART_TYPES.YEARLY_TREND:
                chartStore.setYearlyTrendData(parsedData);
                break;
              case CHART_TYPES.PROGRESS_TREND:
                chartStore.setProgressTrendData(parsedData);
                break;
              case CHART_TYPES.PERFORMANCE:
                chartStore.setPerformanceData(parsedData);
                break;
            }
          } catch (parseError) {
            // Silent error handling
            console.error(`Error al parsear datos de ${chartType}:`, parseError);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Actualiza los datos de un gráfico para un usuario específico
   */
  async updateChartData(userId: string, chartType: string, data: any): Promise<{ success: boolean; error?: any }> {
    try {
      // Obtener datos existentes
      const { data: existingData } = await supabase
        .from('habit_charts')
        .select('data')
        .eq('user_id', userId)
        .eq('chart_type', chartType)
        .maybeSingle();
      
      let dataToSave = data;
      
      // Para datos de tendencia mensual y anual, siempre reemplazar completamente
      if (chartType === CHART_TYPES.MONTHLY_TREND || chartType === CHART_TYPES.YEARLY_TREND) {
        // No fusionar, usar los datos nuevos directamente
      }
      // SOLUCIÓN PARA DATOS DE BALANCE
      else if (chartType === CHART_TYPES.BALANCE && Array.isArray(data)) {
        const existingParsed = existingData?.data ? JSON.parse(existingData.data) : [];
        
        // Para cada período en los datos nuevos
        const mergedData = [...existingParsed]; // Comenzar con los datos existentes
        
        // Añadir o actualizar con los datos nuevos
        data.forEach((newItem: ChartItem) => {
          // Buscar si este período ya existe en los datos fusionados
          // Ahora verificamos tanto el period como el fullPeriod para distinguir entre meses de diferentes años
          const existingItemIndex = mergedData.findIndex(item => {
            // Si tenemos fullPeriod en ambos, comparar ese primero (más preciso)
            if (newItem.fullPeriod && item.fullPeriod) {
              return item.fullPeriod === newItem.fullPeriod;
            }
            // De lo contrario, solo usar period
            return item.period === newItem.period;
          });
          
          if (existingItemIndex >= 0) {
            // Si existe, actualizar los valores
            const existingItem = mergedData[existingItemIndex];
            
            // Procesar cada hábito en el período nuevo
            Object.keys(newItem).forEach(key => {
              if (key !== 'period' && key !== 'fullPeriod') {
                // Inicializar el valor si no existe en el item existente
                if (existingItem[key] === undefined) {
                  existingItem[key] = 0;
                }
                
                // Convertir y corregir valores (con verificación de null/undefined)
                const existingValue = chartCalculations.fixPrecision(
                  parseFloat(existingItem[key] !== null && existingItem[key] !== undefined 
                    ? String(existingItem[key]) 
                    : '0') || 0
                );
                
                const newValue = chartCalculations.fixPrecision(
                  parseFloat(newItem[key] !== null && newItem[key] !== undefined 
                    ? String(newItem[key]) 
                    : '0') || 0
                );
                
                // Sumar el nuevo valor al existente
                if (newValue > 0) {
                  mergedData[existingItemIndex][key] = chartCalculations.fixPrecision(existingValue + newValue);
                }
              }
            });
            
            // Asegurarse de que fullPeriod está correctamente definido
            if (!mergedData[existingItemIndex].fullPeriod || mergedData[existingItemIndex].fullPeriod === 0) {
              // Extraer el año de la fecha actual si no podemos derivarlo
              let year = new Date().getFullYear();
              
              // Intentar extraer el año del fullPeriod del nuevo item si está disponible
              if (newItem.fullPeriod && typeof newItem.fullPeriod === 'string') {
                const parts = newItem.fullPeriod.split('-');
                if (parts.length > 1) {
                  const lastPart = parts[parts.length - 1];
                  if (!isNaN(parseInt(lastPart))) {
                    year = parseInt(lastPart);
                  }
                }
              }
              
              mergedData[existingItemIndex].fullPeriod = `${mergedData[existingItemIndex].period}-${year}`;
            }
          } else {
            // Si el período no existe, añadirlo tal cual
            // Asegurarse de que el nuevo período tiene fullPeriod
            if (!newItem.fullPeriod || newItem.fullPeriod === '' || newItem.fullPeriod === '0') {
              newItem.fullPeriod = `${newItem.period}-${new Date().getFullYear()}`;
            }
            
            mergedData.push(newItem);
          }
        });
        
        dataToSave = mergedData;
      }
      
      // Verificar que tenemos datos válidos para guardar
      if (!dataToSave) {
        return { success: false, error: 'No hay datos para guardar' };
      }
      
      // Asegurarse de que los fullPeriod no son 0 o null
      if (chartType === CHART_TYPES.BALANCE && Array.isArray(dataToSave)) {
        dataToSave = dataToSave.map(item => {
          // Si fullPeriod es 0, null o undefined, generar uno correcto
          if (!item.fullPeriod || item.fullPeriod === '' || item.fullPeriod === '0') {
            const currentYear = new Date().getFullYear();
            item.fullPeriod = `${item.period}-${currentYear}`;
          }
          return item;
        });
      }
      
      // Asegurarse de que los datos estén en formato JSON para la base de datos
      const dataJson = typeof dataToSave === 'string' ? dataToSave : JSON.stringify(dataToSave);
      
      const now = new Date().toISOString();
      
      // Asegurarse de que exista un registro o crearlo
      const { data: existingRecord, error: checkError } = await supabase
        .from('habit_charts')
        .select('id')
        .eq('user_id', userId)
        .eq('chart_type', chartType)
        .maybeSingle();
      
      let result;
      
      if (existingRecord) {
        // Actualizar registro existente
        result = await supabase
          .from('habit_charts')
          .update({
            data: dataJson,
            updated_at: now
          })
          .eq('user_id', userId)
          .eq('chart_type', chartType);
      } else {
        // Crear nuevo registro
        result = await supabase
          .from('habit_charts')
          .insert({
          user_id: userId,
          chart_type: chartType,
            data: dataJson,
            created_at: now,
            updated_at: now
          });
      }
      
      if (result.error) {
        return { success: false, error: result.error };
      }
      
      // Verificar si los datos se guardaron realmente
      const savedSuccessfully = await this.verificarDatosAlmacenados(userId, chartType);
      
      if (!savedSuccessfully) {
        return { success: false, error: 'Datos no guardados' };
      }
      
        // Notificar actualización
        const event = new Event('chartDataUpdated');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(event);
      }
      
      // Actualizar metadata con el timestamp
      await updateChartMetadata(userId, {
        last_update: now
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Inserta datos de prueba para verificar que la tabla funciona correctamente
   */
  async insertTestData(userId: string): Promise<{ success: boolean; data?: any; error?: any }> {
    try {
      if (!userId) {
        return { success: false, error: 'No se proporcionó un ID de usuario' };
      }

      const now = new Date().toISOString();
      const testChartType = `test_chart_${Date.now()}`;
      
      const testData = {
        user_id: userId,
        chart_type: testChartType,
        data: JSON.stringify({ test: true, timestamp: now }),
        created_at: now,
        updated_at: now
      };

      const { data, error } = await supabase
        .from('habit_charts')
        .insert(testData, { count: 'exact' });

      if (error) {
        return { success: false, error };
      }

      // Verificar si los datos se guardaron
      const saved = await this.verificarDatosAlmacenados(userId, testChartType);

      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  // Añadir una función para normalizar los datos
  normalizeChartData(chartType: string, data: any): any {
    switch(chartType) {
      case CHART_TYPES.BALANCE:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.WEEKLY_BALANCE:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.PIE:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.MONTHLY_TREND:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.YEARLY_TREND:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.PROGRESS_TREND:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      case CHART_TYPES.PERFORMANCE:
        if (!data || !Array.isArray(data)) return [];
        
        return data.map(item => {
          const normalized = { ...item };
          
          Object.entries(normalized).forEach(([key, value]) => {
            if (key !== 'period') {
              const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
              normalized[key] = isNaN(numValue) ? 0 : numValue;
            }
          });
          
          return normalized;
        });
        break;
      default:
        return data || [];
    }
  },

  /**
   * Regenera todos los datos de gráficos para un usuario
   */
  async regenerateChartData(
    userId: string,
    habitStatus: Record<string, HabitStatus>,
    habits: any[],
    currentDate: Date,
    skipBalanceData = false
  ): Promise<{ success: boolean, error?: any }> {
    try {
      if (!userId) {
        return { success: false, error: 'No se proporcionó un ID de usuario' };
      }
      
      // Regenerar datos de gráfico circular
      const pieChartData = chartCalculations.generatePieChartData(habits, habitStatus);
      await this.updateChartData(userId, CHART_TYPES.PIE, pieChartData);
      
      // Regenerar datos de tendencia de progreso
      const progressTrendData = this.generateProgressTrendData(habits, habitStatus, currentDate);
      await this.updateChartData(userId, CHART_TYPES.PROGRESS_TREND, progressTrendData);
      
      // Regenerar datos de tendencia mensual
      const monthlyTrendData = this.generateMonthlyTrendData(habits, habitStatus, currentDate);
      await this.updateChartData(userId, CHART_TYPES.MONTHLY_TREND, monthlyTrendData);
      
      // Regenerar datos de tendencia anual
      const yearlyTrendData = this.generateYearlyTrendData(habits, habitStatus, currentDate);
      await this.updateChartData(userId, CHART_TYPES.YEARLY_TREND, yearlyTrendData);
      
      // Regenerar datos de balance si no se omiten
      if (!skipBalanceData) {
        // Balance mensual
        const balanceData = chartCalculations.generateBalanceData(
          habits, 
          habitStatus, 
          currentDate,
          'month'
        );
        await this.updateChartData(userId, CHART_TYPES.BALANCE, balanceData);
        
        // Balance semanal
        const weeklyBalanceData = chartCalculations.generateBalanceData(
          habits,
          habitStatus,
          currentDate,
          'week'
        );
        await this.updateChartData(userId, CHART_TYPES.WEEKLY_BALANCE, weeklyBalanceData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('[ERROR] Error en regenerateChartData:', error);
      return { success: false, error };
    }
  },

  normalizeBalanceData(data: any[]): any[] {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => {
      const result: Record<string, any> = { period: item.period };
      
      // Procesar cada propiedad que no sea 'period'
      Object.entries(item).forEach(([key, value]) => {
        if (key !== 'period') {
          // IMPORTANTE: Convertir a número pero mantener decimales
          // Usar parseFloat en lugar de parseInt o Math.floor
          result[key] = typeof value === 'string' ? parseFloat(value) : value;
        }
      });
      
      return result;
    });
  },

  // Función auxiliar para verificar si los datos tienen solo valores cero
  hasOnlyZeroValues(data: any[]): boolean {
    if (!Array.isArray(data)) return false;
    
    return data.every(item => {
      const values = Object.entries(item)
        .filter(([key]) => key !== 'period' && key !== 'name' && key !== 'color')
        .map(([_, value]) => parseFloat(value as any));
      
      return values.length === 0 || values.every(v => v === 0);
    });
  },

  async generateChartData(userId: string, habitStatus: any, habits: any[], currentDate: Date) {
    try {
      // Usar el servicio existente para generar datos
      const { balanceData, pieChartData } = await import('@/components/services/effectsManagement/chartEffectsService')
        .then(module => {
          const ChartEffectsService = module.ChartEffectsService;
          return ChartEffectsService.generateAllChartData(habits, habitStatus, currentDate, undefined);
        });
      
      // Normalizar los datos antes de devolverlos
      const normalizedBalanceData = this.normalizeBalanceData(balanceData);
      
      return { balanceData: normalizedBalanceData, pieChartData };
    } catch (error) {
      return { 
        balanceData: [], 
        pieChartData: chartCalculations.generatePieChartData(habits, habitStatus) 
      };
    }
  },

  async cleanupTestData(userId: string) {
    try {
      const { error } = await supabase
        .from('habit_charts')
        .delete()
        .eq('user_id', userId)
        .or('chart_type.like.test%,chart_type.like.test-%');
        
      if (error) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  },

  // Funciones auxiliares para generar datos para diferentes tipos de gráficas
  generatePerformanceData(habits: any[], habitStatus: any, currentDate: Date) {
    // Implementación básica para datos de rendimiento
    return [
      { name: 'Completados', value: 75, color: '#10b981' },
      { name: 'Pendientes', value: 25, color: '#ef4444' }
    ];
  },

  generateProgressTrendData(habits: any[], habitStatus: any, currentDate: Date) {
    // Datos de tendencia de progreso (últimos 7 días)
    const days = [];
    const today = new Date(currentDate);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
      
      // Calcular completados para este día
      const dateString = date.toISOString().split('T')[0];
      let completed = 0;
      let total = 0;
      
      habits.forEach(habit => {
        total++;
        const key = `${habit.id}-${dateString}`;
        if (habitStatus[key] && habitStatus[key].status === 'completed') {
          completed++;
        }
      });
      
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      days.push({
        day: dayName,
        date: dateString,
        completed: completed,
        total: total,
        percentage: percentage
      });
    }
    
    return days;
  },

  generateMonthlyTrendData(habits: any[], habitStatus: any, currentDate: Date) {
    // Importar la función generateTrendData para usar su lógica
    const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
    
    // Generar datos usando la función correcta
    const result = generateTrendData(habits, habitStatus, 'month', currentDate);
    
    // Devolver solo los datos de tendencia (sin la información de hábitos)
    return result.data;
  },

  generateYearlyTrendData(habits: any[], habitStatus: any, currentDate: Date) {
    // Importar la función generateTrendData para usar su lógica
    const { generateTrendData } = require('@/components/services/chartCalculations/trendCalculations');
    
    // Generar datos usando la función correcta
    const result = generateTrendData(habits, habitStatus, 'year', currentDate);
    
    // Devolver solo los datos de tendencia (sin la información de hábitos)
    return result.data;
  },

  /**
   * Genera datos de gráficos predeterminados
   */
  generateDefaultData(chartType: string, habits: any[], habitStatus: any) {
    switch (chartType) {
      case CHART_TYPES.BALANCE:
        return [];
      case CHART_TYPES.PIE:
        return chartCalculations.generatePieChartData(habits, habitStatus);
      default:
        return [];
    }
  },

  /**
   * Elimina los datos de un hábito específico de todas las gráficas
   * @param userId ID del usuario
   * @param habitName Nombre del hábito eliminado
   */
  async cleanupChartDataForDeletedHabit(userId: string, habitName: string): Promise<boolean> {
    try {
      // 1. Obtener todos los registros de gráficas para este usuario
      const { data: chartRecords, error } = await supabase
        .from('habit_charts')
        .select('id, chart_type, data')
        .eq('user_id', userId);
        
      if (error) {
        console.error('[ERROR] Error al obtener datos de gráficas:', error);
        return false;
      }

      // Obtener los hábitos actuales (después de eliminar)
      const { data: habitData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId);
      
      const habits = habitData || [];
      
      // Obtener el estado de los hábitos
      const { data: habitStatusData } = await supabase
        .from('habit_status')
        .select('*')
        .eq('user_id', userId);
      
      // Convertir a formato adecuado para el procesamiento
      const habitStatus: Record<string, any> = {};
      if (habitStatusData) {
        habitStatusData.forEach((status: any) => {
          const key = status.key || '';
          habitStatus[key] = status;
        });
      }

      const currentDate = new Date();
      
      // 2. Procesar cada registro
      for (const record of chartRecords || []) {
        let dataUpdated = false;
        let parsedData;
        
        try {
          parsedData = typeof record.data === 'string' 
            ? JSON.parse(record.data) 
            : record.data;
        } catch (e) {
          continue;
        }
        
        // 3. Eliminar referencias al hábito según el tipo de gráfica
        if (record.chart_type === 'balance_data' || 
            record.chart_type === 'monthly_data' ||
            record.chart_type === 'annual_performance_data') {
          // Para datos de balance (array de objetos con propiedades por hábito)
          if (Array.isArray(parsedData)) {
            parsedData = parsedData.map(item => {
              const newItem = { ...item };
              if (newItem[habitName] !== undefined) {
                delete newItem[habitName];
                dataUpdated = true;
              }
              return newItem;
            });
          }
        } else if (record.chart_type === 'pie_chart_data') {
          // Para datos de gráfico circular (array de objetos con name, value, color)
          if (Array.isArray(parsedData)) {
            const originalLength = parsedData.length;
            parsedData = parsedData.filter(item => item.name !== habitName);
            dataUpdated = parsedData.length !== originalLength;
          }
        } else if (record.chart_type === 'progress_trend_data') {
          // Regenerar los datos de tendencia de progreso
          parsedData = this.generateProgressTrendData(habits, habitStatus, currentDate);
          dataUpdated = true;
        } else if (record.chart_type === 'monthly_trend_data') {
          // Regenerar los datos de tendencia mensual
          parsedData = this.generateMonthlyTrendData(habits, habitStatus, currentDate);
          dataUpdated = true;
        } else if (record.chart_type === 'yearly_trend_data') {
          // Regenerar los datos de tendencia anual
          parsedData = this.generateYearlyTrendData(habits, habitStatus, currentDate);
          dataUpdated = true;
        }
        
        // 4. Si se actualizaron los datos, guardarlos de vuelta
        if (dataUpdated) {
          await supabase
            .from('habit_charts')
            .update({ 
              data: JSON.stringify(parsedData),
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[ERROR] Error al limpiar datos de gráficas:', error);
      return false;
    }
  },

  /**
   * Verifica si existen datos almacenados para un usuario y tipo de gráfico
   */
  async verificarDatosAlmacenados(userId: string, chartType: string): Promise<boolean> {
    try {
      const { data, error, count } = await supabase
        .from('habit_charts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('chart_type', chartType);
      
      if (error) {
        return false;
      }
      
      return (count || 0) > 0;
    } catch (error) {
      return false;
    }
  },
};

// Crear versiones vinculadas de todas las funciones
const boundMethods = {
  getChartData: habitChartsService.getChartData.bind(habitChartsService),
  loadUserChartData: habitChartsService.loadUserChartData.bind(habitChartsService),
  insertTestData: habitChartsService.insertTestData.bind(habitChartsService),
  normalizeChartData: habitChartsService.normalizeChartData.bind(habitChartsService),
  regenerateChartData: habitChartsService.regenerateChartData.bind(habitChartsService),
  normalizeBalanceData: habitChartsService.normalizeBalanceData.bind(habitChartsService),
  generateChartData: habitChartsService.generateChartData.bind(habitChartsService),
  cleanupTestData: habitChartsService.cleanupTestData.bind(habitChartsService),
  cleanupChartDataForDeletedHabit: habitChartsService.cleanupChartDataForDeletedHabit.bind(habitChartsService),
  verificarDatosAlmacenados: habitChartsService.verificarDatosAlmacenados.bind(habitChartsService),
  updateChartData: habitChartsService.updateChartData.bind(habitChartsService),
};

// Exportar las funciones vinculadas
export const { 
  getChartData, 
  loadUserChartData, 
  insertTestData,
  normalizeChartData,
  regenerateChartData,
  normalizeBalanceData,
  generateChartData,
  cleanupTestData,
  cleanupChartDataForDeletedHabit,
  verificarDatosAlmacenados,
  updateChartData
} = boundMethods; 