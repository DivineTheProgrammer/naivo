import { createClient } from '@supabase/supabase-js'

// Server only. Never import this from a page or component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)
