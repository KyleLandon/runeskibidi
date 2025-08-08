// server/simulation/spatial.js

class SpatialHash {
  constructor(cellSize = 50) {
    this.cellSize = cellSize;
    this.cells = new Map(); // key -> Set(id)
    this.positions = new Map(); // id -> { x, y, key }
  }

  _keyFrom(x, y) {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx}:${cy}`;
  }

  upsert(id, x, y) {
    const prev = this.positions.get(id);
    const key = this._keyFrom(x, y);
    if (prev && prev.key === key) {
      prev.x = x; prev.y = y; return;
    }
    if (prev) this._removeFromCell(prev.key, id);
    let set = this.cells.get(key);
    if (!set) { set = new Set(); this.cells.set(key, set); }
    set.add(id);
    this.positions.set(id, { x, y, key });
  }

  remove(id) {
    const prev = this.positions.get(id);
    if (!prev) return;
    this._removeFromCell(prev.key, id);
    this.positions.delete(id);
  }

  _removeFromCell(key, id) {
    const set = this.cells.get(key);
    if (!set) return;
    set.delete(id);
    if (set.size === 0) this.cells.delete(key);
  }

  queryRadius(x, y, radius) {
    const results = new Set();
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const r2 = radius * radius;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = `${cx}:${cy}`;
        const set = this.cells.get(key);
        if (!set) continue;
        for (const id of set) {
          const p = this.positions.get(id);
          if (!p) continue;
          const dx = p.x - x, dy = p.y - y;
          if (dx * dx + dy * dy <= r2) results.add(id);
        }
      }
    }
    return Array.from(results);
  }
}

module.exports = { SpatialHash };


