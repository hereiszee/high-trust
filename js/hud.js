/* High Trust · HUD, minimap, menus.  window.HT.HUD
   Self-contained: builds its own DOM inside a root element, styled by css/hud.css.
   The game feeds it one plain state object per frame (HUD.update(state, dt)) and
   fires one-shot events through methods (hit, damage, feed, banner, toast).
   Only changed DOM is written; canvases (minimap, compass) redraw at <= 30 Hz.

   Coordinates: world x/z in metres (three.js), north = -z. compassYaw / player.yaw
   are the game's camera yaw (P.yaw): facing = (-sin yaw, -cos yaw).          */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const wrapPi=a=>{a=(a+Math.PI)%TAU;if(a<0)a+=TAU;return a-Math.PI};
const now=()=>performance.now()/1000;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- tiny DOM helpers: every setter caches the last value ---------- */
function el(tag,cls,parent,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;if(parent)parent.appendChild(e);return e}
function frag(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild}
function txt(e,v){v=v==null?'':String(v);if(e._t!==v){e._t=v;e.textContent=v}}
function htm(e,v){if(e._h!==v){e._h=v;e.innerHTML=v}}
function sty(e,k,v){const c=e._s||(e._s={});if(c[k]!==v){c[k]=v;if(k.startsWith('--'))e.style.setProperty(k,v);else e.style[k]=v}}
function cls(e,c,on){on=!!on;const m=e._c||(e._c={});if(m[c]!==on){m[c]=on;e.classList.toggle(c,on)}}
function show(e,on){on=!!on;if(e._v!==on){e._v=on;e.hidden=!on}}
function attr(e,k,v){const c=e._a||(e._a={});if(c[k]!==v){c[k]=v;e.setAttribute(k,v)}}
const anim=(e,kf,o)=>e.animate?e.animate(kf,o):null;

/* ---------- event emitter ---------- */
const handlers={};
function on(name,fn){(handlers[name]||(handlers[name]=[])).push(fn);return()=>{handlers[name]=handlers[name].filter(f=>f!==fn)}}
function emit(name,...a){(handlers[name]||[]).forEach(f=>{try{f(...a)}catch(e){console.error(e)}});(handlers['*']||[]).forEach(f=>f(name,...a))}

/* =====================================================================
   ART: gun silhouettes (160x48, muzzle right) + 24px icon glyphs
   ===================================================================== */
const GUN={
  pistol:['M50 12h68l2 2v10H50z','M54 24h60v4H80l-2 3c-1 2-2 3-4 3h-4l-6 12H46l7-18z','M108 9h5v3h-5zM52 10h4v2h-4z','M68 28h12l-1 4c-1 2-3 3-5 3h-6zM70 29h7l-1 2c0 1-1 2-2 2h-4z'],
  revolver:['M84 14h58v7H84z','M140 11h3v3h-3z','M62 11h24v19H62z','M54 9l9 3v18h-8z','M56 26h10l-2 4c-3 6-4 10-3 16H46c-1-8 3-14 10-20z','M66 30h12c0 4-2 7-7 7h-4z'],
  nailer:['M42 9h80l12 7v9H42z','M134 15h16v7h-16z','M60 25h18l-5 17H56z','M48 40h36v8H48z','M98 25h24l-16 17h-8z','M44 12h8v10h-8z'],
  shotgun:['M2 21l42-6v13L9 38c-4 1-7-1-7-4z','M44 14h38v13H44z','M82 15h74v5H82z','M82 21h56v4H82z','M94 20h30v9H94z','M54 27h12c0 4-2 7-6 7h-6z'],
  double:['M2 21l42-6v13L9 38c-4 1-7-1-7-4z','M44 15h22v12H44z','M66 14h90v4H66z','M66 19h90v4H66z','M66 23h32v5H66z','M52 27h10c0 4-2 7-6 7h-4z'],
  beanbag:['M44 14h38v13H44z','M82 15h74v5H82z','M82 21h56v4H82z','M54 27h12c0 4-2 7-6 7h-6z'],
  rifle:['M4 15h24l8 4v7l-9 7H8c-2 0-4-2-4-4z','M30 18h16v6H30z','M44 13h48v12H44z','M48 8h40v4H48z','M92 14h38v10H92z','M130 17h20v4h-20z','M150 15h7v7h-7z','M70 25h12l5 18-11 2z','M52 25h10l-3 15h-9z'],
  smg:['M8 13h30v3H13v9h25v3H8z','M38 11h64v13H38z','M102 14h24v6h-24z','M64 24h10v22H64z','M46 24h11l-3 15h-10z','M88 24h8v11h-8z','M42 8h8v3h-8z'],
  hunter:['M2 22c10-3 28-5 42-5v11L12 39c-5 1-10 0-10-5z','M44 17h32v10H44z','M76 18h80v4H76z','M52 6h42v4H52z','M46 3h11v9H46zM88 3h11v9H88z','M60 10h4v7h-4zM82 10h4v7h-4z','M68 27h3v6h-6z','M56 27h9c0 4-2 6-5 6h-4z'],
  fists:['M60 18h40v14H60z']
};
const GUN_ACC={beanbag:['M2 21l42-6v13L9 38c-4 1-7-1-7-4z','M94 20h30v9H94z']};
const GUN_ALIAS={sidearm:'pistol',handgun:'pistol',pump:'shotgun',sbs:'double',ar:'rifle',carbine:'rifle',sniper:'hunter',scoped:'hunter'};
const gunKey=t=>GUN[t]?t:GUN[GUN_ALIAS[t]]?GUN_ALIAS[t]:'rifle';
function gunSVG(type){const k=gunKey(type);const p=GUN[k].map(d=>`<path d="${d}"/>`).join('')+(GUN_ACC[k]||[]).map(d=>`<path fill="#ff8a2a" d="${d}"/>`).join('');
  return `<svg viewBox="0 0 160 48" fill="currentColor" aria-hidden="true">${p}</svg>`}
const XH_OF={pistol:'pistol',revolver:'pistol',nailer:'smg',smg:'smg',shotgun:'shotgun',double:'shotgun',beanbag:'shotgun',rifle:'rifle',hunter:'scope',fists:'none'};
const FM_OF={pistol:'Semi',revolver:'D/A',nailer:'Auto',smg:'Auto',shotgun:'Pump',double:'Break',beanbag:'Less-lethal',rifle:'Auto',hunter:'Bolt'};

/* icon glyphs on a 24 grid; shape: d diamond, c circle, s rounded square */
const ICON={
  obj:{shape:'d',g:'M12 8.5l3.5 3.5-3.5 3.5L8.5 12z'},
  job:{shape:'d',g:'M11 6.5h2.2v7.5H11zM11 15.6h2.2v2.2H11z'},
  shop:{shape:'c',t:'$'},
  home:{shape:'c',g:'M6 12.2l6-5.2 6 5.2v6H14v-4h-4v4H6z'},
  garage:{shape:'c',g:'M15.6 5.6a4 4 0 0 0-3.9 5.1L5.8 16.6l1.8 1.8 5.9-5.9a4 4 0 0 0 5.1-3.9l-2.3 1.4-1.9-1.1-.1-2.2z'},
  crew:{shape:'c',g:'M12 6.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2zM7 18c0-3 2.2-5 5-5s5 2 5 5z'},
  revive:{shape:'c',g:'M10.3 6h3.4v4.3H18v3.4h-4.3V18h-3.4v-4.3H6v-3.4h4.3z'},
  van:{shape:'c',g:'M5 9h9.5l3 3H19v4.2H5zM8 15a1.6 1.6 0 1 0 0 3.2A1.6 1.6 0 0 0 8 15zm8 0a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z'},
  loot:{shape:'s',g:'M6.5 9.5h11v8h-11zM6 8l2-2.5h8L18 8z'},
  enemy:{shape:'c',g:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'},
  travel:{shape:'c',g:'M12 6l5 6h-3v6h-4v-6H7z'},
  /* open world places */
  gas:{shape:'c',g:'M7 6h6v12H7zM8.3 7.3v3h3.4v-3zM13 9h1.6l1.6 1.8v5.2a1 1 0 0 0 2 0V10l-1.4-1.6.9-.9 1.5 1.7v6.8a2.4 2.4 0 0 1-4.8 0v-4.6L14 11z'},
  mart:{shape:'c',g:'M5.5 7h2.2l1.6 7h7.4l1.6-5.4H9.1L8.8 7.6 8.5 7zM10 15.6a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm6 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z'},
  star:{shape:'c',g:'M12 5.6l1.9 4 4.3.5-3.2 3 .9 4.3L12 15.3l-3.9 2.1.9-4.3-3.2-3 4.3-.5z'},
  range:{shape:'c',g:'M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z'},   /* Fort Sensible (js/base.js) */
  site:{shape:'d',g:'M12 7.4a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zm0 2.2a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z'}
};
const KIND_COL={obj:'#ffc94a',job:'#ffc94a',shop:'#9fe58a',home:'#6fb8ff',garage:'#c9b8ff',crew:'#7fdc6e',revive:'#ff5a47',van:'#ffffff',loot:'#e8c48a',enemy:'#ff5a47',travel:'#ffffff',gas:'#ff8a6b',mart:'#9fe58a',star:'#ffd86b',site:'#ffc94a',range:'#b9d36a'};
const SHAPE_D={d:'M12 1.5l10.5 10.5L12 22.5 1.5 12z',c:'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20z',s:'M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3z'};
function iconSVG(kind){const ic=ICON[kind]||ICON.obj;const col='currentColor';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SHAPE_D[ic.shape]}" fill="${col}" stroke="rgba(10,12,16,.55)" stroke-width="1.2"/>`+
    (ic.g?`<path d="${ic.g}" fill="#12151a"/>`:`<text x="12" y="16.6" text-anchor="middle" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="14" fill="#12151a">${ic.t}</text>`)+'</svg>'}
const P2D={};const path2d=d=>P2D[d]||(P2D[d]=new Path2D(d));
function drawIcon(cx,kind,x,y,size,alpha=1){const ic=ICON[kind]||ICON.obj;const s=size/24;cx.save();cx.globalAlpha=alpha;cx.translate(x-size/2,y-size/2);cx.scale(s,s);
  cx.fillStyle=KIND_COL[kind]||'#fff';cx.strokeStyle='rgba(8,10,13,.7)';cx.lineWidth=2/s*.6;const sh=path2d(SHAPE_D[ic.shape]);cx.fill(sh);cx.stroke(sh);
  cx.fillStyle='#12151a';if(ic.g)cx.fill(path2d(ic.g));else{cx.font='800 14px "Barlow Condensed",sans-serif';cx.textAlign='center';cx.fillText(ic.t,12,16.8)}cx.restore()}

const UI_ICON={
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>',
  fire:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/></svg>',
  aim:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  use:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10h.5V3.5a1.5 1.5 0 0 1 3 0V10h.5V5a1.5 1.5 0 0 1 3 0v9c0 4-3 7-7 7-3 0-4.6-1.3-6-3.4L3.4 14a1.5 1.5 0 0 1 2.4-1.8L9 15z"/></svg>',
  reload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12a7 7 0 1 1-2.1-5"/><path d="M19 4v4h-4" /></svg>',
  jump:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V6M6 11l6-6 6 6"/></svg>',
  crouch:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="13" cy="5" r="2.4"/><path d="M9 9h6l1 5h3v2.4h-5l-1-3-2 3 2 4.6h-2.7L7.6 17 9 13z"/></svg>',
  swap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  view:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  cuff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="7.5" cy="14" r="4.5"/><circle cx="16.5" cy="14" r="4.5"/><path d="M10 8.5c1-2 3-2 4 0"/></svg>',
  kill:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="7"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/></svg>',
  cash:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="20" height="12" rx="2" opacity=".35"/><circle cx="12" cy="12" r="3.2"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9" opacity=".35"/><path d="M11 10h2v7h-2zM11 7h2v2h-2z"/></svg>',
  bad:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l10 18H2z" opacity=".9"/><path d="M11 9h2v6h-2zM11 16.5h2v2h-2z" fill="#12151a"/></svg>',
  roof:'<svg viewBox="0 0 118 34" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 30L59 5l55 25"/><path d="M88 18V7h10v15" stroke-width="5"/></svg>'
};

/* =====================================================================
   SETTINGS SCHEMA (pause menu) — keys match the game's CFG where they exist
   ===================================================================== */
const SETTINGS=[
  {tab:'controls',h:'Look',items:[
    {k:'sens',l:'Look speed',min:1,max:20,step:1},
    {k:'ads',l:'Aim speed',sub:'Look speed while aiming down sights',min:20,max:100,step:5,fmt:v=>v+'%'},
    {k:'invert',l:'Invert look',type:'bool'},
    {k:'fp',l:'First person',sub:'Or press V any time',type:'bool'}]},
  {tab:'display',h:'Camera',items:[
    {k:'fov',l:'Field of view',min:60,max:100,step:1,fmt:v=>v+'°'}]},
  {tab:'display',h:'Graphics',items:[
    {k:'gfx',l:'Quality',type:'seg',opts:[['auto','Auto'],['low','Low'],['med','Medium'],['high','High']],sub:'Auto adapts resolution and effects to this machine · Low turns off shadows and post effects'},
    {k:'rscale',l:'Resolution scale',sub:'Renders fewer pixels and scales up · lower is faster',min:50,max:100,step:5,fmt:v=>v+'%'},
    {k:'fpsCap',l:'Frame rate cap',type:'seg',opts:[['0','Off'],['30','30'],['60','60'],['120','120'],['144','144']],sub:'Off follows the display (VSync)'}]},
  {tab:'display',h:'Interface',items:[
    {k:'subs',l:'Subtitles',type:'bool'},
    {k:'mmRotate',l:'Rotate minimap',sub:'Off keeps north up',type:'bool'}]},
  {tab:'audio',h:'Volume',items:[
    {k:'master',l:'Master',min:0,max:100,step:5,fmt:v=>v+'%'},
    {k:'music',l:'Music',min:0,max:100,step:5,fmt:v=>v+'%'},
    {k:'sfx',l:'Effects',min:0,max:100,step:5,fmt:v=>v+'%'},
    {k:'voice',l:'Dialogue',min:0,max:100,step:5,fmt:v=>v+'%'}]}
];
/* every binding, grouped (pause → Controls). ' · ' separates alternatives. Aim and raise modes are toggles (owner rule). */
const KEY_GROUPS=[
  ['On foot',[['Move','W A S D'],['Look','Mouse'],['Jog (hold)','Shift'],['Jump · vault','Space'],['Crouch (toggle)','C · Ctrl'],['Talk · use · get in a car','E'],['Zip-tie someone with hands up','E (hold)'],['Camera: first / third person','V'],['Map','M'],['Flashlight · night vision','F · N'],['Pause','Esc · P']]],
  ['Guns',[['Fire','Mouse 1'],['Aim (click to raise, click again to lower) · scope · binoculars','Mouse 2'],['Reload','R'],['Switch gun','1 2 3 · Q · Wheel'],['Draw in Riverside · holster','1 2 3 · H']]],
  ['Cars and the minivan',[['Accelerate · brake / reverse','W · S'],['Steer','A D'],['Boost · handbrake','Shift · Space'],['Horn','H'],['Get out (slow down first)','E'],['Glovebox (parked, a neighbour\'s car)','G']]],
  ['Tank',[['Drive · turn on the spot','W S · A D'],['Turret','Mouse'],['Fire the main gun','Mouse 1'],["Gunner's sight (toggle)",'V'],['Get out','E']]],
  ['Jet',[['Throttle up · down','W · S'],['Pitch and roll','Mouse · Arrow keys'],['Roll (steer on the ground)','A D'],['Rudder','Z · X'],['Afterburner (toggle, at full throttle)','Shift'],['Landing gear','G'],['Cockpit view · look back (toggle)','V · C'],['Eject (in the air)','E twice']]],
  ['Jobs and home',[['Scope zoom (Higher Ground)','Z'],['Hold breath (scoped; tap, tap again to breathe)','Shift'],['Camera: raise (toggle) · shoot · lower','Mouse 2 · Space · Q'],['Decorate (at home)','B'],['Menus: browse · choose · back','Arrows · Enter · Esc']]]];
const DEFAULT_KEYS=KEY_GROUPS.flatMap(g=>g[1]);
/* controller layout (js/gamepad.js), shown under Key bindings */
const PAD_KEYS=[['Move · steer','Left stick'],['Look','Right stick'],['Fire · accelerate','RT'],['Aim (hold or toggle) · brake','LT'],['Use · talk · jump','A'],['Crouch','B'],['Reload · horn','X'],['Get in / out','Y'],
  ['Switch gun','D-pad ← → · RB'],['Flashlight · night vision','D-pad ↑ ↓'],['Jog (click)','L3'],['Camera','R3'],['Map','View'],['Pause','Menu'],
  ['Job key G (whistle, call, gear)','LB'],['Job keys T · Tab · Z · X','LB + D-pad ↑ · ↓ · ← · →'],['Choices 1-4','LB + A · B · X · Y'],
  ['Tank','Stick drives · RT fire · LT sight'],['Jet','LS pitch and roll · RT / LT throttle · RB afterburner · X gear · RS rudder'],
  ['Map open','Stick pan · RT / LT zoom · LB / RB places · A travel · B close'],['Menus','D-pad / left stick · A select · B back · LB / RB tabs']];
const TIERS=[[0,'Doors Locked'],[20,'Curtains Twitching'],[40,'Waves From Porches'],[60,'Borrowing Ladders'],[80,'Doors Unlocked']];
const tierOf=t=>{let r=TIERS[0][1];for(const[v,n]of TIERS)if(t>=v)r=n;return r};

/* =====================================================================
   HUD
   ===================================================================== */
const H={settings:{sens:7,ads:55,fov:74,invert:false,fp:false,gfx:'med',subs:true,mmRotate:true,master:80,music:60,sfx:90,voice:100},root:null,touch:false,compact:false,mode:'',state:null,W:innerWidth,Hh:innerHeight,dpr:Math.min(2,window.devicePixelRatio||1)};
const R={}; // element refs

function build(root){
  root.classList.add('ht-root');
  root.innerHTML='';
  const hud=R.hud=el('div','ht-hud',root);
  R.vig=el('div','ht-vig',hud);
  R.scopeWrap=el('div','ht-scope',hud,'<div class="mask"></div>'+scopeSVG());
  R.wm=el('div','ht-wm',hud);
  R.tags=el('div','ht-wm',hud);
  /* centre */
  const c=R.center=el('div','ht-c',hud);
  R.dmg=frag(`<svg class="ht-dmg" viewBox="-150 -150 300 300"><defs><radialGradient id="ht-dmg-grad" cx="0" cy="0" r="150" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#ff3b2a" stop-opacity="0"/><stop offset=".78" stop-color="#ff3b2a" stop-opacity=".95"/><stop offset="1" stop-color="#ff3b2a" stop-opacity="0"/></radialGradient></defs></svg>`);c.appendChild(R.dmg);
  R.xh=el('div','ht-xh',c,'<i class="dot"></i><i class="a-t"></i><i class="a-b"></i><i class="a-l"></i><i class="a-r"></i><i class="ring"></i><i class="chev"><svg width="14" height="8" viewBox="0 0 14 8"><path d="M1 7l6-5.5L13 7" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 7l6-5.5L13 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></i><i class="brk" style="left:-16px;top:-16px;border-width:2px 0 0 2px"></i><i class="brk" style="left:6px;top:-16px;border-width:2px 2px 0 0"></i><i class="brk" style="left:-16px;top:6px;border-width:0 0 2px 2px"></i><i class="brk" style="left:6px;top:6px;border-width:0 2px 2px 0"></i><i class="nf">Hands up · hold fire</i>');
  R.xh.dataset.t='pistol';R.xhA=[...R.xh.querySelectorAll('.a-t,.a-b,.a-l,.a-r')];R.xhRing=R.xh.querySelector('.ring');R.xhChev=R.xh.querySelector('.chev');R.xhChev.style.color='#fff';
  R.hm=el('div','ht-hm',c,'<i></i><i></i><i></i><i></i><div class="hs"></div>');
  [...R.hm.children].slice(0,4).forEach((i,k)=>{i.style.transform=`rotate(${45+k*90}deg) translateY(-11px)`});
  R.rlr=frag('<svg class="ht-rlr" viewBox="0 0 44 44"><circle class="bg" cx="22" cy="22" r="18"/><circle class="fg" cx="22" cy="22" r="18" stroke-dasharray="113.1" stroke-dashoffset="113.1" transform="rotate(-90 22 22)"/></svg>');c.appendChild(R.rlr);R.rlrFg=R.rlr.querySelector('.fg');
  /* objective */
  R.lcol=el('div','ht-lcol',hud);
  R.obj=el('div','ht-obj tx',R.lcol,'<div class="k"><span class="kk">Objective</span><span class="tm" hidden></span></div><div class="t"></div><ul></ul>');
  R.objK=R.obj.querySelector('.kk');R.objTm=R.obj.querySelector('.tm');R.objT=R.obj.querySelector('.t');R.objUl=R.obj.querySelector('ul');R.objLines=[];
  /* compass */
  R.cmp=el('div','ht-cmp',hud,'<canvas></canvas><div class="hd tx">000</div>');R.cmpCv=R.cmp.querySelector('canvas');R.cmpHd=R.cmp.querySelector('.hd');
  /* trust / cash */
  R.tr=el('div','ht-tr tx',hud,`<div class="ht-cash ht-num"><i>$</i><span>0</span></div><div class="ht-trust"><div class="row"><span class="lab">Neighborhood trust</span><span class="pc ht-num">0%</span></div><div class="ht-meter"><b class="ghost"></b><b class="pre"></b><b class="fill"></b><b class="ticks"></b></div><div class="tier">—</div></div><div class="ht-toasts"></div>`);
  R.cash=R.tr.querySelector('.ht-cash');R.cashV=R.cash.querySelector('span');R.trPc=R.tr.querySelector('.pc');R.trFill=R.tr.querySelector('.fill');R.trGhost=R.tr.querySelector('.ghost');R.trPre=R.tr.querySelector('.pre');R.trTier=R.tr.querySelector('.tier');R.toasts=R.tr.querySelector('.ht-toasts');
  R.feed=el('div','ht-feed',hud);
  /* minimap + health + crew */
  R.mm=el('div','ht-mm',hud,'<div class="zone tx"></div><canvas></canvas>');R.mmCv=R.mm.querySelector('canvas');R.mmZone=R.mm.querySelector('.zone');
  R.hp=el('div','ht-hp',hud,'<div class="ar"></div><div class="bars"></div><div class="lbl tx"><span>Health</span><span class="v ht-num"></span></div>');
  R.hpSeg=[];R.arSeg=[];for(let i=0;i<5;i++){const s=el('div','ht-seg',R.hp.querySelector('.bars'),'<u></u><i></i>');R.hpSeg.push({u:s.firstChild,i:s.lastChild})}
  for(let i=0;i<2;i++){const s=el('div','ht-seg',R.hp.querySelector('.ar'),'<i></i>');R.arSeg.push(s.firstChild)}
  R.hpV=R.hp.querySelector('.v');R.crew=el('div','ht-crew tx',R.lcol);R.crewCards=[];
  /* weapon */
  R.wp=el('div','ht-wp tx',hud,'<div class="at"></div><div class="hint"></div><div class="main"><div class="gun"></div><div class="am ht-num"><span class="mag">0</span><span class="res">0</span></div></div><div class="rl"><i></i></div><div class="info"><span class="fm"></span><span class="nm"></span></div><div class="slots"></div>');
  R.wpAt=R.wp.querySelector('.at');R.wpHint=R.wp.querySelector('.hint');R.wpGun=R.wp.querySelector('.gun');R.wpMag=R.wp.querySelector('.mag');R.wpRes=R.wp.querySelector('.res');R.wpRl=R.wp.querySelector('.rl i');R.wpFm=R.wp.querySelector('.fm');R.wpNm=R.wp.querySelector('.nm');R.wpSlots=R.wp.querySelector('.slots');R.wpAm=R.wp.querySelector('.am');
  /* driving */
  R.drv=el('div','ht-drv tx',hud,dialSVG()+'<div class="spd ht-num">0</div><div class="unit">MPH</div><div class="gear">D</div><div class="vh"><div class="row"><span>Minivan</span><b class="ht-num">100%</b></div><div class="vb"><i></i></div><div class="vw"></div></div><div class="hint"><span><b class="ht-kc">H</b>Horn</span><span><b class="ht-kc">Space</b>Brake</span><span><b class="ht-kc">E</b>Exit</span><span><b class="ht-kc">V</b>Hood</span></div>');
  R.drvSpd=R.drv.querySelector('.spd');R.drvGear=R.drv.querySelector('.gear');R.drvNdl=R.drv.querySelector('.ndl');R.drvVal=R.drv.querySelector('.ht-dial-val');R.drvVh=R.drv.querySelector('.vh b');R.drvVb=R.drv.querySelector('.vb');R.drvVbI=R.drv.querySelector('.vb i');R.drvHint=R.drv.querySelector('.hint');R.drvName=R.drv.querySelector('.vh .row span');R.drvWarn=R.drv.querySelector('.vw');R.drvVh0=R.drv.querySelector('.vh');
  /* prompt, subtitles, banner */
  R.pr=el('div','ht-pr off tx',hud,'<div class="gl"><svg viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="15"/><circle class="fg" cx="17" cy="17" r="15" stroke-dasharray="94.25" stroke-dashoffset="94.25"/></svg><b class="ht-kc">E</b></div><div class="tt"></div>');
  R.prK=R.pr.querySelector('.ht-kc');R.prFg=R.pr.querySelector('.fg');R.prT=R.pr.querySelector('.tt');
  R.sub=el('div','ht-sub off',hud,'<span></span>');R.subS=R.sub.firstChild;
  R.bn=el('div','ht-bn',hud,'<div class="sc"></div><div class="lb t"></div><div class="lb b"></div><div class="box"><div class="kick"></div><div class="tt"></div><div class="sb"></div><div class="stamp"></div></div>');
  R.bnBox=R.bn.querySelector('.box');
  /* mission widgets: top-centre column (widgets row, meters, checkpoint), gadgets by the gun, overlay layer */
  R.tc=el('div','ht-tc',hud,'<div class="ht-wg"></div><div class="ht-mt"></div><div class="ht-cp" hidden></div>');R.wg=R.tc.children[0];R.mt=R.tc.children[1];R.cp=R.tc.children[2];
  R.gd=el('div','ht-gd tx');R.wp.insertBefore(R.gd,R.wp.querySelector('.main'));R.gd.hidden=true;
  R.ovl=el('div','ht-ovl',root);
  /* touch */
  R.touch=el('div','ht-touch',root,'<div class="ht-stick"><div class="kn"></div></div>');
  R.stick=R.touch.firstChild;R.knob=R.stick.firstChild;R.tbtn={};
  for(const[a,lab,ic]of[['fire','Fire','fire'],['aim','Aim','aim'],['use','Use','use'],['reload','Reload','reload'],['crouch','Crouch','crouch'],['jump','Jump','jump'],['swap','Gun','swap'],['view','View','view'],['pause','','pause'],['map','','map']]){
    const b=el('div','ht-tb',R.touch,UI_ICON[ic]+(lab?'<span>'+lab+'</span>':''));b.dataset.a=a;R.tbtn[a]=b;
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('dn');try{b.setPointerCapture(e.pointerId)}catch(_){};emit('touch',a,true);if(a==='map'&&!(HUD.blockKeys&&HUD.blockKeys()))MAP.toggle();if(a==='pause')emit('action','pause')});
    const up=e=>{if(!b.classList.contains('dn'))return;b.classList.remove('dn');emit('touch',a,false)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)}
  /* overlays: full map + screens */
  R.map=el('div','ht-map',root);R.map.hidden=true;
  R.scr=el('div','',root);
  addEventListener('resize',resize);resize();
  /* canvas sizes come from a ResizeObserver so the draw loop never forces layout */
  const ro=window.ResizeObserver?new ResizeObserver(es=>es.forEach(en=>{en.target._w=Math.round(en.contentRect.width)})):null;
  for(const cv of [R.cmpCv,R.mmCv]){if(ro)ro.observe(cv);else cv._w=cv.clientWidth}
}
function scopeSVG(){let dots='';for(let i=1;i<=5;i++){const d=i*17;dots+=`<circle cx="${d}" cy="0" r="2.2"/><circle cx="${-d}" cy="0" r="2.2"/><circle cx="0" cy="${d}" r="2.2"/><circle cx="0" cy="${-d}" r="2.2"/>`}
  let rng='';for(let i=1;i<=3;i++){const y=60+i*22,w=26-i*6;rng+=`<path d="M${-w} ${y}h${2*w}" stroke-width="1.4"/>`}
  return `<svg viewBox="-200 -200 400 400"><g stroke="#0a0b0c" fill="#0a0b0c"><path d="M-200 0H-60M60 0H200M0 -200V-60M0 60V200" stroke-width="5"/><path d="M-60 0H-6M6 0H60M0 -60V-6M0 6V60" stroke-width="1.3"/>${dots}<g font-family="Barlow Condensed,sans-serif" font-size="11" font-weight="700" stroke="none">${rng}</g></g><circle r="1.6" fill="#ff3b2a"/><circle r="199" fill="none" stroke="#000" stroke-width="3"/></svg>`}
function dialSVG(){const cx=110,cy=96,r=78,a0=-225,a1=45,max=80;let t='';
  const pt=(a,rr)=>[cx+Math.cos(a*Math.PI/180)*rr,cy+Math.sin(a*Math.PI/180)*rr];
  for(let v=0;v<=max;v+=5){const a=a0+(a1-a0)*v/max,maj=v%10===0;const[x1,y1]=pt(a,r-14),[x2,y2]=pt(a,r-(maj?24:19));t+=`<line class="ht-dial-tick${maj?'':' m'}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    if(maj&&v%20===0){const[nx,ny]=pt(a,r-35);t+=`<text class="ht-dial-num" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}">${v}</text>`}}
  const arc=(f0,f1,rr)=>{const s=pt(a0+(a1-a0)*f0,rr),e=pt(a0+(a1-a0)*f1,rr),large=(a1-a0)*(f1-f0)>180?1:0;return `M${s[0].toFixed(1)} ${s[1].toFixed(1)}A${rr} ${rr} 0 ${large} 1 ${e[0].toFixed(1)} ${e[1].toFixed(1)}`};
  const len=(Math.PI*2*r*(a1-a0)/360).toFixed(1);
  return `<svg class="dial" viewBox="0 0 220 170"><path class="ht-dial-trk" d="${arc(0,1,r)}"/><path class="ht-dial-red" d="${arc(.8125,1,r)}"/><path class="ht-dial-val" d="${arc(0,1,r)}" stroke-dasharray="${len}" stroke-dashoffset="${len}" data-len="${len}"/>${t}<g class="ndl" transform="rotate(-225 ${cx} ${cy})"><path class="ht-dial-ndl" d="M${cx+17} ${cy-2.5}L${cx+r-4} ${cy}L${cx+17} ${cy+2.5}z"/></g><circle cx="${cx}" cy="${cy}" r="15" fill="rgba(10,12,16,.6)" stroke="rgba(255,255,255,.85)" stroke-width="2"/></svg>`}

function resize(){
  H.W=innerWidth;H.Hh=innerHeight;H.dpr=Math.min(2,window.devicePixelRatio||1);
  const coarse=H.forceTouch!=null?H.forceTouch:matchMedia('(pointer:coarse)').matches;H.touch=coarse;
  H.compact=H.forceCompact!=null?H.forceCompact:(H.W<640||(coarse&&H.W<H.Hh));
  if(H.root){H.root.classList.toggle('touch',H.touch);H.root.classList.toggle('compact',H.compact)}
  H.cmpW=0;MM.sized=0;if(MAP.open)MAP.resize();
}

/* ---------------- compass ---------------- */
const CMP={last:'',t:0,fire:[]};
function drawCompass(heading,st,force){
  const cv=R.cmpCv;const w=cv._w,h=30;if(!w)return;
  if(H.cmpW!==w){H.cmpW=w;cv.width=Math.round(w*H.dpr);cv.height=Math.round(h*H.dpr)}
  const T=now();CMP.fire=CMP.fire.filter(f=>T-f.t<3);
  const marks=(st.markers||[]).filter(m=>m.compass!==false&&(m.kind==='obj'||m.kind==='job'||m.kind==='revive'||m.compass));
  const key=Math.round(heading*1800/Math.PI)+'|'+marks.map(m=>m.kind+Math.round(bearingTo(m)*90)).join(',')+'|'+CMP.fire.length+(CMP.fire.length?T.toFixed(1):'');
  if(!force&&key===CMP.last)return;CMP.last=key;
  const cx=cv.getContext('2d');cx.setTransform(H.dpr,0,0,H.dpr,0,0);cx.clearRect(0,0,w,h);
  const span=150,ppd=w/span,hd=heading*180/Math.PI,mid=w/2;
  cx.textAlign='center';cx.textBaseline='alphabetic';cx.shadowColor='rgba(0,0,0,.6)';cx.shadowBlur=3;cx.shadowOffsetY=1;
  const startD=Math.floor((hd-span/2)/5)*5;
  for(let d=startD;d<=hd+span/2;d+=5){const x=mid+(d-hd)*ppd,n=((d%360)+360)%360;
    const card=n%90===0,inter=n%45===0,m15=n%15===0;
    if(card||inter){cx.fillStyle=n===0?'#ffc94a':'#fff';cx.font=(card?'700 16px':'700 12px')+' "Barlow Condensed",sans-serif';cx.fillText(['N','NE','E','SE','S','SW','W','NW'][n/45],x,card?27:26)}
    else if(m15){cx.fillStyle='rgba(255,255,255,.62)';cx.font='600 10px "Barlow Condensed",sans-serif';cx.fillText(String(n),x,25)}
    cx.fillStyle=card?'#fff':'rgba(255,255,255,'+(m15?.75:.4)+')';cx.fillRect(Math.round(x)-.75,card?2:4,1.5,card?8:m15?6:4)}
  cx.shadowBlur=0;cx.shadowOffsetY=0;
  for(const f of CMP.fire){let rel=wrapPi(f.b-heading)*180/Math.PI;if(Math.abs(rel)>span/2)rel=Math.sign(rel)*span/2;const x=mid+rel*ppd,a=1-(T-f.t)/3;
    cx.fillStyle=`rgba(255,90,71,${a})`;cx.beginPath();cx.moveTo(x-6,1);cx.lineTo(x+6,1);cx.lineTo(x,10);cx.fill()}
  for(const m of marks){let rel=wrapPi(bearingTo(m)-heading)*180/Math.PI;const clip=Math.abs(rel)>span/2-6;if(clip)rel=Math.sign(rel)*(span/2-6);const x=mid+rel*ppd;
    cx.shadowColor='rgba(0,0,0,.5)';cx.shadowBlur=3;drawIcon(cx,m.kind==='revive'?'revive':'obj',x,10,clip?11:14,clip?.6:1);cx.shadowBlur=0}
  txt(R.cmpHd,String(Math.round(((hd%360)+360)%360)).padStart(3,'0'));
}
function bearingTo(m){const p=H.player;if(!p)return 0;return Math.atan2(m.x-p.x,-(m.z-p.z))}

/* ---------------- objective ---------------- */
function updObjective(o,timer){
  show(R.obj,!!o);if(!o)return;
  const key=o.title||'';if(R.obj._title!==key){R.obj._title=key;txt(R.objT,key);R.obj.classList.remove('new');void 0;anim(R.obj,[{opacity:0,transform:'translateX(-14px)'},{opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'});R.objUl.innerHTML='';R.objLines=[]}
  txt(R.objK,o.kicker||'Objective');
  const lines=o.lines||[];
  while(R.objLines.length<lines.length){const li=el('li','',R.objUl);li.innerHTML='<span class="x"></span><span class="ct"></span>';R.objLines.push({li,x:li.firstChild,ct:li.lastChild,done:null});anim(li,[{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'})}
  while(R.objLines.length>lines.length){R.objLines.pop().li.remove()}
  lines.forEach((ln,i)=>{const r=R.objLines[i];const L=typeof ln==='string'?{text:ln}:ln;
    let t=L.text||'',ct='';const mm=/^(.*?)(\s*[·:-]?\s*\d+\s*\/\s*\d+)$/.exec(t);if(L.count)ct=L.count;else if(mm){t=mm[1];ct=mm[2].replace(/^\s*[·:-]?\s*/,'')}
    txt(r.x,t);txt(r.ct,ct);cls(r.li,'warn',L.warn);
    const d=!!L.done;if(r.done!==d){r.li.classList.toggle('done',d);
      if(d&&r.done===false)anim(r.li,[{backgroundColor:'rgba(127,220,110,.38)',transform:'translateX(4px)'},{backgroundColor:'rgba(127,220,110,0)',transform:'none'}],{duration:900,easing:'cubic-bezier(.2,.8,.2,1)'});
      r.done=d}});
  const hasT=timer!=null&&timer>=0;show(R.objTm,hasT);
  if(hasT){const s=Math.ceil(timer);txt(R.objTm,Math.floor(s/60)+':'+String(s%60).padStart(2,'0'));cls(R.objTm,'hot',timer<=30)}
}

/* ---------------- trust & cash ---------------- */
const TR={v:null,disp:0,cash:null,cashDisp:0,cashFrom:0,cashT:1};
function updTrust(st,dt){
  if(st.trustLabel&&st.trustLabel!==TR.lab){TR.lab=st.trustLabel;const lb=R.tr.querySelector('.ht-trust .lab');if(lb)lb.textContent=st.trustLabel;TR.v=null}/* region meter: switching it is not a trust change */
  const t=clamp(+st.trust||0,0,100);
  if(TR.v==null){TR.v=t;sty(R.trGhost,'transform',`scaleX(${t/100})`)}
  if(Math.abs(t-TR.v)>=.5){const d=t-TR.v;toast((d>0?'+':'')+Math.round(d)+' trust',d<0?'neg':'');
    if(d<0){sty(R.trGhost,'transform',`scaleX(${TR.v/100})`);R.trGhost.style.transition='none';requestAnimationFrame(()=>{R.trGhost.style.transition='';R.trGhost._s.transform='';sty(R.trGhost,'transform',`scaleX(${t/100})`)})}
    else sty(R.trGhost,'transform',`scaleX(${t/100})`);TR.v=t}
  sty(R.trFill,'transform',`scaleX(${t/100})`);
  const t2=st.trust2!=null?clamp(+st.trust2,0,100):null;show(R.trPre,t2!=null&&t2>t);if(t2!=null)sty(R.trPre,'transform',`scaleX(${t2/100})`);
  txt(R.trPc,Math.round(t)+'%');txt(R.trTier,tierOf(t));
  /* cash count-up */
  if(st.cash!=null){const c=Math.round(st.cash);
    if(TR.cash==null){TR.cash=c;TR.cashDisp=c;TR.cashT=1}
    else if(c!==TR.cash){const d=c-TR.cash;if(Math.abs(d)>=1)toast((d>0?'+$':'-$')+Math.abs(d).toLocaleString('en-US'),d>0?'cash':'neg');TR.cashFrom=TR.cashDisp;TR.cash=c;TR.cashT=0;if(d>0)anim(R.cash,[{transform:'scale(1)'},{transform:'scale(1.07)',color:'#9fe58a'},{transform:'scale(1)'}],{duration:520,easing:'ease-out'})}
    if(TR.cashT<1){TR.cashT=Math.min(1,TR.cashT+dt/0.9);const e=1-Math.pow(1-TR.cashT,3);TR.cashDisp=Math.round(lerp(TR.cashFrom,TR.cash,e))}
    txt(R.cashV,TR.cashDisp.toLocaleString('en-US'))}
  show(R.cash,st.cash!=null);
}
function toast(text,kind){const t=el('div','ht-toast ht-num '+(kind||''),null,esc(text));R.toasts.prepend(t);
  while(R.toasts.children.length>3)R.toasts.lastChild.remove();
  const a=anim(t,[{opacity:0,transform:'translateY(-6px)',easing:'ease-out'},{opacity:1,transform:'none',offset:.12},{opacity:1,transform:'none',offset:.8,easing:'ease-in'},{opacity:0,transform:'translateY(4px)'}],{duration:2200,fill:'forwards'});
  if(a)a.onfinish=()=>t.remove();else setTimeout(()=>t.remove(),2200)}

/* ---------------- feed ---------------- */
function feed(text,kind='info',value){
  const ic={cuff:'cuff',kill:'kill',trust:'star',cash:'cash',bad:'bad',info:'info'}[kind]||'info';
  const it=el('div','ht-fi '+kind,null,UI_ICON[ic]+'<span>'+esc(text)+'</span>'+(value!=null?'<b>'+esc(value)+'</b>':''));
  R.feed.prepend(it);while(R.feed.children.length>5)R.feed.lastChild.remove();
  anim(it,[{opacity:0,transform:'translateX(24px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
  setTimeout(()=>{const a=anim(it,[{opacity:1},{opacity:0,transform:'translateX(12px)'}],{duration:400,fill:'forwards'});if(a)a.onfinish=()=>it.remove();else it.remove()},4200);
}

/* ---------------- health / armour ---------------- */
const HP={v:null,chip:100,chipHold:0,regen:0,hit:0};
function updHealth(st,dt){
  const max=st.hpMax||100,v=clamp((st.hp??max)/max*100,0,100);
  if(HP.v==null){HP.v=v;HP.chip=v}
  if(v<HP.v-.01){HP.hit=.3;HP.chipHold=.5;HP.chip=Math.max(HP.chip,HP.v)}else if(v>HP.v+.01){HP.regen=.35}
  HP.v=v;HP.hit-=dt;HP.regen-=dt;
  if(HP.chipHold>0)HP.chipHold-=dt;else HP.chip=Math.max(v,HP.chip-dt*60);
  for(let i=0;i<5;i++){const f=clamp((v-i*20)/20,0,1),c=clamp((HP.chip-i*20)/20,0,1);
    sty(R.hpSeg[i].i,'transform',`scaleX(${f.toFixed(3)})`);sty(R.hpSeg[i].u,'transform',`scaleX(${c.toFixed(3)})`)}
  const ar=clamp(st.armor||0,0,100);show(R.hp.firstChild,st.armor!=null);for(let i=0;i<2;i++)sty(R.arSeg[i],'transform',`scaleX(${clamp((ar-i*50)/50,0,1).toFixed(3)})`);
  cls(R.hp,'low',v<=25);cls(R.hp,'regen',HP.regen>0&&v<100);cls(R.hp,'hit',HP.hit>0);
  txt(R.hpV,Math.ceil(v));
  const vig=clamp((1-v/100)*1.15-.25,0,.9)+clamp(HP.hit,0,.3)*1.4;sty(R.vig,'opacity',vig.toFixed(2));
}

/* ---------------- crew ---------------- */
const CREW_COL=['#3b6ea8','#b33a3a','#c77d2a','#5e6b4a','#7d6b8f','#2f8a7a'];
function initials(n){const w=String(n||'?').replace(/^(coach|big|uncle|mr\.?)\s+/i,'').split(/\s+/);return (w[0][0]+(w[1]?w[1][0]:'')).toUpperCase()}
function updCrew(crew){
  crew=crew||[];
  while(R.crewCards.length<crew.length){const c=el('div','ht-cc',R.crew,'<div class="pt"><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" stroke="rgba(0,0,0,.25)"/><circle class="rg" cx="19" cy="19" r="17" stroke="#ff5a47" stroke-dasharray="106.8" stroke-dashoffset="106.8"/></svg><span></span></div><div><div class="nm"></div><div class="hb"><i></i></div><div class="st"></div></div>');
    R.crewCards.push({c,pt:c.firstChild,ini:c.querySelector('.pt span'),rg:c.querySelector('.rg'),nm:c.querySelector('.nm'),hb:c.querySelector('.hb i'),st:c.querySelector('.st'),hbw:c.querySelector('.hb')})}
  while(R.crewCards.length>crew.length)R.crewCards.pop().c.remove();
  crew.forEach((m,i)=>{const r=R.crewCards[i];txt(r.nm,m.name);txt(r.ini,m.initials||initials(m.name));sty(r.pt,'--c',m.color||CREW_COL[i%CREW_COL.length]);
    const hp=clamp(m.hp??100,0,100);sty(r.hb,'transform',`scaleX(${hp/100})`);
    const down=!!m.down,rev=down&&m.reviving!=null&&m.reviving!==false&&m.reviving>0;
    cls(r.c,'down',down);cls(r.c,'rev',rev);show(r.hbw,!down);
    let st='';let ring=0,col='#ff5a47';
    if(rev){st='Reviving';ring=+m.reviving||0;col='#7fdc6e'}
    else if(down){const t=m.bleed!=null?Math.ceil(m.bleed):null;st=t!=null?'Down · '+t+'s':'Down · revive';ring=m.bleedMax?clamp(m.bleed/m.bleedMax,0,1):0}
    txt(r.st,st);show(r.st,!!st);attr(r.rg,'stroke',col);attr(r.rg,'stroke-dashoffset',(106.8*(1-ring)).toFixed(1))});
}

/* ---------------- weapon ---------------- */
const WP={type:null,name:null,maxMag:{},slotsKey:''};
function updWeapon(st){
  const w=st.weapon;const drive=st.mode==='drive';
  show(R.wp,!!w&&!drive);show(R.drv,drive);
  if(!w||drive)return;
  const type=gunKey(w.type||'pistol');const holst=!!w.holstered;
  if(WP.type!==type||WP.name!==w.name){if(WP.type!=null)anim(R.wp.querySelector('.main'),[{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'});WP.type=type;WP.name=w.name;htm(R.wpGun,gunSVG(type))}
  const mag=w.mag|0,res=w.reserve|0;const mx=w.magSize||(WP.maxMag[w.name]=Math.max(WP.maxMag[w.name]||0,mag));
  show(R.wpAm,!holst);txt(R.wpMag,mag);txt(R.wpRes,res);
  const rl=w.reloading>0&&w.reloading<1;
  cls(R.wpMag,'low',!rl&&mag>0&&mag<=Math.max(1,Math.floor(mx*.25)));cls(R.wpMag,'empty',mag===0);
  cls(R.wp,'rel',rl);sty(R.wpRl,'transform',`scaleX(${rl?w.reloading.toFixed(3):0})`);
  txt(R.wpFm,w.firemode||FM_OF[type]||'Semi');txt(R.wpNm,holst?'Holstered':w.name||'');
  const key=H.touch?'':'R';
  txt(R.wpHint,rl?'Reloading':mag===0&&!holst?(res>0?(key?'Press R to reload':'Tap reload'):'Out of ammo'):'');
  const slots=st.weapons||[];const sk=slots.map(s=>(s.type||'')+(s.name||'')).join('|');
  if(sk!==WP.slotsKey){WP.slotsKey=sk;R.wpSlots.innerHTML='';slots.forEach((s,i)=>{const d=el('div','ht-sl',R.wpSlots,'<span class="k">'+esc(s.key||i+1)+'</span>'+gunSVG(gunKey(s.type||'pistol')));d._n=s.name})}
  [...R.wpSlots.children].forEach((d,i)=>cls(d,'on',slots[i]&&(slots[i].active||slots[i].name===w.name)));
}
function updDrive(st){
  if(st.mode!=='drive')return;
  const mph=Math.max(0,Math.round(Math.abs(st.speedMph||0)));txt(R.drvSpd,mph);
  const f=clamp(mph/80,0,1);const len=+R.drvVal.dataset.len;attr(R.drvVal,'stroke-dashoffset',(len*(1-f)).toFixed(1));
  attr(R.drvNdl,'transform',`rotate(${(-225+270*f).toFixed(1)} 110 96)`);
  const g=st.gear!=null?String(st.gear):(st.speedMph<-0.5?'R':'D');txt(R.drvGear,g);cls(R.drvGear,'r',g==='R');
  let vh=st.vanHealth??1;if(vh>1)vh/=100;vh=clamp(vh,0,1);txt(R.drvVh,Math.round(vh*100)+'%');sty(R.drvVbI,'transform',`scaleX(${vh})`);cls(R.drvVb,'low',vh<.3);/* car health bands (index.html CAR_BAND): 0 fine · 1 dented · 2 pulling · 3 smoking · 4 limp · 5 broken down */
  const band=clamp(st.vehicleBand|0,0,5);if(R.drvVh0&&R.drvVh0.dataset.band!==String(band))R.drvVh0.dataset.band=band;const vw=st.vehicleWarn||'';txt(R.drvWarn,vw);show(R.drvWarn,!!vw);
  txt(R.drvName,st.vehicleName||'Minivan');
  show(R.drvHint,!H.touch);
}

/* ---------------- crosshair / hit / damage ---------------- */
const XH={hit:0,kill:0,head:0,lastHit:null,lastKill:null,lastHead:null,scope:false};
function updCrosshair(st,dt){
  const c=st.crosshair||{};const w=st.weapon||{};const type=gunKey(w.type||'pistol');
  const drive=st.mode==='drive',hide=!!c.hidden||drive||!st.weapon;
  let xt=XH_OF[type]||'pistol';const scoped=xt==='scope'&&c.ads&&(c.adsT==null||c.adsT>.8);
  if(st.mode!=='mission'&&w.holstered)xt='none';
  R.xh.dataset.t!==xt&&(R.xh.dataset.t=xt);
  cls(R.scopeWrap,'on',scoped&&!hide);if(scoped!==XH.scope){XH.scope=scoped;sty(R.scopeWrap,'--sr',Math.round(Math.min(H.W,H.Hh)*.46)+'px')}
  sty(R.xh,'opacity',hide||scoped?'0':(st.mode==='mission'?'1':'.55'));
  cls(R.xh,'nofire',!!c.noFire);
  /* spread is roughly radians; convert to pixels with the vertical FOV if given */
  const fov=(c.fov||72)*Math.PI/180;const px=Math.min(240,(c.spread||0)/Math.tan(fov/2)*(H.Hh/2));
  const gap=Math.round((4+px)*2)/2;
  if(xt==='pistol'||xt==='smg'){const g=xt==='smg'?gap+1:gap;sty(R.xhA[0],'transform',`translateY(${-g-4.5}px)`);sty(R.xhA[1],'transform',`translateY(${g+4.5}px)`);sty(R.xhA[2],'transform',`translateX(${-g-4.5}px)`);sty(R.xhA[3],'transform',`translateX(${g+4.5}px)`)}
  else if(xt==='rifle'){sty(R.xhA[1],'transform',`translateY(${gap+10}px)`);sty(R.xhA[2],'transform',`translateX(${-gap-6}px)`);sty(R.xhA[3],'transform',`translateX(${gap+6}px)`)}
  else if(xt==='shotgun'){const r=Math.max(14,px+6);sty(R.xhRing,'transform',`scale(${(r/50).toFixed(3)})`);sty(R.xhRing,'borderWidth',(1.5*50/r).toFixed(2)+'px')}
  /* hit markers: counters or rising-edge booleans */
  const edge=(k,lk)=>{const v=c[k];const f=v&&v!==XH[lk];XH[lk]=v;return f};
  const hk=edge('kill','lastKill'),hh=edge('headshot','lastHead'),hi=edge('hit','lastHit');
  if(hk||hh)hit(hh?'head':'kill');else if(hi)hit('hit');
  /* reload ring at the crosshair */
  const rl=w.reloading>0&&w.reloading<1&&!hide;cls(R.rlr,'on',rl);if(rl)attr(R.rlrFg,'stroke-dashoffset',(113.1*(1-w.reloading)).toFixed(1));
}
function hit(kind='hit'){
  /* kinds: hit, kill, head (headshot kill), headhit (headshot, still standing) */
  const head=kind==='head'||kind==='headhit',k=kind==='kill'||kind==='head';cls(R.hm,'kill',k);
  const big=kind==='head'?1.45:k?1.25:head?1.2:1;
  anim(R.hm,[{opacity:1,transform:`scale(${big*1.35})`,easing:'cubic-bezier(.2,.8,.2,1)'},{opacity:1,transform:`scale(${big})`,offset:.3,easing:'ease-in'},{opacity:0,transform:`scale(${big})`}],{duration:k?560:280});
  if(head)anim(R.hm.querySelector('.hs'),[{opacity:.9,transform:'scale(.6)'},{opacity:0,transform:'scale(1.8)'}],{duration:500,easing:'ease-out'});
}
/* ammo pickups next to the gun: '+24 9mm', '9mm full'. Two lines at most, newest on top */
function ammoToast(text,color){if(!R.wpAt)return;const t=el('div','ht-at ht-num'+(/full$/i.test(text)?' full':''),null,esc(text));if(color)t.style.color=color;
  R.wpAt.prepend(t);while(R.wpAt.children.length>2)R.wpAt.lastChild.remove();
  const a=anim(t,[{opacity:0,transform:'translateY(6px)',easing:'ease-out'},{opacity:1,transform:'none',offset:.1},{opacity:1,offset:.75,easing:'ease-in'},{opacity:0,transform:'translateY(-4px)'}],{duration:2000,fill:'forwards'});
  if(a)a.onfinish=()=>t.remove();else setTimeout(()=>t.remove(),2000)}
/* damage(from): from = {x,z} world point, or {angle} radians relative to view (0 = ahead, +right) */
function damage(from,amount=10){
  let rel;if(from&&from.angle!=null)rel=from.angle;else if(from&&H.player){const b=Math.atan2(from.x-H.player.x,-(from.z-H.player.z));rel=wrapPi(b-H.heading);CMP.fire.push({b,t:now()})}else rel=0;
  if(from&&from.angle!=null)CMP.fire.push({b:H.heading+from.angle,t:now()});
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  const r0=100,r1=128,sp=.3;const a=-Math.PI/2+rel;const pt=(r,t)=>[(Math.cos(a+t)*r).toFixed(1),(Math.sin(a+t)*r).toFixed(1)];
  const[x0,y0]=pt(r1,-sp),[x1,y1]=pt(r1,sp),[x2,y2]=pt(r0,sp),[x3,y3]=pt(r0,-sp);
  p.setAttribute('d',`M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`);
  R.dmg.appendChild(p);
  const o=clamp(.45+amount/40,.45,1);const an=anim(p,[{opacity:o},{opacity:o,offset:.3,easing:'ease-out'},{opacity:0}],{duration:1400,fill:'forwards'});
  if(an)an.onfinish=()=>p.remove();else setTimeout(()=>p.remove(),1400);
  while(R.dmg.querySelectorAll('path').length>6)R.dmg.querySelector('path').remove();
  HP.hit=.3;
}

/* ---------------- world markers + name tags ---------------- */
const MK=new Map(),TG=new Map();
const EDGE_KINDS={obj:1,job:1,revive:1,van:1};
function updMarkers(list){
  const W=H.W,Hh=H.Hh,cx=W/2,cy=Hh/2;const mT=H.compact?150:96,mB=H.compact?320:130,mX=H.compact?28:56;
  const seen=new Set();
  for(const m of list||[]){if(!m.screen||m.world===false)continue;const id=m.id??(m.kind+m.x+m.z);seen.add(id);
    let r=MK.get(id);if(r&&r.kind!==m.kind){r.e.remove();MK.delete(id);r=null}/* same id, new kind: rebuild the icon */
    if(!r){const e=el('div','ht-mk pop '+(m.kind||'obj'),R.wm,'<div class="ar"><svg viewBox="0 0 14 10" width="14" height="10"><path d="M0 10L7 0l7 10z" fill="currentColor" stroke="rgba(0,0,0,.5)"/></svg></div><div class="ic">'+iconSVG(m.kind||'obj')+'</div><div class="lb"><span class="l"></span><span class="ds ht-num"></span></div>');
      r={e,ar:e.firstChild,l:e.querySelector('.l'),ds:e.querySelector('.ds'),lb:e.querySelector('.lb'),kind:m.kind};MK.set(id,r);setTimeout(()=>e.classList.remove('pop'),500)}
    const s=m.screen;let x=s.x,y=s.y,behind=!!s.behind;
    const inside=!behind&&x>=mX&&x<=W-mX&&y>=mT&&y<=Hh-mB;
    const edge=m.edge!=null?m.edge:!!EDGE_KINDS[m.kind];
    if(!inside&&!edge){show(r.e,false);continue}show(r.e,true);
    let ang=null;
    if(!inside){let dx=x-cx,dy=y-cy;if(behind){dx=-dx;dy=Math.max(Math.abs(dy),Hh*.25)}if(Math.abs(dx)<1&&Math.abs(dy)<1)dy=1;
      /* clamp onto an ellipse around the crosshair so edge arrows never sit on corner widgets */
      const ex=H.compact?W*.4:Math.min(W*.36,Hh*.62),ey=H.compact?Hh*.22:Hh*.34;const k=1/Math.sqrt((dx*dx)/(ex*ex)+(dy*dy)/(ey*ey));x=cx+dx*k;y=cy+dy*k;ang=Math.atan2(dy,dx);
      /* keep edge arrows out of the corner widgets and, on phones, the touch buttons */
      y=clamp(y,mT,Hh-(H.touch?390:mB));x=clamp(x,mX,W-mX)}
    cls(r.e,'edge',ang!=null);
    if(ang!=null)sty(r.ar,'transform',`rotate(${(ang*180/Math.PI+90).toFixed(0)}deg) translateY(-12px)`);
    sty(r.e,'transform',`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`);
    const d=m.dist!=null?m.dist:(H.player?Math.hypot(m.x-H.player.x,m.z-H.player.z):null);
    const nearC=Math.hypot(x-cx,y-cy)<Math.min(W,Hh)*.28;
    txt(r.l,m.label||'');txt(r.ds,d!=null?(d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m'):'');
    cls(r.e,'far',!(nearC||m.always||(d!=null&&d<25)||ang!=null&&m.kind!=='van'));
    cls(r.e,'near',d!=null&&d<4);
  }
  for(const[id,r]of MK)if(!seen.has(id)){r.e.remove();MK.delete(id)}
}
function updTags(list){const seen=new Set();
  for(const t of list||[]){const id=t.id;seen.add(id);let r=TG.get(id);if(!r){r={e:el('div','ht-tag',R.tags)};TG.set(id,r)}
    const s=t.screen;const vis=s&&!s.behind;show(r.e,vis);if(!vis)continue;
    txt(r.e,t.text||'');sty(r.e,'color',t.color||({ally:'#7fdc6e',down:'#ff5a47',surr:'#ffc94a',homie:'#ffc94a',boss:'#ff5a47'}[t.kind]||'#fff'));
    sty(r.e,'transform',`translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0) translate(-50%,-100%)`)}
  for(const[id,r]of TG)if(!seen.has(id)){r.e.remove();TG.delete(id)}}

/* ---------------- prompt / subtitles / banner ---------------- */
function updPrompt(p){
  cls(R.pr,'off',!p);if(!p)return;
  const k=H.touch?null:(p.key||'E');
  if(R.pr._touch!==H.touch){R.pr._touch=H.touch;const gl=R.pr.querySelector('.gl');const old=gl.querySelector('.ht-kc,.tap');old&&old.remove();R.prK=el('b',H.touch?'tap':'ht-kc',gl,H.touch?'USE':'E')}
  if(k)txt(R.prK,k);
  htm(R.prT,esc(p.text||'')+(p.sub?'<small>'+esc(p.sub)+'</small>':(p.hold&&!(p.progress>0)?'<small>Hold</small>':'')));
  attr(R.prFg,'stroke-dashoffset',(94.25*(1-clamp(p.progress||0,0,1))).toFixed(1));
}
const SPK_COL={gary:'#c7b4ff',rick:'#ff8a7a',dave:'#ffb46b',doug:'#a8d08d',you:'#6fb8ff',radio:'#6fb8ff'};
function updSubs(s){
  if(typeof s==='string')s={text:s};const on=!!(s&&s.text)&&H.subsOn!==false;cls(R.sub,'off',!on);if(!on)return;
  const sp=s.speaker||'';const col=s.color||SPK_COL[String(sp).toLowerCase().split(' ').pop()]||SPK_COL[String(sp).toLowerCase()]||'#ffc94a';
  const key=sp+'|'+s.text;if(R.sub._k!==key){R.sub._k=key;R.subS.innerHTML=(sp?'<b>'+esc(sp)+'</b>':'')+esc(s.text);sty(R.sub,'--sc',col)}
}
let BN={key:'',t:0,dur:0,end:0};
function banner(b){
  if(!b){R.bn.classList.remove('lbx');cls(R.hud,'cine',false);anim(R.bnBox,[{opacity:1},{opacity:0}],{duration:250,fill:'forwards'});BN.t=0;return}
  const kind=b.kind||'title';R.bn.className='ht-bn '+(kind==='done'?'done':kind==='fail'?'fail':'');
  R.bn.querySelector('.kick').textContent=b.kicker||({title:'New job',done:'Job done',fail:'Job failed'}[kind]||'');
  R.bn.querySelector('.tt').textContent=b.title||'';R.bn.querySelector('.sb').textContent=b.sub||'';
  const stp=R.bn.querySelector('.stamp');stp.innerHTML=(b.stats||[]).map(([k,v])=>'<span>'+esc(k)+' <b>'+esc(v)+'</b></span>').join('');show(stp,!!(b.stats&&b.stats.length));
  if(kind==='title'||b.letterbox){requestAnimationFrame(()=>R.bn.classList.add('lbx'));cls(R.hud,'cine',true)}
  anim(R.bn.querySelector('.sc'),[{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.85},{opacity:0}],{duration:(b.dur||(kind==='title'?4:3.6))*1000,fill:'forwards'});
  const dur=(b.dur||(kind==='title'?4:3.6))*1000;BN.t=dur/1000;BN.end=now()+BN.t;
  anim(R.bnBox,[{opacity:0,transform:'translateY(14px) scale(1.04)',filter:'blur(6px)',easing:'cubic-bezier(.2,.8,.2,1)'},{opacity:1,transform:'none',filter:'blur(0)',offset:.14},{opacity:1,transform:'none',filter:'blur(0)',offset:.88,easing:'cubic-bezier(.5,0,.75,0)'},{opacity:0,transform:'translateY(-6px)',filter:'blur(2px)'}],{duration:dur,fill:'forwards'});
  if(kind==='done'||kind==='fail')anim(R.bn.querySelector('.tt'),[{transform:'scale(1.35)',letterSpacing:'.08em'},{transform:'scale(1)',letterSpacing:'.005em'}],{duration:600,easing:'cubic-bezier(.3,1.45,.45,1)'});
}

/* =====================================================================
   MINIMAP
   ===================================================================== */
const LEGEND={',':'road','.':'floor','g':'grass','s':'walk','h':'building','t':'tree','f':'hedge','#':'wall','c':'crate','V':'car','X':'car','l':'lamp','w':'water','T':'prop','Q':'prop','I':'prop','a':'prop','~':'water','d':'dirt','p':'parking'};
const GROUND={grass:'#3a4c33',road:'#7d858d',walk:'#5a636b',floor:'#626a74',water:'#2d5877',dirt:'#5a4f3e',parking:'#6b737b'};
const MMPX=12;
const MM={grid:null,W:0,H:0,tile:2,base:null,rev:null,fog:false,seen:null,route:null,routeTo:null,routeAt:0,lastTile:-1,enemy:new Map(),t:0,sized:0,zoom:1,pins:[],name:''};
function cellClass(ch,o){const lg=o.legend||{};return lg[ch]||LEGEND[ch]||null}
function groundOf(ch,o){let c=cellClass(ch,o);if(c&&GROUND[c])return c;
  const u=o.under&&o.under[ch];if(u){const uc=cellClass(u,o);if(uc&&GROUND[uc])return uc}
  const fl='#cTaIEB'.includes(ch)?(o.inside||o.floor):o.floor;const fc=fl&&cellClass(fl,o);return fc&&GROUND[fc]?fc:'grass'}
function setLevel(grid,o={}){
  const g=grid.map(r=>typeof r==='string'?r.split(''):r.slice());const Hh=g.length,W=Math.max(...g.map(r=>r.length));
  for(const r of g)while(r.length<W)r.push(o.pad||'g');
  Object.assign(MM,{grid:g,W,H:Hh,tile:o.tile||2,opts:o,route:null,routeTo:null,lastTile:-1,name:o.name||'',interior:!!o.interior});MM.enemy.clear();
  MM.px=o.px||MMPX;/* big maps on phones pass a smaller px per tile */
  const cv=document.createElement('canvas');cv.width=W*MM.px;cv.height=Hh*MM.px;const c=cv.getContext('2d');const P=MM.px;
  /* ground */
  for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){c.fillStyle=GROUND[groundOf(g[z][x],o)];c.fillRect(x*P,z*P,P,P)}
  /* subtle texture: lawn stripes */
  c.globalAlpha=.05;c.fillStyle='#fff';for(let z=0;z<Hh;z+=2)c.fillRect(0,z*P,W*P,P);c.globalAlpha=1;
  /* curbs: thin dark edge where sidewalk meets road / grass */
  const at=(x,z)=>z>=0&&z<Hh&&x>=0&&x<W?groundOf(g[z][x],o):null;
  c.fillStyle='rgba(0,0,0,.28)';
  for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){if(at(x,z)!=='road')continue;
    if(at(x,z-1)==='walk')c.fillRect(x*P,z*P,P,1.5);if(at(x,z+1)==='walk')c.fillRect(x*P,z*P+P-1.5,P,1.5);
    if(at(x-1,z)==='walk')c.fillRect(x*P,z*P,1.5,P);if(at(x+1,z)==='walk')c.fillRect(x*P+P-1.5,z*P,1.5,P)}
  /* lane markings */
  if(o.lines){c.strokeStyle='rgba(255,214,120,.55)';c.lineWidth=1.4;c.setLineDash([6,6]);for(const[or,k]of o.lines){const m=k*P+P/2;c.beginPath();if(or==='h'){c.moveTo(P,m);c.lineTo(W*P-P,m)}else{c.moveTo(m,P);c.lineTo(m,Hh*P-P)}c.stroke()}c.setLineDash([])}
  /* buildings: merge rectangles */
  const seen=new Uint8Array(W*Hh);
  for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){if(cellClass(g[z][x],o)!=='building'||seen[z*W+x])continue;let x1=x;while(x1<W&&cellClass(g[z][x1],o)==='building')x1++;let z1=z;while(z1<Hh&&cellClass(g[z1][x],o)==='building')z1++;
    for(let zz=z;zz<z1;zz++)for(let xx=x;xx<x1;xx++)seen[zz*W+xx]=1;
    const bx=x*P+2,bz=z*P+2,bw=(x1-x)*P-4,bh=(z1-z)*P-4;
    c.fillStyle='rgba(0,0,0,.35)';rr(c,bx+2,bz+3,bw,bh,2);c.fill();
    c.fillStyle='#b9b2a4';rr(c,bx,bz,bw,bh,2);c.fill();c.fillStyle='#cfc8b9';rr(c,bx+2,bz+2,bw-4,bh/2-2,1.5);c.fill();
    c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=1;rr(c,bx+.5,bz+.5,bw-1,bh-1,2);c.stroke()}
  /* walls (interior floor plans) */
  for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){const k=cellClass(g[z][x],o);
    if(k==='wall'){c.fillStyle='#e6e0d2';const n=(dx,dz)=>{const ch=g[z+dz]&&g[z+dz][x+dx];return ch&&cellClass(ch,o)==='wall'};
      const t=P*.3;c.fillRect(x*P+P/2-t,z*P+P/2-t,2*t,2*t);if(n(-1,0))c.fillRect(x*P,z*P+P/2-t,P/2,2*t);if(n(1,0))c.fillRect(x*P+P/2,z*P+P/2-t,P/2,2*t);if(n(0,-1))c.fillRect(x*P+P/2-t,z*P,2*t,P/2);if(n(0,1))c.fillRect(x*P+P/2-t,z*P+P/2,2*t,P/2)}
    else if(k==='tree'){c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.arc(x*P+P/2+1.5,z*P+P/2+2,P*.52,0,TAU);c.fill();c.fillStyle='#2a3d25';c.beginPath();c.arc(x*P+P/2,z*P+P/2,P*.52,0,TAU);c.fill();c.fillStyle='#35502e';c.beginPath();c.arc(x*P+P/2-1.5,z*P+P/2-1.5,P*.3,0,TAU);c.fill()}
    else if(k==='hedge'){c.fillStyle='#2c4227';c.fillRect(x*P,z*P+P*.2,P,P*.6)}
    else if(k==='crate'){c.fillStyle='#7a6447';c.fillRect(x*P+2,z*P+2,P-4,P-4)}
    else if(k==='prop'){c.fillStyle='#8c8577';c.fillRect(x*P+3,z*P+3,P-6,P-6)}
    else if(k==='car'){c.fillStyle='rgba(20,24,28,.55)';rr(c,x*P-P*.6,z*P+P*.18,P*2.2,P*.64,2);c.fill()}
    else if(k==='lamp'){c.fillStyle='rgba(255,236,170,.9)';c.beginPath();c.arc(x*P+P/2,z*P+P/2,1.6,0,TAU);c.fill()}}
  MM.base=cv;MM.outside=o.outside||(o.interior?'#14181d':GROUND.grass);
  /* fog of war for interiors: floor + wall cells start hidden */
  MM.fog=!!(o.fog||o.interior);
  if(MM.fog){MM.seen=new Uint8Array(W*Hh);MM.rev=document.createElement('canvas');MM.rev.width=cv.width;MM.rev.height=cv.height;const rc=MM.rev.getContext('2d');
    for(let z=0;z<Hh;z++)for(let x=0;x<W;x++){const k=cellClass(g[z][x],o),gr=groundOf(g[z][x],o);if(!(k==='wall'||gr==='floor'||('#cTaIEB'.includes(g[z][x])&&o.inside&&groundOf(o.inside,o)==='floor'))){MM.seen[z*W+x]=1;rc.drawImage(cv,x*P,z*P,P,P,x*P,z*P,P,P)}}}
  else{MM.seen=null;MM.rev=null}
  MAP.dirty=true;
}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function isSolidCh(ch){const k=cellClass(ch,MM.opts||{});return k==='wall'||k==='building'}
function reveal(px,pz){if(!MM.fog)return;const T=MM.tile,tx=Math.floor(px/T),tz=Math.floor(pz/T);const id=tz*MM.W+tx;if(id===MM.lastTile)return;MM.lastTile=id;
  const rc=MM.rev.getContext('2d'),P=MM.px,R0=9;
  for(let a=0;a<96;a++){const ang=a/96*TAU,dx=Math.cos(ang),dz=Math.sin(ang);let x=tx+.5,z=tz+.5;
    for(let s=0;s<R0*3;s++){const cx=Math.floor(x),cz=Math.floor(z);if(cx<0||cz<0||cx>=MM.W||cz>=MM.H)break;const k=cz*MM.W+cx;
      if(!MM.seen[k]){MM.seen[k]=1;rc.drawImage(MM.base,cx*P,cz*P,P,P,cx*P,cz*P,P,P);MAP.dirty=true}
      /* also reveal the wall ring around a seen cell so rooms read as closed shapes */
      if(isSolidCh(MM.grid[cz][cx]))break;if(Math.hypot(cx+.5-tx-.5,cz+.5-tz-.5)>R0)break;x+=dx*.34;z+=dz*.34}}}
/* road-preferring route on the tile grid (Dijkstra). from/to in world metres. returns [{x,z}] ([] when there is no route).
   Bounded: the cost grid and the search buffers are built once per level (and drive/walk mode), a start or end on a solid tile
   (a roof, inside a building) snaps to the nearest walkable tile within 16 tiles, and the search gives up after a node budget,
   so a far or unreachable target can never stall the page. */
const RT={key:null,cost:null,dist:null,prev:null,hd:null,hi:null,stats:{runs:0,pops:0,gaveUp:0,ms:0}};
function routeCost(drive){const g=MM.grid,W=MM.W,Hh=MM.H,o=MM.opts||{},key=W+'x'+Hh+':'+(drive?1:0);
  if(RT.key===key&&RT.grid===g)return RT.cost;const cost=new Float32Array(W*Hh);
  for(let z=0;z<Hh;z++){const row=g[z];for(let x=0;x<W;x++){const ch=row[x];const k=cellClass(ch,o),gr=groundOf(ch,o);
    cost[z*W+x]=(k==='wall'||k==='building'||k==='tree'||k==='hedge'||k==='crate')?Infinity:gr==='road'?1:gr==='parking'?1.2:gr==='walk'?(drive?3:1.4):gr==='floor'?1:(drive?8:2.5)}}
  RT.key=key;RT.grid=g;RT.cost=cost;const n=W*Hh;if(!RT.dist||RT.dist.length!==n){RT.dist=new Float32Array(n);RT.prev=new Int32Array(n);RT.hd=new Float32Array(n*4+16);RT.hi=new Int32Array(n*4+16)}return cost}
function routeSnap(cost,W,Hh,x,z){if(cost[z*W+x]!==Infinity)return z*W+x;for(let r=1;r<=16;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
    const X=x+dx,Z=z+dz;if(X<0||Z<0||X>=W||Z>=Hh)continue;if(cost[Z*W+X]!==Infinity)return Z*W+X}return -1}
function findRoute(from,to,opt={}){
  if(!MM.grid||!from||!to||!isFinite(from.x)||!isFinite(to.x))return[];const t0=now(),T=MM.tile,W=MM.W,Hh=MM.H,cost=routeCost(!!opt.drive);RT.stats.runs++;
  const sx=clamp(Math.floor(from.x/T),0,W-1),sz=clamp(Math.floor(from.z/T),0,Hh-1),ex=clamp(Math.floor(to.x/T),0,W-1),ez=clamp(Math.floor(to.z/T),0,Hh-1);
  const s=routeSnap(cost,W,Hh,sx,sz),e=routeSnap(cost,W,Hh,ex,ez);if(s<0||e<0)return[];
  const dist=RT.dist,prev=RT.prev,hd=RT.hd,hi=RT.hi,cap=hd.length;dist.fill(Infinity);prev.fill(-1);
  let n=0;const push=(i,d)=>{if(n>=cap)return false;let k=n++;while(k){const p=(k-1)>>1;if(hd[p]<=d)break;hd[k]=hd[p];hi[k]=hi[p];k=p}hd[k]=d;hi[k]=i;return true};
  const budget=opt.budget||Math.min(W*Hh*2,120000);let pops=0,found=false;dist[s]=0;push(s,0);
  while(n){const d=hd[0],i=hi[0];/* pop */n--;if(n){const ld=hd[n],li=hi[n];let k=0;for(;;){const l=2*k+1,r=l+1;let m=-1,md=ld;if(l<n&&hd[l]<md){m=l;md=hd[l]}if(r<n&&hd[r]<md)m=r;if(m<0)break;hd[k]=hd[m];hi[k]=hi[m];k=m}hd[k]=ld;hi[k]=li}
    if(i===e){found=true;break}if(d>dist[i])continue;if(++pops>budget){RT.stats.gaveUp++;break}const x=i%W,z=(i/W)|0;
    for(let q=0;q<4;q++){const nx=x+(q===0?1:q===1?-1:0),nz=z+(q===2?1:q===3?-1:0);if(nx<0||nz<0||nx>=W||nz>=Hh)continue;const j=nz*W+nx;const nd=d+cost[j];if(nd<dist[j]){dist[j]=nd;prev[j]=i;if(!push(j,nd))break}}}
  RT.stats.pops+=pops;RT.stats.ms=Math.round((now()-t0)*1e4)/10;if(!found&&e!==s)return[];
  const pts=[];for(let i=e,g=0;i!==-1&&g<W*Hh;i=i===s?-1:prev[i],g++)pts.push(i);pts.reverse();
  /* collapse straight runs */
  const out=[];for(let k=0;k<pts.length;k++){const i=pts[k];if(k>0&&k<pts.length-1){const a=pts[k-1],b=pts[k+1];if((i%W-a%W===b%W-i%W)&&(((i/W)|0)-((a/W)|0)===((b/W)|0)-((i/W)|0)))continue}out.push({x:(i%W+.5)*T,z:(((i/W)|0)+.5)*T})}
  if(out.length){out[0]={x:from.x,z:from.z};out[out.length-1]={x:to.x,z:to.z}}return out}

function drawMinimap(st){
  const cv=R.mmCv,S=cv._w;if(!S||!MM.base)return;
  if(MM.sized!==S){MM.sized=S;cv.width=Math.round(S*H.dpr);cv.height=Math.round(S*H.dpr)}
  const c=cv.getContext('2d');c.setTransform(H.dpr,0,0,H.dpr,0,0);c.clearRect(0,0,S,S);
  const p=st.player||{x:0,z:0,yaw:0};const T=now();
  const drive=st.mode==='drive';const targetView=(drive?Math.min(72,44+Math.abs(st.speedMph||0)*.45):MM.interior?24:40)*(MM.zoom||1);
  MM.view=MM.view?lerp(MM.view,targetView,.08):targetView;
  const Rr=S/2,cx=Rr,cy=Rr,s=(Rr-4)/MM.view;/* px per metre */
  const rot=H.mmRotate===false?0:H.heading;
  const cos=Math.cos(rot),sin=Math.sin(rot);
  const w2s=(x,z)=>{const dx=x-p.x,dz=z-p.z;return[cx+(dx*cos+dz*sin)*s,cy+(-dx*sin+dz*cos)*s]};
  c.save();c.beginPath();c.arc(cx,cy,Rr-1,0,TAU);c.clip();
  c.fillStyle=MM.outside;c.fillRect(0,0,S,S);
  c.save();c.translate(cx,cy);c.rotate(-rot);const k=s*MM.tile/MM.px;c.scale(k,k);c.translate(-p.x/MM.tile*MM.px,-p.z/MM.tile*MM.px);
  c.imageSmoothingEnabled=true;
  if(MM.fog){c.globalAlpha=.16;c.drawImage(MM.base,0,0);c.globalAlpha=1;c.drawImage(MM.rev,0,0)}else c.drawImage(MM.base,0,0);
  c.restore();
  /* route */
  const route=MM.route;if(route&&route.length>1){c.lineJoin='round';c.lineCap='round';c.beginPath();route.forEach((q,i)=>{const[x,y]=w2s(q.x,q.z);i?c.lineTo(x,y):c.moveTo(x,y)});
    c.strokeStyle='rgba(20,16,4,.6)';c.lineWidth=7;c.stroke();c.strokeStyle='#ffc94a';c.lineWidth=4;c.stroke()}
  /* subtle inner vignette */
  const vg=c.createRadialGradient(cx,cy,Rr*.55,cx,cy,Rr);vg.addColorStop(0,'rgba(10,12,16,0)');vg.addColorStop(1,'rgba(10,12,16,.55)');c.fillStyle=vg;c.fillRect(0,0,S,S);
  /* view cone */
  if(!drive){const fa=-Math.PI/2+(rot-H.heading),half=.6;const g2=c.createRadialGradient(cx,cy,0,cx,cy,Rr*.7);g2.addColorStop(0,'rgba(255,255,255,.22)');g2.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g2;c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,Rr*.7,fa-half,fa+half);c.closePath();c.fill()}
  /* enemies: only while seen/alerted, fading after */
  const keep=new Set();
  for(const e of st.enemies||[]){const id=e.id??(e.x+','+e.z);keep.add(id);let m=MM.enemy.get(id);if(!m){m={t:-99,x:e.x,z:e.z};MM.enemy.set(id,m)}if(e.seen||e.alert||e.visible){m.t=T;m.x=e.x;m.z=e.z;m.alert=!!e.alert}if(e.dead)m.t=-99}
  for(const[id,m]of MM.enemy){if(!keep.has(id)){MM.enemy.delete(id);continue}const a=1-(T-m.t)/3.5;if(a<=0)continue;let[x,y]=w2s(m.x,m.z);const d=Math.hypot(x-cx,y-cy);if(d>Rr-8)continue;
    c.globalAlpha=clamp(a,0,1);c.fillStyle='#ff5a47';c.strokeStyle='rgba(30,0,0,.8)';c.lineWidth=1.5;c.beginPath();c.arc(x,y,4.2,0,TAU);c.fill();c.stroke();
    if(m.alert&&a>.9){c.strokeStyle='rgba(255,90,71,.5)';c.beginPath();c.arc(x,y,4.2+((T*8)%6),0,TAU);c.stroke()}}
  c.globalAlpha=1;
  /* crew */
  (st.crew||[]).forEach((m,i)=>{if(m.x==null)return;let[x,y]=w2s(m.x,m.z);const d=Math.hypot(x-cx,y-cy);if(d>Rr-8){const f=(Rr-8)/d;x=cx+(x-cx)*f;y=cy+(y-cy)*f}
    if(m.down){drawIcon(c,'revive',x,y,14,.6+.4*Math.abs(Math.sin(T*4)))}else{c.fillStyle=m.color||'#7fdc6e';c.strokeStyle='#fff';c.lineWidth=1.6;c.beginPath();c.arc(x,y,3.8,0,TAU);c.fill();c.stroke()}});
  /* markers / pins (pinned to rim when out of range) */
  const pinKinds={obj:1,job:1,shop:1,home:1,garage:1,van:1,revive:1,travel:1,gas:1,mart:1,star:1};
  const all=[...(MM.pins||[]),...(st.markers||[])];
  for(const m of all){if(m.minimap===false||!ICON[m.kind]||m.kind==='enemy'||m.kind==='crew')continue;let[x,y]=w2s(m.x,m.z);const d=Math.hypot(x-cx,y-cy),lim=Rr-11;
    if(d>lim){if(!(pinKinds[m.kind]&&m.rim!==false))continue;const f=lim/d;x=cx+(x-cx)*f;y=cy+(y-cy)*f}
    const big=m.kind==='obj'||m.kind==='job'||m.kind==='revive';drawIcon(c,m.kind,x,y,big?18:15,d>lim?.92:1)}
  /* player arrow */
  c.save();c.translate(cx,cy);c.rotate(rot-H.heading);c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=4;c.fillStyle='#fff';c.beginPath();c.moveTo(0,-8);c.lineTo(6,6);c.lineTo(0,3);c.lineTo(-6,6);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#2f5d9e';c.lineWidth=1.2;c.stroke();c.restore();
  c.restore();
  /* rim + north */
  c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2;c.beginPath();c.arc(cx,cy,Rr-1.5,0,TAU);c.stroke();
  c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1;c.beginPath();c.arc(cx,cy,Rr-3,0,TAU);c.stroke();
  const nr=S<150?7.5:9,na=-Math.PI/2-rot;const nx=cx+Math.cos(na)*(Rr-nr-1.5),ny=cy+Math.sin(na)*(Rr-nr-1.5);
  c.fillStyle='#12151a';c.beginPath();c.arc(nx,ny,nr,0,TAU);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.stroke();
  c.fillStyle='#ffc94a';c.font='800 '+(nr>8?11:10)+'px "Barlow Condensed",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('N',nx,ny+.5);
}

/* ---------------- full-screen map ---------------- */
const MAP={open:false,z:1,cx:0,cz:0,dirty:true,onTravel:null,sel:null,ptrs:new Map(),
  toggle(){this.open?this.close():this.openMap()},
  openMap(){if(!MM.base)return;this.open=true;const m=R.map;m.hidden=false;if(!m.firstChild)buildMap();
    this.cx=MM.W*MM.tile/2;this.cz=MM.H*MM.tile/2;this.fit();this.sel=null;R.mapTip.hidden=true;mapLegend();
    requestAnimationFrame(()=>m.classList.add('on'));this.resize();emit('map',true)},
  close(){if(!this.open)return;this.open=false;R.map.classList.remove('on');setTimeout(()=>{if(!this.open)R.map.hidden=true},230);emit('map',false)},
  fit(){const ww=MM.W*MM.tile,hh=MM.H*MM.tile;this.z=Math.min(H.W/ww,(H.Hh-(H.compact?200:120))/hh)*(H.compact?.96:.86);this.zMin=this.z*.6;this.zMax=this.z*5},
  resize(){const cv=R.mapCv;if(!cv)return;cv.width=Math.round(H.W*H.dpr);cv.height=Math.round(H.Hh*H.dpr);this.dirty=true},
  s2w(x,y){return{x:(x-H.W/2)/this.z+this.cx,z:(y-H.Hh/2)/this.z+this.cz}},
  w2s(x,z){return[(x-this.cx)*this.z+H.W/2,(z-this.cz)*this.z+H.Hh/2]}
};
function buildMap(){
  const m=R.map;m.innerHTML='<canvas></canvas><div class="hdr"><div class="k">Map</div><h2></h2></div><div class="leg"></div><div class="zb"><button data-z="1" aria-label="Zoom in">+</button><button data-z="-1" aria-label="Zoom out">−</button><button data-z="0" aria-label="Close" style="font-size:16px">✕</button></div><div class="ft"><span><b class="ht-kc">Drag</b>Pan</span><span><b class="ht-kc">Wheel</b>Zoom</span><span><b class="ht-kc">Click</b>Select</span><span><b class="ht-kc">Tab</b>Next place</span><span><b class="ht-kc">Enter</b>Travel</span><span><b class="ht-kc">M</b>Close</span></div><div class="tip" hidden><div class="k"></div><h3></h3><button class="ht-btn pri" style="height:38px;font-size:14px;width:100%">Fast travel</button></div>';
  R.mapCv=m.querySelector('canvas');R.mapTip=m.querySelector('.tip');R.mapTitle=m.querySelector('h2');R.mapLeg=m.querySelector('.leg');
  const cv=R.mapCv;
  cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*.0015))},{passive:false});
  let moved=0;
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);MAP.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0});
  cv.addEventListener('pointermove',e=>{const p=MAP.ptrs.get(e.pointerId);if(!p)return;
    if(MAP.ptrs.size===2){const [a,b]=[...MAP.ptrs.values()];const d0=Math.hypot(a.x-b.x,a.y-b.y);p.x=e.clientX;p.y=e.clientY;const [a2,b2]=[...MAP.ptrs.values()];const d1=Math.hypot(a2.x-b2.x,a2.y-b2.y);if(d0>0)zoomAt((a2.x+b2.x)/2,(a2.y+b2.y)/2,d1/d0);moved+=10;return}
    const dx=e.clientX-p.x,dy=e.clientY-p.y;moved+=Math.abs(dx)+Math.abs(dy);p.x=e.clientX;p.y=e.clientY;MAP.cx-=dx/MAP.z;MAP.cz-=dy/MAP.z;MAP.dirty=true;placeTip()});
  const up=e=>{if(MAP.ptrs.has(e.pointerId)){MAP.ptrs.delete(e.pointerId);if(moved<6)pickAt(e.clientX,e.clientY)}};
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>MAP.ptrs.delete(e.pointerId));
  m.querySelectorAll('.zb button').forEach(b=>b.onclick=()=>{const z=+b.dataset.z;if(!z)return MAP.close();zoomAt(H.W/2,H.Hh/2,z>0?1.4:1/1.4)});
  R.mapTip.querySelector('button').onclick=()=>{const s=MAP.sel;if(!s)return;emit('fastTravel',s);if(MAP.onTravel)MAP.onTravel(s);MAP.close()};
}
const LEGEND_ITEMS=[['obj','Objective'],['job','Job'],['van','Minivan'],['home','Home'],['shop','Hardware store'],['garage',"Dad's Auto"],['gas','Gas station'],['mart','Corner mart'],['star','Community center'],['site','Job site'],['travel','Fast travel']];
function mapLegend(){const have=new Set(mapItems().map(m=>m.kind));
  htm(R.mapLeg,LEGEND_ITEMS.filter(([k])=>have.has(k)).map(([k,l])=>`<div style="color:${KIND_COL[k]}">${iconSVG(k)}<span>${l}</span></div>`).join('')+`<div><i class="sw" style="background:${GROUND.road}"></i><span>Road</span></div><div><i class="sw" style="background:#b9b2a4"></i><span>Building</span></div>`)}
/* keyboard: arrows/WASD pan, + - zoom, Tab cycles places, Enter fast-travels to the selection, Esc/M close */
function mapKey(e){const k=e.key,step=90/MAP.z;let used=true;
  if(k==='ArrowLeft'||e.code==='KeyA'){MAP.cx-=step;MAP.dirty=true;placeTip()}
  else if(k==='ArrowRight'||e.code==='KeyD'){MAP.cx+=step;MAP.dirty=true;placeTip()}
  else if(k==='ArrowUp'||e.code==='KeyW'){MAP.cz-=step;MAP.dirty=true;placeTip()}
  else if(k==='ArrowDown'||e.code==='KeyS'){MAP.cz+=step;MAP.dirty=true;placeTip()}
  else if(k==='+'||k==='='||e.code==='NumpadAdd')zoomAt(H.W/2,H.Hh/2,1.4);
  else if(k==='-'||k==='_'||e.code==='NumpadSubtract')zoomAt(H.W/2,H.Hh/2,1/1.4);
  else if(k==='Tab'){const it=mapItems().filter(m=>m.label);if(it.length){let i=it.indexOf(MAP.sel);i=e.shiftKey?(i<=0?it.length-1:i-1):(i+1)%it.length;const m=it[i];let[sx,sy]=MAP.w2s(m.x,m.z);if(sx<80||sy<120||sx>H.W-80||sy>H.Hh-120){MAP.cx=m.x;MAP.cz=m.z;[sx,sy]=MAP.w2s(m.x,m.z)}pickAt(sx,sy,m)}}
  else if(k==='Enter'||k===' '){const b=R.mapTip&&R.mapTip.querySelector('button');if(MAP.sel&&b&&!b.hidden&&!R.mapTip.hidden)b.click()}
  else used=false;
  if(used){e.preventDefault();e.stopPropagation()}return used}
function zoomAt(x,y,f){const w=MAP.s2w(x,y);MAP.z=clamp(MAP.z*f,MAP.zMin,MAP.zMax);MAP.cx=w.x-(x-H.W/2)/MAP.z;MAP.cz=w.z-(y-H.Hh/2)/MAP.z;MAP.dirty=true;placeTip()}
function mapItems(){return[...(MM.pins||[]),...((H.state&&H.state.markers)||[])].filter(m=>ICON[m.kind]&&m.kind!=='enemy'&&m.map!==false)}
function pickAt(x,y,force){let best=force||null,bd=22;if(!best)for(const m of mapItems()){const[sx,sy]=MAP.w2s(m.x,m.z);const d=Math.hypot(sx-x,sy-y);if(d<bd){bd=d;best=m}}
  MAP.sel=best;if(!best){R.mapTip.hidden=true;MAP.dirty=true;return}
  R.mapTip.hidden=false;R.mapTip.querySelector('.k').textContent=({obj:'Objective',job:'Job',home:'Home',shop:'Shop',garage:'Garage',travel:'Fast travel',van:'Vehicle',gas:'Gas station',mart:'Shop',star:'Community',site:'Job site'}[best.kind]||best.kind);
  R.mapTip.querySelector('h3').textContent=best.label||'';const b=R.mapTip.querySelector('button');b.hidden=!(best.fast||best.fastTravel);
  emit('mapSelect',best);placeTip();MAP.dirty=true}
function placeTip(){if(!MAP.sel||!R.mapTip)return;const[x,y]=MAP.w2s(MAP.sel.x,MAP.sel.z);R.mapTip.style.left=x+'px';R.mapTip.style.top=y+'px'}
function drawMap(st){
  if(!MAP.open||!R.mapCv)return;const cv=R.mapCv,c=cv.getContext('2d'),W=H.W,Hh=H.Hh;
  c.setTransform(H.dpr,0,0,H.dpr,0,0);c.fillStyle='#0d1116';c.fillRect(0,0,W,Hh);
  /* faint grid */
  c.strokeStyle='rgba(255,255,255,.04)';c.lineWidth=1;const gs=20*MAP.z;if(gs>8){const[ox,oy]=MAP.w2s(0,0);for(let x=ox%gs;x<W;x+=gs){c.beginPath();c.moveTo(x,0);c.lineTo(x,Hh);c.stroke()}for(let y=oy%gs;y<Hh;y+=gs){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}}
  const[x0,y0]=MAP.w2s(0,0);const sc=MAP.z*MM.tile/MM.px;
  c.save();c.shadowColor='rgba(0,0,0,.6)';c.shadowBlur=30;c.fillStyle='#161b21';c.fillRect(x0,y0,MM.base.width*sc,MM.base.height*sc);c.restore();
  c.imageSmoothingEnabled=MAP.z<4;
  if(MM.fog){c.globalAlpha=.1;c.drawImage(MM.base,x0,y0,MM.base.width*sc,MM.base.height*sc);c.globalAlpha=1;c.drawImage(MM.rev,x0,y0,MM.base.width*sc,MM.base.height*sc)}else c.drawImage(MM.base,x0,y0,MM.base.width*sc,MM.base.height*sc);
  /* regions (open world): name + trust bar above each, unvisited ones dimmed */
  for(const r0 of MM.regions||[]){/* z0/z1 (optional): a region that covers part of the height (Fort Sensible); its label sits under it */
    const[ax,ay0]=MAP.w2s(r0.x0,r0.z0||0),[bx,by]=MAP.w2s(r0.x1,r0.z1!=null?r0.z1:MM.H*MM.tile),r=r0,ay=r.z0?by+34:ay0;
    if(r.dim){c.fillStyle='rgba(13,17,22,.55)';c.fillRect(ax,ay0,bx-ax,by-ay0)}
    const cxr=(ax+bx)/2,w=Math.min(150,bx-ax-16);c.textAlign='center';c.textBaseline='bottom';c.font='800 13px "Barlow Condensed",sans-serif';c.fillStyle='rgba(0,0,0,.6)';c.fillText(r.name.toUpperCase(),cxr+1,ay-15);c.fillStyle='#fff';c.fillText(r.name.toUpperCase(),cxr,ay-16);
    if(r.trust!=null){c.fillStyle='rgba(255,255,255,.14)';c.fillRect(cxr-w/2,ay-12,w,5);c.fillStyle=r.trust>=70?'#7fdc6e':r.trust>=35?'#ffc94a':'#ff8a6b';c.fillRect(cxr-w/2,ay-12,w*Math.max(0,Math.min(1,r.trust/100)),5);
      c.font='700 11px "Barlow Condensed",sans-serif';c.textAlign='left';c.fillStyle='rgba(255,255,255,.75)';c.fillText('TRUST '+Math.round(r.trust)+'%',cxr+w/2+6,ay-6)}}
  /* game overlay (e.g. Riverside crew turf tints): fn(ctx, worldToScreen, zoom) */
  if(MM.overlay){try{c.save();MM.overlay(c,(x,z)=>MAP.w2s(x,z),MAP.z);c.restore()}catch(e){}}
  if(MM.route&&MM.route.length>1){c.lineJoin='round';c.lineCap='round';c.beginPath();MM.route.forEach((q,i)=>{const[x,y]=MAP.w2s(q.x,q.z);i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle='rgba(20,16,4,.6)';c.lineWidth=8;c.stroke();c.strokeStyle='#ffc94a';c.lineWidth=4.5;c.stroke()}
  for(const m of mapItems()){const[x,y]=MAP.w2s(m.x,m.z);const sel=MAP.sel===m;if(sel){c.strokeStyle='#fff';c.lineWidth=2;c.beginPath();c.arc(x,y,16,0,TAU);c.stroke()}drawIcon(c,m.kind,x,y,sel?26:22);
    if((MAP.z>4.5||sel)&&m.label){c.font='700 12px "Barlow Condensed",sans-serif';c.textAlign='center';c.textBaseline='top';c.fillStyle='rgba(0,0,0,.6)';c.fillText(m.label.toUpperCase(),x+1,y+15);c.fillStyle='#fff';c.fillText(m.label.toUpperCase(),x,y+14)}}
  (st&&st.crew||[]).forEach(m=>{if(m.x==null)return;const[x,y]=MAP.w2s(m.x,m.z);c.fillStyle=m.color||'#7fdc6e';c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(x,y,4.5,0,TAU);c.fill();c.stroke()});
  const p=H.player;if(p){const[x,y]=MAP.w2s(p.x,p.z);c.save();c.translate(x,y);c.rotate(H.heading);c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=6;c.fillStyle='#fff';c.beginPath();c.moveTo(0,-11);c.lineTo(8,8);c.lineTo(0,4);c.lineTo(-8,8);c.closePath();c.fill();c.shadowBlur=0;c.strokeStyle='#2f5d9e';c.lineWidth=1.5;c.stroke();c.restore()}
  txt(R.mapTitle,MM.name||'Maple Heights');
}

/* =====================================================================
   SCREENS
   ===================================================================== */
const SCR={cur:null,el:{},data:{}};
function btn(label,act,cls='',extra=''){return `<button class="ht-btn ${cls}" data-act="${act}">${label}${extra}</button>`}
function bindActs(root){root.querySelectorAll('[data-act]').forEach(b=>{if(b._bound)return;b._bound=1;b.addEventListener('click',e=>{e.stopPropagation();const a=b.dataset.act,d=SCR.data[SCR.cur]||{};
    if(a==='settings'&&SCR.cur==='title'){const t=SCR.data.title;showScreen('pause',{kicker:'Title',title:'Settings',canAbandon:false,canQuit:false,back:()=>showScreen('title',t)});return}
    if(a==='resume'&&d.back){d.back();return}
    emit('action',a,d);if(a==='resume')HUD.hide('pause')})})}
const TIPS=['Hurt enemies sometimes give up. Zip-ties earn more trust than the alternative.','Crouch behind crates: a crouching dad is hard to see over a 1 m box.','Every job ends with a payout. Spend it at the hardware store or on the house.','The minivan has a horn. Use it responsibly. Or don\'t.','Shotguns rule a room and fall off fast in the street.'];
function screenTitle(d){
  const e=el('div','ht-scr ht-title');
  e.innerHTML=`<div class="scrim"></div><div class="col"><div class="ht-logo"><span class="roof">${UI_ICON.roof}</span><span class="w">High</span><span class="w b">Trust</span><span class="tag">Maple Heights Neighborhood Watch</span></div>${d.premise?`<p class="premise">${esc(d.premise)}</p>`:''}
  <div class="ht-btns btns">${btn(UI_ICON.play+'<span>Continue</span>','continue','pri','<span class="sub cl"></span>')}${btn('New game','newgame')}${btn('Restore previous save','restore','ghost','<span class="sub rl"></span>')}${btn('Settings','settings','ghost')}${btn('Credits &amp; licences','credits','ghost')}${window.HTDesktop?btn('Quit to desktop','quitDesktop','ghost'):''}</div></div>
  <div class="ht-load"><div class="row"><span class="tip"><b>Tip</b><span class="tt"></span></span><span class="st ht-num">Loading</span></div><div class="bar"><i></i></div></div><div class="ht-ver">Build ${esc(d.version||'')}</div>`;
  e.querySelector('.tt').textContent=d.tip||TIPS[Math.floor(Math.random()*TIPS.length)];
  return e}
function updTitle(e,d){const L=e.querySelector('.ht-load'),f=clamp(d.progress??0,0,1),done=d.ready||f>=1;
  e.querySelector('.ht-load .bar i').style.transform=`scaleX(${f})`;
  e.querySelector('.st').textContent=d.status||(done?'Ready':'Loading the neighborhood · '+Math.round(f*100)+'%');
  L.classList.toggle('done',!!done);L.classList.toggle('warn',!!d.warn);
  const cont=e.querySelector('[data-act=continue]'),ng=e.querySelector('[data-act=newgame]');
  const canC=!!d.canContinue;cont.hidden=!canC;e.querySelector('.cl').textContent=d.continueLabel||'';
  const rs=e.querySelector('[data-act=restore]');rs.hidden=!d.canRestore;e.querySelector('.rl').textContent=d.restoreLabel||'';rs.disabled=!done;
  cont.disabled=!done;ng.disabled=!done;ng.className='ht-btn'+(canC?'':' pri');ng.innerHTML=(canC||!done?'':UI_ICON.play)+'<span>'+(canC?'New game':(done?(d.startLabel||'Clock in'):'Loading…'))+'</span>';
  if(!d.version)e.querySelector('.ht-ver').hidden=true;
}
function portraitColor(n){let h=0;for(const ch of String(n||''))h=(h*31+ch.charCodeAt(0))>>>0;return CREW_COL[h%CREW_COL.length]}
function screenBrief(d){const e=el('div','ht-scr ht-brief');
  const meta=(d.meta||[]).map(([k,v,c])=>`<div><b>${esc(k)}</b><span class="${c||''}">${esc(v)}</span></div>`).join('');
  e.innerHTML=`<div class="scrim"></div><div class="col"><div class="kick">${esc(d.kicker||'New job')}</div><h2>${esc(d.title||'')}</h2>
  <div class="who"><div class="pt" style="--c:${d.color||portraitColor(d.giver)}">${esc(initials(d.giver||'?'))}</div><div><div class="r">${esc(d.role||'')}</div><div class="n">${esc(d.place||'')}</div></div></div>
  <div class="lns" style="margin-top:14px">${(d.lines||[]).map(l=>`<p class="ln">${esc(l)}</p>`).join('')}</div>
  ${meta?`<div class="ht-meta">${meta}</div>`:''}
  <div class="ht-btns row">${btn((d.goLabel||'Load the van'),'brief:go','pri')}${d.canSkip===false?'':btn(d.skipLabel||'Skip the drive','brief:skip')}${btn(d.noLabel||'Not yet','brief:no','ghost')}</div></div>`;
  return e}
function screenResult(d){const e=el('div','ht-scr ht-result'+(d.fail?' fail':''));
  const stats=(d.stats||[]).map(([k,v,s])=>`<div><b>${esc(k)}</b><span class="ht-num">${esc(v)}</span>${s?`<small>${esc(s)}</small>`:''}</div>`).join('');
  e.innerHTML=`<div class="scrim"></div><div class="col"><div class="stamp">${esc(d.stamp||(d.fail?'Job failed':'Job done'))}</div><h2>${esc(d.title||'')}</h2>${d.text?`<p>${esc(d.text)}</p>`:''}
  ${stats?`<div class="ht-stats">${stats}</div>`:''}<div class="ht-payout" data-slot="payout"></div>
  <div class="ht-btns row">${btn(d.goLabel||'Back to the cul-de-sac','result:go','pri')}${d.canRetry?btn(d.retryLabel||'Run it back','result:retry','ghost'):''}${d.restartLabel?btn(d.restartLabel,'result:restart','ghost'):''}</div></div>`;
  HUD.payoutEl=e.querySelector('.ht-payout');
  if(d.payout)payout(d.payout);
  return e}
/* default payout renderer; another module may fill HUD.payoutEl itself instead */
function payout(rows){const p=HUD.payoutEl;if(!p)return;p.innerHTML=rows.map(r=>`<div class="ht-pay-row${r.total?' tot':''}${r.neg?' neg':''}"><span>${esc(r.label)}</span><span class="ht-num">${esc(r.value)}</span></div>`).join('');
  [...p.children].forEach((r,i)=>anim(r,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:320,delay:200+i*120,easing:'ease-out',fill:'backwards'}))}
function screenPause(d){const e=el('div','ht-scr ht-pause');const tab=d.tab||'controls';
  e.innerHTML=`<div class="scrim"></div><div class="wrap"><div class="nav"><div class="kick">${esc(d.kicker||'Paused')}</div><h2>${esc(d.title||'Take a breath.')}</h2>
  <div class="ht-btns">${btn(d.back?'Back':'Resume','resume','pri','<span class="ht-kc dim">Esc</span>')}<div class="sep"></div>
  ${[['controls','Controls'],['display','Display'],['audio','Audio'],['keys','Controls &amp; keys'],['data','Save data']].concat(d.found?[['found','Things your dad found']]:[]).map(([k,l])=>`<button class="ht-btn tab" data-tab="${k}" aria-selected="${k===tab}">${l}</button>`).join('')}
  <div class="sep"></div>${btn('Credits &amp; licences','credits','ghost')}${d.canAbandon?btn(d.abandonLabel||'Abandon job','abandon','dng'):''}${d.canQuit!==false?btn('Quit to title','quit','ghost'):''}${d.canQuit!==false&&window.HTDesktop?btn('Quit to desktop','quitDesktop','ghost'):''}</div></div><div class="ht-pane"></div></div>`;
  e.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{e.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===b));SCR.data.pause.tab=b.dataset.tab;renderPane(e,SCR.data.pause)});
  renderPane(e,d);return e}
function renderPane(e,d){const pane=e.querySelector('.ht-pane'),tab=d.tab||'controls',S=d.settings||(d.settings=H.settings);let h='';
  if(tab==='keys'){const row=([a,k])=>`<div><span>${esc(a)}</span><span>${String(k).split(' · ').map(x=>`<b class="ht-kc">${esc(x)}</b>`).join('<em style="opacity:.4;font-style:normal;margin:0 2px">/</em>')}</span></div>`;
    /* rebinding (js/keys.js) first, then every control by situation (defaults: cars, tank, jet, jobs), then the controller */
    h=(window.HT.Keys&&!d.bindings?HT.Keys.table():'')+(d.bindings?'<h3>Keyboard &amp; mouse</h3><div class="ht-keys">'+d.bindings.map(row).join('')+'</div>':KEY_GROUPS.map(([gh,rs])=>'<h3>'+esc(gh)+(window.HT.Keys&&HT.Keys.changed?' <small style="opacity:.6;font-weight:500">(default keys)</small>':'')+'</h3><div class="ht-keys">'+rs.map(row).join('')+'</div>').join(''))+
    '<h3>Controller</h3>'+(window.HT.Pad&&HT.Pad.diagram?HT.Pad.diagram():'')+'<div class="ht-keys ht-padkeys">'+PAD_KEYS.map(row).join('')+'</div>'+(window.HT.Keys?'':'<p style="font-size:13px;opacity:.6;margin-top:12px">Keys can\'t be rebound yet.</p>')}
  else if(tab==='found'){/* easter eggs (js/eggs.js): found ones in full, the rest as ??? with a hint */const f=d.found||[],n=f.filter(x=>x.found).length;
    h=`<h3>Things your dad found · ${n}/${f.length}</h3><div class="ht-keys">`+f.map(x=>`<div style="display:block;padding:8px 0"><b style="display:block;font-size:15px">${x.found?esc(x.name):'???'}</b><span style="opacity:.75;font-size:13px">${esc(x.found?x.text:'Hint: '+x.hint)}</span></div>`).join('')+'</div>'}
  else if(tab==='data'){h=`<h3>Save data</h3><p style="font-size:15px">Progress saves automatically after every job and purchase.</p><div class="ht-danger"><p>Reset the save to start Maple Heights over. Cash, guns, house upgrades and crew are all wiped.</p><button class="ht-btn dng ghost" data-reset>Reset save</button></div>`}
  else for(const grp of SETTINGS.filter(g=>g.tab===tab)){h+=`<h3>${grp.h}</h3>`;for(const it of grp.items){const v=S[it.k];const lab=`<label for="hts-${it.k}">${it.l}${it.sub?`<small>${it.sub}</small>`:''}</label>`;
    if(it.type==='bool')h+=`<div class="ht-set">${lab}<button class="ht-tog" id="hts-${it.k}" role="switch" aria-checked="${!!v}" data-k="${it.k}"></button><span></span></div>`;
    else if(it.type==='seg')h+=`<div class="ht-set">${lab}<div class="ht-seg3" data-k="${it.k}">${it.opts.map(([ov,ol])=>`<button aria-pressed="${v===ov}" data-v="${ov}">${ol}</button>`).join('')}</div></div>`;
    else{const val=v??it.min;h+=`<div class="ht-set">${lab}<input type="range" id="hts-${it.k}" min="${it.min}" max="${it.max}" step="${it.step}" value="${val}" data-k="${it.k}" style="--p:${((val-it.min)/(it.max-it.min)*100).toFixed(1)}%"><output class="ht-num">${(it.fmt||String)(val)}</output></div>`}}}
  pane.innerHTML=h;
  if(tab==='keys'&&window.HT.Keys&&!d.bindings)HT.Keys.bind(pane,()=>renderPane(e,d));/* rebinding (js/keys.js) */
  const set=(k,v)=>{S[k]=v;emit('setting',k,v);if(k==='subs')H.subsOn=v;if(k==='mmRotate')H.mmRotate=v};
  pane.querySelectorAll('input[type=range]').forEach(r=>{const it=SETTINGS.flatMap(g=>g.items).find(i=>i.k===r.dataset.k);r.oninput=()=>{const v=+r.value;r.style.setProperty('--p',((v-it.min)/(it.max-it.min)*100).toFixed(1)+'%');r.nextElementSibling.textContent=(it.fmt||String)(v);set(it.k,v)}});
  pane.querySelectorAll('.ht-tog').forEach(t=>t.onclick=()=>{const v=t.getAttribute('aria-checked')!=='true';t.setAttribute('aria-checked',v);set(t.dataset.k,v)});
  pane.querySelectorAll('.ht-seg3').forEach(sg=>sg.querySelectorAll('button').forEach(b=>b.onclick=()=>{sg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));set(sg.dataset.k,b.dataset.v)}));
  const rs=pane.querySelector('[data-reset]');if(rs)rs.onclick=()=>{if(rs.dataset.arm){emit('action','resetSave');rs.textContent='Save reset';rs.disabled=true}else{rs.dataset.arm=1;rs.textContent='Tap again to wipe everything';rs.classList.remove('ghost')}};
}
/* modal dialog above every screen: HUD.dialog({kicker,title,text|html,buttons:[{label,act,cls}],focus,cancel,wide})
   resolves with the chosen act; Esc (or a click on the backdrop) resolves with o.cancel ('cancel').
   Focus starts on o.focus (else the last button) and is trapped inside; arrows move between buttons. */
const DLG={el:null,done:null};
function dialog(o={}){if(DLG.el)closeDialog(DLG.cancel);
  const e=el('div','ht-dlg'+(o.wide?' wide':''));e.setAttribute('role','dialog');e.setAttribute('aria-modal','true');
  const bs=(o.buttons||[{label:'OK',act:'ok',cls:'pri'}]);
  e.innerHTML=`<div class="bk"></div><div class="box" tabindex="-1">${o.kicker?`<div class="kick">${esc(o.kicker)}</div>`:''}${o.title?`<h3>${esc(o.title)}</h3>`:''}<div class="bd">${o.html!=null?o.html:(o.text?String(o.text).split('\n\n').map(p=>`<p>${esc(p)}</p>`).join(''):'')}</div>
  <div class="ht-btns row">${bs.map(b=>`<button class="ht-btn ${b.cls||''}" data-dlg="${esc(b.act)}">${esc(b.label)}</button>`).join('')}</div></div>`;
  (R.scr||document.body).appendChild(e);DLG.el=e;DLG.cancel=o.cancel||'cancel';DLG.prev=document.activeElement;
  const p=new Promise(res=>{DLG.done=res});
  e.querySelectorAll('[data-dlg]').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();closeDialog(b.dataset.dlg)}));
  e.querySelector('.bk').addEventListener('click',ev=>{ev.stopPropagation();closeDialog(DLG.cancel)});
  requestAnimationFrame(()=>e.classList.add('on'));
  const f=(o.focus&&e.querySelector(`[data-dlg="${o.focus}"]`))||e.querySelector('[data-dlg]:last-child');if(f)f.focus({preventScroll:true});
  return p}
function closeDialog(act){const e=DLG.el;if(!e)return;DLG.el=null;const d=DLG.done;DLG.done=null;e.remove();
  try{if(DLG.prev&&DLG.prev.isConnected)DLG.prev.focus({preventScroll:true})}catch(_){}if(d)d(act)}
function dialogKeys(ev){const e=DLG.el;if(!e)return;const k=ev.key;
  const bs=[...e.querySelectorAll('[data-dlg]')],i=bs.indexOf(document.activeElement),bd=e.querySelector('.bd');
  if(k==='Escape'){closeDialog(DLG.cancel)}
  else if(k==='Tab'||k==='ArrowLeft'||k==='ArrowRight'){const n=(k==='ArrowLeft'||(k==='Tab'&&ev.shiftKey))?(i<=0?bs.length-1:i-1):(i+1)%bs.length;bs[n]&&bs[n].focus({preventScroll:true})}
  else if((k==='ArrowDown'||k==='ArrowUp'||k==='PageDown'||k==='PageUp')&&bd){bd.scrollTop+=(k==='ArrowDown'?60:k==='ArrowUp'?-60:k==='PageDown'?bd.clientHeight*.9:-bd.clientHeight*.9)}
  else if(k==='Home'&&bd)bd.scrollTop=0;else if(k==='End'&&bd)bd.scrollTop=bd.scrollHeight;
  else if((k==='Enter'||k===' ')&&i>=0){bs[i].click()}
  else if(k!=='Enter'&&k!==' ')return;/* other keys: swallowed below */
  ev.preventDefault();ev.stopImmediatePropagation()}
addEventListener('keydown',ev=>{if(DLG.el){dialogKeys(ev);ev.stopImmediatePropagation()}},true);
const BUILD={title:screenTitle,brief:screenBrief,result:screenResult,pause:screenPause,calendar:(d)=>screenCalendar(d)};
function showScreen(name,d={}){
  if(name==='map'){MAP.openMap();return}
  hideScreen(null,true);SCR.cur=name;SCR.data[name]=d;const e=BUILD[name](d);SCR.el[name]=e;R.scr.appendChild(e);bindActs(e);
  if(name==='title')updTitle(e,d);
  requestAnimationFrame(()=>e.classList.add('on'));
  anim(e.querySelector('.col,.wrap'),[{opacity:0,transform:'translateX(-16px)'},{opacity:1,transform:'none'}],{duration:480,easing:'cubic-bezier(.2,.8,.2,1)'});
  setTimeout(()=>{const f=e.querySelector('.ht-btn.pri:not(:disabled)');f&&f.focus({preventScroll:true})},60);
  cls(R.hud,'off',true);show(R.touch,false);
  return e}
function hideScreen(name,instant){
  if(name==='map')return MAP.close();
  const n=name||SCR.cur;if(!n||!SCR.el[n])return;const e=SCR.el[n];delete SCR.el[n];if(SCR.cur===n)SCR.cur=null;
  if(instant)e.remove();else{e.classList.remove('on');e.classList.add('out');setTimeout(()=>e.remove(),480)}
  cls(R.hud,'off',false);show(R.touch,true);
}
function setScreen(name,d){const e=SCR.el[name];if(!e)return;Object.assign(SCR.data[name],d);if(name==='title')updTitle(e,SCR.data[name]);if(name==='pause'&&d.settings)renderPane(e,SCR.data[name])}

/* =====================================================================
   update loop
   ===================================================================== */
let mmAcc=1,cmpAcc=1;
function update(st,dt=1/60){
  if(!H.root)return;H.state=st;
  const mode=st.mode||'mission';if(H.mode!==mode){if(H.mode)H.root.classList.remove('m-'+H.mode);H.root.classList.add('m-'+mode);H.mode=mode}
  H.player=st.player||null;
  const yaw=st.compassYaw!=null?st.compassYaw:(st.player&&st.player.yaw)||0;H.heading=((-yaw%TAU)+TAU)%TAU;
  const home=mode==='home';
  show(R.mm,!home&&!!MM.base);show(R.cmp,!home);show(R.hp,true);
  updObjective(st.objective,st.timer);
  updTrust(st,dt);
  updHealth(st,dt);
  updCrew(st.crew);
  updWeapon(st);updDrive(st);
  updCrosshair(st,dt);
  updMarkers(st.markers);updTags(st.tags);
  updPrompt(st.prompt);updSubs(st.subtitles);
  updMeters(st.meters);updWidgets(st.widgets);updGadgets(st.gadgets);
  if(st.banner){const k=st.banner.id||JSON.stringify(st.banner);if(k!==BN.key){BN.key=k;banner(st.banner)}}
  if(BN.t>0&&now()>=BN.end){BN.t=0;R.bn.classList.remove('lbx');cls(R.hud,'cine',false)}
  sty(R.vig,'display',mode==='drive'?'none':'');
  if(st.routeTo&&H.player){const T=now();/* at most ~3 searches a second, however often the target object changes */if(T-MM.routeAt>.6||(MM.routeTo!==st.routeTo&&T-MM.routeAt>.3)){MM.routeAt=T;MM.routeTo=st.routeTo;MM.route=findRoute(H.player,st.routeTo,{drive:mode==='drive'})}}
  else if(st.routeTo===null)MM.route=null;
  if(H.player)reveal(H.player.x,H.player.z);
  mmAcc+=dt;if(mmAcc>=1/30){mmAcc=0;if(!home)drawMinimap(st);if(MAP.open)drawMap(st)}
  cmpAcc+=dt;if(cmpAcc>=1/30){cmpAcc=0;if(!home)drawCompass(H.heading,st)}
  if(st.zone!=null){const z=String(st.zone).split(' · ');htm(R.mmZone,'<b>'+esc(z[0])+'</b>'+(z[1]?' · '+esc(z.slice(1).join(' · ')):''))}
}

/* =====================================================================
   MISSION WIDGETS (SPEC3 wave 0) — the generic HUD pieces jobs build on.
   Jobs and systems only feed state / call these; they never edit this file.
   ---------------------------------------------------------------------
   STATE (HUD.update fields, all optional, read every frame, DOM written only on change)
   meters:[{id,label,v,max=1,style:'bar'|'ring'|'pips'|'bands',warn,warnBelow,icon,zones,marker,sub,color,glyph}]
     top-centre stack under the compass (phones: one row under the minimap), first 3 shown.
     bar   fill v/max. warn:number -> warn colour once v>=warn (warnBelow:true: once v<warn),
           with a notch at the threshold. marker:number -> a white target notch.
     ring  detection "eye": white, yellow from 0.35, orange from 0.6, red at 1.0 of max.
           centre glyph: eye, then "?", then "!" (glyph:'…' overrides). color overrides the palette.
     pips  max pips (1..12), v filled (fractions fill the last one part-way); warn as for bar.
     bands zones:[[from,to,'good'|'warn'|'bad',label?],...] over 0..max, a marker at v, the label
           of the zone v is in on the right (sub is appended). marker:number -> target notch.
     icon  'eye' 'car' 'chat' 'star' 'mask' 'clock' 'heart' 'bolt' 'cam' or an '<svg…>' string. sub: small text.
   widgets:[{id,kind:'timer'|'score'|'combo',label,v,max,hot,sub,n}]  (first 4, a row under the compass;
     phones: the strip between the minimap and the pause button)
     timer v seconds -> m:ss (tenths under 10 s), hot pulses red, max -> a draining bar.
     score v big number, pops (and floats "+n") on increase, max -> " / max".
     combo n -> "×n" (falls back to max), v 0..1 the decaying bar, hot glows.
   gadgets:[{id,label,key,on,charge,icon}]  chips above the gun (id 'nv'|'goggles' and 'flashlight'|'torch'
     get their icons; icon:'nv'|'light' or an svg string otherwise). charge 0..1 -> battery bar, < 0.2 blinks.
     Touch: tapping a chip emits HUD.on('gadget',id).

   CALLS
   HUD.overlay(id, el)    mount a full-screen layer (above the world HUD, below the map and screens);
   HUD.overlay(id, null)  unmount (fades); HUD.overlay(id) returns the mounted element or null.
                          Elements with el.htModal=true hide the touch buttons while mounted.
   HUD.checkpoint(label, sub?)   2.2 s stage toast: "CHECKPOINT · Stage 2: The swap".
   HUD.kit.viewfinder()   -> {el, set({zoom:'2×',label,bracket:{x,y,w,h,label?}|null (screen px),
                              stars:0..3|null, flash:bool (rising edge fires the shutter), rec:bool,
                              hint:'[RMB] Lower · [Wheel] Zoom' ([X] becomes a keycap)}), close()}
   HUD.kit.choices({speaker,color?,prompt,tell,options:[{text,reg,disabled?}],onPick(i,opt),keys=true})
                          -> {el, set(sameShape) (a new round, unlocks), close()}
                          keys 1..n and tap; after a pick the strip locks until the next set().
                          reg chips: joke real over|overshare compliment (anything else is shown as is).
   HUD.kit.roles({kicker,title,roles:[{id,label,desc,need}],crew:[{id,name,color?,stars:{role:1..3}}],
                  assign:{role:crewId},entries:[{id,label,lock?}],entry,gear:[{id,label,where,have}],
                  forecast:[text|{text,tone:'good'|'bad'}],goLabel,backLabel,onChange({assign,entry}),
                  onGo({assign,entry}),onBack?})  -> {el, set(partial), get()->{assign,entry}, close()}
                          Tap a role row, then a crew chip (one role per person). Keys: 1..9 pick a role
                          row (entries continue the numbering); with a row picked, 1..9 pick a crew chip.
                          Enter = Go (only when every need>0 role is filled and, if there are entries,
                          an unlocked one is picked), Esc = drop the row selection, then onBack.
   Kit elements are meant for HUD.overlay(id, kit.el). close() unmounts. While a choices strip or a
   roles card is mounted, its keys are taken in the capture phase (so 1-3 don't switch guns).
   Screens: HUD.show('calendar', {title,kicker,day,entries:[{id,title,giver,place,hood,medal:0..3,best,
            runs,day,replayable,note}],selected}). Acts: 'calendar:replay' and 'calendar:close' (also Esc;
            the card hides itself). 'calendar:replay' passes the selected job id as the action's 2nd
            argument (HUD.on('action',(a,arg)=>…)); 'calendar:close' passes none. The card stays open
            on replay: the game calls HUD.hide('calendar'). No entries -> an empty-state note.
   Result card: res.restartLabel adds a ghost button with act 'result:restart' after 'result:retry'.
   ===================================================================== */
const MICON={
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  car:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 11l2-5h10l2 5h1v6h-2v2h-3v-2H9v2H6v-2H4v-6zm3.3-3.2L7.2 11h9.6l-1.1-3.2zM7 13a1.3 1.3 0 1 0 0 2.6A1.3 1.3 0 0 0 7 13zm10 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h16v10H10l-4 4v-4H4z"/></svg>',
  star:UI_ICON.star,
  mask:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8c3-1.5 6-1 9 .5C15 7 18 6.5 21 8c0 4.5-2 8-5 8-2 0-3-1.5-4-1.5S10 16 8 16c-3 0-5-3.5-5-8zm4.5 2.5a1.6 1.6 0 1 0 0 .1zm9 0a1.6 1.6 0 1 0 0 .1z"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.4 12 20 12 20z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L5 13.5h5.5L9.5 22 18 10h-5.5z"/></svg>',
  cam:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5h7l1.5 2.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1h3zM12 9.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z"/></svg>',
  nv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2.5 9.5h19V14a3 3 0 0 1-3 3h-3l-2-2.4h-3L8.5 17h-3a3 3 0 0 1-3-3z"/><path d="M8 9.5V6.5h8v3"/><circle cx="7.6" cy="13" r="1.7" fill="currentColor" stroke="none"/><circle cx="16.4" cy="13" r="1.7" fill="currentColor" stroke="none"/></svg>',
  light:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3.5 9.5h9l3-2.5v10l-3-2.5h-9z"/><path d="M6.5 12h3"/><path class="ray" d="M18.5 8.5l2.5-1.5M19 12h3M18.5 15.5l2.5 1.5"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h2v18H5z"/><path d="M8 4h11l-2.5 4L19 12H8z"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.5v11h-13V10zm2.4 0h5.2V7.5a2.6 2.6 0 0 0-5.2 0z"/></svg>'
};
const iconOf=k=>!k?'':String(k).trim().startsWith('<svg')?k:MICON[k]||UI_ICON[k]||'';
const chg=(o,k,v)=>{if(o[k]===v)return false;o[k]=v;return true};
const keycaps=s=>esc(s).replace(/\[([^\]]{1,12})\]/g,'<b class="ht-kc">$1</b>');
const MW={mt:[],wg:[],gd:[],gdKey:'',ov:new Map(),kits:[]};

/* ---------------- meters ---------------- */
const ZCOL={good:'var(--leaf)',warn:'var(--sun)',bad:'var(--alarm)'},ZLBL={good:'Good',warn:'Careful',bad:'Too far'};
function ringTick(f){const a=(f*360-90)*Math.PI/180;const p=r=>(24+Math.cos(a)*r).toFixed(2)+' '+(24+Math.sin(a)*r).toFixed(2);return `M${p(15.5)}L${p(22.5)}`}
function meterDom(s,style){s.style=style;s.e.dataset.s=style;s.zones=null;s.np=-1;s.c={};
  const hd='<div class="hd"><span class="ic"></span><span class="lb"></span><span class="vl ht-num"></span></div>';
  s.e.innerHTML=style==='ring'?`<svg class="rg" viewBox="0 0 48 48"><circle class="tk" cx="24" cy="24" r="19"/><circle class="fg" cx="24" cy="24" r="19" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" transform="rotate(-90 24 24)"/><path class="th" d="${ringTick(.35)}${ringTick(.6)}"/><g class="eye"><path d="M14.5 24s4-6 9.5-6 9.5 6 9.5 6-4 6-9.5 6-9.5-6-9.5-6z"/><circle cx="24" cy="24" r="3.1"/></g><text class="gl" x="24" y="25.5">?</text></svg><div class="tx">${hd}</div>`
    :style==='pips'?hd+'<div class="ht-pips"></div>'
    :style==='bands'?hd+'<div class="ht-bands"><div class="zs"></div><i class="tg"></i><i class="mk"></i></div><div class="zl"></div>'
    :hd+'<div class="ht-mbar"><b class="fl"></b><i class="wt"></i><i class="tg"></i></div>';
  const q=x=>s.e.querySelector(x);Object.assign(s,{ic:q('.ic'),lb:q('.lb'),vl:q('.vl'),fg:q('.fg'),eye:q('.eye'),gl:q('.gl'),fl:q('.fl'),wt:q('.wt'),tg:q('.tg'),mk:q('.mk'),zs:q('.zs'),zl:q('.zl'),pp:q('.ht-pips')})}
function sameZones(a,b){if(a===b)return true;if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++){const x=a[i],y=b[i];if(x.length!==y.length)return false;for(let j=0;j<x.length;j++)if(x[j]!==y[j])return false}return true}
function updMeters(list){list=list||[];const n=Math.min(3,list.length);
  if(chg(MW,'mtN',n)){cls(H.root,'has-mt',n>0);cls(H.root,'has-mt3',n>2)}
  for(let i=0;i<3;i++){let s=MW.mt[i];const m=list[i];
    if(i>=n){if(s)show(s.e,false);continue}
    if(!s){s=MW.mt[i]={e:el('div','ht-me',R.mt)};}
    const style=m.style==='ring'||m.style==='pips'||m.style==='bands'?m.style:'bar';
    if(s.style!==style)meterDom(s,style);
    if(s.e._v!==true||s.id!==m.id){s.id=m.id;show(s.e,true);anim(s.e,[{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'})}
    const c=s.c,max=m.max>0?m.max:1,v=+m.v||0,f=clamp(v/max,0,1);
    txt(s.lb,m.label);if(chg(c,'icon',m.icon))htm(s.ic,iconOf(m.icon));show(s.ic,!!m.icon);
    if(chg(c,'col',m.color||''))sty(s.e,'--mc',m.color||'');
    if(style==='bar'||style==='pips'){
      const w=m.warn!=null&&(m.warnBelow?v<m.warn:v>=m.warn);cls(s.e,'warn',w);txt(s.vl,m.sub);
      if(style==='bar'){if(chg(c,'f',Math.round(f*1000)))sty(s.fl,'transform',`scaleX(${(f).toFixed(3)})`);
        const wt=m.warn!=null?clamp(m.warn/max,0,1):-1;if(chg(c,'wt',wt)){show(s.wt,wt>0&&wt<1);sty(s.wt,'left',(wt*100).toFixed(2)+'%')}
        const tg=m.marker!=null?clamp(m.marker/max,0,1):-1;if(chg(c,'tg',tg)){show(s.tg,tg>=0);sty(s.tg,'left',(tg*100).toFixed(2)+'%')}}
      else{const np=clamp(Math.round(max),1,12);if(s.np!==np){s.np=np;s.pp.innerHTML='<i><b></b></i>'.repeat(np);s.pb=[...s.pp.querySelectorAll('b')];c.pv=null}
        if(chg(c,'pv',v))s.pb.forEach((b,k)=>{const p=clamp(v-k,0,1);sty(b,'transform',`scaleX(${p.toFixed(3)})`);cls(b.parentNode,'on',p>=1)})}}
    else if(style==='ring'){const lv=f>=1?3:f>=.6?2:f>=.35?1:0;
      if(chg(c,'f',Math.round(f*1000)))sty(s.fg,'strokeDashoffset',(100-f*100).toFixed(1));
      if(c.lv!==lv){if(lv>(c.lv??0))anim(s.e.querySelector('.rg'),[{transform:'scale(1.22)'},{transform:'scale(1)'}],{duration:380,easing:'cubic-bezier(.3,1.45,.45,1)'});c.lv=lv;for(let k=0;k<4;k++)cls(s.e,'lv'+k,k===lv)}
      const g=m.glyph!=null?m.glyph:lv===0?'':lv===3?'!':'?';txt(s.gl,g);sty(s.eye,'display',g?'none':'');sty(s.gl,'display',g?'':'none');txt(s.vl,m.sub)}
    else{/* bands */
      if(!sameZones(s.zones,m.zones)){const z=m.zones||[];s.zones=z.map(a=>a.slice());
        s.zs.innerHTML=z.map(([a,b,k])=>`<i class="z ${esc(k)}" style="left:${(clamp(a/max,0,1)*100).toFixed(2)}%;width:${(clamp((b-a)/max,0,1)*100).toFixed(2)}%"></i>`).join('');
        s.zl.innerHTML=z.map(([a,b,k,l])=>(b-a)/max<.14?'':`<span style="left:${(clamp(a/max,0,1)*100).toFixed(2)}%;width:${(clamp((b-a)/max,0,1)*100).toFixed(2)}%">${esc(l||'')}</span>`).join('');s.zi=[...s.zs.children];c.zone=-2}
      let zi=-1;for(let k=0;k<s.zones.length;k++){const z=s.zones[k];if(v>=z[0]&&(v<z[1]||(k===s.zones.length-1&&v<=z[1]))){zi=k;break}}
      if(zi<0&&s.zones.length)zi=v<s.zones[0][0]?0:s.zones.length-1;
      if(chg(c,'zone',zi)){s.zi.forEach((z,k)=>cls(z,'on',k===zi));const z=s.zones[zi];const k=z?z[2]:'good';sty(s.e,'--zc',ZCOL[k]||'var(--fg)');
        if(c.zone!==-2&&z)anim(s.vl,[{transform:'scale(1.18)'},{transform:'scale(1)'}],{duration:300,easing:'ease-out'})}
      const z=s.zones[zi];txt(s.vl,(z?(z[3]||ZLBL[z[2]]||''):'')+(m.sub?' · '+m.sub:''));
      if(chg(c,'f',Math.round(f*1000)))sty(s.mk,'transform',`translateX(${(f*100).toFixed(2)}%)`);
      const tg=m.marker!=null?clamp(m.marker/max,0,1):-1;if(chg(c,'tg',tg)){show(s.tg,tg>=0);sty(s.tg,'left',(tg*100).toFixed(2)+'%')}}
  }}

/* ---------------- widgets: timer / score / combo ---------------- */
function fmtTime(v){if(v<10){const t=Math.max(0,Math.ceil(v*10)/10);return t.toFixed(1)}const s=Math.ceil(v);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function updWidgets(list){list=list||[];const n=Math.min(4,list.length);
  if(chg(MW,'wgN',n))cls(H.root,'has-wg',n>0);
  for(let i=0;i<4;i++){let s=MW.wg[i];const w=list[i];
    if(i>=n){if(s)show(s.e,false);continue}
    if(!s){s=MW.wg[i]={e:el('div','ht-wi',R.wg,'<div class="lb"></div><div class="v ht-num"><span class="n"></span><span class="mx"></span></div><div class="br"><i></i></div><div class="sb"></div>')};
      Object.assign(s,{lb:s.e.querySelector('.lb'),v:s.e.querySelector('.v'),n:s.e.querySelector('.n'),mx:s.e.querySelector('.mx'),br:s.e.querySelector('.br'),bi:s.e.querySelector('.br i'),sb:s.e.querySelector('.sb'),c:{}})}
    const c=s.c,kind=w.kind==='score'||w.kind==='combo'?w.kind:'timer';
    if(chg(c,'kind',kind)||s.id!==w.id){s.id=w.id;s.e.dataset.k=kind;c.v=c.n=c.key=undefined;show(s.e,true);anim(s.e,[{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.8,.2,1)'})}
    show(s.e,true);txt(s.lb,w.label||({timer:'Time',score:'Score',combo:'Combo'})[kind]);txt(s.sb,w.sub);show(s.sb,!!w.sub);cls(s.e,'hot',!!w.hot);
    const v=+w.v||0;
    if(kind==='timer'){const key=v<10?Math.ceil(v*10):Math.ceil(v)*10+1000;if(chg(c,'key',key))txt(s.n,fmtTime(Math.max(0,v)));txt(s.mx,'');
      const hasB=w.max>0;show(s.br,hasB);if(hasB&&chg(c,'b',Math.round(clamp(v/w.max,0,1)*500)))sty(s.bi,'transform',`scaleX(${clamp(v/w.max,0,1).toFixed(3)})`)}
    else if(kind==='score'){const r=Math.round(v);if(c.v!==r){const up=c.v!=null&&r>c.v;if(up){anim(s.v,[{transform:'scale(1.28)',color:'#ffdd85'},{transform:'scale(1)',color:'#fff'}],{duration:420,easing:'cubic-bezier(.3,1.45,.45,1)'});
          const p=el('i','pl ht-num',s.e,'+'+(r-c.v).toLocaleString('en-US'));const a=anim(p,[{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(-6px)',offset:.2},{opacity:0,transform:'translateY(-22px)'}],{duration:900,easing:'ease-out',fill:'forwards'});if(a)a.onfinish=()=>p.remove();else setTimeout(()=>p.remove(),900)}
        c.v=r;txt(s.n,r.toLocaleString('en-US'))}
      if(chg(c,'mx',w.max))txt(s.mx,w.max!=null?'/'+Math.round(w.max).toLocaleString('en-US'):'');show(s.br,false)}
    else{const nn=w.n!=null?w.n:w.max!=null?w.max:1;if(c.n!==nn){if(c.n!=null&&nn>c.n)anim(s.v,[{transform:'scale(1.35) rotate(-4deg)'},{transform:'none'}],{duration:360,easing:'cubic-bezier(.3,1.45,.45,1)'});c.n=nn;txt(s.n,'×'+nn)}
      txt(s.mx,'');show(s.br,true);if(chg(c,'b',Math.round(clamp(v,0,1)*500)))sty(s.bi,'transform',`scaleX(${clamp(v,0,1).toFixed(3)})`);cls(s.e,'cold',v<=0)}
  }}

/* ---------------- gadgets (near the gun) ---------------- */
function gadgetIcon(g){if(g.icon)return iconOf(g.icon);const id=String(g.id||'').toLowerCase();return /nv|goggle|night/.test(id)?MICON.nv:/light|torch|lamp/.test(id)?MICON.light:UI_ICON.info}
function updGadgets(list){list=list||[];
  let same=list.length===MW.gd.length;if(same)for(let i=0;i<list.length;i++)if(MW.gd[i].id!==list[i].id){same=false;break}
  if(!same){R.gd.innerHTML='';MW.gd=list.map(g=>{const e=el('div','ht-gc',R.gd,`<span class="ic">${gadgetIcon(g)}</span><span class="lb"></span><b class="ht-kc"></b><span class="bt"><i></i></span>`);
      e.addEventListener('pointerdown',ev=>{ev.preventDefault();emit('gadget',g.id)});
      return{id:g.id,e,lb:e.querySelector('.lb'),kc:e.querySelector('.ht-kc'),bt:e.querySelector('.bt'),bi:e.querySelector('.bt i'),c:{}}})}
  show(R.gd,list.length>0);
  list.forEach((g,i)=>{const s=MW.gd[i];txt(s.lb,g.label||'');txt(s.kc,g.key||'');show(s.kc,!!g.key);
    if(chg(s.c,'on',!!g.on)){cls(s.e,'on',!!g.on);if(g.on)anim(s.e,[{transform:'scale(1.12)'},{transform:'none'}],{duration:260,easing:'cubic-bezier(.3,1.45,.45,1)'})}
    const has=g.charge!=null;show(s.bt,has);if(has){const ch=clamp(+g.charge,0,1);if(chg(s.c,'ch',Math.round(ch*200)))sty(s.bi,'transform',`scaleX(${ch.toFixed(3)})`);cls(s.e,'low',ch<.2);cls(s.e,'dead',ch<=0)}})}

/* ---------------- checkpoint toast ---------------- */
function checkpoint(label,sub){const e=R.cp;const m=/^(.*?):\s*(.+)$/.exec(String(label||''));
  e.innerHTML=`<span class="fg">${MICON.flag}</span><span class="tx"><span class="k">Checkpoint${m?' · '+esc(m[1]):''}</span><span class="t">${esc(m?m[2]:label||'')}</span>${sub?`<span class="s">${esc(sub)}</span>`:''}</span><i class="dr"></i>`;
  show(e,true);if(e._a)e._a.cancel();
  e._a=anim(e,[{opacity:0,transform:'translateY(-10px) scale(.96)',easing:'cubic-bezier(.3,1.45,.45,1)'},{opacity:1,transform:'none',offset:.12},{opacity:1,transform:'none',offset:.86,easing:'cubic-bezier(.5,0,.75,0)'},{opacity:0,transform:'translateY(-6px)'}],{duration:2200,fill:'forwards'});
  anim(e.querySelector('.dr'),[{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:2000,delay:150,fill:'both'});
  anim(e.querySelector('.fg'),[{transform:'rotate(-25deg) scale(.6)'},{transform:'none'}],{duration:500,delay:80,easing:'cubic-bezier(.3,1.45,.45,1)',fill:'backwards'});
  if(e._a)e._a.onfinish=()=>{show(e,false);e._a=null};else setTimeout(()=>show(e,false),2200)}

/* ---------------- overlay layer ---------------- */
function ovClasses(){let m=false,c=false,v=false;for(const e of MW.ov.values()){if(e.htModal)m=true;if(e.htChoices)c=true;if(e.htViewfinder)v=true}cls(H.root,'ovm',m);cls(H.root,'ovc',c);cls(H.root,'ovv',v)}
function overlay(id,e){const cur=MW.ov.get(id);if(e===undefined)return cur||null;
  if(cur===e)return e;
  if(cur){MW.ov.delete(id);cur.classList.add('out');clearTimeout(cur._ovT);const a=anim(cur,[{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});cur._ovT=setTimeout(()=>{if(![...MW.ov.values()].includes(cur))cur.remove()},a?190:0)}
  if(e){for(const[k,v]of MW.ov)if(v===e)MW.ov.delete(k);clearTimeout(e._ovT);e.classList.remove('out');e.classList.add('ht-ov');e.dataset.ov=id;MW.ov.set(id,e);R.ovl.appendChild(e);
    e.getAnimations&&e.getAnimations().forEach(a=>a.cancel());anim(e,[{opacity:0},{opacity:1}],{duration:200,easing:'ease-out'});if(e.htEnter)e.htEnter()}
  ovClasses();return e||null}
function kitClose(e){for(const[k,v]of MW.ov)if(v===e)return overlay(k,null);e.remove()}
function kitKeys(e){if(SCR.cur==='calendar')return calKey(e);
  if(SCR.cur||MAP.open||(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen()))return;
  const els=[...MW.ov.values()];for(let i=els.length-1;i>=0;i--){const k=els[i].htKey;if(k&&k(e)){e.preventDefault();e.stopPropagation();return}}}
const digitOf=e=>{const m=/^(?:Digit|Numpad)([1-9])$/.exec(e.code||'');return m?+m[1]:(/^[1-9]$/.test(e.key)?+e.key:0)};

/* ---------------- kit: viewfinder ---------------- */
function kitViewfinder(){const e=el('div','ht-vf');e.htViewfinder=true;
  e.innerHTML=`<div class="vg"></div><div class="fr"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><i class="g v1"></i><i class="g v2"></i><i class="g h1"></i><i class="g h2"></i>
  <div class="tp"><span class="rec"><i></i>REC</span><span class="md">${MICON.cam}Photo</span><span class="lb"></span></div><div class="st"></div><div class="zm ht-num"></div><div class="ft"></div></div>
  <div class="sj"><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><span class="sl"></span></div><div class="fl"></div>`;
  const q=x=>e.querySelector(x),S={c:{}},r={rec:q('.rec'),md:q('.md'),lb:q('.lb'),st:q('.st'),zm:q('.zm'),ft:q('.ft'),sj:q('.sj'),sl:q('.sl'),fl:q('.fl')};
  r.st.innerHTML='<span class="k">Grade</span>'+[0,1,2].map(()=>`<i>${UI_ICON.star}</i>`).join('');r.stars=[...r.st.querySelectorAll('i')];
  const api={el:e,set(o={}){const c=S.c;
    if('zoom' in o&&chg(c,'zoom',o.zoom)){txt(r.zm,o.zoom);show(r.zm,!!o.zoom);anim(r.zm,[{transform:'scale(1.25)'},{transform:'none'}],{duration:260,easing:'cubic-bezier(.3,1.45,.45,1)'})}
    if('label' in o){txt(r.lb,o.label);show(r.lb,!!o.label)}
    if('rec' in o){show(r.rec,!!o.rec);show(r.md,!o.rec)}
    if('hint' in o&&chg(c,'hint',o.hint))htm(r.ft,keycaps(o.hint||''));
    if('stars' in o){const n=o.stars;show(r.st,n!=null);if(n!=null&&chg(c,'stars',n)){r.stars.forEach((s,i)=>cls(s,'on',i<n));if(n>0)anim(r.stars[n-1],[{transform:'scale(1.6)'},{transform:'none'}],{duration:320,easing:'cubic-bezier(.3,1.45,.45,1)'})}}
    if('bracket' in o){const b=o.bracket;show(r.sj,!!b);if(b){sty(r.sj,'transform',`translate3d(${Math.round(b.x)}px,${Math.round(b.y)}px,0)`);sty(r.sj,'width',Math.round(b.w)+'px');sty(r.sj,'height',Math.round(b.h)+'px');txt(r.sl,b.label||'Subject');cls(r.sj,'ok',!!(b.ok||(o.stars||c.stars)>0))}}
    if('flash' in o){const f=!!o.flash;if(f&&!c.flash){anim(r.fl,[{opacity:.92},{opacity:0}],{duration:420,easing:'ease-out'});anim(e.querySelector('.fr'),[{scale:'.985'},{scale:'1'}],{duration:240,easing:'ease-out'})}c.flash=f}
    return api},close(){kitClose(e)}};
  api.set({rec:false,stars:null,bracket:null,label:'',zoom:'1×',hint:''});return api}

/* ---------------- kit: dialogue choices ---------------- */
const REG={joke:['Joke','#ffc94a'],real:['Keep it real','#6fb8ff'],over:['Overshare','#ff9a5c'],overshare:['Overshare','#ff9a5c'],compliment:['Compliment','#7fdc6e']};
function spkCol(sp){const s=String(sp||'').toLowerCase();return SPK_COL[s.split(' ').pop()]||SPK_COL[s]||'#ffc94a'}
function kitChoices(o={}){const e=el('div','ht-ch');e.htModal=true;e.htChoices=true;
  e.innerHTML='<div class="pl"><div class="hd"><b class="sp"></b><span class="pr"></span></div><div class="tl"></div><div class="ops"></div></div>';
  const q=x=>e.querySelector(x),sp=q('.sp'),pr=q('.pr'),tl=q('.tl'),ops=q('.ops');let O=o,locked=false,btns=[];
  function pick(i){const op=(O.options||[])[i];if(locked||!op||op.disabled)return false;locked=true;e.classList.add('lk');
    btns.forEach((b,k)=>{b.classList.toggle('pk',k===i);b.disabled=true});anim(btns[i],[{transform:'scale(1.04)'},{transform:'none'}],{duration:260,easing:'cubic-bezier(.3,1.45,.45,1)'});
    try{O.onPick&&O.onPick(i,op)}catch(err){console.error(err)}return true}
  const api={el:e,set(n={}){O=Object.assign({},O,n);locked=false;e.classList.remove('lk');
    txt(sp,O.speaker||'');show(sp,!!O.speaker);sty(sp,'color',O.color||spkCol(O.speaker));txt(pr,O.prompt||'');
    const t=O.tell?String(O.tell).trim():'';txt(tl,t?(t[0]==='['?t:'['+t+']'):'');show(tl,!!t);
    ops.innerHTML='';btns=(O.options||[]).map((op,i)=>{const rg=REG[op.reg]||[op.reg||'',null];
      const b=el('button','op',ops,`<b class="ht-kc">${i+1}</b><span class="tx">${esc(op.text)}</span>${rg[0]?`<i class="rg" style="--rc:${rg[1]||'rgba(255,255,255,.7)'}">${esc(rg[0])}</i>`:''}`);
      b.disabled=!!op.disabled;b.addEventListener('click',ev=>{ev.stopPropagation();pick(i)});return b});
    btns.forEach((b,i)=>anim(b,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:300,delay:60+i*60,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'}));
    return api},pick,close(){kitClose(e)}};
  e.htKey=ev=>{if(O.keys===false||ev.repeat)return false;const d=digitOf(ev);return d>0&&d<=btns.length?(pick(d-1),true):false};
  return api.set()}

/* ---------------- kit: crew roles card ---------------- */
function stars(n,of=3){let h='';for(let i=0;i<of;i++)h+=`<i class="${i<n?'on':''}">${UI_ICON.star}</i>`;return `<span class="ht-stars">${h}</span>`}
function kitRoles(o={}){const e=el('div','ht-rc');e.htModal=true;
  const S={o:Object.assign({},o),assign:Object.assign({},o.assign||{}),entry:o.entry??null,sel:null};
  e.innerHTML=`<div class="scrim"></div><div class="pn" role="dialog"><div class="ph"><div class="kick"></div><h2></h2></div><div class="bd">
    <section class="s-ro"><h3>Roles<small></small></h3><div class="ro"></div><h3 class="ch">Crew<small></small></h3><div class="cw"></div></section>
    <section class="s-gr"><h3>Gear</h3><div class="gr"></div></section><section class="s-en"><h3>Entry</h3><div class="en"></div></section>
    <section class="s-fc"><h3>Forecast</h3><ul class="fc"></ul></section></div>
    <div class="pf"><span class="why"></span><button class="ht-btn ghost bk"></button><button class="ht-btn pri go"></button></div></div>`;
  const q=x=>e.querySelector(x),ro=q('.ro'),cw=q('.cw'),gr=q('.gr'),en=q('.en'),fc=q('.fc'),why=q('.why'),go=q('.go'),bk=q('.bk');
  const crew=id=>(S.o.crew||[]).find(c=>c.id===id),roleOf=cid=>{for(const k in S.assign)if(S.assign[k]===cid)return k;return null};
  const missing=()=>(S.o.roles||[]).filter(r=>(r.need||0)>0&&!S.assign[r.id]);
  const entryOk=()=>{const es=S.o.entries||[];if(!es.length||S.o.needEntry===false)return true;const x=es.find(z=>z.id===S.entry);return !!(x&&!x.lock)};
  const ready=()=>!missing().length&&entryOk();
  const changed=()=>{render();try{S.o.onChange&&S.o.onChange(api.get())}catch(err){console.error(err)}};
  function assign(rid,cid){if(!rid)return;if(S.assign[rid]===cid){delete S.assign[rid]}else{for(const k in S.assign)if(S.assign[k]===cid)delete S.assign[k];S.assign[rid]=cid;
      const nx=(S.o.roles||[]).find(r=>!S.assign[r.id]&&(r.need||0)>0)||(S.o.roles||[]).find(r=>!S.assign[r.id]);S.sel=nx?nx.id:null}changed()}
  function selRole(id){S.sel=S.sel===id?null:id;render()}
  function pickCrew(cid){let r=S.sel;if(!r){const m=missing()[0]||(S.o.roles||[]).find(x=>!S.assign[x.id]);r=m&&m.id}if(!r)return;assign(r,cid)}
  function pickEntry(id){const x=(S.o.entries||[]).find(z=>z.id===id);if(!x||x.lock)return;S.entry=id;changed()}
  function render(){const O=S.o,roles=O.roles||[],cr=O.crew||[],es=O.entries||[];
    txt(q('.kick'),O.kicker||'The plan');txt(q('h2'),O.title||'Who does what');
    q('.s-ro h3 small').textContent=missing().length?missing().length+' to fill':'All set';q('.s-ro h3 small').className=missing().length?'':'ok';
    ro.innerHTML=roles.map((r,i)=>{const c=crew(S.assign[r.id]);const st=c&&c.stars?c.stars[r.id]||0:0;
      return `<button class="rr${S.sel===r.id?' sel':''}${c?' fill':''}${(r.need||0)>0&&!c?' req':''}" data-r="${esc(r.id)}"><b class="ht-kc">${i+1}</b><span class="tx"><span class="l">${esc(r.label)}${(r.need||0)>0?'<em>Required</em>':''}</span><span class="d">${esc(r.desc||'')}</span></span>
      <span class="as">${c?`<span class="av" style="--c:${c.color||portraitColor(c.name)}">${esc(initials(c.name))}</span><span class="nm">${esc(c.name)}${stars(st)}</span>`:`<span class="em">${S.sel===r.id?'Pick someone':'Tap to assign'}</span>`}</span></button>`}).join('');
    const sr=roles.find(r=>r.id===S.sel);
    q('.ch small').textContent=sr?'Pick a '+sr.label.toLowerCase():'Tap a role first';
    cw.classList.toggle('arm',!!sr);
    cw.innerHTML=cr.map((c,i)=>{const on=roleOf(c.id),st=sr&&c.stars?c.stars[sr.id]||0:0,rl=on&&roles.find(r=>r.id===on);
      return `<button class="cc${on?' used':''}${sr&&S.assign[sr.id]===c.id?' cur':''}" data-c="${esc(c.id)}"><b class="ht-kc">${i+1}</b><span class="av" style="--c:${c.color||portraitColor(c.name)}">${esc(initials(c.name))}</span><span class="tx"><span class="nm">${esc(c.name)}</span>${sr?stars(st):`<span class="rl">${rl?esc(rl.label):'Free'}</span>`}</span></button>`}).join('');
    gr.innerHTML=(O.gear||[]).map(g=>`<div class="gi${g.have?' ok':''}"><i class="bx"></i><span class="l">${esc(g.label)}</span><span class="w">${g.have?'Packed':esc(g.where||'Missing')}</span></div>`).join('')||'<div class="none">Nothing to borrow.</div>';
    en.innerHTML=es.map((x,i)=>`<button class="er${S.entry===x.id?' sel':''}${x.lock?' lk':''}" data-e="${esc(x.id)}"${x.lock?' aria-disabled="true"':''}><b class="ht-kc">${roles.length+i+1}</b><i class="rd"></i><span class="tx"><span class="l">${esc(x.label)}</span>${x.lock?`<span class="lr">${MICON.lock}${esc(x.lock)}</span>`:''}</span></button>`).join('')||'<div class="none">Front door. Like normal people.</div>';
    fc.innerHTML=(O.forecast||[]).map(f=>{const F=typeof f==='string'?{text:f}:f;return `<li class="${esc(F.tone||'')}">${esc(F.text)}</li>`}).join('')||'<li class="none">Assign the crew to see how it plays out.</li>';
    q('.s-gr').hidden=!(O.gear||[]).length&&O.showEmpty===false;q('.s-en').hidden=!es.length&&O.showEmpty===false;
    const m=missing();go.disabled=!ready();go.innerHTML=esc(O.goLabel||'Go')+'<span class="ht-kc dim">Enter</span>';
    why.textContent=m.length?'Needs '+m.map(r=>r.label).join(', '):!entryOk()?'Pick a way in':'Ready when you are';why.classList.toggle('ok',ready());
    bk.hidden=!O.onBack;bk.innerHTML=esc(O.backLabel||'Not yet')+'<span class="ht-kc dim">Esc</span>'}
  e.addEventListener('click',ev=>{const t=ev.target.closest('button');if(!t||!e.contains(t))return;ev.stopPropagation();
    if(t.dataset.r)selRole(t.dataset.r);else if(t.dataset.c)pickCrew(t.dataset.c);else if(t.dataset.e)pickEntry(t.dataset.e);
    else if(t===go&&ready()){try{S.o.onGo&&S.o.onGo(api.get())}catch(err){console.error(err)}}else if(t===bk&&S.o.onBack)S.o.onBack()});
  e.htKey=ev=>{if(ev.repeat)return false;const d=digitOf(ev),R2=S.o.roles||[];
    if(d){if(S.sel){const c=(S.o.crew||[])[d-1];if(c){pickCrew(c.id);return true}return false}
      if(d<=R2.length){selRole(R2[d-1].id);return true}const x=(S.o.entries||[])[d-1-R2.length];if(x){pickEntry(x.id);return true}return false}
    if(ev.key==='Enter'){if(ready()&&S.o.onGo)S.o.onGo(api.get());return true}
    if(ev.key==='Escape'||ev.key==='Backspace'){if(S.sel){S.sel=null;render();return true}if(S.o.onBack){S.o.onBack();return true}return ev.key==='Escape'}
    return false};
  const api={el:e,set(p={}){Object.assign(S.o,p);if(p.assign)S.assign=Object.assign({},p.assign);if('entry' in p)S.entry=p.entry;if(S.sel&&!(S.o.roles||[]).some(r=>r.id===S.sel))S.sel=null;render();return api},
    get(){return{assign:Object.assign({},S.assign),entry:S.entry}},close(){kitClose(e)}};
  e.htEnter=()=>{anim(q('.pn'),[{opacity:0,transform:'translateY(16px) scale(.98)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.2,1)'})};
  render();return api}

/* ---------------- calendar / replay card (HUD.show('calendar',…)) ---------------- */
const MONTHS=['September','October','November','December','January','February','March','April','May','June','July','August'];
const MEDAL=['Done','Bronze','Silver','Gold'];
const CAL={page:0};
function calPageOf(day){return Math.max(0,Math.floor(((day||1)-1)/30))}
function screenCalendar(d){const e=el('div','ht-scr ht-cal');const ents=(d.entries||[]).slice().sort((a,b)=>(b.day||0)-(a.day||0)||String(a.title).localeCompare(b.title));d._ents=ents;
  if(d.selected==null&&ents.length)d.selected=ents[0].id;
  const sel=ents.find(x=>x.id===d.selected);CAL.page=calPageOf(sel?sel.day:d.day);
  e.innerHTML=`<div class="scrim full"></div><div class="wrap"><div class="paper"><i class="mag"></i><div class="ph"><div><div class="yr">Fridge calendar</div><h3 class="mo"></h3></div><div class="nv"><button data-pg="-1" aria-label="Previous month">‹</button><button data-pg="1" aria-label="Next month">›</button></div></div>
    <div class="wk">${['S','M','T','W','T','F','S'].map(x=>`<span>${x}</span>`).join('')}</div><div class="gd"></div><div class="lg"><span><i class="ht-pin m3"></i>Gold</span><span><i class="ht-pin m2"></i>Silver</span><span><i class="ht-pin m1"></i>Bronze</span><span><i class="ht-pin m0"></i>Done</span></div></div>
    <div class="side"><div class="kick">${esc(d.kicker||'Replay a job')}</div><h2>${esc(d.title||'The calendar')}</h2>${d.goal?`<p class="goal">${esc(d.goal)}</p>`:''}<div class="ls"></div><div class="dt"></div>
    <div class="ht-btns row"><button class="ht-btn pri" data-cal="replay">Replay<span class="ht-kc dim">Enter</span></button><button class="ht-btn ghost" data-cal="close">Close<span class="ht-kc dim">Esc</span></button></div>
    <p class="note">Replays pay half; no story changes.</p></div></div>`;
  e.addEventListener('click',ev=>{const t=ev.target.closest('[data-cal],[data-pg],[data-id]');if(!t)return;ev.stopPropagation();
    if(t.dataset.pg){CAL.page=Math.max(0,CAL.page+ +t.dataset.pg);calRender(e,d)}
    else if(t.dataset.id){calSelect(t.dataset.id,true)}
    else if(t.dataset.cal==='replay')calAct('replay');else if(t.dataset.cal==='close')calAct('close')});
  calRender(e,d);return e}
function calSelect(id,keepPage){const d=SCR.data.calendar,e=SCR.el.calendar;if(!d||!e)return;const x=d._ents.find(z=>String(z.id)===String(id));if(!x)return;d.selected=x.id;CAL.page=calPageOf(x.day);calRender(e,d)}
function calAct(a){const d=SCR.data.calendar;if(!d)return;const x=d._ents.find(z=>z.id===d.selected)||null;
  if(a==='replay'&&(!x||x.replayable===false))return;
  d.id=x?x.id:null;d.entry=x;if(a==='close'){hideScreen('calendar');emit('action','calendar:close')}else emit('action','calendar:replay',x.id)}
function calKey(e){const d=SCR.data.calendar;if(!d)return;const k=e.key;let used=true;const i=d._ents.findIndex(x=>x.id===d.selected);
  if(k==='Escape')calAct('close');
  else if(k==='ArrowDown'||e.code==='KeyS'){const x=d._ents[Math.min(d._ents.length-1,i+1)];x&&calSelect(x.id)}
  else if(k==='ArrowUp'||e.code==='KeyW'){const x=d._ents[Math.max(0,i-1)];x&&calSelect(x.id)}
  else if(k==='ArrowLeft'||e.code==='KeyQ'){CAL.page=Math.max(0,CAL.page-1);calRender(SCR.el.calendar,d)}
  else if(k==='ArrowRight'||e.code==='KeyE'){CAL.page++;calRender(SCR.el.calendar,d)}
  else if(k==='Enter'&&!(e.target&&e.target.tagName==='BUTTON'))calAct('replay');
  else used=false;
  if(used){e.preventDefault();e.stopPropagation()}}
function calRender(e,d){const ents=d._ents,p=CAL.page,first=p*30+1,wd=(6+p*30)%7;/* in-game day 1 is a Saturday */
  e.querySelector('.mo').textContent=MONTHS[p%12];
  let h='';for(let i=0;i<wd;i++)h+='<i class="x"></i>';
  for(let k=0;k<30;k++){const day=first+k,on=ents.filter(x=>x.day===day),sel=on.some(x=>x.id===d.selected);
    h+=`<div class="dy${day===d.day?' td':''}${sel?' sel':''}${on.length?' has':''}"${on.length?` data-id="${esc(on[0].id)}"`:''}><b>${k+1}</b>${on.length?`<span class="pins">${on.slice(0,3).map(x=>`<i class="ht-pin m${clamp(x.medal|0,0,3)}"></i>`).join('')}${on.length>3?'<em>+'+(on.length-3)+'</em>':''}</span><span class="tt">${esc(on[0].title)}</span>`:''}</div>`}
  const tail=(7-(wd+30)%7)%7;for(let i=0;i<tail;i++)h+='<i class="x"></i>';
  e.querySelector('.gd').innerHTML=h;
  e.querySelector('[data-pg="-1"]').disabled=p<=0;
  const ls=e.querySelector('.ls');ls.innerHTML=ents.length?ents.map(x=>`<button class="ce${x.id===d.selected?' sel':''}" data-id="${esc(x.id)}"><i class="ht-pin m${clamp(x.medal|0,0,3)}"></i><span class="tx"><span class="t">${esc(x.title)}</span><span class="g">${esc([x.giver,x.place].filter(Boolean).join(' · '))}</span></span><span class="b ht-num">${esc(x.best||'')}</span></button>`).join(''):'<div class="none">Nothing on the fridge yet. Finish a job and it gets a pin.</div>';
  const x=ents.find(z=>z.id===d.selected);const dt=e.querySelector('.dt'),rp=e.querySelector('[data-cal=replay]');
  if(!x){dt.innerHTML='';rp.disabled=true;return}
  const m=clamp(x.medal|0,0,3),dd=x.day?MONTHS[calPageOf(x.day)%12].slice(0,3)+' '+(((x.day-1)%30)+1):'';
  dt.innerHTML=`<div class="hd"><i class="ht-pin big m${m}"></i><div><div class="k">${esc(MEDAL[m])}${m?' medal':''}${dd?' · '+esc(dd):''}</div><h3>${esc(x.title)}</h3><div class="g">${esc([x.giver,x.place,x.hood].filter(Boolean).join(' · '))}</div></div></div>
    <div class="ht-meta"><div><b>Best</b><span class="ht-num">${esc(x.best||'—')}</span></div><div><b>Runs</b><span class="ht-num">${esc(x.runs!=null?x.runs:'—')}</span></div><div><b>Medal</b><span>${[1,2,3].map(k=>`<i class="ht-pin sm m${k<=m?k:'n'}"></i>`).join('')}</span></div></div>
    ${x.note?`<p class="nt">${esc(x.note)}</p>`:''}`;
  const sr=e.querySelector('.ls .sel');if(sr&&sr.scrollIntoView)sr.scrollIntoView({block:'nearest'});
  rp.disabled=x.replayable===false;rp.firstChild.textContent=x.replayable===false?'Not replayable yet':'Replay'}

const HUD={
  init(rootEl,opt={}){H.root=rootEl||document.body.appendChild(document.createElement('div'));if(opt.touch!=null)H.forceTouch=opt.touch;if(opt.compact!=null)H.forceCompact=opt.compact;build(H.root);
    addEventListener('keydown',e=>{if(!MAP.open&&((HUD.blockKeys&&HUD.blockKeys())||(window.HT&&HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen())))return;if(e.code==='KeyM'&&(MAP.open||!SCR.cur)&&!e.repeat&&opt.mapKey!==false){MAP.toggle();e.stopPropagation()}else if(e.code==='Escape'&&MAP.open){MAP.close();e.preventDefault();e.stopPropagation()}else if(MAP.open)mapKey(e)},true);
    addEventListener('keydown',kitKeys,true);
    /* canvases draw text with the web fonts: redraw once they are in */
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{CMP.last='';MAP.dirty=true});
    return HUD},
  update,
  on,emit,
  hit,damage,feed,toast,ammoToast,banner,payout,checkpoint,overlay,
  kit:{viewfinder:kitViewfinder,choices:kitChoices,roles:kitRoles},
  show:showScreen,hide:hideScreen,set:setScreen,
  dialog,closeDialog,get dialogOpen(){return!!DLG.el},
  get screen(){return SCR.cur},
  minimap:{routeStats:()=>Object.assign({},RT.stats),setRegions(r){MM.regions=r||null;MAP.dirty=true},setLevel,route(pts){MM.route=pts?pts.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:p):null;MM.routeTo=null},findRoute,setPins(p){MM.pins=p||[];MAP.dirty=true},overlay(fn){MM.overlay=fn||null;MAP.dirty=true},
    openMap:()=>MAP.openMap(),closeMap:()=>MAP.close(),toggleMap:()=>MAP.toggle(),get mapOpen(){return MAP.open},onFastTravel(fn){MAP.onTravel=fn},zoom(z){MM.zoom=z},reveal(x,z){reveal(x,z)}},
  touch:{
    /* stick visuals: x,y in -1..1, active flag, optional screen origin {ox,oy} for a floating stick */
    stick(x,y,active,ox,oy){const s=R.stick;cls(s,'on',!!active);if(ox!=null){sty(s,'left',(ox-66)+'px');sty(s,'top',(oy-66)+'px');sty(s,'bottom','auto')}else{sty(s,'left','');sty(s,'top','');sty(s,'bottom','')}
      sty(R.knob,'transform',`translate(${(clamp(x||0,-1,1)*38).toFixed(1)}px,${(clamp(y||0,-1,1)*38).toFixed(1)}px)`)},
    get buttons(){return R.tbtn},set enabled(v){show(R.touch,v)}},
  /* current settings values shown by the pause/settings screen (keys from settingsSchema) */
  get settings(){return H.settings},set settings(v){H.settings=Object.assign(H.settings,v||{});if(v&&'subs' in v)H.subsOn=v.subs;if(v&&'mmRotate' in v)H.mmRotate=v.mmRotate},
  setTouch(v){H.forceTouch=v;resize()},setCompact(v){H.forceCompact=v;resize()},
  icons:{gun:gunSVG,marker:iconSVG,ui:UI_ICON},tiers:TIERS,tierOf,settingsSchema:SETTINGS,
  payoutEl:null
};
HT.HUD=HUD;
})();
