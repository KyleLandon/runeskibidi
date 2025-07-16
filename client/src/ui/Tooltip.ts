export class Tooltip {
  tooltip: HTMLDivElement;
  constructor() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'ui-tooltip';
    this.tooltip.style.display = 'none';
    document.body.appendChild(this.tooltip);
  }
  show(content: string, x: number, y: number) {
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = x + 16 + 'px';
    this.tooltip.style.top = y + 16 + 'px';
  }
  hide() {
    this.tooltip.style.display = 'none';
  }
} 