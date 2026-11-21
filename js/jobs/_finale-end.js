/* =====================================================================
   EVERYBODY WAVES, stages 6-7 (loaded by js/jobs/finale.js): BOX HIM IN, HANDS UP.
   ===================================================================== */
(function(){'use strict';const FN=window.HT&&HT.Finale;if(!FN)return;const{A,G,W,hyp,clamp,wrap,yawTo,cyaw,pick,person,unperson,walkTo,say,sayAll,once,role,kit,sign,advance,fade}=FN;
const D=document;

/* ===================================================================== STAGE 6: BOX HIM IN ===================================================================== */
/* his loop: Mill St east, 5th St north, Ash St west, River Rd south, Dock St east, 5th St north again... three times round, then he's gone */
const LOOP=[{x:443,z:99},{x:443,z:71},{x:315,z:71},{x:315,z:127},{x:443,z:127}];
const CK={max:13,far:70,near:22,lostD:170,lostT:7,callD:32,boxT:3,inR:2.6,behind:[3.5,13],lat:2.6,crumb:2,gap:9,startT:9};
function chasePath(){const pts=[{x:W.sedan.x,z:W.sedan.z}];for(let lap=0;lap<3;lap++)for(const p of LOOP)pts.push(p);pts.push(LOOP[0]);return FN.route(pts)}
FN.chasePath=chasePath;
const CREWCAR={rick:['sedan','#a8322d'],benny:['workvan','#f5d0e0'],sal:['pickup','#2f4f6f'],dave:['pickup','#5a7a3a'],gary:['suv','#4b5d6b'],doug:['suv','#6b6b4b'],hank:['pickup','#b23a2a'],earl:['workvan','#e3a32a'],rosa:['hatch','#3f8f86'],dee:['minivan','#7a5aa8']};
FN.stages.chase={
  build(M){const a=A(),S=M.fn.sub;FN.festSet(M,2);const path=chasePath();S.path=path;S.P=FN.polyOf(path);S.rail=FN.rail(path,{max:CK.max,len:4.9,gap:4});S.rail.place(0);
    S.sed=FN.car('sedan','#1b1d22',W.sedan.x,W.sedan.z,W.sedan.yaw);S.t=0;S.box={t:0};S.called=false;S.lostT=0;S.go=false;S.crumbs=[];
    /* your van on 2nd St, nose south, keys in it */
    const V=a.VAN;if(!a.CV){V.pos.set(347.4,0,54);V.yaw=Math.PI;V.spd=0;if(V.car)V.car.spd=0;try{G().syncVan&&G().syncVan()}catch(_){}}
    /* the box car (your pick) and the front blocker (Benny's truck, or Dave's pickup if Benny's driving the box) */
    const bx=role(M,'box');const bid=bx.id||'rick',fid=bid==='benny'?'dave':'benny';S.crew=[{id:bid,slot:{side:-1,back:0},who:'box',close:bx.v},{id:fid,slot:{side:0,back:-7.5},who:'front',close:3.6}].map((c,i)=>{const t=CREWCAR[c.id]||['suv','#555'];
      const v=FN.car(t[0],t[1],345.5+(i?-0:0),62+i*7,Math.PI);v.spd=0;return Object.assign(c,{v,mode:'convoy',in:false})});
    /* in line behind you on HT.Convoy (CarAI cars driving in your tracks); a breadcrumb follower if convoy.js isn't loaded */
    const CA=a.CarAI&&a.CarAI();if(HT.Convoy&&HT.Convoy.create&&CA&&CA.make){S.C=HT.Convoy.create({gap:'normal'});S.lead={x:a.VAN.pos.x,z:a.VAN.pos.z,yaw:a.VAN.yaw,spd:0,len:5.1};S.C.leader(S.lead);
      for(const c of S.crew){c.ai=CA.make(c.v.type,{x:c.v.x,z:c.v.z,yaw:c.v.yaw});c.m=S.C.add(c.ai,{id:c.id,name:c.id})}}
    if(once(M,'ch0'))sayAll([['you',"Van. Now."],[bid,"Right behind you. When you're on his bumper, say the word. Press G. That's the word."]])},
  upd(dt,M,F){const a=A(),S=M.fn.sub,r=S.rail,P=a.P;S.t+=dt;const pc=FN.playerCar();
    if(!S.go&&(pc||S.t>CK.startT+6)&&S.t>2){S.go=true;say('the wholesaler',"(on the radio) Hm. A minivan. Of course it's a minivan.")}
    const p=pc||{x:P.pos.x,z:P.pos.z,spd:0};const d=hyp(r.x-p.x,r.z-p.z);
    /* he drives; a rubber band so it stays a chase (faster when you're close, he eases when you're far) */
    if(S.go&&!S.stopping){const mul=d>CK.far?.72:d<CK.near?1.06:1;r.step(dt,{speedMul:S.box.t>0?Math.max(.55,mul-.35*S.box.t/CK.boxT):mul})}
    if(S.stopping){r.step(dt,{speedMul:.001});if(r.v<.2&&!S.done){S.done=true;M.fn.carry={x:r.x,z:r.z,yaw:r.yaw};sayAll([['the wholesaler',"...Fine. FINE. I'm getting out. Nobody hit the paint."],[role(M,'box').id||'rick',"Boxed. Textbook. Somebody get a whiteboard."]]);advance(M,'handsup');return}}
    S.sed.spd=r.v;FN.placeCar(S.sed,r.x,r.z,r.yaw,dt);
    crumbs(M,p);crewTick(dt,M,p);
    if(!pc){F.objs.push(['Get in your minivan on 2nd St',false]);F.target={x:a.VAN.pos.x,z:a.VAN.pos.z,label:'Your van'};return}
    /* the box */
    const tg={x:r.x,z:r.z,yaw:r.yaw,spd:r.v,w:2,l:4.9};const f={x:-Math.sin(r.yaw),z:-Math.cos(r.yaw)},rt={x:Math.cos(r.yaw),z:-Math.sin(r.yaw)};
    const rx=p.x-r.x,rz=p.z-r.z,back=-(rx*f.x+rz*f.z),lat=Math.abs(rx*rt.x+rz*rt.z);const behind=back>CK.behind[0]&&back<CK.behind[1]&&lat<CK.lat;
    if(!S.called&&d<CK.callD){F.objs.push(['Press G to call the box',false])}
    if(a.keys.g&&!S.gk&&!S.called&&d<CK.callD+10){S.called=true;sayAll([['you',"BOX! Box box box!"],[S.crew[0].id,"Going left!"],[S.crew[1].id,"Going around the front! Hold on to your cones!"]])}S.gk=a.keys.g;
    const inSlot=S.called&&S.crew.every(c=>c.in);if(inSlot&&behind)S.box.t+=dt;else S.box.t=Math.max(0,S.box.t-dt*2);
    if(S.box.t>=CK.boxT&&!S.stopping){S.stopping=true;M.fn.st.boxT=Math.round(S.t)}
    F.objs.push([S.called?(inSlot?(behind?'Hold the box · stay on his bumper':'Get right behind him: they have the sides'):'The crew is moving into the box…'):'Catch him: close to '+CK.callD+' m, then press G',false]);
    F.objs.push(['No ramming the neighbours. No guns. Just cars.',false]);
    F.target={x:r.x,z:r.z,label:'The Wholesaler'};F.meters.push({id:'gap',label:'Distance',v:Math.min(120,d),max:120,style:'bar',warn:CK.callD,sub:Math.round(d)+' m'});
    if(S.called)F.meters.push({id:'box',label:'Box',v:S.box.t,max:CK.boxT,style:'bar',sub:S.crew.map(c=>c.in?'✓':'…').join(' ')+(behind?' ✓':' …')});
    if(d>CK.lostD)S.lostT+=dt;else S.lostT=0;
    if(S.lostT>CK.lostT||r.done){M.loseWhy='chase:'+(r.done?'escaped':'lost');return a.endMission(false,"He got away down Route 9. Doug got his plate. Doug got his plate three times. It doesn't help.",'He got away.')}
    if(once(M,'chase1')&&S.t>20)say('doug',"He's going round in a loop. People who own warehouses always think they're smarter than the grid.")},
  fire(M){A().feed('No guns in a car chase through a festival neighbourhood','info');return true},
  clear(M){},
  bot(a,t,o,M,B){const S=M.fn.sub,r=S.rail,P=a.P;if(!a.CV){P.pos.set(a.VAN.pos.x+2.4,0,a.VAN.pos.z);a.collide(P.pos,.35);if(t%6===3)a.enterCar(a.VAN);return}
    const e=a.CV,c=e.car||e;const q=S.P.at(Math.max(0,r.s-7));e.pos.set(q.x,0,q.z);e.yaw=q.yaw;c.spd=r.v;a.syncCar(e);a.keys.g=(t%20)<2}};
/* breadcrumbs behind your car, for the convoy */
function crumbs(M,p){const S=M.fn.sub,L=S.crumbs,l=L[L.length-1];if(!l||hyp(l.x-p.x,l.z-p.z)>CK.crumb){L.push({x:p.x,z:p.z});if(L.length>200)L.shift()}}
/* the crew's cars: in convoy behind you until you call it, then into their slots around him (HT.Tail.slot keeps them in lane) */
function crewTick(dt,M,p){const S=M.fn.sub,Tl=FN.TL(),r=S.rail;
  if(S.C&&!S.called){const a=A(),e=a.CV;if(e){S.lead.x=e.pos.x;S.lead.z=e.pos.z;S.lead.yaw=e.yaw;S.lead.spd=e.car?e.car.spd:(e.spd||0)}
    try{S.C.tick(dt,{others:[{x:r.x,z:r.z,yaw:r.yaw,spd:r.v,len:4.9,w:2}]})}catch(err){console.error(err);S.C=null}
    if(S.C){for(const c of S.crew){const q=c.ai;c.v.spd=q.spd;FN.placeCar(c.v,q.x,q.z,q.yaw,dt)}return}}
  if(S.C&&S.called){for(const c of S.crew)try{S.C.remove(c.m)}catch(_){}S.C=null}
  S.crew.forEach((c,i)=>{const v=c.v;let tx,tz,ty,maxV;
    if(!S.called){/* follow the crumb trail: the convoy (Minivan Roundup's HT.Convoy drives CarAI cars; ours are scripted, so a crumb follower) */
      const L=S.crumbs;let acc=0,k=L.length-1,want=CK.gap*(i+1);while(k>0&&acc<want){acc+=hyp(L[k].x-L[k-1].x,L[k].z-L[k-1].z);k--}const q=L[Math.max(0,k)]||{x:v.x,z:v.z};tx=q.x;tz=q.z;maxV=18}
    else{const sl=Tl&&Tl.slot?Tl.slot({x:r.x,z:r.z,yaw:r.yaw,spd:r.v,w:2,l:4.9},{side:c.slot.side,back:c.slot.back,gap:2.4,path:S.P,s:r.s},{w:2,l:v.S.l}):{x:r.x+Math.cos(r.yaw)*c.slot.side*2.6,z:r.z-Math.sin(r.yaw)*c.slot.side*2.6};
      tx=sl.x;tz=sl.z;maxV=r.v+c.close;ty=sl.yaw}
    const dx=tx-v.x,dz=tz-v.z,dd=hyp(dx,dz);const sp=S.called?Math.min(maxV,r.v*.9+dd*1.8):Math.min(maxV,dd*1.6);if(dd>.05){const s=Math.min(dd,sp*dt);v.x+=dx/dd*s;v.z+=dz/dd*s}
    const yw=ty!=null&&dd<3?ty:dd>.3?yawTo(dx,dz):v.yaw;v.yaw=v.yaw+wrap(yw-v.yaw)*Math.min(1,dt*5);v.spd=sp;FN.placeCar(v,v.x,v.z,v.yaw,dt);c.in=S.called&&dd<CK.inR})}

/* ===================================================================== STAGE 7: HANDS UP ===================================================================== */
const ROUNDS=[
  {w:"You people are fixing a neighbourhood with minivans and traffic cones.",opts:[["And zip-ties.",'real',"...And zip-ties."],["And a pivot table. Gary insisted.",'joke',"A pivot table. Of course. Of course there's a pivot table."],["You should see us with a lawn chair.",'joke',"I've heard about the lawn chair. Everybody's heard about the lawn chair."]]},
  {w:"Do you know what I move in a week? Grills. Bikes. Kayaks. Lawn gnomes. This town buys its own stuff back from me and calls it a bargain.",opts:[["Not any more. It all went home. Every grill, every bike, the gnome.",'real',"(a long breath) The gnome was a mistake. I knew the gnome was a mistake."],
    ["Honestly the gnome was the last straw for a lot of people.",'joke',"It was a very ugly gnome. I'm a businessman. Not a monster."],["Out of the car. Slowly. Or else.",'tough',"Or else what? (he looks at the crowd. The crowd looks back. Somebody waves.) ...Okay. Okay."]]},
  {w:"So what now? You're going to shoot me? In front of a funnel cake stand?",opts:[["Nobody's getting shot. Hands where everyone can see them, and we all keep our Saturday.",'real',"...Fine. Fine. Hands up. Is that what you want? Hands up."],
    ["Somebody here has a zip-tie with your name on it.",'joke',"(Malik holds up a zip-tie. It's festival blue.) ...Fine. Fine. Hands up. Is that what you want? Hands up."],["Turn around.",'tough',"(he turns around, very slowly) ...Fine. Hands up. Is that what you want? Hands up."]]}];
FN.ROUNDS=ROUNDS;
FN.stages.handsup={
  build(M){const a=A(),S=M.fn.sub,c=M.fn.carry||{x:420,z:72,yaw:-Math.PI/2};FN.festSet(M,2);S.t=0;S.round=-1;S.ph='walk';
    a.holster(true);M.noGuns="A conversation. Not a shoot-out.";
    S.sed=FN.car('sedan','#1b1d22',c.x,c.z,c.yaw);const f={x:-Math.sin(c.yaw),z:-Math.cos(c.yaw)},rt={x:Math.cos(c.yaw),z:-Math.sin(c.yaw)};
    const bx=role(M,'box').id||'rick',fid=bx==='benny'?'dave':'benny';const cc=CREWCAR[bx]||['suv','#555'],fc=CREWCAR[fid]||['workvan','#f5d0e0'];
    S.boxCars=[FN.car(cc[0],cc[1],c.x-rt.x*2.7,c.z-rt.z*2.7,c.yaw),FN.car(fc[0],fc[1],c.x+f.x*7.6,c.z+f.z*7.6,c.yaw+.25)];
    /* he gets out and stands in the road behind his car (the box car has his left, the kerb his right) */
    const sp=a.wmSnap(c.x-f.x*4.2-rt.x*.6,c.z-f.z*4.2-rt.z*.6);S.w=person('wholesaler',sp.x,sp.z);if(S.w){S.w.face={x:sp.x-f.x*6,z:sp.z-f.z*6};S.w.name='The Wholesaler'}
    S.spot={x:sp.x,z:sp.z};S.rt=rt;S.f=f;
    /* everybody comes: the crew always; if you've been a zip-tie dad all along, half the festival too */
    const pr=G().prog||{};const zipDad=(pr.cuffed||0)>=2*Math.max(1,pr.downed||0);M.fn.st.zipDad=zipDad?1:0;
    const ids=['gary','rick','dave','doug','rosa','earl','dee','benny','hank','sal'].filter(id=>id!==bx&&id!==fid);if(zipDad)ids.push('nb_gran','nb_pops','nb_mei','nb_kenji','nb_sweater','nb_lucia','nb_office','thug_cap','nb_teen','nb_marcus');
    /* they come up the street from both ends and stand along it, on the road and the pavement (never inside a wall) */
    const ok=(x,z)=>a.walkable(a.tx(x),a.tx(z))!==false;
    S.ring=ids.map((id,i)=>{const side=i%2?1:-1,along=side*(7+Math.floor(i/2)*1.4),lat=((i*7)%5-2)*1.3;let ax=S.spot.x-f.x*along+rt.x*lat,az=S.spot.z-f.z*along+rt.z*lat;if(!ok(ax,az)){const q=a.wmSnap(ax,az);ax=q.x;az=q.z}
      const sx=S.spot.x-f.x*(along+side*22)+rt.x*lat,sz=S.spot.z-f.z*(along+side*22)+rt.z*lat;const p=person(id,sx,sz);if(p){walkTo(p,ax,az,1.7+Math.random()*.6);p.face={x:S.spot.x,z:S.spot.z}}return p}).filter(Boolean);
    {const mx=S.spot.x+f.x*-9-rt.x*1.5,mz=S.spot.z+f.z*-9-rt.z*1.5;const q=a.wmSnap(mx,mz);S.malik=person('malik',q.x,q.z,{scale:.86});if(S.malik)S.malik.face={x:S.spot.x,z:S.spot.z}}
    if(once(M,'hu0'))sayAll([['gary',"Everybody stay calm. Everybody stay very, very calm. I am extremely calm."]])},
  upd(dt,M,F,fading){const a=A(),S=M.fn.sub,P=a.P;S.t+=dt;if(a.P.dude&&a.P.dude.gun)a.equip(a.P.dude,null);
    const d=hyp(P.pos.x-S.spot.x,P.pos.z-S.spot.z);
    if(S.ph==='walk'){if(a.CV){F.objs.push(['Get out and walk up to him (E to get out)',false])}else F.objs.push(['Walk up to The Wholesaler and talk to him (E)',false]);F.target={x:S.spot.x,z:S.spot.z,label:'The Wholesaler'};
      if(!a.CV)F.taps.push({x:S.spot.x,z:S.spot.z,r:4,txt:'Talk to The Wholesaler',fn:()=>talk(M)});return}
    if(S.ph==='talk'){S.chT-=dt;F.objs.push(['Answer him: 1, 2 or 3',false]);if(S.chT<=0)answer(M,0);return}
    if(S.ph==='hands'){if(S.malik&&!S.malikGo){S.malikGo=true;walkTo(S.malik,P.pos.x+S.rt.x*.9,P.pos.z+S.rt.z*.9,2.4);S.malik.arrive=q=>{q.face={x:P.pos.x,z:P.pos.z};say('malik',"Here. Mr. Gary said you'd want to do this one yourself.",true)}}
      const m=S.malik;if(m&&m.tx==null&&hyp(P.pos.x-m.x,P.pos.z-m.z)<3.2&&!S.tie)F.taps.push({x:m.x,z:m.z,r:3.2,txt:'Take the zip-tie from Malik',fn:()=>{S.tie=true;say('you',"Thanks, Malik.");say('malik',"It's festival blue. I picked it.")}});
      if(S.tie)F.holds.push({x:S.spot.x,z:S.spot.z,r:2.4,o:S,txt:'Zip-tie The Wholesaler',time:1.2,fn:()=>tie(M)});
      F.objs.push([S.tie?'Zip-tie him: hold E next to him':'Take the zip-tie from Malik (E)',false]);F.target=S.tie?{x:S.spot.x,z:S.spot.z,label:'Zip-tie'}:m?{x:m.x,z:m.z,label:'Malik'}:null;return}
    if(S.ph==='done'){S.endT-=dt;F.objs.push(['That\'s it. That\'s the whole thing.',true]);if(S.endT<=0&&!S.faded){S.faded=true;fade(M,()=>advance(M,'festival'),{out:1.2,hold:1.6,inT:1.4,txt:'That evening'})}}},
  clear(M){const a=A(),S=M.fn.sub;M.noGuns=false;try{a.holster(false)}catch(_){}if(S.ch){try{S.ch.close()}catch(_){}a.overlay('fin-talk',null);S.ch=null}for(const p of(S.ring||[]).concat([S.w,S.malik]))unperson(p)},
  bot(a,t,o,M,B){const S=M.fn.sub,P=a.P;if(a.CV){a.exitCar();return}if(S.ph==='walk'){P.pos.set(S.spot.x+S.rt.x*2,0,S.spot.z+S.rt.z*2);if(t%6===0)a.useTap=true;return}
    if(S.ph==='talk'){if(t%12===6&&S.ch)S.ch.pick(0);return}
    if(S.ph==='hands'){if(!S.tie){if(S.malik){P.pos.set(S.malik.x+.8,0,S.malik.z);if(t%6===0)a.useTap=true}return}P.pos.set(S.spot.x+S.rt.x*1.4,0,S.spot.z+S.rt.z*1.4);a.keys.e=true;return}a.keys.e=false}};
function talk(M){const a=A(),S=M.fn.sub,H=a.HUD;S.ph='talk';S.round=0;if(S.w)S.w.face={x:a.P.pos.x,z:a.P.pos.z};
  const R=ROUNDS[0];let ch=null;try{ch=H.kit.choices({speaker:'The Wholesaler',color:'#d9c27a',prompt:R.w,tell:'good coat, bad day',options:R.opts.map(o=>({text:o[0],reg:o[1]})),onPick:i=>answer(M,i)})}catch(e){console.error(e)}
  S.ch=ch;if(ch)a.overlay('fin-talk',ch.el);S.chT=16;say('the wholesaler',R.w,true)}
function answer(M,i){const a=A(),S=M.fn.sub;if(S.ph!=='talk')return;const R=ROUNDS[S.round],o=R.opts[i]||R.opts[0];M.fn.st.talk.push(o[1]);say('you',o[0],true);say('the wholesaler',o[2]);
  S.round++;if(S.round<ROUNDS.length){const N=ROUNDS[S.round];S.chT=16;say('the wholesaler',N.w);if(S.ch)S.ch.set({speaker:'The Wholesaler',prompt:N.w,tell:S.round===1?'hands still on the roof of the car':'eyes on the crowd',options:N.opts.map(o=>({text:o[0],reg:o[1]}))});return}
  if(S.ch){try{S.ch.close()}catch(_){}a.overlay('fin-talk',null);S.ch=null}S.ph='hands';if(S.w){S.w.mode='hands'}a.banner('HANDS UP','The Wholesaler gave up. Malik has the zip-tie.',2.6)}
function tie(M){const a=A(),S=M.fn.sub;if(S.ph!=='hands')return;S.ph='done';S.endT=9;M.fn.st.tied=1;if(S.w)S.w.mode='kneel';try{HT.People.interact(a.P.dude)}catch(_){}try{a.snd&&a.snd('cuff')}catch(_){}
  const pr=G().prog;if(pr&&!M.replay)pr.cuffed=(pr.cuffed||0)+1;M.cuffs=(M.cuffs||0)+1;
  for(const p of S.ring||[])FN.wave(p,2.4);
  const jobs=Object.values((FN.SV()||{}).jobs||{}).filter(j=>j&&j.done).length;
  sayAll([['gary',jobs+" jobs. "+((pr&&pr.cuffed)||0)+" zip-ties. Zero regrets. One pivot table."],['doug',"Hawk out."],['everyone',"We're not doing call signs."],['dee',"Somebody tell the band. We have a festival to finish."]])}
})();
