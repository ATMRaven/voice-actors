#!/usr/bin/env node

/**
 * Release Android Script (Rule A Compliant)
 *
 * Enforces:
 * - NO local compilation or Gradle builds.
 * - Bumps semver in package.json.
 * - Creates git release commit and tag vX.Y.Z.
 * - Pushes commit and tag to GitHub.
 * - Watches the GitHub Actions CI workflow using `gh run watch`.
 * - Prints release APK download URL on completion.
 */

import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: options.silent ? 'pipe' : 'inherit', ...options });
  } catch (err) {
    if (!options.ignoreError) {
      console.error(`\x1b[31m[ERROR]\x1b[0m Command failed: ${command}`);
      process.exit(1);
    }
    return null;
  }
}

function runSilent(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] })?.trim() || '';
  } catch {
    return '';
  }
}

function bumpVersion(current, bumpType) {
  const parts = current.split('.').map(p => parseInt(p, 10));
  if (parts.length < 3 || parts.some(isNaN)) {
    throw new Error(`Current version "${current}" is not valid semver (X.Y.Z)`);
  }

  let [major, minor, patch] = parts;
  if (bumpType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (bumpType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    // default: patch
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

async function main() {
  console.log('\n\x1b[36m=== Android Release Pipeline (GitHub Actions CI) ===\x1b[0m');

  // Step 1: Pre-flight checks
  const gitStatus = runSilent('git status --porcelain');
  if (gitStatus.length > 0) {
    console.error('\x1b[31m[ERROR]\x1b[0m Working tree has uncommitted changes. Please commit or stash before releasing.');
    process.exit(1);
  }

  const ghAuth = runSilent('gh auth status');
  if (!ghAuth && !runSilent('gh api user')) {
    console.error('\x1b[31m[ERROR]\x1b[0m GitHub CLI (`gh`) is not authenticated. Please run:\n  gh auth login');
    process.exit(1);
  }

  // Step 2: Read and bump package.json version
  const pkgPath = resolve(process.cwd(), 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    console.error('\x1b[31m[ERROR]\x1b[0m Could not read package.json in current directory.');
    process.exit(1);
  }

  const rawBump = process.argv[2]?.toLowerCase() || 'patch';
  const bumpType = ['patch', 'minor', 'major'].includes(rawBump) ? rawBump : 'patch';
  const oldVersion = pkg.version || '0.0.0';
  const newVersion = bumpVersion(oldVersion, bumpType);
  const tagName = `v${newVersion}`;

  console.log(`\x1b[32m✔\x1b[0m Bumping version: \x1b[33m${oldVersion}\x1b[0m -> \x1b[32m${newVersion}\x1b[0m (${bumpType})`);

  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

  // Also update static/latest.json
  const latestJsonPath = resolve(process.cwd(), 'static/latest.json');
  try {
    const vParts = newVersion.split('.').map(p => parseInt(p, 10));
    const vCode = (vParts[0] * 10000) + (vParts[1] * 100) + vParts[2];
    const latestData = JSON.parse(readFileSync(latestJsonPath, 'utf-8'));
    latestData.version = newVersion;
    latestData.versionName = newVersion;
    latestData.versionCode = vCode;
    latestData.publishedAt = new Date().toISOString();
    writeFileSync(latestJsonPath, JSON.stringify(latestData, null, 2) + '\n', 'utf-8');
    const rootLatestJsonPath = resolve(process.cwd(), 'latest.json');
    writeFileSync(rootLatestJsonPath, JSON.stringify(latestData, null, 2) + '\n', 'utf-8');
    console.log(`\x1b[32m✔\x1b[0m Synchronized static/latest.json & root latest.json to ${newVersion} (${vCode})`);
  } catch (err) {
    console.warn('[WARN] Could not update static/latest.json:', err.message);
  }

  // Step 3: Git commit and tag
  console.log(`\x1b[32m✔\x1b[0m Creating release commit and git tag \x1b[36m${tagName}\x1b[0m...`);
  run(`git commit -am "chore(release): ${tagName}"`);
  run(`git tag ${tagName}`);

  // Step 4: Push to GitHub
  console.log('\x1b[32m✔\x1b[0m Pushing commits and tags to remote...');
  run('git push');
  run('git push --tags');

  // Step 5: Wait and watch GitHub Actions CI
  console.log('\n\x1b[36mWaiting for GitHub Actions release workflow to trigger...\x1b[0m');
  
  // Give GitHub webhook 3.5 seconds to register the run
  await new Promise(r => setTimeout(r, 3500));

  console.log(`\x1b[36mAttaching to CI run for ${tagName}...\x1b[0m\n`);
  
  const repoSlug = runSilent('gh repo view --json nameWithOwner -q .nameWithOwner');
  const runId = runSilent('gh run list -L 1 --json databaseId -q ".[0].databaseId"');
  const watchArgs = runId ? ['run', 'watch', runId] : ['run', 'watch'];
  const watchResult = spawnSync('gh', watchArgs, { stdio: 'inherit' });

  if (watchResult.status !== 0) {
    console.error('\n\x1b[31m[ERROR]\x1b[0m GitHub Actions build failed or was cancelled.');
    console.log(`Inspect logs with: \x1b[36mgh run view --log-failed\x1b[0m`);
    process.exit(1);
  }

  // Step 6: Print Release URLs
  console.log('\n\x1b[32m====================================================\x1b[0m');
  console.log(`\x1b[32m✔ Release ${tagName} successfully compiled and published on GitHub!\x1b[0m`);
  if (repoSlug) {
    console.log(`\x1b[36mGitHub Release:\x1b[0m  https://github.com/${repoSlug}/releases/tag/${tagName}`);
    console.log(`\x1b[36mLatest Manifest:\x1b[0m https://github.com/${repoSlug}/releases/latest/download/latest.json`);
    console.log(`\x1b[36mDirect APK:\x1b[0m      https://github.com/${repoSlug}/releases/latest/download/${pkg.name || 'app'}-latest.apk`);
  }
  console.log('\x1b[32m====================================================\x1b[0m\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
