# Putting High Trust on Steam: the short version

Everything on the game side is built. These are the steps only you can do, in order.

## 1. Get the files

1. Open the repo's **Actions** tab on GitHub → **Desktop build** → the newest green run.
2. Under **Artifacts**, download:
   - `high-trust-windows-x64-archive` (Windows)
   - `high-trust-macos-universal-archive` (Mac)
   - `high-trust-linux-x64-archive` (Linux and Steam Deck)
3. Play the Windows or Mac one for 20 minutes first. `docs/steam/PLAYTEST.md` says how to launch it and what to check.

Artifacts expire after 14 days. To make fresh ones: Actions → Desktop build → **Run workflow**.

## 2. Open the Steamworks account (starts a 21-day clock)

1. Go to https://partner.steamgames.com and sign up with the Steam account that will own the game.
2. Fill in identity, bank and tax details.
3. Pay the $100 app fee. You get an **App ID**. You can't release until 21 days after paying, so do this first.

## 3. Create the depots

In Steamworks, open your app → **SteamPipe → Depots**. Create three depots and note their IDs:

| Depot | Operating system |
|---|---|
| Windows | Windows, 64-bit |
| Mac | macOS |
| Linux | Linux + SteamOS |

Under **Installation → General**, add one launch option per OS:

| OS | Executable |
|---|---|
| Windows | `HighTrust.exe` |
| macOS | `HighTrust.app` |
| Linux | `HighTrust` |

(Exact names are in `docs/steam/BUILD.md` if Steam rejects one.)

## 4. Send the IDs back

Give the App ID and the three depot IDs to whoever is maintaining the repo (or to Claude). Four placeholders get filled in, the build is re-run, and you download the new artifacts. This matters: without the real App ID the Steam overlay and achievements won't connect.

## 5. Upload the build

Steam does not take builds as ordinary file uploads. They go in through Valve's upload tool, **SteamPipe**, which logs in with your Steam account and sends the files to your depots. Valve's guide: https://partner.steamgames.com/doc/sdk/uploading

First, download the **Steamworks SDK** from the Steamworks site and unzip it. The upload tools are in its `tools` folder. The Steam account you upload with needs the "Edit App Metadata" and "Publish App Changes To Steam" permissions on the game.

**Option A, Windows, no command line:** open **SteamPipeGUI** from the SDK's `tools` folder. Give it your App ID, the depot IDs, and the unzipped build folder for each OS, and press upload. It comes with its own short instructions.

**Option B, any OS, one command:** unzip the three archives into `desktop/dist/` in the repo and run, from the repo folder, using the `steamcmd` in the SDK's `tools/ContentBuilder/builder` folder:

```bash
steamcmd +login YOUR_STEAM_LOGIN +run_app_build "$(pwd)/docs/steam/vdf/app_build.vdf" +quit
```

It asks for your password and Steam Guard code. The upload scripts in `docs/steam/vdf/` are already written; they only need the IDs from step 4.

(The Steamworks site may also offer a zip upload on the Builds page for small games. Valve's upload guide doesn't describe it, so don't count on it.)

**Then make it live:** in Steamworks open your app's **Builds** page, find the build you just uploaded, and set it live on the `default` branch. The default branch can only be set live there, by hand. Once the game is released, Steam asks you to confirm this on your phone, and after changing your account's email or phone number you must wait 3 days before you can set a build live.

## 6. Fill in the store page

All text is drafted in `docs/steam/STORE.md`: short description, long description, tags, system requirements, and the AI disclosure paragraph for the content survey. You still need to make the images (capsules, screenshots) at the sizes listed there, and a trailer if you want one.

Also in Steamworks:
- **Achievements:** enter the 23 from `docs/steam/achievements.md`.
- **Steam Cloud:** copy the Auto-Cloud table from `docs/steam/BUILD.md`.
- **Controller support:** declare it after you've tried a controller yourself.

## 7. Submit for review

1. Submit the **store page** for review (3–5 business days).
2. Once approved, publish it as **Coming Soon**. It must be public for at least 14 days before release.
3. Submit the **build** for review.
4. When both are approved and the 21 days have passed, press **Release**.

## Things to know

- **Mac needs an Apple Developer account ($99/year).** Without signing, macOS blocks the app even when Steam installs it. The steps are in `docs/steam/BUILD.md` under "macOS: signing and notarisation". Windows and Steam Deck don't need this. You can launch on Windows and Deck first and add Mac later.
- **Not yet tested on real hardware:** frame rate, controller feel, the Steam overlay, live achievement unlocks, a real Steam Deck. The playtest in step 1 is where those get checked.
- Full detail for every step: `docs/steam/CHECKLIST.md`.
