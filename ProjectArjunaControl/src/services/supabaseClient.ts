import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your_supabase_url_here';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here') {
  console.warn('⚠️ Supabase configuration missing. Please update your .env file with valid Supabase credentials.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const Tables = {
  PROFILES: 'profiles',
  MISSIONS: 'missions',
  MISSION_TRACKING: 'mission_tracking',
  MISSION_LOGS: 'mission_logs',
} as const;
