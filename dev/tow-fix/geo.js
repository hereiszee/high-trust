/* dump the lot's colliders and the parked cars along each delivery route (no driving) */
const {startTow}=require('./lib.js');
(async()=>{const {b,p,ev,r,errs}=await startTow();console.log('start',JSON.stringify(r));
  const out=await ev(()=>{const H=window.__ht,a=H.jobs.api,L=H.L,M=H.M,G=H.ow.roads();const R=v=>Math.round(v*100)/100;
    const box=(x0,z0,x1,z1)=>L.colliders.filter(c=>c.x1>x0&&c.x0<x1&&c.z1>z0&&c.z0<z1&&c.x0>-1e3).map(c=>[R(c.x0),R(c.z0),R(c.x1),R(c.z1),c.h||'',c.ob?'ob':'',c.k||'',(L.cars||[]).some(e=>e.col===c)?'CAR':'']);
    const lot=box(296,112,336,166);
    const g=L.g,tile=(x,z)=>(g[Math.floor(z/2)]||[])[Math.floor(x/2)];
    const map=[];for(let z=100;z<170;z+=2){let s='';for(let x=290;x<340;x+=2)s+=tile(x,z)||' ';map.push(z+' '+s)}
    const cars=M.cars.map(e=>({o:e.o.id,x:R(e.pos.x),z:R(e.pos.z),yaw:R(e.yaw),S:a.carSize(e)}));
    const van=H.CV?{type:H.CV.type,x:R(H.CV.pos.x),z:R(H.CV.pos.z),S:a.carSize(H.CV),stats:{len:H.CV.car.stats.len,wid:H.CV.car.stats.wid,turn:H.CV.car.stats.turn}}:null;
    const parked=(L.cars||[]).filter(e=>e.owner==='neighbour'&&e.obj);
    const routes=M.owners.map(ow=>{const rt=G.route({x:322,z:127},{x:ow.curb.x,z:ow.curb.z});const pts=rt?rt.points:[];let len=0;for(let i=1;i<pts.length;i++)len+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z);
      const near=[];for(const e of parked){let bd=1e9,lat=0;for(let i=1;i<pts.length;i++){const A=pts[i-1],B=pts[i],dx=B.x-A.x,dz=B.z-A.z,l2=dx*dx+dz*dz||1,t=Math.max(0,Math.min(1,((e.pos.x-A.x)*dx+(e.pos.z-A.z)*dz)/l2)),px=A.x+dx*t,pz=A.z+dz*t,d=Math.hypot(e.pos.x-px,e.pos.z-pz);if(d<bd){bd=d;lat=((e.pos.x-A.x)*dz-(e.pos.z-A.z)*dx)/Math.sqrt(l2)}}
        if(bd<6){/* carriageway across at the car: count drivable tiles perpendicular to the car's long axis */const ax=Math.abs(Math.cos(e.yaw))>.5;let w='';for(let k=-5;k<=5;k++)w+=ax?tile(e.pos.x,e.pos.z+k*2):tile(e.pos.x+k*2,e.pos.z);near.push({x:R(e.pos.x),z:R(e.pos.z),d:R(bd),lat:R(lat),col:[R(e.col.x0),R(e.col.z0),R(e.col.x1),R(e.col.z1)],across:w})}}
      return{o:ow.o.id,curb:{x:R(ow.curb.x),z:R(ow.curb.z),yaw:R(ow.curb.yaw)},len:Math.round(len),pts:pts.map(q=>[R(q.x),R(q.z)]),near}});
    return{lot,map,cars,van,routes,gate:M.gate&&M.gate.col}});
  console.log(JSON.stringify(out,null,0).replace(/\],\[/g,'],\n['));console.log(errs.join('\n'));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
