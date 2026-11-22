module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:6,run:`
T_.game();const H=__ht;H.enterHub();H.step(5);
const P=H.P;P.fp=false;P.pos.set(24,0,21.5);P.yaw=-Math.PI/2;H.keys.w=true;for(let i=0;i<120;i++)H.step(1);H.keys.w=false;for(let i=0;i<40;i++)H.step(1);
P.yaw=-Math.PI/2-0.5;P.pitch=-.05;for(let i=0;i<10;i++)H.step(1);return T_.info()`};
