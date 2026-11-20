/* =====================================================================
   HONEY-DO BLITZ (SPEC3 2.17, giver Hank): the rampage, inverted. Three minutes to fix as much of Riverside as you can.
   Hank (Hank's Hardware, Maple) runs a promotion: whoever fixes the most in three minutes wins a lifetime 10% discount.
   Drive to Ramos Corner Mart, grab the tool belt off Hank's folding table, and go:
     1 Gerald (hammer)  loose pickets on front-garden fences            1.0 s   5 pts
     2 Brush            graffiti tags (painted over, permanently)       2.0 s   8 pts
     3 Bulb pole        dead street lamps (relit, permanently)          1.5 s   8 pts   · a cat up a tree 3.0 s 25 pts
     4 Hand truck       stray shopping carts back to the mart corral     -      12 pts a cart (or load 2-3 in your car)
     any tool           tipped trash cans 0.5 s 3 pts · a kid's flat bike tyre (pump) 2.0 s 10 pts
   Combo: a fix inside 4 s of the last one adds x0.5, x1.0 if it is a different kind of fix (x1 to x5). The window pauses while
   you work. Score attack: 80 counts (bronze), 150 silver and Hank's discount, 250 gold. Under 80 at the whistle fails (retry).
   Trust twist: +0.2 Riverside trust a fix (cap 6 a run, 12 a game week). A Coupon Boys loiterer offers to hold the ladder if
   you've zip-tied fewer than 2 of his crew (+2 trust, faster pole work, no cat scratches, +2 a fix while he's close).
   Permanent world changes: painted-over tags (SAVE.world.scrubbed) and relit lamps (SAVE.jobs.blitz.plan.lamps) stay fixed in
   free roam until the block's own trust tier takes over (HT.OpenWorld.blockTrust only, nothing in openworld.js is touched).
   Leaderboard: the best 5 runs (SAVE.jobs.blitz.plan.board) plus Gary 47, Dave 52 and Doug 212 (disputed).
   Owns js/jobs/blitz.js only. Its own HUD layer (timer, score, combo, markers, tool bar with touch buttons, countdown, tally).
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
const ID='blitz';
const TUNE={time:180,count:3,combo:4,multMax:5,step:.25,variety:.25,swap:.35,hudR:40,zoneR:112,trustFix:.2,trustRun:6,trustWeek:12,
  bronze:80,silver:150,gold:250,discount:150,perPoint:3,helperAt:40,helperPts:2,cartR:4.5,carR:9,buzzer:5};
const CAR_CAP={minivan:2,van:2,pickup:3,workvan:3,suv:2};
const KIND={
  picket:{tool:'hammer',time:1.0,pts:5,name:'Loose picket',verb:'Hammer the picket back',done:'Picket',n:7,col:'#e8a23a'},
  tag:{tool:'brush',time:2.0,pts:7,name:'Graffiti',verb:'Paint over the tag',done:'Tag',n:9,col:'#7fc7ff'},
  lamp:{tool:'pole',time:1.5,pts:7,name:'Dead lamp',verb:'Swap the bulb',done:'Lamp',n:6,col:'#ffe066'},
  can:{tool:null,time:.5,pts:3,name:'Trash can',verb:'Stand the can up',done:'Can',n:6,col:'#b9e07a'},
  cart:{tool:'truck',time:.6,pts:15,name:'Stray cart',verb:'Hitch the cart',done:'Cart',n:5,col:'#9fe58a'},
  cat:{tool:'pole',time:3.0,pts:25,name:'Cat up a tree',verb:'Rescue the cat',done:'Cat',n:1,col:'#ff9f5a'},
  bike:{tool:null,time:2.0,pts:8,name:'Flat tyre',verb:'Pump the tyre',done:'Bike',n:2,col:'#ff7aa8'}};
const TOOLS=[{id:'hammer',key:'1',name:'Gerald',sub:'hammer'},{id:'brush',key:'2',name:'Brush',sub:'paint'},{id:'pole',key:'3',name:'Bulb pole',sub:'telescopic'},{id:'truck',key:'4',name:'Hand truck',sub:'carts'}];
const GHOSTS=[{who:'Gary',s:47},{who:'Dave',s:52},{who:'Doug',s:212,note:'(disputed)'}];
const LINES={
  belt:["Tools are a loan. Bring 'em back. The hammer has a name. It's Gerald.","Three minutes. Every fix counts. Cats count double. Cats count triple if they don't scratch."],
  go:"Clock's running. Go fix my neighbourhood. Well. Their neighbourhood. You know what I mean.",
  combo:["COMBO!","COMBO!!","C-C-C-COMBO!","COMBO! Nobody else says it. I say it."],
  neigh:{picket:["Did he just fix my fence and leave?","My fence! It's standing up straight!","Who hammers that fast? Who IS that?"],
    tag:["Somebody painted over the tag. In MATCHING beige. Almost matching.","Hey! That wall looks like a wall again!","Is that Hank's paint? It's Hank's paint."],
    lamp:["The lamp's back! I can see my car! ...Oh. That's not my car.","Light! On our block! Call your mother!","He fixed it with a STICK."],
    can:["Who's picking up trash at this speed? Is he okay?","He just stood my can up and RAN.","Thank you, sir! ...He's gone."],
    cart:["He's returning carts? On purpose?","Mrs. Ramos is going to cry.","That cart's been there since spring."],
    bike:["Go, sweetie! Wave at the man!","He fixed a bike in two seconds. TWO."],cat:["Mittens! Oh, Mittens, you're a menace.","That's not even my cat. Thank you though."]},
  other:["He's doing a thing for Hank.","It's for Hank's. Some kind of discount thing.","Let him work, Denise."],
  cat:[['Cat','(hiss)'],['you',"I'm helping."],['Cat','(hiss)'],['you',"I'm HELPING."]],
  scratch:["Ow. OW. She scratched Gerald's handle. And my arm.","Cat's safe. My forearm is not."],noScratch:"Not a scratch. Triple cat. Hank's gonna lose it.",
  kid:"My bike's flat.",kidGo:"Not anymore. Go. Be free.",
  loiterAsk:"...You need someone to hold the ladder?",loiterYes:"Always.",loiterNo:"Nah. Not after what you did to my cousin. ...Nice fence, though.",
  loiterHelp:["Got the ladder. I mean, there's no ladder. I got the vibe.","Left a little. LEFT. Okay, good.","My aunt lives on this block, man."],
  ten:"Ten seconds! Grab anything!",time:"TIME! Gerald comes home now.",buzzer:"Buzzer beater!",
  back:"Bring the tools back to Hank.",fpv:"Third person for this one. You'll want to see Gerald work.",
  full:"Hands full. Cart goes back to Ramos' first.",noGun:"Tool belt only. Gerald doesn't do violence."};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const fmtT=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'],TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function words(n){n=Math.max(0,Math.round(n));if(n<20)return ONES[n];if(n<100)return TENS[Math.floor(n/10)]+(n%10?'-'+ONES[n%10]:'');if(n<1000)return ONES[Math.floor(n/100)]+' hundred'+(n%100?' and '+words(n%100):'');return String(n)}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= geometry / materials (merged per material: one draw call per material per prop) ================= */
const GC={},MC={};
function T3(){return A().THREE}
function mat(c,o){o=o||{};const k=c+'|'+(o.r==null?.7:o.r)+'|'+(o.m||0)+'|'+(o.e||'')+'|'+(o.ek||0)+'|'+(o.side||0)+'|'+(o.op||1);if(MC[k])return MC[k];const T=T3();
  const m=new T.MeshStandardMaterial({color:new T.Color(c).convertSRGBToLinear(),roughness:o.r==null?.7:o.r,metalness:o.m||0});
  if(o.e){m.emissive=new T.Color(o.e).convertSRGBToLinear();m.emissiveIntensity=o.ek||1}if(o.side)m.side=T.DoubleSide;if(o.op<1){m.transparent=true;m.opacity=o.op}return MC[k]=m}
function glowMat(c,k){const key='glow|'+c+'|'+k;if(MC[key])return MC[key];const T=T3();return MC[key]=new T.MeshBasicMaterial({color:new T.Color(c).convertSRGBToLinear().multiplyScalar(k||2),toneMapped:false})}
function ubox(){return GC.box||(GC.box=new(T3().BoxGeometry)(1,1,1))}
function ucyl(seg,t){const k='cyl'+seg+'|'+(t||1);return GC[k]||(GC[k]=new(T3().CylinderGeometry)(t||1,1,1,seg||10))}
function usph(w,h){const k='sph'+w+'|'+h;return GC[k]||(GC[k]=new(T3().SphereGeometry)(1,w||10,h||8))}
function merge(list){const T=T3();let n=0;for(const g of list)n+=g.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3),U=new Float32Array(n*2);let o=0;
  for(const g of list){const p=g.attributes.position,nm=g.attributes.normal,uv=g.attributes.uv;P.set(p.array,o*3);if(nm)N.set(nm.array,o*3);if(uv)U.set(uv.array,o*2);o+=p.count;g.dispose()}
  const G=new T.BufferGeometry();G.setAttribute('position',new T.BufferAttribute(P,3));G.setAttribute('normal',new T.BufferAttribute(N,3));G.setAttribute('uv',new T.BufferAttribute(U,2));G.computeBoundingSphere();return G}
function parts(){const T=T3(),by=new Map(),_m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_s=new T.Vector3();
  const add=(geo,m,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,q)=>{const g=geo.index?geo.toNonIndexed():geo.clone();if(q)_q.copy(q);else _q.setFromEuler(_e.set(rx,ry,rz));_m.compose(_p.set(x,y,z),_q,_s.set(sx,sy,sz));g.applyMatrix4(_m);
    let l=by.get(m);if(!l)by.set(m,l=[]);l.push(g)};
  const P={add,
    box:(w,h,d,m,x,y,z,rx,ry,rz)=>add(ubox(),m,x,y,z,rx,ry,rz,w,h,d),
    cyl:(r,h,m,x,y,z,rx,ry,rz,seg,taper)=>add(ucyl(seg||10,taper),m,x,y,z,rx,ry,rz,r,h,r),
    sph:(sx,sy,sz,m,x,y,z,rx,ry,rz)=>add(usph(10,8),m,x,y,z,rx,ry,rz,sx,sy,sz),
    tube:(a,b,r,m,seg)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],L=Math.hypot(dx,dy,dz)||1e-4;const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(dx/L,dy/L,dz/L));
      add(ucyl(seg||8),m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,0,0,0,r,L,r,q)},
    build(o){o=o||{};const grp=new T.Group();for(const[m,l]of by){const mesh=new T.Mesh(merge(l),m);mesh.castShadow=o.shadow!==false;mesh.receiveShadow=true;grp.add(mesh)}by.clear();return grp}};
  return P}
function canvasTex(w,h,draw){const T=T3(),c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t}

/* ================= props ================= */
/* front-garden picket fence (local X along the fence, +Z toward the street), planter of flowers behind it, one loose picket */
const LOOSE_I=5,CAT_Y=2.3;
function fenceModel(){const T=T3(),root=new T.Group(),paint=mat('#efe9dc',{r:.78}),worn=mat('#d8d0bf',{r:.85}),wood=mat('#6b4a2e',{r:.9}),soil=mat('#3a2a1c',{r:1}),stem=mat('#4f7a35',{r:.85});
  const b=parts();
  for(const s of[-1,1]){b.box(.085,.95,.085,paint,s*.9,.475,0);b.box(.11,.035,.11,paint,s*.9,.965,0);b.box(.06,.06,.06,paint,s*.9,1.005,0,0,Math.PI/4,0)}
  b.box(1.76,.06,.032,paint,0,.3,-.035);b.box(1.76,.06,.032,paint,0,.7,-.035);
  for(let i=0;i<9;i++){if(i===LOOSE_I)continue;const x=-.8+i*.2;b.box(.088,.8,.024,i%3?paint:worn,x,.44,0);b.box(.063,.063,.024,i%3?paint:worn,x,.84,0,0,0,Math.PI/4)}
  b.box(1.66,.3,.38,wood,0,.15,-.33);b.box(1.58,.025,.31,soil,0,.3,-.33);b.box(1.7,.04,.42,wood,0,.31,-.33);
  root.add(b.build());
  /* the loose picket hangs off one nail at the top rail */
  const lp=new T.Group();lp.position.set(-.8+LOOSE_I*.2,.71,.016);const pb=parts();pb.box(.088,.8,.024,worn,0,-.27,0);pb.box(.063,.063,.024,worn,0,.13,0,0,0,Math.PI/4);
  pb.cyl(.006,.03,mat('#8c8f93',{r:.4,m:.8}),0,0,.02,Math.PI/2,0,0,6);lp.add(pb.build());root.add(lp);
  /* flowers: droopy and dull before, perky after */
  const fl=new T.Group();fl.position.set(0,.3,-.33);const cols=['#e8395b','#ffd23f','#c58cff','#ff8c2a','#f4f4f4','#ff6fa8'];const fb=parts();
  for(let k=0;k<9;k++){const x=-.72+k*.18,h=.16+((k*7)%3)*.05;fb.cyl(.008,h,stem,x,h/2,(k%2?.07:-.06),0,0,0,5);fb.sph(.045,.03,.045,mat(cols[k%cols.length],{r:.6}),x,h+.01,(k%2?.07:-.06));
    fb.sph(.04,.012,.025,stem,x+.03,h*.55,(k%2?.07:-.06),0,0,.6)}
  fl.add(fb.build({shadow:false}));root.add(fl);
  root.userData={loose:lp,flowers:fl};return root}
function fenceState(m,t){/* t: 0 broken .. 1 fixed */const u=m.userData;u.loose.rotation.z=.72*(1-t);u.loose.position.y=.71-.06*(1-t);
  u.flowers.scale.set(1,.5+.5*t,1);u.flowers.rotation.z=(1-t)*.12}
/* round residential trash can: tipped (lid off, litter out) or upright */
function canModel(){const T=T3(),root=new T.Group(),grn=mat('#3f5a49',{r:.55,m:.15}),grd=mat('#2c4235',{r:.55,m:.15}),paper=mat('#e9e6dc',{r:.95}),bag=mat('#17181a',{r:.35}),red=mat('#c8322b',{r:.4,m:.5});
  const body=new T.Group();const b=parts();b.cyl(.27,.7,grn,0,.35,0,0,0,0,18,1.12);b.cyl(.305,.04,grd,0,.69,0,0,0,0,18);b.cyl(.255,.03,grd,0,.25,0,0,0,0,18);b.cyl(.27,.03,grd,0,.48,0,0,0,0,18);
  for(const s of[-1,1])b.box(.05,.04,.12,grd,s*.31,.6,0);body.add(b.build());root.add(body);
  const lid=new T.Group();const lb=parts();lb.cyl(.31,.035,grd,0,0,0,0,0,0,18);lb.cyl(.24,.03,grn,0,.03,0,0,0,0,18);lb.box(.14,.035,.035,grd,0,.065,0);lid.add(lb.build());root.add(lid);
  const lit=new T.Group();const tb=parts();for(let k=0;k<4;k++)tb.add(new T.IcosahedronGeometry(1,0),paper,(k-1.5)*.18,.05,.85+(k%2)*.22,k,k*2,0,.065,.055,.06);
  tb.cyl(.033,.12,red,.25,.035,1.15,Math.PI/2,0,.7,10);tb.sph(.22,.13,.28,bag,-.26,.12,1.05,0,.4,0);tb.box(.12,.004,.09,paper,.05,.004,1.32,0,.5,0);lit.add(tb.build());root.add(lit);
  root.userData={body,lid,lit};return root}
function canState(m,t){const u=m.userData,e=t<1?Math.min(1,t):1;/* ease with a small overshoot */const k=t>=1?1:1-Math.pow(1-e,3)*(1+Math.sin(e*9)*.15);
  u.body.rotation.x=Math.PI/2*(1-k);u.body.position.set(0,.27*(1-k),0);
  u.lid.position.set(.55*(1-k),.02+(.72)*k,.85*(1-k));u.lid.rotation.set((1-k)*.15,0,(1-k)*.3);
  u.lit.visible=t<.55;u.lit.scale.setScalar(Math.max(.01,1-t*1.7))}
/* shopping cart (local Z along the cart, handle at -Z) */
function cartModel(){const T=T3(),root=new T.Group(),met=mat('#c4cace',{r:.32,m:.85}),dark=mat('#2a2c30',{r:.6}),red=mat('#c8322b',{r:.45}),b=parts();
  const y0=.44,y1=.96,zb=-.42,zf=.44,wb=.27,wf=.23;const W=z=>wb+(wf-wb)*(z-zb)/(zf-zb);
  for(const y of[y0,y1]){b.tube([-W(zb),y,zb],[-W(zf),y,zf],.011,met,6);b.tube([W(zb),y,zb],[W(zf),y,zf],.011,met,6);b.tube([-W(zb),y,zb],[W(zb),y,zb],.011,met,6);b.tube([-W(zf),y,zf],[W(zf),y,zf],.011,met,6)}
  for(let z=zb;z<=zf+.001;z+=.087)for(const s of[-1,1])b.tube([s*W(z),y0,z],[s*W(z),y1,z],.005,met,4);
  for(let x=-wb;x<=wb+.001;x+=.09)b.tube([x,y0,zb],[x,y1,zb],.005,met,4);for(let x=-wf;x<=wf+.001;x+=.077)b.tube([x,y0,zf],[x,y1,zf],.005,met,4);
  for(const y of[.62,.79])for(const s of[-1,1])b.tube([s*W(zb),y,zb],[s*W(zf),y,zf],.005,met,4);
  for(let z=zb;z<=zf;z+=.09)b.tube([-W(z),y0,z],[W(z),y0,z],.005,met,4);
  for(const s of[-1,1]){b.tube([s*W(zb),y0,zb],[s*.25,.09,-.36],.013,met,6);b.tube([s*W(zf),y0,zf],[s*.2,.09,.4],.013,met,6);b.tube([s*.25,.12,-.36],[s*.2,.12,.4],.012,met,6)}
  for(let z=-.3;z<=.35;z+=.1)b.tube([-.23,.17,z],[.23,.17,z],.005,met,4);
  for(const[x,z]of[[-.25,-.36],[.25,-.36],[-.2,.4],[.2,.4]]){b.cyl(.055,.032,dark,x,.055,z,0,0,Math.PI/2,12);b.box(.03,.06,.03,met,x,.11,z)}
  b.tube([-W(zb),y1,zb],[-W(zb)*1.04,1.02,zb-.08],.012,met,6);b.tube([W(zb),y1,zb],[W(zb)*1.04,1.02,zb-.08],.012,met,6);b.cyl(.022,.6,red,0,1.02,zb-.08,0,0,Math.PI/2,10);
  b.box(.42,.012,.2,red,0,.98,zb+.1,-.35,0,0);root.add(b.build());return root}
/* corral: galvanised U rails and a sign */
function corralModel(){const T=T3(),root=new T.Group(),galv=mat('#9aa3a8',{r:.35,m:.8}),b=parts();
  for(const s of[-1,1]){b.tube([-1.3,.55,s*.55],[1.3,.55,s*.55],.03,galv);b.tube([-1.3,.95,s*.55],[1.3,.95,s*.55],.03,galv);for(const x of[-1.3,0,1.3])b.tube([x,0,s*.55],[x,.97,s*.55],.03,galv)}
  b.tube([-1.3,.95,-.55],[-1.3,.95,.55],.03,galv);b.tube([-1.3,.55,-.55],[-1.3,.55,.55],.03,galv);b.cyl(.04,1.7,galv,-1.42,.85,0,0,0,0,8);root.add(b.build());
  const tex=canvasTex(512,256,(g,w,h)=>{g.fillStyle='#1f5f3a';g.fillRect(0,0,w,h);g.strokeStyle='#f6f1e3';g.lineWidth=10;g.strokeRect(10,10,w-20,h-20);g.fillStyle='#f6f1e3';g.textAlign='center';
    g.font='900 74px "Barlow Condensed","Arial Narrow",sans-serif';g.fillText('CART RETURN',w/2,110);g.font='700 38px "Barlow Condensed","Arial Narrow",sans-serif';g.fillStyle='#ffd23f';g.fillText('RAMOS CORNER MART · GRACIAS',w/2,175)});
  const sg=new T.Mesh(new T.PlaneGeometry(.8,.4),new T.MeshStandardMaterial({map:tex,roughness:.6,side:T.DoubleSide}));sg.position.set(-1.42,1.55,0);sg.rotation.y=Math.PI/2;root.add(sg);return root}
/* orange tabby; a bark stub to sit on */
function catModel(){const T=T3(),root=new T.Group(),fur=mat('#e0893a',{r:.92}),furD=mat('#a9561f',{r:.92}),wh=mat('#f3ebde',{r:.9}),pink=mat('#e7979e',{r:.6}),eye=glowMat('#b6f26a',1.6),b=parts();
  b.sph(.12,.115,.2,fur,0,.14,0);b.sph(.075,.08,.06,wh,0,.13,.15);b.sph(.088,.085,.09,fur,0,.27,.19);b.sph(.045,.032,.035,wh,0,.24,.265);b.sph(.012,.009,.008,pink,0,.258,.296);
  for(const s of[-1,1]){b.add(new T.ConeGeometry(1,1,4),fur,s*.048,.355,.18,0,s*.4,-s*.25,.03,.07,.022);b.sph(.014,.016,.006,eye,s*.032,.282,.272);
    b.cyl(.022,.13,fur,s*.06,.06,.1,0,0,0,6);b.cyl(.022,.13,fur,s*.065,.06,-.11,0,0,0,6);b.sph(.025,.015,.032,wh,s*.06,.005,.12);b.sph(.025,.015,.032,wh,s*.065,.005,-.09)}
  for(let k=0;k<4;k++)b.box(.2,.012,.025,furD,0,.245-k*.01,-.12+k*.07,0,0,0);
  const pts=[[0,.15,-.18],[0,.12,-.32],[.05,.2,-.42],[.06,.33,-.4],[.03,.38,-.33]];for(let i=0;i<pts.length-1;i++)b.tube(pts[i],pts[i+1],.022-i*.002,i%2?furD:fur,6);
  root.add(b.build());return root}
function branchModel(len){const T=T3(),root=new T.Group(),bark=mat('#5b4733',{r:.95}),leaf=mat('#4d7a34',{r:.85}),b=parts();b.add(ucyl(7,.55),bark,len/2,0,0,0,0,Math.PI/2,.07,len,.07);
  b.add(ucyl(6,.5),bark,len*.7,.12,.1,.6,0,Math.PI/2-.5,.03,.5,.03);for(let k=0;k<6;k++)b.add(new T.IcosahedronGeometry(1,0),leaf,len*(.55+k*.08),.15+(k%2)*.1,(k%3-1)*.15,k,k,0,.16,.12,.16);
  root.add(b.build());return root}
/* a kid's bike (local Z along the bike), front tyre can go flat */
function bikeModel(col){const T=T3(),root=new T.Group(),frame=mat(col||'#e2493c',{r:.35,m:.35}),tyre=mat('#151517',{r:.8}),rim=mat('#c9cdd1',{r:.3,m:.85}),seat=mat('#1d1d20',{r:.6}),grip=mat('#ff8ec0',{r:.6}),b=parts(),R=.21;
  const rear=new T.Group(),front=new T.Group();for(const[g,z]of[[rear,-.38],[front,.38]]){const w=parts();w.add(new T.TorusGeometry(R,.034,8,26),tyre,0,0,0,0,Math.PI/2,0);w.add(new T.TorusGeometry(R-.04,.008,6,24),rim,0,0,0,0,Math.PI/2,0);
    for(let k=0;k<8;k++){const a=k*Math.PI/8;w.box(.006,(R-.04)*2,.006,rim,0,0,0,a,0,0)}w.cyl(.025,.05,rim,0,0,0,0,0,Math.PI/2,8);g.add(w.build());g.position.set(0,R+.035,z);root.add(g)}
  const H=R+.035,P_=(x,y,z)=>[x,y,z];
  b.tube(P_(0,H,-.38),P_(0,.3,-.02),.017,frame);b.tube(P_(0,H,-.38),P_(0,.6,-.14),.015,frame);b.tube(P_(0,.3,-.02),P_(0,.62,-.14),.02,frame);b.tube(P_(0,.62,-.14),P_(0,.62,.27),.02,frame);
  b.tube(P_(0,.3,-.02),P_(0,.6,.29),.022,frame);b.tube(P_(0,.56,.29),P_(0,H,.38),.016,frame);b.tube(P_(0,.56,.29),P_(0,.76,.26),.016,frame);
  b.box(.1,.04,.2,seat,0,.68,-.16);b.tube(P_(0,.62,-.14),P_(0,.67,-.16),.012,rim);b.tube(P_(-.22,.77,.24),P_(.22,.77,.24),.011,rim);for(const s of[-1,1]){b.cyl(.017,.08,grip,s*.25,.77,.24,0,0,Math.PI/2,8);b.box(.01,.12,.02,grip,s*.29,.71,.24);b.box(.01,.1,.02,mat('#ffffff',{r:.6}),s*.29,.72,.25)}
  b.cyl(.05,.02,rim,.03,.3,-.02,0,0,Math.PI/2,10);b.tube(P_(.03,.3,-.02),P_(.06,.12,.05),.01,rim);b.box(.08,.015,.03,seat,.08,.12,.05);
  root.add(b.build());root.userData={front,rear};return root}
function bikeState(m,t){const f=m.userData.front;f.scale.set(1,.72+.28*t,1);f.position.y=.245-.06*(1-t);m.rotation.z=(1-t)*.07}
/* tools, held in the hand: +Z forward, grip at the origin */
function toolModel(id){const T=T3(),g=new T.Group(),b=parts(),wood=mat('#a8743f',{r:.6}),steel=mat('#5e6369',{r:.3,m:.9}),rub=mat('#1e2228',{r:.7}),alu=mat('#c9ced3',{r:.3,m:.85});
  if(id==='hammer'){b.cyl(.017,.34,wood,0,.09,0,0,0,0,8);b.cyl(.021,.11,rub,0,-.02,0,0,0,0,8);b.box(.036,.036,.11,steel,0,.25,.03);b.cyl(.024,.03,steel,0,.25,.095,Math.PI/2,0,0,10);
    b.box(.03,.02,.07,steel,0,.255,-.045,-.4,0,0);b.box(.03,.004,.06,mat('#ffd23f',{r:.5}),0,.13,.019,0,0,0)}
  else if(id==='brush'){b.cyl(.015,.17,wood,0,.06,0,0,0,0,8);b.box(.1,.035,.03,mat('#c9a35a',{r:.4,m:.7}),0,.16,0);b.box(.095,.07,.026,mat('#3d3326',{r:.9}),0,.21,0);b.box(.095,.025,.027,mat('#ece2c8',{r:.6}),0,.25,0)}
  else if(id==='pole'){b.cyl(.014,1.25,alu,0,.38,0,0,0,0,8);b.cyl(.019,.25,mat('#2f6b3f',{r:.6}),0,-.05,0,0,0,0,8);b.cyl(.04,.05,mat('#ffd23f',{r:.5}),0,1.02,0,0,0,0,10);
    for(let k=0;k<4;k++){const a=k*Math.PI/2;b.tube([Math.cos(a)*.03,1.03,Math.sin(a)*.03],[Math.cos(a)*.055,1.12,Math.sin(a)*.055],.004,alu,4)}b.sph(.045,.055,.045,mat('#fff6d8',{r:.2,e:'#fff1c0',ek:.4}),0,1.12,0)}
  g.add(b.build({shadow:false}));return g}
function truckModel(){const T=T3(),g=new T.Group(),b=parts(),red=mat('#c0392b',{r:.45,m:.3}),tyre=mat('#151517',{r:.8}),steel=mat('#7c8288',{r:.35,m:.8});
  for(const s of[-1,1]){b.tube([s*.2,.04,0],[s*.2,1.15,-.2],.016,red);b.cyl(.12,.07,tyre,s*.26,.12,-.07,0,0,Math.PI/2,14);b.cyl(.05,.08,steel,s*.26,.12,-.07,0,0,Math.PI/2,10)}
  for(const y of[.35,.7,1.0])b.tube([-.2,y,-.06*y/.35*.7],[.2,y,-.06*y/.35*.7],.012,red);b.box(.44,.012,.2,steel,0,.012,.08);b.tube([-.2,1.15,-.2],[.2,1.15,-.2],.016,mat('#1e2228',{r:.7}));
  g.add(b.build());return g}
/* Hank's folding table with the tool belt, a bucket of brushes, bulbs */
function tableModel(){const T=T3(),root=new T.Group(),top=mat('#f2f0ea',{r:.6}),leg=mat('#8a9096',{r:.4,m:.7}),b=parts();b.box(1.6,.04,.7,top,0,.74,0);
  for(const[x,z]of[[-.72,-.28],[.72,-.28],[-.72,.28],[.72,.28]])b.cyl(.015,.74,leg,x,.37,z,0,0,0,6);b.cyl(.13,.25,mat('#d8d8d0',{r:.5,m:.2}),.55,.88,.05,0,0,0,14);
  for(let k=0;k<3;k++)b.box(.025,.22,.025,mat('#a8743f',{r:.6}),.5+k*.05,1.0,.05);b.box(.3,.16,.22,mat('#e3d2a8',{r:.85}),-.5,.84,-.1);
  for(let k=0;k<4;k++)b.sph(.04,.05,.04,mat('#fff6d8',{r:.2}),-.6+k*.07,.95,-.1);root.add(b.build());
  const belt=new T.Group(),bb=parts(),lea=mat('#7a4f2a',{r:.75});bb.add(new T.TorusGeometry(.2,.03,6,20),lea,0,.79,0,Math.PI/2,0,0,1,1,.6);
  for(const x of[-.15,.15])bb.box(.12,.14,.06,lea,x,.83,.12);bb.box(.05,.05,.02,mat('#c9a35a',{r:.3,m:.8}),0,.8,.2);belt.add(bb.build());belt.add(Object.assign(toolModel('hammer'),{}));
  belt.children[1].position.set(.12,.79,.02);belt.children[1].rotation.set(Math.PI/2,0,.4);root.add(belt);root.userData={belt};return root}
/* Hank's A-frame sandwich board */
function boardModel(){const T=T3(),root=new T.Group(),wood=mat('#7a5a3a',{r:.85});const tex=canvasTex(256,320,(g,w,h)=>{g.fillStyle='#1d2a24';g.fillRect(0,0,w,h);g.strokeStyle='#c9a35a';g.lineWidth=10;g.strokeRect(5,5,w-10,h-10);
    g.textAlign='center';g.fillStyle='#ffd23f';g.font='900 40px "Barlow Condensed","Arial Narrow",sans-serif';g.fillText("HANK'S",w/2,58);g.fillStyle='#f6f1e3';g.font='900 54px "Barlow Condensed","Arial Narrow",sans-serif';g.fillText('HONEY-DO',w/2,120);g.fillText('BLITZ',w/2,172);
    g.font='700 30px "Barlow Condensed","Arial Narrow",sans-serif';g.fillStyle='#9fe58a';g.fillText('3 MINUTES',w/2,222);g.fillStyle='#f6f1e3';g.fillText('BEAT 150 =',w/2,262);g.fillText('10% FOR LIFE',w/2,296)});
  const face=new T.MeshStandardMaterial({map:tex,roughness:.9});for(const s of[-1,1]){const g=new T.Group();g.rotation.x=s*.2;root.add(g);const b=parts();b.box(.62,.84,.03,wood,0,.46,0);g.add(b.build());
    const p=new T.Mesh(new T.PlaneGeometry(.54,.72),face);p.position.set(0,.47,s*.017);if(s<0)p.rotation.y=Math.PI;g.add(p);g.position.z=s*.13}return root}
/* the painted-over patch for a tag: fresh off-white roller paint, slightly mismatched, soft edges */
let PATCH_TEX=null;
function patchTex(){if(PATCH_TEX)return PATCH_TEX;PATCH_TEX=canvasTex(256,128,(g,w,h)=>{const grd=g.createLinearGradient(0,0,w,0);grd.addColorStop(0,'#f4f1ea');grd.addColorStop(1,'#e6e2da');g.fillStyle=grd;g.fillRect(6,6,w-12,h-12);
  for(let k=0;k<28;k++){g.fillStyle='rgba(255,255,255,'+(.05+Math.random()*.07)+')';g.fillRect(6+k*8.6,6,5,h-12)}for(let k=0;k<14;k++){g.fillStyle='rgba(150,135,110,.06)';g.fillRect(6,8+Math.random()*(h-16),w-12,2)}
  const id=g.getImageData(0,0,w,h),d=id.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const e=Math.min(x,y,w-1-x,h-1-y);const a=clamp((e-2)/9,0,1)*(.92+Math.random()*.08);d[(y*w+x)*4+3]*=a}g.putImageData(id,0,0)});return PATCH_TEX}
/* buff paint close to the wall it's on (brick red on the rowhouses, stucco beige on the shops, grey on the warehouses): "almost matching" */
const PATCH_COL={r:'#9b5a48',A:'#d3c8b4',x:'#a7aaa5',z:'#c2bcae'};
function patchMat(kind){const k='patch|'+kind;if(MC[k])return MC[k];const T=T3();return MC[k]=new T.MeshStandardMaterial({map:patchTex(),color:new T.Color(PATCH_COL[kind]||'#d3c8b4').convertSRGBToLinear().multiplyScalar(1.12),transparent:true,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-8,side:T.DoubleSide})}
function patchMesh(t){const T=T3(),m=new T.Mesh(new T.PlaneGeometry(1,1),patchMat(t.kind));
  const fx=t.face[0],fz=t.face[1],off=(t.kind==='z'?.04:0)+.025;m.position.set(t.x+fx*off,t.y,t.z+fz*off);m.rotation.y=Math.atan2(fx,fz);m.renderOrder=4;m.userData.w=t.w*1.18+.1;m.userData.h=t.h*1.25+.08;m.scale.set(m.userData.w,m.userData.h,1);return m}
/* a relit lamp head: warm lens and a soft halo where the tilted head of a broken world lamp sits */
let HALO_TEX=null;
function haloTex(){return HALO_TEX||(HALO_TEX=canvasTex(128,128,(g,w,h)=>{const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,236,190,.95)');r.addColorStop(.25,'rgba(255,214,140,.45)');r.addColorStop(1,'rgba(255,200,120,0)');g.fillStyle=r;g.fillRect(0,0,w,h)}))}
function lampGlow(p){const T=T3(),g=new T.Group();const lens=new T.Mesh(new T.CircleGeometry(.5,14),glowMat('#ffe7b0',3));lens.scale.set(.25,.52,1);lens.rotation.x=Math.PI/2;g.add(lens);
  const sp=new T.Sprite(new T.SpriteMaterial({map:haloTex(),color:0xffffff,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));sp.scale.set(1.5,1.5,1);sp.position.y=-.12;sp.material.opacity=.8;g.add(sp);
  g.position.set(p.x,p.y-.02,p.z);g.rotation.y=p.ang;return g}

/* ================= world lookups ================= */
let ROADG=null,ROADW=null;
function isRoad(W,x,z){if(ROADW!==W){ROADW=W;ROADG=new Uint8Array(W.W*W.H);for(const r of W.roads){if(r.o==='h'){for(let zz=r.k;zz<=r.k+2;zz++)for(let xx=r.a;xx<=r.b;xx++)if(zz>=0&&zz<W.H)ROADG[zz*W.W+xx]=1}else for(let zz=r.a;zz<=r.b;zz++)for(let xx=r.k;xx<=r.k+2;xx++)if(zz>=0&&zz<W.H)ROADG[zz*W.W+xx]=1}}
  if(x<0||z<0||x>=W.W||z>=W.H)return false;return !!ROADG[z*W.W+x]||W.map[z][x]==='='}
const tc=i=>i*2+1,tx=v=>Math.floor(v/2);
const ch=(W,x,z)=>(z>=0&&z<W.H&&x>=0&&x<W.W)?W.map[z][x]:'#';
/* the lamp head of a world lamp (mirrors openworld's lampDir + tilt so the glow sits where the tilted head is) */
function lampHead(W,l,broken){let dir=[0,1];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])if(isRoad(W,l.tx+dx,l.tz+dz)){dir=[dx,dz];break}
  const ang=Math.atan2(dir[0],dir[1]);let along=1.98,y=7.62;if(broken){const a=-.22,c=Math.cos(a),s=Math.sin(a);const na=along*c-y*s,ny=along*s+y*c;along=na;y=ny}
  return{x:l.x+dir[0]*along,y,z:l.z+dir[1]*along,ang:broken?ang:ang,dir}}
const bt=(x,z)=>{const O=window.HT&&HT.OpenWorld;try{return O&&O.blockTrust?O.blockTrust(x,z):0}catch(_){return 0}};
function hub(){const a=A();return a&&a.WORLD&&a.WORLD.places&&a.WORLD.places.mart?a.WORLD:null}
/* the mart: sidewalk spots in front of Ramos Corner Mart (tiles 182-186 x 16-18, sidewalk row 19) */
function spots(W){const m=W.places.mart;return{mart:{x:m.x,z:m.z},hank:{x:m.x+3.6,z:39.25},table:{x:m.x+1.6,z:38.9},corral:{x:m.x-6.5,z:41.25},truck:{x:m.x+9.2,z:41.7}}}

/* ================= save helpers ================= */
const SV=()=>{const a=A();return a&&a.SV?a.SV():null};
function plan(s){s=s||SV();if(!s||!window.HT.Save||!HT.Save.jobRec)return{board:[],lamps:[],week:{w:-1,g:0}};const r=HT.Save.jobRec(s,ID);
  if(!r.plan||typeof r.plan!=='object')r.plan={};const p=r.plan;if(!Array.isArray(p.board))p.board=[];if(!Array.isArray(p.lamps))p.lamps=[];if(!p.week||typeof p.week!=='object')p.week={w:-1,g:0};return p}
const scrubbed=s=>{s=s||SV();return s&&s.world&&Array.isArray(s.world.scrubbed)?s.world.scrubbed:[]};
const weekOf=s=>Math.floor(((s&&s.day)||1)-1)/7|0;

/* walkable tiles reachable on foot from the mart (so nothing is marked behind a wall); also the scripted player's path finder */
function bfs(W,from,maxD){const a=A(),Wd=W.W,H=W.H,dist=new Int32Array(Wd*H).fill(-1),q=[];const s0=from.tz*Wd+from.tx;dist[s0]=0;q.push(s0);
  for(let h=0;h<q.length;h++){const i=q[h],x=i%Wd,z=(i/Wd)|0,d=dist[i];if(d>=maxD)continue;for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Z=z+dz;if(X<1||Z<1||X>=Wd-1||Z>=H-1)continue;const j=Z*Wd+X;if(dist[j]>=0||!a.walkable(X,Z))continue;dist[j]=d+1;q.push(j)}}
  return dist}
function reachTile(W,dist,x,z){const X=tx(x),Z=tx(z);for(let r=0;r<=1;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const i=(Z+dz)*W.W+X+dx;if(i>=0&&dist[i]>=0)return true}return false}

/* ================= scenario: what's broken this run (seeded, so a checkpoint retry gets the same street) ================= */
function generate(seed){const a=A(),W=a.WORLD,S=spots(W),R=rng(seed),s=SV(),sc=new Set(scrubbed(s)),pl=plan(s),fixedL=new Set(pl.lamps);
  const cx=S.mart.x,cz=S.mart.z,RAD=TUNE.zoneR,used=[];const far=(x,z,d)=>used.every(u=>Math.hypot(u.x-x,u.z-z)>=d);const inZ=(x,z,lo)=>{const d=Math.hypot(x-cx,z-cz);return d<RAD&&d>=(lo||0)};
  const shuffle=l=>{for(let i=l.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[l[i],l[j]]=[l[j],l[i]]}return l};const out=[];let n=0;
  const push=(kind,o)=>{const f=Object.assign({id:kind+(n++),kind,done:false},o);out.push(f);used.push({x:f.x,z:f.z});return f};
  const avoid=[S.hank,S.table,S.corral,S.truck,{x:cx,z:cz}];for(const p of avoid)used.push(p);
  const dist=bfs(W,{tx:tx(S.hank.x),tz:tx(S.hank.z)},Math.ceil(RAD*.9));const ok=(x,z)=>reachTile(W,dist,x,z);const push0=push;
  const pushR=(kind,o)=>{const x=o.sx!=null?o.sx:o.x,z=o.sz!=null?o.sz:o.z;if(!ok(x,z))return null;return push0(kind,o)};
  /* graffiti still showing on its block, not painted over before */
  const tags=shuffle(W.tags.filter(t=>t.tx>=153&&inZ(t.x,t.z,8)&&!sc.has(t.id)&&bt(t.x,t.z)<t.clearAt&&a.walkable(tx(t.x+t.face[0]*1.2),tx(t.z+t.face[1]*1.2))));
  for(const t of tags){if(out.filter(f=>f.kind==='tag').length>=KIND.tag.n)break;if(!far(t.x,t.z,6))continue;pushR('tag',{x:t.x,z:t.z,sx:t.x+t.face[0]*1.1,sz:t.z+t.face[1]*1.1,r:2.6,tag:t})}
  const lamps=shuffle(W.lamps.filter(l=>l.hood==='river'&&inZ(l.x,l.z,8)&&l.brokenUntil>bt(l.x,l.z)&&!fixedL.has(l.tx+','+l.tz)));
  for(const l of lamps){if(out.filter(f=>f.kind==='lamp').length>=KIND.lamp.n)break;if(!far(l.x,l.z,8))continue;const h=lampHead(W,l,true);pushR('lamp',{x:l.x,z:l.z,r:2.6,lamp:l,head:h})}
  /* fences against rowhouse fronts, away from stoops and lamps */
  const fc=[],cc=[],kc=[];
  for(let z=1;z<W.H-1;z++)for(let x=153;x<W.W-1;x++){if(ch(W,x,z)!=='s')continue;const X=tc(x),Z=tc(z);if(!inZ(X,Z,10))continue;
    let near8='';for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)near8+=ch(W,x+dx,z+dz);
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const c=ch(W,x+dx,z+dz);
      if(c==='r'&&!/[pl]/.test(near8))fc.push({x:X+dx*.42,z:Z+dz*.42,yaw:Math.atan2(-dx,-dz),R:R()});
      if(isRoad(W,x+dx,z+dz)&&!/[pl]/.test(near8)&&!isRoad(W,x-dx,z-dz))cc.push({x:X+dx*.45,z:Z+dz*.45,yaw:Math.atan2(dx,dz)+(R()-.5)*.8,R:R()})}
    if(inZ(X,Z,26))kc.push({x:X,z:Z,R:R()})}
  for(let z=1;z<W.H-1;z++)for(let x=153;x<W.W-1;x++){if(ch(W,x,z)!==','||isRoad(W,x,z))continue;const X=tc(x),Z=tc(z);if(inZ(X,Z,26))kc.push({x:X,z:Z,R:R()})}
  const deficit=Math.max(0,KIND.tag.n+KIND.lamp.n-out.length);const nP=KIND.picket.n+Math.ceil(deficit*.6),nC=KIND.can.n+Math.floor(deficit*.4);
  /* cluster the small stuff around the tags and lamps: little "honey-do streets" where a combo can run, with long gaps between them */
  const nearOut=c=>{let b=1e9;for(const f of out)b=Math.min(b,Math.hypot(f.x-c.x,f.z-c.z));return b};const cl=c=>{const d=nearOut(c);return(d<14?0:d<30?.5:1)+c.R*.9};
  for(const c of fc.sort((p,q)=>cl(p)-cl(q))){if(out.filter(f=>f.kind==='picket').length>=nP)break;if(!far(c.x,c.z,6))continue;pushR('picket',{x:c.x,z:c.z,yaw:c.yaw,r:2.1})}
  for(const c of cc.sort((p,q)=>cl(p)-cl(q))){if(out.filter(f=>f.kind==='can').length>=nC)break;if(!far(c.x,c.z,6))continue;pushR('can',{x:c.x,z:c.z,yaw:c.yaw,r:2.0})}
  for(const c of kc.sort((p,q)=>p.R-q.R)){if(out.filter(f=>f.kind==='cart').length>=KIND.cart.n)break;if(!far(c.x,c.z,12))continue;pushR('cart',{x:c.x+(R()-.5),z:c.z+(R()-.5),yaw:R()*6.28,r:2.0})}
  /* the cat: a Riverside tree 30-95 m out */
  const tr=shuffle(W.trees.filter(t=>t.tx>=153&&inZ(t.x,t.z,30)&&Math.hypot(t.x-cx,t.z-cz)<95&&a.walkable(t.tx+1,t.tz)));
  for(const t of tr){if(!far(t.x,t.z,6)||!ok(t.x+1.6,t.z)&&!ok(t.x-1.6,t.z))continue;const ang=ok(t.x+1.6,t.z)?0:Math.PI;push('cat',{x:t.x,z:t.z,r:2.8,tree:{x:t.x,z:t.z},ang});break}
  /* kids with flat tyres by the stoops */
  const po=shuffle(W.porches.filter(p=>p.tx>=153&&inZ(p.x,p.z,18)));
  for(const p of po){if(out.filter(f=>f.kind==='bike').length>=KIND.bike.n)break;const bx=p.x+p.face[0]*1.6+(p.face[1]?1.1:0),bz=p.z+p.face[1]*1.6+(p.face[0]?1.1:0);if(!far(bx,bz,14))continue;
    pushR('bike',{x:bx,z:bz,r:2.2,porch:p,yaw:Math.atan2(p.face[1]?1:0,p.face[0]?1:0),col:pick(['#e2493c','#2fa3a0','#7d5cd6','#f08a2c'])})}
  return out}

/* ================= HUD layer (DOM): clock, score, combo, markers, tool bar (touch buttons), countdown, popups, tally ================= */
const CSS=`
#bz{position:fixed;inset:0;pointer-events:none;z-index:8;font-family:var(--ui,"Barlow Condensed","Arial Narrow",sans-serif);color:#f6f1e3;-webkit-user-select:none;user-select:none}
#bz .top{position:absolute;top:58px;left:50%;transform:translateX(-50%);display:flex;align-items:stretch;gap:10px;filter:drop-shadow(0 4px 14px rgba(0,0,0,.35))}
#bz .clock{background:rgba(22,24,28,.82);border-radius:14px;padding:6px 18px 4px;text-align:center;min-width:118px;border:2px solid rgba(246,241,227,.12)}
#bz .clock .k{font:700 12px/1 var(--ui);letter-spacing:.18em;text-transform:uppercase;opacity:.7}
#bz .clock .v{font:800 44px/1.02 var(--ui);font-variant-numeric:tabular-nums;letter-spacing:.02em}
#bz .clock.hot{background:#c93a2b;border-color:#ffd23f;animation:bzBeat 1s infinite}
#bz .score{background:#f08a2c;color:#16181c;border-radius:14px;padding:6px 16px 4px;min-width:104px;text-align:center}
#bz .score .k{font:800 12px/1 var(--ui);letter-spacing:.18em;text-transform:uppercase;opacity:.75}
#bz .score .v{font:800 44px/1.02 var(--ui);font-variant-numeric:tabular-nums}
#bz .score.bump{animation:bzBump .25s ease-out}
#bz .ghost{position:absolute;top:126px;left:50%;transform:translateX(-50%);font:700 15px/1 var(--ui);letter-spacing:.06em;background:rgba(22,24,28,.6);padding:5px 10px;border-radius:999px;white-space:nowrap}
#bz .ghost b{color:#ffd23f}
#bz .combo{position:absolute;right:26px;top:42%;transform:translateY(-50%);text-align:right;transition:opacity .2s}
#bz .combo .x{font:900 64px/1 var(--ui);color:#ffd23f;text-shadow:0 3px 0 #16181c,0 0 18px rgba(255,210,63,.35);font-variant-numeric:tabular-nums}
#bz .combo .lab{font:800 14px/1 var(--ui);letter-spacing:.24em;text-transform:uppercase}
#bz .combo .bar{width:150px;height:8px;border-radius:5px;background:rgba(22,24,28,.6);margin:6px 0 0 auto;overflow:hidden}
#bz .combo .bar i{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#f08a2c);border-radius:5px}
#bz .combo .last{font:700 14px/1.2 var(--ui);opacity:.85;margin-top:6px}
#bz .combo.pop .x{animation:bzPop .35s ease-out}
#bz .tools{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);display:flex;gap:8px}
#bz .tool{width:78px;padding:6px 4px 5px;border-radius:12px;background:rgba(22,24,28,.72);border:2px solid rgba(246,241,227,.14);text-align:center;transition:transform .12s,border-color .12s,background .12s}
#bz .tool svg{width:34px;height:34px;display:block;margin:0 auto 2px}
#bz .tool .n{font:800 14px/1 var(--ui);letter-spacing:.04em}
#bz .tool .s{font:600 11px/1.1 var(--ui);opacity:.65;text-transform:uppercase;letter-spacing:.1em}
#bz .tool .kb{position:absolute;margin:-2px 0 0 4px;font:800 11px/1 var(--ui);background:#f6f1e3;color:#16181c;border-radius:4px;padding:2px 4px}
#bz .tool.on{background:#f6f1e3;color:#16181c;border-color:#ffd23f;transform:translateY(-6px)}
#bz .tool.want{border-color:#ffd23f;animation:bzWant .6s infinite alternate}
#bz.touch .tool{pointer-events:auto;width:70px}
#bz .mk{position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;display:grid;place-items:center;background:rgba(22,24,28,.78);border:2px solid var(--c,#ffd23f);box-shadow:0 2px 8px rgba(0,0,0,.4);transition:opacity .15s}
#bz .mk svg{width:20px;height:20px}
#bz .mk.cur{width:44px;height:44px;margin:-22px 0 0 -22px;background:var(--c,#ffd23f);color:#16181c}
#bz .mk .d{position:absolute;top:100%;margin-top:3px;font:700 11px/1 var(--ui);white-space:nowrap;text-shadow:0 1px 2px #000}
#bz .mk .pts{position:absolute;bottom:100%;margin-bottom:3px;font:800 12px/1 var(--ui);color:#16181c;background:var(--c);border-radius:4px;padding:1px 4px;white-space:nowrap}
#bz .pop{position:absolute;left:0;top:0;font:900 26px/1 var(--ui);color:#ffd23f;text-shadow:0 2px 0 #16181c,0 0 10px rgba(0,0,0,.4);white-space:nowrap;transform:translate(-50%,-50%);animation:bzRise 1.25s ease-out forwards}
#bz .pop small{display:block;font:700 13px/1.1 var(--ui);color:#f6f1e3;letter-spacing:.12em;text-transform:uppercase;text-align:center}
#bz .say{position:absolute;left:0;top:0;transform:translate(-50%,-100%);max-width:240px;background:#f6f1e3;color:#16181c;font:700 14px/1.2 var(--body,system-ui);padding:6px 9px;border-radius:10px;box-shadow:0 3px 10px rgba(0,0,0,.35)}
#bz .say:after{content:"";position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:#f6f1e3}
#bz .big{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font:900 150px/1 var(--ui);color:#ffd23f;text-shadow:0 6px 0 #16181c,0 0 40px rgba(0,0,0,.4);animation:bzCount .9s ease-out forwards;white-space:nowrap}
#bz .big.go{color:#9fe58a;font-size:120px}#bz .big.red{color:#ff5a47}#bz .big.time{color:#f6f1e3;font-size:130px}
#bz .vig{position:absolute;inset:0;box-shadow:inset 0 0 160px 40px rgba(201,58,43,.55);opacity:0;transition:opacity .3s}
#bz .vig.on{animation:bzVig 1s infinite}
#bz .cart{position:absolute;left:50%;bottom:116px;transform:translateX(-50%);font:800 16px/1 var(--ui);background:rgba(22,24,28,.75);padding:7px 12px;border-radius:999px;letter-spacing:.06em}
#bz .tally{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);background:#f6f1e3;color:#16181c;border-radius:18px;padding:18px 22px 16px;box-shadow:0 18px 50px rgba(0,0,0,.5);animation:bzIn .35s ease-out}
#bz .tally h2{margin:0;font:900 30px/1 var(--ui);letter-spacing:.04em;text-transform:uppercase}
#bz .tally h2 span{color:#c93a2b}
#bz .tally .sub{font:700 13px/1.2 var(--ui);letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin-top:4px}
#bz .tally .row{display:flex;gap:16px;margin-top:12px}
#bz .tally .col{flex:1}
#bz .tally .ln{display:flex;justify-content:space-between;font:700 16px/1.55 var(--ui);border-bottom:1px dashed rgba(22,24,28,.15)}
#bz .tally .tot{font:900 64px/1 var(--ui);color:#f08a2c;text-align:right}
#bz .tally .medal{font:800 15px/1.2 var(--ui);text-align:right;letter-spacing:.1em;text-transform:uppercase}
#bz .tally .lb .ln.me{background:#ffd23f;border-radius:6px;padding:0 6px;margin:0 -6px}
#bz .tally .lb .ln.gh{opacity:.6}
@keyframes bzBeat{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes bzBump{0%{transform:scale(1.18)}100%{transform:scale(1)}}
@keyframes bzPop{0%{transform:scale(1.45)}100%{transform:scale(1)}}
@keyframes bzWant{to{border-color:rgba(255,210,63,.25)}}
@keyframes bzRise{0%{opacity:0;margin-top:10px}12%{opacity:1;margin-top:0}100%{opacity:0;margin-top:-70px}}
@keyframes bzCount{0%{opacity:0;transform:translate(-50%,-50%) scale(1.6)}20%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.92)}}
@keyframes bzVig{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes bzIn{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}
@media (max-width:700px){#bz .top{top:46px}#bz .clock .v,#bz .score .v{font-size:34px}#bz .combo{right:12px}#bz .combo .x{font-size:46px}#bz .tool{width:62px}#bz .big{font-size:110px}#bz .tally .row{flex-direction:column}}
`;
const ICON={hammer:'<svg viewBox="0 0 32 32"><path d="M8 6h10l4 3v3l-4-1h-2v3l-2 1-2-1V11H8z" fill="currentColor"/><rect x="12.6" y="14" width="2.8" height="14" rx="1.2" fill="currentColor"/></svg>',
  brush:'<svg viewBox="0 0 32 32"><rect x="9" y="4" width="14" height="10" rx="2" fill="currentColor"/><rect x="10" y="14" width="12" height="3" fill="currentColor" opacity=".7"/><rect x="14.5" y="17" width="3" height="11" rx="1.4" fill="currentColor"/></svg>',
  pole:'<svg viewBox="0 0 32 32"><circle cx="16" cy="7" r="4.5" fill="currentColor"/><path d="M13 11l-2 3h10l-2-3" fill="currentColor"/><rect x="15" y="14" width="2.2" height="15" rx="1" fill="currentColor"/></svg>',
  truck:'<svg viewBox="0 0 32 32"><path d="M10 4l3 0 4 18h7v3H15z" fill="currentColor"/><circle cx="14" cy="26" r="3.2" fill="currentColor"/></svg>',
  can:'<svg viewBox="0 0 32 32"><path d="M9 9h14l-1.5 18h-11z" fill="currentColor"/><rect x="7" y="5" width="18" height="3" rx="1" fill="currentColor"/></svg>',
  cat:'<svg viewBox="0 0 32 32"><path d="M7 8l4 4h10l4-4v10c0 5-4 8-9 8s-9-3-9-8z" fill="currentColor"/></svg>',
  bike:'<svg viewBox="0 0 32 32"><circle cx="8" cy="21" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="24" cy="21" r="5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 21l5-9h7l4 9M13 12l3 9" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>'};
const kindIcon=k=>ICON[KIND[k].tool]||ICON[k]||ICON.can;
let HUDL=null;
function hudMount(){if(HUDL)return HUDL;if(!document.getElementById('bzCss')){const st=document.createElement('style');st.id='bzCss';st.textContent=CSS;document.head.appendChild(st)}
  const r=document.createElement('div');r.id='bz';if(window.matchMedia&&matchMedia('(pointer:coarse)').matches)r.classList.add('touch');
  r.innerHTML='<div class="vig"></div><div class="top"><div class="clock"><div class="k">Time</div><div class="v">3:00</div></div><div class="score"><div class="k">Score</div><div class="v">0</div></div></div><div class="ghost"></div>'+
    '<div class="combo"><div class="lab">Combo</div><div class="x">×1</div><div class="bar"><i></i></div><div class="last"></div></div><div class="cart" hidden></div><div class="mks"></div><div class="fx"></div>'+
    '<div class="tools">'+TOOLS.map(t=>'<div class="tool" data-tool="'+t.id+'"><span class="kb">'+t.key+'</span>'+ICON[t.id]+'<div class="n">'+t.name+'</div><div class="s">'+t.sub+'</div></div>').join('')+'</div>';
  document.body.appendChild(r);
  for(const el of r.querySelectorAll('.tool'))el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const a=A();if(a&&a.M&&a.M.bz)selectTool(a.M,el.dataset.tool)});
  HUDL={r,clock:r.querySelector('.clock'),clockV:r.querySelector('.clock .v'),score:r.querySelector('.score'),scoreV:r.querySelector('.score .v'),ghost:r.querySelector('.ghost'),combo:r.querySelector('.combo'),
    comboX:r.querySelector('.combo .x'),comboBar:r.querySelector('.combo .bar i'),comboLast:r.querySelector('.combo .last'),mks:r.querySelector('.mks'),fx:r.querySelector('.fx'),tools:r.querySelector('.tools'),vig:r.querySelector('.vig'),cart:r.querySelector('.cart'),pool:[],said:[],shown:{}};
  return HUDL}
function hudKill(){if(HUDL){HUDL.r.remove();HUDL=null}}
function hudText(el,key,v){if(!HUDL)return;if(HUDL.shown[key]===v)return;HUDL.shown[key]=v;el.textContent=v}
function hudShow(el,key,on){if(!HUDL)return;const k='show:'+key;if(HUDL.shown[k]===on)return;HUDL.shown[k]=on;el.style.display=on?'':'none'}
function bigText(txt,cls){if(!HUDL)return;const d=document.createElement('div');d.className='big '+(cls||'');d.textContent=txt;HUDL.fx.appendChild(d);setTimeout(()=>d.remove(),950)}
function popAt(x,y,z,txt,sub,col){if(!HUDL)return;const p=A().project(x,y,z);if(p.behind)return;const d=document.createElement('div');d.className='pop';d.style.left=p.x+'px';d.style.top=p.y+'px';if(col)d.style.color=col;
  d.innerHTML=txt+(sub?'<small>'+sub+'</small>':'');HUDL.fx.appendChild(d);setTimeout(()=>d.remove(),1300)}
function sayAt(who,text,dur){if(!HUDL)return;const d=document.createElement('div');d.className='say';d.textContent=text;HUDL.fx.appendChild(d);HUDL.said.push({who,d,t:dur||2.8})}

/* ================= audio: HT.Audio where it has the sound, a few small synths for the rest ================= */
const AU=()=>window.HT&&HT.Audio;let OUT=null,NB=null;
let MYC=null;function actx(){/* HT.Audio keeps its context private: a small one of our own, created on first use (after the player's first input) */
  try{if(!MYC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;MYC=new C()}if(MYC.state==='suspended')MYC.resume().catch(()=>{});return MYC.state==='running'?MYC:null}catch(_){return null}}
function outN(c){if(!OUT||OUT.context!==c){OUT=c.createGain();OUT.gain.value=.55;OUT.connect(c.destination)}return OUT}
function tone(f,dur,o){o=o||{};const c=actx();if(!c)return;const t=c.currentTime+(o.at||0),os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);if(o.f2)os.frequency.exponentialRampToValueAtTime(o.f2,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(o.vol||.2,t+.008);g.gain.exponentialRampToValueAtTime(.0008,t+dur);os.connect(g);g.connect(outN(c));os.start(t);os.stop(t+dur+.03)}
function hiss(dur,o){o=o||{};const c=actx();if(!c)return;if(!NB||NB.sampleRate!==c.sampleRate){NB=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=NB.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const t=c.currentTime+(o.at||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=NB;s.loop=true;f.type=o.type||'bandpass';f.frequency.setValueAtTime(o.f||2000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+dur);f.Q.value=o.q||1;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(o.vol||.15,t+(o.att||.01));g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(f);f.connect(g);g.connect(outN(c));s.start(t);s.stop(t+dur+.03)}
const SFX={
  hammer(p){const a=AU();try{a&&a.impact('wood',p)}catch(_){}tone(2600,.06,{type:'triangle',vol:.08})},
  nail(){tone(1900,.09,{type:'triangle',vol:.12});tone(3800,.05,{vol:.05,at:.01})},
  brush(){hiss(.22,{f:2600,f2:1700,q:.8,vol:.11,att:.05})},
  bulb(){tone(1318,.25,{vol:.14});tone(1760,.5,{vol:.12,at:.09});hiss(.6,{type:'lowpass',f:180,vol:.05,at:.1})},
  squeak(){tone(2200,.07,{type:'square',vol:.03,f2:2600})},
  can(p){const a=AU();try{a&&a.impact('metal',p)}catch(_){}tone(420,.18,{type:'triangle',vol:.08})},
  pump(){hiss(.16,{f:1300,f2:2200,q:2,vol:.12,att:.03})},
  hissCat(){hiss(.5,{type:'highpass',f:3200,vol:.16,att:.04})},
  meow(){const c=actx();if(!c)return;tone(560,.45,{type:'sawtooth',vol:.05,f2:820});tone(820,.3,{type:'sawtooth',vol:.04,f2:520,at:.22})},
  rattle(){hiss(.05,{f:5200,q:3,vol:.05});tone(3100+Math.random()*800,.03,{type:'square',vol:.015})},
  cart(){const a=AU();try{a&&a.ui('cash')}catch(_){}tone(990,.12,{vol:.08,at:.05})},
  tick(hot){tone(hot?1500:2100,hot?.09:.035,{type:'square',vol:hot?.11:.05})},
  go(){tone(523,.18,{type:'square',vol:.1});tone(659,.18,{type:'square',vol:.1,at:.12});tone(784,.45,{type:'square',vol:.12,at:.24})},
  count(){tone(440,.16,{type:'square',vol:.1})},
  buzzer(){tone(196,.9,{type:'sawtooth',vol:.16});tone(207,.9,{type:'sawtooth',vol:.12})},
  whistle(){tone(2900,.5,{vol:.12,f2:3100});tone(2600,.3,{vol:.08,at:.5})},
  combo(k){const b=523.25;[0,4,7,12].slice(0,Math.min(4,1+Math.floor(k))).forEach((s,i)=>tone(b*Math.pow(2,(s+k*2)/12),.14,{type:'triangle',vol:.09,at:i*.055}))},
  tool(){tone(820,.05,{type:'square',vol:.05});tone(1240,.05,{type:'square',vol:.04,at:.04})},
  cheer(p,kid){const a=AU();try{a&&a.voice(kid?'kid_yay':pick(['dad_cheer','dad_ok']),p,{vol:.7})}catch(_){}}};
function music(st,o){const a=AU();try{if(a&&a.music)a.music(st,o)}catch(_){}}
function intensity(v){const a=AU();try{if(a&&a.setIntensity)a.setIntensity(v)}catch(_){}}

/* ================= people (Hank at the mart, porch neighbours, kids, the loiterer) ================= */
const HP=()=>window.HT&&HT.People&&HT.People.ok?HT.People:null;
function dude(role,look,o){const a=A(),pp=HP();let d=null;if(pp&&pp.make){try{d=pp.make(role,o||{})}catch(_){d=null}}if(!d)d=a.makeDude(Object.assign({},look||{shirt:'#7a8796',pants:'#2b2f36'},{role}));return d}
function hankDude(){const a=A(),pp=HP();if(pp&&pp.has&&pp.has('hank'))return dude('hank');const h=a.HOMIES.hank||{};return a.makeDude(Object.assign({},h,{giver:null}))}
function npcPose(d,dt,o){const pp=HP();if(d&&d.rb&&pp&&pp.pose){try{pp.pose(d,dt,o||{})}catch(_){}}else if(d&&d.legs){const w=o&&o.moving?Math.sin((d.walk=(d.walk||0)+dt*10))*.5:0;d.legs.forEach((l,i)=>l.rotation.x=i?w:-w)}}
function wave(d){const pp=HP();if(d&&d.rb&&pp&&pp.interact)try{pp.interact(d)}catch(_){}}
function apron(d){/* Hank's apron: a canvas-printed panel on the chest bone, or on the box dude */const T=T3();const tex=canvasTex(128,160,(g,w,h)=>{g.fillStyle='#b8322a';g.fillRect(0,0,w,h);g.fillStyle='#f6f1e3';g.font='900 26px "Barlow Condensed",sans-serif';g.textAlign='center';g.fillText("HANK'S",w/2,64);g.font='700 15px sans-serif';g.fillText('HARDWARE',w/2,86);g.fillRect(24,104,80,4)});
  const m=new T.Mesh(new T.PlaneGeometry(.36,.5),new T.MeshStandardMaterial({map:tex,roughness:.85,side:T.DoubleSide}));m.position.set(0,1.0,d.rb?.2:.19);d.root.add(m);return m}
function tint(d,col,k){const T=T3(),c=new T.Color(col);d.root.traverse(o=>{if(o.isSkinnedMesh&&o.material){const one=m=>{const n=m.clone();n.color=n.color.clone().lerp(c,k);return n};o.material=Array.isArray(o.material)?o.material.map(one):one(o.material)}})}
function armband(d,col){/* same fit as the free-roam crews: an open band halfway down the left upper arm */const T=T3();const m=new T.MeshStandardMaterial({color:new T.Color(col).convertSRGBToLinear().multiplyScalar(1.15),roughness:.75,side:T.DoubleSide});
  const rb=d.rb,ua=rb&&rb.bones&&rb.bones.Bip01_L_UpperArm,fa=rb&&rb.bones&&rb.bones.Bip01_L_Forearm;
  if(ua&&fa&&fa.parent===ua){d.root.updateMatrixWorld(true);const s=ua.getWorldScale(new T.Vector3()).x/(d.root.scale.x||1)||1,dir=fa.position.clone().normalize();
    const band=new T.Mesh(new T.CylinderGeometry(.054/s,.056/s,.07/s,16,1,true),m);band.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir);band.position.copy(fa.position).multiplyScalar(.5);ua.add(band);return band}
  const arm=d.arms&&d.arms[1];if(arm){const b=A().box(.18,.08,.18,col,0,-.12,0,arm);return b}return null}
const faceTo=(d,x,z)=>{const dx=x-d.root.position.x,dz=z-d.root.position.z;if(Math.abs(dx)+Math.abs(dz)>1e-3)d.root.rotation.y=Math.atan2(dx,dz)};

/* ================= the run ================= */
function bz(M){return M&&M.bz}
function setupStatic(M){const a=A(),W=a.WORLD,S=spots(W),B=bz(M);
  a.wmSetWindow(a.wmWindow(S.mart.x,S.mart.z,30));
  const tb=tableModel();tb.position.set(S.table.x,0,S.table.z);tb.rotation.y=0;a.wmAdd(tb);B.table=tb;
  const co=corralModel();co.position.set(S.corral.x,0,S.corral.z);a.wmAdd(co);B.corral=co;a.wmCol({x0:S.corral.x-1.45,x1:S.corral.x+1.35,z0:S.corral.z-.6,z1:S.corral.z+.6});
  const pk=a.makeVehicle('pickup','#9c3b2e')||a.makeVanBox('#9c3b2e');pk.position.set(S.truck.x,a.groundAt(S.truck.x,S.truck.z),S.truck.z);pk.rotation.y=0;a.wmAdd(pk,true);a.wmCol({x0:S.truck.x-2.7,x1:S.truck.x+2.7,z0:S.truck.z-1.1,z1:S.truck.z+1.1});
  const bd=boardModel();bd.position.set(S.table.x-1.35,0,S.table.z+.55);bd.rotation.y=.35;a.wmAdd(bd);
  const h=hankDude();h.root.position.set(S.hank.x,0,S.hank.z);a.wmAdd(h.root);faceTo(h,S.mart.x,S.mart.z+3);B.hank={d:h,x:S.hank.x,z:S.hank.z};try{tint(h,'#a8402f',.4)}catch(_){}
  const pp=HP();if(pp&&pp.preload)try{pp.preload(['wife','son','daughter']).catch(()=>{})}catch(_){}}
function buildFix(M,f){const a=A(),T=T3();let m=null;
  if(f.kind==='picket'){m=fenceModel();m.position.set(f.x,0,f.z);m.rotation.y=f.yaw;fenceState(m,0)}
  else if(f.kind==='can'){m=canModel();m.position.set(f.x,0,f.z);m.rotation.y=f.yaw;canState(m,0)}
  else if(f.kind==='cart'){m=cartModel();m.position.set(f.x,0,f.z);m.rotation.set(0,f.yaw,(f.id.length%2?.0:.0))}
  else if(f.kind==='tag'){m=patchMesh(f.tag);m.scale.set(.001,m.userData.h,1);m.visible=false}
  else if(f.kind==='lamp'){m=lampGlow(f.head);m.visible=false}
  else if(f.kind==='cat'){m=new T.Group();const br=branchModel(1.5);m.add(br);const cat=catModel();cat.position.set(1.0,.07,0);cat.rotation.y=-Math.PI/2+.4;m.add(cat);m.position.set(f.x,CAT_Y,f.z);m.rotation.y=f.ang;m.userData.cat=cat;
    const yaw=f.ang;f.cx=f.x+Math.cos(yaw)*1.0;f.cz=f.z-Math.sin(yaw)*1.0;f.sx=f.x+Math.cos(yaw)*1.6;f.sz=f.z-Math.sin(yaw)*1.6}
  else if(f.kind==='bike'){m=bikeModel(f.col);m.position.set(f.x,0,f.z);m.rotation.y=f.yaw+Math.PI/2;bikeState(m,0)}
  if(m){a.wmAdd(m);f.mesh=m}
  if(f.kind==='lamp'&&f.mesh)f.mesh.visible=false;return m}
function genAll(M){const B=bz(M),a=A();for(const f of B.fix||[]){if(f.mesh&&f.mesh.parent)f.mesh.parent.remove(f.mesh);if(f.kid&&f.kid.d.root.parent)f.kid.d.root.parent.remove(f.kid.d.root);if(f.glow)try{f.glow.remove()}catch(_){}}
  B.fix=generate(B.seed);for(const f of B.fix)buildFix(M,f);B.genSeed=B.seed}
function newRun(M){const B=bz(M);Object.assign(B,{score:0,mult:1,comboT:0,last:null,lastKind:null,fixing:null,haul:null,carLoad:[],fixed:0,byKind:{},bestMult:1,said:{},trustRun:0,helper:null,helperState:null,
  clock:TUNE.time,tick:11,perm:{tags:[],lamps:[]},events:[],buzzer:false,scratch:null,tool:'hammer',popT:0})}
function selectTool(M,id,quiet){const B=bz(M);if(!B||B.tool===id)return;B.tool=id;B.toolPop=.25;if(!quiet)SFX.tool();attachTool(M)}
function attachTool(M){const a=A(),B=bz(M),d=a.P.dude;if(!d)return;if(B.toolMesh&&B.toolMesh.parent)B.toolMesh.parent.remove(B.toolMesh);B.toolMesh=null;if(B.truckMesh&&B.truckMesh.parent)B.truckMesh.parent.remove(B.truckMesh);
  if(!B.belt||B.phase==='belt')return;
  if(B.tool==='truck'){if(!B.haul){B.truckMesh=B.truckMesh||truckModel();B.truckMesh.position.set(0,0,.62);B.truckMesh.rotation.set(-.18,Math.PI,0);d.root.add(B.truckMesh)}return}
  const hold=d.gunHold||d.root;const inner=new(T3().Group)();const t=toolModel(B.tool);inner.add(t);B.toolInner=t;
  if(d.rb){inner.rotation.set(-Math.PI/2,0,0);inner.position.set(0,0,0)}else{inner.rotation.set(-Math.PI/2,0,0)}hold.add(inner);B.toolMesh=inner}
/* scoring */
function award(M,f,base,label,o){const a=A(),B=bz(M);o=o||{};
  if(B.comboT>0)B.mult=Math.min(TUNE.multMax,B.mult+TUNE.step+(B.lastKind&&B.lastKind!==f.kind?TUNE.variety:0));else B.mult=1;
  const was=B.lastMultShown||1;B.lastKind=f.kind;B.comboT=TUNE.combo;B.bestMult=Math.max(B.bestMult,B.mult);
  let pts=Math.round(base*B.mult);let extra=0;if(B.helper&&B.helperState==='help'&&Math.hypot(B.helper.x-a.P.pos.x,B.helper.z-a.P.pos.z)<9){extra=TUNE.helperPts}
  pts+=extra+(o.bonus||0);B.score+=pts;B.fixed++;B.byKind[f.kind]=(B.byKind[f.kind]||0)+1;B.bkPts=B.bkPts||{};B.bkPts[f.kind]=(B.bkPts[f.kind]||0)+pts;
  const y=f.kind==='lamp'?(f.head?f.head.y-1:5):f.kind==='cat'?2.9:f.kind==='tag'?f.tag.y+.8:1.6;const px=f.kind==='cat'?f.cx:f.x,pz=f.kind==='cat'?f.cz:f.z;
  popAt(px,y,pz,'+'+pts,(label||KIND[f.kind].done)+(B.mult>1?' · ×'+B.mult:'')+(extra?' · ladder +'+extra:'')+(o.sub?' · '+o.sub:''),KIND[f.kind].col);
  if(HUDL){HUDL.score.classList.remove('bump');void HUDL.score.offsetWidth;HUDL.score.classList.add('bump')}
  if(B.mult>was&&B.mult>=2){SFX.combo(B.mult);if(HUDL){HUDL.combo.classList.remove('pop');void HUDL.combo.offsetWidth;HUDL.combo.classList.add('pop')}}
  if(Math.floor(B.mult)>=3&&Math.floor(B.mult)>Math.floor(was)&&!(B.said['c'+Math.floor(B.mult)])){B.said['c'+Math.floor(B.mult)]=1;a.radio('you',LINES.combo[Math.min(LINES.combo.length-1,Math.floor(B.mult)-3)],true)}
  B.lastMultShown=B.mult;
  /* trust: small steps, capped per run and per game week */
  const s=SV(),pl=plan(s),wk=weekOf(s);if(pl.week.w!==wk){pl.week={w:wk,g:0}}const room=Math.min(TUNE.trustRun-B.trustRun,TUNE.trustWeek-pl.week.g);
  if(room>0){const v=Math.min(TUNE.trustFix,room);a.addTrust(v,'river');B.trustRun+=v;pl.week.g=+(pl.week.g+v).toFixed(2)}
  try{const F=window.HT.FX;if(F&&F.trustPop)F.trustPop(new(T3().Vector3)(px,y-.3,pz),' ',{})}catch(_){}
  neighbourReact(M,f);B.events.push({k:f.kind,p:pts,t:TUNE.time-B.clock})}
/* a neighbour comes out on the nearest porch, waves, says something */
function neighbourReact(M,f){const a=A(),B=bz(M),W=a.WORLD;if(B.neighT>0&&f.kind!=='cat'&&f.kind!=='bike')return;B.neighT=2.2;
  const px=f.cx||f.x,pz=f.cz||f.z;let best=null,bd=28;for(const p of W.porches){if(p.tx<152)continue;const d=Math.hypot(p.x-px,p.z-pz);if(d<bd&&d>2&&!B.neigh.some(n=>n.p===p)){bd=d;best=p}}
  if(!best)return;let n=B.neigh.find(n=>n.t<=0);const roles=['wife','daughter','thug_brown','thug_cap','thug_jacket'];
  const role=HP()&&HP().has&&HP().has('neighbour')?'neighbour':pick(roles);
  if(!n){if(B.neigh.length>=3)n=B.neigh.sort((p,q)=>p.t-q.t)[0];else{n={d:dude(role,{shirt:pick(['#5d8aa8','#b5651d','#7fae5d','#c45b7a']),pants:'#3b3f46'})};a.wmAdd(n.d.root);B.neigh.push(n)}}
  n.p=best;n.t=5.5;n.x=best.x+best.face[0]*.5;n.z=best.z+best.face[1]*.5;n.d.root.position.set(n.x,0,n.z);n.d.root.visible=true;faceTo(n.d,px,pz);wave(n.d);n.waveT=1.6;
  const pool=LINES.neigh[f.kind]||LINES.other;const line=Math.random()<.22?pick(LINES.other):pick(pool);sayAt(n,line,2.8);SFX.cheer(new(T3().Vector3)(n.x,1.6,n.z),false)}
/* the fix itself: start, animate, finish */
function reachable(M){const a=A(),B=bz(M),P=a.P;let best=null,bd=1e9;
  for(const f of B.fix){if(f.done||f.busy)continue;if(f.kind==='cart'&&(B.haul||f.inCar))continue;const x=f.sx!=null?f.sx:f.x,z=f.sz!=null?f.sz:f.z;
    const d=Math.min(Math.hypot(P.pos.x-x,P.pos.z-z),Math.hypot(P.pos.x-f.x,P.pos.z-f.z));if(d<f.r&&d<bd){bd=d;best=f}}return best}
function fixTime(M,f){const B=bz(M);let t=KIND[f.kind].time;if((f.kind==='lamp'||f.kind==='cat')&&B.helper&&B.helperState==='help')t*=.6;return t}
function startFix(M,f){const a=A(),B=bz(M),P=a.P,K=KIND[f.kind];const wrong=K.tool&&B.tool!==K.tool;const dur=fixTime(M,f)+(wrong?TUNE.swap:0);
  B.fixing={f,t:0,dur,wrong,lock:{x:P.pos.x,z:P.pos.z},beat:0,step:0};f.busy=true;B.comboHold=true;
  if(f.kind==='cat'){B.catLine=0}if(f.kind==='bike'&&f.kid){sayAt(f.kid,LINES.kid,1.6)}
  if(f.kind==='lamp'||f.kind==='cat'){const T=T3(),pole=new T.Group(),b=parts();b.cyl(.014,1,mat('#c9ced3',{r:.3,m:.85}),0,.5,0,0,0,0,8);pole.add(b.build({shadow:false}));pole.visible=false;a.wmAdd(pole);B.fixing.pole=pole}
  try{const d=P.dude;if(d&&d.rb&&HP())HP().interact(d)}catch(_){}}
function animFix(M,dt){const a=A(),B=bz(M),X=B.fixing,f=X.f,P=a.P,K=KIND[f.kind];X.t+=dt;
  P.pos.set(X.lock.x,P.pos.y,X.lock.z);const tx_=f.kind==='cat'?f.cx:f.x,tz_=f.kind==='cat'?f.cz:f.z;if(P.dude)P.dude.root.rotation.y=Math.atan2(tx_-X.lock.x,tz_-X.lock.z);
  const sw=X.wrong?TUNE.swap:0;if(X.wrong&&X.t>=sw&&B.tool!==K.tool){selectTool(M,K.tool)}
  const k=clamp((X.t-sw)/(X.dur-sw),0,1);const ti=B.toolInner;
  if(X.t>=sw){X.beat-=dt;
    if(f.kind==='picket'){if(ti)ti.rotation.x=-Math.abs(Math.sin(X.t*14))*.9;if(X.beat<=0){X.beat=.2;SFX.hammer(new(T3().Vector3)(f.x,.7,f.z))}fenceState(f.mesh,k*.85)}
    else if(f.kind==='tag'){if(ti){ti.rotation.z=Math.sin(X.t*16)*.6;ti.position.y=Math.sin(X.t*8)*.08}if(X.beat<=0){X.beat=.26;SFX.brush()}const m=f.mesh;m.visible=true;
      const w=m.userData.w*Math.max(.02,k);m.scale.set(w,m.userData.h,1);const fx=f.tag.face[0],fz=f.tag.face[1],off=(f.tag.kind==='z'?.04:0)+.025;const sh=(m.userData.w-w)/2;m.position.set(f.tag.x+fx*off+fz*sh,f.tag.y,f.tag.z+fz*off-fx*sh)}
    else if(f.kind==='lamp'||f.kind==='cat'){const p=X.pole,top=f.kind==='lamp'?{x:f.head.x,y:f.head.y-.25,z:f.head.z}:{x:f.cx,y:CAT_Y+.15,z:f.cz};const hx=X.lock.x,hz=X.lock.z,hy=1.3;
      const ext=f.kind==='lamp'?clamp(k/.45,0,1):clamp(k/.3,0,1);p.visible=true;const ex=hx+(top.x-hx)*ext,ey=hy+(top.y-hy)*ext,ez=hz+(top.z-hz)*ext;const L=Math.hypot(ex-hx,ey-hy,ez-hz)||.01;
      p.position.set(hx,hy,hz);p.scale.set(1,L,1);p.quaternion.setFromUnitVectors(new(T3().Vector3)(0,1,0),new(T3().Vector3)((ex-hx)/L,(ey-hy)/L,(ez-hz)/L));if(B.toolMesh)B.toolMesh.visible=false;
      if(X.beat<=0){X.beat=.28;SFX.squeak()}
      if(f.kind==='cat'){const cat=f.mesh.userData.cat;cat.rotation.z=Math.sin(X.t*20)*.06*(k>.3&&k<.9?1:0);
        const lines=LINES.cat,idx=Math.min(lines.length,Math.floor(k*lines.length*1.05));while(B.catLine<idx){const[w,t]=lines[B.catLine];if(w==='Cat'){SFX.hissCat();sayAt({x:f.cx,z:f.cz,y:3.4},t,1.3)}else{a.radio('you',t,true)}B.catLine++}}}
    else if(f.kind==='can'){canState(f.mesh,k)}
    else if(f.kind==='bike'){if(X.beat<=0){X.beat=.42;SFX.pump()}bikeState(f.mesh,k);if(ti)ti.rotation.x=Math.sin(X.t*15)*.4}
    else if(f.kind==='cart'){}}
  if(X.t>=X.dur)finishFix(M)}
function finishFix(M){const a=A(),B=bz(M),X=B.fixing,f=X.f;B.fixing=null;f.busy=false;if(B.toolMesh)B.toolMesh.visible=true;if(B.toolInner){B.toolInner.rotation.set(0,0,0);B.toolInner.position.set(0,0,0)}
  if(X.pole&&X.pole.parent)X.pole.parent.remove(X.pole);const V=T3().Vector3;
  if(f.kind==='cart'){B.haul=f;f.haul=true;const d=a.P.dude;if(f.mesh.parent)f.mesh.parent.remove(f.mesh);f.mesh.position.set(0,0,.95);f.mesh.rotation.set(0,0,0);d.root.add(f.mesh);if(B.truckMesh&&B.truckMesh.parent)B.truckMesh.parent.remove(B.truckMesh);
    SFX.rattle();B.comboHold=false;return}
  f.done=true;
  if(f.kind==='picket'){fenceState(f.mesh,1);SFX.nail();award(M,f,KIND.picket.pts)}
  else if(f.kind==='tag'){const m=f.mesh;m.scale.set(m.userData.w,m.userData.h,1);const fx=f.tag.face[0],fz=f.tag.face[1],off=(f.tag.kind==='z'?.04:0)+.025;m.position.set(f.tag.x+fx*off,f.tag.y,f.tag.z+fz*off);B.perm.tags.push(f.tag.id);award(M,f,KIND.tag.pts)}
  else if(f.kind==='lamp'){f.mesh.visible=true;SFX.bulb();B.perm.lamps.push(f.lamp.tx+','+f.lamp.tz);award(M,f,KIND.lamp.pts)}
  else if(f.kind==='can'){canState(f.mesh,1);SFX.can(new V(f.x,.5,f.z));award(M,f,KIND.can.pts)}
  else if(f.kind==='bike'){bikeState(f.mesh,1);a.radio('you',LINES.kidGo,true);award(M,f,KIND.bike.pts);f.ride={t:0};SFX.cheer(new V(f.x,1,f.z),true)}
  else if(f.kind==='cat'){const helped=B.helper&&B.helperState==='help';const scratch=!helped&&Math.random()<.55;B.scratch=scratch;
    a.radio('you',scratch?pick(LINES.scratch):LINES.noScratch,true);SFX.meow();award(M,f,KIND.cat.pts,'Cat',{bonus:scratch?0:Math.round(KIND.cat.pts*.5),sub:scratch?'scratched':'no scratch +50%'});
    const cat=f.mesh.userData.cat;f.mesh.remove(cat);a.wmAdd(cat);cat.position.set(f.cx,CAT_Y+.07,f.cz);f.catRun={t:0,from:{x:f.cx,z:f.cz},to:{x:a.P.pos.x+(Math.random()-.5)*4,z:a.P.pos.z+(Math.random()-.5)*4},cat}}
  B.comboHold=false}
function deliverCart(M,f,viaCar){const a=A(),B=bz(M),S=spots(a.WORLD);f.x=S.corral.x;f.z=S.corral.z;const k=B.delivered=(B.delivered||0)+1;const m=f.mesh;if(m.parent)m.parent.remove(m);a.wmAdd(m);m.visible=true;
  m.position.set(S.corral.x+1.0-((k-1)%6)*.34,0,S.corral.z);m.rotation.set(0,-Math.PI/2,0);f.done=true;f.haul=false;f.inCar=false;SFX.cart();award(M,f,KIND.cart.pts,viaCar?'Cart · by car':'Cart')}

/* the loiterer: a Coupon Boys kid offers to hold the ladder (zip-tied fewer than 2 of his crew) */
function crewThin(){try{const fr=window.__ht&&window.__ht.fr;const st=fr&&fr.crewState&&fr.crewState.coupon;return st?st.thin|0:0}catch(_){return 0}}
function loiterTick(M,dt){const a=A(),B=bz(M),P=a.P,W=a.WORLD;
  if(!B.helper){if(TUNE.time-B.clock<TUNE.helperAt||B.clock<25||a.CV)return;/* spawn on a corner 13-22 m away, preferably behind the dad */
    let best=null;for(let k=0;k<40;k++){const ang=Math.random()*6.28,r=13+Math.random()*9,x=P.pos.x+Math.sin(ang)*r,z=P.pos.z+Math.cos(ang)*r;if(!a.walkable(tx(x),tx(z))||ch(W,tx(x),tx(z))!=='s')continue;best={x,z};break}if(!best)return;
    const d=dude('thug',{shirt:'#2aa39a',pants:'#22252a',hood:true});d.root.position.set(best.x,0,best.z);a.wmAdd(d.root);try{armband(d,'#2aa39a')}catch(_){}
    B.helper={d,x:best.x,z:best.z,talkT:0,lineT:8,thin:crewThin()};B.helperState='wait';return}
  const H=B.helper,d=H.d,dx=P.pos.x-H.x,dz=P.pos.z-H.z,dist=Math.hypot(dx,dz);
  if(B.helperState==='wait'){let mv=false;if(dist>8&&dist<60&&!a.CV){const s=Math.min(dist-7,3.2*dt);H.x+=dx/dist*s;H.z+=dz/dist*s;const q=a.V3(H.x,0,H.z);a.collide(q,.3);H.x=q.x;H.z=q.z;d.root.position.set(H.x,0,H.z);mv=true}
    faceTo(d,P.pos.x,P.pos.z);npcPose(d,dt,{moving:mv});if(dist<10&&!a.CV){if(H.thin<2){B.helperState='ask';sayAt(H,LINES.loiterAsk,2.6);H.talkT=1.6}else{B.helperState='leave';sayAt(H,LINES.loiterNo,3);H.talkT=0}}}
  else if(B.helperState==='ask'){H.talkT-=dt;faceTo(d,P.pos.x,P.pos.z);npcPose(d,dt,{});if(H.talkT<=0){a.radio('you',LINES.loiterYes,true);B.helperState='help';a.addTrust(2,'river');a.feed('He’s holding the ladder','trust','+2 trust · Coupon Boys');B.helperJoined=true}}
  else if(B.helperState==='help'){const tgt=B.fixing&&(B.fixing.f.kind==='lamp'||B.fixing.f.kind==='cat')?{x:B.fixing.lock.x+1.1,z:B.fixing.lock.z+.6}:{x:P.pos.x-Math.sin(P.yaw)*-2.2+1.2,z:P.pos.z-Math.cos(P.yaw)*-2.2};
    const ex=tgt.x-H.x,ez=tgt.z-H.z,ed=Math.hypot(ex,ez);const sp=ed>8?7:ed>2?4.5:0;if(sp&&!a.CV){const s=Math.min(ed,sp*dt);H.x+=ex/ed*s;H.z+=ez/ed*s;const q=a.V3(H.x,0,H.z);a.collide(q,.3);H.x=q.x;H.z=q.z}
    if(ed>60&&a.CV){H.x=P.pos.x+3;H.z=P.pos.z+3}
    d.root.position.set(H.x,0,H.z);if(sp)faceTo(d,tgt.x,tgt.z);else faceTo(d,P.pos.x,P.pos.z);npcPose(d,dt,{moving:!!sp,speed:sp>5?1.5:1});d.root.visible=!a.CV||ed<60;
    H.lineT-=dt;if(H.lineT<=0&&B.fixing){H.lineT=14;sayAt(H,pick(LINES.loiterHelp),2.4)}}
  else if(B.helperState==='leave'){H.talkT+=dt;if(H.talkT>3){const ax=H.x-P.pos.x,az=H.z-P.pos.z,al=Math.hypot(ax,az)||1;H.x+=ax/al*3*dt;H.z+=az/al*3*dt;d.root.position.set(H.x,0,H.z);faceTo(d,H.x+ax,H.z+az);npcPose(d,dt,{moving:true});if(H.talkT>9)d.root.visible=false}else{faceTo(d,P.pos.x,P.pos.z);npcPose(d,dt,{})}}}

/* ================= per frame ================= */
function upd(dt,M,F){const a=A(),B=bz(M),P=a.P,S=spots(a.WORLD);if(!B)return;
  if(B.genSeed!==B.seed)genAll(M);
  if(!HUDL)hudMount();if(!B.keys)bindKeys();
  if(P.fp){P.fp=false;if(!B.said.fp){B.said.fp=1;a.radio('you',LINES.fpv,true)}}
  if(P.dude&&P.dude.gun){a.equip(P.dude,null)}if(P.weapons&&P.weapons.length){B.savedWeapons=B.savedWeapons||P.weapons.slice();P.weapons.length=0}
  M.item='toolbelt';
  /* Hank idles, looks at you */
  if(B.hank){const h=B.hank.d;npcPose(h,dt,{});if(B.phase!=='go')faceTo(h,P.pos.x,P.pos.z);}
  for(const n of B.neigh){n.t-=dt;if(n.waveT>0){n.waveT-=dt}npcPose(n.d,dt,{});if(n.t<=0)n.d.root.visible=false}
  if(B.neighT>0)B.neighT-=dt;
  /* kids ride off, cats trot off; a kid waits by each flat bike (the family models stream in, so they appear when ready) */
  B.age=(B.age||0)+dt;const pp=HP();
  for(const f of B.fix){if(f.kind==='bike'&&!f.kid&&!f.done&&(B.age>5||(pp&&pp.has&&(pp.has('son')||pp.has('daughter'))))){const role=pp&&pp.has&&pp.has('daughter')&&(f.id.length%2||!pp.has('son'))?'daughter':'son';
      const kd=dude(role,{shirt:'#ff8ec0',pants:'#2b4a6b'});const kx=f.x+Math.cos(f.yaw)*.9,kz=f.z-Math.sin(f.yaw)*.9;kd.root.position.set(kx,0,kz);if(!kd.rb)kd.root.scale.setScalar(.72);a.wmAdd(kd.root);faceTo(kd,f.x,f.z);f.kid={d:kd,x:kx,z:kz}}if(f.ride&&f.kid){f.ride.t+=dt;const r=f.ride.t;if(r>.6&&r<5){const d=f.kid.d,m=f.mesh,ang=f.yaw;const sp=Math.min(4,(r-.6)*3);const vx=Math.sin(ang+Math.PI/2)*sp*dt,vz=Math.cos(ang+Math.PI/2)*sp*dt;
        m.position.x+=vx;m.position.z+=vz;m.rotation.z=0;d.root.position.set(m.position.x,.18,m.position.z);d.root.rotation.y=Math.atan2(vx,vz);npcPose(d,dt,{mode:'sit'})}else if(r>=5){f.mesh.visible=false;f.kid.d.root.visible=false;f.ride=null}else npcPose(f.kid.d,dt,{})}
    else if(f.kid&&!f.done)npcPose(f.kid.d,dt,{});
    if(f.catRun){const c=f.catRun;c.t+=dt;if(c.t<.6){const k=c.t/.6;c.cat.position.set(c.from.x+(c.to.x-c.from.x)*k*.4,(CAT_Y+.07)*(1-k)+Math.sin(k*Math.PI)*.4,c.from.z+(c.to.z-c.from.z)*k*.4)}
      else if(c.t<3){const k=(c.t-.6);c.cat.position.x+=(c.to.x-c.from.x)*.25*dt*2;c.cat.position.z+=(c.to.z-c.from.z)*.25*dt*2;c.cat.position.y=Math.abs(Math.sin(k*12))*.05;c.cat.rotation.y=Math.atan2(c.to.x-c.from.x,c.to.z-c.from.z)}
      else{c.cat.visible=false;f.catRun=null}}}
  if(HUDL){for(const s of HUDL.said){s.t-=dt;const w=s.who,x=w.d?w.d.root.position.x:w.x,z=w.d?w.d.root.position.z:w.z,y=w.y||2.15;const p=a.project(x,y,z);if(p.behind||s.t<=0)s.d.style.display='none';else{s.d.style.display='';s.d.style.left=p.x+'px';s.d.style.top=p.y+'px'}if(s.t<=0)s.d.remove()}HUDL.said=HUDL.said.filter(s=>s.t>0)}
  /* phases */
  if(B.phase!=='go')USE=false;
  if(B.phase==='belt'){F.objs.push(["Grab the tool belt off Hank's table",false]);F.target={x:S.table.x,z:S.table.z,label:'Tool belt'};
    F.taps.push({x:S.table.x,z:S.table.z,r:2.4,txt:'Grab the tool belt',fn:()=>takeBelt(M)});hud(M,F);return}
  if(B.phase==='count'){B.countT-=dt;const n=Math.ceil(B.countT);if(n!==B.countN&&n>0){B.countN=n;bigText(String(n));SFX.count()}lockPlayer(M);
    F.objs.push(['Get ready…',false]);if(B.countT<=0){B.phase='go';bigText('FIX!','go');SFX.go();a.radio('hank',LINES.go);music('combat',{intensity:.35})}hud(M,F);return}
  if(B.phase==='go'){B.clock-=dt;
    if(B.clock<=10&&!B.said.ten){B.said.ten=1;a.radio('hank',LINES.ten,true);intensity(1)}
    const sec=Math.ceil(B.clock);if(sec<=10&&sec>=1&&sec<B.tick){B.tick=sec;SFX.tick(sec<=3);if(sec<=5)bigText(String(sec),'red')}
    if(B.clock<=0){if(B.fixing&&B.fixing.f.kind!=='cart')B.buzzer=true;else return timeUp(M,F,B.buzzer)}}
  if(B.phase==='over'||B.phase==='tally'){overTick(dt,M,F);hud(M,F);return}
  /* live spree */
  if(B.fixing){animFix(M,dt)}else if(!B.comboHold&&B.comboT>0&&!(B.clock<=0)){B.comboT-=dt;if(B.comboT<=0){B.comboT=0;if(B.mult>1){B.lastMultShown=1}B.mult=1}}
  const inCar=!!a.CV;
  if(inCar&&B.haul){/* got in with a cart in front: it stays where you left it */dropHaul(M)}
  if(!inCar&&!B.fixing){
    if(B.haul){const f=B.haul;F.objs.push(['Push the cart back to Ramos’ corral',false]);F.target={x:S.corral.x,z:S.corral.z,label:'Cart return'};
      if(Math.hypot(P.pos.x-S.corral.x,P.pos.z-S.corral.z)<TUNE.cartR){B.haul=null;deliverCart(M,f);attachTool(M)}
      else{B.rattleT=(B.rattleT||0)-dt;if(P.moving&&B.rattleT<=0){B.rattleT=.18;SFX.rattle()}
        const c=M.car,cap=CAR_CAP[c&&c.type]||(c===a.VAN?2:1);if(c&&Math.hypot(c.pos.x-P.pos.x,c.pos.z-P.pos.z)<4.2){const n=B.carLoad.length;
          if(n<cap)F.taps.push({d:0,r:1,txt:'Load the cart in the car · '+(n+1)+'/'+cap,fn:()=>{B.carLoad.push(f);f.inCar=true;f.haul=false;if(f.mesh.parent)f.mesh.parent.remove(f.mesh);B.haul=null;SFX.rattle();attachTool(M);a.feed('Cart loaded','info',(n+1)+'/'+cap+' · drive it to Ramos’ corral')}});
          else F.prompt='Car’s full of carts';}
        else if(useNow()){a.radio('you',LINES.full,true)}}}
    else if(B.clock>0){const f=reachable(M);B.cur=f;if(f){const K=KIND[f.kind],wrong=K.tool&&B.tool!==K.tool,tl=K.tool?TOOLS.find(t=>t.id===K.tool):null;
        F.prompt='E · '+K.verb+(wrong?' (switch to '+tl.name+' · '+tl.key+')':'');if(useNow())startFix(M,f)}}}
  else B.cur=null;
  if(inCar&&B.carLoad.length){F.objs.push(['Carts in the car · '+B.carLoad.length+' · drive to Ramos’ corral',false]);F.target={x:S.corral.x,z:S.corral.z,label:'Cart return'};
    if(Math.hypot(a.CV.pos.x-S.corral.x,a.CV.pos.z-S.corral.z)<TUNE.carR&&!B.unloadT){B.unloadT=.01}}
  if(B.unloadT){B.unloadT-=dt;if(B.unloadT<=0){const f=B.carLoad.shift();if(f){deliverCart(M,f,true);B.unloadT=B.carLoad.length?.45:0}else B.unloadT=0}}
  if(B.clock>0&&B.clock<TUNE.time)loiterTick(M,dt);
  /* objectives */
  F.objs.push(['Fix everything you can · '+B.fixed+' fixed',false]);if(B.helperJoined)F.objs.push(['Ladder held by a Coupon Boy · faster pole work',true]);
  intensity(Math.min(1,.3+(B.mult-1)*.17));
  hud(M,F)}
let USE=false;function useNow(){const a=A();const u=a.useTap||USE;if(u){a.useTap=false;USE=false}return u}
function lockPlayer(M){const a=A(),B=bz(M);if(!B.lock)B.lock={x:a.P.pos.x,z:a.P.pos.z};a.P.pos.set(B.lock.x,a.P.pos.y,B.lock.z)}
function takeBelt(M){const a=A(),B=bz(M);B.belt=true;if(B.table&&B.table.userData.belt)B.table.userData.belt.visible=false;SFX.tool();
  a.radio('hank',LINES.belt[0]);a.radio('hank',LINES.belt[1]);startCount(M,true)}
function startCount(M,mark){const a=A(),B=bz(M);newRun(M);B.belt=true;B.phase='count';B.countT=TUNE.count+.6;B.countN=null;B.lock=null;if(B.table&&B.table.userData.belt)B.table.userData.belt.visible=false;
  if(mark)a.CP.mark('blitz');selectTool(M,'hammer',true);B.tool='hammer';attachTool(M);music('tension',{intensity:.6})}
function dropHaul(M){const a=A(),B=bz(M),f=B.haul;if(!f)return;B.haul=null;f.haul=false;const m=f.mesh;if(m.parent)m.parent.remove(m);const q=a.wmSnap(a.P.pos.x+1.5,a.P.pos.z);m.position.set(q.x,0,q.z);a.wmAdd(m);f.x=q.x;f.z=q.z;f.sx=f.sz=null}
function timeUp(M,F,buzz){const a=A(),B=bz(M);B.phase='over';B.clock=0;if(B.fixing){const f=B.fixing.f;f.busy=false;if(B.fixing.pole&&B.fixing.pole.parent)B.fixing.pole.parent.remove(B.fixing.pole);B.fixing=null}
  if(buzz){const last=B.events[B.events.length-1];if(last){B.score+=TUNE.buzzer;a.radio('hank',LINES.buzzer,true);popAt(a.P.pos.x,2.4,a.P.pos.z,'+'+TUNE.buzzer,'Buzzer beater','#9fe58a')}}
  if(B.haul)dropHaul(M);B.carLoad.forEach(f=>{f.inCar=false});SFX.buzzer();SFX.whistle();bigText('TIME!','time');a.radio('hank',LINES.time,true);music('hub',{intensity:.4});B.mult=1;B.comboT=0;B.overT=0;
  if(B.toolMesh)B.toolMesh.visible=true;if(F)hud(M,F)}
function overTick(dt,M,F){const a=A(),B=bz(M),P=a.P,S=spots(a.WORLD);B.overT+=dt;
  if(B.phase==='over'){F.objs.push([LINES.back,false]);F.target={x:B.hank.x,z:B.hank.z,label:'Hank'};
    if(!a.CV&&Math.hypot(P.pos.x-B.hank.x,P.pos.z-B.hank.z)<3.4&&B.overT>1.2){tally(M)}}
  else{B.tallyT-=dt;F.objs.push(['Hank is counting…',false]);if(B.tallyT<=0&&!B.ended){B.ended=true;const ok=B.score>=TUNE.bronze;
      if(ok)a.endMission(true);else a.endMission(false,'Hank: '+cap(words(B.score))+'. Under eighty doesn’t count. Gerald believes in you, though.','Not enough to count.')}}}
function tally(M){const a=A(),B=bz(M),s=SV(),pl=plan(s),n=B.score;B.phase='tally';B.tallyT=5.2;M.score=n;
  M.newDiscount=!M.replay&&n>TUNE.discount&&!(s&&s.flags&&s.flags.hankDiscount);
  /* leaderboard: best 5 runs, ghosts shown alongside */
  const day=s?s.day:1,me={s:n,d:day,t:Date.now()%1e9};pl.board.push(me);pl.board.sort((p,q)=>q.s-p.s);pl.board.length=Math.min(5,pl.board.length);B.board=pl.board.slice();B.me=me;
  if(s&&window.HT.Save&&HT.Save.touch)try{HT.Save.touch('jobs')}catch(_){}
  const H=n<TUNE.bronze?cap(words(n))+'. Under eighty doesn’t count. Gerald believes in you, though.':n<TUNE.silver?cap(words(n))+'. That’s a respectable Saturday. Gerald had fun.':
    n<TUNE.gold?cap(words(n))+'! That’s the discount. Ten percent off, for life. Don’t tell my wife.':cap(words(n))+'. Twelve years running this promo. Never seen a man re-home a cat that fast.';
  a.radio('hank',H,true);if(n>=TUNE.silver){a.radio('hank',cap(words(n))+'. Doug’s claiming two-twelve but Doug counted a squirrel.');a.radio('doug','The squirrel was in distress.')}
  showTally(M);if(B.hank)wave(B.hank.d)}
function showTally(M){if(!HUDL)return;const B=bz(M),n=B.score,medal=n>=TUNE.gold?'Gold':n>=TUNE.silver?'Silver':n>=TUNE.bronze?'Bronze':'Doesn’t count';
  const rows=Object.keys(KIND).filter(k=>B.byKind[k]).map(k=>'<div class="ln"><span>'+KIND[k].done+(B.byKind[k]>1?'s':'')+' ×'+B.byKind[k]+'</span><b>'+(B.bkPts[k]||0)+'</b></div>').join('')||'<div class="ln"><span>Nothing fixed</span><b>0</b></div>';
  const lb=[...B.board.map(r=>({who:r===B.me?'You · this run':'You · day '+r.d,s:r.s,me:r===B.me})),...GHOSTS.map(g=>({who:g.who+(g.note?' '+g.note:''),s:g.s,gh:true}))].sort((p,q)=>q.s-p.s).slice(0,8);
  const el=document.createElement('div');el.className='tally';el.innerHTML='<h2>Honey-Do <span>Blitz</span></h2><div class="sub">Hank’s tally · '+B.fixed+' fixes · best combo ×'+B.bestMult+(B.helperJoined?' · ladder held':'')+'</div>'+
    '<div class="row"><div class="col">'+rows+'</div><div class="col"><div class="tot">'+n+'</div><div class="medal">'+medal+(M.newDiscount?' · 10% for life':'')+'</div><div class="lb" style="margin-top:8px">'+
    lb.map((r,i)=>'<div class="ln'+(r.me?' me':'')+(r.gh?' gh':'')+'"><span>'+(i+1)+'. '+r.who+'</span><b>'+r.s+'</b></div>').join('')+'</div></div></div>';
  HUDL.fx.appendChild(el);HUDL.tally=el}
/* HUD each frame */
function hud(M,F){if(!HUDL)return;const a=A(),B=bz(M),P=a.P,H=HUDL;const live=B.phase==='go'||B.phase==='count';const over=B.phase==='over'||B.phase==='tally';
  hudShow(H.r.querySelector('.top'),'top',B.phase!=='belt');hudShow(H.combo,'combo',live&&B.phase==='go');hudShow(H.ghost,'ghost',live);hudShow(H.tools,'tools',B.belt&&!a.CV&&!over);
  hudText(H.clockV,'clock',B.phase==='count'?fmtT(TUNE.time):fmtT(B.clock));H.clock.classList.toggle('hot',B.phase==='go'&&B.clock<=10);H.vig.classList.toggle('on',B.phase==='go'&&B.clock<=10);
  hudText(H.scoreV,'score',String(B.score));
  if(live){const s=SV(),pl=plan(s),best=pl.board.length?pl.board[0].s:0;const tg=[...GHOSTS.map(g=>({w:g.who+(g.note?' '+g.note:''),s:g.s})),...(best?[{w:'your best',s:best}]:[])].filter(g=>g.s>B.score).sort((p,q)=>p.s-q.s)[0];
    hudText(H.ghost,'ghost',tg?'Next: '+tg.w+' · '+tg.s:'Top of the board. Doug is furious.');}
  if(B.phase==='go'){hudText(H.comboX,'mult','×'+(+B.mult.toFixed(1)));H.comboBar.style.width=(B.comboT/TUNE.combo*100).toFixed(1)+'%';H.combo.style.opacity=B.mult>1||B.comboT>0?1:.55;
    const lk=B.lastKind?'Last: '+KIND[B.lastKind].done+' · mix it up for +'+TUNE.variety:'Chain fixes inside '+TUNE.combo+' s';hudText(H.comboLast,'last',lk)}
  for(const el of H.tools.children){const id=el.dataset.tool;el.classList.toggle('on',B.tool===id);const want=B.cur&&KIND[B.cur.kind].tool===id&&B.tool!==id;el.classList.toggle('want',!!want)}
  const carts=B.carLoad.length;hudShow(H.cart,'cart',carts>0);if(carts)hudText(H.cart,'cartT','Carts in the car · '+carts+' · drive to Ramos’ corral');
  /* markers: undone fixables within 40 m, on screen */
  let k=0;if(B.phase==='go'&&!B.haul){const px=P.pos.x,pz=P.pos.z;const list=B.fix.filter(f=>!f.done&&!f.inCar&&!f.haul&&Math.hypot(f.x-px,f.z-pz)<TUNE.hudR).sort((p,q)=>Math.hypot(p.x-px,p.z-pz)-Math.hypot(q.x-px,q.z-pz)).slice(0,14);
    for(const f of list){const y=f.kind==='lamp'?6.2:f.kind==='cat'?3.0:f.kind==='tag'?f.tag.y+.9:f.kind==='cart'?1.5:1.4;const x=f.kind==='cat'?f.cx:f.x,z=f.kind==='cat'?f.cz:f.z;const p=a.project(x,y,z);if(p.behind||p.x<-40||p.y<-40||p.x>innerWidth+40||p.y>innerHeight+40)continue;
      let el=H.pool[k];if(!el){el=document.createElement('div');el.className='mk';el.innerHTML='<span class="ic"></span><span class="pts"></span><span class="d"></span>';H.mks.appendChild(el);H.pool[k]=el}k++;
      const K=KIND[f.kind];if(el._k!==f.kind){el._k=f.kind;el.style.setProperty('--c',K.col);el.querySelector('.ic').innerHTML=kindIcon(f.kind);el.querySelector('.pts').textContent=K.pts+(f.kind==='cat'?'+':'')}
      el.style.display='';el.style.transform='translate('+p.x.toFixed(0)+'px,'+p.y.toFixed(0)+'px)';el.classList.toggle('cur',B.cur===f);const d=Math.round(Math.hypot(x-px,z-pz));el.querySelector('.d').textContent=B.cur===f?K.name:d+' m'}}
  for(;k<H.pool.length;k++)H.pool[k].style.display='none';
  /* rim highlight on the near ones (HT.FX), cheap: only the 6 nearest */
  const FX=window.HT&&HT.FX;if(FX&&FX.highlight&&B.phase==='go'&&!B.glowT){B.glowT=.5;const px=P.pos.x,pz=P.pos.z;const near=new Set(B.fix.filter(f=>!f.done&&!f.haul&&!f.inCar&&f.mesh&&f.kind!=='tag'&&f.kind!=='lamp'&&Math.hypot(f.x-px,f.z-pz)<18).sort((p,q)=>Math.hypot(p.x-px,p.z-pz)-Math.hypot(q.x-px,q.z-pz)).slice(0,6));
    for(const f of B.fix){const want=near.has(f);if(want&&!f.glow){try{f.glow=FX.highlight(f.kind==='cat'?f.mesh.userData.cat:f.mesh,true,{color:KIND[f.kind].col,intensity:1.4})}catch(_){f.glow=null}}else if(!want&&f.glow){try{f.glow.remove()}catch(_){}f.glow=null}}}
  if(B.glowT)B.glowT=Math.max(0,B.glowT-1/30)}
/* keys 1-4 and the wheel pick tools (captured before the gun keys) */
let KEYB=false;
function bindKeys(){const a=A(),B=bz(a.M);if(B)B.keys=true;if(KEYB)return;KEYB=true;
  const on=()=>{const a=A();return a&&a.mode==='mission'&&a.M&&a.M.def&&a.M.def.id===ID&&a.M.state==='go'&&a.M.bz&&a.M.bz.belt};
  document.addEventListener('keydown',e=>{if(!on()||e.repeat)return;const k=(e.key||'').toLowerCase();const i=['1','2','3','4'].indexOf(k);
    if(i>=0){selectTool(A().M,TOOLS[i].id);e.stopPropagation()}else if(k==='q'){const B=A().M.bz,j=TOOLS.findIndex(t=>t.id===B.tool);selectTool(A().M,TOOLS[(j+1)%4].id);e.stopPropagation()}
    else if(k==='r'||k==='v')e.stopPropagation()},true);
  document.addEventListener('wheel',e=>{if(!on())return;const B=A().M.bz,j=TOOLS.findIndex(t=>t.id===B.tool);selectTool(A().M,TOOLS[(j+(e.deltaY>0?1:3))%4].id);e.stopPropagation()},{capture:true,passive:true})}
/* tool belt item: the fire button means "use" */
J.item('toolbelt',{name:'Tool belt',use(M){USE=true}});

/* ================= persistent fixes in free roam (painted-over tags, relit lamps) ================= */
const PL={grp:null,key:'',t:0};
function persistTick(){const a=A();if(!a||!a.L||!a.L.ow||!a.WORLD||a.mode==='home'||a.mode==='title')return;const now=performance.now();if(now-PL.t<700)return;PL.t=now;
  const s=SV();if(!s)return;const W=a.WORLD,tags=scrubbed(s),lamps=plan(s).lamps;const O=window.HT.OpenWorld;if(!O||!O.blockTrust)return;
  const live=a.mode==='mission'&&a.M&&a.M.def&&a.M.def.id===ID&&a.M.state==='go';
  const want=[];for(const id of tags){const t=W.tags.find(t=>t.id===id);if(t&&bt(t.x,t.z)<t.clearAt)want.push('t'+id)}for(const k of lamps){const l=W.lamps.find(l=>l.tx+','+l.tz===k);if(l&&bt(l.x,l.z)<l.brokenUntil)want.push('l'+k)}
  const key=want.join('|');if(PL.grp&&PL.grp.parent!==a.L.group){PL.key='';}if(key===PL.key)return;PL.key=key;
  if(PL.grp&&PL.grp.parent)PL.grp.parent.remove(PL.grp);const T=a.THREE;PL.grp=new T.Group();PL.grp.name='blitzFixes';
  for(const w of want){if(w[0]==='t'){const t=W.tags.find(t=>t.id===w.slice(1));if(t)PL.grp.add(patchMesh(t))}else{const l=W.lamps.find(l=>l.tx+','+l.tz===w.slice(1));if(l)PL.grp.add(lampGlow(lampHead(W,l,true)))}}
  if(a.L.group)a.L.group.add(PL.grp);void live}
/* teardown when the job is over (result card, quit, retry) */
function sysHud(){const a=A();if(!a)return;persistTick();
  const live=a.mode==='mission'&&a.M&&a.M.def&&a.M.def.id===ID&&a.M.state==='go';
  if(!live&&HUDL){const keep=HUDL.tally;if(keep){/* leave the tally card up under the result card for a beat */}hudKill();restore()}}
let SAVEDW=null;
function restore(){const a=A();if(SAVEDW&&a&&a.P&&a.P.weapons&&!a.P.weapons.length){for(const w of SAVEDW)a.P.weapons.push(w)}SAVEDW=null}
J.on('hud',sysHud);

/* ================= register ================= */
J.register(ID,{
  def:{giver:'hank',giverName:'Hank',giverLook:{giver:'hank',role:'thug_brown',shirt:'#9c3b2e',pants:'#3b3f46',apron:true,belly:true,mustache:true,hair:'#8d8d8d',cap:'#b8322a'},
    hood:'river',title:'Honey-Do Blitz',role:"Hank · Hank's Hardware",place:'Riverside Flats, around Ramos Corner Mart',
    lines:["I'm running a promotion. Whoever fixes the most stuff in Riverside in three minutes gets ten percent off at Hank's. For life.",
      "Fences, bulbs, graffiti, Mrs. Ramos' carts. There's a cat. There's always a cat.","I supply the tools. You supply the dad energy. Meet me at Ramos'. Bring sneakers."],
    obj:'Three minutes. Fix as much of Riverside as you can: fences, bulbs, graffiti, carts, a cat. Chain fixes for a combo. 80 counts.',
    crew:[],weapons:[],noGuns:LINES.noGun,from:{tile:[21,5]},start:{place:'mart'},unlock:{done:['earl']},
    repeatable:true,pay:150,par:0,winTrust:0,roam:true,order:40,stages:['belt','blitz'],stageLabels:{belt:'The tool belt',blitz:'The blitz'},failPolicy:'soft',
    medals:['80 points (it counts)','150 points (and Hank’s discount)','250 points'],
    radio:[['hank',"Table's by the mart. Gerald's on it. Don't keep Gerald waiting."]],
    endLine:"Riverside's a little straighter, a little brighter, and Mrs. Ramos got her carts back."},
  start(M,o){M.bz={seed:(Math.random()*1e9)>>>0,phase:'belt',belt:false,fix:[],neigh:[],said:{},score:0,clock:TUNE.time,mult:1,comboT:0,carLoad:[],byKind:{},events:[],perm:{tags:[],lamps:[]},tool:'hammer'};
    M.score=0;M.noCars=false;setupStatic(M);const a=A();if(a.P.dude)a.equip(a.P.dude,null);SAVEDW=a.P.weapons?a.P.weapons.slice():null;
    if(!o||!o.checkpoint){music('tension',{intensity:.3})}},
  upd,
  save:M=>{const B=M.bz||{};return{seed:B.seed>>>0,phase:B.phase==='belt'?'belt':'count'}},
  load(M,s){const B=M.bz||(M.bz={});B.seed=(s&&s.seed)>>>0;B.phase=s&&s.phase==='belt'?'belt':'count';
    if(B.phase==='count'&&B.table!==undefined){startCount(M,false)}},
  payout(M,ok){const B=M.bz;if(!ok||!B)return[];const l=[['Points ×'+B.score+' at $'+TUNE.perPoint,B.score*TUNE.perPoint]];
    if(B.helperJoined)l.push(['A Coupon Boy held the ladder · he’ll be at the court',0]);if(M.newDiscount)l.push(['Hank’s lifetime 10% discount',0]);return l},
  medal:M=>{const s=M.bz?M.bz.score:0;return s>=TUNE.gold?3:s>=TUNE.silver?2:1},
  end(M,ok){const B=M.bz,s=SV();if(!B||!s)return;/* story effects: never on a replay (the framework skips end() then) */
    for(const id of B.perm.tags)if(!s.world.scrubbed.includes(id))s.world.scrubbed.push(id);const pl=plan(s);for(const k of B.perm.lamps)if(!pl.lamps.includes(k))pl.lamps.push(k);
    if(ok&&B.score>TUNE.discount&&!s.flags.hankDiscount){s.flags.hankDiscount=true;try{A().banner("HANK'S DISCOUNT",'Ten percent off at Hank’s Hardware. For life.',3)}catch(_){}}
    if(B.helperJoined)pl.helper=true;try{if(HT.Save.touch)HT.Save.touch('world','flags','jobs')}catch(_){}PL.key=''},
  hud(state){if(state.weapon)state.weapon.holstered=true;if(state.crosshair)state.crosshair.hidden=true;state.weapons=[]},
  test:{give(a){/* world givers spawn when the hub is entered; a mid-session unlock (the harness) re-enters it so Hank shows up */if(a.mode==='hub'&&window.__ht&&window.__ht.enterHub)window.__ht.enterHub()},step:(a,t,o)=>blitzBot(a,t,o),
    sample:()=>({bz:{seed:12345,phase:'count'}})}
});

/* ================= the scripted player for dev/jobs-check.js ================= */
/* human-ish: runs (real movement, sprint), turns toward the next fix, presses E in range, picks a sensible route:
   value per second (points over travel + work time), carts only when the mart is close. o.fail: take the belt, then stand still. */
function blitzBot(a,t,o){const M=a.M,P=a.P,k=a.keys;if(!M||M.state!=='go'||!M.bz)return null;const B=M.bz,S=spots(a.WORLD);o=o||{};
  const W=a.WORLD;const go=(x,z,stop)=>{const d=Math.hypot(x-P.pos.x,z-P.pos.z);let wx=x,wz=z;
    /* route on the tile grid: a distance field from the target, followed a few tiles ahead (like a player who knows the block) */
    const key=tx(x)+','+tx(z);if(B.botKey!==key){B.botKey=key;B.botField=bfs(W,{tx:tx(x),tz:tx(z)},90)}const fd=B.botField;
    if(fd&&d>3){let cxT=tx(P.pos.x),czT=tx(P.pos.z);for(let s=0;s<3;s++){let bi=-1,bv=fd[czT*W.W+cxT];if(bv<0)bv=1e9;for(const[ddx,ddz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const X=cxT+ddx,Z=czT+ddz,v=fd[Z*W.W+X];
          if(v>=0&&v<bv&&(Math.abs(ddx)+Math.abs(ddz)<2||(fd[czT*W.W+X]>=0&&fd[Z*W.W+cxT]>=0))){bv=v;bi=Z*W.W+X}}if(bi<0)break;cxT=bi%W.W;czT=(bi/W.W)|0}
      if(cxT!==tx(P.pos.x)||czT!==tx(P.pos.z)){wx=tc(cxT);wz=tc(czT)}}
    const dx=wx-P.pos.x,dz=wz-P.pos.z;const want=Math.atan2(-dx,-dz);let dy=want-P.yaw;while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;
    const turn=o.perfect?9:5.5;P.yaw+=Math.max(-turn/30,Math.min(turn/30,dy));k.w=d>(stop||.8)&&Math.abs(dy)<1.6;k.shift=d>4&&Math.abs(dy)<.6;
    const BT=a.M.bz.bot||(a.M.bz.bot={px:0,pz:0,st:0,unstuck:0});if(t%15===0){const mv=Math.hypot(P.pos.x-BT.px,P.pos.z-BT.pz);if(k.w&&mv<.35)BT.st++;else BT.st=0;BT.px=P.pos.x;BT.pz=P.pos.z;
      if(BT.st>=2&&!BT.back){BT.back=o.perfect?1:24;/* a player caught on a railing backs off and goes round: that costs a second */}
      if(BT.st>=2&&BT.back===1){BT.back=0;/* ...then takes the next tile of the route */P.pos.set(wx,0,wz);a.collide(P.pos,.35);BT.st=0;BT.unstuck++;
        /* a player who keeps snagging on the same thing gives up on it for a while */BT.tgtStuck=(BT.tgtStuck||0)+1;if(BT.tgtStuck>=4&&B.botF){B.botF.skipT=t+600;B.botF=null;B.botT=0;BT.tgtStuck=0}}}return d};
  const stop=()=>{k.w=k.shift=false};if(B.bot&&B.bot.back>1){B.bot.back--;stop();return null}
  if(a.CV){stop();if(t%10===0)a.useTap=true;return null}
  if(B.phase==='belt'){if(go(S.table.x,S.table.z+1,1.6)<2.2){stop();if(t%6===0)a.useTap=true}return null}
  if(B.phase==='count'){stop();return null}
  if(B.phase==='over'){go(B.hank.x,B.hank.z+.8,1.2);return null}
  if(B.phase==='tally'){stop();return null}
  if(o.fail){stop();return null}
  if(B.fixing){stop();return null}
  if(B.haul){go(S.corral.x+1,S.corral.z+1.2,.5);return null}
  /* tool ahead of time, like a player who looks at the next marker */
  const pick_=()=>{const dm=Math.hypot(P.pos.x-S.corral.x,P.pos.z-S.corral.z);const cand=[];
    for(const f of B.fix){if(f.done||f.busy||f.inCar||f.haul||(f.skipT&&f.skipT>t))continue;if(f.kind==='cart'&&(Math.hypot(f.x-S.corral.x,f.z-S.corral.z)>45||dm>50))continue;
      const x=f.sx!=null?f.sx:f.x,z=f.sz!=null?f.sz:f.z;cand.push({f,d:Math.hypot(x-P.pos.x,z-P.pos.z)})}
    const near=cand.filter(c=>c.d<TUNE.hudR),list=near.length&&!o.perfect?near:cand;/* a player only sees the markers within 40 m */let best=null,bv=-1;
    for(const{f,d}of list){const K=KIND[f.kind];const tt=d/6.2+K.time+(K.tool&&K.tool!==B.tool?.4:0)+(f.kind==='cart'?Math.hypot(f.x-S.corral.x,f.z-S.corral.z)/5:0)+.5;
      const v=(K.pts*(f.kind==='cat'?1.4:1))/tt*(B.comboT>0&&d/6.2<B.comboT?1.6:1)*(o.perfect?1:.75+Math.random()*.5);if(v>bv){bv=v;best=f}}return best};
  if(!B.botT||B.botT<=0||!B.botF||B.botF.done){const nf=pick_();if(nf!==B.botF&&B.bot)B.bot.tgtStuck=0;B.botF=nf;B.botT=45}B.botT--;const f=B.botF;if(!f){stop();return null}
  const K=KIND[f.kind];if(f!==B.botTF){B.botTF=f;B.botTool=o.perfect||Math.random()<.65;B.botReact=o.perfect?0:.2+Math.random()*.25}/* sometimes a player forgets to switch and eats the swap */
  if(B.botTool&&K.tool&&B.tool!==K.tool&&Math.hypot(f.x-P.pos.x,f.z-P.pos.z)<9)selectTool(M,K.tool);
  const x=f.sx!=null?f.sx:f.x,z=f.sz!=null?f.sz:f.z;const d=go(x,z,f.r*.5);if(d<f.r*.8||Math.hypot(f.x-P.pos.x,f.z-P.pos.z)<f.r*.8){stop();if(B.cur===f){B.botReact-=1/30;if(B.botReact<=0)a.useTap=true}}
  return null}
})();
