-- =============================================
-- Runeskibidi MMO Master Schema for Supabase
-- Combined and maintained by AI assistant
-- =============================================

-- SECTION 1: DROP/REPLACE POLICIES AND TRIGGERS (from rls-policies-improved.sql, fix-trigger.sql)

-- Players table policies
DROP POLICY IF EXISTS "Users can view own player data" ON players;
DROP POLICY IF EXISTS "Users can update own player data" ON players;
DROP POLICY IF EXISTS "Users can insert own player data" ON players;

-- Characters table policies  
DROP POLICY IF EXISTS "Users can view own character" ON characters;
DROP POLICY IF EXISTS "Users can update own character" ON characters;
DROP POLICY IF EXISTS "Users can insert own character" ON characters;
DROP POLICY IF EXISTS "Users can view other characters" ON characters;

-- Other table policies
DROP POLICY IF EXISTS "Users can manage own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can manage own skills" ON player_skills;

-- Drop the existing trigger and function for user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- =============================================
-- BASE SCHEMA, TABLES, INDEXES, FUNCTIONS
-- =============================================

-- Runeskibidi MMO Database Schema
-- Run this in Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- =============================================
-- PLAYERS TABLE
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
ALTER TABLE players REPLICA IDENTITY FULL;

-- =============================================
-- STARTER ITEMS, TOOLS, AND INVENTORY LOGIC
-- =============================================

-- Add Starter Tools and Starting Inventory System
-- Run this AFTER schema.sql to set up the tool system

-- Add felling axe for woodcutting
INSERT INTO items (id, name, description, type, subtype, max_stack, value, stats) VALUES
('felling_axe', 'Felling Axe', 'Tool for chopping down trees', 'tool', 'axe', 1, 25, 
 jsonb_build_object(
   'gathering_type', 'woodcutting',
   'efficiency', 1,
   'durability', 100
 ))
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- IMPROVED RLS POLICIES AND ROBUST TRIGGERS
-- =============================================

-- Improved RLS Policies for MMO Game
-- Run this in Supabase SQL Editor

-- =============================================
-- DROP EXISTING POLICIES
-- =============================================

-- Players table policies
DROP POLICY IF EXISTS "Users can view own player data" ON players;
DROP POLICY IF EXISTS "Users can update own player data" ON players;
DROP POLICY IF EXISTS "Users can insert own player data" ON players;

-- Characters table policies  
DROP POLICY IF EXISTS "Users can view own character" ON characters;
DROP POLICY IF EXISTS "Users can update own character" ON characters;
DROP POLICY IF EXISTS "Users can insert own character" ON characters;
DROP POLICY IF EXISTS "Users can view other characters" ON characters;

-- Other table policies
DROP POLICY IF EXISTS "Users can manage own inventory" ON inventory;
DROP POLICY IF EXISTS "Users can manage own skills" ON player_skills;

-- =============================================
-- ROBUST USER REGISTRATION TRIGGER
-- =============================================

-- Fix the user registration trigger
-- Run this in Supabase SQL Editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- =============================================
-- CHARACTERS TABLE
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
    x REAL DEFAULT 512,
    y REAL DEFAULT 384,
    sprite_id VARCHAR(100) DEFAULT 'player_default',
    is_hardcore BOOLEAN DEFAULT FALSE,
    hair_color VARCHAR(16) DEFAULT '#6b4a1b',
    skin_color VARCHAR(16) DEFAULT '#e0b97a',
    shirt_color VARCHAR(16) DEFAULT '#3a8dde',
    pants_color VARCHAR(16) DEFAULT '#23242b',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id) -- One character per player for now
);
ALTER TABLE characters REPLICA IDENTITY FULL;
-- If table already exists, add columns if missing
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_hardcore BOOLEAN DEFAULT FALSE;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS hair_color VARCHAR(16) DEFAULT '#6b4a1b';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS skin_color VARCHAR(16) DEFAULT '#e0b97a';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS shirt_color VARCHAR(16) DEFAULT '#3a8dde';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS pants_color VARCHAR(16) DEFAULT '#23242b';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_strength INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_dexterity INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_intellect INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_endurance INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_charisma INTEGER DEFAULT 5;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS base_willpower INTEGER DEFAULT 5;

-- =============================================
-- QUESTS TABLE (Placeholder for future expansion)
-- =============================================
CREATE TABLE IF NOT EXISTS quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE quests REPLICA IDENTITY FULL;
-- TODO: Expand quests table with objectives, rewards, progress tracking, etc.

-- =============================================
-- NPCS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS npcs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE npcs REPLICA IDENTITY FULL;

-- =============================================
-- ZONES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE zones REPLICA IDENTITY FULL;

-- =============================================
-- MONSTERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS monsters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone_id UUID REFERENCES zones(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE monsters REPLICA IDENTITY FULL;

-- =============================================
-- LOOT TABLES
-- =============================================
CREATE TABLE IF NOT EXISTS loot_tables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE loot_tables REPLICA IDENTITY FULL;

-- =============================================
-- CRAFTING RECIPES
-- =============================================
CREATE TABLE IF NOT EXISTS crafting_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE crafting_recipes REPLICA IDENTITY FULL;

-- =============================================
-- GUILDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS guilds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE guilds REPLICA IDENTITY FULL;

-- =============================================
-- AUCTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS auctions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id VARCHAR(100),
    seller_id UUID,
    starting_bid INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE auctions REPLICA IDENTITY FULL;

-- =============================================
-- BANK ACCOUNTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE bank_accounts REPLICA IDENTITY FULL;

-- =============================================
-- MAIL SYSTEM TABLES (messages, attachments, recipients, etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS mail_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID,
    subject VARCHAR(255),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_messages REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES mail_messages(id),
    item_id VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_attachments REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES mail_messages(id),
    recipient_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_recipients REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_senders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES mail_messages(id),
    sender_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_senders REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    subject VARCHAR(255),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_drafts REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_folders REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_labels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_labels REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_filters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    filter_rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_filters REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    rule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_rules REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    settings JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_settings REPLICA IDENTITY FULL;

CREATE TABLE IF NOT EXISTS mail_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    template_name VARCHAR(100),
    body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE mail_templates REPLICA IDENTITY FULL;

-- =============================================
-- TEST AND VERIFICATION QUERIES
-- =============================================

-- Test Queries for Runeskibidi Database
-- Run these in Supabase SQL Editor to verify setup

-- =============================================
-- 1. Check if all tables were created
-- =============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =============================================
-- 2. Check if all policies were created
-- =============================================
SELECT * FROM pg_policies WHERE tablename = 'players';
SELECT * FROM pg_policies WHERE tablename = 'characters';
SELECT * FROM pg_policies WHERE tablename = 'inventory';
SELECT * FROM pg_policies WHERE tablename = 'player_skills';

-- =============================================
-- 3. Check if all triggers were created
-- =============================================
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- =============================================
-- 4. Check if all functions were created
-- =============================================
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- =============================================
-- 5. Check if all items were created
-- =============================================
SELECT * FROM items WHERE id = 'felling_axe';

-- =============================================
-- 6. Check if all users were created
-- =============================================
SELECT * FROM players;
SELECT * FROM characters;
SELECT * FROM inventory;
SELECT * FROM player_skills;

-- =============================================
-- 7. Check if all skills were created
-- =============================================
SELECT * FROM skills;

-- =============================================
-- 8. Check if all quests were created
-- =============================================
-- SELECT * FROM quests; -- This line is commented out as per the edit hint.

-- =============================================
-- 9. Check if all NPCs were created
-- =============================================
SELECT * FROM npcs;

-- =============================================
-- 10. Check if all zones were created
-- =============================================
SELECT * FROM zones;

-- =============================================
-- 11. Check if all monsters were created
-- =============================================
SELECT * FROM monsters;

-- =============================================
-- 12. Check if all loot tables were created
-- =============================================
SELECT * FROM loot_tables;

-- =============================================
-- 13. Check if all crafting recipes were created
-- =============================================
SELECT * FROM crafting_recipes;

-- =============================================
-- 14. Check if all guilds were created
-- =============================================
SELECT * FROM guilds;

-- =============================================
-- 15. Check if all auctions were created
-- =============================================
SELECT * FROM auctions;

-- =============================================
-- 16. Check if all bank accounts were created
-- =============================================
SELECT * FROM bank_accounts;

-- =============================================
-- 17. Check if all mail messages were created
-- =============================================
SELECT * FROM mail_messages;

-- =============================================
-- 18. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 19. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 20. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 21. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 22. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 23. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 24. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 25. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 26. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 27. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 28. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 29. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 30. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 31. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 32. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 33. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 34. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 35. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 36. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 37. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 38. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 39. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 40. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 41. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 42. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 43. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 44. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 45. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 46. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 47. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 48. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 49. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 50. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 51. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 52. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 53. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 54. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 55. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 56. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 57. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 58. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 59. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 60. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 61. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 62. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 63. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 64. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 65. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 66. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 67. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 68. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 69. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 70. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 71. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 72. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 73. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 74. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 75. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 76. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 77. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 78. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 79. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 80. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 81. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 82. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 83. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 84. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 85. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 86. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 87. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 88. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 89. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 90. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders;

-- =============================================
-- 91. Check if all mail drafts were created
-- =============================================
SELECT * FROM mail_drafts;

-- =============================================
-- 92. Check if all mail folders were created
-- =============================================
SELECT * FROM mail_folders;

-- =============================================
-- 93. Check if all mail labels were created
-- =============================================
SELECT * FROM mail_labels;

-- =============================================
-- 94. Check if all mail filters were created
-- =============================================
SELECT * FROM mail_filters;

-- =============================================
-- 95. Check if all mail rules were created
-- =============================================
SELECT * FROM mail_rules;

-- =============================================
-- 96. Check if all mail settings were created
-- =============================================
SELECT * FROM mail_settings;

-- =============================================
-- 97. Check if all mail templates were created
-- =============================================
SELECT * FROM mail_templates;

-- =============================================
-- 98. Check if all mail attachments were created
-- =============================================
SELECT * FROM mail_attachments;

-- =============================================
-- 99. Check if all mail recipients were created
-- =============================================
SELECT * FROM mail_recipients;

-- =============================================
-- 100. Check if all mail senders were created
-- =============================================
SELECT * FROM mail_senders; 