import { supabase } from '../config/client';

export interface ChartMetadata {
  user_id: string;
  last_update: string;
  version: number;
}

export const chartMetadataService = {
  /**
   * Obtiene los metadatos de los gráficos para un usuario específico
   */
  async getChartMetadata(userId: string): Promise<{ success: boolean; data?: ChartMetadata; error?: any }> {
    try {
      if (!userId) {
        return { success: false, error: 'No se proporcionó un ID de usuario' };
      }

      const { data, error } = await supabase
        .from('chart_metadata')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Actualiza los metadatos de los gráficos para un usuario específico
   */
  async updateChartMetadata(
    userId: string,
    metadata: Partial<Omit<ChartMetadata, 'user_id'>>
  ): Promise<{ success: boolean; data?: ChartMetadata; error?: any }> {
    try {
      if (!userId) {
        return { success: false, error: 'No se proporcionó un ID de usuario' };
      }

      const now = new Date().toISOString();
      
      const updateData = {
        user_id: userId,
        last_update: now,
        ...metadata
      };

      const { data, error } = await supabase
        .from('chart_metadata')
        .upsert(updateData)
        .select()
        .maybeSingle();

      if (error) {
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Verifica si los metadatos existen para un usuario y los crea si no existen
   */
  async ensureChartMetadata(userId: string): Promise<{ success: boolean; data?: ChartMetadata; error?: any }> {
    try {
      const { data, error } = await supabase
        .from('chart_metadata')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { success: false, error };
      }

      if (data) {
        return { success: true, data };
      }

      const now = new Date().toISOString();
      const newMetadata = {
        user_id: userId,
        last_update: now,
        version: 1
      };

      const { data: createdData, error: createError } = await supabase
        .from('chart_metadata')
        .upsert(newMetadata)
        .select()
        .maybeSingle();

      if (createError) {
        return { success: false, error: createError };
      }

      return { success: true, data: createdData };
    } catch (error) {
      return { success: false, error };
    }
  }
};

export const { getChartMetadata, updateChartMetadata, ensureChartMetadata } = chartMetadataService; 