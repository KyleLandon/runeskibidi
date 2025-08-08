import './AuthModal.css';
import { AuthManager } from '../managers/AuthManager';

type Mode = 'login' | 'register';

export type CharacterSummary = {
  id: string;
  name: string;
  level?: number;
  is_hardcore?: boolean;
  hair_color?: string;
  skin_color?: string;
  shirt_color?: string;
  pants_color?: string;
  created_at?: string;
};

export class AccountFlow {
  private container: HTMLDivElement;
  private auth: AuthManager;
  private mode: Mode = 'login';
  private step: 'auth' | 'select' | 'create' = 'auth';
  private error = '';
  private loading = false;
  private onSelect: (character: CharacterSummary) => Promise<void> | void;
  private characters: CharacterSummary[] = [];

  // Create form state (minimal to keep flow fast)
  private createState = {
    name: '',
    is_hardcore: false,
    hair_color: '#8B4513',
    skin_color: '#FDBCB4',
    shirt_color: '#4169E1',
    pants_color: '#2F4F4F',
  };

  constructor(onSelect: (character: CharacterSummary) => Promise<void> | void) {
    this.onSelect = onSelect;
    this.auth = new AuthManager();
    this.container = document.createElement('div');
    this.container.className = 'auth-modal-overlay';
    document.body.appendChild(this.container);
    this.render();
    this.hide();
  }

  async start() {
    const session = await this.auth.getSession();
    if (!session) {
      this.step = 'auth';
      this.show();
      this.update();
      return;
    }
    await this.loadCharacters();
  }

  private async loadCharacters() {
    try {
      this.loading = true; this.error = '';
      this.update();
      this.characters = await this.auth.fetchCharacters();
      this.step = 'select';
      this.show();
    } catch (e: any) {
      this.error = e?.message || 'Failed to load characters';
    } finally {
      this.loading = false;
      this.update();
    }
  }

  private renderAuth() {
    return `
      <div class="auth-modal">
        <h2>${this.mode === 'login' ? 'Login' : 'Register'}</h2>
        <form data-auth-form>
          <input type="email" name="email" placeholder="Email" required autocomplete="username" />
          <input type="password" name="password" placeholder="Password" required autocomplete="current-password" />
          <button type="submit" ${this.loading ? 'disabled' : ''}>${this.loading ? 'Loading...' : (this.mode === 'login' ? 'Login' : 'Register')}</button>
        </form>
        <div class="auth-error">${this.error || ''}</div>
        <div class="auth-toggle">
          ${this.mode === 'login' ? "Don't have an account? <a href='#' data-switch>Register</a>" : "Already have an account? <a href='#' data-switch>Login</a>"}
        </div>
      </div>
    `;
  }

  private renderSelect() {
    if (this.characters.length === 0) return this.renderCreate(true);
    return `
      <div class="char-modal">
        <div class="char-modal-header">
          <h2>Choose Your Character</h2>
          <div class="char-tabs">
            <button class="tab-btn active" disabled>Select Character</button>
            <button class="tab-btn" data-step="create">Create New</button>
          </div>
        </div>
        <div class="char-list">
          ${this.characters.map(c => `
            <div class="char-card">
              <div class="char-avatar">
                <div class="char-sprite" style="background:${c.skin_color || '#FDBCB4'};">
                  <div class="char-hair" style="background:${c.hair_color || '#8B4513'};"></div>
                  <div class="char-shirt" style="background:${c.shirt_color || '#4169E1'};"></div>
                  <div class="char-pants" style="background:${c.pants_color || '#2F4F4F'};"></div>
                </div>
              </div>
              <div class="char-info">
                <h3>${c.name}</h3>
                <div class="char-details">
                  <span>Level ${c.level || 1}</span>
                  ${c.is_hardcore ? '<span class="char-hardcore">⚡ Hardcore</span>' : ''}
                </div>
              </div>
              <div class="char-actions">
                <button class="char-play-btn" data-id="${c.id}">Play</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="char-error">${this.error || ''}</div>
      </div>
    `;
  }

  private renderCreate(only = false) {
    const c = this.createState;
    return `
      <div class="char-modal">
        <div class="char-modal-header">
          <h2>Create Character</h2>
          <div class="char-tabs">
            ${only ? '' : '<button class="tab-btn" data-step="select">Select Character</button>'}
            <button class="tab-btn active" disabled>Create New</button>
          </div>
        </div>
        <form data-create-form class="char-create-form">
          <div class="form-row">
            <div class="form-group">
              <label>Name</label>
              <input name="name" maxlength="20" value="${c.name}" placeholder="Enter character name" required />
            </div>
            <label class="checkbox-label">
              <input type="checkbox" name="is_hardcore" ${c.is_hardcore ? 'checked' : ''}/> Hardcore
            </label>
          </div>
          <div class="appearance-container">
            <div class="color-control"><label>Hair</label><input type="color" name="hair_color" value="${c.hair_color}"/></div>
            <div class="color-control"><label>Skin</label><input type="color" name="skin_color" value="${c.skin_color}"/></div>
            <div class="color-control"><label>Shirt</label><input type="color" name="shirt_color" value="${c.shirt_color}"/></div>
            <div class="color-control"><label>Pants</label><input type="color" name="pants_color" value="${c.pants_color}"/></div>
            <div class="char-preview-large">
              <div class="preview-label">Preview</div>
              <div class="char-sprite-large" style="background:${c.skin_color};">
                <div class="char-hair" style="background:${c.hair_color};"></div>
                <div class="char-shirt" style="background:${c.shirt_color};"></div>
                <div class="char-pants" style="background:${c.pants_color};"></div>
              </div>
            </div>
          </div>
          <div class="form-actions">
            ${only ? '' : '<button type="button" class="btn-secondary" data-step="select">Cancel</button>'}
            <button type="submit" class="btn-primary">Create</button>
          </div>
          <div class="char-error">${this.error || ''}</div>
        </form>
      </div>
    `;
  }

  private render() {
    this.container.innerHTML = this.step === 'auth'
      ? this.renderAuth()
      : this.step === 'select'
        ? this.renderSelect()
        : this.renderCreate();
    this.attach();
  }

  private attach() {
    // Auth
    const authForm = this.container.querySelector('[data-auth-form]') as HTMLFormElement | null;
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (authForm.querySelector('input[name=email]') as HTMLInputElement).value;
        const password = (authForm.querySelector('input[name=password]') as HTMLInputElement).value;
        this.loading = true; this.error = ''; this.update();
        try {
          if (this.mode === 'login') await this.auth.login(email, password);
          else await this.auth.register(email, password);
          await this.loadCharacters();
        } catch (err: any) {
          this.error = err?.message || 'Authentication failed';
        } finally {
          this.loading = false; this.update();
        }
      });
      const switcher = this.container.querySelector('[data-switch]');
      switcher?.addEventListener('click', (e) => {
        e.preventDefault();
        this.mode = this.mode === 'login' ? 'register' : 'login';
        this.update();
      });
    }

    // Select
    this.container.querySelectorAll('.char-play-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).closest('.char-play-btn')?.getAttribute('data-id');
        const char = this.characters.find(c => c.id === id);
        if (char) {
          this.hide();
          await this.onSelect(char);
        }
      });
    });
    this.container.querySelector('[data-step="create"]')?.addEventListener('click', () => { this.step = 'create'; this.update(); });
    this.container.querySelector('[data-step="select"]')?.addEventListener('click', () => { this.step = 'select'; this.update(); });

    // Create
    const createForm = this.container.querySelector('[data-create-form]') as HTMLFormElement | null;
    if (createForm) {
      createForm.addEventListener('input', (e) => {
        const t = e.target as HTMLInputElement;
        if (!t.name) return;
        (this.createState as any)[t.name] = t.type === 'checkbox' ? t.checked : t.value;
        // live preview background
        const spr = this.container.querySelector('.char-sprite-large') as HTMLElement | null;
        if (spr) {
          spr.style.background = this.createState.skin_color;
          const set = (cls: string, val: string) => { const el = spr.querySelector(cls) as HTMLElement | null; if (el) el.style.background = val; };
          set('.char-hair', this.createState.hair_color);
          set('.char-shirt', this.createState.shirt_color);
          set('.char-pants', this.createState.pants_color);
        }
      });
      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        this.loading = true; this.error = ''; this.update();
        try {
          await this.auth.createCharacter({
            name: this.createState.name.trim(),
            is_hardcore: this.createState.is_hardcore,
            hair_color: this.createState.hair_color,
            skin_color: this.createState.skin_color,
            shirt_color: this.createState.shirt_color,
            pants_color: this.createState.pants_color,
            starting_stats: { strength: 5, dexterity: 5, intellect: 5, endurance: 5, charisma: 5, willpower: 5 },
            starting_skills: ['combat']
          } as any);
          await this.loadCharacters();
        } catch (err: any) {
          this.error = err?.message || 'Failed to create character';
        } finally {
          this.loading = false; this.update();
        }
      });
    }
  }

  private update() { this.render(); }
  show() { this.container.style.display = 'flex'; }
  hide() { this.container.style.display = 'none'; }
}


