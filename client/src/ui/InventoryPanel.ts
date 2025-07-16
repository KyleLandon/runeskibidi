export class InventoryPanel {
  el: HTMLDivElement;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'ui-inventory';
  }
  render(inventory: (string | null)[]) {
    this.el.innerHTML = '<h3>Inventory</h3><div class=\"inv-grid\">' + inventory.map((item, i) => `<div class=\"inv-slot\" data-index=\"${i}\">${item ? item : ''}</div>`).join('') + '</div>';
    // Tooltip events to be wired by UIManager
  }
} 