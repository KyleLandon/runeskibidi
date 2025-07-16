export class StatsPanel {
  el: HTMLDivElement;
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'ui-stats';
  }
  render(stats: { name: string; value: number }[]) {
    this.el.innerHTML = '<h3>Stats</h3>' + stats.map(s => `<div class="stat-row"><span>${s.name}</span><span>${s.value}</span></div>`).join('');
  }
} 