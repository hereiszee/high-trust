/* High Trust · HT.Pad — controllers through the Gamepad API (standard mapping: Xbox, PlayStation, Steam Deck, Switch Pro).
   Gameplay (the game is running, no menu up):
     left stick  walk (analog, through the touch stick's path in index.html) · steer
     right stick look                RT fire · accelerate           LT aim while held · brake
     A use/talk (hold works) when a prompt is up, otherwise jump · handbrake in a car
     B crouch (toggle)    X reload · horn in a car    Y get in / out    RB / D-pad ← → switch gun
     D-pad ↑ flashlight   D-pad ↓ night vision        L3 jog (stays on until the stick is let go)   R3 camera
     View map             Menu pause
   Menus (anything that pauses the game, shops, the map, choice strips): D-pad / left stick move focus, A selects, B backs out (Esc),
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
const Pad=HT.Pad={S,get active(){return S.last==='pad'},get kind(){return S.kind}};

/* ---------- synthetic keys ---------- */
const CODES={' ':'Space',escape:'Escape',shift:'ShiftLeft',enter:'Enter',tab:'Tab'};
function keyEv(type,k){const key=k===' '?' ':k.length===1?k:k[0].toUpperCase()+k.slice(1);const code=CODES[k]||(/^[a-z]$/.test(k)?'Key'+k.toUpperCase():/^\d$/.test(k)?'Digit'+k:key);
  const t=document.activeElement&&document.activeElement!==document.body?document.activeElement:document;
  t.dispatchEvent(new KeyboardEvent(type,{key,code,bubbles:true,cancelable:true}))}
function press(k){if(S.held[k])return;S.held[k]=true;keyEv('keydown',k)}
function release(k){if(!S.held[k])return;S.held[k]=false;keyEv('keyup',k)}
function tap(k){keyEv('keydown',k);setTimeout(()=>keyEv('keyup',k),50)}
function releaseAll(){for(const k in S.held)release(k);const I=IN();if(I){I.stick.id==='pad'&&(I.stick.id=null,I.stick.x=I.stick.y=0);if(S.rt)I.fire(false);if(S.lt)I.aim(false)}S.rt=S.lt=false;S.sprint=false;S.stickOn=false}

/* ---------- glyphs ---------- */
const GL={xbox:{A:'A',B:'B',X:'X',Y:'Y',LB:'LB',RB:'RB',LT:'LT',RT:'RT',VIEW:'View',MENU:'Menu',L3:'L3',R3:'R3',LS:'L',RS:'R'},
  ps:{A:'✕',B:'○',X:'□',Y:'△',LB:'L1',RB:'R1',LT:'L2',RT:'R2',VIEW:'Create',MENU:'Options',L3:'L3',R3:'R3',LS:'L',RS:'R'}};
/* keycap text -> pad button; driving hints read E as get out (Y) */
const KEY2PAD={E:'A',USE:'A',SPACE:'A',ENTER:'A',CLICK:'A',R:'X',H:'X',C:'B',ESC:'MENU',P:'MENU',M:'VIEW',V:'R3',Q:'RB',TAB:'RB',SHIFT:'L3',
  F:'D↑',N:'D↓','MOUSE 1':'RT','MOUSE 2':'LT',WHEEL:'RS',DRAG:'LS','W A S D':'LS','W S · A D':'LS','1 2 3 · Q · WHEEL':'D← →',G:'D↓'};
const COLOR={A:'#5fbf4f',B:'#e0493f',X:'#3b82d6',Y:'#e8b52c'};
function glyphFor(txt,ctx){const k=String(txt).trim().toUpperCase();let b=KEY2PAD[k];if(!b)return null;if(ctx&&ctx.closest('.ht-drv')&&k==='E')b='Y';if(ctx&&ctx.closest('.ht-drv')&&k==='SPACE')b='A';
  const g=GL[S.kind]||GL.xbox;return{b,label:b.startsWith('D')?'D'+b.slice(1):(g[b]||b)}}
let swapping=false;
function swapGlyphs(){swapping=true;try{const on=S.last==='pad';
  document.querySelectorAll('.ht-kc').forEach(e=>{if(e.closest('.ht-keys'))return;/* the controls tables stay literal */
    if(on){const cur=e.textContent;if(e.dataset.padG===cur)return;const g=glyphFor(cur,e);if(!g){if(e.dataset.padK!=null)restore(e);return}
      e.dataset.padK=cur;e.textContent=g.label;e.dataset.padG=g.label;e.classList.add('pad-g');e.style.setProperty('--pg',COLOR[g.b]||'')}
    else if(e.dataset.padK!=null)restore(e)})}finally{swapping=false}}
function restore(e){if(e.textContent===e.dataset.padG)e.textContent=e.dataset.padK;delete e.dataset.padK;delete e.dataset.padG;e.classList.remove('pad-g');e.style.removeProperty('--pg')}
/* the HUD rewrites keycaps when prompts change: re-apply */
const MO=new MutationObserver(()=>{if(!swapping&&S.last==='pad')schedule()});/* connected only while the pad is the last device */
let swapQ=0;function schedule(){if(!swapQ)swapQ=requestAnimationFrame(()=>{swapQ=0;swapGlyphs()})||setTimeout(()=>{swapQ=0;swapGlyphs()},50)}
function setLast(dev){if(S.last===dev)return;S.last=dev;if(dev==='pad')MO.observe(document.documentElement,{subtree:true,childList:true,characterData:true});else MO.disconnect();document.documentElement.classList.toggle('ht-pad',dev==='pad');swapGlyphs();if(dev!=='pad'){releaseAll();const I=IN();if(I&&I.relock)I.relock()}}
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
function back(){/* map: M closes it; everything else understands Esc */const map=document.querySelector('.ht-map');if(map&&!map.hidden){tap('m');return}tap('escape')}
function tabs(dir){const t=[...document.querySelectorAll('.ht-pause [data-tab]')].filter(visible);if(!t.length)return;const i=t.findIndex(x=>x.getAttribute('aria-selected')==='true');const n=t[(i+dir+t.length)%t.length];n.click();S.focus=null}
function scroll(dy){const e=S.focus;let p=e&&e.parentElement;while(p&&p!==document.body){const cs=getComputedStyle(p);if(/(auto|scroll)/.test(cs.overflowY)&&p.scrollHeight>p.clientHeight){p.scrollTop+=dy;return}p=p.parentElement}
  const pane=document.querySelector('.ht-pane');if(pane)pane.scrollTop+=dy}

/* ---------- poll ---------- */
const pressed=(g,i)=>{const b=g.buttons[i];return !!b&&(b.pressed||b.value>.5)};
const val=(g,i)=>{const b=g.buttons[i];return b?b.value||(b.pressed?1:0):0};
function dz(x,y){const m=Math.hypot(x,y);if(m<DZ)return[0,0,0];const k=Math.min(1,(m-DZ)/(1-DZ))/m;return[x*k,y*k,Math.min(1,(m-DZ)/(1-DZ))]}
/* held-direction repeat for menus: first step at once, then after 380 ms every 110 ms */
function repeat(id,on,now,fn){const r=S.rep[id];if(!on){delete S.rep[id];return}if(!r){S.rep[id]={next:now+380};fn();return}if(now>=r.next){r.next=now+110;fn()}}
function choiceStrip(){const c=document.querySelector('.ht-ch');return c&&!c.classList.contains('off')&&!c.hidden&&visible(c)?c:null}
function inMenu(){const I=IN();if(!I)return true;if(!I.running||I.paused)return true;if(HT.Menus&&HT.Menus.isOpen&&HT.Menus.isOpen())return true;
  const map=document.querySelector('.ht-map');if(map&&!map.hidden)return true;return false}
function promptUp(){const p=document.querySelector('.ht-pr');return !!p&&!p.classList.contains('off')}
let lastT=performance.now(),polling=false;
/* the loop only runs once a controller has shown up (pages without one pay nothing) */
function startPoll(){if(polling)return;polling=true;lastT=performance.now();requestAnimationFrame(poll)}
function poll(now){if(!polling)return;requestAnimationFrame(poll);const dt=Math.min(.05,(now-lastT)/1000);lastT=now;
  const pads=navigator.getGamepads?[...navigator.getGamepads()].filter(Boolean):[];
  let g=pads.find(p=>p.mapping==='standard'&&p.connected)||pads.find(p=>p.connected);if(!g){if(S.pad!=null){S.pad=null;releaseAll();setLast('kb')}polling=false;return}
  if(S.pad!==g.index){S.pad=g.index;S.kind=/054c|sony|dualsense|dualshock|playstation|wireless controller/i.test(g.id)?'ps':'xbox';S.prev=[]}
  const btn=i=>pressed(g,i),was=i=>!!S.prev[i],down=i=>btn(i)&&!was(i),up=i=>!btn(i)&&was(i);
  const [lx,ly]=dz(g.axes[0]||0,g.axes[1]||0),[rx,ry]=dz(g.axes[2]||0,g.axes[3]||0);
  const lt=val(g,B.LT),rt=val(g,B.RT);
  const any=g.buttons.some((b,i)=>b&&b.pressed&&i!==16)||lx||ly||rx||ry||lt>.2||rt>.2;
  if(any)setLast('pad');
  if(S.last!=='pad'){S.prev=g.buttons.map(b=>!!b&&(b.pressed||b.value>.5));return}
  const I=IN(),menu=inMenu();
  if(menu){if(S.wasGame){releaseAll();S.wasGame=false}
    if(!S.focus||!document.contains(S.focus)||!visible(S.focus)){const list=targets();if(list.length&&(!S.focus||S.t<now))setFocus(initial(list));S.t=now+250}
    const L=btn(B.LEFT)||lx<-.5,R=btn(B.RIGHT)||lx>.5,U=btn(B.UP)||ly<-.5,Dn=btn(B.DOWN)||ly>.5;
    repeat('l',L,now,()=>{if(!slide(-1))move(-1,0)});repeat('r',R,now,()=>{if(!slide(1))move(1,0)});repeat('u',U,now,()=>move(0,-1));repeat('d',Dn,now,()=>move(0,1));
    if(down(B.A))activate();if(down(B.B))back();if(down(B.MENU)){const I2=IN();if(I2&&I2.paused)tap('escape');else if(document.querySelector('.ht-title')&&!document.querySelector('.ht-title').hidden)activate();else tap('escape')}
    if(down(B.LB))tabs(-1);if(down(B.RB))tabs(1);if(Math.abs(ry)>.1)scroll(ry*900*dt);
    if(down(B.VIEW)){const map=document.querySelector('.ht-map');if(map&&!map.hidden)tap('m')}
  }else if(I){S.wasGame=true;if(S.focus){S.focus.classList.remove('pad-focus');S.focus=null}
    const car=I.driving,st=I.stick;
    /* a choice strip (keys 1-3) over live gameplay: D-pad ↑ ↓ pick, A confirms */
    const ch=choiceStrip();
    if(ch){const ops=[...ch.querySelectorAll('button')].filter(visible);if(ops.length){if(down(B.UP)||down(B.DOWN)){const i=ops.indexOf(S.chF);const n=ops[Math.max(0,Math.min(ops.length-1,(i<0?0:i+(down(B.UP)?-1:1))))];if(S.chF)S.chF.classList.remove('pad-focus');S.chF=n;n.classList.add('pad-focus')}
      if(down(B.A)&&S.chF&&ops.includes(S.chF)){S.chF.click();S.chF=null}}}
    else S.chF=null;
    /* left stick (+ triggers in a car) */
    let mx=lx,my=ly;if(car){mx=lx;my=-(rt-lt)}
    const on=Math.abs(mx)>.01||Math.abs(my)>.01;
    if(on){st.id='pad';st.x=mx;st.y=my;S.stickOn=true}else if(S.stickOn){if(st.id==='pad'){st.id=null;st.x=st.y=0}S.stickOn=false}
    /* jog: L3 latches until the stick is let go */
    if(down(B.L3)){S.sprint=!S.sprint}if(S.sprint&&Math.hypot(lx,ly)<.1&&!car)S.sprint=false;
    if(car){if(btn(B.RB)||btn(B.L3))press('shift');else release('shift')}else if(S.sprint)press('shift');else release('shift');
    /* look */
    if(rx||ry){const c=v=>v*Math.abs(v);I.look(c(rx)*LOOK*dt,c(ry)*LOOK*dt)}
    if(!car){
      if(rt>.5&&!S.rt){S.rt=true;I.fire(true)}else if(rt<.3&&S.rt){S.rt=false;I.fire(false)}else if(S.rt&&I.auto)I.fire(true);
      if(lt>.5&&!S.lt){S.lt=true;I.aim(true)}else if(lt<.3&&S.lt){S.lt=false;I.aim(false)}
    }else{if(S.rt){S.rt=false;I.fire(false)}if(S.lt){S.lt=false;I.aim(false)}}
    /* buttons */
    if(!ch){
      if(down(B.A)){S.aKey=car?' ':promptUp()?'e':' ';press(S.aKey)}
      if(up(B.A)&&S.aKey){release(S.aKey);S.aKey=null}
      if(down(B.UP))tap('f');if(down(B.DOWN))tap('n')}
    if(down(B.B)&&!car)tap('c');
    if(down(B.X))tap(car?'h':'r');
    if(down(B.Y))tap('e');
    if(!car&&(down(B.RB)||down(B.RIGHT)))tap('q');
    if(!car&&down(B.LEFT))window.dispatchEvent(new WheelEvent('wheel',{deltaY:-100}));
    if(down(B.R3))tap('v');if(down(B.VIEW))tap('m');
    if(down(B.MENU)){releaseAll();tap('escape')}
  }
  S.prev=g.buttons.map(b=>!!b&&(b.pressed||b.value>.5))}
try{if([...navigator.getGamepads()].some(Boolean))startPoll()}catch(_){}
addEventListener('gamepadconnected',e=>{startPoll();try{const H=window.__ht&&window.__ht.HUD;if(H&&H.feed)H.feed('Controller connected','info')}catch(_){}});
addEventListener('gamepaddisconnected',()=>{releaseAll();try{const H=window.__ht&&window.__ht.HUD;if(H&&H.feed)H.feed('Controller disconnected','info')}catch(_){}});
Pad.glyphFor=glyphFor;Pad.setLast=setLast;Pad.swapGlyphs=swapGlyphs;
})();
