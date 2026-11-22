# World audit: free roam, vehicles, traffic, people, presentation

Branch `audit/world`. Auditor only: no game code changed. Probes are in `dev/audit/world/` (each writes `<name>.out.txt` next to
itself); screenshots are in `docs/audit/world/`. Headless Chromium + SwiftShader at 1280×720 on Medium, one browser at a time, real
Playwright key/mouse events wherever the input matters (M/Tab/Enter on the map, E, H, G, W/A/S/D, Space). Frame rate on this machine is
never reported.

Run any probe with `node dev/audit/world/<name>.e2e.js` from the repo root.

## Summary

| ID | Sev | Title | Confidence |
|---|---|---|---|
| W-01 | MAJOR | Map fast travel on foot both refuses ("Get back to the minivan") and teleports you, stranding the van | CONFIRMED |
| W-02 | MAJOR | Map fast travel moves the borrowed tank into Maple Heights (any borrowed vehicle goes too) | CONFIRMED |
| W-03 | MAJOR | Traffic drives straight through people standing in the road (neighbours; crew; kids) | CONFIRMED (neighbour) |
| W-04 | MINOR | "Saved you 8 seconds…" after every fast travel, whatever the distance | CONFIRMED |
| W-05 | MINOR | Hangar 2: open doors show a black void with sky visible through the inside of the roof | LIKELY |
| W-06 | MINOR | Backdrop houses at the map edge are plain boxes with black squares for windows, 20–40 m from where you can stand | CONFIRMED |
| W-07 | MINOR | Staff Sgt. Ruiz (motor pool) has no patrol cap: a civilian neighbour model in a T-shirt, same as street neighbours | CONFIRMED |
| W-08 | MINOR | Third-person camera has no occlusion handling: a lamp post or a tree trunk can hide the dad completely | LIKELY |
| W-09 | MINOR | Range side berm renders as a flat tan wedge with hard facets | CONFIRMED (screenshot) |
| W-10 | MINOR | Mixed UK/US spelling in player text (neighbour/neighbor 39/37, tyre/tire, colour/color) in an American setting | CONFIRMED |

_Details, coverage and gaps below. (Draft: sections still being filled in as probes finish.)_
