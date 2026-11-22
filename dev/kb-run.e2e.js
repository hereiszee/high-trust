/* Keyboard-only acceptance run on a simulated AZERTY layout with EVERY action rebound to a non-default key (Fire and Aim too:
   no mouse at all). Trusted key events through CDP with AZERTY key/code pairs; the layout map is what navigator.keyboard.getLayoutMap
   gives on AZERTY (HT.Keys._layout). Every prompt seen is screenshotted and checked: no default key name (E, W, Space, Mouse 2...) may show
   where the player's key is something else.
   node dev/kb-run.e2e.js        -> docs/screenshots/input/kb-run/
   Same steps as dev/pad-run.e2e.js; where a job's scripted player moves the dad between beats, the beat's inputs are the keyboard's. */
const {boot}=require('./audit/input/lib.js');const fs=require('fs'),path=require('path');
const OUT=path.join(__dirname,'../docs/screenshots/input/kb-run');fs.mkdirSync(OUT,{recursive:true});
let fails=0;const ok=(m,c,x)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,300):''))};
/* AZERTY: code -> the character that key types */
const AZ={KeyQ:'a',KeyW:'z',KeyE:'e',KeyR:'r',KeyT:'t',KeyY:'y',KeyU:'u',KeyI:'i',KeyO:'o',KeyP:'p',KeyA:'q',KeyS:'s',KeyD:'d',KeyF:'f',KeyG:'g',KeyH:'h',KeyJ:'j',KeyK:'k',KeyL:'l',Semicolon:'m',
  KeyZ:'w',KeyX:'x',KeyC:'c',KeyV:'v',KeyB:'b',KeyN:'n',KeyM:',',Comma:';',Period:':',Slash:'!',Quote:'ù',BracketLeft:'^',BracketRight:'$',Backslash:'*',Backquote:'²',
  Digit1:'&',Digit2:'é',Digit3:'"',Digit4:"'",Digit5:'(',Digit6:'-',Digit7:'è',Digit8:'_',Digit9:'ç',Digit0:'à',Minus:')',Equal:'='};
/* every action on a key that isn't its default (and isn't another action's default) */
const BIND={fwd:'KeyI',left:'KeyJ',back:'KeyK',right:'KeyL',jog:'Slash',jump:'Period',crouch:'Comma',reload:'KeyY',use:'KeyU',gun:'Semicolon',view:'Quote',map:'BracketLeft',
  deco:'BracketRight',flash:'Backslash',nvg:'Numpad7',horn:'Numpad8',glove:'Numpad9',jobT:'Numpad4',jobX:'Numpad5',jobZ:'Numpad6',fire:'Numpad1',aim:'Numpad2'};
const NUMK={Numpad1:'1',Numpad2:'2',Numpad4:'4',Numpad5:'5',Numpad6:'6',Numpad7:'7',Numpad8:'8',Numpad9:'9'};
const VK={Enter:13,Escape:27,Tab:9,ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,Slash:223,Period:190,Comma:188,Quote:192,Semicolon:77,BracketLeft:221,BracketRight:186,Backslash:220};
(async()=>{const r=await boot();const {ev,p}=r;const cdp=await p.context().newCDPSession(p);
  const keyEv=async(type,code)=>{const k=code==='Enter'?'Enter':NUMK[code]||AZ[code]||code;const vk=VK[code]||(/^Key/.test(code)?code.charCodeAt(3):/^Numpad/.test(code)?96+(+code.slice(6)):/^Digit/.test(code)?48+(+code.slice(5)):0);
    const named=['Escape','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(code);const txt=code==='Enter'?'\r':k;
    await cdp.send('Input.dispatchKeyEvent',{type:type==='down'?(named?'rawKeyDown':'keyDown'):'keyUp',key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,location:/^Numpad/.test(code)?3:0,text:type==='down'&&!named?txt:undefined,unmodifiedText:type==='down'&&!named?txt:undefined})};
  const B=id=>BIND[id];
  const press=async(code,frames=2)=>{await keyEv('down',code);await ev(n=>{for(let i=0;i<n;i++)window.__ht.step(1)},frames);await keyEv('up',code);await ev(()=>window.__ht.step(1))};
  const menuKey=async code=>{await keyEv('down',code);await keyEv('up',code);await r.wait(160)};
  await ev(o=>{HT.Keys.reset();if(!o.nolay)HT.Keys._layout(o.az);for(const id in o.bind)if(!o.only||o.only.includes(id))HT.Keys.set(id,o.bind[id])},{az:AZ,bind:BIND,nolay:!!process.env.NOLAY,only:process.env.BINDONLY?process.env.BINDONLY.split(','):null});
  const chk=await ev(o=>Object.keys(o).filter(id=>HT.Keys.code(id)!==o[id]),BIND);ok('every action rebound ('+Object.keys(BIND).length+')',!chk.length,chk);
  await ev(()=>{window.__mouse=0;for(const t of['mousedown','wheel'])addEventListener(t,e=>{if(e.isTrusted)window.__mouse++},true)});
  /* what must not show: a default key name for a rebound action */
  const LEAK=()=>{const vis=e=>{for(let x=e;x&&x!==document.documentElement;x=x.parentElement){if(x.hidden)return false;const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return false}const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight};
    const CAP=/^(E|W|A|S|D|R|C|Q|V|M|B|F|N|H|G|T|X|Z|Space|Shift|Mouse ?[12]|RMB|LMB|Click|WASD|W A S D)$/i;
    const SENT=/(\b(right|left)[- ]click|\bRMB\b|\bLMB\b|\bMouse ?[12]\b|\bSpace\b|\bShift\b|\bWASD\b|\b(press|hold|tap|Press|Hold|Tap|with|release)\s+[EWASDRCQVMBFNHGTXZ]\b|(^|[·(\[:]\s*)[EGRFQTZVCHMNBX](\s*(·|to |:|\/)))/;
    const out=[];for(const e of document.querySelectorAll('.ht-kc,kbd')){if(e.closest('.ht-keys,.ht-paddia'))continue;if(!vis(e))continue;const t=e.textContent.trim();if(CAP.test(t))out.push({kind:'keycap',text:t,where:(e.parentElement&&e.parentElement.textContent.trim().slice(0,80))})}
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){const pe=n.parentElement;if(!pe||pe.closest('script,style,.ht-keys,.ht-paddia,.ht-kc,kbd,.ht-rb-note'))continue;const t=n.nodeValue.trim();if(t.length<2||!SENT.test(t)||!vis(pe))continue;out.push({kind:'text',text:t.slice(0,140)})}
    const seen=new Set();return out.filter(x=>{const k=x.kind+x.text;if(seen.has(k))return false;seen.add(k);return true})};
  const seen=new Map();let shotN=0;
  const look=async tag=>{const s=await ev(async()=>{const H=window.__ht;for(let i=0;i<2;i++){try{H.draw()}catch(e){}await new Promise(r=>setTimeout(r,90))}const vis=e=>e&&!e.classList.contains('off')&&e.offsetParent!==null;
      return{pr:[...document.querySelectorAll('.ht-pr')].filter(vis).map(e=>e.innerText.replace(/\s+/g,' ').trim()).join(' | '),ob:((document.querySelector('.ht-obj')||{}).innerText||'').replace(/\s+/g,' ').trim().slice(0,200)}});
    const key=s.pr+'#'+s.ob;if(!seen.has(key)){const leaks=await ev(LEAK);const f=String(++shotN).padStart(3,'0')+'-'+tag.replace(/[^a-z0-9]+/gi,'-').slice(0,40)+'.jpg';
      const c=await cdp.send('Page.captureScreenshot',{format:'jpeg',quality:70});fs.writeFileSync(path.join(OUT,f),Buffer.from(c.data,'base64'));seen.set(key,{tag,shot:f,prompt:s.pr,obj:s.ob,leaks});if(leaks.length)console.log('  LEAK at '+tag+': '+JSON.stringify(leaks).slice(0,300))}return s};
  const tick=n=>ev(n=>{for(let i=0;i<n;i++)window.__ht.step(1)},n);
  const state=()=>ev(()=>{const H=window.__ht;return{mode:H.mode,screen:H.HUD.screen,M:H.M&&H.M.def&&H.M.def.id,st:H.M&&H.M.state,cv:H.CV&&H.CV.type,paused:HT.Input.paused}});
  /* walk with the rebound movement keys toward a point: the key pair nearest the direction, re-chosen every few frames */
  const walkTo=async(x,z,tol=1.2,max=900)=>{let held=[];for(let it=0;it<max/6;it++){const q=await ev(([x,z])=>{const P=window.__ht.P;const dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz);const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);return{d,f:(dx*fx+dz*fz)/d,r:(dx*rx+dz*rz)/d}},[x,z]);
      if(q.d<tol)break;const want=[];if(q.f>.38)want.push(B('fwd'));if(q.f<-.38)want.push(B('back'));if(q.r>.38)want.push(B('right'));if(q.r<-.38)want.push(B('left'));
      for(const k of held)if(!want.includes(k))await keyEv('up',k);for(const k of want)if(!held.includes(k))await keyEv('down',k);held=want;await tick(6)}
    for(const k of held)await keyEv('up',k);await tick(1)};
  const toHub=()=>ev(()=>{const H=window.__ht;try{if(H.M&&H.M.state==='go')H.jobs.finish(false,'test')}catch(e){}H.step(3);try{H.HUD.hide('result')}catch(e){}if(H.mode!=='hub')H.enterHub();H.step(3)});
  const resultContinue=async()=>{for(let i=0;i<8;i++){const s=await state();if(s.screen!=='result')break;await menuKey('Enter');await r.wait(250)}};
  const ONLY=process.env.ONLY?new RegExp(process.env.ONLY):null;
  const S=async(name,fn)=>{if(ONLY&&!/^title/.test(name)&&!ONLY.test(name))return;console.log('--- '+name);try{await fn()}catch(e){ok(name+' (threw)',false,String(e&&e.stack||e).slice(0,300))}await look(name+' end')};

  await S('title → new game with Enter',async()=>{await r.wait(400);await look('title');for(let i=0;i<5;i++){const s=await state();if(s.mode==='hub'&&!s.screen)break;await menuKey('Enter');await r.wait(500)}
    await ev(async()=>{await window.__ht.jobs.ready});const s=await state();ok('new game from the title with the keyboard',s.mode==='hub',s);await tick(10);await look('hub')});
  await S('first job: walk with I J K L, U talks, Enter takes it, Esc pauses and resumes',async()=>{
    const g=await ev(()=>{const n=window.__ht.npcs.find(n=>n.marker&&!n.locked)||window.__ht.npcs.find(n=>n.marker);return n?{x:n.pos.x,z:n.pos.z}:null});
    const p0=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z}));await walkTo(g.x,g.z,2.2,2400);const p1=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z}));
    ok('the rebound movement keys (AZERTY I J K L) walk the dad',Math.hypot(p1.x-p0.x,p1.z-p0.z)>2,{p0,p1});await look('at the giver');
    await press(B('use'));await r.wait(300);let s=await state();ok('U talks (the brief opens)',s.screen==='brief',s);await look('brief');
    for(let i=0;i<4&&(await state()).screen==='brief';i++){await menuKey('Enter');await r.wait(400)}s=await state();ok('Enter takes the job',s.screen!=='brief',s);
    await menuKey('Escape');await r.wait(300);s=await state();ok('Esc pauses',s.paused,s);await look('pause');await menuKey('Escape');await r.wait(400);s=await state();ok('Esc resumes',!s.paused,s)});
  await S('map: [ opens it, Tab picks a place, Enter fast-travels',async()=>{await r.wait(350);await press(B('map'));await r.wait(300);ok('[ (Map) opens the map',await ev(()=>window.__ht.HUD.minimap.mapOpen));await look('map');
    const p0=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z}));await menuKey('Tab');await menuKey('Tab');await menuKey('Enter');await r.wait(700);await tick(5);
    const p1=await ev(()=>({x:window.__ht.P.pos.x,z:window.__ht.P.pos.z,map:window.__ht.HUD.minimap.mapOpen}));if(p1.map){await press(B('map'));await r.wait(300)}ok('fast travel moved the dad',Math.hypot(p1.x-p0.x,p1.z-p0.z)>8,{p0,p1})});
  await S('drive: U gets in, I drives, U gets out',async()=>{const v=await ev(()=>{const V=window.__ht.VAN;return{x:V.pos.x,z:V.pos.z}});await walkTo(v.x+2.6,v.z,1.4,4000);await look('at the van');
    await press(B('use'));await tick(10);let s=await state();ok('U gets in the minivan',!!s.cv,s);await look('driving');const v0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});
    await keyEv('down',B('fwd'));await tick(90);await keyEv('up',B('fwd'));await keyEv('down',B('back'));await tick(60);await keyEv('up',B('back'));await tick(60);
    const v1=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});ok('I (Move forward) drives the van',Math.hypot(v1.x-v0.x,v1.z-v0.z)>5,{v0,v1});
    await ev(()=>{for(let i=0;i<300&&Math.abs(window.__ht.CV.spd)>.5;i++)window.__ht.step(1)});await press(B('use'));await tick(15);s=await state();ok('U gets out',!s.cv,s)});
  await S('Crossing Guard to a win: the job\'s player walks the route; the sign is on Aim (Numpad 2), waves on U',async()=>{
    await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('crossing');HT.Keys.aimMode='toggle';j.test.give(H.jobs.api);window.__kf=0;H.jobs.start('crossing');H.step(3)});
    let lt=0,f=0,st='go';
    for(let chunk=0;chunk<1500&&st==="go";chunk++){const q=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('crossing'),a=H.jobs.api;for(let i=0;i<90&&H.M&&H.M.state==='go';i++){const C=H.M.cg;const was=C&&C.signOn;j.test.step(a,window.__kf=(window.__kf||0)+1,{});
        if(C&&C.gear&&C.signOn!==was){C.signOn=was;return{want:true,state:'go'}}H.step(1)}return{want:false,state:H.M&&H.M.state||'none'}});st=q.state;
      if(q.want){await press(B('aim'),1);lt++;await ev(()=>window.__ht.step(1))}f++}
    await look('crossing');ok('Crossing Guard won with the sign on the rebound Aim key ('+lt+' presses)',st==='won'&&lt>0,{st,lt});await resultContinue();await toHub()});
  await S('Hitch Happens to a win: the job\'s player drives; U held hitches and drops',async()=>{
    await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('tow'),a=H.jobs.api;for(const d of j.def.unlock.done||[]){const i=H.jobs.index(d);if(i>=0)H.prog.done[i]=true}H.prog.trustR=Math.max(H.prog.trustR||0,25);j.test.give(a);window.__kf=0;H.jobs.start('tow');H.step(3)});
    let holds=0,st='go';for(let chunk=0;chunk<1500&&st==="go";chunk++){const q=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('tow'),a=H.jobs.api,S=HT.Tow.S;for(let i=0;i<90&&H.M&&H.M.state==='go';i++){j.test.step(a,window.__kf=(window.__kf||0)+1,{});
        if(H.CV&&H.keys.e&&(S.cand&&S.cand.chk&&S.cand.chk.ok||S.link)){H.keys.e=false;return{want:true,link:!!S.link,state:'go'}}H.step(1)}return{want:false,state:H.M&&H.M.state||'none'}});st=q.state;
      if(q.want){await keyEv('down',B('use'));const l0=q.link;for(let n=0;n<10;n++){await tick(9);if(await ev(()=>!!HT.Tow.S.link)!==l0)break}await keyEv('up',B('use'));holds++;await tick(1)}}
    await look('tow');ok('Hitch Happens won with U held ('+holds+' holds)',st==='won'&&holds>0,{st,holds});await resultContinue();await toHub()});
  await S('Higher Ground to a win: scope on Aim (Numpad 2), fire on Fire (Numpad 1)',async()=>{
    await ev(()=>{const H=window.__ht;H.openBridge&&H.openBridge();HT.Keys.aimMode='toggle';window.__kf=0;H.jobs.start('overwatch');H.step(3)});
    let st="go",sc=0,sh=0;for(let chunk=0;chunk<8000&&st==='go';chunk++){const q=await ev(()=>{const H=window.__ht,j=H.jobs.registry.get('overwatch'),a=H.jobs.api;for(let i=0;i<60&&H.M&&H.M.state==='go';i++){const aim0=H.P.aim,md0=HT.Roam.mouseDown;j.test.step(a,window.__kf=(window.__kf||0)+1,{});
        const ka=H.P.aim!==aim0,kf=HT.Roam.mouseDown&&!md0;if(ka)H.P.aim=aim0;if(kf)HT.Roam.mouseDown=false;if(ka||kf)return{aim:ka,fire:kf,state:'go'};H.step(1)}return{state:H.M&&H.M.state||'none'}});st=q.state;
      /* the keys land before the next game frame, as the bot's own calls would have */
      if(q.aim){const b4=await ev(()=>window.__ht.P.aim);if(process.env.DIRECT){await ev(()=>{HT.Keys.aimInput(true,'kb');HT.Keys.aimInput(false,'kb')})}else{await keyEv('down',B('aim'));await keyEv('up',B('aim'))}sc++;if(process.env.DBG&&sc<6)console.log('aim',b4,'->',await ev(()=>({aim:window.__ht.P.aim,act:document.activeElement&&document.activeElement.tagName,paused:HT.Input.paused,run:HT.Input.running})))}if(q.fire){await keyEv('down',B('fire'));await ev(()=>window.__ht.step(1));await keyEv('up',B('fire'));sh++}else if(q.aim)await ev(()=>window.__ht.step(1))}
    await look('overwatch');ok('Higher Ground won on the rebound Aim / Fire keys ('+sc+' scopes, '+sh+' shots)',st==='won'&&sh>0,{st,sc,sh});await resultContinue();await toHub()});
  await S('range rack: U opens it, arrows pick, U takes; Fire shoots',async()=>{await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');H.step(30)});await r.wait(400);
    await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3);const d=HT.Base.def().range;H.place(d.rack.x-1.6,d.rack.z,-Math.PI/2,-.1);H.step(4)});
    await press(B('use'));await tick(2);const m=await ev(()=>HT.Range.menu());ok('U opens the rack',m.open,m);await look('rack');const hint=await ev(()=>{const d=[...document.querySelectorAll('div')].find(e=>/^Free on the range/.test(e.textContent||'')&&e.children.length===0);return d&&d.textContent});
    ok('the rack line names U',/\bU \/ Enter/.test(hint||''),hint);await menuKey('ArrowRight');const m2=await ev(()=>HT.Range.menu());await press(B('use'));await tick(40);
    const cur=await ev(()=>window.__ht.P.cur);ok('arrows + U took the gun',cur===m2.id,{m2,cur});await ev(()=>{const H=window.__ht,d=HT.Base.def().range.rack;H.P.yaw=Math.PI/2});/* look downrange (the mouse's job; this run sends no mouse) */await tick(30);const a0=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});await press(B('fire'),20);await tick(5);const a1=await ev(()=>{const P=window.__ht.P;return P.ammo[P.cur].mag});ok('Numpad 1 (Fire) shoots',a1<a0,{a0,a1})});
  await S('tank: U in, I drives, Numpad 1 fires, U out',async()=>{await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='tank');H.place(e.pos.x+3.5,e.pos.z);H.step(3)});await press(B('use'));await tick(10);
    let s=await state();ok('U into the tank',s.cv==='tank',s);await look('tank');const p0=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});await keyEv('down',B('fwd'));await tick(120);await keyEv('up',B('fwd'));
    const p1=await ev(()=>{const e=window.__ht.CV;return{x:e.pos.x,z:e.pos.z}});ok('I drives the tank',Math.hypot(p1.x-p0.x,p1.z-p0.z)>2,{p0,p1});await press(B('fire'),3);await tick(3);
    const rl=await ev(()=>HT.Tank&&HT.Tank.S?HT.Tank.S.reload:null);ok('Fire key fires the main gun',rl>0,rl);await look('tank fired');await ev(()=>{for(let i=0;i<300&&Math.abs(window.__ht.CV.spd||0)>.3;i++)window.__ht.step(1)});await press(B('use'));await tick(15);s=await state();ok('U out',!s.cv,s)});
  await S('jet: U in, I throttle, . nose up, U U eject, the parachute',async()=>{await ev(()=>{const H=window.__ht,e=HT.Jet.S.e;H.CV&&H.exitVehicle();H.enterVehicle(e);H.step(5)});/* boarding is the car path tested above; here the flight keys */
    let s=await state();ok('in the jet',s.cv==='jet',s);await look('jet');await keyEv('down',B('fwd'));await tick(150);await keyEv('up',B('fwd'));/* held: the throttle ramps (a tap steps 10%) */
    const fl=await ev(async()=>{const H=window.__ht,F=HT.Jet.F;let i=0;for(;i<1500;i++){H.step(1);if(F.spd>45)break}return{i,spd:F.spd,thr:F.thr}});await keyEv('down',B('jump'));await tick(90);await keyEv('up',B('jump'));
    const air=await ev(()=>({air:HT.Jet.F.air,alt:Math.round(HT.Jet.F.lastAlt||0)}));ok('I throttles up, . (Jump) noses up: airborne',air.air,{fl,air});await look('airborne');
    await tick(60);await press(B('use'));await tick(4);await press(B('use'));await tick(30);s=await state();const ch=await ev(()=>!!(HT.Jet.F.chute));ok('U twice ejects',!s.cv&&ch,{s,ch});await look('parachute')});
  await S('decorate at home: $ (Decorate) opens it, U places, $ done',async()=>{await ev(async()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.enterHome();for(let i=0;i<80&&H.mode!=='home';i++){await new Promise(r=>setTimeout(r,100));H.step(1)}H.step(5)});
    await look('home');await press(B('deco'));await tick(3);ok('Decorate key opens it',await ev(()=>document.body.classList.contains('decoOn')));await look('decorate');
    const caps=await ev(()=>[...document.querySelectorAll('#deco .ht-kc')].map(e=>e.textContent));ok('the decorate panel shows the player\'s keys',caps.includes('U')&&caps.includes('Y')&&!caps.includes('E')&&!caps.includes('R'),caps);
    await press(B('deco'));await tick(3);ok('Decorate key closes it',!(await ev(()=>document.body.classList.contains('decoOn'))))});
  await S('quit to title: Esc, arrows, Enter',async()=>{await menuKey('Escape');await r.wait(300);for(let i=0;i<12;i++){const f=await ev(()=>{const a=document.activeElement;return a&&(a.dataset.act||a.textContent)});if(/quit/i.test(f||''))break;await menuKey('Tab')}await menuKey('Enter');await r.wait(500);
    for(let i=0;i<3&&(await ev(()=>!!document.querySelector('.ht-dlg')));i++){await ev(()=>{const b=document.querySelector('.ht-dlg [data-act=ok]');b&&b.focus()});await menuKey('Enter');await r.wait(500)}
    const s=await state();ok('back on the title screen',s.mode==='title',s)});
  const all=[...seen.values()];fs.writeFileSync(path.join(OUT,'prompts.json'),JSON.stringify(all,null,1));
  const leaky=all.filter(x=>x.leaks.length);ok('no default key names in any of the '+all.length+' prompts seen',!leaky.length,leaky.map(x=>x.tag+': '+JSON.stringify(x.leaks)).slice(0,10));
  ok('no mouse event reached the page',(await ev(()=>window.__mouse))===0);ok('no console errors',r.errs.length===0,r.errs.slice(0,4));
  await r.b.close();console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
