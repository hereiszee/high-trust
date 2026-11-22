module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:5,run:`
T_.game();const H=__ht;H.enterHub();H.step(5);const P=H.P;P.fp=false;
P.pos.set(27,0,18.6);P.yaw=-Math.PI/2+0.25;P.pitch=-.1;for(let i=0;i<30;i++)H.step(1);
const f=[-Math.sin(P.yaw),-Math.cos(P.yaw)],r=[Math.cos(P.yaw),-Math.sin(P.yaw)];
H.allies.forEach((a,i)=>{const o=(i-(H.allies.length-1)/2)*1.6,d=8+(i%2)*1.5;a.pos.set(P.pos.x+f[0]*d+r[0]*o,0,P.pos.z+f[1]*d+r[1]*o)});
for(let i=0;i<34;i++)H.step(1);P.yaw=-Math.PI/2+0.25;return H.allies.map(a=>[a.pos.x.toFixed(1),a.pos.z.toFixed(1)])`};
