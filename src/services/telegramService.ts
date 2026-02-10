
// ═══ Telegram Mini App (TWA) Service ═══
// Bot: @krauzai_bot | App: SATERRA

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        version: string;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation: () => void;
        showPopup: (params: {
            title?: string;
            message: string;
            buttons?: { id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'; text?: string }[]
        }, callback?: (button_id: string) => void) => void;
        showConfirm: (message: string, callback: (confirmed: boolean) => void) => void;
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          start_param?: string;
          auth_date?: number;
          hash?: string;
          query_id?: string;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setText: (text: string) => void;
          setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: any, stored: boolean) => void) => void;
          getItem: (key: string, callback: (error: any, value: string) => void) => void;
          getItems: (keys: string[], callback: (error: any, values: Record<string, string>) => void) => void;
          removeItem: (key: string, callback?: (error: any, removed: boolean) => void) => void;
          getKeys: (callback: (error: any, keys: string[]) => void) => void;
        };
        themeParams: Record<string, string>;
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        platform: string;
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        onEvent: (event: string, callback: () => void) => void;
        offEvent: (event: string, callback: () => void) => void;
        sendData: (data: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        requestContact: (callback: (shared: boolean) => void) => void;
        isVersionAtLeast: (version: string) => boolean;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

class TelegramService {
  private webApp = window.Telegram?.WebApp;
  private _backHandlers: Array<() => void> = [];

  constructor() {
    if (this.webApp) {
      this.webApp.ready();
      try {
        this.webApp.expand();
        // Set theme colors
        this.webApp.setHeaderColor('#EFF1F5');
        this.webApp.setBackgroundColor('#EFF1F5');
        // Enable closing confirmation for unsaved data
        if (this.versionAtLeast('6.2')) {
          this.webApp.enableClosingConfirmation();
        }
      } catch (e) {
        console.error('TWA init error', e);
      }
    }
  }

  // ─── Core ────────────────────────────────────────────────────

  get isAvailable(): boolean {
    return !!this.webApp;
  }

  get isTWA(): boolean {
    return !!this.webApp?.initData;
  }

  get user(): TelegramUser | undefined {
    return this.webApp?.initDataUnsafe?.user;
  }

  get initData(): string {
    return this.webApp?.initData || '';
  }

  get startParam(): string | undefined {
    return this.webApp?.initDataUnsafe?.start_param;
  }

  get platform(): string {
    return this.webApp?.platform || 'unknown';
  }

  get version(): string {
    return this.webApp?.version || '6.0';
  }

  get colorScheme(): 'light' | 'dark' {
    return this.webApp?.colorScheme || 'light';
  }

  get viewportHeight(): number {
    return this.webApp?.viewportStableHeight || window.innerHeight;
  }

  versionAtLeast(minVersion: string): boolean {
    if (!this.webApp) return false;
    try {
      return this.webApp.isVersionAtLeast(minVersion);
    } catch {
      const [vMajor, vMinor] = this.webApp.version.split('.').map(Number);
      const [minMajor, minMinor] = minVersion.split('.').map(Number);
      if (vMajor > minMajor) return true;
      if (vMajor === minMajor && vMinor >= minMinor) return true;
      return false;
    }
  }

  // ─── Auto Auth — extract user data for login ─────────────────

  getAuthData(): { telegramId: number; name: string; username?: string; photoUrl?: string; isPremium?: boolean } | null {
    const u = this.user;
    if (!u) return null;
    return {
      telegramId: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' '),
      username: u.username,
      photoUrl: u.photo_url,
      isPremium: u.is_premium,
    };
  }

  // ─── Haptic Feedback ────────────────────────────────────────

  haptic(type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'error' | 'warning' | 'selection') {
    if (!this.webApp || !this.versionAtLeast('6.1')) return;
    try {
      switch (type) {
        case 'light': case 'medium': case 'heavy': case 'rigid': case 'soft':
          this.webApp.HapticFeedback.impactOccurred(type); break;
        case 'success': case 'error': case 'warning':
          this.webApp.HapticFeedback.notificationOccurred(type); break;
        case 'selection':
          this.webApp.HapticFeedback.selectionChanged(); break;
      }
    } catch (e) { /* silent */ }
  }

  // ─── Back Button ────────────────────────────────────────────

  showBackButton(handler: () => void) {
    if (!this.webApp?.BackButton) return;
    this._backHandlers.push(handler);
    this.webApp.BackButton.onClick(handler);
    this.webApp.BackButton.show();
  }

  hideBackButton() {
    if (!this.webApp?.BackButton) return;
    this._backHandlers.forEach(h => this.webApp!.BackButton.offClick(h));
    this._backHandlers = [];
    this.webApp.BackButton.hide();
  }

  // ─── Main Button ────────────────────────────────────────────

  showMainButton(text: string, handler: () => void, color?: string) {
    if (!this.webApp?.MainButton) return;
    this.webApp.MainButton.setParams({
      text,
      color: color || '#6C5DD3',
      text_color: '#FFFFFF',
      is_active: true,
      is_visible: true,
    });
    this.webApp.MainButton.onClick(handler);
  }

  hideMainButton() {
    if (!this.webApp?.MainButton) return;
    this.webApp.MainButton.hide();
  }

  // ─── Cloud Storage (TG-native persistence) ──────────────────

  async cloudGet(key: string): Promise<string | null> {
    if (!this.webApp?.CloudStorage || !this.versionAtLeast('6.9')) return null;
    return new Promise((resolve) => {
      this.webApp!.CloudStorage.getItem(key, (err, val) => {
        resolve(err ? null : val || null);
      });
    });
  }

  async cloudSet(key: string, value: string): Promise<boolean> {
    if (!this.webApp?.CloudStorage || !this.versionAtLeast('6.9')) return false;
    return new Promise((resolve) => {
      this.webApp!.CloudStorage.setItem(key, value, (err, stored) => {
        resolve(!err && !!stored);
      });
    });
  }

  async cloudRemove(key: string): Promise<boolean> {
    if (!this.webApp?.CloudStorage || !this.versionAtLeast('6.9')) return false;
    return new Promise((resolve) => {
      this.webApp!.CloudStorage.removeItem(key, (err, removed) => {
        resolve(!err && !!removed);
      });
    });
  }

  // ─── Popups & Alerts ────────────────────────────────────────

  showAlert(message: string, title: string = 'Info') {
    if (this.webApp && this.versionAtLeast('6.2')) {
      try {
        this.webApp.showPopup({ title, message, buttons: [{ type: 'ok' }] });
      } catch { alert(`${title}\n\n${message}`); }
    } else {
      alert(`${title}\n\n${message}`);
    }
  }

  showConfirm(message: string): Promise<boolean> {
    if (this.webApp && this.versionAtLeast('6.2')) {
      return new Promise(resolve => {
        this.webApp!.showConfirm(message, resolve);
      });
    }
    return Promise.resolve(confirm(message));
  }

  // ─── Links & Navigation ────────────────────────────────────

  openLink(url: string, tryInstantView = false) {
    if (this.webApp) {
      this.webApp.openLink(url, { try_instant_view: tryInstantView });
    } else {
      window.open(url, '_blank');
    }
  }

  openTelegramLink(url: string) {
    this.webApp?.openTelegramLink(url);
  }

  // ─── Payments ──────────────────────────────────────────────

  openInvoice(url: string): Promise<string> {
    if (!this.webApp) return Promise.reject('Not in TWA');
    return new Promise((resolve) => {
      this.webApp!.openInvoice(url, (status) => resolve(status));
    });
  }

  // ─── Theme ──────────────────────────────────────────────────

  setHeaderColor(color: string) { this.webApp?.setHeaderColor?.(color); }
  setBackgroundColor(color: string) { this.webApp?.setBackgroundColor?.(color); }

  onThemeChanged(cb: () => void) {
    this.webApp?.onEvent('themeChanged', cb);
  }

  onViewportChanged(cb: () => void) {
    this.webApp?.onEvent('viewportChanged', cb);
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  close() { this.webApp?.close(); }

  sendData(data: Record<string, any>) {
    this.webApp?.sendData(JSON.stringify(data));
  }

  requestContact(): Promise<boolean> {
    if (!this.webApp) return Promise.resolve(false);
    return new Promise(resolve => {
      this.webApp!.requestContact(resolve);
    });
  }
}

export const telegram = new TelegramService();
