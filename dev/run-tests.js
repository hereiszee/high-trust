/* node dev/run-tests.js : runs every dev/test-*.js in one process */
const h=require('./harness');for(const f of require('fs').readdirSync(__dirname).filter(f=>/^test-.*\.js$/.test(f)).sort())require('./'+f);process.exitCode=h.done()?1:0;
