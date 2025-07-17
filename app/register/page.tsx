"use client"

import { useState } from 'react';
import { useAuth } from '@/src/supabase/hooks/useAuth';
import { profileService } from '@/src/supabase/services/profile.service';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const { signUp, loading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    try {
      const metadata = {
        firstName: firstName,
        lastName: lastName,
        registrationDate: new Date().toISOString()
      };
      
      console.log('Datos para registro:', { email, metadata });
      
      const { user, error } = await signUp(email, password, metadata);
      
      if (error) {
        console.error("Error de registro:", error);
        setError(error.message);
      } else if (user) {
        console.log('Guardando en localStorage:', metadata);
        localStorage.setItem('userData', JSON.stringify(metadata));
        setShowVerificationMessage(true);
      }
    } catch (err) {
      console.error("Error en el registro:", err);
      setError('Error al registrar usuario');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        {!showVerificationMessage && (
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Crear cuenta
            </h1>
            <p className="text-sm text-gray-500">
              Ingresa tus datos para registrarte
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {!showVerificationMessage ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Apellido */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Apellido
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Email */}
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

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {loading ? 'Cargando...' : 'Registrarse'}
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="text-green-500 text-2xl sm:text-3xl">✓</div>
              <h2 className="text-xl sm:text-2xl font-bold">¡Registro Exitoso!</h2>
            </div>
            
            <p className="text-gray-700 text-sm sm:text-base px-4">
              Hemos enviado un correo de confirmación a tu bandeja de entrada.
            </p>
            
            <div className="flex items-start text-left max-w-sm mx-auto">
              <span className="mt-1 mr-3">📧</span>
              <p className="text-gray-600 text-sm sm:text-base">
                Revisa tu correo y sigue las instrucciones para activar tu cuenta.
              </p>
            </div>
            
            <div className="flex items-start text-left max-w-sm mx-auto">
              <span className="mt-1 mr-3">🔍</span>
              <p className="text-gray-500 text-sm sm:text-base">
                Si no lo encuentras, revisa también la carpeta de spam.
              </p>
            </div>

            <p className="text-xs text-gray-400 italic">
              El enlace de activación expirará en unos minutos por motivos de seguridad
            </p>

            <div className="mt-4 sm:mt-6">
              <Link 
                href="/login" 
                className="inline-flex justify-center w-full py-3 px-4 text-sm font-medium text-white bg-black hover:bg-gray-800 transition-colors duration-150 rounded-full"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 