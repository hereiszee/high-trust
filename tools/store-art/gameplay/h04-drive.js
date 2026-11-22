module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:5,run:`
T_.game();const H=__ht;H.enterHub();H.step(5);const V=H.VAN;
H.P.pos.set(V.pos.x+1.5,0,V.pos.z);H.enterVehicle(V);H.step(3);
const t=H.ow.trafficCars?H.ow.trafficCars():[];
H.keys.w=true;for(let i=0;i<260;i++){H.step(1)}H.keys.w=false;for(let i=0;i<6;i++)H.step(1);
const c=H.CV;const near=(t||[]).filter(x=>x&&x.pos&&Math.hypot(x.pos.x-c.pos.x,x.pos.z-c.pos.z)<40).length;
return {spd:c.spd,pos:[c.pos.x,c.pos.z],near,n:(t||[]).length}`};
