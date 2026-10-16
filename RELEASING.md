# Releasing & Updates Guide

This project is configured with the **Capacitor Android** CI/CD pipeline. All builds and signing are executed remotely on **GitHub Actions**.

---

## 🚀 One-Command Release

To release a new update, run:

```bash
npm run release:android -- [patch|minor|major]
```

Example:
```bash
# Bug fixes / minor tweaks (1.0.0 -> 1.0.1)
npm run release:android -- patch

# New features (1.0.1 -> 1.1.0)
npm run release:android -- minor

# Major rewrite / breaking upgrade (1.1.0 -> 2.0.0)
npm run release:android -- major
```

### What this command does:
1. Validates that git working tree is clean.
2. Bumps `version` in `package.json`.
3. Creates a release commit and annotated git tag `vX.Y.Z`.
4. Pushes commits and tags to GitHub.
5. GitHub Actions builds the signed APK, generates `latest.json`, verifies the certificate SHA-256 fingerprint, and creates a GitHub Release.
6. The terminal automatically monitors CI progress with `gh run watch` and outputs direct download links.

---

## 🔒 GitHub Secrets & Variable Checklist

Ensure the following are configured in your repository (`Settings > Secrets and variables > Actions`):

| Type | Name | Purpose |
| :--- | :--- | :--- |
| **Secret** | `ANDROID_KEYSTORE_BASE64` | Base64-encoded release `.keystore` file |
| **Secret** | `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| **Secret** | `ANDROID_KEY_ALIAS` | Key alias (e.g. `release-key`) |
| **Secret** | `ANDROID_KEY_PASSWORD` | Key password |
| **Variable** | `ANDROID_CERT_SHA256` | Certificate SHA-256 fingerprint for verification |

---

## ⚠️ Critical Keystore Backup Notice

> [!CAUTION]
> **DO NOT LOSE YOUR RELEASE KEYSTORE OR PASSWORDS.**
> Android strictly requires that all future updates to this app be signed with the **exact same key** and **appId**. If the release keystore is lost:
> - You will **NEVER** be able to ship an automatic in-app update to existing users.
> - Users would have to manually **uninstall** the app, losing local data, before installing an APK signed with a new key.
> 
> Keep a secure offline backup of `release.keystore` in a password manager or encrypted cold storage.

---

## 📲 In-App Update Cycle

- Sideloaded installations check `latest.json` on app startup and resume.
- When an update is detected, an in-app update modal prompts the user.
- The app downloads the APK in the background with progress indication, verifies the SHA-256 hash, and invokes Android's package installer.
- Existing app state and user credentials are preserved across updates.
