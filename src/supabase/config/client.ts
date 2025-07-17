import { createClient } from '@supabase/supabase-js'

// Usar variables de entorno en producción, valores por defecto en desarrollo
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ukyfwogfhvagpctuvzen.supabase.co'
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVreWZ3b2dmaHZhZ3BjdHV2emVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMjQ1NTgsImV4cCI6MjA1NjYwMDU1OH0.kTneMEnFRDOWZQQfK6YuEDZ8WiqG_l1yqnGFuSo_Ixc'

// Validar que las variables de entorno estén configuradas en producción
if (process.env.NODE_ENV === 'production') {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Las variables de entorno de Supabase son requeridas en producción. Por favor configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Añadir opciones para mejorar el manejo de errores y performance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(err => {
        console.error('Error en fetch de Supabase:', err);
        throw err;
      });
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}) 