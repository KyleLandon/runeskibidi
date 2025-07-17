-- =============================================
-- CHARACTER CREATION SYSTEM DATABASE MIGRATION
-- Run this in Supabase SQL Editor to add missing columns
-- =============================================

-- =============================================
-- 1. UPDATE CHARACTERS TABLE
-- =============================================

-- Remove the UNIQUE constraint on player_id to allow multiple characters per player
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_player_id_key;

-- Add missing columns for character basic info and game modes
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_hardcore BOOLEAN DEFAULT false;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS hair_color VARCHAR(7) DEFAULT '#8B4513';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS skin_color VARCHAR(7) DEFAULT '#FDBCB4';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS shirt_color VARCHAR(7) DEFAULT '#4169E1';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS pants_color VARCHAR(7) DEFAULT '#2F4F4F';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level >= 1);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS experience BIGINT DEFAULT 0 CHECK (experience >= 0);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS health INTEGER DEFAULT 100 CHECK (health >= 0);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS max_health INTEGER DEFAULT 100 CHECK (max_health >= 1);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS mana INTEGER DEFAULT 50 CHECK (mana >= 0);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS max_mana INTEGER DEFAULT 50 CHECK (max_mana >= 1);

-- Add missing columns for character stats and attributes
ALTER TABLE characters ADD COLUMN IF NOT EXISTS strength INTEGER DEFAULT 5 CHECK (strength >= 1 AND strength <= 50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS dexterity INTEGER DEFAULT 5 CHECK (dexterity >= 1 AND dexterity <= 50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS intellect INTEGER DEFAULT 5 CHECK (intellect >= 1 AND intellect <= 50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS endurance INTEGER DEFAULT 5 CHECK (endurance >= 1 AND endurance <= 50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS charisma INTEGER DEFAULT 5 CHECK (charisma >= 1 AND charisma <= 50);
ALTER TABLE characters ADD COLUMN IF NOT EXISTS willpower INTEGER DEFAULT 5 CHECK (willpower >= 1 AND willpower <= 50);

-- Add position and world tracking
ALTER TABLE characters ADD COLUMN IF NOT EXISTS position_x REAL DEFAULT 400;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS position_y REAL DEFAULT 300;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS world_id VARCHAR(100) DEFAULT 'starter_world';

-- Rename columns if they exist with old names (PostgreSQL compatible)
DO $$
BEGIN
    -- Rename x to position_x if x exists and position_x doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'characters' AND column_name = 'x')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'characters' AND column_name = 'position_x') THEN
        ALTER TABLE characters RENAME COLUMN x TO position_x;
    END IF;
    
    -- Rename y to position_y if y exists and position_y doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'characters' AND column_name = 'y')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'characters' AND column_name = 'position_y') THEN
        ALTER TABLE characters RENAME COLUMN y TO position_y;
    END IF;
    
    -- If both old and new columns exist, drop the old ones (assuming data was migrated)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'characters' AND column_name = 'x')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'position_x') THEN
        ALTER TABLE characters DROP COLUMN x;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'characters' AND column_name = 'y')
       AND EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'characters' AND column_name = 'position_y') THEN
        ALTER TABLE characters DROP COLUMN y;
    END IF;
END $$;

-- Add check to limit characters per player (max 4)
-- Drop trigger first, then function, then recreate both
DROP TRIGGER IF EXISTS character_limit_trigger ON characters;
DROP FUNCTION IF EXISTS check_character_limit();

CREATE OR REPLACE FUNCTION check_character_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM characters WHERE player_id = NEW.player_id) >= 4 THEN
        RAISE EXCEPTION 'Player cannot have more than 4 characters';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER character_limit_trigger
    BEFORE INSERT ON characters
    FOR EACH ROW
    EXECUTE FUNCTION check_character_limit();

-- =============================================
-- 2. CREATE CHARACTER SKILLS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS character_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    skill_name VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 99),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, skill_name)
);

-- =============================================
-- 3. CREATE CHARACTER INVENTORY TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS character_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
    slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, slot_index)
);

-- =============================================
-- 4. CREATE CHARACTER EQUIPMENT TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS character_equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    slot_name VARCHAR(20) NOT NULL,
    item_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, slot_name),
    CHECK (slot_name IN ('head', 'cape', 'neck', 'shoulders', 'mainHand', 'offHand', 'body', 'belt', 'legs', 'gloves', 'boots', 'ring', 'ammo'))
);

-- =============================================
-- 5. CREATE ITEMS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common',
    value INTEGER DEFAULT 0,
    max_stack INTEGER DEFAULT 1,
    stats JSONB DEFAULT '{}'::JSONB,
    requirements JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 6. INSERT STARTING ITEMS
-- =============================================

-- Combat items
INSERT INTO items (id, name, description, type, subtype, rarity, value, max_stack, stats) VALUES
('bronze_sword', 'Bronze Sword', 'A basic sword made of bronze', 'weapon', 'sword', 'common', 25, 1, '{"damage": 8, "speed": 1.2}'),
('leather_armor', 'Leather Armor', 'Basic leather armor', 'armor', 'body', 'common', 20, 1, '{"defense": 5}'),
('health_potion', 'Health Potion', 'Restores 25 health points', 'consumable', 'potion', 'common', 5, 10, '{"heal": 25}')
ON CONFLICT (id) DO NOTHING;

-- Gathering items
INSERT INTO items (id, name, description, type, subtype, rarity, value, max_stack, stats) VALUES
('bronze_pickaxe', 'Bronze Pickaxe', 'Basic mining tool', 'tool', 'pickaxe', 'common', 30, 1, '{"mining_power": 1, "durability": 100}'),
('bronze_axe', 'Bronze Axe', 'Basic woodcutting tool', 'tool', 'axe', 'common', 25, 1, '{"woodcutting_power": 1, "durability": 100}'),
('fishing_rod', 'Fishing Rod', 'Basic fishing tool', 'tool', 'fishing_rod', 'common', 20, 1, '{"fishing_power": 1, "durability": 100}')
ON CONFLICT (id) DO NOTHING;

-- Crafting items
INSERT INTO items (id, name, description, type, subtype, rarity, value, max_stack, stats) VALUES
('hammer', 'Hammer', 'Basic smithing tool', 'tool', 'hammer', 'common', 15, 1, '{"crafting_power": 1, "durability": 100}'),
('crafting_knife', 'Crafting Knife', 'Basic crafting tool', 'tool', 'knife', 'common', 10, 1, '{"crafting_power": 1, "durability": 100}'),
('cooking_pot', 'Cooking Pot', 'Basic cooking tool', 'tool', 'pot', 'common', 12, 1, '{"cooking_power": 1, "durability": 100}')
ON CONFLICT (id) DO NOTHING;

-- Social items
INSERT INTO items (id, name, description, type, subtype, rarity, value, max_stack, stats) VALUES
('gold_coins', 'Gold Coins', 'Standard currency', 'currency', 'coin', 'common', 1, 1000, '{}'),
('merchant_ledger', 'Merchant Ledger', 'For tracking trades', 'misc', 'book', 'common', 50, 1, '{"trade_bonus": 5}'),
('fine_clothes', 'Fine Clothes', 'Well-made clothing', 'armor', 'body', 'uncommon', 75, 1, '{"charisma": 2}')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 7. CREATE SKILLS TABLE (if not exists)
-- =============================================

CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL,
    max_level INTEGER DEFAULT 99,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert skill definitions
INSERT INTO skills (id, name, description, category, max_level) VALUES
-- Combat skills
('attack', 'Attack', 'Increases accuracy and damage with melee weapons', 'combat', 99),
('strength', 'Strength', 'Increases melee damage and carrying capacity', 'combat', 99),
('defense', 'Defense', 'Reduces damage taken from attacks', 'combat', 99),
('ranged', 'Ranged', 'Increases accuracy and damage with ranged weapons', 'combat', 99),
('magic', 'Magic', 'Increases magical damage and mana pool', 'combat', 99),

-- Gathering skills
('mining', 'Mining', 'Extract ores and gems from rocks', 'gathering', 99),
('woodcutting', 'Woodcutting', 'Chop trees for wood and other materials', 'gathering', 99),
('fishing', 'Fishing', 'Catch fish and other aquatic creatures', 'gathering', 99),
('farming', 'Farming', 'Grow crops and raise livestock', 'gathering', 99),
('hunting', 'Hunting', 'Track and hunt wild animals', 'gathering', 99),

-- Crafting skills
('smithing', 'Smithing', 'Create weapons and armor from metals', 'crafting', 99),
('carpentry', 'Carpentry', 'Create furniture and structures from wood', 'crafting', 99),
('cooking', 'Cooking', 'Prepare food and beverages', 'crafting', 99),
('alchemy', 'Alchemy', 'Create potions and magical items', 'crafting', 99),
('tailoring', 'Tailoring', 'Create clothing and fabric items', 'crafting', 99),

-- Social skills
('persuasion', 'Persuasion', 'Convince others through dialogue', 'social', 99),
('deception', 'Deception', 'Mislead others for advantage', 'social', 99),
('intimidation', 'Intimidation', 'Use fear to influence others', 'social', 99),
('leadership', 'Leadership', 'Lead groups and inspire others', 'social', 99),
('trading', 'Trading', 'Get better prices when buying and selling', 'social', 99)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 8. ENABLE REALTIME ON NEW TABLES
-- =============================================

-- Enable realtime for immediate updates across clients
ALTER publication supabase_realtime ADD TABLE character_skills;
ALTER publication supabase_realtime ADD TABLE character_inventory;
ALTER publication supabase_realtime ADD TABLE character_equipment;

-- Also ensure core tables have realtime enabled
ALTER publication supabase_realtime ADD TABLE characters;
ALTER publication supabase_realtime ADD TABLE players;
ALTER publication supabase_realtime ADD TABLE items;
ALTER publication supabase_realtime ADD TABLE skills;

-- =============================================
-- 9. CREATE RLS POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE character_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_equipment ENABLE ROW LEVEL SECURITY;

-- Characters policies (allow multiple characters per player)
DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

CREATE POLICY "Users can view own characters" ON characters
    FOR SELECT USING (player_id = auth.uid());

CREATE POLICY "Users can insert own characters" ON characters
    FOR INSERT WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users can update own characters" ON characters
    FOR UPDATE USING (player_id = auth.uid());

CREATE POLICY "Users can delete own characters" ON characters
    FOR DELETE USING (player_id = auth.uid());

-- Character skills policies
DROP POLICY IF EXISTS "Users can view own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can insert own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can update own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can delete own character skills" ON character_skills;

CREATE POLICY "Users can view own character skills" ON character_skills
    FOR SELECT USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can insert own character skills" ON character_skills
    FOR INSERT WITH CHECK (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can update own character skills" ON character_skills
    FOR UPDATE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can delete own character skills" ON character_skills
    FOR DELETE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

-- Character inventory policies
DROP POLICY IF EXISTS "Users can view own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can insert own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can update own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can delete own character inventory" ON character_inventory;

CREATE POLICY "Users can view own character inventory" ON character_inventory
    FOR SELECT USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can insert own character inventory" ON character_inventory
    FOR INSERT WITH CHECK (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can update own character inventory" ON character_inventory
    FOR UPDATE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can delete own character inventory" ON character_inventory
    FOR DELETE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

-- Character equipment policies
DROP POLICY IF EXISTS "Users can view own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can insert own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can update own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can delete own character equipment" ON character_equipment;

CREATE POLICY "Users can view own character equipment" ON character_equipment
    FOR SELECT USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can insert own character equipment" ON character_equipment
    FOR INSERT WITH CHECK (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can update own character equipment" ON character_equipment
    FOR UPDATE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

CREATE POLICY "Users can delete own character equipment" ON character_equipment
    FOR DELETE USING (
        character_id IN (SELECT id FROM characters WHERE player_id = auth.uid())
    );

-- Items and skills are public read-only
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view items" ON items;
DROP POLICY IF EXISTS "Anyone can view skills" ON skills;

CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);

-- =============================================
-- 10. CREATE TRIGGERS FOR TIMESTAMPS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_character_skills_updated_at ON character_skills;
CREATE TRIGGER update_character_skills_updated_at
    BEFORE UPDATE ON character_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_character_inventory_updated_at ON character_inventory;
CREATE TRIGGER update_character_inventory_updated_at
    BEFORE UPDATE ON character_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_character_equipment_updated_at ON character_equipment;
CREATE TRIGGER update_character_equipment_updated_at
    BEFORE UPDATE ON character_equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 11. CREATE USER REGISTRATION TRIGGER
-- =============================================

-- Enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO players (id, username, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create player record for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('characters', 'character_skills', 'character_inventory', 'character_equipment', 'items', 'skills', 'players')
ORDER BY table_name;

-- Check character table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'characters'
ORDER BY ordinal_position; 