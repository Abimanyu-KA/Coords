import { createClient } from '@supabase/supabase-js'

// Now it looks for the variable we set in Vercel (and .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)