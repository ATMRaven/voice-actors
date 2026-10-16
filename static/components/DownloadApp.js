/**
 * DownloadApp Web Component for Voice Actors
 *
 * Implements Section 5:
 * 1. Checks Capacitor.isNativePlatform() synchronously before render to eliminate layout flash.
 * 2. In browser: Fetches latest.json for version, size, and direct APK download URL.
 *    - Android: High-visibility primary action button ("Download Android App").
 *    - Desktop: Action button + responsive QR code popover for mobile phone scanning.
 *    - iOS: Subtle informational note ("Android app available") or hidden gracefully.
 * 3. Inside native app: Replaces download banner with an "App version X · Check for updates" row in Settings.
 */

class DownloadAppElement extends HTMLElement {
  static get observedAttributes() {
    return ['manifest-url', 'variant', 'align'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.manifestData = null;
    this.isNative = this.checkIsNative();
  }

  connectedCallback() {
    this.render();
    if (!this.isNative) {
      this.fetchManifest();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  checkIsNative() {
    try {
      if (typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
        return window.Capacitor.isNativePlatform();
      }
    } catch {
      // Fallback
    }
    return false;
  }

  async fetchManifest() {
    const url = this.getAttribute('manifest-url') || './latest.json';
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        this.manifestData = await res.json();
        this.render();
      }
    } catch (e) {
      // Best-effort manifest fetch
    }
  }

  detectOS() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
    return 'desktop';
  }

  render() {
    if (!this.shadowRoot) return;

    const variant = this.getAttribute('variant') || 'banner'; // 'banner', 'button', 'settings'
    const os = this.detectOS();

    // Inside Native App: Show Settings row or nothing in banner mode
    if (this.isNative) {
      if (variant === 'settings') {
        this.renderNativeSettingsRow();
      } else {
        this.shadowRoot.innerHTML = '';
      }
      return;
    }

    // In Web Browser: Hide settings row
    if (variant === 'settings') {
      this.shadowRoot.innerHTML = '';
      return;
    }

    const apkUrl = this.manifestData?.apkUrl || 'https://github.com/ATMRaven/voice-actors/releases/latest';
    const versionName = this.manifestData?.versionName ? `v${this.manifestData.versionName}` : '';
    const sizeMb = this.manifestData?.sizeBytes ? `${(this.manifestData.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : '';
    const badgeText = [versionName, sizeMb].filter(Boolean).join(' · ');

    const styles = `
      :host {
        display: inline-block;
        font-family: inherit;
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: inherit;
      }
      .btn-download {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: #1f2021;
        color: #efbe82;
        padding: 7px 14px;
        border-radius: 9999px;
        font-size: 12.5px;
        font-weight: 500;
        text-decoration: none;
        transition: all 0.15s ease;
        border: 1px solid rgba(239, 190, 130, 0.2);
        cursor: pointer;
      }
      .btn-download:hover {
        background: #292a2b;
        border-color: rgba(239, 190, 130, 0.4);
        transform: translateY(-1px);
      }
      .badge {
        font-size: 11px;
        color: #8e929b;
        background: rgba(244, 245, 247, 0.06);
        padding: 1px 6px;
        border-radius: 4px;
      }
      .desktop-container {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .qr-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: #1f2021;
        border: 1px solid rgba(244, 245, 247, 0.1);
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        color: #8e929b;
        transition: all 0.15s ease;
      }
      .qr-trigger:hover {
        color: #f4f5f7;
        background: #292a2b;
      }
      .qr-popover {
        display: none;
        position: absolute;
        bottom: 120%;
        right: 0;
        background: #1f2021;
        padding: 14px;
        border-radius: 14px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.8);
        border: 1px solid rgba(244, 245, 247, 0.12);
        z-index: 1000;
        text-align: center;
        min-width: 170px;
      }
      .qr-popover::after {
        content: '';
        position: absolute;
        top: 100%;
        right: 12px;
        border: 6px solid transparent;
        border-top-color: #1f2021;
      }
      .qr-trigger:hover .qr-popover,
      .qr-trigger:focus-within .qr-popover {
        display: block;
      }
      .qr-img {
        width: 130px;
        height: 130px;
        display: block;
        margin: 0 auto 8px auto;
        border-radius: 8px;
        background: #ffffff;
        padding: 4px;
      }
      .qr-hint {
        font-size: 11px;
        color: #8e929b;
        font-weight: 400;
      }
      .ios-note {
        font-size: 12px;
        color: #8e929b;
      }
    `;

    const downloadIcon = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;

    const qrIcon = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    `;

    if (os === 'ios') {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <div class="ios-note">Android APK available ${badgeText ? `(${badgeText})` : ''}</div>
      `;
      return;
    }

    if (os === 'android') {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <a href="${apkUrl}" class="btn-download" target="_blank" rel="noopener">
          ${downloadIcon}
          <span>Download Android App</span>
          ${badgeText ? `<span class="badge">${badgeText}</span>` : ''}
        </a>
      `;
      return;
    }

    // Desktop
    const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(apkUrl !== '#' ? apkUrl : window.location.href)}`;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="desktop-container">
        <a href="${apkUrl}" class="btn-download" target="_blank" rel="noopener">
          ${downloadIcon}
          <span>Download Android APK</span>
          ${badgeText ? `<span class="badge">${badgeText}</span>` : ''}
        </a>
        <div class="qr-trigger" tabindex="0" role="button" aria-label="Scan QR to install on phone">
          ${qrIcon}
          <div class="qr-popover">
            <img class="qr-img" src="${qrCodeApiUrl}" alt="Scan QR Code" loading="lazy" />
            <div class="qr-hint">Scan with phone camera to install APK</div>
          </div>
        </div>
      </div>
    `;
  }

  renderNativeSettingsRow() {
    const styles = `
      .settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
        background: #1b1c1d;
        border: 1px solid rgba(244, 245, 247, 0.08);
        border-radius: 12px;
        margin-top: 12px;
        color: #f4f5f7;
      }
      .app-info {
        font-size: 13.5px;
      }
      .app-info span {
        color: #8e929b;
        font-size: 12px;
        display: block;
      }
      .btn-check-update {
        background: rgba(239, 190, 130, 0.15);
        border: 1px solid rgba(239, 190, 130, 0.3);
        color: #efbe82;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }
    `;

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <div class="settings-row">
        <div class="app-info">
          Voice Actors Native Android
          <span id="native-app-version">Version 1.0.0</span>
        </div>
        <button id="btn-trigger-check" class="btn-check-update">Check for Updates</button>
      </div>
    `;

    const btn = this.shadowRoot.querySelector('#btn-trigger-check');
    if (btn) {
      btn.addEventListener('click', () => {
        if (window.updateManager) {
          window.updateManager.checkForUpdates({ silent: false });
        }
      });
    }

    try {
      const App = window.Capacitor?.Plugins?.App;
      if (App) {
        App.getInfo().then(info => {
          const vEl = this.shadowRoot.querySelector('#native-app-version');
          if (vEl) vEl.textContent = `Version ${info.version} (Build ${info.build})`;
        });
      }
    } catch {}
  }
}

customElements.define('download-app', DownloadAppElement);
