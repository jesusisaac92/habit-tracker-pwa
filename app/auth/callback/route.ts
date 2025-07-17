import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';  
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    
    if (code) {
      const cookieStore = cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      
      // Intercambiar el código por una sesión y obtener los datos del usuario
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('Error al intercambiar código por sesión:', error);
        return NextResponse.redirect(new URL('/login?error=auth_error', request.url));
      }
      
      console.log('Código de autenticación procesado correctamente');
      
      // Verificar si el usuario tiene un perfil
      if (data?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
          
        // Si no hay perfil, redirigir al dashboard donde se manejará la creación del perfil
        if (!profileData) {
          console.log('No se encontró perfil para el usuario, redirigiendo al dashboard');
          // Usar replace en lugar de redirect para evitar entradas en el historial
          return NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });
        }
        
        console.log('Perfil encontrado, redirigiendo al dashboard');
      }
      
      // Redirigir al dashboard con status 303 para forzar GET
      return NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 });
    } else {
      console.error('No se encontró código de autenticación en la URL');
      return NextResponse.redirect(new URL('/login?error=no_code', request.url), { status: 303 });
    }
  } catch (error) {
    console.error('Error en el callback de autenticación:', error);
    // En caso de error, redirigir a una página de error o a login
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url), { status: 303 });
  }
} 