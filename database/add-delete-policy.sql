-- =============================================
-- ADD MISSING DELETE POLICY FOR CHARACTERS
-- Run this in Supabase SQL Editor
-- =============================================

-- Drop if exists (in case it was partially created)
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

-- Create the DELETE policy for characters
CREATE POLICY "Users can delete own characters" ON characters
    FOR DELETE USING (player_id = auth.uid());

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'characters' AND policyname = 'Users can delete own characters'; 