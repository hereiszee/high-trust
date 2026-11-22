module.exports={w:1920,h:1080,hud:true,frame:'__ht.draw()',settle:6,run:`
T_.game();const H=__ht;if(H.mode!=='hub')H.enterHub();H.step(3);
for(let i=0;i<40&&!H.enterHome();i++){await new Promise(r=>setTimeout(r,500));H.step(1)}
for(let i=0;i<60&&H.mode!=='home';i++)await new Promise(r=>setTimeout(r,500));
H.step(20);return {mode:H.mode}`};
