import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client public dùng cho giao diện người dùng
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client bảo mật dành riêng cho Server Actions & Route Handlers (Bypass RLS, chấm bài thi an toàn)
export const getServiceSupabase = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
};
