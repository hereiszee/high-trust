/* Hitch Happens on the street with REAL keys: Kim's car on the hook, east along Oak St past the parked car that sits in the
   kerb lane 7 m before her curb (and the other kerbside cars near the job's curbs). Three drives per car:
     pass  - swing out round it and back in (what a player should do)
     hit   - stay in lane, nose into it at walking pace, then try to reverse out and go round
     fold  - reverse with the wheel hard over until the towed car folds, then try to drive away
   node dev/tow-fix/street.js [--shots=dir] [--only=pass|hit|fold] */
const {startTow,driver,helpers}=require('./lib.js'),fs=require('fs'),path=require('path');
const arg=(k,d)=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?a.split('=')[1]:d};
const SHOTS=arg('shots',null),ONLY=arg('only',null);
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a},yawTo=(dx,dz)=>Math.atan2(-dx,-dz);
/* each street case: start pose (east-bound), the parked car, the path a player takes round it */
const CASES=[{name:'oak-kim',car:'kim',start:{x:321,z:16.5},parked:{x:331,z:17},pass:[{x:322,z:16.3},{x:326,z:14.2},{x:336,z:14.2},{x:346,z:16.3},{x:356,z:16.5}],lane:16.5,end:356},
  {name:'ash-east',car:'rosa',start:{x:404,z:72.5},parked:{x:427,z:73},pass:[{x:414,z:72.3},{x:419,z:70.2},{x:433,z:70.2},{x:442,z:72.3},{x:452,z:72.5}],lane:72.5,end:452},
  {name:'st99',car:'earl',start:{x:350,z:100.5},parked:{x:367,z:101},pass:[{x:358,z:100.3},{x:362,z:98.2},{x:373,z:98.2},{x:382,z:100.3},{x:392,z:100.5}],lane:100.5,end:392}];
(async()=>{const {b,p,ev,r,errs}=await startTow();console.log('start',JSON.stringify(r));await helpers(p);const D=driver(p);
  if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
  const shot=async n=>{if(!SHOTS)return;await ev(()=>{const H=window.__ht;H.camTick&&H.camTick(1/30);H.ow&&H.ow.update&&H.ow.update(H.camera);H.draw()});await p.screenshot({path:path.join(SHOTS,n+'.jpg'),type:'jpeg',quality:80})};
  await ev(()=>{window.__TFev=[];window.HT.Tow.on((t,d)=>{if(['hit','scrape','jackknife','snap','detach','hitch','reset','yield'].includes(t))window.__TFev.push(t+(d&&d.sp?':'+d.sp.toFixed(1):'')+(d&&d.why?':'+d.why:''))})});
  const out=[];
  for(const C of CASES)for(const mode of['pass','hit','fold']){if(ONLY&&ONLY!==mode)continue;
    await ev(([C])=>{const H=window.__ht,Tw=window.HT.Tow;if(Tw.link)Tw.detach('reset',{quiet:true});window.__TF.place(C.start.x,C.start.z,-Math.PI/2);window.__TF.hitch(C.car);window.__TF.place(C.start.x,C.start.z,-Math.PI/2);window.__TFev.length=0;
      /* the parked car back where the world put it (a previous run may have shoved it) */const pc=(H.L.cars||[]).find(e=>Math.abs(e.pos.x-C.parked.x)<4&&Math.abs(e.pos.z-C.parked.z)<3);if(pc){pc.pos.x=C.parked.x;pc.pos.z=C.parked.z;H.jobs.api.syncCar(pc)}},[C]);
    await D.set({});await D.step(4);
    const log={case:C.name,mode,touch:new Set(),towTouch:new Set(),done:false,stuckS:0,maxRel:0,notes:[]};let t=0,wi=0,ph='go',stk=0,phT=0,rev0=null;
    for(;t<1500;t++){const s=await D.st();if(!s.cv){log.notes.push('out of car');break}if(!s.link&&ph!=='free'){log.notes.push('lost the hitch at '+s.x.toFixed(1)+','+s.z.toFixed(1));ph='free'}
      const c=await ev(()=>window.__TF.contacts());for(const x of c.truck||[])log.touch.add(ph+':'+x);for(const x of c.towed||[])log.towTouch.add(ph+':'+x);if(s.link)log.maxRel=Math.max(log.maxRel,Math.abs(s.link.rel));
      const k={},steer=st=>{const q=(t%6)/6;k.a=st>0&&q<Math.abs(st);k.d=st<0&&q<Math.abs(st)},seek=(w,v)=>{const dy=wrap(yawTo(w.x-s.x,w.z-s.z)-s.yaw);steer(Math.max(-1,Math.min(1,dy*2.2)));k.w=s.spd<v;k.s=s.spd>v+1.5};
      phT++;
      if(mode==='pass'||ph==='round'){const W=ph==='round'?log.round:C.pass,w=W[Math.min(wi,W.length-1)];if(Math.hypot(w.x-s.x,w.z-s.z)<3){wi++;if(wi>=W.length){log.done=true;break}}seek(w,5);
        if(Math.abs(s.spd)<.2){stk++;if(stk>=90){log.notes.push('no progress 6 s at '+s.x.toFixed(1)+','+s.z.toFixed(1));log.stuckS=6;break}}else stk=0;
        if(mode==='pass'&&Math.abs(s.x-C.parked.x)<1.5&&!log.shot){log.shot=1;await shot(C.name+'-pass')}}
      else if(mode==='hit'){if(ph==='go'){seek({x:C.end,z:C.lane},2.5);if(Math.abs(s.spd)<.3&&s.x>C.start.x+6){stk++;if(stk>15){ph='rev';phT=0;stk=0;rev0={x:s.x,z:s.z};log.notes.push('stopped by the parked car at '+s.x.toFixed(1));await shot(C.name+'-hit')}}else stk=0}
        else if(ph==='rev'){/* back off 5 m, steering so the nose comes out (reversing: right lock swings the nose left) */k.s=true;steer(phT<25?-.6:0);const d=Math.hypot(s.x-rev0.x,s.z-rev0.z);if(d>4.5){ph='round';wi=0;log.notes.push('reversed out in '+(phT*2/30).toFixed(1)+' s');
            log.round=[{x:s.x+4,z:C.lane-2.3},{x:C.parked.x+5,z:C.lane-2.3},{x:C.parked.x+14,z:C.lane-.2},{x:C.end,z:C.lane}];stk=0}
          if(Math.abs(s.spd)<.15){stk++;if(stk>=90){log.notes.push('cannot reverse out: '+d.toFixed(2)+' m in 6 s');log.stuckS=6;break}}else stk=0}}
      else if(mode==='fold'){if(ph==='go'){k.s=true;steer(1);if(s.link&&Math.abs(s.link.rel)>1.2||phT>150){ph='away';phT=0;log.notes.push('folded to '+Math.round(Math.abs(s.link?s.link.rel:0)*57)+' deg');await shot(C.name+'-fold')}}
        else if(ph==='away'){seek({x:C.end,z:C.lane-2.5},4);if(phT>60&&Math.abs(s.spd)<.2){stk++;if(stk>=90){log.notes.push('fold: cannot drive away');log.stuckS=6;break}}else stk=0;if(s.x>C.start.x+25){log.done=true;break}}}
      await D.set(k);await D.step(2)}
    await D.set({});const evs=await ev(()=>window.__TFev.slice());
    const row={case:log.case,mode,done:log.done,secs:+(t*2/30).toFixed(1),maxHitchDeg:Math.round(log.maxRel*57),stuck:log.stuckS,notes:log.notes,truckTouched:[...log.touch],towedTouched:[...log.towTouch],events:[...new Set(evs)]};out.push(row);console.log(JSON.stringify(row))}
  fs.writeFileSync(path.join(__dirname,'street-out.json'),JSON.stringify(out,null,1));
  const bad=errs.filter(e=>!/favicon/.test(e));console.log(bad.length?'ERRORS '+bad.join('|'):'no console errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
