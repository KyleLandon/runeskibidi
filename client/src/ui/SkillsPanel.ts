import { SkillManager, type PlayerSkills } from '../managers/SkillManager';

export class SkillsPanel {
  el: HTMLDivElement;
  private skillManager: SkillManager;

  constructor() {
    this.skillManager = SkillManager.getInstance();
    this.el = document.createElement('div');
    this.el.className = 'skills-panel';
    this.createSkillsPanel();
  }

  createSkillsPanel() {
    this.el.innerHTML = `
      <h3>🛠️ Skills</h3>
      <div class="skills-container">
        <!-- Combat Skills -->
        <div class="skill-category">
          <h4>⚔️ Combat</h4>
          <div class="skill-entry" data-skill="attack">
            <div class="skill-header">
              <span class="skill-icon">⚔️</span>
              <div class="skill-info">
                <div class="skill-name">Attack</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #dc2626;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="strength">
            <div class="skill-header">
              <span class="skill-icon">💪</span>
              <div class="skill-info">
                <div class="skill-name">Strength</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #dc2626;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="defense">
            <div class="skill-header">
              <span class="skill-icon">🛡️</span>
              <div class="skill-info">
                <div class="skill-name">Defense</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #1e40af;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="ranged">
            <div class="skill-header">
              <span class="skill-icon">🏹</span>
              <div class="skill-info">
                <div class="skill-name">Ranged</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #059669;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="magic">
            <div class="skill-header">
              <span class="skill-icon">✨</span>
              <div class="skill-info">
                <div class="skill-name">Magic</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #7c3aed;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
        </div>

        <!-- Gathering Skills -->
        <div class="skill-category">
          <h4>🪓 Gathering</h4>
          <div class="skill-entry" data-skill="woodcutting">
            <div class="skill-header">
              <span class="skill-icon">🪓</span>
              <div class="skill-info">
                <div class="skill-name">Woodcutting</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #8B4513;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>

          <div class="skill-entry" data-skill="mining">
            <div class="skill-header">
              <span class="skill-icon">⛏️</span>
              <div class="skill-info">
                <div class="skill-name">Mining</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #696969;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>

          <div class="skill-entry" data-skill="harvesting">
            <div class="skill-header">
              <span class="skill-icon">🌿</span>
              <div class="skill-info">
                <div class="skill-name">Harvesting</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #228B22;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="fishing">
            <div class="skill-header">
              <span class="skill-icon">🎣</span>
              <div class="skill-info">
                <div class="skill-name">Fishing</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #0369a1;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="hunting">
            <div class="skill-header">
              <span class="skill-icon">🦌</span>
              <div class="skill-info">
                <div class="skill-name">Hunting</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #92400e;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="farming">
            <div class="skill-header">
              <span class="skill-icon">🌾</span>
              <div class="skill-info">
                <div class="skill-name">Farming</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #65a30d;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
        </div>

        <!-- Crafting Skills -->
        <div class="skill-category">
          <h4>⚒️ Crafting</h4>
          <div class="skill-entry" data-skill="blacksmithing">
            <div class="skill-header">
              <span class="skill-icon">⚒️</span>
              <div class="skill-info">
                <div class="skill-name">Blacksmithing</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #991b1b;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="cooking">
            <div class="skill-header">
              <span class="skill-icon">🍳</span>
              <div class="skill-info">
                <div class="skill-name">Cooking</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #ea580c;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="alchemy">
            <div class="skill-header">
              <span class="skill-icon">🧪</span>
              <div class="skill-info">
                <div class="skill-name">Alchemy</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #7c2d12;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
        </div>

        <!-- Social Skills -->
        <div class="skill-category">
          <h4>🏛️ Social</h4>
          <div class="skill-entry" data-skill="politics">
            <div class="skill-header">
              <span class="skill-icon">🏛️</span>
              <div class="skill-info">
                <div class="skill-name">Politics</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #be123c;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
          
          <div class="skill-entry" data-skill="trade">
            <div class="skill-header">
              <span class="skill-icon">💰</span>
              <div class="skill-info">
                <div class="skill-name">Trade</div>
                <div class="skill-level">Level 1</div>
              </div>
            </div>
            <div class="skill-progress-container">
              <div class="skill-progress-bar">
                <div class="skill-progress-fill" style="width: 0%; background-color: #ca8a04;"></div>
              </div>
              <div class="skill-xp-text">0/100 XP</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add CSS styles
    this.addStyles();
    this.updateSkillsDisplay();
  }

  addStyles() {
    // Check if styles already exist
    if (document.getElementById('skills-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'skills-panel-styles';
    style.textContent = `
      .skills-panel {
        background: #2c3e50;
        border: 2px solid #34495e;
        border-radius: 8px;
        padding: 15px;
        margin: 10px;
        color: white;
        font-family: Arial, sans-serif;
        min-width: 280px;
      }

      .skills-panel h3 {
        margin: 0 0 15px 0;
        color: #f1c40f;
        text-align: center;
        font-size: 18px;
        font-weight: bold;
      }

      .skills-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .skill-category {
        margin-bottom: 16px;
      }

      .skill-category h4 {
        margin: 0 0 12px 0;
        color: #e74c3c;
        font-size: 14px;
        font-weight: bold;
        border-bottom: 1px solid #4a5f7a;
        padding-bottom: 4px;
      }

      .skill-entry {
        background: #34495e;
        border: 1px solid #4a5f7a;
        border-radius: 6px;
        padding: 8px;
        margin-bottom: 8px;
      }

      .skill-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
      }

      .skill-icon {
        font-size: 20px;
        margin-right: 10px;
        width: 24px;
        text-align: center;
      }

      .skill-info {
        flex: 1;
      }

      .skill-name {
        font-weight: bold;
        font-size: 14px;
        color: #ecf0f1;
      }

      .skill-level {
        font-size: 12px;
        color: #bdc3c7;
      }

      .skill-progress-container {
        margin-top: 5px;
      }

      .skill-progress-bar {
        background: #2c3e50;
        border: 1px solid #34495e;
        border-radius: 4px;
        height: 8px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .skill-progress-fill {
        height: 100%;
        transition: width 0.3s ease;
      }

      .skill-xp-text {
        font-size: 10px;
        color: #95a5a6;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  updateSkillsDisplay() {
    const skills = this.skillManager.getSkills();
    const allSkills = Object.keys(skills) as Array<keyof PlayerSkills>;

    allSkills.forEach((skillKey) => {
      const skill = skills[skillKey];
      const skillEntry = this.el.querySelector(`[data-skill="${skillKey}"]`) as HTMLElement;
      
      if (skillEntry) {
        // Update level
        const levelElement = skillEntry.querySelector('.skill-level');
        if (levelElement) {
          levelElement.textContent = `Level ${skill.level}`;
        }

        // Update progress bar
        const progressFill = skillEntry.querySelector('.skill-progress-fill') as HTMLElement;
        if (progressFill) {
          const progress = this.skillManager.getProgressToNextLevel(skillKey);
          progressFill.style.width = `${progress}%`;
        }

        // Update XP text
        const xpText = skillEntry.querySelector('.skill-xp-text');
        if (xpText) {
          if (skill.level < 100) {
            const currentLevelXP = SkillManager.getXPForLevel(skill.level);
            const nextLevelXP = SkillManager.getXPForLevel(skill.level + 1);
            xpText.textContent = `${skill.xp - currentLevelXP}/${nextLevelXP - currentLevelXP} XP`;
          } else {
            xpText.textContent = 'MAX LEVEL';
          }
        }
      }
    });
  }

  refresh() {
    this.updateSkillsDisplay();
  }
} 