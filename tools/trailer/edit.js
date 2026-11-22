/* The cut (see SCREENPLAY.md). Lengths are in BEATS of the game's hub theme (96 bpm: one beat = 0.625 s = 18.75 frames), so every cut
   lands on the music's grid; build.js turns them into frames. in = first frame used from the shot's capture. super = a text card from
   cards.js faded over the clip (from/to in frames). sfx: {cue, f: frame within the clip, gain}. Music is placed by clip markers.
   All audio cues are rendered by audio.js from the game's own synth (js/audio.js). */
const BEAT=18.75;
const clips=[
  /* HOOK (0:00): gameplay from frame 1. A porch pirate bolts with a parcel; a dad in khakis sprints after him. */
  {shot:'porch_chase',in:18,beats:6,note:'HOOK: the chase, "You\'ll never take me alive! ...Wait, you can, I\'m slow."'},
  {card:'title',beats:2,fadeIn:.12,fadeOut:.2,mark:'music',note:'title sting'},
  /* ACT 1: the problem, handled politely */
  {shot:'van_drive',in:14,beats:4,note:'the minivan rolls out',sfx:[{cue:'engine_pull',f:-27,gain:.6}]},
  {shot:'traffic_honk',in:138,beats:5,note:'SUV honks at the van: card 1',super:{card:'wave',from:4,to:90},sfx:[{cue:'horn_double',f:29,gain:.9}]},
  {shot:'porch_chase',in:130,beats:6,note:'caught: hands up, zip-tie, +TRUST: card 2',super:{card:'mercy',from:30,to:108},sfx:[{cue:'ziptie',f:20,gain:1}]},
  /* BREATH: the family side */
  {shot:'crossing',in:44,beats:4,note:'Crossing Guard: card 3',super:{card:'dadlife',from:6,to:72}},
  {shot:'taxi',in:26,beats:5,note:'Dad Taxi: "My mom lets me sit in the front." / "Your mom is not here."'},
  /* ACT 2: escalation, shorter and bigger */
  {shot:'linden',in:24,beats:2,note:'Linden Park: crew in cover, The Talking-To (beanbags)',sfx:[{cue:'shot_beanbag',f:6,gain:.7}]},
  {shot:'scope',in:30,beats:4,note:'Higher Ground: through the scope, a beanbag, hands up',sfx:[{cue:'shot_rifle',f:20,gain:.8}]},
  {shot:'tank_crush',in:36,beats:5,note:'the tank through the hay bales and Linda\'s car: card 4',super:{card:'open',from:4,to:56},sfx:[{cue:'tank',f:40,gain:.7}]},
  {shot:'jet_buzz',in:76,beats:3,note:'the jet buzzes the house (Jen\'s line)',sfx:[{cue:'jet',f:-20,gain:.9}]},
  {shot:'jet_family',in:30,beats:3,note:'the family waves as the jet passes'},
  {shot:'chute',in:5,beats:5,note:'eject, parachute',sfx:[{cue:'chute',f:3,gain:1}]},
  {shot:'drag_launch',in:8,beats:2,note:'the tree',sfx:[{cue:'tree',f:0,gain:1.2}]},
  {shot:'drag_launch',in:46,beats:2,note:'the minivan launches',sfx:[{cue:'engine_launch',f:0,gain:.9}]},
  /* the button: one last absurd topper */
  {shot:'jet_bridge',in:20,beats:3,note:'under the High Bridge',sfx:[{cue:'jet',f:-30,gain:.8}]},
  /* RELEASE */
  {shot:'festival',in:18,beats:8,mark:'fest',note:'Everybody waves: the festival crane and the game\'s own banner'},
  {card:'end',beats:8,fadeIn:.5,mark:'end',note:'end card (config.json cta)'},
  {shot:'drag_slip',in:2,beats:3,crop:[540,210,880,495],zoom:1.12,mark:'sting',note:'stinger: the minivan\'s timeslip'},
];
/* clip start times (s) by mark, for the music */
let b=0;const at={};for(const c of clips){if(c.mark)at[c.mark]=b*BEAT/30;b+=c.beats}
const music=[
  {cue:'amb_suburb',at:0,from:0,dur:at.music+.5,fin:.2,fout:.5,gain:1.1},
  {cue:'st_start',at:at.music-.05,from:0,dur:1.6,gain:.9},
  {cue:'hub',at:at.music+1.25,from:0,dur:at.fest-at.music-1.25,fin:.02,fout:.3,gain:.9},
  {cue:'victory',at:at.fest,from:0,dur:at.end-at.fest+.4,fin:.02,fout:1.2,gain:.95},
  {cue:'crowd',at:at.fest+1.2,from:0,dur:6,fin:.6,fout:1.5,gain:.7},
  {cue:'horn_shave',at:at.end+.6,from:0,dur:2.2,gain:.85},
  {cue:'hub_low',at:at.sting,from:0,dur:3*BEAT/30,fin:.05,fout:.5,gain:.6},
];
module.exports={clips,music,sfx:[],poster:26.4,BEAT};
