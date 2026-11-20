/* =====================================================================
   HT.Social: conversations (SPEC3 4.6 a). Built with *Small Talk*; reused by Grand Opening, Crossing Guard, Chain Reaction,
   Hands Off and Suds Up. The disguise / cover / politeness half (4.6 b) goes in its own section at the end of this file.
   Loaded on demand by a job file (js/jobs/talk.js injects <script src="js/social.js"> and css/social.css once).

   PURE LOGIC (works in Node, see dev/social.test.js)
     HT.Social.TABLE                 rapport / awkward per register, by the NPC's mood (the SPEC3 4.6 table, plus 'tough' and silence)
     HT.Social.convo(spec) -> C      a conversation: C.options() C.pick(i|opt) C.silence() C.reset(keep) C.nudge(d) C.save() C.load(s)
       spec {npc,name,mood,rapport,awkward,win,lose,seed, rounds:[{prompt,options:[...]}] | deck:[line,...], regs:['joke','real','over'],
             swap:.35 (chance one off-mood slot becomes a 'comp' or 'tough' line), moods:{mood:{tells:[...]}} }
       line  {id,reg,text,custom(C,s)->{dr,da,hit} (own scoring),events:{hit|miss|any:[[who,text],...]} (crew chiming in),reply|{hit,meh,miss,land},to|{hit,miss}|[moods],topic,opens:[ids],closes:{id:rounds},needs:id|[ids],
             min,max (rapport gates),land (joke luck 0..1),sure (always lands),pri (deck priority),once (default true),
             fx(C,res) (custom effect after scoring), say (who speaks it, default 'you'), note (Gary-style note when it hits)}
       res   {line,reg,dr,da,hit:'hit'|'meh'|'miss'|'land',mood,prev,reply,tell,done:'win'|'lose'|null,notes:[...],events:[...]}
     HT.Social.check({mood,options,seed}) -> one-round version for doorsteps and talk-downs: {options, pick(i)}

   PRESENTATION (browser only)
     HT.Social.view({cast,host}) -> V  the dialogue strip: typed subtitles with voice blips, bracketed tells, timed choices (keys 1-4,
       W/S or arrows + E/Enter/Space/click, tap on touch), twin meters, letterbox, the notes card. V.update(dt) runs on game time.
     HT.Social.scene(V) -> S           a beat queue: S.say(who,text,o) S.tell(text) S.wait(s) S.run(fn) S.choose(list,o) S.update(dt)
     HT.Social.tells                   body language on HT.People characters: attach(dude,{mood:()=>..,speaking:()=>..,look:()=>..})
     HT.Social.director(camera)        camera cuts between named shots with a slow push-in: D.cut(shot) D.update(dt) -> true
   ===================================================================== */
(function(root){'use strict';
const HT=root.HT=root.HT||{};if(HT.Social&&HT.Social._ver)return;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function rng(seed){let s=(seed>>>0)||0x9e3779b9;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}

/* ---- the register table (SPEC3 4.6): [rapport, awkward] ---- */
const TABLE={
  bored:    {joke:[18,0], real:[6,5],   over:[10,8], comp:[4,10], tough:[-8,18], silence:[0,10]},
  scared:   {joke:[-2,15],real:[20,0],  over:[8,5],  comp:[5,5],  tough:[-10,20],silence:[5,3]},
  defensive:{joke:[4,5],  real:[-5,10], over:[18,0], comp:[8,5],  tough:[-8,18], silence:[0,8]},
  friendly: {joke:[10,0], real:[10,0],  over:[10,2], comp:[10,0], tough:[-6,14], silence:[2,4]}};
const MOODS=['bored','scared','defensive','friendly'];
const REGS={joke:{label:'Dad Joke',key:'J'},real:{label:'Real Talk',key:'R'},over:{label:'Overshare',key:'O'},comp:{label:'Compliment',key:'C'},
  tough:{label:'Bad Cop',key:'!'},grill:{label:'The Grill',key:'G'},go:{label:'Wrap Up',key:'✓'},special:{label:'',key:'★'}};
/* the register that lands for each mood (what a good listener picks) */
const BEST={bored:'joke',scared:'real',defensive:'over',friendly:null};
/* where a mood goes after a pick when the line doesn't say: hits relax him, misses push him back into his shell */
const DRIFT={hit:{joke:['defensive','scared','bored'],real:['bored','defensive','defensive'],over:['bored','scared','friendly'],comp:['defensive','bored','scared'],tough:['scared'],silence:['bored']},
  miss:{joke:['defensive','scared'],real:['defensive','scared'],over:['scared','bored'],comp:['defensive','bored'],tough:['scared','defensive'],silence:['defensive','bored']}};
const HIT_AT=10;/* rapport gain that counts as "it landed" */
const AWK_RELIEF=6;/* a clean hit takes a little awkward off the table */

function arr(x){return x==null?[]:Array.isArray(x)?x:[x]}
function convo(spec){spec=spec||{};
  const C={spec,npc:spec.npc||'npc',name:spec.name||spec.npc||'They',win:spec.win!=null?spec.win:80,lose:spec.lose!=null?spec.lose:100,
    regs:spec.regs||['joke','real','over'],table:spec.table||TABLE};
  const st=C.st={mood:spec.mood||'bored',rapport:spec.rapport||0,awkward:spec.awkward||0,lines:0,round:0,used:[],topics:{},closed:{},resets:0,silences:0,
    hits:0,misses:0,lands:0,picks:[],notes:[],flags:{},seed:(spec.seed>>>0)||12345,draws:0,offer:null};
  let R=rng(st.seed);const rnd=()=>{st.draws++;return R()};
  /* reproducible after load: replay the same number of draws */
  function reseed(){R=rng(st.seed);for(let i=0;i<st.draws;i++)R()}
  const open=id=>!!st.topics[id]&&!(st.closed[id]>0);
  function avail(l){if(l.once!==false&&st.used.includes(l.id))return false;
    for(const n of arr(l.needs))if(!open(n))return false;for(const n of arr(l.not))if(open(n)||st.flags[n])return false;
    if(l.topic&&st.closed[l.topic]>0)return false;if(l.min!=null&&st.rapport<l.min)return false;if(l.max!=null&&st.rapport>l.max)return false;
    if(l.flag&&!st.flags[l.flag])return false;if(l.when&&!l.when(C))return false;return true}
  function choose(list){if(!list.length)return null;const top=Math.max(...list.map(l=>l.pri||0));const best=list.filter(l=>(l.pri||0)===top);return best[Math.floor(rnd()*best.length)]}
  /* the offer for this round: static rounds, or one line per register from the deck */
  C.options=function(){if(st.offer)return st.offer.map(id=>C.line(id)).filter(Boolean);let out;
    if(spec.rounds){const r=spec.rounds[Math.min(st.round,spec.rounds.length-1)];out=(r&&r.options||[]).map((o,k)=>Object.assign({id:'r'+st.round+'_'+k},o))}
    else{const deck=spec.deck||[],regs=C.regs.slice(),best=BEST[st.mood];
      /* sometimes an off-mood slot becomes a compliment or a bad-cop line: there is always one right register on the table */
      if((spec.swap||0)>0&&rnd()<spec.swap){const cand=regs.map((r,k)=>k).filter(k=>regs[k]!==best);const k=cand[Math.floor(rnd()*cand.length)];if(k!=null)regs[k]=rnd()<.6?'comp':'tough'}
      out=[];for(const reg of regs){let l=choose(deck.filter(l=>l.reg===reg&&avail(l)&&!out.includes(l)));
        if(!l&&reg!==regs[0])l=choose(deck.filter(l=>C.regs.includes(l.reg)&&avail(l)&&!out.includes(l)));if(l)out.push(l)}
      /* specials (follow-ups the NPC asked for) ride along in the slot of their register */
      for(const l of deck.filter(l=>l.reg==='special'&&avail(l)))if(out.length<4)out.push(l)}
    C._lines=out;st.offer=out.map(l=>l.id);return out};
  C.line=id=>(spec.deck||[]).find(l=>l.id===id)||(C._lines||[]).find(l=>l.id===id)||null;
  function score(reg,mood,l){const row=C.table[mood]||C.table.bored;let [dr,da]=row[reg]||row.real||[0,0];let hit;
    if(l&&l.sure){dr=Math.max(dr,l.sure===true?15:l.sure);da=0}
    else if(reg==='joke'&&mood!=='bored'&&mood!=='friendly'&&l&&l.land&&rnd()<l.land){dr=12;da=0;hit='land'}
    if(l&&l.bonus){dr+=l.bonus[0]||0;da+=l.bonus[1]||0}
    if(!hit)hit=dr>=HIT_AT?'hit':dr<=0?'miss':'meh';return{dr,da,hit}}
  function moveMood(l,reg,hit){let to=l&&l.to;if(to&&!Array.isArray(to)&&typeof to==='object')to=to[hit]||to[hit==='land'?'hit':hit==='meh'?'hit':'miss']||null;
    let pool=to?arr(to):(DRIFT[hit==='miss'?'miss':'hit'][reg]||[st.mood]);
    /* the warmer he gets, the likelier he just relaxes */
    if(!to&&hit!=='miss'&&st.rapport>=55&&rnd()<(st.rapport-40)/100)pool=['friendly'];
    if(!to&&hit==='miss'&&st.mood==='friendly'&&rnd()<.5)pool=['friendly'];
    const m=pool[Math.floor(rnd()*pool.length)]||st.mood;return MOODS.includes(m)?m:st.mood}
  function after(res){res.done=st.rapport>=C.win&&!st.flags.won?'win':st.awkward>=C.lose?'lose':null;if(res.done==='win')st.flags.won=true;return res}
  function tick(){for(const k in st.closed)if(st.closed[k]>0)st.closed[k]--;st.round++;st.offer=null}
  C.pick=function(i){const list=C._lines&&st.offer?C._lines:C.options();const l=typeof i==='object'?i:list[i];if(!l)return null;
    const reg=l.reg==='special'?(l.as||'real'):l.reg,prev=st.mood;let s=score(reg,prev,l);
    if(l.custom){const c=l.custom(C,s)||{};s={dr:c.dr!=null?c.dr:s.dr,da:c.da!=null?c.da:s.da,hit:c.hit||(c.dr!=null?(c.dr>=HIT_AT?'hit':c.dr<=0?'miss':'meh'):s.hit)}}
    const r0=st.rapport,a0=st.awkward;st.rapport=clamp(st.rapport+s.dr,0,100);
    st.awkward=clamp(st.awkward+s.da-(s.hit==='hit'&&s.dr>=15||s.hit==='land'?AWK_RELIEF:0),0,100);
    st.lines++;if(l.id)st.used.push(l.id);st.picks.push((l.id||'?')+':'+s.hit);if(s.hit==='miss')st.misses++;else if(s.hit==='land'){st.lands++;st.hits++}else if(s.hit==='hit')st.hits++;
    const res={line:l,reg,dr:st.rapport-r0,da:st.awkward-a0,hit:s.hit,prev,mood:prev,reply:null,notes:[],events:[]};
    if(s.hit!=='miss'){for(const t of arr(l.opens))st.topics[t]=true;if(l.note&&!st.notes.includes(l.note)){st.notes.push(l.note);res.notes.push(l.note)}if(l.set)st.flags[l.set]=true}
    for(const t in (l.closes||{}))if(s.hit==='miss'||l.closeAlways)st.closed[t]=l.closes[t];
    if(l.topic&&s.hit==='miss'&&l.closeOnMiss!==false)st.closed[l.topic]=Math.max(st.closed[l.topic]||0,2);
    st.mood=moveMood(l,reg,s.hit);res.mood=st.mood;
    const rp=l.reply;res.reply=typeof rp==='function'?rp(C,res):rp&&typeof rp==='object'?(rp[s.hit]||rp[s.hit==='land'?'hit':s.hit==='meh'?'hit':'miss']||rp.hit||null):rp||null;
    if(l.events){const ev=l.events,k=s.hit==='land'?'hit':s.hit==='meh'?'hit':s.hit;for(const e of (ev[k]||[]).concat(ev.any||[]))res.events.push(e)}
    if(l.fx)try{l.fx(C,res)}catch(e){console.warn('social fx',e)}
    res.tell=C.tell();tick();return after(res)};
  /* the timer ran out: you said nothing. Scared people sometimes like that. */
  C.silence=function(){const prev=st.mood,s=score('silence',prev,null);
    /* a comfortable silence works once in a while, not as a strategy: the second one in a row is just staring */
    const lastSil=/^silence/.test(st.picks[st.picks.length-1]||'');if(s.dr>0&&(lastSil||st.silences>=2)){s.dr=0;s.da=Math.max(s.da,8);s.hit='miss'}const r0=st.rapport,a0=st.awkward;st.rapport=clamp(st.rapport+s.dr,0,100);st.awkward=clamp(st.awkward+s.da,0,100);
    st.silences++;st.picks.push('silence:'+s.hit);st.mood=s.dr>0?(rnd()<.5?prev:'bored'):moveMood(null,'silence',s.hit);tick();
    return after({line:null,reg:'silence',dr:st.rapport-r0,da:st.awkward-a0,hit:s.hit,prev,mood:st.mood,reply:null,notes:[],events:[],tell:C.tell()})};
  /* outside help (a burger, a crew member chiming in): add to the meters, optionally set the mood */
  C.nudge=function(d){d=d||{};const r0=st.rapport,a0=st.awkward;st.rapport=clamp(st.rapport+(d.rapport||0),0,100);st.awkward=clamp(st.awkward+(d.awkward||0),0,100);
    if(d.mood&&MOODS.includes(d.mood))st.mood=d.mood;if(d.note&&!st.notes.includes(d.note))st.notes.push(d.note);if(d.open)for(const t of arr(d.open))st.topics[t]=true;if(d.flag)st.flags[d.flag]=true;
    if(d.round){tick()}else st.offer=null;return after({line:null,reg:d.reg||'nudge',dr:st.rapport-r0,da:st.awkward-a0,hit:(d.rapport||0)>=HIT_AT?'hit':'meh',prev:st.mood,mood:st.mood,reply:null,notes:d.note?[d.note]:[],events:[],tell:C.tell()})};
  /* an awkward overflow: start the scene over (keeps a share of the rapport) */
  C.reset=function(keep,mood){st.resets++;st.silences=0;st.awkward=0;st.rapport=Math.round(st.rapport*(keep==null?.4:keep));st.mood=mood||spec.resetMood||spec.mood||'bored';st.flags.won=st.rapport>=C.win?st.flags.won:false;st.offer=null;return st};
  C.tell=function(){const m=(spec.moods||{})[st.mood];const list=(m&&m.tells)||DEFAULT_TELLS[st.mood]||[];if(!list.length)return null;
    const t=list[(st.round+st.lines)%list.length];return t.replace(/\{name\}/g,C.name)};
  C.best=()=>BEST[st.mood];
  C.save=()=>JSON.parse(JSON.stringify(Object.assign({},st,{offer:null})));
  C.load=s=>{Object.assign(st,JSON.parse(JSON.stringify(s)));st.offer=null;reseed();return C};
  C.open=open;
  return C}
const DEFAULT_TELLS={bored:['[{name} taps a foot. Bored.]'],scared:['[{name} folds his arms tight. Scared.]'],defensive:['[{name} looks away. Defensive.]'],friendly:['[{name} leans in. Friendly.]']};
/* one round (doorsteps, talk-downs): same table, no memory */
function check(o){o=o||{};const C=convo({mood:o.mood||'bored',rounds:[{options:o.options||[]}],win:o.win!=null?o.win:10,seed:o.seed,name:o.name});
  return{options:C.options(),pick:i=>C.pick(i),convo:C}}

const Social={_ver:1,TABLE,MOODS,REGS,BEST,DRIFT,rng,convo,check};
HT.Social=Social;
if(typeof module!=='undefined'&&module.exports)module.exports=Social;
if(typeof document==='undefined'||!document.createElement||!document.body)return;

/* =====================================================================
   PRESENTATION
   ===================================================================== */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AU=()=>HT.Audio&&HT.Audio.ready?HT.Audio:null;
/* voice blips: a short vocal syllable every few letters while a line types out, pitched per character */
const VOWELS={a:'yeah',e:'hey',i:'hey',o:'oi',u:'huh',y:'yeah'};
function blip(cast,ch){const A=AU();if(!A||!cast||!cast.voice)return;const v=cast.voice;try{A.voice(v.kind||'dad',null,{word:VOWELS[ch]||v.word||'hmm',pitch:(v.pitch||1)*(.94+Math.random()*.12)*1.25,vol:v.vol!=null?v.vol:.32})}catch(e){}}

function view(o){o=o||{};const cast=o.cast||{};const host=o.host||document.querySelector('.ht-root')||document.body;
  const el=document.createElement('div');el.className='soc'+(o.cls?' '+o.cls:'');el.innerHTML=
    '<div class="soc-lb top"></div><div class="soc-lb bot"></div>'+
    '<div class="soc-meters"></div>'+
    '<div class="soc-strip"><div class="soc-line"><div class="soc-who"></div><div class="soc-txt"></div><div class="soc-tell"></div><div class="soc-skip">'+(isTouch()?'tap':'<b>E</b>')+' skip</div></div>'+
    '<div class="soc-choices"></div><div class="soc-timer"><i></i></div><div class="soc-toast"></div></div>'+
    '<div class="soc-notes" hidden></div>';
  const $=s=>el.querySelector(s);const who=$('.soc-who'),txt=$('.soc-txt'),tell=$('.soc-tell'),ch=$('.soc-choices'),tm=$('.soc-timer'),tmi=$('.soc-timer i'),line=$('.soc-line'),mt=$('.soc-meters'),toast=$('.soc-toast'),notes=$('.soc-notes');
  const V={el,cast,typing:null,choice:null,sel:0,mounted:false,skipReq:false};
  V.mount=()=>{if(!V.mounted){host.appendChild(el);V.mounted=true;document.body.classList.add('soc-on');void el.offsetWidth;setTimeout(()=>el.classList.add('in'),20);keysOn()}return V};
  V.unmount=()=>{if(V.mounted){el.remove();V.mounted=false;document.body.classList.remove('soc-on');keysOff()}};
  /* a typed line: who speaks, text; o.dur overrides the hold; returns the total time it will take */
  V.say=(id,text,op)=>{op=op||{};const c=cast[id]||{name:id};line.className='soc-line show '+(c.cls||'')+(op.cls?' '+op.cls:'');who.textContent=c.name||id;who.style.color=c.color||'';
    tell.textContent='';txt.innerHTML='';const t=String(text);V.typing={t,i:0,acc:0,cps:op.cps||52,c,hold:op.hold!=null?op.hold:Math.max(1.3,t.length*.032+.7),done:false,el:txt,blipN:0};
    return t.length/V.typing.cps+V.typing.hold};
  V.tell=(t)=>{tell.textContent=t||'';tell.classList.toggle('on',!!t)};
  /* between lines: just who you're reading and how they're sitting */
  V.prompt=(id,t)=>{const c=cast[id]||{name:id};V.typing=null;line.className='soc-line show prompt '+(c.cls||'');who.textContent=c.name||id;who.style.color=c.color||'';txt.textContent='';V.tell(t)};
  V.clearLine=()=>{line.className='soc-line';txt.textContent='';who.textContent='';tell.textContent='';V.typing=null};
  V.busy=()=>!!(V.typing&&!V.typing.done);
  /* choices: [{text, reg, tag, hint}] -> o.onPick(i) / o.onTimeout(); o.time seconds on the clock (0 = no clock) */
  V.choices=(list,op)=>{op=op||{};V.choice={list,op,t:op.time||0,T:op.time||0};V.sel=0;ch.innerHTML='';
    list.forEach((c,k)=>{const b=document.createElement('button');b.className='soc-ch reg-'+(c.reg||'x')+(c.cls?' '+c.cls:'');b.type='button';
      const R=REGS[c.reg]||{};b.innerHTML='<span class="k">'+(k+1)+'</span><span class="r">'+esc(c.tag||R.label||'')+'</span><span class="t">'+esc(c.text)+'</span>'+(c.hint?'<span class="h">'+esc(c.hint)+'</span>':'');
      b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();V.choose(k)});b.addEventListener('mouseenter',()=>{V.sel=k;paint()});ch.appendChild(b)});
    el.classList.add('choosing');tm.style.visibility=V.choice.T?'visible':'hidden';paint();return V};
  function paint(){[...ch.children].forEach((b,k)=>b.classList.toggle('sel',k===V.sel))}
  V.choose=k=>{const c=V.choice;if(!c||k<0||k>=c.list.length)return;V.choice=null;el.classList.remove('choosing');const b=ch.children[k];if(b)b.classList.add('picked');
    const A=AU();if(A)try{A.ui('click')}catch(e){}setTimeout(()=>{if(!V.choice)ch.innerHTML=''},180);c.op.onPick&&c.op.onPick(k)};
  V.move=d=>{if(!V.choice)return;const n=V.choice.list.length;V.sel=(V.sel+d+n)%n;paint()};
  V.confirm=()=>{if(V.choice)V.choose(V.sel);else V.skip()};
  V.skip=()=>{const T=V.typing;if(!T)return;if(T.i<T.t.length){T.i=T.t.length;T.el.textContent=T.t}else T.hold=0};
  /* meters: [{id,label,v,max,marks:[..],cls,sub}] */
  const mEls={};
  V.meters=list=>{for(const m of list){let e=mEls[m.id];if(!e){e=mEls[m.id]=document.createElement('div');e.className='soc-m '+(m.cls||'');e.innerHTML='<div class="l"><b></b><span></span></div><div class="bar"><i class="ghost"></i><i class="fill"></i></div>';
        const bar=e.querySelector('.bar');for(const k of m.marks||[]){const t=document.createElement('u');t.style.left=(k/(m.max||100)*100)+'%';bar.appendChild(t)}mt.appendChild(e);e._v=m.v}
      const f=Math.max(0,Math.min(1,m.v/(m.max||100)));e.querySelector('.fill').style.width=(f*100)+'%';e.querySelector('.l b').textContent=m.label;e.querySelector('.l span').textContent=m.sub!=null?m.sub:Math.round(m.v);
      const g=e.querySelector('.ghost');if(e._v!==m.v){const up=m.v>e._v;e.classList.remove('up','down');void e.offsetWidth;e.classList.add(up?'up':'down');g.style.width=(Math.max(e._v,m.v)/(m.max||100)*100)+'%';e._v=m.v;
        clearTimeout(e._gt);e._gt=setTimeout(()=>{g.style.width=(Math.max(0,Math.min(1,e._v/(m.max||100)))*100)+'%'},450)}
      e.classList.toggle('warn',!!m.warn);e.classList.toggle('hot',!!m.hot)}};
  V.toast=(t,cls)=>{toast.className='soc-toast '+(cls||'');toast.textContent=t;void toast.offsetWidth;toast.classList.add('on');clearTimeout(V._tt);V._tt=setTimeout(()=>toast.classList.remove('on'),1600)};
  V.notes=(title,items,sub)=>{if(!items){notes.hidden=true;return}notes.hidden=false;notes.innerHTML='<h4>'+esc(title)+'</h4><ol>'+items.map(i=>'<li>'+esc(i)+'</li>').join('')+'</ol>'+(sub?'<p>'+esc(sub)+'</p>':'');};
  V.update=dt=>{const T=V.typing;if(T&&!T.done){if(T.i<T.t.length){T.acc+=dt*T.cps;const n=Math.min(T.t.length,Math.floor(T.acc));
        while(T.i<n){const c=T.t[T.i++];if(/[a-z]/i.test(c)&&++T.blipN%4===1&&!/^\(|^\[/.test(T.t))blip(T.c,c.toLowerCase())}T.el.textContent=T.t.slice(0,T.i)}
      else{T.hold-=dt;if(T.hold<=0)T.done=true}}
    const c=V.choice;if(c&&c.T){c.t-=dt;const f=Math.max(0,c.t/c.T);tmi.style.transform='scaleX('+f+')';tm.classList.toggle('low',c.t<3.5);if(c.t<=0){V.choice=null;el.classList.remove('choosing');ch.innerHTML='';c.op.onTimeout&&c.op.onTimeout()}}};
  /* keys: 1-4 pick, W/S or arrows move, E/Enter/Space confirm or skip. Captured before the game's own handler (no weapon swaps). */
  const kd=e=>{if(!V.mounted||e.repeat)return;const k=e.key.toLowerCase();let used=true;
    if(/^[1-4]$/.test(k)){if(V.choice)V.choose(+k-1);else used=!!V.typing}
    else if(k==='arrowup'||k==='w'||k==='arrowleft'||k==='a')V.move(-1);else if(k==='arrowdown'||k==='s'||k==='arrowright'||k==='d')V.move(1);
    else if(k==='e'||k==='enter'||k===' ')V.confirm();else if(BLOCK.includes(k))used=true;else used=false;
    if(used){e.stopImmediatePropagation();e.preventDefault()}};
  const wh=e=>{if(V.mounted)e.stopImmediatePropagation()};
  function keysOn(){addEventListener('keydown',kd,true);addEventListener('wheel',wh,{capture:true,passive:true})}function keysOff(){removeEventListener('keydown',kd,true);removeEventListener('wheel',wh,{capture:true})}
  el.addEventListener('pointerdown',e=>{if(e.target.closest('.soc-ch'))return;if(V.typing){V.skip();e.preventDefault()}});
  return V}
const BLOCK=['q','r','v','c','control','h','5','6','7','8','9'];/* weapon swaps, reloads and view toggles mean nothing at a patio table */
function isTouch(){try{return matchMedia('(pointer:coarse)').matches}catch(e){return false}}

/* ---- a beat queue on game time ---- */
function scene(V){const q=[];let cur=null,t=0;const S={V,q,
  say(who,text,o){q.push({k:'say',who,text,o:o||{}});return S},tell(text){q.push({k:'tell',text});return S},wait(s){q.push({k:'wait',s});return S},
  run(fn){q.push({k:'run',fn});return S},choose(fn){q.push({k:'choose',fn});return S},
  now(fn){q.unshift({k:'run',fn});return S},clear(){q.length=0;cur=null;return S},
  get busy(){return!!cur||q.length>0},get current(){return cur},
  update(dt){V.update(dt);for(let guard=0;guard<20;guard++){
      if(cur){if(cur.k==='say'){if(V.typing&&!V.typing.done)return;if(cur.o.after)cur.o.after();cur=null}
        else if(cur.k==='wait'){t-=dt;if(t>0)return;cur=null}
        else if(cur.k==='choose'){if(cur.open)return;cur=null}}
      const b=q.shift();if(!b)return;cur=b;
      if(b.k==='say'){if(b.o.before)b.o.before();S.onSay&&S.onSay(b.who,b.text,b.o);V.say(b.who,b.text,b.o);if(b.o.tell)V.tell(b.o.tell);return}
      if(b.k==='tell'){V.tell(b.text);cur=null;continue}
      if(b.k==='wait'){t=b.s;return}
      if(b.k==='run'){cur=null;try{b.fn()}catch(e){console.warn('social beat',e)}continue}
      if(b.k==='choose'){b.open=true;const done=()=>{b.open=false};try{b.fn(done)}catch(e){console.warn('social choose',e);b.open=false}return}}}};
  return S}

/* =====================================================================
   TELLS: readable body language on HT.People characters (seated or standing). A thin layer applied after HT.People.update:
   it restores its own bone offsets before the mixer runs, so nothing accumulates.
     bored      a foot taps, the head lolls back and to the side, the spine slumps
     scared     arms folded tight across the chest, shoulders up, chin down
     defensive  head and shoulders turned away, chin up
     friendly   leans in, small nods
     plus: speaking (head bob), look (a world point the head turns toward: the grill), hands (zip-tied wrists together)
   ===================================================================== */
const tells={list:[],installed:false};
const TB=['Bip01_Spine','Bip01_Spine1','Bip01_Spine2','Bip01_Neck','Bip01_Head','Bip01_L_Clavicle','Bip01_R_Clavicle','Bip01_L_UpperArm','Bip01_R_UpperArm','Bip01_L_Forearm','Bip01_R_Forearm','Bip01_L_Hand','Bip01_R_Hand','Bip01_R_Calf','Bip01_R_Foot','Bip01_L_Calf','Bip01_L_Foot'];
function installTells(){if(tells.installed)return true;const PP=HT.People;if(!PP||!PP.update||!root.THREE)return false;const orig=PP.update;
  PP.update=function(dt,cam){for(const t of tells.list)restore(t);const r=orig.apply(this,arguments);for(const t of tells.list){try{save(t);apply(t,dt||0)}catch(e){}}return r};tells.installed=true;return true}
function bonesOf(d){const out={};if(!d||!d.rb)return out;const b=d.rb.body||d.body;for(const n of TB){const o=b.getObjectByName(n);if(o)out[n]=o}return out}
function save(t){t.saved=t.saved||{};for(const n in t.B){const q=t.saved[n]||(t.saved[n]=new THREE.Quaternion());q.copy(t.B[n].quaternion)}t.has=true}
function restore(t){if(!t.has)return;for(const n in t.B){const q=t.saved[n];if(q)t.B[n].quaternion.copy(q)}t.has=false}
let _q,_q2,_ax,_v;
function rot(b,ax,ang){if(!b||Math.abs(ang)<1e-4)return;b.parent.getWorldQuaternion(_q);_ax.copy(ax).applyQuaternion(_q.invert());_q2.setFromAxisAngle(_ax,ang);b.quaternion.premultiply(_q2);b.updateMatrixWorld(true)}
const W0={slump:0,tilt:0,tap:0,fold:0,hunch:0,down:0,away:0,chin:0,lean:0,nod:0,tied:0};
const MOODW={bored:{slump:1,tilt:1,tap:1},scared:{fold:1,hunch:1,down:1},defensive:{away:1,chin:1},friendly:{lean:1,nod:.4}};
function apply(t,dt){const d=t.dude;if(!d||!d.root||!d.root.parent||!d.rb||d.rb.dead)return;if(!t.B)return;
  t.time=(t.time||0)+dt;const mood=t.o.mood?t.o.mood():null,spk=t.o.speaking?!!t.o.speaking():false;
  const tg=Object.assign({},W0,MOODW[mood]||{});if(t.o.hands&&t.o.hands())tg.tied=1;
  const k=Math.min(1,dt*4);for(const n in W0){t.w[n]=(t.w[n]||0)+((tg[n]||0)-(t.w[n]||0))*k}
  t.spk=(t.spk||0)+((spk?1:0)-(t.spk||0))*Math.min(1,dt*8);
  const w=t.w,B=t.B,T=t.time,s=t.o.side||1;d.root.updateMatrixWorld(true);
  const R=new THREE.Vector3(1,0,0).applyQuaternion(d.root.getWorldQuaternion(new THREE.Quaternion())),U=new THREE.Vector3(0,1,0),F=new THREE.Vector3(0,0,1).applyQuaternion(d.root.getWorldQuaternion(new THREE.Quaternion()));
  /* torso: slump back (bored), lean in (friendly), hunch (scared), turn away (defensive) */
  rot(B.Bip01_Spine1,R,-.16*w.slump+.2*w.lean+.1*w.hunch);rot(B.Bip01_Spine2,U,.32*w.away*s);
  /* head */
  const nod=w.nod*Math.sin(T*2.2)*.06+t.spk*Math.sin(T*7.5)*.05;
  let look=0;if(t.o.look){const p=t.o.look();if(p){const hp=new THREE.Vector3();(B.Bip01_Head||d.root).getWorldPosition(hp);const dx=p.x-hp.x,dz=p.z-hp.z;
      const fy=Math.atan2(F.x,F.z),ty=Math.atan2(dx,dz);let a=ty-fy;while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;look=clamp(a,-1.1,1.1)}}
  t.lk=(t.lk||0)+(look-(t.lk||0))*Math.min(1,dt*3);
  rot(B.Bip01_Neck,U,.38*w.away*s+t.lk*.45);rot(B.Bip01_Head,U,.34*w.away*s+t.lk*.55);
  rot(B.Bip01_Neck,R,.28*w.down-.12*w.chin-.12*w.slump+nod);rot(B.Bip01_Head,R,.18*w.down-.1*w.chin+nod*.6);
  rot(B.Bip01_Head,F,.22*w.tilt*Math.sin(T*.35+1)*(1)+.06*w.tilt);
  /* shoulders up (scared) */
  rot(B.Bip01_L_Clavicle,F,-.18*w.hunch);rot(B.Bip01_R_Clavicle,F,.18*w.hunch);
  /* arms folded: upper arms in front of the ribs, forearms across the chest */
  const f=w.fold;if(f>.01){rot(B.Bip01_L_UpperArm,R,-.55*f);rot(B.Bip01_R_UpperArm,R,-.55*f);rot(B.Bip01_L_UpperArm,F,.35*f);rot(B.Bip01_R_UpperArm,F,-.35*f);
    rot(B.Bip01_L_Forearm,U,-1.25*f);rot(B.Bip01_R_Forearm,U,1.25*f);rot(B.Bip01_L_Forearm,R,-.5*f);rot(B.Bip01_R_Forearm,R,-.5*f)}
  /* zip-tied wrists: hands together in the lap */
  const z=w.tied*(1-f);if(z>.01){rot(B.Bip01_L_UpperArm,F,.12*z);rot(B.Bip01_R_UpperArm,F,-.12*z);rot(B.Bip01_L_Forearm,U,-.45*z);rot(B.Bip01_R_Forearm,U,.45*z)}
  /* the foot tap: heel down, toes up and down */
  if(w.tap>.01){const ph=Math.max(0,Math.sin(T*9));rot(B.Bip01_R_Foot,R,-.42*w.tap*ph);rot(B.Bip01_R_Calf,R,.05*w.tap*ph)}}
tells.attach=(dude,o)=>{if(!dude||!dude.rb||!root.THREE)return null;if(!_q){_q=new THREE.Quaternion();_q2=new THREE.Quaternion();_ax=new THREE.Vector3();_v=new THREE.Vector3()}
  if(!installTells())return null;const t={dude,o:o||{},B:bonesOf(dude),w:{},saved:null,has:false};tells.list.push(t);return t};
tells.detach=t=>{const k=tells.list.indexOf(t);if(k>=0){restore(t);tells.list.splice(k,1)}};
tells.clear=()=>{for(const t of tells.list.slice())tells.detach(t)};

/* =====================================================================
   DIRECTOR: hard cuts between shots, each with a slow drift (a push-in or a slide), so a talking scene never sits dead still.
   shot = {eye:{x,y,z}, at:{x,y,z}, drift:{x,y,z} (m over the shot), fov, dur}
   ===================================================================== */
function director(camera){const D={shot:null,t:0,camera,
  cut(s){if(!s)return D;D.shot=s;D.t=0;return D},
  update(dt){const s=D.shot;if(!s)return false;D.t+=dt;const k=Math.min(1,D.t/(s.dur||8)),e=k*(2-k),dr=s.drift||{x:0,y:0,z:0},ad=s.atDrift||{x:0,y:0,z:0};
    camera.position.set(s.eye.x+dr.x*e,s.eye.y+(dr.y||0)*e,s.eye.z+dr.z*e);camera.lookAt(s.at.x+ad.x*e,s.at.y+(ad.y||0)*e,s.at.z+ad.z*e);
    const fov=s.fov||50;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix()}return true}};return D}

Object.assign(Social,{view,scene,tells,director,blip,esc});
})(typeof window!=='undefined'?window:globalThis);
