import './style.css'
import './styles/style.css'
import { AuthManager } from './managers/AuthManager';
import { AuthModal } from './components/AuthModal';
import { CharacterSelectModal, type CharacterCreateOptions } from './components/CharacterSelectModal';
import { Game3D } from './core/Game3D';
import { UIManager } from './managers/UIManager';
import { PlayerData } from './core/PlayerData';

class GameApp {
  private authManager: AuthManager;
  private authModal: AuthModal;
  private playerData: PlayerData | null = null;
  private uiManager: UIManager | null = null;

  constructor() {
    this.authManager = new AuthManager();
    this.authModal = new AuthModal(async (email, password, mode) => {
      try {
        if (mode === 'login') {
          await this.authManager.login(email, password);
        } else {
          await this.authManager.register(email, password);
        }
        this.authModal.hide();
        await this.showCharacterSelect();
      } catch (error) {
        console.error('Auth error:', error);
        // Error will be handled by AuthModal
        throw error;
      }
    });
  }

  async init() {
    try {
      console.log('Initializing Runeskibidi...');
      
      // Check for existing session
      const session = await this.authManager.getSession();
      if (!session) {
        console.log('No session found, showing auth modal');
        this.authModal.show();
      } else {
        console.log('Session found, proceeding to character select');
        await this.showCharacterSelect();
      }

      console.log('App initialization complete');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Show auth modal anyway if there's an error
      this.authModal.show();
    }
  }

  async showCharacterSelect() {
    try {
      let chars = await this.authManager.fetchCharacters();
      const charModal = new CharacterSelectModal(
        async (char) => {
          charModal.hide();
          console.log('Selected character:', char);
          await this.initGame(char);
        },
        async (opts: CharacterCreateOptions) => {
          try {
            // Validate character creation options
            this.validateCharacterOptions(opts);
            
            await this.authManager.createCharacter(opts);
            
            // Refresh character list
            chars = await this.authManager.fetchCharacters();
            charModal.setCharacters(chars);
            
            // Show success message
            console.log('Character created successfully:', opts.name);
          } catch (error) {
            console.error('Character creation error:', error);
            throw error; // Let the modal handle the error display
          }
        },
        async (characterId: string) => {
          try {
            await this.authManager.deleteCharacter(characterId);
            
            // Refresh character list
            chars = await this.authManager.fetchCharacters();
            charModal.setCharacters(chars);
            
            // Show success message
            console.log('Character deleted successfully');
          } catch (error) {
            console.error('Character deletion error:', error);
            throw error; // Let the modal handle the error display
          }
        }
      );
      charModal.setCharacters(chars);
      charModal.show();
    } catch (error) {
      console.error('Error showing character select:', error);
      this.showError('Failed to load characters. Please try again.');
    }
  }

  validateCharacterOptions(opts: CharacterCreateOptions) {
    // Validate name
    if (!opts.name || opts.name.trim().length < 3) {
      throw new Error('Character name must be at least 3 characters long');
    }
    
    if (opts.name.trim().length > 20) {
      throw new Error('Character name must be 20 characters or less');
    }
    
    // Validate name contains only allowed characters
    const nameRegex = /^[a-zA-Z0-9_\s]+$/;
    if (!nameRegex.test(opts.name.trim())) {
      throw new Error('Character name can only contain letters, numbers, spaces, and underscores');
    }
    
    // Validate stats total
    const statsTotal = Object.values(opts.starting_stats).reduce((sum, val) => sum + val, 0);
    if (statsTotal !== 50) {
      throw new Error('Starting stats must total exactly 50 points');
    }
    
    // Validate individual stat minimums
    for (const [stat, value] of Object.entries(opts.starting_stats)) {
      if (value < 1) {
        throw new Error(`${stat} must be at least 1`);
      }
      if (value > 25) {
        throw new Error(`${stat} cannot exceed 25`);
      }
    }
    
    // Validate starting skills
    if (!opts.starting_skills || opts.starting_skills.length === 0) {
      throw new Error('Must select a starting focus');
    }
    
    const validFoci = ['combat', 'gathering', 'crafting', 'social'];
    if (!validFoci.includes(opts.starting_skills[0])) {
      throw new Error('Invalid starting focus selected');
    }
  }

  async initGame(character: any) {
    try {
      console.log('Initializing game with character:', character);
      
      const container = document.getElementById('game-container');
      if (!container) {
        throw new Error('Game container not found');
      }

      // Clear any existing content
      container.innerHTML = '';
      
      // Show a brief loading message
      container.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          background: #1a1a1a;
          color: #7ecfff;
          font-family: 'Segoe UI', Arial, sans-serif;
        ">
          <div style="text-align: center;">
            <h2>🎮 Loading ${character.name}'s Adventure...</h2>
            <div style="
              width: 32px; 
              height: 32px; 
              border: 3px solid #7ecfff; 
              border-radius: 50%; 
              border-top: 3px solid transparent; 
              animation: spin 1s linear infinite;
              margin: 20px auto;
            "></div>
    </div>
  </div>
        <style>
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        </style>
      `;

      // Give the loading screen a moment to show
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Clear loading screen and initialize game
      container.innerHTML = '';
      
      // Always launch Three.js 3D
      await Game3D.create(container);
      // Create player data for UI
      this.playerData = new PlayerData();
      this.playerData.initializeFromCharacter(character);

      // Initialize UI Manager
      this.uiManager = new UIManager(this.playerData);

      // Bind HUD inventory toggle
      window.addEventListener('toggle-inventory', () => {
        if (this.uiManager) this.uiManager.toggle();
      });

      // Hotbar keybinds (QWER1234) -> stub
      document.addEventListener('keydown', (e) => {
        if (!this.uiManager) return;
        const map: Record<string, number> = {
          q: 0, w: 1, e: 2, r: 3, '1': 4, '2': 5, '3': 6, '4': 7,
          Q: 0, W: 1, E: 2, R: 3
        };
        const idx = map[e.key];
        if (idx !== undefined) {
          // @ts-ignore: hotbar is exposed on UIManager
          this.uiManager.hotbar.activate(idx);
        }
      });

      // Update UI with initial data
      if (this.uiManager && this.playerData) {
        this.updateUI();
      }

      console.log('Game initialized successfully with character:', character.name);
      
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showError('Failed to load game. Please try again.');
    }
  }

  setupControls() {
    // 3D controls handled in engine prototype for now
    // Keep only UI-level bindings in initGame()
  }

  updateUI() {
    if (!this.uiManager || !this.playerData) return;
    
    // Update stats panel
    const attributes = this.playerData.getTotalAttributes();
    const stats = [
      { name: 'Strength', value: attributes.total.strength },
      { name: 'Dexterity', value: attributes.total.dexterity },
      { name: 'Intellect', value: attributes.total.intellect },
      { name: 'Endurance', value: attributes.total.endurance },
      { name: 'Charisma', value: attributes.total.charisma },
      { name: 'Willpower', value: attributes.total.willpower },
    ];
    
    this.uiManager.renderStats(stats);
    this.uiManager.renderEquipment(this.playerData.equipment);
    this.uiManager.renderInventory(this.playerData.inventory);
  }

  showError(message: string) {
    // Create a better error display
    const container = document.getElementById('game-container');
    if (container) {
      container.innerHTML = `
        <div style="
          display: flex; 
          align-items: center; 
          justify-content: center; 
          height: 100vh; 
          background: #1a1a1a; 
          color: #ff6b6b;
          font-family: 'Segoe UI', Arial, sans-serif;
          text-align: center;
        ">
          <div style="
            background: rgba(35, 36, 43, 0.9);
            padding: 2rem;
            border-radius: 12px;
            border: 2px solid #ff6b6b;
            max-width: 400px;
          ">
            <h2 style="margin: 0 0 1rem 0;">⚠️ Error</h2>
            <p style="margin: 0 0 1rem 0;">${message}</p>
            <button onclick="location.reload()" style="
              background: #ff6b6b;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
            ">Refresh Page</button>
          </div>
        </div>
      `;
    } else {
      alert(message);
    }
  }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    app.init();
  });
} else {
  const app = new GameApp();
  app.init();
}
