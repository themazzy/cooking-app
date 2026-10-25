import { createClient } from '@supabase/supabase-js'

// Project "cooking-app". The publishable key is meant to ship in the app:
// row level security decides what each signed-in household can see.
export const SUPABASE_URL = 'https://hndmhsvhvpgbsgxgnckw.supabase.co'
const PUBLISHABLE_KEY = 'sb_publishable_4z38qDMNnFXZdRiouZqXTA_vsq8SLid'

export const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
