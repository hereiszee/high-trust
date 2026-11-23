# High Trust: trailer v2 screenplay (≈62 s)

**What changes from v1.** Same structure, same jokes, new pictures. v1 was the default gameplay camera from far away. In v2 every beat is shot like a capture team would shoot it: the free camera (`rig.js`) sits low, close and in the path of the action; the subject fills at least a third of the frame height; the action crosses or comes at the lens and finishes inside the shot; the hero beats are lit at golden hour (the game's own sun, mood and grade, pushed low and warm); one shot is at night. Everything is the game running: real jobs, real job bots, real vehicles, real lines. About half the cut is HUD-on gameplay (over the shoulder, closer than the default boom), half is cinematic angles of the same live action with the HUD reduced to subtitles and pop-ups.

**Music first.** The game's hub theme, 96 bpm: 1 beat = 0.625 s = 18.75 frames. Cuts land on beats (half beats in the escalation). Cut lengths accelerate: 4 beats (2.5 s) in Act 1 → 2 → 1.5 → 1.25 beats (0.8 s) at the jet peak. The cold open plays on ambience. One deadpan beat (the parachute) drops the music to silence. The festival is the victory theme; the end card is Shave-and-a-Haircut on the horn.

**Cards** (five, each a dry punchline; v1's feature-speak cards are gone):
1. "Maple Heights used to wave." (traffic stand-off)
2. "They would really prefer violence wasn't necessary." (zip-tie)
3. "Every child gets home. Every single one." → *Crossing Guard*, replaces "Walk eleven kids home with a stop sign."
4. "The HOA has been notified." (tank on Maple, replaces "Fort Sensible. Open from the first minute.")
5. End card: logo + "Wishlist on Steam" (config.json `cta`)

**Content rules.** No child in frame with a drawn weapon (Crossing Guard, the jet family and the festival are unarmed; their HUD weapon panel is hidden). Nobody is hurt: zip-ties, beanbags, the tank's practice round only into a clear range. Enemy casts mixed. Crew and family as they are. All on current main (rebuilt caps). The Higher Ground court view (a child on court) is not used; the scope shot looks at the rooftop.

## Shot list

`Cam`: **C** = cinematic (free camera, HUD reduced to subtitles/pop-ups), **G** = gameplay (HUD on, over the shoulder). Beats at 96 bpm.

| # | Beats | Shot (`shots/…`) | Cam | Camera | Staging / action that completes in shot |
|---|---|---|---|---|---|
| 1 | 3 | `v2_hook` A | C | Knee height 3.8 m in front of the fleeing pirate, tracking backward with him, 40° | Porch Light: pirate bolts with the parcel, dad sprints in behind him. Subtitle "You'll never take me alive! ...Wait, you can, I'm slow." Golden hour. No music. |
| 2 | 2 | `v2_hook` B | C | Side-on, 7.5 m, hip height, long lens 30°, tracking | The dad closes the gap left to right. |
| 3 | 3 | `v2_hook` C | C | Low two-shot, 3.4 m | Hands up ("I do cardio! ...I don't do cardio."), dad steps in, zip-tie, +TRUST. Card 2. |
| 4 | 2 | card | — | — | Title sting; music in. |
| 5 | 3 | `v2_van_pass` | C | Roadside, lens at 0.5 m on the kerb with a mailbox in the foreground, 32° | The minivan sweeps past a metre from the lens at speed (whip-follow at the end). Engine pull. |
| 6 | 3 | `v2_crew_out` | C | Kerb level, 28° long lens down the side of the van | Five dads in a line next to the parked van, the dad walking toward camera. |
| 7 | 4 | `v2_traffic` | C | Side-on between the two bumpers, 1.0 m | SUV nose-to-nose with the van outside the school, horn: "Wave me through or move. I'm begging you." Card 1. |
| 8 | 4 | `v2_crossing` | C | Kids' height (0.9 m), behind the line of kids, cars stopped beyond | Crossing Guard: the stop sign up, eleven kids crossing in front of stopped cars. No weapons in frame. Card 3. |
| 9 | 3 | `v2_taxi` | G | Close chase over the van's shoulder | Dad Taxi: kids in the van, Jen's list, the clock running. |
| 10 | 2 | `v2_linden` | G | Over the shoulder, closer boom | Linden Park: The Talking-To, beanbags. |
| 11 | 2 | `scope` | G | The scope view (kept, tightened) | Higher Ground: through the scope, the rooftop, a beanbag, hands up. |
| 12 | 3 | `v2_night` | G | Over the shoulder, flashlight beam | One night shot: the dad's flashlight sweeps a dark yard onto a suspect who puts his hands up. |
| 13 | 3 | `v2_tank` A | C | Low three-quarter front, 0.4 m off the asphalt, 26°, slow push | LAWN ORDER rolls down a Maple street at golden hour toward the lens, turret traversing; neighbours scatter ("Is that a TANK? On Maple?"). Card 4. |
| 14 | 2 | `v2_tank` B | C | Side-on, low, at the parked car | The pancake: a parked car flattened under the treads. "My CAR! My car is a PANCAKE!" |
| 15 | 1.5 | `v2_tank` C | C | Front quarter at the muzzle, on a clear range | The main gun fires (practice round, nobody downrange): muzzle blast, recoil, camera kick. Cut on the blast. |
| 16 | 2 | `v2_jet_rotate` | C | Runway level, lens on the centreline edge, 30° | DAD-1 rotates and lifts; gear comes up in shot. |
| 17 | 2 | `v2_jet_maple` | C | Roadside on Maple, family waving in the foreground | The jet screams over the rooftops, low. Jen: "Your father is buzzing the house. In a jet. On a Tuesday." |
| 18 | 1.5 | `v2_jet_chase` | C | Chase-plane off the left wing, banking with it | DAD-1 banks over town at golden hour. |
| 19 | 1.25 | `v2_jet_bridge` | C | Riverbank, looking up under the High Bridge | The jet goes under the bridge; the bridge fills the frame. |
| 20 | 2 | `v2_chute` | C | From below, against the sky | Eject: the canopy opens. Music out. Tower: "DAD-1 is enjoying the parachute." (deadpan beat) |
| 21 | 1.25 | `v2_drag` A | C | Close on the tree | Ambers... green. Music back in on the green. |
| 22 | 1.25 | `v2_drag` B | C | Low front quarter | The minivan launches: squat, tyre smoke. |
| 23 | 1.25 | `v2_drag` C | G | Finish line board | ET and mph on the board. |
| 24 | 12 | `v2_festival` | C | Starts close on faces in the front row, then the crane rises over the street | RELEASE: "Everybody waves." Victory theme. |
| 25 | 8 | card | — | — | End card: logo, "Wishlist on Steam", horn. |
| 26 | 3 | `drag_slip` | G | (kept) | Stinger: the minivan's timeslip. |

Total ≈ 70 beats of picture + cards ≈ 62 s. Shots that cannot be made great are cut, not padded.
