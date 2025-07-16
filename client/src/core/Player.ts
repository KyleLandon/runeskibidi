import * as PIXI from 'pixi.js';

export type Stat = {
  name: string;
  value: number;
};

export type EquipmentSlot =
  | 'head' | 'cape' | 'neck' | 'shoulders' | 'mainHand' | 'offHand' | 'body' | 'belt' | 'legs' | 'gloves' | 'boots' | 'ring' | 'ammo';

export type Equipment = {
  [slot in EquipmentSlot]: string | null;
};

export type Inventory = (string | null)[]; // 32 slots

export const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  'head', 'cape', 'neck', 'shoulders', 'mainHand', 'offHand', 'body', 'belt', 'legs', 'gloves', 'boots', 'ring', 'ammo'
];

// Mock item database for demo/testing
const ITEM_DB: Record<string, { attribute_bonuses?: { [key: string]: number } }> = {
  'Iron Helmet': { attribute_bonuses: { strength: 1, endurance: 1 } },
  'Bronze Sword': { attribute_bonuses: { strength: 2 } },
  'Leather Armor': { attribute_bonuses: { endurance: 1, dexterity: 1 } },
  'Leather Boots': { attribute_bonuses: { dexterity: 1 } },
  'Iron Platelegs': { attribute_bonuses: { strength: 1, endurance: 1 } },
  'Wooden Shield': { attribute_bonuses: { endurance: 2 } },
};
function getItemById(id: string | null | undefined) {
  if (!id) return null;
  return ITEM_DB[id] || null;
}

export class Player extends PIXI.Container {
  sprite: PIXI.Graphics;
  stats: Stat[];
  equipment: Equipment;
  inventory: Inventory;
  base_strength: number = 5;
  base_dexterity: number = 5;
  base_intellect: number = 5;
  base_endurance: number = 5;
  base_charisma: number = 5;
  base_willpower: number = 5;
  skills: Array<{ primary_attribute: string; level: number }> = [];
  constructor(x: number, y: number) {
    super();
    this.sprite = new PIXI.Graphics();
    this.sprite.beginFill(0x00aaff);
    this.sprite.drawCircle(0, 0, 20);
    this.sprite.endFill();
    this.addChild(this.sprite);
    this.x = x;
    this.y = y;
    this.stats = [
      { name: 'Health', value: 100 },
      { name: 'Fitness', value: 100 },
      { name: 'Spirit', value: 50 },
      { name: 'Faith', value: 20 },
      // Combat skills (example values)
      { name: 'Attack', value: 1 },
      { name: 'Strength', value: 1 },
      { name: 'Defense', value: 1 },
      { name: 'Ranged', value: 1 },
      { name: 'Magic', value: 1 },
      { name: 'Tactics', value: 1 },
      { name: 'Stealth', value: 1 },
    ];
    this.equipment = {
      head: 'Iron Helmet',
      cape: null,
      neck: null,
      shoulders: null,
      mainHand: 'Bronze Sword',
      offHand: null,
      body: 'Leather Armor',
      belt: null,
      legs: 'Iron Platelegs',
      gloves: null,
      boots: 'Leather Boots',
      ring: null,
      ammo: null,
    };
    this.inventory = [
      'Bronze Sword', 'Iron Helmet', 'Leather Armor', 'Leather Boots',
      'Iron Platelegs', 'Health Potion', 'Mana Potion', 'Wooden Shield',
      null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null,
      null, null, null, null, null, null, null, null
    ];
  }
  setPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  getTotalAttributes() {
    // Base attributes
    const base: { [key: string]: number } = {
      strength: this.base_strength || 5,
      dexterity: this.base_dexterity || 5,
      intellect: this.base_intellect || 5,
      endurance: this.base_endurance || 5,
      charisma: this.base_charisma || 5,
      willpower: this.base_willpower || 5,
    };
    // Equipment bonuses
    const equipment: { [key: string]: number } = { strength: 0, dexterity: 0, intellect: 0, endurance: 0, charisma: 0, willpower: 0 };
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = this.equipment[slot];
      const item = getItemById(itemId);
      if (item && item.attribute_bonuses) {
        for (const attr in equipment) {
          equipment[attr] += item.attribute_bonuses[attr] || 0;
        }
      }
    }
    // Skill bonuses
    const skill: { [key: string]: number } = { strength: 0, dexterity: 0, intellect: 0, endurance: 0, charisma: 0, willpower: 0 };
    if (this.skills) {
      for (const s of this.skills) {
        if (s.primary_attribute && skill[s.primary_attribute] !== undefined) {
          skill[s.primary_attribute] += Math.floor((s.level || 1) / 5);
        }
      }
    }
    // Total
    const total: { [key: string]: number } = {};
    for (const attr in base) {
      total[attr] = base[attr] + equipment[attr] + skill[attr];
    }
    return { base, equipment, skill, total };
  }
} 