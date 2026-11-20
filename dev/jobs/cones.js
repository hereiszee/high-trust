/* Cone Zone: the roadblock reader (js/jobs/cones.js readBlock), Node only, no browser.
   node dev/jobs/cones.js   -> every roadblock below must read the way the convoy drivers will act on it. */
global.window=global;window.HT={};require('../../js/jobs/_registry.js');require('../../js/jobs/cones.js');
const read=HT.Jobs.get('cones').readBlock;let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok   ':'FAIL ')+m)};
const car=(x,z,along)=>along?{x0:x-1,x1:x+1,z0:z-2.3,z1:z+2.3,cls:'hard',kind:'car'}:{x0:x-2.3,x1:x+2.3,z0:z-1,z1:z+1,cls:'hard',kind:'car'};
const cone=(x,z)=>({x0:x-.22,x1:x+.22,z0:z-.22,z1:z+.22,cls:'soft',kind:'cone'});
const saw=(x,z)=>({x0:x-.95,x1:x+.95,z0:z-.31,z1:z+.31,cls:'medium',kind:'sawhorse'});
const sign=(x,z)=>({x0:x-.5,x1:x+.5,z0:z-.4,z1:z+.4,cls:'medium',kind:'sign'});
const flare=(x,z)=>({x0:x-.25,x1:x+.25,z0:z-.25,z1:z+.25,cls:'signal',kind:'flare',lit:true});
const flag=(x,z)=>({x0:x-.45,x1:x+.45,z0:z-.3,z1:z+.3,cls:'soft',kind:'crew',flagger:true});
const conesLine=z=>{const o=[];for(let x=195;x<=207.4;x+=.5)o.push(cone(x,z));return o};
const t=(name,items,want,more)=>{const r=read(items);ok(r.verdict===want&&(!more||more(r)),name+' -> '+r.verdict+' ('+(r.top?r.top.why:'-')+') "'+r.text+'"')};
t('empty road',[],'clear');
t('three cones in the middle',[cone(202,110),cone(203,110),cone(204,110)],'gap',r=>r.top.pass.w>=3);
t('a full line of cones',conesLine(110),'cones');
t('cones + three sawhorses spread out',[...conesLine(110),saw(197,110),saw(201.5,110),saw(206,110)],'bully');
t('one car + cones (a 4 m stretch of cones beside it)',[car(201,110),...conesLine(110)],'cones');
t('one car + sawhorses: they push the sawhorses beside it',[car(201,110),saw(196.4,110),saw(205.2,110)],'bully');
t('one car + sawhorses, sign upstream, flagger',[car(201,110),saw(196,110),saw(205.5,110),sign(203,130),flag(207,110.5)],'stop');
t('cones, sign upstream and a flagger (looks official)',[...conesLine(110),sign(203,130),flag(196,110.6)],'stop');
t('cones + flagger only (one sign of officialdom is not enough)',[...conesLine(110),flag(196,110.6)],'cones');
t('two cars wall to wall',[car(198.6,110),car(203.4,110),saw(206.6,110)],'stop');
t('two cars + a lit flare = airtight',[car(198.6,110),car(203.4,110),saw(206.6,110),flare(202,113)],'airtight',r=>r.airtight);
t('two cars but a 3.4 m gap by the fence',[car(197,110),car(201.4,110)],'gap',r=>r.top.pass.x>203.7);
t('sign alone does not stop them',[sign(203,110)],'gap');
t('an airtight wall behind a cone taper still decides',[cone(203,124),cone(206,124),car(198.6,110),car(203.4,110),saw(206.6,110),flare(200,112)],'airtight',r=>r.groups.length===2&&r.first===r.groups[1]);
t('a parked car outside the zone is ignored',[car(203,40),car(203,150)],'clear');
console.log(fails?fails+' FAILED':'all ok');process.exit(fails?1:0);
