-- =============================================
-- RUNESKIBIDI MMO CURRENT DATABASE SCHEMA
-- This reflects the actual current state of the database
-- =============================================

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =============================================
-- 1. PLAYERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS players (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT FALSE,
    total_playtime INTEGER DEFAULT 0, -- seconds
    preferences JSONB DEFAULT '{}'::JSONB
);

-- =============================================
-- 2. CHARACTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS characters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1 CHECK (level > 0),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    health INTEGER DEFAULT 100 CHECK (health >= 0),
    max_health INTEGER DEFAULT 100 CHECK (max_health > 0),
    mana INTEGER DEFAULT 50 CHECK (mana >= 0),
    max_mana INTEGER DEFAULT 50 CHECK (max_mana > 0),
    sprite_id VARCHAR(100) DEFAULT 'player_default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Character stats and attributes
    strength INTEGER DEFAULT 5 CHECK (strength >= 1 AND strength <= 50),
    dexterity INTEGER DEFAULT 5 CHECK (dexterity >= 1 AND dexterity <= 50),
    intellect INTEGER DEFAULT 5 CHECK (intellect >= 1 AND intellect <= 50),
    endurance INTEGER DEFAULT 5 CHECK (endurance >= 1 AND endurance <= 50),
    charisma INTEGER DEFAULT 5 CHECK (charisma >= 1 AND charisma <= 50),
    willpower INTEGER DEFAULT 5 CHECK (willpower >= 1 AND willpower <= 50),
    
    -- Position and world tracking
    position_x REAL DEFAULT 400,
    position_y REAL DEFAULT 300,
    world_id VARCHAR(100) DEFAULT 'starter_world',
    
    -- Character appearance and game mode
    is_hardcore BOOLEAN DEFAULT false,
    hair_color VARCHAR(7) DEFAULT '#8B4513',
    skin_color VARCHAR(7) DEFAULT '#FDBCB4',
    shirt_color VARCHAR(7) DEFAULT '#4169E1',
    pants_color VARCHAR(7) DEFAULT '#2F4F4F'
);

-- =============================================
-- 3. CHARACTER SKILLS TABLE
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
-- 4. CHARACTER INVENTORY TABLE
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
-- 5. CHARACTER EQUIPMENT TABLE
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
-- 6. ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common',
    max_stack INTEGER DEFAULT 1,
    value INTEGER DEFAULT 0,
    stats JSONB DEFAULT '{}'::JSONB,
    requirements JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. SKILLS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL,
    max_level INTEGER DEFAULT 99,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 8. LEGACY PLAYER-BASED TABLES
-- =============================================

-- Legacy inventory table (player-based, kept for compatibility)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    item_id VARCHAR(100) REFERENCES items(id),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    slot_index INTEGER CHECK (slot_index >= 0 AND slot_index < 32),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legacy player skills table (player-based, kept for compatibility)
CREATE TABLE IF NOT EXISTS player_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    skill_id VARCHAR(50) REFERENCES skills(id),
    level INTEGER DEFAULT 1 CHECK (level > 0),
    experience INTEGER DEFAULT 0 CHECK (experience >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotbar slots for quick access items
CREATE TABLE IF NOT EXISTS hotbar_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    slot_index INTEGER CHECK (slot_index >= 0 AND slot_index < 8),
    item_id VARCHAR(100) REFERENCES items(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 9. CHAT SYSTEM
-- =============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (length(message) <= 500),
    channel VARCHAR(50) DEFAULT 'global',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 10. GUILD SYSTEM
-- =============================================
CREATE TABLE IF NOT EXISTS guilds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    player_id UUID UNIQUE REFERENCES players(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 11. WORLD AND GAME OBJECTS
-- =============================================
CREATE TABLE IF NOT EXISTS zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_objects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    object_id VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    x REAL NOT NULL,
    y REAL NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    last_interaction TIMESTAMP WITH TIME ZONE,
    respawn_time INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS npcs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monsters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone_id UUID REFERENCES zones(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 12. GAME ECONOMY
-- =============================================
CREATE TABLE IF NOT EXISTS auctions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id VARCHAR(100),
    seller_id UUID,
    starting_bid INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 13. FUTURE EXPANSION TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loot_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crafting_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 14. FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Character limit function
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

DROP TRIGGER IF EXISTS update_player_skills_updated_at ON player_skills;
CREATE TRIGGER update_player_skills_updated_at
    BEFORE UPDATE ON player_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 15. ENABLE REALTIME ON ALL TABLES
-- =============================================
-- Enable realtime for immediate updates across clients

-- Core game tables
ALTER publication supabase_realtime ADD TABLE players;
ALTER publication supabase_realtime ADD TABLE characters;
ALTER publication supabase_realtime ADD TABLE character_skills;
ALTER publication supabase_realtime ADD TABLE character_inventory;
ALTER publication supabase_realtime ADD TABLE character_equipment;

-- Legacy tables
ALTER publication supabase_realtime ADD TABLE inventory;
ALTER publication supabase_realtime ADD TABLE player_skills;
ALTER publication supabase_realtime ADD TABLE hotbar_slots;

-- Chat and social
ALTER publication supabase_realtime ADD TABLE chat_messages;
ALTER publication supabase_realtime ADD TABLE guilds;
ALTER publication supabase_realtime ADD TABLE guild_members;

-- World and objects
ALTER publication supabase_realtime ADD TABLE world_objects;
ALTER publication supabase_realtime ADD TABLE zones;
ALTER publication supabase_realtime ADD TABLE npcs;
ALTER publication supabase_realtime ADD TABLE monsters;

-- Economy
ALTER publication supabase_realtime ADD TABLE auctions;
ALTER publication supabase_realtime ADD TABLE bank_accounts;

-- Reference tables
ALTER publication supabase_realtime ADD TABLE items;
ALTER publication supabase_realtime ADD TABLE skills;
ALTER publication supabase_realtime ADD TABLE quests;
ALTER publication supabase_realtime ADD TABLE loot_tables;
ALTER publication supabase_realtime ADD TABLE crafting_recipes;

-- =============================================
-- 16. ENABLE ROW LEVEL SECURITY
-- =============================================
-- Enable RLS on all tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotbar_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 17. CREATE RLS POLICIES
-- =============================================
-- (Policies would be extensive - this is a template showing the approach)

-- Players policies
DROP POLICY IF EXISTS "Users can view own player data" ON players;
DROP POLICY IF EXISTS "Users can update own player data" ON players;
DROP POLICY IF EXISTS "Users can insert own player data" ON players;

CREATE POLICY "Users can view own player data" ON players
    FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own player data" ON players
    FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own player data" ON players
    FOR INSERT WITH CHECK (id = auth.uid());

-- Characters policies
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

-- Chat messages - users can view all but only insert/update/delete their own
DROP POLICY IF EXISTS "Users can view all chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;

CREATE POLICY "Users can view all chat messages" ON chat_messages
    FOR SELECT USING (true);
CREATE POLICY "Users can insert own chat messages" ON chat_messages
    FOR INSERT WITH CHECK (player_id = auth.uid());

-- World objects - all users can view, but only authorized users can modify
DROP POLICY IF EXISTS "Anyone can view world objects" ON world_objects;
CREATE POLICY "Anyone can view world objects" ON world_objects
    FOR SELECT USING (true);

-- Items and skills are public read-only
DROP POLICY IF EXISTS "Anyone can view items" ON items;
DROP POLICY IF EXISTS "Anyone can view skills" ON skills;
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);

-- (Additional policies would be needed for all other tables...)

-- =============================================
-- 18. INSERT STARTING DATA
-- =============================================
-- (Same as before - items and skills data)

-- =============================================
-- 19. VERIFICATION QUERIES
-- =============================================

-- Check that all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check realtime enabled tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename; 