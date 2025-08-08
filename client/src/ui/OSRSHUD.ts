export type OsrsPanelKey = 'stats' | 'equipment' | 'inventory' | 'skills' | 'settings' | 'magic' | 'combat';

export class OSRSHUD {
  root: HTMLDivElement;
  minimap: HTMLDivElement;
  compass: HTMLDivElement;
  orbHp: HTMLDivElement;
  orbMana: HTMLDivElement;
  orbRun: HTMLDivElement;
  perf: HTMLDivElement;
  xpDrops: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'hud-osrs';
    this.root.innerHTML = `
      <div class="hud-top-right">
        <div class="minimap">
          <div class="compass"></div>
          <div class="player-dot"></div>
          <div class="zoom">
            <button id="mm-zoomin">+</button>
            <button id="mm-zoomout">-</button>
          </div>
          <div class="orb hp" data-value="100"><span class="label">HP</span><span class="val">100</span></div>
          <div class="orb mana" data-value="100"><span class="label">MP</span><span class="val">50</span></div>
          <div class="orb run" data-value="100"><span class="label">RUN</span><span class="val">100</span></div>
        </div>
        <div class="perf">
          <span>FPS <b id="hud-fps">--</b></span>
          <span>Ping <b id="hud-ping">--</b> ms</span>
        </div>
      </div>
      <div class="hud-top-center">
        <div class="xp-drops" id="xp-drops"></div>
      </div>
      <div class="hud-bottom-right">
        <div class="side-tabs">
          <button data-panel="combat" title="Combat">⚔️</button>
          <button data-panel="skills" title="Skills">📜</button>
          <button data-panel="inventory" title="Inventory">🎒</button>
          <button data-panel="equipment" title="Equipment">🛡️</button>
          <button data-panel="magic" title="Magic">✨</button>
          <button data-panel="stats" title="Stats">📈</button>
          <button data-panel="settings" title="Settings">⚙️</button>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="chatbox">
          <div class="chat-tabs">
            <button class="active">All</button>
            <button>Game</button>
            <button>Public</button>
            <button>Private</button>
            <button>Clan</button>
            <button>Trade</button>
          </div>
          <div class="chat-log" id="chat-log"></div>
          <input id="chat-input" class="chat-input" placeholder="Press Enter to chat" maxlength="256" />
        </div>
      </div>
    `;

    this.minimap = this.root.querySelector('.minimap') as HTMLDivElement;
    this.compass = this.root.querySelector('.compass') as HTMLDivElement;
    this.orbHp = this.root.querySelector('.orb.hp') as HTMLDivElement;
    this.orbMana = this.root.querySelector('.orb.mana') as HTMLDivElement;
    this.orbRun = this.root.querySelector('.orb.run') as HTMLDivElement;
    this.perf = this.root.querySelector('.perf') as HTMLDivElement;
    this.xpDrops = this.root.querySelector('#xp-drops') as HTMLDivElement;

    document.body.appendChild(this.root);

    // Tab clicks open panels
    this.root.querySelectorAll('.side-tabs [data-panel]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = (e.currentTarget as HTMLElement).getAttribute('data-panel') as OsrsPanelKey;
        window.dispatchEvent(new CustomEvent('open-ui-panel', { detail: { panel: key } }));
      });
    });
  }

  private setOrb(orb: HTMLDivElement, percent: number, text: string) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    orb.style.setProperty('--fill', `${clamped}`);
    const val = orb.querySelector('.val') as HTMLElement | null;
    if (val) val.textContent = text;
  }

  updateHealth(current: number, max: number) {
    const pct = (current / Math.max(1, max)) * 100;
    this.setOrb(this.orbHp, pct, `${current}`);
    this.updateOrbClass(this.orbHp, pct);
  }

  updateMana(current: number, max: number) {
    const pct = (current / Math.max(1, max)) * 100;
    this.setOrb(this.orbMana, pct, `${current}`);
    this.updateOrbClass(this.orbMana, pct);
  }

  updateRunEnergy(pct: number) {
    this.setOrb(this.orbRun, pct, `${Math.round(pct)}`);
    this.updateOrbClass(this.orbRun, pct);
  }

  updatePerformanceStats(fps: number) {
    const el = document.getElementById('hud-fps');
    if (el) el.textContent = fps.toFixed(0);
  }

  updateLatency(ms: number) {
    const el = document.getElementById('hud-ping');
    if (!el) return;
    el.textContent = ms.toFixed(0);
    const n = ms;
    const color = n < 80 ? '#4ade80' : n < 140 ? '#fbbf24' : '#ef4444';
    (el as HTMLElement).style.color = color;
  }

  setCompassHeading(radians: number) {
    const deg = radians * 180 / Math.PI;
    this.compass.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
  }

  private updateOrbClass(orb: HTMLDivElement, pct: number) {
    orb.classList.remove('low', 'mid', 'pulse');
    if (pct <= 25) orb.classList.add('low');
    else if (pct <= 60) orb.classList.add('mid');
    orb.classList.add('pulse');
    setTimeout(() => orb.classList.remove('pulse'), 400);
  }

  addXPDrop(skill: string, amount: number) {
    const row = document.createElement('div');
    row.className = 'xp-row';
    row.textContent = `+${amount} ${skill}`;
    this.xpDrops.appendChild(row);
    setTimeout(() => { row.classList.add('fade'); }, 20);
    setTimeout(() => { row.remove(); }, 1500);
  }

  appendChat(from: string, text: string) {
    const log = document.getElementById('chat-log');
    if (!log) return;
    const row = document.createElement('div');
    row.className = 'chat-row';
    const t = new Date();
    const ts = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
    row.textContent = `[${ts}] ${from}: ${text}`;
    log.appendChild(row);
    (log as HTMLElement).scrollTop = (log as HTMLElement).scrollHeight;
  }
}


