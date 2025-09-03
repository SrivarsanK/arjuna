import { supabase } from './supabaseClient';
import { AuthUser, LoginCredentials, RegisterCredentials, Profile } from '../types';

export class AuthService {
  // Sign up new user
  static async signUp(credentials: RegisterCredentials) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      // Create profile after successful signup
      if (data.user) {
        const profileData = {
          id: data.user.id,
          name: credentials.name,
          rescue_team_id: credentials.rescue_team_id,
          role: 'operator' as const,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          console.warn('Profile creation error:', profileError);
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error: error as Error };
    }
  }

  // Sign in user
  static async signIn(credentials: LoginCredentials) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error: error as Error };
    }
  }

  // Sign out user
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error as Error };
    }
  }

  // Reset password
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as Error };
    }
  }

  // Get current user session
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { session, error: null };
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, error: error as Error };
    }
  }

  // Get user profile
  static async getUserProfile(userId: string): Promise<{ profile: Profile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { profile: data, error: null };
    } catch (error) {
      console.error('Get profile error:', error);
      return { profile: null, error: error as Error };
    }
  }

  // Listen to auth state changes
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Get user profile
        const { profile } = await this.getUserProfile(session.user.id);
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          profile: profile || undefined,
        };
        callback(authUser);
      } else {
        callback(null);
      }
    });
  }
}
