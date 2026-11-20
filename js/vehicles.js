/* High Trust: vehicle library (procedural, physically based).
 *
 * HT.Vehicles.init({assets})            optional; assets = game ASSETS object (only used for the env map if present)
 * HT.Vehicles.make(type, {color, upgrades, lod}) -> THREE.Group
 *     lod: 0 = hero (<=45k tris, 5-7 draw calls), 1 = parked/traffic (<=7k tris, 3 draw calls).
 *          Omitted: 1 when upgrades is missing/empty (parked cars, traffic), 0 otherwise. Pass lod:0 to force the hero model.
 *     type: 'minivan' | 'sedan' | 'suv' | 'hatch' | 'pickup' | 'workvan'
 *     Length runs along +X with the FRONT at +X, +Y up, the car's right side at +Z (left side, driver's side, at -Z).
 *     Centered on the origin in X/Z, tyres touch y = 0.
 *     color: base paint hex. upgrades (unknown keys ignored, missing = stock):
 *       paint: '#hex' colour, or a finish 'solid'|'twotone'|'wood'|'mural' (finish keeps opts.color as the base paint)
 *       rims: 'stock'|'steel'|'alloy'|'black'|'chrome'|'gold'|'spinner'
 *       roofRack: true|'cargo' (crossbars + cargo box) | 'rails' (rails only)
 *       bullBar, spoiler: bool;  lightBar: bool | 'amber';  tint: 0..1
 *   group.userData = {
 *     type, size:{l,w,h}, len, wid, wheelBase, colliders:[{x0,z0,x1,z1}] (local AABB),
 *     wheels:[Object3D]  spinning wheel groups; they spin about their local Z axis (the axle).
 *                        Rolling forward (+X) is a NEGATIVE rotation.z: rotation.z -= distance / radius.
 *     wheelRadius,
 *     steer:[Object3D]   front wheel pivots; rotation.y = angle, positive = steer left (toward -Z).
 *     lights:{head:[], tail:[], brake:[], bar:[], drl:[], amber:[], reverse:[]}  lamp channels: objects with an
 *                        .emissiveIntensity property (all lamps live in the car's single multi material; update() drives them)
 *     material: the car's multi material (atlas + per-vertex PBR; uniforms in material.userData.U)
 *     body:[paint, lowerPaint] (MeshPhysicalMaterial, clearcoat + flake; same material twice unless two-tone; empty at LOD1)
 *     glass:[glass materials], bodyRoot / parts.body: Object3D that rolls/pitches, parts:{body,glass,wheels},
 *     contactShadow: soft AO blob (never casts a shadow),
 *     setUpgrades(u) (rebuilds in place), setColor(hex), setLights(on), flashBar(seconds), setDamage(0..1), dispose()
 *   }
 * HT.Vehicles.update(v, {speed, steer, braking, headlights, dt})
 *     speed m/s (+ forward), steer -1..1 (+ = left), braking bool, headlights bool (omit to keep setLights state), dt seconds.
 *     auto:false keeps the night auto-headlights off for this call (the player's car decides for itself).
 * HT.Vehicles.night(auto, gain): at night driven cars light up by themselves; gain scales lamp brightness against the night exposure.
 * HT.Vehicles.stats(v) -> {triangles, drawCalls, tris, calls};  HT.Vehicles.warm(types, lod) pre-builds cached geometry.
 * Draw calls per car: paint, multi (body trim/lamps/interior), glass, wheels, contact shadow (+1 for upgrades, +1 two-tone/finish).
 */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const T=THREE;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
const V3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
let ASSETS=null;

/* ---------------------------------------------------------------- profiles */
/* polyline through keys [x,y,r] with rounded corners (r = fillet length), evaluated as y(x) */
function profile(keys){
  const pts=[];
  for(let i=0;i<keys.length;i++){const [x,y,r=0]=keys[i];
    if(i===0||i===keys.length-1||!r){pts.push([x,y]);continue}
    const A=keys[i-1],B=keys[i+1],la=Math.hypot(A[0]-x,A[1]-y),lb=Math.hypot(B[0]-x,B[1]-y);
    const t1=Math.min(r,la*.5),t2=Math.min(r,lb*.5);
    const p1=[x+(A[0]-x)/la*t1,y+(A[1]-y)/la*t1],p2=[x+(B[0]-x)/lb*t2,y+(B[1]-y)/lb*t2];
    for(let k=0;k<=10;k++){const t=k/10,u=1-t;pts.push([u*u*p1[0]+2*u*t*x+t*t*p2[0],u*u*p1[1]+2*u*t*y+t*t*p2[1]])}}
  const f=x=>{if(x<=pts[0][0])return pts[0][1];const n=pts.length;if(x>=pts[n-1][0])return pts[n-1][1];
    let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;if(pts[m][0]<=x)lo=m;else hi=m}
    const a=pts[lo],b=pts[hi],d=b[0]-a[0];return d<1e-9?b[1]:a[1]+(b[1]-a[1])*(x-a[0])/d};
  f.keys=keys;return f}

/* ---------------------------------------------------------------- 2D polygon helpers (a,b plane) */
const area2=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2};
const ccw=p=>area2(p)<0?p.slice().reverse():p;
function hull(P){const p=P.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=1e-12)lo.pop();lo.push(q)}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=1e-12)up.pop();up.push(q)}
  up.pop();lo.pop();return lo.concat(up)}
/* round every corner of a polygon with a quadratic fillet of length r (number or per-vertex array) */
function roundPoly(P,r,seg=6){P=ccw(P);const n=P.length,out=[];
  for(let i=0;i<n;i++){const A=P[(i+n-1)%n],B=P[i],C=P[(i+1)%n],ri=Array.isArray(r)?r[i]:r;
    const la=Math.hypot(A[0]-B[0],A[1]-B[1]),lc=Math.hypot(C[0]-B[0],C[1]-B[1]);
    if(!ri||la<1e-6||lc<1e-6){out.push(B);continue}
    const t1=Math.min(ri,la*.48),t2=Math.min(ri,lc*.48);
    const p1=[B[0]+(A[0]-B[0])/la*t1,B[1]+(A[1]-B[1])/la*t1],p2=[B[0]+(C[0]-B[0])/lc*t2,B[1]+(C[1]-B[1])/lc*t2];
    for(let k=0;k<=seg;k++){const t=k/seg,u=1-t;out.push([u*u*p1[0]+2*u*t*B[0]+t*t*p2[0],u*u*p1[1]+2*u*t*B[1]+t*t*p2[1]])}}
  return out}
function subdiv(P,maxLen,closed=true){const out=[],n=P.length,m=closed?n:n-1;
  for(let i=0;i<m;i++){const a=P[i],b=P[(i+1)%n],l=Math.hypot(b[0]-a[0],b[1]-a[1]),k=Math.max(1,Math.ceil(l/maxLen));
    for(let j=0;j<k;j++)out.push([a[0]+(b[0]-a[0])*j/k,a[1]+(b[1]-a[1])*j/k])}
  if(!closed)out.push(P[n-1]);return out}
function insetPoly(P,d){const n=P.length,out=[];
  for(let i=0;i<n;i++){const A=P[(i+n-1)%n],B=P[i],C=P[(i+1)%n];
    let e1=[B[0]-A[0],B[1]-A[1]],e2=[C[0]-B[0],C[1]-B[1]];const l1=Math.hypot(...e1)||1,l2=Math.hypot(...e2)||1;
    const n1=[-e1[1]/l1,e1[0]/l1],n2=[-e2[1]/l2,e2[0]/l2];let m=[n1[0]+n2[0],n1[1]+n2[1]];const lm=Math.hypot(...m)||1;m=[m[0]/lm,m[1]/lm];
    const k=d/Math.max(.35,m[0]*n1[0]+m[1]*n1[1]);out.push([B[0]+m[0]*k,B[1]+m[1]*k])}
  return out}
/* Douglas-Peucker simplification of a closed polygon */
function simplify(P,tol){if(P.length<5)return P;const dp=(pts)=>{if(pts.length<3)return pts;const a=pts[0],b=pts[pts.length-1];let mi=-1,md=0;const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1e-9;
    for(let i=1;i<pts.length-1;i++){const d=Math.abs((pts[i][0]-a[0])*dy-(pts[i][1]-a[1])*dx)/l;if(d>md){md=d;mi=i}}
    if(md<=tol)return[a,b];const l1=dp(pts.slice(0,mi+1)),l2=dp(pts.slice(mi));return l1.slice(0,-1).concat(l2)};
  let far=0,fd=0;for(let i=1;i<P.length;i++){const d=Math.hypot(P[i][0]-P[0][0],P[i][1]-P[0][1]);if(d>fd){fd=d;far=i}}
  const A=dp(P.slice(0,far+1)),B=dp(P.slice(far).concat([P[0]]));return A.slice(0,-1).concat(B.slice(0,-1))}
const centroid=P=>{let a=0,b=0;for(const p of P){a+=p[0];b+=p[1]}return[a/P.length,b/P.length]};
const quad=(pts,r=.03)=>roundPoly(hull(pts),r);
const trap=(y0,y1,hw0,hw1,r=.03)=>roundPoly([[-hw0,y0],[hw0,y0],[hw1,y1],[-hw1,y1]],r);
const rectP=(cx,cy,w,h,r=.01)=>roundPoly([[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2]],r,4);
const circleP=(cx,cy,r,n=24)=>{const o=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r])}return o};
const mirrorA=P=>P.map(p=>[-p[0],p[1]]).reverse();

/* ---------------------------------------------------------------- normals with hard creases */
function creaseNormals(pos,thrDeg=42,tags){const nT=pos.length/9,fa=new Float32Array(nT*3),fu=new Float32Array(nT*3),out=new Float32Array(pos.length);
  const map=new Map(),key=i=>Math.round(pos[i]*4000)+'|'+Math.round(pos[i+1]*4000)+'|'+Math.round(pos[i+2]*4000)+(tags?'|'+tags[i/3]:'');
  for(let t=0;t<nT;t++){const o=t*9;const ux=pos[o+3]-pos[o],uy=pos[o+4]-pos[o+1],uz=pos[o+5]-pos[o+2],vx=pos[o+6]-pos[o],vy=pos[o+7]-pos[o+1],vz=pos[o+8]-pos[o+2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx,l=Math.hypot(cx,cy,cz);fa[t*3]=cx;fa[t*3+1]=cy;fa[t*3+2]=cz;
    if(l>1e-14){fu[t*3]=cx/l;fu[t*3+1]=cy/l;fu[t*3+2]=cz/l}
    for(let c=0;c<3;c++){const k=key(o+c*3);let a=map.get(k);if(!a)map.set(k,a=[]);a.push(t)}}
  const ct=Math.cos(thrDeg*Math.PI/180);
  for(let t=0;t<nT;t++){const nx=fu[t*3],ny=fu[t*3+1],nz=fu[t*3+2];
    for(let c=0;c<3;c++){const o=t*9+c*3,a=map.get(key(o));let sx=0,sy=0,sz=0;
      for(const f of a){if(fu[f*3]*nx+fu[f*3+1]*ny+fu[f*3+2]*nz>=ct){sx+=fa[f*3];sy+=fa[f*3+1];sz+=fa[f*3+2]}}
      let l=Math.hypot(sx,sy,sz);if(l<1e-14){sx=nx;sy=ny;sz=nz;l=Math.hypot(sx,sy,sz)||1}
      out[o]=sx/l;out[o+1]=sy/l;out[o+2]=sz/l}}
  return out}
function geoCrease(g,thr=40){g=g.index?g.toNonIndexed():g;g.setAttribute('normal',new T.BufferAttribute(creaseNormals(g.attributes.position.array,thr),3));return g}

/* ---------------------------------------------------------------- geometry buckets (one merged mesh per material) */
class Out{constructor(){this.b={}}
  get(m){return this.b[m]||(this.b[m]={p:[],n:[],u:[]})}
  tri(m,a,b,c,na,nb,nc,ua,ub,uc){const B=this.get(m);B.p.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z);
    B.n.push(na.x,na.y,na.z,nb.x,nb.y,nb.z,nc.x,nc.y,nc.z);
    if(ua)B.u.push(ua[0],ua[1],ub[0],ub[1],uc[0],uc[1]);else B.u.push(0,0,0,0,0,0)}
  /* add any THREE geometry, transformed by matrix m4 (Matrix4) */
  geo(m,g,m4){g=g.index?g.toNonIndexed():g.clone();if(m4)g.applyMatrix4(m4);if(!g.attributes.normal)g.computeVertexNormals();
    if(m4&&m4.determinant()<0){for(const a of[g.attributes.position,g.attributes.normal,g.attributes.uv]){if(!a)continue;const s=a.itemSize,arr=a.array;for(let t=0;t<a.count;t+=3)for(let k=0;k<s;k++){const i1=(t+1)*s+k,i2=(t+2)*s+k,tmp=arr[i1];arr[i1]=arr[i2];arr[i2]=tmp}}}
    const B=this.get(m),p=g.attributes.position.array,n=g.attributes.normal.array,u=g.attributes.uv;
    for(let i=0;i<p.length;i++){B.p.push(p[i]);B.n.push(n[i])}
    if(u)for(let i=0;i<u.array.length;i++)B.u.push(u.array[i]);else for(let i=0;i<p.length/3*2;i++)B.u.push(0)}
  /* mirror everything added to bucket m since index `from` across z=0 */
  mirror(m,from,flipU){const B=this.get(m),end=B.p.length;
    for(let o=from;o<end;o+=9){const tri=[[o,o+1,o+2],[o+6,o+7,o+8],[o+3,o+4,o+5]],uo=o/3*2,ut=[[uo,uo+1],[uo+4,uo+5],[uo+2,uo+3]];
      for(let c=0;c<3;c++){const[i,j,k]=tri[c];B.p.push(B.p[i],B.p[j],-B.p[k]);B.n.push(B.n[i],B.n[j],-B.n[k])}
      for(let c=0;c<3;c++)B.u.push(flipU?1-B.u[ut[c][0]]:B.u[ut[c][0]],B.u[ut[c][1]])}}
  mark(m){return this.get(m).p.length}
  build(){const r={};for(const m in this.b){const B=this.b[m];if(!B.p.length)continue;const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new T.Float32BufferAttribute(B.n,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(B.u,2));g.computeBoundingSphere();g.computeBoundingBox();r[m]=g}
    return r}}

const MG={};function mergeG(gs){const k=gs.map(g=>g.uuid).join();if(MG[k])return MG[k];const o=new Out();for(const g of gs)o.geo('m',g);return MG[k]=o.build().m}
/* rounded box with exact normals */
function rbox(w,h,d,r,s=3){const g=new T.BoxGeometry(w,h,d,s*2,s*2,s*2),p=g.attributes.position,n=g.attributes.normal;
  const hx=w/2-r,hy=h/2-r,hz=d/2-r,v=V3(),c=V3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);c.set(clamp(v.x,-hx,hx),clamp(v.y,-hy,hy),clamp(v.z,-hz,hz));
    const dn=v.clone().sub(c);if(dn.lengthSq()<1e-12)dn.fromBufferAttribute(n,i);dn.normalize();p.setXYZ(i,c.x+dn.x*r,c.y+dn.y*r,c.z+dn.z*r);n.setXYZ(i,dn.x,dn.y,dn.z)}
  return g}
const M4=()=>new T.Matrix4();
const mat4=(x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1)=>M4().compose(V3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz)),V3(sx,sy,sz));

/* ---------------------------------------------------------------- orthographic depth maps of the body */
const VIEWS={side:{A:[1,0,0],B:[0,1,0],D:[0,0,1],h:1},front:{A:[0,0,1],B:[0,1,0],D:[1,0,0],h:-1},rear:{A:[0,0,1],B:[0,1,0],D:[-1,0,0],h:1},top:{A:[1,0,0],B:[0,0,1],D:[0,1,0],h:-1}};
class DMap{constructor(view,pos,cs=.012){const V=VIEWS[view];this.view=view;this.V=V;this.cs=cs;
    const A=V.A,B=V.B,D=V.D,n=pos.length/3,a=new Float32Array(n),b=new Float32Array(n),d=new Float32Array(n);
    let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;
    for(let i=0;i<n;i++){const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];a[i]=x*A[0]+y*A[1]+z*A[2];b[i]=x*B[0]+y*B[1]+z*B[2];d[i]=x*D[0]+y*D[1]+z*D[2];
      if(a[i]<a0)a0=a[i];if(a[i]>a1)a1=a[i];if(b[i]<b0)b0=b[i];if(b[i]>b1)b1=b[i]}
    a0-=cs*2;b0-=cs*2;this.a0=a0;this.b0=b0;const W=this.W=Math.ceil((a1-a0)/cs)+4,H=this.H=Math.ceil((b1-b0)/cs)+4;
    const Z=this.Z=new Float32Array(W*H).fill(-1e9);
    for(let t=0;t<n;t+=3){const ax=(a[t]-a0)/cs-.5,ay=(b[t]-b0)/cs-.5,bx=(a[t+1]-a0)/cs-.5,by=(b[t+1]-b0)/cs-.5,cx=(a[t+2]-a0)/cs-.5,cy=(b[t+2]-b0)/cs-.5;
      const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(den)<1e-12)continue;
      const i0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),i1=Math.min(W-1,Math.ceil(Math.max(ax,bx,cx))),j0=Math.max(0,Math.floor(Math.min(ay,by,cy))),j1=Math.min(H-1,Math.ceil(Math.max(ay,by,cy)));
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const w1=((by-cy)*(i-cx)+(cx-bx)*(j-cy))/den,w2=((cy-ay)*(i-cx)+(ax-cx)*(j-cy))/den,w3=1-w1-w2;
        if(w1<-1e-3||w2<-1e-3||w3<-1e-3)continue;const z=w1*d[t]+w2*d[t+1]+w3*d[t+2],k=j*W+i;if(z>Z[k])Z[k]=z}}}
  depth(a,b){const fi=(a-this.a0)/this.cs-.5,fj=(b-this.b0)/this.cs-.5,i=Math.floor(fi),j=Math.floor(fj),fx=fi-i,fy=fj-j;let s=0,w=0;
    for(const[di,dj,ww]of[[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){const ii=i+di,jj=j+dj;if(ii<0||jj<0||ii>=this.W||jj>=this.H)continue;
      const z=this.Z[jj*this.W+ii];if(z>-1e8&&ww>0){s+=z*ww;w+=ww}}
    if(w>1e-6)return s/w;
    for(let r=1;r<=3;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){const ii=Math.round(fi)+di,jj=Math.round(fj)+dj;if(ii<0||jj<0||ii>=this.W||jj>=this.H)continue;const z=this.Z[jj*this.W+ii];if(z>-1e8)return z}
    return null}
  world(a,b,d){const V=this.V;return V3(V.A[0]*a+V.B[0]*b+V.D[0]*d,V.A[1]*a+V.B[1]*b+V.D[1]*d,V.A[2]*a+V.B[2]*b+V.D[2]*d)}
  proj(p){const V=this.V;return[p.x*V.A[0]+p.y*V.A[1]+p.z*V.A[2],p.x*V.B[0]+p.y*V.B[1]+p.z*V.B[2],p.x*V.D[0]+p.y*V.D[1]+p.z*V.D[2]]}
  /* surface point + normal at (a,b) */
  at(a,b,off=0){const d=this.depth(a,b);if(d==null)return null;const h=this.cs*1.6;
    const da=((this.depth(a+h,b)??d)-(this.depth(a-h,b)??d))/(2*h),db=((this.depth(a,b+h)??d)-(this.depth(a,b-h)??d))/(2*h);
    const n=this.world(-clamp(da,-12,12),-clamp(db,-12,12),1).normalize();const p=this.world(a,b,d).addScaledVector(n,off);return{p,n}}}

/* reject quads that jumped across a silhouette (3D edge much longer than its 2D footprint) */
function stretched(q,r){for(let i=0;i<4;i++){const a=q[i].p,b=q[(i+1)%4].p,d3=a.distanceTo(b);if(r){const d2=Math.hypot(r[i][0]-r[(i+1)%4][0],r[i][1]-r[(i+1)%4][1]);if(d3>d2*3.2+.012)return true}else if(d3>.12)return true}return false}
/* filled patch over a convex outline: bands (outer rings) + optional fill */
function patch(out,dm,poly,o){poly=subdiv(ccw(poly),o.seg||.04);const off=o.off??.004;
  const rings=[poly];for(const b of o.bands||[])rings.push(insetPoly(rings[rings.length-1],b.w));
  const mats=(o.bands||[]).map(b=>b.mat);
  if(o.fill){const last=rings[rings.length-1],c=centroid(last);for(const s of(o.fillRings||[.72,.45,.2])){rings.push(last.map(p=>[c[0]+(p[0]-c[0])*s,c[1]+(p[1]-c[1])*s]));mats.push(o.fill)}rings.push(last.map(()=>c));mats.push(o.fill)}
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const p of poly){a0=Math.min(a0,p[0]);a1=Math.max(a1,p[0]);b0=Math.min(b0,p[1]);b1=Math.max(b1,p[1])}
  const flip=dm.V.h<0,uv=p=>{let u=(p[0]-a0)/(a1-a0||1);if(flip)u=1-u;return[u,(p[1]-b0)/(b1-b0||1)]};
  const S=rings.map((r,k)=>r.map(p=>{const offk=off+(o.raise||0)*(k/(rings.length-1));return dm.at(p[0],p[1],offk)}));
  const marks={};const use=m=>{if(!(m in marks))marks[m]=out.mark(m)};
  for(let k=0;k<rings.length-1;k++){const m=mats[k];use(m);const R0=rings[k],R1=rings[k+1],S0=S[k],S1=S[k+1],n=R0.length;
    const Dv=V3(...dm.V.D),gz=o.graze??.15;for(let i=0;i<n;i++){const i2=(i+1)%n,q=[S0[i],S0[i2],S1[i2],S1[i]],r=[R0[i],R0[i2],R1[i2],R1[i]];if(q.some(x=>!x||x.n.dot(Dv)<gz)||stretched(q,r))continue;
      const tri=(x,y,z)=>{if(flip)out.tri(m,q[x].p,q[z].p,q[y].p,q[x].n,q[z].n,q[y].n,uv(r[x]),uv(r[z]),uv(r[y]));else out.tri(m,q[x].p,q[y].p,q[z].p,q[x].n,q[y].n,q[z].n,uv(r[x]),uv(r[y]),uv(r[z]))};
      tri(0,1,2);tri(0,2,3)}}
  if(o.mirror)for(const m in marks)out.mirror(m,marks[m],o.flipU)}
/* strip of width w along a polyline */
function ribbon(out,dm,pts,w,o){const P=subdiv(pts,o.seg||.045,!!o.closed),n=P.length,off=o.off??.003,m=o.mat,from=out.mark(m),flip=dm.V.h<0;
  const L=[],R=[];for(let i=0;i<n;i++){const a=P[o.closed?(i+n-1)%n:Math.max(0,i-1)],b=P[o.closed?(i+1)%n:Math.min(n-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;tx/=l;ty/=l;
    const w0=o.w0??w/2,w1=o.w1??w/2;L.push(dm.at(P[i][0]-ty*w0,P[i][1]+tx*w0,off+(o.raise||0)));R.push(dm.at(P[i][0]+ty*w1,P[i][1]-tx*w1,off))}
  const m2=o.closed?n:n-1,Dv=V3(...dm.V.D),gz=o.graze??.3;for(let i=0;i<m2;i++){const i2=(i+1)%n,q=[R[i],R[i2],L[i2],L[i]];if(q.some(x=>!x||x.n.dot(Dv)<gz)||stretched(q))continue;const uv=[[0,i/m2],[0,(i+1)/m2],[1,(i+1)/m2],[1,i/m2]];
    const tri=(x,y,z)=>{if(flip)out.tri(m,q[x].p,q[z].p,q[y].p,q[x].n,q[z].n,q[y].n,uv[x],uv[z],uv[y]);else out.tri(m,q[x].p,q[y].p,q[z].p,q[x].n,q[y].n,q[z].n,uv[x],uv[y],uv[z])};tri(0,1,2);tri(0,2,3)}
  if(o.mirror)out.mirror(m,from)}

/* recessed housing behind a hole cut in the body: walls going straight in along the view axis, a back plate,
   optional inner rings (light guides) and returns the back ring for extra parts. Outline in view coords (a,b), convex. */
function cup(out,dm,poly,o){const P=subdiv(ccw(poly),o.seg||.045),n=P.length,D=V3(...dm.V.D),dep=o.depth||.06,sk=o.shrink??.06,mir=!!o.mirror;
  const S0=P.map(q=>dm.at(q[0],q[1],0));if(S0.some(x=>!x))return null;
  const c2=centroid(P),cS=dm.at(c2[0],c2[1],0);if(!cS)return null;const C=cS.p.clone().addScaledVector(D,-dep);
  const ring=k=>S0.map(q=>{const p=q.p.clone().addScaledVector(D,-dep*k);return p.lerp(C.clone().addScaledVector(D,dep*(1-k)),sk*k)});
  const R1=ring(1),marks={},use=m=>{if(!(m in marks))marks[m]=out.mark(m)};
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const q of P){a0=Math.min(a0,q[0]);a1=Math.max(a1,q[0]);b0=Math.min(b0,q[1]);b1=Math.max(b1,q[1])}
  const uvOf=p=>{const q=dm.proj(p);let u=(q[0]-a0)/(a1-a0||1);if(dm.V.h<0)u=1-u;return[u,(q[1]-b0)/(b1-b0||1)]};
  const face=(m,a,b,c,inward)=>{use(m);let nn=b.clone().sub(a).cross(c.clone().sub(a));if(nn.lengthSq()<1e-14)return;nn.normalize();
    if(inward&&nn.dot(inward)<0){[b,c]=[c,b];nn.negate()}out.tri(m,a,b,c,nn,nn,nn,uvOf(a),uvOf(b),uvOf(c))};
  /* walls: normals face the cup axis */
  for(let i=0;i<n;i++){const i2=(i+1)%n,a=S0[i].p,b=S0[i2].p,c=R1[i2],d=R1[i],mid=a.clone().add(b).multiplyScalar(.5),inw=C.clone().addScaledVector(D,dep*.5).sub(mid);
    face(o.wall||'headIn',a,b,c,inw);face(o.wall||'headIn',a,c,d,inw)}
  /* back plate faces the viewer */
  for(let i=0;i<n;i++){const i2=(i+1)%n;face(o.back||'reflector',C,R1[i],R1[i2],D)}
  /* light-guide ring at mid depth */
  if(o.guide){const k=o.guideAt||.35,rA=ring(k),rB=rA.map(p=>p.clone().lerp(C.clone().addScaledVector(D,dep*(1-k)),(o.guideW||.12)));
    for(let i=0;i<n;i++){const i2=(i+1)%n;face(o.guide,rA[i],rA[i2],rB[i2],D);face(o.guide,rA[i],rB[i2],rB[i],D)}}
  /* bezel around the opening */
  if(o.bezel)patch(out,dm,insetPoly(ccw(poly),-(o.bezelW||.01)),{bands:[{w:(o.bezelW||.01)+.002,mat:o.bezel}],off:.002,seg:o.seg||.05,mirror:mir});
  if(mir)for(const m in marks)out.mirror(m,marks[m]);
  return{C,R1,D,dep}}
/* ---------------------------------------------------------------- canvas textures */
const texCache={};
function canvasTex(key,w,h,draw,o={}){if(texCache[key])return texCache[key];const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);
  const t=new T.CanvasTexture(c);if(o.srgb!==false)t.encoding=T.sRGBEncoding;t.anisotropy=4;if(o.repeat){t.wrapS=t.wrapT=T.RepeatWrapping}return texCache[key]=t}
function normalFromHeight(key,w,h,hf,strength=2,wrapU=true){if(texCache[key])return texCache[key];const H=new Float32Array(w*h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)H[j*w+i]=hf(i/w,j/h);
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),img=g.createImageData(w,h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const l=H[j*w+(wrapU?(i+w-1)%w:Math.max(0,i-1))],r=H[j*w+(wrapU?(i+1)%w:Math.min(w-1,i+1))],u=H[Math.max(0,j-1)*w+i],d=H[Math.min(h-1,j+1)*w+i];
    let nx=(l-r)*strength,ny=(d-u)*strength,nz=1;const L=Math.hypot(nx,ny,nz);const o=(j*w+i)*4;
    img.data[o]=(nx/L*.5+.5)*255;img.data[o+1]=(ny/L*.5+.5)*255;img.data[o+2]=(nz/L*.5+.5)*255;img.data[o+3]=255}
  g.putImageData(img,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return texCache[key]=t}
const treadNormal=()=>normalFromHeight('tread',1024,128,(u,v)=>{
  if(v<.2||v>.8){const s=Math.abs(v-.5);return .3+.04*Math.sin(s*260)}               /* sidewall: faint concentric ribs */
  let h=1;for(const g of[.37,.5,.63])if(Math.abs(v-g)<.018)h=0;                     /* circumferential grooves */
  const blocks=72,ph=(u*blocks+(v<.5?0:.5))%1;                                     /* staggered lateral sipes */
  if((v<.37||v>.63)&&ph<.12)h=Math.min(h,.15);if(v>.39&&v<.61&&Math.abs(ph-.55)<.03)h=Math.min(h,.4);
  if(v<.27||v>.73)h=lerp(h,.3,smooth(.73,.8,Math.max(v,1-v)));return h},3.5);
const grilleTex=()=>canvasTex('grille',256,256,(g,w,h)=>{g.fillStyle='#050505';g.fillRect(0,0,w,h);
  const r=13;g.strokeStyle='#3a3d42';g.lineWidth=3.5;for(let y=-1;y<12;y++)for(let x=-1;x<12;x++){const cx=x*r*1.75+(y%2?r*.875:0),cy=y*r*1.52;
    g.beginPath();for(let k=0;k<6;k++){const a=Math.PI/6+k*Math.PI/3;g.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}g.closePath();g.stroke()}},{repeat:true});
const grilleBars=()=>canvasTex('grillebars',256,256,(g,w,h)=>{g.fillStyle='#060606';g.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=32){const gr=g.createLinearGradient(0,y,0,y+18);gr.addColorStop(0,'#cfd3d8');gr.addColorStop(.5,'#6c7177');gr.addColorStop(1,'#1c1d20');g.fillStyle=gr;g.fillRect(0,y+4,w,14)}},{repeat:true});
const plateTex=(txt,state)=>canvasTex('plate'+txt,512,256,(g,w,h)=>{g.fillStyle='#f4f4ef';g.fillRect(0,0,w,h);
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(60,110,190,.35)');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(190,60,60,.25)');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.strokeStyle='#22314d';g.lineWidth=10;g.strokeRect(8,8,w-16,h-16);g.fillStyle='#1d2c4f';g.font='bold 34px Arial,Helvetica,sans-serif';g.textAlign='center';g.fillText(state,w/2,52);
  let fs=120;g.font='bold '+fs+'px "Arial Narrow",Arial,Helvetica,sans-serif';while(g.measureText(txt).width>w-60&&fs>40){fs-=4;g.font='bold '+fs+'px "Arial Narrow",Arial,Helvetica,sans-serif'}g.fillStyle='#14203a';g.fillText(txt,w/2,150+fs*.33);g.font='bold 22px Arial';g.fillText('SUBURBAN PRIDE',w/2,236)});
const stickerTex=()=>canvasTex('sticker',512,160,(g,w,h)=>{const r=30;g.fillStyle='#fbfbf6';g.beginPath();g.moveTo(r,0);g.arcTo(w,0,w,h,r);g.arcTo(w,h,0,h,r);g.arcTo(0,h,0,0,r);g.arcTo(0,0,w,0,r);g.fill();
  g.strokeStyle='#1a7a3a';g.lineWidth=8;g.stroke();const cx=80,cy=80,R=58;g.fillStyle='#fff';g.beginPath();g.arc(cx,cy,R,0,7);g.fill();g.lineWidth=4;g.strokeStyle='#111';g.stroke();
  const pent=(x,y,s,rot)=>{g.beginPath();for(let k=0;k<5;k++){const a=rot+k*Math.PI*2/5;g.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s)}g.closePath();g.fill()};g.fillStyle='#111';pent(cx,cy,19,-Math.PI/2);
  for(let k=0;k<5;k++){const a=-Math.PI/2+k*Math.PI*2/5+Math.PI/5;const px=cx+Math.cos(a)*48,py=cy+Math.sin(a)*48;g.save();g.beginPath();g.arc(cx,cy,R-2,0,7);g.clip();pent(px,py,17,a);g.restore();
    g.beginPath();g.moveTo(cx+Math.cos(a)*19*.81,cy+Math.sin(a)*19*.81);g.lineTo(px-Math.cos(a)*14,py-Math.sin(a)*14);g.lineWidth=3;g.stroke()}
  g.fillStyle='#1a7a3a';g.font='bold 54px Arial,Helvetica,sans-serif';g.textAlign='left';g.fillText('SOCCER',158,76);g.fillStyle='#16181c';g.font='bold 46px Arial,Helvetica,sans-serif';g.fillText('DAD ON BOARD',158,128)});
const woodTex=()=>canvasTex('wood',1024,256,(g,w,h)=>{let a=7;const R=()=>{a=(a*16807)%2147483647;return a/2147483647};g.fillStyle='#6b4128';g.fillRect(0,0,w,h);
  for(let i=0;i<260;i++){const y=R()*h,al=.05+R()*.18;g.strokeStyle=R()<.5?`rgba(40,20,8,${al})`:`rgba(160,110,60,${al})`;g.lineWidth=.5+R()*2.5;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=32)g.lineTo(x,y+Math.sin(x*.01+i)*3+(R()-.5)*2);g.stroke()}
  g.strokeStyle='rgba(25,12,4,.7)';g.lineWidth=2;for(let x=0;x<w;x+=128){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}});
const muralTex=()=>canvasTex('mural',1024,256,(g,w,h)=>{const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#2b5f9e');sky.addColorStop(.6,'#f08a4b');sky.addColorStop(1,'#f6c35a');g.fillStyle=sky;g.fillRect(0,0,w,h);
  g.fillStyle='#ffd36b';g.beginPath();g.arc(w*.62,h*.62,60,0,Math.PI*2);g.fill();
  g.fillStyle='#1e3b2f';g.beginPath();g.moveTo(0,h);for(let x=0;x<=w;x+=16)g.lineTo(x,h*.72-Math.sin(x*.012)*30-Math.sin(x*.05)*8);g.lineTo(w,h);g.fill();
  g.fillStyle='#163024';for(let i=0;i<9;i++){const x=40+i*115;g.fillRect(x-4,h*.5,8,h*.5);g.beginPath();g.arc(x,h*.5,34,0,Math.PI*2);g.fill()}
  g.font='bold 54px Georgia, serif';g.fillStyle='#fff6e0';g.strokeStyle='#4a2410';g.lineWidth=6;g.textAlign='center';g.strokeText('RIVERSIDE',w*.3,84);g.fillText('RIVERSIDE',w*.3,84)});
const shadowTex=()=>canvasTex('ao',128,256,(g,w,h)=>{const img=g.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(i+.5)/w*2-1,y=(j+.5)/h*2-1,d=Math.pow(Math.pow(Math.abs(x),4)+Math.pow(Math.abs(y),4),.25),a=Math.pow(clamp(1-(d-.55)/.45,0,1),1.6);const o=(j*w+i)*4;img.data[o]=img.data[o+1]=img.data[o+2]=0;img.data[o+3]=a*255}
  g.putImageData(img,0,0)},{srgb:false});
const ledTex=()=>canvasTex('led',256,32,(g,w,h)=>{g.fillStyle='#1a1a1a';g.fillRect(0,0,w,h);for(let i=0;i<16;i++){const x=i*16+8;const gr=g.createRadialGradient(x,16,1,x,16,8);gr.addColorStop(0,'#fff');gr.addColorStop(.6,'#cfe2ff');gr.addColorStop(1,'#333');g.fillStyle=gr;g.fillRect(x-7,4,14,24)}});

/* ---------------------------------------------------------------- type definitions (metres) */
/* top/belt/bot/hw/rw: [x, value, fillet] keys along the car (x: rear -> front)
   top: centre-line top surface, belt: window sill line, bot: rocker/bumper underside (arches are cut automatically),
   hw: body half width, rw: half width of the roof/greenhouse top */
const TYPES={
minivan:{L:5.10,H:1.77,wr:.365,tw:.235,rimR:.229,axles:[1.57,-1.46],Ra:.415,endF:.15,endR:.09,capP:2.8,capPF:3.6,rakeR:.03,
  top:[[-2.44,1.63],[-2.32,1.725,.1],[-.6,1.77,.9],[.62,1.70,.35],[1.70,1.13,.18],[2.12,1.045,.22],[2.40,.98]],
  belt:[[-2.44,1.13],[-2.0,1.11],[-.9,1.075],[.5,1.05],[1.70,1.04],[2.1,.99],[2.40,.93]],
  bot:[[-2.44,.50],[-2.18,.37,.12],[-1.95,.27],[1.95,.27],[2.15,.32,.1],[2.39,.36]],
  hw:[[-2.44,.91],[-2.15,.975,.2],[-1.2,.995],[1.2,.995],[2.0,.96,.25],[2.39,.86]],
  rw:[[-2.44,.80],[-1.6,.83],[.3,.83],[1.0,.86],[1.70,.93]],
  crown:.05,re:.085,rb:.07,tumble:.03,tuck:.045,shoulder:.7,bow:.014,
  cowl:1.70,roofF:.62,roofR:-2.28,
  windows:[[1.58,1.20],[1.12,.30],[.21,-.86],[-.95,-2.24]],pillarBlack:[1,2],
  rearGlass:{y0:1.19,y1:1.56,hw0:.67,hw1:.60,r:.07},
  head:[[.32,.80],[.80,.76],[.86,.90],[.44,.94]],drl:[[.40,.915],[.80,.875]],
  grille:{y0:.68,y1:.90,hw0:.30,hw1:.38,bars:true},intake:{y0:.40,y1:.61,hw0:.68,hw1:.58},plateF:.51,
  tail:[[.60,.97],[.86,.95],[.83,1.42],[.70,1.44]],tailSide:[1.0,1.40,.15,1.02,1.40],
  plateR:.83,rearBumperY:.70,
  seams:{doorF:1.13,doors:[.255,-.90],bottomY:.37},handles:[[.42,0],[.08,0]],slidingTrack:true,mirrorX:1.50,
  rails:true,seats:[[.55,2],[-.40,2],[-1.40,3]],wiperRear:true,sticker:true,plateTxt:'SOCR DAD'},
sedan:{L:4.85,H:1.445,wr:.335,tw:.235,rimR:.229,axles:[1.445,-1.375],Ra:.385,endF:.20,endR:.16,capP:2.3,
  top:[[-2.265,1.03],[-2.0,1.065,.1],[-1.68,1.08,.1],[-.88,1.41,.32],[-.15,1.445,.45],[.38,1.40,.35],[1.10,1.0,.18],[1.75,.925,.3],[2.225,.86]],
  belt:[[-2.265,1.0],[-1.6,1.02],[-.5,.985],[1.08,.96],[1.7,.88],[2.225,.81]],
  bot:[[-2.265,.40],[-2.0,.30,.1],[-1.8,.205],[1.8,.205],[2.05,.25,.1],[2.225,.29]],
  hw:[[-2.265,.85],[-1.9,.905,.25],[-.5,.92],[1.1,.92],[1.85,.885,.25],[2.225,.82]],
  rw:[[-1.6,.64],[-.75,.68],[0,.69],[.35,.69],[1.08,.80]],
  crown:.04,re:.075,rb:.065,tumble:.018,tuck:.035,shoulder:.72,bow:.012,
  cowl:1.10,roofF:.38,roofR:-.86,
  windows:[[1.0,.06],[-.02,-.88],[-.94,-1.30]],pillarBlack:[0],
  rearGlass:{auto:[-.92,-1.62]},capPF:3,
  head:[[.34,.72],[.80,.69],[.86,.79],[.48,.82]],drl:[[.44,.805],[.82,.77]],
  grille:{y0:.64,y1:.79,hw0:.28,hw1:.36,bars:true},intake:{y0:.33,y1:.57,hw0:.64,hw1:.54},plateF:.45,
  tail:[[.40,.88],[.84,.86],[.85,.99],[.44,1.0]],tailSide:[.87,.99,.22,.92,.99],
  plateR:.62,rearBumperY:.56,trunk:true,exhaust:true,
  seams:{doorF:1.04,doors:[.02,-.92],bottomY:.30},handles:[[.18,0],[-.78,0]],mirrorX:.96,
  seats:[[.15,2],[-.82,3]],plateTxt:'HOA PRES'},
suv:{L:4.70,H:1.72,wr:.37,tw:.245,rimR:.241,axles:[1.40,-1.35],Ra:.43,endF:.18,endR:.12,capP:2.4,capPF:3.4,rakeF:.1,
  top:[[-2.23,1.58],[-2.05,1.69,.12],[-.6,1.72,.9],[.35,1.665,.3],[1.15,1.17,.18],[1.8,1.10,.3],[2.15,1.06]],
  belt:[[-2.23,1.21],[-1.7,1.19],[0,1.13],[1.15,1.12],[1.75,1.06],[2.15,1.0]],
  bot:[[-2.23,.56],[-1.98,.44,.1],[-1.75,.32],[1.75,.32],[1.95,.38,.1],[2.15,.42]],
  hw:[[-2.23,.88],[-1.95,.94,.2],[-.4,.955],[1.2,.955],[1.85,.93,.25],[2.15,.87]],
  rw:[[-2.23,.75],[-1.4,.775],[0,.785],[.4,.79],[1.15,.85]],
  crown:.045,re:.085,rb:.06,tumble:.016,tuck:.03,shoulder:.7,bow:.014,
  cowl:1.15,roofF:.35,roofR:-1.98,
  windows:[[1.06,.12],[.04,-.92],[-1.0,-1.82]],pillarBlack:[0,1],
  rearGlass:{y0:1.28,y1:1.58,hw0:.62,hw1:.57,r:.07},
  head:[[.42,.92],[.84,.89],[.88,1.0],[.50,1.02]],drl:[[.48,1.005],[.85,.985]],
  grille:{y0:.66,y1:.98,hw0:.38,hw1:.44,chrome:true},intake:{y0:.42,y1:.60,hw0:.70,hw1:.62},plateF:.54,
  tail:[[.50,1.04],[.86,1.02],[.86,1.14],[.52,1.15]],tailSide:[1.03,1.15,.22,1.07,1.16],
  plateR:.88,rearBumperY:.74,
  seams:{doorF:1.00,doors:[.07,-.97],bottomY:.40},handles:[[.24,0],[-.74,0]],mirrorX:1.05,
  rails:true,cladding:true,seats:[[.10,2],[-.90,3]],plateTxt:'CARPOOL'},
hatch:{L:4.25,H:1.46,wr:.317,tw:.225,rimR:.216,axles:[1.245,-1.385],Ra:.365,endF:.17,endR:.12,capP:2.3,
  top:[[-2.005,1.10],[-1.90,1.29,.06],[-1.62,1.405,.2],[-.6,1.46,.7],[.22,1.40,.35],[.95,.99,.17],[1.55,.89,.3],[1.955,.82]],
  belt:[[-2.005,.99],[-1.5,1.0],[0,.955],[.95,.935],[1.5,.84],[1.955,.74]],
  bot:[[-2.005,.40],[-1.78,.30,.1],[-1.6,.20],[1.55,.20],[1.78,.25,.08],[1.955,.32]],
  hw:[[-2.005,.835],[-1.75,.885,.2],[-.3,.895],[.95,.895],[1.6,.865,.2],[1.955,.80]],
  rw:[[-2.005,.66],[-1.5,.68],[0,.70],[.3,.70],[.95,.78]],
  crown:.04,re:.075,rb:.06,tumble:.016,tuck:.03,shoulder:.72,bow:.012,
  cowl:.95,roofF:.22,roofR:-1.70,
  windows:[[.87,.0],[-.08,-.90],[-.97,-1.42]],pillarBlack:[0],
  rearGlass:{auto:[-1.66,-1.96]},
  head:[[.36,.68],[.78,.65],[.83,.73],[.48,.765]],drl:[[.44,.75],[.80,.72]],
  grille:{y0:.64,y1:.735,hw0:.30,hw1:.36},intake:{y0:.33,y1:.56,hw0:.60,hw1:.50},plateF:.45,
  tail:[[.50,.90],[.80,.88],[.80,.99],[.52,1.0]],tailSide:[.90,1.0,.2,.93,1.0],
  plateR:.70,rearBumperY:.56,
  seams:{doorF:.92,doors:[-.04,-.96],bottomY:.29},handles:[[.10,0],[-.78,0]],mirrorX:.86,
  seats:[[.0,2],[-.95,3]],plateTxt:'LIL DAD',hatchSpoiler:true},
pickup:{L:5.60,H:1.93,wr:.41,tw:.275,rimR:.254,axles:[1.85,-1.70],Ra:.475,endF:.15,endR:.09,capP:3.2,
  top:[[-2.58,1.30],[-.78,1.32,.03],[-.69,1.915,.07],[.20,1.925,.3],[1.0,1.36,.16],[2.25,1.30,.15],[2.52,1.22]],
  belt:[[-2.58,1.29],[-.78,1.30],[1.0,1.29],[2.2,1.25],[2.52,1.16]],
  bot:[[-2.58,.62],[-1.0,.56],[1.0,.52],[2.1,.47],[2.52,.48]],
  hw:[[-2.58,.985],[-2.2,1.0,.2],[-.8,1.005],[0,1.015],[1.5,1.015],[2.15,.995,.2],[2.52,.95]],
  rw:[[-.78,.80],[0,.82],[1.0,.93]],
  crown:.035,re:.06,rb:.05,tumble:.012,tuck:.025,shoulder:.62,bow:.008,
  cowl:1.0,roofF:.20,roofR:-.70,
  windows:[[.92,.0],[-.07,-.66]],pillarBlack:[0],
  rearGlass:{y0:1.45,y1:1.78,hw0:.66,hw1:.60,r:.05,view:'cabback'},
  head:[[.53,.98],[.90,.96],[.92,1.19],[.55,1.19]],drl:[[.58,1.165],[.89,1.165]],
  grille:{y0:.80,y1:1.20,hw0:.48,hw1:.50,bars:true,chrome:true},intake:{y0:.70,y1:.78,hw0:.60,hw1:.62},plateF:.62,
  tail:[[.86,.96],[.985,.96],[.985,1.27],[.86,1.27]],tailSide:[.96,1.27,.06,.96,1.27],
  plateR:.62,rearBumperY:.70,bed:{x0:-2.51,x1:-.84,hw:.88,floor:.86},tailgate:true,
  seams:{doorF:1.00,doors:[.02,-.68],bottomY:.58},handles:[[.18,0],[-.55,0]],mirrorX:.92,
  seats:[[.10,2],[-.48,3]],plateTxt:'BIG DAD'},
workvan:{L:5.40,H:2.46,wr:.36,tw:.235,rimR:.203,axles:[1.75,-1.55],Ra:.41,endF:.16,endR:.07,capP:3.2,
  top:[[-2.50,2.36],[-2.36,2.43,.1],[.40,2.44,.5],[.95,2.12,.25],[1.55,1.24,.15],[2.14,1.10,.22],[2.42,.98]],
  belt:[[-2.50,1.26],[1.55,1.25],[2.1,1.06],[2.42,.94]],
  bot:[[-2.50,.46],[-2.25,.38,.08],[-2.02,.36],[2.05,.37],[2.42,.40]],
  hw:[[-2.50,1.0],[-2.3,1.02,.12],[1.3,1.025],[2.08,.985,.22],[2.42,.90]],
  rw:[[-2.50,.94],[0,.96],[.9,.95],[1.55,.97]],
  crown:.05,re:.11,rb:.06,tumble:.012,tuck:.025,shoulder:.62,bow:.006,
  cowl:1.55,roofF:.95,roofR:-2.45,
  windows:[[1.48,.62]],pillarBlack:[],
  rearGlass:{y0:1.55,y1:2.05,hw0:.82,hw1:.80,r:.06,split:true},
  head:[[.48,.90],[.88,.92],[.86,1.06],[.56,1.04]],drl:[[.56,1.03],[.85,1.05]],
  grille:{y0:.66,y1:.98,hw0:.44,hw1:.46,bars:true},intake:{y0:.40,y1:.58,hw0:.70,hw1:.66},plateF:.50,
  tail:[[.88,.80],[.99,.80],[.99,1.30],[.88,1.30]],tailSide:[.80,1.30,.05,.80,1.30],
  plateR:.58,rearBumperY:.62,barnDoors:true,steelBumpers:true,
  seams:{doorF:1.42,doors:[.58,-.75],bottomY:.42},handles:[[.72,0],[.45,0]],slidingTrack:true,mirrorX:1.45,
  seats:[[.75,2]],bulkhead:.35,rimStyle:'steel',plateTxt:'FIXIT'}
};

/* ---------------------------------------------------------------- body loft */
function prep(S){if(S._p)return S;S._p=1;for(const k of['top','belt','bot','hw','rw'])S[k+'F']=profile(S[k]);
  S.x0=S.top[0][0];S.x1=S.top[S.top.length-1][0];return S}
function section(S,x){
  const yt=S.topF(x),yBelt=Math.min(S.beltF(x),yt-.022),ybase=S.botF(x),ys=ybase+(yBelt-ybase)*S.shoulder;
  let yA=-1;for(const ax of S.axles){const dx=x-ax;if(Math.abs(dx)<S.Ra)yA=Math.max(yA,Math.min(ys-.05,S.wr+Math.sqrt(S.Ra*S.Ra-dx*dx)))}
  const yb=ybase,arch=yA>yb;
  const wB=S.hwF(x),wL=wB-S.tuck,wBelt=wB-S.tumble,gh=yt-yBelt,k=smooth(.05,.25,gh);
  const wT=lerp(wBelt-.012,Math.min(S.rwF(x),wBelt-.03),k);
  const crownH=Math.min(S.crown,gh*.4),re=clamp(gh*.3,.008,S.re),yEdge=yt-crownH,yC=yEdge-re;
  const P=[],rb=S.rb,zc=wL-rb;
  for(let i=0;i<4;i++)P.push([zc*i/3,yb]);
  for(let i=1;i<=3;i++){const a=-Math.PI/2+i/3*Math.PI/2;P.push([zc+rb*Math.cos(a),yb+rb+rb*Math.sin(a)])}
  const y0=yb+rb,c=[wB+.006,lerp(y0,ys,.55)];
  for(let i=1;i<=5;i++){const t=i/5,u=1-t;P.push([u*u*wL+2*u*t*c[0]+t*t*wB,u*u*y0+2*u*t*c[1]+t*t*ys])}
  for(let i=1;i<=3;i++){const t=i/3;P.push([lerp(wB,wBelt,t)+.003*Math.sin(Math.PI*t),lerp(ys,yBelt,t)])}
  for(let i=1;i<=7;i++){const t=i/7;P.push([lerp(wBelt,wT,t)+S.bow*k*Math.sin(Math.PI*t),lerp(yBelt,yC,t)])}
  for(let i=1;i<=3;i++){const a=i/3*Math.PI/2;P.push([wT-re+re*Math.cos(a),yC+re*Math.sin(a)])}
  for(let i=1;i<=6;i++){const t=i/6;P.push([(wT-re)*(1-t),yt-crownH*(1-t)*(1-t)])}
  if(S.flare){const fl=S.flare;for(let j=6;j<=14;j++){let f=0;for(const ax of S.axles){const d=Math.hypot(x-ax,P[j][1]-S.wr);f=Math.max(f,fl*(1-smooth(S.Ra+.02,S.Ra+.26,d))*smooth(S.Ra-.03,S.Ra+.02,d))}
    P[j][0]+=f*(j<12?1:smooth(14,11,j))}}
  if(arch)for(const p of P)if(p[1]<yA)p[1]=yA;
  return{P,yt,yb:arch?yA:yb,yBase:yb,yBelt,wB,wBelt,wT,yC,ys,gh,re}}
const UNDER_ROWS=6;

function buildBody(S,L={}){
  const step=L.step||.1,xs=[];for(let x=S.x0;x<S.x1;x+=step)xs.push(x);xs.push(S.x1);
  const add=x=>{if(x>S.x0&&x<S.x1)xs.push(x)};
  for(const k of['top','bot','belt'])for(const q of S[k]){add(q[0]);if(!q[2]&&!L.coarse){add(q[0]-.015);add(q[0]+.015)}}
  const AN=L.archN||10;for(const ax of S.axles){for(let i=0;i<=AN;i++)add(ax-S.Ra*Math.cos(i/AN*Math.PI));add(ax-S.Ra-.0015);add(ax+S.Ra+.0015);add(ax-S.Ra+.0015);add(ax+S.Ra-.0015)}
  xs.sort((a,b)=>a-b);const X=[xs[0]];for(const x of xs)if(x-X[X.length-1]>.0012)X.push(x);
  const rings=X.map(x=>{const s=section(S,x);if(L.ring)s.P=L.ring.map(j=>s.P[j]);return{x,s}});
  /* end caps: rings shrink to the centre with a superellipse profile */
  const cap=(r0,dir,R)=>{const s=r0.s,cy=(s.yb+s.yt)/2,K=L.K||7,out=[],cp=dir>0?(S.capPF||S.capP):S.capP;
    for(let k=1;k<=K;k++){const th=k/K*Math.PI/2,sc=Math.pow(Math.cos(th),2/cp),dx=R*Math.pow(Math.sin(th),2/cp);
      out.push({x:r0.x+dir*dx,s:{P:s.P.map(([z,y])=>[z*sc,cy+(y-cy)*sc])},cap:true})}return out};
  const all=[...cap(rings[0],-1,S.endR).reverse(),...rings,...cap(rings[rings.length-1],1,S.endF)];
  const M=all[0].s.P.length,tris=[];
  const eF=rings[rings.length-1].s,eR=rings[0].s,cyF=(eF.yb+eF.yt)/2,cyR=(eR.yb+eR.yt)/2,rkF=S.rakeF??.08,rkR=S.rakeR??.08;
  const fA=Math.max(S.x1-.7,S.axles[0]+S.Ra+.04),rA=Math.min(S.x0+.6,S.axles[1]-S.Ra-.04);
  const swF=Math.min(S.sweepF??.22,.5*(S.x1-fA)/1.5),swR=Math.min(S.sweepR??.1,.5*(rA-S.x0)/1.5),wzF=eF.wB,wzR=eR.wB;
  const shear=(x,y,z,cap)=>{const wF=x>0?(cap?1:smooth(fA,S.x1,x)):0,wR=x<0?(cap?1:smooth(rA,S.x0,x)):0;
    return rkF*(cyF-y)*wF+rkR*(y-cyR)*wR-swF*Math.pow(Math.min(1,z/wzF),2.2)*wF+swR*Math.pow(Math.min(1,z/wzR),2.2)*wR};
  const pt=(i,j,sg)=>{const r=all[i],p=r.s.P[j];return V3(r.x+shear(r.x,p[1],p[0],r.cap),p[1],p[0]*sg)};
  for(const sg of[1,-1])for(let i=0;i<all.length-1;i++)for(let j=0;j<M-1;j++){
    const a=pt(i,j,sg),b=pt(i+1,j,sg),c=pt(i+1,j+1,sg),d=pt(i,j+1,sg),cls=(L.ring?L.ring[j]:j)<3?'under':'paint';
    const rr=k=>L.ring?L.ring[k]:k,CR=[11,14],tg=k=>CR.includes(rr(k))?(rr(j)>=rr(k)?1:2):0;
    const push=(p,q,r,t)=>{const ar=q.clone().sub(p).cross(r.clone().sub(p)).lengthSq();if(ar>1e-14)tris.push({p:[p,q,r],cls,tg:t})};
    const ta=tg(j),tb=tg(j),tc=tg(j+1),td=tg(j+1);if(sg>0){push(a,b,c,[ta,tb,tc]);push(a,c,d,[ta,tc,td])}else{push(a,c,b,[ta,tc,tb]);push(a,d,c,[ta,td,tc])}}
  const flat=new Float32Array(tris.length*9);tris.forEach((t,i)=>{for(let c=0;c<3;c++){flat[i*9+c*3]=t.p[c].x;flat[i*9+c*3+1]=t.p[c].y;flat[i*9+c*3+2]=t.p[c].z}});
  const tags=new Int8Array(tris.length*3);tris.forEach((t,i)=>{tags[i*3]=t.tg[0];tags[i*3+1]=t.tg[1];tags[i*3+2]=t.tg[2]});
  const N=creaseNormals(flat,40,tags);tris.forEach((t,i)=>{t.n=[0,1,2].map(c=>V3(N[i*9+c*3],N[i*9+c*3+1],N[i*9+c*3+2]));const ny=(t.n[0].y+t.n[1].y+t.n[2].y)/3;if(t.cls==='under')t.cls=ny<-.6?'under':'paint';else if(ny<-.985)t.cls='under'});
  const dm={};if(!L.noDm)for(const v of['side','front','rear','top'])dm[v]=new DMap(v,flat,v==='top'?.016:.012);
  return{tris,dm,flat,X}}

/* coarse interior shell (rendered BackSide: only the far inner walls show through the glass) */
function shell(S,o){const xs=[];for(let x=S.x0+.1;x<S.x1-.08;x+=.3)xs.push(x);xs.push(S.x1-.08);
  const rings=xs.map(x=>{const s=section(S,x),cy=(s.yb+s.yt)/2;return{x,cy,P:s.P.filter((_,j)=>j%2===0||j===s.P.length-1).map(([z,y])=>[Math.max(0,z*.965-.025),cy+(y-cy)*.95])}});
  const M=rings[0].P.length,pt=(i,j,sg)=>V3(rings[i].x,rings[i].P[j][1],rings[i].P[j][0]*sg),up=V3(0,1,0);
  const tri=(a,b,c)=>{const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();if(!isFinite(n.x))return;o.tri('interior',a,b,c,n,n,n)};
  for(const sg of[1,-1]){for(let i=0;i<rings.length-1;i++)for(let j=0;j<M-1;j++){const a=pt(i,j,sg),b=pt(i+1,j,sg),c=pt(i+1,j+1,sg),d=pt(i,j+1,sg);if(sg>0){tri(a,b,c);tri(a,c,d)}else{tri(a,c,b);tri(a,d,c)}}
    for(const[i,dir]of[[0,-1],[rings.length-1,1]]){const c=V3(rings[i].x,rings[i].cy,0);for(let j=0;j<M-1;j++){const a=pt(i,j,sg),b=pt(i,j+1,sg);if(dir*sg>0)tri(c,a,b);else tri(c,b,a)}}}}

/* cut a convex hole (in a depth-map view) out of the body, exactly */
function cutHole(B,view,poly,tol=.03,inCls,simp=.0025){const dm=B.dm[view],P=ccw(simplify(ccw(poly),simp)),n=P.length;
  let a0=1e9,a1=-1e9,b0=1e9,b1=-1e9;for(const p of P){a0=Math.min(a0,p[0]);a1=Math.max(a1,p[0]);b0=Math.min(b0,p[1]);b1=Math.max(b1,p[1])}
  const out=[];
  for(const t of B.tris){const pr=t.p.map(p=>{const q=dm.proj(view==='side'?V3(p.x,p.y,Math.abs(p.z)):p);return q});
    if(Math.max(pr[0][0],pr[1][0],pr[2][0])<a0||Math.min(pr[0][0],pr[1][0],pr[2][0])>a1||Math.max(pr[0][1],pr[1][1],pr[2][1])<b0||Math.min(pr[0][1],pr[1][1],pr[2][1])>b1){out.push(t);continue}
    const ca=(pr[0][0]+pr[1][0]+pr[2][0])/3,cb=(pr[0][1]+pr[1][1]+pr[2][1])/3,cd=(pr[0][2]+pr[1][2]+pr[2][2])/3,dd=dm.depth(ca,cb);
    if(dd==null||Math.abs(dd-cd)>tol){out.push(t);continue}
    let rem=t.p.map((p,i)=>({a:pr[i][0],b:pr[i][1],p,n:t.n[i]}));
    const clip=(poly,e,keepIn)=>{const A=P[e],Bp=P[(e+1)%n],ex=Bp[0]-A[0],ey=Bp[1]-A[1],sd=v=>ex*(v.b-A[1])-ey*(v.a-A[0]);const res=[];
      for(let i=0;i<poly.length;i++){const u=poly[i],w=poly[(i+1)%poly.length],su=keepIn?sd(u):-sd(u),sw=keepIn?sd(w):-sd(w);
        if(su>=0)res.push(u);if((su>=0)!==(sw>=0)){const k=su/(su-sw);res.push({a:lerp(u.a,w.a,k),b:lerp(u.b,w.b,k),p:u.p.clone().lerp(w.p,k),n:u.n.clone().lerp(w.n,k).normalize()})}}
      return res};
    for(let e=0;e<n&&rem.length>=3;e++){const o=clip(rem,e,false);if(o.length>=3)for(let i=1;i<o.length-1;i++)out.push({p:[o[0].p,o[i].p,o[i+1].p],n:[o[0].n,o[i].n,o[i+1].n],cls:t.cls});rem=clip(rem,e,true)}
    if(inCls&&rem.length>=3)for(let i=1;i<rem.length-1;i++)out.push({p:[rem[0].p,rem[i].p,rem[i+1].p],n:[rem[0].n,rem[i].n,rem[i+1].n],cls:t.cls==='under'?'under':inCls})}
  B.tris=out}

/* ---------------------------------------------------------------- per-type geometry kit (cached) */
const KITS={};
function glazing(S){const sec=x=>section(S,x);
  const sideWin=([xf,xr])=>{const pts=[];const n=Math.max(4,Math.ceil((xf-xr)/.04));
    for(let i=0;i<=n;i++){const x=lerp(xr,xf,i/n),s=sec(x),yb=s.yBelt+.02,yt=s.yC-.012;if(yt>yb+.01){pts.push([x,yb],[x,yt])}}
    return pts.length>=3?roundPoly(simplify(hull(pts),.002),.035):null};
  const wins=S.windows.map(sideWin);
  const xa=S.cowl-.05,xb=S.roofF+.04,sa=sec(xa),sb=sec(xb);
  const ws=roundPoly([[-(sa.wT-.075),sa.yt+.012],[sa.wT-.075,sa.yt+.012],[sb.wT-sb.re-.03,sb.yC+.01],[0,sb.yt-.02],[-(sb.wT-sb.re-.03),sb.yC+.01]],[.05,.05,.07,.3,.07]);
  let rg;const RG=S.rearGlass;
  if(RG.auto){const[xa,xb]=RG.auto,sa=sec(xa),sb=sec(xb);rg={view:'rear',poly:roundPoly([[-(sb.wT-.07),sb.yt+.025],[sb.wT-.07,sb.yt+.025],[sa.wT-sa.re-.03,sa.yC+.0],[0,sa.yt-.025],[-(sa.wT-sa.re-.03),sa.yC]],[.05,.05,.06,.3,.06])}}
  else if(RG.view==='cabback'){rg={view:'rearcab',poly:trap(RG.y0,RG.y1,RG.hw0,RG.hw1,RG.r)}}
  else rg={view:'rear',poly:trap(RG.y0,RG.y1,RG.hw0,RG.hw1,RG.r)};
  return{wins,ws,rg}}
function kit(type){if(KITS[type])return KITS[type];const S=prep(TYPES[type]);const B=buildBody(S),dm=B.dm,o=new Out();
  const sec=x=>section(S,x);
  const{wins,ws,rg}=glazing(S);
  /* holes */
  for(const w of wins)if(w)cutHole(B,'side',insetPoly(ccw(w),.012));
  cutHole(B,'front',insetPoly(ccw(ws),.03));
  if(rg.view==='rear')cutHole(B,'rear',insetPoly(ccw(rg.poly),.03));
  const HEAD=quad(S.head,.035),TAIL=quad(S.tail,.025),GR=trap(S.grille.y0,S.grille.y1,S.grille.hw0,S.grille.hw1,.035),IN=trap(S.intake.y0,S.intake.y1,S.intake.hw0,S.intake.hw1,.05);
  for(const P of[HEAD,mirrorA(HEAD)])cutHole(B,'front',P,.05);for(const P of[TAIL,mirrorA(TAIL)])cutHole(B,'rear',P,.05);cutHole(B,'front',GR,.05);cutHole(B,'front',IN,.05);
  if(S.bed){const b=S.bed;cutHole(B,'top',[[b.x0,-b.hw],[b.x1,-b.hw],[b.x1,b.hw],[b.x0,b.hw]],.05)}
  /* body into buckets */
  /* two-tone split: paint triangles are cut exactly at one height; the lower part goes to 'paint2' */
  const Y2=lerp(S.botF(0),S.beltF(0),.45);
  const cutY=(V,keepBelow)=>{const r=[];for(let i=0;i<V.length;i++){const a=V[i],b=V[(i+1)%V.length],sa=keepBelow?Y2-a.p.y:a.p.y-Y2,sb=keepBelow?Y2-b.p.y:b.p.y-Y2;
      if(sa>=0)r.push(a);if((sa>=0)!==(sb>=0)){const k=sa/(sa-sb);r.push({p:a.p.clone().lerp(b.p,k),n:a.n.clone().lerp(b.n,k).normalize()})}}return r};
  for(const t of B.tris){if(t.cls!=='paint'){o.tri(t.cls,t.p[0],t.p[1],t.p[2],t.n[0],t.n[1],t.n[2]);continue}
    const ys=t.p.map(q=>q.y);if(Math.min(...ys)>=Y2){o.tri('paint',t.p[0],t.p[1],t.p[2],t.n[0],t.n[1],t.n[2]);continue}
    if(Math.max(...ys)<=Y2){o.tri('paint2',t.p[0],t.p[1],t.p[2],t.n[0],t.n[1],t.n[2]);continue}
    const V=t.p.map((q,i)=>({p:q,n:t.n[i]}));for(const[m,below]of[['paint',false],['paint2',true]]){const P=cutY(V,below);for(let i=1;i<P.length-1;i++)o.tri(m,P[0].p,P[i].p,P[i+1].p,P[0].n,P[i].n,P[i+1].n)}}
  {const pts=[];for(let x=S.x0+.2;x<=S.x1-.25;x+=.1)pts.push([x,Y2]);ribbon(o,dm.side,pts,.012,{mat:'pin',off:.003,mirror:true,graze:.5})}
  /* finish panels (shown only with paint:'wood' / 'mural') */
  {const xa=S.axles[1]+S.Ra+.07,xb=S.axles[0]-S.Ra-.07;let bt=9;for(let x=xa;x<=xb;x+=.1)bt=Math.min(bt,S.beltF(x));const yb=S.botF(0)+(S.cladding?.2:.13);
    patch(o,dm.side,rectP((xa+xb)/2,(yb+bt-.09)/2,xb-xa,bt-.09-yb,.02),{bands:[{w:.018,mat:'woodTrim'}],fill:'wood',off:.005,mirror:true,flipU:true});
    patch(o,dm.side,rectP((xa+xb)/2,(yb+bt-.04)/2,xb-xa,bt-.04-yb,.01),{fill:'mural',off:.005,mirror:true,flipU:true})}
  /* interior shell: body pushed inward, seen through the glass */
  shell(S,o);
  /* --- glass with black frit / surrounds --- */
  wins.forEach((w,i)=>{if(w)patch(o,dm.side,w,{bands:[{w:.016,mat:'gblack'}],fill:'glass',off:.004,mirror:true,seg:.09,fillRings:[]})});
  (S.pillarBlack||[]).forEach(i=>{const a=S.windows[i],b=S.windows[i+1];if(!a||!b)return;const xa=a[1]+.012,xb=b[0]-.012,s1=sec(xa),s2=sec(xb);
    patch(o,dm.side,quad([[xb,s2.yBelt+.012],[xa,s1.yBelt+.012],[xa,s1.yC-.004],[xb,s2.yC-.004]],.01),{fill:'gblack',off:.0045,mirror:true})});
  patch(o,dm.front,ws,{bands:[{w:.05,mat:'gblack'}],fill:'glass',off:.004,seg:.08,fillRings:[.5]});
  if(rg.view==='rear')patch(o,dm.rear,rg.poly,{bands:[{w:.045,mat:'gblack'}],fill:'glass',off:.004,seg:.08,fillRings:[]});
  {const xf=S.windows[0][0],xr=S.windows[S.windows.length-1][1],pts=[];for(let x=xr;x<=xf;x+=.06){const sc=sec(x);if(sc.yC-sc.yBelt>.12)pts.push([x,sc.yC+.004])}
    if(pts.length>2)ribbon(o,dm.side,pts,.014,{mat:'gblack',off:.0045,mirror:true,raise:.002})}
  /* chrome belt/window trim (minivan, sedan) */
  if(type==='minivan'||type==='sedan'){const xf=S.windows[0][0],xr=S.windows[S.windows.length-1][1],pts=[];for(let x=xr;x<=xf;x+=.05)pts.push([x,sec(x).yBelt+.008]);pts.push([xf,sec(xf).yBelt+.008]);
    ribbon(o,dm.side,pts,.014,{mat:'chrome',off:.005,mirror:true})}
  /* --- front --- */
  const yF=y=>y;
  {const h=cup(o,dm.front,HEAD,{depth:.075,wall:'headIn',back:'reflector',guide:'drl',guideAt:.12,guideW:.1,bezel:'gblack',mirror:true});
    if(h){let z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;for(const q of HEAD){z0=Math.min(z0,q[0]);z1=Math.max(z1,q[0]);y0=Math.min(y0,q[1]);y1=Math.max(y1,q[1])}
      for(const f of[.3,.55,.8]){const z=lerp(z0,z1,f),y=(y0+y1)/2-.006,xb=(dm.front.depth(z,y)??h.C.x)-h.dep*.55;
        for(const sg of[1,-1])o.geo('lens',rbox(.012,.022,(z1-z0)*.16,.008,1),mat4(xb,y,sg*z))}}}
  {const g=S.grille;cup(o,dm.front,GR,{depth:.09,wall:'gblack',back:g.bars?'grilleBars':'grille',bezel:g.chrome?'chrome':'trim',bezelW:.016,shrink:.03})}
  {const I=S.intake,h=cup(o,dm.front,IN,{depth:.07,wall:'gblack',back:'grille',bezel:'trim',bezelW:.012,shrink:.03});
    if(h)for(const sg of[1,-1]){const z=sg*(I.hw0-.11),y=I.y0+(I.y1-I.y0)*.5,xb=(dm.front.depth(z,y)??h.C.x)-h.dep,r=Math.min(.045,(I.y1-I.y0)*.28);
      const ring=new T.CylinderGeometry(r*1.2,r*1.3,.04,18,1,true);ring.rotateZ(-Math.PI/2);o.geo('chrome',ring,mat4(xb+.03,y,z));
      const lens=new T.CircleGeometry(r,18);lens.rotateY(Math.PI/2);o.geo('fog',lens,mat4(xb+.05,y,z))}}
  /* amber side markers (front) and red reflectors (rear) */
  {const yh=centroid(HEAD)[1];let xc=S.x1+S.endF;for(;xc>S.x1-.6;xc-=.005){const d=dm.side.depth(xc,yh-.02);if(d!=null&&d>S.hwF(xc-.3)-.07)break}
    patch(o,dm.side,rectP(xc-.1,yh-.02,.08,.026,.008),{fill:'amber',off:.004,mirror:true,fillRings:[.5]});
    const yr=S.rearBumperY+.06;let xr=S.x0-S.endR;for(;xr<S.x0+.6;xr+=.005){const d=dm.side.depth(xr,yr);if(d!=null&&d>S.hwF(xr+.3)-.07)break}
    patch(o,dm.side,rectP(xr+.09,yr,.08,.024,.008),{fill:'tail',off:.004,mirror:true,fillRings:[.5]})}
  patch(o,dm.front,rectP(0,S.plateF,.305,.152,.012),{fill:'plateF',off:.012});
  /* lower lip / valance */const I=S.intake;
  ribbon(o,dm.front,[[-(I.hw0+.06),S.botF(S.x1)+.035],[I.hw0+.06,S.botF(S.x1)+.035]],.05,{mat:'trim',off:.006});
  /* --- rear --- */
  cup(o,dm.rear,TAIL,{depth:.05,wall:'tailIn',back:'tail',guide:'brake',guideAt:.3,guideW:.22,bezel:'gblack',bezelW:.008,mirror:true});
  {const[y0,y1,len,y0f,y1f]=S.tailSide,ym=(y0+y1)/2;let xc=S.x0-S.endR;for(;xc<S.x0+.6;xc+=.005){const d=dm.side.depth(xc,ym);if(d!=null&&d>S.hwF(xc+.3)-.07)break}
    S._tailSide=[[xc-.005,y0],[xc+len,y0f],[xc+len,y1f],[xc-.005,y1]]}
  patch(o,dm.side,quad(S._tailSide,.025),{bands:[{w:.006,mat:'gblack'},{w:.025,mat:'tail'}],fill:'brake',off:.0065,mirror:true,raise:.003});
  patch(o,dm.rear,rectP(0,S.plateR,.305,.152,.012),{fill:'plateR',off:.01});
  ribbon(o,dm.rear,[[-.24,S.plateR+.1],[.24,S.plateR+.1]],.028,{mat:'chrome',off:.008});
  const rb0=S.botF(S.x0);
  patch(o,dm.rear,trap(rb0+.02,rb0+.12,.62,.66,.04),{fill:'trim',off:.006});
  ribbon(o,dm.rear,[[-.95,S.rearBumperY],[.95,S.rearBumperY]],.006,{mat:'trim',off:.003});
  ribbon(o,dm.front,[[-.95,S.intake.y1+.05],[.95,S.intake.y1+.05]],.005,{mat:'trim',off:.003});
  if(S.exhaust)for(const z of[-.5,.5]){const d=dm.rear.depth(z,rb0+.06)??-S.L/2;const g=new T.CylinderGeometry(.04,.04,.12,20,1,true);o.geo('chrome',g,mat4(-d+.0,rb0+.06,z,0,0,Math.PI/2));
    o.geo('under',new T.CircleGeometry(.036,20),mat4(-d-.05,rb0+.06,z,0,-Math.PI/2,0))}
  /* tailgate / trunk shut lines */
  if(S.trunk){const y0=S.rearBumperY+.01,ytop=sec(S.x0).yt-.02;ribbon(o,dm.rear,[[-.82,y0],[.82,y0]],.006,{mat:'trim',off:.003});
    for(const sg of[-1,1]){const pts=[];for(let x=S.x0+.05;x<=-1.52;x+=.04)pts.push([x,sg*(sec(x).wT-.06)]);ribbon(o,dm.top,pts,.006,{mat:'trim',off:.003})}}
  else if(S.tailgate){ribbon(o,dm.rear,[[-.86,.70],[.86,.70]],.007,{mat:'trim',off:.003});ribbon(o,dm.rear,[[-.80,1.22],[.80,1.22]],.03,{mat:'trim',off:.005})}
  else if(S.barnDoors){ribbon(o,dm.rear,[[0,S.rearBumperY+.02],[0,2.3]],.008,{mat:'trim',off:.003});
    const RG=S.rearGlass;for(const sg of[-1,1])patch(o,dm.rear,quad([[sg*.04,RG.y0],[sg*RG.hw0,RG.y0],[sg*RG.hw1,RG.y1],[sg*.04,RG.y1]],.04),{bands:[{w:.03,mat:'gblack'}],fill:'glass',off:.004});
    for(const sg of[-1,1])cutHole(B,'rear',[[sg*.07,RG.y0+.03],[sg*(RG.hw0-.03),RG.y0+.03],[sg*(RG.hw1-.03),RG.y1-.03],[sg*.07,RG.y1-.03]]);
    ribbon(o,dm.rear,[[-.06,1.35],[-.02,1.35]],.03,{mat:'trim',off:.008})}
  else{const RG=S.rearGlass,y0=S.rearBumperY+.01,hw=RG.hw0+.05;ribbon(o,dm.rear,[[-hw,RG.y1+.06],[-hw,y0],[hw,y0],[hw,RG.y1+.06]],.006,{mat:'trim',off:.003})}
  /* --- sides: door seams, handles, mirrors, cladding --- */
  const sm=S.seams;const sideLine=(x,yb)=>{const s=sec(x);return[[x,yb],[x,s.yBelt-.004]]};
  const doorLines=[sm.doorF,...sm.doors];for(const x of doorLines)ribbon(o,dm.side,sideLine(x,sm.bottomY),.009,{mat:'trim',off:.003,mirror:true});
  {const pts=[];for(let x=sm.doors[sm.doors.length-1];x<=sm.doorF;x+=.05)pts.push([x,sm.bottomY]);pts.push([sm.doorF,sm.bottomY]);ribbon(o,dm.side,pts,.006,{mat:'trim',off:.003,mirror:true})}
  /* hood shut lines */
  {const xh=S.cowl-.03,pts=[];const xe=S.x1-.25;for(let x=xh;x<=xe;x+=.04)pts.push([x,sec(x).wT-.07]);for(const sg of[1,-1])ribbon(o,dm.top,pts.map(p=>[p[0],p[1]*sg]),.004,{mat:'trim',off:.003,graze:.6})}
  for(const[hx]of S.handles){const s=sec(hx),y=s.yBelt-.075,q=dm.side.at(hx,y,0);if(!q)continue;
    const g=rbox(.2,.034,.03,.012,2);const m=M4().lookAt(V3(),q.n,V3(0,1,0));const r=new T.Euler().setFromRotationMatrix(m);
    const mm=mat4(q.p.x,q.p.y,q.p.z+.006,0,0,0);o.geo(type==='workvan'||type==='pickup'?'trim':'chrome',g,mm);o.geo(type==='workvan'||type==='pickup'?'trim':'chrome',g,mat4(q.p.x,q.p.y,-q.p.z-.006))}
  {const x=S.mirrorX,s=sec(x),q=dm.side.at(x,s.yBelt+.06,0);if(q){const hz=q.p.z;for(const sg of[1,-1]){
      o.geo('trim',rbox(.14,.07,.04,.02,1),mat4(x,s.yBelt+.05,sg*(hz+.01)));o.geo('trim',rbox(.06,.035,.09,.015,1),mat4(x-.01,s.yBelt+.07,sg*(hz+.06)));
      const hous=rbox(.1,.14,.21,.045,2);hous.translate(0,0,.18);o.geo('paint',hous,mat4(x-.02,s.yBelt+.1,sg*(hz),0,sg*.1,0,1,1,sg));
      const glass=rbox(.01,.115,.18,.005,1);glass.translate(0,0,.18);o.geo('chrome',glass,mat4(x-.072,s.yBelt+.1,sg*(hz),0,sg*.1,0,1,1,sg));
      const blink=rbox(.025,.016,.12,.008,1);blink.translate(0,0,.2);o.geo('amber',blink,mat4(x+.02,s.yBelt+.034,sg*(hz),0,sg*.1,0,1,1,sg))}}}
  /* wheel arch lips and liners */
  for(const ax of S.axles){const s=sec(ax);const zW=S.hwF(ax)-S.tw/2-.018;
    const lip=[];for(let i=0;i<=32;i++){const a=Math.PI*(i/32);lip.push([ax+Math.cos(a)*(S.Ra+.0),S.wr+Math.sin(a)*(S.Ra+.0)])}
    if(S.cladding)ribbon(o,dm.side,lip,.075,{mat:'clad',off:.005,w0:0,w1:.075,mirror:true,raise:.008});
    else ribbon(o,dm.side,lip,.025,{mat:'paint',off:.001,w0:0,w1:.025,mirror:true,raise:.004});
    const lg=new T.CylinderGeometry(S.Ra-.012,S.Ra-.012,S.hwF(ax)*2-.06,14,1,true,Math.PI/2,Math.PI);lg.rotateX(Math.PI/2);o.geo('under',lg,mat4(ax,S.wr,0))}
  if(S.cladding){const pts=[];const xa=S.axles[1]+S.Ra+.01,xb=S.axles[0]-S.Ra-.01;pts.push([xa,S.botF(0)+.08],[xb,S.botF(0)+.08]);ribbon(o,dm.side,pts,.16,{mat:'clad',off:.005,mirror:true,raise:.006})}
  /* minivan sliding-door track, fuel door */
  if(S.slidingTrack){const x0=S.seams.doors[S.seams.doors.length-1]-.04,pts=[];for(let x=x0;x>=S.x0+.25;x-=.05)pts.push([x,sec(x).yBelt-.035]);ribbon(o,dm.side,pts,.022,{mat:'trim',off:.004,mirror:true})}
  {const x=S.axles[1]+S.Ra*.15,y=S.wr+S.Ra+.18;ribbon(o,dm.side,roundPoly([[x-.08,y-.08],[x+.08,y-.08],[x+.08,y+.08],[x-.08,y+.08]],.03),.005,{mat:'trim',closed:true,off:.003})}
  /* roof rails */
  if(S.rails){const xa=S.roofF+.1,xb=S.x0+.18,pts=[];const n=24;for(let i=0;i<=n;i++){const x=lerp(xa,xb,i/n),s=sec(x),z=s.wT-.1,y=(dm.top.depth(x,z)??s.yt)+(i===0||i===n?.02:.055);pts.push(V3(x,y,z))}
    for(const sg of[1,-1]){const c=new T.CatmullRomCurve3(pts.map(p=>V3(p.x,p.y,p.z*sg)));o.geo('rail',new T.TubeGeometry(c,16,.018,6,false));
      for(const x of[xa,xb]){const s=sec(x),z=s.wT-.1,y=dm.top.depth(x,z)??s.yt;o.geo('trim',rbox(.12,.05,.05,.02,2),mat4(x+(x===xa?-.02:.02),y+.02,z*sg))}}}
  /* wipers */
  {const s=sec(S.cowl-.02);for(const[z0,z1]of[[-.62,.0],[-.02,.55]]){const pts=[];for(let i=0;i<=10;i++){const z=lerp(z0,z1,i/10);pts.push([z,s.yt+.035+i*.004])}ribbon(o,dm.front,pts,.018,{mat:'trim',off:.02})}}
  if(S.wiperRear){const RG=S.rearGlass;ribbon(o,dm.rear,[[.02,RG.y0+.03],[.38,RG.y0+.24]],.014,{mat:'trim',off:.012});o.geo('trim',rbox(.03,.05,.05,.02,2),mat4(-(dm.rear.depth(0,RG.y0+.02)??0)-.01,RG.y0+.02,0))}
  /* sticker */
  if(S.sticker)patch(o,dm.rear,rectP(-.45,S.rearBumperY-.07,.27,.085,.015),{fill:'sticker',off:.007});
  /* antenna fin */
  {const x=S.x0+.45,y=dm.top.depth(x,0)??S.H;const g=rbox(.18,.06,.06,.028,2);o.geo('gblack',g,mat4(x,y+.02,0,0,0,0,1,1,.8))}
  /* pickup bed */
  if(S.bed){const b=S.bed,ytop=sec(-1.5).yt,h=ytop-b.floor+.02;const g=new T.BoxGeometry(b.x1-b.x0,h,b.hw*2,1,1,1);
    const idx=g.index.array;const keep=[];for(let i=0;i<idx.length;i+=3){const ny=g.attributes.normal.getY(idx[i]);if(ny<.5)keep.push(idx[i],idx[i+2],idx[i+1])}
    g.setIndex(keep);const g2=g.toNonIndexed();const nn=g2.attributes.normal;for(let i=0;i<nn.count;i++)nn.setXYZ(i,-nn.getX(i),-nn.getY(i),-nn.getZ(i));
    o.geo('bedliner',g2,mat4((b.x0+b.x1)/2,b.floor+h/2,0));
    for(const sg of[1,-1]){const g3=rbox(b.x1-b.x0+.02,.03,.09,.012,2);o.geo('trim',g3,mat4((b.x0+b.x1)/2,ytop+.01,sg*(b.hw+.03)))}
    o.geo('trim',rbox(.06,.03,b.hw*2+.1,.012,2),mat4(b.x0-.02,ytop+.01,0));
    /* cab back glass */
    const RG=S.rearGlass,xb=-.70;const cb=new Out();const gl=new T.PlaneGeometry(RG.hw0*2,RG.y1-RG.y0);
    o.geo('gblack',rbox(.02,RG.y1-RG.y0+.07,RG.hw0*2+.07,.02,2),mat4(-.775,(RG.y0+RG.y1)/2,0));
    o.geo('glass',rbox(.012,RG.y1-RG.y0,RG.hw0*2,.03,2),mat4(-.79,(RG.y0+RG.y1)/2,0))}
  if(S.bed){const pts=[[-.765,S.botF(-.76)+.04],[-.765,sec(-.9).yt-.01]];ribbon(o,dm.side,pts,.022,{mat:'gblack',off:.004,mirror:true,graze:.5,seg:.03})}
  /* workvan: bulkhead behind seats, side step */
  if(S.bulkhead!=null){o.geo('interior',new T.BoxGeometry(.03,1.6,1.9),mat4(S.bulkhead,1.25,0))}
  /* steel/black bumpers for the work van and pickup */
  if(S.steelBumpers||type==='pickup'){const mat=type==='pickup'?'chrome':'trim';
    const bump=(view,yc,h,dep,sgn)=>{const d=dm[view],pts=[],hw=S.hwF(sgn>0?S.x1-.25:S.x0+.25)-.01;for(let i=0;i<=24;i++){const z=lerp(-hw,hw,i/24);let dd=-1e9;for(const yy of[yc-h/2,yc,yc+h/2]){const v=d.depth(z,yy);if(v!=null)dd=Math.max(dd,v)}
        if(dd<-1e8)continue;const p=d.world(z,yc,dd+dep*.25);pts.push(p)}
      if(pts.length<4)return;const sh=new T.Shape();const r=Math.min(.04,h*.3),w2=dep/2,h2=h/2;sh.moveTo(-w2+r,-h2);sh.lineTo(w2-r,-h2);sh.quadraticCurveTo(w2,-h2,w2,-h2+r);sh.lineTo(w2,h2-r);sh.quadraticCurveTo(w2,h2,w2-r,h2);sh.lineTo(-w2+r,h2);sh.quadraticCurveTo(-w2,h2,-w2,h2-r);sh.lineTo(-w2,-h2+r);sh.quadraticCurveTo(-w2,-h2,-w2+r,-h2);
      const c=new T.CatmullRomCurve3(pts);const g=new T.ExtrudeGeometry(sh,{steps:40,bevelEnabled:false,extrudePath:c,curveSegments:3});o.geo(mat,geoCrease(g,50));
      for(const e of[0,pts.length-1]){const cap=rbox(dep,h,.03,.012,2);o.geo(mat,cap,mat4(pts[e].x,yc,pts[e].z))}};
    const ybF=S.botF(S.x1)+.05,ybR=S.botF(S.x0)+.05;bump('front',ybF+.1,.2,.14,1);bump('rear',ybR+.08,.17,.13,-1)}
  /* interior: seats, dash, wheel */
  {const hip=Math.max(S.botF(0)+.28,sec(0).yBelt-.47),zs={2:[-.38,.38],3:[-.45,0,.45]};const dashX=S.cowl-.15,sd=sec(dashX);
    o.geo('seat',rbox(.55,.22,sec(dashX).wB*2-.25,.08,1),mat4(dashX,sd.yBelt-.07,0));
    const wheelG=new T.TorusGeometry(.18,.022,8,28);o.geo('trim',wheelG,mat4(dashX-.32,sd.yBelt+.02,-.38,0,Math.PI/2,0).multiply(M4().makeRotationY(0)).multiply(M4().makeRotationX(0)));
    for(const[sx,n]of S.seats){const lim=Math.min(S.topF(sx-.35),S.topF(sx-.2))-.1-hip,bh=clamp(lim-.24,.3,.62);if(n===3){o.geo('seat',rbox(.5,.13,1.32,.05,1),mat4(sx,hip,0));o.geo('seat',rbox(.13,bh,1.32,.05,1),mat4(sx-.27,hip+.02+bh/2,0,0,0,-.18))}
    for(const z of zs[n]){const w=n===3?.42:.5;if(n!==3){o.geo('seat',rbox(.5,.13,w,.05,1),mat4(sx,hip,z));o.geo('seat',rbox(.13,bh,w,.05,1),mat4(sx-.27,hip+.02+bh/2,z,0,0,-.18))}
      o.geo('seat',rbox(.1,.15,w*.55,.04,1),mat4(sx-.33,hip+bh+.1,z,0,0,-.18))}}}
  /* brake calipers (static, behind the spokes) */
  for(const ax of S.axles)for(const sg of[1,-1]){const zW=S.hwF(ax)-S.tw/2-.018;o.geo('caliper',rbox(.07,.15,.06,.02,2),mat4(ax-S.rimR*.62*Math.cos(.5),S.wr+S.rimR*.62*Math.sin(.5),sg*zW+sg*(S.tw/2-.075),0,0,.5))}
  const built=o.build(),OPT=['paint','paint2','glass','wood','woodTrim','mural','pin'];
  const flakeUV=g=>{if(!g)return g;const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));
      uv.setXY(i,(az>=ax&&az>=ay?p.getX(i):ax>=ay?p.getZ(i):p.getX(i))*5,(ay>ax&&ay>az?p.getZ(i):p.getY(i))*5)}uv.needsUpdate=true;return g};
  flakeUV(built.paint);flakeUV(built.paint2);
  const K={type,S,dm,sec,ws,wins,rg,paint:built.paint,paint2:built.paint2,paintAll:mergeGeos([built.paint,built.paint2]),glass:built.glass,
    multi:packMulti(o,Object.keys(o.b).filter(k=>!OPT.includes(k)),{plate:S.plateTxt}),fin:{wood:packMulti(o,['wood','woodTrim']),mural:packMulti(o,['mural']),twotone:packMulti(o,['pin'])}};
  K.counts={};for(const k in o.b)K.counts[k]=o.b[k].p.length/9;
  return KITS[type]=K}

/* ---------------------------------------------------------------- wheels */
const WG={};
function rimGeo(rimR,tw,style){const key=rimR+'|'+tw+'|'+style;if(WG[key])return WG[key];
  const Rf=rimR-.012,n=style==='alloy'?10:style==='spinner'?7:style==='steel'?8:5,hub=.27*Rf,outR=.86*Rf,depth=.022;
  const shape=new T.Shape();shape.absarc(0,0,Rf,0,Math.PI*2,false);
  const ww=style==='alloy'?[.022,.017]:style==='spinner'?[.03,.02]:style==='steel'?[.0,.0]:[.05,.036];
  if(style==='steel'){for(let i=0;i<n;i++){const a=(i+.5)/n*Math.PI*2,c=[Math.cos(a)*Rf*.62,Math.sin(a)*Rf*.62];const h=new T.Path();h.absellipse(c[0],c[1],Rf*.11,Rf*.07,0,Math.PI*2,true,a);shape.holes.push(h)}}
  else for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,pts=[],eps=(r,w)=>Math.asin(Math.min(.9,w/2/r)),R0=hub+.012,R1=outR;
    for(let k=0;k<=3;k++){const r=lerp(R0,R1,k/3),w=lerp(ww[0],ww[1],k/3),a=a0+eps(r,w);pts.push([Math.cos(a)*r,Math.sin(a)*r])}
    for(let k=1;k<6;k++){const a=lerp(a0+eps(R1,ww[1]),a1-eps(R1,ww[1]),k/6);pts.push([Math.cos(a)*R1,Math.sin(a)*R1])}
    for(let k=3;k>=0;k--){const r=lerp(R0,R1,k/3),w=lerp(ww[0],ww[1],k/3),a=a1-eps(r,w);pts.push([Math.cos(a)*r,Math.sin(a)*r])}
    for(let k=3;k>0;k--){const a=lerp(a0+eps(R0,ww[0]),a1-eps(R0,ww[0]),k/4);pts.push([Math.cos(a)*R0,Math.sin(a)*R0])}
    const rp=roundPoly(pts.slice().reverse(),n>5?.008:.014,1);const h=new T.Path();h.moveTo(rp[0][0],rp[0][1]);for(let k=1;k<rp.length;k++)h.lineTo(rp[k][0],rp[k][1]);h.closePath();shape.holes.push(h)}
  const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16});
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i)),d=style==='steel'?.012:.03;p.setZ(i,p.getZ(i)+d*(1-clamp(r/Rf,0,1))-(style==='steel'?0:.0))}
  const face=geoCrease(g,35);{const P=face.attributes.position,N=face.attributes.normal,keep=[];for(let t=0;t<P.count;t+=3){if((N.getZ(t)+N.getZ(t+1)+N.getZ(t+2))/3>-.9)keep.push(t)}
    const ng=new T.BufferGeometry();for(const k of['position','normal']){const A=face.attributes[k],arr=new Float32Array(keep.length*9);keep.forEach((t,i)=>{for(let j=0;j<9;j++)arr[i*9+j]=A.array[t*3+j]});ng.setAttribute(k,new T.BufferAttribute(arr,3))}
    var faceK=ng}const o=new Out();o.geo('rim',faceK);
  o.geo('rim',new T.TorusGeometry(rimR-.004,.011,4,28),null);
  const capR=style==='steel'?.07:.045;const cap=new T.CylinderGeometry(capR*.9,capR,.016,16);cap.rotateX(Math.PI/2);o.geo(style==='steel'?'rim':'disc',cap,mat4(0,0,depth+(style==='steel'?.012:.03)+.008));
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+Math.PI/10,r=style==='steel'?.06:.068;const nut=new T.CylinderGeometry(.009,.011,.016,6);nut.rotateX(Math.PI/2);o.geo('rim',nut,mat4(Math.cos(a)*r,Math.sin(a)*r,depth+(style==='steel'?.012:.024)+.006))}
  const b=o.build();for(const k in b){b[k].translate(0,0,tw/2-.045-depth)}return WG[key]=b}
function wheelGeos(S){const R=S.wr,tw=S.tw,rr=S.rimR,hw=tw/2,key='w'+R+tw+rr;if(WG[key])return WG[key];
  const pr=[[rr+.004,-hw*.82],[rr+.012,-hw*.92],[lerp(rr,R,.45),-hw*1.0],[R-.035,-hw*.98],[R-.012,-hw*.9],[R,-hw*.62],[R,0],[R,hw*.62],[R-.012,hw*.9],[R-.035,hw*.98],[lerp(rr,R,.45),hw*1.0],[rr+.012,hw*.92],[rr+.004,hw*.82]];
  const pts=[];for(let i=0;i<pr.length-1;i++){const a=pr[i],b=pr[i+1];for(let k=0;k<1;k++){const t=k;pts.push(new T.Vector2(lerp(a[0],b[0],t),lerp(a[1],b[1],t)))}}pts.push(new T.Vector2(...pr[pr.length-1]));
  const tyre=new T.LatheGeometry(pts,28);tyre.rotateX(Math.PI/2);
  /* barrel (inside of the rim) and brake disc */
  const o=new Out();const bar=new T.CylinderGeometry(rr-.006,rr-.006,tw*.82,24,1,true);bar.rotateX(Math.PI/2);o.geo('disc',bar);
  const disc=new T.CylinderGeometry(rr*.78,rr*.78,.024,24,1,true);disc.rotateX(Math.PI/2);o.geo('disc',disc,mat4(0,0,tw/2-.12));
  const hubG=new T.CylinderGeometry(.075,.08,.06,12);hubG.rotateX(Math.PI/2);o.geo('disc',hubG,mat4(0,0,tw/2-.1));
  const inner=o.build();const cal=rbox(.07,.15,.06,.02,2);
  return WG[key]={tyre,inner,caliper:cal}}

/* ---------------------------------------------------------------- materials: one atlas + per-vertex PBR */
/* Everything except paint, glass and the contact shadow is drawn by ONE MeshStandardMaterial per car
   ("multi"): base colour, roughness, metalness and emissive come from vertex attributes, textures from a shared
   atlas (grille, plates, sticker, wood, mural, LEDs, tyre tread/sidewall normals). Lamps are emissive channels
   driven by uniforms, and wheel spin/steer is a vertex rotation (attribute `wheel`), so a whole car is ~5 draw calls. */
const col=c=>new T.Color(c).convertSRGBToLinear();
const CH={head:1,tail:2,brake:3,bar:4,drl:5,amber:6,rev:7};
/* bucket -> {c colour, r roughness, m metalness, e emissive colour, ch channel, tex atlas region, dbl double-sided, flip inward} */
const SPEC={
  under:{c:'#0c0c0d',r:.9},liner:{c:'#0a0a0b',r:.95,dbl:1},trim:{c:'#0d0e10',r:.55},clad:{c:'#141517',r:.78},seam:{c:'#030303',r:.9},
  gblack:{c:'#050506',r:.1},tailIn:{c:'#2a0606',r:.15,m:.3},headIn:{c:'#15181c',r:.2,m:.9},lens:{c:'#1a1d22',r:.05,m:.2},chrome:{c:'#e8eaee',r:.06,m:1},rail:{c:'#9da2a8',r:.32,m:.9},
  interior:{c:'#1d1e20',r:.95,flip:1},seat:{c:'#2a2b2e',r:.9},bedliner:{c:'#141414',r:.95,dbl:1},
  grille:{c:'#ffffff',r:.45,m:.4,tex:'grille'},grilleBars:{c:'#ffffff',r:.3,m:.7,tex:'bars'},plateF:{c:'#ffffff',r:.4,m:.1,tex:'plateF'},plateR:{c:'#ffffff',r:.4,m:.1,tex:'plateR'},
  sticker:{c:'#ffffff',r:.5,tex:'sticker'},woodTrim:{c:'#c9a86a',r:.4},wood:{c:'#ffffff',r:.35,tex:'wood'},mural:{c:'#ffffff',r:.3,tex:'mural'},pin:{c:'#e8eaee',r:.06,m:1},
  head:{c:'#c9d0d8',r:.07,m:1,e:'#fff3df',ch:CH.head},reflector:{c:'#9aa2ab',r:.16,m:1,e:'#fff3df',ch:CH.head},drl:{c:'#ffffff',r:.2,e:'#eef4ff',ch:CH.drl},
  tail:{c:'#6a0b0b',r:.08,m:.1,e:'#ff1408',ch:CH.tail},brake:{c:'#8a0d0d',r:.12,m:.2,e:'#ff1a0c',ch:CH.brake},brakeBar:{c:'#8a0d0d',r:.12,m:.2,e:'#ff1a0c',ch:CH.brake},
  rev:{c:'#d8dadc',r:.1,m:.6,e:'#ffffff',ch:CH.rev},amber:{c:'#c26a10',r:.2,m:.1,e:'#ff8a1a',ch:CH.amber},fog:{c:'#e8eef4',r:.06,m:.8,e:'#fff6e0',ch:CH.head},
  ledbar:{c:'#ffffff',r:.2,tex:'led',e:'#ffffff',ch:CH.bar},ledamber:{c:'#ffe2b0',r:.2,tex:'led',e:'#ffa020',ch:CH.bar},
  cargo:{c:'#0e0f11',r:.22,m:.2},bull:{c:'#17181a',r:.42,m:.55},bar:{c:'#141414',r:.35,m:.6},
  tyre:{c:'#151516',r:.86,tex:'tyre'},disc:{c:'#6f7276',r:.4,m:.9,dbl:1},caliper:{c:'#8f1c18',r:.4,m:.2},cap:{c:'#2a2d33',r:.3,m:.6},
  'rim:stock':{c:'#b9bdc3',r:.24,m:.9},'rim:alloy':{c:'#eef0f2',r:.08,m:1},'rim:black':{c:'#0b0b0c',r:.22,m:.5},'rim:steel':{c:'#a3a7ac',r:.38,m:.85},
  'rim:chrome':{c:'#f2f3f5',r:.03,m:1},'rim:gold':{c:'#d6aa4c',r:.16,m:1},'rim:spinner':{c:'#f0f0f0',r:.04,m:1},
  /* LOD1 flat-shaded classes */
  lodGlass:{c:'#0c1116',r:.05,m:.1},lodPaint:{c:'#ffffff',r:.35,pnt:1}};
const PLATES=['HT 4DAD','SOCR DAD','HOA PRES','CARPOOL','LIL DAD','BIG DAD','FIXIT'];
let ATLAS=null;
function atlas(){if(ATLAS)return ATLAS;const W=2048,H=1024,R={};
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,W,H);
  const n=document.createElement('canvas');n.width=W;n.height=H;const gn=n.getContext('2d');gn.fillStyle='rgb(128,128,255)';gn.fillRect(0,0,W,H);
  const reg=(name,x,y,w,h,pad=4)=>{R[name]=[(x+pad)/W,1-(y+h-pad)/H,(x+w-pad)/W,1-(y+pad)/H];return[x+pad,y+pad,w-2*pad,h-2*pad]};
  const put=(src,x,y,w,h)=>g.drawImage(src.image||src,x,y,w,h);
  /* row 0: tyre (normal map: tread + sidewall lettering) */
  {const[x,y,w,h]=reg('tyre',0,0,2048,256,0);gn.drawImage(tyreNormalCanvas(),x,y,w,h)}
  {const[x,y,w,h]=reg('grille',0,256,512,256);put(grilleTex(),x,y,w,h)}
  {const[x,y,w,h]=reg('bars',512,256,512,256);put(grilleBars(),x,y,w,h)}
  {const[x,y,w,h]=reg('sticker',1024,256,512,160);put(stickerTex(),x,y,w,h)}
  {const[x,y,w,h]=reg('led',1024,432,512,64);put(ledTex(),x,y,w,h)}
  {const[x,y,w,h]=reg('wood',0,512,1024,256);put(woodTex(),x,y,w,h)}
  {const[x,y,w,h]=reg('mural',1024,512,1024,256);put(muralTex(),x,y,w,h)}
  PLATES.forEach((t,i)=>{const[x,y,w,h]=reg('plate:'+t,i*256,768,256,128,3);put(plateTex(t,'SUBURBIA'),x,y,w,h)});
  reg('white',1600,900,64,64,8);
  const tc=new T.CanvasTexture(c);tc.encoding=T.sRGBEncoding;tc.anisotropy=8;const tn=new T.CanvasTexture(n);tn.anisotropy=8;
  return ATLAS={R,map:tc,normal:tn}}
/* tyre normal: tread blocks across the middle, sidewall ribs and raised lettering on both walls */
function tyreNormalCanvas(){const w=2048,h=256,hc=document.createElement('canvas');hc.width=w;hc.height=h;const g=hc.getContext('2d');
  g.fillStyle='#4d4d4d';g.fillRect(0,0,w,h);
  /* lettering on the walls (v 0..0.18 and 0.82..1 of the lathe profile) */
  g.fillStyle='#9a9a9a';g.font='bold 26px Arial,Helvetica,sans-serif';g.textBaseline='middle';
  for(const yy of[22,h-22])for(let k=0;k<2;k++){const x0=k*w/2;g.fillText('SUBURBAN  TOURING  A/S',x0+120,yy);g.fillText('235/60 R18  103H',x0+620,yy)}
  const img=g.getImageData(0,0,w,h).data,Hh=new Float32Array(w*h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const v=j/h,u=i/w;let hh=img[(j*w+i)*4]/255*.6;
    if(v>.2&&v<.8){hh=1;for(const gv of[.37,.5,.63])if(Math.abs(v-gv)<.016)hh=0;const ph=(u*96+(v<.5?0:.5))%1;
      if((v<.37||v>.63)&&ph<.12)hh=Math.min(hh,.15);if(v>.39&&v<.61&&Math.abs(ph-.55)<.03)hh=Math.min(hh,.4);if(v<.26||v>.74)hh=lerp(hh,.3,smooth(.74,.8,Math.max(v,1-v)))}
    else hh+=.03*Math.sin(v*300);Hh[j*w+i]=hh}
  const c=document.createElement('canvas');c.width=w;c.height=h;const gc=c.getContext('2d'),out=gc.createImageData(w,h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const l=Hh[j*w+(i+w-1)%w],r=Hh[j*w+(i+1)%w],u=Hh[Math.max(0,j-1)*w+i],d=Hh[Math.min(h-1,j+1)*w+i];
    const nx=(l-r)*3,ny=(d-u)*3,L=Math.hypot(nx,ny,1),o=(j*w+i)*4;out.data[o]=(nx/L*.5+.5)*255;out.data[o+1]=(ny/L*.5+.5)*255;out.data[o+2]=(1/L*.5+.5)*255;out.data[o+3]=255}
  gc.putImageData(out,0,0);return c}

/* pack buckets of an Out into one geometry with the multi-material attributes */
function packMulti(o,names,opt={}){const A=atlas(),pos=[],nor=[],uv=[],colA=[],pbr=[],em=[],ech=[],pnt=[];
  for(const m of names){const B=o.b[m];if(!B||!B.p.length)continue;const sp=SPEC[opt.remap&&opt.remap[m]||m]||SPEC.trim,c=col(sp.c),e=sp.e?col(sp.e):null;
    const rg=A.R[sp.tex==='plateR'?'plate:'+(opt.plate||PLATES[0]):sp.tex==='plateF'?'plate:'+PLATES[0]:(sp.tex||'white')]||A.R.white;
    const emit=(i,flipN)=>{pos.push(B.p[i*3],B.p[i*3+1],B.p[i*3+2]);const s=flipN?-1:1;nor.push(B.n[i*3]*s,B.n[i*3+1]*s,B.n[i*3+2]*s);
      const u=B.u[i*2]||0,v=B.u[i*2+1]||0;uv.push(sp.tex?rg[0]+(rg[2]-rg[0])*clamp(u,0,1):(rg[0]+rg[2])/2,sp.tex?rg[1]+(rg[3]-rg[1])*clamp(v,0,1):(rg[1]+rg[3])/2);
      colA.push(c.r,c.g,c.b);pbr.push(sp.r??.5,sp.m??0);if(e)em.push(e.r,e.g,e.b);else em.push(0,0,0);ech.push(sp.ch||0);pnt.push(sp.pnt||0)};
    const nv=B.p.length/3;
    for(let t=0;t<nv;t+=3){if(sp.flip){emit(t,1);emit(t+2,1);emit(t+1,1)}else{emit(t);emit(t+1);emit(t+2)}if(sp.dbl){emit(t,1);emit(t+2,1);emit(t+1,1)}}}
  if(!pos.length)return null;const g=new T.BufferGeometry(),F=(a,n)=>new T.Float32BufferAttribute(a,n);
  g.setAttribute('position',F(pos,3));g.setAttribute('normal',F(nor,3));g.setAttribute('uv',F(uv,2));g.setAttribute('color',F(colA,3));
  g.setAttribute('pbr',F(pbr,2));g.setAttribute('em',F(em,3));g.setAttribute('ech',F(ech,1));g.setAttribute('pnt',F(pnt,1));
  if(opt.wheel){const wv=[];for(let i=0;i<pos.length/3;i++)wv.push(...opt.wheel);g.setAttribute('wheel',F(wv,4))}
  g.computeBoundingSphere();g.computeBoundingBox();return g}
function mergeGeos(gs){gs=gs.filter(Boolean);if(!gs.length)return null;const g=new T.BufferGeometry();
  for(const k in gs[0].attributes){const n=gs[0].attributes[k].itemSize;let len=0;for(const x of gs)len+=x.attributes[k]?x.attributes[k].array.length:x.attributes.position.count*n;
    const arr=new Float32Array(len);let off=0;for(const x of gs){const a=x.attributes[k];if(a)arr.set(a.array,off);else if(k==='wheel')for(let i=0;i<x.attributes.position.count;i++)arr[off+i*4+3]=1;off+=a?a.array.length:x.attributes.position.count*n}
    g.setAttribute(k,new T.BufferAttribute(arr,n))}
  g.computeBoundingSphere();g.computeBoundingBox();return g}
/* the per-car multi material (cheap: one shared shader program) */
function multiMat(){const A=atlas(),U={uCh:{value:[0,0,.08,.1,.3,1.6,.25,0]},uLamp:{value:new T.Vector4(1,1,1,1)},uSpin:{value:0},uSteer:{value:0},uPaint:{value:new T.Color(1,1,1)}};
  const m=new T.MeshStandardMaterial({vertexColors:true,map:A.map,normalMap:A.normal,roughness:1,metalness:1});m.userData.U=U;
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,m.userData.U);
    sh.vertexShader=sh.vertexShader.replace('#include <common>',`#include <common>
attribute vec2 pbr;attribute vec3 em;attribute float ech;attribute float pnt;attribute vec4 wheel;uniform float uCh[8];uniform vec4 uLamp;uniform float uSpin;uniform float uSteer;uniform vec3 uPaint;
varying vec2 vPbr;varying vec3 vEm;
vec3 wrot(vec3 p){if(wheel.w>1.5){float s=sin(uSpin),c=cos(uSpin);p=vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);if(wheel.w>2.5){float s2=sin(uSteer),c2=cos(uSteer);p=vec3(c2*p.x+s2*p.z,p.y,-s2*p.x+c2*p.z);}}return p;}`)
      .replace('#include <beginnormal_vertex>','vec3 objectNormal=wrot(vec3(normal));')
      .replace('#include <begin_vertex>','vec3 transformed=wheel.w>1.5?wrot(position-wheel.xyz)+wheel.xyz:vec3(position);')
      .replace('#include <color_vertex>',`#include <color_vertex>
vPbr=pbr;int ci=int(ech+.5);float k=0.;for(int i=0;i<8;i++){if(i==ci)k=uCh[i];}if(ci==1||ci==5)k*=position.z>0.?uLamp.y:uLamp.x;else if(ci==2||ci==3||ci==7)k*=position.z>0.?uLamp.w:uLamp.z;vEm=em*k;
#ifdef USE_COLOR
if(pnt>.5)vColor=uPaint;
#endif`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vPbr;varying vec3 vEm;')
      .replace('#include <roughnessmap_fragment>','float roughnessFactor=vPbr.x;')
      .replace('#include <metalnessmap_fragment>','float metalnessFactor=vPbr.y;')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vEm;')};
  return m}
const MAT={};
function shared(){if(MAT.ok)return MAT;MAT.ok=1;
  MAT.shadow=new T.MeshBasicMaterial({map:shadowTex(),transparent:true,depthWrite:false,opacity:.82,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  MAT.flake=normalFromHeight('flake',256,256,(u,v)=>{const h=Math.sin(u*913.1+Math.sin(v*377.3)*3)*Math.sin(v*811.7+Math.cos(u*511.9)*3);return h*.5+.5},1.2);
  return MAT}
const PAINT={minivan:'#3e5872',sedan:'#8c1d1d',suv:'#2c3a4a',hatch:'#e6e6e2',pickup:'#1d1e21',workvan:'#f2f2ef'};

/* ---------------------------------------------------------------- upgrades */
function addUpgrades(type,K,u,root,mats){const S=K.S,dm=K.dm,sec=K.sec,o=new Out(),extra=[];
  const roofY=(x,z)=>dm.top.depth(x,z)??S.H;
  if(u.roofRack){const xa=S.roofF+.3,xb=S.roofR+.12;const zr=sec((xa+xb)/2).wT-.1,railsOnly=u.roofRack==='rails';
    if(!S.rails)for(const sg of[1,-1]){for(const x of[xa+.08,xb-.08]){const y=roofY(x,zr);o.geo('trim',rbox(.1,.07,.06,.02,2),mat4(x,y+.03,zr*sg))}
      o.geo('rail',rbox(xa-xb,.035,.04,.015,2),mat4((xa+xb)/2,roofY((xa+xb)/2,zr)+.075,zr*sg))}
    if(!railsOnly){
    const yR=Math.max(roofY(xa-.2,zr),roofY(xb+.2,zr))+(S.rails?.055:.06);
    for(const x of[xa-.2,xb+.2]){o.geo('bar',rbox(.07,.03,zr*2+.12,.012,2),mat4(x,yR+.035,0));for(const sg of[1,-1])o.geo('bar',rbox(.09,yR+.05-roofY(x,zr),.06,.015,2),mat4(x,(yR+.05+roofY(x,zr))/2,sg*zr))}
    /* aero cargo box */
    const len=Math.min(1.75,xa-xb+.45),bw=.82,bh=.36;const g=rbox(len,bh,bw,.15,3);const p=g.attributes.position;
    for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);const t=smooth(len*.1,len/2,x);y=-bh/2+(y+bh/2)*(1-.45*t);z*=1-.18*t*t;const tr=smooth(-len/2,-len*.3,-x);y=-bh/2+(y+bh/2)*(1-.12*tr);p.setXYZ(i,x,y,z)}
    g.computeVertexNormals();o.geo('cargo',g,mat4((xa+xb)/2-.05,yR+.07+bh/2,0));
    o.geo('trim',rbox(len-.08,.012,bw-.02,.006,2),mat4((xa+xb)/2-.05,yR+.07+bh*.42,0))}}
  if(u.bullBar){const yb=Math.max(.32,S.botF(S.x1)+.02),yt=Math.min(S.grille.y1+.02,sec(S.x1-.3).yt-.04);const zb=.5;
    const xf=z=>Math.max(dm.front.depth(z,(yb+yt)/2)??S.x1,dm.front.depth(z,yt-.04)??S.x1,dm.front.depth(z,yb+.05)??S.x1)+.07;
    const fx=xf(0);for(const sg of[1,-1]){const c=new T.CatmullRomCurve3([V3(fx-.02,yb,sg*zb),V3(fx+.02,yb+.2,sg*zb),V3(fx+.04,yt-.06,sg*zb),V3(fx+.03,yt,sg*(zb-.06)),V3(fx+.03,yt+.01,sg*.25),V3(fx+.03,yt+.01,0)]);
      o.geo('bull',new T.TubeGeometry(c,24,.03,8,false))}
    o.geo('bull',new T.CylinderGeometry(.026,.026,zb*2,8),mat4(fx+.03,(yb+yt)/2,0,Math.PI/2,0,0));
    o.geo('bull',rbox(.24,.03,zb*2+.08,.012,2),mat4(fx-.08,yb-.03,0,0,0,.25));
    for(const sg of[1,-1])o.geo('bull',rbox(.18,.06,.06,.02,2),mat4(fx-.12,yb+.08,sg*.35))}
  if(u.lightBar){const x=type==='pickup'||type==='workvan'?S.roofF-.08:S.roofF+.15,zr=sec(x).wT-.18,y=roofY(x,0)+.06;const len=Math.min(1.2,zr*2);
    o.geo('bar',rbox(.09,.1,len,.025,2),mat4(x,y+.03,0));for(const sg of[1,-1])o.geo('bar',rbox(.1,.06,.03,.01,2),mat4(x-.03,y-.02,sg*(len/2-.08)));
    const led=new T.PlaneGeometry(len-.06,.055);led.rotateY(Math.PI/2);o.geo('ledbar',led,mat4(x+.0465,y+.03,0))}
  if(u.spoiler){if(S.trunk){const xs=S.x0+.12,s=sec(xs),y=s.yt;const wing=new T.ExtrudeGeometry(new T.Shape([new T.Vector2(0,0),new T.Vector2(.26,.01),new T.Vector2(.25,.035),new T.Vector2(.02,.05)]),{depth:s.wT*2-.08,bevelEnabled:true,bevelSize:.006,bevelThickness:.006,bevelSegments:2});
      wing.translate(-.13,0,-(s.wT-.04));o.geo('paint',wing,mat4(xs+.02,y+.085,0,0,0,-.04));for(const sg of[1,-1])o.geo('paint',rbox(.1,.09,.03,.012,2),mat4(xs+.03,y+.04,sg*(s.wT-.3)))}
    else if(type==='pickup'){const xs=S.x0+.05;o.geo('paint',rbox(.12,.03,S.bed.hw*2+.1,.012,2),mat4(xs,sec(xs).yt+.03,0,0,0,.25))}
    else{const xs=S.x0+.1,s=sec(xs),w=s.wT*2-.04,y=s.yt-.02;const sh=new T.Shape([new T.Vector2(.25,0),new T.Vector2(-.12,-.03),new T.Vector2(-.14,.0),new T.Vector2(.25,.035)]);
      const g=new T.ExtrudeGeometry(sh,{depth:w,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:2});g.translate(0,0,-w/2);o.geo('paint',g,mat4(xs,y,0,0,0,.1));
      o.geo('brakeBar',rbox(.02,.02,.4,.008,2),mat4(xs-.14,y-.02,0))}}
  return o}

/* ---------------------------------------------------------------- assembly */
const FINISHES={solid:1,twotone:1,wood:1,mural:1};
const RIMGEO={stock:'stock',chrome:'stock',steel:'steel',alloy:'alloy',black:'alloy',gold:'alloy',spinner:'spinner',spinners:'spinner'};
const WP={};
/* all four wheels (tyre + rim + disc) in one geometry; the `wheel` attribute lets the shader spin and steer them */
function wheelPack(K,rims,lod){const S=K.S,key=K.type+'|'+rims+'|'+(lod||0);if(WP[key])return WP[key];const parts=[];
  const rk=rims==='stock'&&S.rimStyle?S.rimStyle:rims,mk='rim:'+rk;
  let W,rim;if(!lod){W=wheelGeos(S);rim=rimGeo(S.rimR,S.tw,rims==='stock'?(S.rimStyle||'stock'):RIMGEO[rims])}
  for(const ax of S.axles)for(const sg of[1,-1]){const zW=S.hwF(ax)-S.tw/2-.018,o=new Out(),pm=M4().makeTranslation(ax,S.wr,sg*zW).multiply(sg<0?M4().makeRotationY(Math.PI):M4());
    if(lod){const ty=new T.CylinderGeometry(S.wr,S.wr,S.tw,14,1,true);ty.rotateX(Math.PI/2);o.geo('tyre',ty,pm);const rf=new T.CircleGeometry(S.rimR,10);rf.translate(0,0,S.tw/2-.03);o.geo(mk,rf,pm);
      const sw=new T.RingGeometry(S.rimR,S.wr,14,1);sw.translate(0,0,S.tw/2);o.geo('tyre',sw,pm)}
    else{o.geo('tyre',W.tyre,pm);o.geo(mk,rim.rim,pm);if(rim.disc)o.geo('disc',rim.disc,pm);o.geo('disc',W.inner.disc,pm)}
    parts.push(packMulti(o,['tyre',mk,'disc'],{wheel:[ax,S.wr,sg*zW,ax===S.axles[0]?3:2]}))}
  return WP[key]=mergeGeos(parts)}
const UPC={};
function upgradeGeos(type,K,u){const key=type+JSON.stringify([u.roofRack||0,!!u.bullBar,u.lightBar||0,!!u.spoiler]);if(UPC[key])return UPC[key];
  const o=addUpgrades(type,K,u),b=o.build();
  return UPC[key]={paint:b.paint||null,multi:packMulti(o,Object.keys(o.b).filter(k=>k!=='paint'),{remap:u.lightBar==='amber'?{ledbar:'ledamber'}:null})}}

/* LOD1: coarse loft, glass/lamps as vertex colours, paint via uniform: 2 draw calls */
const KL={};
function kitLod(type){if(KL[type])return KL[type];const S=prep(TYPES[type]);
  const B=buildBody(S,{step:.2,coarse:1,archN:6,K:4,ring:[0,3,6,9,11,12,14,16,18,21,22,24,25,27,30]}),o=new Out(),cut=(v,P,c)=>cutHole(B,v,P,.08,c,.012);
  for(const t of B.tris)if(t.cls!=='under')t.cls='lodPaint';
  const{wins,ws,rg}=glazing(S);
  for(const w of wins)if(w)cut('side',w,'lodGlass');cut('front',ws,'lodGlass');if(rg.view==='rear')cut('rear',rg.poly,'lodGlass');
  if(S.barnDoors){const R=S.rearGlass;cut('rear',trap(R.y0,R.y1,R.hw0,R.hw1,.04),'lodGlass')}
  const HEAD=quad(S.head,.035),TAIL=quad(S.tail,.025);
  for(const P of[HEAD,mirrorA(HEAD)])cut('front',P,'head');for(const P of[TAIL,mirrorA(TAIL)])cut('rear',P,'tail');
  cut('front',trap(S.grille.y0,S.grille.y1,S.grille.hw0,S.grille.hw1,.035),'trim');cut('front',trap(S.intake.y0,S.intake.y1,S.intake.hw0,S.intake.hw1,.05),'trim');
  for(const t of B.tris)o.tri(t.cls,t.p[0],t.p[1],t.p[2],t.n[0],t.n[1],t.n[2]);
  return KL[type]={type,S,multi:packMulti(o,Object.keys(o.b))}}

function lightProxy(U,ch){return{get emissiveIntensity(){return U.uCh.value[ch]},set emissiveIntensity(v){U.uCh.value[ch]=v},isLightChannel:true}}
/* lod: 0 hero, 1 parked/traffic. Omitted: LOD1 when the call carries no upgrades (parked cars, traffic), hero otherwise. */
const autoLod=o=>o.lod!=null?+o.lod||0:(!o.upgrades||!Object.keys(o.upgrades).length?1:0);
function build(type,opts){shared();const lod=autoLod(opts),K=lod?null:kit(type),S=prep(TYPES[type]),u=Object.assign({rims:S.rimStyle||'stock',tint:.55},opts.upgrades||{});
  if(u.rims==='spinners')u.rims='spinner';if(!(u.rims in RIMGEO))u.rims='stock';
  const fin=typeof u.paint==='string'&&FINISHES[u.paint]?u.paint:'solid';
  const paintHex=(u.paint!=null&&!FINISHES[u.paint])?u.paint:(opts.color??PAINT[type]);
  const root=new T.Group(),body=new T.Group();body.name='bodyRoot';root.add(body);
  const mm=multiMat(),U=mm.userData.U;U.uPaint.value.copy(col(paintHex));
  let paint=null,paint2=null,glass=null;const own=[],mats=[mm];let tris=0,calls=0;
  const add=(g,m,parent,cast=true)=>{if(!g)return null;const mesh=new T.Mesh(g,m);mesh.castShadow=cast&&!m.transparent;mesh.receiveShadow=true;parent.add(mesh);tris+=g.attributes.position.count/3;calls++;return mesh};
  let wheelsMesh;
  if(lod){const KLd=kitLod(type);add(KLd.multi,mm,body);wheelsMesh=add(wheelPack({type,S},u.rims,1),mm,root)}
  else{
    paint=new T.MeshPhysicalMaterial({color:col(paintHex),metalness:.5,roughness:.36,clearcoat:1,clearcoatRoughness:.04,normalMap:MAT.flake,normalScale:new T.Vector2(.12,.12)});
    if(new T.Color(paintHex).getHSL({}).l>.75){paint.metalness=.12;paint.roughness=.3;paint.normalScale.set(.04,.04)}
    paint2=fin==='twotone'?new T.MeshPhysicalMaterial({color:col('#5a3a28'),metalness:.4,roughness:.38,clearcoat:1,clearcoatRoughness:.05,normalMap:MAT.flake,normalScale:new T.Vector2(.1,.1)}):paint;
    const tint=clamp(+u.tint||0,0,1);
    glass=new T.MeshPhysicalMaterial({color:col('#0b1014').lerp(col('#010203'),tint),roughness:.03,metalness:0,clearcoat:1,clearcoatRoughness:.02,transparent:true,opacity:lerp(.42,.93,tint),depthWrite:false,envMapIntensity:1.6,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});
    mats.push(paint,glass);if(paint2!==paint)mats.push(paint2);
    if(fin==='twotone'){add(K.paint,paint,body);add(K.paint2,paint2,body);add(K.fin.twotone,mm,body)}else add(K.paintAll,paint,body);
    if(fin==='wood')add(K.fin.wood,mm,body);if(fin==='mural')add(K.fin.mural,mm,body);
    add(K.multi,mm,body);const gm=add(K.glass,glass,body);if(gm)gm.renderOrder=2;
    const ug=upgradeGeos(type,K,u);add(ug.paint,paint,body);add(ug.multi,mm,body);
    wheelsMesh=add(wheelPack(K,u.rims,0),mm,root)}
  /* wheel/steer nodes keep the documented interface; the shader reads them every frame */
  const wheels=[],steer=[];for(const ax of S.axles)for(const sg of[1,-1]){const zW=S.hwF(ax)-S.tw/2-.018,piv=new T.Object3D();piv.position.set(ax,S.wr,sg*zW);root.add(piv);const spin=new T.Object3D();piv.add(spin);wheels.push(spin);if(ax===S.axles[0])steer.push(piv)}
  wheelsMesh.onBeforeRender=()=>{U.uSpin.value=wheels[0].rotation.z;U.uSteer.value=steer[0].rotation.y};
  const shg=new T.PlaneGeometry(S.L+.5,S.hwF(0)*2+.55);own.push(shg);const sh=new T.Mesh(shg,MAT.shadow);sh.rotation.x=-Math.PI/2;sh.position.y=.006;sh.renderOrder=1;
  Object.defineProperty(sh,'castShadow',{get:()=>false,set(){}});root.add(sh);calls++;tris+=2;
  const bb=new T.Box3().setFromObject(body);const hwMax=Math.max(S.hwF(S.axles[0]),S.hwF(0),S.hwF(S.axles[1]));
  const L=lightProxy;
  const ud={type,lod,size:{l:+(bb.max.x-bb.min.x).toFixed(3),w:+(hwMax*2).toFixed(3),h:+bb.max.y.toFixed(3)},len:+(bb.max.x-bb.min.x).toFixed(3),wid:+(hwMax*2).toFixed(3),
    wheels,steer,wheelRadius:S.wr,wheelBase:S.axles[0]-S.axles[1],
    lights:{head:[L(U,CH.head)],tail:[L(U,CH.tail)],brake:[L(U,CH.brake)],bar:u.lightBar?[L(U,CH.bar)]:[],drl:[L(U,CH.drl)],amber:[L(U,CH.amber)],reverse:[L(U,CH.rev)]},
    body:paint?[paint,paint2]:[],glass:glass?[glass]:[],material:mm,bodyRoot:body,parts:{body,glass,wheels,rear:null},contactShadow:sh,
    colliders:[{x0:bb.min.x,z0:-hwMax,x1:bb.max.x,z1:hwMax}],upgrades:u,color:paintHex,
    stats:{triangles:Math.round(tris),drawCalls:calls,tris:Math.round(tris),calls},_own:own,_mats:mats,
    _s:{roll:0,pitch:0,last:0,acc:0,head:false,flash:0,t:0},damage:0};
  return{root,ud}}

/* group.userData also carries setUpgrades(u), setColor(hex), setLights(on), flashBar(seconds), setDamage(0..1), dispose() */
function make(type='minivan',opts={}){if(!TYPES[type])type='minivan';opts=Object.assign({},opts);
  const{root,ud}=build(type,opts);root.name='vehicle_'+type;root.userData=ud;api(root,type,opts);applyLights(root,false);return root}
function api(root,type,opts){const ud=root.userData;
  ud.setUpgrades=(u={})=>{opts.upgrades=Object.assign({},u);const keep=ud._s,dmg=ud.damage,lamps=ud.lamps,cast=[];root.traverse(o=>{if(o.isMesh)cast.push(o.castShadow)});
    disposeOwn(ud);for(const c of root.children.slice())root.remove(c);
    const{root:nr,ud:nu}=build(type,opts);for(const c of nr.children.slice())root.add(c);nu._s=Object.assign(keep,{roll:0,pitch:0});
    const own={};for(const k in ud)if(!(k in nu)&&typeof ud[k]!=='function')own[k]=ud[k];/* keep flags the game set on userData (mod, fxAttach) */
    for(const k in ud)delete ud[k];Object.assign(ud,nu,own);api(root,type,opts);if(cast.some(Boolean))root.traverse(o=>{if(o.isMesh)o.castShadow=true});if(dmg)ud.setDamage(dmg);if(lamps)ud.setLamps(lamps);applyLights(root,false)};
  ud.setColor=hex=>{opts.color=hex;const u=ud.upgrades;if(u.paint!=null&&!FINISHES[u.paint])u.paint=hex;ud.color=hex;const c=col(hex);ud.material.userData.U.uPaint.value.copy(c);
    if(ud.body[0]){ud.body[0].color.copy(c);if(ud.body[1]!==ud.body[0]&&u.paint!=='twotone')ud.body[1].color.copy(c)}};
  ud.setLights=on=>{ud._s.head=!!on;applyLights(root,false)};
  ud.flashBar=t=>{ud._s.flash=t||0};
  /* broken lamps [frontA, frontB, rearA, rearB] (truthy = smashed; A/B = the two sides) and hazard blinkers */
  ud.setLamps=a=>{a=a||[];ud.lamps=[0,1,2,3].map(i=>a[i]?1:0);ud.material.userData.U.uLamp.value.set(a[0]?0:1,a[1]?0:1,a[2]?0:1,a[3]?0:1)};
  ud.setHazard=on=>{ud._s.haz=!!on;applyLights(root,false)};
  ud.setDamage=f=>{f=clamp(+f||0,0,1);ud.damage=f;for(const m of new Set(ud.body)){m.roughness=lerp(m.userData.r0??(m.userData.r0=m.roughness),.8,f);m.clearcoat=lerp(1,.15,f)}};
  ud.dispose=()=>{disposeOwn(ud)};}
function disposeOwn(ud){for(const g of ud._own||[])g.dispose();for(const m of ud._mats||[])if(m&&m.dispose)m.dispose()}
/* night (index.html setNight): headlights come on by themselves on cars being driven, and lamp channels are scaled
   against the darker night exposure so a lit lamp reads as bright as in daylight (1 / false = the daytime look) */
let NIGHT_AUTO=false,LAMP_GAIN=1;
function applyLights(v,braking){const d=v.userData,s=d._s,hl=!!s.head,c=d.material.userData.U.uCh.value,g=LAMP_GAIN;
  c[CH.head]=hl?3.2*g:0;c[CH.tail]=(hl?1.4:.08)*g;c[CH.brake]=(braking?5:(hl?1.2:.1))*g;c[CH.drl]=1.6*g;c[CH.amber]=(s.haz?(((s.t*1.45)%1)<.5?6:0):.25)*g;c[CH.rev]=s.rev?2.5*g:0;
  c[CH.bar]=d.lights.bar.length?(s.flash>0?(Math.sin(s.t*24)>0?6:.2):(hl?4:.3))*g:0}

function update(v,o={}){const d=v.userData;if(!d||!d.wheels)return;const dt=Math.min(.1,Math.max(0,o.dt??1/60)),sp=o.speed||0,st=clamp(o.steer||0,-1,1),s=d._s;
  const da=-sp*dt/d.wheelRadius;for(const w of d.wheels)w.rotation.z=(w.rotation.z+da)%(Math.PI*2);
  for(const p of d.steer)p.rotation.y+=(st*.55-p.rotation.y)*Math.min(1,dt*12||1);
  if(dt>0){const acc=clamp((sp-s.last)/dt,-15,15);s.last=sp;s.acc+=(acc-s.acc)*Math.min(1,dt*4);
    const rollT=clamp(st*sp*Math.abs(sp)*.00045,-.045,.045),pitchT=clamp(s.acc*.0045+(o.braking&&Math.abs(sp)>.5?-.022*Math.sign(sp):0),-.04,.035);
    s.roll+=(rollT-s.roll)*Math.min(1,dt*5);s.pitch+=(pitchT-s.pitch)*Math.min(1,dt*5);if(!d.lod){d.bodyRoot.rotation.x=s.roll;d.bodyRoot.rotation.z=s.pitch}}
  if(o.headlights!=null)s.head=!!o.headlights||(NIGHT_AUTO&&o.auto!==false);s.rev=sp<-.3;s.t+=dt;if(s.flash>0)s.flash=Math.max(0,s.flash-dt);applyLights(v,!!o.braking);
  const U=d.material.userData.U;U.uSpin.value=d.wheels[0].rotation.z;U.uSteer.value=d.steer[0].rotation.y}

const stats=v=>{const d=v.userData;if(d&&d.stats)return d.stats;let t=0,c=0;v.traverse(o=>{if(o.isMesh){c++;t+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3}});return{triangles:t,drawCalls:c,tris:t,calls:c}};
HT.Vehicles={_kit:t=>kit(t),init(o={}){ASSETS=o.assets||null;return this},make,update,
  /* night(auto, gain): auto = driven cars switch their headlights on (update() with auto:false opts out); gain scales the lamp channels */
  night(auto,gain){NIGHT_AUTO=!!auto;LAMP_GAIN=gain>0?gain:1},types:Object.keys(TYPES),TYPES:Object.keys(TYPES),stats,
  /* pre-build the cached geometry for some or all types (spreads the one-off cost); lod 1 = traffic/parked */
  warm(types=Object.keys(TYPES),lod=0){shared();atlas();for(const t of types)lod?kitLod(t):kit(t)}};
})();
