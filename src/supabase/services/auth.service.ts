import { supabase } from '../config/client'
import { AuthResponse } from '@supabase/supabase-js'

export const authService = {
  signUp: async (email: string, password: string, metadata?: any): Promise<AuthResponse> => {
    console.log('Iniciando registro de usuario:', { email, metadata });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      console.log('Respuesta de Supabase signUp:', { data, error });
      
      if (error) {
        console.error('Error en registro:', error);
        throw error;
      }
      
      // Guardar metadata para usar después de la confirmación
      if (data?.user?.id && metadata) {
        console.log('Guardando metadata para creación posterior del perfil');
        localStorage.setItem('userData', JSON.stringify({
          firstName: metadata.firstName || '',
          lastName: metadata.lastName || '',
          registrationDate: new Date().toISOString()
        }));
      }
      
      return { data, error };
    } catch (err) {
      console.error('Excepción durante el registro:', err);
      throw err;
    }
  },

  signIn: async (email: string, password: string) => {
    console.log('[DEBUG][auth.service] Iniciando proceso de login para:', email);
    
    const authResponse = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('[DEBUG][auth.service] Respuesta de autenticación:', {
      success: !!authResponse.data?.user,
      userId: authResponse.data?.user?.id,
      error: authResponse.error
    });
    
    if (authResponse.data?.user) {
      console.log('[DEBUG][auth.service] Usuario autenticado, iniciando carga de datos');
      
      try {
        // Cargar datos de gráficas
        const { loadUserChartData } = await import('./habitCharts.service');
        console.log('[DEBUG][auth.service] Importado loadUserChartData, iniciando carga...');
        
        const chartResult = await loadUserChartData(authResponse.data.user.id);
        console.log('[DEBUG][auth.service] Resultado de carga de datos:', chartResult);
        
        // Verificar datos específicos de la gráfica anual
        const { data: yearlyData } = await supabase
          .from('habit_charts')
          .select('*')
          .eq('user_id', authResponse.data.user.id)
          .eq('chart_type', 'yearly_trend_data')
          .single();
          
        console.log('[DEBUG][auth.service] Datos anuales en Supabase:', yearlyData);
        
        // Cargar completaciones de hábitos
        const { loadHabitCompletions } = await import('./habitCompletion.service');
        await loadHabitCompletions(authResponse.data.user.id);
      } catch (error) {
        console.error('[ERROR][auth.service] Error durante la carga de datos:', error);
      }
    }
    
    return authResponse;
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getUser: async () => {
    return await supabase.auth.getUser()
  }
} 