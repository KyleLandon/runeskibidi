export class InventoryPanel {
  el: HTMLDivElement;
  private readonly TOTAL_SLOTS = 30; // 5x6 grid with larger, more usable slots
  
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'ui-inventory';
  }
  
  render(inventory: (string | null)[]) {
    // Ensure we have enough slots to fill the grid
    const fullInventory = [...inventory];
    while (fullInventory.length < this.TOTAL_SLOTS) {
      fullInventory.push(null);
    }
    
    this.el.innerHTML = `
      <h3>Inventory</h3>
      <div class="inv-grid">
        ${fullInventory.slice(0, this.TOTAL_SLOTS).map((item, i) => 
          `<div class="inv-slot" data-index="${i}">${item ? item : ''}</div>`
        ).join('')}
      </div>
    `;
    // Tooltip events to be wired by UIManager
  }
} 