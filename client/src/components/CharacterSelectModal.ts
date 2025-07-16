import './CharacterSelectModal.css';

export type Character = { id: string; name: string; is_hardcore?: boolean; hair_color?: string; skin_color?: string; shirt_color?: string; pants_color?: string };

export class CharacterSelectModal {
  el: HTMLDivElement;
  characters: Character[] = [];
  onSelect: (character: Character) => void;
  onCreate: (opts: { name: string; is_hardcore: boolean; hair_color: string; skin_color: string; shirt_color: string; pants_color: string }) => Promise<void>;
  error = '';
  loading = false;
  createOpts = {
    name: '',
    is_hardcore: false,
    hair_color: '#6b4a1b',
    skin_color: '#e0b97a',
    shirt_color: '#3a8dde',
    pants_color: '#23242b',
  };

  constructor(onSelect: (character: Character) => void, onCreate: (opts: { name: string; is_hardcore: boolean; hair_color: string; skin_color: string; shirt_color: string; pants_color: string }) => Promise<void>) {
    this.onSelect = onSelect;
    this.onCreate = onCreate;
    this.el = document.createElement('div');
    this.el.className = 'char-modal-overlay';
    this.el.innerHTML = this.render();
    document.body.appendChild(this.el);
    this.attachEvents();
    this.hide();
  }

  setCharacters(chars: Character[]) {
    this.characters = chars;
    this.update();
  }

  render() {
    const c = this.createOpts;
    return `
      <div class="char-modal">
        <h2>Select Character</h2>
        <div class="char-list">
          ${this.characters.map(c => `<div class='char-row'><span>${c.name}${c.is_hardcore ? ' <span class="hardcore">[Hardcore]</span>' : ''}</span><button data-id='${c.id}' class='char-select-btn'>Play</button></div>`).join('')}
        </div>
        ${this.characters.length < 4 ? `
        <form class='char-create-form'>
          <input type='text' name='charname' placeholder='Character Name' maxlength='20' required value="${c.name}" />
          <label class='hardcore-label'><input type='checkbox' name='is_hardcore' ${c.is_hardcore ? 'checked' : ''}/> Hardcore (one life)</label>
          <div class='color-row'>
            <label>Hair <input type='color' name='hair_color' value='${c.hair_color}' /></label>
            <label>Skin <input type='color' name='skin_color' value='${c.skin_color}' /></label>
            <label>Shirt <input type='color' name='shirt_color' value='${c.shirt_color}' /></label>
            <label>Pants <input type='color' name='pants_color' value='${c.pants_color}' /></label>
          </div>
          <div class='char-preview'>
            <div class='char-sprite' style='background:${c.skin_color};'>
              <div class='char-hair' style='background:${c.hair_color};'></div>
              <div class='char-shirt' style='background:${c.shirt_color};'></div>
              <div class='char-pants' style='background:${c.pants_color};'></div>
            </div>
          </div>
          <button type='submit' ${this.loading ? 'disabled' : ''}>${this.loading ? 'Creating...' : 'Create Character'}</button>
        </form>
        <div class='char-error'>${this.error ? this.error : ''}</div>
        ` : `<div class='char-full'>Max 4 characters reached.</div>`}
      </div>
    `;
  }

  attachEvents() {
    this.el.onclick = (e) => {
      if (e.target === this.el) this.hide();
    };
    this.el.querySelectorAll('.char-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.target as HTMLButtonElement).getAttribute('data-id');
        const char = this.characters.find(c => c.id === id);
        if (char) this.onSelect(char);
      });
    });
    const form = this.el.querySelector('.char-create-form');
    if (form) {
      form.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.name in this.createOpts) {
          (this.createOpts as any)[target.name] = target.type === 'checkbox' ? target.checked : target.value;
          this.update();
        }
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const opts = { ...this.createOpts };
        if (!opts.name) return;
        this.setLoading(true);
        this.setError('');
        try {
          await this.onCreate(opts);
        } catch (err: any) {
          this.setError(err.message || 'Failed to create character');
        }
        this.setLoading(false);
      });
    }
  }

  setLoading(loading: boolean) {
    this.loading = loading;
    this.update();
  }
  setError(error: string) {
    this.error = error;
    this.update();
  }
  update() {
    this.el.innerHTML = this.render();
    this.attachEvents();
  }
  show() {
    this.el.style.display = 'flex';
  }
  hide() {
    this.el.style.display = 'none';
  }
} 