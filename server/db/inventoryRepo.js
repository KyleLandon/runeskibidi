// server/db/inventoryRepo.js
const { getSupabaseAdminClient } = require('./supabase');

const INVENTORY_SLOTS = 28;

async function getInventory(playerId) {
  const supa = getSupabaseAdminClient();
  if (!supa) return [];
  const { data } = await supa
    .from('player_inventory')
    .select('slot_index,item_id,quantity')
    .eq('player_id', playerId)
    .order('slot_index', { ascending: true });
  return data || [];
}

async function getEquipment(playerId) {
  const supa = getSupabaseAdminClient();
  if (!supa) return {};
  const { data } = await supa
    .from('player_equipment')
    .select('slot,item_id')
    .eq('player_id', playerId);
  const map = {};
  for (const row of data || []) map[row.slot] = row.item_id;
  return map;
}

async function getItem(itemId) {
  const supa = getSupabaseAdminClient();
  if (!supa) return null;
  const { data } = await supa
    .from('items')
    .select('id,name,slot,stackable')
    .eq('id', itemId)
    .single();
  return data || null;
}

async function equipFromSlot(playerId, slotIndex) {
  const supa = getSupabaseAdminClient();
  if (!supa) return { ok: false, error: 'no_db' };
  // Fetch inventory row
  const { data: inv } = await supa
    .from('player_inventory')
    .select('item_id,quantity')
    .eq('player_id', playerId)
    .eq('slot_index', slotIndex)
    .single();
  if (!inv) return { ok: false, error: 'empty_slot' };
  const item = await getItem(inv.item_id);
  if (!item || !item.slot) return { ok: false, error: 'not_equippable' };

  // Upsert equipment and clear inventory slot
  await supa.from('player_equipment').upsert({
    player_id: playerId,
    slot: item.slot,
    item_id: item.id
  }, { onConflict: 'player_id,slot' });
  await supa.from('player_inventory').delete().eq('player_id', playerId).eq('slot_index', slotIndex);

  const [inventory, equipment] = await Promise.all([getInventory(playerId), getEquipment(playerId)]);
  return { ok: true, inventory, equipment };
}

async function unequipToInventory(playerId, slot) {
  const supa = getSupabaseAdminClient();
  if (!supa) return { ok: false, error: 'no_db' };
  // Find equipped item
  const { data: eq } = await supa
    .from('player_equipment')
    .select('item_id')
    .eq('player_id', playerId)
    .eq('slot', slot)
    .single();
  if (!eq) return { ok: false, error: 'slot_empty' };
  // Find free inventory slot
  const current = await getInventory(playerId);
  const used = new Set(current.map(r => r.slot_index));
  let free = -1;
  for (let i = 0; i < INVENTORY_SLOTS; i++) { if (!used.has(i)) { free = i; break; } }
  if (free < 0) return { ok: false, error: 'inventory_full' };

  await supa.from('player_inventory').upsert({
    player_id: playerId,
    slot_index: free,
    item_id: eq.item_id,
    quantity: 1
  }, { onConflict: 'player_id,slot_index' });
  await supa.from('player_equipment').delete().eq('player_id', playerId).eq('slot', slot);

  const [inventory, equipment] = await Promise.all([getInventory(playerId), getEquipment(playerId)]);
  return { ok: true, inventory, equipment };
}

module.exports = {
  INVENTORY_SLOTS,
  getInventory,
  getEquipment,
  getItem,
  equipFromSlot,
  unequipToInventory,
};


