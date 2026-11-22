/* High Trust · HT.Keys — the action layer for keyboard and mouse: bindings (Pause → Controls & keys), the Aim hold/toggle option,
   and the labels every prompt shows.
   Bindings are by PHYSICAL key (KeyboardEvent.code), so an AZERTY or Dvorak player gets the WASD-position block out of the box,
   and keycaps show the label printed on their key (navigator.keyboard.getLayoutMap when the browser has it, else learned from the
   keys they press, else the US label).
   The game and its modules read fixed default inputs ('w', 'e', 'x', Mouse 1...). Rather than touch every listener, this works at the
   door: capture-phase listeners on window (registered before any other module's) turn each physical input into its action's default
   input (a canonical key event: key and code of the US default) and swallow a default input whose action moved elsewhere. Every
   module keeps seeing what it always saw, whatever the layout and bindings.
   Aim and Fire are actions, not mouse buttons: whatever is bound to them (Mouse 2, a key, the pad's LT, the touch AIM button) goes
   through aimInput()/fireInput(), where a tool can claim it (the crossing sign, the phone, binoculars, the arrest draw) before the
   default (gun aim, trigger) gets it. HT.Keys.claim('aim', fn) — fn(down, {mode, dev}) returns true when it used the input.
   Held keys are tracked by code (a Shift pressed in between can't strand one), and everything held is released on blur, on the tab
   going hidden and on losing pointer lock.
   Any click on the 3D view while the game runs unlocked asks for pointer lock first, whatever is bound to the mouse buttons.
   Stored in 'ht-keys' (localStorage, or the save file in the desktop shell): only the changed ones, as codes ({"__v":2}). */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const ACTIONS=[
  {id:'fire',l:'Fire',k:'mouse1'},{id:'aim',l:'Aim · raise (sign, phone, binoculars)',k:'mouse2'},
  {id:'fwd',l:'Move forward',k:'w'},{id:'left',l:'Move left',k:'a'},{id:'back',l:'Move back',k:'s'},{id:'right',l:'Move right',k:'d'},
  {id:'jog',l:'Jog · boost · hold breath',k:'shift'},{id:'jump',l:'Jump · vault · handbrake',k:' '},{id:'crouch',l:'Crouch',k:'c'},{id:'reload',l:'Reload',k:'r'},
  {id:'use',l:'Use · zip-tie · talk · get in',k:'e'},{id:'gun',l:'Next gun',k:'q'},{id:'view',l:'Camera',k:'v'},{id:'map',l:'Map',k:'m'},
  {id:'deco',l:'Decorate (at home)',k:'b'},{id:'flash',l:'Flashlight',k:'f'},{id:'nvg',l:'Night vision',k:'n'},{id:'horn',l:'Horn',k:'h'},
  {id:'glove',l:'Glovebox · whistle · draw',k:'g',grp:'job'},{id:'jobT',l:'Wait / go · job key',k:'t',grp:'job'},
  {id:'jobX',l:'Call for help · put away · jet rudder right',k:'x',grp:'job'},{id:'jobZ',l:'Scope zoom · jet rudder left',k:'z',grp:'job'}];
const FIXED=[['Switch gun','1 2 3 · Wheel'],['Pause','Esc · P'],['Drive','Same as move'],['Jet nose up / down','↑ ↓'],['Zoom (phone, map)','+ −']];

/* ---------- physical keys ---------- */
const US={Space:' ',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Backslash:'\\',Semicolon:';',Quote:"'",Backquote:'`',Comma:',',Period:'.',Slash:'/',IntlBackslash:'\\'};
const US_SH={Minus:'_',Equal:'+',BracketLeft:'{',BracketRight:'}',Backslash:'|',Semicolon:':',Quote:'"',Backquote:'~',Comma:'<',Period:'>',Slash:'?',Digit1:'!',Digit2:'@',Digit3:'#',Digit4:'$',Digit5:'%',Digit6:'^',Digit7:'&',Digit8:'*',Digit9:'(',Digit0:')'};
for(let i=0;i<26;i++){const c=String.fromCharCode(65+i);US['Key'+c]=c.toLowerCase()}for(let i=0;i<10;i++)US['Digit'+i]=String(i);
const norm=c=>!c?'':/^Shift/.test(c)?'Shift':/^Control/.test(c)?'Control':/^Alt/.test(c)?'Alt':/^(Meta|OS)/.test(c)?'Meta':c;
const isMouse=k=>/^mouse[1-5]$/.test(k);
/* legacy key name ('w', ' ', 'shift', 'arrowup', '$', 'mouse1') -> code */
const KEYCODE={' ':'Space',shift:'Shift',control:'Control',alt:'Alt',meta:'Meta',escape:'Escape',enter:'Enter',tab:'Tab',backspace:'Backspace',capslock:'CapsLock',contextmenu:'ContextMenu',
  arrowup:'ArrowUp',arrowdown:'ArrowDown',arrowleft:'ArrowLeft',arrowright:'ArrowRight'};
function toCode(k){k=String(k);if(isMouse(k.toLowerCase()))return k.toLowerCase();if(/^(Key[A-Z]|Digit\d|Numpad|Arrow|F\d|Shift|Control|Alt|Meta|Space$|Escape$|Enter$|Tab$|Backspace$|CapsLock$|Minus$|Equal$|Bracket|Backslash$|Semicolon$|Quote$|Backquote$|Comma$|Period$|Slash$|IntlBackslash$|Insert$|Delete$|Home$|End$|PageUp$|PageDown$|ContextMenu$)/.test(k))return norm(k);
  const l=k.toLowerCase();if(KEYCODE[l])return KEYCODE[l];if(/^f\d+$/.test(l))return'F'+l.slice(1);
  for(const c in US)if(US[c]===l)return c;for(const c in US_SH)if(US_SH[c]===k)return c;return k}
/* code -> the default key name the game reads ('w', ' ', 'shift', 'arrowup') */
function keyName(c){if(isMouse(c))return c;if(US[c]!=null)return US[c];const r=Object.keys(KEYCODE).find(x=>KEYCODE[x]===c);return r||c.toLowerCase()}
const keyOf=k=>k===' '?' ':k==='shift'?'Shift':k==='control'?'Control':k.length===1?k:k.startsWith('arrow')?'Arrow'+k[5].toUpperCase()+k.slice(6):k[0].toUpperCase()+k.slice(1);
const codeOfKey=k=>{const c=toCode(k);return c==='Shift'?'ShiftLeft':c==='Control'?'ControlLeft':c==='Alt'?'AltLeft':c};
for(const a of ACTIONS)a.c=toCode(a.k);
const RESERVED=new Map([['Escape','Esc pauses'],['KeyP','P pauses'],['Digit1','1-3 switch guns'],['Digit2','1-3 switch guns'],['Digit3','1-3 switch guns'],['Enter','Enter confirms'],['Tab','Tab is for menus'],
  ['Meta',''],['Alt',''],['F11','F11 is fullscreen'],['F12',''],['ContextMenu',''],['ArrowUp','the arrows steer menus and the jet'],['ArrowDown','the arrows steer menus and the jet'],['ArrowLeft','the arrows steer menus'],['ArrowRight','the arrows steer menus'],
  ['Equal','+ and − zoom'],['Minus','+ and − zoom'],['NumpadAdd','+ and − zoom'],['NumpadSubtract','+ and − zoom'],
  ['Digit4','4-9 pick replies and orders'],['Digit5','4-9 pick replies and orders'],['Digit6','4-9 pick replies and orders'],['Digit7','4-9 pick replies and orders'],['Digit8','4-9 pick replies and orders'],['Digit9','4-9 pick replies and orders'],['Digit0','0 opens your own guns at the range']]);
const STORE=()=>window.HTDesktop?HTDesktop.storage:window.localStorage;

/* ---------- bindings ---------- */
/* Aim: Toggle (default, owner rule: on keyboard/mouse every aim / raise mode is a toggle; the view holds until you click again) or Hold.
   One setting for whatever Aim is bound to, the controller's LT, the Higher Ground scope and hold-breath, binoculars, the phone and the sign.
   Until the player picks one, the controller's LT keeps the console convention (hold); once picked, it follows the setting too. */
let B={},AIM='toggle',AIM_SET=false;
try{const o=JSON.parse(STORE().getItem('ht-keys')||'{}')||{};AIM_SET=o.__aim==='hold'||o.__aim==='toggle';AIM=o.__aim==='hold'?'hold':'toggle';const v2=o.__v===2;delete o.__aim;delete o.__v;
  for(const id in o)if(ACTIONS.some(a=>a.id===id)&&typeof o[id]==='string')B[id]=v2?o[id]:toCode(o[id])}catch(e){B={}}
const act=id=>ACTIONS.find(a=>a.id===id);
const code=id=>B[id]||act(id).c;
let BY={},DEF=new Set(),T={};
function build(){BY={};T={};DEF=new Set(ACTIONS.map(a=>a.c));for(const a of ACTIONS){const c=code(a.id);BY[c]=a;if(c!==a.c)T[keyName(c)]=a.k}
  for(const a of ACTIONS)if(code(a.id)!==a.c&&!BY[a.c])T[a.k]=null}
function save(){try{STORE().setItem('ht-keys',JSON.stringify(Object.assign({__v:2},B,AIM_SET?{__aim:AIM}:{})))}catch(e){}build();relabelAll()}
build();

/* ---------- labels (the layout's own, where the browser can tell) ---------- */
const LAYOUT={},LEARNED={};let layoutKnown=false;
try{if(navigator.keyboard&&navigator.keyboard.getLayoutMap)navigator.keyboard.getLayoutMap().then(m=>{try{m.forEach((v,c)=>{LAYOUT[c]=v});layoutKnown=m.size>0;relabelAll()}catch(_){}},()=>{})}catch(_){}
const NAMES={Space:'Space',Shift:'Shift',Control:'Ctrl',Alt:'Alt',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backspace:'Bksp',CapsLock:'Caps',Escape:'Esc',Enter:'Enter',Tab:'Tab',
  mouse1:'Mouse 1',mouse2:'Mouse 2',mouse3:'Mouse 3',mouse4:'Mouse 4',mouse5:'Mouse 5'};
function label(c){if(NAMES[c])return NAMES[c];const l=LAYOUT[c]||LEARNED[c]||US[c];if(l!=null&&l!==' ')return l.toUpperCase();if(/^Numpad/.test(c))return'Num '+c.slice(6);return c}
const usLabel=c=>NAMES[c]||(US[c]!=null?US[c].toUpperCase():c);
function learn(e,c){if(layoutKnown||!e.key||e.key.length!==1||e.altKey||e.ctrlKey||e.metaKey||US[c]==null||c==='Space')return;const k=e.shiftKey&&/^Digit/.test(c)?null:e.key;/* AZERTY digits need Shift: keep the digit */
  if(k&&LEARNED[c]!==k.toLowerCase()&&(!e.shiftKey||/^Key/.test(c))){LEARNED[c]=k.toLowerCase();relabelSoon()}}
let relQ=0;function relabelSoon(){if(!relQ)relQ=setTimeout(()=>{relQ=0;relabelAll()},30)}
function relabelAll(){try{HT.Pad&&HT.Pad.swapGlyphs&&HT.Pad.swapGlyphs()}catch(e){}try{HT.Prompt&&HT.Prompt.refresh&&HT.Prompt.refresh()}catch(e){}}
/* is any keycap different from the default text (rebound, or a non-QWERTY layout)? */
function differs(){if(Object.keys(B).length)return true;for(const a of ACTIONS)if(!isMouse(a.c)&&label(a.c)!==usLabel(a.c))return true;return false}

/* ---------- the action layer: Aim and Fire ---------- */
const CLAIM={aim:[],fire:[]};
function claim(id,fn){const L=CLAIM[id];if(!L)return()=>{};L.push(fn);return()=>{const i=L.indexOf(fn);if(i>=0)L.splice(i,1)}}
function offer(id,down,info){const L=CLAIM[id];for(let i=L.length-1;i>=0;i--){try{if(L[i](down,info))return true}catch(e){console.warn('[keys] '+id+' claim',e)}}return false}
const aimHeld={};/* device -> who took the press, so the release goes to the same place */
function aimInput(down,dev){dev=dev||'kb';const I=HT.Input;const mode=dev==='pad'?(AIM_SET?AIM:'hold'):dev==='touch'?'toggle':AIM;const info={mode,dev};
  if(down){if(offer('aim',true,info)){aimHeld[dev]='claim';return true}aimHeld[dev]='game';if(!I||!I.running)return false;if(mode==='toggle')I.aim(!I.aiming);else I.aim(true);return true}
  const who=aimHeld[dev];delete aimHeld[dev];if(who==='claim'){offer('aim',false,info);return true}if(who==='game'&&mode==='hold'&&I)I.aim(false);return true}
function fireInput(down,dev){const info={dev:dev||'kb'};if(offer('fire',down,info))return'claim';const I=HT.Input;if(I&&(!down||I.running))I.fire(down);return'game'}

/* ---------- emit a default input ---------- */
const DEF_EV={};/* canonical key -> {key, code} */
function emit(to,down,src){
  if(isMouse(to)){const I=HT.Input;if(!I||(down&&!playing()&&to!=='mouse2'))return;
    if(to==='mouse1'){fireInput(down,'kb');return}
    if(to==='mouse2'){if(down&&!playing())return;aimInput(down,'kb');return}
    const cv=view();if(cv)cv.dispatchEvent(new MouseEvent(down?'mousedown':'mouseup',{button:IN2BTN[to],buttons:down?1:0,bubbles:true,cancelable:true,view:window}));return}
  const t=src&&src.target&&src.target!==window?src.target:document;
  t.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:keyOf(to),code:codeOfKey(to),repeat:!!(src&&src.repeat),shiftKey:to==='shift'?down:!!(src&&src.shiftKey),ctrlKey:!!(src&&src.ctrlKey),altKey:!!(src&&src.altKey),bubbles:true,cancelable:true}))}
/* DOM button numbers: 0 left, 1 middle, 2 right, 3 back, 4 forward */
const BTN2IN=['mouse1','mouse3','mouse2','mouse4','mouse5'],IN2BTN={mouse1:0,mouse3:1,mouse2:2,mouse4:3,mouse5:4};
const view=()=>document.getElementById('c');
const playing=()=>{const I=HT.Input;return !!(I&&I.running&&!I.paused)};
const typing=t=>!!t&&t.nodeType===1&&(t.tagName==='TEXTAREA'||t.isContentEditable||(t.tagName==='INPUT'&&!/^(range|checkbox|radio|button|submit)$/.test(t.type)));
const kbUsed=()=>{try{HT.Pad&&HT.Pad.setLast&&HT.Pad.setLast('kb')}catch(_){}};

/* ---------- the door ---------- */
const held={};/* physical code -> the default input sent on press, so the release matches even if bindings or Shift change in between */
let capture=null;
function stale(){if(capture&&!document.querySelector('.ht-rb.wait'))capture=null;return !capture}/* the screen closed mid-capture */
function codeOfEvent(e){return norm(e.code)||toCode(String(e.key||''))}
/* what a physical key means: its action's default key, null (swallow: its action moved away), or the US key at that position */
function meaning(e,c){const a=BY[c];if(a)return a.k;if(DEF.has(c)&&!isMouse(c))return null;
  if(US[c]!=null){const k=String(e.key||'');if(k.toLowerCase()===US[c]||(US_SH[c]&&k===US_SH[c]))return k.length===1?k.toLowerCase():US[c];return US[c]}
  return undefined}/* Esc, Enter, arrows, F-keys, the numpad: untouched */
function same(e,to){return String(e.key||'').toLowerCase()===String(keyOf(to)).toLowerCase()&&norm(e.code)===norm(codeOfKey(to))}
function onKey(e){
  if(capture&&e.type==='keydown'&&!stale()){if(!e.isTrusted&&e.key!=='Escape')return;e.preventDefault();e.stopImmediatePropagation();capture(e.isTrusted?codeOfEvent(e):'Escape');return}
  if(capture||!e.isTrusted||typing(e.target))return;
  const c=codeOfEvent(e);if(!c)return;if(e.type==='keydown'){learn(e,c);kbUsed()}
  let to;
  if(e.type==='keydown'){if(e.repeat&&(c in held))to=held[c];else{to=meaning(e,c);held[c]=to}}
  else{to=(c in held)?held[c]:meaning(e,c);delete held[c]}
  if(to===undefined)return;
  if(to!==null&&!isMouse(to)&&same(e,to))return;/* already the default input: let it through untouched */
  e.preventDefault();e.stopImmediatePropagation();if(to!=null)emit(to,e.type==='keydown',e)}
const lockClick={};
function onMouse(e){
  const k=BTN2IN[e.button];if(!k)return;
  if(capture&&e.type==='mousedown'&&e.isTrusted&&!stale()){if(e.button===0&&!capture.mouseOk)return;/* a plain click elsewhere cancels via the click handler */e.preventDefault();e.stopImmediatePropagation();capture(k);return}
  if(!e.isTrusted)return;
  const onView=e.target===view();
  if(e.type==='mousedown'){kbUsed();
    /* any click on the view while the game runs unlocked takes the pointer first, whatever the buttons are bound to (C-1) */
    if(onView){const I=HT.Input;if(I&&I.lockClick&&I.lockClick()){lockClick[k]=true;e.preventDefault();e.stopImmediatePropagation();return}}
    const a=BY[k];const to=a?a.k:DEF.has(k)?null:undefined;if(to===undefined)return;
    if((k==='mouse1'||k==='mouse2')&&!onView)return;/* menus keep their clicks */
    if(!playing()&&(to==null||isMouse(to)))return;
    if(to==='mouse1'&&k==='mouse1'){/* Fire on its default button: a claim (the phone's shutter) or the game's own click */if(offer('fire',true,{dev:'kb'})){held[k]='claim';e.preventDefault();e.stopImmediatePropagation()}return}
    held[k]=to;e.preventDefault();e.stopImmediatePropagation();if(to!=null)emit(to,true,e)}
  else{if(lockClick[k]){delete lockClick[k];e.preventDefault();e.stopImmediatePropagation();return}
    if(!(k in held))return;const to=held[k];delete held[k];e.preventDefault();e.stopImmediatePropagation();
    if(to==='claim'){offer('fire',false,{dev:'kb'});return}if(to!=null)emit(to,false,e)}}
addEventListener('keydown',onKey,true);addEventListener('keyup',onKey,true);
addEventListener('mousedown',onMouse,true);addEventListener('mouseup',onMouse,true);
/* back/forward buttons must not navigate (web build): the default is the mouseup/auxclick, so stop all three while the game is open */
const navBtn=e=>{if(e.button===3||e.button===4){e.preventDefault()}};
addEventListener('auxclick',navBtn,true);addEventListener('mouseup',navBtn,true);addEventListener('mousedown',navBtn,true);
/* let go of everything held when the window loses focus or the pointer */
function releaseAll(){for(const c in held){const to=held[c];delete held[c];if(to==='claim'){offer('fire',false,{dev:'kb'});continue}if(to!=null)try{emit(to,false,null)}catch(_){}}
  for(const k in lockClick)delete lockClick[k]}
addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)releaseAll()});

/* ---------- labels for prompts ---------- */
/* keycap text of a default input ('E', 'Space', 'Mouse 1', 'RMB', 'WASD') -> what the player presses, or null when it reads the same */
const CAP={RMB:'aim','RIGHT CLICK':'aim','RIGHT-CLICK':'aim','MOUSE 2':'aim',LMB:'fire',CLICK:'fire','LEFT CLICK':'fire','MOUSE 1':'fire',SPACE:'jump',SHIFT:'jog'};
function capAction(txt){const t=String(txt).trim().toUpperCase();if(CAP[t])return act(CAP[t]);if(t.length===1)return ACTIONS.find(a=>a.k===t.toLowerCase())||null;const m=/^MOUSE\s*([3-5])$/.exec(t);return m?ACTIONS.find(a=>a.k==='mouse'+m[1])||null:null}
function relabel(txt){const t=String(txt).trim();if(/^W\s*A\s*S\s*D$/i.test(t)){const s=['fwd','left','back','right'].map(id=>label(code(id)));const j=s.every(x=>x.length===1)?s.join(''):s.join(' ');return j.replace(/ /g,'')===t.replace(/\s/g,'').toUpperCase()?null:j}
  const a=capAction(t);if(!a)return null;const l=label(code(a.id));return l.toUpperCase()===t.toUpperCase()?null:l}

/* ---------- the Key bindings screen (js/hud.js calls table() and bind()) ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const row=a=>`<div><span>${esc(a.l)}</span><span><button class="ht-kc ht-rb${B[a.id]?' chg':''}" data-rebind="${a.id}" aria-label="Rebind ${esc(a.l)}">${esc(label(code(a.id)))}</button></span></div>`;
function table(){return'<h3>Keyboard &amp; mouse</h3><div class="ht-set"><label>Aim, scope, binoculars, phone, stop sign, hold breath<small>whatever Aim is bound to · Jog on a scope · the controller\'s LT (hold until you pick)</small></label><div class="ht-seg3" data-aim>'+
  [['hold','Hold'],['toggle','Toggle']].map(([v,l])=>`<button aria-pressed="${AIM===v}" data-v="${v}">${l}</button>`).join('')+'</div></div>'+
  '<div class="ht-keys ht-rebind">'+ACTIONS.filter(a=>!a.grp).map(row).join('')+
  FIXED.map(([l,k])=>`<div><span>${esc(l)}</span><span>${k.split(' · ').map(x=>`<b class="ht-kc">${esc(x)}</b>`).join('<em style="opacity:.4;font-style:normal;margin:0 2px">/</em>')}</span></div>`).join('')+
  '</div><h4 style="margin:12px 0 4px;font-size:14px;opacity:.8">Job keys</h4><div class="ht-keys ht-rebind">'+ACTIONS.filter(a=>a.grp==='job').map(row).join('')+'</div>'+
  '<p class="ht-rb-note" style="font-size:13px;opacity:.7;margin-top:10px">Click an input, then press a key or mouse button (Esc cancels). Taking one another action uses swaps them. Keys are by position: the labels are your keyboard\'s.</p>'+
  '<button class="ht-btn ghost" data-rebind-reset style="margin-top:8px">Reset to defaults</button>'}
function assign(id,c){const old=code(id),other=ACTIONS.find(a=>a.id!==id&&code(a.id)===c);B[id]=c;if(other)B[other.id]=old;for(const a of ACTIONS)if(B[a.id]===a.c)delete B[a.id];save();return other||null}
function bind(pane,rerender){
  pane.querySelectorAll('[data-rebind]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(capture)return;const id=b.dataset.rebind,note=pane.querySelector('.ht-rb-note');
    b.textContent='Press a key or button';b.classList.add('wait');
    let over=false;
    const done=()=>{over=true;capture=null;removeEventListener('click',cancel,true);rerender()};
    const cancel=ev=>{if(over){removeEventListener('click',cancel,true);return}if(ev.target!==b){ev.stopPropagation();ev.preventDefault();done()}};
    /* armed after this click has finished; never if the capture already ended (a key pressed within the same tick) */
    setTimeout(()=>{if(!over)addEventListener('click',cancel,true)},0);
    capture=c=>{if(c==='Escape'){done();return}
      if(!c||RESERVED.has(c)){if(note)note.textContent=label(c||'?')+' is reserved'+(RESERVED.get(c)?' ('+RESERVED.get(c)+')':'')+'. Pick another, or Esc to cancel.';return}
      const other=assign(id,c);done();const n=pane.querySelector('.ht-rb-note');
      if(n&&other){n.textContent='Swapped: '+label(c)+' was '+other.l+(other.grp==='job'?' (a job key)':'')+', which is now on '+label(code(other.id))+'.';n.style.opacity='1';n.style.color='#ffc94a'}};
    capture.mouseOk=id==='fire'||id==='aim';/* for the rest, a left click elsewhere cancels */});
  const r=pane.querySelector('[data-rebind-reset]');if(r)r.onclick=e=>{e.stopPropagation();B={};AIM='toggle';AIM_SET=false;save();rerender()};
  pane.querySelectorAll('[data-aim] button').forEach(x=>x.onclick=e=>{e.stopPropagation();AIM=x.dataset.v;AIM_SET=true;save();rerender()})}

HT.Keys={ACTIONS,get:id=>keyName(code(id)),code,label:id=>label(code(id)),keyLabel:label,relabel,table,bind,name:k=>label(toCode(k)),claim,aimInput,fireInput,releaseAll,
  get changed(){return differs()},get aimMode(){return AIM},set aimMode(v){AIM=v==='hold'?'hold':'toggle';AIM_SET=true;save()},aimHold:()=>AIM==='hold',get padAimMode(){return AIM_SET?AIM:'hold'},
  set(id,k){if(!act(id))return false;const c=toCode(k);if(!c||RESERVED.has(c))return false;assign(id,c);return true},
  reset(){B={};AIM='toggle';AIM_SET=false;save()},get map(){return Object.assign({},T)},
  /* tests: a simulated layout (code -> label), as navigator.keyboard.getLayoutMap would give */
  _layout(m){for(const c in LAYOUT)delete LAYOUT[c];Object.assign(LAYOUT,m||{});layoutKnown=!!m;relabelAll()}};
})();
