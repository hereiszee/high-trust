/* The v2 cut (SCREENPLAY-V2.md). TRAILER_EDIT=tools/trailer/edit-v2.js node tools/trailer/build.js
   Same grammar as edit.js: lengths in BEATS of the hub theme (96 bpm: 1 beat = 0.625 s = 18.75 frames), in = first frame of the take,
   super = a card from cards.js over the clip, sfx at frame offsets within the clip. cam: C = cinematic (free camera, HUD reduced to
   subtitles/pop-ups), G = gameplay (HUD on). Cut lengths accelerate through the escalation. */
const BEAT=18.75;
/* in-points from the takes' own logged events (shot.json), so a re-render that plays out a few frames differently still cuts on the action */
const fs=require('fs'),path=require('path');const SCR=process.env.TRAILER_SCRATCH||'/tmp/ht-trailer';
const ev=(shot,name,off=0,dflt=0)=>{try{const j=JSON.parse(fs.readFileSync(path.join(SCR,'frames',shot,'shot.json'),'utf8'));const e=j.events.find(e=>e[1]===name);return e?Math.max(0,e[0]+off):dflt}catch(_){return dflt}};
const W=(f=0,g=.5)=>({cue:'whoosh',f,gain:g}),I=(f=0,g=.6)=>({cue:'impact',f,gain:g});
const clips=[
  /* COLD OPEN (ambience, no music): the porch pirate. One take, three set-ups. */
  {shot:'v2_hook',in:ev('v2_hook','camB',-49,30),beats:2.5,cam:'C',note:'HOOK A: in front of the running pirate, the dad sprinting in behind. "You\'ll never take me alive! ...Wait, you can, I\'m slow."'},
  {shot:'v2_hook',in:ev('v2_hook','camB',21,100),beats:1.5,cam:'C',note:'HOOK B: side-on, the dad closing'},
  {shot:'v2_hook',in:ev('v2_hook','camC',8,140),beats:2.5,cam:'C',note:'HOOK C: hands up, "I do cardio!", zip-tie, +TRUST',sfx:[{cue:'ziptie',f:ev('v2_hook','ziptie',0,170)-ev('v2_hook','camC',8,140),gain:1}]},
  {card:'title',beats:2,fadeIn:.12,fadeOut:.2,mark:'music',note:'title sting',sfx:[I(0,.5)]},
  /* ACT 1: the neighbourhood, golden hour */
  {shot:'v2_van_pass',in:30,beats:3,cam:'C',note:'the minivan sweeps past the kerb lens',sfx:[{cue:'engine_pull',f:-20,gain:.6},W(30,.45)]},
  {shot:'v2_crew',in:20,beats:3,cam:'C',note:'the crew walk down Maple at the long lens'},
  {shot:'v2_traffic',in:150,beats:4,cam:'C',note:'nose-to-nose, horn, "Wave me through or move. I\'m begging you." Card 1',super:{card:'wave',from:6,to:70},sfx:[{cue:'horn_double',f:17,gain:.9}]},
  {shot:'v2_crossing',in:40,beats:4,cam:'C',note:'Crossing Guard at a kid\'s height, cars stopped for the sign. Card 3',super:{card:'guard',from:6,to:70}},
  {shot:'v2_taxi',in:20,beats:2.5,cam:'G',note:'Dad Taxi: kids in the van, the clock running'},
  /* ACT 2: escalation, shorter and bigger */
  {shot:'v2_linden',in:24,beats:2,cam:'G',note:'Linden Park: The Talking-To (beanbags)',sfx:[{cue:'shot_beanbag',f:6,gain:.7}]},
  {shot:'scope',in:30,beats:2,cam:'G',note:'Higher Ground: through the scope',sfx:[{cue:'shot_rifle',f:14,gain:.8}]},
  {shot:'v2_night',in:60,beats:3,cam:'G',note:'night: the flashlight finds them, hands up. Card 2',super:{card:'mercy',from:4,to:52}},
  {shot:'v2_tank',in:ev('v2_tank','camB',-47,80),beats:2.5,cam:'C',note:'LAWN ORDER rolls at the lens, barrel swinging onto camera',sfx:[I(0,.55)]},
  {shot:'v2_tank',in:ev('v2_tank','camB',8,135),beats:2.5,cam:'C',note:'the pancake. Card 4',super:{card:'hoa',from:10,to:47}},
  {shot:'v2_tank_fire',in:28,beats:1.5,cam:'C',note:'main gun on the range: cut on the blast',sfx:[{cue:'tank',f:9,gain:.75}]},
  {shot:'v2_jet_rotate',in:40,beats:2,cam:'C',note:'DAD-1 rotates beside the lens, gear up',sfx:[{cue:'jet',f:-48,gain:.7}]},
  {shot:'v2_jet_maple',in:36,beats:2,cam:'C',note:'over the family on Maple ("buzzing the house")',sfx:[{cue:'jet',f:-60,gain:.9}]},
  {shot:'v2_jet_bridge',in:44,beats:1.25,cam:'C',note:'under the High Bridge',sfx:[{cue:'jet',f:-55,gain:.8}]},
  {shot:'v2_jet_chase',in:30,beats:1.25,cam:'C',note:'chase plane, banking over town'},
  /* the deadpan beat: music out */
  {shot:'v2_chute',in:22,beats:2.5,cam:'C',mark:'drop',note:'eject, the canopy opens. "DAD-1 is enjoying the parachute."',sfx:[{cue:'chute',f:14,gain:1}]},
  {shot:'v2_drag',in:0,beats:1.25,cam:'C',mark:'back',note:'the tree: ambers, green',sfx:[{cue:'tree',f:-12,gain:1.1}]},
  {shot:'v2_drag',in:0,beats:1.25,cam:'C',note:'the launch',sfx:[{cue:'engine_launch',f:0,gain:.9}]},
  {shot:'v2_drag',in:0,beats:1.5,cam:'C',note:'the finish board'},
  /* RELEASE */
  {shot:'v2_festival',in:0,beats:12,mark:'fest',cam:'C',note:'close on the front row, then the game\'s crane: "Everybody waves."'},
  {card:'end',beats:8,fadeIn:.5,mark:'end',note:'end card (config.json cta)'},
  {shot:'v2_hoa',in:0,beats:4,mark:'sting',cam:'G',note:'stinger: the HOA letter about the tank'},
];
let b=0;const at={};for(const c of clips){if(c.mark)at[c.mark]=b*BEAT/30;b+=c.beats}
const h0=at.music+1.25;
const music=[
  {cue:'amb_suburb',at:0,from:0,dur:at.music+.5,fin:.2,fout:.5,gain:1.1},
  {cue:'st_start',at:at.music-.05,from:0,dur:1.6,gain:.9},
  {cue:'hub',at:h0,from:0,dur:at.drop-h0+.05,fin:.02,fout:.05,gain:.9},
  /* the deadpan beat: silence under the parachute, the song comes back on the green */
  {cue:'hub',at:at.back,from:at.back-h0,dur:at.fest-at.back,fin:.02,fout:.3,gain:.9},
  {cue:'victory',at:at.fest,from:0,dur:at.end-at.fest+.4,fin:.02,fout:1.2,gain:.95},
  {cue:'crowd',at:at.fest+1.2,from:0,dur:6,fin:.6,fout:1.5,gain:.7},
  {cue:'horn_shave',at:at.end+.6,from:0,dur:2.2,gain:.85},
  {cue:'amb_suburb',at:at.sting,from:2,dur:4*BEAT/30,fin:.1,fout:.4,gain:.9},
];
module.exports={clips,music,sfx:[],poster:9.5,BEAT,name:'high-trust-trailer-v2',suffix:'-v2'};
