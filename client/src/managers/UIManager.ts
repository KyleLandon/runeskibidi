import { Tooltip } from '../ui/Tooltip';
import { StatsPanel } from '../ui/StatsPanel';
import { EquipmentPanel } from '../ui/EquipmentPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { SkillsPanel } from '../ui/SkillsPanel';

export class UIManager {
  panel: HTMLDivElement;
  visible: boolean = false;
  tooltip: Tooltip;
  statsPanel: StatsPanel;
  equipmentPanel: EquipmentPanel;
  inventoryPanel: InventoryPanel;
  skillsPanel: SkillsPanel;
  player: any;

  constructor(player: any) {
    this.player = player;
    this.panel = document.createElement('div');
    this.panel.className = 'ui-panel';
    this.panel.style.display = 'none';

    this.tooltip = new Tooltip();
    this.statsPanel = new StatsPanel();
    this.equipmentPanel = new EquipmentPanel();
    this.inventoryPanel = new InventoryPanel();
    this.skillsPanel = new SkillsPanel();

    this.panel.appendChild(this.statsPanel.el);
    this.panel.appendChild(this.equipmentPanel.el);
    this.panel.appendChild(this.inventoryPanel.el);
    this.panel.appendChild(this.skillsPanel.el);
    document.body.appendChild(this.panel);
    
    // Initial render
    this.refreshUI();
  }

  show() {
    this.panel.style.display = 'flex';
    this.visible = true;
  }

  hide() {
    this.panel.style.display = 'none';
    this.visible = false;
    this.tooltip.hide();
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  refreshUI() {
    // Update all panels with current player data
    this.renderStats(this.player.stats);
    this.renderEquipment(this.player.equipment);
    this.renderInventory(this.player.inventory);
    this.skillsPanel.refresh();
  }

  renderStats(stats: { name: string; value: number }[]) {
    this.statsPanel.render(stats);
  }

  renderEquipment(equipment: { [slot: string]: string | null }) {
    this.equipmentPanel.render(equipment);
    const slots = Object.keys(equipment);
    Array.from(this.equipmentPanel.el.querySelectorAll('.equip-slot')).forEach((slotEl, idx) => {
      const slot = slots[idx];
      slotEl.addEventListener('mouseenter', (e) => {
        if (equipment[slot]) {
          this.tooltip.show(`<b>${equipment[slot]}</b><br>Item description...`, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
        }
      });
      slotEl.addEventListener('mouseleave', () => this.tooltip.hide());
      // Shift-click to unequip
      slotEl.addEventListener('click', (e) => {
        if ((e as MouseEvent).shiftKey && equipment[slot]) {
          // Find first empty inventory slot
          const invIdx = this.player.inventory.findIndex((i: any) => !i);
          if (invIdx !== -1) {
            this.player.inventory[invIdx] = equipment[slot];
            this.player.equipment[slot] = null;
            this.renderEquipment(this.player.equipment);
            this.renderInventory(this.player.inventory);
          }
        }
      });
      // Drag-and-drop support (from equipment)
      slotEl.setAttribute('draggable', 'true');
      slotEl.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', JSON.stringify({ from: 'equipment', slot }));
      });
      slotEl.addEventListener('dragover', (e) => e.preventDefault());
      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer?.getData('text/plain') || '{}');
        if (data.from === 'inventory') {
          const item = this.player.inventory[data.index];
          if (item && this.canEquip(item, slot)) {
            // Swap
            const prev = this.player.equipment[slot];
            this.player.equipment[slot] = item;
            this.player.inventory[data.index] = prev;
            this.renderEquipment(this.player.equipment);
            this.renderInventory(this.player.inventory);
          }
        }
      });
    });
  }

  renderInventory(inventory: (string | null)[]) {
    this.inventoryPanel.render(inventory);
    Array.from(this.inventoryPanel.el.querySelectorAll('.inv-slot')).forEach((slot, i) => {
      slot.addEventListener('mouseenter', (e) => {
        if (inventory[i]) {
          this.tooltip.show(`<b>${inventory[i]}</b><br>Item description...`, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
        }
      });
      slot.addEventListener('mouseleave', () => this.tooltip.hide());
      // Shift-click to equip
      slot.addEventListener('click', (e) => {
        if ((e as MouseEvent).shiftKey && inventory[i]) {
          const item = inventory[i];
          const slotName = this.getEquipSlotForItem(item);
          if (slotName && !this.player.equipment[slotName]) {
            this.player.equipment[slotName] = item;
            this.player.inventory[i] = null;
            this.renderEquipment(this.player.equipment);
            this.renderInventory(this.player.inventory);
          }
        }
      });
      // Drag-and-drop support (from inventory)
      slot.setAttribute('draggable', 'true');
      slot.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('text/plain', JSON.stringify({ from: 'inventory', index: i }));
      });
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer?.getData('text/plain') || '{}');
        if (data.from === 'inventory' && data.index !== i) {
          // Swap inventory slots
          const tmp = this.player.inventory[i];
          this.player.inventory[i] = this.player.inventory[data.index];
          this.player.inventory[data.index] = tmp;
          this.renderInventory(this.player.inventory);
        } else if (data.from === 'equipment') {
          const item = this.player.equipment[data.slot];
          if (item && !this.player.inventory[i]) {
            this.player.inventory[i] = item;
            this.player.equipment[data.slot] = null;
            this.renderEquipment(this.player.equipment);
            this.renderInventory(this.player.inventory);
          }
        }
      });
    });
  }

  // Helper: map item name to slot (placeholder logic)
  getEquipSlotForItem(item: string): string | null {
    if (item.toLowerCase().includes('helmet')) return 'head';
    if (item.toLowerCase().includes('sword')) return 'mainHand';
    if (item.toLowerCase().includes('armor')) return 'body';
    if (item.toLowerCase().includes('boots')) return 'boots';
    if (item.toLowerCase().includes('platelegs')) return 'legs';
    if (item.toLowerCase().includes('shield')) return 'offHand';
    // Add more mappings as needed
    return null;
  }
  // Helper: can this item be equipped in this slot?
  canEquip(item: string, slot: string): boolean {
    return this.getEquipSlotForItem(item) === slot;
  }
} 