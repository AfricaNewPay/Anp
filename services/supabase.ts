import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaeayefgydksemdpcdku.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZWF5ZWZneWRrc2VtZHBjZGt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTgwNTMsImV4cCI6MjA4NDU5NDA1M30.TYxTXU_AaXcbWhZt0p0ypDV4doA8oEdOs6Oc6zw7Lhk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
