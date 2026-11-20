/* Run dev/jobs-check.js with the page CPU throttled (CDP Emulation.setCPUThrottlingRate), to prove the job's timing only advances
   with the dt passed to its hooks (no setTimeout / Date / performance.now in gameplay): node dev/jobs/sabotage-slow.js [rate] [jobs-check args...]
   e.g. node dev/jobs/sabotage-slow.js 4 sabotage --retry --replay */
const Module=require('module'),path=require('path');
const rate=+(process.argv[2]||4);const rest=process.argv.slice(3);
const lib=require('../ai-ingame-lib.js'),open0=lib.open;
lib.open=async o=>{const r=await open0(o);const c=await r.p.context().newCDPSession(r.p);await c.send('Emulation.setCPUThrottlingRate',{rate});console.log('(CPU throttled x'+rate+')');return r};
process.argv=[process.argv[0],path.join(__dirname,'../jobs-check.js'),...(rest.length?rest:['sabotage','--retry','--replay'])];
require('../jobs-check.js');
