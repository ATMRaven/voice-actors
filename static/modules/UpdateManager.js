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
  }

  async init() {
    if (this.initialized) return;
    const isNative = typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
    if (!isNative) return;

    this.initialized = true;

    // Check updates silently on launch after initial layout settles
    setTimeout(() => {
      this.checkForUpdates({ silent: true }).catch(err => console.warn('[UpdateManager] Launch check note:', err));
    }, 2000);

    // Also check when app resumes from background
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
      const appInfo = App ? await App.getInfo() : { build: '10002', version: '1.0.2' };
      const currentCode = parseInt(appInfo.build || '10000', 10);

      const manifest = await this.fetchManifest();
      const latestCode = parseInt(manifest.versionCode, 10);
      console.log('[UpdateManager] Current versionCode:', currentCode, 'Latest versionCode:', latestCode, 'from:', this.manifestUrl);

      if (latestCode > currentCode) {
        this.showUpdateDialog(manifest);
        return { hasUpdate: true, manifest };
      } else {
        if (!options.silent) {
          alert(`You are up to date! Voice Actors v${appInfo.version || manifest.versionName || manifest.version} is the latest version.`);
        }
        return { hasUpdate: false };
      }
    } catch (err) {
      console.warn('[UpdateManager] Check failed:', err);
      if (!options.silent) {
        alert('Could not verify updates. Please check your internet connection.');
      }
      return { hasUpdate: false, error: err.message };
    } finally {
      this.isChecking = false;
    }
  }

  showUpdateDialog(manifest) {
    const existing = document.getElementById('native-update-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'native-update-dialog';
    dialog.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      padding: 20px;
    `;

    const vName = manifest.versionName || manifest.version || 'Latest';
    const sizeMb = manifest.sizeBytes ? (manifest.sizeBytes / (1024 * 1024)).toFixed(1) : '';

    dialog.innerHTML = `
      <div style="background: #1f2021; border: 1px solid rgba(244, 245, 247, 0.12); border-radius: 20px; max-width: 400px; width: 100%; padding: 24px; color: #f4f5f7; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 190, 130, 0.15); display: flex; align-items: center; justify-content: center; color: #efbe82; font-weight: 700; font-size: 20px;">
            ↓
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 600;">Update Available</h3>
            <span style="font-size: 13px; color: #8e929b;">Voice Actors v${vName} ${sizeMb ? `(${sizeMb} MB)` : ''}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #b4b7bd; line-height: 1.5; margin-bottom: 20px;">
          ${manifest.releaseNotes || manifest.notes || 'A new update is available with performance improvements and features.'}
        </p>
        <div id="update-progress-container" style="display: none; margin-bottom: 18px;">
          <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
            <div id="update-progress-bar" style="height: 100%; width: 0%; background: #efbe82; transition: width 0.2s ease;"></div>
          </div>
          <div id="update-progress-text" style="font-size: 12px; color: #8e929b; text-align: right;">Downloading...</div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          ${manifest.mandatory ? '' : `
            <button id="btn-update-later" style="padding: 10px 18px; border-radius: 10px; background: transparent; border: 1px solid rgba(244, 245, 247, 0.12); color: #8e929b; font-size: 13px; font-weight: 500; cursor: pointer;">
              Later
            </button>
          `}
          <button id="btn-update-install" style="padding: 10px 22px; border-radius: 10px; background: #efbe82; border: none; color: #121315; font-size: 13px; font-weight: 600; cursor: pointer;">
            Update Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const btnLater = dialog.querySelector('#btn-update-later');
    if (btnLater) {
      btnLater.addEventListener('click', () => dialog.remove());
    }

    const btnInstall = dialog.querySelector('#btn-update-install');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => {
        this.startDownload(manifest, dialog);
      });
    }
  }

  async startDownload(manifest, dialog) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const progressContainer = dialog.querySelector('#update-progress-container');
    const progressBar = dialog.querySelector('#update-progress-bar');
    const progressText = dialog.querySelector('#update-progress-text');
    const btnInstall = dialog.querySelector('#btn-update-install');
    const btnLater = dialog.querySelector('#btn-update-later');

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

      // Check install permission first
      try {
        const permCheck = await ApkInstaller.canRequestPackageInstalls();
        if (permCheck && !permCheck.value) {
          alert('Please allow installing apps from this source on the next screen, then return to complete the update.');
          await ApkInstaller.openInstallPermissionSettings();
        }
      } catch (permErr) {
        console.warn('[UpdateManager] Permission pre-check note:', permErr);
      }

      const fileName = `voice-actors-update-${manifest.versionCode}.apk`;
      let apkFilePath = '';

      // Strategy 1: Prefer native Filesystem.downloadFile if available (bypasses WebView CORS & streams to disk)
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
        } finally {
          if (progressHandle && typeof progressHandle.remove === 'function') {
            progressHandle.remove();
          }
        }
      } else {
        // Strategy 2: Fallback to blob streaming via fetch + writeFile
        progressText.textContent = 'Connecting to download mirror...';
        const res = await fetch(manifest.apkUrl);
        if (!res.ok) throw new Error(`APK download failed: HTTP ${res.status}`);

        const reader = res.body.getReader();
        const contentLength = +res.headers.get('Content-Length') || manifest.sizeBytes || 0;
        let receivedLength = 0;
        let chunks = [];

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

        // Verify SHA-256 if provided
        if (manifest.sha256) {
          progressText.textContent = 'Verifying cryptographic checksum...';
          const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          if (hashHex.toLowerCase() !== manifest.sha256.toLowerCase()) {
            throw new Error(`APK checksum mismatch. Expected ${manifest.sha256}, got ${hashHex}`);
          }
        }

        let binary = '';
        const len = combined.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(combined[i]);
        }
        const base64Data = btoa(binary);

        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: 'CACHE'
        });
        apkFilePath = writeResult?.uri || fileName;
      }

      progressText.textContent = 'Launching Android installer...';
      if (progressBar) progressBar.style.width = '100%';

      // Hand off to Android system package installer
      const installRes = await ApkInstaller.installApk({ filePath: apkFilePath });
      console.log('[UpdateManager] Install intent launched:', installRes);
      setTimeout(() => dialog.remove(), 1200);
    } catch (err) {
      console.error('[UpdateManager] Download/install error:', err);
      alert(`Update failed: ${err.message}`);
      if (btnInstall) btnInstall.style.display = 'block';
      if (btnLater) btnLater.style.display = 'block';
      if (progressContainer) progressContainer.style.display = 'none';
    } finally {
      this.isDownloading = false;
    }
  }
}

export const updateManager = new UpdateManager();
if (typeof window !== 'undefined') {
  window.updateManager = updateManager;
  // Automatically start silent update check when running inside native Android
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
    updateManager.init();
  }
}
