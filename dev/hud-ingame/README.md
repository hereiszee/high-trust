# In-game HUD checks

Headless Playwright scripts that drive the real game (index.html) and write screenshots to `docs/screenshots/hud-ingame/`.

    python3 -m http.server 8123 &          # from the repo root
    DPR=2 node dev/hud-ingame/hub.js       # title, hub marker, brief no/esc/go, van, drive cluster, map + keyboard fast travel
    DPR=2 node dev/hud-ingame/mission.js   # mission HUD, hit/kill, surrender no-fire, zip-tie feed, reload ring, crosshairs, crew down, result
    DPR=2 node dev/hud-ingame/pause.js     # title settings, Esc/P, every setting -> CFG + localStorage, persistence after reload, abandon, quit, finale
    node dev/hud-ingame/touch.js           # 390x844 touch: joystick, every button, drive layout, map, pause
    node dev/hud-ingame/loading.js         # title while assets stream (slowed), fonts present at first paint

Each prints its checks and `ERRS []` (console errors and page errors). Logic is stepped with `window.__ht.step`.
