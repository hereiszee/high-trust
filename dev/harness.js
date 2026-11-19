/* tiny test harness: node dev/test-*.js, or node dev/run-tests.js for all */
const results=[];let current='';
function test(name,fn){try{fn();results.push([current+name,true])}catch(e){results.push([current+name,false,e&&e.stack||String(e)])}}
function suite(name){current=name+' · '}
function done(){let fail=0;for(const[n,ok,err]of results){console.log((ok?'  ok   ':'  FAIL ')+n);if(!ok){fail++;console.log('       '+String(err).split('\n').slice(0,4).join('\n       '))}}
  console.log(fail?`${fail} of ${results.length} failed`:`all ${results.length} passed`);if(require.main===module.parent||true)process.exitCode=fail?1:0;return fail}
function load(){const p=require('path').join(__dirname,'..','js');require(p+'/worldgen.js');require(p+'/roadgraph.js');require(p+'/carai.js');return globalThis.HT}
module.exports={test,suite,done,load,results};
