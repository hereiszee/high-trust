/* electron-builder config (docs/steam/BUILD.md). The game files ride along as extraResources -> resources/game (not in the asar,
   so 70+ MB of assets stream straight from disk). dev/ docs/ legacy/ tools/ desktop/ never ship.
   HT_FULL_ASSETS=1 also ships the source assets (assets/tex, props, people...). By default only assets/opt (the optimised variants
   the game actually loads, see docs/PERF.md) plus fonts and credits go in: every source file is covered by assets/opt/manifest.json. */
const FULL = process.env.HT_FULL_ASSETS === '1';
const E = process.env;
const SIGN_MAC = !!(E.CSC_LINK || E.CSC_NAME);
const NOTARIZE_MAC = SIGN_MAC && !!((E.APPLE_ID && E.APPLE_APP_SPECIFIC_PASSWORD && E.APPLE_TEAM_ID) || (E.APPLE_API_KEY && E.APPLE_API_KEY_ID && E.APPLE_API_ISSUER));
/* Windows exe icon + version info need rcedit, which needs wine on Linux/macOS. Without wine the exe still works, with Electron's icon:
   build the release on Windows (or install wine) so HighTrust.exe gets the High Trust icon. */
const canEditExe = process.platform === 'win32' || (() => { try { require('child_process').execSync('command -v wine || command -v wine64', { stdio: 'ignore' }); return true } catch (e) { return false } })();
const game = ['index.html', 'LICENSE', 'js/**', 'css/**', 'vendor/**',
  ...(FULL ? ['assets/**', '!assets/**/*.md', 'assets/CREDITS.md'] : ['assets/opt/**', 'assets/fonts/**', 'assets/CREDITS.md', 'assets/credits/**', '!assets/opt/boot.jpg*', '!assets/opt/.cache.json']),
  '!**/.DS_Store', '!**/*.psd', '!**/*.blend'];
module.exports = {
  appId: 'com.hightrust.game', /* PLACEHOLDER (owner input, docs/steam/CHECKLIST.md "Owner inputs"): your reverse-domain id */
  productName: 'High Trust',
  executableName: 'HighTrust',
  copyright: 'Copyright © 2026 hereiszee',
  directories: { output: 'dist', buildResources: 'build' },
  files: ['main.js', 'preload.js', 'save-store.js', 'steam.js', 'package.json', 'build/icon.png', '!test/**', '!scripts/**', '!dist/**', '!steam_appid.txt', '!STEAM_APPID_README.txt'],
  extraResources: [{ from: '..', to: 'game', filter: game }],
  /* licences at the install root, next to the exe (Contents/ on macOS): third-party notices from the content audit + vendored libraries */
  extraFiles: [{ from: '../assets/credits/THIRD-PARTY-NOTICES.txt', to: 'THIRD-PARTY-NOTICES.txt' }],
  asar: true,
  asarUnpack: ['node_modules/steamworks.js/**'], /* native addon + libsteam_api next to it */
  electronLanguages: ['en-US'],
  compression: 'normal',
  win: { target: [{ target: 'dir', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }], icon: 'build/icon.png', signAndEditExecutable: canEditExe },
  linux: { target: [{ target: 'dir', arch: ['x64'] }, { target: 'tar.gz', arch: ['x64'] }], category: 'Game', icon: 'build/icon.png' },
  /* macOS: one universal (arm64 + x64) .app, as a folder for the Steam depot and a zip. Signing happens when a Developer ID
     certificate is available (CSC_LINK + CSC_KEY_PASSWORD, or CSC_NAME for a keychain identity); otherwise the app is left unsigned,
     and Gatekeeper will block it. Notarisation runs when APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID
     (or APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER) are set. See docs/steam/BUILD.md. */
  mac: {
    target: [{ target: 'dir', arch: ['universal'] }, { target: 'zip', arch: ['universal'] }],
    category: 'public.app-category.action-games', icon: 'build/icon.png', minimumSystemVersion: '12.0',
    identity: SIGN_MAC ? undefined : null, hardenedRuntime: true, gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist', entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: NOTARIZE_MAC,
    /* steamworks.js ships both darwin .node files and a universal libsteam_api.dylib: identical in both halves, leave them as they are */
    x64ArchFiles: '**/node_modules/steamworks.js/dist/osx/*',
    extendInfo: { NSHighResolutionCapable: true, LSApplicationCategoryType: 'public.app-category.action-games', GCSupportsControllerUserInteraction: true }
  },
  publish: null, /* Steam delivers updates */
  /* Electron's own licences (Electron MIT; Chromium, Node.js, V8 and their libraries): electron-builder leaves them in the output folder
     beside the exe/.app; also copy them into resources/ (Contents/Resources on macOS) so they travel inside the app and its zip.
     THIRD-PARTY-NOTICES.txt points there; dev/check-build.js checks a built dist has them. */
  afterPack: async ctx => {
    const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process'), out = ctx.appOutDir;
    const app = fs.readdirSync(out).find(f => f.endsWith('.app'));
    const res = app ? path.join(out, app, 'Contents', 'Resources') : path.join(out, 'resources');
    /* macOS output has no copy of them: take them from the Electron zip electron-builder downloaded (same files on every OS build) */
    const fromZip = f => {
      const ver = require('./package.json').devDependencies.electron, want = new RegExp('^electron-v' + ver.replace(/\./g, '\\.') + '-' + ctx.electronPlatformName + '-.*\\.zip$');
      const roots = [process.env.ELECTRON_CACHE, path.join(os.homedir(), 'Library', 'Caches', 'electron'), path.join(os.homedir(), '.cache', 'electron'), process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'electron', 'Cache')].filter(Boolean);
      const walk = (d, n) => { let r = []; try { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && want.test(e.name)) r.push(p); else if (e.isDirectory() && n > 0) r = r.concat(walk(p, n - 1)) } } catch (e) { } return r };
      for (const z of roots.flatMap(r => walk(r, 2))) { try { return execFileSync('unzip', ['-p', z, f === 'LICENSE.electron.txt' ? 'LICENSE' : f], { maxBuffer: 64 << 20 }) } catch (e) { } }
      return null;
    };
    for (const f of ['LICENSE.electron.txt', 'LICENSES.chromium.html']) {
      const src = path.join(out, f);
      if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(res, f)); continue }
      const buf = fromZip(f); if (buf && buf.length) { fs.writeFileSync(path.join(res, f), buf); if (!app) fs.writeFileSync(src, buf); continue }
      console.warn('  • afterPack: ' + f + ' not found for ' + out);
    }
  },
  /* no Developer ID: ad-hoc sign the whole bundle (arm64 code must carry at least an ad-hoc signature to run, and electron-builder 26.0
     only signs with a certificate). Gatekeeper still blocks it until it is notarised; this just lets it run on Apple Silicon after
     right-click → Open / removing the quarantine flag (docs/steam/PLAYTEST.md). */
  afterSign: async ctx => {
    if (ctx.electronPlatformName !== 'darwin' || SIGN_MAC || /-temp$/.test(ctx.appOutDir)) return;/* the per-arch halves of a universal build are merged first */
    const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
    const app = fs.readdirSync(ctx.appOutDir).find(f => f.endsWith('.app')); if (!app) return;
    const p = path.join(ctx.appOutDir, app), ent = path.join(__dirname, 'build', 'entitlements.mac.plist');
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--options', 'runtime', '--entitlements', ent, p], { stdio: 'inherit' });
    execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', p], { stdio: 'inherit' });
  },
  npmRebuild: false /* steamworks.js ships prebuilt N-API binaries for every platform */
};
