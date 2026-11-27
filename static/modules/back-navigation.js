/**
 * Native Back Navigation Module for Voice Actors (Capacitor Android)
 *
 * Implements Rule B:
 * 1. Overlays first (LIFO stack): Modals, voice picker drawer, settings modal.
 * 2. Inner screen / tabs: If on transcribe/models/archive, back switches to Studio home tab.
 * 3. Home screen (Studio): Double-back within 2 seconds to exit app.
 * 4. Safe on web / browser runtimes (graceful fallback).
 */

class BackNavigationManager {
  constructor() {
    this.handlerStack = [];
    this.lastBackPressTime = 0;
    this.exitWindowMs = 2000;
    this.toastMessage = 'Press back again to exit';
    this.isBackBlocked = false;
    this.isInitialized = false;
  }

  init(options = {}) {
    const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isNative || this.isInitialized) {
      return;
    }

    if (options.exitWindowMs) this.exitWindowMs = options.exitWindowMs;
    if (options.toastMessage) this.toastMessage = options.toastMessage;

    const App = window.Capacitor?.Plugins?.App;
    if (!App) return;

    App.addListener('backButton', async () => {
      await this.handleBackButton();
    });

    this.isInitialized = true;
    console.log('[BackNavigation] Initialized native Android back button handler');
  }

  registerHandler(handler, priority = 0) {
    const id = `handler_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.handlerStack.push({ id, handler, priority });
    this.handlerStack.sort((a, b) => b.priority - a.priority);
    return () => this.unregisterHandler(id);
  }

  unregisterHandler(id) {
    const index = this.handlerStack.findIndex(item => item.id === id);
    if (index !== -1) {
      this.handlerStack.splice(index, 1);
    }
  }

  setBackBlocked(blocked) {
    this.isBackBlocked = !!blocked;
  }

  async handleBackButton() {
    if (this.isBackBlocked) return;

    // 1. Registered custom handlers (LIFO)
    while (this.handlerStack.length > 0) {
      const top = this.handlerStack.pop();
      if (!top) break;
      try {
        const handled = await top.handler();
        if (handled) return;
      } catch (err) {
        console.error('[BackNavigation] Error in handler:', err);
      }
    }

    // 2. Built-in overlay check (Command Palette / Active Modals / Voice Drawer)
    const palette = document.getElementById('command-palette');
    if (palette && !palette.hidden) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }

    if (window.__VOX_BRIDGE && typeof window.__VOX_BRIDGE.closeTopOverlay === 'function') {
      if (window.__VOX_BRIDGE.closeTopOverlay()) return;
    }

    const overlayIds = [
      'voice-drawer-backdrop',
      'settings-modal-backdrop',
      'api-modal-backdrop',
      'modal-screenshot-scan'
    ];
    for (const overlayId of overlayIds) {
      const overlay = document.getElementById(overlayId);
      if (overlay && !overlay.classList.contains('hidden') && window.getComputedStyle(overlay).display !== 'none') {
        overlay.classList.add('hidden');
        return;
      }
    }

    // 3. Tab navigation: if not on studio, switch back to studio
    const activeTabBtn = document.querySelector('.dock-tab-btn[aria-current="page"], .vx-nav__item[aria-current="page"]');
    const currentTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'studio';
    if (currentTab && currentTab !== 'studio') {
      const studioTabBtn = document.querySelector('.dock-tab-btn[data-tab="studio"], .vx-nav__item[data-tab="studio"]');
      if (studioTabBtn) {
        studioTabBtn.click();
        return;
      }
    }

    // 4. Home tab (Studio): Double-back within 2s to exit
    const now = Date.now();
    if (now - this.lastBackPressTime < this.exitWindowMs) {
      const App = window.Capacitor?.Plugins?.App;
      if (App) App.exitApp();
    } else {
      this.lastBackPressTime = now;
      this.displayExitToast(this.toastMessage);
    }
  }

  displayExitToast(message) {
    const existing = document.getElementById('native-back-exit-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'native-back-exit-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: calc(74px + env(safe-area-inset-bottom, 16px));
      left: 50%;
      transform: translateX(-50%);
      background: var(--cta-bg, #151517);
      border: 1px solid var(--border-strong, rgba(255, 255, 255, 0.14));
      color: var(--cta-fg, #FCFBF8);
      padding: 10px 22px;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: 0.01em;
      box-shadow: var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.25));
      z-index: 999999;
      pointer-events: none;
      transition: opacity 0.2s ease;
      opacity: 0;
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, this.exitWindowMs);
  }
}

export const backNavigation = new BackNavigationManager();
if (typeof window !== 'undefined') {
  window.backNavigation = backNavigation;
}
