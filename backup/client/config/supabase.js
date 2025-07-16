import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Vite exposes env variables on import.meta.env (must start with VITE_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database table names
export const TABLES = {
  PLAYERS: 'players',
  CHARACTERS: 'characters',
  ITEMS: 'items',
  INVENTORY: 'inventory',
  CHAT_MESSAGES: 'chat_messages',
  WORLD_OBJECTS: 'world_objects',
  SKILLS: 'skills',
  PLAYER_SKILLS: 'player_skills'
}

// Real-time channels
export const CHANNELS = {
  PLAYER_POSITIONS: 'player_positions',
  CHAT: 'chat',
  WORLD_EVENTS: 'world_events'
} 