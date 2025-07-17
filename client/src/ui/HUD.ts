export class HUD {
  el: HTMLDivElement;
  healthBar: HTMLDivElement;
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
      </div>
      <div class="controls-help">
        <div>WASD / Arrows: Move</div>
        <div>Left Click: Move to location</div>
        <div>Right Click: Interact</div>
        <div>Tab: Toggle Inventory</div>
      </div>
    `;
    
    this.el.appendChild(this.healthBar);
    this.el.appendChild(this.resourcesPanel);
    this.el.appendChild(this.actionsPanel);
    
    document.body.appendChild(this.el);
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

  updatePerformanceStats(fps: number, memoryMB: number) {
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
} 