module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:6,run:`
T_.game();const H=__ht;H.enterHub();H.step(5);const V=H.VAN;
H.P.pos.set(V.pos.x+1.5,0,V.pos.z);H.enterVehicle(V);H.step(3);H.keys.w=true;for(let i=0;i<150;i++)H.step(1);H.keys.w=false;for(let i=0;i<8;i++)H.step(1);
return {cv:!!H.CV,spd:H.CV&&H.CV.spd,cars:H.vehicles.length}`};
