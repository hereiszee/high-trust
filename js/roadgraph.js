/* High Trust · HT.Roads
 * Road graph over the HT.World grid (docs/design/SPEC2.md B.7, A.10). Pure data, browser + Node.
 *
 *   const G = HT.Roads.build(def);          // nodes at centreline intersections and dead ends
 *   G.path(a,b)        -> [nodeIds]         shortest path (Dijkstra on edge length)
 *   G.route(from,to)   -> {nodes, points}   road route between two world points, right-lane polyline in metres
 *   G.lane(nodeIds)    -> [{x,z}]           right-hand lane centre-line with filleted corners
 *   G.nearestNode(x,z), G.nearestRoad(x,z), G.stopPoints(nodeId)
 *   HT.Roads.gps(def, from, to)             tile Dijkstra for the GPS line (roads cheap, grass dear, solids blocked)
 * Node coordinates: tx,tz tiles (centreline tile) and x,z metres (tile centre). Rebuild after HT.World.openBridge().
 */
(function(root){'use strict';
const HT=root.HT=root.HT||{};
const TILE=2,tc=i=>i*TILE+TILE/2,tx=m=>Math.floor(m/TILE);
const LANE=1.5,ARC=4.5,DRIVE=',=VlD';/* D: the minivan's spot on Oak St is road too */

function build(def){
  const g=def.map,roads=def.roads;
  const Hs=roads.filter(r=>r.o==='h').map(r=>({z:r.k+1,a:r.a,b:r.b,name:r.name})),Vs=roads.filter(r=>r.o==='v').map(r=>({x:r.k+1,a:r.a,b:r.b,name:r.name}));
  const raw=[],key=new Map(),id=(x,z)=>{const k=x+','+z;if(!key.has(k)){key.set(k,raw.length);raw.push({tx:x,tz:z,e:[]})}return key.get(k)};
  for(const h of Hs)for(const v of Vs)if(v.x>=h.a&&v.x<=h.b&&h.z>=v.a&&h.z<=v.b&&',='.includes(g[h.z][v.x]))id(v.x,h.z);
  for(const h of Hs)for(const x of[h.a+1,h.b-1])if(',='.includes(g[h.z][x]))id(x,h.z);
  for(const v of Vs)for(const z of[v.a+1,v.b-1])if(',='.includes(g[z][v.x]))id(v.x,z);
  const clear=(x0,z0,x1,z1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));for(let i=0;i<=n;i++){const x=x0+Math.sign(x1-x0)*i,z=z0+Math.sign(z1-z0)*i;if(!DRIVE.includes(g[z][x]))return false}return true};
  const link=(list,ax)=>{for(const r of list){const on=raw.map((n,i)=>[n,i]).filter(([n])=>ax==='h'?n.tz===r.z&&n.tx>=r.a&&n.tx<=r.b:n.tx===r.x&&n.tz>=r.a&&n.tz<=r.b)
      .sort((p,q)=>ax==='h'?p[0].tx-q[0].tx:p[0].tz-q[0].tz);
    for(let k=1;k<on.length;k++){const[a,i]=on[k-1],[b,j]=on[k];if(clear(a.tx,a.tz,b.tx,b.tz)){const d=Math.abs(a.tx-b.tx)+Math.abs(a.tz-b.tz);a.e.push({to:j,d,road:r.name});b.e.push({to:i,d,road:r.name})}}}};
  link(Hs,'h');link(Vs,'v');
  /* prune stubs: dead ends shorter than 4 tiles (street ends at the riverbank and at lot fences) are noise for routing and AI */
  for(let pass=0;pass<2;pass++)raw.forEach((n,i)=>{if(n.e.length===1&&n.e[0].d<4){const o=raw[n.e[0].to];o.e=o.e.filter(e=>e.to!==i);n.e=[]}});
  const map=[];let c=0;raw.forEach((n,i)=>map[i]=n.e.length?c++:-1);
  const nodes=raw.filter(n=>n.e.length).map((n,i)=>({id:i,tx:n.tx,tz:n.tz,x:tc(n.tx),z:tc(n.tz),
    e:n.e.map(e=>{const to=raw[e.to];return{to:map[e.to],d:e.d,len:e.d*TILE,road:e.road,dir:[Math.sign(to.tx-n.tx),Math.sign(to.tz-n.tz)]}})}));
  const edges=[];nodes.forEach(n=>n.e.forEach(e=>{if(e.to>n.id)edges.push({a:n.id,b:e.to,len:e.len,road:e.road})}));
  const G={nodes,edges,bridgeOpen:!!def.bridgeOpen};

  G.edge=(a,b)=>nodes[a].e.find(e=>e.to===b)||null;
  G.path=(a,b)=>{if(a===b)return[a];const N=nodes.length,dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);dist[a]=0;
    for(;;){let u=-1,best=Infinity;for(let i=0;i<N;i++)if(!done[i]&&dist[i]<best){best=dist[i];u=i}if(u<0||u===b)break;done[u]=1;
      for(const e of nodes[u].e){const nd=dist[u]+e.len;if(nd<dist[e.to]){dist[e.to]=nd;prev[e.to]=u}}}
    if(!isFinite(dist[b]))return null;const p=[b];while(p[0]!==a)p.unshift(prev[p[0]]);return p};
  G.nearestNode=(x,z,filter)=>{let bi=-1,bd=Infinity;for(const n of nodes){if(filter&&!filter(n))continue;const d=(n.x-x)**2+(n.z-z)**2;if(d<bd){bd=d;bi=n.id}}return bi};
  /* closest point on any edge centreline: {a,b,t (0..1 from a to b),x,z,dist} */
  G.nearestRoad=(x,z)=>{let best=null;for(const ed of edges){const A=nodes[ed.a],B=nodes[ed.b],dx=B.x-A.x,dz=B.z-A.z,L2=dx*dx+dz*dz;
      const t=Math.max(0,Math.min(1,((x-A.x)*dx+(z-A.z)*dz)/L2)),px=A.x+dx*t,pz=A.z+dz*t,d=Math.hypot(px-x,pz-z);
      if(!best||d<best.dist)best={a:ed.a,b:ed.b,t,x:px,z:pz,dist:d}}return best};
  /* right-hand lane polyline through a node sequence, corners filleted with radius ARC */
  G.lane=(ids,opts)=>{opts=opts||{};const off=opts.offset!=null?opts.offset:LANE,R=opts.arc||ARC,P=ids.map(i=>nodes[i]),out=[];
    if(P.length<2)return P.map(n=>({x:n.x,z:n.z}));
    const dirOf=(a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;return[dx/l,dz/l]},right=d=>[-d[1],d[0]];
    const d0=dirOf(P[0],P[1]),r0=right(d0);out.push({x:P[0].x+r0[0]*off,z:P[0].z+r0[1]*off});
    for(let i=1;i<P.length-1;i++){const d1=dirOf(P[i-1],P[i]),d2=dirOf(P[i],P[i+1]),r1=right(d1),r2=right(d2),dot=d1[0]*d2[0]+d1[1]*d2[1];
      if(dot>.99){out.push({x:P[i].x+r1[0]*off,z:P[i].z+r1[1]*off});continue}
      if(dot<-.99){/* U-turn at a dead end: swing round the node */const c={x:P[i].x,z:P[i].z};for(let k=0;k<=4;k++){const a=Math.PI*k/4,s=Math.cos(a),q=Math.sin(a);
          out.push({x:c.x+r1[0]*off*s+d1[0]*off*q,z:c.z+r1[1]*off*s+d1[1]*off*q})}continue}
      const Q={x:P[i].x+(r1[0]+r2[0])*off,z:P[i].z+(r1[1]+r2[1])*off},A={x:Q.x-d1[0]*R,z:Q.z-d1[1]*R},Bp={x:Q.x+d2[0]*R,z:Q.z+d2[1]*R};
      for(let k=0;k<=4;k++){const t=k/4,u=1-t;out.push({x:u*u*A.x+2*u*t*Q.x+t*t*Bp.x,z:u*u*A.z+2*u*t*Q.z+t*t*Bp.z})}}
    const n=P.length,dl=dirOf(P[n-2],P[n-1]),rl=right(dl);out.push({x:P[n-1].x+rl[0]*off,z:P[n-1].z+rl[1]*off});return out};
  /* road route between two world points: nearest road points at both ends, best pair of edge endpoints */
  G.route=(from,to)=>{const s=G.nearestRoad(from.x,from.z),t=G.nearestRoad(to.x,to.z);if(!s||!t)return null;
    let best=null;for(const a of[s.a,s.b])for(const b of[t.a,t.b]){const p=G.path(a,b);if(!p)continue;
      const len=Math.hypot(nodes[a].x-s.x,nodes[a].z-s.z)+p.reduce((L,id,k)=>k?L+G.edge(p[k-1],id).len:0,0)+Math.hypot(nodes[b].x-t.x,nodes[b].z-t.z);
      if(!best||len<best.len)best={len,nodes:p}}
    if(!best)return null;const pts=G.lane(best.nodes);return{nodes:best.nodes,len:best.len,points:[{x:s.x,z:s.z},...pts,{x:t.x,z:t.z}]}};
  /* where a car waits before entering an intersection: one point per incoming edge, on the right lane, ARC metres back */
  G.stopPoints=id=>nodes[id].e.map(e=>{const d=[-e.dir[0],-e.dir[1]],r=[-d[1],d[0]],n=nodes[id];   // d = direction of travel when arriving from that edge
    return{from:e.to,x:n.x-d[0]*ARC+r[0]*LANE,z:n.z-d[1]*ARC+r[1]*LANE,yaw:Math.atan2(-d[0],-d[1])}});
  G.degree=id=>nodes[id].e.length;
  G.components=()=>{const comp=new Int32Array(nodes.length).fill(-1);let k=0;for(const n of nodes){if(comp[n.id]>=0)continue;const q=[n.id];comp[n.id]=k;
      while(q.length){const c=q.pop();for(const e of nodes[c].e)if(comp[e.to]<0){comp[e.to]=k;q.push(e.to)}}k++}return{count:k,of:comp}};
  return G}

/* ---------- GPS on the tile grid (SPEC2 A.10) ---------- */
const COST={',':1,'=':1,'V':1,s:3,p:3,l:3,D:1,U:1,g:8,b:8,'1':8,'2':8,'3':8,'4':8,H:8,R:8,P:3};
function gps(def,from,to,opts){opts=opts||{};const W=def.W,H=def.H,g=def.map,solid=def.solid;
  const s=[tx(from.x),tx(from.z)],t=[tx(to.x),tx(to.z)],N=W*H,dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1);
  const cost=(x,z)=>{const c=g[z][x];if(c==='!'&&!def.bridgeOpen)return Infinity;if(solid.includes(c))return Infinity;return COST[c]||4};
  const heap=[],push=(k,d)=>{heap.push([d,k]);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p][0]<=heap[i][0])break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}},
    pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
  const sk=s[1]*W+s[0],tk=t[1]*W+t[0];dist[sk]=0;push(sk,0);
  while(heap.length){const[d,k]=pop();if(d>dist[k])continue;if(k===tk)break;const x=k%W,z=(k/W)|0;
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=W||nz>=H)continue;const nk=nz*W+nx;
      const c=nk===tk?1:cost(nx,nz);if(!isFinite(c))continue;const nd=d+c;if(nd<dist[nk]){dist[nk]=nd;prev[nk]=k;push(nk,nd)}}}
  if(!isFinite(dist[tk]))return null;
  const tiles=[];for(let k=tk;k!==-1;k=prev[k]){tiles.push({tx:k%W,tz:(k/W)|0});if(k===sk)break}tiles.reverse();
  const simple=[tiles[0]];for(let i=1;i<tiles.length-1;i++){const a=simple[simple.length-1],b=tiles[i],c=tiles[i+1];if((b.tx-a.tx)*(c.tz-b.tz)!==(b.tz-a.tz)*(c.tx-b.tx))simple.push(b)}
  if(tiles.length>1)simple.push(tiles[tiles.length-1]);
  return{cost:dist[tk],tiles,points:simple.map(p=>({tx:p.tx,tz:p.tz,x:tc(p.tx),z:tc(p.tz)}))}}

HT.Roads={build,gps,LANE,ARC,DRIVE};
if(typeof module!=='undefined'&&module.exports)module.exports=HT.Roads;
})(typeof window!=='undefined'?window:globalThis);
