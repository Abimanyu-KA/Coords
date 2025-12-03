import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bvdabrjvckbjkaddwcza.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2ZGFicmp2Y2tiamthZGR3Y3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTgwNTUsImV4cCI6MjA4MDE5NDA1NX0.RO3TFw7LIkLFV9fG7H6lJXvh3TsVHIRYLYKtLmFKfB8'

export const supabase = createClient(supabaseUrl, supabaseKey)