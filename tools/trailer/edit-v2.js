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
  /* COLD OPEN (ambience, no music): the porch pirate. One take, three set-ups. Subtitles re-set large (subs) over the game's own line. */
  {shot:'v2_hook',in:ev('v2_hook','camB',-49,30),beats:2,cam:'C',subs:[{card:'s_pirate1',from:3}],note:'HOOK A: in front of the running pirate, the dad sprinting in behind'},
  {shot:'v2_hook',in:ev('v2_hook','camB',21,100),beats:1.5,cam:'C',subs:[{card:'s_pirate1'}],note:'HOOK B: side-on, the dad closing'},
  {shot:'v2_hook',in:ev('v2_hook','camC',15,147),beats:2.75,cam:'C',subs:[{card:'s_pirate2'}],super:{card:'mercy',from:10,to:52},note:'HOOK C: hands up, the nose hair trimmer, zip-tie, +TRUST. Card 2',sfx:[{cue:'ziptie',f:ev('v2_hook','ziptie',0,170)-ev('v2_hook','camC',15,147),gain:1}]},
  {card:'title',beats:2,fadeIn:.12,fadeOut:.2,mark:'music',note:'title sting',sfx:[I(0,.5)]},
  /* ACT 1: the neighbourhood, golden hour */
  {shot:'v2_van_pass',in:50,beats:1.75,cam:'C',note:'the minivan sweeps past the kerb lens (the door wipe kept to the last 6 frames). Card 1',super:{card:'wave',from:0,to:33},sfx:[{cue:'engine_pull',f:-20,gain:.6},W(22,.45)]},
  {shot:'v2_crew',in:92,beats:2,cam:'C',subs:[{card:'s_rick'}],note:'the crew walk down Maple at the long lens'},
  {shot:'v2_crossing',in:117,beats:3,cam:'C',crop:[240,0,1680,945],subs:[{card:'s_benji',from:0,to:38},{card:'s_jaylen',from:46}],note:'Crossing Guard at a kid\'s height, cars stopped for the sign (framed right, off the adult in the foreground). Card 3',super:{card:'guard',from:4,to:56}},
  {shot:'v2_taxi',in:46,beats:4,cam:'G',subs:[{card:'s_ava',from:0,to:30},{card:'s_mom',from:30}],note:'Dad Taxi: "My mom lets me sit in the front." / "Your mom is not here."'},
  /* ACT 2: escalation, shorter and bigger */
  {shot:'v2_linden',in:58,beats:2,cam:'G',subs:[{card:'s_gary',from:0,to:21},{card:'s_crew',from:21}],note:'Linden Park: a beanbag lands, the wave gives up',sfx:[{cue:'shot_beanbag',f:4,gain:.7}]},
  {shot:'v2_tank',in:ev('v2_tank','camB',-61,66),beats:3.25,cam:'C',subs:[{card:'s_barb'}],note:'LAWN ORDER rolls at the lens, barrel swinging onto camera',sfx:[I(0,.55)]},
  {shot:'v2_tank',in:ev('v2_tank','camB',8,135),beats:3.5,cam:'C',subs:[{card:'s_barb',from:0,to:6},{card:'s_sharon',from:6}],note:'the pancake. Card 4',super:{card:'hoa',from:16,to:56}},
  {shot:'v2_jet_rotate',in:ev('v2_jet_rotate','liftoff',-13,20),beats:2.5,cam:'C',subs:[{card:'s_tower1'}],note:'DAD-1 rotates beside the lens, gear up',sfx:[{cue:'jet',f:-48,gain:.7}]},
  {shot:'v2_jet_bridge',in:ev('v2_jet_bridge','under',-16,32),beats:2.5,cam:'C',subs:[{card:'jen'}],note:'under the High Bridge, with Jen\'s line from the buzz',sfx:[{cue:'jet',f:-55,gain:.8}]},
  {shot:'v2_jet_chase',in:27,beats:2,cam:'C',note:'chase plane, banking over town',sfx:[W(0,.4)]},
  /* the deadpan beat: music out */
  {shot:'v2_chute',in:101,beats:2.5,cam:'C',mark:'drop',subs:[{card:'s_tower2'}],note:'the canopy, from below (music out)'},
  {shot:'v2_drag',in:ev('v2_drag','green',-20,42),beats:1.25,cam:'C',mark:'back',note:'the tree: ambers, green (music back on the green)',sfx:[{cue:'tree',f:-27,gain:1.1}]},
  {shot:'v2_drag',in:ev('v2_drag','green',10,72),beats:1.5,cam:'C',note:'the launch',sfx:[{cue:'engine_launch',f:0,gain:.9}]},
  /* RELEASE */
  {shot:'v2_festival',in:10,beats:12,mark:'fest',cam:'C',crop:[0,0,1600,900],super:{card:'waves',from:80,to:200},note:'close on the front row, then the game\'s crane (framed above the speech subtitles): "Everybody waves."'},
  {card:'end',beats:4.5,fadeIn:.4,mark:'end',note:'end card (config.json cta)'},
  {shot:'v2_hoa',in:6,beats:4,crop:[614,322,693,390],vf:'drawbox=x=420:y=826:w=380:h=70:color=0xffd23f@0.38:t=fill',mark:'sting',cam:'G',note:'stinger: the HOA letter about the tank, "The Board notes it is very nice." highlighted'},
];
let b=0;const at={};for(const c of clips){if(c.mark)at[c.mark]=b*BEAT/30;b+=c.beats}
const h0=at.music+1.25;
const music=[
  {cue:'amb_suburb',at:0,from:0,dur:at.music+.5,fin:.2,fout:.5,gain:1.1},
  {cue:'st_start',at:at.music-.05,from:0,dur:1.6,gain:.9},
  {cue:'hub',at:h0,from:0,dur:at.drop-h0+.05,fin:.02,fout:.05,gain:.9},
  /* the deadpan beat: silence under the parachute, the song comes back on the green */
  {cue:'hub',at:at.back+.67,from:at.back+.67-h0,dur:at.fest-at.back-.67,fin:.02,fout:.3,gain:.9},
  {cue:'victory',at:at.fest,from:0,dur:at.end-at.fest+.4,fin:.02,fout:1.2,gain:.95},
  {cue:'crowd',at:at.fest+1.2,from:0,dur:6,fin:.6,fout:1.5,gain:.7},
  {cue:'horn_shave',at:at.end+.6,from:0,dur:2.2,gain:.85},
  {cue:'amb_suburb',at:at.sting,from:2,dur:4*BEAT/30,fin:.1,fout:.4,gain:.9},
];
module.exports={clips,music,sfx:[],poster:20.9,BEAT,name:'high-trust-trailer-v2',suffix:'-v2'};
