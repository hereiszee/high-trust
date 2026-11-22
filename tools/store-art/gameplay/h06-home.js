module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:5,run:`
const H=__ht;try{H.HUD.minimap.closeMap()}catch(e){}T_.game();H.prog.trust=12;H.prog.trustR=0;if(H.mode!=='hub')H.enterHub();H.step(3);
for(let i=0;i<40&&!H.enterHome();i++){await new Promise(r=>setTimeout(r,500));H.step(1)}
for(let i=0;i<60&&H.mode!=='home';i++)await new Promise(r=>setTimeout(r,500));
H.step(10);H.P.pos.set(1.9,0,6.3);H.P.yaw=0;H.P.pitch=-.15;H.step(25);return {mode:H.mode}`};
