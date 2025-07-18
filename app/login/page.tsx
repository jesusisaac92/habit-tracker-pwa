"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHabitStore } from '@/store/useHabitStore';
import { supabase } from '@/src/supabase/config/client';
import React from 'react'; // Added missing import

const ENABLE_GOOGLE_AUTH = false;

// Fixed login redirect issues
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { initializeHabits } = useHabitStore();

  // Debug: Verificar variables de entorno
  console.log('🔍 DEBUGGING - Environment variables:');
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('SUPABASE_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('Supabase client initialized:', !!supabase);
  
  // Test de conexión
  const testConnection = async () => {
    try {
      console.log('🔗 Testing Supabase connection...');
      const { data, error } = await supabase.auth.getSession();
      console.log('Session test result:', { data: !!data, error });
      
      // Test básico de conectividad
      const { data: testData, error: testError } = await supabase.from('profiles').select('count').limit(1);
      console.log('Database test:', { success: !testError, error: testError?.message });
    } catch (err) {
      console.error('Connection test failed:', err);
    }
  };
  
  // Ejecutar test al cargar
  React.useEffect(() => {
    testConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      console.log('Attempting direct Supabase login...');
      
      // Usar directamente Supabase en lugar del hook
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Supabase login error:', error);
        setError(error.message || 'Error de autenticación');
      } else if (data?.user) {
        console.log('Supabase login successful, user:', data.user.email);
        console.log('Session:', data.session);
        
        // Guardar en localStorage para debugging
        if (data.session) {
          localStorage.setItem('supabase_session', JSON.stringify(data.session));
        }
        
        // Esperar un momento y redirigir
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        console.log('No user returned from Supabase');
        setError('No se pudo completar el login');
      }
    } catch (err) {
      console.error('Exception in login:', err);
      setError('Error al iniciar sesión');
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Iniciar sesión
          </h1>
          <p className="text-sm text-gray-500">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={false} // Loading state removed
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Iniciar sesión
          </button>
        </form>

        {ENABLE_GOOGLE_AUTH && (
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={false} // Loading state removed
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </button>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 