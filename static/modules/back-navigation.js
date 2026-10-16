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

    // 2. Built-in overlay check (Voice Modal / Settings Modal)
    const voiceModal = document.getElementById('drawer-voices');
    if (voiceModal && (voiceModal.classList.contains('open') || !voiceModal.classList.contains('hidden') && window.getComputedStyle(voiceModal).display !== 'none')) {
      const closeBtn = document.getElementById('drawer-close-btn');
      if (closeBtn) closeBtn.click();
      else voiceModal.classList.add('hidden');
      return;
    }

    const settingsModal = document.getElementById('modal-settings');
    if (settingsModal && (!settingsModal.classList.contains('hidden') && window.getComputedStyle(settingsModal).display !== 'none')) {
      const closeSettings = document.getElementById('btn-close-settings');
      if (closeSettings) closeSettings.click();
      else settingsModal.classList.add('hidden');
      return;
    }

    // 3. Tab navigation: if not on studio, switch back to studio
    const activeTabBtn = document.querySelector('.dock-tab-btn.active, .nav-desktop-tab.active');
    const currentTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'studio';
    if (currentTab && currentTab !== 'studio') {
      const studioTabBtn = document.querySelector(`.dock-tab-btn[data-tab="studio"], .nav-desktop-tab[data-tab="studio"]`);
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
      bottom: calc(64px + env(safe-area-inset-bottom, 16px));
      left: 50%;
      transform: translateX(-50%);
      background: rgba(27, 28, 29, 0.94);
      border: 1px solid rgba(244, 245, 247, 0.12);
      color: #f4f5f7;
      padding: 10px 22px;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 500;
      letter-spacing: 0.01em;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      z-index: 999999;
      pointer-events: none;
      transition: opacity 0.2s ease, transform 0.2s ease;
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
