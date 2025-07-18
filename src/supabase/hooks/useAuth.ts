import { useState, useEffect, useRef } from 'react'
import { supabase } from '../config/client'
import { User } from '@supabase/supabase-js'
import { authService } from '../services/auth.service'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const authInitialized = useRef(false)
  const lastUserCheck = useRef<number>(0)

  useEffect(() => {
    if (authInitialized.current) return;
    authInitialized.current = true;

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          try {
            localStorage.setItem('auth_user_cache', JSON.stringify(session.user));
          } catch (e) {
            // Silent error handling
          }
        } else {
          setUser(null)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error checking user:', error)
        setUser(null)
        setLoading(false)
      }
    }

    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            localStorage.setItem('auth_user_cache', JSON.stringify(session.user));
          } catch (e) {
            // Silent error handling
          }
        }
        
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const cachedUser = localStorage.getItem('auth_user_cache');
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            if (JSON.stringify(parsedUser) !== JSON.stringify(user)) {
              setUser(parsedUser);
            }
          } catch (e) {
            // Silent error handling
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      authListener?.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        setLoading(false)
        return { user: null, error }
      }
      
      if (data?.user) {
        setUser(data.user)
        try {
          localStorage.setItem('auth_user_cache', JSON.stringify(data.user));
        } catch (e) {
          // Silent error handling
        }
      }
      
      setLoading(false)
      return { user: data?.user || null, error: null }
    } catch (error) {
      setLoading(false)
      return { user: null, error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    try {
      const { data, error } = await authService.signUp(email, password, metadata);
      
      if (data?.user) {
        try {
          localStorage.setItem('auth_user_cache', JSON.stringify(data.user));
        } catch (e) {
          // Silent error handling
        }
      }
      
      return { 
        user: data?.user || null, 
        error: error 
      };
    } catch (error) {
      return { 
        user: null, 
        error: error as any 
      };
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await authService.signOut()
    
    try {
      localStorage.removeItem('auth_user_cache');
    } catch (e) {
      // Silent error handling
    }
    
    setLoading(false)
    return { error }
  }

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setLoading(false);
    return { error };
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle
  }
} 