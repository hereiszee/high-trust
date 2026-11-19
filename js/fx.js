/* High Trust · FX module (window.HT.FX)
   Gunfire, impacts, debris, brass, explosions, ambient world FX, camera shake and damage feedback.
   Everything is pooled: two GPU-instanced billboard batches (additive HDR + lit alpha smoke), instanced decals,
   instanced rigid bits (chips, splinters, glass, shells, leaves). No textures are loaded: every sprite, flipbook
   and decal (with its normal map) is generated procedurally at init.
   Needs global THREE (r128). See the API notes at the bottom of this file. */
(function(){
'use strict';
const HT=window.HT=window.HT||{};
const T=window.THREE;
if(!T){console.warn('HT.FX: THREE missing');return}

/* ---------------------------------------------------------------- utilities */
let _s=1;const srand=s=>{_s=(s>>>0)||1};
const sr=()=>{_s=(_s+0x6D2B79F5)|0;let t=Math.imul(_s^(_s>>>15),1|_s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
const R=Math.random,rnd=(a,b)=>a+R()*(b-a),clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t;
const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const TAU=Math.PI*2;
const NP=new Uint8Array(512),NG=new Float32Array(256);
(()=>{srand(1337);const p=[];for(let i=0;i<256;i++){p[i]=i;NG[i]=sr()}for(let i=255;i>0;i--){const j=Math.floor(sr()*(i+1)),t=p[i];p[i]=p[j];p[j]=t}for(let i=0;i<512;i++)NP[i]=p[i&255]})();
function vn(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),X=xi&255,Y=yi&255;
  return lerp(lerp(NG[NP[X+NP[Y]]],NG[NP[X+1+NP[Y]]],u),lerp(NG[NP[X+NP[Y+1]]],NG[NP[X+1+NP[Y+1]]],u),v)}
function fbm(x,y,o=4){let s=0,a=.5,n=0;for(let i=0;i<o;i++){s+=vn(x,y)*a;n+=a;a*=.5;x=x*2.03+17.1;y=y*2.03+9.7}return s/n}
/* scratch objects: nothing in update() allocates */
const _m2=new T.Matrix4(),_v=new T.Vector3(),_v2=new T.Vector3(),_v3=new T.Vector3(),_q=new T.Quaternion(),_q2=new T.Quaternion(),_e=new T.Euler(),_m=new T.Matrix4(),_sc=new T.Vector3(),_c=new T.Color();
const ZAX=new T.Vector3(0,0,1),UP=new T.Vector3(0,1,0);

/* ---------------------------------------------------------------- texture atlases (DataTexture, row 0 = bottom) */
function Atlas(N,S){this.N=N;this.S=S;this.W=N*S;this.d=new Uint8Array(this.W*this.W*4)}
Atlas.prototype.tile=function(idx,fn,hOut){const N=this.N,S=this.S,W=this.W,col=idx%N,row=Math.floor(idx/N),d=this.d,o4=[0,0,0,0,0];
  for(let py=0;py<S;py++){const v=(py+.5)/S;for(let px=0;px<S;px++){const u=(px+.5)/S;o4[0]=o4[1]=o4[2]=o4[3]=o4[4]=0;fn(u,v,o4);
    const o=((row*S+py)*W+col*S+px)*4;d[o]=clamp(o4[0],0,1)*255;d[o+1]=clamp(o4[1],0,1)*255;d[o+2]=clamp(o4[2],0,1)*255;d[o+3]=clamp(o4[3],0,1)*255;
    if(hOut)hOut[py*S+px]=o4[4]}}};
Atlas.prototype.tex=function(srgb){const t=new T.DataTexture(this.d,this.W,this.W,T.RGBAFormat);t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;
  t.magFilter=T.LinearFilter;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;if(srgb)t.encoding=T.sRGBEncoding;t.anisotropy=4;t.needsUpdate=true;return t};

/* additive atlas: 8x8 tiles of 128 px. rgb carries brightness, tinted to HDR in the shader */
const A={GLOW:0,STAR4:1,STAR5:2,STAR6:3,BURST:4,FLAME:5,FLAME2:6,SPARK:7,TRACER:8,SPARKLE:9,RING:10,EMBER:11,MOTE:12,FIRE:16,FIREN:16};
function starTile(n,seed,o){srand(seed);const pr=[];const base=sr()*TAU;
  for(let k=0;k<n;k++)pr.push({a:base+k*TAU/n+(sr()-.5)*o.jit,len:lerp(o.lmin,1,sr())*.98,w:o.w*(.7+.6*sr())});
  return(u,v,out)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);
    let core=Math.exp(-r*r*o.core),s=core+Math.exp(-r*r*5)*.22;
    for(const p of pr){if(r>=p.len)continue;let d=Math.abs(((th-p.a)%TAU+TAU*1.5)%TAU-Math.PI);const w=p.w*(1-r/p.len)+.006;
      s+=Math.exp(-Math.pow(d*r/w,2))*Math.pow(1-r/p.len,.7)*(.65+.5*fbm(r*6+seed,p.a*3))}
    s*=.8+.4*fbm(x*5+seed,y*5);s*=sstep(1,.85,r);
    out[0]=s;out[1]=s*(.66+.34*core);out[2]=s*(.34+.66*core*core);out[3]=1}}
function buildAdd(){const at=new Atlas(8,128);
  at.tile(A.GLOW,(u,v,o)=>{const x=u*2-1,y=v*2-1,r2=x*x+y*y,s=(Math.exp(-r2*9)*.85+Math.exp(-r2*3.2)*.25)*sstep(1,.8,Math.sqrt(r2));o[0]=o[1]=o[2]=s;o[3]=1});
  at.tile(A.STAR4,starTile(4,11,{jit:.35,lmin:.55,w:.07,core:22}));
  at.tile(A.STAR5,starTile(5,23,{jit:.2,lmin:.7,w:.06,core:26}));
  at.tile(A.STAR6,starTile(7,37,{jit:.5,lmin:.4,w:.09,core:16}));
  at.tile(A.BURST,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);
    const pet=.55+.35*fbm(Math.cos(th)*2.2+3,Math.sin(th)*2.2+3,3);let s=Math.exp(-r*r*14)+sstep(pet,pet*.35,r)*(.55+.6*fbm(x*6,y*6));
    s*=sstep(1,.8,r);o[0]=s;o[1]=s*.7;o[2]=s*.38;o[3]=1});
  const flame=(seed,thin)=>(u,v,o)=>{const y=v*2-1;const w=(thin?.55:.85)*Math.pow(1-u,.65)*sstep(0,.06,u)+.02;
    const n=fbm(u*5+seed,y*3+seed,4);let s=Math.exp(-Math.pow(y/w,2)*2.4)*Math.pow(1-u,.55)*(.45+.9*n);s*=sstep(.5,.25,Math.abs(y)*(1-u*.3)+(n-.5)*.25);
    const core=Math.exp(-Math.pow(y/(w*.35),2))*Math.pow(1-u,1.6);o[0]=s+core*.3;o[1]=s*.62+core*.3;o[2]=s*.3+core*.25;o[3]=1};
  at.tile(A.FLAME,flame(3,false));at.tile(A.FLAME2,flame(9,true));
  at.tile(A.SPARK,(u,v,o)=>{const y=v*2-1;const s=Math.exp(-y*y*60)*Math.pow(u,1.3)*sstep(1,.92,u)+Math.exp(-y*y*12)*Math.pow(u,3)*.25*sstep(1,.9,u);o[0]=o[1]=o[2]=s;o[3]=1});
  at.tile(A.TRACER,(u,v,o)=>{const y=v*2-1;const head=Math.exp(-Math.pow((u-.93)*14,2)-y*y*10);
    const s=(Math.exp(-y*y*90)*Math.pow(u,2.2)+Math.exp(-y*y*14)*Math.pow(u,4)*.35)*sstep(1,.94,u)+head*.6;o[0]=o[1]=o[2]=s;o[3]=1});
  at.tile(A.SPARKLE,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);const s=(Math.exp(-x*x*500)*Math.exp(-y*y*3)+Math.exp(-y*y*500)*Math.exp(-x*x*3))*.9+
    (Math.exp(-Math.pow(x+y,2)*300)+Math.exp(-Math.pow(x-y,2)*300))*Math.exp(-r*r*8)*.3+Math.exp(-r*r*40);o[0]=o[1]=o[2]=s*sstep(1,.8,r);o[3]=1});
  at.tile(A.RING,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);const s=Math.exp(-Math.pow((r-.82)/.06,2))*(.6+.6*fbm(Math.cos(th)*4+5,Math.sin(th)*4))+Math.exp(-Math.pow((r-.7)/.2,2))*.12;o[0]=o[1]=o[2]=s*sstep(1,.95,r);o[3]=1});
  at.tile(A.EMBER,(u,v,o)=>{const x=u*2-1,y=v*2-1,r2=x*x+y*y,s=Math.exp(-r2*40)+Math.exp(-r2*8)*.2;o[0]=s;o[1]=s*.8;o[2]=s*.6;o[3]=1});
  at.tile(A.MOTE,(u,v,o)=>{const x=u*2-1,y=v*2-1,r2=x*x+y*y,s=Math.exp(-r2*7)*sstep(1,.7,Math.sqrt(r2));o[0]=o[1]=o[2]=s;o[3]=1});
  /* fireball flipbook: 16 frames, white-hot billow breaking up into dark red tatters */
  srand(77);const blobs=[];for(let i=0;i<11;i++){const a=sr()*TAU,d=sr()*.6;blobs.push({x:Math.cos(a)*d,y:Math.sin(a)*d*.8+.05,r:.28+sr()*.22,g:.5+sr()*.8})}
  for(let k=0;k<16;k++){const t=k/15;at.tile(A.FIRE+k,(u,v,o)=>{const x=(u*2-1)*1.05,y=(v*2-1)*1.05;let den=0;
      for(const b of blobs){const bx=b.x*(.25+.75*t)*b.g,by=b.y*(.25+.75*t)*b.g+.12*t,br=b.r*(.55+.5*t);const d=((x-bx)*(x-bx)+(y-by)*(y-by))/(br*br);if(d<1)den=Math.max(den,1-d)+den*.15}
      const n=fbm(x*3.2+t*.7+4,y*3.2-t*1.6,5),dd=den*(.5+.8*n);const val=sstep(.08+.42*t,.38+.42*t,dd);
      const heat=clamp((1-t*.85)*(.35+.9*dd),0,1.2);let r=sstep(0,.3,heat),g=sstep(.2,.85,heat)*.78,b=sstep(.7,1.15,heat)*.45;
      const I=val*(1-.6*t)*(.45+.55*n)*.85;o[0]=r*I;o[1]=g*I;o[2]=b*I;o[3]=1})}
  return at.tex(false)}

/* alpha atlas: 4x4 tiles of 128 px; rgb = baked density shading, a = coverage */
const S={SMOKE:0,SMOKE_N:4,DUST:4,FIBER:5,DOT:6,MIST:7,RING:8,SOFT:9,WISP:10,CHUNK:11,FIRE:32};
function buildAlpha(){const at=new Atlas(8,128);
  for(let k=0;k<4;k++)at.tile(S.SMOKE+k,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);const n=fbm(x*2.4+k*7.3,y*2.4+k*3.1,5);
    const f=Math.pow(clamp(1-r,0,1),1.2);let a=clamp((f*(.4+1.1*n)-.12)*1.9,0,1);a*=sstep(1,.75,r);
    const sh=.72+.45*fbm(x*3+11+k,y*3+2,3)+y*.08;o[0]=o[1]=o[2]=sh;o[3]=a});
  at.tile(S.DUST,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);const n=fbm(x*4+2,y*4+8,5),g=vn(x*22,y*22);
    let a=clamp((Math.pow(clamp(1-r,0,1),1.1)*(.35+1.1*n)-.15+(g-.5)*.18)*1.8,0,1)*sstep(1,.8,r);o[0]=o[1]=o[2]=.8+.3*n;o[3]=a});
  at.tile(S.FIBER,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);const st=fbm(Math.cos(th)*5+1,Math.sin(th)*5+1,3);
    const n=fbm(x*3+5,y*3+1,4);let a=clamp((Math.pow(clamp(1-r,0,1),1.3)*(.4+n)+sstep(.62,.8,st)*(1-r)*.6-.15)*1.6,0,1)*sstep(1,.8,r);o[0]=o[1]=o[2]=.85+.2*n;o[3]=a});
  at.tile(S.DOT,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);o[0]=o[1]=o[2]=1;o[3]=sstep(.75,.45,r)});
  at.tile(S.MIST,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);const n=fbm(x*2+3,y*2+3,4);o[0]=o[1]=o[2]=1;o[3]=clamp(Math.pow(clamp(1-r,0,1),2)*(.5+n),0,1)});
  at.tile(S.RING,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);const n=fbm(Math.cos(th)*3+r*4,Math.sin(th)*3+r*4,4);
    o[0]=o[1]=o[2]=.85+.2*n;o[3]=clamp(Math.exp(-Math.pow((r-.72)/.18,2))*(.3+1.1*n),0,1)*sstep(1,.9,r)});
  at.tile(S.SOFT,(u,v,o)=>{const x=u*2-1,y=v*2-1,r2=x*x+y*y;o[0]=o[1]=o[2]=1;o[3]=Math.exp(-r2*5)*sstep(1,.6,Math.sqrt(r2))});
  at.tile(S.WISP,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x*.75,y*1.25);const n=fbm(x*2+y*1.5+9,y*3+2,5);
    o[0]=o[1]=o[2]=.85+.2*n;o[3]=clamp((Math.pow(clamp(1-r,0,1),1.5)*(.2+1.3*n)-.18)*1.7,0,1)});
  at.tile(S.CHUNK,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);const e=.55+.3*fbm(Math.atan2(y,x)*1.5+4,1,3);o[0]=o[1]=o[2]=.6+.4*fbm(x*6,y*6,3);o[3]=sstep(e,e-.08,r)});
  /* fireball flipbook (16 frames): rgb = emission, a = coverage. A domain-warped turbulent volume, eroded by noise from the
     outside in: only the dense core is hot, so the rim reads as dark smoke rather than an outline. Late frames are cool tatters. */
  for(let k=0;k<16;k++){const t=k/15,R0=.62+.32*t;at.tile(S.FIRE+k,(u,v,o)=>{const x=(u*2-1),y=(v*2-1),r=Math.hypot(x,y*1.08-.05*t);
      const qx=fbm(x*1.7+1.3,y*1.7+t*.6,4),qy=fbm(x*1.7+7.7,y*1.7+3.1-t*.4,4);
      const n=fbm(x*2.6+qx*2.6+k*.03,y*2.6+qy*2.6-t*.9,5),fine=fbm(x*7+qy*3,y*7+qx*3,3);
      const dens=clamp((1-r/R0)*1.35+(n-.5)*1.15+(fine-.5)*.3,0,1);
      const cov=sstep(.02,.62+.15*t,dens)*sstep(1,.85,r);
      const core=sstep(.28+.3*t,1,dens*(.8+.4*n));const e=clamp(Math.pow(1-t,1.3)*core*1.3,0,1.3);
      /* emission falls off steeply with heat: cool parts are dark smoke, not a red rim */
      const I=Math.pow(e,2.2)*1.5;o[0]=Math.min(1,I);o[1]=Math.min(1,I*sstep(.2,.95,e)*.78);o[2]=Math.min(1,I*sstep(.7,1.25,e)*.5);o[3]=cov})}
  return at.tex(false)}

/* decal atlas: 4x4 tiles of 128 px, colour (sRGB, alpha) + tangent-space normal map from a generated height field */
const D={CONC:0,CONC2:1,BRICK:2,WOOD:3,DENT:4,PIERCE:5,GLASS:6,DIRT:7,GRASS:8,SCORCH:9,SKID:10,NAIL:11,PLASTER:12,SCORCH2:13,CLOTH:14};
function holeTile(seed,c){srand(seed);const jag=[],cr=[];for(let i=0;i<6;i++)jag.push({f:2+Math.floor(sr()*8),p:sr()*TAU,a:(.05+sr()*.1)});
  const nc=c.cracks||0;for(let i=0;i<nc;i++)cr.push({a:sr()*TAU,l:c.R*(1.2+sr()*1.6),w:.012+sr()*.012});
  const edge=th=>{let s=1;for(const j of jag)s+=Math.sin(j.f*th+j.p)*j.a;return s};
  return(u,v,o)=>{let x=u*2-1,y=v*2-1;if(c.sx){x/=c.sx;y/=c.sy||1}const r=Math.hypot(x,y),th=Math.atan2(y,x),E=c.R*edge(th),H=c.H*edge(th+1.3);
    const n=fbm(u*9+seed,v*9,4),n2=fbm(u*14+seed*2,v*14+5,3);let col=c.dust,a=0,h=0;
    if(r<H){const k=r/H;col=c.hole;a=1;h=-1+k*.2;const m=.55+.45*n;o[0]=col[0]*m;o[1]=col[1]*m;o[2]=col[2]*m}
    else if(r<E){const k=(r-H)/(E-H);a=1;h=-.8*(1-k)-.05*n2;const m=(.75+.45*n)*(.8+.2*k);const kk=sstep(0,.45,k);
      o[0]=lerp(c.hole[0]*2.2,c.crater[0],kk)*m;o[1]=lerp(c.hole[1]*2.2,c.crater[1],kk)*m;o[2]=lerp(c.hole[2]*2.2,c.crater[2],kk)*m}
    else{const k=(r-E)/(E*(c.spall||.8));if(k<1&&n2>.38+k*.32){a=sstep(.38+k*.32,.46+k*.32,n2)*.95;h=-.18;const m=.85+.3*n;o[0]=c.chip[0]*m;o[1]=c.chip[1]*m;o[2]=c.chip[2]*m}
      const ring=Math.exp(-Math.pow((r-E)/(E*.9),2))*(c.ringA??.35)*(.5+n);if(ring>a){const b=a;a=Math.max(a,ring);if(b<=0){o[0]=c.dust[0];o[1]=c.dust[1];o[2]=c.dust[2]}}}
    for(const q of cr){if(r<E*.8||r>q.l)continue;let d=Math.abs(((th-q.a+(n-.5)*.4)%TAU+TAU*1.5)%TAU-Math.PI)*r;const w=q.w*(1-(r-E)/(q.l-E));
      if(d<w){const s=1-d/w;a=Math.max(a,s*.9);h=Math.min(h,-.4*s);o[0]=lerp(o[0],c.hole[0]*1.6,s);o[1]=lerp(o[1],c.hole[1]*1.6,s);o[2]=lerp(o[2],c.hole[2]*1.6,s)}}
    a*=sstep(.98,.9,Math.max(Math.abs(u*2-1),Math.abs(v*2-1)));o[3]=a;o[4]=h}}
function buildDecals(){const N=4,Sz=128,at=new Atlas(N,Sz),nrm=new Uint8Array(at.W*at.W*4),hf=new Float32Array(Sz*Sz);
  const put=(idx,fn,str)=>{hf.fill(0);at.tile(idx,fn,hf);const col=idx%N,row=Math.floor(idx/N);
    for(let py=0;py<Sz;py++)for(let px=0;px<Sz;px++){const g=(x,y)=>hf[clamp(y,0,Sz-1)*Sz+clamp(x,0,Sz-1)];
      const dx=(g(px+1,py)-g(px-1,py))*str,dy=(g(px,py+1)-g(px,py-1))*str,l=Math.hypot(dx,dy,1);
      const o=((row*Sz+py)*at.W+col*Sz+px)*4;nrm[o]=(-dx/l*.5+.5)*255;nrm[o+1]=(-dy/l*.5+.5)*255;nrm[o+2]=(1/l*.5+.5)*255;nrm[o+3]=255}};
  put(D.CONC,holeTile(5,{R:.24,H:.1,hole:[.06,.06,.06],crater:[.6,.58,.54],chip:[.66,.64,.6],dust:[.42,.41,.39],cracks:4,spall:1}),5);
  put(D.CONC2,holeTile(17,{R:.2,H:.08,hole:[.05,.05,.05],crater:[.56,.55,.52],chip:[.62,.6,.57],dust:[.38,.37,.35],cracks:2,spall:1.3}),5);
  put(D.PLASTER,holeTile(29,{R:.22,H:.09,hole:[.07,.06,.05],crater:[.85,.83,.78],chip:[.9,.88,.84],dust:[.6,.58,.55],cracks:5,spall:.9}),4);
  put(D.BRICK,holeTile(41,{R:.26,H:.1,hole:[.07,.04,.03],crater:[.72,.42,.3],chip:[.78,.52,.4],dust:[.5,.33,.26],cracks:3,spall:1.1}),5);
  put(D.WOOD,holeTile(53,{R:.18,H:.09,hole:[.06,.035,.02],crater:[.86,.68,.45],chip:[.92,.76,.52],dust:[.5,.38,.25],cracks:6,sx:.55,sy:1.15,spall:.6,ringA:.15}),5);
  put(D.DENT,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),n=fbm(u*10,v*10,3);let a=0,h=0;
    if(r<.12){o[0]=o[1]=o[2]=.06;a=1;h=-1}else if(r<.3){const k=(r-.12)/.18;const m=.75+.25*n;o[0]=.78*m;o[1]=.78*m;o[2]=.8*m;a=1;h=-.8*(1-k)}
    else if(r<.42+.08*n){o[0]=o[1]=o[2]=.55+.2*n;a=sstep(.5,.3,r)*.8;h=-.05}
    const soot=Math.exp(-r*r*6)*.35;if(soot>a){a=Math.max(a,soot);o[0]=o[1]=o[2]=.12}o[3]=a*sstep(.98,.85,Math.max(Math.abs(x),Math.abs(y)));o[4]=h},6);
  put(D.PIERCE,holeTile(67,{R:.18,H:.1,hole:[.03,.03,.03],crater:[.82,.82,.84],chip:[.75,.75,.78],dust:[.25,.25,.25],cracks:0,spall:.5,ringA:.25}),6);
  put(D.GLASS,(()=>{srand(91);const cr=[];for(let i=0;i<14;i++)cr.push({a:sr()*TAU,l:.45+sr()*.55,w:.006+sr()*.008});const rings=[.25+sr()*.1,.48+sr()*.12,.7+sr()*.1];
    return(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);let a=0,h=0;
      if(r<.05){a=.95;o[0]=o[1]=o[2]=.1;h=-1}else if(r<.11){a=.9;o[0]=o[1]=o[2]=.92;h=-.4}
      else{for(const q of cr){if(r>q.l)continue;const d=Math.abs(((th-q.a+Math.sin(r*9+q.a)*.08)%TAU+TAU*1.5)%TAU-Math.PI)*r;if(d<q.w){a=Math.max(a,(1-d/q.w)*.85*(1-r/q.l*.6))}}
        for(const rr of rings){if(r>rr+.02||fbm(th*2+rr*9,1,2)<.45)continue;const d=Math.abs(r-rr-(fbm(th*3,rr*7,2)-.5)*.08);if(d<.008)a=Math.max(a,(1-d/.008)*.7)}
        o[0]=o[1]=o[2]=.95;h=-a*.3}
      o[3]=a*sstep(1,.9,r);o[4]=h}})(),3);
  put(D.DIRT,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),n=fbm(u*6,v*6+3,4),n2=vn(u*30,v*30);
    let a=clamp((sstep(.75,.15,r+(n-.5)*.4))*(.7+.5*n2),0,1);o[0]=.16+.1*n;o[1]=.12+.07*n;o[2]=.08+.05*n;
    if(r<.16+.06*n){o[0]=o[1]*.6;o[1]*=.6;o[2]*=.6;a=1}o[3]=a;o[4]=-sstep(.4,0,r)*(.6+.4*n2)},4);
  put(D.GRASS,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),n=fbm(u*7+3,v*7,4),n2=vn(u*34,v*34);
    let a=clamp(sstep(.6,.1,r+(n-.5)*.35)*(.6+.6*n2),0,1);o[0]=.2+.08*n;o[1]=.15+.06*n;o[2]=.08;if(r<.12)a=1;o[3]=a;o[4]=-sstep(.35,0,r)*n2},4);
  const scorch=(seed,big)=>(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),th=Math.atan2(y,x);const n=fbm(u*5+seed,v*5,5),st=fbm(Math.cos(th)*3+seed,Math.sin(th)*3,4);
    let a=clamp(sstep(.95,.2,r+(n-.5)*.5-(st-.5)*(big?.6:.3))*1.25,0,1);const c=.03+.06*n*(r);o[0]=c*1.1;o[1]=c;o[2]=c*.9;
    if(r<.3&&n>.55){o[0]+=.04;o[1]+=.03}o[3]=a*sstep(1,.92,r);o[4]=-(n-.5)*.3*a};
  put(D.SCORCH,scorch(3,true),2);put(D.SCORCH2,scorch(13,false),2);
  put(D.SKID,(u,v,o)=>{const x=u*2-1;const tread=.62+.38*Math.pow(Math.abs(Math.sin(x*11)),.5);const n=fbm(u*9,v*2,4);
    o[0]=o[1]=o[2]=.025;o[3]=sstep(.98,.7,Math.abs(x))*clamp(tread*(.45+.7*n),0,1)*.9;o[4]=0},1);
  put(D.NAIL,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y);let a=0,h=0;if(r<.32){const m=.55+.35*(1-r/.32)-.2*sstep(.24,.3,r);o[0]=m;o[1]=m;o[2]=m*1.04;a=1;h=.4*(1-r/.32)}
    else if(r<.42){o[0]=o[1]=o[2]=.05;a=sstep(.42,.33,r)*.9;h=-.3}o[3]=a;o[4]=h},6);
  put(D.CLOTH,(u,v,o)=>{const x=u*2-1,y=v*2-1,r=Math.hypot(x,y),n=fbm(u*8,v*8,3);o[0]=o[1]=o[2]=.2;o[3]=sstep(.5,.2,r+(n-.5)*.3)*.5;o[4]=0},1);
  const nt=new T.DataTexture(nrm,at.W,at.W,T.RGBAFormat);nt.generateMipmaps=true;nt.minFilter=T.LinearMipmapLinearFilter;nt.magFilter=T.LinearFilter;nt.needsUpdate=true;
  return{map:at.tex(true),normal:nt}}

/* small leaf texture (canvas) for the falling-leaf instanced mesh */
function buildLeafTex(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.translate(32,32);x.rotate(-.6);
  const g=x.createLinearGradient(-26,0,26,0);g.addColorStop(0,'#c8c8c8');g.addColorStop(1,'#ffffff');x.fillStyle=g;
  x.beginPath();x.moveTo(-26,0);x.bezierCurveTo(-12,-15,14,-16,27,0);x.bezierCurveTo(14,16,-12,15,-26,0);x.fill();
  x.strokeStyle='rgba(90,80,60,.55)';x.lineWidth=1.4;x.beginPath();x.moveTo(-28,0);x.lineTo(24,0);for(let i=-14;i<18;i+=8){x.moveTo(i,0);x.lineTo(i+6,-7);x.moveTo(i,0);x.lineTo(i+6,7)}x.stroke();
  const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t}

/* ---------------------------------------------------------------- billboard particle batch */
const F_NEW=1,F_BOUNCE=2,F_TRACER=4,F_FLAT=8,F_SEG=16;const SOFT_LAYER=27;
const PVS=`attribute vec3 iPos;attribute vec4 iDir;attribute vec4 iSize;attribute vec4 iCol;
uniform float uN;uniform vec2 uFog;
varying vec2 vUv;varying vec2 vUv2;varying float vBlend;varying vec4 vCol;varying float vFog;varying vec2 vQ;varying float vWY;varying float vSoft;varying float vDepth;varying float vEmit;varying float vErode;
void main(){vec2 c=position.xy;vec4 mv;vec3 wp=iPos;vEmit=iDir.w==0.?iDir.x:0.;vErode=iDir.w==0.?iDir.y:(iDir.w>0.?iSize.z:0.);
  if(iDir.w>0.){vec3 a=(viewMatrix*vec4(iPos,1.)).xyz;vec3 b=(viewMatrix*vec4(iPos-iDir.xyz*iDir.w,1.)).xyz;vec3 ax=a-b;vec3 m=(a+b)*.5;
    vec3 sd=cross(ax,m);float sl=length(sd);sd=sl>1e-7?sd/sl:vec3(0.,1.,0.);mv=vec4(m+ax*c.x+sd*c.y*iSize.x,1.);vQ=vec2(c.x*2.,c.y*2.);}
  else if(iDir.w<0.){float cs=cos(iSize.z),sn=sin(iSize.z);vec2 r=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs)*iSize.xy;wp=iPos+vec3(r.x,0.,r.y);mv=viewMatrix*vec4(wp,1.);vQ=c*2.;}
  else{float cs=cos(iSize.z),sn=sin(iSize.z);vec2 r=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs);mv=viewMatrix*vec4(iPos,1.);vec2 o=r*iSize.xy;mv.xy+=o;
    wp=iPos+(vec4(o,0.,0.)*viewMatrix).xyz;vQ=r*2.;}
  vWY=wp.y;vSoft=max(iDir.w>0.?iSize.x*2.:max(iSize.x,iSize.y),.02)*.35;
  /* flipbook: integer part = tile, fraction = blend toward the next frame */
  float fi=iSize.w;float f0=floor(fi+.001);vBlend=fi-f0;float f1=f0+(vBlend>.002?1.:0.);
  vUv=(vec2(mod(f0,uN),floor(f0/uN))+uv)/uN;vUv2=(vec2(mod(f1,uN),floor(f1/uN))+uv)/uN;
  vCol=iCol;vDepth=-mv.z;vFog=smoothstep(uFog.x,uFog.y,vDepth);gl_Position=projectionMatrix*mv;}`;
const SOFT_GLSL=`uniform sampler2D uDepth;uniform vec4 uDepthP;
float fxSceneZ(){float d=texture2D(uDepth,gl_FragCoord.xy*uDepthP.zw).x;return 2.*uDepthP.x*uDepthP.y/(uDepthP.y+uDepthP.x-(d*2.-1.)*(uDepthP.y-uDepthP.x));}`;
const PFS_ADD=`uniform sampler2D uMap;varying vec2 vUv;varying vec2 vUv2;varying float vBlend;varying vec4 vCol;varying float vFog;varying float vDepth;varying float vSoft;
#ifdef SOFT
${SOFT_GLSL}
#endif
void main(){vec3 t=texture2D(uMap,vUv).rgb;if(vBlend>.002)t=mix(t,texture2D(uMap,vUv2).rgb,vBlend);float k=1.;
  #ifdef SOFT
  float dz=fxSceneZ()-vDepth;if(dz<0.)discard;k=clamp(dz/(vSoft*.5),0.,1.);
  #endif
  vec3 c=t*vCol.rgb*vCol.a*k*(1.-vFog)*smoothstep(.04,.25,vDepth);
  gl_FragColor=vec4(c,1.);
  #include <encodings_fragment>
}`;
/* premultiplied: lit smoke is tone mapped like the scene; emissive (fire) is added untonemapped so it blooms */
const PFS_ALPHA=`uniform sampler2D uMap;uniform vec3 uFogC,uSunV,uSunC,uAmb;uniform float uGround;
varying vec2 vUv;varying vec2 vUv2;varying float vBlend;varying vec4 vCol;varying float vFog;varying vec2 vQ;varying float vWY;varying float vSoft;varying float vDepth;varying float vEmit;varying float vErode;
#ifdef SOFT
${SOFT_GLSL}
#endif
void main(){vec4 t=texture2D(uMap,vUv);if(vBlend>.002)t=mix(t,texture2D(uMap,vUv2),vBlend);
  /* erosion: thin parts of the sprite dissolve first, so puffs break up instead of fading as discs */
  float ta=t.a;if(vErode>.001)ta*=smoothstep(vErode,vErode+.32,ta);
  float a=ta*vCol.a;
  #ifdef SOFT
  float dz=fxSceneZ()-vDepth;if(dz<0.)discard;a*=clamp(dz/vSoft,0.,1.);
  #else
  a*=clamp((vWY-uGround)/max(vSoft,.02),0.,1.);
  #endif
  a*=smoothstep(.12,.9,vDepth);
  if(a<.004)discard;float qq=min(dot(vQ,vQ),1.);vec3 n=normalize(vec3(vQ*.9,sqrt(1.-qq)+.2));
  float l=clamp(dot(n,uSunV)*.75+.35,0.,1.);float sky=.62+.38*n.y;
  vec3 alb=vEmit>0.?vec3(.05,.046,.043):vCol.rgb*t.rgb;vec3 col=alb*(uAmb*sky+uSunC*l*l);col=mix(col,uFogC,vFog);
  #if defined( TONE_MAPPING )
  col=toneMapping(col);
  #endif
  vec3 em=vEmit>0.?t.rgb*vCol.rgb*vEmit*(1.-vFog):vec3(0.);
  gl_FragColor=vec4((col+em)*a,a);
  #include <encodings_fragment>
}`;
function PSys(cap,additive,map,N,uniforms){
  this.cap=cap;this.n=0;this.w=0;this.additive=additive;
  const F=()=>new Float32Array(cap);
  this.arrs=[];const mk=n=>{const a=F();this.arrs.push(a);this[n]=a};
  ['px','py','pz','vx','vy','vz','ox','oy','oz','age','life','s0','s1','asp','len','sf','rot','rv','r','g','b','a','fi','fo','fr0','frn','grav','drag','cool','bnc','gp','em','er'].forEach(mk);
  this.fl=new Uint8Array(cap);
  const g=new T.InstancedBufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));g.setIndex([0,1,2,0,2,3]);
  const IA=(n)=>{const a=new T.InstancedBufferAttribute(new Float32Array(cap*n),n);a.setUsage(T.DynamicDrawUsage);return a};
  this.aPos=IA(3);this.aDir=IA(4);this.aSize=IA(4);this.aCol=IA(4);
  g.setAttribute('iPos',this.aPos);g.setAttribute('iDir',this.aDir);g.setAttribute('iSize',this.aSize);g.setAttribute('iCol',this.aCol);g.instanceCount=0;
  this.geo=g;
  this.mat=new T.ShaderMaterial({uniforms:Object.assign({uMap:{value:map},uN:{value:N}},uniforms),vertexShader:PVS,fragmentShader:additive?PFS_ADD:PFS_ALPHA,
    transparent:true,depthWrite:false,depthTest:true,toneMapped:!additive,fog:false,
    blending:T.CustomBlending,blendSrc:T.OneFactor,blendDst:additive?T.OneFactor:T.OneMinusSrcAlphaFactor,blendEquation:T.AddEquation});
  this.mesh=new T.Mesh(g,this.mat);this.mesh.frustumCulled=false;this.mesh.renderOrder=additive?30:20;this.mesh.name=additive?'fx-additive':'fx-smoke';
}
PSys.prototype.setSoft=function(on){const m=this.mat;if(!!m.defines.SOFT===on)return;if(on)m.defines.SOFT=1;else delete m.defines.SOFT;m.depthTest=!on;m.needsUpdate=true;
  if(on)this.mesh.layers.set(SOFT_LAYER);else this.mesh.layers.set(0)};
PSys.prototype.add=function(x,y,z,vx,vy,vz,life,s0,s1,tile,r,g,b,a){
  if(this.n>=this.cap)return -1;const i=this.n++;
  this.px[i]=x;this.py[i]=y;this.pz[i]=z;this.vx[i]=vx;this.vy[i]=vy;this.vz[i]=vz;this.ox[i]=this.oy[i]=this.oz[i]=0;
  this.age[i]=0;this.life[i]=life;this.s0[i]=s0;this.s1[i]=s1;this.asp[i]=1;this.len[i]=0;this.sf[i]=0;this.rot[i]=R()*TAU;this.rv[i]=0;
  this.r[i]=r;this.g[i]=g;this.b[i]=b;this.a[i]=a;this.fi[i]=0;this.fo[i]=.5;this.fr0[i]=tile;this.frn[i]=1;this.grav[i]=0;this.drag[i]=0;this.cool[i]=0;this.bnc[i]=.3;this.gp[i]=2;this.em[i]=0;this.er[i]=0;
  this.fl[i]=F_NEW;return i};
PSys.prototype.kill=function(i){const j=--this.n;if(i!==j){for(const a of this.arrs)a[i]=a[j];this.fl[i]=this.fl[j]}};
PSys.prototype.clear=function(){this.n=0;this.w=0};
PSys.prototype.update=function(dt,groundAt){
  const P=this.aPos.array,Dd=this.aDir.array,Sz=this.aSize.array,C=this.aCol.array;let w=0;
  for(let i=0;i<this.n;i++){let fl=this.fl[i];
    if(fl&F_NEW){this.fl[i]=fl&~F_NEW}else this.age[i]+=dt;
    const age=this.age[i],life=this.life[i];
    if(age>=life){this.kill(i);i--;continue}
    if(age<0)continue;
    const t=age/life;let x,y,z,dx=0,dy=0,dz=0,dl=0,sw,sh;
    if(fl&F_TRACER){const sp=this.sf[i],tr=age*sp,mx=this.s1[i],head=Math.min(tr,mx),tail=Math.max(0,tr-this.len[i]);
      if(tail>=mx){this.kill(i);i--;continue}
      dx=this.vx[i];dy=this.vy[i];dz=this.vz[i];x=this.ox[i]+dx*head;y=this.oy[i]+dy*head;z=this.oz[i]+dz*head;dl=Math.max(head-tail,.001);sw=this.s0[i];sh=1;
      /* very short tracers (point blank) fade rather than pop */
      C[w*4+3]=this.a[i]*clamp(mx/6,.35,1)*(tail>0&&tr>mx?clamp(1-(tr-mx)/this.len[i],0,1)*.6+.4:1)}
    else{
      if(age>0&&dt>0){const k=1/(1+this.drag[i]*dt);this.vx[i]*=k;this.vy[i]*=k;this.vz[i]*=k;this.vy[i]-=this.grav[i]*dt;
        this.px[i]+=this.vx[i]*dt;this.py[i]+=this.vy[i]*dt;this.pz[i]+=this.vz[i]*dt;this.rot[i]+=this.rv[i]*dt;
        if(fl&F_BOUNCE){let gy=groundAt(this.px[i],this.pz[i]);
          if(solidAt){const sh=solidAt(this.px[i],this.pz[i]);if(sh!=null&&sh>gy){if(this.py[i]<sh-.03){const ox=this.px[i]-this.vx[i]*dt,oz=this.pz[i]-this.vz[i]*dt,s1=solidAt(this.px[i],oz),hx=s1!=null&&s1>this.py[i];
              if(hx){this.px[i]=ox;this.vx[i]*=-.4}else{this.pz[i]=oz;this.vz[i]*=-.4}}else gy=sh}}
          if(this.py[i]<gy){this.py[i]=gy+.001;if(this.vy[i]<0)this.vy[i]*=-this.bnc[i];this.vx[i]*=.55;this.vz[i]*=.55}}}
      x=this.px[i];y=this.py[i];z=this.pz[i];
      const e=1-Math.pow(1-t,this.gp[i]),s=this.s0[i]+(this.s1[i]-this.s0[i])*e;sw=s;sh=s*this.asp[i];
      let al=this.a[i];if(this.fi[i]>0&&t<this.fi[i])al*=t/this.fi[i];if(t>this.fo[i])al*=1-sstep(this.fo[i],1,t);C[w*4+3]=al;
      if(fl&F_SEG){const vx=this.vx[i],vy=this.vy[i],vz=this.vz[i],sp=Math.sqrt(vx*vx+vy*vy+vz*vz);
        if(sp>1e-3){dx=vx/sp;dy=vy/sp;dz=vz/sp}else{dx=this.ox[i];dy=this.oy[i];dz=this.oz[i]}
        dl=this.len[i]*(.6+.4*e)+this.sf[i]*sp;if(dl<.002)dl=.002;sh=1;
        /* segment particles are placed head-first: shift so the streak trails behind the particle */
}
      else if(fl&F_FLAT){dl=-1}else{dx=this.em[i];dy=this.er[i]*Math.pow(t,1.3)}}
    let r=this.r[i],g=this.g[i],b=this.b[i];
    if(this.cool[i]>0){const k=1-t,c=this.cool[i];r*=Math.pow(k,c*.15);g*=Math.pow(k,c*.6);b*=Math.pow(k,c)}
    let fr=this.fr0[i];if(this.frn[i]>1)fr+=Math.min(this.frn[i]-1.001,t*(this.frn[i]-1));
    P[w*3]=x;P[w*3+1]=y;P[w*3+2]=z;Dd[w*4]=dx;Dd[w*4+1]=dy;Dd[w*4+2]=dz;Dd[w*4+3]=dl;
    Sz[w*4]=sw;Sz[w*4+1]=sh;Sz[w*4+2]=(fl&(F_SEG|F_TRACER))?this.er[i]*Math.pow(t,1.3):this.rot[i];Sz[w*4+3]=fr;C[w*4]=r;C[w*4+1]=g;C[w*4+2]=b;w++}
  this.w=w};
/* direct instance for persistent ambient things (written after update, before end) */
PSys.prototype.push=function(x,y,z,s,asp,rot,tile,r,g,b,a){if(this.w>=this.cap)return;const w=this.w++,P=this.aPos.array,Dd=this.aDir.array,Sz=this.aSize.array,C=this.aCol.array;
  P[w*3]=x;P[w*3+1]=y;P[w*3+2]=z;Dd[w*4]=Dd[w*4+1]=Dd[w*4+2]=Dd[w*4+3]=0;Sz[w*4]=s;Sz[w*4+1]=s*asp;Sz[w*4+2]=rot;Sz[w*4+3]=tile;C[w*4]=r;C[w*4+1]=g;C[w*4+2]=b;C[w*4+3]=a};
PSys.prototype.end=function(){const w=this.w;this.geo.instanceCount=w;
  for(const a of[this.aPos,this.aDir,this.aSize,this.aCol]){a.updateRange.offset=0;a.updateRange.count=Math.max(1,w)*a.itemSize;a.needsUpdate=true}};

/* ---------------------------------------------------------------- instanced rigid bits (chips, splinters, glass, brass) */
function Bodies(cap,geo,mat,o){
  this.cap=cap;this.n=0;this.o=o||{};
  this.mesh=new T.InstancedMesh(geo,mat,cap);this.mesh.count=0;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.castShadow=!!this.o.shadow;this.mesh.receiveShadow=false;
  if(this.o.color){this.mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(cap*3).fill(1),3);this.mesh.instanceColor.setUsage(T.DynamicDrawUsage)}
  this.arrs=[];['px','py','pz','vx','vy','vz','ex','ey','ez','wx','wy','wz','sx','sy','sz','age','life','rad','rest','kind'].forEach(n=>{const a=new Float32Array(cap);this.arrs.push(a);this[n]=a});
  this.twins=[]}
Bodies.prototype.add=function(x,y,z,vx,vy,vz,sx,sy,sz,life,r,g,b){
  let i;if(this.n<this.cap)i=this.n++;else{/* recycle the oldest */let best=0,ba=-1;for(let k=0;k<this.n;k++)if(this.age[k]>ba){ba=this.age[k];best=k}i=best}
  this.px[i]=x;this.py[i]=y;this.pz[i]=z;this.vx[i]=vx;this.vy[i]=vy;this.vz[i]=vz;this.ex[i]=R()*TAU;this.ey[i]=R()*TAU;this.ez[i]=R()*TAU;
  const sp=this.o.spin||20;this.wx[i]=rnd(-sp,sp);this.wy[i]=rnd(-sp,sp);this.wz[i]=rnd(-sp,sp);this.sx[i]=sx;this.sy[i]=sy;this.sz[i]=sz;
  this.age[i]=0;this.life[i]=life;this.rad[i]=(this.o.lie?sx:Math.min(sx,sy,sz))*.5;this.rest[i]=0;this.kind[i]=0;
  if(this.o.color){const c=this.mesh.instanceColor.array;c[i*3]=r;c[i*3+1]=g;c[i*3+2]=b}return i};
Bodies.prototype.kill=function(i){const j=--this.n;if(i===j)return;for(const a of this.arrs)a[i]=a[j];if(this.o.color){const c=this.mesh.instanceColor.array;c[i*3]=c[j*3];c[i*3+1]=c[j*3+1];c[i*3+2]=c[j*3+2]}};
Bodies.prototype.update=function(dt,groundAt,onBounce){const o=this.o,G=o.grav??9.8,bo=o.bounce??.35,lie=o.lie;
  for(let i=0;i<this.n;i++){this.age[i]+=dt;if(this.age[i]>=this.life[i]){this.kill(i);i--;continue}
    if(!this.rest[i]&&dt>0){const dr=o.drag?1/(1+o.drag*dt):1;this.vx[i]*=dr;this.vz[i]*=dr;this.vy[i]=this.vy[i]*dr-G*dt;
      if(o.flutter){const a=this.age[i]*o.flutter+i;this.vx[i]+=Math.sin(a*1.3)*dt*2;this.vz[i]+=Math.cos(a*1.1)*dt*2}
      this.px[i]+=this.vx[i]*dt;this.py[i]+=this.vy[i]*dt;this.pz[i]+=this.vz[i]*dt;this.ex[i]+=this.wx[i]*dt;this.ey[i]+=this.wy[i]*dt;this.ez[i]+=this.wz[i]*dt;
      let gy=groundAt(this.px[i],this.pz[i])+this.rad[i];
      if(solidAt){const bot=this.py[i]-this.rad[i]+.02,sh=solidAt(this.px[i],this.pz[i]);
        if(sh!=null&&sh>bot){/* went into a wall: step back on the axis that hit it and bounce off */
          const ox=this.px[i]-this.vx[i]*dt,oz=this.pz[i]-this.vz[i]*dt,s1=solidAt(this.px[i],oz),s2=solidAt(ox,this.pz[i]),hx=s1!=null&&s1>bot,hz=s2!=null&&s2>bot;
          if(hx||!hz){this.px[i]=ox;this.vx[i]*=-.35}if(hz||!hx){this.pz[i]=oz;this.vz[i]*=-.35}this.wx[i]*=.6;this.wz[i]*=.6;
          if(onBounce){const sp=Math.abs(this.vx[i])+Math.abs(this.vz[i]);if(sp>.5)onBounce(this,i,sp*2.5)}}
        const st=solidAt(this.px[i],this.pz[i]);if(st!=null&&st+this.rad[i]>gy&&this.py[i]-this.rad[i]>=st-.06)gy=st+this.rad[i]}
      if(this.py[i]<gy){this.py[i]=gy;const imp=-this.vy[i];
        if(imp>0){if(onBounce&&imp>.8)onBounce(this,i,imp);this.vy[i]=imp*bo*rnd(.6,1.1);this.vx[i]*=.55;this.vz[i]*=.55;this.wx[i]*=.5;this.wy[i]*=.5;this.wz[i]*=.5;
          if(lie){this.ex[i]=lerp(this.ex[i],Math.PI/2,.6);this.ez[i]*=.4}}
        if(this.vy[i]<.5&&Math.abs(this.vx[i])+Math.abs(this.vz[i])<.35){this.rest[i]=1;this.vy[i]=0;if(lie){this.ex[i]=Math.PI/2;this.ez[i]=0}else if(o.flat){this.ex[i]=0;this.ez[i]=0}}}}
    const k=Math.min(1,(this.life[i]-this.age[i])/.5);_e.set(this.ex[i],this.ey[i],this.ez[i]);_q.setFromEuler(_e);_v.set(this.px[i],this.py[i],this.pz[i]);
    _sc.set(this.sx[i]*k,this.sy[i]*k,this.sz[i]*k);_m.compose(_v,_q,_sc);this.mesh.setMatrixAt(i,_m)}
  this.mesh.count=this.n;this.mesh.instanceMatrix.needsUpdate=true;if(this.o.color&&this.n)this.mesh.instanceColor.needsUpdate=true;
  for(const t of this.twins)t.count=this.n};
Bodies.prototype.clear=function(){this.n=0;this.mesh.count=0;for(const t of this.twins)t.count=0};

/* ---------------------------------------------------------------- decals (instanced quads, lit, normal-mapped, faded) */
function Decals(cap,mat,tiles){
  this.cap=cap;this.head=0;this.total=0;
  const g=new T.PlaneGeometry(1,1);this.attr=new T.InstancedBufferAttribute(new Float32Array(cap*4),4);this.attr.setUsage(T.DynamicDrawUsage);g.setAttribute('aDecal',this.attr);
  /* per-decal clip rectangle in the quad's own [-.5,.5] space: the part hanging over a face edge is discarded */
  const cl=new Float32Array(cap*4);for(let i=0;i<cap;i++){cl[i*4]=-.5;cl[i*4+1]=.5;cl[i*4+2]=-.5;cl[i*4+3]=.5}
  this.clip=new T.InstancedBufferAttribute(cl,4);this.clip.setUsage(T.DynamicDrawUsage);g.setAttribute('aClip',this.clip);
  this.par=new Array(cap).fill(null);this.loc=new Float32Array(cap*16);this.nPar=0;
  this.mesh=new T.InstancedMesh(g,mat,cap);this.mesh.count=0;this.mesh.frustumCulled=false;this.mesh.receiveShadow=true;this.mesh.renderOrder=10;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  this.mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(cap*3).fill(1),3);this.mesh.instanceColor.setUsage(T.DynamicDrawUsage);
  this.age=new Float32Array(cap);this.life=new Float32Array(cap);this.a0=new Float32Array(cap);this.tiles=tiles;this.limit=cap}
/* qo: optional orientation (else normal + roll); clip: optional [xmin,xmax,ymin,ymax]; attach: optional Object3D the decal rides on */
Decals.prototype.add=function(pos,nrm,w,h,tile,roll,alpha,life,r,g,b,qo,clip,attach){
  if(this.head>=this.limit)this.head=0;const i=this.head;this.head=(this.head+1)%this.limit;this.total++;this.mesh.count=Math.max(this.mesh.count,Math.min(this.total,this.limit));
  if(qo)_q.copy(qo);else{_q.setFromUnitVectors(ZAX,nrm);_q2.setFromAxisAngle(ZAX,roll);_q.multiply(_q2)}_v.copy(pos).addScaledVector(nrm,.004+.0006*(this.total%8));_sc.set(w,h,1);
  _m.compose(_v,_q,_sc);this.mesh.setMatrixAt(i,_m);this.mesh.instanceMatrix.needsUpdate=true;
  const c=this.clip.array;if(clip){c[i*4]=clip[0];c[i*4+1]=clip[1];c[i*4+2]=clip[2];c[i*4+3]=clip[3]}else{c[i*4]=c[i*4+2]=-.5;c[i*4+1]=c[i*4+3]=.5}this.clip.needsUpdate=true;
  if(this.par[i])this.nPar--;this.par[i]=attach||null;
  if(attach){this.nPar++;attach.updateMatrixWorld();_m2.copy(attach.matrixWorld).invert().multiply(_m);_m2.toArray(this.loc,i*16)}
  const N=this.tiles,a=this.attr.array;a[i*4]=(tile%N)/N;a[i*4+1]=Math.floor(tile/N)/N;a[i*4+2]=alpha;a[i*4+3]=0;this.attr.needsUpdate=true;
  this.mesh.setColorAt(i,_c.setRGB(r??1,g??1,b??1));this.mesh.instanceColor.needsUpdate=true;
  this.age[i]=0;this.life[i]=life;this.a0[i]=alpha;return i};
Decals.prototype.update=function(dt){const n=this.mesh.count,a=this.attr.array;let ch=false;
  if(this.nPar){for(let i=0;i<n;i++){const p=this.par[i];if(!p||this.a0[i]<=0)continue;
      let o=p;while(o.parent)o=o.parent;if(!o.isScene){_m.makeScale(0,0,0)}else{_m.fromArray(this.loc,i*16).premultiply(p.matrixWorld)}this.mesh.setMatrixAt(i,_m)}
    this.mesh.instanceMatrix.needsUpdate=true}
  for(let i=0;i<n;i++){if(this.a0[i]<=0)continue;this.age[i]+=dt;const left=this.life[i]-this.age[i];
    if(left<6){const v=left<=0?0:this.a0[i]*left/6;if(v!==a[i*4+2]){a[i*4+2]=v;ch=true}if(left<=0){this.a0[i]=0;_m.makeScale(0,0,0);this.mesh.setMatrixAt(i,_m);this.mesh.instanceMatrix.needsUpdate=true}}}
  if(ch)this.attr.needsUpdate=true};
Decals.prototype.clear=function(){this.head=0;this.total=0;this.mesh.count=0;this.a0.fill(0);this.par.fill(null);this.nPar=0};

/* ================================================================= module state */
let ready=false,scene=null,camera=null,renderer=null,assets=null,root=null;
let ADD=null,ALP=null,decals=null,marks=null,chips=null,splinters=null,shards=null,flakes=null,brass=null,hulls=null,leaves=null;
let muzzleLight=null,blastLight=null,muzzleHold=0,blastT=1e9,blastPeak=0;
let sunL=null,hemiL=null;
let simTime=0;
const U={uDepth:{value:null},uDepthP:{value:new T.Vector4(.05,420,1,1)},uFog:{value:new T.Vector2(1e4,2e4)},uFogC:{value:new T.Color()},uSunV:{value:new T.Vector3(0,1,0)},uSunC:{value:new T.Color(1,1,1)},uAmb:{value:new T.Color(.5,.5,.55)},uGround:{value:-1e4}};
const QL={low:{k:.45,decals:40,amb:.35,trail:0,light:1},med:{k:.75,decals:64,amb:.65,trail:.15,light:1},high:{k:1,decals:80,amb:1,trail:.3,light:1}};
let Q=QL.high,qName='high';
const cnt=n=>Math.max(1,Math.round(n*Q.k));
let groundAt=()=>0,solidAt=null;

/* feedback state */
const FB={trauma:0,kickP:0,kickY:0,kickR:0,back:0,t:0,hit:0,health:1,lowPulse:0,supp:0,desat:0,graded:null,cssF:''};
const GU={desat:0,hurt:0,blur:0,pulse:0};/* returned by gradeUniforms(); one object, reused */

/* DOM */
let dom=null;
function css(){if(document.getElementById('htfx-css'))return;const s=document.createElement('style');s.id='htfx-css';s.textContent=
`.htfx-dmg{position:fixed;left:50%;top:50%;width:320px;height:320px;margin:-160px 0 0 -160px;pointer-events:none;z-index:6}
.htfx-dmg svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.htfx-dmg g{opacity:0;transition:none}
.htfx-vig{position:fixed;inset:0;pointer-events:none;opacity:0;z-index:5;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 48%,rgba(120,8,0,.35) 72%,rgba(110,0,0,.85) 100%)}
.htfx-low{position:fixed;inset:0;pointer-events:none;opacity:0;z-index:5;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 40%,rgba(30,0,0,.55) 100%)}
.htfx-pop{position:fixed;left:0;top:0;pointer-events:none;z-index:7;white-space:nowrap;font-family:var(--display,"Bowlby One","Arial Black",Impact,sans-serif);font-size:26px;letter-spacing:.03em;
  color:#ffd65a;text-shadow:0 2px 0 rgba(60,30,0,.75),0 0 12px rgba(255,190,60,.65),0 0 2px #000;will-change:transform,opacity;opacity:0}
.htfx-pop small{display:block;font-family:var(--body,Rubik,system-ui,sans-serif);font-size:12px;font-weight:800;letter-spacing:.12em;color:#fff3c4;text-align:center;margin-top:-2px}`;
  document.head.appendChild(s)}
function buildDom(parent){css();parent=parent||document.body;const ns='http://www.w3.org/2000/svg';
  const dmg=document.createElement('div');dmg.className='htfx-dmg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 320 320');
  const defs=document.createElementNS(ns,'defs');defs.innerHTML='<linearGradient id="htfxG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3a1c" stop-opacity="0"/><stop offset=".25" stop-color="#ff4a24" stop-opacity=".9"/><stop offset=".5" stop-color="#ff7a4a"/><stop offset=".75" stop-color="#ff4a24" stop-opacity=".9"/><stop offset="1" stop-color="#ff3a1c" stop-opacity="0"/></linearGradient>'+
    '<filter id="htfxB" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>';svg.appendChild(defs);
  const arcs=[];const R0=128,half=34*Math.PI/180,x1=160+R0*Math.sin(-half),y1=160-R0*Math.cos(-half),x2=160+R0*Math.sin(half),y2=160-R0*Math.cos(half);
  const d=`M${x1.toFixed(1)} ${y1.toFixed(1)}A${R0} ${R0} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  for(let i=0;i<6;i++){const g=document.createElementNS(ns,'g');
    g.innerHTML=`<path d="${d}" fill="none" stroke="url(#htfxG)" stroke-width="30" filter="url(#htfxB)" opacity=".75"/><path d="${d}" fill="none" stroke="rgba(40,0,0,.45)" stroke-width="13"/><path d="${d}" fill="none" stroke="url(#htfxG)" stroke-width="9"/>`+
      `<path d="M152 ${160-R0-12}L160 ${160-R0-24}L168 ${160-R0-12}Z" fill="#ff5a32" opacity=".95"/>`;svg.appendChild(g);arcs.push({g,t:0,ang:0,str:1})}
  dmg.appendChild(svg);parent.appendChild(dmg);
  const vig=document.createElement('div');vig.className='htfx-vig';parent.appendChild(vig);
  const low=document.createElement('div');low.className='htfx-low';parent.appendChild(low);
  const pops=[];for(let i=0;i<6;i++){const p=document.createElement('div');p.className='htfx-pop';parent.appendChild(p);pops.push({el:p,t:0,life:1.4,x:0,y:0,z:0,vis:false})}
  return{dmg,arcs,vig,low,pops,last:{vig:-1,low:-1}}}

/* ================================================================= init / quality / clear */
function init(o){
  if(ready)return FX;scene=o.scene;camera=o.camera;renderer=o.renderer||null;assets=o.assets||null;if(o.groundAt)groundAt=o.groundAt;
  if(o.solidAt)solidAt=o.solidAt;root=new T.Group();root.name='HT.FX';scene.add(root);
  const addTex=buildAdd(),alpTex=buildAlpha(),dec=buildDecals();
  ADD=new PSys(1600,true,addTex,8,{uFog:U.uFog,uDepth:U.uDepth,uDepthP:U.uDepthP});
  ALP=new PSys(1600,false,alpTex,8,U);
  root.add(ALP.mesh,ADD.mesh);
  const dm=new T.MeshStandardMaterial({map:dec.map,normalMap:dec.normal,normalScale:new T.Vector2(1.2,1.2),transparent:true,depthWrite:false,roughness:.92,metalness:0,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-4});
  dm.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aDecal;attribute vec4 aClip;varying float vDecalA;varying vec4 vClip;varying vec2 vLocal;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\nvUv=uv*.25+aDecal.xy;vDecalA=aDecal.z;vClip=aClip;vLocal=position.xy;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vDecalA;varying vec4 vClip;varying vec2 vLocal;')
      .replace('#include <map_fragment>','if(vLocal.x<vClip.x||vLocal.x>vClip.y||vLocal.y<vClip.z||vLocal.y>vClip.w)discard;\n#include <map_fragment>\ndiffuseColor.a*=vDecalA;')};
  decals=new Decals(80,dm,4);marks=new Decals(260,dm,4);root.add(decals.mesh,marks.mesh);
  /* debris */
  const lit=(c,r,m,ex)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m},ex||{}));
  chips=new Bodies(160,new T.IcosahedronGeometry(.5,0),lit(0xffffff,.92,0),{color:true,bounce:.3,spin:18});
  splinters=new Bodies(80,new T.BoxGeometry(1,1,1),lit(0xffffff,.8,0),{color:true,bounce:.25,lie:false,spin:25,drag:.4});
  const tri=new T.BufferGeometry();tri.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.3,.5,0,-.4,0,0,.6],3));tri.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));
  shards=new Bodies(90,tri,lit(0xd9f2f4,.04,.1,{transparent:true,opacity:.55,side:T.DoubleSide,envMapIntensity:2.5}),{bounce:.2,spin:22,flat:true});
  const flakeG=new T.PlaneGeometry(1,1);flakeG.rotateX(-Math.PI/2);
  flakes=new Bodies(90,flakeG,lit(0xffffff,.7,0,{side:T.DoubleSide}),{color:true,bounce:.1,spin:14,drag:2.2,flat:true});
  /* brass: cylinder with a narrow neck; shotgun hulls are a plastic body plus a brass head sharing one instance matrix */
  const bpts=[[0,0],[.5,0],[.5,.06],[.46,.08],[.5,.1],[.5,.72],[.36,.85],[.36,1]].map(p=>new T.Vector2(p[0],p[1]-.5));
  const brassG=new T.LatheGeometry(bpts,8);
  const brassM=lit(0xd3a24e,.28,1,{envMapIntensity:1.4});
  brass=new Bodies(64,brassG,brassM,{color:true,bounce:.38,lie:true,spin:30});
  const hullG=new T.CylinderGeometry(.5,.5,.78,10);hullG.translate(0,.11,0);const headG=new T.CylinderGeometry(.52,.52,.22,10);headG.translate(0,-.39,0);
  hulls=new Bodies(24,hullG,lit(0xffffff,.55,0),{color:true,bounce:.25,lie:true,spin:18});
  const head=new T.InstancedMesh(headG,brassM.clone(),24);head.instanceMatrix=hulls.mesh.instanceMatrix;head.count=0;head.frustumCulled=false;hulls.twins.push(head);
  root.add(chips.mesh,splinters.mesh,shards.mesh,flakes.mesh,brass.mesh,hulls.mesh,head);
  const leafM=new T.MeshStandardMaterial({map:buildLeafTex(),alphaTest:.5,side:T.DoubleSide,roughness:.8});
  const leafG=new T.PlaneGeometry(1,1);leafG.rotateX(-Math.PI/2);leaves=new Bodies(64,leafG,leafM,{color:true,grav:.9,bounce:0,spin:3,drag:1.5,flutter:2.2,flat:true,shadow:true});root.add(leaves.mesh);
  /* fixed light count (no shader recompiles): one muzzle light, one blast light */
  muzzleLight=new T.PointLight(0xffb468,0,8,2);blastLight=new T.PointLight(0xff9a4a,0,22,2);root.add(muzzleLight,blastLight);
  scene.traverse(x=>{if(x.isDirectionalLight&&!sunL)sunL=x;if(x.isHemisphereLight&&!hemiL)hemiL=x});
  if(o.dom!==false)dom=buildDom(o.domParent);
  ready=true;setQuality(o.quality||'high');return FX}
function setQuality(q){Q=QL[q]||QL.high;qName=QL[q]?q:'high';if(decals)decals.limit=Math.min(decals.cap,Q.decals);}
function clear(){if(!ready)return;ADD.clear();ALP.clear();ADD.end();ALP.end();decals.clear();marks.clear();
  for(const b of[chips,splinters,shards,flakes,brass,hulls,leaves])b.clear();
  for(let i=emitters.length-1;i>=0;i--)emitters[i].remove();amb.on=false;amb.motes.length=0;
  for(const g of glows.slice())g.remove();for(const b of beacons.slice())b.remove();
  muzzleLight.intensity=0;blastLight.intensity=0;blastT=1e9;skidHeads.forEach(h=>h.t=-1e9);
  FB.trauma=FB.kickP=FB.kickY=FB.kickR=FB.back=0;FB.hit=0;FB.supp=0;
  if(dom){dom.arcs.forEach(a=>{a.t=0;a.g.style.opacity=0});dom.pops.forEach(p=>{p.t=0;p.el.style.opacity=0})}}

/* ================================================================= spawn helpers */
function smoke(x,y,z,vx,vy,vz,life,s0,s1,shade,alpha,o){const i=ALP.add(x,y,z,vx,vy,vz,life,s0,s1,(o&&o.tile!=null)?o.tile:S.SMOKE+((R()*4)|0),shade[0],shade[1],shade[2],alpha);if(i<0)return -1;
  ALP.rv[i]=rnd(-.6,.6);ALP.fi[i]=o&&o.fi!=null?o.fi:.08;ALP.fo[i]=o&&o.fo!=null?o.fo:.35;ALP.drag[i]=o&&o.drag!=null?o.drag:2;ALP.grav[i]=o&&o.grav!=null?o.grav:-.15;ALP.gp[i]=o&&o.gp?o.gp:3;return i}
function glow(x,y,z,s0,s1,life,tile,r,g,b,a){const i=ADD.add(x,y,z,0,0,0,life,s0,s1,tile,r,g,b,a??1);if(i>=0){ADD.fo[i]=.2}return i}
function seg(x,y,z,dx,dy,dz,len,w,life,tile,r,g,b){const i=ADD.add(x,y,z,0,0,0,life,w,w,tile,r,g,b,1);if(i<0)return -1;ADD.fl[i]|=F_SEG;ADD.ox[i]=dx;ADD.oy[i]=dy;ADD.oz[i]=dz;ADD.len[i]=len;ADD.rot[i]=0;ADD.fo[i]=.3;return i}
function spark(x,y,z,vx,vy,vz,life,w,sf,r,g,b,bounce){const i=ADD.add(x,y,z,vx,vy,vz,life,w,w*.6,A.SPARK,r,g,b,1);if(i<0)return -1;ADD.fl[i]|=F_SEG|(bounce?F_BOUNCE:0);
  ADD.sf[i]=sf;ADD.len[i]=.01;ADD.grav[i]=9.8;ADD.drag[i]=.6;ADD.cool[i]=2;ADD.fo[i]=.55;ADD.rot[i]=0;ADD.ox[i]=0;ADD.oy[i]=1;ADD.oz[i]=0;return i}
/* random unit vector into _v3 */
function rdir(out){const u=R()*2-1,a=R()*TAU,s=Math.sqrt(1-u*u);return out.set(s*Math.cos(a),u,s*Math.sin(a))}
/* tangent basis for a normal */
const _t1=new T.Vector3(),_t2=new T.Vector3();
function basis(n){_t1.set(Math.abs(n.y)>.9?1:0,Math.abs(n.y)>.9?0:1,0);_t2.crossVectors(n,_t1).normalize();_t1.crossVectors(_t2,n).normalize()}

/* ================================================================= muzzle flashes */
const FL={
  pistol:  {star:.3, tile:A.STAR4,cone:.32,cw:.11,side:0,  smoke:3,wisp:1,light:2.4,emb:0,k:1},
  revolver:{star:.42,tile:A.STAR6,cone:.46,cw:.17,side:.2, smoke:6,wisp:2,light:3.6,emb:3,k:1.2},
  smg:     {star:.24,tile:A.STAR4,cone:.28,cw:.09,side:0,  smoke:2,wisp:1,light:2,  emb:0,k:.9},
  rifle:   {star:.34,tile:A.STAR5,cone:.5, cw:.12,side:0,  smoke:3,wisp:1,light:2.8,emb:0,k:1},
  hunter:  {star:.38,tile:A.STAR5,cone:.85,cw:.18,side:0,  smoke:6,wisp:2,light:3.5,emb:2,k:1.2},
  shotgun: {star:.5, tile:A.BURST,cone:.75,cw:.3, side:0,  smoke:9,wisp:3,light:4.5,emb:7,k:1.3},
  double:  {star:.58,tile:A.BURST,cone:.85,cw:.34,side:0,  smoke:11,wisp:3,light:5,emb:9,k:1.4},
  beanbag: {star:.36,tile:A.BURST,cone:.45,cw:.22,side:0,  smoke:6,wisp:2,light:3,  emb:2,k:1},
  flare:   {star:.4, tile:A.STAR6,cone:.4, cw:.2, side:0,  smoke:8,wisp:3,light:5,  emb:10,k:1,col:[4,.9,.5]},
  nailer:  {star:0,  tile:0,      cone:0,  cw:0,  side:0,  smoke:0,wisp:0,light:0,  emb:0,k:.6,air:true},
  enemy:   {star:.3, tile:A.STAR4,cone:.34,cw:.12,side:0,  smoke:3,wisp:1,light:2.4,emb:0,k:1}};
const _mp=new T.Vector3(),_md=new T.Vector3(),_side=new T.Vector3(),_upv=new T.Vector3();
function muzzleFlash(pos,dir,o){if(!ready)return;o=o||{};const f=FL[o.type]||FL.pistol,fp=!!o.firstPerson,sc=(o.scale||1)*(fp?.62:1);
  _md.copy(dir).normalize();_mp.copy(pos);const col=f.col||[2.9,1.75,.75];
  _side.crossVectors(_md,UP);if(_side.lengthSq()<1e-4)_side.set(1,0,0);_side.normalize();_upv.crossVectors(_side,_md).normalize();
  if(f.air){/* nailer: a little puff of compressor air and dust */
    for(let k=0;k<cnt(3);k++)smoke(_mp.x,_mp.y,_mp.z,_md.x*rnd(1,2.5)+rnd(-.3,.3),_md.y*1.5+rnd(0,.3),_md.z*rnd(1,2.5)+rnd(-.3,.3),rnd(.4,.8),.03*sc,.18*sc,[.9,.9,.92],.18,{drag:5,tile:S.DUST});return}
  const v=rnd(.8,1.15);let face=1;if(camera){_v.copy(camera.position).sub(_mp).normalize();face=.4+.6*Math.abs(_v.dot(_md))}const bk=f.tile===A.BURST?.75:1;
  glow(_mp.x,_mp.y,_mp.z,f.star*.5*sc*v,f.star*.4*sc*v,.05,A.GLOW,col[0]*.5,col[1]*.45,col[2]*.4);
  let i=glow(_mp.x+_md.x*.02,_mp.y+_md.y*.02,_mp.z+_md.z*.02,f.star*sc*v*face,f.star*sc*v*.85*face,.05,f.tile,col[0]*bk,col[1]*bk,col[2]*bk);if(i>=0)ADD.fo[i]=.4;
  /* forward cone, two overlapping layers so every shot looks a little different */
  const cl=f.cone*sc*rnd(.8,1.2);
  if(cl>0){seg(_mp.x+_md.x*cl,_mp.y+_md.y*cl,_mp.z+_md.z*cl,_md.x,_md.y,_md.z,cl,f.cw*1.4*sc*rnd(.85,1.15),.045,A.FLAME,col[0]*.85,col[1]*.8,col[2]*.75);
    const c2=cl*rnd(.45,.75);seg(_mp.x+_md.x*c2,_mp.y+_md.y*c2,_mp.z+_md.z*c2,_md.x,_md.y,_md.z,c2,f.cw*sc*.7,.035,A.FLAME2,col[0],col[1]*1.05,col[2]*1.1)}
  if(f.side){for(const s of[-1,1]){const L=f.side*sc*rnd(.7,1.2),bx=_mp.x-_md.x*.12,by=_mp.y-_md.y*.12,bz=_mp.z-_md.z*.12;
    seg(bx+_side.x*s*L,by+_side.y*s*L,bz+_side.z*s*L,_side.x*s,_side.y*s,_side.z*s,L,f.cw*sc*.6,.04,A.FLAME2,col[0]*.7,col[1]*.7,col[2]*.7)}}
  if(o.type==='rifle'){/* flash-hider flower: small side prongs */for(let k=0;k<3;k++){const a=k*TAU/3+R(),L=.08*sc;_v.copy(_side).multiplyScalar(Math.cos(a)).addScaledVector(_upv,Math.sin(a));
    seg(_mp.x+_v.x*L+_md.x*.04,_mp.y+_v.y*L+_md.y*.04,_mp.z+_v.z*L+_md.z*.04,_v.x,_v.y,_v.z,L,.035*sc,.035,A.FLAME2,col[0]*.6,col[1]*.6,col[2]*.6)}}
  for(let k=0;k<cnt(f.emb);k++){const s=rnd(4,12);spark(_mp.x,_mp.y,_mp.z,_md.x*s+rnd(-1.5,1.5),_md.y*s+rnd(-1,1.5),_md.z*s+rnd(-1.5,1.5),rnd(.15,.45),.012,.012,5,2.8,1.1,false)}
  /* the light: held for one rendered frame, then gone */
  if(f.light&&Q.light){const L=muzzleLight;L.position.set(_mp.x+_md.x*.15,_mp.y+_md.y*.15,_mp.z+_md.z*.15);L.intensity=Math.max(L.intensity,f.light*(o.lightScale||1)*(fp?.8:1));muzzleHold=1}
  /* smoke: a fast front jet that stalls, plus slow wisps that hang at the barrel and drift */
  const sa=fp?.75:1;
  for(let k=0;k<cnt(f.smoke);k++){const s=rnd(.6,3.2)*f.k;smoke(_mp.x+_md.x*rnd(.03,.25),_mp.y+_md.y*rnd(.03,.25),_mp.z+_md.z*rnd(.03,.25),_md.x*s+rnd(-.25,.25),_md.y*s+rnd(.05,.35),_md.z*s+rnd(-.25,.25),
    rnd(.8,1.8),.06*sc*f.k,rnd(.45,.8)*sc*f.k,[.8,.81,.85],.42*sa,{drag:3.5,grav:-.25,fo:.25,gp:5})}
  for(let k=0;k<cnt(f.wisp);k++){i=smoke(_mp.x-_md.x*.02,_mp.y,_mp.z-_md.z*.02,rnd(-.06,.06),rnd(.12,.3),rnd(-.06,.06),rnd(1.8,3.2),.03*sc,rnd(.18,.3)*sc,[.85,.86,.9],.3*sa,{tile:S.WISP,drag:.6,grav:-.08,fi:.15,fo:.3});
    if(i>=0){ALP.rv[i]=rnd(-.3,.3);ALP.asp[i]=1.6}}}

/* ================================================================= tracers */
const _ta=new T.Vector3(),_tb=new T.Vector3();
function tracer(from,to,o){if(!ready)return;o=o||{};_ta.copy(from);_tb.copy(to).sub(from);const L=_tb.length();if(L<.05)return;_tb.multiplyScalar(1/L);
  const enemy=!!o.enemy,ally=!!o.ally,speed=o.speed||(enemy?170:ally?230:330),len=Math.min(L,o.length||(enemy?3.2:4.2)),w=o.width||(enemy?.06:.048);
  const c=enemy?[6,1.9,.85]:ally?[4.2,3.6,2]:[5.2,3.6,1.8];
  /* starts slightly ahead: the first frame already shows a streak leaving the muzzle */
  const i=ADD.add(_ta.x,_ta.y,_ta.z,_tb.x,_tb.y,_tb.z,(L+len)/speed+.02,w,w,A.TRACER,c[0],c[1],c[2],1);
  if(i>=0){ADD.fl[i]|=F_TRACER;ADD.ox[i]=_ta.x;ADD.oy[i]=_ta.y;ADD.oz[i]=_ta.z;ADD.sf[i]=speed;ADD.len[i]=len;ADD.s1[i]=L;ADD.age[i]=rnd(.25,.6)*len/speed;ADD.fl[i]&=~F_NEW}
  /* faint smoke trail on some rounds */
  if(R()<(o.trail!=null?o.trail:Q.trail)){const n=Math.min(14,Math.floor(L/1.4));for(let k=1;k<=n;k++){const d=k*1.4*rnd(.8,1.2);if(d>L)break;
      const j=smoke(_ta.x+_tb.x*d,_ta.y+_tb.y*d,_ta.z+_tb.z*d,rnd(-.05,.05),rnd(.02,.1),rnd(-.05,.05),rnd(.6,1.2),.03,.16,[.9,.9,.92],.07,{tile:S.WISP,drag:1,grav:-.05,fi:.05,fo:.2});
      if(j>=0){ALP.age[j]=-d/speed;ALP.fl[j]&=~F_NEW;ALP.asp[j]=.6}}}
  /* near miss: rounds passing close to the camera suppress */
  if(camera&&(enemy||o.suppress)){_v.copy(camera.position).sub(_ta);const t=clamp(_v.dot(_tb),0,L);_v2.copy(_ta).addScaledVector(_tb,t);const d=_v2.distanceTo(camera.position);
    if(d<2.2&&t<L-.5){const k=(2.2-d)/2.2;FB.supp=Math.min(1,FB.supp+k*.55);shake(k*.18);if(FX.onNearMiss)FX.onNearMiss(_v2,d)}}}

/* ================================================================= impacts */
const SURF={
  concrete:{dec:[D.CONC,D.CONC2],ds:.25,dust:[.6,.58,.54],chip:[.58,.56,.53],nChip:7,nDust:10,kind:'chip'},
  plaster: {dec:[D.PLASTER],ds:.24,dust:[.8,.78,.74],chip:[.88,.86,.82],nChip:5,nDust:8,kind:'chip'},
  brick:   {dec:[D.BRICK],ds:.26,dust:[.64,.42,.33],chip:[.58,.3,.22],nChip:7,nDust:7,kind:'chip'},
  wood:    {dec:[D.WOOD],ds:.18,dust:[.55,.43,.3],chip:[.82,.66,.45],nChip:6,nDust:4,kind:'splinter'},
  metal:   {dec:[D.DENT,D.PIERCE],ds:.1,dust:[.5,.5,.5],chip:[.4,.4,.42],nChip:0,nDust:2,kind:'spark',sparks:10},
  vehicle: {dec:[D.PIERCE,D.DENT],ds:.09,dust:[.5,.5,.5],chip:[.7,.1,.1],nChip:4,nDust:2,kind:'paint',sparks:7},
  glass:   {dec:[D.GLASS],ds:.34,dust:[.9,.93,.95],chip:[.85,.95,.95],nChip:9,nDust:3,kind:'glass'},
  dirt:    {dec:[D.DIRT],ds:.2,dust:[.45,.36,.26],chip:[.3,.23,.16],nChip:7,nDust:9,kind:'clod',plume:1},
  grass:   {dec:[D.GRASS],ds:.18,dust:[.48,.42,.3],chip:[.22,.36,.14],nChip:6,nDust:6,kind:'grassbits',plume:.7},
  cloth:   {dec:null,ds:0,dust:[.85,.84,.82],chip:[.8,.8,.8],nChip:0,nDust:6,kind:'fiber'},
  nail:    {dec:[D.NAIL],ds:.03,dust:[.6,.58,.55],chip:[.5,.5,.5],nChip:1,nDust:2,kind:'chip'}};
const _ip=new T.Vector3(),_in=new T.Vector3();
function impact(pos,normal,surface,o,qo,clipFor){if(!ready)return;o=o||{};const s=SURF[surface]||SURF.concrete,big=o.big?1.8:1;
  _ip.copy(pos);_in.copy(normal||UP);if(_in.lengthSq()<1e-6)_in.set(0,1,0);_in.normalize();basis(_in);
  const px=_ip.x+_in.x*.03,py=_ip.y+_in.y*.03,pz=_ip.z+_in.z*.03;
  /* decal */
  if(s.dec&&o.decal!==false){const tile=s.dec[(R()*s.dec.length)|0],sz=s.ds*rnd(.85,1.2)*(o.big?1.4:1),tint=rnd(.9,1.05);
    let clip=null;if(clipFor){clip=_clip;/* clipFor = distances to the face edges along +x,+y,-x,-y of the decal */
      _clip[0]=-Math.min(.5,clipFor[2]/sz);_clip[1]=Math.min(.5,clipFor[0]/sz);_clip[2]=-Math.min(.5,clipFor[3]/sz);_clip[3]=Math.min(.5,clipFor[1]/sz)}
    decals.add(_ip,_in,sz,sz,tile,R()*TAU,1,surface==='glass'?90:60,tint,tint,tint,qo||null,clip,o.attach&&o.attach.isObject3D?o.attach:null)}
  /* dust, tinted by the surface: first a quick directional burst of streaks along the normal that stalls in a few
     centimetres of travel, then a soft lit cloud that drifts and tears apart (noise erosion) instead of fading as discs */
  const dc=o.color&&surface==='cloth'?o.color:s.dust;const dt_=surface==='cloth'?S.FIBER:S.DUST;
  for(let k=0;k<cnt((s.kind==='spark'?2:4)*big);k++){rdir(_v3).multiplyScalar(.38).add(_in).normalize();const sp=rnd(4,8.5)*big,sh=rnd(.88,1.05);
    const i=ALP.add(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.35,.6),.045*big,rnd(.16,.26)*big,dt_,dc[0]*sh,dc[1]*sh,dc[2]*sh,rnd(.5,.7));
    if(i>=0){ALP.fl[i]|=F_SEG;ALP.sf[i]=.085;ALP.len[i]=.05*big;ALP.drag[i]=7.5;ALP.er[i]=.5;ALP.fo[i]=.2;ALP.gp[i]=3;ALP.ox[i]=_v3.x;ALP.oy[i]=_v3.y;ALP.oz[i]=_v3.z;ALP.grav[i]=-.1}}
  const heavy=surface==='dirt'||surface==='grass';
  for(let k=0;k<cnt(s.nDust*.65*big);k++){const sp=rnd(.4,2.2)*big,sh=rnd(.85,1.05);rdir(_v3).multiplyScalar(.6).add(_in).normalize();
    const i=smoke(px+_in.x*.04,py+_in.y*.04,pz+_in.z*.04,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(1.2,2.6)*big,.06*big,rnd(.28,.6)*big,[dc[0]*sh,dc[1]*sh,dc[2]*sh],rnd(.32,.5),
      {tile:k%2?dt_:S.SMOKE+(k&3),drag:3.2,grav:heavy?.35:-.08,fi:.04,fo:.25,gp:4});
    if(i>=0){ALP.er[i]=.62;ALP.rv[i]=rnd(-.8,.8)}}
  if(s.kind!=='spark'){const i=smoke(px,py,pz,_in.x*.5,_in.y*.5,_in.z*.5,.22,.05*big,.18*big,[dc[0]*1.1,dc[1]*1.1,dc[2]*1.1],.65,{tile:S.DUST,drag:4,grav:0,fo:.2,gp:6});if(i>=0){ALP.fi[i]=0;ALP.er[i]=.35}}
  if(s.plume){for(let k=0;k<cnt(5*big);k++){const sp=rnd(3,7)*big;rdir(_v3).multiplyScalar(.3).add(_in).normalize();
    const i=smoke(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.5,.9),.03,rnd(.12,.25)*big,[s.dust[0]*.8,s.dust[1]*.8,s.dust[2]*.8],.7,{tile:S.CHUNK,drag:1.2,grav:9,fo:.6});if(i>=0)ALP.asp[i]=rnd(.7,1.3)}}
  /* surface-specific bits */
  const nC=cnt(s.nChip*big);
  if(s.kind==='chip'||s.kind==='clod'||s.kind==='paint'||s.kind==='grassbits'){
    for(let k=0;k<nC;k++){const sp=rnd(1.5,5);rdir(_v3).multiplyScalar(.75).add(_in).normalize();const z=rnd(.012,.03)*(s.kind==='clod'?1.5:1)*big,sh=rnd(.85,1.1);
      if(s.kind==='paint'||s.kind==='grassbits'){const c=s.kind==='paint'?(o.color||s.chip):s.chip;flakes.add(px,py,pz,_v3.x*sp,_v3.y*sp+1,_v3.z*sp,z*1.4,z,z*.9,rnd(3,6),c[0]*sh,c[1]*sh,c[2]*sh)}
      else chips.add(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,z,z*rnd(.6,1),z*rnd(.6,1),rnd(4,8),s.chip[0]*sh,s.chip[1]*sh,s.chip[2]*sh)}}
  if(s.kind==='splinter'){for(let k=0;k<nC;k++){const sp=rnd(2,5.5);rdir(_v3).multiplyScalar(.7).add(_in).normalize();const L=rnd(.03,.08)*big,sh=rnd(.85,1.1);
    splinters.add(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.004,.008),L,rnd(.004,.008),rnd(4,8),s.chip[0]*sh,s.chip[1]*sh,s.chip[2]*sh)}}
  if(s.kind==='glass'){for(let k=0;k<cnt(12*big);k++){const sp=rnd(1,4.5);rdir(_v3).multiplyScalar(1.1).add(_in).normalize();const z=rnd(.02,.06)*big;
      shards.add(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,z,z,z,rnd(4,7))}
    for(let k=0;k<cnt(6);k++){rdir(_v3).multiplyScalar(.6).add(_in).normalize();const sp=rnd(1,3),i=ADD.add(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.25,.6),.05,.02,A.SPARKLE,3,3.3,3.6,1);if(i>=0){ADD.grav[i]=6;ADD.drag[i]=1;ADD.rv[i]=rnd(-4,4)}}}
  if(s.sparks){glow(px,py,pz,.16*big,.08,.05,A.GLOW,6,4,2);
    for(let k=0;k<cnt(s.sparks*big);k++){rdir(_v3).multiplyScalar(1.1).add(_in).normalize();const sp=rnd(2.5,9);
      spark(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.2,.65),rnd(.008,.014),.022,7,4.3,1.8,true)}
    smoke(px,py,pz,_in.x*.4,_in.y*.4+.2,_in.z*.4,1,.03,.22,[.5,.5,.52],.25,{drag:2})}
  if(s.kind==='fiber'){for(let k=0;k<cnt(5);k++){rdir(_v3).multiplyScalar(.9).add(_in).normalize();const sp=rnd(1,3);
    const i=smoke(px,py,pz,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.5,1),.015,.05,dc,.8,{tile:S.DOT,drag:3,grav:1.2});if(i>=0)ALP.asp[i]=rnd(.3,.6)}}}
/* convenience: take a THREE.Raycaster hit, find the world normal and the surface, call impact */
const _hn=new T.Vector3(),_nm=new T.Matrix3();
const TEXSURF={asphalt:'concrete',sidewalk:'concrete',grass:'grass',brick:'brick',siding:'wood',roof:'concrete',plaster:'plaster',concfloor:'concrete',woodfloor:'wood',metal:'metal',rustmetal:'metal',fence:'metal'};
let texMap=null;
function surfaceOf(hit){let o=hit.object;while(o){const u=o.userData;if(u){if(u.surface)return u.surface;if(u.ent)return 'cloth'}o=o.parent}
  let m=hit.object.material;if(Array.isArray(m))m=m[(hit.face&&hit.face.materialIndex)||0];
  if(m){if(m.userData&&m.userData.surface)return m.userData.surface;
    if(m.map&&assets&&assets.textures){if(!texMap){texMap=new Map();for(const k in assets.textures){const t=assets.textures[k];if(t&&t.map)texMap.set(t.map,TEXSURF[k]||'concrete')}}const s=texMap.get(m.map);if(s)return s}
    if(m.transparent&&m.opacity<.6&&m.roughness!=null&&m.roughness<.2)return 'glass'}
  o=hit.object;let name='';while(o){name+=' '+(o.name||'');o=o.parent}name=name.toLowerCase();
  if(/glass|window|pane/.test(name))return 'glass';if(/car|van|suv|sedan|hatch|truck/.test(name))return 'vehicle';
  if(/barrel|metal|lamp|mailbox|utility|sign|fence|pipe/.test(name))return 'metal';if(/crate|pallet|table|chest|wood|door|plank/.test(name))return 'wood';
  if(/couch|sofa|chair|bag|cloth|mattress/.test(name))return 'cloth';if(/tree|bush|hedge/.test(name))return 'wood';
  return 'concrete'}
const _clip=[0,0,0,0],_d4=[0,0,0,0],_inv=new T.Matrix4(),_pl=new T.Vector3(),_ax=new T.Vector3(),_bx=new T.Vector3(),_mb=new T.Matrix4(),_hq=new T.Quaternion(),_ho={};
function hit(h,o){if(!ready||!h)return;o=o||{};const obj=h.object;
  if(h.face){_hn.copy(h.face.normal);_nm.getNormalMatrix(obj.matrixWorld);_hn.applyMatrix3(_nm).normalize()}else _hn.set(0,1,0);
  const surface=o.surface||surfaceOf(h);let qo=null,d4=null;
  /* decals are squared to the face and clipped to its edges when the hit face is an axis-aligned face of the mesh's own box
     (walls, crates, boxes); anything else falls back to a free rotation with no clip */
  const g=obj.geometry;if(h.face&&g&&!obj.isInstancedMesh&&!obj.isSkinnedMesh&&o.clip!==false){if(!g.boundingBox)g.computeBoundingBox();const bb=g.boundingBox,ln=h.face.normal;
    const anx=Math.abs(ln.x),any=Math.abs(ln.y),anz=Math.abs(ln.z),ax=anx>any&&anx>anz?0:any>anz?1:2;
    if(Math.max(anx,any,anz)>.985){_inv.copy(obj.matrixWorld).invert();_pl.copy(h.point).applyMatrix4(_inv);const a=(ax+1)%3,b=(ax+2)%3;
      _ax.setFromMatrixColumn(obj.matrixWorld,a);_bx.setFromMatrixColumn(obj.matrixWorld,b);const la=_ax.length(),lb=_bx.length();_ax.multiplyScalar(1/la);_bx.multiplyScalar(1/lb);
      const pa=_pl.getComponent(a),pb=_pl.getComponent(b);
      _d4[0]=(bb.max.getComponent(a)-pa)*la;_d4[1]=(bb.max.getComponent(b)-pb)*lb;_d4[2]=(pa-bb.min.getComponent(a))*la;_d4[3]=(pb-bb.min.getComponent(b))*lb;
      if(_v.crossVectors(_ax,_bx).dot(_hn)<0){_bx.negate();const t=_d4[1];_d4[1]=_d4[3];_d4[3]=t}
      /* random quarter turn keeps it square to the face but varies the look */
      for(let k=(R()*4)|0;k>0;k--){_v.copy(_ax);_ax.copy(_bx);_bx.copy(_v).negate();const t=_d4[0];_d4[0]=_d4[1];_d4[1]=_d4[2];_d4[2]=_d4[3];_d4[3]=t}
      _mb.makeBasis(_ax,_bx,_hn);_hq.setFromRotationMatrix(_mb);qo=_hq;d4=_d4}}
  let att=o.attach;if(att===true)att=obj;else if(!att){let p=obj;while(p){if(p.userData&&p.userData.fxAttach){att=p;break}p=p.parent}}
  if(att&&att!==o.attach){for(const k in _ho)delete _ho[k];Object.assign(_ho,o);_ho.attach=att;o=_ho}
  impact(h.point,_hn,surface,o,qo,d4)}

/* ================================================================= shells */
const SHELL={'9mm':{l:.019,r:.0048,col:[1,1,1],h:0},'357':{l:.033,r:.0048,col:[1,1,1],h:0},'556':{l:.045,r:.0048,col:[1,1,1],h:0},'308':{l:.051,r:.006,col:[1,1,1],h:0},
  '12ga':{l:.07,r:.0105,col:[.75,.08,.06],h:1},bean:{l:.07,r:.0105,col:[.12,.42,.18],h:1}};
const GUNSHELL={pistol:'9mm',smg:'9mm',rifle:'556',hunter:'308',shotgun:'12ga',double:'12ga',beanbag:'bean',revolver:'357'};
function shell(pos,dir,type){if(!ready)return;const t=SHELL[type]||SHELL[GUNSHELL[type]]||SHELL['9mm'];const k=1.5;/* oversized so they read at third-person distance */
  _v.copy(dir||_v.set(1,.4,0)).normalize();const sp=t.h?rnd(1.2,2):rnd(2,3.4);
  const B=t.h?hulls:brass;const i=B.add(pos.x,pos.y,pos.z,_v.x*sp+rnd(-.3,.3),_v.y*sp+rnd(.8,1.6),_v.z*sp+rnd(-.3,.3),t.r*2*k,t.l*k,t.r*2*k,rnd(7,10),t.col[0],t.col[1],t.col[2]);
  B.kind[i]=t.h?1:0;
  smoke(pos.x,pos.y,pos.z,_v.x*.3,.2,_v.z*.3,.7,.01,.07,[.85,.85,.87],.12,{tile:S.WISP})}

/* ================================================================= explosions */
const _xp=new T.Vector3();
function explosion(pos,size,o){if(!ready)return;o=o||{};const s=size||1;_xp.copy(pos);const gy=groundAt(_xp.x,_xp.z);
  /* first frames: a hard white-hot core */
  glow(_xp.x,_xp.y+.35*s,_xp.z,1.8*s,3.4*s,.09,A.GLOW,4,2.6,1.4);
  glow(_xp.x,_xp.y+.35*s,_xp.z,1.6*s,2.8*s,.06,A.BURST,3.2,2,.9);
  /* fireball: a few large turbulent billows that blow out fast, cool, and hand over to the smoke (noise-eroded as they age) */
  for(let k=0;k<cnt(14*s+4);k++){rdir(_v3);_v3.y=Math.abs(_v3.y)*.7+.3;_v3.normalize();const sp=rnd(2.2,6.5)*Math.sqrt(s),r0=rnd(0,.25)*s;
    const i=ALP.add(_xp.x+_v3.x*r0,_xp.y+_v3.y*r0+.25*s,_xp.z+_v3.z*r0,_v3.x*sp,_v3.y*sp+rnd(1,2.5),_v3.z*sp,rnd(.6,1)*Math.sqrt(s),rnd(1.5,2.1)*s,rnd(2.4,3.2)*s,S.FIRE,rnd(2.6,3),rnd(1.75,2),rnd(1.2,1.4),1);
    if(i>=0){ALP.em[i]=1;ALP.frn[i]=16;ALP.drag[i]=3.4;ALP.grav[i]=-2.2;ALP.fi[i]=0;ALP.fo[i]=.55;ALP.rv[i]=rnd(-1.4,1.4);ALP.age[i]=-rnd(0,.05);ALP.gp[i]=4;ALP.er[i]=.55}}
  {const i=ALP.add(_xp.x,_xp.y+.5*s,_xp.z,0,1.5,0,.75*Math.sqrt(s),2.4*s,3.6*s,S.FIRE,2.8,1.9,1.3,1);if(i>=0){ALP.em[i]=1;ALP.frn[i]=16;ALP.drag[i]=2;ALP.fo[i]=.5;ALP.gp[i]=4;ALP.er[i]=.5;ALP.rv[i]=rnd(-.6,.6)}}
  /* rolling dark smoke: born inside the fireball, rises in a turbulent column and tears apart */
  for(let k=0;k<cnt(26*s+6);k++){rdir(_v3);_v3.y=Math.abs(_v3.y);const sp=rnd(1,4.5)*Math.sqrt(s),sh=rnd(.07,.14),late=k%3===0;
    const i=smoke(_xp.x+_v3.x*.5*s,_xp.y+.6*s+_v3.y*.5*s,_xp.z+_v3.z*.5*s,_v3.x*sp*.7,rnd(2,4.5)*Math.sqrt(s)*(late?.7:1),_v3.z*sp*.7,rnd(5,9),rnd(1,1.8)*s,rnd(4,7)*s,[sh,sh*.96,sh*.92],rnd(.7,.92),
      {drag:.9,grav:-.3,fi:.04,fo:.35,gp:2.5});
    if(i>=0){ALP.age[i]=-(late?rnd(.35,.9):rnd(.12,.4));ALP.fl[i]&=~F_NEW;ALP.rv[i]=rnd(-.5,.5);ALP.er[i]=.6}}
  /* glowing embers drifting up through the smoke */
  for(let k=0;k<cnt(30*s);k++){rdir(_v3);_v3.y=Math.abs(_v3.y)+.4;_v3.normalize();const sp=rnd(1.5,5)*Math.sqrt(s);
    const i=ADD.add(_xp.x+rnd(-.6,.6)*s,_xp.y+rnd(.3,1.4)*s,_xp.z+rnd(-.6,.6)*s,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(1.2,3.2),rnd(.03,.06),.02,A.EMBER,6,3,1.1,1);
    if(i>=0){ADD.drag[i]=1.6;ADD.grav[i]=-.6;ADD.cool[i]=1.6;ADD.fo[i]=.4;ADD.age[i]=-rnd(0,.4);ADD.fl[i]&=~F_NEW}}
  /* ground dust ring */
  for(let k=0;k<cnt(18*s);k++){const a=k/(18*s)*TAU+rnd(-.1,.1),sp=rnd(6,11)*Math.sqrt(s);
    smoke(_xp.x+Math.cos(a)*.5,gy+.3,_xp.z+Math.sin(a)*.5,Math.cos(a)*sp,rnd(.3,1),Math.sin(a)*sp,rnd(1.6,3),.6*s,rnd(2,3.2)*s,[.6,.53,.44],.5,{drag:2.4,grav:-.1,tile:S.DUST})}
  /* shockwave: a flat ring racing over the ground and an air ring facing the camera */
  let i=ADD.add(_xp.x,gy+.06,_xp.z,0,0,0,.42,.6*s,14*s,A.RING,2.2,1.9,1.6,1);if(i>=0){ADD.fl[i]|=F_FLAT;ADD.fo[i]=.1}
  i=ALP.add(_xp.x,gy+.08,_xp.z,0,0,0,.9,1*s,15*s,S.RING,.75,.7,.62,.45);if(i>=0){ALP.fl[i]|=F_FLAT;ALP.fo[i]=.2;ALP.grav[i]=0}
  /* embers and burning debris */
  for(let k=0;k<cnt(40*s);k++){rdir(_v3);_v3.y=Math.abs(_v3.y)+.2;_v3.normalize();const sp=rnd(5,17)*Math.sqrt(s);
    spark(_xp.x,_xp.y+.4*s,_xp.z,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.6,2),rnd(.014,.026),.018,7,3.6,1.3,true)}
  for(let k=0;k<cnt(16*s);k++){rdir(_v3);_v3.y=Math.abs(_v3.y)+.3;_v3.normalize();const sp=rnd(4,11)*Math.sqrt(s),z=rnd(.03,.09)*s,c=rnd(.06,.16);
    chips.add(_xp.x+_v3.x*.4,_xp.y+.4*s,_xp.z+_v3.z*.4,_v3.x*sp,_v3.y*sp,_v3.z*sp,z,z*rnd(.4,1),z*rnd(.5,1),rnd(6,10),c,c*.95,c*.9)}
  /* scorch on the ground */
  _v.set(_xp.x,gy,_xp.z);marks.add(_v,UP,3.4*s,3.4*s,R()<.5?D.SCORCH:D.SCORCH2,R()*TAU,.95,120);
  blastLight.position.set(_xp.x,_xp.y+1*s,_xp.z);blastPeak=6*s;blastT=0;blastLight.intensity=blastPeak;
  /* shake falls off with distance */
  if(camera){const d=camera.position.distanceTo(_xp);shake(clamp(1.3*s/(1+d*.12),0,1),{kick:.02*s/(1+d*.2)})}
  if(o.linger!==false){const h=emitter('smoke',{pos:_xp.clone(),size:s*.8,rate:7,life:7,shade:.13});}
  if(FX.onExplosion)FX.onExplosion(_xp,s)}

/* ================================================================= camera shake and recoil */
function shake(amount,o){FB.trauma=Math.min(1,FB.trauma+(amount||0));if(o&&o.kick){FB.kickP+=o.kick;FB.kickY+=(o.kickYaw!=null?o.kickYaw:rnd(-.3,.3)*o.kick);FB.kickR+=rnd(-.5,.5)*o.kick;FB.back+=o.kick*.5}}
const sn=(t,k)=>Math.sin(t*7.1+k*1.7)*.5+Math.sin(t*13.3+k*3.1)*.3+Math.sin(t*23.9+k*5.3)*.2;
const _cq=new T.Quaternion(),_ce=new T.Euler(0,0,0,'YXZ'),_cv=new T.Vector3();
function applyCamera(cam){if(!ready||!cam)return;const tr=FB.trauma*FB.trauma,t=FB.t;
  const pitch=tr*.05*sn(t,1)+FB.kickP,yaw=tr*.05*sn(t,2)+FB.kickY,roll=tr*.035*sn(t,3)+FB.kickR;
  if(Math.abs(pitch)+Math.abs(yaw)+Math.abs(roll)+FB.back<1e-5)return;
  _ce.set(pitch,yaw,roll);_cq.setFromEuler(_ce);cam.quaternion.multiply(_cq);
  _cv.set(tr*.03*sn(t,4),tr*.03*sn(t,5),FB.back).applyQuaternion(cam.quaternion);cam.position.add(_cv);cam.updateMatrixWorld(true)}

/* ================================================================= damage feedback */
function damageIndicator(yawRel,str){if(!dom)return;let best=dom.arcs[0];for(const a of dom.arcs){if(a.t<=0){best=a;break}if(a.t<best.t)best=a}
  best.t=1.4;best.ang=yawRel;best.str=clamp(str??1,.3,1);best.g.setAttribute('transform',`rotate(${(yawRel*180/Math.PI).toFixed(1)} 160 160)`)}
/* angle of a world point relative to where the camera faces (0 ahead, +pi/2 right) */
function yawTo(pos){if(!camera)return 0;camera.getWorldDirection(_v);const fx=_v.x,fz=_v.z,tx=pos.x-camera.position.x,tz=pos.z-camera.position.z;return Math.atan2(tx*-fz+tz*fx,tx*fx+tz*fz)}
function damageFrom(pos,str){damageIndicator(yawTo(pos),str)}
function hitPulse(amount){FB.hit=Math.min(1,FB.hit+(amount==null?.5:amount));FB.trauma=Math.min(1,FB.trauma+(amount||.5)*.25)}
function setHealth(f){FB.health=clamp(f,0,1)}
function suppress(a){FB.supp=Math.min(1,FB.supp+(a||.4))}
function gradeUniforms(){return GU}
function bindGrade(u){FB.graded=u||null;if(renderer&&renderer.domElement&&FB.graded)renderer.domElement.style.filter=''}
/* GLSL for the game's grade pass. Add GRADE.uniforms to the shader's uniforms, paste GRADE.glsl above main(),
   sample with fxSample(tDiffuse,vUv) and call c=fxGrade(c,vUv) before the sRGB conversion. */
const GRADE={uniforms:{fxDesat:{value:0},fxHurt:{value:0},fxBlur:{value:0},fxPulse:{value:0}},
  glsl:`uniform float fxDesat,fxHurt,fxBlur,fxPulse;
vec3 fxSample(sampler2D t,vec2 uv){vec3 c=texture2D(t,uv).rgb;if(fxBlur>.002){vec2 d=uv-.5;float e=smoothstep(.12,.6,length(d));vec3 s=c;
  for(int i=1;i<7;i++){float k=float(i)/7.*fxBlur*.035*e;s+=texture2D(t,uv-d*k).rgb;}c=s/7.;}return c;}
vec3 fxGrade(vec3 c,vec2 uv){float l=dot(c,vec3(.2126,.7152,.0722));c=mix(c,vec3(l)*vec3(1.03,.99,.95),fxDesat);
  vec2 d=uv-.5;float e=smoothstep(.28,.78,length(d*vec2(1.15,1.)));c=mix(c,c*vec3(.6,.16,.1)+vec3(.06,0.,0.),clamp(e*fxHurt*.75,0.,1.));
  c*=1.-fxPulse*e*.35;return c;}`};

/* ================================================================= interactables: glow, beacon, +TRUST */
const glows=[],beacons=[];
const SHAFT_VS=`varying vec2 vUv;varying float vF;void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vec3 n=normalize(mat3(modelMatrix)*normal);vF=abs(dot(n,normalize(cameraPosition-w.xyz)));gl_Position=projectionMatrix*viewMatrix*w;}`;
const SHAFT_FS=`uniform vec3 uColor;uniform float uTime;varying vec2 vUv;varying float vF;
void main(){float a=pow(sin(3.14159*vUv.x),2.)*smoothstep(0.,.06,vUv.y)*pow(1.-vUv.y,.7)*smoothstep(.05,.45,vF);
  a*=.82+.18*sin(vUv.x*23.+uTime*.7)*sin(vUv.y*9.-uTime*.4);gl_FragColor=vec4(uColor*a,1.);
  #include <encodings_fragment>
}`;
const RIM_VS=`#include <common>
#include <skinning_pars_vertex>
uniform float uInflate;varying vec3 vN;varying vec3 vV;
void main(){
#include <beginnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>
#include <begin_vertex>
#include <skinning_vertex>
transformed+=normalize(objectNormal)*uInflate;vec4 mv=modelViewMatrix*vec4(transformed,1.);vN=normalize(normalMatrix*objectNormal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const RIM_FS=`uniform vec3 uColor;uniform float uPulse;varying vec3 vN;varying vec3 vV;
void main(){float f=1.-abs(dot(normalize(vN),normalize(vV)));f=pow(f,2.2)*.9+.06;gl_FragColor=vec4(uColor*f*uPulse,1.);
#include <encodings_fragment>
}`;
function pickupGlow(obj,o){if(!ready||!obj)return null;o=o||{};const c=new T.Color(o.color||'#ffd25a').convertSRGBToLinear().multiplyScalar(o.intensity||2.2);
  const uni={uColor:{value:c},uPulse:{value:1},uInflate:{value:o.inflate||.006}};const made=[];
  obj.updateMatrixWorld(true);
  obj.traverse(m=>{if(!m.isMesh||m.userData.htfxRim)return;const sk=!!m.isSkinnedMesh;
    const mat=new T.ShaderMaterial({uniforms:uni,vertexShader:RIM_VS,fragmentShader:RIM_FS,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false,skinning:sk,fog:false});
    let r;if(sk){r=new T.SkinnedMesh(m.geometry,mat);r.bind(m.skeleton,m.bindMatrix)}else r=new T.Mesh(m.geometry,mat);
    r.userData.htfxRim=true;r.renderOrder=31;r.frustumCulled=false;r.raycast=()=>{};m.add(r);made.push(r)});
  const h={obj,uni,made,t:R()*6,sparkT:0,sparkle:o.sparkle!==false,remove(){for(const r of made){r.parent&&r.parent.remove(r);r.material.dispose()}const i=glows.indexOf(h);if(i>=0)glows.splice(i,1)},
    set on(v){for(const r of made)r.visible=v}};glows.push(h);return h}
const highlight=(obj,on,o)=>{if(!obj)return null;let h=glows.find(g=>g.obj===obj);if(on===false){if(h)h.remove();return null}return h||pickupGlow(obj,o)};
const BEAM_VS=`varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const BEAM_FS=`uniform vec3 uColor;uniform float uTime;uniform vec3 uBase;varying vec2 vUv;varying vec3 vN;varying vec3 vW;
void main(){vec3 v=normalize(cameraPosition-vW);float f=abs(dot(normalize(vN),normalize((viewMatrix*vec4(v,0.)).xyz)));
  float a=pow(1.-vUv.y,1.8)*(.1+.9*pow(1.-f,2.));float bands=.75+.25*sin(vUv.y*40.-uTime*3.);
  float near=smoothstep(2.5,9.,distance(cameraPosition.xz,uBase.xz));
  gl_FragColor=vec4(uColor*a*bands*near,1.);
  #include <encodings_fragment>
}`;
function beacon(pos,o){if(!ready)return null;o=o||{};const c=new T.Color(o.color||'#ffc94a').convertSRGBToLinear().multiplyScalar(o.intensity||.9);const h0=o.height||14;
  const uni={uColor:{value:c},uTime:{value:0},uBase:{value:new T.Vector3()}};
  const g=new T.Group();const beam=new T.Mesh(new T.CylinderGeometry(o.radius||.5,o.radius||.5,h0,24,1,true),
    new T.ShaderMaterial({uniforms:uni,vertexShader:BEAM_VS,fragmentShader:BEAM_FS,blending:T.AdditiveBlending,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  beam.geometry.translate(0,h0/2,0);beam.raycast=()=>{};g.add(beam);g.position.copy(pos);root.add(g);
  const h={g,uni,c,t:0,ringT:0,rad:o.radius||.5,setPosition(p){g.position.copy(p)},remove(){root.remove(g);beam.geometry.dispose();beam.material.dispose();const i=beacons.indexOf(h);if(i>=0)beacons.splice(i,1)}};
  beacons.push(h);return h}
const _pp=new T.Vector3();
function trustPop(pos,text,o){if(!ready)return;o=o||{};const p=pos;
  for(let k=0;k<cnt(16);k++){rdir(_v3);_v3.y=Math.abs(_v3.y)*.8+.3;const sp=rnd(.8,2.6),i=ADD.add(p.x,p.y,p.z,_v3.x*sp,_v3.y*sp,_v3.z*sp,rnd(.5,1),rnd(.08,.16),.02,A.SPARKLE,4.5,3.6,1.6,1);
    if(i>=0){ADD.drag[i]=2.5;ADD.grav[i]=-.4;ADD.rv[i]=rnd(-3,3);ADD.fo[i]=.4}}
  glow(p.x,p.y,p.z,.6,.1,.25,A.GLOW,3,2.5,1.2);
  if(!dom)return;let best=dom.pops[0];for(const q of dom.pops){if(q.t<=0){best=q;break}if(q.t<best.t)best=q}
  best.t=best.life=o.life||1.5;best.x=p.x;best.y=p.y;best.z=p.z;best.el.innerHTML=(text||'+TRUST')+(o.sub?'<small>'+o.sub+'</small>':'');best.el.style.color=o.color||''}

/* ================================================================= skids, tyre smoke */
const skidHeads=[];for(let i=0;i<8;i++)skidHeads.push({x:0,y:0,z:0,t:-1e9});
const _sk=new T.Vector3(),_sq=new T.Vector3();
function skid(pos,dir,intensity,o){if(!ready)return;const it=clamp(intensity==null?1:intensity,0,1);if(it<=.02)return;
  let h=null,bd=1.4;for(const s of skidHeads){if(simTime-s.t>.25)continue;const d=Math.hypot(s.x-pos.x,s.z-pos.z);if(d<bd){bd=d;h=s}}
  if(!h){h=skidHeads[0];for(const s of skidHeads)if(s.t<h.t)h=s;h.x=pos.x;h.y=pos.y;h.z=pos.z;h.t=simTime;return}
  const dx=pos.x-h.x,dz=pos.z-h.z,d=Math.hypot(dx,dz);h.t=simTime;if(d<.18)return;
  _sk.set((pos.x+h.x)/2,groundAt((pos.x+h.x)/2,(pos.z+h.z)/2),(pos.z+h.z)/2);const yaw=Math.atan2(dx,dz);
  /* the quad's local Y runs along the mark */
  const i=marks.head>=marks.limit?0:marks.head;marks.add(_sk,UP,(o&&o.width)||.21,d+.04,D.SKID,0,.85*it,90);
  _q.setFromUnitVectors(ZAX,UP);_q2.setFromAxisAngle(ZAX,yaw+Math.PI);_q.multiply(_q2);_v.copy(_sk).addScaledVector(UP,.004+.0006*(marks.total%8));_sc.set((o&&o.width)||.21,d+.04,1);_m.compose(_v,_q,_sc);marks.mesh.setMatrixAt(i,_m);
  h.x=pos.x;h.y=pos.y;h.z=pos.z;
  if(it>.35)tyreSmoke(pos,it)}
function tyreSmoke(pos,it){for(let k=0;k<cnt(2*(it||1));k++){const i=smoke(pos.x+rnd(-.15,.15),groundAt(pos.x,pos.z)+.15,pos.z+rnd(-.15,.15),rnd(-.5,.5),rnd(.3,.9),rnd(-.5,.5),rnd(1.8,3.2),.25,rnd(1.4,2.4),[.9,.9,.92],.3*(it||1),{drag:1.2,grav:-.12,fi:.12,fo:.3});if(i>=0)ALP.rv[i]=rnd(-.4,.4)}}

/* ================================================================= ambient world */
const emitters=[];
const amb={on:false,leaves:false,pollen:false,dens:1,motes:[],pollenP:null,leafT:0};
function ambient(o){if(!ready)return;if(!o){amb.on=false;return}amb.on=true;amb.leaves=o.leaves!==false;amb.pollen=o.pollen!==false;amb.dens=o.density||1;amb.wind=o.wind||[.6,0,.25];
  const n=96;if(!amb.pollenP){amb.pollenP=new Float32Array(n*4)}for(let i=0;i<n;i++)amb.pollenP[i*4+3]=-1}
function emitter(type,o){if(!ready)return null;o=o||{};const h={type,o,t:0,acc:0,intensity:o.intensity==null?1:o.intensity,remove(){const i=emitters.indexOf(h);if(i>=0)emitters.splice(i,1)}};
  if(type==='motes'){const n=Math.round((o.count||60));h.p=new Float32Array(n*4);const b=o.box;for(let i=0;i<n;i++){h.p[i*4]=rnd(b[0],b[3]);h.p[i*4+1]=rnd(b[1],b[4]);h.p[i*4+2]=rnd(b[2],b[5]);h.p[i*4+3]=R()*100}}
  if(type==='shaft'){/* sunbeam through a window or roof hole: soft additive cards along the light, motes drifting inside it */
    const O=new T.Vector3().fromArray(o.origin),dir=new T.Vector3().fromArray(o.dir||[.55,.74,.38]).normalize(),L=o.length||4,w=(o.size||[1,1])[0],d=(o.size||[1,1])[1];
    const ax=[[w/2,0,0],[0,0,d/2],[w*.38,0,d*.38],[w*.38,0,-d*.38]],pos=[],uv=[],idx=[];
    ax.forEach((a,k)=>{const b=pos.length/3;for(const[sx,t]of[[-1,0],[1,0],[1,1],[-1,1]]){pos.push(O.x+a[0]*sx-dir.x*L*t,O.y+a[1]*sx-dir.y*L*t,O.z+a[2]*sx-dir.z*L*t);uv.push((sx+1)/2,t)}idx.push(b,b+1,b+2,b,b+2,b+3)});
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
    const c=new T.Color(o.color||'#ffe2b0').convertSRGBToLinear().multiplyScalar(o.intensity||.32);
    h.uni={uColor:{value:c},uTime:{value:0}};
    h.mesh=new T.Mesh(g,new T.ShaderMaterial({uniforms:h.uni,vertexShader:SHAFT_VS,fragmentShader:SHAFT_FS,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false}));
    h.mesh.frustumCulled=false;h.mesh.renderOrder=25;h.mesh.raycast=()=>{};root.add(h.mesh);
    h.O=O;h.dir=dir;h.L=L;h.w=w;h.d=d;const n=o.count||80;h.p=new Float32Array(n*4);for(let i=0;i<n;i++){h.p[i*4]=R()-.5;h.p[i*4+1]=R()-.5;h.p[i*4+2]=R();h.p[i*4+3]=R()*100}
    const rm=h.remove;h.remove=()=>{rm();root.remove(h.mesh);g.dispose();h.mesh.material.dispose()}}
  if(type==='flies'){const n=o.count||6;h.p=new Float32Array(n*3);for(let i=0;i<n;i++){h.p[i*3]=R()*100;h.p[i*3+1]=rnd(.7,1.4);h.p[i*3+2]=rnd(.25,.6)}}
  emitters.push(h);return h}
const _ew=new T.Vector3(),_ed=new T.Vector3();
function updEmitters(dt){
  for(let ei=emitters.length-1;ei>=0;ei--){const h=emitters[ei];h.t+=dt;const o=h.o;if(o.life&&h.t>o.life){emitters.splice(ei,1);continue}
    if(h.type==='motes'){const b=o.box,n=Math.round(h.p.length/4*Q.amb),br=o.brightness||1;
      for(let i=0;i<n;i++){const k=i*4;let s=h.p[k+3];h.p[k]+=Math.sin(h.t*.31+s)*.025*dt+(o.drift?o.drift[0]*dt:0);h.p[k+1]+=Math.sin(h.t*.23+s*1.7)*.02*dt-.004*dt;h.p[k+2]+=Math.cos(h.t*.27+s*2.3)*.025*dt;
        if(h.p[k]<b[0])h.p[k]=b[3];if(h.p[k]>b[3])h.p[k]=b[0];if(h.p[k+1]<b[1])h.p[k+1]=b[4];if(h.p[k+1]>b[4])h.p[k+1]=b[1];if(h.p[k+2]<b[2])h.p[k+2]=b[5];if(h.p[k+2]>b[5])h.p[k+2]=b[2];
        const tw=.55+.45*Math.sin(h.t*(1.3+(s%1))+s*5);ADD.push(h.p[k],h.p[k+1],h.p[k+2],.02+.014*(s%1),1,0,A.MOTE,2.4*br*tw,2.2*br*tw,1.8*br*tw,1)}}
    else if(h.type==='shaft'){h.uni.uTime.value=h.t;const n=Math.round(h.p.length/4*Q.amb),br=o.brightness||1;
      for(let i=0;i<n;i++){const k=i*4,s=h.p[k+3];h.p[k]+=Math.sin(h.t*.29+s)*.02*dt;h.p[k+1]+=Math.cos(h.t*.33+s*1.3)*.02*dt;h.p[k+2]+=(Math.sin(h.t*.21+s*2.1)*.012-.004)*dt;
        if(h.p[k]<-.5)h.p[k]=.5;if(h.p[k]>.5)h.p[k]=-.5;if(h.p[k+1]<-.5)h.p[k+1]=.5;if(h.p[k+1]>.5)h.p[k+1]=-.5;if(h.p[k+2]<0)h.p[k+2]=1;if(h.p[k+2]>1)h.p[k+2]=0;
        const a=h.p[k],b=h.p[k+1],t=h.p[k+2],edge=(1-Math.abs(a)*2)*(1-Math.abs(b)*2),tw=(.5+.5*Math.sin(h.t*(1.1+(s%1))+s*5))*Math.min(1,edge*3)*(1-t*.6),I=1.5*br*tw;
        ADD.push(h.O.x+a*h.w-h.dir.x*h.L*t,h.O.y-h.dir.y*h.L*t,h.O.z+b*h.d-h.dir.z*h.L*t,.02+.016*(s%1),1,0,A.MOTE,I*1.8,I*1.65,I*1.4,1)}}
    else if(h.type==='flies'){const n=h.p.length/3,P=o.pos;
      for(let i=0;i<n;i++){const s=h.p[i*3],r=h.p[i*3+2],t=h.t*(2.2+s%1.3)+s;const x=P.x+Math.sin(t)*r+Math.sin(t*2.7+s)*r*.4,z=P.z+Math.cos(t*1.13)*r+Math.cos(t*3.1)*r*.3,y=P.y+h.p[i*3+1]*.28+Math.sin(t*1.9)*.12;
        ALP.push(x,y,z,.028,.7,t*3,S.DOT,.03,.03,.03,.95)}}
    else if(h.type==='sprinkler'){const P=o.pos,rad=o.radius||5;h.acc+=dt*90*Q.amb*h.intensity;const sweep=Math.sin(h.t*.6)*(o.arc||1.2)+(o.yaw||0);
      while(h.acc>=1){h.acc-=1;const a=sweep+rnd(-.06,.06),sp=Math.sqrt(rad*9.8/1.4)*rnd(.75,1.05);
        const i=smoke(P.x,P.y+.15,P.z,Math.sin(a)*sp*.75,sp*.68,Math.cos(a)*sp*.75,rnd(1,1.7),.06,rnd(.45,.9),[1,1,1.02],.2,{tile:S.MIST,drag:.5,grav:5,fi:.1,fo:.4});if(i>=0)ALP.rv[i]=rnd(-1,1);
        if(R()<.5){const j=ADD.add(P.x,P.y+.15,P.z,Math.sin(a)*sp*.75,sp*.68,Math.cos(a)*sp*.75,rnd(.8,1.3),.03,.02,A.MOTE,1.5,1.6,1.8,1);if(j>=0){ADD.grav[j]=9.8;ADD.drag[j]=.3}}}}
    else if(h.type==='exhaust'){if(!o.object)continue;h.acc+=dt*(8+22*h.intensity)*Q.amb;
      while(h.acc>=1){h.acc-=1;_ew.fromArray(o.offset||[0,.3,-2.2]);o.object.localToWorld(_ew);_ed.fromArray(o.dir||[0,0,-1]).transformDirection(o.object.matrixWorld);
        const sp=rnd(.6,1.4)*(1+h.intensity),sh=o.shade||.62;smoke(_ew.x,_ew.y,_ew.z,_ed.x*sp+rnd(-.1,.1),_ed.y*sp+rnd(.05,.25),_ed.z*sp+rnd(-.1,.1),rnd(.9,1.6),.05,rnd(.35,.6)*(1+h.intensity*.5),[sh,sh,sh*1.04],.16+.12*h.intensity,{drag:1.6,grav:-.25,tile:S.WISP})}}
    else if(h.type==='smoke'){/* lingering smoke from a wreck or grill */const P=o.pos,s=o.size||1;h.acc+=dt*(o.rate||5)*Q.amb*(o.life?1-h.t/o.life:1);
      while(h.acc>=1){h.acc-=1;const sh=o.shade||.15;smoke(P.x+rnd(-.3,.3)*s,P.y,P.z+rnd(-.3,.3)*s,rnd(-.2,.2)+(o.wind||.3),rnd(1,2)*s,rnd(-.2,.2),rnd(4,7),.4*s,rnd(2.5,4)*s,[sh,sh,sh],.45,{drag:.4,grav:-.1,fi:.1,fo:.4})}}}
  /* outdoor: pollen around the camera and falling leaves */
  if(amb.on&&camera){const cp=camera.position,w=amb.wind;
    if(amb.pollen){const n=Math.round(96*Q.amb*amb.dens),P=amb.pollenP;
      for(let i=0;i<n;i++){const k=i*4;if(P[k+3]<0||Math.abs(P[k]-cp.x)>9||Math.abs(P[k+2]-cp.z)>9||P[k+1]<.1){P[k]=cp.x+rnd(-9,9);P[k+1]=rnd(.3,4.5);P[k+2]=cp.z+rnd(-9,9);P[k+3]=R()*100}
        const s=P[k+3];P[k]+=(w[0]*.3+Math.sin(simTime*.5+s)*.12)*dt;P[k+1]+=Math.sin(simTime*.4+s*3)*.05*dt;P[k+2]+=(w[2]*.3+Math.cos(simTime*.45+s*2)*.12)*dt;
        ALP.push(P[k],P[k+1],P[k+2],.03+.025*(s%1),1,0,S.SOFT,2.4,2.3,2,.55)}}
    if(amb.leaves){amb.leafT+=dt*2.2*Q.amb*amb.dens;while(amb.leafT>=1){amb.leafT-=1;const a=R()*TAU,r=rnd(2,16);const pick=R();
      const c=pick<.4?[.42,.5,.16]:pick<.7?[.75,.52,.12]:pick<.9?[.6,.25,.08]:[.45,.32,.18];const z=rnd(.1,.15);
      const i=leaves.add(cp.x+Math.cos(a)*r-w[0]*3,rnd(4,8),cp.z+Math.sin(a)*r-w[2]*3,w[0]*rnd(.6,1.4),-rnd(.2,.6),w[2]*rnd(.6,1.4),z,z,z*.8,rnd(10,16),c[0],c[1],c[2])}}}}

/* ================================================================= per-frame */
function updateFeedback(dt){
  FB.t+=dt;FB.trauma=Math.max(0,FB.trauma-dt*1.5);const kd=Math.exp(-dt*13);FB.kickP*=kd;FB.kickY*=kd;FB.kickR*=kd;FB.back*=Math.exp(-dt*16);
  FB.hit=Math.max(0,FB.hit-dt*1.6);FB.supp=Math.max(0,FB.supp-dt*.8);
  const low=sstep(.45,.12,FB.health);FB.desat+=((low*.8+FB.supp*.25)-FB.desat)*Math.min(1,dt*4);
  const beat=FB.health<.3?(.5+.5*Math.sin(FB.t*7.5))*sstep(.3,.05,FB.health):0;
  GU.desat=FB.desat;GU.hurt=clamp(FB.hit*1.1+low*.35+beat*.25,0,1);GU.blur=FB.supp;GU.pulse=beat;
  if(FB.graded){const u=FB.graded;if(u.fxDesat)u.fxDesat.value=GU.desat;if(u.fxHurt)u.fxHurt.value=GU.hurt;if(u.fxBlur)u.fxBlur.value=GU.blur;if(u.fxPulse)u.fxPulse.value=GU.pulse}
  else if(renderer&&renderer.domElement&&FX.cssFallback){const f=(GU.desat>.01?`saturate(${(1-GU.desat).toFixed(2)}) `:'')+(GU.blur>.05?`blur(${(GU.blur*1.2).toFixed(1)}px)`:'');if(f!==FB.cssF){FB.cssF=f;renderer.domElement.style.filter=f}}
  if(!dom)return;
  const vo=Math.round(clamp(FB.hit*(FB.graded?.45:.85),0,1)*100)/100;if(vo!==dom.last.vig){dom.last.vig=vo;dom.vig.style.opacity=vo}
  const lo=Math.round(clamp((low*.6+beat*.3)*(FB.graded?.5:1),0,1)*100)/100;if(lo!==dom.last.low){dom.last.low=lo;dom.low.style.opacity=lo}
  for(const a of dom.arcs){if(a.t<=0)continue;a.t-=dt;const o=a.t<=0?0:Math.min(1,a.t/.9)*a.str;a.g.style.opacity=o.toFixed(2)}
  if(camera){const W=(renderer&&renderer.domElement.clientWidth)||innerWidth,H=(renderer&&renderer.domElement.clientHeight)||innerHeight;
    for(const p of dom.pops){if(p.t<=0)continue;p.t-=dt;const k=1-p.t/p.life;_pp.set(p.x,p.y+.35+k*.9,p.z).project(camera);
      if(p.t<=0||_pp.z>1){p.el.style.opacity=0;if(p.t<=0)p.t=0;continue}
      const sc=k<.12?.6+k/.12*.55:1.15-Math.min(.15,(k-.12)*.6);
      p.el.style.transform=`translate(${((_pp.x+1)/2*W).toFixed(1)}px,${((1-_pp.y)/2*H).toFixed(1)}px) translate(-50%,-50%) scale(${sc.toFixed(3)})`;p.el.style.opacity=(k>.7?(1-k)/.3:1).toFixed(2)}}}
function update(dt){if(!ready)return;dt=dt>0?Math.min(dt,.1):0;simTime+=dt;
  /* lighting for the smoke shader, from the scene's own sun / hemisphere / fog */
  if(camera){if(sunL){_v.copy(sunL.position).sub(sunL.target.position).normalize().transformDirection(camera.matrixWorldInverse);U.uSunV.value.copy(_v);U.uSunC.value.copy(sunL.color).multiplyScalar(sunL.intensity*.55)}
    if(hemiL){U.uAmb.value.copy(hemiL.color).multiplyScalar(hemiL.intensity*.6+.32)}
    const f=scene.fog;if(f&&f.isFog){U.uFog.value.set(f.near,f.far);U.uFogC.value.copy(f.color)}else U.uFog.value.set(1e4,2e4)}
  U.uGround.value=FX.groundY!=null?FX.groundY:groundAt(camera?camera.position.x:0,camera?camera.position.z:0);
  ADD.update(dt,groundAt);ALP.update(dt,groundAt);
  updEmitters(dt);
  for(const g of glows){g.t+=dt;g.uni.uPulse.value=.65+.35*Math.sin(g.t*3.2);if(g.sparkle){g.sparkT-=dt;if(g.sparkT<=0){g.sparkT=rnd(.25,.6)/Q.k;
      g.obj.getWorldPosition(_v);const i=ADD.add(_v.x+rnd(-.3,.3),_v.y+rnd(.05,.5),_v.z+rnd(-.3,.3),0,rnd(.1,.3),0,rnd(.5,.9),.02,.09,A.SPARKLE,3.4,2.8,1.4,1);if(i>=0){ADD.fi[i]=.4;ADD.fo[i]=.5;ADD.rv[i]=rnd(-2,2)}}}}
  for(const b of beacons){b.t+=dt;b.uni.uTime.value=b.t;b.g.getWorldPosition(b.uni.uBase.value);b.ringT-=dt;if(b.ringT<=0){b.ringT=1.4;const p=b.uni.uBase.value,c=b.c;
      const i=ADD.add(p.x,groundAt(p.x,p.z)+.05,p.z,0,0,0,1.4,b.rad*.8,b.rad*4.5,A.RING,c.r*1.4,c.g*1.4,c.b*1.4,1);if(i>=0){ADD.fl[i]|=F_FLAT;ADD.fi[i]=.1;ADD.fo[i]=.3}}}
  ADD.end();ALP.end();
  decals.update(dt);marks.update(dt);
  chips.update(dt,groundAt);splinters.update(dt,groundAt);shards.update(dt,groundAt,shardBounce);flakes.update(dt,groundAt);
  brass.update(dt,groundAt,shellBounce);hulls.update(dt,groundAt,shellBounce);leaves.update(dt,groundAt);
  /* lights: muzzle light lives for one rendered frame; blast light decays */
  if(muzzleHold>0)muzzleHold--;else muzzleLight.intensity=0;
  if(blastT<10){blastT+=dt;blastLight.intensity=blastPeak*Math.exp(-blastT*5.5)*(1+.25*Math.sin(blastT*60));if(blastT>1.5){blastLight.intensity=0;blastT=1e9}}
  updateFeedback(dt)}
function shellBounce(B,i,sp){if(FX.onShellBounce){_v.set(B.px[i],B.py[i],B.pz[i]);FX.onShellBounce(_v,B.kind[i]?'hull':'brass',sp)}}
function shardBounce(B,i,sp){if(sp>2&&R()<.3){const j=ADD.add(B.px[i],B.py[i]+.01,B.pz[i],0,0,0,.12,.04,.01,A.SPARKLE,2.5,2.8,3,1);if(j>=0)ADD.rv[j]=rnd(-5,5)}}

/* ---------------------------------------------------------------- soft particles
   bindDepth(depthTexture, near, far, [w,h] or Vector2): the opaque scene's depth (the game's AO scene pass has one).
   While bound, the two particle batches move to their own layer, so the scene pass never draws them while the depth
   texture is its attachment. The game then calls renderSoft(renderer) into the composited colour target: particles test
   depth by hand (hidden behind walls) and fade where they meet geometry. bindDepth(null) returns to plain depth testing. */
const soft={on:false,tex:null};
function bindDepth(tex,near,far,res){if(!ready)return;const on=!!tex;
  if(on){U.uDepth.value=tex;const w=res?(res.x||res[0]):(tex.image&&tex.image.width)||1,h=res?(res.y||res[1]):(tex.image&&tex.image.height)||1;
    U.uDepthP.value.set(near!=null?near:camera.near,far!=null?far:camera.far,1/w,1/h)}
  if(on!==soft.on){soft.on=on;ADD.setSoft(on);ALP.setSoft(on)}soft.tex=tex||null;soft.fixedRes=!!res}
function renderSoft(r){if(!ready||!soft.on||!camera)return;r=r||renderer;const tex=soft.tex;
  if(!soft.fixedRes&&tex&&tex.image)U.uDepthP.value.z=1/tex.image.width,U.uDepthP.value.w=1/tex.image.height;
  const mask=camera.layers.mask,ac=r.autoClear,bg=scene.background;camera.layers.set(SOFT_LAYER);r.autoClear=false;scene.background=null;
  r.render(scene,camera);scene.background=bg;r.autoClear=ac;camera.layers.mask=mask}

function stats(){return ready?{additive:ADD.n,smoke:ALP.n,drawnAdd:ADD.w,drawnSmoke:ALP.w,decals:decals.mesh.count,marks:marks.mesh.count,chips:chips.n,splinters:splinters.n,shards:shards.n,flakes:flakes.n,brass:brass.n,hulls:hulls.n,leaves:leaves.n,emitters:emitters.length,glows:glows.length,beacons:beacons.length,trauma:FB.trauma,quality:qName}:null}

const FX={init,setQuality,update,clear,bindDepth,renderSoft,get softParticles(){return soft.on},muzzleFlash,tracer,impact,hit,surfaceOf,shell,shake,applyCamera,damageIndicator,damageFrom,yawTo,hitPulse,setHealth,suppress,gradeUniforms,bindGrade,GRADE,
  explosion,skid,tyreSmoke,ambient,emitter,pickupGlow,highlight,beacon,trustPop,zipTie:trustPop,stats,
  get ready(){return ready},get quality(){return qName},
  /* hooks the game / audio module may set */
  onShellBounce:null,onNearMiss:null,onExplosion:null,cssFallback:true,groundY:null,
  setGround(fn){groundAt=fn||(()=>0)},setSolid(fn){solidAt=fn||null},
  _debug(){return{ADD,ALP,decals,marks}}};
HT.FX=FX;
})();
/* API (all positions are THREE.Vector3 in world space; every call is a no-op before init):
   init({scene,camera,renderer,assets,quality,groundAt?,solidAt?,dom?,domParent?})   setGround(fn) setSolid(fn)   bindDepth(depthTex,near,far,[w,h]?) / bindDepth(null)   renderSoft(renderer)
     setQuality('low'|'med'|'high')   update(dt)   clear()
   muzzleFlash(pos,dir,{type:'pistol'|'revolver'|'smg'|'rifle'|'hunter'|'shotgun'|'double'|'beanbag'|'flare'|'nailer'|'enemy',firstPerson,scale})
   tracer(from,to,{enemy,ally,trail,speed,length,width,suppress})       impact(pos,normal,surface,{big,color,decal,attach})   hit(raycastHit,{big,surface,color,attach,clip})
   shell(pos,ejectDir,gunIdOrType)   shake(amount,{kick,kickYaw})   applyCamera(camera)   explosion(pos,size)
   damageIndicator(yawRel,strength)  damageFrom(worldPos)  hitPulse(amount)  setHealth(0..1)  suppress(amount)  gradeUniforms()  bindGrade(shaderUniforms)  GRADE.{uniforms,glsl}
   skid(pos,dir,intensity,{width})  tyreSmoke(pos,intensity)  ambient({leaves,pollen,density,wind}|null)
   emitter('motes',{box:[x0,y0,z0,x1,y1,z1],count,brightness}) | ('shaft',{origin:[x,y,z] centre of the opening,size:[w,d],dir:[toward the sun],length,color,intensity,count}) | ('flies',{pos}) | ('sprinkler',{pos,radius,arc,yaw}) | ('exhaust',{object,offset,dir}) | ('smoke',{pos,size,rate})  -> handle {intensity, remove()}
   pickupGlow(object3D,{color,intensity}) / highlight(object3D,on) -> handle {remove(), on}   beacon(pos,{color,height,radius}) -> handle {setPosition, remove}
   trustPop(pos,text,{sub,color})   stats() */
