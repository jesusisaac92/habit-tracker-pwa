import { supabase } from '../config/client'
import { Profile } from '../types/database.types'

// Definir la interfaz fuera del objeto profileService
interface ProfileUpdateData {
  name?: string | null;
  last_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

export const profileService = {
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  async createProfile(userId: string, data: any) {
    console.log('Creating profile with:', { userId, data });
    
    try {
      // Primero verificar si ya existe el perfil
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error al verificar perfil existente:', checkError);
        return { data: null, error: checkError };
      }

      if (existingProfile) {
        console.log('Perfil ya existe, retornando:', existingProfile);
        return { data: existingProfile, error: null };
      }

      // Preparar datos mínimos para el perfil con valores por defecto para campos obligatorios
      const now = new Date().toISOString();
      const profileData = {
        id: userId,
        name: data.name || '',
        last_name: data.last_name || '',
        created_at: now,
        updated_at: now,
        birth_date: data.birth_date || now,
        gender: data.gender || 'no_especificado',
        country: data.country || 'no_especificado'  // Valor por defecto para country
      };
      
      console.log('Intentando upsert de perfil con datos:', profileData);
      
      // Usar upsert en lugar de insert para mayor robustez
      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error al upsert perfil:', error);
        return { data: null, error };
      }

      console.log('Perfil creado exitosamente:', profile);
      return { data: profile, error: null };
    } catch (error) {
      console.error('Error creating profile:', error);
      return { data: null, error };
    }
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  },

  // Añade un método específico para actualizar la fecha de nacimiento
  updateBirthDate: async (userId: string, birthDate: string) => {
    console.log('Actualizando fecha de nacimiento:', { userId, birthDate });
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ birth_date: birthDate })
      .eq('id', userId);
      
    if (error) {
      console.error('Error actualizando fecha de nacimiento:', error);
      return { success: false, error };
    }
    
    console.log('Fecha de nacimiento actualizada correctamente:', data);
    return { success: true, data };
  },

  // Actualizar la función para manejar correctamente los tipos
  updateProfileDirectly: async (userId: string, profileData: ProfileUpdateData) => {
    try {
      console.log('Actualizando perfil directamente para usuario:', userId);
      console.log('Datos a actualizar:', profileData);
      
      // Asegurarse de que los datos son válidos
      const validData: any = {};
      
      // Solo incluir campos que no sean undefined y manejar correctamente los campos de fecha
      if (profileData.name !== undefined) validData.name = profileData.name;
      if (profileData.last_name !== undefined) validData.last_name = profileData.last_name;
      
      // Manejar correctamente el campo birth_date
      if (profileData.birth_date !== undefined) {
        // Si es una cadena vacía o no es una fecha válida, usar null
        if (!profileData.birth_date || profileData.birth_date.trim() === '') {
          validData.birth_date = null;
        } else {
          // Asegurarse de que la fecha esté en formato YYYY-MM-DD
          const dateMatch = profileData.birth_date.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            // Usar la fecha tal cual está en formato YYYY-MM-DD
            validData.birth_date = profileData.birth_date.substring(0, 10);
          } else {
            // Intentar parsear la fecha y formatearla correctamente
            const date = new Date(profileData.birth_date);
            if (!isNaN(date.getTime())) {
              validData.birth_date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            } else {
              validData.birth_date = null;
            }
          }
        }
      }
      
      if (profileData.gender !== undefined) validData.gender = profileData.gender;
      if (profileData.country !== undefined) validData.country = profileData.country;
      if (profileData.avatar_url !== undefined) validData.avatar_url = profileData.avatar_url;
      
      // Añadir timestamp de actualización
      validData.updated_at = new Date().toISOString();
      
      console.log('Datos validados a enviar:', validData);
      
      // Primero, verificar si el perfil existe
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (checkError) {
        console.error('Error al verificar si el perfil existe:', checkError);
        
        // Si el perfil no existe, intentar crearlo
        if (checkError.code === 'PGRST116') {
          console.log('El perfil no existe, intentando crearlo...');
          
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              ...validData
            })
            .select();
          
          if (insertError) {
            console.error('Error al crear el perfil:', insertError);
            return { success: false, error: insertError };
          }
          
          console.log('Perfil creado correctamente:', newProfile);
          return { success: true, data: newProfile };
        }
        
        return { success: false, error: checkError };
      }
      
      // Si el perfil existe, actualizarlo
      console.log('El perfil existe, actualizando...');
      const { data, error } = await supabase
        .from('profiles')
        .update(validData)
        .eq('id', userId)
        .select();
      
      if (error) {
        console.error('Error al actualizar perfil:', error);
        return { success: false, error };
      }
      
      console.log('Perfil actualizado correctamente:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error en updateProfileDirectly:', error);
      return { success: false, error };
    }
  }
}

// Exportar updateBirthDate directamente
export const updateBirthDate = profileService.updateBirthDate;

// Exportar updateProfileDirectly directamente
export const updateProfileDirectly = profileService.updateProfileDirectly; 