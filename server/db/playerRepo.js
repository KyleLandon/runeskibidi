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

async function getCooldowns(playerId) {
  const supa = getSupabaseAdminClient();
  if (!supa) return {};
  try {
    const { data, error } = await supa
      .from('ability_cooldowns')
      .select('ability_id,last_used_at')
      .eq('player_id', playerId);
    if (error || !data) return {};
    const map = {};
    for (const row of data) map[row.ability_id] = new Date(row.last_used_at).getTime();
    return map;
  } catch { return {}; }
}

async function setCooldown({ playerId, abilityId, lastUsedAt }) {
  const supa = getSupabaseAdminClient();
  if (!supa) return;
  try {
    await supa.from('ability_cooldowns').upsert({
      player_id: playerId,
      ability_id: abilityId,
      last_used_at: new Date(lastUsedAt).toISOString()
    }, { onConflict: 'player_id,ability_id' });
  } catch {}
}

module.exports = { upsertPresence, savePosition, getCooldowns, setCooldown };


