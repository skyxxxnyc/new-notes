import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

let supabaseInstance: any = null;

const getSupabase = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials missing. Please check your .env file.");
      // Return a dummy client or throw a more descriptive error later
      return createClient("https://placeholder.supabase.co", "placeholder");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
};

// Use a getter for the exported supabase instance
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    return getSupabase()[prop];
  }
});
