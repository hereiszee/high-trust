/* =====================================================================
   EVERYBODY WAVES, stage 8 (loaded by js/jobs/finale.js): THE FESTIVAL, THE WAVE, THE CREDITS, AND AFTER.
   Walk Main St at dusk. Everyone from every job has a line about what you did in THEIR job, read from the save (SAVE.jobs medals,
   flags, households, storefronts). Riverside trust climbs to 100 while you walk, and the blocks finish changing on screen.
   Then a few words from the stage, everybody waves, and the credits roll over a slow drive home in the minivan with the family.
   After: free roam with festival bunting on Main St, everything open, and one card: "the end… of the beginning".
   ===================================================================== */
(function(){'use strict';const FN=window.HT&&HT.Finale;if(!FN)return;const{A,G,W,hyp,clamp,wrap,yawTo,cyaw,pick,person,unperson,walkTo,say,sayAll,once,role,kit,sign,fade}=FN;
const D=document;const SV=()=>FN.SV();
/* ---------------- what the save says you did ---------------- */
function ctx(){const s=SV()||{},jobs=s.jobs||{},fl=s.flags||{},w=s.world||{},hh=w.households||[],sf=w.storefronts||{},pr=(G()&&G().prog)||{};
  const J_=id=>jobs[id]||{};const done=id=>{if(J_(id).done)return true;try{const H=G(),i=H.jobs.index(id);return i>=0&&!!H.prog.done[i]}catch(_){return false}};
  return{s,fl,hh,sf,pr,done,medal:id=>J_(id).medal|0,clean:id=>!!(J_(id).best&&J_(id).best.clean),plan:id=>J_(id).plan||{},has:id=>hh.includes(id),runs:id=>J_(id).runs|0}}
FN.ctx=ctx;
/* the epilogue line: zip-ties against downs across the whole campaign (SPEC3 2.20) */
function epilogue(){const c=ctx(),z=c.pr.cuffed|0,d=c.pr.downed|0;return d<=Math.max(1,z*.2)?'Everybody waves.':d<=z?'Most people wave.':'People wave. Some of them still flinch.'}
FN.epilogue=epilogue;
/* each person: where they stand tonight, who they are, and what they say (first line, and a second if you come back) */
const LINES={
  earl:c=>[c.fl.dezLibrary?"Dez runs the bike library counter on Saturdays now. He charges one smile per bike. He has never once smiled.":c.done('earl')?"The bike library has a waiting list. I put the waiting list on a waiting list.":"Somebody's got to start a bike library around here. Maybe me. Maybe you.",
    c.fl.pepperHome?"Mrs. Lindqvist brought Pepper. The goat is eating the bunting. Nobody is stopping her.":c.done('cones')?"I still have a cone in my trunk from Industrial Way. It's a souvenir now. It's a souvenir cone.":"The transit authority wants the shuttle back by nine. I said 'who is this'."],
  dee:c=>[c.fl.crossingGuard==='ferreira'?"Mr. Ferreira does the 2nd St crossing every morning now. In a vest. He irons the vest.":c.done('crossing')?(c.medal('crossing')>=2?"Eleven kids walk across 2nd St every morning and wave at the volunteer. Eleven waves. Every day.":"Kevin still talks about the day you walked them home. He says you went the long way. You did go the long way."):"The kids would like a crossing guard. Just saying it out loud.",
    c.fl.youthVan?"And the youth group van runs. Thanks to the car wash. Mostly thanks to the inside-wash, which nobody bought.":c.sf.pawn==='bakery'?"Mrs. Ramos says the bakery owes you a lifetime of conchas. I said one a week. We're negotiating.":"Everybody's here. Even the ones who used to stand outside the laundromat. Look at them. They're on the bouncy castle."],
  rosa:c=>[c.fl.gardenEarly?"The garden bloomed early this year. I'd like to take credit. I am going to take credit.":"The garden's doing great. The tomatoes are aggressive.",
    c.done('arrest')?(c.medal('arrest')>=3?"The charity table at the market is real now. Four hundred dollars. I counted it twice, in front of everybody.":"Next time, one beanbag. Not three. I'm saying it out loud so the universe hears it."):"Anybody says 'I'm fine' tonight, send them to me."],
  benny:c=>["My truck's playing the festival! On purpose, this time! It only knows the one song, but it knows it REALLY well.",c.done('benny')?"Remember when they stole my truck? And you got it back? I put a picture of you on the freezer. Kids think you're a flavour.":"Free ice cream for the crew all night. Paid ice cream for Gary. He'll want a receipt anyway."],
  sal:c=>[c.fl.salBranch?"Honest Towing, Riverside branch. The banner's up on Mill St. I spelled 'Honest' right on the second try.":c.done('tow')?"Nobody's car got 'impounded' this month. That's a low bar. We cleared it.":"If anybody's car won't start after this, it's on the house. Tonight only.",
    c.fl.towGuy?"Lyle drives for me now. Three weeks, zero fake impounds. I check. Every day. Twice.":"I'm towing the stage truck back to the depot in the morning. Gently. Like it's my own truck."],
  hank:c=>[c.fl.hankDiscount?"You still have the Hank's Discount. Don't make it weird.":"Two hundred zip-ties. I want ten back. Unused.","Don't tell my wife about the cones. She thinks I sold them. I did sell them. To me. At a discount."],
  barb:c=>[c.fl.hoaWalnut?"1418 Walnut is a real house again. A family. Compliant mailbox. I cried a little.":"I have photographed nine HOA violations at this festival. I'm letting all of them go. Tonight only.",
    c.fl.lookoutMows?"That lookout boy mows it now. Edges and everything. I gave him a certificate. He framed it.":"Your lawn, by the way. We'll talk. Not tonight. Monday."],
  okafor:c=>[c.done('moving')?"My cousins are coming next month. All of them. You're going to have to carry another piano.":"Riverside needs more families on the porches. I'm working on it. I have a lot of cousins.","The twins want to know if you're coming to their birthday. They've already told everyone you are."],
  adeyemi:c=>[c.has('adeyemi')?"We moved in for the schools. We stayed for whatever this is. The piano survived. It's on the porch tonight. Don't ask how.":"We're looking at a house on 3rd St. Everyone says the street's changed. Everyone says you changed it.",
    c.fl.andre?"Andre came back for the furniture. He stayed for the potato salad. He's on his third plate.":"Water? You look like a man who's had a day."],
  ferreira:c=>[c.fl.ferreira?"I sit on my porch on Main St every evening. Now people wave. I wave back. My arm is tired. It's wonderful.":"First time I've been out on Main St after dark in years. It's very loud. I love it.",
    c.done('overwatch')&&c.medal('overwatch')<2?"Doug says you used live rounds on the scarecrow. The scarecrow is fine. The scarecrow forgives you.":"Doug says hello from the roof. He won't come down. He says the view is 'tactical'."],
  ramos:c=>[c.sf.pawn==='bakery'?"Ramos Bakery opens at eight. There's a line at seven-thirty. Tonight the conchas are free. Tomorrow they're not. Tell everyone.":"Where the pawn shop was? I'd put a bakery there. Somebody should. Somebody with flour.","My mother says you're too skinny. Take two."],
  tre:c=>[c.has('tre_bikes')?"Gary got me the job at the bike library. There's a polo. I wear the polo.":"I'm thinking about getting a real job. Gary said something about a polo.",
    c.fl.wholesalerNamed?"I told you his name, back at Gary's grill. Look at him now. Sitting in the back of Officer Dana's car. Sitting very still.":"That guy with the coat? I never liked him. Even before. His shoes were too clean."],
  dez:c=>[c.has('dez_family')?"My mom put flower boxes on the porch. She says it's because of you. I say it's because of flowers.":"I fix bikes now. Legally.",
    (c.fl.bikesHome|0)>0?"We got "+(c.fl.bikesHome|0)+" bikes home that time. Tyler's is the shiniest. He polishes it. Constantly.":"Your kid's bike makes a noise. I'll fix it. Free. This once."],
  marcus:c=>[c.fl.mowerWon?"You won the Grand Prix fair and square. I've reviewed the tape. Fair. And square. I'm still mad.":c.done('mower')?"Next year's Grand Prix, I'm coming for you. On a better mower. A legally better mower.":"There's a lawnmower race in Linden Park. You should try it. You'd lose, but you should try it.",
    c.fl.marcusOwes?"I owe you one. I'm paying it back in mowed lawns. You have a lot of lawn.":"Nice festival. Too many cones."],
  malik:c=>["Was it good? Doing it yourself? Mr. Gary said it would be good.","I picked festival blue for the zip-tie. Pastor Dee said that was 'a choice'."],
  gary:c=>{const n=Object.values(c.s.jobs||{}).filter(j=>j&&j.done).length,e=(c.plan('heist')||{}).entry;return[n+" jobs. "+(c.pr.cuffed|0)+" zip-ties. Zero regrets. One pivot table.",
    e==='loud'?"We went in loud at the storage place. I've made peace with it. In a separate spreadsheet.":e==='quiet'?"Good Fences, in quiet. I still dream about that gate code. 4-7-1-1.":e==='bluff'?"We talked our way into a storage facility. I still have the clipboard.":"I've started a spreadsheet for next year's festival. It has tabs. Seven tabs."]},
  rick:c=>[c.fl.atmSafe?"That box play on Route 9? Textbook. I've drawn it on a whiteboard for the U-10s. They don't get it. They're nine.":"Tonight's box was textbook. TEXTBOOK. I'm getting it laminated.",
    c.done('roundup')?"Every carpool van home and accounted for. Even the one with the juice box smell.":"Somebody parked a minivan on my lawn. I think it was me. I'm very tired."],
  dave:c=>[c.fl.blockParty?"The brisket made it, that day. All fourteen hours. The block party still talks about the bark.":"I brought the smoker. I always bring the smoker. That's who I am now.",
    c.fl.hustlersFed?"Even fed those kids from the Mill St crew. One asked for my rub recipe. I said no. Then I said yes.":"Rosa says I have to sit down. I'm not sitting down. I'm grilling sitting down."],
  doug:c=>[c.runs('patrol')>=3?"The watch sign's up on Maple. WE WAVE. I wanted WE WATCH. Democracy.":c.fl.corkboard?"Took the corkboard down. Nothing left to pin. Put it back up. Pinned a picture of tonight.":"I'm on the roof. I'm not coming down. The view is tactical.",
    "Hawk out."],
  jen:c=>[c.fl.maddieProud?"Maddie told the whole school you drove her to the orthodontist through a car chase. She's exaggerating. Mostly.":"You made it home for dinner every single job. Almost every single job.","Ready to go home? I'll drive. ...No, you drive. You like driving. Go slow."],
  tyler:c=>["Dad. Dad. DAD. Everybody's waving at you. Wave back. It's rude not to wave back.",c.done('bike')?"I tell everybody you got my bike back. I tell it a different way every time. Now there was a helicopter.":"Can we stay till the fireworks? There aren't fireworks? Can there be fireworks?"],
  maddie:c=>[c.done('hoa')?"I helped with the HOA photos. I'm putting 'surveillance' on my college application.":"This is the most people I've ever seen wave at a minivan.","Can I have five dollars for the face painting? It's for a cause. The cause is my face."],
  lyle:c=>["Three weeks driving for Sal. Real tows. Real paperwork. I hate the paperwork. I love the paperwork.","Sal says hi. Sal is standing right there. Sal says hi again."],
  kid:c=>[c.fl.youthVan?"We washed sixty cars for that van! The inside of yours was the worst one!":"Mister, your van needs a wash. Just saying.","Are you the guy? Everybody keeps pointing at you. Are you the guy?"],
  porch:c=>[c.runs('porch')>0?"Somebody returned my Turbo Nose Hair Trimmer once. I know it was you. Please don't tell anyone.":"I sit in my lawn chair and watch the porches now. Somebody told me that works.","Lemonade? It's free. Everything's free tonight. Except Gary's ice cream."]};
FN.LINES=LINES;
/* who's here tonight and where (stall row north z~40.4, south z~45.7, the stoops at z~47.6) */
function guests(){const c=ctx();const g=[['earl',372,40.5],['dee',378,45.4],['rosa',384,40.5],['benny',W.benny.x+.3,W.benny.z+2.3],['sal',390,45.4],['hank',396,40.5],['barb',402,45.4],['okafor',405,47.5],
    ['adeyemi',W.porches[2].x,W.porches[2].z],['ferreira',W.porches[0].x,W.porches[0].z],['ramos',374,45.5],['tre',386,45.5],['dez',389,40.4],['marcus',398,45.5],
    ['gary',380,42],['rick',392,43.8],['dave',366,40.5],['doug',368,45.4],['malik',376,43],['porch',W.porches[3].x,W.porches[3].z]];
  if(c.fl.towGuy)g.push(['lyle',391.5,45.6]);if(c.fl.youthVan||c.done('carwash'))g.push(['kid',382,43.5]);return g}
const KEYMAP={porch:'nb_gran',kid:'nb_kid'};const NAMES={porch:'Mrs. Lindqvist',kid:'Youth group kid'};
FN.stages.festival={
  build(M){const a=A(),S=M.fn.sub,P=a.P;FN.festSet(M,3);FN.hush(M);a.setNight(.45);FN.grade(1);a.holster(true);M.noGuns="It's a festival. Hands are for waving.";S.t=0;S.ph='walk';S.talked=0;S.wv=0;
    if(a.CV)try{a.exitCar()}catch(_){}P.pos.set(403.5,0,43.3);P.yaw=Math.PI/2;P.pitch=-.05;a.collide(P.pos,.35);
    const V=a.VAN;V.pos.set(414.5,0,43.6);V.yaw=Math.PI/2;/* parked at the east barrier, nose west: the way home is through the festival */V.spd=0;if(V.car)V.car.spd=0;try{G().syncVan&&G().syncVan()}catch(_){}
    S.cast=guests().map(([id,x,z])=>{const p=person(KEYMAP[id]||id,x,z,{scale:id==='malik'||id==='kid'?.86:undefined});if(!p)return null;p.lid=id;p.name=NAMES[id]||(FN.CAST[id]||{}).name||id;p.face={x:x+(Math.random()-.5)*2,z:43};p.n=0;return p}).filter(Boolean);
    S.fam=['jen','tyler','maddie'].map((id,i)=>{const p=person(id,363+i*1.1,44.2+(i%2)*.6);if(p){p.lid=id;p.name=FN.CAST[id].name;p.face={x:W.stage.x,z:W.stage.z};p.n=0}return p}).filter(Boolean);
    S.crowd=[];const keys=FN.NB.concat(FN.STREET.slice(0,5));for(let i=0;i<16;i++){const p=person(keys[i%keys.length],356+Math.random()*48,41+Math.random()*4);if(p){p.lo=355;p.hi=404;p.next=Math.random()*5;S.crowd.push(p)}}
    S.tr0=Math.min(99,(G().prog||{}).trustR||80);S.tr=S.tr0;S.trT=0;
    try{HT.Audio&&HT.Audio.music&&HT.Audio.music('hub')}catch(_){}
    if(once(M,'fest0'))sayAll([['dee',"There you are. Walk around. Say hello. Everybody wants to say something to you, and some of it is even nice."]])},
  upd(dt,M,F,fading){const a=A(),S=M.fn.sub,P=a.P;S.t+=dt;if(P.dude&&P.dude.gun)a.equip(P.dude,null);FN.grade(1);
    /* Riverside trust to 100, block by block, while you walk */
    if(S.tr<100){S.tr=Math.min(100,S.tr+dt*(100-S.tr0)/40);if(!M.replay)try{const pr=G().prog;pr.trustR=Math.max(pr.trustR||0,S.tr)}catch(_){}S.trT-=dt;if(S.trT<=0||S.tr>=100){S.trT=.5;try{HT.OpenWorld&&HT.OpenWorld.dress(S.tr,true)}catch(_){}}
      if(S.tr>=100&&once(M,'t100')){a.banner('RIVERSIDE FLATS','Riverside trust 100% · Everybody waves at the minivan.',4);try{HT.Audio.stinger&&HT.Audio.stinger('win')}catch(_){}}}
    for(const p of S.crowd)if(p.tx==null){p.next-=dt;if(p.next<=0){p.next=6+Math.random()*8;walkTo(p,clamp(p.x+(Math.random()-.5)*12,p.lo,p.hi),41+Math.random()*4,.9)}}
    if(S.ph==='walk'){const all=S.cast.concat(S.fam);let best=null,bd=2.6;for(const p of all){const d=hyp(p.x-P.pos.x,p.z-P.pos.z);if(d<bd){bd=d;best=p}}
      if(best)F.taps.push({x:best.x,z:best.z,r:2.6,txt:'Talk to '+best.name+(best.n?' again':''),fn:()=>chat(M,best)});
      const left=S.cast.filter(p=>!p.n).length;F.objs.push(['Walk the festival. Talk to people (E) · '+S.talked+' so far',false]);
      F.meters.push({id:'tr',label:'Riverside',v:Math.round(S.tr),max:100,style:'bar',sub:Math.round(S.tr)+'%'});
      const ready=S.talked>=6||S.t>110;if(ready){if(once(M,'stagecall'))say('dee',"Come up on the stage! Say a few words! Short words! Benny's truck only has one song!",true);
        const mic={x:W.stage.x+W.stage.w/2+1,z:W.stage.z+1.6};/* the foot of the stage steps */F.objs.push(['Say a few words from the stage (E at the stage steps)',false]);F.target={x:mic.x,z:mic.z,label:'The stage'};F.taps.push({x:mic.x,z:mic.z,r:2.4,txt:'Go up and say a few words',fn:()=>speech(M)})}
      else{const n=S.cast.filter(p=>!p.n).sort((x,y)=>hyp(x.x-P.pos.x,x.z-P.pos.z)-hyp(y.x-P.pos.x,y.z-P.pos.z))[0];if(n)F.target={x:n.x,z:n.z,label:n.name}}
      if(left>0&&S.talked>=6)F.objs.push([left+' more people with something to say (optional)',false]);return}
    if(S.ph==='speech'){S.chT-=dt;F.objs.push(['1, 2 or 3',false]);if(S.chT<=0)speak(M,0);return}
    if(S.ph==='wave'){S.wt+=dt;if(S.wt>S.wv){S.wv=S.wt+3.2;/* the wave ripples down the street toward the stage */for(const p of FN.live||[]){if(p.front){FN.wave(p,2.8,S.wv<3.5?0:.2);continue}if(Math.random()<.92)FN.wave(p,2.6,Math.max(0,(408-p.x)*.03))}}
      const can=M.fn.seen.wave;if(can){F.objs.push(['E: skip',false]);F.taps.push({d:0,r:1,txt:'Skip',fn:()=>{S.wt=99}})}
      if(S.wt>12){S.ph='home';FN.cine(false);FN.markSeen(M,'wave');for(const p of S.fam){p.face=null;walkTo(p,a.VAN.pos.x-2.2,a.VAN.pos.z-2+S.fam.indexOf(p)*1.2,1.5)}say('jen',"Okay. Home. I'll get the kids. You get the van.",true)}return}
    if(S.ph==='home'){const V=a.VAN;F.objs.push(['Drive home with the family: E at the minivan (4th St)',false]);F.target={x:V.pos.x,z:V.pos.z,label:'Home'};
      F.taps.push({x:V.pos.x,z:V.pos.z,r:4,txt:'Drive home with the family',fn:()=>credits(M)});
      if(a.CV===V)credits(M);return}
    if(S.ph==='credits'){creditsTick(dt,M,F)}},
  camera(dt,M){const a=A(),S=M.fn.sub;if(S.ph!=='wave')return false;const cam=a.camera,k=clamp(S.wt/9,0,1),e=k*k*(3-2*k);
    /* a crane over the stage: rising and pulling back, the whole street waving under the lights */
    /* close on the family and the crew first, then up and back until the whole street is in it */
    const x=W.stage.x+W.stage.w/2+.6+e*1.8,y=1.55+e*4.6,z=43.6-Math.sin(e*2.2)*.8;cam.position.set(x,y,z);cam.lookAt(W.stage.x+W.stage.w/2+5+e*10,1.45-e*.3,43.1);cam.fov=58;cam.updateProjectionMatrix();if(a.P.dude)a.P.dude.root.visible=true;FN.grade(1);return true},
  vehicle(car,dt,M){const S=M.fn.sub;if(S.ph!=='credits'||!S.dr)return;const a=A();S.ds=Math.min(S.dP.len,S.ds+S.dv*dt*(S.fast?5:1));const q=S.dP.at(S.ds),q2=S.dP.at(Math.min(S.dP.len,S.ds+3));
    car.pos.set(q.x,0,q.z);car.yaw=yawTo(q2.x-q.x,q2.z-q.z)||car.yaw;if(car.car)car.car.spd=S.dv;car.spd=S.dv;a.syncCar(car)},
  clear(M){const a=A(),S=M.fn.sub;FN.cine(false);FN.grade(false);M.noGuns=false;try{a.holster(false)}catch(_){}if(S.ch){try{S.ch.close()}catch(_){}a.overlay('fin-talk',null)}if(S.roll){a.overlay('fin-credits',null);S.roll=null}},
  bot(a,t,o,M,B){const S=M.fn.sub,P=a.P;if(S.ph==='walk'){if(S.talked<6){const p=S.cast.filter(q=>!q.n)[0];if(p){P.pos.set(p.x,0,p.z+(p.z>43.5?-.8:.8));if(t%4===0)a.useTap=true}return}P.pos.set(W.stage.x+W.stage.w/2+1.2,0,W.stage.z+1.6);if(t%4===0)a.useTap=true;return}
    if(S.ph==='speech'){if(t%10===5&&S.ch)S.ch.pick(0);return}if(S.ph==='wave'){if(M.fn.seen.wave&&t%8===0)a.useTap=true;return}
    if(S.ph==='home'){const V=a.VAN;P.pos.set(V.pos.x+2.4,0,V.pos.z);if(t%6===0)a.useTap=true;return}
    if(S.ph==='credits'){a.keys.x=!!M.fn.seen.credits}}};
function chat(M,p){const S=M.fn.sub,L=LINES[p.lid];if(!L)return;const c=ctx();const ls=L(c);const line=ls[Math.min(p.n,ls.length-1)];if(!p.n)S.talked++;p.n++;
  p.face={x:A().P.pos.x,z:A().P.pos.z};FN.wave(p,1.6);say(p.lid==='porch'?'Mrs. Lindqvist':p.lid==='kid'?'Youth group kid':p.lid,line,true);
  if(p.lid==='doug'&&p.n===2)say('everyone',"We're not doing call signs.")}
const SPEECH=[["We did it because we live here. That's it. That's the speech. Somebody start the band.","Thank you. All of you. Especially the man with the STOP paddle. You know who you are, Hank."],
  ["I'd like to thank the cones. Every single cone. And the people who held them. And the goat.","The goat had nothing to do with anything. The goat is here anyway. Like the rest of us."],
  ["Wave at the person next to you. Now wave at somebody you don't know yet. That's the whole plan. That was always the plan.","See? Everybody waves."]];
function speech(M){const a=A(),S=M.fn.sub,P=a.P;S.ph='speech';/* up the steps to the microphone */P.pos.set(W.stage.x+2.4,.92,W.stage.z+.3);P.yaw=-Math.PI/2;let ch=null;
  try{ch=a.HUD.kit.choices({speaker:'You, at the microphone',color:'#ffd23f',prompt:'Everyone is looking at you. Benny has turned the ice cream song down to medium.',tell:'the whole street, holding funnel cakes',options:SPEECH.map((s,i)=>({text:s[0],reg:i===1?'joke':'real'})),onPick:i=>speak(M,i)})}catch(e){console.error(e)}
  S.ch=ch;if(ch)a.overlay('fin-talk',ch.el);S.chT=18}
function speak(M,i){const a=A(),S=M.fn.sub;if(S.ph!=='speech')return;if(S.ch){try{S.ch.close()}catch(_){}a.overlay('fin-talk',null);S.ch=null}const s=SPEECH[i]||SPEECH[0];say('you',s[0],true);say('you',s[1]);
  /* everyone gathers in front of the stage: family and crew in the front row, facing you; the street behind them */
  const front=['jen','tyler','maddie','gary','rick','dave','doug','rosa','dee','earl','benny','malik'];let fi=0;
  for(const id of front){const p=S.cast.concat(S.fam).find(q=>q.lid===id);if(!p)continue;const row=fi<6?0:1,col=fi%6;p.tx=null;p.front=true;p.x=W.stage.x+W.stage.w/2+3.2+row*1.5;p.z=41.2+col*.95+(row?.45:0);p.face={x:W.stage.x,z:W.stage.z};fi++}
  let n=0;for(const p of S.crowd.concat(S.cast.filter(q=>!front.includes(q.lid)&&q.lid!=='adeyemi'&&q.lid!=='ferreira'&&q.lid!=='porch'))){const x=W.stage.x+W.stage.w/2+7+(n%7)*3.2+Math.random(),z=41.2+((n*5)%5)*.95;n++;p.face={x:W.stage.x,z:W.stage.z};walkTo(p,x,z,2.3)}
  S.ph='wave';S.wt=0;S.wv=0;FN.cine(true);try{HT.Audio.music&&HT.Audio.music('victory')}catch(_){}a.HUD.banner({kind:'title',kicker:'Riverside Flats Street Festival',title:epilogue(),sub:'Everybody you helped. Everybody who helped.',dur:6,letterbox:true})}

/* ---------------- the credits: a slow drive home with the family ---------------- */
function credits(M){const a=A(),S=M.fn.sub,V=a.VAN;if(S.ph==='credits')return;S.ph='credits';for(const p of S.fam)p.hidden=true;if(a.CV!==V){try{a.enterCar(V)}catch(_){}}
  /* the slow way home: west down Main St through the festival, everybody stepping back to the kerbs and waving, then over the bridge */
  const home=a.WORLD.places.home;const tailR=FN.route([{x:346,z:43.6},{x:home.x+24,z:43.2},{x:home.x+2,z:home.z+8}]);const path=[{x:V.pos.x,z:43.6},{x:352,z:43.6}].concat(tailR);
  S.dP=FN.polyOf(path);S.ds=0;S.dv=4.2;S.dr=true;const fd=M.fn.festD;if(fd&&fd.closures)fd.closures.visible=false;
  let k=0;for(const p of(FN.live||[])){if(p.hidden||p.mode==='sit'||!p.d)continue;if(p.z>41.6&&p.z<45.4&&p.x>350&&p.x<408){const side=(k++)%2?41.3:45.6;p.face={x:p.x,z:43.5};walkTo(p,p.x+(Math.random()-.5)*1.5,side,2.2)}}
  S.credWave=0;S.roll=rollEl(M);S.rt=0;
  a.overlay('fin-credits',S.roll.el);FN.cine(true);try{HT.Audio.music&&HT.Audio.music('home')}catch(_){}a.setNight(.5);
  sayAll([['tyler',"Dad. Everybody waved at us. Even the goat."],['maddie',"Can we do this every year?"],['jen',"Every year. Same street. Fewer smoke bombs."],['you',"Deal."],['tyler',"...Can I have ice cream when we get home?"],['jen',"You had four."],['tyler',"That was festival ice cream. Home ice cream is different."]])}
function rollEl(M){const c=ctx(),el=D.createElement('div');el.className='fin-cred';el.style.cssText='position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:2;background:linear-gradient(90deg,rgba(6,8,12,.0) 0%,rgba(6,8,12,.0) 55%,rgba(6,8,12,.62) 70%,rgba(6,8,12,.72) 100%)';
  const col=D.createElement('div');col.style.cssText='position:absolute;right:5vw;width:min(440px,42vw);top:100%;color:#f4efe2;font:500 17px/1.5 var(--ui,system-ui,sans-serif);text-align:center;text-shadow:0 2px 6px #000';
  const H=(t,s)=>`<div style="margin:0 0 34px"><div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#ffd23f;margin-bottom:6px">${t}</div>${s}</div>`;
  const n=(name,what)=>`<div><b>${name}</b> <span style="opacity:.75">· ${what}</span></div>`;
  const jobs=Object.keys((c.s.jobs)||{}).filter(id=>c.s.jobs[id]&&c.s.jobs[id].done&&id!=='finale');
  col.innerHTML=`<div style="font:800 40px/1.1 var(--ui,system-ui,sans-serif);margin-bottom:8px">High Trust</div><div style="opacity:.8;margin-bottom:60px">${epilogue()}</div>`+
    H('The crew',n('Gary','spreadsheets, morale, one pivot table')+n('Coach Rick','the box, the whistle, the laminator')+n('Big Dave','grill, brisket, moral support')+n('Doug','overwatch, call signs (unofficial)')+n('Rosa','honorary dad, triage'))+
    H('Riverside',n('Earl','transit, bikes, the No. 9')+n('Pastor Dee','everybody, always')+n('Benny','the one song')+n('Ms. Okafor','cousins (incoming)')+n('Mr. & Mrs. Adeyemi','water, a piano')+n('Mr. Ferreira','waving, professionally')+n('Mrs. Ramos','conchas')+n('Malik','the zip-tie'))+
    H('Maple Heights',n('Hank','cones, at cost')+n('Sal','Honest Towing')+n('Barb','HOA (lenient, tonight only)')+n('Marcus','the Grand Prix, still mad'))+
    H('Home',n('Jen','driving, sometimes')+n('Tyler','bikes, waving')+n('Maddie','surveillance, college applications')+n('Biscuit','good boy'))+
    H('The Wholesaler','<div>One year later he works the counter at Sal\'s. In coveralls. He\'s very good at pricing.</div>')+
    H('Jobs done',`<div style="opacity:.85">${jobs.length} jobs · ${(c.pr.cuffed|0)} second chances · Riverside trust 100%</div>`)+
    `<div style="height:22vh"></div><div style="font:700 30px/1.2 var(--ui,system-ui,sans-serif)">The end…</div><div style="font:700 22px/1.2 var(--ui,system-ui,sans-serif);opacity:.85;margin-top:6px">…of the beginning.</div><div style="height:30vh"></div>`;
  el.appendChild(col);const hint=D.createElement('div');hint.style.cssText='position:absolute;left:24px;bottom:22px;color:#cfd3d6;font:600 13px var(--ui,system-ui,sans-serif);opacity:.85';el.appendChild(hint);return{el,col,hint}}
const CRED={dur:46};
function creditsTick(dt,M,F){const a=A(),S=M.fn.sub,R=S.roll;FN.grade(1);
  /* through the festival at walking pace, people waving as the van goes by; then home at a dad's cruising speed */
  S.dv=S.ds<62?4.2:9;S.credWave-=dt;if(S.credWave<=0&&S.ds<70){S.credWave=.4;const vx=a.VAN.pos.x;for(const p of FN.live||[])if(!p.hidden&&Math.abs(p.x-(vx-6))<4&&!(p.waveT>0))FN.wave(p,2.4)}for(const k of['w','a','s','d',' '])a.keys[k]=false;const can=!!M.fn.seen.credits;S.fast=can&&!!a.keys.x;S.rt+=dt*(S.fast?5:1);
  const k=clamp(S.rt/CRED.dur,0,1),h=R.col.offsetHeight||1400,vh=innerHeight;R.col.style.transform=`translateY(${-(k*(h+vh*.2))}px)`;R.hint.textContent=can?'Hold X to fast-forward':'';
  F.objs.push(['Driving home with the family',false]);
  if(k>=1||S.ds>=S.dP.len-1&&S.rt>CRED.dur*.6){if(S.fin)return;S.fin=true;FN.markSeen(M,'credits');a.overlay('fin-credits',null);S.roll=null;FN.cine(false);M.def.endLine=tail();if(!M.replay)try{G().prog.trustR=100}catch(_){}M.fn.won=epilogue();a.endMission(true)}}
function tail(){const c=ctx();return c.fl.salBranch?"The festival lights stay up on Main St. Honest Towing sponsors the bulbs.":"The festival lights stay up on Main St. Nobody wants to take them down."}

/* the result card: the headline is the epilogue (the game picks a random win line; this one isn't random) */
HT.Jobs.on('hud',()=>{const a=A(),M=a&&a.M;if(!M||!M.fn||!M.fn.won||M.def.id!==FN.ID||M.state!=='won')return;const h=D.querySelector('.ht-result:not(.fail) h2');if(!h||h.dataset.fin)return;
  h.dataset.fin='1';h.textContent=M.fn.won;const st=D.querySelector('.ht-result .stamp');if(st)st.textContent='The first Riverside Flats Street Festival';
  for(const d of D.querySelectorAll('.ht-result .ht-stats > div')){const b=d.querySelector('b');if(b&&/trust/i.test(b.textContent)){const n=d.querySelector('.ht-num');if(n&&!M.replay)n.textContent='100%'}}});
/* ---------------- story effects: what the finale leaves behind (never on a replay) ---------------- */
FN.storyEnd=function(M){const s=SV(),Sv=HT.Save;if(!s)return;s.flags=s.flags||{};s.flags.festival=true;s.flags.finale2=true;s.flags.festivalCard=false;s.flags.festivalDay=s.day|0;
  try{Sv&&Sv.storefront&&Sv.storefront(s,'festival','lights');Sv&&Sv.perk&&Sv.perk(s,'benny',true);Sv&&Sv.household&&Sv.household(s,'festival')}catch(_){}
  try{const H=G();H.prog.trustR=100;H.prog.act=Math.max(H.prog.act||1,3)}catch(_){}try{Sv&&Sv.touch&&Sv.touch('flags','world','perks')}catch(_){}};
/* when the job stops running mid-scene: the overlays go */
FN.offStage=function(){const a=A();FN.cine(false);FN.grade&&FN.grade(false);try{a.setNight(0)}catch(_){}try{a.overlay('fin-credits',null);a.overlay('fin-talk',null)}catch(_){}try{D.body.classList.remove('ow-scoped')}catch(_){}};

/* ---------------- after the finale: free roam with festival bunting on Main St, and one card ---------------- */
const PG={mesh:null,store:{geo:[],mat:[],tex:[]}};
HT.Jobs.on('hud',()=>{const a=A();if(!a||a.mode!=='hub'||!a.L||!a.L.ow)return;const s=SV();if(!s||!s.flags||!s.flags.festival)return;
  if(!PG.mesh){try{PG.mesh=FN.bunting(W.fest.x0-30,W.fest.x1+10,W.fest.z0-.2,W.fest.z1+.2,4.6,true,PG.store);PG.mesh.traverse(o=>{o.castShadow=false})}catch(e){console.error(e);return}}
  if(PG.mesh.parent!==a.L.group)a.L.group.add(PG.mesh);
  if(!s.flags.festivalCard){s.flags.festivalCard=true;try{HT.Save.touch&&HT.Save.touch('flags')}catch(_){}a.HUD.banner({kind:'title',kicker:'High Trust',title:'The end… of the beginning',sub:'Everything is open. Every job is on the fridge calendar. The guys still meet Saturdays.',dur:7})}});
})();
