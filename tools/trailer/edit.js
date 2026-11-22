/* The cut, in order. Lengths are in BEATS of the game's hub theme (96 bpm: one beat = 0.625 s = 18.75 frames), so every cut lands on
   the music's grid; build.js turns them into frames. in = first frame of the shot's capture. super = a text card from cards.js
   faded in/out over the clip (from/to in frames). sfx: {cue, f: frame within the clip, gain}. The music timeline is in seconds.
   All cues are rendered by audio.js from the game's own synth (js/audio.js). */
const BEAT=18.75;
const clips=[
  /* 0:00 COLD OPEN (gameplay from frame 1): a porch pirate bolts with a parcel, the dad sprints after him, the pirate's line */
  {shot:'porch_chase',in:18,beats:5,note:'Porch Light: the chase and the pirate\'s line'},
  /* the crew rolls out: the music comes in here */
  {shot:'van_crew',in:8,beats:6,note:'the crew in the minivan pulls out',super:{card:'crew',from:14,to:100},sfx:[{cue:'engine_pull',f:0,gain:.8},{cue:'horn_shave',f:40,gain:.7}]},
  {shot:'traffic_honk',in:60,beats:6,note:'Maple Heights traffic stops and honks',sfx:[]},
  /* THE TURN: caught, hands up, zip-tie, +TRUST */
  {shot:'porch_chase',in:104,beats:6,note:'surrender, zip-tie, +TRUST',super:{card:'mercy',from:40,to:112},sfx:[{cue:'ziptie',f:44,gain:1}]},
  {shot:'linden',in:10,beats:4,note:'Linden Park: The Talking-To (beanbags)'},
  {shot:'scope',in:4,beats:6,note:'Higher Ground through the scope'},
  /* the neighbourhood changes */
  {shot:'riverside',in:0,beats:8,note:'Riverside Flats goes from Doors Locked to Doors Unlocked',super:{card:'river',from:20,to:140}},
  {shot:'crossing',in:4,beats:5,note:'Crossing Guard',super:{card:'dadlife',from:10,to:86}},
  {shot:'taxi',in:4,beats:4,note:'Dad Taxi'},
  /* Fort Sensible */
  {shot:'range',in:4,beats:4,note:'the range'},
  {shot:'tank',in:20,beats:4,note:'the tank fires down the empty apron',super:{card:'fort',from:4,to:72},sfx:[{cue:'tank',f:16,gain:1}]},
  {shot:'jet_buzz',in:4,beats:5,note:'the jet buzzes the house',super:{card:'jet',from:6,to:86},sfx:[{cue:'jet',f:0,gain:.9}]},
  {shot:'jet_family',in:20,beats:4,note:'the family waves from the lawn'},
  {shot:'chute',in:2,beats:4,note:'eject, parachute',sfx:[{cue:'chute',f:6,gain:1}]},
  /* Sensible Dragway */
  {shot:'drag_launch',in:0,beats:3,note:'the tree',sfx:[{cue:'tree',f:0,gain:1}]},
  {shot:'drag_launch',in:46,beats:4,note:'the launch',super:{card:'drag',from:6,to:70},sfx:[{cue:'engine_launch',f:0,gain:.9}]},
  {shot:'drag_slip',in:4,beats:3,note:'the timeslip'},
  /* FINALE */
  {shot:'festival',in:0,beats:14,note:'Everybody Waves: the festival crane'},
  {card:'end',beats:8,fadeIn:.6,note:'end card'},
];
/* music: the hub theme enters on the crew shot (5 beats in) and runs to the festival; the festival gets the game's victory theme */
const T=b=>b*BEAT/30;
const music=[
  {cue:'amb_suburb',at:0,from:0,dur:T(5)+1,fin:.2,fout:1,gain:1},
  {cue:'hub',at:T(5),from:0,dur:T(84-5),fin:.05,fout:.6,gain:.9},
  {cue:'victory',at:T(84),from:0,dur:9,fin:.05,fout:2,gain:.9},
  {cue:'crowd',at:T(84)+.5,from:0,dur:6,fin:.5,fout:1.5,gain:.7},
  {cue:'horn_shave',at:T(98)+.4,from:0,dur:2.2,gain:.8},
];
module.exports={clips,music,sfx:[],poster:2.2,BEAT};
