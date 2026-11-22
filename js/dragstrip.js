/* High Trust · HT.Strip — Sensible Dragway, the eighth-mile south of Fort Sensible (docs/dragstrip.md)
 * Free roam, always open, no giver (not during jobs). The race model, racers, odds and money rules are js/dragsim.js (HT.Drag); this file
 * is the place and what happens there:
 *   THE PLACE   two lanes, a concrete launch pad, a burnout box, a working Christmas tree, timing boards (ET and trap speed per lane), the
 *               timing tower with the race office, two small grandstands (fenced in, people seated), the paddock with the loaners lined up,
 *               light poles, a sign on Industrial Way and a map pin (fast travel after the first visit). Static parts are open-world set
 *               pieces (merged per material, culled per unit); the runtime parts (tree bulbs, boards, loaners, people) are built on
 *               approach and dropped when you leave.
 *   TEST & TUNE the paddock board: any car in the game (HT.Garage's six and the mower), its numbers, a loaner at the line; solo passes;
 *               a timeslip after each (RT, 60 ft, 330 ft, 1/8 ET and mph, a 1/4-mile estimate) against your best in that car and the
 *               garage book (best slip per car, saved).
 *   MONEY       the race office: heads-up races against the ladder (entry, purse, first-win bonus, repeat wins pay less, a daily cap),
 *               bracket night every third in-game day (3 rounds, dial-ins, breakouts), your own car or a rental; a bet on yourself.
 *   BETTING     the race office: two racers, payout multipliers from the model's win probability with a house edge; watch from the
 *               tower camera (skip any time). Limits, a daily win/loss cap and a cash floor. In-game cash only.
 * Hooks: HT.Jobs 'pose' (tick), 'hud', 'vehicle' (a pass drives the car: e.fly skips the game's physics), 'camera' (the tower camera);
 * HT.Base.on('interact') (prompts), HT.Base.on('reset') (quit to title, job start, home, death: nothing left behind). Gun rule: HT.Base.line.
 */
(function(){'use strict';
const HT=window.HT=window.HT||{};
const ST={};HT.Strip=ST;
const J=()=>HT.Jobs,A=()=>HT.Jobs&&HT.Jobs.api,B=()=>HT.Base,D=()=>HT.Drag,RO=()=>HT.Roam,AU=()=>HT.Audio;
const clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
ST.def=()=>{const G=HT.WorldGen;const d=G&&G.last;return d&&d.strip||null};
const NAMES={office:'Dolores',starter:'Starter'};
const LINES={
  arrive:["Welcome to Sensible Dragway. Eighth mile. Two lanes. No tanks.","Race office is in the tower. Test and tune is free. The paddock board's by the loaners."],
  bark:["Heard they opened a drag strip past Fort Sensible. Asking for a friend. The friend is me.","There's a drag strip south of the base now. I'm not saying we should. I'm saying it's there.",
    "Eighth-mile strip down by Fort Sensible. They lend you any car. ANY car. Even the mower."],
  loaner:["Loaner's yours. Bring it back with the same number of wheels.","Keys are in it. The keys are always in it. It's a drag strip.","She's warmed up. Don't warm her up more than that."],
  back:["Loaner goes back to the pits.","Thanks for bringing it back in one piece. One piece is the target."],
  noLeave:"Loaners stay at the strip. That's the whole deal. It's in the waiver you didn't read.",
  guns:["Not at the strip. It's a family venue. There's a guy selling funnel cake.","Holster stays on. Track rules. Also mom rules.","Nope. Racing only. The scariest thing here is the funnel cake."],
  red:["Red light. You left early. Everybody does it once. Some people do it every time.","Red. The tree didn't say go. The tree is very clear about that."],
  perfect:["Point-oh-something! That's a perfect light. Tell everyone.","That light was perfect. The tower guy actually stood up."]};
const say=(who,t,front)=>{try{A().radio(NAMES[who]||who,t,front)}catch(_){}};
const feed=(t,k)=>{try{A().feed(t,k||'info')}catch(_){}};
/* prompt labels, from the action layer (js/keys.js) or the pad's own buttons (js/gamepad.js): never a hard-coded key */
const pad=()=>!!(HT.Pad&&HT.Pad.active);
const PADB={use:'A',jump:'A',fwd:'RT',back:'LT',ok:'A',back2:'B',alt:'X'};
function kl(act){if(pad())return HT.Pad.btn(PADB[act]||act);const K=HT.Keys;if(act==='ok')return'Enter';if(act==='back2')return K&&K.keyLabel?K.keyLabel('Escape'):'Esc';return K&&K.label?K.label(act):act}
function sv(){try{const s=A().SV();if(!s)return null;if(!s.strip)s.strip={};const x=s.strip;
  for(const[k,v]of Object.entries({visited:false,taught:{},book:{},hist:[],ladder:{beaten:{},wins:{}},days:{},stats:{passes:0,races:0,wins:0,reds:0,bestRt:null,perfect:false,bets:0},bracket:{lastDay:0,won:0},barked:false}))if(x[k]==null)x[k]=JSON.parse(JSON.stringify(v));
  return x}catch(_){return null}}
function persist(){try{A().save()}catch(_){}}
function dayN(){try{return A().SV().day||1}catch(_){return 1}}
function cash(){try{return Math.max(0,Math.round(HT.Save.data.cash||0))}catch(_){return 0}}
function addCash(n,why){if(!n)return;try{HT.Save.addCash(n,why||'strip')}catch(_){try{A().SV().cash=Math.max(0,(A().SV().cash||0)+n)}catch(__){}}}
const money=n=>(n<0?'-$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
function teach(id,text){const s=sv();if(!s||s.taught[id])return;s.taught[id]=1;feed(text,'info')}

/* ================= THE PLACE: static set pieces (js/openworld.js culls each unit) ================= */
const COL={conc:'#b8b4aa',conc2:'#cfcbc1',asph:'#2c2e30',rubber:'#18191a',white:'#f2f1ea',yellow:'#f0c23a',red:'#c0322d',blue:'#2c4e8a',steel:'#8d9399',dark:'#25292c',
  alu:'#c4c9cc',wood:'#8a6a45',green:'#2f7a46',navy:'#1e2c46',orange:'#e46d1f',sand:'#cdb68a',stripe:'#f4f2ea'};
/* fewer materials, fewer draw calls: a handful of the base kit's materials stand in for the rest (vertex colours carry the look) */
const MATMAP={stucco:'paint',wood:'paint',dark:'paint',corr:'metal',earth:'paint'};
function wrapP(P){const W=Object.create(P);for(const f of['box','obox','cyl','quad','geo'])W[f]=(k,...r)=>{P[f](MATMAP[k]||k,...r);return W};W.g=k=>P.g(MATMAP[k]||k);return W}
function units(){const O=HT.OpenWorld,Bs=B();if(!O||!O.addSetpiece||!Bs||!Bs.kit){setTimeout(units,0);return}
  const unit=(id,box,fn,r)=>O.addSetpiece({id,r,box:()=>box,build(ws,u){const d=ws.def.strip;if(!d||!(HT.World&&HT.World.GB))return;u.group.name=id;/* dev/dragstrip-check.js counts our draw calls by these names */const P=wrapP(Bs.kit.painter());fn(P,d,Bs.kit);P.flush(u.group);
    /* draw calls: only the near unit's paint and concrete cast shadows (the walls, the stands, the tower); the rest don't */
    u.group.traverse(o=>{if(o.isMesh)o.castShadow=id==='strip_e'&&/base:(paint|concrete)$/.test(o.name)})}});
  unit('strip_e',{x0:160,z0:250,x1:284,z1:302,y1:12},(P,d,K)=>{track(P,d,K,160,280);startArea(P,d,K);tower(P,d,K);stand(P,d.standE,K,'E');paddock(P,d,K);poles(P,d,160,284)},150);
  unit('strip_w',{x0:0,z0:250,x1:162,z1:302,y1:10},(P,d,K)=>{track(P,d,K,4,162);finishArea(P,d,K);stand(P,d.standW,K,'W');poles(P,d,4,160)},150);
  unit('strip_sign',{x0:200,z0:158,x1:216,z1:172,y1:8},(P,d,K)=>roadSign(P,d,K),140)}
units();
/* the lanes from x0 to x1: launch pad concrete, rubber in the grooves, lane lines, walls with a catch fence on the spectator side */
function track(P,d,K,x0,x1){const Y=.015,zc=d.centerZ,t=d.track,S=d.start;
  const pad0=Math.max(x0,S-62),pad1=Math.min(x1,S+18);
  if(pad1>pad0)P.box('concrete',pad0,0,t.z0+.05,pad1,Y,t.z1-.05,COL.conc2,4);/* the launch pad: the first 60 m are concrete, like the real ones */
  /* rubber: two dark grooves per lane, heavy at the line, fading out down the track */
  for(const lz of d.laneZ)for(const s of[-.78,.78]){for(let x=Math.max(x0,S-140);x<Math.min(x1,S+12);x+=6){const k=clamp((x-(S-140))/140,0,1),w=.32+.1*k;
    const c=Math.round(0x48-0x2a*k);P.box('mark',x,Y,lz+s-w/2,Math.min(x+6,x1),Y+.004,lz+s+w/2,'#'+[c,c,c+2].map(v=>v.toString(16).padStart(2,'0')).join(''))}}
  /* lane lines: the edges and the centre (white), every 10 m a short gap */
  for(let x=x0;x<x1;x+=10){const xe=Math.min(x1,x+9);P.box('mark',x,Y,zc-.08,xe,Y+.006,zc+.08,COL.white);for(const ez of[t.z0+.35,t.z1-.35])P.box('mark',x,Y,ez-.07,xe,Y+.006,ez+.07,COL.white)}
  /* walls: concrete barriers on the track side of their tiles, a painted band, the spectator catch fence on top of the north wall */
  for(const[w,side]of[[d.wallN,1],[d.wallS,-1]]){const a=Math.max(x0,w.x0),b=Math.min(x1,w.x1);if(b<=a)continue;const face=side>0?w.z1:w.z0,back=face-side*.62;
    P.box('concrete',a,0,Math.min(face,back),b,1.05,Math.max(face,back),COL.conc,3);P.box('concrete',a,0,Math.min(face,face-side*.86),b,.32,Math.max(face,face-side*.86),COL.conc,3);
    P.box('paint',a,.62,Math.min(face,face+side*.012),b,.8,Math.max(face,face+side*.012),side>0?COL.blue:COL.red);
    for(let x=a;x<b;x+=8)P.box('paint',x,1.05,Math.min(face,back)+.05,Math.min(b,x+4),1.07,Math.max(face,back)-.05,COL.white);
    /* the spectator side: catch-fence posts and cables on top of the wall (the chain-link behind is the 'z' tiles' fence) */
    if(side>0){const cz=(face+back)/2;for(let x=a;x<=b;x+=6)P.cyl('metal',x,2.55,cz,.045,.045,3,COL.steel,6);for(const y of[1.6,2.3,3,3.7,4.04])P.box('metal',a,y,cz-.015,b,y+.025,cz+.015,COL.steel)}}}
const CHECK=['#141414','#f4f2ea'];
function startArea(P,d,K){const Y=.03,S=d.start,t=d.track,zc=d.centerZ;
  P.box('mark',S-.15,Y,t.z0+.1,S+.15,Y+.006,t.z1-.1,COL.white);/* the start line */
  for(const lz of d.laneZ){P.box('mark',S+.6,Y,lz-.06,S+1.4,Y+.006,lz+.06,COL.yellow)}/* centring marks for the front tyres */
  /* the burnout box: wet-look concrete and a painted word in each lane */
  const bx=d.burnout;P.box('mark',bx.x0,Y-.008,t.z0+.4,bx.x1,Y-.002,t.z1-.4,'#5b5f63');
  const w=K.atlasRect('dr_burn',1,1,(c,W,H)=>{c.fillStyle='#5b5f63';c.fillRect(0,0,W,H);c.fillStyle='#f4f2ea';c.font='900 96px "Arial Narrow",Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('BURNOUT',W/2,H/2+4,W*.92)});
  for(const lz of d.laneZ){const x=(bx.x0+bx.x1)/2,p=(u,v)=>[x+u*4.6,Y,lz+v*1.15];P.g('sign'+w[4]).quad(p(1,-1),p(1,1),p(-1,1),p(-1,-1),[[w[0],w[1]],[w[2],w[1]],[w[2],w[3]],[w[0],w[3]]],null,[0,1,0])}
  /* the Christmas tree: a post on a base between the lanes, a black housing (the bulbs are runtime: they light) */
  const tr=d.tree;P.box('concrete',tr.x-.45,0,tr.z-.45,tr.x+.45,.25,tr.z+.45,COL.conc);P.cyl('metal',tr.x,.7,tr.z,.09,.09,1,COL.dark,8);
  P.box('paint',tr.x-.16,1,tr.z-.42,tr.x+.16,3.35,tr.z+.42,COL.dark);P.box('paint',tr.x-.18,3.35,tr.z-.46,tr.x+.18,3.42,tr.z+.46,'#3a3f44');
  /* visors over each bulb row (east face) */
  for(const y of[3.12,2.86,2.52,2.17,1.82,1.47,1.12])P.box('paint',tr.x+.16,y+.12,tr.z-.4,tr.x+.3,y+.14,tr.z+.4,'#111');
  /* the staging beams: little posts at the line on both walls' faces */
  for(const z of[t.z0+.5,t.z1-.5]){P.box('metal',S-.1,0,z-.1,S+.1,.55,z+.1,COL.yellow);P.box('metal',S+.4,0,z-.1,S+.6,.55,z+.1,COL.yellow)}
  /* the staging lanes' arrows and a "LINE UP" board */
  P.sign(S+16,2.3,d.track.z0-2.4,4,1,Math.PI,K.board('dr_lineup',['LINE UP HERE','TWO BY TWO · ENGINES ON'],2,1,'navy'));for(const u of[-1.6,1.6])P.cyl('metal',S+16+u,1.1,d.track.z0-2.35,.05,.05,2.2,COL.steel,6)}
function finishArea(P,d,K){const Y=.03,F=d.finish,t=d.track;
  /* the finish line: a checked band across both lanes */
  for(let i=0;i<16;i++){const z0=t.z0+.1+i*(t.z1-t.z0-.2)/16,z1=z0+(t.z1-t.z0-.2)/16;for(let j=0;j<2;j++)P.box('mark',F-.5+j*.5,Y,z0,F+j*.5,Y+.006,z1,CHECK[(i+j)%2])}
  /* distance boards on the north wall: 60 FT, 330 FT, 1/8 (painted on the barrier, readable from the car) */
  const S=d.start;for(const[x,txt]of[[S-18.29,'60 FT'],[S-100.58,'330 FT'],[F+20.12,'TRAP'],[F,'1/8 MILE']]){const r=K.board('dr_d'+txt,[txt],1,1,'white');P.sign(x,.62,d.wallN.z1+.02,1.7,.5,Math.PI,r);P.sign(x,.62,d.wallS.z0-.02,1.7,.5,0,r)}
  /* the shutdown: a sand trap and the catch net at the very end */
  P.box('earth',4,0.005,t.z0+.1,10,.05,t.z1-.1,COL.sand);const n=d.net;
  for(let z=n.z0;z<=n.z1;z+=2)P.cyl('metal',n.x0+1.2,1.25,z,.07,.07,2.5,COL.steel,6);for(let y=.3;y<2.4;y+=.3)P.box('metal',n.x0+1.18,y,n.z0,n.x0+1.22,y+.03,n.z1,'#d9dcdc');for(let z=n.z0;z<=n.z1;z+=.5)P.box('metal',n.x0+1.18,.1,z-.015,n.x0+1.22,2.4,z+.015,'#d9dcdc');
  P.box('paint',n.x0+1.05,2.38,n.z0,n.x0+1.35,2.5,n.z1,COL.orange);
  P.sign(14,2.4,d.track.z0-1.6,4.6,1.15,Math.PI,K.board('dr_shut',['SHUTDOWN','LIFT · BRAKE · TURN LEFT AT THE END'],2,1,'yellow'));for(const u of[-2,2])P.cyl('metal',14+u,1.1,d.track.z0-1.55,.05,.05,2.2,COL.steel,6);
  /* the finish board's frame and posts (the faces are runtime: they change) */
  const b=d.board;for(const u of[-3.1,3.1])P.cyl('metal',b.x,2.6,b.z+u,.12,.14,5.2,COL.steel,8);P.box('paint',b.x+.08,4.6,b.z-3.5,b.x+.5,7.4,b.z+3.5,COL.dark)}
/* the timing tower: a two-storey block with a glassed cab looking over the line, the race office window on its west side */
function tower(P,d,K){const b=d.tower,x0=b.x0+.25,x1=b.x1-.25,z0=b.z0+.25,z1=b.z1-.25,H=b.roofY||8.6;
  P.box('concrete',x0-.2,0,z0-.2,x1+.2,.3,z1+.2,COL.conc);P.box('stucco',x0,.3,z0,x1,4.2,z1,'#e9e3d4');
  P.box('paint',x0-.1,4.2,z0-.1,x1+.1,4.45,z1+.1,COL.navy);
  /* the cab: glass on four sides, a roof that overhangs */
  P.box('dark',x0+.1,4.45,z0+.1,x1-.1,7.6,z1-.1,'#20262c');
  for(const[a,c,z,nz]of[[x0,x1,z0,-1],[x0,x1,z1,1]])P.quad('glass',[a+.2,4.6,z+nz*.02],[c-.2,4.6,z+nz*.02],[c-.2,7.4,z+nz*.02],[a+.2,7.4,z+nz*.02]);
  for(const[a,c,x,nx]of[[z0,z1,x0,-1],[z0,z1,x1,1]])P.quad('glass',[x+nx*.02,4.6,a+.2],[x+nx*.02,4.6,c-.2],[x+nx*.02,7.4,c-.2],[x+nx*.02,7.4,a+.2]);
  P.box('paint',x0-.6,7.6,z0-.6,x1+.6,7.85,z1+.6,COL.white);P.box('paint',x0-.62,7.66,z0-.62,x1+.62,7.8,z1+.62,COL.red);
  P.box('metal',(x0+x1)/2-.04,7.85,(z0+z1)/2-.04,(x0+x1)/2+.04,9.6,(z0+z1)/2+.04,COL.steel);/* antenna */
  /* the race office window (west) with a counter and an awning; signs */
  const wz=(z0+z1)/2;P.box('dark',x0-.04,1.1,wz-1.3,x0+.02,2.3,wz+1.3,'#1b2026');P.quad('glass',[x0-.06,1.1,wz+1.3],[x0-.06,1.1,wz-1.3],[x0-.06,2.3,wz-1.3],[x0-.06,2.3,wz+1.3]);
  P.box('wood',x0-.55,1.0,wz-1.4,x0,1.08,wz+1.4,COL.wood);P.obox('corr',x0-.6,2.65,wz,1.2,.08,3.2,0,COL.red,0,.25);
  P.sign(x0-.04,3.1,wz,2.8,.7,Math.PI/2,K.board('dr_office',['RACE OFFICE','ENTRIES · BETS · PAYOUTS'],2,1,'red'));
  P.sign((x0+x1)/2,3.35,z0-.04,3.4,.85,0,K.board('dr_tower',['SENSIBLE DRAGWAY','EST. LAST TUESDAY'],2,1,'navy'));
  /* the start board on the cab's north face is runtime (board faces) */
  P.box('concrete',x0-1.2,0,wz-1.6,x0,.12,wz+1.6,COL.conc2)}
/* a small aluminium grandstand: five tiers of bench, risers, a back rail, a canopy on posts (fenced in by the 'z' tiles round it) */
function stand(P,b,K,which){if(!b)return;const x0=b.x0+.3,x1=b.x1-.3,zf=b.z1-.2,zb=b.z0+.3,n=5,dz=(zf-zb)/n;
  for(let k=0;k<n;k++){const y=.42+k*.42,z=zf-k*dz;P.box('paint',x0,0,z-dz,x1,y-.06,z-dz+.06,'#7d8287');/* riser */P.box('metal',x0,y-.06,z-dz*.75,x1,y,z-dz*.08,COL.alu);/* bench */P.box('metal',x0,y-.42,z-dz+.04,x1,y-.38,z-.04,'#9aa0a4')}
  for(let x=x0;x<=x1;x+=3.2)for(let k=0;k<=n;k++){const z=zf-k*dz;P.box('metal',x-.05,0,z-.05,x+.05,.42+k*.42,z+.05,'#6c7277')}
  P.box('metal',x0,.42*n+.95,zb-.02,x1,.42*n+1.02,zb+.04,COL.alu);for(let x=x0;x<=x1;x+=3.2)P.box('metal',x-.03,.42*n,zb-.02,x+.03,.42*n+1,zb+.04,COL.alu);
  /* the canopy */const cy=.42*n+3;for(const x of[x0+.3,x1-.3,(x0+x1)/2])for(const z of[zb+.2,zf-.4])P.cyl('metal',x,cy/2,z,.08,.08,cy,COL.steel,8);
  P.obox('corr',(x0+x1)/2,cy+.2,(zb+zf)/2,x1-x0+1.2,.1,zf-zb+1.4,0,'#d7dbd8',.06);
  P.sign((x0+x1)/2,cy-.35,zf-.38,Math.min(8,x1-x0-1),.7,Math.PI,K.board('dr_stand'+which,[which==='E'?'START LINE SEATS':'FINISH LINE SEATS','STAY BEHIND THE FENCE · KIDS ON LAPS'],2,1,'navy'))}
/* the paddock: painted bays for the loaners, the test & tune board, tyre stacks, a fuel cage, a canopy over the bays */
function paddock(P,d,K){const Y=.03,L=d.loaners;
  for(let i=0;i<8;i++){const x=L.x0+(i-.5)*L.dx;P.box('mark',x-.06,Y,L.z-3,x+.06,Y+.006,L.z+2.6,COL.white)}
  const b=d.paddockBoard;for(const u of[-1.6,1.6])P.cyl('metal',b.x+u,1.2,b.z+.06,.06,.06,2.4,COL.steel,6);
  P.sign(b.x,1.95,b.z,3.6,1.5,Math.PI,K.board('dr_tune',['TEST & TUNE · FREE','ANY CAR IN THE PADDOCK','WALK UP · PICK ONE'],2,2,'yellow'));
  /* a canopy over the loaner row */
  const cx0=L.x0-3.2,cx1=L.x0+L.dx*6.6,cz=L.z;for(const x of[cx0,(cx0+cx1)/2,cx1])for(const z of[cz-3.3,cz+3])P.cyl('metal',x,1.9,z,.07,.07,3.8,COL.steel,8);
  P.obox('corr',(cx0+cx1)/2,3.9,cz-.15,cx1-cx0+.8,.09,7,0,COL.white,-.05);P.box('paint',cx0-.4,3.6,cz-3.7,cx1+.4,3.85,cz-3.55,COL.red);
  P.sign((cx0+cx1)/2,3.25,cz-3.6,6,.62,0,K.board('dr_loan',['PADDOCK · LOANERS','EVERY CAR IN TOWN · ONE OF EACH'],2,1,'red'));
  /* tyre stacks and a fuel cage by the corridor */
  for(const[x,z]of[[256,298],[257.2,298],[256.6,296.9],[262,299]])for(let k=0;k<4;k++)P.cyl('dark',x,.12+k*.24,z,.36,.36,.22,'#1d1f21',14);
  P.box('metal',266,0,296,268.6,2.1,299,'#9aa0a4');P.sign(267.3,1.5,295.96,2.4,.6,0,K.board('dr_fuel',['RACE FUEL','NO SMOKING · NO GRILLING'],1,1,'red'))}
/* light poles along both sides; at night they light the track (the heads glow, pools of light are runtime) */
function poles(P,d,x0,x1){for(let x=Math.ceil((x0-6)/40)*40+6;x<=x1;x+=40){for(const[z,dir]of[[d.wallN.z0-2.2,1],[d.wallS.z0+1.6,-1]]){if(dir<0&&(x<d.wallS.x0+2||x>d.wallS.x1-1))continue;
    P.cyl('metal',x,5.5,z,.11,.16,11,COL.steel,8);P.box('metal',x-.06,10.6,z,x+.06,10.75,z+dir*1.6,COL.steel);
    P.box('paint',x-.5,10.35,z+dir*1.2,x+.5,10.6,z+dir*2,'#30353a');P.box('glow',x-.45,10.33,z+dir*1.25,x+.45,10.36,z+dir*1.95,'#fff2d0')}}}
function roadSign(P,d,K){const s=d.sign;for(const u of[-1.6,1.6])P.cyl('metal',s.x+u,2.3,s.z,.08,.08,4.6,'#7d8287',8);
  P.sign(s.x,3.6,s.z-.06,5.6,1.6,0,K.board('dr_r9',['SENSIBLE DRAGWAY  →','EIGHTH MILE · TEST & TUNE FREE · RACE NIGHTS'],3,1,'navy'));P.obox('metal',s.x,3.6,s.z,5.7,1.7,.08,0,'#55595e');
  P.sign(s.x,3.6,s.z+.06,5.6,1.6,Math.PI,K.board('dr_r9b',['SENSIBLE DRAGWAY','ALONG THE TREE LINE · PAST THE BASE'],2,1,'navy'))}

/* ================= runtime state ================= */
const S={L:null,root:null,built:false,tree:null,boards:null,pools:null,loanRow:[],people:[],office:null,cols:[],t:0,simT:0,
  run:null,loaner:null,menu:null,card:null,hud:null,watch:null,said:{},inStrip:false,lastPos:null,objSeen:false,err:{}};
ST.S=S;
const GEO=[];/* runtime geometry / materials we made (disposed when we drop the runtime) */
function own(x){GEO.push(x);return x}
/* the Christmas tree's bulbs: one mesh, vertex colours rewritten when a bulb changes */
const BULBS=['pre','stage','a1','a2','a3','green','red'],BY={pre:3.12,stage:2.86,a1:2.52,a2:2.17,a3:1.82,green:1.47,red:1.12},
  BCOL={pre:[1,.96,.75],stage:[1,.96,.75],a1:[1,.62,.08],a2:[1,.62,.08],a3:[1,.62,.08],green:[.15,1,.3],red:[1,.12,.08]};
function buildTree(d){const T=THREE,parts=[],pos=[],col=[],idx=[];let vi=0;const tr=d.tree;
  for(let lane=0;lane<2;lane++)for(const b of BULBS){const z=tr.z+(lane?.2:-.2),y=BY[b],small=b==='pre'||b==='stage';
    for(const dz of small?[-.085,.085]:[0]){const g=new T.CylinderGeometry(small?.045:.09,small?.045:.09,.06,12);g.rotateZ(Math.PI/2);g.translate(tr.x+.19,y,z+dz);
      const p=g.attributes.position,ix=g.index.array,n=p.count;parts.push({lane,b,v0:vi,n});for(let i=0;i<n;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));col.push(.05,.05,.05)}for(const k of ix)idx.push(k+vi);vi+=n;g.dispose()}}
  const geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeBoundingSphere();
  const m=new T.Mesh(geo,own(new T.MeshBasicMaterial({vertexColors:true,toneMapped:false})));m.name='strip:tree';m.userData.noBatch=true;S.root.add(m);
  S.tree={m,parts,state:[{},{}],key:''}}
/* set lights: st = [{pre,stage,a1..,green,red} per lane] */
function treeSet(st){const T=S.tree;if(!T)return;const key=JSON.stringify(st);if(key===T.key)return;T.key=key;const c=T.m.geometry.attributes.color;
  for(const p of T.parts){const on=st[p.lane]&&st[p.lane][p.b],k=BCOL[p.b];for(let i=0;i<p.n;i++){const j=(p.v0+i)*3;if(on){c.array[j]=k[0]*3;c.array[j+1]=k[1]*3;c.array[j+2]=k[2]*3}else{c.array[j]=k[0]*.07;c.array[j+1]=k[1]*.07;c.array[j+2]=k[2]*.07}}}
  c.needsUpdate=true}
/* the timing boards: one canvas, two faces (the finish board facing the start, the start board on the tower facing the stands) */
function buildBoards(d){const T=THREE,c=document.createElement('canvas');c.width=1024;c.height=320;const tex=own(new T.CanvasTexture(c));tex.encoding=T.sRGBEncoding;tex.anisotropy=4;
  const geo=own(new T.BufferGeometry()),P=[],U=[],I=[];const quad=(pts,uv)=>{const o=P.length/3;for(const p of pts)P.push(...p);U.push(...uv);I.push(o,o+1,o+2,o,o+2,o+3)};
  const b=d.board,w=6.8,h=2.12;quad([[b.x+.52,4.85,b.z+w/2],[b.x+.52,4.85,b.z-w/2],[b.x+.52,4.85+h,b.z-w/2],[b.x+.52,4.85+h,b.z+w/2]],[0,0,1,0,1,1,0,1]);/* read from the start (east): u runs toward -z */
  const t=d.tower,tz=t.z0+.25-.05,tx=(t.x0+t.x1)/2,w2=7.4,h2=2.3;quad([[tx+w2/2,4.75,tz-.6],[tx-w2/2,4.75,tz-.6],[tx-w2/2,4.75+h2,tz-.6],[tx+w2/2,4.75+h2,tz-.6]],[0,0,1,0,1,1,0,1]);/* read from the stands (north): u runs toward -x */
  geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));geo.setIndex(I);geo.computeVertexNormals();geo.computeBoundingSphere();
  const m=new T.Mesh(geo,own(new T.MeshBasicMaterial({map:tex,toneMapped:false,side:T.DoubleSide})));m.name='strip:boards';m.userData.noBatch=true;S.root.add(m);
  S.boards={c,tex,key:'',lanes:[null,null]};drawBoards(true)}
/* lanes: [{name, et, mph, rt, win, red}] */
function drawBoards(force){const b=S.boards;if(!b)return;const key=JSON.stringify(b.lanes);if(!force&&key===b.key)return;b.key=key;const x=b.c.getContext('2d'),W=b.c.width,H=b.c.height;
  x.fillStyle='#0b0d0f';x.fillRect(0,0,W,H);x.strokeStyle='#30363c';x.lineWidth=8;x.strokeRect(4,4,W-8,H-8);
  x.fillStyle='#e9e2c8';x.font='700 30px "Arial Narrow",Arial';x.textAlign='center';x.fillText('SENSIBLE DRAGWAY · 1/8 MILE',W/2,42);
  for(let i=0;i<2;i++){const l=b.lanes[i],x0=i?16:W/2+8,w=W/2-24;/* read from the start line: lane 0 (north) is on the right */x.fillStyle='#14181b';x.fillRect(x0,58,w,H-74);
    x.fillStyle='#9aa3a8';x.font='700 24px "Arial Narrow",Arial';x.textAlign='left';x.fillText(i?'LEFT LANE':'RIGHT LANE',x0+14,88);
    if(l&&l.name){x.textAlign='right';x.fillText(String(l.name).toUpperCase().slice(0,22),x0+w-14,88)}
    const seg=(t,y,sz,c)=>{x.fillStyle=c;x.font='700 '+sz+'px "Courier New",monospace';x.textAlign='right';x.fillText(t,x0+w-18,y)};
    if(l&&l.red){x.fillStyle='#ff2a1a';x.font='900 92px "Arial Narrow",Arial';x.textAlign='center';x.fillText('RED LIGHT',x0+w/2,200)}
    else{seg(l&&l.et!=null?l.et.toFixed(3):'--.---',178,86,'#ffb020');seg(l&&l.mph!=null?l.mph.toFixed(2)+' MPH':'--.-- MPH',240,46,'#ffb020')}
    if(l&&l.rt!=null&&!l.red){x.fillStyle='#9aa3a8';x.font='700 22px "Arial Narrow",Arial';x.textAlign='left';x.fillText('R/T '+l.rt.toFixed(3),x0+14,286)}
    if(l&&l.win){x.fillStyle='#ffd23a';x.beginPath();x.arc(x0+44,150,26,0,6.283);x.fill();x.fillStyle='#111';x.font='900 18px Arial';x.textAlign='center';x.fillText('WIN',x0+44,157)}
    if(l&&l.margin){x.fillStyle='#e9e2c8';x.font='700 22px "Arial Narrow",Arial';x.textAlign='right';x.fillText(l.margin,x0+w-18,286)}}
  b.tex.needsUpdate=true}
function boardsSet(lanes){if(!S.boards)return;S.boards.lanes=lanes;drawBoards()}
/* pools of light on the track at night (additive quads under the poles) */
function buildPools(d){const T=THREE,P=[],U=[],I=[];const add=(x,z,r)=>{const o=P.length/3;P.push(x-r,.04,z-r,x+r,.04,z-r,x+r,.04,z+r,x-r,.04,z+r);U.push(0,0,1,0,1,1,0,1);I.push(o,o+2,o+1,o,o+3,o+2)};
  for(let x=6;x<=280;x+=20){add(x,d.centerZ,9)}/* the track */for(let x=206;x<=252;x+=12)add(x,265,7);for(let x=38;x<=76;x+=12)add(x,265,7);/* the stands */for(let x=210;x<=272;x+=14)add(x,293,9);/* the paddock */
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(255,240,210,.85)');gr.addColorStop(.5,'rgba(255,230,190,.32)');gr.addColorStop(1,'rgba(255,230,190,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);
  const tex=own(new T.CanvasTexture(c)),geo=own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(P,3));geo.setAttribute('uv',new T.Float32BufferAttribute(U,2));geo.setIndex(I);geo.computeBoundingSphere();
  const m=new T.Mesh(geo,own(new T.MeshBasicMaterial({map:tex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0,toneMapped:false})));m.renderOrder=2;m.name='strip:pools';m.userData.noBatch=true;m.visible=false;S.root.add(m);S.pools=m}
/* the loaners lined up in the paddock: one of every car the strip lends (parked LOD1 models; colliders so you can't walk through them) */
const LOAN_COL={hatch:'#c8312c',minivan:'#35577d',sedan:'#1f2226',suv:'#d8d4c8',pickup:'#e8742a',workvan:'#f2f2ee',mower:'#2e7d3a'};
function buildLoaners(a,d){const V=HT.Vehicles;if(!V||!V.make)return;const L=d.loaners,types=D().types().filter(t=>t!=='mower');/* the mower (29 parts) lives in the shed: the picker lends it */
  types.forEach((t,i)=>{let v=null;try{v=V.make(t,{color:LOAN_COL[t]||'#888',lod:1})}catch(_){v=null}if(!v)return;const x=L.x0+i*L.dx;
    v.position.set(x,0,L.z);v.rotation.y=Math.PI/2;/* front faces north, toward the track */v.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.userData.noBatch=true}});S.root.add(v);
    const sz=v.userData.size||{l:4.5,w:2};const col={x0:x-sz.w/2,z0:L.z-sz.l/2,x1:x+sz.w/2,z1:L.z+sz.l/2,strip:true};S.cols.push(col);S.loanRow.push({t,v,x,z:L.z})});
  mergeRow();addCols(a)}
/* draw calls: each parked car's body and wheels become one mesh (same material), the six contact shadows one mesh: 18 calls -> 7 */
function mergeRow(){const T=THREE,g=new T.Group();g.name='strip:loaners';const shadows=[];S.root.updateMatrixWorld(true);
  const merge=(parts,mat)=>{const names=new Set();for(const m of parts)for(const k in m.geometry.attributes)names.add(k);let nv=0,ni=0;for(const m of parts){nv+=m.geometry.attributes.position.count;ni+=m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count}
    const out={},size={};for(const k of names){for(const m of parts){const at=m.geometry.attributes[k];if(at){size[k]=at.itemSize;break}}out[k]=new Float32Array(nv*size[k])}
    const idx=new Uint32Array(ni),v=new T.Vector3(),M=new T.Matrix4(),N=new T.Matrix3();let vo=0,io=0;
    for(const m of parts){const geo=m.geometry,n=geo.attributes.position.count;M.copy(m.matrixWorld);N.getNormalMatrix(M);
      for(const k of names){const at=geo.attributes[k],o=out[k],sz=size[k];if(!at)continue;for(let i=0;i<n;i++){if(k==='position'){v.fromBufferAttribute(at,i).applyMatrix4(M);o.set([v.x,v.y,v.z],(vo+i)*3)}else if(k==='normal'){v.fromBufferAttribute(at,i).applyMatrix3(N).normalize();o.set([v.x,v.y,v.z],(vo+i)*3)}else for(let j=0;j<sz;j++)o[(vo+i)*sz+j]=at.array[i*sz+j]}}
      const ix=geo.index?geo.index.array:null,c=ix?ix.length:n;for(let i=0;i<c;i++)idx[io++]=(ix?ix[i]:i)+vo;vo+=n}
    const geo=own(new T.BufferGeometry());for(const k of names)geo.setAttribute(k,new T.BufferAttribute(out[k],size[k]));geo.setIndex(new T.BufferAttribute(idx,1));geo.computeBoundingSphere();
    const mesh=new T.Mesh(geo,mat);mesh.userData.noBatch=true;mesh.castShadow=false;mesh.receiveShadow=true;g.add(mesh);return mesh};
  for(const r of S.loanRow){const v=r.v,sh=v.userData.contactShadow,body=[];v.traverse(o=>{if(!o.isMesh)return;if(o===sh||(o.material&&o.material.type==='MeshBasicMaterial'))shadows.push(o);else body.push(o)});
    const byMat=new Map();for(const m of body){const k=m.material.uuid;(byMat.get(k)||byMat.set(k,[]).get(k)).push(m)}
    for(const[,parts]of byMat){const mm=merge(parts,parts[0].material);mm.renderOrder=parts[0].renderOrder}
    S.root.remove(v)}
  if(shadows.length){const sm=merge(shadows,shadows[0].material);sm.renderOrder=shadows[0].renderOrder;sm.receiveShadow=false}
  S.root.add(g);S.loanG=g}
function addCols(a){const C=a.L.colliders;for(const c of S.cols)if(!C.includes(c))C.push(c)}
function dropCols(a){try{const C=a.L.colliders;for(const c of S.cols){const k=C.indexOf(c);if(k>=0)C.splice(k,1)}}catch(_){}}
/* people: a few spectators seated in the stands (fenced in: the 'z' tiles all round, no car or dad can reach them), the race office */
const SPECS=[['nb_gran','E',3,6],['nb_sweater','E',2,14],['nb_mei','E',4,24],['nb_kenji','E',1,32],['nb_lucia','W',2,12]];
function buildPeople(a,d){const PP=HT.People;if(!PP||!PP.ok)return false;
  for(const[key,which,tier,off]of SPECS){const st=which==='E'?d.standE:d.standW;if(!st)continue;let dd=null;try{dd=PP.make('neighbour',{variant:key})}catch(_){dd=null}if(!dd)continue;
    const n=5,zf=st.z1-.5,dz=(zf-(st.z0+.3))/n,y=.42+tier*.42,z=zf-tier*dz-dz*.45;dd.root.position.set(st.x0+.3+off,y-.55,z);dd.root.rotation.y=0;/* facing the track (south, +z) */
    try{dd.root.traverse(m=>{if(m.isMesh){m.userData.noBatch=true;m.castShadow=false}})}catch(_){}S.root.add(dd.root);S.people.push({d:dd,sit:true,cheer:0,ph:Math.random()*6})}
  let o=null;try{o=PP.make('neighbour',{variant:'nb_office'})}catch(_){o=null}
  if(o){const t=d.tower;o.root.position.set(t.x0-.75,0,(t.z0+t.z1)/2+1.85);o.root.rotation.y=-Math.PI/2;/* by the window, under the awning, facing west */S.root.add(o.root);S.office={d:o};S.people.push({d:o,sit:false,office:true})}
  return true}
function dropPeople(){const PP=HT.People;for(const p of S.people){try{if(p.d.root.parent)p.d.root.parent.remove(p.d.root);if(PP&&PP.free)PP.free(p.d.root)}catch(_){}}S.people=[];S.office=null}
/* build the runtime pieces when you come near; hide them farther out; drop them (geometry, people, colliders) when you leave the area */
const NEAR=60,FAR=200;/* metres from the strip's box: built within 60, hidden beyond 75, dropped beyond 200 */
function boxDist(d,x,z){const b=d.box;return Math.hypot(Math.max(b.x0-x,0,x-b.x1),Math.max(b.z0-z,0,z-b.z1))}
function ensure(a,d){const c=a.camera.position,dist=boxDist(d,c.x,c.z);
  if(S.L!==a.L){teardown(a,true);S.L=a.L}
  if(!S.root&&dist<NEAR){const T=THREE;S.root=new T.Group();S.root.name='dragstrip';a.L.group.add(S.root);buildTree(d);buildBoards(d);buildPools(d);buildLoaners(a,d);treeSet([{},{}])}
  if(S.root&&!S.people.length&&!S.peopleTried&&dist<NEAR){S.peopleTried=buildPeople(a,d)}
  if(S.root){if(S.root.parent!==a.L.group)a.L.group.add(S.root);S.root.visible=dist<NEAR+15;addCols(a);if(dist>FAR&&!S.run&&!S.loaner&&!S.watch)teardown(a)}}
function teardown(a,levelGone){if(S.root){try{if(S.root.parent)S.root.parent.remove(S.root)}catch(_){}for(const r of S.loanRow){try{r.v.userData.dispose&&r.v.userData.dispose()}catch(_){}}}
  dropPeople();if(a&&!levelGone)dropCols(a);S.cols=[];S.loanRow=[];S.peopleTried=false;
  for(const x of GEO)try{x.dispose()}catch(_){}GEO.length=0;S.root=null;S.tree=null;S.boards=null;S.pools=null}
ST.drawn=()=>!!S.root;

/* ================= where you are ================= */
function inStrip(x,z){const d=ST.def();if(!d)return false;const b=d.box;return x>=b.x0&&x<=b.x1&&z>=b.z0-2&&z<=b.z1}
ST.inStrip=inStrip;
const near=(a,p,r)=>Math.hypot(a.P.pos.x-p.x,a.P.pos.z-p.z)<r;
/* the gun rule: no gun comes out on the strip property (same answer style as Maple and the family rule); HT.Base.line is what frDraw asks */
(function gunRule(){const Bs=B();if(!Bs||!Bs.line){setTimeout(gunRule,50);return}if(Bs.line._strip)return;const line0=Bs.line;
  Bs.line=(k,x,z)=>{if(k!=='left'&&inStrip(x,z))return pick(LINES.guns);return line0(k,x,z)};Bs.line._strip=true})();

/* ================= menus (keyboard, mouse, controller through HT.Pad.modal) ================= */
const CSS=`.ht-dr{position:fixed;inset:0;z-index:41;display:flex;align-items:center;justify-content:center;background:rgba(6,9,12,.82);font-family:"Barlow","Arial Narrow",Arial,sans-serif;color:#eef2f2}
.ht-dr .box{width:min(760px,94vw);max-height:90vh;overflow:auto;background:#12171b;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08)}
.ht-dr h2{margin:0;padding:14px 18px 10px;background:#1e2c46;color:#f3efe3;font-size:24px;letter-spacing:.05em;display:flex;justify-content:space-between;align-items:baseline}
.ht-dr h2 small{font-size:13px;opacity:.8;letter-spacing:.08em}.ht-dr .sub{padding:8px 18px 4px;font-size:14px;opacity:.8}
.ht-dr .it{display:flex;gap:12px;align-items:center;margin:6px 12px;padding:9px 12px;border-radius:9px;background:rgba(255,255,255,.04);border:2px solid transparent;cursor:pointer}
.ht-dr .it.on{border-color:#ffd34a;background:rgba(70,60,20,.55)}.ht-dr .it.off{opacity:.45}
.ht-dr .it .n{width:22px;opacity:.6;font-weight:700}.ht-dr .it .m{flex:1}.ht-dr .it b{font-size:17px}.ht-dr .it .s{font-size:13px;opacity:.75;margin-top:2px}
.ht-dr .it .r{text-align:right;font-size:14px;white-space:nowrap}.ht-dr .tag{display:inline-block;padding:1px 6px;border-radius:5px;background:#2c4e8a;font-size:11px;margin-left:6px;letter-spacing:.06em;vertical-align:2px}
.ht-dr .tag.g{background:#2f7a46}.ht-dr .tag.y{background:#8a6a12}.ht-dr .tag.r{background:#8a2a22}
.ht-dr .foot{padding:10px 18px 14px;font-size:13px;opacity:.75;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.ht-dr table{width:calc(100% - 36px);margin:6px 18px;border-collapse:collapse;font-size:14px}.ht-dr td{padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.07)}.ht-dr td.v{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.ht-dr .dl{color:#7fdc6e}.ht-dr .dl.bad{color:#ff8a6b}.ht-dr .cash{color:#9fe58a}
.ht-drhud{position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:30;display:flex;gap:14px;align-items:flex-end;pointer-events:none;font-family:"Barlow","Arial Narrow",Arial,sans-serif;color:#f2f2ee;text-shadow:0 1px 2px #000}
.ht-drhud .tree{background:#0c0e10;border-radius:8px;padding:6px 7px;display:grid;grid-template-columns:repeat(2,18px);gap:4px;box-shadow:0 4px 18px rgba(0,0,0,.5)}
.ht-drhud .b{width:18px;height:18px;border-radius:50%;background:#2a2a2a}.ht-drhud .b.sm{height:9px;border-radius:5px}
.ht-drhud .panel{background:rgba(10,14,18,.78);border-radius:10px;padding:8px 12px;min-width:300px}
.ht-drhud .tach{position:relative;height:16px;border-radius:8px;background:#23292e;overflow:hidden;margin:4px 0}.ht-drhud .tach i{position:absolute;top:0;bottom:0;background:rgba(80,220,110,.45)}
.ht-drhud .tach u{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(90deg,#4aa3ff,#ffb020 70%,#ff4a3a);text-decoration:none}
.ht-drhud .row{display:flex;justify-content:space-between;gap:14px;font-size:15px}.ht-drhud .big{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
.ht-drhud .tip{font-size:14px;opacity:.9;margin-top:4px}`;
function css(){if(document.getElementById('ht-dr-css'))return;const s=document.createElement('style');s.id='ht-dr-css';s.textContent=CSS;document.head.appendChild(s)}
function hint(extra){if(pad()){const b=HT.Pad.btn;return'D-pad to choose · '+b('A')+' picks · '+b('B')+' back'+(extra?' · '+extra:'')}return'↑ ↓ or 1-9 to choose · '+kl('use')+' / Enter picks · Esc closes'+(extra?' · '+extra:'')}
/* items: [{label, sub, right, tags:[[text,cls]], off (reason), act}] */
function menu(o){closeMenu();css();const d=document.createElement('div');d.className='ht-dr';d.dataset.menu=o.id||'';
  const its=o.items.map((it,i)=>`<div class="it${it.off?' off':''}" data-i="${i}"><div class="n">${i<9?i+1:''}</div><div class="m"><b>${esc(it.label)}</b>${(it.tags||[]).map(t=>`<span class="tag ${t[1]||''}">${esc(t[0])}</span>`).join('')}${it.sub?`<div class="s">${it.html?it.sub:esc(it.sub)}</div>`:''}${it.off?`<div class="s" style="color:#ff9a7a">${esc(it.off)}</div>`:''}</div>${it.right!=null?`<div class="r">${it.html?it.right:esc(it.right)}</div>`:''}</div>`).join('');
  d.innerHTML=`<div class="box"><h2>${esc(o.title)}<small>${esc(o.kicker||'SENSIBLE DRAGWAY')}</small></h2>${o.sub?`<div class="sub">${o.subHtml?o.sub:esc(o.sub)}</div>`:''}${o.html||''}${its}<div class="foot"><span>${esc(hint(o.hint))}</span><span>${o.foot?esc(o.foot):''}</span></div></div>`;
  document.body.appendChild(d);const M=S.menu={el:d,o,i:0,cards:[...d.querySelectorAll('.it')]};
  const sel=i=>{const n=o.items.length;if(!n)return;M.i=(i+n)%n;M.cards.forEach((c,j)=>c.classList.toggle('on',j===M.i));try{M.cards[M.i].scrollIntoView({block:'nearest'})}catch(_){}};sel(o.start||0);
  const take=()=>{const it=o.items[M.i];if(!it)return;if(it.off){beep(220,.12);return}beep(880,.05);it.act()};
  M.cards.forEach((c,j)=>{c.onmouseenter=()=>sel(j);c.onclick=()=>{sel(j);take()}});
  const back=()=>{beep(440,.05);if(o.back)o.back();else closeMenu()};
  M.key=e=>{if(S.menu!==M)return;const k=e.key;e.stopImmediatePropagation();e.preventDefault();if(e.repeat&&!/Arrow/.test(k))return;
    if(k==='ArrowDown'||k==='s'||k==='S'||k==='ArrowRight')sel(M.i+1);else if(k==='ArrowUp'||k==='w'||k==='W'||k==='ArrowLeft')sel(M.i-1);
    else if(/^[1-9]$/.test(k)&&+k<=o.items.length){sel(+k-1);take()}else if(k==='Enter'||k==='e'||k==='E'||k===' ')take();else if(k==='Escape'||k==='Backspace')back()};
  M.keyup=e=>{if(S.menu===M)e.stopImmediatePropagation()};document.addEventListener('keydown',M.key,true);document.addEventListener('keyup',M.keyup,true);
  if(HT.Pad&&HT.Pad.modal)M.unpad=HT.Pad.modal({move:(dx,dy)=>sel(M.i+(dy||dx)),ok:take,back});
  try{const a=A();for(const kk in a.keys)a.keys[kk]=false}catch(_){}return M}
function closeMenu(){const M=S.menu;if(!M)return;S.menu=null;if(M.unpad)M.unpad();document.removeEventListener('keydown',M.key,true);document.removeEventListener('keyup',M.keyup,true);M.el.remove()}
function beep(f,d){const Au=AU();try{if(Au&&Au.tone)Au.tone({f,type:'square',d:d||.08,gain:.08,bus:'ui'})}catch(_){}}
ST.menu=()=>S.menu?{open:true,id:S.menu.o.id,i:S.menu.i,items:S.menu.o.items.map(x=>x.label)}:{open:false};

/* ================= the cars: numbers for the picker ================= */
const HP=kw=>Math.round(kw*1.341);
function carLine(sp){const g=sp.vg.length;return HP(sp.kw)+' hp · '+Math.round(sp.mass*2.2046).toLocaleString('en-US')+' lb · '+sp.drive+' · '+g+'-speed · top '+Math.round(sp.vg[g-1]*D().MPH)+' mph'}
function bookOf(t){const s=sv();return s&&s.book[t]||null}
function ownType(a){try{return a.VAN.obj&&a.VAN.obj.userData.type||'minivan'}catch(_){return'minivan'}}
function ownVeh(a){try{const g=a.SV().garage;return g&&g.vehicles&&g.vehicles[ownType(a)]||null}catch(_){return null}}
const FEEL_MOWER={label:'ride-on mower',seats:1,bed:0,max:9,boostMax:11,acc:5.2,boostAcc:6.4,brake:13,hbrake:11,turn:2.4,steerResp:11,grip:7,roll:.55,cam:[4.4,1.15],eng:1.9,gears:1,horn:'short',door:'close',rear:1,torque:0};

/* ================= the loaner ================= */
function spawnLoaner(a,type,x,z,yaw){dropLoaner(a,true);if(type==='mower'&&a.CAR_FEEL&&!a.CAR_FEEL.mower)try{a.carFeel('mower',FEEL_MOWER,[[-.42,.8,0]])}catch(_){}
  let v=null;try{v=a.makeVehicle(type,LOAN_COL[type]||'#888')}catch(_){v=null}if(!v)return null;v.position.set(x,0,z);a.L.group.add(v);const e=a.registerCar(v,x,z);if(!e){a.L.group.remove(v);return null}
  e.type=type;e.name='the strip';e.owner='strip';e.loaner="The loaner doesn't fast travel. It stays at the strip. Hand it back at the paddock first.";e.yaw=yaw;e.home={x,z,yaw};e.stripLoaner=true;
  try{a.owStopCar(e)}catch(_){}a.syncCar(e);S.loaner=e;return e}
function dropLoaner(a,quiet){const e=S.loaner;if(!e)return;S.loaner=null;const L=a&&a.L;try{if(a.CV===e){e.fly=false;e.noExit=false;a.exitCar()}}catch(_){}
  if(L){const k=L.cars?L.cars.indexOf(e):-1;if(k>=0)L.cars.splice(k,1);if(e.col){const ci=L.colliders.indexOf(e.col);if(ci>=(L.nStatic||0)&&ci>=0)L.colliders.splice(ci,1);else Object.assign(e.col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,ob:null})}
    if(L.solids){const ms=new Set();e.obj.traverse(o=>{if(o.isMesh)ms.add(o)});for(let i=L.solids.length-1;i>=0;i--)if(ms.has(L.solids[i]))L.solids.splice(i,1)}}
  try{if(e.obj.parent)e.obj.parent.remove(e.obj);e.obj.userData.dispose&&e.obj.userData.dispose()}catch(_){}if(!quiet)say(NAMES.office,pick(LINES.back))}
/* put a car at the line (front on the stage beam), or behind it for the roll in */
function placeCar(a,e,lane,back){const d=ST.def(),len=a.carSize(e).l;e.pos.set(d.start+len/2+(back||0),0,d.laneZ[lane]);e.yaw=d.yaw;try{a.owStopCar(e)}catch(_){}e.spd=0;a.syncCar(e);
  if(a.CV===e){a.P.pos.set(e.pos.x,0,e.pos.z);a.P.yaw=e.yaw}}
function walkTo(a,p,yaw){a.P.pos.set(p.x,0,p.z);if(yaw!=null)a.P.yaw=yaw}

/* ================= TEST & TUNE: the picker ================= */
function openPicker(a){const s=sv(),types=D().types(),own=ownType(a);
  const items=types.map(t=>{const sp=D().spec(t),b=bookOf(t),tags=[];if(t===own)tags.push(['YOURS','g']);if(sp.cls==='mower')tags.push(['TURF CLASS','y']);
    return{label:sp.name,tags,sub:carLine(sp),right:b&&b.best?'best '+b.best.et.toFixed(3)+' s · '+b.best.mph.toFixed(1)+' mph':'no passes yet',act:()=>{closeMenu();startTune(a,t)}}});
  menu({id:'picker',title:'TEST & TUNE',kicker:'PADDOCK · FREE',sub:'Any car in town, no charge. A loaner at the line, as many passes as you like, a timeslip after each. Your best in every car goes in the garage book.',items,foot:'Loaners stay at the strip'})}
function startTune(a,type){const d=ST.def();if(a.CV&&a.CV!==S.loaner)try{a.exitCar()}catch(_){}
  const e=spawnLoaner(a,type,d.start+8,d.laneZ[0],d.yaw);if(!e){feed('The loaner would not start. Try another one.','bad');return}
  a.enterCar(e);say(NAMES.office,pick(LINES.loaner));newRun(a,{mode:'tune',e,lane:0,type})}

/* ================= a pass / a race ================= */
const TREE={a:.5,green:1.5};/* a full ("sportsman") tree: three ambers half a second apart, green half a second after the last */
function newRun(a,o){const d=ST.def(),e=o.e,lane=o.lane||0;const sp=o.spec||D().spec(o.type||e.type,o.veh||null);
  const R={mode:o.mode,phase:'roll',t:0,e,lane,type:o.type||e.type,spec:sp,run:D().run(sp),tree0:null,offs:[0,0],opp:null,dial:o.dial||null,racer:o.racer||null,bet:o.bet||null,
    entry:o.entry||0,rent:o.rent||0,bracket:o.bracket||null,turf:!!o.turf,shutX:null,res:null,lights:[{},{}],noLaunchT:0,said:{}};
  S.run=R;e.fly=true;e.noExit=true;if(!e.stripLoaner)e.loaner='Finish the pass first. Fast travel waits for the slip.';placeCar(a,e,lane,4);/* rolls up from 4 m back */
  if(o.racer){const r=o.racer,osp=D().spec(r.car);R.opp={racer:r,spec:osp,lane:1-lane,ctl:null,model:oppModel(a,r,1-lane,osp),x:0,v:0,done:false}}
  if(R.dial){/* bracket: the quicker dial waits the difference */const dm=R.dial[0],do_=R.dial[1];R.offs[lane]=Math.max(0,do_-dm);R.offs[1-lane]=Math.max(0,dm-do_)}
  boardsSet([null,null]);hudOn(a);ST.lastRun=null}
ST.run=()=>S.run;
/* the other lane's car: a parked-detail model moved by the race model */
const RCOL={gus:'#2e7d3a',marisol:'#d9d2c0',walt:'#8a2f2a',priya:'#b9c0c7',dutch:'#f2f2ee',tomas:'#2e4a6b',june:'#5c3a6e',rook:'#141414'};
function oppModel(a,r,lane,sp){let v=null;try{v=HT.Vehicles.make(r.car,{color:RCOL[r.id]||'#888',lod:1})}catch(_){v=null}if(!v)return null;
  v.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.noBatch=true}});(S.root||a.L.group).add(v);return v}
function dropOpp(R){if(R&&R.opp&&R.opp.model){const v=R.opp.model;try{if(v.parent)v.parent.remove(v);v.userData.dispose&&v.userData.dispose()}catch(_){}R.opp.model=null}}
/* what the dad is pressing: throttle (Move forward, or the pad's RT, analog) and the brake (Jump / handbrake, Move back, or the pad's A / LT) */
function input(a){const k=a.keys||{},st=HT.Input&&HT.Input.stick;let thr=(k.w||k.arrowup)?1:0,brake=!!(k[' ']||k.s||k.arrowdown);
  if(st&&st.id==='pad'){thr=Math.max(thr,clamp(-st.y,0,1));if(st.y>.3)brake=true}
  return{thr,brake}}
function carLen(a,e){try{return a.carSize(e).l}catch(_){return 4.6}}
/* per frame */
function runTick(a,dt){const R=S.run;if(!R)return;const d=ST.def(),e=R.e;R.t+=dt;
  if(a.CV!==e){/* got out somehow (or the car went away): the pass is off */endRun(a,'abort');return}
  const L=carLen(a,e),me=R.run,inp=input(a);
  if(R.phase==='roll'){/* creep up to the beams: pre-stage, then stage */const k=clamp(R.t/1.6,0,1),back=4*(1-k*k*(3-2*k));placeCar(a,e,R.lane,back);me.rpm+=(.12-me.rpm)*Math.min(1,dt*3);
    if(R.opp&&R.opp.model)posOpp(a,R,back,0);R.lights=[{pre:k>.5,stage:k>=1},{pre:k>.5,stage:k>=1}];if(!R.opp)R.lights[1-R.lane]={};
    if(k>=1){R.phase='staged';R.t=0}}
  else if(R.phase==='staged'){D().step(me,{thr:inp.thr,brake:true},dt);/* revving against the brake; the tree starts on its own */
    if(R.t>(R.mode==='tune'?(inp.brake&&inp.thr>0?.6:2.6):1.4)){R.phase='tree';R.t=0;me.t=0;me.green=TREE.green+R.offs[R.lane];
      if(R.opp){const o=R.opp;o.ctl=D().ai(o.spec,o.racer.d,Math.random,{greenAt:TREE.green+R.offs[o.lane]})}}}
  else if(R.phase==='tree'||R.phase==='go'){
    if(!me.done)D().step(me,{thr:inp.thr,brake:me.launched?false:inp.brake},dt);else shut(R,me,dt,L);
    if(R.opp){const o=R.opp,c=o.ctl;if(!c.R.done)c.tick(dt);else shut(R,c.R,dt,carLen(a,{obj:o.model}))}
    /* the tree, per lane */
    for(let ln=0;ln<2;ln++){const rr=ln===R.lane?me:R.opp?R.opp.ctl.R:null;if(!rr){R.lights[ln]={};continue}const g=TREE.green+R.offs[ln],t=R.t;
      const red=rr.leave!=null&&rr.leave<g;R.lights[ln]={pre:rr.x<.6,stage:rr.leave==null,a1:t>=g-1.5&&t<g&&!red,a2:t>=g-1&&t<g&&!red,a3:t>=g-.5&&t<g&&!red,green:t>=g&&!red,red}}
    if(R.phase==='tree'&&R.t>=TREE.green)R.phase='go';
    if(me.launched&&!R.said.red&&me.leave!=null&&me.leave<me.green){R.said.red=1;beep(180,.4)}
    if(!me.launched&&R.t>me.green+8){endRun(a,'asleep');return}
    const done=me.done&&me.v<.6&&(!R.opp||R.opp.ctl.R.done&&R.opp.ctl.R.v<.6||R.t>me.split.et+6);
    if(done){finishRun(a);return}}
  /* the car: the race model's distance along the lane, a wiggle when the tyres spin */
  if(R.phase!=='roll'){const z=d.laneZ[R.lane]+(me.spin>.15&&me.v>.5?Math.sin(R.t*11)*.12*me.spin:0);e.pos.set(d.start+L/2-me.x,0,z);e.yaw=d.yaw;e.spd=me.v;
    if(R.opp&&R.opp.ctl)posOpp(a,R,-R.opp.ctl.R.x,R.opp.ctl.R.v,dt)}
  /* smoke and a chirp when the tyres light up */
  if(me.spin>.25&&me.v>.3){R.smokeT=(R.smokeT||0)-dt;if(R.smokeT<=0){R.smokeT=.06;try{const FX=HT.FX,f=new THREE.Vector3(-1,0,0);for(const s of[-1,1]){const p=new THREE.Vector3(e.pos.x+L*.3,0,e.pos.z+s*.8);FX.skid&&FX.skid(p,f,Math.min(1,me.spin))}}catch(_){}}}
  treeSet(R.lights)}
/* off: metres behind the line (+) or past it (-) */
function posOpp(a,R,off,v,dt){const m=R.opp&&R.opp.model;if(!m)return;placeModel(m,R.opp.lane,off,v,dt)}
function placeModel(m,lane,off,v,dt){const d=ST.def(),L=(m.userData.size&&m.userData.size.l)||4.6;m.position.set(d.start+L/2+off,0,d.laneZ[lane]);m.rotation.y=Math.PI;/* front (+X) faces west */
  try{HT.Vehicles.update(m,{speed:v||0,steer:0,braking:false,dt:dt||1/60})}catch(_){}}
/* past the finish: lift and brake to a stop before the sand (the strip's shutdown is ~50 m) */
function shut(R,r,dt,L){if(r.v<=0)return;const d=ST.def(),front=d.start-r.x,room=Math.max(3,front-(d.shut.x+2)),dec=Math.max(7,r.v*r.v/(2*room));r.v=Math.max(0,r.v-dec*dt);r.x+=r.v*dt}

/* ================= results ================= */
function finishRun(a){const R=S.run,me=R.run,sl=D().slip(me);R.phase='done';const s=sv();
  if(!sl||sl.et==null){endRun(a,'dnf');return}
  /* the book, the history (for the odds), the stats */
  if(s){s.stats.passes++;if(sl.red)s.stats.reds++;if(sl.rt!=null&&sl.rt>=0&&(s.stats.bestRt==null||sl.rt<s.stats.bestRt))s.stats.bestRt=sl.rt;if(sl.rt!=null&&sl.rt>=0&&sl.rt<=.05)s.stats.perfect=true;
    s.hist.push({rt:sl.rt,launchQ:sl.launchQ,type:R.type});if(s.hist.length>20)s.hist.splice(0,s.hist.length-20);
    const key=R.type+(R.spec.up&&(R.spec.up.engine||R.spec.up.tyres)?'+':'');const b=s.book[key]||(s.book[key]={best:null,n:0,last:null});b.n++;b.last=slim(sl);
    sl.prevBest=b.best?b.best.et:null;if(!sl.red&&(!b.best||sl.et<b.best.et)){b.best=slim(sl);sl.newBest=true}}
  let res=null;
  if(R.opp){const o=R.opp,osl=D().slip(o.ctl.R),l0=R.lane===0;res=D().judge(l0?[me,o.ctl.R]:[o.ctl.R,me],l0?[sl,osl]:[osl,sl],R.dial?(l0?R.dial:[R.dial[1],R.dial[0]]):null);
    res.me=R.lane;res.won=res.win===R.lane;res.oppSlip=osl}
  /* the boards */
  const lanes=[null,null];lanes[R.lane]={name:'You',et:sl.et,mph:sl.mph,rt:sl.rt,red:sl.red,win:res?res.won:false,margin:res&&res.won&&res.margin!=null?'by '+res.margin.toFixed(3):''};
  if(R.opp){const o=R.opp,x=res.oppSlip||{};lanes[o.lane]={name:o.racer.name,et:x.et,mph:x.mph,rt:x.rt,red:x.red,win:!res.won,margin:!res.won&&res.margin!=null?'by '+res.margin.toFixed(3):''}}
  boardsSet(lanes);
  if(sl.red&&!R.said.redL){say(NAMES.starter,pick(LINES.red),true)}else if(sl.rt!=null&&sl.rt>=0&&sl.rt<=.05)say(NAMES.starter,pick(LINES.perfect),true);
  R.res=res;R.slip=sl;ST.lastRun={mode:R.mode,type:R.type,slip:sl,res:res&&{won:res.won,how:res.how,margin:res.margin,red:res.red}};
  const money=R.opp?settleRace(a,R,res,sl):null;R.money=money;
  if(ST.lastRun)ST.lastRun.money=money;
  persist();hudOff();showSlip(a,R,sl,res,money)}
const slim=sl=>({rt:sl.rt,t60:sl.t60,t330:sl.t330,et:sl.et,mph:sl.mph,et14:sl.et14,mph14:sl.mph14,day:dayN()});
/* the pass is over without a slip (got out, fell asleep at the tree, a reset) */
function freeCar(e){if(!e)return;e.fly=false;e.noExit=false;if(!e.stripLoaner)delete e.loaner}
function endRun(a,why){const R=S.run;if(!R)return;S.run=null;dropOpp(R);hudOff();treeSet([{},{}]);const e=R.e;freeCar(e)
  if(why==='asleep')feed('The tree went green a while ago. The tower would like the lane back.','info');
  if(why==='dnf')feed('No time on that one.','info');
  if(R.bracket&&why!=='quiet')feed('Bracket night: that counts as a loss in round '+R.bracket.round+'. Entry refunded.','info');
  if(e&&e.stripLoaner&&why!=='keep'){dropLoaner(a,why==='quiet');if(why!=='quiet')walkTo(a,ST.def().paddockBoard,0)}}

/* ================= money (HT.Drag.ECON; docs/dragstrip.md): settled only when a race is over, so a quit mid-race changes nothing ================= */
function settleRace(a,R,res,sl){const E=D().ECON,s=sv(),Dd=D().day(s,dayN()),r=R.racer,lines=[];let net=0;const add=(l,n)=>{if(!n)return;lines.push([l,n]);net+=n};
  s.stats.races++;if(res.won)s.stats.wins++;
  if(R.bracket){const b=R.bracket;if(res.won&&b.round<b.field.length){lines.push(['Round '+b.round+' won · round '+(b.round+1)+' next',0]);return{lines,net:0,next:true}}
    const champ=res.won,runner=!res.won&&b.round===b.field.length;add('Bracket entry',-E.bracket.entry);if(b.c.rent)add('Rental',-b.c.rent);
    if(champ){const p=D().capPurse(Dd,E.bracket.win);add('Bracket night · winner',p);if(p<E.bracket.win)lines.push(['Daily cap reached ($'+E.dayCap+')',0]);s.bracket.won++}
    else if(runner){const p=D().capPurse(Dd,E.bracket.runner);add('Bracket night · runner-up',p)}
    s.bracket.lastDay=dayN();b.over=true}
  else{const turf=R.turf,entry=turf?E.turf.entry:E.entry;
    if(R.rent)add('Rental',-R.rent);
    if(res.won){const first=!s.ladder.beaten[r.id];const n=Dd.beat[r.id]|0;const want=turf?E.turf.purse:D().purse(r,n);const p=D().capPurse(Dd,want);Dd.beat[r.id]=n+1;
      add('Purse'+(n?' (repeat win × '+(n+1)+' today)':''),p);if(p<want)lines.push(['Daily cap reached · $'+E.dayCap+' a day from the strip',0]);
      if(first){const bonus=turf?E.turf.first:E.firstWin[clamp(r.tier-1,0,E.firstWin.length-1)];s.ladder.beaten[r.id]=true;add('First win over '+r.name,bonus)}
      s.ladder.wins[r.id]=(s.ladder.wins[r.id]|0)+1}
    else add('Entry',-entry)}
  if(R.bet&&R.bet.stake){const w=res.won;const n=D().settle(Dd,R.bet.stake,R.bet.mult,w);add(w?'Your bet on yourself · '+R.bet.mult.toFixed(2)+'x':'Your bet on yourself',n);s.stats.bets++}
  if(net)addCash(net,'strip');return{lines,net}}

/* ================= the timeslip ================= */
const f3=x=>x==null?'—':(x<0?'-':'')+Math.abs(x).toFixed(3).replace(/^0\./,'.');
function slipHtml(R,sl,res,money){const s=sv(),key=R.type+(R.spec.up&&(R.spec.up.engine||R.spec.up.tyres)?'+':''),book=s?s.book:{};
  const dlt=(v,b)=>b==null||v==null?'':`<span class="dl${v>b?' bad':''}">${v<=b?'▼ ':'▲ '}${Math.abs(v-b).toFixed(3)}</span>`;const bb=sl.prevBest;
  const rows=[['Reaction time',f3(sl.rt)+(sl.red?' <b style="color:#ff6a4a">RED</b>':sl.rt!=null&&sl.rt<=.05&&sl.rt>=0?' <b style="color:#7fdc6e">PERFECT</b>':'')],['60 ft',f3(sl.t60)],['330 ft',f3(sl.t330)],
    ['1/8 mile ET',f3(sl.et)+' '+(bb!=null?dlt(sl.et,bb):'')],['1/8 mile speed',sl.mph.toFixed(2)+' mph'],['1/4 mile (est.)',sl.et14.toFixed(2)+' s · '+sl.mph14.toFixed(1)+' mph'],
    ['Launch',sl.launchQ>=.95&&sl.spin<.3?'clean':sl.spin>.6?'wheelspin ('+Math.round(sl.spin*100)+'%)':sl.launchQ<.7?'bogged':'a little spin']];
  let h='<table>'+rows.map(r=>`<tr><td>${r[0]}</td><td class="v">${r[1]}</td></tr>`).join('')+'</table>';
  if(res){const how=res.how==='red'?(res.red[res.me]?'You red-lit':'They red-lit'):res.how==='breakout'?'Breakout':'';
    h=`<div class="sub" style="font-size:20px"><b style="color:${res.won?'#7fdc6e':'#ff8a6b'}">${res.won?'WIN':'LOSS'}</b> vs ${esc(R.racer.name)} · ${esc(D().spec(R.racer.car).name)}${how?' · '+how:''}${res.margin!=null&&res.how==='finish'?' · by '+res.margin.toFixed(3)+' s ('+res.marginM.toFixed(1)+' m)':''}</div>`+h;
    const o=res.oppSlip;if(o)h+=`<div class="sub">${esc(R.racer.name)}: R/T ${f3(o.rt)}${o.red?' RED':''} · ${f3(o.et)} s @ ${o.mph!=null?o.mph.toFixed(1):'—'} mph</div>`}
  else h=`<div class="sub">${esc(R.spec.name)}${R.spec.up?' (your upgrades)':''} · ${sl.newBest?'<b style="color:#7fdc6e">New best in this car.</b>':bb!=null?'Your best in this car: '+f3(bb)+' s':''}</div>`+h;
  if(money&&money.lines.length)h+='<table>'+money.lines.map(([l,n])=>`<tr><td>${esc(l)}</td><td class="v ${n>0?'cash':n<0?'dl bad':''}">${n?money0(n):''}</td></tr>`).join('')+(money.net?`<tr><td><b>Net</b></td><td class="v ${money.net>0?'cash':'dl bad'}">${money0(money.net)}</td></tr>`:'')+'</table>';
  /* the garage book: best per car, quickest first */
  const all=Object.entries(book).filter(([k,b])=>b&&b.best).sort((x,y)=>x[1].best.et-y[1].best.et);
  if(all.length>1||!res){h+='<div class="sub" style="text-transform:uppercase;letter-spacing:.08em;font-size:12px">Garage book · your best slip in each car</div><table>'+all.slice(0,9).map(([k,b],i)=>{const t=k.replace('+',''),nm=(D().SPEC[t]||{}).name||t;
    return`<tr style="${k===key?'color:#ffd34a;font-weight:700':''}"><td>${i+1}. ${esc(nm)}${k.endsWith('+')?' (upgraded)':''}</td><td class="v">${f3(b.best.et)} s · ${b.best.mph.toFixed(1)} mph</td><td class="v" style="opacity:.7">${b.n} pass${b.n>1?'es':''}</td></tr>`}).join('')+'</table>'}
  return h}
const money0=n=>(n>0?'+':'-')+'$'+Math.abs(n);
function showSlip(a,R,sl,res,money){const items=[];
  if(R.mode==='tune'){items.push({label:'Run it again',sub:'Same car, back to the line',act:()=>{closeMenu();again(a,R)}});items.push({label:'Change car',sub:'Back to the paddock board',act:()=>{closeMenu();S.run=null;dropLoaner(a,true);openPicker(a)}});
    items.push({label:'Done',sub:'Hand the loaner back',act:()=>{closeMenu();doneRun(a,R)}})}
  else if(money&&money.next){items.push({label:'Next round',sub:'Round '+(R.bracket.round+1)+' of '+R.bracket.field.length+' · '+R.bracket.field[R.bracket.round].name,act:()=>{closeMenu();nextRound(a,R)}})}
  else items.push({label:'Done',sub:R.e===a.VAN?'Park in the paddock':'Hand the car back',act:()=>{closeMenu();doneRun(a,R)}});
  menu({id:'slip',title:R.opp?(R.bracket?'BRACKET NIGHT · ROUND '+R.bracket.round:'HEADS-UP'):'TIMESLIP',kicker:'SENSIBLE DRAGWAY · 1/8 MILE',html:slipHtml(R,sl,res,money),items,back:()=>{closeMenu();R.mode==='tune'?doneRun(a,R):items[0].act()}})}
function again(a,R){S.run=null;newRun(a,{mode:'tune',e:R.e,lane:0,type:R.type,spec:R.spec})}
function doneRun(a,R){S.run=null;dropOpp(R);const d=ST.def(),e=R.e;freeCar(e)
  if(e&&e.stripLoaner){dropLoaner(a);walkTo(a,R.mode==='tune'?{x:d.paddockBoard.x,z:d.paddockBoard.z+1.4}:{x:d.booth.x-1.6,z:d.booth.z},R.mode==='tune'?Math.PI:Math.PI/2)}
  else if(e){e.pos.set(d.park.x,0,d.park.z);e.yaw=d.park.yaw;try{a.owStopCar(e)}catch(_){}a.syncCar(e);a.P.pos.set(e.pos.x,0,e.pos.z)}
  treeSet([{},{}])}
ST.closeCard=()=>{if(S.menu)closeMenu()};

/* ================= THE RACE OFFICE ================= */
function today(){const s=sv();return D().day(s,dayN())}
function bracketDay(){const n=dayN();return n%D().ECON.bracket.every===0}
function openOffice(a){const E=D().ECON,s=sv(),Dd=today(),c=cash();const nextB=dayN()+(E.bracket.every-dayN()%E.bracket.every)%E.bracket.every;
  const bOff=!bracketDay()?'Next bracket night: day '+(nextB===dayN()?nextB+E.bracket.every:nextB)+' (every '+E.bracket.every+' days; days go by as you do jobs)':s.bracket.lastDay===dayN()?'You ran tonight\'s bracket. Next one in '+E.bracket.every+' days.':null;
  menu({id:'office',title:'RACE OFFICE',kicker:'DOLORES · CASH ONLY · NO REFUNDS ON DIGNITY',
    sub:'Today (day '+dayN()+'): strip winnings $'+Dd.won+' of $'+E.dayCap+' · bets +$'+Dd.betWon+' / -$'+Dd.betLost+' (caps +$'+E.bet.winCap+' / -$'+E.bet.lossCap+') · you have '+money(c),
    items:[{label:'Race the ladder',sub:'Heads-up for money · $'+E.entry+' entry · beat each racer once for a bonus',right:Object.keys(s.ladder.beaten).filter(k=>k!=='gus').length+' / '+D().LADDER.length+' beaten',act:()=>openLadder(a)},
      {label:'Bracket night',sub:'Three rounds · dial-ins and handicap starts · $'+E.bracket.entry+' entry · $'+E.bracket.win+' to the winner, $'+E.bracket.runner+' runner-up',off:bOff,tags:bOff?[]:[['TONIGHT','g']],act:()=>openBracket(a)},
      {label:'Turf class · Gus and his mower',sub:'Mowers only · $'+E.turf.entry+' entry · the mower is on the house',tags:s.ladder.beaten.gus?[['BEATEN','g']]:[['+$'+E.turf.first+' FIRST WIN','y']],act:()=>pickCar(a,D().racer('gus'),{turf:true})},
      {label:'Bet on the next race',sub:'Two of the regulars · odds from the tower · watch from the tower camera',act:()=>openBet(a)},
      {label:'The garage book',sub:'Your best slip in every car',act:()=>showBook(a)}]})}
function showBook(a){const s=sv(),all=Object.entries(s.book).filter(([k,b])=>b&&b.best).sort((x,y)=>x[1].best.et-y[1].best.et);
  const h=all.length?'<table>'+all.map(([k,b],i)=>{const t=k.replace('+',''),nm=(D().SPEC[t]||{}).name||t;return`<tr><td>${i+1}. ${esc(nm)}${k.endsWith('+')?' (upgraded)':''}</td><td class="v">R/T ${f3(b.best.rt)}</td><td class="v">${f3(b.best.et)} s</td><td class="v">${b.best.mph.toFixed(1)} mph</td><td class="v" style="opacity:.7">${b.n}</td></tr>`}).join('')+'</table>':'<div class="sub">No passes yet. The paddock board lends you any car, free.</div>';
  menu({id:'book',title:'GARAGE BOOK',html:h+`<div class="sub">Passes ${s.stats.passes} · races ${s.stats.races} (won ${s.stats.wins}) · red lights ${s.stats.reds} · best light ${s.stats.bestRt!=null?f3(s.stats.bestRt):'—'}</div>`,items:[{label:'Back',act:()=>openOffice(a)}],back:()=>openOffice(a)})}
function openLadder(a){const s=sv(),Dd=today(),E=D().ECON,L=D().LADDER.map(D().racer);let open=true;
  const items=L.map((r,i)=>{const beaten=!!s.ladder.beaten[r.id],n=Dd.beat[r.id]|0,locked=!open&&!beaten;if(!beaten)open=false;
    const tags=beaten?[['BEATEN','g']]:[['+$'+E.firstWin[clamp(r.tier-1,0,7)]+' FIRST WIN','y']];
    return{label:r.name,tags,sub:D().spec(r.car).name+' · '+r.bio,right:'purse $'+D().purse(r,n)+(n?' (won '+n+'× today)':''),off:locked?'Beat '+L[i-1].name+' first':null,act:()=>pickCar(a,r,{})}});
  menu({id:'ladder',title:'THE LADDER',sub:'Heads-up, one pass each, first to the stripe wins. A red light loses. Win: your $'+E.entry+' back and the purse. Repeat wins over the same racer pay less each time that day.',items,back:()=>openOffice(a)})}
/* which car: yours (if it's a street car and it's here) or a rental */
function pickCar(a,r,o){const d=ST.def(),E=D().ECON,items=[];const turf=!!o.turf;
  if(turf){items.push({label:'The strip\'s mower',sub:carLine(D().spec('mower')),right:'free',act:()=>pickBet(a,r,{type:'mower',rent:0,turf:true,bracket:o.bracket})})}
  else{const ot=ownType(a),ok=D().CLASSES.street.types.includes(ot),here=inStrip(a.VAN.pos.x,a.VAN.pos.z),sp=D().spec(ot,ownVeh(a));
    items.push({label:'Your '+sp.name,tags:sp.up&&(sp.up.engine||sp.up.tyres)?[['UPGRADED','g']]:[],sub:carLine(sp),right:'no rental',off:!ok?'Not in the street class':!here?'Your car is not at the strip (fast travel brings it)':null,act:()=>pickBet(a,r,{own:true,type:ot,rent:0,bracket:o.bracket})});
    for(const t of D().CLASSES.street.types){const s2=D().spec(t);items.push({label:'Rent: '+s2.name,sub:carLine(s2),right:'$'+E.rent,act:()=>pickBet(a,r,{type:t,rent:E.rent,bracket:o.bracket})})}}
  menu({id:'car',title:o.bracket?'BRACKET NIGHT · YOUR CAR':'RACE '+r.name.toUpperCase(),sub:o.bracket?'One car for all three rounds.':r.name+' runs '+D().spec(r.car).name+'. '+r.bio,items,back:()=>o.bracket?openOffice(a):turf?openOffice(a):openLadder(a)})}
/* a bet on yourself, priced from your own history in that car against him */
function myProfile(){const s=sv();return D().playerProfile(s?s.hist:[])}
function pickBet(a,r,c){const E=D().ECON;if(c.bracket){startBracket(a,c);return}
  const entry=c.turf?E.turf.entry:E.entry,need=entry+c.rent;if(cash()<need){feed("You need "+money(need)+" for that (entry"+(c.rent?' and rental':'')+"). You have "+money(cash())+'.','bad');return}
  const sp=c.own?D().spec(c.type,ownVeh(a)):D().spec(c.type),prof=myProfile();const p=D().winP({spec:sp,driver:prof},{spec:D().spec(r.car),driver:r.d},240,(Math.random()*1e9)|0),m=D().payout(p),Dd=today();
  const left=cash()-need,mx=D().maxStake(left,Dd,m);const items=[{label:'No bet',sub:'Just the race',act:()=>{closeMenu();startRace(a,r,c,null)}}];
  for(const st of[10,25,50,100]){const why=D().canBet(left,Dd,st,m);items.push({label:'Bet $'+st+' on yourself',right:'pays '+m.toFixed(2)+'× · +$'+Math.round(st*(m-1)),off:why,act:()=>{closeMenu();startRace(a,r,c,{stake:st,mult:m,p})}})}
  menu({id:'selfbet',title:'BET ON YOURSELF?',sub:'The tower makes you '+Math.round(p*100)+'% to win ('+(prof.novice?'a new driver: it watches your next few passes':'from your last '+Math.min(12,sv().hist.length)+' passes')+'). Payout '+m.toFixed(2)+'× your stake with an '+Math.round(E.bet.edge*100)+'% house edge. You can stake up to $'+mx+' right now.',items,back:()=>pickCar(a,r,c)})}
function racerIntro(r){say(r.name,r.lines.hello,true)}
function laneCar(a,c){const d=ST.def();if(c.own){const e=a.VAN;if(a.CV&&a.CV!==e)try{a.exitCar()}catch(_){}dropLoaner(a,true);if(a.CV!==e){placeCar(a,e,0,4);a.enterCar(e)}return e}
  if(a.CV&&a.CV!==S.loaner)try{a.exitCar()}catch(_){}const e=spawnLoaner(a,c.type,d.start+8,d.laneZ[0],d.yaw);if(e)a.enterCar(e);return e}
function startRace(a,r,c,bet){const e=laneCar(a,c);if(!e){feed('That car would not start.','bad');return}racerIntro(r);
  newRun(a,{mode:'race',e,lane:0,type:c.type,veh:c.own?ownVeh(a):null,racer:r,bet,rent:c.rent,turf:!!c.turf,entry:c.turf?D().ECON.turf.entry:D().ECON.entry})}
/* bracket night: three ladder racers, dial-ins from their own typical runs and your best in that car */
function openBracket(a){const E=D().ECON;if(cash()<E.bracket.entry){feed('Bracket entry is '+money(E.bracket.entry)+'. You have '+money(cash())+'.','bad');return}pickCar(a,null,{bracket:true})}
function dialFor(sp,drv,n){const rnd=D().rng(4242);let t=0;for(let i=0;i<n;i++)t+=D().slip(D().sim(sp,drv,rnd)).et;return Math.round((t/n+.04)*100)/100}
function startBracket(a,c){const E=D().ECON;if(cash()<E.bracket.entry+c.rent){feed('Bracket entry and rental come to '+money(E.bracket.entry+c.rent)+'.','bad');return}closeMenu();
  const s=sv(),pool=D().LADDER.map(D().racer),k=Object.keys(s.ladder.beaten).length;const lo=clamp(k-2,0,pool.length-3);
  const field=pool.slice(lo,lo+5).sort(()=>Math.random()-.5).slice(0,3).sort((x,y)=>x.tier-y.tier);
  const sp=c.own?D().spec(c.type,ownVeh(a)):D().spec(c.type),key=c.type+(sp.up&&(sp.up.engine||sp.up.tyres)?'+':''),b=s.book[key];
  const myDial=b&&b.best?Math.round((b.best.et+.05)*100)/100:dialFor(sp,{rt:.3,rtSd:0,redP:0,launchQ:.6,missP:0},4)+.1;
  feed('Bracket night: your dial-in is '+myDial.toFixed(2)+' s'+(b&&b.best?' (your best in this car + .05)':' (no book time in this car: the tower guessed)')+'. Run quicker than your dial and you break out.','info');
  const br={field,round:1,dial:myDial,c};const e=laneCar(a,c);if(!e)return;bracketRound(a,br,e)}
function bracketRound(a,br,e){const r=br.field[br.round-1];racerIntro(r);const od=dialFor(D().spec(r.car),r.d,6);
  newRun(a,{mode:'bracket',e,lane:0,type:br.c.type,veh:br.c.own?ownVeh(a):null,racer:r,rent:br.round===1?br.c.rent:0,bracket:br,dial:[br.dial,od]});
  feed('Round '+br.round+': you '+br.dial.toFixed(2)+' · '+r.name+' '+od.toFixed(2)+'. '+(br.dial>od?'You leave first.':'They leave first.'),'info')}
function nextRound(a,R){const br=R.bracket;br.round++;S.run=null;dropOpp(R);bracketRound(a,br,R.e)}

/* ================= BETS ON OTHER RACES (the tower camera) ================= */
function matchup(){const L=D().LADDER.map(D().racer);let i=Math.floor(Math.random()*L.length),j=Math.floor(Math.random()*(L.length-1));if(j>=i)j++;return[L[i],L[j]]}
function openBet(a,m){m=m||S.nextMatch||(S.nextMatch=matchup());const[x,y]=m,E=D().ECON,Dd=today();
  const p=D().winP({spec:D().spec(x.car),driver:x.d},{spec:D().spec(y.car),driver:y.d},500,(m.seed=m.seed||((Math.random()*1e9)|0)));const mx=D().payout(p),my=D().payout(1-p);
  const side=(r,mult,pp,lane)=>({label:'Back '+r.name,tags:[[D().spec(r.car).name.toUpperCase(),'']],sub:(lane?'Left':'Right')+' lane · the tower makes it '+Math.round(pp*100)+'%',right:'pays '+mult.toFixed(2)+'×',act:()=>stakeMenu(a,m,lane,mult,pp)});
  menu({id:'bet',title:'BET ON THE NEXT RACE',sub:x.name+' vs '+y.name+'. Payouts come from the tower\'s numbers (the same model that runs the race) less an '+Math.round(E.bet.edge*100)+'% house edge. $'+E.bet.min+'-$'+E.bet.max+' a bet; today +$'+Dd.betWon+' / -$'+Dd.betLost+' of +$'+E.bet.winCap+' / -$'+E.bet.lossCap+'. The booth never takes you under $'+E.bet.floor+'.',
    items:[side(x,mx,p,0),side(y,my,1-p,1),{label:'Just watch',sub:'No money on it',act:()=>{closeMenu();startWatch(a,m,null)}},{label:'Different race',sub:'Two other regulars',act:()=>{S.nextMatch=matchup();openBet(a)}}],back:()=>openOffice(a)})}
function stakeMenu(a,m,lane,mult,p){const Dd=today(),c=cash(),items=[];
  for(const st of[10,25,50,100]){const why=D().canBet(c,Dd,st,mult);items.push({label:'$'+st,right:'wins +$'+Math.round(st*(mult-1)),off:why,act:()=>{closeMenu();startWatch(a,m,{lane,stake:st,mult,p})}})}
  menu({id:'stake',title:'HOW MUCH?',sub:'On '+m[lane].name+' at '+mult.toFixed(2)+'×. You have '+money(c)+'.',items,back:()=>openBet(a,m)})}
function startWatch(a,m,bet){const d=ST.def();S.nextMatch=null;const W=S.watch={m,bet,t:0,phase:'roll',models:[],ctl:[null,null],res:null,skip:false};
  for(let ln=0;ln<2;ln++){const r=m[ln];let v=null;try{v=HT.Vehicles.make(r.car,{color:RCOL[r.id]||'#888',lod:1})}catch(_){}if(v){v.traverse(o=>{if(o.isMesh)o.userData.noBatch=true});(S.root||a.L.group).add(v)}W.models.push(v)}
  boardsSet([{name:m[0].name},{name:m[1].name}]);say(NAMES.starter,m[1].name+' in the left lane, '+m[0].name+' in the right. '+(bet?'You\'re on '+m[bet.lane].name+'.':''),true);
  W.key=e=>{if(!S.watch||S.menu)return;const k=(e.key||'').toLowerCase();if(k==='e'||k==='enter'||k===' '||k==='escape'){e.stopImmediatePropagation();e.preventDefault();W.skip=true}};document.addEventListener('keydown',W.key,true);
  if(HT.Pad&&HT.Pad.modal)W.unpad=HT.Pad.modal({move:()=>{},ok:()=>{W.skip=true},back:()=>{W.skip=true}});hudOn(a,true)}
function watchTick(a,dt){const W=S.watch;if(!W)return;W.t+=dt;
  if(W.phase==='roll'){const k=clamp(W.t/1.6,0,1),back=4*(1-k*k*(3-2*k));W.models.forEach((v,ln)=>v&&placeModel(v,ln,back,0,dt));treeSet([{pre:k>.5,stage:k>=1},{pre:k>.5,stage:k>=1}]);
    if(W.t>2.6){W.phase='go';W.t=0;W.ctl=W.m.map(r=>D().ai(D().spec(r.car),r.d,Math.random,{greenAt:TREE.green}))}}
  else if(W.phase==='go'){if(W.skip){for(const c of W.ctl){let n=0;while(!c.R.done&&n++<40000)c.tick(1/120)}}
    for(const c of W.ctl){if(!c.R.done)c.tick(dt);else shut(null,c.R,dt)}
    W.models.forEach((v,ln)=>v&&placeModel(v,ln,-W.ctl[ln].R.x,W.ctl[ln].R.v,dt));
    const lights=W.ctl.map(c=>{const g=TREE.green,t=W.t,red=c.R.leave!=null&&c.R.leave<g;return{pre:c.R.x<.6,stage:c.R.leave==null,a1:t>=g-1.5&&t<g&&!red,a2:t>=g-1&&t<g&&!red,a3:t>=g-.5&&t<g&&!red,green:t>=g&&!red,red}});treeSet(lights);
    if(W.ctl.every(c=>c.R.done)&&(W.skip||W.ctl.every(c=>c.R.v<.8)||W.t>W.ctl[0].R.split.et+5))watchDone(a)}}
function watchDone(a){const W=S.watch;W.phase='done';const sl=W.ctl.map(c=>D().slip(c.R)),res=D().judge(W.ctl.map(c=>c.R),sl,null);W.res=res;
  boardsSet(sl.map((x,i)=>({name:W.m[i].name,et:x.et,mph:x.mph,rt:x.rt,red:x.red,win:res.win===i,margin:res.win===i&&res.margin!=null?'by '+res.margin.toFixed(3):''})));
  let line='';const lines=[];if(W.bet){const won=res.win===W.bet.lane,Dd=today();const n=D().settle(Dd,W.bet.stake,W.bet.mult,won);addCash(n,'strip');const s=sv();s.stats.bets++;persist();
    line=won?'Your $'+W.bet.stake+' on '+W.m[W.bet.lane].name+' pays +$'+n+'.':'Your $'+W.bet.stake+' on '+W.m[W.bet.lane].name+' is gone.';lines.push([won?'Bet won':'Bet lost',n])}
  ST.lastWatch={win:res.win,how:res.how,margin:res.margin,net:lines.length?lines[0][1]:0,slips:sl};
  const winner=W.m[res.win];say(winner.name,winner.lines.win);
  const h=`<div class="sub" style="font-size:20px"><b>${esc(winner.name)}</b> wins${res.how==='red'?' (a red light in the other lane)':res.margin!=null?' by '+res.margin.toFixed(3)+' s ('+res.marginM.toFixed(1)+' m)':''}</div><table>${sl.map((x,i)=>`<tr><td>${esc(W.m[i].name)} · ${esc(D().spec(W.m[i].car).name)}</td><td class="v">R/T ${f3(x.rt)}${x.red?' RED':''}</td><td class="v">${f3(x.et)} s</td><td class="v">${x.mph!=null?x.mph.toFixed(1):'—'} mph</td></tr>`).join('')}</table>${line?`<div class="sub" style="font-size:17px" class="${res.win===(W.bet&&W.bet.lane)?'cash':''}">${esc(line)}</div>`:''}`;
  endWatch(a,true);menu({id:'watched',title:'RACE RESULT',html:h,items:[{label:'Another race',act:()=>openBet(a)},{label:'Done',act:()=>closeMenu()}]})}
function endWatch(a,keepModels){const W=S.watch;if(!W)return;S.watch=null;if(W.key)document.removeEventListener('keydown',W.key,true);if(W.unpad)W.unpad();hudOff();
  for(const v of W.models)if(v){try{if(v.parent)v.parent.remove(v);v.userData.dispose&&v.userData.dispose()}catch(_){}}treeSet([{},{}])}
/* the tower camera: high on the tower, following the leading car down the track */
function camera(dt){if(ST.debugCam){const a=A(),c=ST.debugCam;a.camera.position.set(c.p[0],c.p[1],c.p[2]);a.camera.lookAt(c.l[0],c.l[1],c.l[2]);a.camera.fov=c.fov||50;a.camera.updateProjectionMatrix();return true}/* screenshots (dev/dragstrip-check.js) */
  const W=S.watch;if(!W)return;const a=A(),cam=a.camera,d=ST.def();const xs=W.models.map(v=>v?v.position.x:d.start);const lead=Math.min(...xs),mid=(Math.min(...xs)+Math.max(...xs))/2;
  const far=d.start-lead;const px=far<20?d.start+16:Math.max(d.finish+30,lead+28),py=far<20?4.2:7.5,pz=far<20?290.5:293;
  cam.position.set(px,py,pz);cam.lookAt(far<20?d.start-6:mid-8,1,d.centerZ);const fov=far<20?52:46;cam.fov+=(fov-cam.fov)*Math.min(1,dt*3);cam.updateProjectionMatrix();return true}
ST.watch=()=>S.watch?{phase:S.watch.phase,t:S.watch.t,bet:S.watch.bet,m:S.watch.m.map(r=>r.id)}:null;

/* ================= the in-car HUD: the tree for your lane, the tach with the launch window, speed, the clock ================= */
function hudOn(a,watch){hudOff();css();const el=document.createElement('div');el.className='ht-drhud';
  el.innerHTML=`<div class="tree">${['pre','stage'].map(b=>`<div class="b sm" data-b="${b}1"></div><div class="b sm" data-b="${b}0"></div>`).join('')}${['a1','a2','a3','green','red'].map(b=>`<div class="b" data-b="${b}1"></div><div class="b" data-b="${b}0"></div>`/* as the driver sees the tree: lane 0 (north) on the right */).join('')}</div>
  <div class="panel"><div class="row"><span data-k="who"></span><span data-k="clock"></span></div>${watch?'':'<div class="tach"><i data-k="band"></i><u data-k="rpm"></u></div>'}<div class="row"><span class="big" data-k="spd"></span><span data-k="gear"></span></div><div class="tip" data-k="tip"></div></div>`;
  document.body.appendChild(el);S.hud={el,q:k=>el.querySelector('[data-k="'+k+'"]'),bulbs:[...el.querySelectorAll('[data-b]')],watch:!!watch,key:''}}
function hudOff(){if(S.hud){S.hud.el.remove();S.hud=null}}
const HCOL={pre:'#fff3c0',stage:'#fff3c0',a1:'#ffa21a',a2:'#ffa21a',a3:'#ffa21a',green:'#36ff6a',red:'#ff2a1a'};
function hudTick(a){const H=S.hud;if(!H)return;const lights=S.tree&&S.tree.key?JSON.parse(S.tree.key):[{},{}];
  for(const b of H.bulbs){const k=b.dataset.b,n=k.slice(0,-1),ln=+k.slice(-1),on=lights[ln]&&lights[ln][n];b.style.background=on?HCOL[n]:'#262a2d';b.style.boxShadow=on?'0 0 10px '+HCOL[n]:'none'}
  if(H.watch){const W=S.watch;if(!W)return;const c=W.ctl;H.q('who').textContent=W.m[0].name+' vs '+W.m[1].name;H.q('clock').textContent=W.bet?'$'+W.bet.stake+' on '+W.m[W.bet.lane].name:'';
    H.q('spd').textContent=c[0]?Math.round(c[0].R.v*2.237)+' · '+Math.round(c[1].R.v*2.237)+' mph':'';H.q('gear').textContent='';H.q('tip').textContent=(pad()?HT.Pad.btn('A'):kl('use'))+' · skip to the result';return}
  const R=S.run;if(!R)return;const me=R.run,sp=R.spec;H.q('who').textContent=R.opp?'vs '+R.opp.racer.name+' · '+R.opp.spec.name:sp.name+' · test & tune';
  const t=R.phase==='tree'||R.phase==='go'?(me.leave!=null?(me.done?me.split.et-me.leave:me.t-me.leave):0):0;H.q('clock').textContent=t?t.toFixed(2)+' s':'';
  const band=H.q('band');band.style.left=(sp.band[0]*100)+'%';band.style.width=((sp.band[1]-sp.band[0])*100)+'%';H.q('rpm').style.width=Math.round(clamp(me.rpm,0,1)*100)+'%';
  H.q('spd').textContent=Math.round(me.v*2.237)+' mph';H.q('gear').textContent=me.launched?'gear '+(me.gear+1)+(me.spin>.3?' · WHEELSPIN':''):me.rpm>sp.band[1]?'too many revs':me.rpm>=sp.band[0]?'in the window':'';
  H.q('tip').textContent=tipText(R)}
/* the teach lines, for the device in use (labels from the action layer / the pad) */
function tipText(R){const me=R.run,br=pad()?HT.Pad.btn('A'):kl('jump'),th=pad()?HT.Pad.btn('RT'):kl('fwd');
  if(R.phase==='roll')return'Rolling into the beams…';
  if(R.phase==='staged'||(R.phase==='tree'&&!me.launched))return'Hold '+br+' + '+th+' to rev · keep the needle in the green band · let go of '+br+' on the green';
  if(me.launched&&!me.done)return me.spin>.3?'Wheelspin: ease off '+th+' a touch':'Keep '+th+' down';
  if(me.done)return'Lifting… shutdown';return''}

/* ================= per frame ================= */
function tick(){const a=A(),d=ST.def();if(!a||!a.L||!a.L.ow||!d)return;
  const dt=Math.min(.1,Math.max(0,a.simT-S.simT));S.simT=a.simT;
  if(a.mode!=='hub'){if(S.run||S.loaner||S.watch||S.menu)reset();if(S.root)teardown(a);return}
  ensure(a,d);if(!dt)return;S.t+=dt;const P=a.P,px=P.pos.x,pz=P.pos.z,here=inStrip(px,pz);
  /* a teleport (fast travel, the tow, a respawn) mid-anything leaves nothing behind */
  if(S.lastPos&&Math.hypot(px-S.lastPos.x,pz-S.lastPos.z)>45&&!S.run&&(S.loaner||S.watch)){if(S.watch)endWatch(a);if(S.loaner)dropLoaner(a,true);if(S.menu)closeMenu()}
  S.lastPos={x:px,z:pz};
  const s=sv();
  /* first time it's available: a crew bark and one line on the feed; the pin is on the map already */
  if(s&&!s.barked&&a.simT>25&&!a.M){s.barked=true;const al=(a.allies||[]).find(x=>!x.down);try{a.radio(al?al.id:'you',pick(LINES.bark))}catch(_){}feed('New on the map: Sensible Dragway, south of Fort Sensible · test & tune any car, race, bet','info');persist()}
  /* first visit: fast travel opens, the office says hello */
  if(here&&!S.inStrip){S.inStrip=true;if(s&&!s.visited){s.visited=true;try{const w=RO().owW();if(!w.pins.includes('strip'))w.pins.push('strip');RO().owPins()}catch(_){}feed('Sensible Dragway added to the map · fast travel from the minivan','info');say(NAMES.office,LINES.arrive[0]);persist()}}
  else if(!here)S.inStrip=false;
  /* the gun rule: anything drawn goes away on the property */
  if(here&&RO()&&RO().drawn&&!a.CV){try{RO().holster(pick(LINES.guns))}catch(_){}}
  /* class rules at the line: the tank and the jet are turned away */
  const cv=a.CV;if(cv&&here&&D().REFUSE[cv.type]&&!cv.stripLoaner&&cv.pos.x>d.start-4&&cv.pos.z>d.track.z0&&cv.pos.z<d.track.z1){if(!S.said[cv.type]||a.simT-S.said[cv.type]>20){S.said[cv.type]=a.simT;say(NAMES.starter,D().REFUSE[cv.type],true)}}
  /* loaners stay at the strip */
  const L=S.loaner;if(L&&a.CV===L&&!S.run&&!inStrip(L.pos.x,L.pos.z+6)){say(NAMES.office,LINES.noLeave,true);dropLoaner(a,true);walkTo(a,{x:d.paddockBoard.x,z:d.paddockBoard.z+1.6},Math.PI)}
  if(L&&a.CV!==L&&!S.run){/* got out: it goes back */dropLoaner(a)}
  if(S.run&&!S.menu)runTick(a,dt);if(S.watch)watchTick(a,dt);
  hudTick(a);animate(a,d,dt)}
function animate(a,d,dt){if(!S.root)return;{const c=a.camera.position,b=d.paddockBoard,nearP=Math.hypot(c.x-b.x+20,c.z-b.z)<48&&!(S.run&&S.run.phase!=='roll')&&!S.watch;if(S.loanG)S.loanG.visible=nearP}/* the loaner row: only from the paddock */
  /* night: the light pools come up */const nk=RO()&&RO().nightK?RO().nightK():0;if(S.pools){S.pools.visible=nk>.05;S.pools.material.opacity=clamp(nk*1.3,0,1)}
  /* the crowd: seated, a little fidget; on their feet when something's on */const live=!!(S.run&&S.run.phase==='go'||S.watch&&S.watch.phase==='go');
  for(const p of S.people){try{const cp=a.camera.position;if(Math.hypot(cp.x-p.d.root.position.x,cp.z-p.d.root.position.z)>90)continue;a.pose(p.d,dt,p.sit?{mode:live?'stand':'sit',moving:false,aim:false}:{moving:false,aim:false})}catch(_){}}}
/* the car during a pass: the race model has it (the game's physics are off: e.fly) */
function vehicle(e,dt){const R=S.run;if(!R||e!==R.e||!e.car)return;const c=e.car;c.x=e.pos.x;c.z=e.pos.z;c.yaw=e.yaw;c.spd=e.spd;c.steer=0;c.slip=R.run.spin>.2?.25+R.run.spin*.3:0}

/* ================= prompts (HT.Base.on('interact'), from updHub) ================= */
function interact(prompt){const a=A(),d=ST.def();if(!a||a.mode!=='hub'||!d||S.menu)return null;
  if(S.run&&a.CV===S.run.e){const R=S.run;if(R.phase==='done')return null;const br=pad()?HT.Pad.btn('A'):kl('jump'),th=pad()?HT.Pad.btn('RT'):kl('fwd');
    if(R.phase==='roll'||R.phase==='staged'||(R.phase==='tree'&&!R.run.launched))return{key:br+'+'+th,txt:'rev against the brake · let go of '+br+' on the green'};return null}
  if(S.watch)return{key:pad()?HT.Pad.btn('A'):kl('use'),txt:'Skip to the result'};
  if(a.CV)return null;const P=a.P;
  if(near(a,d.paddockBoard,3.4))return{txt:'Test & tune · pick any car (free)',fn:()=>openPicker(a)};
  if(near(a,d.booth,2.6))return{txt:'Race office · races and bets',fn:()=>openOffice(a)};
  return null}

/* ================= HUD hook: the objective while you're here, a marker to the board on the first visit ================= */
function hudPart(st){const a=A(),d=ST.def();if(!a||!st||a.mode!=='hub'||!d)return;const P=a.P;if(!inStrip(P.pos.x,P.pos.z))return;const s=sv();
  if(!S.run&&!S.watch&&!(st.objective&&st.objective.title&&/Job|Objective/.test(st.objective.kicker||''))){const E=D().ECON,Dd=today();
    st.objective={kicker:'Sensible Dragway',title:'Eighth-mile drags',lines:[{text:'Test & tune any car · the paddock board',done:!!(s&&s.stats.passes)},{text:'Race for money · bet · the race office (the tower)'},{text:'Today: $'+Dd.won+' of $'+E.dayCap+' won · bets +$'+Dd.betWon+' / -$'+Dd.betLost}]}}
  if(s&&!s.stats.passes&&!a.CV&&!S.menu){st.markers=st.markers||[];const b=d.paddockBoard;st.markers.push({id:'stripBoard',kind:'obj',label:'Test & tune',x:b.x,z:b.z,screen:a.project(b.x,2.6,b.z),edge:true,always:true})}}

/* ================= reset: quit to title, job start, home, the tow, death (HT.Base.reset from index.html clearChars) ================= */
function reset(){const a=A();try{closeMenu()}catch(_){}try{if(S.watch)endWatch(a)}catch(_){}
  try{if(S.run){const R=S.run;S.run=null;dropOpp(R);freeCar(R.e)}}catch(_){}
  try{if(S.loaner)dropLoaner(a,true)}catch(_){S.loaner=null}hudOff();try{treeSet([{},{}])}catch(_){}S.nextMatch=null}
ST.reset=reset;

/* ================= wiring ================= */
function hook(){const Jb=J(),Bs=B();if(!Jb||!Jb.on||!Bs||!Bs.on||!HT.Drag){setTimeout(hook,50);return}
  Jb.on('pose',()=>{try{tick()}catch(e){if(!S.err.t){S.err.t=1;console.warn('[strip]',e)}}});
  Jb.on('hud',st=>{try{hudPart(st)}catch(e){if(!S.err.h){S.err.h=1;console.warn('[strip] hud',e)}}});
  Jb.on('vehicle',(e,dt)=>{try{vehicle(e,dt)}catch(err){if(!S.err.v){S.err.v=1;console.warn('[strip] vehicle',err)}}});
  Jb.on('camera',dt=>{try{return camera(dt)}catch(err){if(!S.err.c){S.err.c=1;console.warn('[strip] camera',err)}}});
  Bs.on('interact',p=>interact(p));Bs.on('reset',()=>reset())}
hook();
/* pad A at the board or the office opens it (the prompt does this too; this covers a prompt the game is busy with) */
(function padUse(){if(!(HT.Pad&&HT.Pad.useAt)){if(typeof setTimeout==='function')setTimeout(padUse,500);return}
  HT.Pad.useAt(()=>{const a=A(),d=ST.def();return !!(a&&d&&a.mode==='hub'&&!a.CV&&!S.menu&&(near(a,d.paddockBoard,3.4)||near(a,d.booth,2.6)))})})();

/* test hooks (dev/dragstrip-check.js) */
ST.state=()=>({run:S.run&&{phase:S.run.phase,mode:S.run.mode,t:S.run.t,x:S.run.run.x,v:S.run.run.v,rpm:S.run.run.rpm,launched:S.run.run.launched,done:S.run.run.done,green:S.run.run.green,lane:S.run.lane,type:S.run.type,opp:S.run.opp&&S.run.opp.racer.id},
  loaner:S.loaner&&{type:S.loaner.type,x:S.loaner.pos.x,z:S.loaner.pos.z},menu:ST.menu(),watch:ST.watch(),built:!!S.root,people:S.people.length,loanRow:S.loanRow.length,hud:!!S.hud,last:ST.lastRun||null,lastWatch:ST.lastWatch||null});
ST.open=(what)=>{const a=A();if(what==='picker')openPicker(a);else if(what==='office')openOffice(a);else if(what==='bet')openBet(a)};
})();
