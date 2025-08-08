import { createClient } from '@supabase/supabase-js';
import type { CharacterCreateOptions } from '../components/CharacterSelectModal';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);

export class AuthManager {
  async login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await this.ensurePlayerRecord();
  }
  
  async register(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    // After sign up, a session might not be active until email confirmation depending on settings
    // Attempt to ensure player record if session exists
    await this.ensurePlayerRecord().catch(() => {});
  }
  
  async getSession(): Promise<any> {
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
  
  async fetchCharacters(): Promise<{ 
    id: string; 
    name: string; 
    is_hardcore?: boolean; 
    hair_color?: string; 
    skin_color?: string; 
    shirt_color?: string; 
    pants_color?: string;
    level?: number;
    created_at?: string;
  }[]> {
    const userId = await this.getCurrentUserId();
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('characters')
      .select(`
        id, 
        name, 
        is_hardcore, 
        hair_color, 
        skin_color, 
        shirt_color, 
        pants_color,
        level,
        created_at
      `)
      .eq('player_id', userId)
      .order('created_at', { ascending: false })
      .limit(4);
      
    if (error) throw new Error(error.message);
    return data || [];
  }
  
  async createCharacter(opts: CharacterCreateOptions): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('Not logged in');
    // Ensure a corresponding players row exists to satisfy FK
    await this.ensurePlayerRecord();
    
    // Check if character name is already taken by this user
    const { data: existingChars } = await supabase
      .from('characters')
      .select('name')
      .eq('player_id', userId)
      .eq('name', opts.name.trim());
      
    if (existingChars && existingChars.length > 0) {
      throw new Error('Character name already exists');
    }
    
    // Create character record
    const characterData = {
      player_id: userId,
      name: opts.name.trim(),
      is_hardcore: opts.is_hardcore,
      hair_color: opts.hair_color,
      skin_color: opts.skin_color,
      shirt_color: opts.shirt_color,
      pants_color: opts.pants_color,
      level: 1,
      experience: 0,
      health: 100,
      max_health: 100,
      mana: 50,
      max_mana: 50,
      // Starting stats
      strength: opts.starting_stats.strength,
      dexterity: opts.starting_stats.dexterity,
      intellect: opts.starting_stats.intellect,
      endurance: opts.starting_stats.endurance,
      charisma: opts.starting_stats.charisma,
      willpower: opts.starting_stats.willpower,
      // Starting position (could be customized later)
      position_x: 0,
      position_y: 1,
      position_z: 0,
      world_id: 'starter_world'
    };
    
    const { error: charError, data: newChar } = await supabase
      .from('characters')
      .insert([characterData])
      .select()
      .single();
      
    if (charError) throw new Error(charError.message);
    
    // Initialize starting skills based on focus
    if (newChar && opts.starting_skills.length > 0) {
      const skillsToCreate = this.getStartingSkills(opts.starting_skills[0]);
      const skillData = skillsToCreate.map(skill => ({
        character_id: newChar.id,
        skill_name: skill.name,
        level: skill.level,
        experience: 0
      }));
      
      const { error: skillError } = await supabase
        .from('character_skills')
        .insert(skillData);
        
      if (skillError) {
        console.warn('Failed to create starting skills:', skillError.message);
        // Don't throw error here - character is created, skills can be added later
      }
    }
    
    // Initialize starting inventory (basic items)
    if (newChar) {
      const startingItems = this.getStartingItems(opts.starting_skills[0]);
      const inventoryData = startingItems.map((item, index) => ({
        character_id: newChar.id,
        item_id: item.id,
        quantity: item.quantity,
        slot_index: index
      }));
      
      const { error: invError } = await supabase
        .from('character_inventory')
        .insert(inventoryData);
        
      if (invError) {
        console.warn('Failed to create starting inventory:', invError.message);
        // Don't throw error here - character is created, items can be added later
      }
    }
  }

  private async ensurePlayerRecord(): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    const email = userData.user?.email || '';
    if (!uid) return;
    const username = (userData.user?.user_metadata?.username as string) || (email ? email.split('@')[0] : `user_${uid.substring(0, 6)}`);
    // Upsert player row guarded by RLS (id must equal auth.uid())
    const { error } = await supabase.from('players').upsert({ id: uid, username, email }).eq('id', uid);
    if (error) throw new Error(error.message);
  }
  
  private getStartingSkills(focus: string): { name: string; level: number }[] {
    const skillSets = {
      combat: [
        { name: 'Attack', level: 2 },
        { name: 'Strength', level: 2 },
        { name: 'Defense', level: 1 }
      ],
      gathering: [
        { name: 'Mining', level: 2 },
        { name: 'Woodcutting', level: 2 },
        { name: 'Fishing', level: 1 }
      ],
      crafting: [
        { name: 'Smithing', level: 2 },
        { name: 'Carpentry', level: 2 },
        { name: 'Cooking', level: 1 }
      ],
      social: [
        { name: 'Persuasion', level: 2 },
        { name: 'Trading', level: 2 },
        { name: 'Leadership', level: 1 }
      ]
    };
    
    return skillSets[focus as keyof typeof skillSets] || skillSets.combat;
  }
  
  private getStartingItems(focus: string): { id: string; quantity: number }[] {
    const itemSets = {
      combat: [
        { id: 'bronze_sword', quantity: 1 },
        { id: 'leather_armor', quantity: 1 },
        { id: 'health_potion', quantity: 3 }
      ],
      gathering: [
        { id: 'bronze_pickaxe', quantity: 1 },
        { id: 'bronze_axe', quantity: 1 },
        { id: 'fishing_rod', quantity: 1 }
      ],
      crafting: [
        { id: 'hammer', quantity: 1 },
        { id: 'crafting_knife', quantity: 1 },
        { id: 'cooking_pot', quantity: 1 }
      ],
      social: [
        { id: 'gold_coins', quantity: 100 },
        { id: 'merchant_ledger', quantity: 1 },
        { id: 'fine_clothes', quantity: 1 }
      ]
    };
    
    return itemSets[focus as keyof typeof itemSets] || itemSets.combat;
  }

  async deleteCharacter(characterId: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    if (!userId) throw new Error('Not logged in');

    console.log('Attempting to delete character:', { characterId, userId });

    // Delete the character record (CASCADE will handle related data)
    const { data, error } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)
      .eq('player_id', userId) // Extra security: only allow deleting own characters
      .select(); // Get deleted rows to confirm deletion

    console.log('Delete result:', { data, error });

    if (error) throw new Error(error.message);
    
    if (!data || data.length === 0) {
      throw new Error('Character not found or not authorized to delete');
    }
  }
} 