// server/simulation/world.js
const EventEmitter = require('events');
const { SpatialHash } = require('./spatial');

class WorldCore extends EventEmitter {}

class World {
  constructor(options = {}) {
    this.tickRate = options.tickRate || 20; // ticks per second
    this.msPerTick = Math.floor(1000 / this.tickRate);

    // Authoritative state
    this.players = new Map(); // playerId -> { x, y, vx, vy, dir, lastCastAt, lastSnapshotTo, zoneId, lastSnapshot }
    this.inputs = [];
    this.spatial = new SpatialHash(50);

    // interest management
    this.visibilityRadius = 250; // units
    this.zoneSize = 1000; // world divided into grid zones

    // Networking callbacks (wired by ws layer)
    this._send = null; // (playerId, msg)
    this._broadcast = null; // (msg)
    this._broadcastExcept = null; // (playerId, msg)

    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    let last = Date.now();
    const loop = () => {
      if (!this.running) return;
      const now = Date.now();
      let steps = Math.max(1, Math.floor((now - last) / this.msPerTick));
      steps = Math.min(steps, 5); // avoid spiral of death
      for (let i = 0; i < steps; i++) this.tick(this.msPerTick);
      last = now;
      setTimeout(loop, this.msPerTick);
    };
    setTimeout(loop, this.msPerTick);
  }

  stop() { this.running = false; }

  onSend(cb) { this._send = cb; }
  onBroadcast(cb) { this._broadcast = cb; }
  onBroadcastExcept(cb) { this._broadcastExcept = cb; }

  send(playerId, msg) { if (this._send) this._send(playerId, msg); }
  broadcast(msg) { if (this._broadcast) this._broadcast(msg); }
  broadcastExcept(exceptId, msg) { if (this._broadcastExcept) this._broadcastExcept(exceptId, msg); }

  addPlayer(playerId) {
    // Spawn at origin for now
    const zoneId = this.getZoneId(0,0);
    this.players.set(playerId, { x: 0, y: 0, vx: 0, vy: 0, dir: 0, lastCastAt: 0, lastSnapshotTo: 0, zoneId, lastSnapshot: new Map() });
    this.spatial.upsert(playerId, 0, 0);
    // Notify others via ws layer
  }

  removePlayer(playerId) { this.players.delete(playerId); this.spatial.remove(playerId); }

  queueInput(input) { this.inputs.push(input); }

  // Simple movement limits
  static clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  async processInput(input) {
    const { playerId, kind, payload } = input;
    const p = this.players.get(playerId);
    if (!p) return;

    if (kind === 'move') {
      const { seq = 0, x, y } = payload;
      // Authoritative sanity checks
      const maxStep = 5.0; // units per tick
      const dx = x - p.x;
      const dy = y - p.y;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        const dist = Math.hypot(dx, dy);
        if (dist <= maxStep * 3) { // allow some leeway
          p.x = x;
          p.y = y;
          this.spatial.upsert(playerId, p.x, p.y);
          p.zoneId = this.getZoneId(p.x, p.y);
          // send ack for reconciliation
          this.send(playerId, { type: 'ack', seq });
        } else {
          // snap back
          this.send(playerId, { type: 'correction', x: p.x, y: p.y, reason: 'teleport_blocked' });
        }
      }
    } else if (kind === 'cast') {
      const now = Date.now();
      const cdMs = 1500; // simple cooldown
      if (now - (p.lastCastAt || 0) < cdMs) {
        this.send(playerId, { type: 'ability_denied', reason: 'cooldown' });
        return;
      }
      p.lastCastAt = now;
      // For demo, broadcast a simple effect
      this.broadcast({ type: 'ability_cast', by: playerId, at: now });
    } else if (kind === 'equip') {
      // defer to DB repo
      try {
        const { equipFromSlot } = require('../db/inventoryRepo');
        const res = await equipFromSlot(playerId, Number(payload.slotIndex));
        if (res?.ok) this.send(playerId, { type: 'inventory_update', inventory: res.inventory, equipment: res.equipment });
        else this.send(playerId, { type: 'inventory_error', error: res?.error || 'equip_failed' });
      } catch (e) { this.send(playerId, { type: 'inventory_error', error: 'equip_exception' }); }
    } else if (kind === 'unequip') {
      try {
        const { unequipToInventory } = require('../db/inventoryRepo');
        const res = await unequipToInventory(playerId, String(payload.slot));
        if (res?.ok) this.send(playerId, { type: 'inventory_update', inventory: res.inventory, equipment: res.equipment });
        else this.send(playerId, { type: 'inventory_error', error: res?.error || 'unequip_failed' });
      } catch { this.send(playerId, { type: 'inventory_error', error: 'unequip_exception' }); }
    }
  }

  tick(ms) {
    // Process pending inputs
    if (this.inputs.length) {
      const inputs = this.inputs.splice(0, this.inputs.length);
      for (const input of inputs) this.processInput(input);
    }

    // Interest-managed delta snapshots ~5 Hz
    if (!this._lastSnapshotAt || Date.now() - this._lastSnapshotAt > 200) {
      const now = Date.now();
      for (const [id, s] of this.players.entries()) {
        const nearbyIds = this.spatial.queryRadius(s.x, s.y, this.visibilityRadius);
        const current = new Map();
        for (const nid of nearbyIds) {
          const ns = this.players.get(nid);
          if (!ns) continue;
          current.set(nid, { id: nid, x: ns.x, y: ns.y, dir: ns.dir });
        }
        const deltas = this.computeDeltas(s.lastSnapshot || new Map(), current);
        if (deltas.add.length || deltas.update.length || deltas.remove.length) {
          this.send(id, { type: 'snapshot_delta', t: now, add: deltas.add, update: deltas.update, remove: deltas.remove });
        }
        s.lastSnapshot = current;
      }
      this._lastSnapshotAt = now;
    }
  }

  getZoneId(x, y) {
    const zx = Math.floor(x / this.zoneSize);
    const zy = Math.floor(y / this.zoneSize);
    return `${zx}:${zy}`;
  }

  computeDeltas(prevMap, nextMap) {
    const add = [];
    const update = [];
    const remove = [];
    for (const [id, cur] of nextMap.entries()) {
      const prev = prevMap.get(id);
      if (!prev) { add.push(cur); continue; }
      if (prev.x !== cur.x || prev.y !== cur.y || prev.dir !== cur.dir) update.push(cur);
    }
    for (const id of prevMap.keys()) {
      if (!nextMap.has(id)) remove.push(id);
    }
    return { add, update, remove };
  }

  buildSnapshot() {
    const entities = [];
    for (const [id, s] of this.players.entries()) {
      entities.push({ id, x: s.x, y: s.y, dir: s.dir });
    }
    return entities;
  }

  getSnapshotFor(_playerId) { return this.buildSnapshot(); }
}

module.exports = { World };


