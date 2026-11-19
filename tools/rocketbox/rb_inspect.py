import bpy, sys
f=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=f)
for o in bpy.data.objects:
    print(o.type, o.name, tuple(round(x,3) for x in o.scale), tuple(round(x,3) for x in o.rotation_euler), o.parent.name if o.parent else None)
    if o.type=='MESH':
        me=o.data; print('  tris',sum(len(p.vertices)-2 for p in me.polygons),'verts',len(me.vertices),'mats',[m.name for m in me.materials],'vgroups',len(o.vertex_groups), 'uvs', len(me.uv_layers), 'shapekeys', me.shape_keys and len(me.shape_keys.key_blocks))
        print('  dims', tuple(round(x,3) for x in o.dimensions))
    if o.type=='ARMATURE':
        bs=o.data.bones; print('  nb',len(bs)); print('  ',[b.name for b in bs])
        for n in ['Bip01','Bip01 Pelvis','Bip01 Head','Bip01 R Hand','Bip01 L Foot']:
            b=bs.get(n); 
            if b: print('  ',n,tuple(round(x,3) for x in b.head_local), tuple(round(x,3) for x in b.tail_local))
for m in bpy.data.materials:
    nodes=[n for n in m.node_tree.nodes if n.type=='TEX_IMAGE'] if m.use_nodes else []
    print('MAT',m.name,[(n.image.name if n.image else None) for n in nodes], m.blend_method if hasattr(m,'blend_method') else '')
for a in bpy.data.actions: print('ACT',a.name,a.frame_range)
