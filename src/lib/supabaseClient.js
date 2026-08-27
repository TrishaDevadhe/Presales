import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://agqrrsbdbqlavifgcfwv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFncXJyc2JkYnFsYXZpZmdjZnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3Mjk3ODEsImV4cCI6MjEwMzMwNTc4MX0.bgE8d3u3A2V89mRTmZzj3nzIB9YdkA4DwCIa-wXa1sQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
