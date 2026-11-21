/* High Trust · HT.Keys — keyboard and mouse rebinding (Pause → Key bindings), and the Aim hold/toggle option.
   The game and its modules read fixed inputs (index.html, jobs, eggs, free roam). Rather than touch every listener, this remaps at the
   door: capture-phase listeners on window turn the player's input into the default input for that action (a key, or a mouse button on
   the 3D view) and swallow a default input whose action moved elsewhere. Every module keeps seeing what it always saw.
   Inputs: keys, and mouse buttons 'mouse1'..'mouse5' (left, right, middle, back, forward). Left/right clicks are only remapped on the
   3D view, so menus always click. 1-2-3, Esc/P and Enter stay fixed. Taking an input another action uses swaps the two.
   Bindings live in 'ht-keys' (localStorage, or the save file in the desktop shell), only the changed ones.
   Keycaps on screen show the player's input: js/gamepad.js asks HT.Keys.relabel() when it swaps glyphs.
   Aim mode (Controls tab): 'hold' (default, as before) or 'toggle', for the right mouse button and the controller's LT. */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const ACTIONS=[
  {id:'fire',l:'Fire',k:'mouse1'},{id:'aim',l:'Aim',k:'mouse2'},
  {id:'fwd',l:'Move forward',k:'w'},{id:'left',l:'Move left',k:'a'},{id:'back',l:'Move back',k:'s'},{id:'right',l:'Move right',k:'d'},
  {id:'jog',l:'Jog · boost',k:'shift'},{id:'jump',l:'Jump · vault · handbrake',k:' '},{id:'crouch',l:'Crouch',k:'c'},{id:'reload',l:'Reload',k:'r'},
  {id:'use',l:'Use · zip-tie · talk · get in',k:'e'},{id:'gun',l:'Next gun',k:'q'},{id:'view',l:'Camera',k:'v'},{id:'map',l:'Map',k:'m'},
  {id:'deco',l:'Decorate (at home)',k:'b'},{id:'flash',l:'Flashlight',k:'f'},{id:'nvg',l:'Night vision',k:'n'},{id:'horn',l:'Horn',k:'h'},{id:'glove',l:'Glovebox',k:'g'}];
const FIXED=[['Switch gun','1 2 3 · Wheel'],['Pause','Esc · P'],['Drive','Same as move']];
const RESERVED=new Set(['escape','p','1','2','3','enter','tab','meta','alt','f11','f12','contextmenu']);
const STORE=()=>window.HTDesktop?HTDesktop.storage:window.localStorage;
/* Aim: Toggle (default, owner rule: on keyboard/mouse every aim / raise mode is a toggle; the view holds until you click again) or Hold.
   One setting for Mouse 2, the controller's LT, the Higher Ground scope and hold-breath (Shift), binoculars and the job camera.
   Until the player picks one, the controller's LT keeps the console convention (hold); once picked, it follows the setting too. */
let B={},AIM='toggle',AIM_SET=false;
try{const o=JSON.parse(STORE().getItem('ht-keys')||'{}')||{};AIM_SET=o.__aim==='hold'||o.__aim==='toggle';AIM=o.__aim==='hold'?'hold':'toggle';delete o.__aim;B=o}catch(e){B={}}
const def=id=>ACTIONS.find(a=>a.id===id).k;
const get=id=>B[id]||def(id);
let T={};
function build(){T={};for(const a of ACTIONS){const c=get(a.id);if(c!==a.k)T[c]=a.k}for(const a of ACTIONS)if(get(a.id)!==a.k&&!(a.k in T))T[a.k]=null}
function save(){try{STORE().setItem('ht-keys',JSON.stringify(Object.assign({},B,AIM_SET?{__aim:AIM}:{})))}catch(e){}build();try{HT.Pad&&HT.Pad.swapGlyphs&&HT.Pad.swapGlyphs()}catch(e){}}
build();
const NAMES={' ':'Space',shift:'Shift',control:'Ctrl',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→',backspace:'Bksp',capslock:'Caps',
  mouse1:'Mouse 1',mouse2:'Mouse 2',mouse3:'Mouse 3',mouse4:'Mouse 4',mouse5:'Mouse 5'};
const name=k=>NAMES[k]||(k.length===1?k.toUpperCase():k[0].toUpperCase()+k.slice(1));
const isMouse=k=>/^mouse[1-5]$/.test(k);
const keyOf=k=>k===' '?' ':k==='shift'?'Shift':k==='control'?'Control':k.length===1?k:k[0].toUpperCase()+k.slice(1);
const codeOf=k=>k===' '?'Space':k==='shift'?'ShiftLeft':k==='control'?'ControlLeft':/^[a-z]$/.test(k)?'Key'+k.toUpperCase():/^\d$/.test(k)?'Digit'+k:keyOf(k);
/* DOM button numbers: 0 left, 1 middle, 2 right, 3 back, 4 forward */
const BTN2IN=['mouse1','mouse3','mouse2','mouse4','mouse5'],IN2BTN={mouse1:0,mouse3:1,mouse2:2,mouse4:3,mouse5:4};
const view=()=>document.getElementById('c');
const playing=()=>{const I=HT.Input;return !!(I&&I.running&&!I.paused)};

/* ---------- emit a default input ---------- */
function emit(to,down,src){
  if(isMouse(to)){const I=HT.Input;if(!I||(down&&!playing()))return;
    /* Fire and Aim go straight to the game's trigger and aim state (a synthetic click would ask for pointer lock instead) */
    if(to==='mouse1'){I.fire(down);return}
    if(to==='mouse2'){if(AIM==='toggle'){if(down)I.aim(!I.aiming)}else I.aim(down);return}
    const cv=view();if(cv)cv.dispatchEvent(new MouseEvent(down?'mousedown':'mouseup',{button:IN2BTN[to],buttons:down?1:0,bubbles:true,cancelable:true,view:window}));return}
  (src&&src.target||document).dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:keyOf(to),code:codeOf(to),repeat:!!(src&&src.repeat),shiftKey:to==='shift'?down:!!(src&&src.shiftKey),ctrlKey:!!(src&&src.ctrlKey),altKey:!!(src&&src.altKey),bubbles:true,cancelable:true}))}

/* ---------- remap ---------- */
const held={};/* physical input -> default input sent on press, so the release matches even if bindings change in between */
let capture=null;
function stale(){if(capture&&!document.querySelector('.ht-rb.wait'))capture=null;return !capture}/* the screen closed mid-capture */
function onKey(e){
  if(capture&&e.type==='keydown'&&!stale()){if(!e.isTrusted&&e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();capture(String(e.key||'').toLowerCase());return}
  if(capture||!e.isTrusted)return;const k=String(e.key||'').toLowerCase();
  let to;if(e.type==='keydown'){if(!(k in T))return;to=T[k];held[k]=to}else{if(!(k in held))return;to=held[k];delete held[k]}
  e.preventDefault();e.stopImmediatePropagation();if(to!=null)emit(to,e.type==='keydown',e)}
function onMouse(e){
  const k=BTN2IN[e.button];if(!k)return;
  if(capture&&e.type==='mousedown'&&e.isTrusted&&!stale()){if(e.button===0&&!capture.mouseOk)return;/* a plain click elsewhere cancels via the click handler */e.preventDefault();e.stopImmediatePropagation();capture(k);return}
  if(!e.isTrusted)return;
  const onView=e.target===view();
  if(e.type==='mousedown'){
    /* not rebound: the game's own listeners handle it (index.html: Mouse 2 toggles or holds per Aim; js/photo.js: the job camera) */
    if(!(k in T))return;
    if((k==='mouse1'||k==='mouse2')&&!onView)return;/* menus keep their clicks */
    if(!playing()&&isMouse(T[k]||''))return;
    const to=T[k];held[k]=to;e.preventDefault();e.stopImmediatePropagation();if(to!=null)emit(to,true,e)}
  else{if(!(k in held))return;const to=held[k];delete held[k];e.preventDefault();e.stopImmediatePropagation();if(to!=null)emit(to,false,e)}}
addEventListener('keydown',onKey,true);addEventListener('keyup',onKey,true);
addEventListener('mousedown',onMouse,true);addEventListener('mouseup',onMouse,true);
/* back/forward buttons must not navigate */
addEventListener('auxclick',e=>{if(e.button===3||e.button===4)e.preventDefault()},true);

/* ---------- labels ---------- */
/* keycap text of a default input ('E', 'Space', 'Mouse 1') -> the player's input, or null when unchanged */
function relabel(txt){const t=String(txt).trim().toLowerCase(),k=t==='space'?' ':t.replace(/^mouse\s+/,'mouse');const a=ACTIONS.find(x=>x.k===k);if(!a)return null;const c=get(a.id);return c===a.k?null:name(c)}

/* ---------- the Key bindings screen (js/hud.js calls table() and bind()) ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function table(){return'<h3>Keyboard &amp; mouse</h3><div class="ht-set"><label>Aim<small>Mouse 2 and the controller\'s LT</small></label><div class="ht-seg3" data-aim>'+
  [['hold','Hold'],['toggle','Toggle']].map(([v,l])=>`<button aria-pressed="${AIM===v}" data-v="${v}">${l}</button>`).join('')+'</div></div>'+
  '<div class="ht-keys ht-rebind">'+
  ACTIONS.map(a=>`<div><span>${esc(a.l)}</span><span><button class="ht-kc ht-rb${B[a.id]?' chg':''}" data-rebind="${a.id}" aria-label="Rebind ${esc(a.l)}">${esc(name(get(a.id)))}</button></span></div>`).join('')+
  FIXED.map(([l,k])=>`<div><span>${esc(l)}</span><span>${k.split(' · ').map(x=>`<b class="ht-kc">${esc(x)}</b>`).join('<em style="opacity:.4;font-style:normal;margin:0 2px">/</em>')}</span></div>`).join('')+
  '</div><p class="ht-rb-note" style="font-size:13px;opacity:.7;margin-top:10px">Click an input, then press a key or mouse button (Esc cancels). Taking one another action uses swaps them.</p>'+
  '<button class="ht-btn ghost" data-rebind-reset style="margin-top:8px">Reset to defaults</button>'}
function assign(id,k){const old=get(id),other=ACTIONS.find(a=>a.id!==id&&get(a.id)===k);B[id]=k;if(other)B[other.id]=old;for(const a of ACTIONS)if(B[a.id]===a.k)delete B[a.id];save();return other?other.l:null}
function bind(pane,rerender){
  pane.querySelectorAll('[data-rebind]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(capture)return;const id=b.dataset.rebind,note=pane.querySelector('.ht-rb-note');
    b.textContent='Press a key or button';b.classList.add('wait');
    let over=false;
    const done=()=>{over=true;capture=null;removeEventListener('click',cancel,true);rerender()};
    const cancel=ev=>{if(over){removeEventListener('click',cancel,true);return}if(ev.target!==b){ev.stopPropagation();ev.preventDefault();done()}};
    /* armed after this click has finished; never if the capture already ended (a key pressed within the same tick) */
    setTimeout(()=>{if(!over)addEventListener('click',cancel,true)},0);
    capture=k=>{if(k==='escape'){done();return}
      if(RESERVED.has(k)||!k){if(note)note.textContent=name(k||'?')+' is reserved. Pick another, or Esc to cancel.';return}
      const swapped=assign(id,k);done();const n=pane.querySelector('.ht-rb-note');if(n&&swapped)n.textContent='Swapped: '+swapped+' is now on '+name(get(ACTIONS.find(a=>a.l===swapped).id))+'.'};
    capture.mouseOk=id==='fire'||id==='aim';/* for the rest, a left click elsewhere cancels */});
  const r=pane.querySelector('[data-rebind-reset]');if(r)r.onclick=e=>{e.stopPropagation();B={};AIM='toggle';AIM_SET=false;save();rerender()};
  pane.querySelectorAll('[data-aim] button').forEach(x=>x.onclick=e=>{e.stopPropagation();AIM=x.dataset.v;AIM_SET=true;save();rerender()})}

HT.Keys={ACTIONS,get:get,relabel,table,bind,name,get changed(){return Object.keys(B).length>0},get aimMode(){return AIM},set aimMode(v){AIM=v==='hold'?'hold':'toggle';AIM_SET=true;save()},aimHold:()=>AIM==='hold',get padAimMode(){return AIM_SET?AIM:'hold'},
  set(id,k){if(!ACTIONS.some(a=>a.id===id))return false;k=String(k).toLowerCase();if(RESERVED.has(k))return false;assign(id,k);return true},
  reset(){B={};AIM='toggle';AIM_SET=false;save()},get map(){return Object.assign({},T)}};
})();
