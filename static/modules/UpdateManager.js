/**
 * In-App Self-Update Manager for Voice Actors (Capacitor Android)
 *
 * Checks latest.json, downloads updates within app, validates SHA-256,
 * and hands off to native ApkInstaller plugin.
 */

class UpdateManager {
  constructor(config = {}) {
    this.manifestUrl = config.manifestUrl || 'https://raw.githubusercontent.com/ATMRaven/voice-actors/main/latest.json';
    this.isChecking = false;
    this.isDownloading = false;
  }

  async init() {
    const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isNative) return;

    // Check updates silently on launch
    setTimeout(() => {
      this.checkForUpdates({ silent: true }).catch(err => console.warn('[UpdateManager] Check failed:', err));
    }, 2500);

    // Also check on resume
    const App = window.Capacitor?.Plugins?.App;
    if (App) {
      App.addListener('appStateChange', state => {
        if (state.isActive) {
          this.checkForUpdates({ silent: true }).catch(() => {});
        }
      });
    }
  }

  async checkForUpdates(options = {}) {
    const isNative = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform();
    if (!isNative) return { hasUpdate: false };

    if (this.isChecking) return { hasUpdate: false };
    this.isChecking = true;

    try {
      const App = window.Capacitor?.Plugins?.App;
      const appInfo = App ? await App.getInfo() : { build: '1', version: '1.0.0' };
      const currentCode = parseInt(appInfo.build || '1', 10);

      // Fetch latest.json with cache buster
      const cacheBustUrl = `${this.manifestUrl}?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Manifest fetch failed: HTTP ${res.status}`);

      const manifest = await res.json();
      console.log('[UpdateManager] Current code:', currentCode, 'Latest code:', manifest.versionCode);

      if (manifest.versionCode > currentCode) {
        this.showUpdateDialog(manifest);
        return { hasUpdate: true, manifest };
      } else {
        if (!options.silent) {
          alert(`You are on the latest version (v${appInfo.version}).`);
        }
        return { hasUpdate: false };
      }
    } catch (err) {
      console.error('[UpdateManager] Error checking updates:', err);
      if (!options.silent) {
        alert('Could not check for updates. Please verify your internet connection.');
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

    const sizeMb = manifest.sizeBytes ? (manifest.sizeBytes / (1024 * 1024)).toFixed(1) : '';

    dialog.innerHTML = `
      <div style="background: #1f2021; border: 1px solid rgba(244, 245, 247, 0.12); border-radius: 20px; max-width: 400px; width: 100%; padding: 24px; color: #f4f5f7; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 190, 130, 0.15); display: flex; align-items: center; justify-content: center; color: #efbe82; font-weight: 700;">
            ↓
          </div>
          <div>
            <h3 style="margin: 0; font-size: 17px; font-weight: 600;">Update Available</h3>
            <span style="font-size: 13px; color: #8e929b;">Voice Actors v${manifest.versionName} ${sizeMb ? `(${sizeMb} MB)` : ''}</span>
          </div>
        </div>
        <p style="font-size: 14px; color: #b4b7bd; line-height: 1.5; margin-bottom: 20px;">
          ${manifest.releaseNotes || 'A new version of Voice Actors is available with enhancements and fixes.'}
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
    btnInstall.addEventListener('click', () => {
      this.startDownload(manifest, dialog);
    });
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
      progressText.textContent = 'Connecting to release server...';

      const Filesystem = window.Capacitor?.Plugins?.Filesystem;
      const ApkInstaller = window.Capacitor?.Plugins?.ApkInstaller;

      if (!Filesystem || !ApkInstaller) {
        throw new Error('Native update plugins not loaded.');
      }

      // Check install permission first
      const permCheck = await ApkInstaller.canRequestPackageInstalls();
      if (!permCheck.value) {
        alert('Please allow installing apps from this source in the next screen, then return to update.');
        await ApkInstaller.openInstallPermissionSettings();
      }

      // Download file via fetch blob
      const res = await fetch(manifest.apkUrl);
      if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);

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

      progressText.textContent = 'Verifying signature & checksum...';

      // Combine chunks into single ArrayBuffer
      const combined = new Uint8Array(receivedLength);
      let pos = 0;
      for (const chunk of chunks) {
        combined.set(chunk, pos);
        pos += chunk.length;
      }

      // Verify SHA-256 if provided
      if (manifest.sha256) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        if (hashHex.toLowerCase() !== manifest.sha256.toLowerCase()) {
          throw new Error('Integrity check failed: SHA-256 hash does not match.');
        }
        console.log('[UpdateManager] Checksum verified successfully');
      }

      progressText.textContent = 'Saving package...';

      // Convert to base64 for Capacitor Filesystem write
      let binary = '';
      const len = combined.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(combined[i]);
      }
      const base64Data = btoa(binary);

      const fileName = `update-${manifest.versionCode}.apk`;
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: 'CACHE',
      });

      progressText.textContent = 'Launching Android installer...';

      // Launch installer
      const installRes = await ApkInstaller.installApk({ filePath: writeResult.uri });
      console.log('[UpdateManager] Install intent triggered:', installRes);
      setTimeout(() => dialog.remove(), 1000);
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
}
