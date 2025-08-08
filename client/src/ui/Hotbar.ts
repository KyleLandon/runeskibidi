export class Hotbar {
  el: HTMLDivElement;
  private slots: HTMLDivElement[] = [];
  private labels = ['Q', 'W', 'E', 'R', '1', '2', '3', '4'];

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'hotbar';
    this.render();
  }

  private render() {
    this.el.innerHTML = '';
    this.slots = [];
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = String(i);
      slot.innerHTML = `
        <div class="hotbar-key">${this.labels[i]}</div>
        <div class="hotbar-icon"></div>
      `;
      slot.addEventListener('click', () => this.activate(i));
      this.el.appendChild(slot);
      this.slots.push(slot);
    }
  }

  activate(index: number) {
    if (index < 0 || index >= this.slots.length) return;
    const slot = this.slots[index];
    slot.classList.add('active');
    setTimeout(() => slot.classList.remove('active'), 150);
    // Stub action hook – replace with real ability casting later
    console.log(`Hotbar slot ${this.labels[index]} activated`);
  }
}


