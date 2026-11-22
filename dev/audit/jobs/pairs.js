/* audit/jobs: does job A leak into job B?  node dev/audit/jobs/pairs.js <A> <B> [--a=win|fail|abandon] [--frames=600]
   Fresh B: start B in a clean session (same browser, before A) is not possible without a reload, so we reload between:
   1. new game, unlock B, start B, play --frames of B's bot, snapshot  -> "fresh"
   2. reload, new game, unlock A and B, play A to the end (--a=win: bot win, then "Keep driving"; fail: bot fail, "Head home";
      abandon: pause -> Abandon job at mid-job), then start B, play the same frames, snapshot -> "after A"
   3. print the fields that differ. */
const {boot,click,live,waitCard,install}=require('./lib.js');
const [A,B]=process.argv.slice(2);const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const HOW=arg('a','win'),FR=+arg('frames',600);
const log=(s,o)=>console.log(JSON.stringify(Object.assign({step:s},o)));
async function runB(p,ev){await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(3)},B);
  const r=await ev(([id,n])=>{const x=window.__A.play(id,{},n);return x},[B,FR]);await live(p,800);
  const s=await ev(()=>{const H=window.__ht,s=window.__A.snap();s.camMode=H.P.fp?'fp':'tp';s.scopeEl=!!(document.getElementById('scope')&&getComputedStyle(document.getElementById('scope')).display!=='none');
    s.pDudeVisible=!!(H.P.dude&&H.P.dude.root.visible);s.fadeEls=[...document.body.children].filter(e=>+getComputedStyle(e).opacity>0.5&&getComputedStyle(e).position==='fixed'&&!e.className.includes('ht')).map(e=>e.id||e.className).slice(0,8);
    s.tags=document.getElementById('tags')?document.getElementById('tags').children.length:0;s.mmOverlay=!!(H.HUD.minimap&&H.HUD.minimap._ov);return s});s.play=r;return s}
(async()=>{let {b,p,errs}=await boot();let ev=(f,a)=>p.evaluate(f,a);
  await ev(id=>window.__A.unlock(id),B);await ev(id=>window.__A.cast(id),B);
  const fresh=await runB(p,ev);log('fresh',fresh);await b.close();
  ({b,p,errs}=await boot());ev=(f,a)=>p.evaluate(f,a);
  await ev(([a,b_])=>{window.__A.unlock(a);window.__A.unlock(b_)},[A,B]);await ev(id=>window.__A.cast(id),A);await ev(id=>window.__A.cast(id),B);
  await ev(id=>{window.__ht.jobs.start(id);window.__ht.step(3)},A);
  if(HOW==='abandon'){log('A',await ev(id=>window.__A.play(id,{},1500),A));await p.keyboard.press('Escape');await p.waitForTimeout(300);log('abandon',{c:await click(p,'abandon')})}
  else{const r=await ev(([id,f])=>window.__A.play(id,{fail:f},20000),[A,HOW==='fail']);log('A',r);const c=await waitCard(p);log('Acard',{btns:c&&c.btns});
    log('leave',{c:await click(p,HOW==='win'?'result:retry':'result:go'),label:HOW==='win'?'Keep driving':'Head home'})}
  await ev(()=>window.__ht.step(30));await live(p,1200);log('hubAfterA',await ev(()=>window.__A.snap()));
  const after=await runB(p,ev);log('afterA',after);
  const d={};for(const k of Object.keys(fresh))if(!['pos','solids','cols','scene','lgroup','traffic','play','obj','prompt','hp'].includes(k)&&JSON.stringify(fresh[k])!==JSON.stringify(after[k]))d[k]=[fresh[k],after[k]];
  log('diff',{A,B,how:HOW,d});log('errors',{errs:errs.filter(e=>!/favicon/.test(e)).slice(0,6)});await b.close()})().catch(e=>{console.error(e);process.exit(1)});
