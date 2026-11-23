# High Trust: trailer v2 screenplay (≈62 s)

**What changes from v1.** Same structure, same jokes, new pictures. v1 was the default gameplay camera from far away. In v2 every beat is shot like a capture team would shoot it: the free camera (`rig.js`) sits low, close and in the path of the action; the subject fills at least a third of the frame height; the action crosses or comes at the lens and finishes inside the shot; the hero beats are lit at golden hour (the game's own sun, mood and grade, pushed low and warm); one shot is at night. Everything is the game running: real jobs, real job bots, real vehicles, real lines. About half the cut is HUD-on gameplay (over the shoulder, closer than the default boom), half is cinematic angles of the same live action with the HUD reduced to subtitles and pop-ups.

**Music first.** The game's hub theme, 96 bpm: 1 beat = 0.625 s = 18.75 frames. Cuts land on beats (half beats in the escalation). Cut lengths accelerate: 4 beats (2.5 s) in Act 1 → 2 → 1.5 → 1.25 beats (0.8 s) at the jet peak. The cold open plays on ambience. One deadpan beat (the parachute) drops the music to silence. The festival is the victory theme; the end card is Shave-and-a-Haircut on the horn.

**Cards** (five, each a dry punchline; v1's feature-speak cards are gone):
1. "Maple Heights used to wave." (traffic stand-off)
2. "They would really prefer violence wasn't necessary." (the night shot: the flashlight finds them, hands up)
3. "Every kid gets home. Every single one." (Crossing Guard; replaces "Walk eleven kids home with a stop sign.")
4. "The HOA has been notified." (the pancaked car; replaces "Fort Sensible. Open from the first minute.")
5. End card: logo + "Wishlist on Steam" (config.json `cta`)

**Stinger** (after the logo): the HOA's letter about the tank (js/tank.js letter(): "RE: The Tank ... Bylaw 14(c)"), the dad: "There's a letter from the HOA. About the tank. They said it's very nice." It pays off card 4. The v1 timeslip is the fallback.

**Content rules.** No child in frame with a drawn weapon (Crossing Guard, the jet family and the festival are unarmed; their HUD weapon panel is hidden). Nobody is hurt: zip-ties, beanbags, the tank's practice round only into a clear range. Enemy casts mixed. Crew and family as they are. All on current main (rebuilt caps). The Higher Ground court view (a child on court) is not used; the scope shot looks at the rooftop.

## Shot list (as cut: `edit-v2.js`)

`Cam`: **C** = cinematic (free camera, HUD reduced to subtitles/pop-ups), **G** = gameplay (HUD on). Beats at 96 bpm.

| # | Beats | Shot (`shots/…`) | Cam | What's on screen |
|---|---|---|---|---|
| 1 | 2.5 | `v2_hook` A | C | Knee height in front of the fleeing porch pirate, the dad sprinting in behind. "You'll never take me alive! ...Wait, you can, I'm slow." No music. |
| 2 | 1.5 | `v2_hook` B | C | Side-on, Hank's Hardware behind, the dad closing. |
| 3 | 2.5 | `v2_hook` C | C | Close, three-quarter: hands up, "Okay okay okay. It's a nose hair trimmer.", zip-tie, +TRUST. |
| 4 | 2 | card `title` | — | Title sting; music in. |
| 5 | 3 | `v2_van_pass` | C | The minivan sweeps past a kerb lens (hydrant foreground). Card 1 "Maple Heights used to wave." |
| 6 | 2 | `v2_crew` | C | Four dads walk at a long lens down Maple, golden hour. |
| 7 | 3 | `v2_crossing` | C | Crossing Guard at a kid's eye height: the STOP sign up, cars held. Card 3. |
| 8 | 4 | `v2_taxi` | G | Dad Taxi, close chase: "My mom lets me sit in the front." / "Your mom is not here." |
| 9 | 3.5 | `v2_linden` | G | Linden Park block party: beanbags, the wave gives up. Card 2 "They would really prefer violence wasn't necessary." |
| 10 | 1.5 | `scope` | G | Higher Ground: through the scope, the rooftop, the beanbag. |
| 11 | 3.25 | `v2_tank` A | C | LAWN ORDER rolls down Maple at a lens on the asphalt, the barrel swinging onto camera. |
| 12 | 3 | `v2_tank` B | C | From the kerb: it climbs over Linda's car. Card 4 "The HOA has been notified." |
| 13 | 2.5 | `v2_jet_rotate` | C | DAD-1 rotates and lifts off past a lens in the grass, gear coming up. "Cleared for... honestly, whatever you want." |
| 14 | 2.5 | `v2_jet_bridge` | C | Under the High Bridge from the riverbank; Jen's line from the buzz set as a subtitle. |
| 15 | 2 | `v2_jet_chase` | C | Chase plane off the wing, banked, golden hour. |
| 16 | 2.5 | `v2_chute` | C | The canopy from below. "Ejection! ...The jet is fine. It's a rental." Music out (deadpan beat). |
| 17 | 1.25 | `v2_drag` A | C | The tree: ambers, green; music back on the green. |
| 18 | 1.5 | `v2_drag` B | C | The minivan launches at a low front lens. |
| 19 | 2 | `drag_slip` | G | The timeslip: 9.955 s at 71.4 mph, in a minivan. |
| 20 | 12 | `v2_festival` | C | Close on the front row waving, blended into the game's crane over the street. Card "Everybody waves." Victory theme. |
| 21 | 8 | card `end` | — | Logo, "Wishlist on Steam", horn. |
| 22 | 5 | `v2_hoa` | G | Stinger: the HOA's letter about the tank. "They said it's very nice." |

Shot but cut: the Maple fly-by over the family (the jet would not render north of the street from the ground; the working version was too small), the traffic stand-off (never better than two bumpers at the frame edges), the night flashlight shot (subjects too small and too dark), the tank's main gun (it refused: "Not with people downrange.").
