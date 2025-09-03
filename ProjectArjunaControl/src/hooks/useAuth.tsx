import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (name: string, email: string, password: string, rescueTeamId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session on app start
    const checkSession = async () => {
      const { session } = await AuthService.getCurrentSession();
      if (session?.user) {
        const { profile } = await AuthService.getUserProfile(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          profile: profile || undefined,
        });
      }
      setLoading(false);
    };

    checkSession();

    // Listen to auth state changes
    const { data: { subscription } } = AuthService.onAuthStateChange((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await AuthService.signIn({ email, password });
    setLoading(false);
    return { error };
  };

  const signUp = async (name: string, email: string, password: string, rescueTeamId?: string) => {
    setLoading(true);
    const { error } = await AuthService.signUp({ 
      name, 
      email, 
      password, 
      rescue_team_id: rescueTeamId 
    });
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await AuthService.signOut();
    if (!error) {
      setUser(null);
    }
    setLoading(false);
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await AuthService.resetPassword(email);
    return { error };
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
