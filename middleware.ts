import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // Asegúrate de que las variables de entorno estén disponibles
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Faltan variables de entorno de Supabase');
    return res;
  }
  
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Si el usuario no está autenticado y está intentando acceder a una ruta protegida
    if (!session && (
      req.nextUrl.pathname.startsWith('/dashboard') ||
      req.nextUrl.pathname === '/'
    )) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error en middleware:', error);
  }

  return res;
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/app/:path*'],
}; 