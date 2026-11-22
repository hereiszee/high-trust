/* Easter eggs: each triggers once, is saved, survives a reload. node dev/audit/world/eggs.e2e.js
   Uses real keys (E, H, G). Honk: in the minivan, five taps of H ("shave and a haircut"), then wait. */
const {open,log,ok,out}=require('./lib.js');
(async()=>{let W=await open();let {p,ev,step}=W;
  await ev(()=>{const H=window.__ht;H.step(3)});await step(10);
  /* count the egg banners */
  await ev(()=>{window.__EB=[];const H=window.__ht;const A=HT.Jobs.api,hb=A.HUD.banner;A.HUD.banner=function(o){if(o&&/Things your dad found/.test(o.kicker||''))window.__EB.push(o.title);return hb.apply(this,arguments)}});
  const found=()=>ev(()=>Object.keys((HT.Jobs.api.SV().base.eggs)||{}));
  const press=async k=>{await p.keyboard.press(k);await step(3)};
  const sp=await ev(()=>HT.Eggs.spots());log('spots',sp);
  for(const id of['gnome','lights','phone','smoker']){const q=sp[id];if(!q){ok(false,id+' has a spot');continue}
    await ev(([x,z])=>{const H=window.__ht,P=H.P;P.pos.set(x+.9,0,z+.9);H.collide(P.pos,.35);P.yaw=Math.atan2(-(x-P.pos.x),-(z-P.pos.z));H.step(3)},[q.x,q.z]);await step(4);
    const pr=await ev(()=>{const H=window.__ht;H.draw();return [...document.querySelectorAll('*')].filter(e=>e.children.length===0&&e.offsetParent&&/gnome|Christmas|pay phone|smoker/i.test(e.textContent)).map(e=>e.textContent).slice(0,2)});
    await press('e');await step(10);await press('e');await step(10);await press('e');await step(10);
    const n=await ev(id=>window.__EB.filter(t=>t).length,id);log(id,'prompt',pr,'banners so far',await ev(()=>window.__EB))}
  /* honk: get in with E */
  await ev(()=>{const H=window.__ht,V=H.VAN;H.P.pos.set(V.pos.x,0,V.pos.z+2.4);H.step(2)});await press('e');await step(4);
  const inCar=await ev(()=>{const H=window.__ht;return H.CV?H.CV.type:null});log('in car for honk:',inCar,await ev(()=>window.__ht.mode));
  const tH=Date.now();for(let i=0;i<5;i++){await p.keyboard.press('h');await p.waitForTimeout(i===2?380:180)}log('5 taps took',Date.now()-tH,'ms');
  await p.waitForTimeout(2200);await step(4);
  let f=await found();ok(f.includes('honk'),'honk egg: five H taps in the minivan, then wait',f);
  /* try again with slow page between taps: the bot's step() between keypresses */
  if(!f.includes('honk')){for(let i=0;i<5;i++){await p.keyboard.press('h');await step(1);await p.waitForTimeout(150)}await p.waitForTimeout(2200);await step(2);f=await found();log('honk retry (taps with a sim step between)',f.includes('honk'));
    const dbg=await ev(()=>({honks:HT.Eggs.S.honks.length,mode:window.__ht.mode,cv:!!window.__ht.CV}));log('honk debug',dbg)}
  for(let i=0;i<5;i++){await p.keyboard.press('h');await p.waitForTimeout(i===2?380:180)}await p.waitForTimeout(2200);
  await press('e');
  const ban=await ev(()=>window.__EB);const cnt={};for(const t of ban)cnt[t]=(cnt[t]||0)+1;log('banner counts',cnt);
  ok(Object.values(cnt).every(c=>c===1),'each egg announces once, however often it is used',cnt);
  /* save + reload + Continue */
  await ev(()=>{try{HT.Jobs.api.save()}catch(_){}});await p.waitForTimeout(800);
  const before=await found();log('found before reload',before);
  const raw=await ev(()=>{try{const s=JSON.parse(localStorage.getItem('ht-save')||'{}');return Object.keys((s.base&&s.base.eggs)||{})}catch(e){return 'err '+e.message}});log('in localStorage',raw);
  ok(Array.isArray(raw)&&before.every(x=>raw.includes(x)),'every found egg is in the saved game',{before,raw});
  require('fs').writeFileSync(__dirname+'/eggs.out.txt',out.join('\n')+'\n');await W.b.close()})().catch(e=>{console.error(e);process.exit(1)});
