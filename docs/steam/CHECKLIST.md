# Path to a Steam release

Facts were checked against Valve's Steamworks documentation on 2026-11-21, and the source is linked next to each one. Where Valve does not publish a figure, this document says so. Durations are realistic estimates for a solo or very small team. The section at the end shows what blocks what.

**Key corrections to common assumptions:**
- The wait after paying the app fee is **21 days**, not 30. The 30 days is the tax-verification estimate ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)).
- No official page gives a hard 300-character limit for the short description.
- Valve does not document a turnaround time for build review.

## A. Owner must do (needs the owner's legal identity, money or sign-off)

| # | Step | Detail and source | Realistic duration | Blocks |
|---|---|---|---|---|
| A1 | **Decide the code licence** | The repo `LICENSE` is CC0 (LICENCES.md B4). Decide before launch whether future builds are "all rights reserved". | 1 day | nothing technical, but decide before the store page goes live |
| A2 | **Create a Steamworks partner account** | Sign the NDA and the Steam Distribution Agreement as the legal entity (yourself or a company) ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)). If you want a company to be the seller, set it up first: changing the entity later means redoing the paperwork. | 1 hour (company formation, if wanted: days to weeks) | A3–A5 |
| A3 | **Bank details** | The account holder name must match the legal name on the partner account ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)). | 30 min | payouts |
| A4 | **Tax interview** | W-9 (US) or W-8BEN / W-8BEN-E (non-US). Treaty withholding rates apply. Valve lists verification as taking up to about 30 days ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)). | 30 min to fill in, up to about 30 days to verify | release |
| A5 | **Identity verification** | Photo ID plus verification of the business or individual ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)). | 1–3 days | release |
| A6 | **Pay the Steam Direct app fee** | **$100 per app**, not refundable. It is paid back once the game reaches $1,000 adjusted gross revenue from Store sales and in-app purchases ([appfee](https://partner.steamgames.com/doc/gettingstarted/appfee)). Paying it creates the App ID. | minutes | everything in section B that needs an App ID. **Starts the 21-day clock** |
| A7 | **21-day waiting period** | You cannot release until 21 days after paying the fee ([onboarding](https://partner.steamgames.com/doc/gettingstarted/onboarding)). Use the time for B-section work. | 21 days, fixed | release |
| A8 | **Content survey** (in Steamworks) | Three required parts: general content, which generates regional ratings; mature content; and **generative AI disclosure** ([contentsurvey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey)). Answers are in CONTENT.md. The 7 Pixel Art Atlas models are AI-generated (LICENCES.md B5): declare them or replace them first. Since 15 Nov 2024, Germany hides games without an age rating, and Valve's self-rating from this survey counts as one ([germany](https://partner.steamgames.com/doc/gettingstarted/contentsurvey/germany)). | 1–2 hours | store page review |
| A9 | **Store page sign-off** | Approve the texts in STORE.md, the tags, the languages and the controller declaration ([controller questionnaire announcement](https://store.steampowered.com/news/group/4145017/view/3684558162504860650)), the capsules, at least 5 screenshots and at least 1 trailer ([review_process](https://partner.steamgames.com/doc/store/review_process)). | 1–2 days | A10 |
| A10 | **Submit the store page for review** | Valve reviews it in "typically 3-5 business days" and asks for submission at least 7 days before you want it visible ([releasing](https://partner.steamgames.com/doc/store/releasing)). Review can bounce back with fixes. | 1–2 weeks including one revision round | A11 |
| A11 | **Publish "Coming Soon"** | The page must be **public for at least 2 weeks** before release ([coming_soon](https://partner.steamgames.com/doc/store/coming_soon)). Wishlists build from this point, so longer is better: most indies run 2–6 months of Coming Soon. | at least 14 days | release |
| A12 | **Pricing** | Set a USD base price and accept or adjust the suggested regional prices across 37 currencies. The minimum is the $0.99 tier. After release the price is locked for 30 days, and raising it blocks discounts for 30 days ([pricing](https://partner.steamgames.com/doc/store/pricing)). Optional launch discount of 10–40% for 7–14 days; no other discount within 30 days of release ([discounts](https://partner.steamgames.com/doc/marketing/discounts)). Suggested range given the content (4 core raids, about 28 jobs, finale, base area): $9.99–$14.99. | 1 hour | build review |
| A13 | **Choose the release date** | Shown as "Coming soon", a quarter or an exact date. Avoid Steam Next Fest and major sales weeks. Release is a manual button press ([releasing](https://partner.steamgames.com/doc/store/releasing)). | — | — |
| A14 | **Build review** | Submitted from the release checklist. Valve checks that the game launches, the Release build is on the default branch, the game has been played through Steam for at least 5 minutes, Cloud syncs if enabled, achievements are valid, and there are no review prompts or ads ([review_process](https://partner.steamgames.com/doc/store/review_process)). **Valve does not publish a turnaround.** Plan for about 1 week, and submit at least 2 weeks before the date. | about 1 week (not documented) | release |
| A15 | **Press "Release"** | Manual. A trailer that is still processing blocks release ([trailer](https://partner.steamgames.com/doc/store/trailer)). | minutes | — |
| A16 | **Get paid** | Monthly, about 30 days after the end of each month, once that month's balance passes $100 ([payments](https://partner.steamgames.com/doc/finance/payments_salesreporting)). Revenue share is not stated on any Steamworks page we could fetch. Widely reported since 2018: 30% to Valve, 25% after $10M and 20% after $50M per game ([Engadget, Dec 2018](https://www.engadget.com/2018/12/01/steam-gives-successful-developers-a-larger-cut-of-game-revenue/)). Confirm the figures in the Distribution Agreement. | — | — |

## B. We can do (engineering and asset work)

| # | Step | Detail | Estimate | Needs |
|---|---|---|---|---|
| B1 | **Clear the licence blockers** | Record or replace the 19 UNKNOWN files, replace or declare the AI-generated Pixel Art Atlas models, delete stale credits rows (LICENCES.md). | 0.5–2 days | nothing |
| B2 | **Credits & licences screen and `THIRD-PARTY-NOTICES.txt`** | Text is in LICENCES.md. Add a main-menu entry and link to it from the end of the finale roll. | 0.5 day | B1 |
| B3 | **Fix content issues** | Brand and name replacements and any rule violations listed in CONTENT.md. | 0.5–1 day | nothing |
| B4 | **Desktop wrapper** | Package `index.html` with Electron (or NW.js / Tauri). Steps: vendor three.js r128 plus the examples and remove the CDN and Google Fonts fetches; disable the service worker; serve over a local `file://`/custom protocol with correct MIME types for `.glb`, `.hdr` and `.webp`; turn off the background-throttling flags so audio and frames keep running when the window loses focus; default to fullscreen with a windowed toggle; quit from the menu. | 2–4 days | B5, B7 |
| B5 | **Steamworks integration** | `steamworks.js` / greenworks (or Electron plus the Steamworks SDK) for overlay, achievements and the Cloud API. At minimum the overlay has to work with the WebGL canvas. Electron overlay needs the `--in-process-gpu` / `--disable-direct-composition` workarounds; test early. | 1–3 days | App ID (A6) |
| B6 | **Saves to disk and Steam Cloud** | Saves live in `localStorage` (`js/save.js`). Under a wrapper, write them to a JSON file in the user-data folder and enable Steam **Auto-Cloud** on that path. That needs no SDK calls. Review requires Cloud to sync between 2 PCs with "developers only" turned off ([review_process](https://partner.steamgames.com/doc/store/review_process), [cloud](https://partner.steamgames.com/doc/features/cloud)). | 1 day | B4, App ID |
| B7 | **Depots and build upload** | One Windows depot, plus optionally Linux, which would also cover Deck natively, and macOS. Use `steamcmd` with an `app_build.vdf` ([uploading](https://partner.steamgames.com/doc/sdk/uploading)). Leave out `dev/`, `docs/`, `tools/`, `legacy/`, `pause.png`, `assets/og.jpg` and the source `assets/*` that are superseded by `assets/opt/`. Check whether the game needs the originals as fallbacks (`index.html` falls back to source paths when the manifest misses). If it does, ship both. Set the Release build live on the default branch. | 1 day for the first upload, then minutes | App ID, B4 |
| B8 | **Achievements** | Configure them in Steamworks. Each needs a unique name, description and 64×64 icon (achieved and unachieved). Up to 100 at first ([achievements](https://partner.steamgames.com/doc/features/achievements)). Candidates are one per job (about 28), the finale, "zip-tie 25 surrendering crew", "finish a raid with no kills", "Riverside trust 100", one per easter egg (hidden), and one per vehicle upgrade tier. Hook them into the job-complete and `prog` save events. | 1–2 days | B5 |
| B9 | **Controller support and Steam Input** | State what is true. Menus have gamepad navigation (`dev/menus.e2e.js` tests it); gameplay coverage is set out in QA-GAPS.md. Until everything works on a controller, declare **Partial Controller Support** in the questionnaire, or publish a Steam Input config that maps the keyboard and mouse ([controller dev guide](https://partner.steamgames.com/doc/features/steam_controller/getting_started_for_devs)). | 2–5 days for full support | — |
| B10 | **Steam Deck prep** | Verified needs: the default controller layout reaches all content, on-screen prompts match the controller, text entry by controller, 30 fps at 800p, text at least 9 px tall at 1280×800, and no launcher or compatibility warnings ([steamdeck/compat](https://partner.steamgames.com/doc/steamdeck/compat)). The Auto quality ladder and resolution scale help (docs/PERF.md). Check HUD font sizes at 1280×800. Review starts automatically after release, or on request where offered. Results publish after about a week. Realistic goal at launch: **Playable**. | 3–5 days | B9 |
| B11 | **Store assets** | Capsules, library art, screenshots and a trailer, with the sizes and shot list in STORE.md. Under the capsule rules, capsules may show only art, the name and an official subtitle ([rules](https://partner.steamgames.com/doc/store/assets/rules)). | 3–6 days (art plus trailer edit) | nothing; can start now |
| B12 | **QA pass** | Work through the High and Blocker items in QA-GAPS.md. Do a full play-through from a fresh save in the wrapper on a low-end machine and on Deck. | 3–5 days | B4 |
| B13 | **Build review submission** | Release checklist all green. Note that review requires 5 minutes played through Steam. | — | B4–B8, A6 |

## Order and critical path

```
Week 0   A1 licence decision · A2–A5 paperwork · A6 pay fee (starts 21-day clock + tax verification ~30 d)
         B1 licence blockers · B3 content fixes · B11 store art starts
Week 1   B4 wrapper · B5 Steamworks SDK · B6 Cloud · A8 content survey
Week 2   A9/A10 store page submitted (3–5 business days review)   · B7 first depot upload · B8 achievements
Week 3   A11 Coming Soon live (≥ 14 days before release; longer = more wishlists) · B9/B10 controller + Deck
Week 4   B12 QA pass · A12 pricing · A14 build review submitted (allow ~1 week)
Week 5+  earliest release (21-day fee wait and 14-day Coming Soon both satisfied); A15 release
```

**Earliest realistic release is 5–6 weeks from paying the fee**, assuming nothing bounces. A more sensible plan for wishlists is 2–3 months of Coming Soon, so about 3 months out.

The hard gates are:
- the 21-day fee wait
- tax and identity verification, up to about 30 days
- store page review (3–5 business days) followed by at least 14 days of public Coming Soon
- build review, about 1 week (no figure from Valve)

Everything in section B fits inside those windows.
