/* ascii map of Riverside x300-460 z0-140 with parked cars (C) and colliders standing on drivable tiles (#) */
const {startTow}=require('./lib.js');
(async()=>{const {b,p,ev,r}=await startTow();
  const out=await ev(()=>{const H=window.__ht,L=H.L,M=H.M,g=L.g,tile=(x,z)=>(g[Math.floor(z/2)]||[])[Math.floor(x/2)]||' ';const R=v=>Math.round(v*10)/10;
    const X0=296,X1=470,Z0=0,Z1=162;const rows=[];for(let z=Z0;z<Z1;z+=2){const row=[];for(let x=X0;x<X1;x+=2)row.push(tile(x+1,z+1));rows.push(row)}
    const cars=(L.cars||[]).filter(e=>e.obj&&e.pos.x>X0&&e.pos.x<X1&&e.pos.z>Z0&&e.pos.z<Z1);
    const onRoad=[];for(const c of L.colliders){if(c.x0<-1e3)continue;const cx=(c.x0+c.x1)/2,cz=(c.z0+c.z1)/2;if(cx<X0||cx>X1||cz<Z0||cz>Z1)continue;const isCar=cars.some(e=>e.col===c)||M.cars.some(e=>e.col===c);
      const t=tile(cx,cz);if(',=VlD'.includes(t)||isCar){for(let z=Math.floor(c.z0/2)*2;z<c.z1;z+=2)for(let x=Math.floor(c.x0/2)*2;x<c.x1;x+=2){const i=(x-X0)/2,j=(z-Z0)/2;if(rows[j]&&rows[j][i]!=null)rows[j][i]=isCar?'C':'#'}
        if(!isCar)onRoad.push([R(c.x0),R(c.z0),R(c.x1),R(c.z1),c.k||'',t])}}
    for(const ow of M.owners){const i=Math.floor((ow.curb.x-X0)/2),j=Math.floor((ow.curb.z-Z0)/2);if(rows[j])rows[j][i]='@'}
    return{map:rows.map((r,j)=>String(Z0+j*2).padStart(3)+' '+r.join('')),hdr:'    '+Array.from({length:(X1-X0)/2},(_,i)=>((X0+i*2)%20===0?'|':' ')).join(''),cars:cars.map(e=>[e.owner,e.type,R(e.pos.x),R(e.pos.z),R(e.yaw),R(e.col.x0),R(e.col.z0),R(e.col.x1),R(e.col.z1)]),onRoad}});
  console.log(out.hdr);console.log(out.map.join('\n'));console.log('cars',JSON.stringify(out.cars));console.log('onRoad',JSON.stringify(out.onRoad));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
