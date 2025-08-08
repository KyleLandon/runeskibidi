export type Ability = {
  id: string;
  name: string;
  icon?: string;
  cooldownMs: number;
  lastUsedAt: number; // epoch ms
  onUse: () => void | Promise<void>;
};

export class AbilitySystem {
  private static instance: AbilitySystem;
  private slots: (Ability | null)[] = new Array(8).fill(null);

  static getInstance(): AbilitySystem {
    if (!AbilitySystem.instance) AbilitySystem.instance = new AbilitySystem();
    return AbilitySystem.instance;
  }

  assign(slotIndex: number, ability: Ability | null) {
    if (slotIndex < 0 || slotIndex >= this.slots.length) return;
    this.slots[slotIndex] = ability;
    window.dispatchEvent(new CustomEvent('ability-assigned', { detail: { slotIndex, ability } }));
  }

  get(slotIndex: number): Ability | null {
    return this.slots[slotIndex] || null;
  }

  canUse(slotIndex: number): { ok: boolean; remainingMs: number } {
    const a = this.get(slotIndex);
    if (!a) return { ok: false, remainingMs: 0 };
    const now = Date.now();
    const remaining = a.lastUsedAt ? Math.max(0, a.cooldownMs - (now - a.lastUsedAt)) : 0;
    return { ok: remaining <= 0, remainingMs: remaining };
  }

  async use(slotIndex: number) {
    const a = this.get(slotIndex);
    if (!a) return false;
    const { ok } = this.canUse(slotIndex);
    if (!ok) return false;
    try {
      await a.onUse();
      a.lastUsedAt = Date.now();
      window.dispatchEvent(new CustomEvent('ability-used', { detail: { slotIndex, ability: a } }));
      return true;
    } catch (e) {
      console.warn('Ability failed', e);
      return false;
    }
  }
}



