import { supabase } from './config/supabase.js';
import { Game } from './core/Game.js';
import { AuthManager } from './managers/AuthManager.js';
import { UIManager } from './managers/UIManager.js';

class GameApp {
  constructor() {
    this.game = null;
    this.authManager = null;
    this.uiManager = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('Initializing Runeskibidi...');

      // Initialize UI manager first
      this.uiManager = new UIManager();

      // Initialize auth manager with UI manager reference
      this.authManager = new AuthManager(this.uiManager);

      // Listen for successful authentication/player data loading
      window.addEventListener('playerDataLoaded', async (event) => {
        console.log('Player data loaded, initializing game...');
        await this.initGame();
      });

      // Set up auth state listener for sign out only
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (event === 'SIGNED_OUT') {
          this.cleanup();
          // AuthManager will handle showing auth modal
        }
      });

      this.isInitialized = true;
      console.log('App initialization complete');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize game. Please refresh the page.');
    }
  }

  async initGame() {
    try {
      console.log('Initializing game...');
      // Create new game instance
      this.game = new Game();
      await this.game.init();

      // Connect chat system between NetworkManager and UIManager
      if (this.game.networkManager && this.uiManager) {
        // Connect NetworkManager chat callback to UIManager
        this.game.networkManager.onChatMessage = (senderName, message, type) => {
          this.uiManager.addChatMessage(senderName, message, type);
        };
        // Connect UIManager send callback to NetworkManager
        this.uiManager.onSendChatMessage = (message) => {
          this.game.networkManager.sendChatMessage(message);
        };
        console.log('Chat system connected');
      }

      // Hide auth modal and show game
      this.uiManager.hideAuthModal();
      this.uiManager.showGame();
      console.log('Game initialized successfully');
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.showError('Failed to load game. Please try again.');
    }
  }

  cleanup() {
    if (this.game) {
      this.game = null;
    }
    if (this.uiManager) {
      this.uiManager.hideGame();
    }
  }

  showError(message) {
    alert(message);
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