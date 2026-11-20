/* High Trust · game AI
   Navigation, enemy squads, the crew, wave pacing and barks for the tile levels.
   Engine-agnostic: plain data in, decisions out. Nothing here touches THREE or the DOM.

   Coordinates are world metres on the ground plane (x, z). A grid cell is `tile` metres
   (2 in the game); cell (cx, cz) covers x in [cx*tile, (cx+1)*tile).
   Facing: agents (enemies, crew) use the character convention, forward = (sin yaw, cos yaw),
   which is what the game's faceTo() produces. The player/camera use the camera convention,
   forward = (-sin yaw, -cos yaw).

   Exposes window.HT.AI (browser) or module.exports (node). */
(function(root){
'use strict';
const AI={version:1};

/* ================= small helpers ================= */
let R=Math.random;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
/* deterministic runs: AI.seed(123); AI.seed(null) goes back to Math.random */
AI.seed=s=>{R=s==null?Math.random:mulberry(s)};
AI.random=()=>R();
const rr=(a,b)=>a+R()*(b-a), pick=a=>a[Math.floor(R()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v, hyp=Math.hypot, SQ2=Math.SQRT2;
const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const yawTo=(fx,fz,tx,tz)=>Math.atan2(tx-fx,tz-fz);

/* ================= tuning tables ================= */
/* enemy guns. acc/dmg/burst/cooldown/want match the game's NPC_GUNS table (docs/design/SPEC.md A.3);
   mag/reload give enemies real reloads the crew can call out; aim is the telegraph before the first accurate shot */
AI.GUNS={
  pistol:  {acc:.40,dmg:9, burst:1,cd:.9, want:[7,15], mag:12,reload:1.4,aim:.55,range:32},
  revolver:{acc:.45,dmg:16,burst:1,cd:1.3,want:[8,16], mag:6, reload:2.0,aim:.6, range:34},
  nailer:  {acc:.35,dmg:4, burst:6,cd:1.0,want:[3,8],  mag:30,reload:2.0,aim:.45,range:20},
  shotgun: {acc:.60,dmg:7, close:[8,22],burst:1,cd:1.4,want:[3,7],mag:6,reload:2.4,aim:.5,range:24},
  double:  {acc:.60,dmg:8, close:[7,26],burst:2,cd:1.8,want:[3,6],mag:2,reload:2.0,aim:.5,range:22},
  rifle:   {acc:.34,dmg:8, burst:3,cd:1.3,want:[7,15], mag:30,reload:2.0,aim:.55,range:36},
  smg:     {acc:.30,dmg:6, burst:5,cd:1.2,want:[4,10], mag:30,reload:1.8,aim:.45,range:26},
  hunter:  {acc:.55,dmg:24,burst:1,cd:2.6,want:[16,30],mag:5, reload:2.5,aim:.8, range:60,laser:true},
};
/* crew guns (acc, dmg, cooldown) from the game's updAlly table */
AI.ALLY_GUNS={pistol:{acc:.5,dmg:24,cd:.75,range:35},rifle:{acc:.42,dmg:18,cd:.35,range:40},shotgun:{acc:.65,dmg:16,close:[9,55],cd:1.1,range:24}};
/* the crew backs the dad up rather than winning fights for him */
AI.ALLY_SUPPORT=.7;
AI.ROLES={
  grunt:     {speed:3.4,cover:1,  advance:1,  peekHide:[.9,1.9],expose:1.5},
  rusher:    {speed:3.9,cover:.3, advance:2,  peekHide:[.5,1.1],expose:2.2},
  shotgunner:{speed:3.4,cover:.8, advance:1.6,peekHide:[.6,1.3],expose:1.6},
  marksman:  {speed:3.1,cover:1.2,advance:0,  peekHide:[1.4,2.6],expose:1.3},
  boss:      {speed:3.0,cover:1,  advance:.6, peekHide:[1.0,1.8],expose:1.8},
};
AI.DIFFICULTY={
  easy:  {maxShooters:1,pool:2,reaction:.9,first:.8,acc:.8, aim:1.3,aggression:.7,flank:false,hear:.8,moveAcc:.6,sprintAcc:.5},
  normal:{maxShooters:2,pool:3,reaction:.6,first:.4,acc:1,  aim:1,  aggression:1, flank:true, hear:1,moveAcc:.7,sprintAcc:.6},
  hard:  {maxShooters:3,pool:4,reaction:.4,first:0, acc:1.15,aim:.8,aggression:1.3,flank:true,hear:1.2,moveAcc:.8,sprintAcc:.7},
};
/* per-mission tuning (used by index.html and the node sims): the chop shop is most players' first fight and the compound
   throws the most men at once, so both give the dad a longer beat on first contact and miss more while he keeps moving */
AI.MISSION_DIFF=[Object.assign({},AI.DIFFICULTY.normal,{reaction:.8,first:.9,acc:.85,moveAcc:.55,sprintAcc:.45}),null,null,
  Object.assign({},AI.DIFFICULTY.normal,{reaction:.75,first:.8,acc:.85,moveAcc:.55,sprintAcc:.45})];
AI.missionDiff=(i,name)=>(!name||name==='normal')&&AI.MISSION_DIFF[i]||AI.DIFFICULTY[name||'normal']||AI.DIFFICULTY.normal;
AI.roleFor=(gun,boss)=>boss?'boss':gun==='shotgun'||gun==='double'?'shotgunner':gun==='hunter'?'marksman':(gun==='smg'||gun==='nailer')&&R()<.6?'rusher':'grunt';

/* ================= navigation ================= */
const NAV_DEF={tile:2,solid:'#hctTfVQ',losBlock:'#htVcTf',lowCover:'cTf',structural:'#hV',radius:.35,colliders:null,inside:null,lowReach:2.4,
  /* real footprint of low cover inside its cell (half extents, metres): the game's crates are 1.7 m, hedges 2 x 0.8, tables 1.8 x 1.1 */
  lowBox:{c:[.85,.85],f:[1,.4],T:[.9,.55]},
  /* same for thin high blockers, e.g. {t:[.3,.3]} for a tree trunk; chars not listed block their whole cell like a wall */
  hiBox:{}};
/* grid: array of strings or char arrays (the game's L.g). opts: tile, solid, losBlock, lowCover (crouch-height blockers),
   structural (chars that make doorways), colliders (world rects {x0,z0,x1,z1} that block cells whose centre they cover, e.g. L.colliders) */
AI.buildNav=function(grid,opts){
  const o=Object.assign({},NAV_DEF,opts||{});
  const rows=grid.map(r=>typeof r==='string'?r.split(''):r);
  const H=rows.length,W=Math.max(...rows.map(r=>r.length)),N=W*H,T=o.tile;
  const ch=new Array(N),walk=new Uint8Array(N),hi=new Uint8Array(N),lo=new Uint8Array(N),st=new Uint8Array(N);
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){const k=z*W+x,c=rows[z][x];ch[k]=c===undefined?'#':c;
    const C=ch[k];walk[k]=o.solid.includes(C)?0:1;const blk=o.losBlock.includes(C);lo[k]=blk&&o.lowCover.includes(C)?1:0;hi[k]=blk&&!lo[k]?1:0;st[k]=o.structural.includes(C)?1:0}
  if(o.colliders)for(const c of o.colliders)for(let z=Math.max(0,Math.floor(c.z0/T));z<=Math.min(H-1,Math.floor(c.z1/T));z++)for(let x=Math.max(0,Math.floor(c.x0/T));x<=Math.min(W-1,Math.floor(c.x1/T));x++){
    const X=(x+.5)*T,Z=(z+.5)*T;if(X>c.x0&&X<c.x1&&Z>c.z0&&Z<c.z1)walk[z*W+x]=0}
  const nav={W,H,N,tile:T,opts:o,ch,walk,hi,lo,st};
  const inb=(x,z)=>x>=0&&z>=0&&x<W&&z<H;
  const W_=(x,z)=>inb(x,z)&&walk[z*W+x]===1;
  nav.inb=inb;nav.walkable=W_;
  nav.cellOf=(x,z)=>{const cx=Math.floor(x/T),cz=Math.floor(z/T);return inb(cx,cz)?cz*W+cx:-1};
  nav.cx=i=>i%W;nav.cz=i=>(i/W)|0;
  nav.wx=i=>(i%W+.5)*T;nav.wz=i=>(((i/W)|0)+.5)*T;
  nav.walkAt=(x,z)=>{const i=nav.cellOf(x,z);return i>=0&&walk[i]===1};

  /* line of sight, sampled every 0.5 m like the game's losClear(). High blockers always block. Low cover (crates, hedges)
     only hides a crouched man it is close to: a crate next to a standing dad 15 m away doesn't hide a crouched hoodie,
     the dad's eye (and camera) look straight over it. crouch: 'a' or 'b' = that end is crouched, true = both, falsy = neither */
  const LR=o.lowReach,LB=o.lowBox||{},HB=o.hiBox||{};
  /* exact segment vs. the prop's box in cell k: [t0,t1] along a->b, or null */
  const segBox=(k,ax,az,bx,bz,b)=>{const cx=nav.wx(k),cz=nav.wz(k),dx=bx-ax,dz=bz-az;let t0=0,t1=1;
    for(let q=0;q<2;q++){const p=q?az:ax,d=q?dz:dx,lo_=(q?cz:cx)-b[q],hi_=(q?cz:cx)+b[q];
      if(Math.abs(d)<1e-9){if(p<=lo_||p>=hi_)return null}else{let u0=(lo_-p)/d,u1=(hi_-p)/d;if(u0>u1){const w=u0;u0=u1;u1=w}if(u0>t0)t0=u0;if(u1<t1)t1=u1;if(t0>=t1)return null}}
    return[t0,t1]};
  /* walls block like the game's losClear (samples every 0.5 m). Props with a footprint (thin trunks; low crates and hedges,
     which only matter when someone is crouched and close to them) are tested exactly against their box. */
  nav.los=function(ax,az,bx,bz,crouch){const d=hyp(bx-ax,bz-az),n=Math.ceil(d/.5)*2;let last=-1;
    for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n,gx=Math.floor(x/T),gz=Math.floor(z/T);
      if(gx<0||gz<0||gx>=W||gz>=H){if(!(i&1))return false;continue}const k=gz*W+gx;if(k===last)continue;
      if(hi[k]){const hb=HB[ch[k]];if(!hb){if(!(i&1)){return false}continue}last=k;if(segBox(k,ax,az,bx,bz,hb))return false;continue}
      last=k;if(!crouch||!lo[k])continue;const lb=LB[ch[k]];let t0=0,t1=1;if(lb){const r=segBox(k,ax,az,bx,bz,lb);if(!r)continue;t0=r[0];t1=r[1]}
      const nearA=t0*d<LR,nearB=(1-t1)*d<LR;if(crouch==='a'?nearA:crouch==='b'?nearB:(nearA||nearB))return false}
    return true};

  /* circle of radius r at (x,z) clear of non-walkable cells */
  function clearPt(x,z,r){const cx=Math.floor(x/T),cz=Math.floor(z/T);if(!W_(cx,cz))return false;const fx=x-cx*T,fz=z-cz*T;
    const L=fx<r,Rt=fx>T-r,U=fz<r,D=fz>T-r;
    if(L&&!W_(cx-1,cz))return false;if(Rt&&!W_(cx+1,cz))return false;if(U&&!W_(cx,cz-1))return false;if(D&&!W_(cx,cz+1))return false;
    if(L&&U&&!W_(cx-1,cz-1)&&hyp(fx,fz)<r)return false;if(Rt&&U&&!W_(cx+1,cz-1)&&hyp(T-fx,fz)<r)return false;
    if(L&&D&&!W_(cx-1,cz+1)&&hyp(fx,T-fz)<r)return false;if(Rt&&D&&!W_(cx+1,cz+1)&&hyp(T-fx,T-fz)<r)return false;return true}
  nav.clearPt=clearPt;
  /* can a body of radius r walk the straight segment a->b */
  nav.walkLine=function(ax,az,bx,bz,r=o.radius*.85){const d=hyp(bx-ax,bz-az),n=Math.max(1,Math.ceil(d/.25));
    for(let i=0;i<=n;i++){const x=ax+(bx-ax)*i/n,z=az+(bz-az)*i/n;if(!clearPt(x,z,r))return false}return true};

  nav.nearestWalkable=function(x,z,maxR=6){const cx=Math.floor(x/T),cz=Math.floor(z/T);if(W_(cx,cz))return cz*W+cx;
    let best=-1,bd=1e9;for(let r=1;r<=maxR;r++){for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
      const X=cx+dx,Z=cz+dz;if(!W_(X,Z))continue;const d=hyp((X+.5)*T-x,(Z+.5)*T-z);if(d<bd){bd=d;best=Z*W+X}}if(best>=0)return best}return -1};

  /* ---------- A* (8-way, no corner cutting) ---------- */
  const gS=new Float32Array(N),par=new Int32Array(N),seen=new Uint32Array(N),shut=new Uint32Array(N);let gen=0;
  /* binary heap of (f, cell) pairs; stale entries are skipped via the closed stamp */
  const hI=[],hF=[];
  function hpush(i,f){hI.push(i);hF.push(f);let k=hI.length-1;while(k>0){const p=(k-1)>>1;if(hF[p]<=f)break;hI[k]=hI[p];hF[k]=hF[p];k=p}hI[k]=i;hF[k]=f}
  function hpop(){const top=hI[0],li=hI.pop(),lf=hF.pop(),n=hI.length;if(n){let k=0;for(;;){const l=2*k+1,r=l+1;let m=-1,mf=lf;if(l<n&&hF[l]<mf){m=l;mf=hF[l]}if(r<n&&hF[r]<mf)m=r;if(m<0)break;hI[k]=hI[m];hF[k]=hF[m];k=m}hI[k]=li;hF[k]=lf}return top}
  const oct=(a,b)=>{const dx=Math.abs(a%W-b%W),dz=Math.abs(((a/W)|0)-((b/W)|0));return T*(Math.max(dx,dz)+(SQ2-1)*Math.min(dx,dz))};
  /* cells from s to e or null. cost(i) adds metres for entering cell i (danger, crowding) */
  nav.astar=function(s,e,cost,maxIter=N*4){if(s<0||e<0)return null;if(s===e)return[s];
    gen++;hI.length=hF.length=0;gS[s]=0;seen[s]=gen;par[s]=-1;hpush(s,oct(s,e));let it=0;
    while(hI.length&&it++<maxIter){const c=hpop();if(shut[c]===gen)continue;shut[c]=gen;if(c===e)break;
      const cx=c%W,cz=(c/W)|0;
      for(let d=0;d<8;d++){const dx=D8[d][0],dz=D8[d][1],nx=cx+dx,nz=cz+dz;if(!W_(nx,nz))continue;
        if(dx&&dz&&(!W_(cx+dx,cz)||!W_(cx,cz+dz)))continue;const k=nz*W+nx;if(shut[k]===gen)continue;
        const g=gS[c]+(dx&&dz?T*SQ2:T)+(cost?cost(k):0);if(seen[k]===gen&&g>=gS[k])continue;
        seen[k]=gen;gS[k]=g;par[k]=c;hpush(k,g+oct(k,e))}}
    if(shut[e]!==gen)return null;const out=[];for(let c=e;c!==-1;c=par[c])out.push(c);return out.reverse()};
  /* smoothed world path from (ax,az) to (bx,bz): {pts:[{x,z}], cells, len} or null */
  nav.path=function(ax,az,bx,bz,o2){o2=o2||{};const s=nav.nearestWalkable(ax,az),e=nav.nearestWalkable(bx,bz);
    const cells=nav.astar(s,e,o2.cost,o2.maxIter);if(!cells)return null;
    const raw=cells.map(i=>({x:nav.wx(i),z:nav.wz(i)}));
    raw[0]={x:ax,z:az};if(!clearPt(ax,az,o.radius*.6))raw[0]={x:nav.wx(s),z:nav.wz(s)};
    const ec=nav.cellOf(bx,bz);if(ec===e&&clearPt(bx,bz,o.radius*.85))raw[raw.length-1]={x:bx,z:bz};
    const pts=[raw[0]];let i=0;
    /* string pulling: jump to the furthest raw point still walkable in a straight line (danger costs keep their bends) */
    while(i<raw.length-1){let j=raw.length-1;if(!o2.cost){for(;j>i+1;j--)if(nav.walkLine(raw[i].x,raw[i].z,raw[j].x,raw[j].z))break}else{for(;j>i+1;j--){if(j-i>3)continue;if(nav.walkLine(raw[i].x,raw[i].z,raw[j].x,raw[j].z))break}}
      pts.push(raw[j]);i=j}
    let len=0;for(let k=1;k<pts.length;k++)len+=hyp(pts[k].x-pts[k-1].x,pts[k].z-pts[k-1].z);
    return{pts,cells,len}};

  /* ---------- distance fields (Dijkstra, cached) ---------- */
  const dfCache=new Map();
  nav.distField=function(src){if(src<0)return null;let f=dfCache.get(src);if(f){dfCache.delete(src);dfCache.set(src,f);return f}
    f=new Float32Array(N).fill(Infinity);f[src]=0;gen++;
    hI.length=hF.length=0;hpush(src,0);
    while(hI.length){const c=hpop();if(shut[c]===gen)continue;shut[c]=gen;const cx=c%W,cz=(c/W)|0;
      for(let d=0;d<8;d++){const dx=D8[d][0],dz=D8[d][1],nx=cx+dx,nz=cz+dz;if(!W_(nx,nz))continue;if(dx&&dz&&(!W_(cx+dx,cz)||!W_(cx,cz+dz)))continue;
        const k=nz*W+nx,g=f[c]+(dx&&dz?T*SQ2:T);if(g<f[k]){f[k]=g;hpush(k,g)}}}
    dfCache.set(src,f);if(dfCache.size>96)dfCache.delete(dfCache.keys().next().value);return f};
  nav.travel=(ax,az,bx,bz)=>{const f=nav.distField(nav.nearestWalkable(ax,az));const e=nav.nearestWalkable(bx,bz);return f&&e>=0?f[e]:Infinity};

  /* ---------- visibility from a cell (which cell centres can see it), cached ---------- */
  const visCache=new Map();
  nav.visFrom=function(i,crouch){const key=i*2+(crouch?1:0);let v=visCache.get(key);if(v)return v;v=new Uint8Array(N);const x=nav.wx(i),z=nav.wz(i);
    for(let k=0;k<N;k++)if(walk[k]&&hyp(nav.wx(k)-x,nav.wz(k)-z)<60&&nav.los(x,z,nav.wx(k),nav.wz(k),crouch))v[k]=1;
    visCache.set(key,v);if(visCache.size>48)visCache.delete(visCache.keys().next().value);return v};

  /* ---------- doorways, rooms ---------- */
  const door=new Uint8Array(N);
  const blockerAt=(x,z)=>!inb(x,z)||st[z*W+x]===1;
  function opening(x,z,dx,dz){/* walkable run through (x,z) along (dx,dz), and whether both ends hit structure */
    let a=0,b=0;while(a<3&&W_(x-dx*(a+1),z-dz*(a+1)))a++;while(b<3&&W_(x+dx*(b+1),z+dz*(b+1)))b++;
    const capped=blockerAt(x-dx*(a+1),z-dz*(a+1))&&blockerAt(x+dx*(b+1),z+dz*(b+1));return capped?a+b+1:99}
  for(let z=0;z<H;z++)for(let x=0;x<W;x++){if(!W_(x,z))continue;
    if(opening(x,z,1,0)<=2&&W_(x,z-1)&&W_(x,z+1))door[z*W+x]=1;else if(opening(x,z,0,1)<=2&&W_(x-1,z)&&W_(x+1,z))door[z*W+x]=1}
  const room=new Int16Array(N).fill(-1);
  function fill(mask,id,start,arr){const q=[start];arr[start]=id;const out=[start];while(q.length){const c=q.pop(),cx=c%W,cz=(c/W)|0;
    for(let d=0;d<4;d++){const nx=cx+D8[d][0],nz=cz+D8[d][1];if(!inb(nx,nz))continue;const k=nz*W+nx;if(arr[k]!==-1||!mask(k))continue;arr[k]=id;q.push(k);out.push(k)}}return out}
  /* regions too small to be rooms (the gap between two doors) fold into the doorway */
  {const tmp=new Int16Array(N).fill(-1);let id=0;for(let k=0;k<N;k++)if(walk[k]&&!door[k]&&tmp[k]===-1){const cells=fill(j=>walk[j]&&!door[j],id++,k,tmp);if(cells.length<4)for(const c of cells)door[c]=1}}
  const rooms=[],doors=[];
  for(let k=0;k<N;k++)if(walk[k]&&!door[k]&&room[k]===-1){const id=rooms.length;const cells=fill(j=>walk[j]&&!door[j],id,k,room);rooms.push({id,cells,kind:'room',adj:new Set()})}
  const dId=new Int16Array(N).fill(-1);
  for(let k=0;k<N;k++)if(door[k]&&dId[k]===-1){const id=doors.length;const cells=fill(j=>door[j]===1,id,k,dId);doors.push({id,cells,rooms:new Set()})}
  /* long doorway runs are corridors: they become rooms of kind 'hall' */
  for(const d of doors){for(const c of d.cells){const cx=c%W,cz=(c/W)|0;for(let q=0;q<4;q++){const nx=cx+D8[q][0],nz=cz+D8[q][1];if(inb(nx,nz)&&room[nz*W+nx]>=0)d.rooms.add(room[nz*W+nx])}}
    if(d.cells.length>4){const id=rooms.length;rooms.push({id,cells:d.cells.slice(),kind:'hall',adj:new Set()});for(const c of d.cells)room[c]=id;d.hall=id}}
  for(const d of doors){const rs=[...d.rooms];if(d.hall!=null)rs.push(d.hall);for(const a of rs)for(const b of rs)if(a!==b)rooms[a].adj.add(b);
    if(d.hall==null){const r0=rs.length?rs[0]:-1;for(const c of d.cells)room[c]=r0}
    let sx=0,sz=0;for(const c of d.cells){sx+=nav.wx(c);sz+=nav.wz(c)}d.x=sx/d.cells.length;d.z=sz/d.cells.length;d.rooms=rs;
    /* axis: the direction you walk through it */
    const c0=d.cells[0],cx=c0%W,cz=(c0/W)|0;d.axis=(!W_(cx-1,cz)||!W_(cx+1,cz))?'z':'x'}
  for(let k=0;k<N;k++)if(walk[k]&&room[k]===-1){/* isolated door cells */room[k]=0}
  /* room names for callouts: indoor/outdoor plus a compass sector */
  for(const r of rooms){let sx=0,sz=0,wall=0,edge=0;for(const c of r.cells){sx+=nav.wx(c);sz+=nav.wz(c);const cx=c%W,cz=(c/W)|0;
      for(let q=0;q<4;q++){const nx=cx+D8[q][0],nz=cz+D8[q][1];if(!inb(nx,nz)){edge++;continue}const k=nz*W+nx;if(!walk[k]){if(st[k])wall++;else edge++}}}
    r.x=sx/r.cells.length;r.z=sz/r.cells.length;r.indoor=r.kind==='hall'||wall>edge*1.5}
  {/* names a dad would shout: what is in the room when only one room has it (the stash room), otherwise where it sits
      as seen from the way in (the back-left room). Yards are out front / the back yard / the side yard. */
    const FEAT=o.features||{B:"the King's office",T:'the stash room',I:'the package room',Q:'the grill'};
    const ins=rooms.filter(r=>r.indoor&&r.kind!=='hall'),inAll=rooms.filter(r=>r.indoor);
    let sx=-1,sz=-1;for(let k=0;k<N;k++)if(ch[k]==='P'||ch[k]==='X'&&sx<0){sx=nav.wx(k);sz=nav.wz(k);if(ch[k]==='P')break}
    const bx=ins.length?ins.reduce((s,r)=>s+r.x,0)/ins.length:W*T/2,bz=ins.length?ins.reduce((s,r)=>s+r.z,0)/ins.length:H*T/2;
    if(sx<0){sx=bx;sz=0}
    /* the way in: the outside door nearest the start */
    {let bd=1e9,ex=null;for(const d of doors){const rs=d.rooms.map(i=>rooms[i]);if(!rs.some(r=>r.indoor)||!rs.some(r=>!r.indoor))continue;const dd=hyp(d.x-sx,d.z-sz);if(dd<bd){bd=dd;ex=d}}if(ex){sx=ex.x;sz=ex.z}}
    let fx=sx-bx,fz=sz-bz;if(Math.abs(fx)>Math.abs(fz)){fx=Math.sign(fx);fz=0}else{fz=Math.sign(fz)||1;fx=0}/* front: the side of the building facing the way in */
    const vx=-fx,vz=-fz;/* looking at the building from the front */
    const rel=r=>{const dx=r.x-bx,dz=r.z-bz;return{depth:dx*vx+dz*vz,side:dx*vz-dz*vx}};
    let dMax=1,sMax=1;for(const r of inAll){const q=rel(r);dMax=Math.max(dMax,Math.abs(q.depth));sMax=Math.max(sMax,Math.abs(q.side))}
    const feats=r=>{const f=new Set();for(const c of r.cells)if(FEAT[ch[c]])f.add(ch[c]);return f};
    const fCount={};const rf=new Map();for(const r of rooms){const f=feats(r);rf.set(r,f);for(const k of f)fCount[k]=(fCount[k]||0)+1};
    const used={};
    for(const r of rooms){const q=rel(r);let n;
      if(r.indoor){const dw=q.depth>dMax*.34?'back':q.depth<-dMax*.34?'front':'',sw=q.side>sMax*.34?'left':q.side<-sMax*.34?'right':'';
        const uniq=['B','T','I','Q'].find(k=>rf.get(r).has(k)&&fCount[k]===1&&r.kind!=='hall');
        if(uniq)n=FEAT[uniq];
        else if(r.kind==='hall')n='the '+(dw?dw+' ':'')+'hallway';
        else n=dw||sw?'the '+[dw,sw].filter(Boolean).join('-')+' room':'the middle room'}
      else if(!ins.length){const ns=r.z/(H*T)<.3?'north':r.z/(H*T)>.7?'south':'',ew=r.x/(W*T)<.3?'west':r.x/(W*T)>.7?'east':'';n=ns+ew?'the '+ns+ew+' side':'the yard'}
      else if(rooms.filter(x=>!x.indoor).length===1)n='outside';else n=q.depth<-dMax*.5?'out front':q.depth>dMax*.5?'the back yard':'the side yard';
      if(used[n])n=n.replace('the ','the other ');used[n]=1;r.name=n;r.where=/^(out|outside)/.test(n)?n:(r.indoor?'in ':'over in ')+n}}
  nav.door=door;nav.doorId=dId;nav.room=room;nav.rooms=rooms;nav.doors=doors;
  nav.roomAt=(x,z)=>{const i=nav.cellOf(x,z);return i>=0?room[i]:-1};
  nav.isDoor=(x,z)=>{const i=nav.cellOf(x,z);return i>=0&&door[i]===1};
  /* room-graph hops from room r0 */
  nav.roomDepth=function(r0){const d=new Int16Array(rooms.length).fill(99);if(r0<0)return d;d[r0]=0;const q=[r0];while(q.length){const a=q.shift();for(const b of rooms[a].adj)if(d[b]>d[a]+1){d[b]=d[a]+1;q.push(b)}}return d};

  /* ---------- cover spots ---------- */
  const covers=[],coverAt=new Int32Array(N).fill(-1);
  for(let k=0;k<N;k++){if(!walk[k])continue;const cx=k%W,cz=(k/W)|0;const dirs=[];let hx=0,hz=0,high=0,low=0;
    for(let d=0;d<8;d++){const dx=D8[d][0],dz=D8[d][1],nx=cx+dx,nz=cz+dz;if(!inb(nx,nz))continue;const j=nz*W+nx;if(!hi[j]&&!lo[j])continue;
      if(dx&&dz&&(!W_(cx+dx,cz)||!W_(cx,cz+dz)))continue;/* diagonal only counts at an outside corner */
      const isLow=!hi[j];dirs.push({dx:dx/(dx&&dz?SQ2:1),dz:dz/(dx&&dz?SQ2:1),low:isLow});if(isLow)low++;else high++;if(!(dx&&dz)){hx+=dx;hz+=dz}}
    if(!dirs.length)continue;
    /* only a diagonal neighbour (an outside corner): tuck in towards it so the corner actually covers the body */
    if(!hx&&!hz&&dirs.length===1){hx=Math.sign(dirs[0].dx);hz=Math.sign(dirs[0].dz)}
    const hl=hyp(hx,hz)||1;const sh=hx||hz?.4:0;
    let x=nav.wx(k)+hx/hl*sh,z=nav.wz(k)+hz/hl*sh;if(!clearPt(x,z,o.radius)){x=nav.wx(k);z=nav.wz(k)}
    coverAt[k]=covers.length;covers.push({i:k,x,z,dirs,high:high>0,low:low>0&&!high,door:door[k]===1,room:room[k]})}
  nav.covers=covers;nav.coverAt=coverAt;
  /* how a spot hides from a threat at (tx,tz): 'stand' (high cover), 'crouch' (low cover) or null (exposed) */
  /* a body is ~0.7 m wide: the lines to both shoulders have to be blocked too, or a crate corner only covers half of him */
  const SH=.3;
  const blockedAll=(sp,tx,tz,c)=>{const dx=sp.x-tx,dz=sp.z-tz,l=hyp(dx,dz)||1,px=-dz/l*SH,pz=dx/l*SH;
    return!nav.los(tx,tz,sp.x,sp.z,c)&&!nav.los(tx,tz,sp.x+px,sp.z+pz,c)&&!nav.los(tx,tz,sp.x-px,sp.z-pz,c)};
  nav.hides=function(sp,tx,tz){if(blockedAll(sp,tx,tz,false))return'stand';if(blockedAll(sp,tx,tz,'b'))return'crouch';return null};
  /* where to shoot from: low cover peeks over (stand up in place); high cover leans out to a side */
  nav.peekFrom=function(sp,tx,tz,hideStance){
    if(hideStance==='crouch'&&nav.los(sp.x,sp.z,tx,tz,false))return{side:'over',x:sp.x,z:sp.z};
    const fx=tx-sp.x,fz=tz-sp.z,fl=hyp(fx,fz)||1,px=-fz/fl,pz=fx/fl;let best=null;
    for(const s of[1,-1])for(const dist of[.9,1.3]){const x=sp.x+px*s*dist,z=sp.z+pz*s*dist;if(!clearPt(x,z,o.radius*.8))continue;
      if(nav.los(x,z,tx,tz,false)){const side=s>0?'left':'right';best={side,x,z};break}}
    return best};
  return nav};

/* direction word for a callout: where is (tx,tz) relative to someone at (x,z) looking along (fx,fz) */
AI.dirWord=function(x,z,fx,fz,tx,tz){const dx=tx-x,dz=tz-z,l=hyp(dx,dz)||1,fl=hyp(fx,fz)||1;const f=(dx*fx+dz*fz)/(l*fl);const s=(dx*fz-dz*fx)/(l*fl);
  /* s>0: target is to the left of the facing in this x/z frame (right-handed with y up: right = (-fz, fx)... see test) */
  if(f>.6)return'front';if(f<-.6)return'behind';return s>0?'left':'right'};

/* ================= accuracy ================= */
/* hit chance for one shot. c: {gun (profile), dist, aimT (s since aim started), first (first shot this exposure),
   suppressed 0..1, moving, sprint, crouch (target), cover (target partially covered 0..1), accMul (difficulty), boss} */
AI.hitChance=function(c){const g=c.gun;let a=g.acc*clamp(1.15-c.dist/(g.range||32),.12,1);
  if(c.moving)a*=c.sprint?(c.sprintAcc??.6):(c.moveAcc??.7);if(c.crouch)a*=.75;if(c.cover)a*=1-.45*c.cover;if(c.suppressed)a*=1-.45*clamp(c.suppressed,0,1);
  const T=(g.aim||.5);const ramp=clamp(((c.aimT||0)-T)/.5,0,1);a*=c.first?.6:.75+.25*ramp;
  if(c.boss)a*=1.2;a*=c.accMul||1;return clamp(a,.02,.9)};
AI.shotDamage=(g,dist)=>g.close&&dist<g.close[0]?g.close[1]:g.dmg;

/* ================= barks ================= */
AI.BARKS={
 enemy:{
  idle:["Somebody ordered forty pounds of dog food. Forty.","Bro, every box in here is an air fryer.","My mom keeps texting about Sunday dinner.","Is it weird I kind of want one of these air fryers?","I'm just saying, the HOA had it coming.","Quiet out here. Cul-de-sac quiet.","Who keeps stealing my yogurt from the fridge?","I'm thinking about getting into pickleball."],
  idleReply:["Don't start.","Tell me about it.","Bro.","Not this again.","Mm-hm.","That's crazy, man."],
  investigate:["You hear that?","Was that a leaf blower?","Somebody check the side door.","Probably a raccoon. Go look."],
  spotted:["Dads! We got dads!","Is that... a polo shirt?","Cargo shorts, twelve o'clock!","It's the neighborhood watch!","Somebody's dad is here!","Visor! Guy in a visor!"],
  reloading:["Reloading!","Hold up, I'm empty!","Gimme a sec, reloading!","Out! Cover me!"],
  flanking:["I'm going around!","I'll get behind him!","Taking the side, keep him busy!"],
  suppress:["Keep his head down!","Covering fire!","Light him up, I'm moving!"],
  advance:["Moving up!","Pushing!","Going forward, cover me!"],
  hit:["Ow! Ow!","He got me!","That's gonna bruise!","My good hoodie!"],
  friendDown:["Man down!","They got him!","Oh no. Oh no no no.","Bro's down!"],
  surrender:["Okay! Okay! I give up!","Don't shoot! I got a mom!","I'm done, I'm done!","Hands up! See? Hands!"],
  searching:["Where'd he go?","Come out, dad-guy.","Check behind the minivan.","I can smell sunscreen. He's close."],
  lost:["Lost him.","He's gone. Back to posts.","Probably went home for dinner.","Forget it. Back to the packages."],
  retreat:["I'm hit bad, falling back!","Nope. Nope. Back room!","I'm out, fall back!"],
  rush:["He's reloading! Go go go!","Rush him!","He's hiding! Push!"],
  flanked:["He's on our side!","He's flanking!","Where's he shooting from?!"],
  minivan:["They brought a minivan. To a raid.","Is that a Sienna? Respect.","Nobody touch the minivan, it's got car seats."],
  taunt:["Every porch in Maple Heights pays tribute!","You can't stop Prime Day!","Signature required, dad!","Your doorbell camera can't save you now!","I've got your packages AND your HOA dues!"],
  bossCall:["Boys! Get in here!","Reinforcements! Bring the good hoodies!"],
  bossRetreat:["Fall back to the office!","You'll never take my package room!"],
 },
 ally:{
  contactFront:["Contact front!","Twelve o'clock, hoodie!"],
  contactLeft:["Contact left!","Left side! Left side!"],
  contactRight:["Contact right!","On your right, buddy!"],
  contactBehind:["Behind us!","Check six! Like the minivan mirrors!"],
  contactRoom:["Contact, {where}!","One {where}!","Hoodie {where}!"],
  covering:["Covering you!","Go, I got you!","Reload, I've got this side."],
  reloading:["Reloading!","Changing mags, cover me!","Hang on, reloading."],
  enemyReloading:["He's reloading, push!","He's dry! Go!"],
  enemyFlanking:["One's going around!","Watch the side!"],
  stack:["Stacked up. Your call.","On you. Like a carpool line.","Ready when you are."],
  breach:["Go go go!","Breaching! Wipe your feet!","Moving in!"],
  revive:["I got you, buddy. Up you get.","Walk it off. Come on.","On your feet, we've got soccer Sunday."],
  clear:["Clear!","Room's clear.","Clear. Somebody vacuum this place."],
  yield:["After you.","Coming through? Go ahead."],
  hit:["Ow! That's my mowing arm!","Hit! I'm fine. I'm fine."],
 }};
/* per-event cooldowns (s) and priorities (2+ cuts the queue) */
const BARK_CD={idle:14,idleReply:1,investigate:5,spotted:5,reloading:4,flanking:6,suppress:7,advance:6,hit:3,friendDown:4,surrender:0,searching:7,lost:8,retreat:5,rush:6,flanked:5,minivan:30,taunt:9,bossCall:0,bossRetreat:0,
  contactFront:2.5,contactLeft:2.5,contactRight:2.5,contactBehind:2.5,contactRoom:3,covering:6,enemyReloading:6,enemyFlanking:6,stack:6,breach:5,revive:6,clear:8,yield:8};
const BARK_PRI={surrender:3,bossCall:3,bossRetreat:3,friendDown:2,spotted:2,flanked:2,contactBehind:2,taunt:1,reloading:1,hit:1};
/* one barker per side keeps lines from piling up: a global gap, a cooldown per event, a cooldown per speaker, no repeats in a row */
AI.barker=function(o){o=Object.assign({gap:1.6,speaker:3},o||{});const last={},spk={},bags={};let lastT=-1e9;
  return{say(side,ev,who,t,vars){const lines=AI.BARKS[side]&&AI.BARKS[side][ev];if(!lines)return null;const pri=BARK_PRI[ev]||0;
      if(t-(last[ev]??-1e9)<(BARK_CD[ev]??4))return null;if(pri<2&&t-lastT<o.gap)return null;if(who!=null&&pri<3&&t-(spk[who]??-1e9)<o.speaker)return null;
      const key=side+ev;let bag=bags[key];if(!bag||!bag.length){bag=bags[key]=lines.map((_,i)=>i);for(let i=bag.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}}
      let text=lines[bag.pop()];if(vars)text=text.replace(/\{(\w+)\}/g,(m,k)=>vars[k]??m);
      last[ev]=t;lastT=t;if(who!=null)spk[who]=t;return{text,event:ev,priority:pri,who}}}};

/* ================= squads ================= */
const isOut=a=>!a||a.out||a.dead||a.hp<=0||a.state==='dead'||a.state==='surrender'||a.state==='cuffed';
AI.isOut=isOut;
/* shared shooting budget across squads (optional) */
AI.pool=function(o){o=o||{};return{max:o.maxShooters||3,holders:new Set(),peak:0,squads:[]}};
/* a squad blackboard shared by a group of enemies */
AI.squad=function(nav,o){o=o||{};const diff=o.diff||AI.DIFFICULTY[o.difficulty||'normal']||AI.DIFFICULTY.normal;
  const sq={nav,name:o.name||'crew',diff,max:o.maxShooters||diff.maxShooters,pool:o.pool||null,members:[],tokens:new Map(),
    threats:new Map(),morale:1,lossT:-1e9,requests:[],flanker:null,flankT:-1e9,advancer:null,advanceT:0,alert:false,alertT:-1e9,hunt:false,
    barker:o.barker||AI.barker(),claims:new Map(),peak:0,stats:{lost:0,surrendered:0},t:0,rooms:new Set()};
  if(sq.pool&&sq.pool.squads)sq.pool.squads.push(sq);
  /* squads in the same or an adjacent room (through the shared pool): a fight spanning two rooms still gets a flanker */
  sq.neighbours=()=>{if(!sq.pool||!sq.pool.squads)return[];const out=[];for(const o of sq.pool.squads){if(o===sq)continue;let near=false;
      for(const r of o.rooms){if(sq.rooms.has(r)){near=true;break}const R_=nav.rooms[r];if(R_)for(const q of R_.adj)if(sq.rooms.has(q)){near=true;break}if(near)break}
      if(near)out.push(o)}return out};
  sq.add=a=>{if(!sq.members.includes(a)){sq.members.push(a);const r=nav.roomAt?nav.roomAt(a.pos.x,a.pos.z):-1;if(r>=0)sq.rooms.add(r);if(sq.members.length>1)sq.morale=Math.min(1,sq.morale+.12)}a.squad=sq;return a};
  sq.alive=()=>sq.members.filter(a=>!isOut(a));
  /* threat memory: what the squad knows about each threat */
  sq.report=(th,t,by)=>{let m=sq.threats.get(th.id);if(!m){m={id:th.id};sq.threats.set(th.id,m)}m.x=th.x;m.z=th.z;m.t=t;m.by=by;m.reloading=!!th.reloading;m.isPlayer=!!th.isPlayer;
    if(!sq.alert){sq.alert=true;sq.alertT=t}};
  sq.best=(x,z,t)=>{let b=null,bs=1e9;for(const m of sq.threats.values()){const age=t-m.t;if(age>20)continue;const s=age*3+hyp(m.x-x,m.z-z)*(m.isPlayer?.8:1);if(s<bs){bs=s;b=m}}return b};
  /* fire tokens: only `max` members (and the pool's max across squads) may be aiming or shooting at once */
  sq.hasToken=a=>sq.tokens.has(a);
  sq.requestFire=(a,t,pri=0)=>{if(sq.tokens.has(a)){sq.tokens.set(a,t+2.6);return true}
    const full=sq.tokens.size>=sq.max||(sq.pool&&sq.pool.holders.size>=sq.pool.max);
    if(full){if(pri<2)return false;/* priority steals from the holder who has had it longest, if it is in this squad */
      let worst=null,wt=1e9;for(const[h,exp]of sq.tokens)if(exp<wt&&!(h.ai&&h.ai.phase==='fire')){wt=exp;worst=h}if(!worst)return false;sq.releaseFire(worst)}
    sq.tokens.set(a,t+2.6);if(sq.pool)sq.pool.holders.add(a);a.ai&&(a.ai.tokenT=t);
    sq.peak=Math.max(sq.peak,sq.tokens.size);if(sq.pool)sq.pool.peak=Math.max(sq.pool.peak,sq.pool.holders.size);return true};
  sq.releaseFire=a=>{sq.tokens.delete(a);if(sq.pool)sq.pool.holders.delete(a);if(a.ai)a.ai.fireRest=sq.t};
  sq.claim=(a,i)=>{for(const[k,v]of sq.claims)if(v===a)sq.claims.delete(k);if(i!=null)sq.claims.set(i,a)};
  sq.claimedBy=i=>sq.claims.get(i);
  sq.counted=new Set();
  sq.event=ev=>{const t=ev.t??sq.t;if(ev.type==='down'||ev.type==='surrender'){const a=ev.agent;if(a){if(sq.counted.has(a))return;sq.counted.add(a)}
      sq.morale=clamp(sq.morale-(ev.type==='down'?.22:.15),0,1);sq.lossT=t;sq.stats[ev.type==='down'?'lost':'surrendered']++;if(a){sq.releaseFire(a);sq.claim(a,null)}
      if(a&&a.pos){let best=null,bd=14;for(const m of sq.alive()){const d=hyp(m.pos.x-a.pos.x,m.pos.z-a.pos.z);if(d<bd){bd=d;best=m}}if(best&&best.ai)queueBark(best,'friendDown',t)}}
    else if(ev.type==='hurt'&&ev.agent&&ev.agent.ai){ev.agent.ai.hurtT=t;sq.morale=clamp(sq.morale-.02,0,1)}};
  sq.update=(dt,world)=>{const t=world.t;sq.t=t;
    for(const[a,exp]of sq.tokens)if(exp<t||isOut(a))sq.releaseFire(a);
    for(const a of sq.members)if(isOut(a)&&!sq.counted.has(a))sq.event({type:a.state==='surrender'||a.state==='cuffed'?'surrender':'down',agent:a,t});
    if(t-sq.lossT>10)sq.morale=Math.min(1,sq.morale+dt*.01);
    const alive=sq.alive(),fighting=alive.filter(a=>a.ai&&a.ai.mode==='combat');
    /* one advancer at a time: everyone else with a token suppresses */
    if(sq.advancer&&(isOut(sq.advancer)||t>sq.advanceT||!sq.advancer.ai||sq.advancer.ai.mode!=='combat'))sq.advancer=null;
    /* a single flanker for groups of three or more, on a cooldown */
    if(sq.flanker&&(isOut(sq.flanker)||!sq.flanker.ai||sq.flanker.ai.sub!=='flank'))sq.flanker=null;
    const nb=sq.flanker||!diff.flank||!fighting.length?[]:sq.neighbours();let engaged=fighting.length;for(const o of nb)engaged+=o.alive().filter(a=>a.ai&&a.ai.mode==='combat').length;
    if(!sq.flanker&&diff.flank&&engaged>=3&&t-sq.flankT>12&&t-sq.alertT>3&&!nb.some(o=>o.flanker&&t-o.flankT<12)){const th=sq.best(0,0,t)||nb.map(o=>o.best(0,0,t)).find(Boolean);
      if(th&&t-th.t<4){const c=fighting.filter(a=>a.ai.role!=='boss'&&a.ai.role!=='marksman'&&a.hp>a.maxHp*.5);
        if(c.length){c.sort((a,b)=>(a.ai.role==='rusher'?-5:0)+hyp(a.pos.x-th.x,a.pos.z-th.z)*.1-((b.ai.role==='rusher'?-5:0)+hyp(b.pos.x-th.x,b.pos.z-th.z)*.1));
          sq.flanker=c[0];sq.flankT=t;c[0].ai.wantFlank=true}}}
    for(const m of sq.threats.values())if(t-m.t>30)sq.threats.delete(m.id);
    if(sq.alert&&!fighting.length&&t-sq.alertT>40&&![...sq.threats.values()].some(m=>t-m.t<20))sq.alert=false;
    /* idle chatter: two idle members near each other trade a line now and then */
    if(!sq.alert&&t>(sq.chatT||0)){sq.chatT=t+rr(10,18);const idle=alive.filter(a=>a.ai&&a.ai.mode==='idle');
      for(const a of idle){const b=idle.find(m=>m!==a&&hyp(m.pos.x-a.pos.x,m.pos.z-a.pos.z)<9);if(b){queueBark(a,'idle',t);b.ai.replyT=t+rr(2.2,3.2);break}}}};
  sq.shooters=()=>sq.tokens.size;
  return sq};
function queueBark(a,ev,t,vars){if(!a.ai)return;const sq=a.squad;const b=sq?sq.barker.say('enemy',ev,a.id??a,t,vars):AI.barker().say('enemy',ev,null,t,vars);if(b)a.ai.pendingBark=b;return b}

/* ================= enemy think ================= */
function memOf(a,world){if(a.ai&&a.ai.v===1)return a.ai;const role=a.role||AI.roleFor(typeof a.gun==='string'?a.gun:'pistol',a.boss);
  const gun=typeof a.gun==='object'?a.gun:(AI.GUNS[a.gun]||AI.GUNS.pistol);
  a.ai={v:1,role,gun,mode:'idle',sub:'post',post:{x:a.pos.x,z:a.pos.z},home:null,patrol:null,pi:0,waitT:rr(1,4),thinkT:rr(0,.3),react:0,
    target:null,lkp:null,visT:-1e9,seenOnce:false,cover:null,phase:'hide',phaseT:0,aimT:0,firstShot:true,burstLeft:0,shotT:0,mag:gun.mag,reloadT:0,
    path:null,pi2:0,goal:null,repathT:0,supp:0,hurtT:-1e9,retreated:false,stance:'stand',face:null,intent:{},pendingBark:null,
    phase2:0,searchPts:null,searchT:0,exposeT:0,lastHp:a.hp,stuckT:0,lastPos:{x:a.pos.x,z:a.pos.z},aliveT:world?world.t:0};
  return a.ai}
AI.mem=memOf;
function setPath(a,ai,nav,x,z,t,cost){const p=nav.path(a.pos.x,a.pos.z,x,z,cost?{cost}:null);ai.path=p?p.pts:null;ai.pi2=1;ai.goal={x,z};ai.repathT=t;return!!p}
/* follow the current path with local avoidance; returns the steering direction or null */
function steer(a,ai,world,speed,intent){const p=ai.path;if(!p||ai.pi2>=p.length){intent.speed=0;return null}
  let wp=p[ai.pi2];while(ai.pi2<p.length-1&&hyp(wp.x-a.pos.x,wp.z-a.pos.z)<.35){ai.pi2++;wp=p[ai.pi2]}
  const dx=wp.x-a.pos.x,dz=wp.z-a.pos.z,dl=hyp(dx,dz);if(ai.pi2===p.length-1&&dl<.2){ai.pi2=p.length;intent.speed=0;return null}
  let vx=dx/(dl||1),vz=dz/(dl||1);
  /* local avoidance: separation from other bodies, and side-step someone standing on the next waypoint */
  let sx=0,sz=0;const bodies=world.agents||[];
  for(const o of bodies){if(o===a||isOut(o)&&o.state!=='surrender')continue;const ox=a.pos.x-o.pos.x,oz=a.pos.z-o.pos.z,od=hyp(ox,oz);if(od<1.15&&od>1e-4){const w=(1.15-od)/1.15*1.6;sx+=ox/od*w;sz+=oz/od*w}
    else if(od<=1e-4){sx+=R()-.5;sz+=R()-.5}}
  for(const th of world.threats||[]){const ox=a.pos.x-th.x,oz=a.pos.z-th.z,od=hyp(ox,oz);if(od<1.2&&od>1e-4){const w=(1.2-od)/1.2*1.4;sx+=ox/od*w;sz+=oz/od*w}}
  vx+=sx;vz+=sz;const vl=hyp(vx,vz)||1;intent.dir={x:vx/vl,z:vz/vl};intent.speed=speed*(dl<.6&&ai.pi2===p.length-1?Math.max(.35,dl/.6):1);
  intent.next={x:a.pos.x+intent.dir.x,z:a.pos.z+intent.dir.z};return intent.dir}
const atGoal=(a,ai)=>!ai.path||ai.pi2>=ai.path.length||(ai.goal&&hyp(ai.goal.x-a.pos.x,ai.goal.z-a.pos.z)<.45);

/* perception: best visible threat */
function perceive(a,ai,world){const nav=world.nav,t=world.t;let best=null,bs=1e9;let crouched=ai.stance==='crouch';const alert=ai.mode!=='idle';
  /* a man crouched behind a crate still glances over it now and then */
  if(crouched&&ai.mode==='combat'&&t>=(ai.glanceT||0)){ai.glanceT=t+rr(.5,.9);crouched=false}
  /* world.sight scales the view range (night: 14/24 of day); a threat's own .sight overrides it (a dad with his flashlight on is seen as in daylight) */
  const range=ai.gun.range>40?60:38,fov=alert?2.2:1.1,ws=world.sight!=null?world.sight:1;
  for(const th of world.threats||[]){if(th.down)continue;const d=hyp(th.x-a.pos.x,th.z-a.pos.z);if(d>range*(th.sight!=null?th.sight:ws))continue;
    const ang=Math.atan2(th.x-a.pos.x,th.z-a.pos.z);let df=Math.abs(((ang-a.yaw+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(df>fov&&d>(alert?9:6))continue;if(!nav.los(a.pos.x,a.pos.z,th.x,th.z,crouched&&th.crouch?true:crouched?'a':th.crouch?'b':false))continue;
    const s=d*(th.isPlayer?.8:1);if(s<bs){bs=s;best=th}}
  return best}

/* pick the best cover spot against threat m. mode: 'hold' | 'advance' | 'retreat' | 'flank' */
function chooseCover(a,ai,world,m,mode){const nav=world.nav,sq=a.squad,t=world.t;const df=nav.distField(nav.nearestWalkable(a.pos.x,a.pos.z));if(!df)return null;
  const want=ai.gun.want,role=AI.ROLES[ai.role]||AI.ROLES.grunt;const maxTravel=mode==='retreat'?40:mode==='advance'?18:(mode==='far'?16:9);
  let depth=null,curDepth=0;if(mode==='retreat'){const tr=nav.roomAt(m.x,m.z);depth=nav.roomDepth(tr);curDepth=depth[nav.roomAt(a.pos.x,a.pos.z)]??0}
  const curD=hyp(a.pos.x-m.x,a.pos.z-m.z);let best=null,bs=-1e9;const cand=[];
  for(const sp of nav.covers){const tr=df[sp.i];if(!(tr<=maxTravel))continue;const d=hyp(sp.x-m.x,sp.z-m.z);if(d<3.5)continue;
    const c=sq&&sq.claimedBy(sp.i);if(c&&c!==a&&!isOut(c))continue;
    let s=-tr*(.9/(world.diff?world.diff.aggression:1));
    if(d<want[0])s-=(want[0]-d)*2.5;else if(d>want[1]+4)s-=(d-want[1]-4)*(mode==='advance'?1.6:.7);
    if(mode==='advance')s-=Math.max(0,d-curD+2)*2;if(mode==='retreat'&&depth)s+=((depth[sp.room]??0)-curDepth)*7+d*.3;
    if(ai.role==='marksman')s+=Math.min(d,30)*.3;
    if(mode==='retreat'){if(d<8)s-=(8-d)*2;if(ai.role==='boss'&&sp.room===nav.roomAt(ai.post.x,ai.post.z))s+=14}
    if(ai.cover&&ai.cover.spot===sp)s+=3;if(sp.door)s-=3;
    if(sq)for(const o of sq.members){if(o===a||isOut(o))continue;const od=hyp(o.pos.x-sp.x,o.pos.z-sp.z);if(od<2.5)s-=(2.5-od)*1.5}
    cand.push([s,sp,d])}
  cand.sort((p,q)=>q[0]-p[0]);let checked=0;
  for(const[s0,sp,d]of cand){if(checked++>80)break;const hide=nav.hides(sp,m.x,m.z);if(!hide)continue;
    let s=s0;if(hide==='crouch')s-=.6;const peek=nav.peekFrom(sp,m.x,m.z,hide);s+=peek?5:-9*role.cover;
    /* don't run across his line of fire to get there if a closer option exists */
    if(s>bs){bs=s;best={spot:sp,hide,peek,score:s}}}
  return best}
/* flank: a spot with sight of the threat, well off the squad's main axis, reached along cells he can't see */
function planFlank(a,ai,world,m){const nav=world.nav,sq=a.squad;let cxs=0,czs=0,n=0;const mates=sq.alive();for(const o of sq.neighbours?sq.neighbours():[])for(const b of o.alive())if(b.ai&&b.ai.mode==='combat')mates.push(b);
  for(const o of mates){if(o===a)continue;cxs+=o.pos.x;czs+=o.pos.z;n++}if(!n)return null;
  const ax=cxs/n-m.x,az=czs/n-m.z,al=hyp(ax,az)||1;const tc=nav.nearestWalkable(m.x,m.z);const vis=nav.visFrom(tc,false);const df=nav.distField(nav.nearestWalkable(a.pos.x,a.pos.z));
  let best=null,bs=-1e9;for(let k=0;k<nav.N;k++){if(!nav.walk[k]||!vis[k]||!(df[k]<38))continue;const x=nav.wx(k),z=nav.wz(k),d=hyp(x-m.x,z-m.z);if(d<5||d>16)continue;
    const cos=((x-m.x)*ax+(z-m.z)*az)/(d*al);if(cos>.35)continue;const s=-df[k]*.25-Math.abs(d-10)*.4+(nav.coverAt[k]>=0?3:0)-cos*4;if(s>bs){bs=s;best=k}}
  if(best==null)return null;const cost=i=>vis[i]?7:0;return{cell:best,x:nav.wx(best),z:nav.wz(best),cost}}

AI.think=function(a,world,dt){const ai=memOf(a,world),nav=world.nav,t=world.t,sq=a.squad||null,diff=world.diff||(sq?sq.diff:AI.DIFFICULTY.normal);
  world.diff=world.diff||diff;
  const I=ai.intent;I.fire=false;I.bark=null;I.aiming=false;I.dir=null;I.speed=0;I.next=null;I.peek=null;I.reloading=false;I.wantsSurrender=false;I.hitChance=0;I.dmg=0;I.targetId=null;
  if(isOut(a)){I.state='out';I.moveTo=null;I.path=null;return I}
  const role=AI.ROLES[ai.role]||AI.ROLES.grunt,gun=ai.gun;
  ai.supp=Math.max(0,ai.supp-dt*.6);
  if(a.hp<ai.lastHp){ai.hurtT=t;if(sq)sq.event({type:'hurt',agent:a,t});if(R()<.5)queueBark(a,'hit',t);
    if(ai.mode==='idle'){ai.mode='combat';ai.sub='react';ai.react=t+.25;if(world.threats&&world.threats[0]&&!ai.lkp){const th=world.threats.find(x=>x.isPlayer)||world.threats[0];ai.lkp={x:th.x,z:th.z,t}}}}
  ai.lastHp=a.hp;
  if(ai.reloadT>0){ai.reloadT-=dt;I.reloading=true;if(ai.reloadT<=0)ai.mag=gun.mag}

  /* ---- perception ---- */
  const vis=perceive(a,ai,world);
  if(vis){ai.visT=t;ai.target=vis.id;ai.lkp={x:vis.x,z:vis.z,t};if(sq)sq.report(vis,t,a);
    if(ai.mode==='idle'||ai.mode==='search'||ai.mode==='investigate'){const fresh=!ai.seenOnce;ai.seenOnce=true;const alerted=sq&&sq.alert&&t-sq.alertT>.3;
      ai.mode='combat';ai.sub='react';ai.react=t+diff.reaction*(alerted?.5:1)*rr(.8,1.3)+((sq?!sq.contacted:fresh)?(diff.first||0):0);if(sq)sq.contacted=true;ai.firstShot=true;
      if(fresh||R()<.5)queueBark(a,ai.role==='boss'?'taunt':'spotted',t);ai.cover=null;ai.path=null}}
  else if(sq&&sq.alert){const m=sq.best(a.pos.x,a.pos.z,t);if(m&&(!ai.lkp||m.t>ai.lkp.t)){ai.lkp={x:m.x,z:m.z,t:m.t};
      if(ai.mode==='idle'||ai.mode==='investigate'){ai.mode='combat';ai.sub='react';ai.react=t+diff.reaction*rr(.6,1.2);ai.cover=null;ai.path=null}}}
  /* hearing: gunfire and noises */
  for(const nz of world.noises||[]){if(t-nz.t>.5)continue;const d=hyp(nz.x-a.pos.x,nz.z-a.pos.z);
    /* gunfire gives away the shooter's position to anyone in earshot who is already fighting */
    if(ai.mode==='combat'&&nz.kind==='gun'&&d<(nz.r||20)*diff.hear&&(!ai.lkp||t-ai.lkp.t>.4)){ai.lkp={x:nz.x,z:nz.z,t};if(nz.id&&sq)sq.report({id:nz.id,x:nz.x,z:nz.z,isPlayer:nz.id==='player'},t,a)}}
  if(ai.mode==='idle'||ai.mode==='search')for(const nz of world.noises||[]){if(t-nz.t>.5)continue;const d=hyp(nz.x-a.pos.x,nz.z-a.pos.z);
    if(d<(nz.r||20)*diff.hear){if(d<(nz.r||20)*.4&&nz.kind==='gun'){ai.mode='combat';ai.sub='react';ai.react=t+diff.reaction*rr(.8,1.5);ai.lkp={x:nz.x,z:nz.z,t}}
      else if(ai.mode==='idle'){ai.mode='investigate';ai.inv={x:nz.x,z:nz.z};ai.path=null;queueBark(a,'investigate',t)}}}
  /* wave crews and hunters always know roughly where the dad is */
  if((a.hunt||(sq&&sq.hunt))&&world.threats){const p=world.threats.find(x=>x.isPlayer&&!x.down);if(p&&(!ai.lkp||t-ai.lkp.t>2)){ai.lkp={x:p.x,z:p.z,t};if(ai.mode!=='combat'){ai.mode='combat';ai.sub='react';ai.react=t+.3}}}

  if(ai.mode==='idle'&&a.lane&&!ai.seenOnce){ai.mode='combat';ai.sub='lane';ai.path=null;if(!ai.lkp)ai.lkp={x:a.lane[a.lane.length-1].x,z:a.lane[a.lane.length-1].z,t}}
  const thr=vis||(ai.lkp?{x:ai.lkp.x,z:ai.lkp.z,id:ai.target}:null);
  const thObj=vis||null;
  ai.thinkT-=dt;const decide=ai.thinkT<=0;if(decide)ai.thinkT=rr(.25,.4);
  let speed=0;I.face=null;

  if(ai.mode==='idle'){ai.stance='stand';doIdle(a,ai,world,dt,I,decide)}
  else if(ai.mode==='investigate'){ai.stance='stand';
    if(!ai.path||decide&&!ai.goal)setPath(a,ai,nav,ai.inv.x,ai.inv.z,t);steer(a,ai,world,role.speed*.6,I);I.face=ai.inv;
    if(atGoal(a,ai)){ai.mode='search';ai.searchT=t+rr(8,12);ai.searchPts=null;ai.lkp={x:ai.inv.x,z:ai.inv.z,t}}}
  else if(ai.mode==='search')doSearch(a,ai,world,dt,I,decide,role);
  else if(ai.mode==='combat'){
    /* boss phases: checked every frame he is fighting, so a big burst during his reaction still triggers both */
    if(ai.role==='boss')bossPhases(a,ai,world,I);
    if(ai.sub==='react'){I.face=thr;ai.stance='stand';if(t>=ai.react){ai.sub='seek';ai.cover=null}}
    else{
      /* lost contact long enough: search */
      if(!vis&&ai.lkp&&t-ai.lkp.t>(ai.role==='boss'?20:8)&&!(sq&&sq.hunt)&&ai.sub!=='retreat'){releaseAll(a,ai);ai.mode='search';ai.searchT=t+rr(12,18);ai.searchPts=null;ai.path=null;queueBark(a,'searching',t)}
      else if(decide&&thr)combatDecide(a,ai,world,thr,vis,role);
      if(ai.mode==='combat'&&thr)combatAct(a,ai,world,dt,I,thr,thObj,role)}}

  /* stuck detection: if we've been trying to move and barely moved, re-plan */
  if(I.speed>0){const mv=hyp(a.pos.x-ai.lastPos.x,a.pos.z-ai.lastPos.z);if(mv<I.speed*dt*.15)ai.stuckT+=dt;else ai.stuckT=Math.max(0,ai.stuckT-dt);if(ai.stuckT>1.2){ai.stuckT=0;ai.path=null;ai.cover=null}}
  ai.lastPos.x=a.pos.x;ai.lastPos.z=a.pos.z;
  if(ai.replyT&&t>=ai.replyT){ai.replyT=0;if(ai.mode==='idle')queueBark(a,'idleReply',t)}
  if(ai.pendingBark){I.bark=ai.pendingBark;ai.pendingBark=null}
  I.stance=ai.stance;I.state=ai.mode==='combat'?ai.sub:ai.mode;I.role=ai.role;I.moveTo=ai.goal;I.path=ai.path;
  if(!I.face)I.face=I.dir?{x:a.pos.x+I.dir.x,z:a.pos.z+I.dir.z}:null;
  if(!I.fire)I.token=sq?sq.hasToken(a):true;
  return I};

function releaseAll(a,ai){const sq=a.squad;if(sq){sq.releaseFire(a);sq.claim(a,null);if(sq.flanker===a)sq.flanker=null;if(sq.advancer===a)sq.advancer=null}ai.cover=null;ai.phase='hide'}

function doIdle(a,ai,world,dt,I,decide){const nav=world.nav,t=world.t;
  if(!ai.patrol){const r=nav.roomAt(ai.post.x,ai.post.z),pts=[ai.post];const room=nav.rooms[r];
    if(room&&room.cells.length>3)for(let k=0;k<6&&pts.length<3;k++){const c=pick(room.cells);const x=nav.wx(c),z=nav.wz(c);if(hyp(x-ai.post.x,z-ai.post.z)<7&&!nav.door[c])pts.push({x,z})}
    ai.patrol=pts;ai.pi=0}
  if(ai.waitT>0){ai.waitT-=dt;I.face=ai.look||null;if(decide&&R()<.15)ai.look={x:a.pos.x+Math.sin(a.yaw+rr(-1.4,1.4))*4,z:a.pos.z+Math.cos(a.yaw+rr(-1.4,1.4))*4};return}
  if(!ai.path){ai.pi=(ai.pi+1)%ai.patrol.length;const p=ai.patrol[ai.pi];setPath(a,ai,nav,p.x,p.z,t)}
  steer(a,ai,world,1.3,I);if(atGoal(a,ai)){ai.path=null;ai.waitT=rr(2.5,6)}}

function doSearch(a,ai,world,dt,I,decide,role){const nav=world.nav,t=world.t;ai.stance='stand';releaseAll(a,ai);
  if(!ai.searchPts){const c=ai.lkp||ai.post;const pts=[{x:c.x,z:c.z}];const rid=nav.roomAt(c.x,c.z);const room=nav.rooms[rid];
    if(room)for(let k=0;k<10&&pts.length<4;k++){const cc=pick(room.cells);const x=nav.wx(cc),z=nav.wz(cc);if(hyp(x-c.x,z-c.z)<9)pts.push({x,z})}
    ai.searchPts=pts;ai.si=0;ai.path=null}
  if(t>ai.searchT){ai.mode='idle';ai.sub='post';ai.path=null;ai.patrol=null;ai.lkp=null;ai.waitT=0;queueBark(a,'lost',t);
    setPath(a,ai,nav,ai.post.x,ai.post.z,t);return}
  if(!ai.path){const p=ai.searchPts[ai.si%ai.searchPts.length];setPath(a,ai,nav,p.x,p.z,t)}
  steer(a,ai,world,role.speed*.55,I);
  if(atGoal(a,ai)){ai.si++;ai.path=null;ai.waitT=0}
  if(decide&&R()<.05)queueBark(a,'searching',t)}

function bossPhases(a,ai,world,I){const t=world.t,f=a.hp/a.maxHp,sq=a.squad;
  if(ai.phase2<1&&f<=.66){ai.phase2=1;queueBark(a,'bossCall',t);const pts=reinforcePoints(world,a,3);if(sq)sq.requests.push({kind:'reinforce',n:pts.length,points:pts,reason:'boss66',from:a});}
  if(ai.phase2<2&&f<=.33){ai.phase2=2;queueBark(a,'bossRetreat',t);ai.sub='retreat';ai.cover=null;ai.path=null;ai.retreated=true}
  if(t>(ai.tauntT||0)){ai.tauntT=t+rr(9,15);if(ai.mode==='combat'&&ai.sub!=='react')queueBark(a,'taunt',t)}}
/* out-of-sight spawn points near the boss, not closer to the threats than 12 m */
function reinforcePoints(world,a,n){const nav=world.nav;const ths=(world.threats||[]).filter(x=>!x.down);const df=nav.distField(nav.nearestWalkable(a.pos.x,a.pos.z));const out=[];
  const cand=[];for(let k=0;k<nav.N;k++){if(!nav.walk[k]||nav.door[k]||!(df[k]<26)||df[k]<3)continue;const x=nav.wx(k),z=nav.wz(k);
    if(ths.some(th=>hyp(th.x-x,th.z-z)<12||nav.los(th.x,th.z,x,z,false)))continue;cand.push([df[k]+R()*6,x,z])}
  cand.sort((p,q)=>p[0]-q[0]);for(const[,x,z]of cand){if(out.every(p=>hyp(p.x-x,p.z-z)>2.5))out.push({x,z});if(out.length>=n)break}return out}

function combatDecide(a,ai,world,thr,vis,role){const nav=world.nav,t=world.t,sq=a.squad;const dist=hyp(thr.x-a.pos.x,thr.z-a.pos.z);
  const th=vis||(world.threats||[]).find(x=>x.id===ai.target);
  /* badly hurt: fall back to a deeper room, once */
  if(!ai.retreated&&ai.role!=='boss'&&ai.role!=='rusher'&&a.hp<a.maxHp*.35&&(!sq||sq.morale<.85||R()<.5)){ai.retreated=true;ai.sub='retreat';ai.cover=null;ai.path=null;releaseAll(a,ai);queueBark(a,'retreat',t);return}
  if(ai.sub==='retreat'){if(!ai.cover){const c=chooseCover(a,ai,world,thr,'retreat');if(c){ai.cover=c;ai.coverT=t;if(sq)sq.claim(a,c.spot.i);setPath(a,ai,nav,c.spot.x,c.spot.z,t)}else ai.sub='seek'}
    else if(atGoal(a,ai)){ai.sub='cover';ai.phase='hide';ai.phaseT=t+rr(1,2)}return}
  /* morale broke: a hurt loner may give up on his own (the game applies its surrender rule) */
  if(sq&&sq.morale<.3&&a.hp<a.maxHp*.6&&!sq.alive().some(o=>o!==a&&hyp(o.pos.x-a.pos.x,o.pos.z-a.pos.z)<10)&&R()<.04)ai.wantSurrender=true;
  /* flanker */
  if(ai.wantFlank&&sq&&sq.flanker===a&&ai.sub!=='flank'){ai.wantFlank=false;const f=planFlank(a,ai,world,thr);if(f){releaseAll(a,ai);sq.flanker=a;ai.sub='flank';ai.flank=f;ai.flankEnd=t+16;setPath(a,ai,nav,f.x,f.z,t,f.cost);queueBark(a,'flanking',t);return}else sq.flanker=null}
  if(ai.sub==='flank'){if(t>ai.flankEnd||vis&&dist<10||atGoal(a,ai)){ai.sub='seek';ai.cover=null;if(sq&&sq.flanker===a)sq.flanker=null}return}
  /* rush: rushers (and anyone when the dad is caught reloading close by) */
  const hidden=t-ai.visT>1.5,reloading=th&&th.reloading;
  const wantRush=(sq&&sq.hunt)||a.hunt||(ai.role==='rusher'&&(reloading||hidden||dist>gunWant(ai)[1]+3))||(reloading&&dist<9&&ai.role!=='marksman'&&ai.role!=='boss');
  if(wantRush&&ai.sub!=='rush'&&(!sq||!sq.advancer||sq.advancer===a||sq.hunt||a.hunt)){releaseAll(a,ai);ai.sub='rush';ai.rushEnd=t+rr(4,7);if(sq&&!sq.hunt){sq.advancer=a;sq.advanceT=t+6}queueBark(a,reloading?'rush':'advance',t);ai.path=null}
  if(ai.sub==='rush'){if(t>ai.rushEnd&&!(sq&&sq.hunt)&&!a.hunt){ai.sub='seek';ai.cover=null}else if(!ai.path||t-ai.repathT>.8)setPath(a,ai,nav,thr.x,thr.z,t);return}
  /* lane following for wave crews with no contact yet */
  if(a.lane&&!ai.seenOnce&&!vis){ai.sub='lane';return}
  if(ai.sub==='lane'&&(vis||ai.seenOnce))ai.sub='seek';
  /* cover */
  const cv=ai.cover;let compromised=false;
  if(cv&&ai.sub==='cover'&&ai.phase==='hide'&&th&&!th.down){const h=nav.hides(cv.spot,th.x,th.z);compromised=!h||(h==='crouch'&&cv.hide==='stand'&&false);if(h&&h!==cv.hide)cv.hide=h}
  if(compromised){queueBark(a,'flanked',t);ai.cover=null;releaseAll(a,ai);ai.sub='seek'}
  const tooLong=cv&&ai.sub==='cover'&&!vis&&t-ai.visT>3.5&&ai.lkp&&t-ai.lkp.t<8&&role.advance>0;
  const tooFar=cv&&ai.sub==='cover'&&dist>gunWant(ai)[1]+6&&role.advance>0;
  if(tooLong||tooFar){/* advance cover-to-cover while a squadmate suppresses */
    if(!sq||!sq.advancer||sq.advancer===a){const c=chooseCover(a,ai,world,thr,'advance');if(c&&c.spot!==cv.spot&&hyp(c.spot.x-thr.x,c.spot.z-thr.z)<dist-1){releaseAll(a,ai);ai.cover=c;ai.coverT=t;if(sq){sq.claim(a,c.spot.i);sq.advancer=a;sq.advanceT=t+5}
      ai.sub='move';setPath(a,ai,nav,c.spot.x,c.spot.z,t);queueBark(a,'advance',t);if(sq){const sup=sq.alive().find(o=>o!==a&&o.ai&&o.ai.sub==='cover');if(sup)queueBark(sup,'suppress',t)}return}}}
  if(!ai.cover||ai.sub==='seek'||ai.sub==='open'&&t>(ai.openT||0)){const c=chooseCover(a,ai,world,thr,ai.sub==='open'?'far':'hold');ai.openT=t+2;
    if(c&&(!ai.cover||c.spot!==ai.cover.spot)){if(sq)sq.claim(a,c.spot.i);ai.cover=c;ai.coverT=t;ai.sub='move';setPath(a,ai,nav,c.spot.x,c.spot.z,t)}
    else if(c){ai.sub=atGoal(a,ai)?'cover':'move'}
    else if(!c){ai.sub='open';ai.cover=null}}
  if(ai.sub==='move'&&ai.cover&&atGoal(a,ai)){ai.sub='cover';ai.phase='hide';ai.phaseT=t+rr(.3,.8)}
  if(ai.sub==='move'&&ai.cover&&(!ai.path||!ai.path.length))setPath(a,ai,nav,ai.cover.spot.x,ai.cover.spot.z,t);
  if(ai.sub==='cover'&&ai.cover&&th&&decideRefreshPeek(ai))ai.cover.peek=nav.peekFrom(ai.cover.spot,thr.x,thr.z,ai.cover.hide)}
const gunWant=ai=>ai.role==='rusher'?[3,8]:ai.gun.want;
function decideRefreshPeek(ai){return ai.phase==='hide'}

/* one shot attempt; returns true when a shot went off this frame */
function tryFire(a,ai,world,dt,I,th,accMul,burstMul){const t=world.t,sq=a.squad;if(ai.reloadT>0)return false;
  if(ai.mag<=0){ai.reloadT=ai.gun.reload;I.reloading=true;if(sq)sq.releaseFire(a);if(R()<.6)queueBark(a,'reloading',t);ai.phase='hide';return false}
  ai.aimT+=dt;I.aiming=true;const tele=ai.gun.aim*(world.diff?world.diff.aim:1);if(ai.aimT<tele)return false;
  if(ai.burstLeft<=0&&ai.shotT<=t){ai.burstLeft=Math.max(1,Math.round(ai.gun.burst*(burstMul||1)))}
  if(ai.burstLeft>0&&ai.shotT<=t){const dist=hyp(th.x-a.pos.x,th.z-a.pos.z);
    I.fire=true;I.token=sq?sq.hasToken(a):true;I.targetId=th.id;I.dmg=AI.shotDamage(ai.gun,dist)*(a.dmgMul||1);
    I.hitChance=AI.hitChance({gun:ai.gun,dist,aimT:ai.aimT,first:ai.firstShot,suppressed:ai.supp,moving:th.moving,sprint:th.sprint,crouch:th.crouch,cover:th.cover||0,accMul:(world.diff?world.diff.acc:1)*(accMul||1),boss:ai.role==='boss',moveAcc:world.diff&&world.diff.moveAcc,sprintAcc:world.diff&&world.diff.sprintAcc});
    ai.firstShot=false;ai.mag--;ai.burstLeft--;ai.shotT=t+(ai.burstLeft>0?.12:ai.gun.cd*rr(.8,1.3));if(ai.burstLeft===0)ai.burstDone=true;return true}
  return false}

function combatAct(a,ai,world,dt,I,thr,th,role){const nav=world.nav,t=world.t,sq=a.squad;const dist=hyp(thr.x-a.pos.x,thr.z-a.pos.z);
  I.face=thr;
  switch(ai.sub){
  case'move':case'retreat':{ai.stance='stand';if(!ai.path&&ai.cover)setPath(a,ai,nav,ai.cover.spot.x,ai.cover.spot.z,t);
    steer(a,ai,world,role.speed*(ai.sub==='retreat'?1.1:1),I);if(I.dir&&!th)I.face={x:a.pos.x+I.dir.x,z:a.pos.z+I.dir.z};
    /* snap shots on the way to cover: only with a token, slower and less accurate */
    if(th&&ai.sub==='move'&&dist<gunWant(ai)[1]+6&&sq&&sq.requestFire(a,t,0)){I.speed*=.75;tryFire(a,ai,world,dt,I,th,.6);if(ai.burstDone){ai.burstDone=false;sq.releaseFire(a);ai.aimT=ai.gun.aim*.5}}
    else{ai.aimT=Math.max(0,ai.aimT-dt);if(sq&&sq.hasToken(a)&&ai.sub==='move')sq.releaseFire(a)}
    if(ai.sub==='retreat'&&ai.cover&&atGoal(a,ai)){ai.sub='cover';ai.phase='hide';ai.phaseT=t+rr(1,2)}
    break}
  case'lane':{ai.stance='stand';if(!ai.path){const L=a.lane;const end=L[L.length-1];ai.path=L.map(p=>({x:p.x,z:p.z}));ai.path.unshift({x:a.pos.x,z:a.pos.z});ai.pi2=1;ai.goal=end;ai.repathT=t}
    steer(a,ai,world,role.speed*.9,I);I.face=I.dir?{x:a.pos.x+I.dir.x,z:a.pos.z+I.dir.z}:thr;if(atGoal(a,ai)){a.lane=null;ai.sub='seek'}break}
  case'flank':{ai.stance='stand';steer(a,ai,world,role.speed*1.05,I);if(!th&&I.dir)I.face={x:a.pos.x+I.dir.x,z:a.pos.z+I.dir.z};
    if(th&&sq&&sq.requestFire(a,t,2))tryFire(a,ai,world,dt,I,th,.8);break}
  case'rush':{ai.stance='stand';if(dist>3.2)steer(a,ai,world,role.speed*1.15,I);else{ai.path=null;/* strafe at close range */const s=(Math.floor(t/1.3+a.pos.x)%2?1:-1);const px=-(thr.z-a.pos.z)/(dist||1)*s,pz=(thr.x-a.pos.x)/(dist||1)*s;if(nav.walkAt(a.pos.x+px,a.pos.z+pz)){I.dir={x:px,z:pz};I.speed=role.speed*.5}}
    if(th&&sq?sq.requestFire(a,t,dist<8?2:1):th)tryFire(a,ai,world,dt,I,th,.9);else ai.aimT=Math.max(0,ai.aimT-dt);break}
  case'open':{/* no cover anywhere: strafe in the band like the old AI, shooting with a token */
    ai.stance='stand';const want=gunWant(ai);
    if(dist>want[1]){if(!ai.path||t-ai.repathT>1)setPath(a,ai,nav,thr.x,thr.z,t);steer(a,ai,world,role.speed*.8,I)}
    else{ai.path=null;const s=(Math.floor(t/1.8+a.pos.z)%2?1:-1);const px=-(thr.z-a.pos.z)/(dist||1)*s,pz=(thr.x-a.pos.x)/(dist||1)*s;if(nav.walkAt(a.pos.x+px*.8,a.pos.z+pz*.8)){I.dir={x:px,z:pz};I.speed=role.speed*.5}}
    if(th&&sq?sq.requestFire(a,t,0):th)tryFire(a,ai,world,dt,I,th,1);else ai.aimT=0;
    if(ai.burstDone){ai.burstDone=false;if(sq)sq.releaseFire(a);ai.aimT=0}
    break}
  case'cover':{const cv=ai.cover;if(!cv){ai.sub='seek';break}const sp=cv.spot;
    if(ai.phase==='hide'){ai.stance=cv.hide==='crouch'?'crouch':'stand';ai.aimT=0;ai.firstShot=true;
      /* caught in the open by someone walking round the cover: shoot back if allowed, otherwise move */
      /* anyone (not just his target) who can see him where he hides has flanked the spot */
      const seers=(world.threats||[]).filter(x=>!x.down&&hyp(x.x-a.pos.x,x.z-a.pos.z)<40&&nav.los(x.x,x.z,a.pos.x,a.pos.z,ai.stance==='crouch'?'b':false));
      const real=seers.find(x=>x.id===ai.target)||seers.find(x=>x.isPlayer)||seers[0];
      if(real){
        if(sq&&sq.requestFire(a,t,1)){cv.peek={side:'flanked',x:a.pos.x,z:a.pos.z};ai.phase='peek';ai.exposeT=t;ai.burstDone=false;ai.aimT=ai.gun.aim*.4;ai.shotT=Math.min(ai.shotT,t)}
        else{queueBark(a,'flanked',t);ai.cover=null;ai.sub='seek';ai.thinkT=0}
        break}
      const dx=sp.x-a.pos.x,dz=sp.z-a.pos.z,dl=hyp(dx,dz);if(dl>.12){I.dir={x:dx/dl,z:dz/dl};I.speed=Math.min(4.2,dl*7)}/* duck back fast */
      if(ai.reloadT>0)break;
      if(t>=ai.phaseT){const pri=(ai.role==='boss'?1:0)+(sq&&sq.advancer&&sq.advancer!==a?1:0);
        cv.peek=nav.peekFrom(sp,thr.x,thr.z,cv.hide);
        if(!cv.peek){ai.sub='seek';ai.cover=null;break}
        if(cv.peek&&(!sq||sq.requestFire(a,t,pri))){ai.phase='peek';ai.exposeT=t;ai.burstDone=false;ai.shotT=Math.min(ai.shotT,t);ai.suppressing=!!(sq&&sq.advancer&&sq.advancer!==a)}
        else{ai.phaseT=t+rr(.4,.9);if(!cv.peek&&t-ai.coverT>3)ai.sub='seek'}}
      break}
    /* peek: lean out / stand up, aim (telegraph), shoot a burst, duck back */
    const pk=cv.peek;if(!pk){ai.phase='hide';break}
    ai.stance='stand';I.peek=pk.side;const tx=pk.x,tz=pk.z,dx=tx-a.pos.x,dz=tz-a.pos.z,dl=hyp(dx,dz);if(dl>.1){I.dir={x:dx/dl,z:dz/dl};I.speed=Math.min(3,dl*5)}
    const exposed=dl<.5||!!th;const hurtNow=t-ai.hurtT<.15;
    if(sq&&!sq.requestFire(a,t,0)){ai.phase='hide';ai.phaseT=t+rr(.4,.8);break}
    if(exposed&&th)tryFire(a,ai,world,dt,I,th,ai.suppressing?.6:1,ai.suppressing?1.8:1);
    const maxExp=role.expose*(ai.suppressing?1.6:1)*(1-ai.supp*.4);
    if(ai.burstDone||t-ai.exposeT>maxExp||hurtNow||(!th&&t-ai.exposeT>.8)){ai.phase='hide';ai.burstDone=false;ai.phaseT=t+rr(role.peekHide[0],role.peekHide[1])/(world.diff?world.diff.aggression:1)*(1+ai.supp*.8);if(sq)sq.releaseFire(a);
      /* threat moved so this peek no longer sees him: refresh */
      if(th)cv.peek=nav.peekFrom(sp,th.x,th.z,cv.hide)}
    break}
  default:{if(ai.cover){ai.sub='move'}break}}
  if(ai.wantSurrender){I.wantsSurrender=true;ai.wantSurrender=false}}

/* move an agent by its intent (no collision: the game calls collide() after) */
AI.move=function(a,I,dt,turnRate=8){if(I.dir&&I.speed>0){a.pos.x+=I.dir.x*I.speed*(I.stance==='crouch'?.6:1)*dt;a.pos.z+=I.dir.z*I.speed*(I.stance==='crouch'?.6:1)*dt}
  if(I.face){const want=Math.atan2(I.face.x-a.pos.x,I.face.z-a.pos.z);let d=want-a.yaw;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;a.yaw+=d*Math.min(1,dt*turnRate)}};

/* tell the AI about a shot: suppression for anyone the round passes near, hearing for the rest.
   from/to are world points; returns the list of agents that were suppressed */
AI.shotFired=function(fx,fz,tx,tz,agents,t,o){o=o||{};const out=[];const dx=tx-fx,dz=tz-fz,L2=dx*dx+dz*dz||1;
  for(const a of agents){if(isOut(a))continue;const ai=memOf(a);const u=clamp(((a.pos.x-fx)*dx+(a.pos.z-fz)*dz)/L2,0,1);const px=fx+dx*u,pz=fz+dz*u,d=hyp(a.pos.x-px,a.pos.z-pz);
    if(d<2.2){ai.supp=Math.min(1,ai.supp+(2.2-d)/2.2*.35);out.push(a)}}
  return out};
/* surrender chance for the game's existing rule: base chance raised as squad morale drops */
AI.surrenderChance=function(a,base=.5){const sq=a.squad;const m=sq?sq.morale:1;return clamp(base+(1-m)*.25,.05,.85)};

/* ================= crew (allies) ================= */
/* world: {nav, t, player:{x,z,yaw (camera convention),crouch,moving,reloading,busy,hp,down}, camera:{x,z,yaw},
   enemies:[{id,pos:{x,z},state,ai?}] (the game's enemy objects work), allies:[crew], barker} */
AI.ally=function(a,world,dt){const nav=world.nav,t=world.t,P=world.player;
  const ai=a.ai&&a.ai.v===2?a.ai:(a.ai={v:2,mode:'follow',path:null,pi2:0,goal:null,repathT:-1e9,thinkT:rr(0,.3),fireT:rr(.5,1.2),target:null,seen:new Set(),stance:'stand',intent:{},cover:null,lastPos:{x:a.pos.x,z:a.pos.z},stuckT:0,stackT:0,side:0,aimT:0});
  const I=ai.intent;I.fire=false;I.bark=null;I.dir=null;I.speed=0;I.face=null;I.revive=null;I.reviving=false;I.targetId=null;I.hitChance=0;I.dmg=0;I.callout=null;I.yield=false;
  if(a.down){I.state='down';return I}
  const gun=AI.ALLY_GUNS[a.gun]||AI.ALLY_GUNS.pistol;const barker=world.barker||(world.barker=AI.barker({gap:1.2}));
  const say=(ev,vars)=>{if(I.bark)return;const b=barker.say('ally',ev,a.id,t,vars);if(b)I.bark=b};
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  const dP=hyp(a.pos.x-P.x,a.pos.z-P.z);
  const RO=a.role&&a.role.kind?a.role:null;/* role commands (see below) */
  /* enemies: active and seen by me (or close to the dad and alert) */
  const live=(world.enemies||[]).filter(e=>!isOut(e));
  ai.thinkT-=dt;const decide=ai.thinkT<=0;if(decide)ai.thinkT=rr(.25,.35);
  if(decide){let best=null,bs=1e9;ai.visible=[];
    for(const e of live){const d=hyp(e.pos.x-a.pos.x,e.pos.z-a.pos.z);if(d>32)continue;if(RO&&(RO.kind==='lift'||RO.fire===false||(RO.ok&&!RO.ok(e))))continue;const crouch=e.ai&&e.ai.stance==='crouch';
      if(!nav.los(a.pos.x,a.pos.z,e.pos.x,e.pos.z,crouch?'b':false))continue;const alert=e.ai?e.ai.mode!=='idle':!!e.alert;if(!alert&&hyp(e.pos.x-P.x,e.pos.z-P.z)>15)continue;
      ai.visible.push(e);
      /* covering the dad while he reloads or zip-ties: whoever is closest to him first */
      const dpe=hyp(e.pos.x-P.x,e.pos.z-P.z);const s=(P.reloading||P.busy?dpe*1.5:d)+(e.ai&&e.ai.phase==='peek'||e.ai&&e.ai.sub==='rush'?-6:0);if(s<bs){bs=s;best=e}
      if(!ai.seen.has(e)){ai.seen.add(e);if(alert){const w=AI.dirWord(P.x,P.z,fx,fz,e.pos.x,e.pos.z);const ev={front:'contactFront',left:'contactLeft',right:'contactRight',behind:'contactBehind'}[w];
        const rid=nav.roomAt(e.pos.x,e.pos.z),rn=nav.rooms[rid]&&nav.rooms[rid].name;if(rn&&rid!==nav.roomAt(P.x,P.z)&&R()<.4)say('contactRoom',{room:rn,where:nav.rooms[rid].where||'in '+rn});else say(ev);I.callout={dir:w,id:e.id,room:rn}}}}
    ai.target=best;
    if(best&&best.ai&&best.ai.intent&&best.ai.intent.reloading&&R()<.3)say('enemyReloading');
    if(best&&best.ai&&best.ai.sub==='flank'&&R()<.3)say('enemyFlanking')}
  if(ai.target&&isOut(ai.target))ai.target=null;
  const combat=!!ai.target||live.some(e=>e.ai&&e.ai.mode==='combat'&&hyp(e.pos.x-P.x,e.pos.z-P.z)<20&&nav.los(P.x,P.z,e.pos.x,e.pos.z,false));
  if(combat)ai.lastCombat=t;
  if(!combat&&ai.wasCombat&&t-ai.lastCombat>4){ai.wasCombat=false;if(!live.some(e=>hyp(e.pos.x-P.x,e.pos.z-P.z)<14))say('clear')}
  if(combat)ai.wasCombat=true;
  if((P.reloading||P.busy)&&combat)say('covering');

  /* revive hook: nearest healthy crewman goes to a downed one when it is safe */
  const downed=(world.allies||[]).filter(o=>o!==a&&o.down);let goal=null,speed=4.5,mode='follow';
  if(downed.length&&!ai.target){const o=downed.reduce((b,x)=>hyp(x.pos.x-a.pos.x,x.pos.z-a.pos.z)<hyp(b.pos.x-a.pos.x,b.pos.z-a.pos.z)?x:b);
    const mine=(world.allies||[]).filter(x=>!x.down).every(x=>x===a||hyp(x.pos.x-o.pos.x,x.pos.z-o.pos.z)>=hyp(a.pos.x-o.pos.x,a.pos.z-o.pos.z)-.01);
    const safe=!live.some(e=>e.ai&&e.ai.mode==='combat'&&hyp(e.pos.x-o.pos.x,e.pos.z-o.pos.z)<10);
    if(mine&&safe){mode='revive';goal={x:o.pos.x,z:o.pos.z};speed=5.5;I.revive=o.id;if(hyp(o.pos.x-a.pos.x,o.pos.z-a.pos.z)<1.3){I.reviving=true;goal=null;say('revive')}}}

  /* stack up: the dad crouches next to a doorway with no fight on */
  let stackDoor=null;if(!RO&&!combat&&P.crouch&&mode==='follow'){let bd=3.2;for(const d of nav.doors){if(d.cells.length>4)continue;const dd=hyp(d.x-P.x,d.z-P.z);if(dd<bd){bd=dd;stackDoor=d}}}
  if(stackDoor){mode='stack';const d=stackDoor;const ax=d.axis==='x'?1:0,az=1-ax;/* through-direction */const side=Math.sign((P.x-d.x)*ax+(P.z-d.z)*az)||1;
    const k=a.slot||0,lat=(k%2?1:-1)*(1.5+Math.floor(k/2)*1.2);/* along the wall, either side of the door */
    let gx=d.x+ax*side*nav.tile*.9+az*lat,gz=d.z+az*side*nav.tile*.9+ax*lat;const c=nav.nearestWalkable(gx,gz,2);if(c>=0&&nav.door[c]){gx+=az*lat*.6;gz+=ax*lat*.6}
    goal={x:gx,z:gz};speed=3.5;ai.stackSide=side;ai.stackDoor=d;if(t-ai.stackT>8){ai.stackT=t;say('stack')}}
  else if(ai.stackDoor&&!P.crouch){const d=ai.stackDoor;const ax=d.axis==='x'?1:0,az=1-ax;const side=Math.sign((P.x-d.x)*ax+(P.z-d.z)*az)||1;
    /* the dad standing up (or stepping through) from a stack is the go signal */
    ai.breachT=t+4;say('breach');ai.stackDoor=null}
  if(ai.breachT>t&&mode==='follow')speed=6;

  /* fight: cover near the dad that hides from my target and can peek it */
  if(mode==='follow'&&combat&&dP<14){const tg=ai.target||live.filter(e=>e.ai&&e.ai.mode==='combat').sort((p,q)=>hyp(p.pos.x-P.x,p.pos.z-P.z)-hyp(q.pos.x-P.x,q.pos.z-P.z))[0];
    if(tg&&(decide&&(!ai.cover||t-ai.coverT>2.5||hyp(ai.cover.spot.x-P.x,ai.cover.spot.z-P.z)>8))){ai.cover=allyCover(a,ai,world,tg);ai.coverT=t}
    if(ai.cover){mode='cover';goal={x:ai.cover.spot.x,z:ai.cover.spot.z};speed=5}}
  else ai.cover=null;
  if(mode==='follow'){goal=formationSlot(a,world,P,fx,fz,rx,rz);speed=dP>6?6.4:4.5;if(dP>30){I.teleport={x:P.x-fx*1.2,z:P.z-fz*1.2}}}
  /* never block a doorway the dad is heading for */
  const myCell=nav.cellOf(a.pos.x,a.pos.z);
  if(!RO&&myCell>=0&&nav.door[myCell]&&dP<5&&mode!=='stack'){const y=yieldSpot(a,world,P);if(y){goal=y;speed=4.5;I.yield=true;if(P.moving)say('yield')}}
  if(goal&&mode!=='stack'&&mode!=='revive'){const gc=nav.cellOf(goal.x,goal.z);if(gc>=0&&nav.door[gc]&&mode==='follow'){const y=nav.nearestWalkable(goal.x+(a.pos.x-goal.x)*.5,goal.z+(a.pos.z-goal.z)*.5);if(y>=0&&!nav.door[y])goal={x:nav.wx(y),z:nav.wz(y)}}}

  /* role commands (js/jobs/moving.js, the crew radio): a.role={kind:'cover'|'lift'|'go', x, z, r?, speed?, face?:{x,z}, fire?:false, ok?:e=>bool}.
     The job, not the dad, decides where this crewman stands. cover: hold (x,z) and fight from there; go: walk there and stay (fire allowed);
     lift: walk to (x,z) and never fire (the job moves the point between the truck and the door). ok(e) filters who may be shot at.
     I.state='role', I.role=kind, I.arrived once within r (default .7) of the point. a.role=null hands him back to the formation. */
  if(RO){mode='role';ai.cover=null;ai.stackDoor=null;I.teleport=null;I.yield=false;I.revive=null;I.reviving=false;
    if(RO.kind==='lift'||RO.fire===false)ai.target=null;
    const dr=hyp(RO.x-a.pos.x,RO.z-a.pos.z);I.arrived=dr<(RO.r||.7);goal=I.arrived?null:{x:RO.x,z:RO.z};speed=RO.speed||(RO.kind==='lift'?3.4:dr>6?5.6:4);
    if(!ai.target&&I.arrived&&RO.face)I.face={x:RO.face.x,z:RO.face.z}}
  I.role=RO?RO.kind:null;
  /* move */
  if(goal){const dg=hyp(goal.x-a.pos.x,goal.z-a.pos.z);
    if(dg>.6){if(!ai.path||!ai.goal||hyp(ai.goal.x-goal.x,ai.goal.z-goal.z)>1.2||t-ai.repathT>1.2){const p=nav.path(a.pos.x,a.pos.z,goal.x,goal.z);ai.path=p?p.pts:null;if(mode==='role')ai.path=(ai.path||[{x:a.pos.x,z:a.pos.z}]).concat([{x:goal.x,z:goal.z}]);/* a role point is exact, not a cell centre */ai.pi2=1;ai.goal=goal;ai.repathT=t}
      const fake={pos:a.pos};steer(a,ai,{agents:world.allies,threats:[{x:P.x,z:P.z}]},speed,I);void fake}
    else ai.path=null}
  ai.stance=mode==='stack'?'crouch':mode==='role'&&RO.crouch&&!(ai.target&&ai.fireT<.25)?'crouch':(mode==='cover'&&ai.cover&&ai.cover.hide==='crouch'&&!(ai.target&&ai.fireT<.25))?'crouch':'stand';
  /* fire */
  if(ai.target&&mode!=='revive'){const e=ai.target,d=hyp(e.pos.x-a.pos.x,e.pos.z-a.pos.z);I.face={x:e.pos.x,z:e.pos.z};ai.aimT+=dt;ai.fireT-=dt;
    const crouch=e.ai&&e.ai.stance==='crouch';
    if(ai.fireT<=0&&ai.aimT>.35&&nav.los(a.pos.x,a.pos.z,e.pos.x,e.pos.z,crouch?'b':false)){ai.fireT=gun.cd*rr(.8,1.3);I.fire=true;I.targetId=e.id;
      I.dmg=gun.close&&d<gun.close[0]?gun.close[1]:gun.dmg;I.hitChance=clamp(gun.acc*AI.ALLY_SUPPORT*clamp(1.2-d/35,.2,1)*(crouch?.8:1)*(I.speed>0?.85:1)*(e.ai&&e.ai.intent&&e.ai.intent.speed>0?.8:1),.03,.9);ai.stance='stand'}}
  else{ai.aimT=0;if(!I.face){I.face=I.dir&&I.speed>.5?{x:a.pos.x+I.dir.x,z:a.pos.z+I.dir.z}:{x:a.pos.x+fx*3,z:a.pos.z+fz*3}}}
  if(I.speed>0){const mv=hyp(a.pos.x-ai.lastPos.x,a.pos.z-ai.lastPos.z);if(mv<I.speed*dt*.15)ai.stuckT+=dt;else ai.stuckT=0;if(ai.stuckT>1.5){ai.stuckT=0;ai.path=null}}
  ai.lastPos.x=a.pos.x;ai.lastPos.z=a.pos.z;
  I.state=mode;I.stance=ai.stance;I.moveTo=goal;I.path=ai.path;I.target=ai.target?ai.target.id:null;
  return I};

/* formation: flank the dad, out of the over-the-shoulder camera cone, never on a doorway */
function formationSlot(a,world,P,fx,fz,rx,rz){const nav=world.nav,cam=world.camera;const k=a.slot||0;const side=k%2?1:-1,row=1+Math.floor(k/2);
  const cands=[];for(const lat of[side*(side>0?2.4:1.9),side*3.2,-side*2.2,side*1.4])for(const back of[1.2*row,.4*row,2*row])cands.push([P.x-fx*back+rx*lat,P.z-fz*back+rz*lat]);
  for(const[x,z]of cands){if(!nav.clearPt(x,z,.35))continue;const c=nav.cellOf(x,z);if(nav.door[c])continue;if(cam&&inCamCone(cam,P,x,z))continue;if(!nav.los(P.x,P.z,x,z,false)&&hyp(P.x-x,P.z-z)>2)continue;return{x,z}}
  return{x:P.x-fx*1.2,z:P.z-fz*1.2}}
/* is (x,z) inside the cone from the camera through the dad (half-angle ~24 degrees, until 6 m past him) */
function inCamCone(cam,P,x,z){const cfx=-Math.sin(cam.yaw),cfz=-Math.cos(cam.yaw);const dx=x-cam.x,dz=z-cam.z,d=hyp(dx,dz);if(d<.8)return true;
  const along=dx*cfx+dz*cfz;const reach=hyp(P.x-cam.x,P.z-cam.z)+6;if(along<0||along>reach)return false;return Math.abs(dx*cfz-dz*cfx)<Math.max(.9,along*Math.tan(.42))}
AI.inCamCone=inCamCone;
/* the strip down the middle of the dad's view out to 22 m: where his crosshair (and his bullets) go */
function inFireLane(cam,x,z){const cfx=-Math.sin(cam.yaw),cfz=-Math.cos(cam.yaw),dx=x-cam.x,dz=z-cam.z,along=dx*cfx+dz*cfz;if(along<0||along>22)return false;return Math.abs(dx*cfz-dz*cfx)<Math.max(1.2,along*.2)}
function yieldSpot(a,world,P){const nav=world.nav;const c0=nav.cellOf(a.pos.x,a.pos.z);let best=null,bs=1e9;const cx=c0%nav.W,cz=(c0/nav.W)|0;
  for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){const x=cx+dx,z=cz+dz;if(!nav.walkable(x,z))continue;const k=z*nav.W+x;if(nav.door[k])continue;
    const wx=nav.wx(k),wz=nav.wz(k);const dp=hyp(wx-P.x,wz-P.z);if(dp<1.5)continue;const s=hyp(wx-a.pos.x,wz-a.pos.z)-Math.min(dp,4)*.3;if(s<bs){bs=s;best={x:wx,z:wz}}}
  return best}
function allyCover(a,ai,world,e){const nav=world.nav,P=world.player;let best=null,bs=-1e9;
  for(const sp of nav.covers){const dp=hyp(sp.x-P.x,sp.z-P.z);if(dp>7||dp<1.2)continue;const d=hyp(sp.x-e.pos.x,sp.z-e.pos.z);if(d<4)continue;
    if((world.allies||[]).some(o=>o!==a&&o.ai&&o.ai.cover&&o.ai.cover.spot===sp))continue;
    let s=-hyp(sp.x-a.pos.x,sp.z-a.pos.z)*.4-dp*.3;if(sp.door)s-=4;const cm=world.camera||{x:P.x,z:P.z,yaw:P.yaw};if(inCamCone(cm,P,sp.x,sp.z)||inFireLane(cm,sp.x,sp.z))s-=9;if(s<bs-6)continue;
    const hide=nav.hides(sp,e.pos.x,e.pos.z);if(!hide)continue;const pk=nav.peekFrom(sp,e.pos.x,e.pos.z,hide);s+=pk?3:-2;if(s>bs){bs=s;best={spot:sp,hide,peek:pk}}}
  return best}

/* ================= wave director (park defence) ================= */
/* o: {spawns:[{x,z}], defend:{x,z}, waves:[5,7,10], group:[2,3], gap:[2.5,4.5], minDist:18, between:4}
   update(dt, world) returns spawn orders [{x,z,lane:[{x,z}],flank,wave,role?}]; the game spawns them and sets e.lane=order.lane.
   world: {t, threats, alive (live enemies count), agents (live enemies)} */
AI.director=function(nav,o){o=Object.assign({group:[2,3],gap:[2.5,4.5],minDist:18,between:4,huntAfter:25},o);
  const D={wave:0,queue:0,state:'between',t:0,nextT:o.firstDelay??3,waveAge:0,orders:[],hunt:false,finished:false,started:false,lastSpawn:new Map(),spawned:0};
  /* lanes: the straight-ish approach and a flank lane that swings wide of it */
  const lanes=o.spawns.map(s=>{const direct=nav.path(s.x,s.z,o.defend.x,o.defend.z);if(!direct)return null;
    const near=new Uint8Array(nav.N);for(const c of direct.cells){const cx=c%nav.W,cz=(c/nav.W)|0;for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)if(nav.inb(cx+dx,cz+dz))near[(cz+dz)*nav.W+cx+dx]=1}
    const dd=nav.distField(nav.nearestWalkable(o.defend.x,o.defend.z));
    const flank=nav.path(s.x,s.z,o.defend.x,o.defend.z,{cost:i=>near[i]&&dd[i]>8?6:0});
    return{direct:direct.pts,flank:flank?flank.pts:direct.pts}});
  D.lanes=lanes;
  D.update=function(dt,world){const t=world.t;D.t=t;const out=[];if(D.finished)return out;const alive=world.alive|0;D.waveAge+=dt;
    if(D.state==='between'){if(alive===0&&t>=D.nextT){if(D.wave>=o.waves.length){D.finished=true;return out}D.wave++;D.queue=o.waves[D.wave-1];D.state='spawning';D.waveAge=0;D.hunt=false;D.started=true;D.nextT=t}}
    if(D.state==='spawning'&&t>=D.nextT&&D.queue>0){const n=Math.min(D.queue,Math.round(rr(o.group[0],o.group[1]+.49)));const pts=pickSpawns(world,n);
      for(let i=0;i<pts.length;i++){const p=pts[i];const L=lanes[p.si];const fl=L&&(D.spawned%3===2);out.push({x:p.x,z:p.z,lane:L?(fl?L.flank:L.direct).slice(1):null,flank:!!fl,wave:D.wave});D.spawned++;D.queue--}
      D.nextT=t+rr(o.gap[0],o.gap[1]);if(D.queue<=0){D.state='fighting'}}
    if(D.state==='fighting'){if(alive===0){D.state='between';D.nextT=t+o.between}
      else if(!D.hunt&&alive<=2&&D.waveAge>o.huntAfter){D.hunt=true;for(const a of world.agents||[])a.hunt=true}}
    D.orders=out;return out};
  /* the dad can see (x,z): line of sight and inside his view cone (threat.fx/fz = facing, threat.fov = half-angle, default 55 deg) */
  const seenBy=(th,x,z)=>{if(!nav.los(th.x,th.z,x,z,false))return false;if(th.fx==null)return true;const dx=x-th.x,dz=z-th.z,d=hyp(dx,dz)||1;return(dx*th.fx+dz*th.fz)/d>Math.cos(th.fov||.96)};
  const behind=(th,x,z)=>th.fx!=null&&((x-th.x)*th.fx+(z-th.z)*th.fz)/(hyp(x-th.x,z-th.z)||1)<-.5;
  D.seenBy=seenBy;
  function pickSpawns(world,n){const ths=(world.threats||[]).filter(x=>!x.down),dad=ths.find(x=>x.isPlayer)||ths[0];const bodies=world.agents||[];const t=world.t;const out=[];
    const ok=o.spawns.map((s,si)=>({s,si,d:Math.min(...ths.map(th=>hyp(th.x-s.x,th.z-s.z)),1e9),seen:dad?seenBy(dad,s.x,s.z):false,los:ths.some(th=>nav.los(th.x,th.z,s.x,s.z,false)),back:dad?behind(dad,s.x,s.z):false}))
      .filter(c=>c.d>=o.minDist&&t-(D.lastSpawn.get(c.si)??-1e9)>2);
    /* best: nobody has line of sight; then: out of the dad's view but not behind him; then whatever is farthest */
    let pool=ok.filter(c=>!c.los);if(!pool.length)pool=ok.filter(c=>!c.seen&&!c.back);if(!pool.length)pool=ok.filter(c=>!c.seen);if(!pool.length)pool=ok.length?ok:o.spawns.map((s,si)=>({s,si,d:0}));
    pool.sort((p,q)=>q.d-p.d+rr(-8,8));const sp=pool[0];D.lastSpawn.set(sp.si,t);
    /* spread the group on free cells around the spawn, preferring cells the dad can't see */
    const c0=nav.nearestWalkable(sp.s.x,sp.s.z);const cx=c0%nav.W,cz=(c0/nav.W)|0;const cells=[];
    for(let r=0;r<=3;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;if(!nav.walkable(cx+dx,cz+dz))continue;const k=(cz+dz)*nav.W+cx+dx;cells.push([k,(dad&&seenBy(dad,nav.wx(k),nav.wz(k))?10:0)+r])}
    cells.sort((p,q)=>p[1]-q[1]);
    for(const[c]of cells){const x=nav.wx(c)+rr(-.3,.3),z=nav.wz(c)+rr(-.3,.3);if(bodies.some(b=>!isOut(b)&&hyp(b.pos.x-x,b.pos.z-z)<1.3)||out.some(p=>hyp(p.x-x,p.z-z)<1.3))continue;out.push({x,z,si:sp.si});if(out.length>=n)break}
    return out}
  return D};

if(typeof module!=='undefined'&&module.exports)module.exports=AI;
root.HT=root.HT||{};root.HT.AI=AI;
})(typeof window!=='undefined'?window:globalThis);
