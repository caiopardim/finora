import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofpyuzdqfpqienlnzjwi.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mcHl1emRxZnBxaWVubG56andpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTI3NzUsImV4cCI6MjA5NjI2ODc3NX0.MS1saFBaxmHel8BIMbIbfBPGbPtBpnZsQZo0QpT8680';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'finora-auth',
  },
});
