/* Hitch Happens pick-ups with REAL keys: for each lot car, start on River Rd nose north in line with the car's column (optionally
   off-line / skewed), reverse down to it like a player would (W/A/S/D/Space through page.keyboard), hold E to hitch, then pull it out
   and drive to the first corner of its delivery route. Logs every static collider the truck or the towed car touches.
   node dev/tow-fix/pickup.js [--shots=dir] [--var=0|all] */
const {startTow,driver,helpers}=require('./lib.js'),fs=require('fs'),path=require('path');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const SHOTS=arg('shots',null),VAR=arg('var','0');
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a},yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
const EXIT={kim:[{x:313.5,z:118},{x:313.5,z:100}],rosa:[{x:313.4,z:131},{x:322,z:128.5},{x:340,z:128.5}],earl:[{x:313.4,z:131},{x:322,z:128.5},{x:340,z:128.5}],hollis:[{x:317.1,z:131},{x:324,z:128.5},{x:340,z:128.5}],benny:[{x:317.1,z:131},{x:324,z:128.5},{x:340,z:128.5}]};
(async()=>{const {b,p,ev,r,errs}=await startTow();console.log('start',JSON.stringify(r));await helpers(p);const D=driver(p);
  if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
  const shot=async n=>{if(!SHOTS)return;await ev(()=>{const H=window.__ht;H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(SHOTS,n+'.jpg'),type:'jpeg',quality:80})};
  await ev(()=>{window.__TFev=[];window.HT.Tow.on((t,d)=>{if(['hit','scrape','bump','jackknife','snap','detach','hitch'].includes(t))window.__TFev.push(t+(d&&d.sp?':'+d.sp.toFixed(1):'')+(d&&d.why?':'+d.why:''))})});
  const order=[['kim'],['hollis'],['rosa',['kim','hollis']],['benny',['kim','hollis']],['earl',['kim','hollis','rosa','benny']]];
  const variants=VAR==='all'?[[0,0],[.7,0],[-.7,0],[0,.12],[.5,-.1]]:[[0,0]];
  const table=[];
  for(const [id,gone] of order)for(const [dx,dyaw] of variants){
    /* a fresh lot each run: put every car back in its slot, the ones in 'gone' at their curbs */
    await ev(([id,gone])=>{const H=window.__ht,M=H.M,a=H.jobs.api,Tw=window.HT.Tow;if(Tw.link)Tw.detach('reset',{quiet:true});const SL=[{x:313.4,z:136.7},{x:317.1,z:136.7},{x:313.4,z:143.5},{x:317.1,z:143.5},{x:313.4,z:150.3}];
      M.cars.forEach((e,i)=>{e.st='lot';e.loose=false;e.towed=false;const S=a.carSize(e);e.yaw=0;e.pos.set(SL[i].x,0,SL[i].z+S.l/2);a.syncCar(e);if(e.obj)e.obj.rotation.z=0});for(const g of gone)window.__TF.home(g);window.__TFev.length=0},[id,gone||[]]);
    const car=await ev(id=>{const e=window.__ht.M.cars.find(x=>x.o.id===id);return{x:e.pos.x,z:e.pos.z}},id);
    await ev(([x,z,y])=>window.__TF.place(x,z,y),[car.x+dx,112,dyaw]);await D.set({});await D.step(2);
    const log={id,dx,dyaw,touch:new Set(),towTouch:new Set(),why:new Set(),hitched:false,tHitch:null,stuck:0,out:false,shots:0};let ph='rev',t=0,stk=0,holdT=0,wi=0;
    for(;t<1800;t++){const s=await D.st();if(!s.cv){log.fail='out of the car ('+ph+')';break}const c=await ev(()=>window.__TF.contacts());for(const x of c.truck||[])log.touch.add(ph+':'+x);for(const x of c.towed||[])log.towTouch.add(x);
      const k={};
      if(ph==='rev'){/* steer the hitch onto the bumper: reversing, so steer the opposite way to where the hitch must go */
        const S=s.len,bump={x:car.x,z:car.z-(id==='hollis'||id==='benny'?4.254:4.852)/2},Hg={x:bump.x,z:bump.z-.6},hy=s.yaw,f=[-Math.sin(hy),-Math.cos(hy)],Hh={x:s.x-f[0]*(S/2+.25),z:s.z-f[1]*(S/2+.25)};
        const lat=(Hh.x-Hg.x),along=(Hg.z-Hh.z)*-1*-1,h=wrap(s.yaw-0),hd=Math.max(-.32,Math.min(.32,-.45*lat)),st=Math.max(-1,Math.min(1,-(hd-h)*3.2)),ph6=(t%6)/6;
        k.a=st>0&&ph6<Math.abs(st);k.d=st<0&&ph6<Math.abs(st);const al=Hg.z-Hh.z;const want=al>4?-2.6:al>1.2?-1.1:-.5;k.s=s.spd>want;k.w=s.spd<want-.6;
        if(s.cand)log.why.add(s.cand.why||'ok');
        if(s.cand&&s.cand.ok){ph='hold';holdT=0}
        if(al<-1.2){ph='fail';log.fail='overshot (hitch past the bumper) lat '+lat.toFixed(2)}
        if(Math.abs(s.spd)<.05&&k.s){stk++;if(stk>90){ph='fail';log.fail='stuck reversing at '+s.x.toFixed(1)+','+s.z.toFixed(1)}}else stk=0;
        if(t===60&&log.shots++<1)await shot(id+'-a-reversing'+(dx||dyaw?'-v':''))}
      else if(ph==='hold'){if(Math.abs(s.spd)>.15){k[' ']=true}else{k.e=true;holdT++}if(s.link){ph='out';log.hitched=true;log.tHitch=t;wi=0;await shot(id+'-b-hitched'+(dx||dyaw?'-v':''))}else if(holdT>150){ph='fail';log.fail='held E 5 s, no hitch ('+JSON.stringify(s.cand)+')'}}
      else if(ph==='out'){const W=EXIT[id],w=W[Math.min(wi,W.length-1)];if(Math.hypot(w.x-s.x,w.z-s.z)<3.5){wi++;if(wi>=W.length){log.out=true;break}}
        const dy=wrap(yawTo(w.x-s.x,w.z-s.z)-s.yaw),st=Math.max(-1,Math.min(1,dy*2.2)),ph6=(t%6)/6;k.a=st>0&&ph6<Math.abs(st);k.d=st<0&&ph6<Math.abs(st);k.w=s.spd<4;k.s=s.spd>6;
        if(Math.abs(s.spd)<.15){stk++;if(stk>90){log.stuck++;ph='fail';log.fail='no progress pulling out at '+s.x.toFixed(1)+','+s.z.toFixed(1)}}else stk=0;
        if(t-log.tHitch===75)await shot(id+'-c-pulling-out'+(dx||dyaw?'-v':''))}
      else break;
      await D.set(k);await D.step(2)}
    await D.set({});const evs=await ev(()=>window.__TFev.slice());
    const row={car:id,off:dx+'m/'+Math.round(dyaw*57)+'deg',hitched:log.hitched,secsToHitch:log.tHitch!=null?+(log.tHitch*2/30).toFixed(1):null,out:log.out,fail:log.fail||'',truckTouched:[...log.touch],towedTouched:[...log.towTouch],events:evs,why:[...log.why]};
    table.push(row);console.log(JSON.stringify(row))}
  fs.writeFileSync(path.join(__dirname,'pickup-out.json'),JSON.stringify(table,null,1));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.join('|'):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
