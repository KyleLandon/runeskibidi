export interface PlayerSkills {
  // Gathering Skills
  woodcutting: { level: number; xp: number; xpToNext: number; };
  mining: { level: number; xp: number; xpToNext: number; };
  harvesting: { level: number; xp: number; xpToNext: number; };
  fishing: { level: number; xp: number; xpToNext: number; };
  hunting: { level: number; xp: number; xpToNext: number; };
  farming: { level: number; xp: number; xpToNext: number; };
  
  // Combat Skills
  attack: { level: number; xp: number; xpToNext: number; };
  strength: { level: number; xp: number; xpToNext: number; };
  defense: { level: number; xp: number; xpToNext: number; };
  ranged: { level: number; xp: number; xpToNext: number; };
  magic: { level: number; xp: number; xpToNext: number; };
  
  // Crafting Skills
  blacksmithing: { level: number; xp: number; xpToNext: number; };
  cooking: { level: number; xp: number; xpToNext: number; };
  alchemy: { level: number; xp: number; xpToNext: number; };
  
  // Social Skills
  politics: { level: number; xp: number; xpToNext: number; };
  trade: { level: number; xp: number; xpToNext: number; };
}

export interface SkillGain {
  skill: keyof PlayerSkills;
  xpGained: number;
  newLevel?: number;
  leveledUp: boolean;
}

export class SkillManager {
  private static instance: SkillManager;
  private skills: PlayerSkills;
  
  // XP table - exponential progression
  private static readonly XP_TABLE = [
    0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, // 1-10
    3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450, // 11-20
    11500, 12600, 13750, 14950, 16200, 17500, 18850, 20250, 21700, 23200, // 21-30
    24750, 26350, 28000, 29700, 31450, 33250, 35100, 37000, 38950, 40950, // 31-40
    43000, 45100, 47250, 49450, 51700, 54000, 56350, 58750, 61200, 63700, // 41-50
    66250, 68850, 71500, 74200, 76950, 79750, 82600, 85500, 88450, 91450, // 51-60
    94500, 97600, 100750, 103950, 107200, 110500, 113850, 117250, 120700, 124200, // 61-70
    127750, 131350, 135000, 138700, 142450, 146250, 150100, 154000, 157950, 161950, // 71-80
    166000, 170100, 174250, 178450, 182700, 187000, 191350, 195750, 200200, 204700, // 81-90
    209250, 213850, 218500, 223200, 227950, 232750, 237600, 242500, 247450, 252450  // 91-100
  ];

  static getInstance(): SkillManager {
    if (!SkillManager.instance) {
      SkillManager.instance = new SkillManager();
    }
    return SkillManager.instance;
  }

  constructor() {
    // Initialize with level 1 skills
    this.skills = {
      // Gathering Skills
      woodcutting: { level: 1, xp: 0, xpToNext: 100 },
      mining: { level: 1, xp: 0, xpToNext: 100 },
      harvesting: { level: 1, xp: 0, xpToNext: 100 },
      fishing: { level: 1, xp: 0, xpToNext: 100 },
      hunting: { level: 1, xp: 0, xpToNext: 100 },
      farming: { level: 1, xp: 0, xpToNext: 100 },
      
      // Combat Skills
      attack: { level: 1, xp: 0, xpToNext: 100 },
      strength: { level: 1, xp: 0, xpToNext: 100 },
      defense: { level: 1, xp: 0, xpToNext: 100 },
      ranged: { level: 1, xp: 0, xpToNext: 100 },
      magic: { level: 1, xp: 0, xpToNext: 100 },
      
      // Crafting Skills
      blacksmithing: { level: 1, xp: 0, xpToNext: 100 },
      cooking: { level: 1, xp: 0, xpToNext: 100 },
      alchemy: { level: 1, xp: 0, xpToNext: 100 },
      
      // Social Skills
      politics: { level: 1, xp: 0, xpToNext: 100 },
      trade: { level: 1, xp: 0, xpToNext: 100 }
    };
  }

  getSkills(): PlayerSkills {
    return { ...this.skills };
  }

  getSkill(skillName: keyof PlayerSkills) {
    return { ...this.skills[skillName] };
  }

  // Award XP and handle level ups
  addXP(skillName: keyof PlayerSkills, amount: number): SkillGain {
    const skill = this.skills[skillName];
    const oldLevel = skill.level;
    
    skill.xp += amount;
    
    // Check for level up
    let newLevel = oldLevel;
    while (newLevel < 100 && skill.xp >= SkillManager.XP_TABLE[newLevel]) {
      newLevel++;
    }
    
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) {
      skill.level = newLevel;
      console.log(`🎉 ${skillName.toUpperCase()} LEVEL UP! Now level ${newLevel}`);
    }
    
    // Calculate XP to next level
    if (newLevel < 100) {
      skill.xpToNext = SkillManager.XP_TABLE[newLevel] - skill.xp;
    } else {
      skill.xpToNext = 0; // Max level
    }
    
    const result: SkillGain = {
      skill: skillName,
      xpGained: amount,
      newLevel: leveledUp ? newLevel : undefined,
      leveledUp
    };
    try {
      window.dispatchEvent(new CustomEvent('skills-updated', { detail: { skill: skillName, result } }));
    } catch {}
    return result;
  }

  // Get XP required for a specific level
  static getXPForLevel(level: number): number {
    if (level < 1) return 0;
    if (level > 100) return SkillManager.XP_TABLE[99];
    return SkillManager.XP_TABLE[level - 1];
  }

  // Calculate XP gains based on skill type and object
  calculateXPGain(skillName: keyof PlayerSkills, objectType: string): number {
    const baseXP = {
      tree: 25,     // Woodcutting XP
      rock: 30,     // Mining XP  
      crystal: 50,  // Mining XP (higher for rare crystals)
      bush: 20      // Harvesting XP
    };

    const skill = this.skills[skillName];
    let xp = 0;

    switch (skillName) {
      case 'woodcutting':
        if (objectType === 'tree') {
          xp = baseXP.tree;
        }
        break;
      case 'mining':
        if (objectType === 'rock') {
          xp = baseXP.rock;
        } else if (objectType === 'crystal') {
          xp = baseXP.crystal;
        }
        break;
      case 'harvesting':
        if (objectType === 'bush') {
          xp = baseXP.bush;
        }
        break;
    }

    // Slight bonus for higher levels (diminishing returns)
    const levelBonus = Math.floor(skill.level / 10) * 2;
    return xp + levelBonus;
  }

  // Check if player can gather from an object (level requirements)
  canGather(skillName: keyof PlayerSkills, objectType: string): { canGather: boolean; levelRequired?: number } {
    const skill = this.skills[skillName];
    
    // Define level requirements for different objects
    const requirements = {
      tree: 1,      // Trees require woodcutting level 1
      rock: 1,      // Rocks require mining level 1
      crystal: 15,  // Crystals require mining level 15
      bush: 1       // Bushes require harvesting level 1
    };

    let requiredLevel = 1;
    switch (skillName) {
      case 'woodcutting':
        requiredLevel = requirements.tree;
        break;
      case 'mining':
        requiredLevel = objectType === 'crystal' ? requirements.crystal : requirements.rock;
        break;
      case 'harvesting':
        requiredLevel = requirements.bush;
        break;
    }

    return {
      canGather: skill.level >= requiredLevel,
      levelRequired: skill.level < requiredLevel ? requiredLevel : undefined
    };
  }

  // Get progress percentage to next level
  getProgressToNextLevel(skillName: keyof PlayerSkills): number {
    const skill = this.skills[skillName];
    if (skill.level >= 100) return 100;
    
    const currentLevelXP = SkillManager.getXPForLevel(skill.level);
    const nextLevelXP = SkillManager.getXPForLevel(skill.level + 1);
    const progressXP = skill.xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    
    return Math.round((progressXP / requiredXP) * 100);
  }

  // Save skills to localStorage
  saveSkills(): void {
    localStorage.setItem('runeskibidi_skills', JSON.stringify(this.skills));
  }

  // Load skills from localStorage
  loadSkills(): void {
    const saved = localStorage.getItem('runeskibidi_skills');
    if (saved) {
      try {
        const loadedSkills = JSON.parse(saved);
        // Ensure all required fields exist
        Object.keys(this.skills).forEach(skillName => {
          const skill = skillName as keyof PlayerSkills;
          if (loadedSkills[skill]) {
            this.skills[skill] = { ...this.skills[skill], ...loadedSkills[skill] };
            // Recalculate xpToNext
            const currentLevel = this.skills[skill].level;
            if (currentLevel < 100) {
              this.skills[skill].xpToNext = SkillManager.XP_TABLE[currentLevel] - this.skills[skill].xp;
            } else {
              this.skills[skill].xpToNext = 0;
            }
          }
        });
        console.log('✅ Skills loaded from save data');
      } catch (error) {
        console.warn('Failed to load skills from save data:', error);
      }
    }
  }

  // Reset all skills (for debugging/testing)
  resetSkills(): void {
    this.skills = {
      // Gathering Skills
      woodcutting: { level: 1, xp: 0, xpToNext: 100 },
      mining: { level: 1, xp: 0, xpToNext: 100 },
      harvesting: { level: 1, xp: 0, xpToNext: 100 },
      fishing: { level: 1, xp: 0, xpToNext: 100 },
      hunting: { level: 1, xp: 0, xpToNext: 100 },
      farming: { level: 1, xp: 0, xpToNext: 100 },
      
      // Combat Skills
      attack: { level: 1, xp: 0, xpToNext: 100 },
      strength: { level: 1, xp: 0, xpToNext: 100 },
      defense: { level: 1, xp: 0, xpToNext: 100 },
      ranged: { level: 1, xp: 0, xpToNext: 100 },
      magic: { level: 1, xp: 0, xpToNext: 100 },
      
      // Crafting Skills
      blacksmithing: { level: 1, xp: 0, xpToNext: 100 },
      cooking: { level: 1, xp: 0, xpToNext: 100 },
      alchemy: { level: 1, xp: 0, xpToNext: 100 },
      
      // Social Skills
      politics: { level: 1, xp: 0, xpToNext: 100 },
      trade: { level: 1, xp: 0, xpToNext: 100 }
    };
    this.saveSkills();
  }
} 