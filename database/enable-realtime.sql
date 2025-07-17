-- =============================================
-- ENABLE REALTIME ON ALL TABLES
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable realtime for immediate updates across clients
-- This allows real-time synchronization for MMO features

-- Core game tables that need real-time updates
ALTER publication supabase_realtime ADD TABLE players;
ALTER publication supabase_realtime ADD TABLE characters;
ALTER publication supabase_realtime ADD TABLE character_skills;
ALTER publication supabase_realtime ADD TABLE character_inventory;
ALTER publication supabase_realtime ADD TABLE character_equipment;

-- Reference tables (less frequent updates but still useful)
ALTER publication supabase_realtime ADD TABLE items;
ALTER publication supabase_realtime ADD TABLE skills;

-- Future expansion tables (enable realtime for when they're implemented)
ALTER publication supabase_realtime ADD TABLE quests;
ALTER publication supabase_realtime ADD TABLE npcs;
ALTER publication supabase_realtime ADD TABLE zones;
ALTER publication supabase_realtime ADD TABLE monsters;
ALTER publication supabase_realtime ADD TABLE loot_tables;
ALTER publication supabase_realtime ADD TABLE crafting_recipes;
ALTER publication supabase_realtime ADD TABLE guilds;
ALTER publication supabase_realtime ADD TABLE auctions;
ALTER publication supabase_realtime ADD TABLE bank_accounts;

-- Verify realtime is enabled on all tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename; 