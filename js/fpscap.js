/* High Trust · HT.FrameCap — the "Frame rate cap" setting (SAV-03).
   requestAnimationFrame runs at the display's refresh rate; the cap decides which of those frames the game renders.
   It keeps a target time ("due") that advances by exactly 1000/cap ms per rendered frame (carry-over, so the long-run rate is the cap,
   not the next whole multiple of the vsync interval), and renders the first vsync frame within half a refresh period of it.
   The refresh period is measured from the rAF timestamps themselves (seeded by the desktop shell's display frequency when known).
   A stall, or a cap at or above the refresh rate, re-syncs the target instead of bursting frames to catch up.
     const g = HT.FrameCap.make(seedHz?); if (!g.gate(now, cap)) skip this frame;   cap 0 = no cap (display rate)
   Node: module.exports = {make}. Tested by dev/fpscap.test.js. */
(function(root){'use strict';
function make(seedHz){let due=0,prev=0,period=seedHz>0?1000/seedHz:0;
  return{get period(){return period},
    gate(now,cap){
      if(prev){const d=now-prev;if(d>1&&d<60)period=period?period+(d-period)*.08:d}prev=now;
      if(!(cap>0)){due=now;return true}
      const iv=1000/cap,slack=Math.min(iv,period||iv)*.5;
      if(now<due-slack)return false;
      due+=iv;if(due<now-slack||due>now+2*iv)due=now+iv;/* first frame, a stall, or the cap is above the refresh rate */
      return true}}}
const FrameCap={make};
if(typeof module!=='undefined'&&module.exports)module.exports=FrameCap;
if(typeof window!=='undefined'){const HT=root.HT=root.HT||{};HT.FrameCap=FrameCap}
})(typeof window!=='undefined'?window:globalThis);
