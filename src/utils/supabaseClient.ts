import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hdpqihtbueodtermrqbm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcHFpaHRidWVvZHRlcm1ycWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NzUzNzYsImV4cCI6MjA4NzQ1MTM3Nn0.a1O7rfEnktapsaTb-8xi8aQxuDABYXLLD9VK2DSjcdI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
