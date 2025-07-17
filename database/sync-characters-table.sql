-- =============================================
-- SYNC CHARACTERS TABLE WITH EXPECTED STRUCTURE
-- Run this in Supabase SQL Editor to sync your characters table
-- =============================================

-- Add missing updated_at column if it doesn't exist
ALTER TABLE characters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing legacy position columns if they don't exist (for compatibility)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS x REAL DEFAULT 512;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS y REAL DEFAULT 384;

-- Update check constraints to match our expected format
-- Note: These may fail if data violates constraints, adjust as needed

-- Fix level constraint (change from level > 0 to level >= 1)
DO $$
BEGIN
    BEGIN
        ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_level_check;
        ALTER TABLE characters ADD CONSTRAINT characters_level_check CHECK (level >= 1);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Could not update level constraint: %', SQLERRM;
    END;
END $$;

-- Fix max_health constraint (change from max_health > 0 to max_health >= 1)  
DO $$
BEGIN
    BEGIN
        ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_max_health_check;
        ALTER TABLE characters ADD CONSTRAINT characters_max_health_check CHECK (max_health >= 1);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Could not update max_health constraint: %', SQLERRM;
    END;
END $$;

-- Fix max_mana constraint (change from max_mana > 0 to max_mana >= 1)
DO $$
BEGIN
    BEGIN
        ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_max_mana_check;
        ALTER TABLE characters ADD CONSTRAINT characters_max_mana_check CHECK (max_mana >= 1);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Could not update max_mana constraint: %', SQLERRM;
    END;
END $$;

-- Add trigger for updated_at column if not exists
DROP TRIGGER IF EXISTS update_characters_updated_at ON characters;
CREATE TRIGGER update_characters_updated_at
    BEFORE UPDATE ON characters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure realtime is enabled
ALTER publication supabase_realtime ADD TABLE characters;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'characters'
AND column_name IN ('updated_at', 'x', 'y')
ORDER BY column_name; 