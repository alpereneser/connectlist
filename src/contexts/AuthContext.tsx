import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  console.log("[AuthProvider] Rendering. Initial state - Session:", session, "User:", null, "Loading:", true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthProvider] useEffect running.");

    let initialCheckDone = false; // Flag to set loading only once

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log("[AuthProvider] onAuthStateChange triggered. Event:", _event, "Session:", currentSession);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      // Set loading to false after the first event, regardless of session state
      if (!initialCheckDone) {
        console.log("[AuthProvider] First onAuthStateChange event received. Setting loading to false.");
        setLoading(false);
        initialCheckDone = true;
      }
      console.log("[AuthProvider] State after onAuthStateChange:", currentSession, currentSession?.user ?? null, loading);
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("[AuthProvider] useEffect cleanup. Unsubscribing.");
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
  };

  console.log("[AuthProvider] Providing value:", value);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
