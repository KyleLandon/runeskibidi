export class EquipmentPanel {
  el: HTMLDivElement;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'ui-equipment';
  }
  render(equipment: { [slot: string]: string | null }) {
    const slots = Object.keys(equipment);
    this.el.innerHTML = '<h3>Equipment</h3>' + slots.map(slot => `<div class=\"equip-slot\" data-slot=\"${slot}\">${slot}<br>${equipment[slot] ? equipment[slot] : ''}</div>`).join('');
    // Tooltip events to be wired by UIManager
  }
} 