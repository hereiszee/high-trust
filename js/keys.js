/* High Trust · HT.Keys — keyboard rebinding (Pause → Key bindings).
   The game and its modules read fixed keys (index.html, jobs, eggs, free roam). Rather than touch every listener, this remaps at the
   door: a capture-phase listener on window turns the player's key into the default key for that action, and swallows a default key
   whose action moved elsewhere. Every module then sees the keys it always saw. Mouse buttons, 1-2-3, Esc/P and Enter stay fixed.
   Bindings live in 'ht-keys' (localStorage, or the save file in the desktop shell), only the changed ones.
   Keycaps on screen (prompts, driving hints) show the player's key: js/gamepad.js asks HT.Keys.relabel() when it swaps glyphs. */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const ACTIONS=[
  {id:'fwd',l:'Move forward',k:'w'},{id:'left',l:'Move left',k:'a'},{id:'back',l:'Move back',k:'s'},{id:'right',l:'Move right',k:'d'},
  {id:'jog',l:'Jog · boost',k:'shift'},{id:'jump',l:'Jump · vault · handbrake',k:' '},{id:'crouch',l:'Crouch',k:'c'},{id:'reload',l:'Reload',k:'r'},
  {id:'use',l:'Use · zip-tie · talk · get in',k:'e'},{id:'gun',l:'Next gun',k:'q'},{id:'view',l:'Camera',k:'v'},{id:'map',l:'Map',k:'m'},
  {id:'deco',l:'Decorate (at home)',k:'b'},{id:'flash',l:'Flashlight',k:'f'},{id:'nvg',l:'Night vision',k:'n'},{id:'horn',l:'Horn',k:'h'},{id:'glove',l:'Glovebox',k:'g'}];
const FIXED=[['Fire','Mouse 1'],['Aim · scope · binoculars','Mouse 2'],['Switch gun','1 2 3 · Wheel'],['Pause','Esc · P'],['Drive','Same as move']];
const RESERVED=new Set(['escape','p','1','2','3','enter','tab','meta','alt','f11','f12','contextmenu']);
const STORE=()=>window.HTDesktop?HTDesktop.storage:window.localStorage;
let B={};try{B=JSON.parse(STORE().getItem('ht-keys')||'{}')||{}}catch(e){B={}}
/* owner rule: on keyboard and mouse every aim / raise mode is a TOGGLE (click Mouse 2: the view holds until you click again; Shift on
   the scope holds your breath until you tap again or run out). 'hold' is an accessibility option for players who want press-and-hold. */
let AIM='toggle';try{AIM=STORE().getItem('ht-aim')==='hold'?'hold':'toggle'}catch(e){}
function setAim(m){AIM=m==='hold'?'hold':'toggle';try{STORE().setItem('ht-aim',AIM)}catch(e){}}
const def=id=>ACTIONS.find(a=>a.id===id).k;
const get=id=>B[id]||def(id);
let T={};
function build(){T={};for(const a of ACTIONS){const c=get(a.id);if(c!==a.k)T[c]=a.k}for(const a of ACTIONS)if(get(a.id)!==a.k&&!(a.k in T))T[a.k]=null}
function save(){try{STORE().setItem('ht-keys',JSON.stringify(B))}catch(e){}build();try{HT.Pad&&HT.Pad.swapGlyphs&&HT.Pad.swapGlyphs()}catch(e){}}
build();
const NAMES={' ':'Space',shift:'Shift',control:'Ctrl',arrowup:'↑',arrowdown:'↓',arrowleft:'←',arrowright:'→',backspace:'Bksp',capslock:'Caps'};
const name=k=>NAMES[k]||(k.length===1?k.toUpperCase():k[0].toUpperCase()+k.slice(1));
const keyOf=k=>k===' '?' ':k==='shift'?'Shift':k==='control'?'Control':k.length===1?k:k[0].toUpperCase()+k.slice(1);
const codeOf=k=>k===' '?'Space':k==='shift'?'ShiftLeft':k==='control'?'ControlLeft':/^[a-z]$/.test(k)?'Key'+k.toUpperCase():/^\d$/.test(k)?'Digit'+k:keyOf(k);

/* ---------- remap ---------- */
const down={};/* physical key -> key sent on keydown, so its keyup matches even if bindings change in between */
let capture=null;
function onKey(e){
  if(capture&&e.type==='keydown'){if(!e.isTrusted&&e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();capture(e);return}
  if(capture)return;
  if(!e.isTrusted)return;const k=String(e.key||'').toLowerCase();
  let to;if(e.type==='keydown'){if(!(k in T))return;to=T[k];down[k]=to}else{if(!(k in down))return;to=down[k];delete down[k]}
  e.preventDefault();e.stopImmediatePropagation();if(to==null)return;
  (e.target||document).dispatchEvent(new KeyboardEvent(e.type,{key:keyOf(to),code:codeOf(to),repeat:e.repeat,shiftKey:to==='shift'?e.type==='keydown':e.shiftKey,ctrlKey:e.ctrlKey,altKey:e.altKey,bubbles:true,cancelable:true}))}
addEventListener('keydown',onKey,true);addEventListener('keyup',onKey,true);

/* ---------- labels ---------- */
/* keycap text of a default key ('E', 'Space', 'Shift') -> the player's key, or null when unchanged */
function relabel(txt){const t=String(txt).trim().toLowerCase(),k=t==='space'?' ':t;const a=ACTIONS.find(x=>x.k===k);if(!a)return null;const c=get(a.id);return c===a.k?null:name(c)}

/* ---------- the Key bindings screen (js/hud.js calls table() and bind()) ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function table(){return'<h3>Keyboard &amp; mouse</h3><div class="ht-keys ht-rebind">'+
  ACTIONS.map(a=>`<div><span>${esc(a.l)}</span><span><button class="ht-kc ht-rb${B[a.id]?' chg':''}" data-rebind="${a.id}" aria-label="Rebind ${esc(a.l)}">${esc(name(get(a.id)))}</button></span></div>`).join('')+
  FIXED.map(([l,k])=>`<div><span>${esc(l)}</span><span>${k.split(' · ').map(x=>`<b class="ht-kc">${esc(x)}</b>`).join('<em style="opacity:.4;font-style:normal;margin:0 2px">/</em>')}</span></div>`).join('')+
  `<div><span>Aim, scope, binoculars, hold breath</span><span><button class="ht-kc ht-rb${AIM==='hold'?' chg':''}" data-aim-mode aria-label="Aim mode: ${AIM==='hold'?'Hold':'Toggle'}">${AIM==='hold'?'Hold':'Toggle'}</button></span></div>`+
  '</div><p class="ht-rb-note" style="font-size:13px;opacity:.7;margin-top:10px">Click a key, then press the new one (Esc cancels). Taking a key another action uses swaps them.</p>'+
  '<button class="ht-btn ghost" data-rebind-reset style="margin-top:8px">Reset keys to defaults</button>'}
function bind(pane,rerender){
  pane.querySelectorAll('[data-rebind]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(capture)return;const id=b.dataset.rebind,note=pane.querySelector('.ht-rb-note');
    b.textContent='Press a key';b.classList.add('wait');
    capture=ev=>{const k=String(ev.key||'').toLowerCase();
      if(k==='escape'){capture=null;rerender();return}
      if(RESERVED.has(k)||!k){if(note)note.textContent=name(k||'?')+' is reserved. Pick another key, or Esc to cancel.';return}
      const old=get(id),other=ACTIONS.find(a=>a.id!==id&&get(a.id)===k);
      B[id]=k;if(other)B[other.id]=old;for(const a of ACTIONS)if(B[a.id]===a.k)delete B[a.id];
      capture=null;save();rerender()}});
  const am=pane.querySelector('[data-aim-mode]');if(am)am.onclick=e=>{e.stopPropagation();setAim(AIM==='hold'?'toggle':'hold');rerender()};
  const r=pane.querySelector('[data-rebind-reset]');if(r)r.onclick=e=>{e.stopPropagation();B={};save();rerender()}}
/* leaving the screen mid-capture: stop listening */
setInterval(()=>{if(capture&&!document.querySelector('.ht-rb.wait'))capture=null},500);

HT.Keys={ACTIONS,get:get,relabel,table,bind,get changed(){return Object.keys(B).length>0},
  set(id,k){if(!ACTIONS.some(a=>a.id===id))return false;k=String(k).toLowerCase();if(RESERVED.has(k))return false;const old=get(id),o=ACTIONS.find(a=>a.id!==id&&get(a.id)===k);B[id]=k;if(o)B[o.id]=old;for(const a of ACTIONS)if(B[a.id]===a.k)delete B[a.id];save();return true},
  reset(){B={};save()},get aimMode(){return AIM},set aimMode(m){setAim(m)},aimHold:()=>AIM==='hold',get map(){return Object.assign({},T)}};
})();
