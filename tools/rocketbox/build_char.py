import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from rbcommon import *
args = sys.argv[sys.argv.index('--')+1:]
fbx, texdir, out = args[0], args[1], args[2]
opts = json.loads(args[3]) if len(args) > 3 else {}
reset()
arm, meshes = import_rocketbox(fbx)

def img(path, noncolor=False):
    im = bpy.data.images.load(path)
    if noncolor: im.colorspace_settings.name = 'Non-Color'
    return im

for m in meshes:
    for slot in m.material_slots:
        mat = slot.material
        name = mat.name.split('.')[0]
        nt = mat.node_tree
        nt.nodes.clear()
        outn = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(bsdf.outputs[0], outn.inputs[0])
        bsdf.inputs['Specular IOR Level'].default_value = 0.5
        if name in opts.get('drop', []):
            continue
        if name.endswith('_opacity') or not os.path.exists(os.path.join(texdir, name + '_color.jpg')):
            p = os.path.join(texdir, name + ('_color.png' if name.endswith('_opacity') else '_opacity_color.png'))
            t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(p)
            nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
            bsdf.inputs['Roughness'].default_value = 0.6
            mat.surface_render_method = 'BLENDED'
            mat.use_backface_culling = False
            continue
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(os.path.join(texdir, name + '_color.jpg'))
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        nmp = os.path.join(texdir, name + '_normal.jpg')
        if os.path.exists(nmp):
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img(nmp, True)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
            nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
        mrp = os.path.join(texdir, name + '_mr.jpg')
        if os.path.exists(mrp):
            tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = img(mrp, True)
            sep = nt.nodes.new('ShaderNodeSeparateColor')
            nt.links.new(tm.outputs['Color'], sep.inputs[0])
            nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
            nt.links.new(sep.outputs['Blue'], bsdf.inputs['Metallic'])
        mat.use_backface_culling = True

# drop whole parts of the source outfit by material (e.g. a hard hat, a tool belt)
if opts.get('drop'):
    import bmesh
    for m in meshes:
        ids = [i for i, s in enumerate(m.material_slots) if s.material and s.material.name.split('.')[0] in opts['drop']]
        if not ids: continue
        bm = bmesh.new(); bm.from_mesh(m.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in ids], context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]; bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(m.data); bm.free()
        for i in sorted(ids, reverse=True):
            m.active_material_index = i; bpy.context.view_layer.objects.active = m; bpy.ops.object.material_slot_remove()

# hip height metadata
pel = arm.data.bones['Bip01 Pelvis']
hip = pel.head_local.z
for m in meshes: m.name = os.path.splitext(os.path.basename(out))[0] + '_mesh'
arm['hipHeight'] = round(hip, 4)
arm['source'] = os.path.basename(fbx)
print('HIP', hip)
import acc
body = meshes[0]
if opts.get('belly'): acc.belly(arm, body, amp=opts['belly'])
if opts.get('cap'): acc.add_cap(arm, body, color=tuple(opts['cap']), size=opts.get('capsize', 1.0), low=opts.get('caplow', 0.0))
if opts.get('glasses'): acc.add_sunglasses(arm, body)
if opts.get('whistle'): acc.add_whistle(arm, body)
if opts.get('apron'): acc.add_apron(arm, body, color=tuple(opts['apron']))
arm['accessories'] = ','.join(k for k in ('cap', 'glasses', 'whistle', 'apron') if opts.get(k))

bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False,
    export_skins=True, export_yup=True, export_image_format='AUTO', export_extras=True,
    export_apply=False, export_texcoords=True, export_normals=True, export_tangents=False,
    export_materials='EXPORT', export_def_bones=False, export_rest_position_armature=True)
print('WROTE', out)
