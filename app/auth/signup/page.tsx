"use client"

import { useState } from 'react';
import { supabase } from '@/src/supabase/config/client';
import { ProfileFormDialog } from '@/components/dialogs/profile/ProfileFormDialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/supabase/hooks/useAuth';

// Definir una interfaz para el tipo User
interface User {
  id: string;
  email?: string;
  // Otras propiedades que pueda tener el usuario
}

export default function SignUp() {
  console.log('🎯 Componente SignUp montado');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const router = useRouter();
  const { signUp, loading: authLoading } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔄 Campo cambiado:', e.target.name);
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mensaje muy visible para confirmar que estamos en el archivo correcto
    console.log('🚀 ==== REGISTRO INICIADO ==== 🚀');
    console.log('📝 Datos del formulario:', {
      email: formData.email,
      passwordLength: formData.password.length,
      confirmPasswordLength: formData.confirmPassword.length
    });

    setError(null);

    if (formData.password !== formData.confirmPassword) {
      console.log('❌ Las contraseñas no coinciden');
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔄 Intentando registro con Supabase...');
      const { user, error } = await signUp(formData.email, formData.password);
      
      if (error) {
        console.log('❌ Error en el registro:', error);
        throw error;
      }

      console.log('✅ Registro exitoso:', user);
      setShowVerificationMessage(true);
      
    } catch (error) {
      console.log('5. Error capturado:', error);
      if (error instanceof Error) {
        if (error.message.includes('Email rate limit exceeded')) {
          setError(`
            Por razones de seguridad, se ha alcanzado el límite de intentos.
            Por favor, espera 5 minutos antes de intentar nuevamente.
          `);
        } else if (error.message.includes('User already registered')) {
          setError("Este correo electrónico ya está registrado. Por favor, intenta iniciar sesión.");
        } else {
          setError(error.message);
        }
      } else {
        setError('Ocurrió un error inesperado');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Comentar o eliminar temporalmente estas funciones
  /*
  const handleSignUpSuccess = async (newUser: User | null) => {
    if (!newUser) return;
    setUser(newUser);
    setShowProfileForm(true);
  };
  
  const handleProfileUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    try {
      const elements = event.currentTarget.elements as any;
      const userName = elements.userName.value;
      const userLastName = elements.userLastName.value;
      const userBirthDate = elements.userBirthDate.value;
      const userGender = elements.userGender.value;
      const userCountry = elements.userCountry.value;
      
      if (user) {
        // Crear el perfil en la base de datos
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: userName,
            last_name: userLastName,
            birth_date: userBirthDate,
            gender: userGender,
            country: userCountry,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            avatar_url: 'https://example.com/default-avatar.png'
          });
        
        if (error) {
          console.error('Error creating profile:', error);
          setError(error.message);
          return;
        }
        
        // Redirigir al dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error al actualizar el perfil');
    }
  };
  */

  const handleProfileUpdate = async (data: any): Promise<boolean> => {
    console.log("Datos de perfil recibidos:", data);
    // Implementación simplificada
    return true;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        {showVerificationMessage ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600">¡Registro exitoso!</h2>
            <p className="mt-4 text-gray-600">
              Te hemos enviado un correo electrónico de confirmación.
              Por favor, revisa tu bandeja de entrada y sigue las instrucciones para completar tu registro.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              (Si no lo encuentras, revisa también tu carpeta de spam)
            </p>
            <div className="mt-6">
              <Link href="/login" className="text-blue-600 hover:text-blue-500">
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : !showProfileForm ? (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Crear cuenta</h1>
              <p className="mt-2 text-sm text-gray-600">
                Regístrate para comenzar a usar la aplicación
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Cargando...' : 'Registrarse'}
                </button>

                <Link
                  href="/"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancelar
                </Link>
              </div>
            </form>
            
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </>
        ) : user ? (
          <ProfileFormDialog
            isOpen={showProfileForm}
            onOpenChange={setShowProfileForm}
            user={user}
            updateUserProfile={handleProfileUpdate}
            mode="onboarding"
            onSubmit={(e) => {
              e.preventDefault();
              handleProfileUpdate(e);
              return true;
            }}
          />
        ) : (
          <div>Cargando...</div>
        )}
      </div>
    </div>
  );
} 