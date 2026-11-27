/**
 * In-App Self-Update Manager for Voice Actors (Capacitor Android)
 *
 * Checks latest.json via URL cascade, downloads updates natively or via stream,
 * validates SHA-256, and hands off to native ApkInstaller plugin.
 */

class UpdateManager {
  constructor(config = {}) {
    this.manifestUrls = config.manifestUrls || [
      'https://voxflow-809.pages.dev/latest.json',
      'https://raw.githubusercontent.com/ATMRaven/voice-actors/master/static/latest.json',
      '/latest.json'
    ];
    this.manifestUrl = this.manifestUrls[0];
    this.isChecking = false;
    this.isDownloading = false;
    this.initialized = false;
    this.unregisterBack = null;
  }

  async init() {
    if (this.initialized) return;
    const isNative = typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
    if (!isNative) return;

    this.initialized = true;

    setTimeout(() => {
      this.checkForUpdates({ silent: true }).catch(err => console.warn('[UpdateManager] Launch check note:', err));
    }, 2000);

    const App = window.Capacitor?.Plugins?.App;
    if (App && typeof App.addListener === 'function') {
      try {
        App.addListener('appStateChange', state => {
          if (state && state.isActive) {
            this.checkForUpdates({ silent: true }).catch(() => {});
          }
        });
      } catch (e) {
        console.warn('[UpdateManager] Could not register appStateChange listener:', e);
      }
    }
  }

  notifyUser(msg, isError = false) {
    if (window.__VOX_BRIDGE && typeof window.__VOX_BRIDGE.showToast === 'function') {
      window.__VOX_BRIDGE.showToast(msg, isError ? 'error' : 'info', 3600);
    } else {
      alert(msg);
    }
  }

  async fetchManifest() {
    const errors = [];
    for (const url of this.manifestUrls) {
      try {
        const cacheBustUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
        const res = await fetch(cacheBustUrl, { cache: 'no-store' });
        if (!res.ok) {
          errors.push(`${url} -> HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        const vCode = typeof data.versionCode === 'number' ? data.versionCode : parseInt(data.versionCode, 10);
        if (!data || isNaN(vCode)) {
          errors.push(`${url} -> invalid manifest schema`);
          continue;
        }
        this.manifestUrl = url;
        return data;
      } catch (e) {
        errors.push(`${url} -> ${e && e.message ? e.message : String(e)}`);
      }
    }
    throw new Error('No update manifest reachable: ' + errors.join('; '));
  }

  async checkForUpdates(options = {}) {
    const isNative = typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
    if (!isNative) return { hasUpdate: false };

    if (this.isChecking) return { hasUpdate: false };
    this.isChecking = true;

    try {
      const App = window.Capacitor?.Plugins?.App;
      const appInfo = App ? await App.getInfo() : { build: '10105', version: '1.1.5' };
      const currentCode = parseInt(appInfo.build || '10000', 10);

      const manifest = await this.fetchManifest();
      const latestCode = parseInt(manifest.versionCode, 10);
      console.log('[UpdateManager] Current versionCode:', currentCode, 'Latest versionCode:', latestCode, 'from:', this.manifestUrl);

      if (latestCode > currentCode) {
        this.showUpdateDialog(manifest);
        return { hasUpdate: true, manifest };
      } else {
        if (!options.silent) {
          this.notifyUser(`You are up to date (v${appInfo.version || manifest.versionName || manifest.version})`);
        }
        return { hasUpdate: false };
      }
    } catch (err) {
      console.warn('[UpdateManager] Check failed:', err);
      if (!options.silent) {
        this.notifyUser('Could not check for updates. Check your connection.', true);
      }
      return { hasUpdate: false, error: err.message };
    } finally {
      this.isChecking = false;
    }
  }

  showUpdateDialog(manifest) {
    const existing = document.getElementById('native-update-dialog');
    if (existing) existing.remove();
    if (this.unregisterBack) { this.unregisterBack(); this.unregisterBack = null; }

    const dialog = document.createElement('div');
    dialog.id = 'native-update-dialog';
    dialog.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 16, 18, 0.56);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000000; padding: 20px;
    `;

    const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const vName = esc(manifest.versionName || manifest.version || 'Latest');
    const sizeMb = manifest.sizeBytes ? (manifest.sizeBytes / (1024 * 1024)).toFixed(1) : '';
    const notesText = esc(manifest.releaseNotes || manifest.notes || 'A new update is available with UI improvements and native refinements.');

    dialog.innerHTML = `
      <div style="background: var(--bg-surface, #FCFBF8); border: 1px solid var(--border-strong, rgba(21,21,23,0.17)); border-radius: 20px; max-width: 400px; width: 100%; padding: 22px; color: var(--text-main, #151517); box-shadow: var(--shadow-lg, 0 22px 54px rgba(0,0,0,0.22));">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: var(--accent-signal-soft, rgba(212,72,36,0.12)); display: flex; align-items: center; justify-content: center; color: var(--accent-signal, #D44824); flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 600;">Update Available</h3>
            <span style="font-size: 12.5px; color: var(--text-secondary, #56534B);">Voice Actors v${vName} ${sizeMb ? `(${sizeMb} MB)` : ''}</span>
          </div>
        </div>
        <p style="font-size: 13.5px; color: var(--text-secondary, #56534B); line-height: 1.55; margin: 0 0 18px;">
          ${notesText}
        </p>
        <div id="update-error-banner" style="display: none; font-size: 12.5px; color: var(--danger, #C62828); background: var(--danger-soft, rgba(198,40,40,0.1)); padding: 10px 12px; border-radius: 10px; margin-bottom: 14px;"></div>
        <div id="update-progress-container" style="display: none; margin-bottom: 16px;">
          <div style="height: 6px; background: var(--bg-recessed, #E7E3D9); border-radius: 999px; overflow: hidden; margin-bottom: 6px;">
            <div id="update-progress-bar" style="height: 100%; width: 0%; background: var(--accent-signal, #D44824); transition: width 0.2s ease;"></div>
          </div>
          <div id="update-progress-text" style="font-size: 12px; color: var(--text-secondary, #56534B); text-align: right;">Downloading...</div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          ${manifest.mandatory ? '' : `
            <button id="btn-update-later" type="button" style="padding: 10px 16px; border-radius: 10px; background: var(--bg-recessed, #E7E3D9); border: 1px solid var(--border-subtle, rgba(21,21,23,0.1)); color: var(--text-main, #151517); font-size: 13px; font-weight: 500; cursor: pointer;">
              Later
            </button>
          `}
          <button id="btn-update-install" type="button" style="padding: 10px 20px; border-radius: 10px; background: var(--cta-bg, #151517); border: none; color: var(--cta-fg, #FCFBF8); font-size: 13px; font-weight: 600; cursor: pointer;">
            Update Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const closeDialog = () => {
      if (this.unregisterBack) { this.unregisterBack(); this.unregisterBack = null; }
      dialog.remove();
    };

    if (window.backNavigation && typeof window.backNavigation.registerHandler === 'function') {
      this.unregisterBack = window.backNavigation.registerHandler(() => {
        if (manifest.mandatory || this.isDownloading) return true;
        closeDialog();
        return true;
      }, 100);
    }

    const btnLater = dialog.querySelector('#btn-update-later');
    if (btnLater) {
      btnLater.addEventListener('click', closeDialog);
    }

    const btnInstall = dialog.querySelector('#btn-update-install');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        this.startDownload(manifest, dialog, closeDialog);
      });
    }
  }

  async startDownload(manifest, dialog, closeDialog) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const progressContainer = dialog.querySelector('#update-progress-container');
    const progressBar = dialog.querySelector('#update-progress-bar');
    const progressText = dialog.querySelector('#update-progress-text');
    const errBanner = dialog.querySelector('#update-error-banner');
    const btnInstall = dialog.querySelector('#btn-update-install');
    const btnLater = dialog.querySelector('#btn-update-later');

    if (errBanner) errBanner.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'block';
    if (btnInstall) btnInstall.style.display = 'none';
    if (btnLater) btnLater.style.display = 'none';

    try {
      progressText.textContent = 'Preparing update package...';

      const Filesystem = window.Capacitor?.Plugins?.Filesystem;
      const ApkInstaller = window.Capacitor?.Plugins?.ApkInstaller;

      if (!ApkInstaller) {
        throw new Error('Native ApkInstaller plugin not registered in runtime.');
      }

      try {
        const permCheck = await ApkInstaller.canRequestPackageInstalls();
        if (permCheck && !permCheck.value) {
          this.notifyUser('Enable "Install unknown apps" for Voice Actors, then return.');
          await ApkInstaller.openInstallPermissionSettings();
        }
      } catch (permErr) {
        console.warn('[UpdateManager] Permission pre-check note:', permErr);
      }

      const fileName = `voice-actors-update-${manifest.versionCode}.apk`;
      let apkFilePath = '';

      if (Filesystem && typeof Filesystem.downloadFile === 'function') {
        progressText.textContent = 'Downloading APK via native stream...';
        if (progressBar) progressBar.style.width = '20%';

        let progressHandle = null;
        if (typeof Filesystem.addListener === 'function') {
          try {
            progressHandle = await Filesystem.addListener('progress', (status) => {
              if (status && status.bytes && status.contentLength) {
                const percent = Math.min(100, Math.round((status.bytes / status.contentLength) * 100));
                if (progressBar) progressBar.style.width = `${percent}%`;
                if (progressText) progressText.textContent = `Downloading... ${percent}%`;
              }
            });
          } catch {}
        }

        try {
          const downloadRes = await Filesystem.downloadFile({
            url: manifest.apkUrl,
            path: fileName,
            directory: 'CACHE',
            progress: true
          });
          apkFilePath = downloadRes?.path || fileName;

          if (manifest.sha256 && typeof Filesystem.readFile === 'function') {
            progressText.textContent = 'Verifying cryptographic checksum...';
            const readRes = await Filesystem.readFile({ path: fileName, directory: 'CACHE' });
            const rawB64 = readRes && typeof readRes.data === 'string' ? readRes.data : '';
            if (rawB64) {
              const binStr = atob(rawB64);
              const bytes = new Uint8Array(binStr.length);
              for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
              const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
              const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
              if (hashHex.toLowerCase() !== manifest.sha256.toLowerCase()) {
                try { await Filesystem.deleteFile({ path: fileName, directory: 'CACHE' }); } catch {}
                throw new Error(`APK checksum mismatch. Expected ${manifest.sha256}, got ${hashHex}`);
              }
            }
          }
        } finally {
          if (progressHandle && typeof progressHandle.remove === 'function') {
            progressHandle.remove();
          }
        }
      } else {
        progressText.textContent = 'Connecting to download mirror...';
        const res = await fetch(manifest.apkUrl);
        if (!res.ok) throw new Error(`APK download failed: HTTP ${res.status}`);

        const reader = res.body.getReader();
        const contentLength = +res.headers.get('Content-Length') || manifest.sizeBytes || 0;
        let receivedLength = 0;
        const chunks = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (contentLength > 0) {
            const percent = Math.min(100, Math.round((receivedLength / contentLength) * 100));
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `Downloading... ${percent}%`;
          }
        }

        progressText.textContent = 'Saving package...';
        const combined = new Uint8Array(receivedLength);
        let pos = 0;
        for (const chunk of chunks) {
          combined.set(chunk, pos);
          pos += chunk.length;
        }

        if (manifest.sha256) {
          progressText.textContent = 'Verifying cryptographic checksum...';
          const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex.toLowerCase() !== manifest.sha256.toLowerCase()) {
            throw new Error(`APK checksum mismatch. Expected ${manifest.sha256}, got ${hashHex}`);
          }
        }

        let binary = '';
        for (let i = 0; i < combined.byteLength; i++) {
          binary += String.fromCharCode(combined[i]);
        }
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: btoa(binary),
          directory: 'CACHE'
        });
        apkFilePath = writeResult?.uri || fileName;
      }

      progressText.textContent = 'Launching Android installer...';
      if (progressBar) progressBar.style.width = '100%';

      const installRes = await ApkInstaller.installApk({ filePath: apkFilePath });
      console.log('[UpdateManager] Install intent launched:', installRes);
      setTimeout(closeDialog, 1200);
    } catch (err) {
      console.error('[UpdateManager] Download/install error:', err);
      if (errBanner) {
        errBanner.textContent = `Update failed: ${err.message}`;
        errBanner.style.display = 'block';
      }
      if (btnInstall) btnInstall.style.display = 'inline-block';
      if (btnLater) btnLater.style.display = 'inline-block';
      if (progressContainer) progressContainer.style.display = 'none';
    } finally {
      this.isDownloading = false;
    }
  }
}

export const updateManager = new UpdateManager();
if (typeof window !== 'undefined') {
  window.updateManager = updateManager;
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
    updateManager.init();
  }
}
