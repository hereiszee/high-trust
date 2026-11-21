/* electron-builder config (docs/steam/BUILD.md). The game files ride along as extraResources -> resources/game (not in the asar,
   so 70+ MB of assets stream straight from disk). dev/ docs/ legacy/ tools/ desktop/ never ship.
   HT_FULL_ASSETS=1 also ships the source assets (assets/tex, props, people...). By default only assets/opt (the optimised variants
   the game actually loads, see docs/PERF.md) plus fonts and credits go in: every source file is covered by assets/opt/manifest.json. */
const FULL = process.env.HT_FULL_ASSETS === '1';
const game = ['index.html', 'LICENSE', 'js/**', 'css/**', 'vendor/**',
  ...(FULL ? ['assets/**', '!assets/**/*.md', 'assets/CREDITS.md'] : ['assets/opt/**', 'assets/fonts/**', 'assets/CREDITS.md', 'assets/credits/**', '!assets/opt/boot.jpg*', '!assets/opt/.cache.json']),
  '!**/.DS_Store', '!**/*.psd', '!**/*.blend'];
module.exports = {
  appId: 'com.hightrust.game', /* TODO(owner): your reverse-domain id */
  productName: 'High Trust',
  executableName: 'HighTrust',
  copyright: 'Copyright © High Trust',
  directories: { output: 'dist', buildResources: 'build' },
  files: ['main.js', 'preload.js', 'save-store.js', 'steam.js', 'package.json', 'build/icon.png', '!test/**', '!scripts/**', '!dist/**', '!steam_appid.txt', '!STEAM_APPID_README.txt'],
  extraResources: [{ from: '..', to: 'game', filter: game }],
  asar: true,
  asarUnpack: ['node_modules/steamworks.js/**'], /* native addon + libsteam_api next to it */
  electronLanguages: ['en-US'],
  compression: 'normal',
  win: { target: [{ target: 'dir', arch: ['x64'] }, { target: 'zip', arch: ['x64'] }], icon: 'build/icon.png' },
  linux: { target: [{ target: 'dir', arch: ['x64'] }, { target: 'tar.gz', arch: ['x64'] }], category: 'Game', icon: 'build/icon.png' },
  mac: { target: [{ target: 'dir', arch: ['x64', 'arm64'] }], category: 'public.app-category.action-games', icon: 'build/icon.png', identity: null },
  npmRebuild: false /* steamworks.js ships prebuilt N-API binaries for every platform */
};
