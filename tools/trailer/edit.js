/* The cut (see SCREENPLAY.md). Lengths are in BEATS of the game's hub theme (96 bpm: one beat = 0.625 s = 18.75 frames), so every cut
   lands on the music's grid; build.js turns them into frames. in = first frame used from the shot's capture. super = a text card from
   cards.js faded over the clip (from/to in frames). sfx: {cue, f: frame within the clip, gain}. Music is placed by clip markers.
   All audio cues are rendered by audio.js from the game's own synth (js/audio.js). */
const BEAT=18.75;
const clips=[
  {shot:'porch_chase',in:18,beats:5,note:'HOOK: the chase, the pirate\'s line'},
  {card:'title',beats:2,fadeIn:.15,fadeOut:.2,mark:'music',note:'title sting'},
  {shot:'van_drive',in:6,beats:5,note:'the minivan rolls out',sfx:[{cue:'engine_pull',f:-27,gain:.6}]},
  {shot:'traffic_honk',in:126,beats:6,note:'SUV honks: card 1',super:{card:'wave',from:8,to:104},sfx:[{cue:'horn_double',f:41,gain:.9}]},
  {shot:'porch_chase',in:104,beats:6,note:'caught, zip-tie, +TRUST: card 2',super:{card:'mercy',from:44,to:112},sfx:[{cue:'ziptie',f:46,gain:1}]},
  {shot:'crossing',in:44,beats:4,note:'BREATH: Crossing Guard: card 3',super:{card:'dadlife',from:6,to:75}},
  {shot:'taxi',in:6,beats:4,note:'Dad Taxi'},
  {shot:'scope',in:6,beats:4,note:'Higher Ground scope'},
  {shot:'linden',in:10,beats:3,note:'beanbags at Linden Park'},
  {shot:'range',in:6,beats:3,note:'the range: card 4',super:{card:'open',from:4,to:56}},
  {shot:'tank',in:20,beats:4,note:'the tank fires',sfx:[{cue:'tank',f:17,gain:1}]},
  {shot:'jet_buzz',in:6,beats:4,note:'the jet buzzes the house',sfx:[{cue:'jet',f:-20,gain:.9}]},
  {shot:'jet_family',in:20,beats:3,note:'the family waves'},
  {shot:'chute',in:2,beats:3,note:'eject, parachute',sfx:[{cue:'chute',f:7,gain:1}]},
  {shot:'drag_launch',in:4,beats:2,note:'the tree',sfx:[{cue:'tree',f:0,gain:1.2}]},
  {shot:'drag_launch',in:46,beats:3,note:'the launch',mark:'fest0',sfx:[{cue:'engine_launch',f:0,gain:.9}]},
  {shot:'festival',in:0,beats:14,mark:'fest',note:'RELEASE: Everybody waves'},
  {card:'end',beats:7,fadeIn:.5,mark:'end',note:'end card'},
  {shot:'drag_slip',in:6,beats:3,note:'stinger: the minivan\'s timeslip'},
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
  {cue:'hub_low',at:at.end+b*0+(7*BEAT/30),from:0,dur:3*BEAT/30,fin:.05,fout:.5,gain:.6},
];
module.exports={clips,music,sfx:[],poster:4.2,BEAT};
