import { createClient } from '@supabase/supabase-js';

let supabaseInstance: any = null;

const getSupabase = () => {
  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials missing. Please check your .env file.');
      // Return a dummy client or throw a more descriptive error later
      return createClient("https://placeholder.supabase.co", "placeholder");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
};

// Use a proxy for the exported supabase instance
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    return getSupabase()[prop];
  }
});
