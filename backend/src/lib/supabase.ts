import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) throw new Error('Missing Supabase env vars');

// Service-role client — bypasses RLS, used only server-side
export const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
