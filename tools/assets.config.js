/* Asset pipeline settings (read by tools/build-assets.js).
   Sources live where they always did (assets/<folder>/<name>.<ext>); the build writes optimised,
   content-hashed variants to assets/opt/ plus assets/opt/manifest.json, which the game uses to
   pick a variant per quality tier. Never edit assets/opt/ by hand: re-run the build. */
module.exports = {
  /* source folders scanned for .jpg .png .glb .hdr */
  roots: ['assets/tex', 'assets/tex2', 'assets/sky', 'assets/world', 'assets/props', 'assets/people/rocketbox', 'assets/guns', 'assets/home', 'assets/family', 'assets/chars'],
  out: 'assets/opt',
  /* longest edge per tier. "map" = normal / roughness / alpha maps (one step below albedo) */
  size: {
    col: { m: 512, l: 1024 },
    map: { m: 256, l: 512 },
    sky: { m: 1024, l: 2048 },
    hdr: { m: 256, l: 512 },
    decal: { m: 256, l: 512 },
    glbTex: { m: 512, l: 1024 }
  },
  /* static scenery only: quantized positions break r128 raycasts against these meshes (use colliders instead) */
  quantizePositions: ['assets/props/', 'assets/world/', 'assets/home/'],
  quality: { webp: 82, jpg: 82, glbWebp: 85 },
  /* images drawn into canvases with pixel source rects (js/buildings.js atlas): the l tier keeps the source size */
  exact: ['assets/tex2/door6_', 'assets/tex2/garagedoor_', 'assets/tex2/shutter_', 'assets/tex/woodfloor_', 'assets/tex2/interiors'],
  /* rocketbox animation clips worth shipping (everything listed in anims.json); others are dropped */
  animsJson: 'assets/people/rocketbox/anims.json',
  /* Stage A boot pack: everything the title screen and the first view of the hub need, m tier, one request.
     Prefix match on the source path. */
  boot: [
    'assets/sky/sky_2k.jpg', 'assets/sky/sky_1k.hdr',
    /* hub ground, yards and house textures (js/world.js surf() + js/buildings.js) */
    'assets/tex/asphalt_', 'assets/tex/sidewalk_', 'assets/tex/grass_', 'assets/tex/concfloor_', 'assets/tex/woodfloor_',
    'assets/tex/mulch_', 'assets/tex/pavers_', 'assets/tex/roof_', 'assets/tex/siding_',
    'assets/tex2/lapsiding_', 'assets/tex2/stucco_', 'assets/tex2/shingle_', 'assets/tex2/concrete_', 'assets/tex2/corrugated_',
    'assets/tex2/door6_', 'assets/tex2/garagedoor_', 'assets/tex2/shutter_', 'assets/tex2/interiors',
    'assets/tex/brick_col', 'assets/tex/rustmetal_col',
    'assets/world/asphalt_patch',
    /* hub models */
    'assets/props/tree_oak', 'assets/props/tree_tall', 'assets/props/tree_pine', 'assets/props/bush', 'assets/props/mailbox',
    /* the player, the first job giver and the shared animation set (js/people.js needs anims at ready) */
    'assets/people/rocketbox/dad_player', 'assets/people/rocketbox/dad_gary', 'assets/people/rocketbox/anims'
  ]
};
