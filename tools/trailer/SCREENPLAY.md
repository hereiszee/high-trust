# High Trust: trailer screenplay (60–70 s)

**Pitch.** Ordinary suburban dads handle crime the way they handle the gutters: politely, on a Saturday, in khakis. It starts with a porch pirate who can't outrun a dad and ends with a fighter jet over the cul-de-sac. Each shot tops the one before it, and it closes on a whole street waving again. The tone is dry and confident and never grim. The game supplies the jokes through its own subtitles, and we add no more than five text cards.

**Music first.** The bed is the game's own hub theme (js/audio.js `SONGS.hub`, 96 bpm, so one beat is 0.625 s and 18.75 frames). Every cut lands on that grid (edit.js lengths are in beats). The music stays out for the cold open, which plays on ambience, footsteps and the pirate's line, then comes in on the title sting. It cuts to silence for one deadpan beat, a single horn honk, and comes back. The festival switches to the game's victory theme, and the end card gets the Shave-and-a-Haircut horn.

**Text cards** (five; punchlines in the game's voice, from STORE.md copy):
1. "Maple Heights used to wave." (over the SUV honking)
2. "They would really prefer violence wasn't necessary." (over the zip-tie)
3. "Walk eleven kids home with a stop sign." (Crossing Guard)
4. "Fort Sensible. Open from the first minute." (the tank / range)
5. End card: logo + "Wishlist on Steam" (config.json `cta`)

## Shot list

| # | Beats | Shot (script) | Action that completes in shot | HUD |
|---|---|---|---|---|
| 1 | 5 | `porch_chase` | HOOK: a dad in khakis sprints after a porch pirate carrying a parcel. Subtitle: "You'll never take me alive! ...Wait, you can, I'm slow." | on |
| 2 | 6 | `van_drive` | The minivan pulls out and accelerates down Maple. Music in. | on |
| 3 | 6 | `traffic_honk` | An SUV stops nose-to-nose with the van outside the school and honks. "Wave me through or move. I'm begging you." Card 1 | on |
| 4 | 6 | `porch_chase` (later frames) | Caught: hands up, "I do cardio! ...I don't do cardio." Zip-tie, +TRUST. Card 2 | on |
| 5 | 5 | `crossing` | BREATH: the dad holds the STOP sign while the kids cross at dusk. Card 3 | on (weapon panel hidden) |
| 6 | 4 | `taxi` | Dad Taxi: kids in the van, Jen's list, the clock running | on |
| 7 | 4 | `scope` | Higher Ground: Doug's beanbag rifle, through the scope over the basketball court | on |
| 8 | 3 | `linden` | Linden Park: The Talking-To (beanbags) knocks the fight out of a wave | on |
| 9 | 3 | `range` | Fort Sensible range: pop-up targets fall. Card 4 | on |
| 10 | 4 | `tank` | The turret swings round and the main gun fires down the empty apron | on |
| 11 | 4 | `jet_buzz` | The jet at 40 m over Maple, straight at the house. Jen: "Your father is buzzing the house. In a jet. On a Tuesday." | on |
| 12 | 3 | `jet_family` | The family on the lawn waving as the jet passes over the roof | off |
| 13 | 3 | `chute` | E, E: the seat fires, the canopy opens. Tower: "DAD-1 is enjoying the parachute." | on |
| 14 | 2 | `drag_launch` (tree camera) | Ambers, green | off |
| 15 | 3 | `drag_launch` (chase) | The minivan launches | on |
| 16 | 14 | `festival` | RELEASE: the speech, then the game's crane rising over the whole street waving, and the banner "Everybody waves." | game cine |
| 17 | 8 | end card | Logo, "Wishlist on Steam", horn | — |
| 18 | 3 | `drag_slip` | STINGER after the logo: the minivan's timeslip | on |

The cut accelerates from 6-beat shots in Act 1 to 2–3-beat shots in Fort Sensible and the Dragway, then holds the festival long.

**Content rules.** Enemy casts are mixed. No child is in frame with a drawn weapon: Crossing Guard and Dad Taxi have no guns, and their HUD weapon panel is hidden. The jet-family shot is unarmed. The violence is zip-ties and beanbags. Crew and family appear as they are. There are no brands.

**What we could not stage honestly.** The player has no "two-finger wave" action, so the running-gag wave uses waves the game really has: the neighbours, the family on the lawn and the festival. The crew do not read well inside the minivan from outside (seat poses clip), so they appear at the festival's front row instead.
