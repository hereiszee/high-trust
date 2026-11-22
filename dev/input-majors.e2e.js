/* Regression test for the input audit's MAJOR findings (docs/audit/input/FINDINGS.md). Real input for the thing under test:
   the scripted Gamepad js/gamepad.js polls, Playwright's trusted keys, CDP key events with AZERTY key/code pairs, CDP Mouse 4.
   node dev/input-majors.e2e.js
   pad:  IN-05 L3 holds the breath on the Higher Ground scope with the stick centred · IN-10 LT raises the HOA phone ·
         IN-06 the range rack menu moves with the D-pad, A takes, B closes · IN-09 conversation replies move with the D-pad, A picks,
         the badge shows A · IN-08 jet / tank teach text names pad buttons · IN-07 vehicle prompt shows Y for get out
   keys: IN-11 a sentence names the rebound key · IN-12 a job key taken by an action swaps (and the Key bindings note says so) ·
         IN-13 a digit binding isn't stranded by Shift · IN-14 AZERTY: ZQSD-position walks, prompts show the layout's labels ·
         IN-15 Mouse 4 on the capture screen doesn't navigate */
const {boot,LEAK_SRC}=require('./audit/input/lib.js');
let fails=0;const ok=(m,c,x)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m+(x!==undefined?' '+JSON.stringify(x).slice(0,400):''))};
const finish=ev=>ev(()=>{const H=window.__ht;try{H.jobs.finish(false,'test')}catch(e){}H.step(3);try{H.HUD.hide('result')}catch(e){}H.enterHub();H.step(3)});
const hudDraw=ev=>ev(async()=>{for(let i=0;i<3;i++){try{window.__ht.draw()}catch(e){}await new Promise(r=>setTimeout(r,100))}});
(async()=>{
  /* ================= pad ================= */
  {const r=await boot();const {ev,p}=r;await p.click('.ht-title [data-act=newgame]');await r.wait(300);
    await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.WM.beat=true;if(H.save&&H.save.flags)H.save.flags.act2Intro=true;H.step(2);HT.Keys.reset()});
    await r.pad();await ev(()=>{__T.set({axes:[0,0,.6,0]});__T.set({axes:[0,0,0,0]})});
    /* IN-05 */
    await ev(()=>{const H=window.__ht;H.openBridge&&H.openBridge();H.jobs.start('overwatch');H.step(3);const M=H.M;for(let i=0;i<300&&M.ow.stage!=='ladder';i++)H.step(1);H.jobs.registry.get('overwatch').test.roof();H.step(5);H.P.aim=false;H.step(5)});
    const sc=()=>ev(()=>{const H=window.__ht,R=H.M.ow.rifle;H.step(20);return{aim:H.P.aim,scopeT:+R.scopeT.toFixed(2),held:R.breath.held}});
    await ev(()=>{HT.Keys.aimMode='toggle';__T.tap(6)});const s0=await sc();ok('IN-05 setup: pad LT (Aim: Toggle) scopes in',s0.aim&&s0.scopeT>.9,s0);
    await ev(()=>{__T.tap(10)});const s1=await sc();ok('IN-05 L3 tapped with the stick centred holds the breath (Toggle) and it stays held',s1.held,s1);
    await ev(()=>{__T.tap(10)});const s2=await sc();ok('IN-05 L3 again breathes',!s2.held,s2);
    await ev(()=>{window.__ht.step(150);HT.Keys.aimMode='hold'});await ev(()=>{__T.set({buttons:{10:1}});__T.tick(3)});const s3=await sc();await ev(()=>{__T.set({buttons:{10:0}});__T.tick(2)});const s4=await sc();
    ok('IN-05 Aim: Hold: L3 held holds the breath, released breathes',s3.held&&!s4.held,{s3,s4});
    await ev(()=>{HT.Keys.aimMode='toggle'});await finish(ev);
    /* IN-10 */
    await ev(()=>{const H=window.__ht;H.jobs.start('hoa');H.step(5);if(HT.Photo&&!HT.Photo.S)HT.Photo.begin({job:'test'});HT.Photo.raise(false);H.P.aim=false;H.step(5)});
    await ev(()=>{__T.tap(6);window.__ht.step(20)});const ph1=await ev(()=>({up:HT.Photo.isRaised(),aim:window.__ht.P.aim}));
    await ev(()=>{__T.tap(6);window.__ht.step(20)});const ph2=await ev(()=>HT.Photo.isRaised());
    ok('IN-10 pad LT raises the phone (not the gun aim) and LT again lowers it',ph1.up&&!ph1.aim&&!ph2,{ph1,ph2});
    await finish(ev);
    /* IN-06 */
    await ev(()=>{const H=window.__ht;HT.Roam.fastTravel('base');H.step(30)});await r.wait(500);
    await ev(()=>{const H=window.__ht;if(H.CV)H.exitVehicle();H.step(3);const d=HT.Base.def().range;H.P.pos.set(d.rack.x-1.6,0,d.rack.z);H.P.yaw=-Math.PI/2;H.P.pitch=-.1;H.step(6)});
    await ev(()=>{__T.tap(3);window.__ht.step(2)});const m0=await ev(()=>HT.Range.menu());ok('IN-06 setup: Y at the rack opens the rental menu',m0.open,m0);
    const hint=await ev(()=>{const d=[...document.querySelectorAll('div')].find(e=>/^Free on the range/.test(e.textContent||'')&&e.children.length===0);return d&&d.textContent});
    ok('IN-06 the menu line names pad buttons',/D-pad/.test(hint||'')&&!/Esc|Enter|1-9/.test(hint||''),hint);
    await r.shot('../../screenshots/input/pad-range-menu');
    await ev(()=>{__T.tap(15);window.__ht.step(1)});const m1=await ev(()=>HT.Range.menu());
    await ev(()=>{__T.set({axes:[1,0,0,0]});__T.tick(2);__T.set({axes:[0,0,0,0]});__T.tick(2)});const m2=await ev(()=>HT.Range.menu());
    await ev(()=>{__T.tap(5)});const m3=await ev(()=>HT.Range.menu());
    ok('IN-06 D-pad →, stick → and RB each move the selection',m1.i===(m0.i+1)%9&&m2.i===(m1.i+1)%9&&m3.i===(m2.i+1)%9,{m0,m1,m2,m3});
    await ev(()=>{__T.tap(1)});const m4=await ev(()=>HT.Range.menu());ok('IN-06 B closes the menu',!m4.open,m4);
    await ev(()=>{__T.tap(3);window.__ht.step(2)});await ev(()=>{__T.tap(15)});const pick=await ev(()=>HT.Range.menu());await ev(()=>{__T.tap(0);window.__ht.step(3)});
    const took=await ev(()=>({open:HT.Range.menu().open,cur:window.__ht.P.cur}));ok('IN-06 A takes the selected gun',!took.open&&took.cur===pick.id,{pick,took});
    /* IN-08 tank */
    await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='tank');H.P.pos.set(e.pos.x+3,0,e.pos.z);H.step(2);if(H.save&&H.save.taught)delete H.save.taught.drive;H.enterVehicle(e);H.step(10);H.P.fp=false});await hudDraw(ev);
    const tk=await ev(()=>({feed:[...document.querySelectorAll('.ht-feed > *')].map(e=>e.textContent).join(' | '),hint:[...document.querySelectorAll('.ht-drv .hint span')].map(e=>e.textContent).join(' ')}));const tl=await ev(LEAK_SRC,{pad:true});
    ok('IN-08 tank: no keyboard / mouse names on the pad (teach line, meter, hint bar "Sight")',!tl.length&&/Sight/.test(tk.hint),{tk,tl});
    await r.shot('../../screenshots/input/pad-tank');
    await ev(()=>{const H=window.__ht;H.exitVehicle();H.step(3)});
    /* IN-08 / IN-07 jet */
    await ev(()=>{const H=window.__ht,e=H.vehicles.find(c=>c.type==='jet');H.P.pos.set(e.pos.x+4,0,e.pos.z);H.step(2);if(H.save&&H.save.taught)delete H.save.taught.fly1;H.enterVehicle(e);H.step(10)});await hudDraw(ev);
    const jl=await ev(LEAK_SRC,{pad:true});const jp=await ev(()=>{const pr=document.querySelector('.ht-pr:not(.off):not(.ht-tut)');return pr?[...pr.querySelectorAll('.ht-kc')].map(e=>e.textContent):[]});
    ok('IN-08 jet: strip, step prompt and feed name pad buttons only',!jl.length,jl);ok('IN-07 the jet prompt shows Y for get out',!jp.length||jp.includes('Y'),jp);
    await r.shot('../../screenshots/input/pad-jet');
    await ev(()=>{const H=window.__ht;H.exitVehicle();H.step(3)});
    /* IN-09 */
    const t=await ev(async()=>{const H=window.__ht;const j=H.jobs.registry.get('talk');j.test.give(H.jobs.api);H.jobs.start('talk');H.step(3);
      const V=()=>H.M&&H.M.V;let f=0;for(;f<9000;f++){const v=V();if(v&&v.choice&&v.mounted)break;j.test.step(H.jobs.api,f,{});H.step(1)}const v=V();if(v&&v.choice){v.choice.t=1e9;v.choice.T=0}return{choice:!!(v&&v.choice),n:v&&v.choice&&v.choice.list.length,sel:v&&v.sel}});
    ok('IN-09 setup: a conversation choice is up',t.choice,t);
    if(t.choice){const st=()=>ev(()=>{const v=window.__ht.M.V;return{sel:v.sel,choice:!!v.choice,badges:[...document.querySelectorAll('.soc-ch .k')].map(e=>e.textContent)}});
      await ev(()=>{__T.clear();__T.tap(13)});const c1=await st();const sent=await ev(()=>__T.keys.join(' '));
      await ev(()=>{__T.set({axes:[0,1,0,0]});__T.tick(2);__T.set({axes:[0,0,0,0]});__T.tick(2)});const c2=await st();
      ok('IN-09 D-pad ↓ and the stick move the reply (no flashlight / night vision keys sent)',c1.sel===1&&c2.sel===2%t.n&&!/\bf\b|\bn\b/.test(sent),{c1,c2,sent});
      ok('IN-09 the selected reply shows the A badge, the others none',c2.badges[c2.sel]==='A'&&c2.badges.filter(Boolean).length===1,c2.badges);
      await r.shot('../../screenshots/input/pad-talk-choices');
      await ev(()=>{__T.tap(0)});const c3=await st();ok('IN-09 A picks the reply',!c3.choice,c3)}
    ok('no console errors (pad run)',r.errs.length===0,r.errs.slice(0,3));await r.b.close()}
  /* ================= keyboard ================= */
  {const r=await boot();const {ev,p}=r;const cdp=await p.context().newCDPSession(p);
    const key=async(type,k,code,vk,text)=>cdp.send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,text:type==='keyDown'?text:undefined,unmodifiedText:type==='keyDown'?text:undefined});
    await p.click('.ht-title [data-act=newgame]');await r.wait(300);
    await ev(async()=>{const H=window.__ht;await H.jobs.ready;H.step(2);localStorage.removeItem('ht-keys');HT.Keys.reset();window.__seen=[];addEventListener('keydown',e=>window.__seen.push(e.key+'/'+e.code+(e.isTrusted?'':'*')))});
    /* IN-11 */
    await ev(()=>HT.Keys.set('use','u'));
    const tut=await ev(async()=>{const H=window.__ht;H.TUT.done.look=H.TUT.done.walk=H.TUT.done.jog=1;H.TUT.done.talk=1;H.setJob(0);for(let i=0;i<120;i++){H.step(1);H.tutTick(1/30)}HT.Pad.swapGlyphs();await new Promise(r=>setTimeout(r,120));
      const t=document.querySelector('.ht-tut');return t?{shown:!t.classList.contains('off'),keycap:t.querySelector('.ht-kc').textContent,text:t.querySelector('.tt').textContent}:null});
    ok('IN-11 Use on U: the keycap and the sentence both say U',tut&&tut.keycap==='U'&&/press U\b/.test(tut.text)&&!/\bE\b/.test(tut.text),tut);
    await r.shot('../../screenshots/input/rebind-use-U-tutorial');
    /* IN-12 */
    await ev(()=>{HT.Keys.reset();HT.Keys.set('crouch','x');window.__seen.length=0});await p.keyboard.press('KeyX');const sx=await ev(()=>window.__seen.slice());
    await ev(()=>{window.__seen.length=0});await p.keyboard.press('KeyC');const sc2=await ev(()=>window.__seen.slice());
    const rl=await ev(()=>({X:HT.Keys.relabel('X'),C:HT.Keys.relabel('C'),jobX:HT.Keys.get('jobX')}));
    ok('IN-12 Crouch onto X swaps the job key onto C: X crouches, C reaches jobs as x, prompts relabel',sx.some(s=>/^c\/KeyC\*/.test(s))&&sc2.some(s=>/^x\/KeyX\*/.test(s))&&rl.X==='C'&&rl.jobX==='c',{sx,sc2,rl});
    await ev(()=>HT.Keys.reset());
    /* IN-13 */
    await ev(()=>{HT.Keys.set('fwd',';');for(const k in window.__ht.keys)window.__ht.keys[k]=false});
    await p.keyboard.down('Semicolon');const w1=await ev(()=>window.__ht.keys.w);await p.keyboard.down('Shift');await p.keyboard.up('Semicolon');await p.keyboard.up('Shift');
    const w2=await ev(()=>window.__ht.keys.w);const pos0=await ev(()=>{const P=window.__ht.P;return[P.pos.x,P.pos.z]});await r.step(30);const pos1=await ev(()=>{const P=window.__ht.P;return[P.pos.x,P.pos.z]});
    const moved=Math.hypot(pos1[0]-pos0[0],pos1[1]-pos0[1]);ok('IN-13 Move forward on ; (4-9 are reserved now): released after Shift went down, the dad stops',w1===true&&!w2&&moved<.3,{w1,w2,moved});
    await ev(()=>{HT.Keys.reset();for(const k in window.__ht.keys)window.__ht.keys[k]=false});
    /* IN-14 AZERTY (a simulated layout map, as navigator.keyboard.getLayoutMap gives, and trusted key events with AZERTY key/code pairs) */
    await ev(()=>HT.Keys._layout({KeyQ:'a',KeyW:'z',KeyE:'e',KeyR:'r',KeyA:'q',KeyS:'s',KeyD:'d',KeyZ:'w',KeyX:'x',KeyC:'c',KeyV:'v',KeyB:'b',KeyN:'n',KeyM:',',Semicolon:'m',KeyF:'f',KeyG:'g',KeyH:'h',KeyT:'t',Digit1:'&',Digit2:'é',Digit3:'"'}));
    const az=async(k,code,vk)=>{await ev(()=>{window.__seen.length=0;for(const x in window.__ht.keys)window.__ht.keys[x]=false});await key('keyDown',k,code,vk,k);const s=await ev(()=>({keys:Object.keys(window.__ht.keys).filter(x=>window.__ht.keys[x]),map:window.__ht.HUD.minimap.mapOpen}));await key('keyUp',k,code,vk);return s};
    const zW=await az('z','KeyW',90),qA=await az('q','KeyA',81);
    ok('IN-14 AZERTY: the Z key (QWERTY W place) is Move forward, Q (QWERTY A place) is Move left',zW.keys.includes('w')&&!zW.keys.includes('z')&&qA.keys.includes('a')&&!qA.keys.includes('q'),{zW,qA});
    const labs=await ev(()=>({fwd:HT.Keys.label('fwd'),left:HT.Keys.label('left'),map:HT.Keys.label('map'),wasd:HT.Keys.relabel('WASD'),M:HT.Keys.relabel('M'),txt:HT.Pad.keyText('Press M for the map · W to walk')}));
    ok('IN-14 AZERTY labels: forward Z, left Q, WASD reads ZQSD, the map key and its sentences show the layout\'s label',labs.fwd==='Z'&&labs.left==='Q'&&labs.wasd==='ZQSD'&&labs.M===labs.map&&labs.txt.includes('Press '+labs.map)&&labs.txt.includes('Z to walk'),labs);
    const mapK=await az(',','KeyM',188);ok('IN-14 the key whose label the prompt shows for Map opens the map',mapK.map,mapK);
    await r.wait(400);await ev(()=>{if(window.__ht.HUD.minimap.mapOpen)window.dispatchEvent(new KeyboardEvent('keydown',{key:'m',code:'KeyM'}))});await r.wait(400);
    const d1=await az('&','Digit1',49);ok('IN-14 AZERTY digits (unshifted &) still switch guns as 1',d1.keys.includes('1'),d1);
    await ev(()=>HT.Keys._layout(null));
    /* IN-15 */
    await ev(()=>{window.__rafOn=true;const c=window.__rafPending;window.__rafPending=null;if(c)requestAnimationFrame(c)});
    await ev(()=>{try{document.exitPointerLock()}catch(e){}});await r.wait(300);
    await ev(()=>{if(!HT.Input.paused)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))});await r.wait(500);
    await p.click('.ht-pause [data-tab=keys]');await r.wait(200);
    const bb=await p.locator('[data-rebind=jump]').boundingBox();await p.click('[data-rebind=jump]');
    for(const t of['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:t,x:bb.x+bb.width/2,y:bb.y+bb.height/2,button:'back',buttons:t==='mousePressed'?8:0,clickCount:1});
    await r.wait(400);const alive=await ev(()=>!!window.HT).catch(()=>false);const url=p.url();
    ok('IN-15 Mouse 4 on the capture screen binds Jump and doesn\'t navigate',alive&&/index\.html/.test(url)&&(await ev(()=>HT.Keys.get('jump')))==='mouse4',{url,alive});
    /* IN-12 the screen's note */
    await ev(()=>HT.Keys.reset());await p.click('.ht-pause [data-tab=controls]').catch(()=>{});await p.click('.ht-pause [data-tab=keys]');await r.wait(150);
    await p.click('[data-rebind=crouch]');await p.keyboard.press('KeyX');await r.wait(200);const note=await p.textContent('.ht-rb-note');
    ok('IN-12 taking X for Crouch says it was a job key and where it went',/job key/.test(note)&&/C\b/.test(note),note);
    await ev(()=>HT.Keys.reset());
    ok('no console errors (keyboard run)',r.errs.length===0,r.errs.slice(0,3));await r.b.close()}
  console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0)})().catch(e=>{console.error(e);process.exit(1)});
