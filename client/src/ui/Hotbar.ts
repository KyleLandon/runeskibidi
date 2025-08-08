export class Hotbar {
  el: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private labels = ['Q', 'W', 'E', 'R', '1', '2', '3', '4'];
  private cooldownEls: HTMLDivElement[] = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'hotbar';
    this.render();
  }

  private render() {
    this.el.innerHTML = '';
    this.slots = [];
    this.cooldownEls = [];
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = String(i);
      slot.innerHTML = `
        <div class="hotbar-key">${this.labels[i]}</div>
        <div class="hotbar-icon"></div>
        <div class="hotbar-cd"></div>
      `;
      slot.addEventListener('click', () => this.activate(i));
      this.el.appendChild(slot);
      this.slots.push(slot);
      this.cooldownEls.push(slot.querySelector('.hotbar-cd') as HTMLDivElement);
    }
    window.addEventListener('ability-assigned', (e: Event) => {
      const de = e as CustomEvent<{ slotIndex: number; ability: any }>; this.refreshSlot(de.detail.slotIndex);
    });
    window.addEventListener('ability-used', (e: Event) => {
      const de = e as CustomEvent<{ slotIndex: number; ability: any }>; this.animateCooldown(de.detail.slotIndex, de.detail.ability.cooldownMs);
    });
  }

  activate(index: number) {
    if (index < 0 || index >= this.slots.length) return;
    const slot = this.slots[index];
    slot.classList.add('active');
    setTimeout(() => slot.classList.remove('active'), 150);
    // Use via AbilitySystem
    import('../systems/AbilitySystem').then(({ AbilitySystem }) => AbilitySystem.getInstance().use(index));
  }

  refreshSlot(_index: number) {
    // Placeholder: update icon when ability has an icon
    // const icon = this.slots[index].querySelector('.hotbar-icon') as HTMLDivElement;
    // Future: set background-image based on ability.icon
  }

  animateCooldown(index: number, cooldownMs: number) {
    const cdEl = this.cooldownEls[index];
    if (!cdEl) return;
    cdEl.style.transition = 'none';
    cdEl.style.height = '100%';
    cdEl.style.opacity = '0.6';
    requestAnimationFrame(() => {
      cdEl.style.transition = `height ${cooldownMs}ms linear, opacity 150ms ease`;
      cdEl.style.height = '0%';
      setTimeout(() => { cdEl.style.opacity = '0'; }, cooldownMs);
    });
  }
}


