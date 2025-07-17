import { supabase } from '../config/client';
import { supabaseUrl, supabaseAnonKey } from '../config/client';
import { useChartStore } from '@/store/useChartStore';
import { useHabitStore } from '@/store/useHabitStore';
import { updateChartMetadata } from './chartMetadata.service';
import { 
  CHART_TYPES, 
  updateChartData, 
  regenerateChartData, 
  getChartData 
} from './habitCharts.service';
import { HabitStatus } from '@/components/types/types';
import { format } from 'date-fns';

// Eliminamos la interfaz no utilizada o la usamos donde sea necesario
// Si necesitamos mantenerla para documentación, podemos añadir un comentario

export const habitCompletionService = {
  async markHabitAsCompleted(habitId: string, userId: string, date: string, time: string | null) {
    if (!userId) return { success: false, error: 'Usuario no autenticado' };
    
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidRegex.test(userId);
      
      // Primero, insertar la completación
      const { data, error } = await supabase
        .from('habit_completions')
        .insert({
          habit_id: String(habitId),
          user_id: userId,
          completion_date: date,
          scheduled_time: time,
          is_completed: true
        });
        
      if (error) {
        return { success: false, error };
      }
      
      // Ahora, actualizar el current_streak y record del hábito
      try {
        // Obtener el hábito para verificar si tiene días específicos seleccionados
        const { data: habitData, error: habitError } = await supabase
          .from('habits')
          .select('id, title, selected_days, current_streak, record')
          .eq('id', habitId)
          .single();
          
        if (habitError) {
          console.error('Error al obtener datos del hábito:', habitError);
          return { success: true, data }; // Continuamos a pesar del error
        }
        
        // Obtener todas las completaciones de este hábito
        const { data: allCompletions, error: completionsError } = await supabase
          .from('habit_completions')
          .select('completion_date')
          .eq('habit_id', String(habitId))
          .eq('user_id', userId)
          .eq('is_completed', true)
          .order('completion_date', { ascending: false });
          
        if (completionsError) {
          // Error silencioso
          return { success: true, data };
        } 
        
        if (allCompletions && allCompletions.length > 0) {
          // Obtener todas las fechas de completación y ordenarlas cronológicamente
          const sortedDates = allCompletions
            .map(completion => completion.completion_date)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
          
          // Extraer los días específicos del hábito
          const selectedDays = habitData.selected_days || [];
          const hasSpecificDays = Array.isArray(selectedDays) && selectedDays.length > 0 && selectedDays.length < 7;
          
          console.log('Calculando racha para hábito:', habitData.title);
          console.log('Días específicos:', hasSpecificDays ? selectedDays.join(', ') : 'Todos los días');
          
          // Calcular la racha actual teniendo en cuenta los días específicos
          let currentStreak = 0;
          let lastDate: Date | null = null;
          
          // Si el hábito tiene días específicos, usamos una lógica diferente
          if (hasSpecificDays) {
            // Ordenar fechas de la más reciente a la más antigua
            const reversedDates = [...sortedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            
            // Empezamos con la fecha más reciente
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Verificar si hoy es un día programado
            const todayDayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            const isTodayScheduled = selectedDays.includes(todayDayOfWeek);
            
            console.log('Fecha actual:', today.toISOString().split('T')[0], 'Día de la semana:', todayDayOfWeek);
            console.log('¿Hoy es un día programado?', isTodayScheduled ? 'Sí' : 'No');
            
            // Inicializar variables para el cálculo de racha
            currentStreak = 0;
            let lastScheduledDate: Date | null = null;
            let missedScheduledDays = false;
            
            // Encontrar la última fecha programada (hoy o anterior)
            let checkDate = new Date(today);
            let daysChecked = 0;
            const MAX_DAYS_TO_CHECK = 30; // Límite para evitar bucles infinitos
            
            while (daysChecked < MAX_DAYS_TO_CHECK) {
              const checkDayOfWeek = checkDate.getDay();
              const isScheduledDay = selectedDays.includes(checkDayOfWeek);
              
              if (isScheduledDay) {
                // Encontramos un día programado
                const dateStr = checkDate.toISOString().split('T')[0];
                const isCompleted = sortedDates.includes(dateStr);
                
                console.log(`Día programado ${dateStr} (${['D','L','M','X','J','V','S'][checkDayOfWeek]}): ${isCompleted ? 'Completado' : 'No completado'}`);
                
                if (isCompleted) {
                  // Si este día programado fue completado, incrementar la racha
                  currentStreak++;
                  lastScheduledDate = new Date(checkDate);
                } else {
                  // Si este día programado no fue completado, romper la racha
                  missedScheduledDays = true;
                  break;
                }
              }
              
              // Retroceder un día
              checkDate.setDate(checkDate.getDate() - 1);
              daysChecked++;
            }
            
            console.log('Racha actual calculada:', currentStreak);
            
            // Calcular el récord histórico para hábitos con días específicos
            let historicalRecord = 0;
            
            // Convertir todas las fechas de completación a objetos Date para facilitar el cálculo
            const completionDates = sortedDates.map(dateStr => {
              const date = new Date(dateStr);
              date.setHours(0, 0, 0, 0);
              return date;
            });
            
            // Ordenar las fechas de más antigua a más reciente
            completionDates.sort((a, b) => a.getTime() - b.getTime());
            
            if (completionDates.length > 0) {
              // Encontrar la fecha más antigua y la más reciente
              const oldestDate = completionDates[0];
              const newestDate = completionDates[completionDates.length - 1];
              
              console.log('Fecha más antigua:', oldestDate.toISOString().split('T')[0]);
              console.log('Fecha más reciente:', newestDate.toISOString().split('T')[0]);
              
              // Crear un mapa de fechas completadas para búsqueda rápida
              const completedDatesMap = new Map();
              completionDates.forEach(date => {
                completedDatesMap.set(date.toISOString().split('T')[0], true);
              });
              
              // Iniciar desde la fecha más antigua y avanzar hasta la fecha más reciente
              let currentDate = new Date(oldestDate);
              let tempStreak = 0;
              let maxStreak = 0;
              
              while (currentDate <= newestDate) {
                const currentDayOfWeek = currentDate.getDay();
                const isScheduledDay = selectedDays.includes(currentDayOfWeek);
                const dateStr = currentDate.toISOString().split('T')[0];
                
                // Solo verificar días programados
                if (isScheduledDay) {
                  const isCompleted = completedDatesMap.has(dateStr);
                  
                  if (isCompleted) {
                    // Día programado completado, incrementar racha temporal
                    tempStreak++;
                    maxStreak = Math.max(maxStreak, tempStreak);
                  } else {
                    // Día programado no completado, reiniciar racha
                    tempStreak = 0;
                  }
                }
                
                // Avanzar al siguiente día
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              historicalRecord = maxStreak;
              console.log('Récord histórico calculado:', historicalRecord);
            }
            
            // Usar el récord histórico calculado
            const recordValue = Math.max(habitData.record || 0, historicalRecord, currentStreak);
            console.log('Récord final para hábito con días específicos:', recordValue);
            
            // Actualizar solo si los valores son diferentes
            const currentRecord = habitData.record || 0;
            const currentStreakValue = habitData.current_streak || 0;
            
            if (currentStreakValue !== currentStreak || currentRecord !== recordValue) {
              const { error: updateError } = await supabase
                .from('habits')
                .update({
                  current_streak: currentStreak,
                  record: recordValue
                })
                .eq('id', habitId);
                
              if (updateError) {
                console.error('Error al actualizar racha:', updateError);
              }
            }
          } else {
            // Lógica original para hábitos de todos los días
            // Recorrer las fechas desde la más reciente hacia atrás
            for (let i = sortedDates.length - 1; i >= 0; i--) {
              const currentDateStr = sortedDates[i];
              const currentDate = new Date(currentDateStr);
              currentDate.setHours(0, 0, 0, 0);
              
              // Si es la primera fecha que procesamos
              if (lastDate === null) {
                lastDate = currentDate;
                currentStreak = 1;
                continue;
              }
              
              // Calcular la diferencia en días
              const diffTime = lastDate.getTime() - currentDate.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              // Si es el día anterior, incrementar la racha
              if (diffDays === 1) {
                currentStreak++;
                lastDate = currentDate;
              } else if (diffDays === 0) {
                // Mismo día, ignorar (podría haber múltiples completaciones en un día)
                lastDate = currentDate;
              } else {
                // Racha interrumpida
                break;
              }
            }
            
            // Calcular el récord (la racha más larga históricamente)
            const recordValue = Math.max(habitData.record || 0, currentStreak);
            
            console.log('Racha actual:', currentStreak, 'Récord:', recordValue);
            
            // Actualizar solo si los valores son diferentes
            const currentRecord = habitData.record || 0;
            const currentStreakValue = habitData.current_streak || 0;
            
            if (currentStreakValue !== currentStreak || currentRecord !== recordValue) {
              const { error: updateError } = await supabase
                .from('habits')
                .update({
                  current_streak: currentStreak,
                  record: recordValue
                })
                .eq('id', habitId);
                
              if (updateError) {
                console.error('Error al actualizar racha:', updateError);
              }
            }
          }
        }
      } catch (streakError) {
        console.error('Error al calcular racha:', streakError);
      }
      
      try {
        const habitStore = useHabitStore.getState();
        const habits = habitStore.habits;
        
        const habitStatus: Record<string, { status: "" | "completed" | "pending" }> = {};
        Object.entries(habitStore.habitStatus).forEach(([key, value]) => {
          habitStatus[key] = {
            status: value.status as "" | "completed" | "pending"
          };
        });
        
        const statusKey = `${habitId}-${date}`;
        habitStatus[statusKey] = { status: "completed" };

        const completedDate = new Date(date);

        const { chartCalculations } = await import('@/components/services/chartCalculations/calculations');
        
        // 1. Procesar datos mensuales (balance)
        const { success: existingDataSuccess, data: existingBalanceData } = await getChartData(userId, 'balance_data');
        
        const processedBalanceData = chartCalculations.generateBalanceData(
          habits, 
          habitStatus, 
          completedDate,
          'month',
          {
            existingData: existingDataSuccess && existingBalanceData ? existingBalanceData : [],
            newCompletedDay: true,
            completedDate: completedDate
          }
        ).map(item => {
          const result: Record<string, string | number> = { period: item.period };
          
          // Asegurarse de que tenemos fullPeriod
          if (item.fullPeriod) {
            result.fullPeriod = item.fullPeriod;
          } else {
            // Si no hay fullPeriod, generarlo
            result.fullPeriod = `${item.period}-${completedDate.getFullYear()}`;
          }
          
          Object.keys(item).forEach(key => {
            if (key !== 'period' && key !== 'fullPeriod') {
              // Convertir a string o number según corresponda
              const value = item[key];
              if (value !== undefined) {
                result[key] = typeof value === 'number' ? value : parseFloat(String(value || 0));
              }
            }
          });
          
          return result;
        });

        // 2. Procesar datos semanales
        const { success: existingWeeklySuccess, data: existingWeeklyData } = await getChartData(userId, CHART_TYPES.WEEKLY_BALANCE);
        
        const processedWeeklyData = chartCalculations.generateBalanceData(
          habits, 
          habitStatus, 
          completedDate,
          'week',
          {
            existingData: existingWeeklySuccess && existingWeeklyData ? existingWeeklyData : [],
            newCompletedDay: true,
            completedDate: completedDate
          }
        ).map(item => {
          const result: Record<string, string | number> = { period: item.period };
          
          // Copiar fullPeriod y displayPeriod si existen
          if (item.fullPeriod) {
            result.fullPeriod = typeof item.fullPeriod === 'string' || typeof item.fullPeriod === 'number' ? 
              item.fullPeriod : String(item.fullPeriod);
          }
          
          if (item.displayPeriod) {
            result.displayPeriod = typeof item.displayPeriod === 'string' || typeof item.displayPeriod === 'number' ? 
              item.displayPeriod : String(item.displayPeriod);
          }
          
          Object.keys(item).forEach(key => {
            if (key !== 'period' && key !== 'fullPeriod' && key !== 'displayPeriod') {
              // Convertir a string o number según corresponda
              const value = item[key];
              if (value !== undefined) {
                result[key] = typeof value === 'number' ? value : parseFloat(String(value || 0));
              }
            }
          });
          
          return result;
          });
        
        // Guardar datos mensuales en la base de datos
        const balanceResult = await updateChartData(userId, CHART_TYPES.BALANCE, processedBalanceData);
        
        // Guardar datos semanales en la base de datos
        const weeklyResult = await updateChartData(userId, CHART_TYPES.WEEKLY_BALANCE, processedWeeklyData);
        
        // Generar y guardar datos de gráfico de pastel
        const pieChartData = chartCalculations.generatePieChartData(habits, habitStatus);
        const pieResult = await updateChartData(userId, CHART_TYPES.PIE, pieChartData);
        
        await updateChartMetadata(userId, {
          version: 1
        });
        
      } catch (chartError) {
        // Error silencioso
      }
      
      const habitStore = useHabitStore.getState();
      const habits = habitStore.habits;
      const habitStatus = habitStore.habitStatus;

      const typedHabitStatus: Record<string, HabitStatus> = {};
      Object.entries(habitStatus).forEach(([key, value]) => {
        typedHabitStatus[key] = {
          status: value.status as "" | "completed" | "pending",
          time: (value as { status: string; time?: string }).time || ''
        };
      });

      // Importante: NO omitir los datos de balance (parámetro skipBalanceData = false)
      await regenerateChartData(userId, typedHabitStatus, habits, new Date(), false);
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },
  
  async getCompletedHabits(userId: string | null | undefined, date: string) {
    if (!userId) {
      return { success: false, error: 'Usuario no autenticado', data: [] };
    }
    
    try {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('habit_id, scheduled_time')
        .eq('user_id', userId)
        .eq('completion_date', date)
        .eq('is_completed', true);
        
      return { success: !error, data, error };
    } catch (error) {
      return { success: false, error, data: [] };
    }
  },

  async isHabitCompleted(habitId: string, userId: string | null | undefined, date: string) {
    if (!userId) {
      return { success: false, error: 'Usuario no autenticado', isCompleted: false };
    }
    
    try {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', date)
        .eq('is_completed', true)
        .maybeSingle();
        
      return { 
        success: !error, 
        isCompleted: !!data,
        error 
      };
    } catch (error) {
      return { success: false, error, isCompleted: false };
    }
  },

  async checkHabitCompletion(habitId: string, userId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('user_id', userId)
        .eq('completion_date', date)
        .eq('is_completed', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      return false;
    }
  },

  async checkTableStructure() {
    try {
      const { data, error } = await supabase
        .from('habit_completions')
        .select('*')
        .limit(1);
        
      if (error) {
        return { success: false, error };
      }
      
      const testData = {
        habit_id: 'test-habit-id',
        user_id: 'test-user-id',
        completion_date: new Date().toISOString().split('T')[0],
        is_completed: true
      };
      
      const { error: insertError } = await supabase
        .from('habit_completions')
        .insert(testData)
        .select();
        
      if (insertError) {
        return { success: false, error: insertError };
      }
      
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', 'test-habit-id')
        .eq('user_id', 'test-user-id');
        
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  },

  async testNetworkConnection() {
    try {
      const response = await fetch(supabaseUrl);
      const connectionOk = response.ok;
      
      const corsResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });
      
      const corsOk = corsResponse.ok;
      
      return {
        success: connectionOk && corsOk,
        connectionOk,
        corsOk
      };
    } catch (error) {
      return {
        success: false,
        error
      };
    }
  },

  async testDirectInsertion() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let userId;
      if (session) {
        userId = session.user.id;
      } else {
        userId = 'fd7296d2-5da9-4d1b-98c7-565ba0b68b36';
      }
      
      const uniqueChartType = `test-direct-${Date.now()}`;
      
      const testData = {
        user_id: userId,
        chart_type: uniqueChartType,
        data: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: testInsertData, error: testInsertError } = await supabase
        .from('habit_charts')
        .insert(testData);
      
      if (testInsertError) {
        return { success: false, error: testInsertError };
      }
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('habit_charts')
        .select('*')
        .eq('user_id', userId)
        .eq('chart_type', uniqueChartType);
          
      if (verifyError) {
        return { success: false, error: verifyError };
      }
      
      const metadataInitialData = {
        user_id: userId,
        last_update: new Date().toISOString()
      };

      await supabase
        .from('chart_metadata')
        .upsert(metadataInitialData);
        
      return { success: true, data: verifyData };
    } catch (error) {
      return { success: false, error };
    }
  },

  async loadHabitCompletions(userId: string): Promise<boolean> {
    try {
      const result = await this.getCompletedHabits(userId, new Date().toISOString());
      const completions = result.success && result.data ? result.data : [];
      
      if (completions.length === 0) {
        return true;
      }
      
      const habitStore = useHabitStore.getState();
      
      completions.forEach(completion => {
        const comp = completion as any;
        const completionDate = comp.completion_date || comp.created_at || new Date().toISOString().split('T')[0];
        const statusKey = `${comp.habit_id}-${completionDate}`;
        habitStore.updateHabitStatus(statusKey, "completed");
      });

      const habits = habitStore.habits;
      const habitStatus = habitStore.habitStatus;
      
      const typedHabitStatus: Record<string, HabitStatus> = {};
      Object.entries(habitStatus).forEach(([key, value]) => {
        typedHabitStatus[key] = {
          status: value.status as "" | "completed" | "pending",
          time: (value as { status: string; time?: string }).time || ''
        };
      });

      await regenerateChartData(userId, typedHabitStatus, habits, new Date(), true);
      
      return true;
    } catch (error) {
      return false;
    }
  },
};

export const { markHabitAsCompleted, getCompletedHabits, loadHabitCompletions } = habitCompletionService;