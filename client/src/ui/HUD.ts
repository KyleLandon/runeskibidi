export class HUD {
  el: HTMLDivElement;
  healthBar: HTMLDivElement;
  manaBar: HTMLDivElement;
  xpBar: HTMLDivElement;
  resourcesPanel: HTMLDivElement;
  actionsPanel: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'game-hud';
    
    // Health bar
    this.healthBar = document.createElement('div');
    this.healthBar.className = 'health-bar';
    this.healthBar.innerHTML = `
      <div class="health-bg">
        <div class="health-fill"></div>
        <span class="health-text">100/100</span>
      </div>
      <div class="chat-panel">
        <div class="chat-log" id="chat-log"></div>
        <input id="chat-input" class="chat-input" placeholder="Type message and press Enter" maxlength="256" />
      </div>
    `;

    // Mana bar
    this.manaBar = document.createElement('div');
    this.manaBar.className = 'mana-bar';
    this.manaBar.innerHTML = `
      <div class="mana-bg">
        <div class="mana-fill"></div>
        <span class="mana-text">50/50</span>
      </div>
    `;

    // XP bar
    this.xpBar = document.createElement('div');
    this.xpBar.className = 'xp-bar';
    this.xpBar.innerHTML = `
      <div class="xp-bg">
        <div class="xp-fill"></div>
        <span class="xp-text">XP 0%</span>
      </div>
    `;
    
    // Resources panel (wood, ore, etc.)
    this.resourcesPanel = document.createElement('div');
    this.resourcesPanel.className = 'resources-panel';
    this.resourcesPanel.innerHTML = `
      <div class="resource">
        <span class="resource-icon">🪵</span>
        <span class="resource-amount">0</span>
      </div>
      <div class="resource">
        <span class="resource-icon">🪨</span>
        <span class="resource-amount">0</span>
      </div>
      <div class="resource">
        <span class="resource-icon">💎</span>
        <span class="resource-amount">0</span>
      </div>
      <div class="resource">
        <span class="resource-icon">🫐</span>
        <span class="resource-amount">0</span>
      </div>
    `;
    
    // Actions panel (current action, controls)
    this.actionsPanel = document.createElement('div');
    this.actionsPanel.className = 'actions-panel';
    this.actionsPanel.innerHTML = `
      <div class="performance-stats">
        <div class="fps-display">FPS: <span id="fps">--</span></div>
        <div class="gpu-info">GPU: Optimized</div>
        <div class="latency-display">Ping: <span id="ping">--</span> ms</div>
      </div>
      <div class="hud-buttons">
        <button id="btn-toggle-inventory" title="Toggle Inventory (Tab)">Inventory</button>
      </div>
      <div class="controls-help">
        <div>WASD / Arrows: Move</div>
        <div>Left Click: Move to location</div>
        <div>Right Click: Interact</div>
        <div>Tab: Toggle Inventory</div>
      </div>
    `;
    
    this.el.appendChild(this.healthBar);
    this.el.appendChild(this.manaBar);
    this.el.appendChild(this.xpBar);
    this.el.appendChild(this.resourcesPanel);
    this.el.appendChild(this.actionsPanel);
    
    document.body.appendChild(this.el);

    // Bind HUD button once mounted
    setTimeout(() => {
      const btn = document.getElementById('btn-toggle-inventory');
      btn?.addEventListener('click', () => {
        const event = new CustomEvent('toggle-inventory');
        window.dispatchEvent(event);
      });
    });
  }

  updateHealth(current: number, max: number) {
    const percentage = (current / max) * 100;
    const healthFill = this.healthBar.querySelector('.health-fill') as HTMLDivElement;
    const healthText = this.healthBar.querySelector('.health-text') as HTMLSpanElement;
    
    if (healthFill) {
      healthFill.style.width = `${percentage}%`;
    }
    if (healthText) {
      healthText.textContent = `${current}/${max}`;
    }
  }

  updateMana(current: number, max: number) {
    const percentage = (current / max) * 100;
    const fill = this.manaBar.querySelector('.mana-fill') as HTMLDivElement;
    const text = this.manaBar.querySelector('.mana-text') as HTMLSpanElement;
    if (fill) fill.style.width = `${percentage}%`;
    if (text) text.textContent = `${current}/${max}`;
  }

  updateXP(percent: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const fill = this.xpBar.querySelector('.xp-fill') as HTMLDivElement;
    const text = this.xpBar.querySelector('.xp-text') as HTMLSpanElement;
    if (fill) fill.style.width = `${clamped}%`;
    if (text) text.textContent = `XP ${clamped}%`;
  }

  updateResources(resources: { wood?: number; ore?: number; gems?: number; berries?: number }) {
    const resourceElements = this.resourcesPanel.querySelectorAll('.resource-amount');
    if (resourceElements[0]) resourceElements[0].textContent = (resources.wood || 0).toString();
    if (resourceElements[1]) resourceElements[1].textContent = (resources.ore || 0).toString();
    if (resourceElements[2]) resourceElements[2].textContent = (resources.gems || 0).toString();
    if (resourceElements[3]) resourceElements[3].textContent = (resources.berries || 0).toString();
  }

  showAction(action: string) {
    // Add or update current action display
    let currentAction = this.actionsPanel.querySelector('.current-action') as HTMLDivElement;
    if (!currentAction) {
      currentAction = document.createElement('div');
      currentAction.className = 'current-action';
      this.actionsPanel.insertBefore(currentAction, this.actionsPanel.firstChild);
    }
    currentAction.textContent = action;
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (currentAction.textContent === action) {
        currentAction.textContent = '';
      }
    }, 3000);
  }

  hide() {
    this.el.style.display = 'none';
  }

  show() {
    this.el.style.display = 'block';
  }

  updatePerformanceStats(fps: number, _memoryMB: number) {
    const fpsElement = document.getElementById('fps');
    if (fpsElement) {
      fpsElement.textContent = fps.toFixed(1);
      
      // Color code FPS: green for 50+, yellow for 30-50, red for <30
      if (fps >= 50) {
        fpsElement.style.color = '#4ade80';
      } else if (fps >= 30) {
        fpsElement.style.color = '#fbbf24';
      } else {
        fpsElement.style.color = '#ef4444';
      }
    }
  }

  updateLatency(ms: number) {
    const el = document.getElementById('ping');
    if (!el) return;
    el.textContent = ms.toFixed(0);
    const n = ms;
    if (n < 80) {
      (el as HTMLElement).style.color = '#4ade80';
    } else if (n < 140) {
      (el as HTMLElement).style.color = '#fbbf24';
    } else {
      (el as HTMLElement).style.color = '#ef4444';
    }
  }

  appendChat(from: string, text: string) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const row = document.createElement('div');
    row.className = 'chat-row';
    row.textContent = `${from}: ${text}`;
    log.appendChild(row);
    (log as HTMLElement).scrollTop = (log as HTMLElement).scrollHeight;
  }
} 