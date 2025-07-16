import './style.css'
import typescriptLogo from './typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'
import { Game } from './core/Game';
import { UIManager } from './managers/UIManager';
import { Player } from './core/Player';
import { AuthManager } from './managers/AuthManager';
import { AuthModal } from './components/AuthModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';

const container = document.getElementById('game-container') || document.body;
const game = new Game(container);

// Create placeholder player for UI
const player = game.player;
const ui = new UIManager(player);
ui.renderStats(player.stats);
ui.renderEquipment(player.equipment);
ui.renderInventory(player.inventory);

// Toggle UI with I key
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'i') {
    ui.toggle();
  }
});

const auth = new AuthManager();
const authModal = new AuthModal(async (email, password, mode) => {
  if (mode === 'login') {
    await auth.login(email, password);
  } else {
    await auth.register(email, password);
  }
  authModal.hide();
  await showCharacterSelect();
});

async function showCharacterSelect() {
  let chars = await auth.fetchCharacters();
  const charModal = new CharacterSelectModal(
    (char) => {
      charModal.hide();
      console.log('Selected character:', char);
      // TODO: Proceed to game as this character
    },
    async (opts) => {
      await auth.createCharacter(opts);
      chars = await auth.fetchCharacters();
      charModal.setCharacters(chars);
    }
  );
  charModal.setCharacters(chars);
  charModal.show();
}

(async () => {
  const session = await auth.getSession();
  if (!session) {
    authModal.show();
  } else {
    authModal.hide();
    await showCharacterSelect();
  }
})();

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
