/* HT.Social conversation engine (SPEC3 4.6 a), in Node: node dev/social.test.js
   every cell of the register table, mood transitions, win and lose ends, silence (once, not as a strategy), resets,
   custom-scored lines, follow-ups opening, save/load reproducibility, and the Small Talk deck played to a win and to a lose. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('path'),fs=require('fs'),vm=require('vm');
global.window=global;const S=require('../js/social.js');

test('every cell of the table',()=>{for(const mood of S.MOODS)for(const reg of ['joke','real','over','comp','tough']){
  const C=S.convo({mood,rapport:50,awkward:20,rounds:[{options:[{reg,text:'x'}]}],seed:1});const r=C.pick(0);const [dr,da]=S.TABLE[mood][reg];
  assert.equal(r.dr,Math.max(-50,dr),mood+'/'+reg+' rapport');const relief=(dr>=15)?6:0;assert.equal(r.da,Math.max(-20,da-relief),mood+'/'+reg+' awkward')}});
test('the right register lands for each mood, and Bad Cop never does',()=>{for(const [m,reg] of Object.entries(S.BEST)){if(!reg)continue;
  for(const other of ['joke','real','over','comp'])if(other!==reg)assert.ok(S.TABLE[m][reg][0]>S.TABLE[m][other][0],m+': '+reg+' beats '+other)}
  for(const m of S.MOODS)assert.ok(S.TABLE[m].tough[0]<0&&S.TABLE[m].tough[1]>=14)});
test('win and lose ends',()=>{const C=S.convo({mood:'scared',rapport:70,win:80,rounds:[{options:[{reg:'real',text:'a'}]}]});assert.equal(C.pick(0).done,'win');
  const D=S.convo({mood:'scared',awkward:90,rounds:[{options:[{reg:'joke',text:'a'}]}]});assert.equal(D.pick(0).done,'lose')});
test('mood moves where the line says, by outcome',()=>{const C=S.convo({mood:'scared',rounds:[{options:[{reg:'real',text:'a',to:{hit:'bored',miss:'defensive'}}]},{options:[{reg:'real',text:'b',to:{hit:'bored',miss:'defensive'}}]}]});
  assert.equal(C.pick(0).mood,'bored');assert.equal(C.pick(0).mood,'bored');/* bored + real = +6, a 'meh', counts as landing */});
test('silence: one comfortable pause helps a scared NPC, the second in a row is just staring',()=>{const C=S.convo({mood:'scared',seed:3,deck:[]});const a=C.silence();assert.ok(a.dr>0);
  C.st.mood='scared';const b=C.silence();assert.equal(b.dr,0);assert.ok(b.da>=8)});
test('reset keeps a share of rapport and clears awkward',()=>{const C=S.convo({mood:'bored',rapport:50,awkward:100});C.reset(.4,'scared');assert.equal(C.st.rapport,20);assert.equal(C.st.awkward,0);assert.equal(C.st.mood,'scared');assert.equal(C.st.resets,1)});
test('custom scoring, follow-ups and topics',()=>{const deck=[{id:'q',reg:'real',text:'ask',custom:C=>C.st.rapport>=55?{dr:16,da:0}:{dr:-6,da:12},topic:'w'},{id:'o',reg:'over',text:'cry',opens:['ret']},
    {id:'f',reg:'special',as:'over',needs:'ret',sure:15,text:'retriever'},{id:'j',reg:'joke',text:'pun'}];
  const C=S.convo({mood:'defensive',deck,seed:9});let r=C.pick(C.options().find(l=>l.id==='q'));assert.equal(r.hit,'miss');assert.ok(C.st.closed.w>0);
  C.st.mood='defensive';r=C.pick(C.options().find(l=>l.id==='o'));assert.ok(C.open('ret'));assert.ok(C.options().some(l=>l.id==='f'));
  C.st.mood='scared';r=C.pick(C.options().find(l=>l.id==='f'));assert.ok(r.dr>=15)});
test('save/load continues the same conversation (same offers, same luck)',()=>{const deck=[];for(let i=0;i<30;i++)deck.push({id:'l'+i,reg:['joke','real','over'][i%3],text:'t'+i,land:.5});
  const A=S.convo({mood:'scared',deck,seed:42,swap:.4});A.options();A.pick(0);A.options();A.pick(1);const snap=A.save();
  const B=S.convo({mood:'scared',deck:deck.map(l=>Object.assign({},l)),seed:1,swap:.4});B.load(snap);assert.deepEqual(B.options().map(l=>l.id),A.options().map(l=>l.id))});
test('check(): one-round talk-down',()=>{const c=S.check({mood:'scared',options:[{reg:'joke',text:'a'},{reg:'real',text:'b'}]});assert.equal(c.pick(1).done,'win')});
/* the Small Talk deck, read out of js/jobs/talk.js without a browser */
function talkDeck(){const src=fs.readFileSync(path.join(__dirname,'../js/jobs/talk.js'),'utf8');const a=src.indexOf('const ev=(who,text)'),b=src.indexOf('const deck=()');
  return vm.runInNewContext(src.slice(a,b)+';DECK')}
test('Small Talk deck: well formed, played to a win by reading him, and to a lose by Bad Cop',()=>{const D=talkDeck();const ids=new Set();
  for(const l of D){assert.ok(l.id&&!ids.has(l.id),'unique id '+l.id);ids.add(l.id);assert.ok(['joke','real','over','comp','tough','special'].includes(l.reg),l.id);assert.ok(l.text&&l.reply!=null,l.id)}
  for(let seed=1;seed<=40;seed++){const C=S.convo({mood:'scared',deck:D.map(l=>Object.assign({},l)),seed,swap:.4,win:80});let n=0,won=false;
    while(n++<30){const o=C.options(),best=C.best();let l=o.find(l=>l.reg==='special')||(best&&o.find(l=>l.reg===best&&l.id!=='r_ask'))||o.find(l=>l.reg!=='tough'&&l.id!=='r_ask')||o[0];const r=C.pick(l);if(r.done==='win'){won=true;break}if(r.done==='lose')C.reset(.4,'scared')}
    assert.ok(won,'seed '+seed+' reaches rapport 80 by reading him ('+C.st.lines+' lines)');
    const B=S.convo({mood:'scared',deck:D.map(l=>Object.assign({},l)),seed,swap:1,win:80});let lost=false;for(let k=0;k<40&&!lost;k++){const o=B.options(),row=S.TABLE[B.st.mood];
      const o2=o.filter(l=>!l.custom&&!l.sure);const l=o.find(l=>l.reg==='tough')||(o2.length?o2:o).slice().sort((p,q)=>(row[p.reg]||[0])[0]-(row[q.reg]||[0])[0])[0];lost=B.pick(l).done==='lose'}assert.ok(lost,'seed '+seed+' Bad Cop ends in an awkward reset')}});
