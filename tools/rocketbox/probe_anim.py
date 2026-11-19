import bpy, sys
f=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
if f.endswith('.fbx'): bpy.ops.import_scene.fbx(filepath=f)
else: bpy.ops.import_scene.gltf(filepath=f)
sc=bpy.context.scene
for o in bpy.data.objects:
    print(o.type,o.name,tuple(round(x,3) for x in o.location),tuple(round(x,3) for x in o.scale),tuple(round(x,3) for x in o.rotation_euler), o.animation_data and o.animation_data.action and o.animation_data.action.name)
for a in bpy.data.actions:
    print('ACT',a.name,tuple(a.frame_range))
    try:
        fcs=[fc for l in a.layers for s in l.strips for cb in s.channelbags for fc in cb.fcurves]
    except Exception as e: fcs=list(getattr(a,'fcurves',[]))
    paths=sorted(set(fc.data_path for fc in fcs))
    print('  nfc',len(fcs),'paths',len(paths),[p for p in paths if 'pose' not in p][:10], paths[:3])
    for fc in fcs:
        if fc.data_path in ('location',) : print('  objloc',fc.array_index,[round(fc.evaluate(t),2) for t in range(int(a.frame_range[0]),int(a.frame_range[1])+1,10)])
print('fps',sc.render.fps, sc.frame_start, sc.frame_end)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
pb=arm.pose.bones[0]; print('first pbone',pb.name)
for fr in (int(sc.frame_start), int(sc.frame_end)//2):
    sc.frame_set(fr)
    w=arm.matrix_world@pb.matrix; print('frame',fr,'pelvis world',[round(x,3) for x in w.translation])
