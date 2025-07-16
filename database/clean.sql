-- =============================================
-- CLEAN ALL GAME TABLES (TRUNCATE)
-- =============================================

SET session_replication_role = replica;

TRUNCATE TABLE
    guild_members,
    guilds,
    world_objects,
    chat_messages,
    player_skills,
    skills,
    inventory,
    items,
    characters,
    players,
    quests
RESTART IDENTITY CASCADE;

SET session_replication_role = DEFAULT;

SELECT 'All main game tables truncated. Ready for fresh schema/data.' as message;