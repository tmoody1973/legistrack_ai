import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AuthState, LoginCredentials, SignupCredentials } from '../types';

const AuthContext = createContext<{
  authState: AuthState;
  signIn: (credentials: LoginCredentials) => Promise<{ error?: any }>;
  signUp: (credentials: SignupCredentials) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
} | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session with error handling
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // If there's an error getting the session, clear auth state
          console.warn('Error getting initial session:', error);
          await supabase.auth.signOut();
          setAuthState({
            user: null,
            session: null,
            loading: false,
          });
          return;
        }

        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      } catch (error) {
        // Handle any unexpected errors by clearing auth state
        console.error('Unexpected error during session initialization:', error);
        await supabase.auth.signOut();
        setAuthState({
          user: null,
          session: null,
          loading: false,
        });
      }
    };

    getInitialSession();

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // If session becomes null for reasons other than explicit sign out,
        // ensure we clear all auth state
        if (!session && event !== 'SIGNED_OUT' && event !== 'USER_DELETED') {
          console.warn('Session lost unexpectedly, clearing auth state');
          await supabase.auth.signOut();
        }

        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (credentials: LoginCredentials) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    return { error };
  };

  const signUp = async (credentials: SignupCredentials) => {
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.full_name,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    authState,
    signIn,
    signUp,
    signOut,
  };
};

export { AuthContext };