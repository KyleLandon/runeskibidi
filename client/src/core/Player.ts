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

export type Inventory = (string | null)[]; // 30 slots

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
  characterName: string = '';
  characterId: string = '';
  hairColor: string = '#8B4513';
  skinColor: string = '#FDBCB4';
  shirtColor: string = '#4169E1';
  pantsColor: string = '#2F4F4F';
  gender: 'male' | 'female' = 'male';
  isMoving: boolean = false;
  
  constructor(x: number, y: number) {
    super();
    this.createSprite();
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
      null, null, null, null, null, null
    ];
  }

  createSprite() {
    console.log('🎭 Creating simple graphics-based player sprite...');
    
    // Always use simple graphics sprite (original shapes)
    this.sprite = new PIXI.Graphics();
    this.updateSpriteAppearance();
    
    this.addChild(this.sprite);
    console.log('✅ Simple player sprite created with basic shapes');
  }

  updateSpriteAppearance() {
    // Clear and redraw the simple graphics sprite
    this.sprite.clear();
    
    // Body (skin color)
    this.sprite.rect(-8, -12, 16, 24);
    this.sprite.fill(parseInt(this.skinColor.replace('#', ''), 16));
    
    // Hair
    this.sprite.rect(-8, -12, 16, 6);
    this.sprite.fill(parseInt(this.hairColor.replace('#', ''), 16));
    
    // Shirt
    this.sprite.rect(-8, -6, 16, 10);
    this.sprite.fill(parseInt(this.shirtColor.replace('#', ''), 16));
    
    // Pants
    this.sprite.rect(-8, 4, 16, 8);
    this.sprite.fill(parseInt(this.pantsColor.replace('#', ''), 16));
    
    // Simple face dots for eyes
    this.sprite.circle(-3, -8, 1);
    this.sprite.fill(0x000000);
    this.sprite.circle(3, -8, 1);
    this.sprite.fill(0x000000);
  }

  initializeFromCharacter(character: any) {
    this.characterName = character.name || '';
    this.characterId = character.id || '';
    this.hairColor = character.hair_color || '#8B4513';
    this.skinColor = character.skin_color || '#FDBCB4';
    this.shirtColor = character.shirt_color || '#4169E1';
    this.pantsColor = character.pants_color || '#2F4F4F';
    
    // Update base stats if available
    if (character.strength) this.base_strength = character.strength;
    if (character.dexterity) this.base_dexterity = character.dexterity;
    if (character.intellect) this.base_intellect = character.intellect;
    if (character.endurance) this.base_endurance = character.endurance;
    if (character.charisma) this.base_charisma = character.charisma;
    if (character.willpower) this.base_willpower = character.willpower;
    
    // Update sprite appearance
    this.updateSpriteAppearance();
    
    console.log(`Player ${this.characterName} initialized with appearance and stats`);
  }

  move(dx: number, dy: number) {
    // Update position
    this.x += dx;
    this.y += dy;
    
    // Keep player within reasonable world bounds
    const worldBounds = 900; // Half the world size
    if (this.x < -worldBounds) this.x = -worldBounds;
    if (this.x > worldBounds) this.x = worldBounds;
    if (this.y < -worldBounds) this.y = -worldBounds;
    if (this.y > worldBounds) this.y = worldBounds;
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

  updateAnimation(isMoving: boolean) {
    // Simple animation for graphics sprite - slightly change scale when moving
    if (isMoving && !this.isMoving) {
      // Started moving - slightly scale down to show "stepping" effect
      this.sprite.scale.set(0.95, 1.05);
    } else if (!isMoving && this.isMoving) {
      // Stopped moving - return to normal scale
      this.sprite.scale.set(1.0, 1.0);
    }
    
    this.isMoving = isMoving;
  }
} 