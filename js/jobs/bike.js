/* =====================================================================
   CHAIN REACTION (SPEC3 2.16): rescue and trace. Tyler's strand. Tyler's bike was taken off the school rack. Follow the clue chain:
   the rack -> the neighbours' doors and the laptop's Neighbourly Resale tab (any order) -> the meet at Ramos Corner Mart -> Dez, fourteen,
   on Tyler's bike, bolts -> a chase on foot, on Earl's loaner bike or in the van (the yards and back lanes don't fit a minivan) ->
   talk him down (never a grab, never a gun: he's a kid) -> the lock-up garage on 5th St where Vic pays kids ten bucks a bike
   (the only fight in the job, adults only) -> tag every stolen bike with its owner -> Tyler's bike home to Tyler.

   Stages ([CP]): rack, leads, meet, chase, garage, bikes, home. No hard fail before the garage: losing Dez falls back to following the
   brrrr of the spoke card to the garage. In the garage: the usual combat downs.
   Trust twist: Dez is never zip-tied. Caught and talked down, he ends up working at Earl's bike library (+5 Riverside trust, households +1,
   his family's porch gets flower boxes). Vic zip-tied: +4. Every returned bike puts one back on a porch or the school rack for good.
   Owner decisions: Tyler stays home (on the porch, on the phone); no guns drawn within 25 m of Tyler or Dez (M.noGuns live);
   the adults at the garage are the only people anybody points anything at.
   Files: js/jobs/bike.js, js/jobs/_runner.js (HT.Runner: the bike model, rider IK, the fleeing runner, the rideable bike),
   js/save.js (the laptop's Resale tab, HT.Resale). Tests: node dev/jobs-check.js bike --retry --replay --shots, node dev/jobs/bike.js.
   ===================================================================== */
(function(){'use strict';const J=window.HT&&HT.Jobs;if(!J)return;const A=()=>J.api;
(function(){const d=typeof document!=='undefined'?document:null;if(!d||!d.head||!d.createElement)return;
  if(!(window.HT.Social&&HT.Social.view)&&!d.getElementById('ht-social-js')){const s=d.createElement('script');s.id='ht-social-js';s.src='js/social.js';d.head.appendChild(s)}
  if(!d.getElementById('ht-social-css')){const l=d.createElement('link');l.id='ht-social-css';l.rel='stylesheet';l.href='css/social.css';d.head.appendChild(l)}})();
const S_=()=>window.HT&&HT.Social,RN=()=>window.HT&&HT.Runner,PP=()=>window.HT&&HT.People,RS=()=>window.HT&&HT.Resale;
const AU=()=>{const a=window.HT&&HT.Audio;return a&&a.ready?a:null};
const clamp=(v,a,b)=>v<a?a:v>b?b:v,pick=a=>a[Math.floor(Math.random()*a.length)];
const hyp=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/* ---------------- tuning ---------------- */
const TUNE={clueR:1.8,doorR:2.6,appear:16,spotFoot:8.5,spotWary:13,spotCar:22,lostD:72,lostT:7,farD:115,catchD:3.4,carNear:4.2,wrongBike:20,wrongOwner:10,slowTalk:12,
  dezClear:30,famClear:25,drain:1};
const KEYS=['son','nb_kid','nb_lucia','nb_pops','nb_sweater'];
const COL={you:'#6fb8ff',tyler:'#ffcf5a',linda:'#f39ac0',phil:'#9fe58a',walt:'#c9b48a',dez:'#ff9a5c',vic:'#ff6b5b',earl:'#7fc8ff'};
const CAST={you:{name:'You',color:COL.you,voice:{kind:'dad',pitch:1}},tyler:{name:'Tyler',color:COL.tyler,voice:{kind:'kid',pitch:1.25,vol:.3}},
  linda:{name:'Linda',color:COL.linda,voice:{kind:'dad',pitch:1.5,vol:.28}},phil:{name:'Phil',color:COL.phil,voice:{kind:'dad',pitch:.92,vol:.3}},
  walt:{name:'Walt',color:COL.walt,voice:{kind:'dad',pitch:.8,vol:.3}},dez:{name:'Dez',color:COL.dez,voice:{kind:'kid',pitch:.9,vol:.3}},
  vic:{name:'Vic',color:COL.vic,voice:{kind:'thug',pitch:1,vol:.3}},earl:{name:'Earl',color:COL.earl,voice:{kind:'dad',pitch:.85,vol:.3}}};
(function roles(){const p=PP();if(p&&p.roles){Object.assign(p.roles,{tyler:'son',dez:'nb_kid',linda:'nb_lucia',phil:'nb_pops',walt:'nb_sweater'})}})();
function preload(){const p=PP();if(p&&p.ok&&p.preload)return p.preload(KEYS.filter(k=>!p.has(k))).catch(()=>{});return Promise.resolve()}
const has=k=>{const p=PP();return!!(p&&p.ok&&p.has&&p.has(k))};
function person(key,o){const p=PP();let d=null;try{if(p&&p.ok&&has(key))d=p.make(key,o||{})}catch(e){d=null}if(d)A().wmAdd(d.root);return d}

/* ---------------- the places (metres, from the world: computed once per world) ---------------- */
let PL=null;
function places(){const a=A(),W=a&&a.WORLD;if(!W)return null;if(PL&&PL.W===W)return PL;
  const sch=W.sites.school,rack=sch.rack,home=W.houses.find(h=>h.home)||W.houses[0];
  const porch=h=>{const s=h.face==='s'?1:-1,z=s>0?(h.z1+1)*2+1.2:h.z0*2-1.2;return{x:h.cx,z,face:s,yaw:s>0?0:Math.PI}};
  const hp=porch(home);
  const nb=W.houses.filter(h=>!h.home&&h.face).map(h=>Object.assign(porch(h),{h,d:Math.hypot(h.cx-rack.x,h.cz-rack.z)})).filter(p=>p.d<45&&p.z>-1).sort((p,q)=>p.d-q.d).slice(0,3);
  const mart=W.buildings.find(b=>b.id==='mart')||{x0:182,z0:16,x1:186,z1:18};const mf=(mart.z1+1)*2;
  const gar={x0:448,z0:104,x1:454,z1:112};
  PL={W,school:sch,rack,ring:sch.ring,home:hp,tyler:{x:hp.x+4.2,z:hp.z-.4*hp.face*-1,yaw:hp.yaw},laptop:{x:hp.x+4.2,z:hp.z},
    nb:nb.map((p,k)=>Object.assign(p,{id:['linda','phil','walt'][k],talk:{x:p.x+.2,z:p.z+p.face*1.9}})),
    mart:{x:(mart.x0+mart.x1+1),z:mf,door:{x:(mart.x0+mart.x1+1),z:mf+.4}},meet:{x:(mart.x1+1)*2+3.2,z:mf+1.2},loaner:{x:mart.x0*2-1.4,z:mf+.9,yaw:Math.PI/2},
    van:{x:(mart.x0+mart.x1+1)-2,z:mf+5.2},
    garage:Object.assign(gar,{door:{x:gar.x0,z:(gar.z0+gar.z1)/2},front:{x:gar.x0-3.2,z:(gar.z0+gar.z1)/2},inside:{x:gar.x0+3.2,z:(gar.z0+gar.z1)/2}}),
    earl:W.places.g_earl,win:{x0:152,z0:1,x1:230,z1:78}};
  return PL}

/* ---------------- clue board (a corkboard card on the right; every clue says where it points) ---------------- */
const CLUES={
  lock:{t:'Cut cable lock',d:'Cut clean through. Eight-year-olds don\'t carry bolt cutters.',to:'An adult with bolt cutters'},
  wrapper:{t:'Choco-Lumps wrapper',d:'Ramos Corner Mart price sticker. Nobody on Oak St shops there.',to:'Ramos Corner Mart, Riverside'},
  tracks:{t:'Fat double tyre tracks',d:'A cargo bike, loaded heavy, rolled off the pad.',to:'Ask the neighbours (the glowing doors)'},
  linda:{t:'Linda saw a cargo bike',d:'Blue tarp over a pile of bikes. The red one had a dinosaur sticker.',dLite:'Blue tarp over a pile of bikes. "Suspicious tarp."',to:'Tyler\'s bike: dinosaur sticker'},
  phil:{t:'Phil\'s doorbell camera',d:'Tue 3:12 pm. Tyler\'s bike on the cargo bike: streamers, a dent in the front fender. The cargo bike says bikez4cheap.',dLite:'Tue 3:12 pm. Tyler\'s bike on the cargo bike: streamers, a dent in the front fender.',to:'Tyler\'s bike: the dented fender'},
  walt:{t:'Walt\'s tip',d:'Everybody\'s selling bikes on Neighbourly Resale this week.',to:'The laptop: Tyler has it on our porch'},
  listing:{t:'The listing',d:'"RED BIKE. FAST. CARD IN SPOKES NOT INCLUDED." Seller: bikez4cheap.',to:'The meet: Ramos Corner Mart'},
  dez:{t:'Dez (14)',d:'Sells them for a guy who pays ten bucks a bike. "I\'m saving for a car."',to:'The lock-up garage on 5th St'},
  owners:{t:'Earl\'s missing-bike list',d:'Folks have been calling the library all week.',to:'Tag each bike in the garage'}};
let CSS=false;
function css(){if(CSS||typeof document==='undefined')return;CSS=true;const s=document.createElement('style');s.textContent=`
.bk-wrap{position:fixed;inset:0;pointer-events:none;z-index:4;font-family:var(--ht-ui,'Barlow',system-ui,sans-serif)}
.bk-board{position:absolute;right:14px;top:150px;width:262px;max-height:calc(100vh - 330px);overflow:hidden;padding:10px 10px 8px;border-radius:10px;
  background:linear-gradient(160deg,#b98b5c,#a57849);box-shadow:0 6px 18px rgba(0,0,0,.45),inset 0 0 0 3px #7a5432;color:#2a1d10;transition:opacity .3s,transform .3s}
.bk-board.min{opacity:.0;transform:translateX(30px)}
.bk-board h4{margin:0 0 6px;font:800 13px/1 'Barlow Condensed',Arial Narrow,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#fdf6e6;text-shadow:0 1px 0 rgba(0,0,0,.4);display:flex;justify-content:space-between}
.bk-board h4 small{font-weight:700;letter-spacing:.06em}
.bk-c{position:relative;margin:0 0 6px 10px;padding:5px 7px 5px 9px;background:#fbf6e9;border-radius:2px;box-shadow:0 2px 3px rgba(0,0,0,.3);font-size:11.5px;line-height:1.28;transform:rotate(var(--r,0deg))}
.bk-c:before{content:'';position:absolute;left:-12px;top:9px;width:8px;height:8px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff7b6b,#b8261b);box-shadow:0 1px 2px rgba(0,0,0,.5)}
.bk-c:after{content:'';position:absolute;left:-8px;top:15px;width:2px;height:calc(100% + 2px);background:#c0261d;opacity:.75}
.bk-c:last-child:after{display:none}
.bk-c b{display:block;font-size:12px}.bk-c i{display:block;font-style:normal;color:#9b2a1f;font-weight:700}.bk-c i:before{content:'→ '}
.bk-c.new{animation:bkpop .6s ease-out}.bk-c.q{background:#efe6cf;color:#8a7a5c}.bk-c.hero{background:#fff3c7}
@keyframes bkpop{0%{transform:scale(1.25) rotate(-3deg);background:#fff59d}100%{transform:scale(1) rotate(var(--r,0deg))}}
.bk-card{position:absolute;left:50%;top:92px;transform:translateX(-50%) translateY(-8px);width:min(420px,86vw);background:#fbf6e9;color:#2a1d10;border-radius:6px;padding:10px 12px 12px;
  box-shadow:0 10px 30px rgba(0,0,0,.55);opacity:0;transition:opacity .25s,transform .25s}
.bk-card.on{opacity:1;transform:translateX(-50%) translateY(0)}.bk-card canvas{width:100%;border-radius:4px;display:block;margin:0 0 8px}
.bk-card .k{font:800 11px/1 'Barlow Condensed',Arial Narrow,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#9b2a1f}.bk-card h3{margin:4px 0 4px;font:800 20px/1.1 'Barlow Condensed',Arial Narrow,sans-serif}
.bk-card p{margin:0;font-size:13px;line-height:1.35}.bk-card .to{margin-top:6px;font-weight:800;color:#9b2a1f}.bk-card .to:before{content:'→ '}.bk-card .x{margin-top:6px;font-size:11px;opacity:.6}
@media (max-width:700px){.bk-board{top:auto;bottom:150px;right:8px;width:200px;max-height:34vh}.bk-board .bk-c{font-size:10.5px}}`;document.head.appendChild(s)}
function boardMount(M){const a=A();css();if(M.ui)return M.ui;const w=document.createElement('div');w.className='bk-wrap';w.innerHTML='<div class="bk-board"><h4>Tyler\'s bike <small></small></h4><div class="bk-list"></div></div><div class="bk-card"></div>';
  try{a.overlay('bike',w)}catch(e){document.body.appendChild(w)}M.ui={w,board:w.querySelector('.bk-board'),list:w.querySelector('.bk-list'),n:w.querySelector('.bk-board small'),card:w.querySelector('.bk-card'),cardT:0,shown:''};boardPaint(M);return M.ui}
function boardKill(M){if(!M||!M.ui)return;const a=A();try{a.overlay('bike',null)}catch(e){}try{if(M.ui.w.parentNode)M.ui.w.parentNode.removeChild(M.ui.w)}catch(e){}M.ui=null}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function boardPaint(M,fresh){const u=M.ui;if(!u)return;const ids=M.found;const total=['lock','wrapper','tracks','linda','phil','walt','listing'];
  let h='<div class="bk-c hero" style="--r:-1deg"><b>Red · 20-inch · streamers</b>Ace of spades in the spokes. "It goes brrrrrr."<i>'+(M.stage==='home'?'Tyler, on the porch':'Find it')+'</i></div>';
  ids.forEach((id,k)=>{const c=CLUES[id];if(!c)return;const lite=M.lite&&M.lite[id];h+='<div class="bk-c'+(id===fresh?' new':'')+'" style="--r:'+((k*37%5)-2)*.6+'deg"><b>'+esc(c.t)+'</b>'+esc(lite&&c.dLite?c.dLite:c.d)+'<i>'+esc(c.to)+'</i></div>'});
  const left=total.filter(t=>!ids.includes(t)).length;if(left&&M.stage!=='chase')h+='<div class="bk-c q"><b>'+left+' more to find</b>'+esc(nextHint(M))+'</div>';
  u.list.innerHTML=h;u.n.textContent=ids.filter(i=>total.includes(i)).length+'/'+total.length;
  /* keep the newest at the bottom in view */const L=u.list;if(L.scrollHeight>L.clientHeight)L.scrollTop=L.scrollHeight}
function nextHint(M){if(M.stage==='rack')return'Glowing spots at the bike rack (E).';if(M.stage==='leads'){const n=M.nbDone();return n<3?'Knock on the glowing doors (E) · or the laptop on our porch.':'The laptop on our porch.'}return'Ramos Corner Mart.'}
function clueAdd(M,id,lite){if(M.found.includes(id))return false;M.found.push(id);if(lite)(M.lite||(M.lite={}))[id]=true;boardPaint(M,id);M.boardT=8;
  const Au=AU();if(Au)try{Au.ui('pickup')}catch(e){}A().feed('Clue: '+CLUES[id].t,'info','→ '+CLUES[id].to);return true}
function cardShow(M,id,draw,o){const u=boardMount(M),c=CLUES[id]||{};o=o||{};u.card.innerHTML='<div class="k">'+esc(o.kicker||'Clue')+'</div>'+(draw?'<canvas width="400" height="200"></canvas>':'')+'<h3>'+esc(o.title||c.t||'')+'</h3><p>'+esc(o.text||c.d||'')+'</p><div class="to">'+esc(o.to||c.to||'')+'</div>';
  if(draw){const cv=u.card.querySelector('canvas');try{draw(cv.getContext('2d'),400,200)}catch(e){}}u.card.classList.add('on');u.cardT=o.t||5.5}

/* ---------------- 2D drawings: the clues, the doorbell still, the listing photos ---------------- */
function bike2D(g,x,y,s,o){o=o||{};const R=24*s,wb=62*s;g.save();g.translate(x,y);g.lineCap='round';g.lineJoin='round';
  const wr={x:-wb/2,y:-R},wf={x:wb/2,y:-R},bb={x:-4*s,y:-R+4*s},seat={x:-14*s,y:-R-34*s},head={x:wb/2-10*s,y:-R-34*s};
  for(const w of[wr,wf]){g.strokeStyle='#1d1e21';g.lineWidth=5*s;g.beginPath();g.arc(w.x,w.y,R-2.5*s,0,6.3);g.stroke();g.strokeStyle='#c7ccd1';g.lineWidth=1.4*s;g.beginPath();g.arc(w.x,w.y,R-6*s,0,6.3);g.stroke();
    g.lineWidth=.6*s;for(let i=0;i<14;i++){const a=i/14*6.283;g.beginPath();g.moveTo(w.x,w.y);g.lineTo(w.x+Math.cos(a)*(R-6*s),w.y+Math.sin(a)*(R-6*s));g.stroke()}}
  if(o.card){g.fillStyle='#fbfaf5';g.save();g.translate(wr.x+10*s,wr.y-8*s);g.rotate(-.7);g.fillRect(-4*s,-6*s,8*s,12*s);g.fillStyle='#111';g.font=(7*s)+'px Georgia';g.fillText('♠',-3*s,3*s);g.restore()}
  g.strokeStyle=o.col||'#c8202a';g.lineWidth=4.2*s;g.beginPath();g.moveTo(wr.x,wr.y);g.lineTo(bb.x,bb.y);g.lineTo(seat.x,seat.y);g.lineTo(wr.x,wr.y);g.moveTo(bb.x,bb.y);g.lineTo(head.x,head.y+8*s);g.lineTo(seat.x+2*s,seat.y+3*s);
  g.moveTo(head.x,head.y);g.lineTo(wf.x,wf.y);g.stroke();
  if(o.fender!==false){g.strokeStyle=o.col||'#c8202a';g.lineWidth=3*s;g.beginPath();g.arc(wf.x,wf.y,R+3*s,Math.PI*1.12,Math.PI*1.82);g.stroke();
    if(o.dent){g.strokeStyle='#6b2a24';g.lineWidth=3.4*s;g.beginPath();g.arc(wf.x,wf.y,R+1.2*s,Math.PI*1.38,Math.PI*1.52);g.stroke()}
    g.strokeStyle=o.col||'#c8202a';g.lineWidth=3*s;g.beginPath();g.arc(wr.x,wr.y,R+3*s,Math.PI*1.2,Math.PI*1.75);g.stroke()}
  if(o.sticker){const sx=(bb.x+head.x)/2+2*s,sy=(bb.y+head.y)/2+6*s;g.fillStyle='#fff';g.beginPath();g.ellipse(sx,sy,6*s,4.5*s,-.5,0,6.3);g.fill();g.fillStyle=o.sticker==='dino'?'#3fa34d':'#d78bf0';
    g.beginPath();g.ellipse(sx,sy,4*s,2.8*s,-.5,0,6.3);g.fill();if(o.sticker==='dino'){g.fillRect(sx+2*s,sy-5*s,2*s,3*s)}else{g.fillStyle='#ffe066';g.fillRect(sx+1*s,sy-6*s,1.2*s,3.5*s)}}
  g.strokeStyle='#202226';g.lineWidth=2*s;g.beginPath();g.moveTo(seat.x,seat.y);g.lineTo(seat.x-2*s,seat.y-6*s);g.stroke();g.fillStyle=o.saddle||'#1d1f22';g.beginPath();g.ellipse(seat.x-1*s,seat.y-7*s,9*s,3*s,0,0,6.3);g.fill();
  g.strokeStyle='#c9ced3';g.lineWidth=2.2*s;g.beginPath();g.moveTo(head.x,head.y);g.lineTo(head.x-2*s,head.y-8*s);g.lineTo(head.x-10*s,head.y-10*s);g.stroke();g.fillStyle=o.grips||'#efe9dc';g.fillRect(head.x-14*s,head.y-12*s,6*s,3.5*s);
  if(o.streamers){o.streamers.forEach((c,i)=>{g.strokeStyle=c;g.lineWidth=1.4*s;g.beginPath();g.moveTo(head.x-14*s,head.y-10*s);g.quadraticCurveTo(head.x-24*s,head.y-6*s+i*3*s,head.x-30*s,head.y+2*s+i*4*s);g.stroke()})}
  if(o.bell){g.fillStyle='#d8dde2';g.beginPath();g.arc(head.x-6*s,head.y-12*s,3*s,Math.PI,0);g.fill()}
  g.strokeStyle='#9aa0a6';g.lineWidth=2*s;g.beginPath();g.moveTo(bb.x,bb.y);g.lineTo(bb.x+6*s,bb.y+9*s);g.stroke();g.fillStyle='#1b1c1f';g.fillRect(bb.x+3*s,bb.y+8*s,8*s,2.5*s);
  g.restore()}
function photoBg(g,w,h,kind){const gr=g.createLinearGradient(0,0,0,h);if(kind==='garage'){gr.addColorStop(0,'#cfc6b6');gr.addColorStop(.62,'#b4aa98');gr.addColorStop(.63,'#8f877a');gr.addColorStop(1,'#6e675e')}
  else{gr.addColorStop(0,'#cfe3f2');gr.addColorStop(.5,'#b9d4a0');gr.addColorStop(.52,'#8fae6a');gr.addColorStop(1,'#6d8a4f')}g.fillStyle=gr;g.fillRect(0,0,w,h);
  if(kind!=='garage'){g.fillStyle='#e9e3d6';g.fillRect(0,h*.78,w,h*.22);g.fillStyle='rgba(0,0,0,.06)';for(let i=0;i<8;i++)g.fillRect(i*w/8,h*.78,2,h*.22)}else{g.fillStyle='rgba(0,0,0,.08)';for(let i=0;i<10;i++)g.fillRect(i*w/10,0,3,h*.62)}}
const TYLER={col:'#c8202a',streamers:['#e23b3b','#f4f1ea','#2f5fc4'],dent:true,sticker:'dino',card:false};
function drawListing(look,bgk){return(g,w,h)=>{photoBg(g,w,h,bgk);g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(w*.52,h*.86,w*.32,h*.05,0,0,6.3);g.fill();bike2D(g,w*.52,h*.86,look.big?2.1:1.9,look)}}
function drawDoorbell(g,w,h){g.fillStyle='#1a1d22';g.fillRect(0,0,w,h);g.save();g.beginPath();g.ellipse(w/2,h/2,w*.62,h*.66,0,0,6.3);g.clip();
  const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#9fb3c0');gr.addColorStop(.45,'#8a9a8a');gr.addColorStop(.46,'#5f6b5a');gr.addColorStop(1,'#4c5547');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='#6b6f73';g.fillRect(0,h*.62,w,h*.2);/* the cargo bike: a long box, a man, a blue tarp, Tyler's bike on top */
  g.fillStyle='#2b3a4a';g.fillRect(w*.32,h*.52,w*.26,h*.14);g.fillStyle='#3a62b0';g.beginPath();g.moveTo(w*.3,h*.53);g.quadraticCurveTo(w*.45,h*.36,w*.6,h*.53);g.fill();
  g.strokeStyle='#111';g.lineWidth=3;for(const x of[w*.36,w*.7]){g.beginPath();g.arc(x,h*.7,h*.07,0,6.3);g.stroke()}g.beginPath();g.moveTo(w*.58,h*.6);g.lineTo(w*.7,h*.7);g.stroke();
  g.fillStyle='#333';g.fillRect(w*.64,h*.36,w*.05,h*.2);g.beginPath();g.arc(w*.665,h*.33,h*.04,0,6.3);g.fill();
  g.save();g.translate(w*.45,h*.44);g.rotate(-.18);bike2D(g,0,0,1.0,TYLER);g.restore();
  g.fillStyle='#e8e8e8';g.font='bold 11px monospace';g.fillText('bikez4cheap',w*.335,h*.62);g.restore();
  g.fillStyle='rgba(255,255,255,.9)';g.font='bold 13px monospace';g.fillText('FRONT DOOR · TUE 3:12 PM',10,18);g.fillStyle='#e33';g.beginPath();g.arc(w-16,13,5,0,6.3);g.fill();
  g.strokeStyle='#ffd23f';g.lineWidth=2;g.setLineDash([5,4]);g.strokeRect(w*.36,h*.3,w*.2,h*.26);g.setLineDash([]);g.fillStyle='#ffd23f';g.font='bold 11px Arial';g.fillText('NOT A SQUIRREL',w*.36,h*.28)}
function drawLock(g,w,h){photoBg(g,w,h,'pad');g.strokeStyle='#2a2a2a';g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(w*.18,h*.7);g.bezierCurveTo(w*.25,h*.3,w*.4,h*.3,w*.47,h*.55);g.stroke();
  g.beginPath();g.moveTo(w*.53,h*.6);g.bezierCurveTo(w*.62,h*.85,w*.75,h*.4,w*.82,h*.62);g.stroke();g.fillStyle='#c9ced3';for(const[x,y]of[[w*.47,h*.55],[w*.53,h*.6]]){g.beginPath();g.arc(x,y,6,0,6.3);g.fill()}
  g.fillStyle='#d4372c';g.fillRect(w*.78,h*.55,26,20);g.fillStyle='#ffd23f';g.font='bold 14px Arial';g.fillText('CLEAN CUT',w*.4,h*.2)}
function drawWrapper(g,w,h){photoBg(g,w,h,'pad');g.save();g.translate(w*.5,h*.6);g.rotate(-.2);g.fillStyle='#6b3a1f';g.fillRect(-90,-28,180,56);g.fillStyle='#ffcf5a';g.font='900 26px Arial';g.textAlign='center';g.fillText('CHOCO-LUMPS',0,6);
  g.fillStyle='#fff';g.fillRect(40,-26,46,22);g.fillStyle='#c22';g.font='bold 10px Arial';g.fillText('RAMOS',63,-16);g.fillText('$1.29',63,-6);g.restore()}
function drawTracks(g,w,h){photoBg(g,w,h,'pad');g.strokeStyle='rgba(40,34,28,.65)';g.lineWidth=7;g.setLineDash([3,3]);for(const o of[-10,10]){g.beginPath();g.moveTo(w*.05,h*.75+o);g.bezierCurveTo(w*.4,h*.7+o,w*.6,h*.5+o,w*.95,h*.45+o);g.stroke()}g.setLineDash([]);
  g.fillStyle='#ffd23f';g.font='bold 14px Arial';g.fillText('TWO FAT TYRES, SIDE BY SIDE: A CARGO BIKE',w*.08,h*.2)}

/* ---------------- 3D props ---------------- */
const LOOT=[/* the garage: who each bike belongs to. tag = where it was taken (Vic's ledger), look = the model */
  {id:'bmx',owner:'dee',name:'The youth group\'s BMX',tag:'Laundromat rack, Main St · Tue',look:{size:'bmx',color:'#2b62c4',accent:'#f4f1e6'},tell:'pegs on the back wheel, a church-van-blue frame'},
  {id:'purple',owner:'lindqvist',name:'Mrs. Lindqvist\'s cruiser',tag:'Ash St porch · "the one with the goat"',look:{size:'adult',color:'#7d4fb3',basket:true,fenders:true,saddle:'#e7d7b8'},tell:'a basket with goat hair in it'},
  {id:'green',owner:'earl',name:'A bike library loaner',tag:'Dock St, outside the Spoke Shop',look:{size:'adult',color:'#3d8a4a',sticker:'lib',fenders:true},tell:'a BIKE LIBRARY sticker'},
  {id:'yellow',owner:'marcy',name:'Marcy\'s youngest\'s bike',tag:'Maple Heights Elementary, rack 5',look:{size:'kid',color:'#f0c419',fenders:true,streamers:['#ff7ab6','#ffd23f']},tell:'carpool-yellow, rack 5'},
  {id:'orange',owner:'dave',name:'Big Dave\'s beach cruiser',tag:'Linden Park, by the grills',look:{size:'adult',color:'#e8772e',fenders:true,whitewall:true,saddle:'#3b2a1f',basket:false},tell:'a cupholder, and it smells like brisket'},
  {id:'black',owner:'gary',name:'Gary\'s commuter bike',tag:'Elm St, outside the accounting office',look:{size:'adult',color:'#24272c',accent:'#9fe58a'},tell:'a reflector arranged by colour'}];
const OWNERS={dee:'Pastor Dee\'s youth group',lindqvist:'Mrs. Lindqvist (Ash St)',earl:'Earl\'s bike library',marcy:'Marcy (carpool)',dave:'Big Dave',gary:'Gary',linda:'Linda\'s grandkid',walt:'Walt'};
function staticBike(look){const R=RN();const b=R.bike(Object.assign({static:true},look));return b}
function rackProps(M){const a=A(),Pl=places(),R=RN();const out=[];if(!R)return out;const slots=Pl.rack.slots;
  const looks=[{size:'kid',color:'#2b8a8a',fenders:true},{size:'kid',color:'#e8a33d'},null,{size:'bmx',color:'#5b5f66',accent:'#ff7a3d'},{size:'kid',color:'#9a3fb8',streamers:['#ffd23f','#ff7ab6']},null];
  slots.forEach((s,k)=>{const lk=looks[k];if(!lk)return;const b=staticBike(lk);b.position.set(s.x+.15,0,s.z);b.rotation.y=Math.PI;a.wmAdd(b);out.push(b)});return out}
function clueProps(M){const a=A(),Pl=places(),T=a.THREE,s=Pl.rack.slots[2],g=new T.Group();a.wmAdd(g);
  /* the cut lock: two halves of a coiled cable, cut ends bright */
  const cm=new T.MeshStandardMaterial({color:a.lin('#1f2124'),roughness:.6});for(const[dx,dz,r]of[[-.25,0,.12],[.22,.18,-.6]]){const c=new T.Mesh(new T.TorusGeometry(.11,.012,6,18,Math.PI*1.4),cm);c.rotation.set(-Math.PI/2,0,r);c.position.set(s.x+.5+dx,.015,s.z+dz);g.add(c)}
  const lk=new T.Mesh(new T.BoxGeometry(.07,.04,.05),new T.MeshStandardMaterial({color:a.lin('#d4372c'),roughness:.4}));lk.position.set(s.x+.75,.02,s.z+.25);g.add(lk);
  /* the wrapper by the rack's end */
  const wm=new T.MeshStandardMaterial({color:a.lin('#7a4422'),roughness:.4,metalness:.3});const w=new T.Mesh(new T.BoxGeometry(.16,.012,.07),wm);w.position.set(s.x+1.6,.01,s.z-1.2);w.rotation.y=.6;g.add(w);
  /* the tracks: two dark strips off the pad toward the lane */
  /* (the school wall is at x 130: the tracks run south off the pad, toward the drop-off lane) */
  const tm=new T.MeshBasicMaterial({color:a.lin('#2a241e'),transparent:true,opacity:.5,depthWrite:false});for(const o of[-.13,.13]){const t=new T.Mesh(new T.PlaneGeometry(5.2,.07),tm);t.rotation.x=-Math.PI/2;t.rotation.z=-Math.PI/2+.28;t.position.set(s.x+1.3+o,.012,s.z+4.2);g.add(t)}
  M.cluePts={lock:{x:s.x+.6,z:s.z+.1},wrapper:{x:s.x+1.6,z:s.z-1.2},tracks:{x:s.x+1.5,z:s.z+4.4}};
  M.spark=sparkles(Object.values(M.cluePts));return g}
function sparkles(pts){const a=A(),T=a.THREE,g=new T.Group();const m=new T.MeshBasicMaterial({color:a.lin('#ffd84a'),transparent:true,opacity:.85,depthWrite:false});
  const list=pts.map(p=>{const s=new T.Group();const c=new T.Mesh(new T.OctahedronGeometry(.11,0),m);c.position.y=.55;s.add(c);const r=new T.Mesh(new T.RingGeometry(.32,.4,24),m);r.rotation.x=-Math.PI/2;r.position.y=.02;s.add(r);s.position.set(p.x,0,p.z);g.add(s);return s});
  a.wmAdd(g);return{g,list}}
function laptopProp(){const a=A(),T=a.THREE,g=new T.Group();const base=new T.Mesh(new T.BoxGeometry(.34,.02,.24),new T.MeshStandardMaterial({color:a.lin('#a9adb3'),metalness:.6,roughness:.35}));g.add(base);
  const sc=new T.Mesh(new T.BoxGeometry(.34,.22,.012),base.material);sc.position.set(0,.11,-.12);sc.rotation.x=-.25;g.add(sc);const lit=new T.Mesh(new T.PlaneGeometry(.3,.18),new T.MeshBasicMaterial({color:a.lin('#dfe8f5')}));
  lit.position.set(0,.112,-.112);lit.rotation.x=-.25;g.add(lit);return g}
/* the lock-up garage on 5th St: corrugated walls, a rolled-up door facing the street, a bench, a whiteboard, bikes everywhere */
function garageProps(M){const a=A(),T=a.THREE,G=places().garage,g=new T.Group();a.wmAdd(g);const H=2.9;
  const tex=(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');for(let i=0;i<32;i++){x.fillStyle=i%2?'#8c959b':'#a3abb0';x.fillRect(i*4,0,4,64)}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(5,1);t.encoding=T.sRGBEncoding;return t})();
  const wall=new T.MeshStandardMaterial({map:tex,roughness:.55,metalness:.35,color:a.lin('#c4ccd0')});M.garMat=[wall,tex];
  const W=(x0,z0,x1,z1)=>{const m=new T.Mesh(new T.BoxGeometry(Math.max(.12,x1-x0),H,Math.max(.12,z1-z0)),wall);m.position.set((x0+x1)/2,H/2,(z0+z1)/2);m.castShadow=m.receiveShadow=true;g.add(m);a.wmCol({x0,z0,x1,z1})};
  const dz0=G.door.z-2.4,dz1=G.door.z+2.4;W(G.x1-.12,G.z0,G.x1,G.z1);W(G.x0,G.z0,G.x1,G.z0+.12);W(G.x0,G.z1-.12,G.x1,G.z1);W(G.x0,G.z0,G.x0+.12,dz0);W(G.x0,dz1,G.x0+.12,G.z1);
  const hd=new T.Mesh(new T.BoxGeometry(.14,.55,dz1-dz0),wall);hd.position.set(G.x0+.06,H-.27,G.door.z);g.add(hd);
  const roofM=new T.MeshStandardMaterial({color:a.lin('#5d6368'),roughness:.8});const roof=new T.Mesh(new T.BoxGeometry(G.x1-G.x0+.5,.12,G.z1-G.z0+.5),roofM);roof.position.set((G.x0+G.x1)/2,H+.12,(G.z0+G.z1)/2);roof.rotation.z=.05;roof.castShadow=true;g.add(roof);
  const roll=new T.Mesh(new T.CylinderGeometry(.22,.22,dz1-dz0,14),new T.MeshStandardMaterial({color:a.lin('#b9c0c5'),metalness:.5,roughness:.4}));roll.rotation.x=Math.PI/2;roll.position.set(G.x0+.3,H-.3,G.door.z);g.add(roll);
  const fl=new T.Mesh(new T.BoxGeometry(G.x1-G.x0-.2,.04,G.z1-G.z0-.2),new T.MeshStandardMaterial({color:a.lin('#8e8a82'),roughness:.95}));fl.position.set((G.x0+G.x1)/2,.02,(G.z0+G.z1)/2);fl.receiveShadow=true;g.add(fl);
  const lt=new T.Mesh(new T.BoxGeometry(1.2,.05,.12),new T.MeshBasicMaterial({color:a.lin('#f4f6ff')}));lt.position.set((G.x0+G.x1)/2,H-.08,(G.z0+G.z1)/2);g.add(lt);
  /* the bench along the back wall with the bolt cutters on it */
  const wood=new T.MeshStandardMaterial({color:a.lin('#8a6440'),roughness:.8});const bench=new T.Mesh(new T.BoxGeometry(.7,.06,3.2),wood);bench.position.set(G.x1-.5,.9,G.door.z);g.add(bench);
  for(const dz of[-1.4,1.4]){const l=new T.Mesh(new T.BoxGeometry(.06,.9,.06),wood);l.position.set(G.x1-.5,.45,G.door.z+dz);g.add(l)}a.wmCol({x0:G.x1-.85,z0:G.door.z-1.6,x1:G.x1-.12,z1:G.door.z+1.6,h:.95});
  const cm=new T.MeshStandardMaterial({color:a.lin('#c22'),roughness:.5});for(const s of[-1,1]){const h=new T.Mesh(new T.BoxGeometry(.6,.025,.03),cm);h.position.set(G.x1-.5,.95,G.door.z+.3+s*.03);h.rotation.y=s*.08;g.add(h)}
  const jaw=new T.Mesh(new T.BoxGeometry(.12,.03,.05),new T.MeshStandardMaterial({color:a.lin('#555'),metalness:.8,roughness:.3}));jaw.position.set(G.x1-.85,.95,G.door.z+.3);g.add(jaw);
  try{a.wmSign(['BIKES $10 EA','NO QUESTIONS · CASH ONLY'],G.x1-.2,G.door.z,Math.PI/2,{w:1.6,h:.55,y:1.75,bg:'#f4f4f0',fg:'#c22'})}catch(e){}
  /* the bikes: the six on the board stand in two rows, more hang on the walls */
  M.loot=[];const spots=[[G.x0+1.4,G.z0+.7],[G.x0+2.4,G.z0+.7],[G.x0+3.4,G.z0+.7],[G.x0+1.4,G.z1-.7],[G.x0+2.4,G.z1-.7],[G.x0+3.4,G.z1-.7]];
  LOOT.forEach((l,k)=>{const b=staticBike(l.look),sp=spots[k];b.position.set(sp[0],0,sp[1]);b.rotation.y=Math.PI/2+(k<3?0:Math.PI)+(k%2?.06:-.06);g.add(b);
    const tag=new T.Mesh(new T.PlaneGeometry(.12,.08),new T.MeshBasicMaterial({color:a.lin('#f6efd6'),side:T.DoubleSide}));tag.position.set(sp[0],.95,sp[1]+(k<3?.33:-.33));g.add(tag);
    M.loot.push({id:l.id,x:sp[0],z:sp[1]+(k<3?.9:-.9),b,done:false,tagMesh:tag,wrong:[]})});
  for(let k=0;k<5;k++){const b=staticBike({size:k%2?'kid':'bmx',color:['#3fa0c8','#c84a3f','#4ac86a','#c8c23f','#8a8f96'][k]});b.position.set(G.x1-.3,1.25,G.z0+.9+k*.4);b.rotation.set(0,0,Math.PI/2);g.add(b)}
  for(let k=0;k<4;k++){const b=staticBike({size:'kid',color:['#e86a9a','#6a9ae8','#9ae86a','#e8c06a'][k]});b.position.set(G.x0+4.6,0,G.z0+.6+k*.55);b.rotation.y=Math.PI/2+.1;g.add(b)}
  M.garage=g;return g}

/* ---------------- conversation helper (HT.Social view + scene, on game time; E skips a line) ---------------- */
function talk(M,o){const S=S_(),a=A();if(M.talk)endTalk(M);
  if(!S||!S.view||typeof document==='undefined'){/* no engine: radio the lines, take the first option */for(const[w,t]of o.lines||[])a.radio(CAST[w]?CAST[w].name:w,t);if(o.rounds)for(const r of o.rounds){const op=r.options[0];if(op.then)op.then()}o.done&&o.done([]);return}
  const V=S.view({cast:CAST,cls:'bk-talk'}).mount(),Q=S.scene(V);const T={V,Q,o,pos:{x:a.P.pos.x,z:a.P.pos.z},picks:[],face:o.face||null};M.talk=T;
  for(const[w,t,op]of o.lines||[])Q.say(w,t,op||{});
  const round=i=>{const r=o.rounds&&o.rounds[i];if(!r){Q.run(()=>{try{o.done&&o.done(T.picks)}catch(e){console.warn(e)}});Q.run(()=>endTalk(M));return}
    Q.choose(done=>{V.prompt(r.who||o.who,r.tell||'');V.choices(r.options.map(op=>({text:op.text,reg:op.reg,tag:op.tag})),{time:0,onPick:k=>{const op=r.options[k];T.picks.push(op);Q.say('you',op.text);
      for(const[w,t]of op.reply||[])Q.say(w,t);if(op.then)Q.run(()=>op.then(op));done();round(i+1)}})})};
  round(0);return T}
function endTalk(M){const T=M.talk;if(!T)return;try{T.V.unmount()}catch(e){}M.talk=null}
/* the dad stays put while somebody talks (no walking off mid-sentence), facing them */
function talkTick(M,dt){const T=M.talk,a=A();if(!T)return;T.Q.update(dt);if(!M.talk)return;if(!a.CV){a.P.pos.x=T.pos.x;a.P.pos.z=T.pos.z;if(T.face){a.P.yaw=Math.atan2(-(T.face.x-a.P.pos.x),-(T.face.z-a.P.pos.z))}}}

/* radio, paced: the game's subtitle queue holds four lines */
const SAYQ=[];let sayT=0;
function say(who,t,front){const a=A();if(front){SAYQ.length=0;sayT=Math.max(2.2,t.length*.055);a.radio(CAST[who]?CAST[who].name:who,t,true)}else SAYQ.push([who,t])}
function sayAll(list,front){list=list.slice();if(front&&list.length){const[w,t]=list.shift();say(w,t,true)}for(const l of list)SAYQ.push(l)}
function sayTick(dt){sayT-=dt;if(sayT<=0&&SAYQ.length){const[w,t]=SAYQ.shift();sayT=Math.max(2.2,t.length*.055);A().radio(CAST[w]?CAST[w].name:w,t,false)}}
/* guns: holstered all job (Tyler, the neighbours' kids, Dez); out only at the garage once Dez is clear */
function guns(M,on,line){const a=A();if(on){M.noGuns=false;M.holster=false;try{a.holster(false)}catch(e){}}else{M.noGuns=line||"Not with kids around. It stays holstered.";M.holster=true}}
function music(id,k){const Au=AU();if(!Au)return;try{Au.music(id);if(k!=null&&Au.setIntensity)Au.setIntensity(k)}catch(e){}}

/* ---------------- the laptop (Dadazon's Resale tab, opened from the porch) ---------------- */
function listings(M){const R=RS();if(!R)return;R.clear('bike');const ago=['2 h ago','5 h ago','yesterday','3 days ago'];
  const wrong=(M_,txt)=>()=>{const m=A().M;if(m&&m.def&&m.def.id==='bike'){m.wrong++;m.elapsed+=TUNE.wrongBike;m.wrongNote=1}return{text:txt,done:true,note:'Not Tyler\'s. That cost you '+TUNE.wrongBike+' s.',toast:'Not it · +'+TUNE.wrongBike+' s'}};
  R.add({id:'b_tyler',tag:'bike',pin:1,title:'RED BIKE. FAST. CARD IN SPOKES NOT INCLUDED.',price:40,seller:'bikez4cheap',where:'Riverside Flats',ago:ago[0],
    blurb:'kids bike 20in. red. fast. NO TEXTS chat only. pick up riverside',details:['20-inch','"Some wear"','Pick up: Riverside'],photo:drawListing(TYLER),
    chat:{prompt:'Message bikez4cheap',options:['Hi! Is the red bike still available? It\'s for my son.','hello fellow teen. is the bike still available. lol','Where\'d you get this bike?'],
      reply:i=>{const m=A().M;if(m&&m.def&&m.def.id==='bike'){m.msg=['real','joke','tough'][i];m.meetSet=true}
        return{text:['ya its available. 40 cash. ramos corner mart, riverside. 20 min','lmao ok. 40. ramos corner mart in riverside. dont be weird','..its mine. 40 or no deal. ramos corner mart. come alone lol'][i],
          done:true,ok:true,note:'Meet set: Ramos Corner Mart, Riverside. Bring $40.',toast:'Meet set · Ramos Corner Mart',close:1600}}}});
  R.add({id:'b_unicorn',tag:'bike',title:'Kids bike, red, STREAMERS!! Like new',price:55,seller:'MomOf3onBirch',where:'Maple Heights',ago:ago[1],blurb:'My daughter outgrew it. Barely used. Streamers included, unicorn included.',
    details:['20-inch','Streamers','Like new'],photo:drawListing({col:'#d22a33',streamers:['#ff7ab6','#f4f1ea'],sticker:'uni',fender:true}),
    chat:{prompt:'Message MomOf3onBirch',options:['Is it still available?','Any dents on it?','Where did you get it?'],reply:wrong(M,'Still here! No dents, it\'s practically new. And it has a unicorn on it, so... probably not your son\'s? Unless?')}});
  R.add({id:'b_dent',tag:'bike',title:'Red 20 inch, has character',price:30,seller:'garage_sale_greg',where:'Maple Heights',ago:ago[2],blurb:'Dent is from my nephew. Sticker is from my nephew. Streamers were eaten by my nephew.',
    details:['20-inch','Dent','No streamers (see nephew)'],photo:drawListing({col:'#c22a2a',dent:true,sticker:'dino',bell:true}),
    chat:{prompt:'Message garage_sale_greg',options:['Is it still available?','Did it ever have streamers?','Where did you get it?'],reply:wrong(M,'Streamers? The nephew ate them in 2023. This bike has been in my garage since the Bush administration. The second one.')}});
  R.add({id:'b_cruiser',tag:'bike',title:'Red cruiser, ridden once (to the end of the driveway)',price:120,seller:'TedOnOak',where:'Maple Heights',ago:ago[3],blurb:'Bought it to get in shape. Got in a different shape.',
    details:['26-inch','Adult size','Basket'],photo:drawListing({col:'#b81f2a',big:true,bell:true,fender:true}),
    chat:{prompt:'Message TedOnOak',options:['Is it still available?','Is this a kid\'s bike?','Where did you get it?'],reply:wrong(M,'It\'s an adult bike, sir. Is your son... tall?')}})}
function openLaptop(M){const a=A();if(!window.HT||!HT.Shop||!HT.Shop.open)return false;M.laptopOpen=true;M.laptopUsed=true;
  const close=()=>{M.laptopOpen=false;const H=window.__ht;if(!a.openShop&&H){H.running=true;try{const cv=document.querySelector('canvas');if(cv&&cv.requestPointerLock)cv.requestPointerLock()}catch(e){}}};
  const opt={kind:'dadazon',tab:'resale',select:'b_tyler'};
  if(typeof a.openShop==='function'){const ok=a.openShop('dadazon',{tab:'resale',select:'b_tyler',onClose:close});if(ok)return true}
  /* fallback until the framework offers api.openShop: pause the loop like openMenu() does and release the pointer */
  const H=window.__ht;if(H)H.running=false;try{if(document.exitPointerLock)document.exitPointerLock()}catch(e){}
  HT.Shop.open(Object.assign(opt,{onClose:close}));return true}

/* ---------------- world after the job: bikes back on porches and at the school rack, Dez at the library ---------------- */
const WD={g:null,L:null,dez:null};
function worldDress(){const a=A();if(!a||a.mode!=='hub'||!a.L||!a.L.ow||!a.WORLD)return;const s=a.SV&&a.SV();if(!(s&&s.jobs&&s.jobs.bike&&s.jobs.bike.done))return;
  if(WD.g&&WD.L===a.L&&WD.g.parent)return;if(WD.g){WD.g.traverse(m=>{if(m.isMesh&&m.geometry)m.geometry.dispose()});if(WD.g.parent)WD.g.parent.remove(WD.g);WD.g=null;WD.dez=null}
  const R=RN();if(!R)return;const T=a.THREE,g=new T.Group();g.name='bike-after';const Pl=places();if(!Pl)return;
  /* the school rack is full again */
  const looks=[{size:'kid',color:'#2b8a8a',fenders:true},{size:'kid',color:'#e8a33d'},{size:'kid',color:'#c8202a',streamers:TYLER.streamers,dent:true,fenders:true},{size:'bmx',color:'#5b5f66',accent:'#ff7a3d'},{size:'kid',color:'#9a3fb8'},{size:'kid',color:'#f0c419',fenders:true}];
  Pl.rack.slots.forEach((sl,k)=>{const b=R.bike(Object.assign({static:true},looks[k]));b.position.set(sl.x+.15,0,sl.z);b.rotation.y=Math.PI;g.add(b)});
  /* bikes on porches: the neighbours you knocked on, a few Riverside stoops */
  for(const p of Pl.nb){const b=R.bike({static:true,size:'kid',color:p.id==='linda'?'#ff7ab6':p.id==='phil'?'#3fa0c8':'#8a8f96'});b.position.set(p.x+1.4,0,p.z-p.face*.3);b.rotation.y=.4;g.add(b)}
  const rp=(a.WORLD.porches||[]).slice(0,3);rp.forEach((p,k)=>{const b=R.bike({static:true,size:k?'kid':'adult',color:['#7d4fb3','#2b62c4','#3d8a4a'][k],basket:!k});b.position.set(p.x+1.2,0,p.z+(p.face?p.face[1]*1.2:1));b.rotation.y=-.3;g.add(b)});
  /* Dez's family's porch gets flower boxes */
  const fp=(a.WORLD.porches||[])[3];if(fp){const bx=new T.MeshStandardMaterial({color:a.lin('#7a5534'),roughness:.8});const fl=['#ff6b8a','#ffd23f','#ff9a3d','#c86bff'];
    for(const dx of[-1.1,1.1]){const m=new T.Mesh(new T.BoxGeometry(.8,.22,.26),bx);m.position.set(fp.x+dx,.62,fp.z+(fp.face?fp.face[1]*.2:0));g.add(m);
      for(let i=0;i<5;i++){const f=new T.Mesh(new T.SphereGeometry(.07,6,5),new T.MeshStandardMaterial({color:a.lin(fl[(i+(dx>0?2:0))%4]),roughness:.6}));f.position.set(fp.x+dx-.3+i*.15,.8,fp.z+(fp.face?fp.face[1]*.2:0));g.add(f)}}}
  /* the library: a bike stand of returned bikes, and Dez at the counter (Saturdays and every day after school, he says) */
  const e=Pl.earl;if(e){for(let k=0;k<3;k++){const b=R.bike({static:true,size:k===1?'kid':'adult',color:['#e8772e','#f0c419','#24272c'][k]});b.position.set(e.x-2.4+k*.9,0,e.z+2.6);b.rotation.y=Math.PI/2;g.add(b)}
    if(s.flags&&s.flags.dezLibrary&&has('nb_kid')){try{const d=PP().make('nb_kid',{scale:1.12});d.root.position.set(e.x-1.2,0,e.z+1.4);d.root.rotation.y=Math.PI;g.add(d.root);WD.dez=d}catch(err){}}}
  a.L.group.add(g);WD.g=g;WD.L=a.L}
J.on('pose',dt=>{const a=A();if(!a||a.mode!=='hub'){return}try{worldDress()}catch(e){console.warn('[bike] world',e)}if(WD.dez&&WD.dez.root.parent)a.pose(WD.dez,dt,{moving:false,aim:false})});
/* Tyler waits on the porch as the giver: the son model streams in on demand; swap a box stand-in for him once it lands */
J.on('hud',()=>{const a=A();if(!a||a.mode!=='hub')return;if(!has('son')){preload();return}const i=a.MISSIONS.findIndex(m=>m.id==='bike');if(i<0)return;
  for(const n of a.npcs){if(!n.marker||n.marker.i!==i||n.dude.rb)continue;const old=n.dude;let d=null;try{d=PP().make('son',{})}catch(e){}if(!d)continue;d.root.position.copy(old.root.position);d.root.rotation.y=old.root.rotation.y;
    if(old.root.parent){old.root.parent.add(d.root);old.root.parent.remove(old.root)}n.dude=d}});

/* ---------------- the job ---------------- */
J.register('bike',{
  def:{giver:'tyler',giverName:'Tyler',giverLook:{role:'son',shirt:'#e5a83a',pants:'#3a4a6a'},hood:'river',title:'Chain Reaction',role:'Tyler · Eight. Wants his bike back. You promised.',
    place:'Maple Heights Elementary → Riverside',
    lines:["Dad. DAD. Somebody took my bike off the rack at school. The red one. With the streamers.",
      "It had the ace of spades in the spokes. It goes brrrrrrr. Now it doesn't go anywhere.",
      "You said 'I'll get it back, buddy.' Pinky promise. That's legally binding. Mom said so."],
    obj:'Find Tyler\'s bike: check the school bike rack for clues, ask around, find the listing, and bring it home.',
    crew:[],weapons:['pistol','beanbag'],
    get from(){const Pl=places();return Pl?{x:Pl.tyler.x,z:Pl.tyler.z}:{place:'home'}},
    start:{place:'school'},site:'school',
    unlock:{done:['earl','taxi']},pay:600,par:960,winTrust:6,roam:true,order:40,
    stages:['rack','leads','meet','chase','garage','bikes','home'],
    stageLabels:{rack:'The bike rack',leads:'Ask around',meet:'The meet',chase:'The chase',garage:'The garage',bikes:'Whose bike is whose',home:'Brrrrr'},
    failPolicy:'escalate',medals:['Finished','Caught Dez in the chase','Caught Dez without the minivan'],
    radio:[['tyler',"Pinky promise?"],['you',"Pinky promise."]],
    endLine:"Tyler: Brrrrrrrrrrrrr! (He is doing laps of the lawn. He will be doing laps of the lawn until dinner.)"},
  start(M,o){const a=A();preload();music('hub');
    Object.assign(M,{found:[],lite:{},wrong:0,owrong:0,nb:{linda:0,phil:0,walt:0},msg:null,meetSet:false,talk:null,ui:null,boardT:0,caught:null,caughtHow:null,carNear:false,lost:false,
      dezGone:false,lostT:0,chaseT:0,usedCar:false,usedBike:false,adults:[],tagged:0,bikeHome:false,given:false,bikeIn:false,par:M.def.par,say:{},laptopOpen:false,laptopUsed:false});
    M.nbDone=()=>['linda','phil','walt'].filter(k=>M.nb[k]).length;SAYQ.length=0;sayT=0;
    const Pl=places();boardMount(M);listings(M);guns(M,false);
    M.rackBikes=rackProps(M);M.clueG=clueProps(M);
    if(!o||!o.checkpoint){sayAll([['tyler',"Dad! The bike rack's right by the school's front door. My spot was the third one. It's EMPTY now."],['you',"I see it. Let's see what the rack has to say."]],true);
      M.tut=true}},
  upd(dt,M,F){const a=A(),P=a.P,Pl=places();if(!Pl)return;sayTick(dt);talkTick(M,dt);
    if(M.ui){M.ui.cardT-=dt;if(M.ui.cardT<=0&&M.ui.card.classList.contains('on'))M.ui.card.classList.remove('on');
      M.boardT-=dt;const show=M.stage==='rack'||M.stage==='leads'||M.stage==='meet'||M.boardT>0||M.stage==='bikes';M.ui.board.classList.toggle('min',!show)}
    if(M.spark){const tt=a.simT||0;M.spark.list.forEach((s,k)=>{s.children[0].rotation.y=tt*2+k;s.children[0].position.y=.55+Math.sin(tt*3+k)*.06})}
    if(M.resumed){M.resumed=false;resume(M)}
    if(M.spark&&M.cluePts)Object.keys(M.cluePts).forEach((id,k)=>{const s=M.spark.list[k];if(s)s.visible=!M.found.includes(id)});
    const st=M.stage||'rack';
    if(st==='rack')stRack(dt,M,F);else if(st==='leads')stLeads(dt,M,F);else if(st==='meet')stMeet(dt,M,F);else if(st==='chase')stChase(dt,M,F);
    else if(st==='garage')stGarage(dt,M,F);else if(st==='bikes')stBikes(dt,M,F);else if(st==='home')stHome(dt,M,F);
    dezTick(dt,M);tylerTick(dt,M)},
  save:M=>({found:M.found.slice(),lite:Object.assign({},M.lite),wrong:M.wrong|0,owrong:M.owrong|0,nb:Object.assign({},M.nb),msg:M.msg||null,meetSet:!!M.meetSet,caught:M.caught||null,caughtHow:M.caughtHow||null,
    carNear:!!M.carNear,lost:!!M.lost,usedCar:!!M.usedCar,usedBike:!!M.usedBike,tagged:M.tagged|0,tags:M.loot?M.loot.filter(l=>l.done).map(l=>l.id):(M._tags||[]),bikeIn:!!M.bikeIn,laptopUsed:!!M.laptopUsed}),
  load(M,s){if(!s)return;Object.assign(M,{found:(s.found||[]).slice(),lite:Object.assign({},s.lite||{}),wrong:s.wrong|0,owrong:s.owrong|0,nb:Object.assign({linda:0,phil:0,walt:0},s.nb||{}),msg:s.msg,meetSet:!!s.meetSet,
    caught:s.caught||null,caughtHow:s.caughtHow||null,carNear:!!s.carNear,lost:!!s.lost,usedCar:!!s.usedCar,usedBike:!!s.usedBike,tagged:s.tagged|0,_tags:(s.tags||[]).slice(),bikeIn:!!s.bikeIn,laptopUsed:!!s.laptopUsed});
    if(M.ui)boardPaint(M);M.resumed=true},
  payout(M,ok){if(!ok)return[];const out=[];out.push(['Tyler\'s bike, unscratched',M.carNear?0:100]);
    out.push([M.owrong?'Every bike home (a few wrong guesses)':'Every bike home',M.owrong?100:200]);
    if(M.caught)out.push(['Dez: talked down, not tied down',0]);if(M.wrong)out.push(['Wrong listings messaged ×'+M.wrong,0]);return out},
  medal:M=>!M.caught?1:M.caughtHow==='car'||M.usedCar?2:3,
  end(M,ok){if(!ok)return;const a=A(),SV=window.HT&&HT.Save,s=a.SV&&a.SV();try{if(SV&&SV.household)SV.household(null,'dez_family');if(s){s.flags=s.flags||{};if(M.caught)s.flags.dezLibrary=true;s.flags.bikesHome=(s.flags.bikesHome|0)+LOOT.length+1;if(SV.touch)SV.touch('flags')}}catch(e){console.warn(e)}},
  cleanup:null,
  vehicle(car,dt){const M=A().M;if(!M||M.stage!=='chase'||!M.dez||!M.dez.R)return;if(car.type==='bike')return;/* the minivan never touches a kid: it brakes itself hard near him */
    const R=M.dez.R,d=Math.hypot(car.pos.x-R.pos.x,car.pos.z-R.pos.z);if(d<TUNE.carNear+3&&Math.abs(car.spd)>2){const k=clamp((TUNE.carNear+3-d)/3,0,1);if(car.car){car.car.spd*=1-k*.25;car.spd=car.car.spd}if(d<TUNE.carNear&&!M.carNear){M.carNear=true;say('you',"Whoa! Whoa. Brakes. Nobody's getting hurt over a bike.",true)}}},
  interact(prompt){return undefined},
  camera(dt){return undefined},
  test:{give(a){preload();try{if(window.__ht&&__ht.openBridge)__ht.openBridge()}catch(e){}try{if(a.mode==='hub'&&window.__ht&&window.__ht.enterHub)window.__ht.enterHub()}catch(e){}},
    step:(a,t,o)=>bot(a,t,o),
    sample:()=>({stage:'leads',found:['lock','wrapper','tracks','linda'],lite:{linda:true},wrong:1,owrong:0,nb:{linda:1,phil:0,walt:0},msg:null,meetSet:false,caught:null,caughtHow:null,carNear:false,lost:false,
      usedCar:false,usedBike:false,tagged:0,_tags:[],bikeIn:false,laptopUsed:false,loot:null,nbDone(){return 1}})}
});

/* a stage retry: put back what that stage needs (Dez where the save says he is, the garage, the loaner) */
function resume(M){const a=A(),Pl=places(),st=M.stage;if(!Pl)return;
  if(['garage','bikes','home'].includes(st)){if(st!=='garage')garageProps(M);
    if(has('nb_kid')&&!M.dez){const D=dezMake(M,Pl.meet.x,Pl.meet.z,Math.PI);D.R={pos:{x:Pl.meet.x,z:Pl.meet.z},yaw:Math.PI,spd:0,lean:0,steer:0,t:0,stop(){},update(){return'stopped'}};
      D.st=M.caught?'parked':'hidden';if(!M.caught){D.R.pos={x:Pl.garage.inside.x,z:Pl.garage.inside.z};M.dezLeft=true}}
    if(st!=='garage'){M.adults=M.adults||[]}}}
/* ---------------- stage: the rack ---------------- */
function stRack(dt,M,F){const a=A(),P=a.P,Pl=places();const left=['lock','wrapper','tracks'].filter(id=>!M.found.includes(id));
  F.objs.push(['Look over the bike rack: walk to the glowing spots and press E · '+(3-left.length)+'/3',false]);
  if(M.tut&&!M.found.length)F.objs.push(['The yellow marker shows the next one',false]);
  let near=null,nd=1e9;for(const id of left){const p=M.cluePts[id],d=Math.hypot(p.x-P.pos.x,p.z-P.pos.z);if(d<nd){nd=d;near=id}}
  if(near)F.target={x:M.cluePts[near].x,z:M.cluePts[near].z,label:'Clue'};
  for(const id of left){const p=M.cluePts[id];F.taps.push({x:p.x,z:p.z,r:TUNE.clueR,txt:{lock:'Look at the cut lock',wrapper:'Look at the wrapper',tracks:'Look at the tracks'}[id],fn:()=>{
    clueAdd(M,id);cardShow(M,id,{lock:drawLock,wrapper:drawWrapper,tracks:drawTracks}[id]);sparkOff(M,id);
    const lines={lock:[['you',"Cut clean through. Eight-year-olds don't carry bolt cutters. A grown-up did this."]],wrapper:[['you',"Choco-Lumps. Ramos Corner Mart price sticker. That's over the bridge."]],tracks:[['you',"Two fat tyres side by side. A cargo bike. A heavy one. Somebody hauled a load off this pad."]]}[id];sayAll(lines,true)}})}
  if(!left.length){a.CP.mark('leads');music('hub');sayAll([['tyler',"(on the phone) Did you find it? Is it there?"],['you',"Not yet, buddy. But somebody saw something. I'm going to knock on some doors."],
    ['tyler',"Mrs. Linda sees EVERYTHING. And I've got the laptop on the porch. People sell stuff on Resale. Mom says I'm not allowed to buy anything."]]);M.boardT=12}}
function sparkOff(M,id){const k=Object.keys(M.cluePts).indexOf(id);if(M.spark&&M.spark.list[k])M.spark.list[k].visible=false}

/* ---------------- stage: ask around (three doors and the laptop, any order) ---------------- */
const NB={
  linda:{key:'nb_lucia',mood:'bored',tell:'[Linda is bored stiff. A joke might wake her up.]',
    intro:[['linda',"Oh! Are you selling something? I already have a vacuum. I have FOUR vacuums."],['linda',"A bike? I had a bike in 1994. Teal. Big basket. I rode it to the mall every day until the mall closed. Then I rode it to where the mall used to be."]],
    options:[{reg:'joke',text:"Did it have a bell? Because this story is really... ringing true.",good:true,reply:[['linda',"(snorts) Oh, you're FUNNY. Okay, okay. Tuesday. A cargo bike with a blue tarp over a pile of bikes."],['linda',"There was a little red one sticking out with a DINOSAUR sticker. I said 'nice bike'. He said 'thanks, it's mine'. Suspicious."]]},
      {reg:'real',text:"Linda, my son's bike was stolen. Did you see anything?",reply:[['linda',"(sighs) Fine, skip to the end. A cargo bike went by Tuesday with a tarp over it. Very suspicious tarp. That's all I've got."]]},
      {reg:'over',text:"I cried at the bike store when Tyler picked his bike. The salesman cried too. We hugged.",reply:[['linda',"...okay. (backs up a step) A cargo bike. Tuesday. Tarp. Goodbye now."]]}]},
  phil:{key:'nb_pops',mood:'defensive',tell:'[Phil is guarding his camera footage like it\'s a state secret. Defensive.]',
    intro:[['phil',"Doorbell cam. I mostly use it to watch squirrels. There's one I call Gerald. He's a menace."],['phil',"You want to see Gerald? Nobody ever wants to see Gerald."]],
    options:[{reg:'over',text:"I named a squirrel once. Kevin. He took my sandwich. I still think about Kevin.",good:true,reply:[['phil',"(softening) ...Kevin. That's a good name for a squirrel. Okay. Look here. Tuesday, 3:12 pm. Not a squirrel."],['phil',"See the sticker on his cargo bike? 'bikez4cheap'. Who puts their username on their crime bike?"]]},
      {reg:'joke',text:"Show me Gerald. I love a villain.",reply:[['phil',"(lights up) Okay so THIS is Gerald on Monday— and this is Gerald on Monday afternoon—"],['phil',"...and here's Tuesday, 3:12. Not a squirrel. Gerald's in the corner, though. Classic Gerald."]]},
      {reg:'real',text:"Phil, I just need to know if your camera saw a bike thief.",reply:[['phil',"(stiffly) It sees everything. That's the point of a camera."],['phil',"(eventually) Tuesday. 3:12 pm. There."]]}]},
  walt:{key:'nb_sweater',mood:'scared',tell:'[Walt keeps the screen door between you. A little nervous.]',
    intro:[['walt',"A kid on a little red bike? Went that way. Toward the bridge. Past where the video store was. Then left at the water tower they tore down."],['walt',"Then you'll see a gas station that's a bank now. Can't miss it."]],
    options:[{reg:'real',text:"Walt, it's my son's bike. He's eight. Anything helps.",good:true,reply:[['walt',"(opens the screen door) Oh. Well. My grandson sells his old things on that Neighbourly Resale. Everybody's selling bikes on there this week."],['walt',"Check it, Dad. Before somebody buys it."]]},
      {reg:'joke',text:"The water tower? I loved that water tower.",reply:[['walt',"It was a good tower. They don't make towers like that."],['walt',"(eventually) My grandson says folks are selling bikes on Neighbourly Resale this week. Check that."]]},
      {reg:'comp',text:"Those are very detailed directions. You should give tours.",reply:[['walt',"(pleased) I DO give tours. Thursdays. Nobody comes."],['walt',"Oh, the bike. Neighbourly Resale. Everybody's selling bikes on it this week."]]}]}};
function stLeads(dt,M,F){const a=A(),P=a.P,Pl=places();const ids=['linda','phil','walt'];
  if(M.meetSet){clueAdd(M,'listing');a.CP.mark('meet');music('tension',.3);sayAll([['you',"Ramos Corner Mart. Forty bucks. Okay, bikez4cheap. Let's meet."],['tyler',"(on the phone) Is that my bike? Dad. Is that my bike?"],['you',"That's your bike, buddy. Stay on the porch."],
      ['earl',"(on the phone) Heard you're coming over the bridge. I left a loaner bike by the mart, in case. Bell works. Basket's got a granola bar in it."]],true);return}
  const nd=M.nbDone();F.objs.push(['Ask the neighbours: knock on the glowing doors (E) · '+nd+'/3',nd>=3]);
  F.objs.push(['Check Neighbourly Resale on the laptop: Tyler has it on our porch',!!M.laptopUsed&&M.meetSet]);
  if(M.wrongNote){F.objs.push(['Wrong listing: +'+TUNE.wrongBike+' s. Match the photo to the clues.',false,'warn'])}
  /* the marker: the nearest unknocked door; then the porch */
  let best=null,bd=1e9;for(const p of Pl.nb){if(M.nb[p.id])continue;const d=Math.hypot(p.talk.x-P.pos.x,p.talk.z-P.pos.z);if(d<bd){bd=d;best=p}}
  const homeD=Math.hypot(Pl.laptop.x-P.pos.x,Pl.laptop.z-P.pos.z);
  if(best&&(bd<homeD||nd===0))F.target={x:best.talk.x,z:best.talk.z,label:NB[best.id].key&&CAST[best.id].name+'\'s door'};else F.target={x:Pl.laptop.x,z:Pl.laptop.z,label:'Tyler · the laptop'};
  if(!M.doors)M.doors=sparkles(Pl.nb.map(p=>p.talk));
  Pl.nb.forEach((p,k)=>{const s=M.doors.list[k];if(s)s.visible=!M.nb[p.id];const d=Math.hypot(p.talk.x-P.pos.x,p.talk.z-P.pos.z);
    /* the door opens when you come up the walk */
    if(!M.nb[p.id]&&d<TUNE.appear&&!(M.nbD&&M.nbD[p.id])){const dd=person(NB[p.id].key);if(dd){(M.nbD||(M.nbD={}))[p.id]=dd;dd.root.position.set(p.x,0,p.z);dd.root.rotation.y=p.face>0?0:Math.PI}}
    const dd=M.nbD&&M.nbD[p.id];if(dd)a.pose(dd,dt,{moving:false,aim:false});
    if(!M.nb[p.id]&&!M.talk&&dd)F.taps.push({x:p.talk.x,z:p.talk.z,r:TUNE.doorR,txt:'Knock: talk to '+CAST[p.id].name,fn:()=>knock(M,p)})});
  if(!M.talk&&!M.laptopOpen)F.taps.push({x:Pl.laptop.x,z:Pl.laptop.z,r:2.4,txt:'Look at the laptop with Tyler (Resale tab)',fn:()=>{sayAll([['tyler',"Mom says I can't touch the Resale tab. So you do it. Find my bike, Dad. It's the one with the streamers."]],true);openLaptop(M)}})}
function knock(M,p){const a=A(),n=NB[p.id];const Au=AU();if(Au)try{Au.tone({f:180,type:'triangle',d:.08,gain:.25});Au.tone({f:170,type:'triangle',d:.08,gain:.25,at:.16})}catch(e){}
  const T=talk(M,{who:p.id,face:{x:p.x,z:p.z},lines:n.intro,rounds:[{who:p.id,tell:n.tell,options:n.options.map(op=>Object.assign({},op,{then:()=>{M.nb[p.id]=op.good?2:1;
      if(!op.good){M.elapsed+=TUNE.slowTalk;a.feed('That took a while','info','+'+TUNE.slowTalk+' s')}
      clueAdd(M,p.id,!op.good);if(p.id==='phil')cardShow(M,'phil',drawDoorbell,{kicker:'Phil\'s doorbell camera',title:'Tue 3:12 pm · not a squirrel'});else cardShow(M,p.id,null)}}))}],
    done:()=>{const d=M.nbD&&M.nbD[p.id];if(d)d.root.rotation.y+=0;}});if(T)T.who=p.id}

/* ---------------- Tyler on the porch (with the laptop) while the job runs ---------------- */
function tylerTick(dt,M){const a=A(),Pl=places();if(!Pl)return;const want=M.stage==='leads'||M.stage==='home';
  if(want&&!M.ty&&has('son')){const d=person('son');if(d){d.root.position.set(Pl.tyler.x,0,Pl.tyler.z);d.root.rotation.y=Pl.home.face>0?0:Math.PI;const lp=laptopProp();lp.position.set(Pl.tyler.x+.55,.0,Pl.tyler.z+(Pl.home.face>0?.3:-.3));a.wmAdd(lp);M.ty={d,lp}}}
  if(M.ty){M.ty.d.root.visible=want||M.given;M.ty.lp.visible=M.stage==='leads';if(M.ty.d.root.visible&&!M.tyRide)a.pose(M.ty.d,dt,{moving:false,aim:false})}}

/* ---------------- the meet ---------------- */
function dezMake(M,x,z,yaw){const a=A(),R=RN();const d=person('nb_kid',{scale:1.12});const b=R.bike({size:'kid',color:TYLER.col,streamers:TYLER.streamers,card:true,dent:true,sticker:'dino',fenders:true,grips:'#efe9dc'});a.wmAdd(b);
  const D={d,b,x,z,yaw:yaw||0,st:'wait',R:null,t:0,brr:{},look:0};b.position.set(x+.6,0,z);b.rotation.y=(yaw||0)+Math.PI/2;if(d){d.root.position.set(x,0,z);d.root.rotation.y=yaw+Math.PI}M.dez=D;return D}
function stMeet(dt,M,F){const a=A(),P=a.P,Pl=places();
  const pv=a.CV?a.CV.pos:P.pos,dm=Math.hypot(pv.x-Pl.meet.x,pv.z-Pl.meet.z);
  F.objs.push(['Meet bikez4cheap at Ramos Corner Mart, Riverside',false]);if(dm>80)F.objs.push(['Drive over the bridge. The route is on the minimap.',false]);
  F.target={x:Pl.meet.x,z:Pl.meet.z,label:'The meet · Ramos Corner Mart'};
  if(!M.loaner&&dm<140){const R=RN();if(R){M.loaner=R.playerBike(a,Pl.loaner.x,Pl.loaner.z,Pl.loaner.yaw,{owner:'Earl'});if(M.loaner){M.loaner.name='Earl';a.wmAdd(M.loaner.obj);const pin=sparkles([{x:Pl.loaner.x,z:Pl.loaner.z+1.2}]);M.loanerMark=pin}}}
  if(!M.dez&&dm<80&&has('nb_kid')){dezMake(M,Pl.meet.x,Pl.meet.z,Math.PI);say('tyler',"(on the phone) Is he there? Is it a teenager? Teenagers are scary, Dad.",true)}
  if(!M.dez)return;const D=M.dez;const dd=Math.hypot(pv.x-D.x,pv.z-D.z),car=!!a.CV&&!(a.CV.type==='bike');
  if(dd<30){F.objs.push(['Walk up to him. Easy. He\'s fourteen.',false])}
  const spot=car?TUNE.spotCar:M.msg==='tough'?TUNE.spotWary:TUNE.spotFoot;
  if(dd<spot&&D.st==='wait'){bolt(M,car)}
  else if(dd<4.5&&D.st==='wait')F.taps.push({x:D.x,z:D.z,r:4.5,txt:'"Hey! I\'m here about the bike."',fn:()=>bolt(M,car)})}
function bolt(M,car){const a=A(),D=M.dez;if(D.st!=='wait')return;D.st='spooked';D.t=0;
  sayAll([['dez',car?"Is that a MINIVAN? Are you somebody's DAD? Nope!":"Wait. Are you the 'is it still available' guy? You're somebody's DAD."],['dez',"Nope! Nope nope nope!"]],true);
  a.CP.mark('chase');startChase(M)}

/* ---------------- the chase ---------------- */
function startChase(M){const a=A(),R=RN(),Pl=places(),D=M.dez;if(!R||!D)return;
  guns(M,false,"Not near a kid. Not ever.");music('combat',.7);
  if(!M.nav){const w=Pl.win;M.nav=R.nav(a,w,{r:.45})}
  D.R=R.make(a,{nav:M.nav,x:D.x+.6,z:D.z,yaw:Math.PI/2,mode:'bike',seed:(M.retried?77:13),stamina:100,drain:TUNE.drain,bounds:{x0:310,z0:6,x1:458,z1:150}});D.st='run';D.t=0;
  if(!M.chaseTut){M.chaseTut=true;sayAll([['earl',"(phone) That's Earl's loaner by the mart! Hop on. The yards and back lanes don't fit a minivan."],['you',"I'm... a dad... I can do... this... all day..."]])}}
function stChase(dt,M,F){const a=A(),P=a.P,Pl=places();if(!M.dez){/* retry from the chase: he's at the mart again and bolts */if(has('nb_kid')){stMeet(dt,M,{objs:[],meters:[],widgets:[],taps:[],holds:[]});const D2=M.dez;if(D2){D2.st='spooked';startChase(M);say('dez',"Nope! Still nope!",true)}}return}
  const D=M.dez;if(!D.R){startChase(M);return}
  const R=D.R,cv=a.CV,me=cv?cv.pos:P.pos,onBike=!!(cv&&cv.type==='bike'),inCar=!!cv&&!onBike;M.chaseT+=dt;if(inCar)M.usedCar=true;if(onBike)M.usedBike=true;
  if(M.loanerMark)M.loanerMark.g.visible=!onBike&&M.chaseT<20;
  const d=Math.hypot(me.x-R.pos.x,me.z-R.pos.z);
  if(D.st==='run'){const s=R.update(dt,{x:me.x,z:me.z,car:inCar,spd:cv?Math.abs(cv.spd):P.spd||0});
    if(s==='winded'){D.st='winded';sayAll([['dez',"(wheezing) Okay! OKAY. I'm done. My legs are spaghetti."],['dez',"Don't— don't grab me, man. I'll talk."]],true)}
    if(d>TUNE.lostD)M.lostT+=dt;else M.lostT=Math.max(0,M.lostT-dt*2);if(M.lostT>TUNE.lostT||d>TUNE.farD){D.st='gone';M.lost=true;R.state='run';R.goHome(Pl.garage.front.x,Pl.garage.front.z);
      sayAll([['you',"Where'd he— he's gone."],['tyler',"(on the phone) Dad! The card! Listen for the brrrrrr! You can hear it from like a MILE away!"],['you',"...Tyler, you're a genius."]],true)}}
  else if(D.st==='gone'){const s=R.update(dt,{x:me.x,z:me.z,car:inCar});D.pingT=(D.pingT||0)-dt;if(D.pingT<=0){D.pingT=5;D.ping={x:R.pos.x,z:R.pos.z}}
    if(s==='home'){D.st='hidden';D.home=true;M.dezGone=true;a.CP.mark('garage');sayAll([['you',"The brrrr stopped. Right by that lock-up garage on 5th."],['you',"Okay. Grown-ups only from here."]],true)}}
  if(D.st==='winded'){F.taps.push({x:R.pos.x,z:R.pos.z,r:TUNE.catchD+.4,txt:'Talk to Dez (no grabbing)',fn:()=>talkDown(M,inCar?'car':onBike?'bike':'foot')});if(d>14&&!inCar){/* got his breath back */R.stamina=35;D.st='run';R.state='run';R.tired=0}}
  /* HUD: how close you are, how much he has left */
  if(D.st==='run'||D.st==='winded'){F.objs.push([D.st==='winded'?'He\'s done. Walk up and talk to him (E). No grabbing: he\'s a kid.':'Keep up with Dez: stay close and he tires out. Then talk him down.',false]);
    if(M.chaseT<14&&!onBike&&!inCar)F.objs.push(['Earl\'s loaner bike is by the mart: get on with E, ring the bell with H',false]);
    if(inCar)F.objs.push(['The minivan won\'t fit in the yards. Bike or feet.',false,'warn']);
    F.target={x:R.pos.x,z:R.pos.z,label:'Dez'};
    F.meters.push({id:'keep',label:'Keep up',v:clamp(d,0,80),max:80,style:'bands',zones:[[0,12,'good','On him'],[12,35,'warn','Close'],[35,80,'bad','Losing him']]});
    F.meters.push({id:'legs',label:'His legs',v:R.stamina,max:100,style:'bar',warn:25,warnBelow:true,sub:R.stamina<15?'winded':Math.round(R.stamina)+'%'})}
  else if(D.st==='gone'){F.objs.push(['Lost him. Follow the brrrrr of the spoke card (the pings on the minimap)',false]);if(D.ping)F.target={x:D.ping.x,z:D.ping.z,label:'brrrrr?'}}
  if(D.R&&D.st!=='hidden'){const dd=Math.hypot(me.x-R.pos.x,me.z-R.pos.z);const Au=AU();if(Au&&dd<60&&R.spd>1.2){D.brr=D.brr||{};RN().brrr(R.spd*(1-dd/80),dt,D.brr)}}}
function talkDown(M,how){const a=A(),D=M.dez;if(M.caught)return;M.caught=true;M.caughtHow=how;D.st='talk';D.R.stop();clueAdd(M,'dez');
  talk(M,{who:'dez',face:{x:D.R.pos.x,z:D.R.pos.z},lines:[['dez',"(hands on knees) Man. You ride like... a dad. Like a really determined dad."]],rounds:[
    {who:'dez',tell:'[Dez is scared and trying very hard not to look it.]',options:[
      {reg:'real',text:"Nobody's in trouble yet. That's my son's bike. He's eight. He named it.",good:true,reply:[['dez',"(looks at the bike) ...It's got a NAME? Aw, man."]]},
      {reg:'joke',text:"I'm forty-three. I haven't sprinted since a Blockbuster closed. You owe me a knee.",reply:[['dez',"(almost laughs) ...You were really slow, though."]]},
      {reg:'tough',text:"You're in a lot of trouble, kid.",reply:[['dez',"(flinches) I KNOW, okay? I know."],['you',"...Sorry. That came out more cop than I meant."]]}]},
    {who:'dez',tell:'[He keeps glancing toward 5th St.]',options:[
      {reg:'real',text:"Who are you selling them for?",good:true,reply:[['dez',"Guy named Vic. Lock-up garage on 5th. He pays us ten bucks a bike, man. I'm saving for a car."],['you',"A car. You're fourteen."],['dez',"For LATER."]]},
      {reg:'over',text:"When I was fourteen I sold my dad's lawnmower to buy a skateboard. I still can't skateboard.",good:true,reply:[['dez',"(snorts) ...Okay. It's Vic. Lock-up garage on 5th. Ten bucks a bike. I'm saving for a car."]]},
      {reg:'comp',text:"You rode that tiny bike like a pro. Knees up to your ears.",reply:[['dez',"Right?? It's actually really fast. (sighs) It's Vic. Garage on 5th. Ten bucks a bike."]]}]}],
    done:picks=>{M.dezGood=picks.filter(p=>p.good).length;D.st='walk';D.walkTo={x:places().meet.x,z:places().meet.z};
      sayAll([['dez',"I'll wait at the mart with the little dude's bike. I'm not running. My legs are done."],['earl',"(phone) Ten bucks a bike? I'll pay him twelve to FIX them. Bike library's hiring. Tell him."],['you',"Vic. 5th St. Grown-ups only."]],true);
      a.CP.mark('garage')}})}

/* Dez on the bike, on foot, waiting, walking back to the mart */
function dezTick(dt,M){const a=A(),D=M.dez;if(!D)return;const R=RN();if(!R)return;D.t+=dt;
  if(!D.d&&has('nb_kid')){D.d=person('nb_kid',{scale:1.12})}
  if(D.st==='wait'||D.st==='spooked'){if(D.d){D.d.root.position.set(D.x,0,D.z);D.d.root.rotation.y=Math.atan2(D.b.position.x-D.x,D.b.position.z-D.z)*0+Math.PI*.5+Math.PI;a.pose(D.d,dt,{moving:false,aim:false})}R.spin(D.b,dt,{spd:0});return}
  if(D.R&&(D.st==='run'||D.st==='gone'||D.st==='winded'||D.st==='talk')){const r=D.R;D.b.position.set(r.pos.x,a.groundAt?a.groundAt(r.pos.x,r.pos.z):0,r.pos.z);D.b.rotation.y=r.yaw+Math.PI/2;
    R.spin(D.b,dt,{spd:r.spd,steer:r.steer*.5,lean:r.lean,pedal:r.spd>.5&&D.st!=='talk'?1:0});
    if(D.d){if(D.st==='winded'||D.st==='talk'){/* off the bike, hands on knees */const fx=Math.cos(r.yaw),fz=-Math.sin(r.yaw);D.d.root.position.set(r.pos.x+fx*.7,0,r.pos.z+fz*.7);D.d.root.rotation.y=r.yaw+Math.PI;D.riding=false;
        a.pose(D.d,dt,{moving:false,aim:false,mode:D.st==='winded'?'crouch':'stand'})}
      else{D.d.root.position.set(r.pos.x,0,r.pos.z);D.d.root.rotation.y=r.yaw+Math.PI;D.riding=true;a.pose(D.d,dt,{mode:'sit',aim:false,moving:false})}}return}
  if(D.st==='walk'&&D.walkTo&&D.d){const r=D.R,dx=D.walkTo.x-r.pos.x,dz=D.walkTo.z-r.pos.z,l=Math.hypot(dx,dz);if(l>1){const s=Math.min(l,1.5*dt);r.pos.x+=dx/l*s;r.pos.z+=dz/l*s;r.yaw=Math.atan2(-dx,-dz);a.collide(r.pos,.35)}else D.st='parked';
    const fx=Math.cos(r.yaw),fz=-Math.sin(r.yaw);D.d.root.position.set(r.pos.x+fx*.55,0,r.pos.z+fz*.55);D.d.root.rotation.y=r.yaw+Math.PI;D.riding=false;a.pose(D.d,dt,{moving:l>1,speed:.5,aim:false});
    D.b.position.set(r.pos.x,0,r.pos.z);D.b.rotation.y=r.yaw+Math.PI/2;R.spin(D.b,dt,{spd:l>1?1.5:0,pedal:0});return}
  if((D.st==='parked'||D.st==='hidden')&&D.d){const r=D.R;D.d.root.visible=D.st!=='hidden';D.b.visible=D.st!=='hidden'||M.stage==='bikes';if(D.st==='parked')a.pose(D.d,dt,{moving:false,aim:false,mode:'sit'})}}
/* the rider pose is IK on top of the sit pose, after HT.People.update */
J.on('pose',dt=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='bike'||M.state!=='go')return;const D=M.dez,R=RN();if(D&&D.d&&D.riding&&R)R.ride(D.d,D.b,{lean:D.R?D.R.lean:0,hunch:.42,look:D.R&&D.R.t%3<.6?.5:0});else if(D&&D.d&&R)R.unride(D.d)});

/* ---------------- the garage ---------------- */
function stGarage(dt,M,F){const a=A(),P=a.P,Pl=places(),G=Pl.garage,D=M.dez;
  if(!M.garage){garageProps(M);try{a.wmSetWindow(a.wmWindow(G.door.x,G.door.z,16))}catch(e){}M.garT=0}M.garT+=dt;
  /* family and kids clear first: no guns within 25 m of Dez */
  const dezAt=D&&D.R&&D.st!=='hidden'?D.R.pos:null;const clear=!dezAt||(Math.hypot(dezAt.x-G.door.x,dezAt.z-G.door.z)>TUNE.dezClear&&Math.hypot(dezAt.x-P.pos.x,dezAt.z-P.pos.z)>TUNE.famClear);
  if(D&&D.st==='hidden'&&M.garT>.5&&!M.dezLeft){M.dezLeft=true;D.d&&(D.d.root.visible=false);D.b.visible=false;say('you',"There goes the kid out the back. Good. Go home, kid.",true)}
  if(clear&&!M.adults.length){spawnAdults(M)}
  if(M.noGuns&&clear&&M.adults.length){guns(M,true);music('combat',.9)}
  const alive=M.adults.filter(e=>e.state==='idle'),surr=M.adults.filter(e=>e.state==='surrender');
  F.objs.push([!clear?'Let Dez get clear first: nobody draws near a kid':'The lock-up garage on 5th St: Vic and his guys. Zip-tie anyone who gives up.',false]);
  if(M.adults.length)F.objs.push(['Adults dealt with · '+M.adults.filter(e=>e.state!=='idle').length+'/'+M.adults.length,false]);
  const tgt=surr[0]||alive.find(e=>e.vic)||alive[0];F.target=tgt?{x:tgt.pos.x,z:tgt.pos.z,label:tgt.vic?'Vic':'Zip-tie'}:{x:G.front.x,z:G.front.z,label:'The garage'};
  /* Vic folds when his guys are down or tied */
  const vic=M.adults.find(e=>e.vic);if(vic&&vic.state==='idle'&&M.adults.filter(e=>!e.vic).every(e=>e.state!=='idle')){a.surrender(vic);say('vic',"Okay! OKAY! It's bikes! It's just bikes, man!",true)}
  if(M.adults.length&&M.adults.every(e=>e.state==='cuffed'||e.state==='dead')){guns(M,false,"Fight's over. Holstered.");a.CP.mark('bikes');music('hub');listOwners(M)}}
function spawnAdults(M){const a=A(),G=places().garage;const spots=[[G.front.x,G.door.z-1.2,true],[G.front.x-1.6,G.door.z+1.8],[G.x0+1.6,G.door.z+.6]];
  for(const[x,z,vic]of spots){const e=a.spawnEnemy(x,z,false);e.noLeash=true;e.home={x,z};if(vic){e.vic=true;e.hp=e.maxhp=70;const t=e.tag;if(t)t.textContent='VIC · BIKE GUY';}M.adults.push(e)}
  a.rebuildTargets();sayAll([['vic',"Hey! Private property, pal. This is a... bike... storage... facility."],['you',"It's got a sign that says ten dollars a bike, Vic."]],true)}
function listOwners(M){clueAdd(M,'owners');sayAll([['earl',"(phone) Folks have been calling the library all week. I'm sending you the list. Match the tags to the owners and I'll bring the truck."],
  ['you',"Ten bucks a bike. Unbelievable."]],true)}

/* ---------------- whose bike is whose ---------------- */
function stBikes(dt,M,F){const a=A(),P=a.P,Pl=places();if(!M.loot)garageProps(M);if(M._tags){for(const id of M._tags){const l=M.loot.find(x=>x.id===id);if(l)tagDone(M,l,true)}M._tags=null}
  const left=M.loot.filter(l=>!l.done);F.objs.push(['Tag every bike with its owner: walk up to one and press E · '+(M.loot.length-left.length)+'/'+M.loot.length,false]);
  if(M.owrong)F.objs.push(['Wrong guesses cost time: '+M.owrong,false,'warn']);
  let best=null,bd=1e9;for(const l of left){const d=Math.hypot(l.x-P.pos.x,l.z-P.pos.z);if(d<bd){bd=d;best=l}}if(best)F.target={x:best.x,z:best.z,label:'Stolen bike'};
  if(!M.talk)for(const l of left)F.taps.push({x:l.x,z:l.z,r:1.6,txt:'Read the tag',fn:()=>ident(M,l)});
  if(!left.length&&!M.bikesDone){M.bikesDone=true;a.CP.mark('home');sayAll([['earl',"(phone) That's every one of them. Truck's on the way. Go give your boy his bike."],['you',"On it."]],true)}}
function ident(M,l){const a=A(),L=LOOT.find(x=>x.id===l.id);const all=Object.keys(OWNERS).filter(k=>k!==L.owner);const ch=[L.owner];while(ch.length<3){const k=all[(l.id.length*7+ch.length*5+M.owrong)%all.length];if(!ch.includes(k))ch.push(k);else all.push(all.shift())}
  ch.sort((p,q)=>((p.length*13+l.id.length)%7)-((q.length*13+l.id.length)%7));
  talk(M,{who:'you',face:{x:l.x,z:l.z},lines:[['you','Tag: "'+L.tag+'". And '+L.tell+'.']],rounds:[{who:'you',tell:'[Whose bike is this? Earl\'s list is on your board.]',
    options:ch.map(k=>({reg:'real',tag:'Owner',text:OWNERS[k],reply:k===L.owner?[['you',pick(["That's "+OWNERS[k]+"'s. Obviously.","Yep. "+OWNERS[k]+". Going home.","Bingo. "+OWNERS[k]+"."])]]:[['you',pick(["No... no, that doesn't add up.","Hm. Wrong. Let me look again.","Nope. That's not it."])]],
      then:()=>{if(k===L.owner)tagDone(M,l);else{M.owrong++;M.elapsed+=TUNE.wrongOwner;a.feed('Wrong owner','bad','+'+TUNE.wrongOwner+' s')}}}))}]})}
function tagDone(M,l,quiet){if(l.done)return;l.done=true;M.tagged++;if(l.tagMesh&&l.tagMesh.material)l.tagMesh.material.color.set(A().lin('#9fe58a'));if(!quiet){A().feed('Tagged: '+LOOT.find(x=>x.id===l.id).name,'trust','going home');A().addTrust(.5,'river')}}

/* ---------------- home: Tyler's bike to Tyler ---------------- */
function stHome(dt,M,F){const a=A(),P=a.P,Pl=places(),D=M.dez,cv=a.CV;
  if(!M.bikeIn){/* get Tyler's bike: from Dez at the mart, or the garage floor if he ran */const at=D&&D.R?{x:D.R.pos.x,z:D.R.pos.z}:Pl.meet;
    F.objs.push([M.caught?'Get Tyler\'s bike from Dez at the mart':'Tyler\'s bike is in the garage: pick it up (E)',false]);F.target={x:at.x,z:at.z,label:'Tyler\'s bike'};
    if(D&&D.b){D.b.visible=true;if(D.st==='hidden'){D.R.pos.x=places().garage.inside.x;D.R.pos.z=places().garage.inside.z;D.b.position.set(D.R.pos.x,0,D.R.pos.z)}}
    if(!cv)F.taps.push({x:at.x,z:at.z,r:2.6,txt:M.caught?'Take Tyler\'s bike from Dez':'Pick up Tyler\'s bike',fn:()=>{M.bikeIn=true;if(D){D.b.visible=false}
      if(M.caught){sayAll([['dez',"Tell the little dude sorry. And tell him it really is fast."],['you',"Earl's at the library tomorrow at nine. He says twelve bucks a bike to fix them."],['dez',"(trying not to look excited) ...Nine. Okay."]],true)}
      else say('you',"Got it. Into the van with you, Red Rocket.",true);M.vanBike=true}});return}
  if(!M.given){F.objs.push(['Take Tyler\'s bike home. He\'s waiting on the porch.',false]);F.target={x:Pl.tyler.x,z:Pl.tyler.z,label:'Tyler'};
    if(!cv&&Math.hypot(P.pos.x-Pl.tyler.x,P.pos.z-Pl.tyler.z)<3)F.taps.push({x:Pl.tyler.x,z:Pl.tyler.z,r:3,txt:'Give Tyler his bike',fn:()=>giveBike(M)});return}
  /* Tyler rides laps of the lawn */
  F.objs.push(['Brrrrrrrr.',true]);if(!M.exitOpen){M.exitOpen=true}}
function giveBike(M){const a=A(),Pl=places(),R=RN();M.given=true;M.tyRide={t:0};const b=R.bike({size:'kid',color:TYLER.col,streamers:TYLER.streamers,card:true,dent:true,sticker:'dino',fenders:true});a.wmAdd(b);M.tyBike=b;
  b.position.set(Pl.tyler.x,0,Pl.tyler.z+1);music('victory');const Au=AU();if(Au)try{Au.stinger('win')}catch(e){}
  sayAll([['tyler',"MY BIKE! The card's still in it! Dad! DAD!"],['you',"Pinky promise, buddy."],['tyler',"Brrrrrrrrrrrrrr!"],['you',"Helmet. HELMET."]],true)}
J.on('pose',dt=>{const a=A(),M=a&&a.M;if(!M||!M.def||M.def.id!=='bike'||!M.tyRide||!M.ty||!M.tyBike)return;const R=RN(),Pl=places(),T=M.tyRide;T.t+=dt;
  /* a lap of the front lawn and sidewalk: an oval in front of the house */
  const cx=Pl.tyler.x-2,cz=Pl.tyler.z-Pl.home.face*-3.2,rx=4.2,rz=1.8,w=T.t*.75,x=cx+Math.cos(w)*rx,z=cz+Math.sin(w)*rz,yaw=Math.atan2(Math.sin(w)*rx,-Math.cos(w)*rz);
  M.tyBike.position.set(x,0,z);M.tyBike.rotation.y=yaw+Math.PI/2;R.spin(M.tyBike,dt,{spd:3.2,steer:.25,lean:-.12});const d=M.ty.d;d.root.position.set(x,0,z);d.root.rotation.y=yaw+Math.PI;a.pose(d,dt,{mode:'sit',aim:false,moving:false});
  try{HT.People.update&&0}catch(e){}R.ride(d,M.tyBike,{lean:-.12,hunch:.3});M.tyBrr=M.tyBrr||{};R.brrr(3.2,dt,M.tyBrr)});

/* ---------------- teardown: overlays, the talk strip, listings ---------------- */
const LIVE={M:null};
J.on('hud',()=>{const a=A(),M=a&&a.M,mine=!!(M&&M.def&&M.def.id==='bike');
  if(LIVE.M&&LIVE.M!==M){teardown(LIVE.M,mine&&M.state==='go');LIVE.M=null}
  if(mine&&M.state==='go'){LIVE.M=M;return}
  if(mine){endTalk(M);boardKill(M);resultCard(M)}});
function teardown(m,keepListings){const a=A();endTalk(m);boardKill(m);const R=RS();if(R&&!keepListings)R.clear('bike');const RR=RN();
  if(RR){if(m.dez&&m.dez.d)RR.release(m.dez.d);if(m.ty&&m.ty.d)RR.release(m.ty.d)}
  if(m.garMat){for(const x of m.garMat)try{x.dispose()}catch(e){}m.garMat=null}m.nav=null;
  /* Earl's loaner leaves the world's car list, colliders and solids with the job */
  const e=m.loaner,L=a&&a.L;if(e&&L){if(a.CV===e)try{a.exitCar()}catch(err){}const k=L.cars?L.cars.indexOf(e):-1;if(k>=0)L.cars.splice(k,1);if(e.col)Object.assign(e.col,{x0:-1e4,z0:-1e4,x1:-1e4,z1:-1e4,off:true,ob:null});
    if(L.solids){const ms=new Set();e.obj.traverse(o=>{if(o.isMesh)ms.add(o)});for(let i=L.solids.length-1;i>=0;i--)if(ms.has(L.solids[i]))L.solids.splice(i,1)}
    e.obj.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()});if(e.obj.parent)e.obj.parent.remove(e.obj);m.loaner=null}
  for(const k of['rackBikes'])if(m[k]){for(const b of m[k])b.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()});m[k]=null}
  for(const k of['garage','clueG','tyBike'])if(m[k]){m[k].traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()});m[k]=null}
  if(m.dez&&m.dez.b){m.dez.b.traverse(o=>{if(o.isMesh&&o.geometry)o.geometry.dispose()})}m.dez=null;m.ty=null;m.nbD=null}
function resultCard(M){if(M.resDone)return;const r=document.querySelector('.ht-result .col');if(!r)return;M.resDone=true;const ok=M.state==='won';
  const h=r.querySelector('h2');if(h)h.textContent=ok?(M.caught?'The bike\'s home. So is everybody else\'s.':'The bike\'s home. Dez got away. For now.'):'The bikes are still in that garage.';
  const sx=r.querySelector('.ht-stats');if(sx&&ok){const t=Math.round(M.elapsed),tt=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');
    const rows=[['Clues',M.found.filter(x=>CLUES[x]).length+'/'+Object.keys(CLUES).length,'on the board'],['Dez',M.caught?'Talked down':'Got away',M.caught?(M.caughtHow==='foot'?'on foot':M.caughtHow==='bike'?'on Earl\'s loaner':'from the minivan'):'followed the brrrr'],
      ['Bikes home',(LOOT.length+1)+'',M.owrong?M.owrong+' wrong guess'+(M.owrong>1?'es':''):'every tag right'],['Time',tt,M.wrong?M.wrong+' wrong listing'+(M.wrong>1?'s':''):'']];
    const med=[...sx.children].find(c=>/Medal/.test(c.textContent));sx.innerHTML=rows.map(([k,v,s])=>'<div><b>'+esc(k)+'</b><span class="ht-num">'+esc(v)+'</span>'+(s?'<small>'+esc(s)+'</small>':'')+'</div>').join('');if(med)sx.appendChild(med)}}

/* ---------------- the scripted player (dev/jobs-check.js) ----------------
   Plays it in order like a person who read the board: the rack clues, Linda / Phil / Walt (good lines), the laptop (Tyler's listing),
   drives to the mart, chases Dez on foot at sprint speed until he's winded, talks him down, the garage (the adults give up and get
   zip-tied), tags every bike, takes the bike home. o.fail: lets Dez go, walks into the garage and stands there. */
function bot(a,t,o){const M=a.M,P=a.P;if(!M||M.state!=='go'||!M.found)return null;const B=M.bot||(M.bot={}),Pl=places();o=o||{};
  const tp=(x,z)=>{P.pos.set(x,0,z);a.collide(P.pos,.35)};
  const walk=(p,sp)=>{const dx=p.x-P.pos.x,dz=p.z-P.pos.z,d=Math.hypot(dx,dz);if(d<.5)return true;const s=Math.min(d,(sp||6)/30);P.pos.x+=dx/d*s;P.pos.z+=dz/d*s;a.collide(P.pos,.35);P.yaw=Math.atan2(-dx,-dz);return false};
  if(M.talk){const V=M.talk.V;if(V.choice){const ops=M.talk.o.rounds;const r=V.choice.list;let k=0;
      if(M.stage==='bikes'){const l=M.talk.o.lines[0][1];const L=LOOT.find(x=>l.indexOf(x.tag)>=0);k=Math.max(0,r.findIndex(c=>L&&c.text===OWNERS[L.owner]));if(o.sloppy&&!B.sl){B.sl=1;k=(k+1)%r.length}}
      else{const rr=M.talk.o.rounds[M.talk.picks.length];k=Math.max(0,rr.options.findIndex(x=>x.good))}V.choose(k)}else V.skip();return null}
  const st=M.stage;if(st!=='meet'&&st!=='chase'&&a.CV&&a.CV.type!=='bike'&&st!=='home'){a.exitCar();return null}
  if(st==='rack'){const id=['lock','wrapper','tracks'].find(i=>!M.found.includes(i));if(!id)return null;const p=M.cluePts[id];if(!walk({x:p.x+.4,z:p.z+.3},5))return null;a.useTap=true;return null}
  if(st==='leads'){if(M.laptopOpen){/* the shop is open: message the right seller (the harness can't click) */const R=RS(),l=R&&R.get(o.fail?'b_dent':'b_tyler');if(l&&!B.msg){B.msg=1;if(o.fail){l.chat.reply(0,l);}l.chat.reply(0,l)}
        try{HT.Shop.close()}catch(e){}if(window.__ht)window.__ht.running=true;M.laptopOpen=false;return null}
      const p=Pl.nb.find(q=>!M.nb[q.id]);if(p&&!o.fail){if(!M.nbD||!M.nbD[p.id]){tp(p.talk.x,p.talk.z+3);return null}if(!walk(p.talk,5))return null;a.useTap=true;return null}
      tp(Pl.laptop.x+.5,Pl.laptop.z-1);a.useTap=true;return null}
  if(st==='meet'){if(a.CV){a.exitCar()}const D=M.dez;if(!D){tp(Pl.meet.x-30,Pl.meet.z+4);return null}walk({x:D.x-1,z:D.z},4);return null}
  if(st==='chase'){const D=M.dez;if(!D||!D.R)return null;if(o.fail){/* let him go */tp(Pl.meet.x-60,Pl.meet.z+2);return null}
    if(D.st==='winded'){walk(D.R.pos,6);a.useTap=true;return null}if(D.st==='gone'){walk(D.ping||D.R.pos,7.2);return null}walk(D.R.pos,7.4);return null}
  if(st==='garage'){const G=Pl.garage;if(!M.adults.length){walk(G.front,7);return null}
    if(o.fail){tp(G.front.x+.5,G.front.z);P.hp=Math.min(P.hp,30);return null}
    const s=M.adults.find(e=>e.state==='surrender');if(s){tp(s.pos.x+.9,s.pos.z);a.useTap=true;return null}
    const e=M.adults.find(e=>e.state==='idle'&&!e.vic)||M.adults.find(e=>e.state==='idle');if(e){if(t%8===0)a.surrender(e);tp(e.pos.x+6,e.pos.z);return null}return null}
  if(st==='bikes'){const l=M.loot&&M.loot.find(x=>!x.done);if(!l)return null;if(!walk(l,6))return null;a.useTap=true;return null}
  if(st==='home'){if(!M.bikeIn){const D=M.dez,at=D&&D.R&&D.st!=='hidden'?D.R.pos:Pl.garage.inside;if(a.CV)a.exitCar();tp(at.x+1,at.z);a.useTap=true;return null}
    if(!M.given){if(a.CV)a.exitCar();tp(Pl.tyler.x+1.2,Pl.tyler.z);a.useTap=true;return null}
    if(M.exitOpen){const c=M.car;if(a.CV===c)return null;tp(c.pos.x+2.4,c.pos.z);a.useTap=true;return null}}
  return null}
})();
