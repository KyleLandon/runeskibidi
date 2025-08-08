import './style.css'
import './styles/style.css'
import { AuthManager } from './managers/AuthManager';
import { AccountFlow } from './components/AccountFlow';
import { Game3D } from './core/Game3D';
import { UIManager } from './managers/UIManager';
import { NetworkManager } from './managers/NetworkManager';
import { HUD } from './ui/HUD';
import { OSRSHUD } from './ui/OSRSHUD';
import { SkillManager } from './managers/SkillManager';
import { PlayerData } from './core/PlayerData';

class GameApp {
  private authManager: AuthManager;
  private accountFlow: AccountFlow;
  private playerData: PlayerData | null = null;
  private uiManager: UIManager | null = null;
  private hud: HUD | null = null;
  private osrsHud: OSRSHUD | null = null;
  private network: NetworkManager | null = null;

  constructor() {
    this.authManager = new AuthManager();
    this.accountFlow = new AccountFlow(async (char) => {
      await this.initGame(char);
    });
  }

  async init() {
    try {
      console.log('Initializing Runeskibidi...');
      
      // Start unified account flow (auth, select, create)
      await this.accountFlow.start();

      console.log('App initialization complete');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Fallback: start account flow UI
      this.accountFlow.start();
    }
  }

  async showCharacterSelect() {}

  validateCharacterOptions(opts: any) {
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
    const statsTotal = Object.values(opts.starting_stats as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0);
    if (statsTotal !== 50) {
      throw new Error('Starting stats must total exactly 50 points');
    }
    
    // Validate individual stat minimums
    for (const [stat, value] of Object.entries(opts.starting_stats as Record<string, number>)) {
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
      
      // Networking: latency + presence
      const wsUrl = (import.meta.env.VITE_WS_URL as string) || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:${import.meta.env.VITE_SERVER_PORT || '4000'}`;
      const apiBase = (import.meta.env.VITE_API_BASE as string) || `${location.protocol}//${location.hostname}:${import.meta.env.VITE_SERVER_PORT || '4000'}`;
      const playerId = await this.authManager.getCurrentUserId();
      const sessionId = character.id;
      const session = await this.authManager.getSession();
      const token: string | null = session?.access_token || null;
      if (playerId) {
        this.network = new NetworkManager(wsUrl, apiBase, playerId, sessionId, token);
        this.network.onLatency = (ms) => {
          this.hud?.updateLatency(ms);
          this.osrsHud?.updateLatency(ms);
        };
        this.network.onChat = (from, text) => {
          this.hud?.appendChat(from, text);
          this.osrsHud?.appendChat(from, text);
        };
        this.network.connect();
      }

      // Always launch Three.js 3D (pass network for remote players)
      const game = await Game3D.create(container, this.network);
      // Create player data for UI
      this.playerData = new PlayerData();
      this.playerData.initializeFromCharacter(character);

      // Initialize UI Manager
      this.uiManager = new UIManager(this.playerData);
      this.hud = new HUD();
      this.osrsHud = new OSRSHUD();

      // Show action feedback from engine
      window.addEventListener('game-action', (e: Event) => {
        const de = e as CustomEvent<{ type: string; text: string }>;
        this.hud?.showAction(de.detail.text);
      });

      // Reflect XP progress in HUD when skills update
      window.addEventListener('skills-updated', (e: Event) => {
        const de = e as CustomEvent<{ skill: keyof ReturnType<SkillManager['getSkills']> }>; 
        const sm = SkillManager.getInstance();
        const pct = sm.getProgressToNextLevel(de.detail.skill as any);
        this.hud?.updateXP(pct);
      });

      // Side-tab panel mapping
      const openPanel = (_panel: string) => {
        if (!this.uiManager) return;
        // For now, toggle entire UI overlay. Can refine to per-panel later.
        this.uiManager.toggle();
      };
      window.addEventListener('open-ui-panel', (e: Event) => {
        const de = e as CustomEvent<{ panel: string }>;
        openPanel(de.detail.panel);
      });

      // Hotkeys: I inventory, E equipment, K skills, Esc close
      document.addEventListener('keydown', (e) => {
        if (!this.uiManager) return;
        if (e.key === 'i' || e.key === 'I') openPanel('inventory');
        if (e.key === 'e' || e.key === 'E') openPanel('equipment');
        if (e.key === 'k' || e.key === 'K') openPanel('skills');
        if (e.key === 'Escape' && this.uiManager.visible) this.uiManager.toggle();
      });

      // Hotbar keybinds (QWER1234) -> ability system + ui animation
      document.addEventListener('keydown', (e) => {
        const map: Record<string, number> = { q: 0, w: 1, e: 2, r: 3, '1': 4, '2': 5, '3': 6, '4': 7, Q: 0, W: 1, E: 2, R: 3 };
        const idx = map[e.key];
        if (idx !== undefined) {
          // UI hotbar flash if present
          // @ts-ignore
          this.uiManager?.hotbar.activate(idx);
          // Ability system trigger
          import('./systems/AbilitySystem').then(({ AbilitySystem }) => AbilitySystem.getInstance().use(idx));
        }
      });

      

      // Update UI with initial data
      if (this.uiManager && this.playerData) {
        this.updateUI();
      }

      // Chat input handler
      setTimeout(() => {
        const input = document.getElementById('chat-input') as HTMLInputElement | null;
        if (input) {
          // Focus chat with Enter when not typing elsewhere
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (document.activeElement !== input)) {
              input.focus();
              e.preventDefault();
            } else if (e.key === 'Escape' && document.activeElement === input) {
              (document.activeElement as HTMLElement).blur();
            }
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
              const text = input.value.trim();
              this.hud?.appendChat('You', text);
              this.osrsHud?.appendChat('You', text);
              this.network?.sendChat(text);
              input.value = '';
              input.blur();
            }
          });
        }
      }, 0);

      // Update minimap compass with camera yaw every frame
      const syncCompass = () => {
        this.osrsHud?.setCompassHeading(game.getCameraYaw());
        requestAnimationFrame(syncCompass);
      };
      syncCompass();

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
