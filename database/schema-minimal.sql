-- =============================================
-- RUNESKIBIDI - Minimal Core Schema (3D-ready)
-- Tables: players, characters (+position_z), character_skills,
--         character_inventory, character_equipment, items, skills
-- Includes: RLS, policies, triggers, realtime publications
-- =============================================

-- Extensions and defaults
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER DEFAULT PRIVILEGES REVOKE USAGE, SELECT ON SEQUENCES FROM PUBLIC;

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  total_playtime INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}'::jsonb
);
DO $$ BEGIN
  ALTER TABLE players ADD CONSTRAINT players_email_unique UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE players ADD CONSTRAINT username_format_chk CHECK (username ~ '^[A-Za-z0-9_]{3,20}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE players REPLICA IDENTITY FULL;

-- Characters (3D position)
CREATE TABLE IF NOT EXISTS characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level >= 1),
  experience BIGINT DEFAULT 0 CHECK (experience >= 0),
  health INTEGER DEFAULT 100 CHECK (health >= 0),
  max_health INTEGER DEFAULT 100 CHECK (max_health >= 1),
  mana INTEGER DEFAULT 50 CHECK (mana >= 0),
  max_mana INTEGER DEFAULT 50 CHECK (max_mana >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Attributes
  strength INTEGER DEFAULT 5 CHECK (strength BETWEEN 1 AND 50),
  dexterity INTEGER DEFAULT 5 CHECK (dexterity BETWEEN 1 AND 50),
  intellect INTEGER DEFAULT 5 CHECK (intellect BETWEEN 1 AND 50),
  endurance INTEGER DEFAULT 5 CHECK (endurance BETWEEN 1 AND 50),
  charisma INTEGER DEFAULT 5 CHECK (charisma BETWEEN 1 AND 50),
  willpower INTEGER DEFAULT 5 CHECK (willpower BETWEEN 1 AND 50),
  -- 3D position
  position_x REAL DEFAULT 400,
  position_y REAL DEFAULT 300,
  position_z REAL DEFAULT 0,
  world_id VARCHAR(100) DEFAULT 'starter_world',
  -- Appearance / mode
  is_hardcore BOOLEAN DEFAULT FALSE,
  hair_color VARCHAR(7) DEFAULT '#8B4513',
  skin_color VARCHAR(7) DEFAULT '#FDBCB4',
  shirt_color VARCHAR(7) DEFAULT '#4169E1',
  pants_color VARCHAR(7) DEFAULT '#2F4F4F'
);
DO $$ BEGIN
  ALTER TABLE characters ADD CONSTRAINT unique_character_name_per_player UNIQUE (player_id, name);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_characters_player_id ON characters(player_id);
ALTER TABLE characters REPLICA IDENTITY FULL;

-- Character skills
CREATE TABLE IF NOT EXISTS character_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_name VARCHAR(50) NOT NULL,
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 99),
  experience INTEGER DEFAULT 0 CHECK (experience >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, skill_name)
);
CREATE INDEX IF NOT EXISTS idx_character_skills_char ON character_skills(character_id);
ALTER TABLE character_skills REPLICA IDENTITY FULL;

-- Character inventory
CREATE TABLE IF NOT EXISTS character_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index < 32),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, slot_index)
);
CREATE INDEX IF NOT EXISTS idx_character_inventory_char ON character_inventory(character_id);
ALTER TABLE character_inventory REPLICA IDENTITY FULL;

-- Character equipment
CREATE TABLE IF NOT EXISTS character_equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  slot_name VARCHAR(20) NOT NULL,
  item_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, slot_name),
  CHECK (slot_name IN ('head','cape','neck','shoulders','mainHand','offHand','body','belt','legs','gloves','boots','ring','ammo'))
);
CREATE INDEX IF NOT EXISTS idx_character_equipment_char ON character_equipment(character_id);
ALTER TABLE character_equipment REPLICA IDENTITY FULL;

-- Items
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  subtype VARCHAR(50),
  rarity VARCHAR(20) DEFAULT 'common',
  value INTEGER DEFAULT 0,
  max_stack INTEGER DEFAULT 1,
  stats JSONB DEFAULT '{}'::jsonb,
  requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE items REPLICA IDENTITY FULL;

-- Skills
CREATE TABLE IF NOT EXISTS skills (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  category VARCHAR(30) NOT NULL,
  max_level INTEGER DEFAULT 99,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE skills REPLICA IDENTITY FULL;

-- Presence (optional)
CREATE TABLE IF NOT EXISTS player_presence (
  player_id UUID PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_id TEXT NOT NULL DEFAULT 'single',
  pos_x REAL DEFAULT 0,
  pos_y REAL DEFAULT 0,
  pos_z REAL DEFAULT 0
);
ALTER TABLE player_presence ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY presence_owner_upd ON player_presence FOR UPDATE USING (auth.uid() = player_id) WITH CHECK (auth.uid() = player_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY presence_owner_ins ON player_presence FOR INSERT WITH CHECK (auth.uid() = player_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY presence_public_read ON player_presence FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE player_presence;
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON player_presence (last_seen DESC);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_character_skills_updated_at ON character_skills;
CREATE TRIGGER update_character_skills_updated_at
  BEFORE UPDATE ON character_skills FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_character_inventory_updated_at ON character_inventory;
CREATE TRIGGER update_character_inventory_updated_at
  BEFORE UPDATE ON character_inventory FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_character_equipment_updated_at ON character_equipment;
CREATE TRIGGER update_character_equipment_updated_at
  BEFORE UPDATE ON character_equipment FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Character cap per player
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
  BEFORE INSERT ON characters FOR EACH ROW
  EXECUTE FUNCTION check_character_limit();

-- New user hook: mirror to players
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO players (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create player record for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS enable
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view own player data" ON players;
DROP POLICY IF EXISTS "Users can update own player data" ON players;
DROP POLICY IF EXISTS "Users can insert own player data" ON players;
CREATE POLICY "Users can view own player data" ON players FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own player data" ON players FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own player data" ON players FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;
CREATE POLICY "Users can view own characters" ON characters FOR SELECT USING (player_id = auth.uid());
CREATE POLICY "Users can insert own characters" ON characters FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "Users can update own characters" ON characters FOR UPDATE USING (player_id = auth.uid());
CREATE POLICY "Users can delete own characters" ON characters FOR DELETE USING (player_id = auth.uid());

-- Character-linked tables follow character ownership
-- character_skills
DROP POLICY IF EXISTS "Users can view own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can insert own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can update own character skills" ON character_skills;
DROP POLICY IF EXISTS "Users can delete own character skills" ON character_skills;
CREATE POLICY "Users can view own character skills" ON character_skills
  FOR SELECT USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can insert own character skills" ON character_skills
  FOR INSERT WITH CHECK (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can update own character skills" ON character_skills
  FOR UPDATE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can delete own character skills" ON character_skills
  FOR DELETE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));

-- character_inventory
DROP POLICY IF EXISTS "Users can view own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can insert own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can update own character inventory" ON character_inventory;
DROP POLICY IF EXISTS "Users can delete own character inventory" ON character_inventory;
CREATE POLICY "Users can view own character inventory" ON character_inventory
  FOR SELECT USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can insert own character inventory" ON character_inventory
  FOR INSERT WITH CHECK (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can update own character inventory" ON character_inventory
  FOR UPDATE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can delete own character inventory" ON character_inventory
  FOR DELETE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));

-- character_equipment
DROP POLICY IF EXISTS "Users can view own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can insert own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can update own character equipment" ON character_equipment;
DROP POLICY IF EXISTS "Users can delete own character equipment" ON character_equipment;
CREATE POLICY "Users can view own character equipment" ON character_equipment
  FOR SELECT USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can insert own character equipment" ON character_equipment
  FOR INSERT WITH CHECK (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can update own character equipment" ON character_equipment
  FOR UPDATE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));
CREATE POLICY "Users can delete own character equipment" ON character_equipment
  FOR DELETE USING (character_id IN (SELECT id FROM characters WHERE player_id = auth.uid()));

-- Public read refs
DROP POLICY IF EXISTS "Anyone can view items" ON items;
DROP POLICY IF EXISTS "Anyone can view skills" ON skills;
CREATE POLICY "Anyone can view items" ON items FOR SELECT USING (true);
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);

-- Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE characters;
ALTER PUBLICATION supabase_realtime ADD TABLE character_skills;
ALTER PUBLICATION supabase_realtime ADD TABLE character_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE character_equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE skills;

-- Seed reference data (minimal)
INSERT INTO items (id, name, description, type, subtype, rarity, value, max_stack, stats) VALUES
('bronze_sword','Bronze Sword','A basic sword','weapon','sword','common',25,1,'{"damage":8}'),
('leather_armor','Leather Armor','Basic armor','armor','body','common',20,1,'{"defense":5}'),
('health_potion','Health Potion','Restores 25 HP','consumable','potion','common',5,10,'{"heal":25}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (id, name, description, category, max_level) VALUES
('attack','Attack','Melee accuracy/damage','combat',99),
('strength','Strength','Melee damage/carry','combat',99),
('defense','Defense','Damage mitigation','combat',99),
('mining','Mining','Gather ores','gathering',99),
('woodcutting','Woodcutting','Chop trees','gathering',99),
('smithing','Smithing','Forge items','crafting',99)
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;

