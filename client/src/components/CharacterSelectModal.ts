import './CharacterSelectModal.css';
import { AssetManager } from '../managers/AssetManager';

export type Character = { 
  id: string; 
  name: string; 
  is_hardcore?: boolean; 
  hair_color?: string; 
  skin_color?: string; 
  shirt_color?: string; 
  pants_color?: string;
  level?: number;
  created_at?: string;
};

export type CharacterCreateOptions = {
  name: string;
  is_hardcore: boolean;
  hair_color: string;
  skin_color: string;
  shirt_color: string;
  pants_color: string;
  starting_stats: {
    strength: number;
    dexterity: number;
    intellect: number;
    endurance: number;
    charisma: number;
    willpower: number;
  };
  starting_skills: string[];
};

export class CharacterSelectModal {
  el: HTMLDivElement;
  characters: Character[] = [];
  onSelect: (character: Character) => void;
  onCreate: (opts: CharacterCreateOptions) => Promise<void>;
  onDelete: (characterId: string) => Promise<void>;
  error = '';
  loading = false;
  currentTab: 'select' | 'create' = 'select';
  deleteConfirm: { show: boolean; character: Character | null; confirmText: string } = {
    show: false,
    character: null,
    confirmText: ''
  };
  assetManager: AssetManager;
  createOpts: CharacterCreateOptions = {
    name: '',
    is_hardcore: false,
    hair_color: '#8B4513',
    skin_color: '#FDBCB4',
    shirt_color: '#4169E1',
    pants_color: '#2F4F4F',
    starting_stats: {
      strength: 5,
      dexterity: 5,
      intellect: 5,
      endurance: 5,
      charisma: 5,
      willpower: 5,
    },
    starting_skills: ['combat'],
  };
  availableStats = 20; // Total stat points to distribute
  skillCategories = {
    combat: ['Attack', 'Strength', 'Defense', 'Ranged', 'Magic'],
    gathering: ['Mining', 'Woodcutting', 'Fishing', 'Farming', 'Hunting'],
    crafting: ['Smithing', 'Carpentry', 'Cooking', 'Alchemy', 'Tailoring'],
    social: ['Persuasion', 'Deception', 'Intimidation', 'Leadership', 'Trading'],
  };

  constructor(onSelect: (character: Character) => void, onCreate: (opts: CharacterCreateOptions) => Promise<void>, onDelete: (characterId: string) => Promise<void>) {
    this.onSelect = onSelect;
    this.onCreate = onCreate;
    this.onDelete = onDelete;
    this.assetManager = AssetManager.getInstance();
    this.el = document.createElement('div');
    this.el.className = 'char-modal-overlay';
    this.el.innerHTML = this.render();
    document.body.appendChild(this.el);
    this.attachEvents();
    this.hide();
    this.updateAvailableStats();
  }

  setCharacters(chars: Character[]) {
    this.characters = chars;
    this.currentTab = chars.length > 0 ? 'select' : 'create';
    this.update();
  }

  updateAvailableStats() {
    const total = Object.values(this.createOpts.starting_stats).reduce((sum, val) => sum + val, 0);
    this.availableStats = 50 - total; // 50 total points, 30 base (5 each), 20 to distribute
  }

  updateStatDisplays() {
    // Update stat values and available points without refreshing the form
    const stats = this.createOpts.starting_stats;
    Object.keys(stats).forEach(stat => {
      const statControl = this.el.querySelector(`[data-stat="${stat}"]`)?.closest('.stat-control');
      if (statControl) {
        const valueEl = statControl.querySelector('.stat-value');
        const increaseBtn = statControl.querySelector('[data-action="increase"]') as HTMLButtonElement;
        const decreaseBtn = statControl.querySelector('[data-action="decrease"]') as HTMLButtonElement;
        
        if (valueEl) {
          valueEl.textContent = (stats as any)[stat].toString();
        }
        if (increaseBtn) {
          increaseBtn.disabled = this.availableStats <= 0;
        }
        if (decreaseBtn) {
          decreaseBtn.disabled = (stats as any)[stat] <= 1;
        }
      }
    });
    
    // Update available stats display
    const availableEl = this.el.querySelector('.points-remaining');
    if (availableEl) {
      availableEl.textContent = this.availableStats.toString();
    }
  }

  render() {
    return `
      <div class="char-modal">
        <div class="char-modal-header">
          <h2>🎮 Character Management</h2>
          <div class="char-tabs">
            ${this.characters.length > 0 ? `<button class="tab-btn ${this.currentTab === 'select' ? 'active' : ''}" data-tab="select">Select Character</button>` : ''}
            ${this.characters.length < 4 ? `<button class="tab-btn ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">Create New</button>` : ''}
          </div>
        </div>
        
        ${this.currentTab === 'select' ? this.renderCharacterList() : ''}
        ${this.currentTab === 'create' ? this.renderCharacterCreation() : ''}
        
        <div class="char-error">${this.error ? this.error : ''}</div>
      </div>
      ${this.deleteConfirm.show ? this.renderDeleteConfirmation() : ''}
    `;
  }

  renderDeleteConfirmation() {
    const char = this.deleteConfirm.character;
    if (!char) return '';

    const isValidName = this.deleteConfirm.confirmText === char.name;

    return `
      <div class="delete-confirm-overlay">
        <div class="delete-confirm-modal">
          <h3>⚠️ Delete Character</h3>
          <p>
            You are about to permanently delete <span class="delete-char-name">${char.name}</span>.
            ${char.is_hardcore ? '<br><strong>This is a Hardcore character!</strong>' : ''}
          </p>
          <p>This action cannot be undone. All progress, items, and skills will be lost forever.</p>
          <p><strong>Type the character name to confirm:</strong></p>
          <input 
            type="text" 
            class="delete-confirm-input ${!isValidName && this.deleteConfirm.confirmText ? 'invalid' : ''}" 
            placeholder="Character name"
            value="${this.deleteConfirm.confirmText}"
            data-delete-input
          />
          <div class="delete-confirm-actions">
            <button class="delete-confirm-btn cancel" data-delete-cancel>Cancel</button>
            <button class="delete-confirm-btn delete" data-delete-confirm ${!isValidName ? 'disabled' : ''}>
              Delete Forever
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderCharacterList() {
    if (this.characters.length === 0) {
      return `
        <div class="no-characters">
          <div class="empty-state">
            <h3>🌟 Welcome to Runeskibidi!</h3>
            <p>Create your first character to begin your adventure.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="char-list-container">
        <div class="char-list">
          ${this.characters.map(char => `
            <div class="char-card">
              <div class="char-avatar">
                <div class="char-sprite" style="background:${char.skin_color || '#FDBCB4'};">
                  <div class="char-hair" style="background:${char.hair_color || '#8B4513'};"></div>
                  <div class="char-shirt" style="background:${char.shirt_color || '#4169E1'};"></div>
                  <div class="char-pants" style="background:${char.pants_color || '#2F4F4F'};"></div>
                </div>
              </div>
              <div class="char-info">
                <h3>${char.name}</h3>
                <div class="char-details">
                  <span class="char-level">Level ${char.level || 1}</span>
                  ${char.is_hardcore ? '<span class="char-hardcore">⚡ Hardcore</span>' : '<span class="char-normal">🛡️ Normal</span>'}
                </div>
                <div class="char-created">Created: ${char.created_at ? new Date(char.created_at).toLocaleDateString() : 'Unknown'}</div>
              </div>
              <div class="char-actions">
                <button class="char-play-btn" data-id="${char.id}">
                  <span>⚔️</span>
                  <span>Play</span>
                </button>
              </div>
              <button class="char-delete-btn" data-id="${char.id}" data-name="${char.name}" title="Delete Character">
                <span>🗑️</span>
              </button>
            </div>
          `).join('')}
        </div>
        ${this.characters.length < 4 ? `
          <div class="char-create-hint">
            <p>💡 You can have up to 4 characters. <button class="link-btn" data-tab="create">Create another?</button></p>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderCharacterCreation() {
    const c = this.createOpts;
    const stats = c.starting_stats;

    return `
      <div class="char-creation">
        <form class="char-create-form">
          <!-- Basic Info Section -->
          <div class="creation-section">
            <h3>📝 Basic Information</h3>
            <div class="form-row">
              <div class="form-group">
                <label>Character Name</label>
                <input type="text" name="name" placeholder="Enter character name" maxlength="20" required value="${c.name}" />
              </div>
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" name="is_hardcore" ${c.is_hardcore ? 'checked' : ''}/>
                  <span class="checkmark"></span>
                  Hardcore Mode (One life only!)
                </label>
              </div>
            </div>
          </div>

          <!-- Appearance Section -->
          <div class="creation-section">
            <h3>🎨 Appearance</h3>
            <div class="appearance-container">
              <div class="appearance-controls">
                <div class="color-grid">
                  <div class="color-control">
                    <label>Hair Color</label>
                    <input type="color" name="hair_color" value="${c.hair_color}" />
                    <div class="color-presets">
                      <button type="button" class="color-preset" data-color="#8B4513" data-target="hair_color" style="background:#8B4513" title="Brown"></button>
                      <button type="button" class="color-preset" data-color="#FFD700" data-target="hair_color" style="background:#FFD700" title="Blonde"></button>
                      <button type="button" class="color-preset" data-color="#000000" data-target="hair_color" style="background:#000000" title="Black"></button>
                      <button type="button" class="color-preset" data-color="#FF6347" data-target="hair_color" style="background:#FF6347" title="Red"></button>
                    </div>
                  </div>
                  <div class="color-control">
                    <label>Skin Tone</label>
                    <input type="color" name="skin_color" value="${c.skin_color}" />
                    <div class="color-presets">
                      <button type="button" class="color-preset" data-color="#FDBCB4" data-target="skin_color" style="background:#FDBCB4" title="Light"></button>
                      <button type="button" class="color-preset" data-color="#D2B48C" data-target="skin_color" style="background:#D2B48C" title="Tan"></button>
                      <button type="button" class="color-preset" data-color="#8D5524" data-target="skin_color" style="background:#8D5524" title="Dark"></button>
                      <button type="button" class="color-preset" data-color="#F5DEB3" data-target="skin_color" style="background:#F5DEB3" title="Pale"></button>
                    </div>
                  </div>
                  <div class="color-control">
                    <label>Shirt Color</label>
                    <input type="color" name="shirt_color" value="${c.shirt_color}" />
                    <div class="color-presets">
                      <button type="button" class="color-preset" data-color="#4169E1" data-target="shirt_color" style="background:#4169E1" title="Blue"></button>
                      <button type="button" class="color-preset" data-color="#DC143C" data-target="shirt_color" style="background:#DC143C" title="Red"></button>
                      <button type="button" class="color-preset" data-color="#228B22" data-target="shirt_color" style="background:#228B22" title="Green"></button>
                      <button type="button" class="color-preset" data-color="#8A2BE2" data-target="shirt_color" style="background:#8A2BE2" title="Purple"></button>
                    </div>
                  </div>
                  <div class="color-control">
                    <label>Pants Color</label>
                    <input type="color" name="pants_color" value="${c.pants_color}" />
                    <div class="color-presets">
                      <button type="button" class="color-preset" data-color="#2F4F4F" data-target="pants_color" style="background:#2F4F4F" title="Dark Slate"></button>
                      <button type="button" class="color-preset" data-color="#8B4513" data-target="pants_color" style="background:#8B4513" title="Brown"></button>
                      <button type="button" class="color-preset" data-color="#000080" data-target="pants_color" style="background:#000080" title="Navy"></button>
                      <button type="button" class="color-preset" data-color="#556B2F" data-target="pants_color" style="background:#556B2F" title="Olive"></button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="char-preview-large">
                <div class="preview-label">Character Preview</div>
                <div class="char-sprite-large" style="background:${c.skin_color};">
                  <div class="char-hair-large" style="background:${c.hair_color};"></div>
                  <div class="char-shirt-large" style="background:${c.shirt_color};"></div>
                  <div class="char-pants-large" style="background:${c.pants_color};"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Stats Section -->
          <div class="creation-section">
            <h3>⚡ Starting Attributes</h3>
            <div class="stats-info">
              <p>Distribute your attribute points. Points remaining: <span class="points-remaining">${this.availableStats}</span></p>
            </div>
            <div class="stats-grid">
              ${Object.entries(stats).map(([stat, value]) => `
                <div class="stat-control">
                  <label>${stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
                  <div class="stat-adjuster">
                    <button type="button" class="stat-btn" data-stat="${stat}" data-action="decrease" ${value <= 1 ? 'disabled' : ''}>-</button>
                    <span class="stat-value">${value}</span>
                    <button type="button" class="stat-btn" data-stat="${stat}" data-action="increase" ${this.availableStats <= 0 ? 'disabled' : ''}>+</button>
                  </div>
                  <div class="stat-description">${this.getStatDescription(stat)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Skills Section -->
          <div class="creation-section">
            <h3>🎯 Starting Focus</h3>
            <p>Choose your character's initial focus area:</p>
            <div class="skills-grid">
              ${Object.entries(this.skillCategories).map(([category, skills]) => `
                <div class="skill-category">
                  <label class="skill-category-label">
                    <input type="radio" name="starting_focus" value="${category}" ${c.starting_skills.includes(category) ? 'checked' : ''} />
                    <div class="skill-card">
                      <h4>${this.getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                      <div class="skill-list">
                        ${skills.slice(0, 3).map(skill => `<span>${skill}</span>`).join(', ')}${skills.length > 3 ? '...' : ''}
                      </div>
                    </div>
                  </label>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" data-tab="select">Cancel</button>
            <button type="submit" class="btn-primary" ${this.loading ? 'disabled' : ''}>
              ${this.loading ? 'Creating Character...' : '✨ Create Character'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  getStatDescription(stat: string): string {
    const descriptions = {
      strength: 'Physical power and melee damage',
      dexterity: 'Agility, accuracy, and ranged combat',
      intellect: 'Magic power and learning speed',
      endurance: 'Health, stamina, and resistance',
      charisma: 'Social skills and leadership',
      willpower: 'Mental resistance and focus'
    };
    return descriptions[stat as keyof typeof descriptions] || '';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      combat: '⚔️',
      gathering: '⛏️',
      crafting: '🔨',
      social: '🗣️'
    };
    return icons[category as keyof typeof icons] || '🎯';
  }

  attachEvents() {
    // Don't hide modal when clicking outside - character selection is mandatory
    // this.el.onclick = (e) => {
    //   if (e.target === this.el) this.hide();
    // };

    // Tab switching
    this.el.querySelectorAll('.tab-btn, .link-btn, [data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).getAttribute('data-tab');
        if (tab && ['select', 'create'].includes(tab)) {
          this.currentTab = tab as 'select' | 'create';
          this.update();
        }
      });
    });

    // Character selection
    this.el.querySelectorAll('.char-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).closest('.char-play-btn')?.getAttribute('data-id');
        const char = this.characters.find(c => c.id === id);
        if (char) this.onSelect(char);
      });
    });

    // Character deletion
    this.el.querySelectorAll('.char-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLElement).closest('.char-delete-btn')?.getAttribute('data-id');
        const char = this.characters.find(c => c.id === id);
        if (char) {
          this.deleteConfirm = {
            show: true,
            character: char,
            confirmText: ''
          };
          this.update();
        }
      });
    });

    // Color presets
    this.el.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.target as HTMLElement).getAttribute('data-target');
        const color = (e.target as HTMLElement).getAttribute('data-color');
        if (target && color) {
          (this.createOpts as any)[target] = color;
          this.update();
        }
      });
    });

    // Stat adjustments
    this.el.querySelectorAll('.stat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stat = (e.target as HTMLElement).getAttribute('data-stat');
        const action = (e.target as HTMLElement).getAttribute('data-action');
        if (stat && action) {
          if (action === 'increase' && this.availableStats > 0) {
            (this.createOpts.starting_stats as any)[stat]++;
          } else if (action === 'decrease' && (this.createOpts.starting_stats as any)[stat] > 1) {
            (this.createOpts.starting_stats as any)[stat]--;
          }
          this.updateAvailableStats();
          this.updateStatDisplays();
        }
      });
    });

    // Form handling
    const form = this.el.querySelector('.char-create-form');
    if (form) {
      form.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.name === 'starting_focus') {
          this.createOpts.starting_skills = [target.value];
        } else if (target.name in this.createOpts) {
          (this.createOpts as any)[target.name] = target.type === 'checkbox' ? target.checked : target.value;
          
          // Only update the preview, not the entire form
          if (target.name === 'hair_color' || target.name === 'skin_color' || 
              target.name === 'shirt_color' || target.name === 'pants_color') {
            this.updateCharacterPreview();
          }
        }
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const opts = { ...this.createOpts };
        if (!opts.name.trim()) {
          this.setError('Character name is required');
          return;
        }
        if (opts.name.length < 3) {
          this.setError('Character name must be at least 3 characters');
          return;
        }

        this.setLoading(true);
        this.setError('');
        try {
          await this.onCreate(opts);
          // Reset form after successful creation
          this.createOpts.name = '';
          this.currentTab = 'select';
        } catch (err: any) {
          this.setError(err.message || 'Failed to create character');
        }
        this.setLoading(false);
      });
    }

    // Delete confirmation handlers
    const deleteInput = this.el.querySelector('[data-delete-input]') as HTMLInputElement;
    if (deleteInput) {
      deleteInput.addEventListener('input', (e) => {
        this.deleteConfirm.confirmText = (e.target as HTMLInputElement).value;
        this.updateDeleteConfirmation();
      });
    }

    const deleteCancelBtn = this.el.querySelector('[data-delete-cancel]');
    if (deleteCancelBtn) {
      deleteCancelBtn.addEventListener('click', () => {
        this.deleteConfirm = { show: false, character: null, confirmText: '' };
        this.update();
      });
    }

    const deleteConfirmBtn = this.el.querySelector('[data-delete-confirm]');
    if (deleteConfirmBtn) {
      deleteConfirmBtn.addEventListener('click', async () => {
        if (this.deleteConfirm.character && this.deleteConfirm.confirmText === this.deleteConfirm.character.name) {
          try {
            await this.onDelete(this.deleteConfirm.character.id);
            this.deleteConfirm = { show: false, character: null, confirmText: '' };
            // Character list will be refreshed by the parent component
            this.update(); // Refresh the UI to show updated character list
          } catch (err: any) {
            this.setError(err.message || 'Failed to delete character');
            this.deleteConfirm = { show: false, character: null, confirmText: '' };
            this.update(); // Refresh the UI to show error
          }
        }
      });
    }
  }

  setLoading(loading: boolean) {
    this.loading = loading;
    this.update();
  }

  setError(error: string) {
    this.error = error;
    this.update();
  }

  updateCharacterPreview() {
    // Update only the character preview sprite
    const previewSprite = this.el.querySelector('.char-sprite-large');
    if (previewSprite) {
      const c = this.createOpts;
      previewSprite.innerHTML = `
        <div class="char-hair" style="background: ${c.hair_color};"></div>
        <div class="char-shirt" style="background: ${c.shirt_color};"></div>
        <div class="char-pants" style="background: ${c.pants_color};"></div>
      `;
      (previewSprite as HTMLElement).style.background = c.skin_color;
    }
  }

  updateDeleteConfirmation() {
    // Update only the delete confirmation UI
    const input = this.el.querySelector('[data-delete-input]') as HTMLInputElement;
    const confirmBtn = this.el.querySelector('[data-delete-confirm]') as HTMLButtonElement;
    
    if (input && confirmBtn && this.deleteConfirm.character) {
      const isValidName = this.deleteConfirm.confirmText === this.deleteConfirm.character.name;
      
      // Update input styling
      if (this.deleteConfirm.confirmText && !isValidName) {
        input.classList.add('invalid');
      } else {
        input.classList.remove('invalid');
      }
      
      // Update button state
      confirmBtn.disabled = !isValidName;
    }
  }

  update() {
    this.el.innerHTML = this.render();
    this.attachEvents();
  }

  show() {
    this.el.style.display = 'flex';
    // Play login music during character selection
    this.assetManager.loadAllAssets().then(() => {
      this.assetManager.playMusic('login', true);
    });
  }

  hide() {
    this.el.style.display = 'none';
    // Stop login music when character selection is hidden
    this.assetManager.stopAllMusic();
  }
} 