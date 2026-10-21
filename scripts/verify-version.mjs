import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

console.log('[Verify] Checking project version consistency...');

// 1. static/latest.json
const latestPath = resolve(root, 'static/latest.json');
const latest = JSON.parse(readFileSync(latestPath, 'utf-8'));
if (latest.version !== '1.0.2' && latest.versionName !== '1.0.2') {
  throw new Error(`latest.json version expected '1.0.2', got '${latest.version || latest.versionName}'`);
}
if (latest.versionCode !== 10002) {
  throw new Error(`latest.json versionCode expected 10002, got ${latest.versionCode}`);
}
if (!/^[0-9a-f]{64}$/i.test(latest.sha256)) {
  throw new Error(`latest.json sha256 is invalid: ${latest.sha256}`);
}
if (!latest.sizeBytes || latest.sizeBytes < 5000000) {
  throw new Error(`latest.json sizeBytes is invalid: ${latest.sizeBytes}`);
}
console.log('✔ static/latest.json is valid (v1.0.2, versionCode 10002)');

// 2. package.json
const pkgPath = resolve(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
if (pkg.version !== '1.0.2') {
  throw new Error(`package.json version expected '1.0.2', got '${pkg.version}'`);
}
console.log('✔ package.json version is v1.0.2');

// 3. static/index.html
const htmlPath = resolve(root, 'static/index.html');
const html = readFileSync(htmlPath, 'utf-8');
if (!html.includes('id="get-app-meta">v1.0.2')) {
  throw new Error('static/index.html missing v1.0.2 in #get-app-meta');
}
if (!html.includes('id="download-version-badge">v1.0.2 Release')) {
  throw new Error('static/index.html missing v1.0.2 in #download-version-badge');
}
if (!html.includes('/releases/tag/v1.0.2')) {
  throw new Error('static/index.html missing v1.0.2 in #download-release-link');
}
if (html.includes('v1.0.0 Release') || html.includes('id="get-app-meta">v1.0.0')) {
  throw new Error('static/index.html still contains stale v1.0.0 badges');
}
console.log('✔ static/index.html static badges correctly set to v1.0.2');

// 4. static/modules/UpdateManager.js
const umPath = resolve(root, 'static/modules/UpdateManager.js');
const um = readFileSync(umPath, 'utf-8');
if (!um.includes('voxflow-809.pages.dev/latest.json')) {
  throw new Error('UpdateManager.js missing voxflow-809.pages.dev/latest.json');
}
if (um.includes('/main/latest.json')) {
  throw new Error('UpdateManager.js still references dead /main/latest.json 404 URL');
}
if (!um.includes('fetchManifest')) {
  throw new Error('UpdateManager.js missing fetchManifest cascade');
}
if (!um.includes('Filesystem.downloadFile')) {
  throw new Error('UpdateManager.js missing native Filesystem.downloadFile');
}
console.log('✔ static/modules/UpdateManager.js cascade & native downloadFile verified');

console.log('\n\x1b[32m✔ All version consistency checks passed successfully!\x1b[0m');
