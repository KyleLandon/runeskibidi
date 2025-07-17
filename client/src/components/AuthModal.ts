import './AuthModal.css';
import { AssetManager } from '../managers/AssetManager';

export class AuthModal {
  el: HTMLDivElement;
  mode: 'login' | 'register' = 'login';
  onAuth: (email: string, password: string, mode: 'login' | 'register') => Promise<void>;
  loading = false;
  error = '';
  assetManager: AssetManager;

  constructor(onAuth: (email: string, password: string, mode: 'login' | 'register') => Promise<void>) {
    this.onAuth = onAuth;
    this.assetManager = AssetManager.getInstance();
    this.el = document.createElement('div');
    this.el.className = 'auth-modal-overlay';
    this.el.innerHTML = this.render();
    document.body.appendChild(this.el);
    this.attachEvents();
    this.hide();
  }

  render() {
    return `
      <div class="auth-modal">
        <h2>${this.mode === 'login' ? 'Login' : 'Register'}</h2>
        <form>
          <input type="email" name="email" placeholder="Email" required autocomplete="username" />
          <input type="password" name="password" placeholder="Password" required autocomplete="current-password" />
          <button type="submit" ${this.loading ? 'disabled' : ''}>${this.loading ? 'Loading...' : (this.mode === 'login' ? 'Login' : 'Register')}</button>
        </form>
        <div class="auth-error">${this.error ? this.error : ''}</div>
        <div class="auth-toggle">
          ${this.mode === 'login' ? "Don't have an account? <a href='#' id='auth-switch'>Register</a>" : "Already have an account? <a href='#' id='auth-switch'>Login</a>"}
        </div>
      </div>
    `;
  }

  attachEvents() {
    this.el.onclick = (e) => {
      if (e.target === this.el) this.hide();
    };
    this.el.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (this.el.querySelector('input[name=email]') as HTMLInputElement).value;
      const password = (this.el.querySelector('input[name=password]') as HTMLInputElement).value;
      this.setLoading(true);
      this.setError('');
      try {
        await this.onAuth(email, password, this.mode);
      } catch (err: any) {
        this.setError(err.message || 'Authentication failed');
      }
      this.setLoading(false);
    });
    this.el.querySelector('#auth-switch')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.mode = this.mode === 'login' ? 'register' : 'login';
      this.update();
    });
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