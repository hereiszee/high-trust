# Release-content pass: screenshots (2026-11-21)

Headless Chromium + SwiftShader, 1280x720. Each run logged 0 console errors and 0 HTTP errors (no missing assets).

| File | Shows |
|---|---|
| enemy-lineup-core4.jpg | the four title-loaded crew looks (hoodie, red, cap, jacket): two and two |
| enemy-lineup-pool10.jpg | the full 10-look pool, in the order the shuffle bag alternates |
| graffiti-wall-tags.jpg | wall graffiti atlas (js/world.js): BIRCH, ZOOM, WAFFLE, BLOOP |
| graffiti-riverside-tags.png | Riverside street tags (js/openworld.js grafTex): FIZZ with bubbles instead of the crowned DUKE |
| posters-maple-social-club.jpg | poster atlas: "live · Maple Social Club · Fri" (was Elks Lodge) |
| store-signs.jpg | QUICK-ISH store front built by js/buildings.js (CENT-SIBLE is the other replaced name; it sits off-frame right) |
| dadazon-laptop.png | the laptop shop screen, drawn by js/home.js drawDadazon: green/cream palette |
| dadazon-van.jpg | the Porch Light delivery van in Dadazon green (posed off-map by the fast-travel staging; the van itself is what matters) |
| ruckus-meter-block-feud.jpg | the Ruckus bar at level 5 ("Backup inbound"), replacing the five Heat pips |
| map-crew-hangouts.png | the full-map crew overlay (frMapOverlay from index.html, rendered on its own over a stand-in street grid): hatch, corner brackets, "hang out here" chips |

The in-game full map renders blank in headless runs on origin/main as well as on this branch, so the overlay was rendered standalone.
