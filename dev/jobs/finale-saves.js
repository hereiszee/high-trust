/* Everybody Waves: three campaign save histories for the finale's epilogue (used by dev/jobs/finale.js and finale-epilogue.js).
   clean: every job done well, every household and storefront; loud: several jobs done loud or with wrong calls, more downs than
   zip-ties; skip: the optional side jobs (patrols, Porch Light, Suds Up, Honey-Do Blitz) never done. Runs in the page. */
module.exports=async hist=>{const H=window.__ht;await H.jobs.ready;H.step(2);const s=H.jobs.api.SV(),S=window.HT.Save;
    const all=['gary','rick','dave','doug','earl','dee','rosa','benny','duke','taxi','hoa','mower','tail','crossing','tow','overwatch','pawn','moving','cargo','cones','talk','sabotage','brake','bike','arrest','heist','roundup','patrol','porch','carwash','blitz'];
    const skip=hist==='skip'?['patrol','porch','carwash','blitz']:[];
    for(const id of all){if(skip.includes(id))continue;const r=S.jobRec(s,id);r.done=true;r.runs=1;r.medal=hist==='loud'?(['arrest','overwatch','crossing','heist','tail'].includes(id)?1:2):3;r.best={t:100,clean:hist!=='loud'};const i=H.jobs.index(id);if(i>=0)H.prog.done[i]=true}
    const f=s.flags;Object.assign(f,{act2Intro:true});s.world.bridgeOpen=true;
    if(hist==='clean'){Object.assign(f,{dezLibrary:true,pepperHome:true,crossingGuard:'ferreira',youthVan:true,gardenEarly:true,salBranch:true,towGuy:true,hankDiscount:true,hoaWalnut:true,lookoutMows:true,andre:true,ferreira:true,wholesalerNamed:true,bikesHome:7,mowerWon:true,marcusOwes:true,atmSafe:true,blockParty:true,hustlersFed:true,corkboard:true,maddieProud:true});
      for(const h of['adeyemi','tre_bikes','dez_family','ferreira','millshop','towguy'])S.household(s,h);S.storefront(s,'pawn','bakery');S.storefront(s,'millshop','honest');S.jobRec(s,'patrol').runs=4;S.jobRec(s,'porch').runs=2;S.jobRec(s,'heist').plan={assign:{},entry:'quiet'};H.prog.cuffed=212;H.prog.downed=6}
    else if(hist==='loud'){Object.assign(f,{crossingGuard:'volunteer',bikesHome:3,blockParty:true});S.household(s,'adeyemi');S.storefront(s,'pawn','bakery');S.jobRec(s,'heist').plan={assign:{},entry:'loud'};H.prog.cuffed=40;H.prog.downed=95}
    else{S.household(s,'adeyemi');Object.assign(f,{crossingGuard:'volunteer'});H.prog.cuffed=120;H.prog.downed=40}
    H.prog.trust=86;H.prog.trustR=84;H.prog.act=3;
    const j=H.jobs.registry.get('finale');return{lock:H.jobs.lock('finale'),j:!!j}};
