# FX module (`js/fx.js`, `window.HT.FX`)

Self-contained, no asset files: every sprite, the fireball flipbook, and the decal atlas with its normal map are generated procedurally at `init` (about 150 ms). Everything is pooled and drawn in a handful of calls:

| Batch | What | Draw calls |
|---|---|---|
| additive billboards (cap 1600) | flashes, cones, tracers, sparks, embers, sparkles, motes, shock ring | 1 |
| lit smoke billboards (cap 1600, premultiplied, emissive channel) | dust, smoke, fireball, mist, tyre smoke, pollen, flies | 1 |
| decals (80 bullet holes + 260 ground marks) | holes, nails, scorch, skids | 2 |
| instanced bits | chips, splinters, glass shards, paint/grass flakes, brass, hulls (+heads), leaves | 8 |

Two point lights are added once (muzzle, blast) and their intensity is toggled. The light count never changes, so no shader recompiles.

Test bench: `dev/fx.html` (buttons for every effect, click the scene to shoot, `window.demo` for scripted stepping). Screenshots: `docs/screenshots/fx/`.

## API

All positions and directions are `THREE.Vector3` in world space. Every call is a no-op before `init`.

```js
HT.FX.init({scene, camera, renderer, assets, quality:'low'|'med'|'high', groundAt?:(x,z)=>y, solidAt?:(x,z)=>topHeight|null, dom?:true, domParent?})
HT.FX.setGround(fn) / HT.FX.setSolid(fn)   // solidAt: top height of a wall/crate at that column, or null. Debris, brass and sparks
                                           // bounce off solids taller than they are and can come to rest on top of lower ones
HT.FX.bindDepth(depthTexture, near, far, [w,h]?) / HT.FX.bindDepth(null)   // soft particles (see below)
HT.FX.renderSoft(renderer)                 // draws the particle batches into the current target with a manual depth test
HT.FX.setQuality(q)      // particle counts, decal cap (40/64/80), ambient density
HT.FX.update(dt)         // every frame and from the headless stepper; no allocations, no rendering
HT.FX.clear()            // level change: kills particles, decals, bits, emitters, glows, beacons, lights, shake

HT.FX.muzzleFlash(pos, dir, {type, firstPerson, scale})
//   type: pistol revolver smg rifle hunter shotgun double beanbag flare nailer enemy
HT.FX.tracer(from, to, {enemy, ally, color, intensity, trail, speed, length, width, suppress})
//   color: '#ff8a2a' / 0xff8a2a (scaled to tracer brightness, intensity default 5.5) or [r,g,b] linear HDR; e.g. beanbag {color:'#ff7a1a'}
//   enemy tracers that pass within ~2 m of the camera add suppression and a little shake (onNearMiss hook)
HT.FX.impact(pos, normal, surface, {big, color, decal, attach:object3D})
//   surface: concrete plaster brick wood metal glass dirt grass cloth vehicle nail
//   cloth = people: fabric puff only (non-gory). color = [r,g,b] 0..1 for the shirt / car paint chips
HT.FX.hit(raycasterHit, {big, surface, color, attach, clip})
//   works out the world normal + surface; squares the decal to the face and clips it at the face edges when the hit face is
//   an axis-aligned face of the mesh's own box (walls, crates). attach:true (or an ancestor with userData.fxAttach) makes the
//   decal ride on that object every frame (vans, carts, doors); it disappears if the object leaves the scene.
HT.FX.surfaceOf(raycasterHit)                    // userData.surface > userData.ent (cloth) > texture map > name heuristics
HT.FX.shell(pos, ejectDir, gunIdOrType)          // '9mm' '357' '556' '308' '12ga' 'bean' or a gun id
HT.FX.explosion(pos, size=1, {linger:true})      // flash, flipbook fireball, smoke column (+7 s linger), dust ring,
                                                 // ground shockwave, embers, debris, scorch decal, blast light, distance shake
HT.FX.skid(pos, dir, intensity, {width})         // call per wheel per frame while sliding; joins segments itself
HT.FX.tyreSmoke(pos, intensity)

HT.FX.shake(amount, {kick, kickYaw})             // trauma 0..1 (decays), kick = recoil punch in radians
HT.FX.applyCamera(camera)                        // call AFTER the game positions the camera, BEFORE render

HT.FX.damageIndicator(yawRel, strength)          // 0 = ahead, +PI/2 = right, PI = behind
HT.FX.damageFrom(worldPos, strength)             // same, from a world position
HT.FX.hitPulse(amount)                           // red edge pulse (DOM + grade)
HT.FX.setHealth(0..1)                            // low-health desaturate + heartbeat vignette
HT.FX.suppress(amount)                           // edge blur
HT.FX.gradeUniforms()                            // {desat, hurt, blur, pulse} (same object every call)
HT.FX.GRADE = {uniforms, glsl}; HT.FX.bindGrade(shaderPassUniforms | null)

HT.FX.ambient({leaves, pollen, density, wind:[x,y,z]} | null)    // outdoor, follows the camera
HT.FX.emitter('shaft',     {origin:[x,y,z], size:[w,d], dir:[toward sun], length, color, intensity, count})
HT.FX.emitter('motes',     {box:[x0,y0,z0,x1,y1,z1], count, brightness})
HT.FX.emitter('flies',     {pos, count})
HT.FX.emitter('sprinkler', {pos, radius, arc, yaw})
HT.FX.emitter('exhaust',   {object, offset:[x,y,z] local, dir:[x,y,z] local})   // handle.intensity = throttle 0..1
HT.FX.emitter('smoke',     {pos, size, rate, life, shade})                     // wreck / grill smoke
//   all return a handle with .remove(); 'exhaust' and 'sprinkler' read handle.intensity

HT.FX.pickupGlow(object3D, {color, intensity, sparkle}) / HT.FX.highlight(object3D, on, opts)  // rim pulse, works on skinned meshes
HT.FX.beacon(pos, {color, height, radius})       // objective column, fades out when you stand in it; .setPosition(), .remove()
HT.FX.trustPop(pos, text='+TRUST', {sub, color}) // sparkle burst + floating DOM label (alias zipTie)

// hooks for other modules
HT.FX.onShellBounce = (pos, 'brass'|'hull', speed) => {}
HT.FX.onNearMiss    = (pos, dist) => {}
HT.FX.onExplosion   = (pos, size) => {}
HT.FX.stats()
```

## Integration into index.html

Load after three.js and before the main IIFE: `<script src="js/fx.js"></script>`.

1. **Init**, right after `RENDER.apply(CFG.gfx);` near the end of the IIFE:
   ```js
   HT.FX.init({scene,camera,renderer,assets:ASSETS,quality:CFG.gfx});
   ```
   In `RENDER.apply` (end of the function): `if(window.HT&&HT.FX.ready){HT.FX.setQuality(R.q);HT.FX.bindGrade(R.post&&grade?grade.uniforms:null)}`.
2. **Grade hook** in `RENDER`: in `GradeShader` add the uniforms and the GLSL:
   ```js
   uniforms:Object.assign({tDiffuse:..., ...}, HT.FX.GRADE.uniforms),
   fragmentShader:`... uniform vec2 res;
     ${HT.FX.GRADE.glsl}
     vec3 toSRGB(...)...
     void main(){vec3 c=clamp(fxSample(tDiffuse,vUv),0.,1.); ...
       c*=mix(vec3(.95,.99,1.07),vec3(1.05,1.,.92),smoothstep(.04,.5,l));
       c=fxGrade(c,vUv);          // before c=toSRGB(...)
       c=toSRGB(clamp(c,0.,1.)); ...`
   ```
   With no post (low quality) FX falls back to a CSS `filter` on the canvas for desaturate/blur.
3. **Delete** the old effects: `flashTex`, `flashes`, `muzzleFlash()`, `updFlashes()`, the `flash` PointLight, `tracerMat*`, `tracer()`, `puffG`, `puff()`, the `tracers`/`puffs` loops in `frame()`, `flash.intensity*=...`. (Removing `flash` keeps the scene at the same light count as before plus one.)
4. **fire()**:
   ```js
   const mz=muzzle(),fwd=camFwd();
   HT.FX.muzzleFlash(mz,fwd,{type:P.cur,firstPerson:P.fp});
   const right=V3(Math.cos(P.yaw),0,-Math.sin(P.yaw));
   if(P.cur!=='revolver'&&P.cur!=='nailer'&&P.cur!=='double')HT.FX.shell(mz.clone().addScaledVector(fwd,-.3),right.add(V3(0,.5,0)).normalize(),P.cur);
   ...per pellet: HT.FX.tracer(mz,end,{trail:w.pellets>1?0:undefined});
   if(hit){const e=hit.object.userData.ent;HT.FX.hit(hit,{big:P.cur==='hunter'||P.cur==='revolver',color:e?[.35,.45,.6]:undefined})}
   ...after recoil: HT.FX.shake(w.recoil*3,{kick:w.recoil*(P.aim?.5:.8)});
   ```
   Nailer misses: `HT.FX.impact(hit.point,normal,'nail')` (replaces the spec's "small dark box" nail decal).
5. **shootAt()**: `HT.FX.tracer(from,end,{enemy:isEnemy,ally:!isEnemy}); HT.FX.muzzleFlash(muzzlePoint,dirToEnd,{type:isEnemy?'enemy':'pistol'});`
   For misses, raycast `L.solids` from `from` toward `end` and call `HT.FX.hit(h)` instead of `puff(end,'#bbb')`.
   On a hit on an enemy/ally: `HT.FX.impact(tp,dirBack,'cloth')`.
6. **hurtPlayer(d)** (after `P.hp-=d`): `HT.FX.damageFrom(src.pos,clamp(d/25,.4,1)); HT.FX.hitPulse(d/30); HT.FX.shake(d/60);` (pass `src` through from `shootAt`). The old `#vig`/`hurtFlash` can go, or stay for the menu.
7. **frame()**: after `if(L)updCamera(dt);` add `HT.FX.setHealth(P.hp/100); HT.FX.update(dt); HT.FX.applyCamera(camera);` before `RENDER.draw()`.
   **`__ht.step`**: add `HT.FX.update(dt)` at the end of each tick (no rendering needed).
8. **buildLevel(def)**: call `HT.FX.clear()` first. Tag surfaces as meshes are made: `m.userData.surface='brick'|'wood'|...` (otherwise textures are mapped from `ASSETS.textures` and names, falling back to concrete). Add ambient per level: hub `HT.FX.ambient({leaves:true,pollen:true})`, dens `HT.FX.ambient(null)` plus `emitter('shaft',...)` under windows / roof holes and `emitter('flies',{pos})` on trash piles.
9. **Van**: `const ex=HT.FX.emitter('exhaust',{object:VAN.obj,offset:[.5,.25,-2.3],dir:[0,0,-1]})` and each frame `ex.intensity=Math.abs(VAN.spd)/20`. When sliding: for each rear wheel `HT.FX.skid(wheelWorldPos,fwd,slip)`.
10. **Pickups / objective / zip-tie**: `HT.FX.pickupGlow(a.mesh)` on ammo/pickups (handle.remove() when taken), `HT.FX.beacon(exitPos)` for the objective, `HT.FX.trustPop(e.pos.clone().setY(2),'+TRUST',{sub:'zip-tied'})` in the zip-tie code, barrels: `HT.FX.explosion(pos,1)`.

## Soft particles (review note 3)

The particle batches can fade where they meet geometry and are hidden behind it, using the opaque scene depth from the AO
scene pass. The depth texture must not be sampled while it is attached, so FX moves both batches to their own layer while
depth is bound; the scene pass never draws them, and `renderSoft` draws them afterwards into the composited target with a
manual depth test. In `RENDER`'s `ScenePass.render`:

```js
if(this.ao&&this.ensure()){
  r.setRenderTarget(this.rt);r.clear();r.render(scene,camera);   // FX particles are not drawn here while depth is bound
  ...AO + composite into readBuffer (unchanged)...
  if(window.HT&&HT.FX.ready){HT.FX.bindDepth(this.rt.depthTexture,camera.near,camera.far);HT.FX.renderSoft(r)}  // into readBuffer
}else{
  if(window.HT&&HT.FX.ready)HT.FX.bindDepth(null);              // plain depth-tested particles, drawn by the scene render
  r.setRenderTarget(readBuffer);r.clear();r.render(scene,camera)}
```
On low quality (no composer) nothing is bound and particles render normally, with a ground-plane fade as the fallback.

## Wall collision (review note 5)

`HT.FX.setSolid((x,z)=>{ /* return top height of the solid at this column, or null */ })`. In index.html the level
colliders are boxes, so: `(x,z)=>{for(const c of L.colliders)if(x>c.x0&&x<c.x1&&z>c.z0&&z<c.z1)return c.h??3;return null}`
(set `h` on low colliders like crates so bits can land on them).
