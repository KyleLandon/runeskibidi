// server/db/playerRepo.js
const { getSupabaseAdminClient } = require('./supabase');

async function upsertPresence({ playerId, sessionId, status }) {
  const supa = getSupabaseAdminClient();
  if (!supa) return; // no-op if not configured
  try {
    await supa.from('player_presence').upsert({
      player_id: playerId,
      session_id: sessionId,
      status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id' });
  } catch {}
}

async function savePosition({ playerId, x, y }) {
  const supa = getSupabaseAdminClient();
  if (!supa) return;
  try {
    await supa.from('player_position').upsert({
      player_id: playerId,
      x, y,
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id' });
  } catch {}
}

module.exports = { upsertPresence, savePosition };


