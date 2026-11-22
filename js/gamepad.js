/* High Trust · HT.Pad — controllers through the Gamepad API (standard mapping: Xbox, PlayStation, Steam Deck, Switch Pro).
   Gameplay (the game is running, no menu up):
     left stick  walk (analog, through the touch stick's path in index.html) · steer
     right stick look                RT fire · accelerate           LT aim while held · brake
     A use/talk (hold works) when a prompt is up, otherwise jump · handbrake in a car
     B crouch (toggle)    X reload · horn in a car    Y get in / out    RB / D-pad ← → switch gun
     D-pad ↑ flashlight   D-pad ↓ night vision        L3 jog (stays on until the stick is let go)   R3 camera
     View map             Menu pause
   Menus (anything that pauses the game, the map, choice strips; shops and the locker keep their own pad code in js/save.js): D-pad / left stick move focus, A selects, B backs out (Esc),
   ← → on a slider changes it, LB / RB switch pause tabs, right stick scrolls.
   Keyboard + mouse keep working side by side; the last device used decides the prompts (keycaps or pad glyphs, html.ht-pad).
   Digital actions are synthetic key events, so every module that listens for keys (jobs, eggs, free roam) gets them for free.
   Aim is hold-to-aim on the pad only (LT); the keyboard/mouse rules are unchanged. */
(function(){'use strict';
const HT=window.HT=window.HT||{};
if(!navigator.getGamepads)return;
const IN=()=>HT.Input;
const DZ=.2,LOOK=1500;/* px per second of mouse-equivalent motion at full deflection (scaled again by Look speed) */
const B={A:0,B:1,X:2,Y:3,LB:4,RB:5,LT:6,RT:7,VIEW:8,MENU:9,L3:10,R3:11,UP:12,DOWN:13,LEFT:14,RIGHT:15};
const S={pad:null,kind:'xbox',prev:[],last:'kb',held:{},sprint:false,lt:false,rt:false,stickOn:false,rep:{},t:0,focus:null,scrollT:0};
const MODALS=[],USE_AT=[];
const Pad=HT.Pad={S,get active(){return S.last==='pad'},get kind(){return S.kind},
  /* a picker that owns the pad while it is up: HT.Pad.modal({move(dx,dy), ok(), back(), x(), y()}) -> call the result to remove it */
  useAt(f){USE_AT.push(f)},
  modal(h){MODALS.push(h);return()=>{const i=MODALS.indexOf(h);if(i>=0)MODALS.splice(i,1)}},get modalOpen(){return MODALS.length>0},
  /* the label of a pad button by name ('A', 'B', 'LT', 'D↑'...) in the pad's own glyphs */
  btn(n){const g=GL[S.kind]||GL.xbox;return String(n).split('+').map(x=>g[x]||x).join('+')}};

/* ---------- synthetic keys ---------- */
const CODES={' ':'Space',escape:'Escape',shift:'ShiftLeft',enter:'Enter',tab:'Tab','+':'NumpadAdd','-':'NumpadSubtract',arrowleft:'ArrowLeft',arrowright:'ArrowRight',arrowup:'ArrowUp',arrowdown:'ArrowDown'};
function keyEv(type,k,extra){const key=k===' '?' ':k.length===1?k:k.startsWith('arrow')?'Arrow'+k[5].toUpperCase()+k.slice(6):k[0].toUpperCase()+k.slice(1);const code=CODES[k]||(/^[a-z]$/.test(k)?'Key'+k.toUpperCase():/^\d$/.test(k)?'Digit'+k:key);
  const t=document.activeElement&&document.activeElement!==document.body?document.activeElement:document;
  t.dispatchEvent(new KeyboardEvent(type,Object.assign({key,code,bubbles:true,cancelable:true},extra||{})))}
function press(k){if(S.held[k])return;S.held[k]=true;keyEv('keydown',k)}
function release(k){if(!S.held[k])return;S.held[k]=false;keyEv('keyup',k)}
function tap(k){keyEv('keydown',k);setTimeout(()=>keyEv('keyup',k),50)}
const aimIn=d=>{const K=HT.Keys;if(K&&K.aimInput)return K.aimInput(d,'pad');const I=IN();if(I)I.aim(d)};
const fireIn=d=>{const K=HT.Keys;if(K&&K.fireInput)return K.fireInput(d,'pad');const I=IN();if(I)I.fire(d);return'game'};
function releaseAll(){for(const k in S.held)release(k);const I=IN();if(I){I.stick.id==='pad'&&(I.stick.id=null,I.stick.x=I.stick.y=0);if(S.rt)fireIn(false);if(S.lt)aimIn(false);if(S.carAim)aimIn(false)}S.rt=S.lt=S.carAim=false;S.sprint=false;S.stickOn=false;S.yHeld=false}

/* ---------- glyphs ---------- */
const GL={xbox:{A:'A',B:'B',X:'X',Y:'Y',LB:'LB',RB:'RB',LT:'LT',RT:'RT',VIEW:'View',MENU:'Menu',L3:'L3',R3:'R3',LS:'L',RS:'R'},
  ps:{A:'✕',B:'○',X:'□',Y:'△',LB:'L1',RB:'R1',LT:'L2',RT:'R2',VIEW:'Create',MENU:'Options',L3:'L3',R3:'R3',LS:'L',RS:'R'}};
/* keycap text -> pad button; driving hints read E as get out (Y) */
const KEY2PAD={E:'A',USE:'A',SPACE:'A',ENTER:'A',CLICK:'RT',B:'B',RMB:'LT','RIGHT CLICK':'LT',LMB:'RT','LEFT CLICK':'RT',WASD:'LS',MOUSE:'RS',R:'X',H:'X',C:'B',ESC:'MENU',P:'MENU',M:'VIEW',V:'R3',Q:'RB',TAB:'LB+↓',SHIFT:'L3',
  F:'D↑',N:'D↓','MOUSE 1':'RT','MOUSE 2':'LT',WHEEL:'RS',DRAG:'LS','W A S D':'LS','W S · A D':'LS','1 2 3 · Q · WHEEL':'D← →',
  /* job keys through the LB layer */G:'LB',T:'LB+↑',Z:'LB+←',X:'LB+→','1':'LB+A','2':'LB+B','3':'LB+X','4':'LB+Y'};
const COLOR={A:'#5fbf4f',B:'#e0493f',X:'#3b82d6',Y:'#e8b52c'};
function glyphFor(txt,ctx){const k=String(txt).trim().toUpperCase();let b=KEY2PAD[k];if(!b)return null;
  const drv=!!(IN()&&IN().driving)||!!(ctx&&ctx.closest&&ctx.closest('.ht-drv'));
  if(drv&&k==='E')b='Y';/* behind the wheel Use (get out, hold to hitch) is Y; A is the handbrake */if(drv&&k==='SPACE')b='A';
  if(drv&&(k==='MOUSE 2'||k==='RMB'||k==='RIGHT CLICK'))b='D↑';/* Aim in a car: binoculars */
  if(drv&&k==='V'&&IN()&&vehicleKind(IN())==='tank')b='LT';/* the tank: LT is the gunner's sight */
  if(decoOn()){if(k==='Q')b='D←';else if(k==='TAB')b='RB'}/* decorating: RB / D-pad → next, D-pad ← previous */
  if(ctx&&ctx.closest&&ctx.closest('.ht-map')){const o={CLICK:'A',WHEEL:'RT/LT',TAB:'LB/RB',ENTER:'A',M:'B',DRAG:'LS'}[k];if(o)b=o}/* the full map's own pad controls */
  const g=GL[S.kind]||GL.xbox,parts=b.split('+');return{b:parts[parts.length-1],label:b.split(/([+\/ ])/).map(x=>g[x]||x).join('')}}
let swapping=false;
/* ---------- key names inside sentences ("hold E at the ladder", "Press G to call the box") ----------
   The one helper every prompt goes through while a pad is in use: HUD text nodes are rewritten in place (and put back for the keyboard).
   Jobs can call HT.Pad.keyText(str) for text they draw themselves (canvas, alerts). */
const KEYS_RX='E|G|R|F|Q|T|X|Z|V|C|H|M|N|S|W|B|Tab|TAB|Space|SPACE|Shift|SHIFT|Esc|ESC|Enter|ENTER';
/* "press E", "hold the E key", "Tap W" */
const TXT_KEY=new RegExp("\\b(press|hold|tap|use|with|release|or|Press|Hold|Tap|Use|With|Release|PRESS|HOLD|TAP|USE)(\\s+the)?\\s+("+KEYS_RX+")(\\s+key)?\\b(?![\\w'’])",'g');
/* a key that leads a line or follows a separator: "E · zip-tie", "G to draw", "X: call Rick", "E/Enter takes it", "Z zooms" */
const TXT_LEAD=/(^|[·(\[|—]\s*|[.!?:]\s+|,\s+)(E|G|R|F|Q|T|X|Z|V|C|H|M|N|B|Tab|Space|Shift|Esc|Enter)(?=\s*(?:·|:|\/|\)|\]|$)|\s+(?:to|or|again|twice|zooms?|takes|closes|done|place|rotate|move|put|next|·)\b)/g;
/* mouse words */
const TXT_MOUSE=/\b(right[- ]click(?:ing)?|right mouse(?: button)?|left[- ]click|left mouse(?: button)?|RMB|LMB|Mouse ?[12]|(?:Right|Left)[- ]click|(?:Right|Left) mouse(?: button)?|[Cc]lick(?=\s+(?:to|again|fires?|shoots?|or|for)\b|\s*(?:$|·|\/|\)|:)))/g;
const TXT_EXTRA={W:'RT',S:'LT'};/* in sentences W / S are throttle / brake (driving and jet jobs) */
const MOUSE_CAP=m=>/right|rmb|mouse ?2/i.test(m)?'RMB':'Click';
/* the label of a default key name for the device in use, or null to leave it */
function capLabel(K,pad){if(pad){if(TXT_EXTRA[K]&&!KEY2PAD[K])return TXT_EXTRA[K];const g=glyphFor(K==='SPACE'?'Space':K==='TAB'?'Tab':K==='SHIFT'?'Shift':K,null);return g?g.label:null}
  const r=HT.Keys&&HT.Keys.relabel?HT.Keys.relabel(K==='CLICK'?'Click':K):null;return r||null}
function keyText(str){if(typeof str!=='string'||!str)return str;const pad=S.last==='pad',kb=!pad&&kbRelabel();if(!pad&&!kb)return str;
  let out=str.replace(TXT_KEY,(m,verb,the,k,key)=>{const l=capLabel(k.toUpperCase(),pad);return l?verb+(the||'')+' '+l:m});
  out=out.replace(TXT_LEAD,(m,pre,k)=>{const l=capLabel(k.toUpperCase(),pad);return l?pre+l:m});
  out=out.replace(TXT_MOUSE,m=>{const c=MOUSE_CAP(m),l=pad?(glyphFor(c==='RMB'?'RMB':'LMB',null)||{}).label:(HT.Keys&&HT.Keys.relabel(c));return l||m});
  if(kb)out=out.replace(/\b([WASD])(\s*\/\s*|\s+)([WASD])\b/g,(m,a,sep,b)=>(HT.Keys.relabel(a)||a)+sep+(HT.Keys.relabel(b)||b));
  if(pad)out=out.replace(/\bW ?A ?S ?D\b/g,(GL[S.kind]||GL.xbox).LS+' stick').replace(/\b(?:the )?mouse wheel\b|\b(?:the )?wheel\b(?= to\b)/gi,'D-pad ←').replace(/\bW\s*\/\s*S\b/g,'Left stick ↕').replace(/\bA\s*\/\s*D\b/g,'left stick ↔').replace(/\bmove the mouse\b/gi,'Move the right stick').replace(/\bthe mouse\b/gi,'the right stick');
  return out}
const TXT_ORIG=new WeakMap();
function swapText(root){if(!root)return;const on=S.last==='pad'||kbRelabel();
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!n.parentElement.closest('.ht-keys,.ht-kc,kbd,.ht-paddia,.ht-rb-note,script,style,textarea')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  for(let n=w.nextNode();n;n=w.nextNode()){const o=TXT_ORIG.get(n);
    if(o&&n.nodeValue!==o.out){TXT_ORIG.delete(n)}/* the HUD wrote new text */
    const base=TXT_ORIG.has(n)?TXT_ORIG.get(n).src:n.nodeValue;
    if(on){const out=keyText(base);if(out!==base){if(n.nodeValue!==out){n.nodeValue=out}TXT_ORIG.set(n,{src:base,out})}else if(TXT_ORIG.has(n)){n.nodeValue=base;TXT_ORIG.delete(n)}}
    else if(TXT_ORIG.has(n)){n.nodeValue=TXT_ORIG.get(n).src;TXT_ORIG.delete(n)}}}
const textRoots=()=>[document.body];/* every HUD, job overlay, teach box and panel (the controls tables stay literal) */
/* keyboard: keycaps of rebound keys show the player's key (js/keys.js) */
const kbRelabel=()=>!!(HT.Keys&&HT.Keys.changed);
function swapGlyphs(){swapping=true;try{const on=S.last==='pad',kb=!on&&kbRelabel();
  if(on||kb)MO.observe(document.documentElement,{subtree:true,childList:true,characterData:true});else MO.disconnect();
  document.querySelectorAll('.ht-kc,kbd').forEach(e=>{if(e.closest('.ht-keys,.ht-paddia'))return;/* the controls tables stay literal */
    const cur=e.textContent;if(e.dataset.padG!=null&&cur!==e.dataset.padG){delete e.dataset.padK;delete e.dataset.padG;e.classList.remove('pad-g');e.style.removeProperty('--pg')}/* the HUD rewrote it */
    const base=e.dataset.padK!=null?e.dataset.padK:cur;
    if(on){const g=glyphFor(base,e);if(!g){if(e.dataset.padK!=null)restore(e);return}if(e.dataset.padG===g.label&&e.classList.contains('pad-g'))return;
      e.dataset.padK=base;e.textContent=g.label;e.dataset.padG=g.label;e.classList.add('pad-g');e.style.setProperty('--pg',COLOR[g.b]||'')}
    else if(kb){const r=HT.Keys.relabel(base);if(!r){if(e.dataset.padK!=null)restore(e);return}if(e.classList.contains('pad-g')){e.classList.remove('pad-g');e.style.removeProperty('--pg')}
      e.dataset.padK=base;e.textContent=r;e.dataset.padG=r}
    else if(e.dataset.padK!=null)restore(e)});
  const txt=on||kb;if(txt||TXT_ORIG.dirty){for(const r of textRoots())swapText(r);TXT_ORIG.dirty=txt}}finally{swapping=false}}
function restore(e){if(e.textContent===e.dataset.padG)e.textContent=e.dataset.padK;delete e.dataset.padK;delete e.dataset.padG;e.classList.remove('pad-g');e.style.removeProperty('--pg')}
/* the HUD rewrites keycaps when prompts change: re-apply */
const MO=new MutationObserver(()=>{if(!swapping)schedule()});/* connected only while the pad is the last device, or keys are rebound */
/* next frame, or 60 ms if frames are held (a hidden tab, the test harness): whichever comes first */
let swapQ=0;function schedule(){if(swapQ)return;const run=()=>{if(!swapQ)return;swapQ=0;swapGlyphs()};swapQ=1;requestAnimationFrame(run);setTimeout(run,60)}
function setLast(dev){if(S.last===dev)return;S.last=dev;document.documentElement.classList.toggle('ht-pad',dev==='pad');swapGlyphs();if(dev!=='pad'){releaseAll();const I=IN();if(I&&I.relock)I.relock()}}
addEventListener('keydown',e=>{if(e.isTrusted)setLast('kb')},true);
addEventListener('mousedown',e=>{if(e.isTrusted)setLast('kb')},true);
addEventListener('mousemove',e=>{if(e.isTrusted&&(Math.abs(e.movementX)+Math.abs(e.movementY)>6))setLast('kb')},true);
addEventListener('touchstart',()=>setLast('touch'),true);

/* ---------- menus ---------- */
const FOCUSABLE='button:not([disabled]),[role=switch],input[type=range],[data-act],[tabindex]:not([tabindex="-1"]):not(canvas)';
function visible(e){if(e.hidden||e.closest('[hidden]'))return false;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.right<0||r.top>innerHeight||r.left>innerWidth)return false;
  const cs=getComputedStyle(e);if(cs.visibility==='hidden'||cs.pointerEvents==='none'&&e.tagName!=='INPUT')return false;
  const x=Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),y=Math.min(innerHeight-1,Math.max(0,r.top+r.height/2));const h=document.elementFromPoint(x,y);return !!h&&(h===e||e.contains(h)||h.contains(e))}
function targets(){return[...document.querySelectorAll(FOCUSABLE)].filter(e=>e.id!=='c'&&visible(e))}
function setFocus(e){if(S.focus&&S.focus!==e)S.focus.classList.remove('pad-focus');S.focus=e;if(!e)return;e.classList.add('pad-focus');try{e.focus({preventScroll:true})}catch(_){}
  try{e.scrollIntoView({block:'nearest',inline:'nearest'})}catch(_){}}
function current(list){if(S.focus&&list.includes(S.focus))return S.focus;const a=document.activeElement;if(a&&list.includes(a))return a;return null}
function initial(list){return list.find(e=>e.classList.contains('pri')&&!e.disabled)||list.find(e=>e.getAttribute('aria-selected')==='true')||list[0]}
function move(dx,dy){const list=targets();if(!list.length)return;const cur=current(list);if(!cur){setFocus(initial(list));return}
  const a=cur.getBoundingClientRect(),ax=a.left+a.width/2,ay=a.top+a.height/2;let best=null,bs=1e9;
  for(const e of list){if(e===cur)continue;const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,vx=x-ax,vy=y-ay;
    const along=vx*dx+vy*dy;if(along<=4)continue;const across=Math.abs(vx*dy-vy*dx);const sc=along+across*2.2;if(sc<bs){bs=sc;best=e}}
  if(best)setFocus(best)}
function slide(dir){const e=S.focus;if(!e)return false;
  if(e.tagName==='INPUT'&&e.type==='range'){const st=+e.step||1,v=Math.min(+e.max,Math.max(+e.min,+e.value+dir*st));e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true}
  const seg=e.parentElement&&e.parentElement.classList.contains('ht-seg3')?e.parentElement:null;
  if(seg){const bs=[...seg.querySelectorAll('button')],i=bs.indexOf(e),n=bs[i+dir];if(n){n.click();setFocus(n)}return true}
  return false}
function activate(){const list=targets();const e=current(list);if(!e){if(list.length)setFocus(initial(list));return}
  if(e.tagName==='INPUT')return;e.click();setTimeout(()=>{if(!document.contains(e)||!visible(e))S.focus=null},0)}
function back(){/* map: M closes it; everything else understands Esc */if(mapOpen()){tap('m');return}tap('escape')}
function tabs(dir){const t=[...document.querySelectorAll('.ht-pause [data-tab]')].filter(visible);if(!t.length)return;const i=t.findIndex(x=>x.getAttribute('aria-selected')==='true');const n=t[(i+dir+t.length)%t.length];n.click();S.focus=null}
function scroll(dy){const e=S.focus;let p=e&&e.parentElement;while(p&&p!==document.body){const cs=getComputedStyle(p);if(/(auto|scroll)/.test(cs.overflowY)&&p.scrollHeight>p.clientHeight){p.scrollTop+=dy;return}p=p.parentElement}
  const pane=document.querySelector('.ht-pane');if(pane)pane.scrollTop+=dy}

/* ---------- poll ---------- */
const pressed=(g,i)=>{const b=g.buttons[i];return !!b&&(b.pressed||b.value>.5)};
const val=(g,i)=>{const b=g.buttons[i];return b?b.value||(b.pressed?1:0):0};
function dz(x,y){const m=Math.hypot(x,y);if(m<DZ)return[0,0,0];const k=Math.min(1,(m-DZ)/(1-DZ))/m;return[x*k,y*k,Math.min(1,(m-DZ)/(1-DZ))]}
/* held-direction repeat for menus: first step at once, then after 380 ms every 110 ms */
function repeat(id,on,now,fn,every=110){const r=S.rep[id];if(!on){delete S.rep[id];return}if(!r){S.rep[id]={next:now+(every<110?220:380)};fn();return}if(now>=r.next){r.next=now+every;fn()}}
const LB_LAYER=[[0,'1'],[1,'2'],[2,'3'],[3,'4'],[12,'t'],[13,'tab'],[14,'z'],[15,'x']];
/* the HUD's own flag: .ht-map stays unhidden for 230 ms after it closes */
function mapOpen(){const H=window.__ht&&window.__ht.HUD,mm=H&&H.minimap;if(mm&&'mapOpen' in mm)return !!mm.mapOpen;const m=document.querySelector('.ht-map');return !!m&&!m.hidden}
function vehicleKind(I){if(!I.driving)return null;const g=window.__ht,e=g&&g.CV;const t=e&&e.type;return t==='jet'?'jet':t==='tank'?'tank':'car'}
function choiceStrip(){const c=document.querySelector('.ht-ch');return c&&!c.classList.contains('off')&&!c.hidden&&visible(c)?c:null}
function inMenu(){const I=IN();if(!I)return true;if(!I.running||I.paused)return true;if(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen())return true;
  return mapOpen()}
/* modules with an E action that has no HUD prompt (the range rack) say so here, so A uses rather than jumps */
function useHere(){for(const f of USE_AT){try{if(f())return true}catch(_){}}return false}
function decoOn(){const g=window.__ht;return !!(g&&g.deco&&g.deco.on)}
function promptUp(){const p=document.querySelector('.ht-pr');return !!p&&!p.classList.contains('off')}
let lastT=performance.now(),polling=false;
/* the loop only runs once a controller has shown up (pages without one pay nothing) */
function startPoll(){if(polling)return;polling=true;lastT=performance.now();requestAnimationFrame(poll)}
function poll(now){if(!polling)return;requestAnimationFrame(poll);const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];
  let g=pads.find(p=>p.mapping==='standard'&&p.connected)||pads.find(p=>p.connected);if(!g){if(S.pad!=null){S.pad=null;releaseAll();setLast('kb')}polling=false;return}
  if(S.pad!==g.index){S.pad=g.index;S.detected=/054c|sony|dualsense|dualshock|playstation/i.test(g.id)?'ps':'xbox';S.kind=GLYPHS==='auto'?S.detected:GLYPHS;S.prev=[]}
  const btn=i=>pressed(g,i),was=i=>!!S.prev[i],down=i=>btn(i)&&!was(i),up=i=>!btn(i)&&was(i);
  const [lx,ly]=dz(g.axes[0]||0,g.axes[1]||0),[rx,ry]=dz(g.axes[2]||0,g.axes[3]||0);
  const lt=val(g,B.LT),rt=val(g,B.RT);
  const any=g.buttons.some((b,i)=>b&&b.pressed&&i!==16)||lx||ly||rx||ry||lt>.2||rt>.2;
  if(any)setLast('pad');
  if(S.last!=='pad'){S.prev=g.buttons.map(b=>!!b&&(b.pressed||b.value>.5));return}
  /* shops and the gun locker (HT.Menus, js/save.js) run their own pad navigation: stay out of their way */
  if(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen()){if(S.wasGame){releaseAll();S.wasGame=false}if(S.focus){S.focus.classList.remove('pad-focus');S.focus=null}S.prev=g.buttons.map(b=>!!b&&(b.pressed||b.value>.5));return}
  const I=IN(),menu=inMenu(),map=mapOpen(),md=MODALS[MODALS.length-1];
  if(md&&!menu){/* a module's own picker over live play (the range rack, conversation replies): it gets the pad, gameplay gets nothing */
    if(S.wasGame){releaseAll();S.wasGame=false}if(S.focus){S.focus.classList.remove('pad-focus');S.focus=null}
    const L=btn(B.LEFT)||lx<-.5,R=btn(B.RIGHT)||lx>.5,U=btn(B.UP)||ly<-.5,Dn=btn(B.DOWN)||ly>.5,mv=(dx,dy)=>{try{md.move&&md.move(dx,dy)}catch(e){console.warn(e)}};
    repeat('ml',L,now,()=>mv(-1,0));repeat('mr',R,now,()=>mv(1,0));repeat('mu',U,now,()=>mv(0,-1));repeat('md',Dn,now,()=>mv(0,1));
    if(down(B.RB))mv(1,0);if(down(B.LB))mv(-1,0);
    const call=f=>{try{f&&f()}catch(e){console.warn(e)}};
    if(down(B.A))call(md.ok);if(down(B.B))call(md.back);if(down(B.X))call(md.x);if(down(B.Y))call(md.y);if(down(B.MENU))call(md.back||md.ok);
  }else if(map){/* the full map: stick / D-pad pan, RS pans finer, RT / LT zoom, LB / RB cycle places, A fast-travels, B or View closes */
    if(S.wasGame){releaseAll();S.wasGame=false}
    const L=btn(B.LEFT)||lx<-.4,R=btn(B.RIGHT)||lx>.4,U=btn(B.UP)||ly<-.4,Dn=btn(B.DOWN)||ly>.4;
    repeat('ml',L,now,()=>tap('arrowleft'),90);repeat('mr',R,now,()=>tap('arrowright'),90);repeat('mu',U,now,()=>tap('arrowup'),90);repeat('md',Dn,now,()=>tap('arrowdown'),90);
    repeat('zi',rt>.5,now,()=>tap('+'),250);repeat('zo',lt>.5,now,()=>tap('-'),250);
    if(down(B.RB))tap('tab');if(down(B.LB))keyEv('keydown','tab',{shiftKey:true});
    if(down(B.A))tap('enter');if(down(B.B)||down(B.VIEW))tap('m');if(down(B.MENU)){tap('m');setTimeout(()=>tap('escape'),360)}/* the game ignores Esc for 300 ms after the map closes */
  }else if(menu){if(S.wasGame){releaseAll();S.wasGame=false}
    if(!S.focus||!document.contains(S.focus)||!visible(S.focus)){const list=targets();if(list.length&&(!S.focus||S.t<now))setFocus(initial(list));S.t=now+250}
    const L=btn(B.LEFT)||lx<-.5,R=btn(B.RIGHT)||lx>.5,U=btn(B.UP)||ly<-.5,Dn=btn(B.DOWN)||ly>.5;
    repeat('l',L,now,()=>{if(!slide(-1))move(-1,0)});repeat('r',R,now,()=>{if(!slide(1))move(1,0)});repeat('u',U,now,()=>move(0,-1));repeat('d',Dn,now,()=>move(0,1));
    if(down(B.A))activate();if(down(B.B))back();if(down(B.MENU)){const I2=IN();if(I2&&I2.paused)tap('escape');else if(document.querySelector('.ht-title')&&!document.querySelector('.ht-title').hidden)activate();else tap('escape')}
    if(down(B.LB))tabs(-1);if(down(B.RB))tabs(1);if(Math.abs(ry)>.1)scroll(ry*900*dt);
  }else if(I){S.wasGame=true;if(S.focus){S.focus.classList.remove('pad-focus');S.focus=null}
    const veh=vehicleKind(I),car=!!veh,st=I.stick;
    /* LB layer: hold LB and press A/B/X/Y = 1/2/3/4, D-pad ↑ ↓ ← → = T / Tab / Z / X (job keys); LB tapped alone = G */
    if(down(B.LB)){S.lb=true;S.lbUsed=false}
    const lay=S.lb&&btn(B.LB);
    if(lay){for(const[bi,k]of LB_LAYER)if(down(bi)){tap(k);S.lbUsed=true}}
    if(up(B.LB)){if(!S.lbUsed)tap('g');S.lb=false}
    const dn=i=>!lay&&down(i);/* buttons the LB layer took don't also do their normal job */
    /* a choice strip (keys 1-3) over live gameplay: D-pad ↑ ↓ pick, A confirms */
    const ch=choiceStrip();
    if(ch){const ops=[...ch.querySelectorAll('button')].filter(visible);if(ops.length){if(dn(B.UP)||dn(B.DOWN)){const i=ops.indexOf(S.chF);const n=ops[Math.max(0,Math.min(ops.length-1,(i<0?0:i+(down(B.UP)?-1:1))))];if(S.chF)S.chF.classList.remove('pad-focus');S.chF=n;n.classList.add('pad-focus')}
      if(dn(B.A)&&S.chF&&ops.includes(S.chF)){S.chF.click();S.chF=null}}}
    else S.chF=null;
    const c2=v=>v*Math.abs(v);
    if(veh==='jet'){/* jet: LS pitch / roll (through look(), which the jet reads like the mouse), RS ← → rudder, RT / LT throttle,
       RB afterburner, X gear, B look back, Y eject (twice) / get out */
      if(lx||ly)I.look(c2(lx)*LOOK*1.3*dt,c2(ly)*LOOK*1.3*dt);
      if(rx<-.4)press('z');else release('z');if(rx>.4)press('x');else release('x');
      if(rt>.3)press('w');else release('w');if(lt>.3)press('s');else release('s');
      if(dn(B.RB))tap('shift');if(dn(B.X))tap('g');if(dn(B.B))tap('c');
      if(S.stickOn){if(st.id==='pad'){st.id=null;st.x=st.y=0}S.stickOn=false}
    }else{
      /* left stick; in a car the triggers are throttle and brake; the tank drives on the stick so RT can fire */
      let mx=lx,my=ly;if(veh==='car'){my=-(rt-lt)||(Math.abs(ly)>.5?ly:0)}
      const on=Math.abs(mx)>.01||Math.abs(my)>.01;
      if(on){st.id='pad';st.x=mx;st.y=my;S.stickOn=true}else if(S.stickOn){if(st.id==='pad'){st.id=null;st.x=st.y=0}S.stickOn=false}
      /* L3: jog (a click, stays on until the stick is let go). Aiming (a scope: hold breath) it is Jog itself, held as long as L3 is,
         so the Aim setting decides tap-to-hold or press-and-hold exactly as Shift does on the keyboard */
      const scoped=!car&&I.aiming;
      if(scoped){S.sprint=false;if(btn(B.L3))press('shift');else release('shift')}
      else{if(dn(B.L3)){S.sprint=!S.sprint}if(S.sprint&&Math.hypot(lx,ly)<.1&&!car)S.sprint=false;
        if(car){if(btn(B.RB)||btn(B.L3))press('shift');else release('shift')}else if(S.sprint)press('shift');else release('shift')}
      if(rx||ry)I.look(c2(rx)*LOOK*dt,c2(ry)*LOOK*dt);
      if(!car||veh==='tank'){
        /* RT / LT are the Fire / Aim actions (js/keys.js): a tool (the phone, the stop sign, binoculars) can claim them before the gun does */
        if(rt>.5&&!S.rt){S.rt=true;S.rtWho=fireIn(true)}else if(rt<.3&&S.rt){S.rt=false;fireIn(false)}else if(S.rt&&S.rtWho!=='claim'&&I.auto&&!car)I.fire(true);
        if(veh==='tank'){if(lt>.5&&!S.lt){S.lt=true;tap('v')}else if(lt<.3)S.lt=false}/* tank: LT = gunner's sight */
        else{if(lt>.5&&!S.lt){S.lt=true;aimIn(true)}else if(lt<.3&&S.lt){S.lt=false;aimIn(false)}}/* Aim: Hold / Toggle (Controls & keys) */
      }else{if(S.rt){S.rt=false;fireIn(false)}if(S.lt){S.lt=false;aimIn(false)}}
      /* at home B opens / closes Decorate (nothing to crouch behind in the kitchen); while decorating A places, X rotates,
         RB / D-pad → next item, D-pad ← previous, LB+→ puts away, View moves, B done */
      const home=I.mode==='home',deco=home&&decoOn();
      if(!ch){
        if(dn(B.A)){S.aKey=car?' ':(deco||promptUp()||useHere())?'e':' ';press(S.aKey)}
        if(veh==='car'){/* in a car D-pad ↑ is Aim: the binoculars (a flashlight is no use behind the wheel) */
          if(dn(B.UP)){S.carAim=true;aimIn(true)}}
        else if(dn(B.UP))tap('f');
        if(dn(B.DOWN))tap('n')}
      if(S.carAim&&!btn(B.UP)){S.carAim=false;aimIn(false)}
      if(dn(B.B)&&!car)tap(home?'b':'c');
      if(dn(B.X))tap(car?'h':'r');
      if(deco){if(dn(B.RB)||dn(B.RIGHT))tap('tab');if(dn(B.LEFT))tap('q')}
      else{if(!car&&(dn(B.RB)||dn(B.RIGHT)))tap('q');
        if(!car&&dn(B.LEFT))window.dispatchEvent(new WheelEvent('wheel',{deltaY:-100}))}
      if(dn(B.R3))tap('v')}
    if(up(B.A)&&S.aKey){release(S.aKey);S.aKey=null}
    /* Y is Use held for as long as the button is (towing: hold to hitch, tap to get out; ladders; the jet's double tap) */
    if(dn(B.Y)){press('e');S.yHeld=true}if(S.yHeld&&!btn(B.Y)){S.yHeld=false;if(S.aKey!=='e')release('e')}
    if(dn(B.VIEW))tap('m');
    if(down(B.MENU)){releaseAll();tap('escape')}
  }
  S.prev=g.buttons.map(b=>!!b&&(b.pressed||b.value>.5))}
/* Pause → Controls → Button prompts: Auto (from the pad's id) / Xbox / PlayStation (Steam Input shows every pad as Xbox) */
let GLYPHS='auto';try{const st=window.HTDesktop?HTDesktop.storage:localStorage;const c=JSON.parse(st.getItem('ht-cfg')||'{}');if(c.padGlyphs==='xbox'||c.padGlyphs==='ps')GLYPHS=c.padGlyphs}catch(_){}
if(GLYPHS!=='auto')S.kind=GLYPHS;
try{const H=window.__ht&&window.__ht.HUD;if(H){H.settings={padGlyphs:GLYPHS};H.on('setting',(k,v)=>{if(k!=='padGlyphs')return;GLYPHS=v==='xbox'||v==='ps'?v:'auto';S.kind=GLYPHS==='auto'?(S.detected||'xbox'):GLYPHS;
  document.querySelectorAll('.ht-kc.pad-g').forEach(e=>{delete e.dataset.padG});swapGlyphs()})}}catch(_){}
try{if([...navigator.getGamepads()].some(Boolean))startPoll()}catch(_){}
/* Steam Deck (desktop shell): controller-first from the first frame, before any input */
if(window.HTDesktop&&HTDesktop.deck){setLast('pad');startPoll()}
addEventListener('gamepadconnected',e=>{startPoll();try{const H=window.__ht&&window.__ht.HUD;if(H&&H.feed)H.feed('Controller connected','info')}catch(_){}});
addEventListener('gamepaddisconnected',()=>{releaseAll();try{const H=window.__ht&&window.__ht.HUD;if(H&&H.feed)H.feed('Controller disconnected','info')}catch(_){}});
if(kbRelabel())schedule();/* keys rebound in an earlier session */
/* the on-screen layout (Pause → Key bindings) */
Pad.diagram=()=>{const g=GL[S.kind]||GL.xbox,t=(x,y,s,a='middle')=>`<text x="${x}" y="${y}" text-anchor="${a}">${s}</text>`,c=(x,y,r,f,s)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`+(s?t(x,y+4,s):'');
  return `<svg class="ht-paddia" viewBox="0 0 560 250" role="img" aria-label="Controller layout"><g fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2">
  <path d="M190 70h180c40 0 62 18 78 60l22 62c10 28-14 46-36 30l-46-34H170l-46 34c-22 16-46-2-36-30l22-62c16-42 38-60 80-60z"/></g>
  <g font-size="11" font-weight="700" fill="#fff" font-family="Barlow Condensed,sans-serif">
  ${c(200,118,16,'rgba(255,255,255,.18)',g.LS)}${c(330,160,16,'rgba(255,255,255,.18)',g.RS)}
  <rect x="222" y="148" width="36" height="12" rx="3" fill="rgba(255,255,255,.18)"/><rect x="234" y="136" width="12" height="36" rx="3" fill="rgba(255,255,255,.18)"/>
  ${c(380,98,10,COLOR.Y,g.Y)}${c(360,118,10,COLOR.X,g.X)}${c(400,118,10,COLOR.B,g.B)}${c(380,138,10,COLOR.A,g.A)}
  ${t(255,98,g.VIEW)}${t(305,98,g.MENU)}${t(200,62,g.LB+' · '+g.LT)}${t(360,62,g.RB+' · '+g.RT)}
  <g fill="rgba(255,255,255,.8)" font-weight="600">${t(16,40,g.LT+'  aim / brake','start')}${t(16,58,g.LB+'  G · hold for job keys','start')}${t(16,118,'L  move · steer ('+g.L3+' jog)','start')}
  ${t(16,158,'D-pad  gun ← → · light ↑ · NVG ↓','start')}${t(16,232,g.VIEW+'  map','start')}
  ${t(544,40,'fire / gas  '+g.RT,'end')}${t(544,58,'next gun  '+g.RB,'end')}${t(544,98,'get in / out  '+g.Y,'end')}${t(544,118,'reload · horn  '+g.X+' · crouch  '+g.B,'end')}
  ${t(544,138,'use · jump  '+g.A,'end')}${t(544,178,'look ('+g.R3+' camera)  R','end')}${t(544,232,'pause  '+g.MENU,'end')}</g></g></svg>`};
/* tests (dev/pad.e2e.js) drive the loop by hand: the headless harness holds requestAnimationFrame */
Pad._tick=now=>{polling=true;poll(now==null?performance.now():now);polling=false};
Pad.keyText=keyText;Pad.glyphFor=glyphFor;Pad.setLast=setLast;Pad.swapGlyphs=swapGlyphs;
})();
