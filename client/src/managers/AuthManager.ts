import { createClient, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

export class AuthManager {
  async login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }
  async register(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
  }
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }
  async logout() {
    await supabase.auth.signOut();
  }
  async getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }
  async fetchCharacters(): Promise<{ id: string; name: string; is_hardcore?: boolean; hair_color?: string; skin_color?: string; shirt_color?: string; pants_color?: string }[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, is_hardcore, hair_color, skin_color, shirt_color, pants_color')
      .eq('player_id', userId)
      .limit(4);
    if (error) throw new Error(error.message);
    return data || [];
  }
  async createCharacter(opts: { name: string; is_hardcore: boolean; hair_color: string; skin_color: string; shirt_color: string; pants_color: string }): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    const { error } = await supabase
      .from('characters')
      .insert([{ player_id: userId, ...opts }]);
    if (error) throw new Error(error.message);
  }
} 